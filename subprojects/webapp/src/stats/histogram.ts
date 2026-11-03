// The histogram bins of docs/app/ddd.md §5.12: `histogram`, the DD-5 bin
// rule (Histogram, steps (a)–(g)), and `histogramLog`, the width panel's
// logarithmic bins (Logarithmic scale, steps (a)–(d)), each the twin of
// the reference generator's `histogram()` and `histogram_log()` (§3.6)
// and returning the camelCase form of its §3.6 record. Callers pass
// `logScaleOfferRatio()` of config.ts (§5.13) as `offerRatio`.
//
// Every bin edge and assignment is integer arithmetic on recording steps;
// every power of ten is an integer literal, never `10 **` or `Math.pow`.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import { quantileLinear } from './quantile';
import { meanFromSteps, sampleSd } from './stats';

// --------------------------------------------------------------------
// Types
// --------------------------------------------------------------------

/** The DD-5 rule that set the bin width (§3.6 `histogram.rule`). */
export type HistogramRule = 'fd' | 'scott' | 'single';

/**
 * One panel's linear histogram (§3.6 `histogram.<m>`): bin j covers the
 * recording steps `[firstEdge + j·W, firstEdge + (j+1)·W)`, with
 * `W = widthUnits · u` and u one display step; `counts` holds `bins`
 * rows of six counts in canonical class order.
 */
export interface Histogram {
  readonly rule: HistogramRule;
  readonly widthUnits: number;
  readonly firstEdge: number;
  readonly bins: number;
  readonly counts: number[][];
}

/**
 * The width panel's logarithmic histogram (§3.6 `histogram_log.dzw`):
 * bin j covers the recording steps `[firstEdge · 2^j, firstEdge · 2^(j+1))`;
 * `belowCounts` holds the values below 100 steps (0.1 m) per class.
 */
export interface HistogramLog {
  readonly firstEdge: number;
  readonly bins: number;
  readonly counts: number[][];
  readonly belowCounts: number[];
}

// --------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------

/** The number of scarp classes, the width of every count row (§3.1). */
const CLASS_COUNT = 6;

/** The class code of an unclassified record (§3.1, `scarp_class`). */
const UNCLASSIFIED = 255;

/** The most bins a linear histogram may have (§5.12 step (c)). */
const MAX_BINS = 60;

/** The divisor D of the three measurements' restore rule (§5.2). */
const MEASUREMENT_DIVISOR = 1000;

/** The lowest logarithmic edge: 0.1 m in recording steps (§5.12). */
const LOG_FIRST_EDGE = 100;

/**
 * One display step u in recording steps, `10^(d − dd)` with d = 3, per
 * display decimals dd (§5.12, Histogram): integer literals.
 */
const DISPLAY_STEP_UNITS: { readonly [dd: number]: number } = { 2: 10, 1: 100, 0: 1000 };

/** `10^dd` per display decimals dd (§5.12, Histogram): integer literals. */
const DISPLAY_SCALE: { readonly [dd: number]: number } = { 2: 100, 1: 10, 0: 1 };

// --------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------

/**
 * ⌊a / b⌋ toward −∞ for an integer `a` and a positive integer `b`, by
 * exact integer arithmetic.
 */
function floorDiv(a: number, b: number): number {
  const r = a % b;
  return (a - (r < 0 ? r + b : r)) / b;
}

/**
 * Throws unless every class code is one of the six classes (§5.12 step
 * (e)): a code of 255 is a valid value of an unclassified record, which
 * the export's `unclassified-has-no-valid-measurement` rule excludes — an
 * internal failure (§5.10).
 */
function checkClasses(classes: Uint8Array): void {
  for (let k = 0; k < classes.length; k++) {
    const code = classes[k];
    if (code === UNCLASSIFIED) {
      throw new Error('histogram: a valid value has class code 255 (rule unclassified-has-no-valid-measurement)');
    }
    if (code >= CLASS_COUNT) {
      throw new Error(`histogram: class code ${code} is not a scarp class`);
    }
  }
}

/** `rows` rows of six zero counts. */
function zeroCounts(rows: number): number[][] {
  const out: number[][] = [];
  for (let j = 0; j < rows; j++) out.push(new Array<number>(CLASS_COUNT).fill(0));
  return out;
}

// --------------------------------------------------------------------
// Linear histogram
// --------------------------------------------------------------------

/**
 * The DD-5 bin rule of §5.12 (Histogram, steps (a)–(g)) over one panel's
 * valid values: `steps`, the integers s in recording steps; `classes`,
 * their class codes; `sorted`, the same values as float64, ascending
 * (§5.4); and `displayDecimals`, the panel's D-23 decimals (2, 1, or 0).
 * Null with no valid value.
 */
