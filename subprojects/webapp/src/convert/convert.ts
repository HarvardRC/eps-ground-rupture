// The offset-to-slip conversion assist (docs/app/ddd.md §5.5; the
// `convert/` row of §5.1): `convertWindows(offsetMax, dips, coefficients)`,
// which back-projects offset mode's one entry `o_max` at both ends for
// each given dip with the exported §3.5 coefficients, and
// `rangeFlag(window, bounds)`, which classifies a converted window in the
// stored space the scan uses (§5.3).
//
// Entry validation is `state/parse.ts`'s (§5.7); this module receives
// only accepted entries, already converted by `Number(offsetMax)` at the
// engine boundary. Callers convert every modeled dip (§5.3). The parity
// harness replays both functions against the reference
// `synthetic.conversion` cases and GS-1's converted windows (§7.2).
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import { storedBounds, type PerDipWindows } from '../engine/query';

// --------------------------------------------------------------------
// Types
// --------------------------------------------------------------------

/**
 * A converted window's range flag (§5.5, Range flags): the §3.6
 * `range_flag` values.
 */
export type RangeFlag = 'in_range' | 'partly_out' | 'out_of_range';

/**
 * One coefficient row as `convertWindows` reads it: the §3.5 row's
 * `fault_dip`, `slope`, and `intercept` — a decoded `Regression`'s
 * `coefficients` entry or a reference `synthetic.conversion` case's.
 */
export type ConversionCoefficient = Readonly<{ faultDip: number; slope: number; intercept: number }>;

/**
 * The bounds `rangeFlag` classifies against: the decoded
 * `slip_window_bounds` record — the manifest's, or a reference
 * `synthetic.conversion` case's (§5.5).
 */
export type RangeBounds = Readonly<{ max: number; recordingStep: number }>;

/** A converted window's ends in metres: one `PerDipWindows` entry. */
export type ConvertedWindow = Readonly<{ lo: number; hi: number }>;

// --------------------------------------------------------------------
// Conversion
// --------------------------------------------------------------------

/**
 * Back-projects `offsetMax` (the float64 `o_max`) for each dip of `dips`
 * (§5.5) through `slip = (vd_hw − intercept) / slope`, each end evaluated
 * in float64 exactly as written:
 *
 *     window_lo(d) = (0 − intercept_d) / slope_d
 *     window_hi(d) = (o_max − intercept_d) / slope_d
 *
 * Returns one `{ faultDip, lo, hi }` per given dip, ascending by
 * `faultDip`. Throws — an internal failure (§5.10) — when a given dip has
 * no coefficient row or a slope that is not positive, or when a computed
 * end is not finite.
 */
export function convertWindows(
  offsetMax: number,
  dips: readonly number[],
  coefficients: readonly ConversionCoefficient[],
): PerDipWindows {
  const rows = new Map<number, ConversionCoefficient>();
  for (const row of coefficients) rows.set(row.faultDip, row);
  const ascending = [...dips].sort((a, b) => a - b);
  return ascending.map((faultDip) => {
    const row = rows.get(faultDip);
    if (row === undefined) {
      throw new Error(`convertWindows: no coefficient row for fault_dip ${faultDip}`);
    }
    const { slope, intercept } = row;
    if (!(slope > 0)) {
      throw new Error(`convertWindows: fault_dip ${faultDip}: slope ${slope} is not positive`);
    }
    const lo = (0 - intercept) / slope;
    const hi = (offsetMax - intercept) / slope;
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      throw new Error(`convertWindows: fault_dip ${faultDip}: a converted window end is not finite`);
    }
    return { faultDip, lo, hi };
  });
}

// --------------------------------------------------------------------
// Range flags
// --------------------------------------------------------------------

/**
 * The range flag of a converted window, in stored space (§5.5):
 * `[lo_s, hi_s] = storedBounds(window.lo, window.hi, bounds.recordingStep)`
 * and `max_s = Math.round(bounds.max / bounds.recordingStep)`, rounded and
 * never floored. `in_range` exactly when `lo_s ≥ 0` and `hi_s ≤ max_s`;
 * `out_of_range` exactly when `hi_s < 0` or `lo_s > max_s`; `partly_out`
 * otherwise.
 */
export function rangeFlag(window: ConvertedWindow, bounds: RangeBounds): RangeFlag {
  const [loS, hiS] = storedBounds(window.lo, window.hi, bounds.recordingStep);
  const maxS = Math.round(bounds.max / bounds.recordingStep);
  if (loS >= 0 && hiS <= maxS) return 'in_range';
  if (hiS < 0 || loS > maxS) return 'out_of_range';
  return 'partly_out';
}
