// explore-report.test.ts (guided DDD §13.8): the result report's assembly
// as a pure function with injected fixture PNGs, over results that
// computeResult derives from code-built fixture vintages.
//
// - The §13.4 part set in order; well-formed XML; every image
//   relationship resolving to a media part and every embed to a
//   relationship; one image per drawn chart.
// - The §13.2 order; captions carrying the D-14 fields; the cumulative
//   accuracy statement; the provenance blocks of provenance.txt in the
//   page's wording (the decided low-slip caveat, G-25).
// - The suppression branch, the small-result warning, and the empty state.
// - The §13.5 fallback under a failing injected rasterizer.
// - A fixed-scenario `document.xml` snapshot
//   (test/snapshots/report-document.xml; REPORT_SNAPSHOT_UPDATE=1 rewrites it).
// - test/zipcheck.py over the guided archive: the outer layout, the nested
//   part set, stored throughout, the DDD §5.9 digests of the text members.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { before, describe, test } from 'node:test';

import * as config from '../src/config';
import type { Vintage } from '../src/decode/decode';
import { PACKAGE_MEMBER_NAMES, packageTexts, provenanceText, type VersionStamps } from '../src/download/package';
import { cumulativeChart, guidedChart, histogramBins, histogramChart } from '../src/explore/charts';
import { computeResult } from '../src/explore/compute';
import { guided } from '../src/explore/copy-overlay';
import {
  captionLines, countLine, documentXml, GUIDED_MEMBER_NAMES, guidedArchive, REPORT_CHART_HEIGHT, REPORT_CHART_WIDTH,
  REPORT_MEMBER, REPORT_PARTS, reportCharts, reportDocx, SCENARIO_LABEL_FILL, scenarioLabels, scenarioRows, scenarioSummary, type Rasterize,
} from '../src/explore/report';
import { NEGATIVE_HEIGHT_NOTE, negativeHeights, NO_MATCHES, PROVENANCE_HEADING, REPORT_TITLE } from '../src/explore/wording';
import { defaultScenario, MEASUREMENT_NAMES, type Scenario } from '../src/state/state';
import { measurementLabel as registryLabel } from '../src/views/chart-text';

/** The report's measurement label: the registry label in the page's wording (guided DDD §15.7). */
const measurementLabel = (m: Parameters<typeof registryLabel>[0]): string => guided(registryLabel(m));
import { copyText } from '../src/views/copy';
import { noticeText, NOTICE_KEYS, selectNotices } from '../src/views/notices';
import type { RenderInput } from '../src/views/render-input';
import { serializeSvg, type SvgNode } from '../src/views/svg';
import { zip } from '../src/download/zip';
import { buildFixture, decodeFixture, stageCountSpec } from './fixtures';

const WEBAPP_DIR = fileURLToPath(new URL('../../', import.meta.url));
const SNAPSHOT = `${WEBAPP_DIR}test/snapshots/report-document.xml`;
const OUT_DIR = fileURLToPath(new URL('./report/', import.meta.url));

const AT = new Date('2026-11-05T12:34:57Z');
const AT_ISO = '2026-11-05T12:34:57Z';
const STAMPS: VersionStamps = { softwareVersion: 'v0.4.0-test', dataVersion: 'data-v0-test' };

/** A fixture PNG: the signature and an IHDR-shaped tail; the assembly checks the signature only. */
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);

/** A rasterizer that records its calls and returns the fixture PNG. */
function recording(): { rasterize: Rasterize; calls: { svg: string; width: number; height: number }[] } {
  const calls: { svg: string; width: number; height: number }[] = [];
  return { calls, rasterize: async (svg, width, height) => { calls.push({ svg, width, height }); return PNG; } };
}

let full: RenderInput;
let mixed: RenderInput;
let empty: RenderInput;
let noValid: RenderInput;
let large: Vintage;

