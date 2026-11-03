// The statistics-table builders of docs/app/ddd.md §5.8 (Statistics
// tables): `statsRows(stats, counts, measurement, cfg)`, the nine rows of
// one measurement's table in the PDD §4.2 order, and
// `unclassifiedLine(unclassified)`, the PDD §4.3 line of the table's
// `<tfoot>`. Every label and the null mark come from the copy registry
// (copy.ts); values are display-rounded here, at render time only, by
// `displayRound` at the D-23 decimals that `displayDecimals(m)` of
// config.ts reads from configuration (§5.13), and counts print through
// `formatCount`. The engine's float64 statistics are read, never mutated;
// population semantics stay the engine's (D-12).
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import type * as Config from '../config';
import type { MeasurementCounts } from '../engine/query';
import type { MeasurementName } from '../state/state';
import type { Stats } from '../stats/stats';
import { copyText } from './copy';
import { displayRound, formatCount } from './format';

/** The part of config.ts the table reads: the D-23 decimals per measurement (§5.13). */
export type StatsTableConfig = Pick<typeof Config, 'displayDecimals'>;

/** One statistics-table row (§5.8): its label and its displayed value. */
export interface StatsRow {
  readonly label: string;
  readonly value: string;
}

/** The seven statistics rows after the two count rows, in the PDD §4.2 order. */
const STAT_ROWS: readonly (readonly [key: string, member: keyof Stats])[] = [
  ['ddd5.8.rowMedian', 'median'],
  ['ddd5.8.rowP16', 'p16'],
  ['ddd5.8.rowP84', 'p84'],
  ['ddd5.8.rowMinimum', 'min'],
  ['ddd5.8.rowMaximum', 'max'],
  ['ddd5.8.rowMean', 'mean'],
  ['ddd5.8.rowStandardDeviation', 'sd'],
];

/**
 * The rows of `measurement`'s statistics table (§5.8), in the PDD §4.2
 * order: "Valid count" and "Excluded null count" from `counts` — the
 * `MeasurementCounts` of the same result's
 * `Selection.perMeasurement[measurement]` — by `formatCount`, then the
 * seven statistics of `stats` by `displayRound(v, displayDecimals(m))`.
 * A null statistic — all seven when `stats` is null, the standard
 * deviation at valid 1 (§5.4) — shows the null mark `—`.
 */
export function statsRows(
  stats: Stats | null,
  counts: MeasurementCounts,
  measurement: MeasurementName,
  cfg: StatsTableConfig,
): readonly StatsRow[] {
  const decimals = cfg.displayDecimals(measurement);
  const nullMark = copyText('ddd5.8.nullMark');
  const rows: StatsRow[] = [
    { label: copyText('ddd5.8.rowValidCount'), value: formatCount(counts.valid) },
    { label: copyText('ddd5.8.rowExcludedNullCount'), value: formatCount(counts.excludedNull) },
  ];
  for (const [key, member] of STAT_ROWS) {
    const v = stats === null ? null : stats[member];
    rows.push({ label: copyText(key), value: v === null ? nullMark : displayRound(v, decimals) });
  }
  return rows;
}

/**
 * The PDD §4.3 line, "Unclassified records excluded from scarp-type
 * views: X (zero-slip initial stages).", with X `formatCount(unclassified)`
 * when `unclassified` — the engine's matched class-code-255 count,
 * `Selection.unclassified`, never `counts.excludedNull` — is above 0;
 * null otherwise.
 */
export function unclassifiedLine(unclassified: number): string | null {
  if (!(unclassified > 0)) return null;
  const pieces = copyText('pdd4.3.unclassifiedLine').split(/\bX\b/);
  if (pieces.length !== 2) {
    throw new Error('stats-table: pdd4.3.unclassifiedLine must hold its slot X exactly once');
  }
  return pieces[0] + formatCount(unclassified) + pieces[1];
}
