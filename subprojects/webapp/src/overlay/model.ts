// The pure field-overlay model of docs/app/ddd.md §5.8 (Field overlay):
// `overlayRows(rows, measurement, showAll)` selects the field rows a
// panel draws — the PDD §4.4 default set or, with show-all, every row of
// the panel's analogue; `overlayGroups(rows)` groups them per (`source`,
// `source_quantity`), never pooled, in the PDD §4.4 order, each group with
// its §5.8 label, data-page link, and `limited_comparison` flag; and
// `overlayNote(measurement)` is the PDD §4.4 scarp-dip note. `fieldOrder`
// is the panel's ordering and wording for `fieldTableSpec` (§5.11).
//
// The rows are the §3.4 field-export rows that `RenderInput` carries
// (§5.8). They never reach `engine/` or `stats/`: no count, statistic, or
// matching population reads them (HLDD §6, Field overlay).
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import * as config from '../config';
import type { FieldRow } from '../decode/fields';
import type { MeasurementName, OverlayMeasurementName } from '../state/state';
import type { FieldGroup, FieldOrder } from '../views/chart-text';
import { copyText } from '../views/copy';

/** One row of the §5.8 overlay-group table: a (`source`, `source_quantity`) pair of a panel. */
interface GroupDefinition {
  readonly measurement: OverlayMeasurementName;
  readonly source: string;
  readonly sourceQuantity: string;
  /** The copy-registry key of the PDD §4.4 label. */
  readonly labelKey: string;
  /** The link to the source's section of the data page, relative to the scenario page (fixed in §5.8). */
  readonly link: string;
}

/** The §5.8 overlay-group table, per panel in the PDD §4.4 order. */
const GROUPS: readonly GroupDefinition[] = [
  { measurement: 'scarp_height', source: 'FDHI', sourceQuantity: 'vs_central_meters', labelKey: 'pdd4.4.fdhiVerticalSeparation', link: '../data/#fdhi-flatfile' },
  { measurement: 'scarp_height', source: 'SURE', sourceQuantity: 'SH', labelKey: 'pdd4.4.sureScarpHeight', link: '../data/#sure-database' },
  { measurement: 'scarp_height', source: 'Kern', sourceQuantity: 'Vertical', labelKey: 'pdd4.4.kernVerticalScarpHeight', link: '../data/#kern-county-1952' },
  { measurement: 'dzw', source: 'FDHI', sourceQuantity: 'fzw_central_meters', labelKey: 'pdd4.4.fdhiFaultZoneWidth', link: '../data/#fdhi-flatfile' },
  { measurement: 'dzw', source: 'Kern', sourceQuantity: 'DZW', labelKey: 'pdd4.4.kernDeformationZoneWidth', link: '../data/#kern-county-1952' },
  { measurement: 'dzw', source: 'SURE', sourceQuantity: 'FNC', labelKey: 'pdd4.4.sureFaultNormalComponent', link: '../data/#sure-database' },
];

/** Whether `m` is one of the two overlay panels (§5.6, `showAll`). */
export function isOverlayMeasurement(m: MeasurementName): m is OverlayMeasurementName {
  return m === 'scarp_height' || m === 'dzw';
}

// --------------------------------------------------------------------
// overlayRows
// --------------------------------------------------------------------

const NO_ROWS: readonly FieldRow[] = Object.freeze([]);

/** Per input array, the selection of each (measurement, showAll), so a panel's drawn rows keep their identity. */
const selections = new WeakMap<readonly FieldRow[], Map<string, readonly FieldRow[]>>();

/**
 * The rows panel `measurement` draws (§5.8, default sets): the rows whose
 * `analogue` is `measurement` and that belong to the default set — on the
 * scarp-height panel `labeled_set` true; on the width panel `labeled_set`
 * true and `criterion_sub50` `met` — or, with `showAll`, every row of that
 * analogue. The scarp-dip panel draws no row. The input order is kept.
 * The result is the same array for the same `rows`, `measurement`, and
 * `showAll`, so that `fieldTableSpec`'s memo holds (§5.11).
 */
