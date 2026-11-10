// The result report of guided DDD §13 (PDD §6.5, D-40, D-48): the guided
// download's archive, composed here from README.txt first (G-30), the four
// shared text members of DDD §5.9 (`packageTexts`, unchanged), and
// `report.docx` last, written by
// the shared `zip` writer (unchanged) at the handler's one `generatedAt`.
//
// `report.docx` is itself a stored ZIP of the minimal OOXML part set of
// §13.4: `[Content_Types].xml`, `_rels/.rels`, `word/document.xml`,
// `word/_rels/document.xml.rels`, and one `word/media/chart-<n>.png` per
// drawn chart in document order. Direct run and paragraph properties, no
// styles part. Every XML part is a deterministic function of the
// `RenderInput`, the version stamps, and `generatedAt`; only the PNG bytes
// come from the browser, through the injected `Rasterize`.
//
// The chart set is fixed (§13.3): per measurement the linear histogram and
// the cumulative curve, whatever the page's toggles say; below the chart
// floor the page's notice stands in the charts' place.
//
// A browser-and-Node file (DDD §5.1): no DOM global, no DOM type.

import * as config from '../config';
import { README_MEMBER, readmeText } from './readme';
import { PACKAGE_MEMBER_NAMES, packageTexts, provenanceText, utcInstant, type VersionStamps } from '../download/package';
import { downloadFileName } from '../download/file-name';
import { zip, type ZipMember } from '../download/zip';
import { MEASUREMENT_NAMES, type MeasurementName } from '../state/state';
import { fillCopy, measurementLabel } from '../views/chart-text';
import { copyText } from '../views/copy';
import { formatCount } from '../views/format';
import { NOTICE_KEYS, noticeText, selectNotices, type NoticeRef } from '../views/notices';
import type { RenderInput } from '../views/render-input';
import { statsRows, unclassifiedLine } from '../views/stats-table';
import { summaryText } from '../views/summary';
import { serializeSvg, type SvgNode } from '../views/svg';
import { canChart, cumulativeChart, histogramBins, histogramChart } from './charts';
import { guided } from './copy-overlay';
import { measurementsUsed, matchingStages, missingExcluded, NEGATIVE_HEIGHT_NOTE, negativeHeights, NO_MATCHES, PROVENANCE_HEADING, REPORT_TITLE, STATISTIC_HEADING, VALUE_HEADING, VIEW_NAMES } from './wording';

/**
 * The browser-bound step (§13.4): `svg`, a standalone SVG document of
 * `width` × `height` CSS px, drawn at twice that size and encoded as PNG.
 */
export type Rasterize = (svg: string, width: number, height: number) => Promise<Uint8Array>;

/** The report member's name, last in the guided archive (§13.1). */
export const REPORT_MEMBER = 'report.docx';

/** The guided archive's members, in order (§13.6). */
export const GUIDED_MEMBER_NAMES = [README_MEMBER, ...PACKAGE_MEMBER_NAMES, REPORT_MEMBER] as const;
/** The guided archive without its report (§13.5 fallback): README.txt, then the shared package. */
export const GUIDED_FALLBACK_MEMBER_NAMES = [README_MEMBER, ...PACKAGE_MEMBER_NAMES] as const;

/** The fixed parts of `report.docx`, before its media (§13.4). */
export const REPORT_PARTS = ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/_rels/document.xml.rels'] as const;

/** The CSS size every report chart is drawn at; 600 px fits a Letter page's 6.5-inch text width. */
export const REPORT_CHART_WIDTH = 600;
export const REPORT_CHART_HEIGHT = 300;

/** EMU per CSS pixel (§13.4). */
const EMU_PER_PX = 9525;

/** "Cite: Chiama et al. (2025)", the D-14 caption field (PDD §6.3). */
const CITE = 'Cite: Chiama et al. (2025)';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** One chart of the fixed set (§13.3), in document order. */
export interface ReportChart {
  readonly measurement: MeasurementName;
  readonly view: 'histogram' | 'cumulative';
  /** The guided chart, as the page draws it. */
  readonly svg: SvgNode;
}

