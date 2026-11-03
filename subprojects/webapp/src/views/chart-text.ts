// The chart-text generators of docs/app/ddd.md §5.11 (Chart text
// alternatives): `chartLabel(state)`, the chart's accessible name;
// `binTableSpec(binsByGroup, groups, edges)` and `fieldTableSpec(rows,
// order)`, the chart-data tables; and `segmentTitle`, a bar segment's
// native `<title>` (§5.12). With them, the quantity and range formats
// that §5.11 fixes, the panels' canonical labels of PDD §5.11, and the
// slot filling of registry templates. Every reader-facing string comes
// from the copy registry (§5.8); values print through `displayRound` and
// counts through `formatCount` (`format.ts`).
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import type { FieldRow } from '../decode/fields';
import { compareCodePoints, type MeasurementName, type PanelView } from '../state/state';
import { copyEntry, copyText } from './copy';
import { displayRound, formatCount } from './format';

// --------------------------------------------------------------------
// Registry templates
// --------------------------------------------------------------------

/**
 * The text of the registry entry `key` with each of its declared slots
 * `{name}` replaced by `values[name]` (§5.8, Copy registry: views compose
 * text by filling slots). Throws when a declared slot has no value or a
 * value names no declared slot.
 */
export function fillCopy(key: string, values: { readonly [slot: string]: string }): string {
  const entry = copyEntry(key);
  for (const name of Object.keys(values)) {
    if (!entry.slots.includes(name)) {
      throw new Error(`copy: ${key} has no slot ${name}`);
    }
  }
  let text = entry.text;
  for (const name of entry.slots) {
    const value = values[name];
    if (value === undefined) {
      throw new Error(`copy: no value for slot ${name} of ${key}`);
    }
    text = text.split(`{${name}}`).join(value);
  }
  return text;
}

// --------------------------------------------------------------------
// Labels, quantities, and ranges
// --------------------------------------------------------------------

/** The registry keys of the panels' canonical labels with unit (PDD §5.11). */
const LABEL_KEYS: { readonly [m in MeasurementName]: string } = {
  scarp_height: 'pdd5.11.scarpHeightLabel',
  dzw: 'pdd5.11.dzwLabel',
  scarp_dip: 'pdd5.11.scarpDipLabel',
};

/** The measurement's canonical label with unit (PDD §5.11): "Scarp height (m)". */
export function measurementLabel(m: MeasurementName): string {
  return copyText(LABEL_KEYS[m]);
}

/** The unit of each measurement (§5.11, Formatting): metres or degrees. */
const UNITS: { readonly [m in MeasurementName]: 'm' | '°' } = {
  scarp_height: 'm',
  dzw: 'm',
  scarp_dip: '°',
};

/** A unit as printed after a value: a space and `m`, or `°` with no space (§5.11, Formatting). */
function unitSuffix(m: MeasurementName): string {
  return UNITS[m] === 'm' ? ' m' : '°';
}

/** A quantity (§5.11, Formatting): `displayRound(v, decimals)` and its unit — `1.25 m`, `62°`. */
export function quantityText(v: number, m: MeasurementName, decimals: number): string {
  return displayRound(v, decimals) + unitSuffix(m);
}

/** A range (§5.11, Formatting): `{lo}–{hi} m` or `{lo}–{hi}°`, each end by `displayRound(v, decimals)`. */
export function rangeText(lo: number, hi: number, m: MeasurementName, decimals: number): string {
  return `${displayRound(lo, decimals)}–${displayRound(hi, decimals)}${unitSuffix(m)}`;
}

/**
 * A recording-step edge in physical units: `e / 1000`, dividing by the
 * integer literal (§5.12, Histogram step (g)) — the divisor D of all
 * three measurements (§5.4).
 */
export function edgeValue(steps: number): number {
  return steps / 1000;
}

// --------------------------------------------------------------------
// Chart label and segment title
// --------------------------------------------------------------------

/** What the chart label names (§5.11, `chartLabel(state)`). */
export interface ChartLabelState {
  readonly measurement: MeasurementName;
  /** The chart kind: the panel's view. */
  readonly view: PanelView;
  /** N, the panel head's valid count (`counts.valid`), never the matching-record count. */
  readonly valid: number;
  /** The D-13 family view; histogram only. */
  readonly familyView: boolean;
  /** Whether the histogram is drawn on the logarithmic scale; histogram only. */
  readonly logScale: boolean;
  /** Whether the panel draws field ticks. */
  readonly fieldTicks: boolean;
}

