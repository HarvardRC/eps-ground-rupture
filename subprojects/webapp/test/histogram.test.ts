// histogram.test.ts (docs/app/ddd.md §7.4, the `histogram.test.ts` row;
// §5.12 Histogram and Logarithmic scale): the mechanics of `histogram()`
// and `histogramLog()` only.
//
// - Linear: the cap loop ends with at most 60 bins; edges ascend; the
//   counts sum to n; valid 0 returns null.
// - Logarithmic, with `logScaleOfferRatio()` as `offerRatio`: every edge
//   is twice the one before, the first being 100 · 2^k recording steps;
//   each edge value from 100 to 100 · 2^20 lands in the bin that starts
//   at it, and the value one step below it in the bin before (below 100,
//   in `belowCounts`); the counts and `belowCounts` together sum to n; no
//   positive value returns null.
// - Both: identical inputs give identical output.
//
// Rules, edges, counts, and whether the logarithmic histogram is offered
// are checked against the Python-generated references by the parity
// harness (§7.2 steps 3 and 5), never against an expectation written
// here.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { logScaleOfferRatio } from '../src/config';
import { histogram, histogramLog, type Histogram, type HistogramLog } from '../src/stats/histogram';

/** One display step u in recording steps per display decimals (§5.12): integer literals. */
const DISPLAY_STEP_UNITS: { readonly [dd: number]: number } = { 2: 10, 1: 100, 0: 1000 };

/** A deterministic pseudo-random integer sequence (a 32-bit LCG). */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state;
  };
}

/** Class codes 0–5, one per step, cycling. */
function cyclingClasses(n: number): Uint8Array {
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = i % 6;
  return out;
}

/** The restored values s / 1000 ascending (§5.4), the input `histogram` takes. */
function sortedOf(steps: Int32Array): Float64Array {
  const out = new Float64Array(steps.length);
  for (let i = 0; i < steps.length; i++) out[i] = steps[i] / 1000;
  return out.sort();
}

/** The sum of every count of a table. */
function tableSum(rows: readonly (readonly number[])[]): number {
  let total = 0;
  for (const row of rows) for (const c of row) total += c;
  return total;
}

/** `100 · 2^k` by integer doubling. */
function octaveEdge(k: number): number {
  let e = 100;
  for (let j = 0; j < k; j++) e *= 2;
  return e;
}

interface LinearCase {
  readonly name: string;
  readonly dd: number;
  readonly steps: Int32Array;
}

/** Linear inputs: wide-ranging data that forces the cap, and ordinary spreads. */
function linearCases(): LinearCase[] {
  const cases: LinearCase[] = [];
  for (const dd of [2, 1, 0]) {
    // A tight cluster and one far value: the rule's width gives far more
    // than 60 bins, so the cap loop widens it.
    const clustered = [];
    for (let s = 0; s < 100; s += 2) clustered.push(s);
    clustered.push(400000);
    cases.push({ name: `cap-dd${dd}`, dd, steps: Int32Array.from(clustered) });

    // Many values over a wide range with a negative minimum.
    const next = lcg(17 + dd);
    const spread = [];
    for (let i = 0; i < 5000; i++) spread.push((next() % 260000) - 182);
    cases.push({ name: `spread-dd${dd}`, dd, steps: Int32Array.from(spread) });

    // Heavy-tailed: mostly small values, a few very large ones.
    const tail = [];
    for (let i = 0; i < 2000; i++) {
      const r = next();
      tail.push(r % 50 === 0 ? 100000 + (r % 160000) : r % 900);
    }
    cases.push({ name: `tail-dd${dd}`, dd, steps: Int32Array.from(tail) });

    // A zero interquartile range with distinct values (the Scott branch).
    cases.push({ name: `zero-iqr-dd${dd}`, dd, steps: Int32Array.from([1000, 1000, 1000, 1000, 1000, 1000, 1240]) });

    // Constant data, one value, two values.
    cases.push({ name: `constant-dd${dd}`, dd, steps: Int32Array.from([1530, 1530, 1530]) });
    cases.push({ name: `n1-dd${dd}`, dd, steps: Int32Array.from([777]) });
    cases.push({ name: `n2-dd${dd}`, dd, steps: Int32Array.from([-40, 2410]) });
  }
  return cases;
}

