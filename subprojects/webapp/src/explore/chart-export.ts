// The chart-image export (guided DDD §16; PDD §6.3, D-14): the displayed
// chart at the report's geometry with the D-14 caption strip composed
// beneath it in one SVG, which the §13.4 rasterizer turns into the PNG;
// the paired provenance sidecar in the page's wording (the G-25 rule);
// and the §16.4 file names. The page's own notes — the caveat box and the
// panel notes — are composed here too, so the page and the strip share one
// list (§13.7: no second wording).
//
// A browser-and-Node file (DDD §5.1): no DOM global, no DOM type.

import * as config from '../config';
import { provenanceText, type VersionStamps } from '../download/package';
import { fileNameBase } from '../download/file-name';
import { storedBounds } from '../engine/query';
import type { MeasurementName } from '../state/state';
import { measurementLabel } from '../views/chart-text';
import { copyText } from '../views/copy';
import { CAVEAT_KEYS, NOTICE_KEYS, noticeText, selectNotices } from '../views/notices';
import type { RenderInput } from '../views/render-input';
import { serializeSvg, type SvgNode } from '../views/svg';
import { cumulativeChart, histogramBins, histogramChart } from './charts';
import { guided } from './copy-overlay';
import { countLine, REPORT_CHART_HEIGHT, REPORT_CHART_WIDTH, scenarioSummary, versionsLine } from './report';
import { NEGATIVE_HEIGHT_NOTE, negativeHeights, VIEW_NAMES } from './wording';

/** The chart kinds of §16.4: the view as displayed, width's Distribution linear or logarithmic. */
export type ChartKind = 'histogram' | 'histogram-log' | 'cumulative';

/** The strip's product and page name (§16.2). */
export const PRODUCT_LINE = 'Ground Rupture Explorer — guided journey';

/** The strip's citation line with its pointer to the full citation (§16.2). */
export const CITE_LINE = "Cite: Chiama et al. (2025). Full citation in the provenance file and on the site's How to cite page.";

/** The measurement slugs of the §16.4 file names. */
export const MEASUREMENT_SLUGS: Readonly<Record<MeasurementName, string>> = { scarp_height: 'scarp-height', dzw: 'dzw', scarp_dip: 'scarp-dip' };

/** The chart kind's words on the strip: the page's view names and its log-scale label. */
export function kindWords(kind: ChartKind): string {
  if (kind === 'cumulative') return VIEW_NAMES.cumulative;
  return kind === 'histogram-log' ? `${VIEW_NAMES.histogram}, ${copyText('ddd5.8.logScaleLabel').toLowerCase()}` : VIEW_NAMES.histogram;
}

/**
 * The caveat box above the measurement selector, in the page's wording:
 * the plan's caveats without the scarp-dip notice (the dip panel carries
 * it), and the per-dip sentence only where its window exceeds the modeled
 * maximum — it describes upper exceedance, and the conversion table
 * handles a lower-only partial range (guided DDD §5).
 */
export function caveatTexts(input: RenderInput): readonly string[] {
  const plan = selectNotices(input, config);
  const bounds = input.vintage.manifest.slipWindowBounds;
  return plan.caveats.filter(ref => {
    if (ref.key === CAVEAT_KEYS.scarpDip) return false;
    if (ref.key === CAVEAT_KEYS.perDip) {
      const window = input.windows?.find(w => w.faultDip === Number(ref.slots.Dip));
      if (window) return storedBounds(window.lo, window.hi, bounds.recordingStep)[1] > Math.round(bounds.max / bounds.recordingStep);
    }
    return true;
  }).map(ref => guided(noticeText(ref)));
}

/**
 * The notes of `m`'s panel while its chart is drawn, in the page's order:
 * width's scope note or dip's provisional notice, the small-result warning,
 * and the negative-height note (§15.8).
 */
export function panelNotes(input: RenderInput, m: MeasurementName): readonly string[] {
  const notes: string[] = [];
  if (m === 'dzw') notes.push(guided(copyText('pdd5.7.widthScopeNote')));
  if (m === 'scarp_dip') notes.push(guided(copyText('pdd5.4.scarpDipNotice')));
  const notice = selectNotices(input, config).panels[m];
  if (notice !== null && notice.key === NOTICE_KEYS.warning) notes.push(guided(noticeText(notice)));
  if (negativeHeights(input, m)) notes.push(NEGATIVE_HEIGHT_NOTE);
  return notes;
}

