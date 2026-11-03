// The summary builders of docs/app/ddd.md §5.1 (`views/*.ts`,
// `summary.ts`). This file holds `chartSummary`, the chart caption's
// statistics sentence of §5.11 (Chart text alternatives).
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import type * as Config from '../config';
import type { MeasurementCounts } from '../engine/query';
import type { MeasurementName } from '../state/state';
import type { Stats } from '../stats/stats';
import { fillCopy, measurementLabel, quantityText } from './chart-text';
import { formatCount } from './format';

/** The configuration `chartSummary` reads: callers pass the `config.ts` module namespace. */
export type ChartSummaryConfig = Pick<typeof Config, 'displayDecimals'>;

/**
 * The caption sentence (§5.11): "{label}: {N} valid measurements, median
 * {median}, 16th–84th percentile range {p16} to {p84}." — the three
 * statistics as quantities at the measurement's D-23 decimals, N
 * `formatCount(counts.valid)`, never inferred from `stats`. `counts` is
 * the same result's `Selection.perMeasurement[measurement]`. Called only
 * for a drawn chart, where `stats` is non-null; the cumulative accuracy
 * paragraph is the panel applier's, never part of this sentence.
 */
export function chartSummary(
  stats: Stats,
  counts: MeasurementCounts,
  measurement: MeasurementName,
  cfg: ChartSummaryConfig,
): string {
  const dd = cfg.displayDecimals(measurement);
  return fillCopy('ddd5.11.chartCaption', {
    label: measurementLabel(measurement),
    N: formatCount(counts.valid),
    median: quantityText(stats.median, measurement, dd),
    p16: quantityText(stats.p16, measurement, dd),
    p84: quantityText(stats.p84, measurement, dd),
  });
}
