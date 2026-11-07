// explore-chart-export.test.ts (guided DDD §16.5): the chart-image
// export as pure functions over results that computeResult derives from
// code-built fixture vintages, with an injected rasterizer.
//
// - The D-14 strip's fields in slip and offset modes; the cumulative
//   accuracy line; caveat and note lines present exactly when active.
// - Deterministic composition for a recomputed result.
// - The sidecar: provenance.txt's lines through the guided overlay.
// - The rasterizer-failure fallback: the export rejects, so no file is saved.
// - The §16.4 file names.

import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';

import type { Vintage } from '../src/decode/decode';
import { mapRecord, REGRESSION_FIELDS, type Regression } from '../src/decode/fields';
import { provenanceText, type VersionStamps } from '../src/download/package';
import { fileNameBase } from '../src/download/file-name';
import {
  buildChartExport, caveatTexts, CITE_LINE, composeExport, exportChart, exportFileNames, exportLegend, kindWords, panelNotes, PRODUCT_LINE, sidecarText, stripLines, wrap, type ExportRasterize,
} from '../src/explore/chart-export';
import { computeResult } from '../src/explore/compute';
import { guided } from '../src/explore/copy-overlay';
import { countLine, scenarioSummary, versionsLine } from '../src/explore/report';
import { NEGATIVE_HEIGHT_NOTE } from '../src/explore/wording';
import { defaultScenario, type MeasurementName } from '../src/state/state';
import { copyText } from '../src/views/copy';
import type { RenderInput } from '../src/views/render-input';
import { serializeSvg } from '../src/views/svg';
import { buildFixture, decodeFixture, stageCountSpec } from './fixtures';

const AT = new Date('2026-11-06T12:00:00Z');
const STAMPS: VersionStamps = { softwareVersion: 'v0.4.0-test', dataVersion: 'data-v0-test' };
const DECIDED_LOW_SLIP = 'Low-slip measurements may be less reliable. Below 0.5 m of fault slip, surface deformation can be difficult to distinguish from model roughness. These values are shown, but interpret them with caution.';
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);

let large: Vintage;
let regression: Regression;
let full: RenderInput;
let slip: RenderInput;
let offset: RenderInput;
let mixed: RenderInput;

before(async () => {
  const fixture = await buildFixture(stageCountSpec(102));
  large = await decodeFixture(fixture);
  regression = mapRecord(fixture.regressionExport, REGRESSION_FIELDS, 'regression') as unknown as Regression;
  full = computeResult(large, defaultScenario(large.manifest), 1, null);
  slip = computeResult(large, { ...defaultScenario(large.manifest), window: { mode: 'slip', min: '0', max: '2' } }, 2, null);
  offset = computeResult(large, { ...defaultScenario(large.manifest), window: { mode: 'offset', offsetMax: '1' } }, 3, regression);
  const small = await decodeFixture(await buildFixture(stageCountSpec(12)));
  mixed = computeResult(small, { ...defaultScenario(small.manifest), faultDip: [30] }, 4, null);
});

/** A rasterizer that records its calls and returns a fixture PNG. */
function recording(): { rasterize: ExportRasterize; calls: { svg: string; width: number; height: number }[] } {
  const calls: { svg: string; width: number; height: number }[] = [];
  return { calls, rasterize: async (svg, width, height) => { calls.push({ svg, width, height }); return PNG; } };
}

const withMin = (input: RenderInput, m: MeasurementName, min: number): RenderInput => ({ ...input, measurements: { ...input.measurements, [m]: { ...input.measurements[m], stats: { ...input.measurements[m].stats!, min } } } });