/**
 * The D-14 caption strip (§16.2), one entry per line before wrapping:
 * product, measurement and kind, scenario summary, count line, versions,
 * citation, the accuracy statement on a cumulative image, then the
 * displayed chart's active caveats and notes.
 */
export function stripLines(input: RenderInput, stamps: VersionStamps, m: MeasurementName, kind: ChartKind): readonly string[] {
  return [
    PRODUCT_LINE,
    `${guided(measurementLabel(m))} — ${kindWords(kind)}`,
    scenarioSummary(input),
    countLine(input, m),
    versionsLine(input, stamps),
    CITE_LINE,
    // The notice ODC-By 1.0 asks for, carried by every chart image (G-28).
    copyText('ddd5.9.licenceNotice'),
    ...(kind === 'cumulative' ? [guided(copyText('pdd4.1.cumulativeAccuracy'))] : []),
    ...caveatTexts(input),
    ...panelNotes(input, m),
  ];
}

/** The §16.4 names: `{base}-{measurement}-{kind}.png` and its `-provenance.txt` sidecar. */
export function exportFileNames(input: RenderInput, m: MeasurementName, kind: ChartKind, generatedAt: Date): { readonly png: string; readonly sidecar: string } {
  const stem = `${fileNameBase(input.scenario, input.vintage.manifest, generatedAt)}-${MEASUREMENT_SLUGS[m]}-${kind}`;
  return { png: `${stem}.png`, sidecar: `${stem}-provenance.txt` };
}

/** The sidecar (§16.3): provenance.txt's text, each line through the guided overlay; the shared builder is untouched. */
export function sidecarText(input: RenderInput, stamps: VersionStamps, generatedAt: Date): string {
  return provenanceText(input, stamps, generatedAt).split('\n').map(line => guided(line)).join('\n');
}

/** The chart as displayed, at the report's width: the view, the log scale, and the cumulative read-off. */
export function exportChart(input: RenderInput, m: MeasurementName, kind: ChartKind, readoff: number | null): SvgNode {
  return kind === 'cumulative'
    ? cumulativeChart(input, m, REPORT_CHART_WIDTH, readoff)
    : histogramChart(histogramBins(input, m, kind === 'histogram-log'), REPORT_CHART_WIDTH);
}

// --------------------------------------------------------------------
// Composition
// --------------------------------------------------------------------