function linearOf(c: LinearCase): Histogram {
  const h = histogram(c.steps, cyclingClasses(c.steps.length), sortedOf(c.steps), c.dd);
  assert.ok(h !== null, `${c.name}: a histogram`);
  return h;
}

describe('histogram (linear)', () => {
  test('the cap loop ends with at most 60 bins', () => {
    for (const c of linearCases()) {
      const h = linearOf(c);
      assert.ok(Number.isInteger(h.bins) && h.bins >= 1 && h.bins <= 60, `${c.name}: ${h.bins} bins`);
      assert.equal(h.counts.length, h.bins, `${c.name}: one count row per bin`);
    }
    // The clustered cases need the cap: one display step per bin would
    // give thousands of bins.
    for (const dd of [2, 1, 0]) {
      const h = linearOf(linearCases().find((c) => c.name === `cap-dd${dd}`) as LinearCase);
      assert.ok(h.widthUnits > 1, `cap-dd${dd}: the width was widened to ${h.widthUnits} display steps`);
    }
  });

  test('edges ascend, are display-step multiples, and cover every value', () => {
    for (const c of linearCases()) {
      const h = linearOf(c);
      const u = DISPLAY_STEP_UNITS[c.dd];
      const width = h.widthUnits * u;
      assert.ok(Number.isInteger(h.widthUnits) && h.widthUnits >= 1, `${c.name}: width units ${h.widthUnits}`);
      const edges = [];
      for (let j = 0; j <= h.bins; j++) edges.push(h.firstEdge + j * width);
      for (let j = 1; j < edges.length; j++) {
        assert.ok(edges[j] > edges[j - 1], `${c.name}: edge ${j} ascends`);
      }
      for (const e of edges) assert.ok(e % u === 0, `${c.name}: edge ${e} is a multiple of u = ${u}`);
      for (const s of c.steps) {
        assert.ok(s >= edges[0] && s < edges[edges.length - 1], `${c.name}: ${s} lies within the bins`);
      }
    }
  });

  test('the counts sum to n, per class and in total', () => {
    for (const c of linearCases()) {
      const h = linearOf(c);
      const classes = cyclingClasses(c.steps.length);
      assert.equal(tableSum(h.counts), c.steps.length, `${c.name}: total`);
      for (const row of h.counts) assert.equal(row.length, 6, `${c.name}: six classes per row`);
      for (let k = 0; k < 6; k++) {
        const expected = classes.filter((code) => code === k).length;
        const actual = h.counts.reduce((acc, row) => acc + row[k], 0);
        assert.equal(actual, expected, `${c.name}: class ${k}`);
      }
    }
  });

  test('valid 0 returns null', () => {
    for (const dd of [2, 1, 0]) {
      assert.equal(histogram(new Int32Array(0), new Uint8Array(0), new Float64Array(0), dd), null);
    }
  });

  test('identical inputs give identical output', () => {
    for (const c of linearCases()) {
      const a = histogram(c.steps.slice(), cyclingClasses(c.steps.length), sortedOf(c.steps), c.dd);
      const b = histogram(c.steps.slice(), cyclingClasses(c.steps.length), sortedOf(c.steps), c.dd);
      assert.deepEqual(a, b, c.name);
    }
  });
});

/** Logarithmic inputs: offered width-like data, every step ≥ 0. */
function logCases(): { readonly name: string; readonly steps: Int32Array }[] {
  const next = lcg(101);
  const wide = [];
  for (let i = 0; i < 3000; i++) {
    const r = next();
    wide.push(r % 7 === 0 ? 0 : r % 3 === 0 ? r % 100 : 100 + (r % 900000));
  }
  const above = [];
  for (let i = 0; i < 500; i++) above.push(350 + (next() % 200000));
  above.push(350, 200349);
  return [
    { name: 'wide-with-below', steps: Int32Array.from(wide) },
    { name: 'first-edge-above-100', steps: Int32Array.from(above) },
    { name: 'zeros-and-small', steps: Int32Array.from([0, 0, 7, 55, 99, 100, 350, 1600, 25000]) },
    { name: 'on-edges', steps: Int32Array.from([100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200]) },
    { name: 'first-edge-800', steps: Int32Array.from([1000, 1500, 64000, 250000]) },
  ];
}