/** The fixed chart set of `input` (§13.3): two per measurement the page charts, histogram first, in the PDD §4.1 order. */
export function reportCharts(input: RenderInput): readonly ReportChart[] {
  const charts: ReportChart[] = [];
  if (selectNotices(input, config).state === 'empty') return charts;
  for (const m of MEASUREMENT_NAMES) {
    if (!canChart(input, m)) continue;
    charts.push({ measurement: m, view: 'histogram', svg: histogramChart(histogramBins(input, m, false), REPORT_CHART_WIDTH) });
    charts.push({ measurement: m, view: 'cumulative', svg: cumulativeChart(input, m, REPORT_CHART_WIDTH, null) });
  }
  return charts;
}

/** `node` as a standalone SVG document an image decoder accepts: the namespace on the root. */
export function standaloneSvg(node: SvgNode): string {
  return serializeSvg({ tag: node.tag, attrs: [['xmlns', SVG_NS], ...node.attrs], children: node.children });
}

// --------------------------------------------------------------------
// WordprocessingML
// --------------------------------------------------------------------

const xml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Half-point sizes: title 16 pt, headings 14 pt, body 11 pt, tables 10 pt, captions 9 pt. */
const SIZE = { title: 32, heading: 28, body: 22, table: 20, caption: 18 } as const;

interface RunStyle {
  readonly bold?: boolean;
  readonly size?: number;
  /** Six hexadecimal digits. */
  readonly color?: string;
}

function run(text: string, style: RunStyle = {}): string {
  const props = `${style.bold ? '<w:b/><w:bCs/>' : ''}${style.color ? `<w:color w:val="${style.color}"/>` : ''}<w:sz w:val="${style.size ?? SIZE.body}"/><w:szCs w:val="${style.size ?? SIZE.body}"/>`;
  return `<w:r><w:rPr>${props}</w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r>`;
}

interface ParagraphStyle {
  /** Space after, in twentieths of a point. */
  readonly after?: number;
  readonly before?: number;
  readonly keepNext?: boolean;
}

function paragraph(runs: string, style: ParagraphStyle = {}): string {
  return `<w:p><w:pPr>${style.keepNext ? '<w:keepNext/>' : ''}<w:spacing w:before="${style.before ?? 0}" w:after="${style.after ?? 120}"/></w:pPr>${runs}</w:p>`;
}

const text = (value: string, style: RunStyle = {}, paragraphStyle: ParagraphStyle = {}): string => paragraph(run(value, style), paragraphStyle);
const heading = (value: string): string => text(value, { bold: true, size: SIZE.heading }, { before: 240, after: 120, keepNext: true });

const BORDER = 'w:val="single" w:sz="4" w:space="0" w:color="auto"';
const COLUMNS = [3600, 2400] as const;

function table(head: readonly string[], rows: readonly (readonly string[])[]): string {
  const cell = (value: string, column: number, bold: boolean): string =>
    `<w:tc><w:tcPr><w:tcW w:w="${COLUMNS[column]}" w:type="dxa"/></w:tcPr>${paragraph(run(value, { bold, size: SIZE.table }), { after: 0 })}</w:tc>`;
  const header = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${head.map((value, i) => cell(value, i, true)).join('')}</w:tr>`;
  const body = rows.map(row => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${row.map((value, i) => cell(value, i, i === 0)).join('')}</w:tr>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${COLUMNS[0] + COLUMNS[1]}" w:type="dxa"/><w:tblBorders><w:top ${BORDER}/><w:left ${BORDER}/><w:bottom ${BORDER}/><w:right ${BORDER}/><w:insideH ${BORDER}/><w:insideV ${BORDER}/></w:tblBorders><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${COLUMNS.map(width => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>${header}${body}</w:tbl>`;
}

/** The scenario table's columns: the label column, then the value column to the 6.5-inch text width. */
const SCENARIO_COLUMNS = [2600, 6760] as const;