/** The strip's type: size, line height, and the side padding (CSS px). */
const STRIP = { size: 11, line: 15, pad: 16, top: 14, bottom: 12, font: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' } as const;

/** Characters per strip line: a conservative average advance of 0.56 em, so no line overruns the image. */
export const WRAP_AT = Math.floor((REPORT_CHART_WIDTH - 2 * STRIP.pad) / (STRIP.size * 0.56));

/** `text` broken at spaces into lines of at most `width` characters (a longer word stands alone). */
export function wrap(text: string, width: number = WRAP_AT): readonly string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line === '') line = word;
    else if (line.length + 1 + word.length <= width) line += ` ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line !== '') lines.push(line);
  return lines;
}

const xml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A histogram's legend entry: the scarp type and its palette colour, as the page shows them beside the chart. */
export interface LegendEntry { readonly name: string; readonly color: string }

/** The legend of a histogram image (the page's legend; the report's interpretation (g)); none on a cumulative curve. */
export function exportLegend(input: RenderInput, kind: ChartKind): readonly LegendEntry[] {
  if (kind === 'cumulative') return [];
  const manifest = input.vintage.manifest;
  return manifest.scarpClasses.map(name => ({ name, color: manifest.scarpClassPalette[name] ?? '#888888' }));
}

/** The legend's rows: entries laid left to right, a new row when the next would overrun the image. */
function legendRows(legend: readonly LegendEntry[]): readonly { readonly entry: LegendEntry; readonly x: number; readonly row: number }[] {
  const out: { entry: LegendEntry; x: number; row: number }[] = [];
  let x = STRIP.pad, row = 0;
  for (const entry of legend) {
    const advance = 14 + Math.ceil(entry.name.length * STRIP.size * 0.56) + 14;
    if (x > STRIP.pad && x + advance > REPORT_CHART_WIDTH - STRIP.pad) { x = STRIP.pad; row += 1; }
    out.push({ entry, x, row });
    x += advance;
  }
  return out;
}

/**
 * The exported image as one standalone SVG (§16.2): white ground, the
 * chart at 600 × 300 CSS px, a histogram's legend, a rule, and the strip's
 * wrapped lines, the product line bold. Deterministic for a given chart,
 * legend, and strip.
 */
export function composeExport(chart: SvgNode, lines: readonly string[], legend: readonly LegendEntry[] = []): { readonly svg: string; readonly width: number; readonly height: number } {
  const wrapped = lines.flatMap((text, i) => wrap(text).map(part => ({ part, bold: i === 0 })));
  const placed = legendRows(legend);
  const legendHeight = placed.length === 0 ? 0 : (Math.max(...placed.map(p => p.row)) + 1) * STRIP.line + 6;
  const top = REPORT_CHART_HEIGHT + legendHeight;
  const width = REPORT_CHART_WIDTH;
  const height = top + STRIP.top + wrapped.length * STRIP.line + STRIP.bottom;
  // Nested in the outer document's namespace: the chart keeps its own width and height (600 × 300), placed at the origin.
  const chartSvg = serializeSvg({ tag: chart.tag, attrs: [['x', '0'], ['y', '0'], ...chart.attrs.filter(([name]) => name !== 'x' && name !== 'y')], children: chart.children });
  const text = wrapped.map(({ part, bold }, i) => `<text x="${STRIP.pad}" y="${top + STRIP.top + (i + 1) * STRIP.line - 4}"${bold ? ' font-weight="700"' : ''}>${xml(part)}</text>`).join('');
  const key = placed.map(({ entry, x, row }) => {
    const y = REPORT_CHART_HEIGHT + 4 + row * STRIP.line;
    return `<rect x="${x}" y="${y + 2}" width="10" height="10" fill="${xml(entry.color)}"/><text x="${x + 14}" y="${y + 11}">${xml(entry.name)}</text>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#ffffff"/>${chartSvg}<g font-family="${xml(STRIP.font)}" font-size="${STRIP.size}" fill="#2b2a29">${key}</g><line x1="${STRIP.pad}" y1="${top + 4}" x2="${width - STRIP.pad}" y2="${top + 4}" stroke="#c9c4be" stroke-width="1"/><g font-family="${xml(STRIP.font)}" font-size="${STRIP.size}" fill="#2b2a29">${text}</g></svg>`;
  return { svg, width, height };
}

/** The rasterizer the export uses (§13.4's, injected so the builder stays browser-and-Node). */
export type ExportRasterize = (svg: string, width: number, height: number) => Promise<Uint8Array>;

/** The two files of one export: the PNG and its sidecar, with their §16.4 names. */
export interface ChartExportFiles {
  readonly png: Uint8Array;
  readonly pngName: string;
  readonly sidecar: string;
  readonly sidecarName: string;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * One export, composed at `generatedAt`. Rejects — so nothing is saved —
 * when the rasterizer fails or returns no PNG (§16.5's fallback).
 */
export async function buildChartExport(input: RenderInput, stamps: VersionStamps, m: MeasurementName, kind: ChartKind, readoff: number | null, generatedAt: Date, rasterize: ExportRasterize): Promise<ChartExportFiles> {
  const { svg, width, height } = composeExport(exportChart(input, m, kind, readoff), stripLines(input, stamps, m, kind), exportLegend(input, kind));
  const png = await rasterize(svg, width, height);
  if (png.length < PNG_SIGNATURE.length || PNG_SIGNATURE.some((byte, i) => png[i] !== byte)) throw new Error('chart export: the rasterizer gave no PNG');
  const names = exportFileNames(input, m, kind, generatedAt);
  return { png, pngName: names.png, sidecar: sidecarText(input, stamps, generatedAt), sidecarName: names.sidecar };
}
