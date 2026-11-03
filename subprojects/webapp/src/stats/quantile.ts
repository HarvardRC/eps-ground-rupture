// The percentile algorithm of docs/app/ddd.md §5.4 (Percentiles):
// `quantileLinear`, NumPy's `'linear'` method with its endpoint branch,
// the twin of the reference generator's `quantile_linear` (§3.6). The
// statistics of `stats.ts`, the DD-5 bin rule of `histogram.ts`, and the
// percentile read-off and pre-marks of §5.12 all call it.
//
// It imports nothing, so the measurement suite of §7.6 can take this
// file with no further sources.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

/**
 * The `p`-quantile of the ascending float64 values `v` by NumPy's
 * `'linear'` method (§5.4), with `p` the float64 quotient `q / 100` of
 * an integer `q` in 0…100. The two-branch interpolation and the endpoint
 * branch follow §5.4 operation for operation. Throws on an empty `v`,
 * which §5.4 never passes.
 */
export function quantileLinear(v: ArrayLike<number>, p: number): number {
  const n = v.length;
  if (n === 0) {
    throw new Error('quantileLinear: no value');
  }
  const h = (n - 1) * p;
  if (h >= n - 1) return v[n - 1];
  const i = Math.floor(h);
  const t = h - i;
  const a = v[i];
  const b = v[i + 1];
  const d = b - a;
  return t < 0.5 ? a + d * t : b - d * (1 - t);
}