export function histogram(
  steps: Int32Array,
  classes: Uint8Array,
  sorted: Float64Array,
  displayDecimals: number,
): Histogram | null {
  const n = steps.length;
  if (n === 0) return null;
  checkClasses(classes);
  const u = DISPLAY_STEP_UNITS[displayDecimals];
  const scale = DISPLAY_SCALE[displayDecimals];
  if (u === undefined || scale === undefined) {
    throw new Error(`histogram: no display step for display decimals ${displayDecimals}`);
  }

  let sMin = steps[0];
  let sMax = steps[0];
  for (let k = 1; k < n; k++) {
    if (steps[k] < sMin) sMin = steps[k];
    if (steps[k] > sMax) sMax = steps[k];
  }

  // (a) Rule.
  let rule: HistogramRule;
  let k: number;
  if (sMin === sMax) {
    rule = 'single';
    k = 1;
  } else {
    const iqr = quantileLinear(sorted, 0.75) - quantileLinear(sorted, 0.25);
    let x: number;
    if (iqr > 0) {
      rule = 'fd';
      x = 2 * iqr * scale;
    } else {
      rule = 'scott';
      const mean = meanFromSteps(steps, MEASUREMENT_DIVISOR);
      x = 3.49 * sampleSd(sorted, mean) * scale;
    }
    const xCubed = x * x * x;
    const cubeN = (kk: number): number => kk * kk * kk * n;
    k = Math.max(1, Math.ceil(x / Math.cbrt(n)));
    while (k > 1 && cubeN(k - 1) >= xCubed) k--;
    while (cubeN(k) < xCubed) k++;
  }

  // (b)–(c) Edges, widened while more than 60 bins.
  let width: number;
  let firstEdge: number;
  let bins: number;
  for (;;) {
    width = k * u;
    firstEdge = width * floorDiv(sMin, width);
    bins = floorDiv(sMax - firstEdge, width) + 1;
    if (bins <= MAX_BINS) break;
    k++;
  }

  // (d)–(e) Assignment: bin ⌊(s − e0) / W⌋, lower edge included.
  const counts = zeroCounts(bins);
  for (let i = 0; i < n; i++) {
    counts[floorDiv(steps[i] - firstEdge, width)][classes[i]]++;
  }
  return { rule, widthUnits: k, firstEdge, bins, counts };
}

// --------------------------------------------------------------------
// Logarithmic histogram
// --------------------------------------------------------------------

/**
 * The width panel's logarithmic bins (§5.12, Logarithmic scale, steps
 * (a)–(d)) over its valid values as integer recording steps and their
 * class codes, with the offer ratio R (`logScaleOfferRatio()`). Null
 * exactly when the scale is not offered: no positive value, or
 * `maxpos_s ≤ R · minpos_s`.
 */
export function histogramLog(steps: Int32Array, classes: Uint8Array, offerRatio: number): HistogramLog | null {
  // (a) Offer.
  let minPos = 0;
  let maxPos = 0;
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s > 0) {
      if (minPos === 0 || s < minPos) minPos = s;
      if (s > maxPos) maxPos = s;
    }
  }
  if (minPos === 0) return null;
  if (!(maxPos > offerRatio * minPos)) return null;
  checkClasses(classes);

  // (b) Edges, by integer doubling: f, then f · 2^j until one exceeds maxpos_s.
  let firstEdge = LOG_FIRST_EDGE;
  if (minPos >= LOG_FIRST_EDGE) {
    while (firstEdge * 2 <= minPos) firstEdge *= 2;
  }
  const edges = [firstEdge];
  while (edges[edges.length - 1] <= maxPos) edges.push(edges[edges.length - 1] * 2);
  const bins = edges.length - 1;

  // (c)–(d) Assignment by integer comparison against the edge list.
  const counts = zeroCounts(bins);
  const belowCounts = new Array<number>(CLASS_COUNT).fill(0);
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s < LOG_FIRST_EDGE) {
      belowCounts[classes[i]]++;
      continue;
    }
    // The last j with edges[j] ≤ s, by binary search.
    let lo = 0;
    let hi = bins;
    while (hi - lo > 1) {
      const mid = lo + Math.floor((hi - lo) / 2);
      if (edges[mid] <= s) lo = mid;
      else hi = mid;
    }
    counts[lo][classes[i]]++;
  }
  return { firstEdge, bins, counts, belowCounts };
}