/** The scenario table's label shading: light gray, by direct formatting (§13.2). */
export const SCENARIO_LABEL_FILL = 'E7E6E6';

/** The scenario table (§13.2 item 1): one row per condition, its label cell shaded and bold. */
function scenarioTable(input: RenderInput): string {
  const cell = (value: string, column: number, label: boolean): string =>
    `<w:tc><w:tcPr><w:tcW w:w="${SCENARIO_COLUMNS[column]}" w:type="dxa"/>${label ? `<w:shd w:val="clear" w:color="auto" w:fill="${SCENARIO_LABEL_FILL}"/>` : ''}</w:tcPr>${paragraph(run(value, { bold: label, size: SIZE.table }), { before: 20, after: 20 })}</w:tc>`;
  const body = scenarioRows(input).map(([label, value]) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cell(label, 0, true)}${cell(value, 1, false)}</w:tr>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${SCENARIO_COLUMNS[0] + SCENARIO_COLUMNS[1]}" w:type="dxa"/><w:tblBorders><w:top ${BORDER}/><w:left ${BORDER}/><w:bottom ${BORDER}/><w:right ${BORDER}/><w:insideH ${BORDER}/><w:insideV ${BORDER}/></w:tblBorders><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${SCENARIO_COLUMNS.map(width => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>${body}</w:tbl>`;
}

/** The inline drawing of chart `n` (1-based): relationship `rId{n}`, extent at its CSS size, its accessible name as the description. */
function drawing(n: number, description: string): string {
  const cx = REPORT_CHART_WIDTH * EMU_PER_PX;
  const cy = REPORT_CHART_HEIGHT * EMU_PER_PX;
  return paragraph(
    `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="Chart ${n}" descr="${xml(description)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${n}" name="chart-${n}.png" descr="${xml(description)}"/><pic:cNvPicPr><a:picLocks noChangeAspect="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId${n}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`,
    { after: 60, keepNext: true },
  );
}

const NAMESPACES = [
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"',
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"',
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"',
].join(' ');

/** Letter, one-inch margins. */
const SECTION = '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>';

const DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

// --------------------------------------------------------------------
// The document (§13.2)
// --------------------------------------------------------------------

/** The palette color as six hexadecimal digits, or undefined when it is not `#rrggbb`. */
function hexColor(color: string | undefined): string | undefined {
  const match = /^#([0-9a-fA-F]{6})$/.exec(color ?? '');
  return match ? match[1].toUpperCase() : undefined;
}

/** The count line in the page's wording (§13.2; the D-14 field of PDD §6.3). */
export function countLine(input: RenderInput, m: MeasurementName): string {
  const counts = input.selection.perMeasurement[m];
  return `N = ${measurementsUsed(counts.valid)} of ${matchingStages(input.selection.matchingRecords)} (${missingExcluded(counts.excludedNull)})`;
}

/** The software and data-export versions, in the provenance labels' words. */
export function versionsLine(input: RenderInput, stamps: VersionStamps): string {
  const manifest = input.vintage.manifest;
  const data = fillCopy('ddd5.9.dataExportLine', { export_version: manifest.exportVersion, export_date: manifest.exportDate });
  return `${copyText('ddd5.9.labelSoftwareVersion')}: ${stamps.softwareVersion} · ${copyText('ddd5.9.labelDataExport')}: ${data}`;
}

/**
 * The one-line scenario summary (`summaryText`, DDD §5.7; guided §13.2's
 * "DDD §5.8 wording"), settings and population
 * (§13.2): `summaryText` without its closing count token, which the count
 * line gives in the page's wording.
 */
export function scenarioSummary(input: RenderInput): string {
  const line = summaryText({ scenario: input.scenario, manifest: input.vintage.manifest }, { matchingRecords: input.selection.matchingRecords });
  const count = copyText('ddd5.7.summaryJoiner') + fillCopy('ddd5.7.tokenCount', { count: formatCount(input.selection.matchingRecords) });
  if (!line.endsWith(count)) throw new Error('report: the scenario summary does not end with its count token');
  return line.slice(0, -count.length);
}

