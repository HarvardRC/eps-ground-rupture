// The guided page's charts: the shared DDD §5.12 builders, the guided
// copy overlay, and the guided axis-title presentation, as one SvgNode.
// The page draws them (app.ts) and the result report rasterizes the same
// nodes (report.ts; guided DDD §13.4), so both show one chart.
//
// A browser-and-Node file (DDD §5.1): no DOM global, no DOM type.

import * as config from '../config';
import type { MeasurementName } from '../state/state';
import { ecdfSpec, ecdfSvg, histogramLogSpec, histogramSpec, histogramSvg, type HistogramSpec } from '../views/charts';
import type { RenderInput } from '../views/render-input';
import type { SvgNode } from '../views/svg';
import { guidedSvg } from './copy-overlay';

/** The guided cumulative axis title. */
const CUMULATIVE_AXIS_TITLE = 'Measurements at or below (%)';

/** The x of the guided vertical-axis titles: the page's larger type needs the room. */
const AXIS_TITLE_X = '14';

/** Whether the page draws `m`'s chart: a histogram exists and the valid count reaches the chart floor (D-11). */
export function canChart(input: RenderInput, m: MeasurementName): boolean {
  const measurement = input.measurements[m];
  return measurement.histogram !== null && measurement.stats !== null && input.selection.perMeasurement[m].valid >= config.chartFloorBelow();
}

/** The histogram spec of `m`, linear or (width only, when offered) logarithmic (§9.3). */
export function histogramBins(input: RenderInput, m: MeasurementName, log: boolean): HistogramSpec {
  const measurement = input.measurements[m];
  const manifest = input.vintage.manifest;
  const specInput = {
    measurement: m,
    decimals: config.displayDecimals(m),
    valid: input.selection.perMeasurement[m].valid,
    scarpClasses: manifest.scarpClasses,
    palette: manifest.scarpClassPalette,
    familyView: false,
    fieldTicks: false,
  };
  if (log && m === 'dzw' && input.histogramLog !== null) return histogramLogSpec(input.histogramLog, specInput);
  if (measurement.histogram === null) throw new Error(`charts: ${m} has no histogram`);
  return histogramSpec(measurement.histogram, specInput);
}

/** The guided histogram of `bins` at `width` CSS px. */
export function histogramChart(bins: HistogramSpec, width: number): SvgNode {
  return guidedChart(histogramSvg(bins, width));
}

/** The guided cumulative curve of `m` at `width` CSS px, the read-off marker at `readoff` (none when null). */
export function cumulativeChart(input: RenderInput, m: MeasurementName, width: number, readoff: number | null): SvgNode {
  const spec = ecdfSpec(input.measurements[m].values.sorted, {
    measurement: m,
    decimals: config.displayDecimals(m),
    valid: input.selection.perMeasurement[m].valid,
    readoff,
    fieldTicks: false,
  });
  return guidedChart(ecdfSvg(spec, width));
}

/**
 * A shared chart in the guided presentation: the overlay wording, the
 * cumulative axis title, and every vertical-axis title moved to x = 14.
 * Only title ink changes, never data or geometry.
 */
export function guidedChart(node: SvgNode): SvgNode {
  return retitle(guidedSvg(node), null);
}

function retitle(node: SvgNode, axis: string | null): SvgNode {
  const own = node.attrs.find(([name]) => name === 'data-axis')?.[1] ?? null;
  const within = node.tag === 'g' && own !== null ? own : axis;
  const title = node.tag === 'text' && within !== null && node.attrs.some(([name]) => name === 'transform');
  if (title) {
    const y = node.attrs.find(([name]) => name === 'y')?.[1] ?? '0';
    return {
      tag: node.tag,
      attrs: node.attrs.map(([name, value]) => [name, name === 'x' ? AXIS_TITLE_X : name === 'transform' ? `rotate(-90 ${AXIS_TITLE_X} ${y})` : value] as const),
      children: within === 'cumulative' ? [CUMULATIVE_AXIS_TITLE] : node.children,
    };
  }
  return { tag: node.tag, attrs: node.attrs, children: node.children.map(child => (typeof child === 'string' ? child : retitle(child, within))) };
}
