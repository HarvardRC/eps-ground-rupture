// The CSV writer of docs/app/ddd.md §5.9: `records.csv` under
// `RECORDS_CSV_COLUMNS` and `statistics.csv` under
// `STATISTICS_CSV_COLUMNS` (src/decode/fields.ts, DD-10 names), each with
// the header row first, LF line ends, and a field quoted only when it
// contains `,`, `"`, CR, or LF, inner quotes doubled (RFC 4180 quoting).
//
// `records.csv` writes one row per selected record, in the selection's
// artifact order, each record resolved to its trial by the N-based
// mapping of §5.3 — trial `floor(i / N)`, N the manifest's
// `counts.stagesPerTrial` — and every recorded value from its recorded
// integer by integer arithmetic, never through a float. `statistics.csv`
// writes one row per measurement panel, in canonical order: the counts as
// plain digits, the FR-O2 set display-rounded exactly as rendered
// (`displayRound` at the D-23 decimals), then the same set at full
// precision by `Number.prototype.toString`; a null is an empty field.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import type * as Config from '../config';
import type { Vintage } from '../decode/decode';
import { RECORDS_CSV_COLUMNS, STATISTICS_CSV_COLUMNS, TRIAL_TABLE_COLUMNS, type ManifestColumn } from '../decode/fields';
import type { Selection } from '../engine/query';
import { MEASUREMENT_NAMES } from '../state/state';
import type { Stats } from '../stats/stats';
import { measurementLabel } from '../views/chart-text';
import { displayRound } from '../views/format';
import type { RenderInput } from '../views/render-input';

/** The configuration `statisticsCsv` reads: the D-23 decimals per measurement (§5.13). */
export type StatisticsCsvConfig = Pick<typeof Config, 'displayDecimals'>;

/** The line end of both files (§5.9, fixed here). */
const LF = '\n';

/** A field as written (§5.9): quoted only when it contains `,`, `"`, CR, or LF, inner quotes doubled. */
export function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.split('"').join('""')}"` : value;
}

/** One CSV line: the fields joined with `,`, then LF. */
function csvLine(fields: readonly string[]): string {
  return fields.map(csvField).join(',') + LF;
}

/**
 * The recorded integer `s` written with exactly `decimals` fraction
 * digits (§5.9), by integer arithmetic: `-` (U+002D) when `s < 0`, then
 * the digits of `|s|` left-padded with zeros to `decimals + 1` digits,
 * the point before the last `decimals` — `s = −182` at 3 decimals is
 * `-0.182`. Throws unless `s` is a safe integer and `decimals` a
 * positive integer.
 */
export function recordedDecimal(s: number, decimals: number): string {
  if (!Number.isSafeInteger(s)) {
    throw new Error(`csv: the recorded value ${s} is not an integer`);
  }
  if (!Number.isInteger(decimals) || decimals < 1) {
    throw new Error(`csv: decimals ${decimals} is not a positive count of places`);
  }
  const digits = String(s < 0 ? -s : s).padStart(decimals + 1, '0');
  const cut = digits.length - decimals;
  return `${s < 0 ? '-' : ''}${digits.slice(0, cut)}.${digits.slice(cut)}`;
}

/** A manifest column's `decimals`; throws when the manifest gives none. */
function decimalsOf(column: ManifestColumn, name: string): number {
  if (column.decimals === null) {
    throw new Error(`csv: the manifest gives columns.${name} no decimals`);
  }
  return column.decimals;
}

/** A scaled column's `offset_steps`; throws when the manifest gives none. */
function offsetStepsOf(column: ManifestColumn, name: string): number {
  if (column.offsetSteps === null) {
    throw new Error(`csv: the manifest gives columns.${name} no offset_steps`);
  }
  return column.offsetSteps;
}

/** The position of a trial-table column in a row (§3.1, TRIAL_TABLE_COLUMNS). */
function trialColumn(name: (typeof TRIAL_TABLE_COLUMNS)[number]): number {
  return TRIAL_TABLE_COLUMNS.indexOf(name);
}

/**
 * `records.csv` (§5.9): the `RECORDS_CSV_COLUMNS` header, then one row
 * per index of `selection.indices`, in that order. `trial` is the
 * manifest's trial string of trial `floor(i / N)`; `fault_dip` and
 * `depth` the integer dictionary values; `sediment_strength`,
 * `cohesion`, `set`, and `density` the dictionary strings verbatim;
 * `slip`, `scarp_height`, and `dzw` from `stored + offset_steps` and
 * `scarp_dip` from the dip dictionary's thousandths, each at its
 * column's `decimals`; `scarp_class` the canonical class name. A null —
 * a stored null sentinel — is an empty field; an unclassified record's
 * `scarp_class` is empty. An empty selection gives the header row only.
 */