/**
 * The scenario table's row labels, in the summary's order (DDD §5.7): the
 * guided page's own condition names (§13.2 item 1, §13.7), the movement row
 * named for the scenario's mode.
 */
export const MOVEMENT_LABELS = { offset: 'Maximum surface offset', slip: 'Fault slip' } as const;
export const scenarioLabels = (mode: 'slip' | 'offset'): readonly string[] =>
  ['Fault angle', 'Sediment strength and structure', 'Sediment depth', 'Sediment density', MOVEMENT_LABELS[mode], 'Simulation stages', 'Scarp types'];

/** The summary tokens whose templates open with their condition's name; the table drops that name from the value. */
const NAMED_TOKENS = ['ddd5.7.tokenDip', 'ddd5.7.tokenDepth', 'ddd5.7.tokenDensity', 'ddd5.7.tokenSlipWindow', 'ddd5.7.tokenScarpType'] as const;

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * The scenario table's rows (§13.2 item 1): the one-line summary broken
 * into its seven condition tokens, each value in the token's own words,
 * the leading condition name dropped where the token's template opens
 * with it ("dip 60° or 70°" → "60° or 70°").
 */
export function scenarioRows(input: RenderInput): readonly (readonly [string, string])[] {
  const labels = scenarioLabels(input.scenario.window.mode);
  const tokens = scenarioSummary(input).split(copyText('ddd5.7.summaryJoiner'));
  if (tokens.length !== labels.length) throw new Error(`report: the summary has ${tokens.length} tokens, not ${labels.length}`);
  const prefixes = NAMED_TOKENS.map(key => copyText(key).split('{')[0]);
  return tokens.map((token, i) => {
    const plain = i === 0 ? token.charAt(0).toLowerCase() + token.slice(1) : token;
    const prefix = prefixes.find(p => plain.startsWith(p));
    const value = prefix === undefined ? (i === 0 ? token : capitalize(token)) : capitalize(plain.slice(prefix.length));
    return [labels[i], value] as const;
  });
}

/** A chart's caption (§13.2): the D-14 fields as document text, and the accuracy statement on the cumulative chart. */
export function captionLines(input: RenderInput, stamps: VersionStamps, chart: Pick<ReportChart, 'measurement' | 'view'>): readonly string[] {
  return [
    `${guided(measurementLabel(chart.measurement))} · ${VIEW_NAMES[chart.view]}`,
    scenarioSummary(input),
    countLine(input, chart.measurement),
    versionsLine(input, stamps),
    CITE,
    ...(chart.view === 'cumulative' ? [guided(copyText('pdd4.1.cumulativeAccuracy'))] : []),
  ];
}

/** The notes the page shows under a measurement's heading: width's scope note, scarp dip's provisional notice (PDD §5.4). */
function measurementNotes(m: MeasurementName): readonly string[] {
  if (m === 'dzw') return [guided(copyText('pdd5.7.widthScopeNote'))];
  if (m === 'scarp_dip') return [copyText('pdd5.4.scarpDipNotice')];
  return [];
}