/**
 * The chart's accessible name (§5.11): "{label}: histogram of {N} valid
 * measurements", then ", stacked by scarp type" (family view: ", stacked
 * by scarp family") and, on the logarithmic scale, ", logarithmic value
 * axis"; or "{label}: cumulative distribution of {N} valid
 * measurements"; either followed by ", with field measurements marked"
 * while the panel draws field ticks.
 */
export function chartLabel(state: ChartLabelState): string {
  const slots = { label: measurementLabel(state.measurement), N: formatCount(state.valid) };
  let text: string;
  if (state.view === 'histogram') {
    text = fillCopy('ddd5.11.histogramLabel', slots);
    text += copyText(state.familyView ? 'ddd5.11.stackedByFamily' : 'ddd5.11.stackedByType');
    if (state.logScale) text += copyText('ddd5.11.logAxisClause');
  } else {
    text = fillCopy('ddd5.11.cumulativeLabel', slots);
  }
  if (state.fieldTicks) text += copyText('ddd5.11.fieldMarkedClause');
  return text;
}

/**
 * A bar segment's native `<title>` (§5.12): "{group}: {count} of {total}
 * ({range})" — `group` the legend label, `count` and `total` (the bar's
 * total) by `formatCount`, `range` the bin as a §5.11 range, or "below
 * 0.1 m" on the leading bar.
 */
export function segmentTitle(group: string, count: number, total: number, range: string): string {
  return fillCopy('ddd5.12.segmentTitle', {
    group,
    count: formatCount(count),
    total: formatCount(total),
    range,
  });
}

// --------------------------------------------------------------------
// Chart-data tables
// --------------------------------------------------------------------

/** A chart-data table (§5.11, Markup): its caption, column headers, and rows. */
export interface TableSpec {
  readonly caption: string;
  /** The header row, each a `<th scope="col">`. */
  readonly head: readonly string[];
  /** One row each: its `<th scope="row">` header, or null for none, then its `<td>` cells. */
  readonly rows: readonly { readonly header: string | null; readonly cells: readonly string[] }[];
}

/** One stacking group of a histogram (§5.12): its legend label and fill color. */
export interface StackGroup {
  readonly label: string;
  readonly color: string;
}

/** A histogram's stacking groups, in canonical order (§5.12): the six classes, or the three base types. */
export interface StackGroups {
  /** Whether the D-13 family view folds the classes into their base types. */
  readonly family: boolean;
  readonly items: readonly StackGroup[];
}

/** A histogram's bin edges (§5.12): what the bin table's row headers print. */
export interface BinEdges {
  readonly measurement: MeasurementName;
  /** The measurement's D-23 decimals (dd). */
  readonly decimals: number;
  /** The ascending edges in recording steps, one more than the bins. */
  readonly steps: readonly number[];
  /** Whether the leading "below 0.1 m" bar is drawn, its counts first in `binsByGroup` (logarithmic scale). */
  readonly below: boolean;
}

/**
 * The bin table (§5.11): caption "{label}: valid measurements per bin, by
 * scarp type" (family view: "… by scarp family"); one header row — the
 * label, each group's legend label in canonical order, then "Total"; one
 * row per bin, ascending, headed "{lo}–{hi}" (the bin's edges at dd
 * decimals) — after a first "below 0.1 m" row while the leading bar is
 * drawn — then each group's count and the total by `formatCount`.
 * `binsByGroup` holds one row of per-group counts per bin, the leading
 * bar's first, the same arrays the bars are drawn from.
 */