describe('chart export: the strip (§16.2, §16.6)', () => {
  test('slip mode: product, measurement and kind, summary, count, versions, citation, in order', () => {
    const lines = stripLines(slip, STAMPS, 'scarp_height', 'histogram');
    assert.deepEqual(lines.slice(0, 6), [
      PRODUCT_LINE,
      'Scarp height (m) — Distribution',
      scenarioSummary(slip),
      countLine(slip, 'scarp_height'),
      versionsLine(slip, STAMPS),
      CITE_LINE,
    ]);
    assert.equal(PRODUCT_LINE, 'Ground Rupture Explorer — guided journey');
    assert.match(lines[2]!, /slip 0–2 m/);
    assert.match(lines[3]!, /^N = [\d,]+ measurements? used of [\d,]+ matching simulation stages? \([\d,]+ missing values? excluded\)$/);
    assert.ok(!lines.includes(guided(copyText('pdd4.1.cumulativeAccuracy'))), 'no accuracy line on a histogram');
  });

  test('offset mode: the summary names the offset window; a cumulative image adds the accuracy statement after the citation', () => {
    const lines = stripLines(offset, STAMPS, 'scarp_height', 'cumulative');
    assert.equal(lines[1], 'Scarp height (m) — Cumulative');
    assert.match(lines[2]!, /offset 0–1 m \(converted to slip per dip\)/);
    assert.equal(lines[6], guided(copyText('pdd4.1.cumulativeAccuracy')));
  });

  test('kind words follow the page: Distribution, its logarithmic scale, Cumulative', () => {
    assert.equal(kindWords('histogram'), 'Distribution');
    assert.equal(kindWords('histogram-log'), 'Distribution, logarithmic scale');
    assert.equal(kindWords('cumulative'), 'Cumulative');
    assert.equal(stripLines(full, STAMPS, 'dzw', 'histogram-log')[1], 'Deformation zone width (m) — Distribution, logarithmic scale');
  });

  test('caveats and notes join exactly when active, in the page’s wording and order', () => {
    // No window: no low-slip caveat.
    assert.deepEqual(caveatTexts(full), []);
    // A window starting at 0 m: the decided low-slip text, once.
    assert.deepEqual(caveatTexts(slip), [DECIDED_LOW_SLIP]);
    const height = stripLines(withMin(slip, 'scarp_height', 0.01), STAMPS, 'scarp_height', 'histogram');
    assert.deepEqual(height.slice(6), [DECIDED_LOW_SLIP]);
    // Width: its scope note in the research group's spelling.
    assert.deepEqual(panelNotes(full, 'dzw'), [guided(copyText('pdd5.7.widthScopeNote'))]);
    assert.match(panelNotes(full, 'dzw')[0]!, /^Deformation zone width measures/);
    // Dip: the provisional notice, everywhere the measurement appears (PDD §5.4).
    assert.deepEqual(panelNotes(full, 'scarp_dip'), [copyText('pdd5.4.scarpDipNotice')]);
    // The negative-height note only below zero, only on scarp height.
    assert.deepEqual(panelNotes(withMin(full, 'scarp_height', -0.02), 'scarp_height'), [NEGATIVE_HEIGHT_NOTE]);
    assert.deepEqual(panelNotes(withMin(full, 'scarp_height', 0), 'scarp_height'), []);
    // The small-result warning (10–29 used) in the guided wording.
    const warning = panelNotes(mixed, 'scarp_height');
    assert.equal(warning.length >= 1, true);
    assert.match(warning[0]!, /^Only \d+ measurements can be used for this scenario\. They are not less trustworthy/);
    // The strip ends with the caveat box, then the panel notes.
    const strip = stripLines(slip, STAMPS, 'dzw', 'histogram');
    assert.deepEqual(strip.slice(6), [...caveatTexts(slip), ...panelNotes(slip, 'dzw')]);
  });
});

