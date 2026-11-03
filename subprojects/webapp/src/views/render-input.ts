// The `RenderInput` of docs/app/ddd.md §5.8 (View layer): the one
// immutable value each render pass receives — the engine result with the
// statistics and histograms computed from it, the accepted Scenario
// snapshot with its sequence number, and the `Vintage` they were computed
// over — plus the four members §5.8 names and every module uses under
// these names: `windows`, `flags`, `regression`, and `field`. The current
// display state travels beside it, never inside it.
//
// The frame that computes a result fixes every member but `field`; a
// later render takes a `RenderInput` with the same computed members and
// the current `field` (§5.8), so it repeats no calculation.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import type { RangeFlag } from '../convert/convert';
import type { Vintage } from '../decode/decode';
import type { FieldRow, Regression } from '../decode/fields';
import type { PerDipWindows, Selection } from '../engine/query';
import type { Scenario, MeasurementName } from '../state/state';
import type { Histogram, HistogramLog } from '../stats/histogram';
import type { Stats, ValidValues } from '../stats/stats';

/** One measurement's computed values (§5.1 event flow): `validValues`, `summarize`, and `histogram`. */
export interface MeasurementResult {
  /** The valid values, `sorted` ascending among them (§5.4). */
  readonly values: ValidValues;
  /** The FR-O2 statistics, null at valid 0 (§5.4). */
  readonly stats: Stats | null;
  /** The DD-5 histogram, null at valid 0 (§5.12). */
  readonly histogram: Histogram | null;
}

/** One selected dip's range flag (§5.8, `flags`). */
export interface DipRangeFlag {
  readonly faultDip: number;
  readonly rangeFlag: RangeFlag;
}

/** What one render pass renders (§5.8). */
export interface RenderInput {
  /** The engine result, `query`'s `Selection` (§5.3). */
  readonly selection: Selection;
  /** Per measurement, the statistics and histograms computed from `selection`. */
  readonly measurements: { readonly [m in MeasurementName]: MeasurementResult };
  /** The width panel's logarithmic histogram, `histogramLog` of `dzw`; null when not offered (§5.12). */
  readonly histogramLog: HistogramLog | null;
  /** The accepted Scenario snapshot the result was computed from (§5.3). */
  readonly scenario: Scenario;
  /** That Scenario's sequence number (§5.3, Scheduling). */
  readonly sequence: number;
  /** The vintage the result was computed over (§5.2). */
  readonly vintage: Vintage;
  /** Offset mode: the `PerDipWindows` of every modeled dip that `query` used; null in slip mode. */
  readonly windows: PerDipWindows | null;
  /** Offset mode: one `{ faultDip, rangeFlag }` per selected dip, ascending; null in slip mode. */
  readonly flags: readonly DipRangeFlag[] | null;
  /** Offset mode: the loaded `Regression` the windows were converted with (§3.5); null in slip mode. */
  readonly regression: Regression | null;
  /**
   * The field export's rows while its state is `ready`, `'failed'` while
   * it is `failed`, null otherwise (§5.3 item 3).
   */
  readonly field: readonly FieldRow[] | 'failed' | null;
}