export function binTableSpec(
  binsByGroup: readonly (readonly number[])[],
  groups: StackGroups,
  edges: BinEdges,
): TableSpec {
  const bins = edges.steps.length - 1;
  const lead = edges.below ? 1 : 0;
  if (bins < 1 || binsByGroup.length !== bins + lead) {
    throw new Error(`binTableSpec: ${binsByGroup.length} rows for ${bins} bins`);
  }
  const label = measurementLabel(edges.measurement);
  const rows = binsByGroup.map((counts, row) => {
    if (counts.length !== groups.items.length) {
      throw new Error(`binTableSpec: ${counts.length} counts for ${groups.items.length} groups`);
    }
    const j = row - lead;
    const header =
      j < 0
        ? copyText('ddd5.12.belowLabel')
        : fillCopy('ddd5.11.binRowHeader', {
            lo: displayRound(edgeValue(edges.steps[j]), edges.decimals),
            hi: displayRound(edgeValue(edges.steps[j + 1]), edges.decimals),
          });
    let total = 0;
    for (const count of counts) total += count;
    return { header, cells: [...counts.map(formatCount), formatCount(total)] };
  });
  return {
    caption: fillCopy(groups.family ? 'ddd5.11.binTableCaptionFamily' : 'ddd5.11.binTableCaption', { label }),
    head: [label, ...groups.items.map((g) => g.label), copyText('ddd5.11.binTableTotal')],
    rows,
  };
}

/** One overlay group of a panel (§5.8, Field overlay): its (`source`, `source_quantity`) pair and its label. */
export interface FieldGroup {
  readonly source: string;
  readonly sourceQuantity: string;
  /** The §5.8 overlay group label of the pair (PDD §4.4 wording). */
  readonly label: string;
}

/** The field table's ordering and wording for one panel (§5.11, `fieldTableSpec(rows, order)`). */
export interface FieldOrder {
  readonly measurement: MeasurementName;
  /** The measurement's D-23 decimals (dd). */
  readonly decimals: number;
  /** The panel's groups in the PDD §4.4 order. */
  readonly groups: readonly FieldGroup[];
  /** The §5.8 limited-comparison wording that follows a group label when `limited_comparison` is true. */
  readonly limitedComparison: string;
}

const fieldTables = new WeakMap<readonly FieldRow[], WeakMap<FieldOrder, TableSpec>>();

/**
 * The field table (§5.11): caption "{label}: field measurements marked on
 * the chart"; columns "Source and measure" (the group label, then the
 * limited-comparison wording when the row carries `limited_comparison`),
 * "Event" ("{eq_name} (M {magnitude})", or the bare `eq_name` when
 * `magnitude` is null, `String(magnitude)`), and "Value (m)"
 * (`displayRound(value, dd)`). Rows are exactly `rows`, grouped by
 * (`source`, `source_quantity`) in `order.groups` order, ascending by
 * value within a group, ties broken by `eq_name` in code-point order. A
 * row of no listed group throws. Memoized per (`rows`, `order`) — the
 * caller passes the same arrays for one (analogue, default set or
 * show-all).
 */
export function fieldTableSpec(rows: readonly FieldRow[], order: FieldOrder): TableSpec {
  let byOrder = fieldTables.get(rows);
  const cached = byOrder?.get(order);
  if (cached !== undefined) return cached;

  const groupIndex = (row: FieldRow): number => {
    const k = order.groups.findIndex((g) => g.source === row.source && g.sourceQuantity === row.sourceQuantity);
    if (k < 0) {
      throw new Error(`fieldTableSpec: no group for ${row.source} ${row.sourceQuantity}`);
    }
    return k;
  };
  const sorted = rows
    .map((row) => ({ row, group: groupIndex(row) }))
    .sort((a, b) => a.group - b.group || a.row.value - b.row.value || compareCodePoints(a.row.eqName, b.row.eqName));
  const spec: TableSpec = {
    caption: fillCopy('ddd5.11.fieldTableCaption', { label: measurementLabel(order.measurement) }),
    head: [
      copyText('ddd5.11.fieldSourceColumn'),
      copyText('ddd5.11.fieldEventColumn'),
      fillCopy('ddd5.11.fieldValueColumn', { unit: UNITS[order.measurement] }),
    ],
    rows: sorted.map(({ row, group }) => ({
      header: null,
      cells: [
        order.groups[group].label + (row.limitedComparison ? order.limitedComparison : ''),
        row.magnitude === null
          ? row.eqName
          : fillCopy('ddd5.11.fieldEvent', { eq_name: row.eqName, magnitude: String(row.magnitude) }),
        displayRound(row.value, order.decimals),
      ],
    })),
  };
  if (byOrder === undefined) {
    byOrder = new WeakMap();
    fieldTables.set(rows, byOrder);
  }
  byOrder.set(order, spec);
  return spec;
}