before(async () => {
  large = await decodeFixture(await buildFixture(stageCountSpec(102)));
  full = computeResult(large, defaultScenario(large.manifest), 1, null);
  empty = computeResult(large, { ...defaultScenario(large.manifest), scarpClass: [] }, 2, null);
  noValid = computeResult(large, { ...defaultScenario(large.manifest), window: { mode: 'slip', min: '0', max: '0' } }, 4, null);
  const small: Vintage = await decodeFixture(await buildFixture(stageCountSpec(12)));
  const scenario: Scenario = { ...defaultScenario(small.manifest), faultDip: [30] };
  mixed = computeResult(small, scenario, 3, null);
});

// --------------------------------------------------------------------
// A stored-ZIP reader and an XML well-formedness check
// --------------------------------------------------------------------

/** The members of a stored ZIP in local-header order. */
function unzip(bytes: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Map<string, Uint8Array>();
  let p = 0;
  while (view.getUint32(p, true) === 0x04034b50) {
    assert.equal(view.getUint16(p + 8, true), 0, 'stored');
    const size = view.getUint32(p + 18, true);
    const nameLength = view.getUint16(p + 26, true);
    const extra = view.getUint16(p + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 30, p + 30 + nameLength));
    const start = p + 30 + nameLength + extra;
    out.set(name, bytes.subarray(start, start + size));
    p = start + size;
  }
  return out;
}

const decode = (bytes: Uint8Array | undefined): string => new TextDecoder().decode(bytes);

/** Throws unless `text` is one balanced element tree after its declaration, with no unescaped `&`. */
function assertWellFormed(text: string, name: string): void {
  const body = text.replace(/^<\?xml [^?]*\?>\n?/, '');
  assert.ok(!/&(?!(amp|lt|gt|quot|apos);)/.test(body), `${name}: an unescaped &`);
  const stack: string[] = [];
  let roots = 0;
  for (const match of body.matchAll(/<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+="[^"<]*")*)\s*(\/?)>/g)) {
    const [, close, tag, , selfClose] = match;
    if (close) assert.equal(stack.pop(), tag, `${name}: </${tag}> closes another element`);
    else if (!selfClose) {
      if (stack.length === 0) roots += 1;
      stack.push(tag);
    } else if (stack.length === 0) roots += 1;
  }
  assert.deepEqual(stack, [], `${name}: unclosed elements`);
  assert.equal(roots, 1, `${name}: one root element`);
  assert.equal(body.replace(/<[^>]*>/g, '').includes('<'), false);
}