/** The body of `word/document.xml`, its drawings numbered from 1 in document order. */
function documentBody(input: RenderInput, stamps: VersionStamps, generatedAt: Date): string {
  const plan = selectNotices(input, config);
  const manifest = input.vintage.manifest;
  const charts = reportCharts(input);
  const parts: string[] = [];

  // 1. The title block.
  parts.push(text(REPORT_TITLE, { bold: true, size: SIZE.title }, { after: 160 }));
  parts.push(scenarioTable(input));
  parts.push(text('', { size: SIZE.caption }, { after: 60 }));
  parts.push(text(`${copyText('ddd5.9.labelGenerated')}: ${utcInstant(generatedAt)} · ${versionsLine(input, stamps)}`, { size: SIZE.caption }, { after: 200 }));

  // 2. Provenance: the blocks of provenance.txt in the page's wording
  // (§13.7): each line through the guided overlay, so a caveat the
  // overlay rewords (the decided low-slip text, D-4) reads as on the page,
  // while provenance.txt itself keeps the registry wording (G-25).
  parts.push(heading(PROVENANCE_HEADING));
  for (const block of provenanceText(input, stamps, generatedAt).split('\n\n')) {
    const [label, ...lines] = block.split('\n').filter(line => line !== '').map(line => guided(line));
    if (label === undefined) continue;
    parts.push(text(label, { bold: true }, { after: 40, keepNext: lines.length > 0 }));
    lines.forEach((line, i) => parts.push(text(line, {}, { after: i === lines.length - 1 ? 160 : 40 })));
  }

  // 3. One section per measurement, in the PDD §4.1 order.
  let n = 0;
  const unclassified = unclassifiedLine(input.selection.unclassified);
  for (const m of MEASUREMENT_NAMES) {
    parts.push(heading(guided(measurementLabel(m))));
    for (const note of measurementNotes(m)) parts.push(text(note));
    if (plan.state === 'empty') {
      parts.push(text(NO_MATCHES, { bold: true }, { keepNext: true }));
      for (const ref of plan.explainer) parts.push(text(guided(noticeText(ref))));
      continue;
    }
    const notice: NoticeRef | null = plan.panels[m];
    if (notice !== null && notice.key === NOTICE_KEYS.warning) parts.push(text(guided(noticeText(notice))));
    // The negative-height note (§15.8; D-46), where the page shows it.
    if (negativeHeights(input, m)) parts.push(text(NEGATIVE_HEIGHT_NOTE));
    const counts = input.selection.perMeasurement[m];
    const unit = m === 'scarp_dip' ? '°' : ' m';
    const rows = statsRows(input.measurements[m].stats, counts, m, config).map((row, i) => [guided(row.label), `${row.value}${i > 1 && row.value !== copyText('ddd5.8.nullMark') ? unit : ''}`]);
    parts.push(table([STATISTIC_HEADING, VALUE_HEADING], rows));
    parts.push(text(unclassified ?? '', { size: SIZE.caption }, { before: 60, after: 160 }));
    const drawn = charts.filter(chart => chart.measurement === m);
    if (drawn.length === 0) {
      // Below the chart floor the page's notice stands in the charts' place (§13.3).
      if (notice !== null && notice.key !== NOTICE_KEYS.warning) parts.push(text(guided(noticeText(notice))));
      continue;
    }
    for (const chart of drawn) {
      n += 1;
      parts.push(drawing(n, attribute(chart.svg, 'aria-label')));
      if (chart.view === 'histogram') {
        const legend = manifest.scarpClasses.map(name => run('■ ', { size: SIZE.caption, color: hexColor(manifest.scarpClassPalette[name]) }) + run(`${name}   `, { size: SIZE.caption })).join('');
        parts.push(paragraph(legend, { after: 60, keepNext: true }));
      }
      const lines = captionLines(input, stamps, chart);
      lines.forEach((line, i) => parts.push(text(line, { size: SIZE.caption }, { after: i === lines.length - 1 ? 240 : 0, keepNext: i < lines.length - 1 })));
    }
  }
  if (n !== charts.length) throw new Error(`report: ${n} drawings for ${charts.length} charts`);
  return parts.join('');
}

function attribute(node: SvgNode, name: string): string {
  return node.attrs.find(([key]) => key === name)?.[1] ?? '';
}

/** `word/document.xml` (§13.2, §13.4). */
export function documentXml(input: RenderInput, stamps: VersionStamps, generatedAt: Date): string {
  return `${DECLARATION}<w:document ${NAMESPACES}><w:body>${documentBody(input, stamps, generatedAt)}${SECTION}</w:body></w:document>`;
}

/** `[Content_Types].xml` (§13.4). */
export function contentTypesXml(): string {
  return `${DECLARATION}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
}

/** `_rels/.rels` (§13.4). */
export function packageRelsXml(): string {
  return `${DECLARATION}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
}