export function recordsCsv(selection: Selection, vintage: Vintage): string {
  const manifest = vintage.manifest;
  const n = manifest.counts.stagesPerTrial;
  const width = TRIAL_TABLE_COLUMNS.length;
  const dict = manifest.trialColumns;
  const cols = manifest.columns;
  const at = {
    fault_dip: trialColumn('fault_dip'),
    sediment_strength: trialColumn('sediment_strength'),
    cohesion: trialColumn('cohesion'),
    set: trialColumn('set'),
    depth: trialColumn('depth'),
    density: trialColumn('density'),
  };

  /** A scaled stage column's field: empty for the null sentinel, else `stored + offset_steps` at its decimals. */
  const scaled = (name: 'slip' | 'scarp_height' | 'dzw', stored: Uint16Array) => {
    const column = cols[name];
    const decimals = decimalsOf(column, name);
    const offsetSteps = offsetStepsOf(column, name);
    const sentinel = column.nullSentinel;
    return (i: number): string => {
      const v = stored[i];
      return v === sentinel ? '' : recordedDecimal(v + offsetSteps, decimals);
    };
  };
  const slip = scaled('slip', vintage.slip);
  const scarpHeight = scaled('scarp_height', vintage.scarpHeight);
  const dzw = scaled('dzw', vintage.dzw);
  const dipDecimals = decimalsOf(cols.scarp_dip, 'scarp_dip');
  const dipSentinel = cols.scarp_dip.nullSentinel;
  const classSentinel = cols.scarp_class.nullSentinel;

  /** The trial-condition fields of trial `t`, in the header order. */
  const trialFields = (t: number): string => {
    const row = t * width;
    const cell = (c: number): number => vintage.trialTable[row + c];
    return [
      manifest.trials[t],
      String(dict.fault_dip[cell(at.fault_dip)]),
      dict.sediment_strength[cell(at.sediment_strength)],
      dict.cohesion[cell(at.cohesion)],
      dict.set[cell(at.set)],
      String(dict.depth[cell(at.depth)]),
      dict.density[cell(at.density)],
    ]
      .map(csvField)
      .join(',');
  };
  const trialCache = new Map<number, string>();

  const lines: string[] = [csvLine(RECORDS_CSV_COLUMNS)];
  for (const i of selection.indices) {
    const t = (i - (i % n)) / n;
    let conditions = trialCache.get(t);
    if (conditions === undefined) {
      if (t >= manifest.trials.length) {
        throw new Error(`csv: the selected index ${i} lies beyond the last trial`);
      }
      conditions = trialFields(t);
      trialCache.set(t, conditions);
    }
    const dipIndex = vintage.scarpDip[i];
    const classCode = vintage.scarpClass[i];
    const stage = [
      slip(i),
      scarpHeight(i),
      dzw(i),
      dipIndex === dipSentinel ? '' : recordedDecimal(vintage.dipDictionary[dipIndex], dipDecimals),
      classCode === classSentinel ? '' : manifest.scarpClasses[classCode],
    ];
    lines.push(`${conditions},${stage.map(csvField).join(',')}${LF}`);
  }
  return lines.join('');
}

/** The FR-O2 statistics in the §3.6 key order of the `statistics.csv` columns. */
const STAT_KEYS: readonly (keyof Stats)[] = ['median', 'p16', 'p84', 'min', 'max', 'mean', 'sd'];

/**
 * `statistics.csv` (§5.9): the `STATISTICS_CSV_COLUMNS` header, then one
 * row per measurement panel in canonical order — `measurement` (the
 * DD-10 name), `label` (the canonical label with unit), `valid` and
 * `excluded_null` as plain decimal digits, the seven statistics by
 * `displayRound(v, displayDecimals(m))` exactly as rendered, then the
 * seven as `Number.prototype.toString` writes them; a null statistic is
 * an empty field in both of its columns.
 */
export function statisticsCsv(input: RenderInput, cfg: StatisticsCsvConfig): string {
  const lines: string[] = [csvLine(STATISTICS_CSV_COLUMNS)];
  for (const m of MEASUREMENT_NAMES) {
    const counts = input.selection.perMeasurement[m];
    const stats = input.measurements[m].stats;
    const decimals = cfg.displayDecimals(m);
    const value = (k: keyof Stats): number | null => (stats === null ? null : stats[k]);
    lines.push(
      csvLine([
        m,
        measurementLabel(m),
        String(counts.valid),
        String(counts.excludedNull),
        ...STAT_KEYS.map((k) => {
          const v = value(k);
          return v === null ? '' : displayRound(v, decimals);
        }),
        ...STAT_KEYS.map((k) => {
          const v = value(k);
          return v === null ? '' : v.toString();
        }),
      ]),
    );
  }
  return lines.join('');
}