/** The document's visible text in order, one entry per paragraph. */
function paragraphs(documentXmlText: string): string[] {
  return [...documentXmlText.matchAll(/<w:p>(.*?)<\/w:p>/g)].map(([, inner]) =>
    [...inner.matchAll(/<w:t xml:space="preserve">([^<]*)<\/w:t>/g)].map(([, t]) => t.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')).join(''),
  );
}

async function docxParts(input: RenderInput): Promise<Map<string, Uint8Array>> {
  return unzip(await reportDocx(input, STAMPS, AT, recording().rasterize));
}

// --------------------------------------------------------------------
// The tests
// --------------------------------------------------------------------

describe('report: the .docx part set (§13.4)', () => {
  test('the four fixed parts, then one PNG per chart, numbered in document order', async () => {
    const parts = await docxParts(full);
    const charts = reportCharts(full);
    assert.equal(charts.length, 6, 'two charts for each of three measurements');
    assert.deepEqual([...parts.keys()], [...REPORT_PARTS, ...charts.map((_, i) => `word/media/chart-${i + 1}.png`)]);
    for (const [name, bytes] of parts) if (!name.endsWith('.png')) assertWellFormed(decode(bytes), name);
    assert.match(decode(parts.get('[Content_Types].xml')), /<Default Extension="png" ContentType="image\/png"\/>/);
    assert.match(decode(parts.get('[Content_Types].xml')), /<Override PartName="\/word\/document.xml" ContentType="application\/vnd.openxmlformats-officedocument.wordprocessingml.document.main\+xml"\/>/);
    const ids = [...decode(parts.get('word/document.xml')).matchAll(/<wp:docPr id="(\d+)"/g)].map(m => Number(m[1]));
    assert.deepEqual(ids, [1, 2, 3, 4, 5, 6], 'docPr ids unique, 1..n in order');
    assert.match(decode(parts.get('_rels/.rels')), /Target="word\/document.xml"/);
  });

  test('every embed resolves to an image relationship, every relationship to a media part', async () => {
    const parts = await docxParts(full);
    const rels = [...decode(parts.get('word/_rels/document.xml.rels')).matchAll(/<Relationship Id="(rId\d+)" Type="[^"]*\/image" Target="([^"]+)"\/>/g)];
    const embeds = [...decode(parts.get('word/document.xml')).matchAll(/r:embed="(rId\d+)"/g)].map(m => m[1]);
    assert.equal(rels.length, 6);
    assert.deepEqual(embeds, rels.map(m => m[1]));
    for (const [, , target] of rels) assert.ok(parts.has(`word/${target}`), target);
  });

  test('the XML parts are deterministic; only the rasterizer sees the charts, at their CSS size', async () => {
    // A result computed afresh from the same vintage and scenario gives the same document.
    const again = computeResult(large, defaultScenario(large.manifest), 9, null);
    assert.notEqual(again, full);
    assert.equal(documentXml(again, STAMPS, new Date(AT.getTime())), documentXml(full, STAMPS, AT));
    const { rasterize, calls } = recording();
    const a = await reportDocx(full, STAMPS, AT, rasterize);
    const b = await reportDocx(full, STAMPS, AT, recording().rasterize);
    assert.deepEqual(a, b);
    assert.equal(calls.length, 6);
    reportCharts(full).forEach((chart, i) => {
      assert.ok(calls[i].svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" '), 'a standalone SVG');
      assert.equal(calls[i].svg, serializeSvg({ ...chart.svg, attrs: [['xmlns', 'http://www.w3.org/2000/svg'], ...chart.svg.attrs] }));
      assert.equal(calls[i].width, REPORT_CHART_WIDTH);
      assert.equal(calls[i].height, REPORT_CHART_HEIGHT);
    });
  });
});

describe('report: the document (§13.2, §13.3)', () => {
  test('the order: title block, provenance, then the three measurements in the PDD §4.1 order', () => {
    const lines = paragraphs(documentXml(full, STAMPS, AT));
    assert.equal(lines[0], REPORT_TITLE);
    // The scenario table's cells, label then value, row by row; a spacer; the generated line.
    assert.deepEqual(lines.slice(1, 15), scenarioRows(full).flat());
    assert.match(lines[16], new RegExp(`^${copyText('ddd5.9.labelGenerated').replace(/[()]/g, '\\$&')}: ${AT_ISO} · Software version: v0\\.4\\.0-test`));
    const at = (line: string): number => lines.indexOf(line);
    const order = [PROVENANCE_HEADING, ...MEASUREMENT_NAMES.map(measurementLabel)].map(at);
    assert.ok(order.every(i => i > 16), JSON.stringify(order));
    assert.deepEqual([...order].sort((x, y) => x - y), order);
  });

  test('the scenario table: the summary\u2019s seven conditions, labelled, in their own words, the label column shaded', async () => {
    const small = await decodeFixture(await buildFixture(stageCountSpec(12)));
    const narrowed = computeResult(small, { ...defaultScenario(small.manifest), faultDip: [30, 70], depth: [10], density: ['Medium'], window: { mode: 'slip', min: '0.5', max: '2' }, population: 'one_state_per_trial' }, 5, null);
    const rows = scenarioRows(narrowed);
    // The guided page's own condition names (§13.2 item 1), the movement row named for the mode.
    assert.deepEqual(rows.map(([label]) => label), ['Fault angle', 'Sediment strength and structure', 'Sediment depth', 'Sediment density', 'Fault slip', 'Simulation stages', 'Scarp types']);
    assert.deepEqual(scenarioLabels('offset'), ['Fault angle', 'Sediment strength and structure', 'Sediment depth', 'Sediment density', 'Maximum surface offset', 'Simulation stages', 'Scarp types']);
    const values = rows.map(([, value]) => value);
    assert.equal(values[0], '30° or 70°');
    assert.equal(values[2], '10 m');
    assert.equal(values[3], 'Medium');
    assert.equal(values[4], '0.5–2 m');
    assert.equal(values[5], 'One state per simulation trial');
    assert.equal(values[6], 'All scarp types (no filter)');
    // Rejoined, the values carry every token of the one-line summary (the captions' form).
    const summary = scenarioSummary(narrowed).toLowerCase();
    for (const value of values) assert.ok(summary.includes(value.toLowerCase()), value);
    assert.deepEqual(scenarioRows(full).map(([, value]) => value), ['Any dip', 'Any sediment', 'Any depth', 'Any density', 'Slip: any', 'All recorded stages', 'All scarp types (no filter)']);

    const xmlText = documentXml(narrowed, STAMPS, AT);
    const table = xmlText.slice(xmlText.indexOf('<w:tbl>'), xmlText.indexOf('</w:tbl>'));
    assert.equal((table.match(/<w:tr>/g) ?? []).length, 7);
    assert.equal((table.match(new RegExp(`<w:shd w:val="clear" w:color="auto" w:fill="${SCENARIO_LABEL_FILL}"/>`, 'g')) ?? []).length, 7, 'every label cell, and only those');
    for (const row of table.split('<w:tr>').slice(1)) {
      const cells = row.split('<w:tc>').slice(1);
      assert.equal(cells.length, 2);
      assert.ok(cells[0].includes('<w:shd ') && cells[0].includes('<w:b/>'));
      assert.ok(!cells[1].includes('<w:shd ') && !cells[1].includes('<w:b/>'));
    }
    // The captions keep the one-line form.
    for (const chart of reportCharts(narrowed)) assert.equal(captionLines(narrowed, STAMPS, chart)[1], scenarioSummary(narrowed));
  });

  test('provenance renders every line of provenance.txt in its order, in the page\u2019s wording', () => {
    for (const input of [full, noValid]) {
      const lines = paragraphs(documentXml(input, STAMPS, AT));
      const start = lines.indexOf(PROVENANCE_HEADING) + 1;
      const expected = provenanceText(input, STAMPS, AT).split('\n').filter(line => line !== '').map(line => guided(line));
      assert.deepEqual(lines.slice(start, start + expected.length), expected);
    }
  });

  test('a low-slip window: the report carries the decided caveat, provenance.txt keeps the registry text (G-25)', () => {
    const decided = 'Low-slip measurements may be less reliable. Below 0.5 m of fault slip, surface deformation can be difficult to distinguish from model roughness. These values are shown, but interpret them with caution.';
    const registry = copyText('pdd5.9.lowSlipCaveat');
    assert.notEqual(registry, decided);
    const lines = paragraphs(documentXml(noValid, STAMPS, AT));
    assert.equal(lines.filter(line => line === decided).length, 1);
    assert.ok(!lines.includes(registry));
    const provenance = provenanceText(noValid, STAMPS, AT);
    assert.ok(provenance.includes(registry));
    assert.ok(!provenance.includes(decided));
    // No low-slip window, no caveat.
    assert.ok(!paragraphs(documentXml(full, STAMPS, AT)).includes(decided));
  });

  test('each chart is followed by its caption: the D-14 fields, and the accuracy statement on the cumulative chart', () => {
    const xmlText = documentXml(full, STAMPS, AT);
    const lines = paragraphs(xmlText);
    const accuracy = guided(copyText('pdd4.1.cumulativeAccuracy'));
    for (const chart of reportCharts(full)) {
      const caption = captionLines(full, STAMPS, chart);
      const first = lines.indexOf(caption[0]);
      assert.ok(first > 0, caption[0]);
      assert.deepEqual(lines.slice(first, first + caption.length), [...caption]);
      assert.match(caption[0], new RegExp(`^${measurementLabel(chart.measurement).replace(/[()]/g, '\\$&')} · (Distribution|Cumulative)$`));
      assert.equal(caption[1], scenarioSummary(full));
      assert.match(caption[1], /all recorded stages · all scarp types \(no filter\)$/);
      assert.equal(caption[2], countLine(full, chart.measurement));
      assert.match(caption[3], /^Software version: v0\.4\.0-test · Data-export version and date: data-v0-test \(/);
      assert.equal(caption[4], 'Cite: Chiama et al. (2025)');
      assert.equal(caption.includes(accuracy), chart.view === 'cumulative');
    }
    assert.equal(countLine(full, 'scarp_height'), `N = ${full.selection.perMeasurement.scarp_height.valid} measurements used of 306 matching simulation stages (${full.selection.perMeasurement.scarp_height.excludedNull} missing values excluded)`);
  });

  test('the statistics tables carry the page row labels; scarp dip carries the provisional notice', () => {
    const lines = paragraphs(documentXml(full, STAMPS, AT));
    for (const label of ['Measurements used', 'Missing values (excluded)', 'Median', '16th percentile', '84th percentile', 'Standard deviation']) {
      assert.equal(lines.filter(line => line === label).length, 3, label);
    }
    const dip = lines.indexOf(measurementLabel('scarp_dip'));
    assert.equal(lines[dip + 1], copyText('pdd5.4.scarpDipNotice'));
    const width = lines.indexOf(measurementLabel('dzw'));
    assert.equal(lines[width + 1], 'Deformation zone width measures the main modeled rupture zone. Real earthquakes can also produce separate deformation away from the main trace, which the model does not represent.');
  });

  test('the chart set ignores the page toggles: linear histograms, the cumulative curve without a read-off', () => {
    // A read-off marker would change the drawing; the report has none.
    assert.notDeepEqual(cumulativeChart(full, 'scarp_height', REPORT_CHART_WIDTH, 84), cumulativeChart(full, 'scarp_height', REPORT_CHART_WIDTH, null));
    for (const chart of reportCharts(full)) {
      assert.ok(!serializeSvg(chart.svg).includes('logarithmic'), 'never the log scale');
      const expected: SvgNode = chart.view === 'histogram'
        ? histogramChart(histogramBins(full, chart.measurement, false), REPORT_CHART_WIDTH)
        : cumulativeChart(full, chart.measurement, REPORT_CHART_WIDTH, null);
      assert.deepEqual(chart.svg, expected);
    }
  });

  test('below the chart floor the page notice takes the charts’ place; the small-result warning opens its section', async () => {
    const plan = selectNotices(mixed, config);
    assert.equal(plan.panels.scarp_height?.key, NOTICE_KEYS.warning);
    assert.equal(plan.panels.dzw?.key, NOTICE_KEYS.suppression);
    assert.equal(plan.panels.scarp_dip?.key, NOTICE_KEYS.suppression);
    const charts = reportCharts(mixed);
    assert.deepEqual(charts.map(c => `${c.measurement}:${c.view}`), ['scarp_height:histogram', 'scarp_height:cumulative']);
    const parts = await docxParts(mixed);
    assert.deepEqual([...parts.keys()].filter(name => name.endsWith('.png')), ['word/media/chart-1.png', 'word/media/chart-2.png']);
    const lines = paragraphs(decode(parts.get('word/document.xml')));
    const height = lines.indexOf(measurementLabel('scarp_height'));
    assert.equal(lines[height + 1], guided(noticeText(plan.panels.scarp_height!)));
    for (const m of ['dzw', 'scarp_dip'] as const) {
      const start = lines.indexOf(measurementLabel(m));
      const notice = guided(noticeText(plan.panels[m]!));
      const at = lines.indexOf(notice, start);
      assert.ok(at > lines.indexOf('Standard deviation', start), `${m}: the notice follows the statistics table`);
      assert.equal(lines.filter(line => line === notice).length, 2, 'once in each suppressed section');
    }
  });

  test('the width term is unhyphenated throughout the report (§15.7), provenance.txt keeping the registry spelling', () => {
    for (const input of [full, noValid, mixed]) assert.doesNotMatch(documentXml(input, STAMPS, AT), /deformation-zone/i);
    assert.match(provenanceText(full, STAMPS, AT), /Deformation-zone width \(m\): N = /);
  });

  test('the negative-height note: under scarp height when its matched minimum is below zero, nowhere else (§15.8)', () => {
    const withMin = (input: RenderInput, m: 'scarp_height' | 'dzw', min: number): RenderInput => ({ ...input, measurements: { ...input.measurements, [m]: { ...input.measurements[m], stats: { ...input.measurements[m].stats!, min } } } });
    const count = (input: RenderInput) => paragraphs(documentXml(input, STAMPS, AT)).filter(line => line === NEGATIVE_HEIGHT_NOTE).length;
    assert.equal(count(withMin(full, 'scarp_height', 0)), 0, 'a zero minimum is not below zero');
    assert.equal(count(withMin(withMin(full, 'scarp_height', 0.01), 'dzw', -0.02)), 0, 'only scarp height carries it');
    const negative = withMin(full, 'scarp_height', -0.02);
    const lines = paragraphs(documentXml(negative, STAMPS, AT));
    assert.equal(lines.filter(line => line === NEGATIVE_HEIGHT_NOTE).length, 1);
    const at = lines.indexOf(NEGATIVE_HEIGHT_NOTE);
    assert.ok(at > lines.indexOf(measurementLabel('scarp_height')) && at < lines.indexOf('Statistic', lines.indexOf(measurementLabel('scarp_height'))), 'in the scarp-height section, before its table');
    assert.ok(!negativeHeights(empty, 'scarp_height'), 'no statistics, no note');
  });

  test('no valid measurement: tables still render, and the page notice stands in each section\u2019s charts', () => {
    const plan = selectNotices(noValid, config);
    assert.equal(plan.state, null);
    assert.ok(noValid.selection.matchingRecords > 0);
    for (const m of MEASUREMENT_NAMES) assert.equal(plan.panels[m]?.key, NOTICE_KEYS.noValid, m);
    assert.equal(reportCharts(noValid).length, 0);
    const xmlText = documentXml(noValid, STAMPS, AT);
    const lines = paragraphs(xmlText);
    assert.equal((xmlText.match(/<w:tbl>/g) ?? []).length, 4, 'the scenario table and three statistics tables');
    assert.equal(xmlText.includes('<w:drawing>'), false);
    for (const m of MEASUREMENT_NAMES) {
      const start = lines.indexOf(measurementLabel(m));
      const at = lines.indexOf(guided(noticeText(plan.panels[m]!)), start);
      assert.ok(at > lines.indexOf('Standard deviation', start), m);
    }
  });

  test('the empty state: each section names no match and explains, with no table or chart', () => {
    const plan = selectNotices(empty, config);
    assert.equal(plan.state, 'empty');
    assert.equal(reportCharts(empty).length, 0);
    const xmlText = documentXml(empty, STAMPS, AT);
    const lines = paragraphs(xmlText);
    assert.equal(lines.filter(line => line === NO_MATCHES).length, 3);
    for (const ref of plan.explainer) assert.ok(lines.includes(guided(noticeText(ref))));
    assert.equal((xmlText.match(/<w:tbl>/g) ?? []).length, 1, 'the scenario table only');
    assert.equal(xmlText.includes('<w:drawing>'), false);
  });

  test('the Provenance section ends with the licences and the ODC-By 1.0 notice (G-28)', () => {
    const lines = paragraphs(documentXml(full, STAMPS, AT));
    const at = lines.lastIndexOf('Licences');
    assert.ok(at > 0, 'a Licences label in the Provenance section');
    assert.deepEqual(lines.slice(at + 1, at + 4), [
      copyText('ddd5.9.licenceData'),
      copyText('ddd5.9.licenceWorks'),
      'Contains information from the Homogeneous and Heterogeneous 2D DEM Experiments (Chiama et al. 2024a, 2024b; DesignSafe-CI), which is made available here under the Open Data Commons Attribution License (ODC-By 1.0).',
    ]);
  });

  test('a fixed-scenario document.xml snapshot', () => {
    const actual = documentXml(full, STAMPS, AT);
    if (process.env.REPORT_SNAPSHOT_UPDATE === '1') writeFileSync(SNAPSHOT, actual);
    assert.equal(actual, readFileSync(SNAPSHOT, 'utf8'));
  });
});

describe('report: the guided chart presentation', () => {
  test('guidedChart moves the vertical-axis titles to x = 14 and retitles the cumulative axis, nothing else', () => {
    const titles = (node: SvgNode, axis: string | null = null, out: [string | null, SvgNode][] = []): [string | null, SvgNode][] => {
      const own = node.attrs.find(([name]) => name === 'data-axis')?.[1] ?? axis;
      if (node.tag === 'text' && node.attrs.some(([name]) => name === 'transform')) out.push([own, node]);
      node.children.forEach(child => typeof child !== 'string' && titles(child, own, out));
      return out;
    };
    const chart = cumulativeChart(full, 'scarp_height', 600, null);
    const found = titles(chart);
    assert.ok(found.length >= 1);
    for (const [axis, node] of found) {
      const y = node.attrs.find(([name]) => name === 'y')![1];
      assert.equal(node.attrs.find(([name]) => name === 'x')![1], '14');
      assert.equal(node.attrs.find(([name]) => name === 'transform')![1], `rotate(-90 14 ${y})`);
      if (axis === 'cumulative') assert.deepEqual(node.children, ['Measurements at or below (%)']);
    }
    assert.deepEqual(guidedChart(chart), chart, 'idempotent on the guided chart');
  });
});

describe('report: the guided archive (§13.1, §13.5, §13.6)', () => {
  test('the four data members, then report.docx, at one instant', async () => {
    const archive = await guidedArchive(full, STAMPS, AT, recording().rasterize);
    assert.equal(archive.reportError, null);
    const members = unzip(archive.bytes);
    assert.deepEqual([...members.keys()], [...GUIDED_MEMBER_NAMES]);
    const texts = packageTexts(full, STAMPS, AT);
    texts.forEach(member => assert.equal(decode(members.get(member.name)), member.text));
    assert.deepEqual(members.get(REPORT_MEMBER), await reportDocx(full, STAMPS, AT, recording().rasterize));
    assert.match(archive.fileName, /\.zip$/);
  });

  test('a failing rasterizer leaves report.docx out entirely and says why', async () => {
    const failing: Rasterize = async () => { throw new Error('no canvas'); };
    const notPng: Rasterize = async () => new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const rasterize of [failing, notPng]) {
      const archive = await guidedArchive(full, STAMPS, AT, rasterize);
      assert.ok(archive.reportError instanceof Error);
      assert.deepEqual([...unzip(archive.bytes).keys()], [...PACKAGE_MEMBER_NAMES]);
    }
  });

  test('a failure before the four members exist still fails the whole download', async () => {
    const broken = { ...full, scenario: { ...full.scenario, window: { mode: 'offset' as const, offsetMax: '1' } }, windows: null, flags: null };
    await assert.rejects(guidedArchive(broken as RenderInput, STAMPS, AT, recording().rasterize));
  });

  test('zipcheck.py accepts the guided archive and the fallback archive, each under its own layout', async () => {
    mkdirSync(OUT_DIR, { recursive: true });
    const guidedZip = `${OUT_DIR}guided.zip`;
    const fallbackZip = `${OUT_DIR}fallback.zip`;
    writeFileSync(guidedZip, (await guidedArchive(full, STAMPS, AT, recording().rasterize)).bytes);
    writeFileSync(fallbackZip, (await guidedArchive(full, STAMPS, AT, async () => { throw new Error('no'); })).bytes);
    const digests = packageTexts(full, STAMPS, AT).map(m => createHash('sha256').update(m.text, 'utf8').digest('hex'));
    const zipcheck = (args: readonly string[]) => {
      const run = spawnSync('python3', ['-I', 'test/zipcheck.py', ...args], { cwd: WEBAPP_DIR, encoding: 'utf8' });
      assert.equal(run.error, undefined, `python3 must run: ${String(run.error)}`);
      return { status: run.status, output: `${run.stdout}${run.stderr}` };
    };
    const layout = `--members=${GUIDED_MEMBER_NAMES.join(',')}`;
    const ok = zipcheck([layout, guidedZip, AT_ISO, ...digests]);
    assert.equal(ok.status, 0, ok.output);
    assert.equal(zipcheck([fallbackZip, AT_ISO, ...digests]).status, 0, 'the fallback is the DDD §5.9 layout');
    assert.equal(zipcheck([layout, fallbackZip, AT_ISO]).status, 1, 'the guided layout requires report.docx');
    assert.equal(zipcheck([guidedZip, AT_ISO]).status, 1, 'the /scenario/ layout has no report.docx');
    const wrong = [...digests];
    wrong[0] = '0'.repeat(64);
    assert.equal(zipcheck([layout, guidedZip, AT_ISO, ...wrong]).status, 1);

    // A nested report missing a media part its relationships name.
    const members = unzip((await guidedArchive(full, STAMPS, AT, recording().rasterize)).bytes);
    const parts = unzip(members.get(REPORT_MEMBER)!);
    parts.delete('word/media/chart-6.png');
    const brokenDocx = zip([...parts].map(([name, bytes]) => ({ name, bytes })), AT);
    const brokenZip = `${OUT_DIR}broken.zip`;
    writeFileSync(brokenZip, zip([...members].map(([name, bytes]) => ({ name, bytes: name === REPORT_MEMBER ? brokenDocx : bytes })), AT));
    const broken = zipcheck([layout, brokenZip, AT_ISO, ...digests]);
    assert.equal(broken.status, 1);
    assert.match(broken.output, /image relationships/);

    // A nested report whose document lost the ODC-By 1.0 notice (G-28).
    const clean = unzip(members.get(REPORT_MEMBER)!);
    const notice = copyText('ddd5.9.licenceNotice');
    const text = new TextDecoder().decode(clean.get('word/document.xml')!);
    assert.ok(text.includes(notice));
    clean.set('word/document.xml', new TextEncoder().encode(text.split(notice).join('Contains information.')));
    const noNoticeDocx = zip([...clean].map(([name, bytes]) => ({ name, bytes })), AT);
    const noNoticeZip = `${OUT_DIR}no-notice.zip`;
    writeFileSync(noNoticeZip, zip([...members].map(([name, bytes]) => ({ name, bytes: name === REPORT_MEMBER ? noNoticeDocx : bytes })), AT));
    const noNotice = zipcheck([layout, noNoticeZip, AT_ISO, ...digests]);
    assert.equal(noNotice.status, 1);
    assert.match(noNotice.output, /report\.docx: word\/document\.xml lacks the ODC-By 1\.0 notice/);
  });
});