export function overlayRows(rows: readonly FieldRow[], measurement: MeasurementName, showAll: boolean): readonly FieldRow[] {
  if (!isOverlayMeasurement(measurement)) return NO_ROWS;
  let byKey = selections.get(rows);
  if (byKey === undefined) {
    byKey = new Map();
    selections.set(rows, byKey);
  }
  const key = `${measurement}|${showAll}`;
  const cached = byKey.get(key);
  if (cached !== undefined) return cached;
  const inDefaultSet =
    measurement === 'scarp_height'
      ? (row: FieldRow): boolean => row.labeledSet
      : (row: FieldRow): boolean => row.labeledSet && row.criterionSub50 === 'met';
  const selected = Object.freeze(rows.filter((row) => row.analogue === measurement && (showAll || inDefaultSet(row))));
  byKey.set(key, selected);
  return selected;
}

// --------------------------------------------------------------------
// overlayGroups
// --------------------------------------------------------------------

/** One overlay group (§5.8): a (`source`, `source_quantity`) pair's rows, never pooled with another pair's. */
export interface OverlayGroup {
  readonly source: string;
  readonly sourceQuantity: string;
  /** The PDD §4.4 wording for the pair (§5.8 table). */
  readonly label: string;
  /** The source's section of the data page (§5.8 table). */
  readonly link: string;
  /** Whether the group's rows carry `limited_comparison` (§3.4: exactly SURE `FNC`). */
  readonly limitedComparison: boolean;
  /** The group's rows, in input order. */
  readonly rows: readonly FieldRow[];
}

/** The table position of a row's pair; throws for a pair the §5.8 table does not list. */
function groupIndex(row: FieldRow): number {
  const k = GROUPS.findIndex(
    (g) => g.measurement === row.analogue && g.source === row.source && g.sourceQuantity === row.sourceQuantity,
  );
  if (k < 0) {
    throw new Error(`overlay: no group for ${row.analogue} ${row.source} ${row.sourceQuantity}`);
  }
  return k;
}

/**
 * The groups of `rows` (§5.8): one per (`source`, `source_quantity`) pair
 * present, never pooled, in the PDD §4.4 order of the §5.8 table, each
 * carrying its label, link, and whether its rows carry
 * `limited_comparison`. Throws for a row whose pair the table does not
 * list.
 */
export function overlayGroups(rows: readonly FieldRow[]): readonly OverlayGroup[] {
  const members = new Map<number, FieldRow[]>();
  for (const row of rows) {
    const k = groupIndex(row);
    const list = members.get(k);
    if (list === undefined) members.set(k, [row]);
    else list.push(row);
  }
  return [...members.keys()]
    .sort((a, b) => a - b)
    .map((k) => {
      const g = GROUPS[k];
      const groupRows = members.get(k)!;
      return {
        source: g.source,
        sourceQuantity: g.sourceQuantity,
        label: copyText(g.labelKey),
        link: g.link,
        limitedComparison: groupRows.some((row) => row.limitedComparison),
        rows: groupRows,
      };
    });
}

// --------------------------------------------------------------------
// overlayNote
// --------------------------------------------------------------------

/**
 * The panel's overlay note (§5.8): for `scarp_dip` the PDD §4.4 note
 * "Field sources provide no comparable scarp-dip measurement."; null for
 * the other two measurements.
 */
export function overlayNote(measurement: MeasurementName): string | null {
  return measurement === 'scarp_dip' ? copyText('pdd4.4.scarpDipNote') : null;
}

// --------------------------------------------------------------------
// The field table's order
// --------------------------------------------------------------------

const orders = new Map<OverlayMeasurementName, FieldOrder>();

/**
 * The `order` argument of `fieldTableSpec` for an overlay panel (§5.11):
 * the panel's pairs in the PDD §4.4 order with their labels, its D-23
 * decimals, and the §5.8 limited-comparison wording — one object per
 * measurement, so `fieldTableSpec`'s memo holds.
 */
export function fieldOrder(measurement: OverlayMeasurementName): FieldOrder {
  let order = orders.get(measurement);
  if (order === undefined) {
    const groups: FieldGroup[] = GROUPS.filter((g) => g.measurement === measurement).map((g) => ({
      source: g.source,
      sourceQuantity: g.sourceQuantity,
      label: copyText(g.labelKey),
    }));
    order = Object.freeze({
      measurement,
      decimals: config.displayDecimals(measurement),
      groups: Object.freeze(groups),
      limitedComparison: copyText('ddd5.8.limitedComparison'),
    });
    orders.set(measurement, order);
  }
  return order;
}