/** `word/_rels/document.xml.rels` (§13.4): `rId{n}` → `media/chart-{n}.png`. */
export function documentRelsXml(images: number): string {
  const rels = Array.from({ length: images }, (_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/chart-${i + 1}.png"/>`).join('');
  return `${DECLARATION}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`;
}

function isPng(bytes: Uint8Array): boolean {
  return bytes.length > PNG_SIGNATURE.length && PNG_SIGNATURE.every((b, i) => bytes[i] === b);
}

/** The parts of `report.docx` (§13.4), given one PNG per chart of `reportCharts(input)`. */
export function reportParts(input: RenderInput, stamps: VersionStamps, generatedAt: Date, pngs: readonly Uint8Array[]): readonly ZipMember[] {
  const charts = reportCharts(input);
  if (pngs.length !== charts.length) throw new Error(`report: ${pngs.length} images for ${charts.length} charts`);
  pngs.forEach((png, i) => {
    if (!isPng(png)) throw new Error(`report: chart ${i + 1} is not a PNG`);
  });
  const encoder = new TextEncoder();
  return [
    { name: REPORT_PARTS[0], bytes: encoder.encode(contentTypesXml()) },
    { name: REPORT_PARTS[1], bytes: encoder.encode(packageRelsXml()) },
    { name: REPORT_PARTS[2], bytes: encoder.encode(documentXml(input, stamps, generatedAt)) },
    { name: REPORT_PARTS[3], bytes: encoder.encode(documentRelsXml(charts.length)) },
    ...pngs.map((bytes, i) => ({ name: `word/media/chart-${i + 1}.png`, bytes })),
  ];
}

/** `report.docx` (§13.4): the charts rasterized in document order, then the stored ZIP of the parts. */
export async function reportDocx(input: RenderInput, stamps: VersionStamps, generatedAt: Date, rasterize: Rasterize): Promise<Uint8Array> {
  const pngs: Uint8Array[] = [];
  for (const chart of reportCharts(input)) pngs.push(await rasterize(standaloneSvg(chart.svg), REPORT_CHART_WIDTH, REPORT_CHART_HEIGHT));
  return zip(reportParts(input, stamps, generatedAt, pngs), generatedAt);
}

/** The guided download (§13.1, §13.5). */
export interface GuidedArchive {
  readonly fileName: string;
  readonly bytes: Uint8Array;
  /** Null when the archive carries `report.docx`; otherwise why it does not. */
  readonly reportError: unknown;
}

/**
 * The guided download of `input` (§13.1): the four DDD §5.9 members, then
 * `report.docx`, every timestamp `generatedAt`. A failure before the four
 * members exist throws, as the shared package does; a failure while
 * building the report leaves it out entirely (§13.5) and is returned.
 */
export async function guidedArchive(input: RenderInput, stamps: VersionStamps, generatedAt: Date, rasterize: Rasterize): Promise<GuidedArchive> {
  const encoder = new TextEncoder();
  const members: ZipMember[] = packageTexts(input, stamps, generatedAt).map(member => ({ name: member.name, bytes: encoder.encode(member.text) }));
  const fileName = downloadFileName(input.scenario, input.vintage.manifest, generatedAt);
  // README.txt opens the archive (G-30), naming the report only when the archive carries it.
  const readme = (withReport: boolean): ZipMember => ({ name: README_MEMBER, bytes: encoder.encode(readmeText(withReport)) });
  try {
    const report = await reportDocx(input, stamps, generatedAt, rasterize);
    return { fileName, bytes: zip([readme(true), ...members, { name: REPORT_MEMBER, bytes: report }], generatedAt), reportError: null };
  } catch (error) {
    // Anything that fails once the report is involved, the outer archive included, leaves the report out (§13.5).
    return { fileName, bytes: zip([readme(false), ...members], generatedAt), reportError: error ?? new Error('report: failed') };
  }
}