describe('chart export: composition, sidecar, names, fallback (§§16.2–16.5)', () => {
  test('the composed SVG holds the chart at 600 × 300 and every strip word, wrapped within the line width', () => {
    const lines = stripLines(slip, STAMPS, 'scarp_dip', 'cumulative');
    const { svg, width, height } = composeExport(exportChart(slip, 'scarp_dip', 'cumulative', 84), lines);
    assert.equal(width, 600);
    assert.ok(height > 300);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="600" height="\d+" viewBox="0 0 600 \d+">/);
    assert.match(svg, /<svg x="0" y="0" [^>]*width="600" height="300"/);
    // An image decoder rejects a malformed document: no element repeats an attribute.
    for (const [tag] of svg.matchAll(/<[a-z][^>]*>/g)) {
      const names = [...tag.matchAll(/\s([\w:-]+)="/g)].map(match => match[1]);
      assert.equal(new Set(names).size, names.length, tag.slice(0, 80));
    }
    const texts = [...svg.matchAll(/<text [^>]*>([^<]*)<\/text>/g)].map(match => match[1]!.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
    const strip = texts.slice(texts.indexOf(PRODUCT_LINE));
    assert.equal(strip.join(' '), lines.join(' '));
    for (const text of lines) for (const part of wrap(text)) assert.ok(part.length <= 98 || !part.includes(' '), part);
    assert.match(svg, /font-weight="700">Ground Rupture Explorer — guided journey</);
  });

  test('a histogram image carries the scarp-type legend in the palette; a cumulative one none', () => {
    const manifest = slip.vintage.manifest;
    assert.deepEqual(exportLegend(slip, 'histogram').map(e => e.name), [...manifest.scarpClasses]);
    assert.deepEqual(exportLegend(slip, 'cumulative'), []);
    const { svg } = composeExport(exportChart(slip, 'scarp_height', 'histogram', null), stripLines(slip, STAMPS, 'scarp_height', 'histogram'), exportLegend(slip, 'histogram'));
    for (const name of manifest.scarpClasses) {
      assert.ok(svg.includes(`fill="${manifest.scarpClassPalette[name]}"/><text x=`), name);
      assert.ok(svg.includes(`>${name}</text>`), name);
    }
    const bare = composeExport(exportChart(slip, 'scarp_height', 'histogram', null), stripLines(slip, STAMPS, 'scarp_height', 'histogram'));
    assert.ok(composeExport(exportChart(slip, 'scarp_height', 'histogram', null), stripLines(slip, STAMPS, 'scarp_height', 'histogram'), exportLegend(slip, 'histogram')).height > bare.height);
  });

  test('the displayed read-off marker is part of a cumulative image', () => {
    const marked = serializeSvg(exportChart(full, 'scarp_height', 'cumulative', 50));
    const bare = serializeSvg(exportChart(full, 'scarp_height', 'cumulative', null));
    assert.notEqual(marked, bare);
  });

  test('a recomputed result composes the same bytes', () => {
    const again = computeResult(large, { ...defaultScenario(large.manifest), window: { mode: 'slip', min: '0', max: '2' } }, 9, null);
    for (const [m, kind] of [['scarp_height', 'histogram'], ['dzw', 'histogram-log'], ['scarp_dip', 'cumulative']] as const) {
      const a = composeExport(exportChart(slip, m, kind, 84), stripLines(slip, STAMPS, m, kind));
      const b = composeExport(exportChart(again, m, kind, 84), stripLines(again, STAMPS, m, kind));
      assert.equal(a.svg, b.svg, `${m} ${kind}`);
    }
  });

  test('the sidecar is provenance.txt through the guided overlay; the shared text keeps the registry wording', () => {
    const shared = provenanceText(slip, STAMPS, AT);
    const sidecar = sidecarText(slip, STAMPS, AT);
    assert.equal(sidecar, shared.split('\n').map(line => guided(line)).join('\n'));
    assert.ok(sidecar.includes(DECIDED_LOW_SLIP));
    assert.ok(!sidecar.includes(copyText('pdd5.9.lowSlipCaveat')));
    assert.ok(shared.includes(copyText('pdd5.9.lowSlipCaveat')));
    assert.equal(shared.split('\n').length, sidecar.split('\n').length);
  });

  test('names: {base}-{measurement}-{kind}.png and its -provenance.txt sidecar', () => {
    const base = fileNameBase(slip.scenario, slip.vintage.manifest, AT);
    assert.deepEqual(exportFileNames(slip, 'scarp_height', 'histogram', AT), { png: `${base}-scarp-height-histogram.png`, sidecar: `${base}-scarp-height-histogram-provenance.txt` });
    assert.equal(exportFileNames(slip, 'dzw', 'histogram-log', AT).png, `${base}-dzw-histogram-log.png`);
    assert.equal(exportFileNames(slip, 'scarp_dip', 'cumulative', AT).sidecar, `${base}-scarp-dip-cumulative-provenance.txt`);
  });

  test('an export: one rasterization at the composed size, the PNG, the sidecar, their names', async () => {
    const { rasterize, calls } = recording();
    const files = await buildChartExport(slip, STAMPS, 'dzw', 'histogram-log', null, AT, rasterize);
    assert.equal(calls.length, 1);
    const composed = composeExport(exportChart(slip, 'dzw', 'histogram-log', null), stripLines(slip, STAMPS, 'dzw', 'histogram-log'), exportLegend(slip, 'histogram-log'));
    assert.deepEqual(calls[0], composed);
    assert.equal(files.png, PNG);
    assert.equal(files.sidecar, sidecarText(slip, STAMPS, AT));
    assert.deepEqual([files.pngName, files.sidecarName], Object.values(exportFileNames(slip, 'dzw', 'histogram-log', AT)));
  });

  test('a failing or non-PNG rasterizer rejects the export, so nothing is saved', async () => {
    const failing: ExportRasterize = async () => { throw new Error('no canvas'); };
    const notPng: ExportRasterize = async () => new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    await assert.rejects(buildChartExport(full, STAMPS, 'scarp_height', 'histogram', null, AT, failing), /no canvas/);
    await assert.rejects(buildChartExport(full, STAMPS, 'scarp_height', 'histogram', null, AT, notPng), /no PNG/);
  });
});
