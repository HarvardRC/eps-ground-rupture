// The `Wiring` record and the `Scheduler` type of docs/app/ddd.md §5.1
// (Wiring) and §5.3 (Scheduling). `start(a, tag)` of `main.ts` hands
// every browser-only module that adds listeners one `Wiring`; the module
// keeps no other reference to the mount. `main.ts` implements the
// `Scheduler` (§5.3), which other modules reach only through these five
// operations.
//
// A browser-only file (§5.1).

import type { AppState, MeasurementName } from '../../state/state';
import type { RenderInput } from '../render-input';

/** The per-mount scheduler's five operations (§5.3, Scheduling). */
export interface Scheduler {
  /** The held `{ scenario, display }`, readable after a terminal stop. */
  current(): AppState;
  /**
   * Takes the next `{ scenario, display }`. An accepted Scenario change
   * when `next.scenario !== current().scenario`, returning the sequence
   * number it stamped; otherwise a display-only update, returning null.
   */
  update(next: AppState): number | null;
  /** Item 3's prefetch of the regression export. */
  prefetchRegression(): void;
  /**
   * Re-renders that panel's `.gre-chart` slot, its chart-data disclosure
   * contents included, from the last committed `RenderInput` at the
   * panel's current width, in the next frame; no query, no announcement.
   */
  rerenderChart(measurement: MeasurementName): void;
  /** The `RenderInput` of the last committed frame, or null before the first commit. */
  lastRenderInput(): RenderInput | null;
}

/** What a listener-adding module receives from `start(a, tag)` (§5.1, Wiring). */
export interface Wiring {
  /** The mount's `a.ac.signal`, the `signal` option of every `addEventListener` call. */
  readonly signal: AbortSignal;
  /** The per-mount scheduler. */
  readonly scheduler: Scheduler;
  /** The `role="status"` live region, the `region` of the module's own `announce` calls. */
  readonly status: HTMLElement;
}