function logOf(name: string, steps: Int32Array, classes: Uint8Array): HistogramLog {
  const h = histogramLog(steps, classes, logScaleOfferRatio());
  assert.ok(h !== null, `${name}: offered`);
  return h;
}

describe('histogramLog', () => {
  test('edges double from a first edge 100 · 2^k, and the last bin holds the largest value', () => {
    for (const c of logCases()) {
      const h = logOf(c.name, c.steps, cyclingClasses(c.steps.length));
      let k = 0;
      while (octaveEdge(k) < h.firstEdge) k++;
      assert.equal(h.firstEdge, octaveEdge(k), `${c.name}: first edge ${h.firstEdge} is 100 · 2^k`);
      assert.ok(Number.isInteger(h.bins) && h.bins >= 1, `${c.name}: ${h.bins} bins`);
      assert.equal(h.counts.length, h.bins, `${c.name}: one count row per bin`);
      const edges = [h.firstEdge];
      for (let j = 0; j < h.bins; j++) edges.push(edges[j] * 2);
      for (let j = 1; j < edges.length; j++) {
        assert.equal(edges[j], 2 * edges[j - 1], `${c.name}: edge ${j} is twice the one before`);
      }
      let maxPos = 0;
      for (const s of c.steps) if (s > maxPos) maxPos = s;
      assert.ok(edges[h.bins - 1] <= maxPos && maxPos < edges[h.bins], `${c.name}: the last bin holds ${maxPos}`);
    }
  });

  test('each edge from 100 to 100 · 2^20 lands in the bin it opens, one step below in the bin before', () => {
    // 1 and 100 · 2^20 fix the first edge at 100 and the bins at 21, so
    // bin j starts at 100 · 2^j; the probe carries class 1, alone.
    const top = octaveEdge(20);
    for (let k = 0; k <= 20; k++) {
      const edge = octaveEdge(k);
      for (const [probe, bin] of [
        [edge, k],
        [edge - 1, k - 1],
      ]) {
        const h = logOf(`probe ${probe}`, Int32Array.from([1, probe, top]), Uint8Array.from([0, 1, 0]));
        assert.equal(h.firstEdge, 100, `probe ${probe}: first edge`);
        assert.equal(h.bins, 21, `probe ${probe}: bins`);
        const landed = h.counts.flatMap((row, j) => (row[1] === 1 ? [j] : []));
        if (bin < 0) {
          assert.deepEqual(landed, [], `probe ${probe}: in no bin`);
          assert.equal(h.belowCounts[1], 1, `probe ${probe}: below 100`);
        } else {
          assert.deepEqual(landed, [bin], `probe ${probe}: in bin ${bin}`);
          assert.equal(h.belowCounts[1], 0, `probe ${probe}: not below 100`);
        }
      }
    }
  });

  test('the counts and belowCounts together sum to n, per class and in total', () => {
    for (const c of logCases()) {
      const classes = cyclingClasses(c.steps.length);
      const h = logOf(c.name, c.steps, classes);
      assert.equal(h.belowCounts.length, 6, `${c.name}: six leading counts`);
      for (const row of h.counts) assert.equal(row.length, 6, `${c.name}: six classes per row`);
      assert.equal(tableSum(h.counts) + tableSum([h.belowCounts]), c.steps.length, `${c.name}: total`);
      for (let k = 0; k < 6; k++) {
        const expected = classes.filter((code) => code === k).length;
        const actual = h.counts.reduce((acc, row) => acc + row[k], 0) + h.belowCounts[k];
        assert.equal(actual, expected, `${c.name}: class ${k}`);
      }
    }
  });

  test('no positive value returns null', () => {
    const ratio = logScaleOfferRatio();
    assert.equal(histogramLog(new Int32Array(0), new Uint8Array(0), ratio), null);
    assert.equal(histogramLog(Int32Array.from([0]), Uint8Array.from([2]), ratio), null);
    assert.equal(histogramLog(Int32Array.from([0, 0, 0, 0]), cyclingClasses(4), ratio), null);
  });

  test('identical inputs give identical output', () => {
    for (const c of logCases()) {
      const a = histogramLog(c.steps.slice(), cyclingClasses(c.steps.length), logScaleOfferRatio());
      const b = histogramLog(c.steps.slice(), cyclingClasses(c.steps.length), logScaleOfferRatio());
      assert.deepEqual(a, b, c.name);
    }
  });
});
