// engine.test.ts (docs/app/ddd.md §7.4, the `engine.test.ts` row; §5.3
// Query engine): implementation properties only, on fixture vintages of
// N = 2, 100, 101, and 102 stages built with test/fixtures.ts, each of
// three trials, N taken from the fixture spec and never from the engine.
//
// - Every returned index i lies in trial floor(i / N) among the
//   masked-in trials, under masks that include one selecting only the
//   first trial and one selecting only the last.
// - Purity: identical output for identical input, and the vintage's
//   buffers unmodified.
// - The binary-searched window segments equal a linear scan over
//   [t·N, (t+1)·N) for every window whose endpoints are fixture slip
//   values or midpoints between them.
//
// These check indexing mechanics. Selection semantics — inclusive
// endpoints, the one-state rule, the two-count model, the filters, the
// diagnostic — are the Python-generated reference cases that the parity
// harness replays (§7.2 step 5), never hand-written here.

import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';

import type { Vintage } from '../src/decode/decode';
import { query, storedBounds, type PerDipWindows } from '../src/engine/query';
import { defaultScenario, type Population, type Scenario } from '../src/state/state';
import { buildFixture, decodeFixture, stageCountSpec, stepsDecimal, type FixtureSpec } from './fixtures';

/** The stage counts §7.4 requires. */
const STAGE_COUNTS = [2, 100, 101, 102];

const POPULATIONS: readonly Population[] = ['all_stages', 'one_state_per_trial'];

interface Case {
  readonly spec: FixtureSpec;
  /** N, from the fixture spec. */
  readonly n: number;
  readonly vintage: Vintage;
}

const cases = new Map<number, Case>();

before(async () => {
  for (const n of STAGE_COUNTS) {
    const spec = stageCountSpec(n);
    const vintage = await decodeFixture(await buildFixture(spec));
    cases.set(n, { spec, n: spec.stagesPerTrial, vintage });
  }
});

function caseOf(n: number): Case {
  const c = cases.get(n);
  if (c === undefined) throw new Error(`no fixture of N = ${n}`);
  return c;
}

/**
 * The trial rows a Scenario's trial conditions keep, read from the spec's
 * own rows `[trial, dip, strength, cohesion, set, depth, density]`.
 */
function maskedIn(spec: FixtureSpec, scenario: Scenario): Set<number> {
  const kept = new Set<number>();
  spec.trials.forEach(([, dip, strength, , set, depth, density], t) => {
    if (
      scenario.faultDip.includes(dip) &&
      scenario.sediment.some((p) => p.set === set && p.sedimentStrength === strength) &&
      scenario.depth.includes(depth) &&
      scenario.density.includes(density)
    ) {
      kept.add(t);
    }
  });
  return kept;
}

/** Every modeled dip's window `[lo, hi]` in metres: an offset-mode `windows`. */
function allDips(vintage: Vintage, lo: number, hi: number): PerDipWindows {
  return [...vintage.manifest.trialColumns.fault_dip]
    .sort((a, b) => a - b)
    .map((faultDip) => ({ faultDip, lo, hi }));
}

/** The masks of the index check: the first trial alone, the last alone, others. */
function masks(c: Case): { readonly name: string; readonly scenario: Scenario }[] {
  const base = defaultScenario(c.vintage.manifest);
  const rows = c.spec.trials;
  const first = rows[0];
  const last = rows[rows.length - 1];
  return [
    { name: 'every trial', scenario: base },
    { name: 'only the first trial', scenario: { ...base, faultDip: [first[1]] } },
    { name: 'only the last trial', scenario: { ...base, faultDip: [last[1]] } },
    { name: 'the first and the last trial', scenario: { ...base, depth: [first[5], last[5]] } },
    { name: 'no trial', scenario: { ...base, density: [] } },
  ];
}

/** The window variants of the index check: inactive, slip mode, offset mode. */
function windowVariants(c: Case): { readonly name: string; readonly window: Scenario['window']; readonly windows?: PerDipWindows }[] {
  const slip = c.spec.stages.slip;
  const sorted = [...new Set(slip)].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length / 4)];
  const hi = sorted[Math.floor((3 * sorted.length) / 4)];
  return [
    { name: 'inactive', window: { mode: 'slip', min: null, max: null } },
    { name: 'slip', window: { mode: 'slip', min: stepsDecimal(lo, 4), max: stepsDecimal(hi, 4) } },
    {
      name: 'offset',
      window: { mode: 'offset', offsetMax: '1' },
      windows: allDips(c.vintage, lo / 10000, hi / 10000),
    },
  ];
}

describe('engine: returned indices lie in the masked-in trials', () => {
  for (const n of STAGE_COUNTS) {
    test(`N = ${n}`, () => {
      const c = caseOf(n);
      assert.ok(c.spec.trials.length >= 2, 'at least two trials');
      const all = masks(c);
      const firstOnly = maskedIn(c.spec, all[1].scenario);
      const lastOnly = maskedIn(c.spec, all[2].scenario);
      assert.deepEqual([...firstOnly], [0], 'a mask selects only the first trial');
      assert.deepEqual([...lastOnly], [c.spec.trials.length - 1], 'a mask selects only the last trial');

      for (const mask of all) {
        const kept = maskedIn(c.spec, mask.scenario);
        let returned = 0;
        for (const variant of windowVariants(c)) {
          for (const population of POPULATIONS) {
            const scenario: Scenario = { ...mask.scenario, window: variant.window, population };
            const selection = query(c.vintage, scenario, variant.windows);
            const label = `${mask.name}, ${variant.name} window, ${population}`;
            assert.ok(selection.indices instanceof Uint32Array, label);
            assert.equal(selection.matchingRecords, selection.indices.length, label);
            let previous = -1;
            for (const i of selection.indices) {
              assert.ok(i > previous, `${label}: indices ascend`);
              previous = i;
              const t = Math.floor(i / c.n);
              assert.ok(kept.has(t), `${label}: index ${i} lies in trial ${t}, which the mask keeps out`);
              assert.ok(i >= t * c.n && i < (t + 1) * c.n, label);
            }
            returned += selection.indices.length;
          }
        }
        if (kept.size > 0) assert.ok(returned > 0, `${mask.name}: some query returns indices`);
      }
    });
  }
});

describe('engine: purity', () => {
  for (const n of STAGE_COUNTS) {
    test(`N = ${n}: identical output for identical input; the vintage's buffers unmodified`, () => {
      const c = caseOf(n);
      const { vintage } = c;
      const views = [
        vintage.trialTable,
        vintage.slip,
        vintage.scarpHeight,
        vintage.dzw,
        vintage.scarpDip,
        vintage.scarpClass,
        vintage.dipDictionary,
      ];
      const buffer = new Uint8Array(vintage.slip.buffer);
      const bufferBefore = buffer.slice();
      const viewsBefore = views.map((v) => v.slice());
      const manifestBefore = JSON.stringify(vintage.manifest);

      for (const mask of masks(c)) {
        for (const variant of windowVariants(c)) {
          for (const population of POPULATIONS) {
            const scenario: Scenario = { ...mask.scenario, window: variant.window, population };
            const first = query(vintage, scenario, variant.windows);
            const second = query(vintage, scenario, variant.windows);
            assert.deepStrictEqual(second, first);
            assert.notEqual(second.indices, first.indices, 'each call returns its own indices');
          }
        }
      }

      assert.deepStrictEqual(buffer, bufferBefore, 'the artifact buffer is unchanged');
      views.forEach((v, k) => assert.deepStrictEqual(v, viewsBefore[k], `view ${k} is unchanged`));
      assert.equal(JSON.stringify(vintage.manifest), manifestBefore, 'the manifest is unchanged');
    });
  }
});

/**
 * The window endpoints of the scan check, in half recording steps
 * (5e-5 m): every distinct fixture slip value and the midpoint between
 * each two consecutive distinct values.
 */
function endpointsInHalfSteps(spec: FixtureSpec): number[] {
  const values = [...new Set(spec.stages.slip)].sort((a, b) => a - b);
  const points = values.map((s) => 2 * s);
  for (let k = 1; k < values.length; k++) points.push(values[k - 1] + values[k]);
  return points.sort((a, b) => a - b);
}

/** The canonical decimal, in metres, of `h` half recording steps. */
function halfStepsDecimal(h: number): string {
  return stepsDecimal(5 * h, 5);
}

/** The indices in `[t·N, (t+1)·N)` whose stored slip satisfies `inside`, by a linear scan. */
function linearScan(slip: Uint16Array, n: number, trials: number, inside: (s: number) => boolean): number[] {
  const out: number[] = [];
  for (let t = 0; t < trials; t++) {
    for (let i = t * n; i < (t + 1) * n; i++) {
      if (inside(slip[i])) out.push(i);
    }
  }
  return out;
}

describe('engine: binary-searched segments equal a linear scan', () => {
  for (const n of STAGE_COUNTS) {
    test(`N = ${n}: every slip-mode window with fixture-slip or midpoint endpoints`, () => {
      const c = caseOf(n);
      const { vintage } = c;
      const trials = c.spec.trials.length;
      const base: Scenario = { ...defaultScenario(vintage.manifest), population: 'all_stages' };
      const points = endpointsInHalfSteps(c.spec);
      let windows = 0;
      for (let p = 0; p < points.length; p++) {
        for (let q = p; q < points.length; q++) {
          const lo = points[p];
          const hi = points[q];
          const scenario: Scenario = {
            ...base,
            window: { mode: 'slip', min: halfStepsDecimal(lo), max: halfStepsDecimal(hi) },
          };
          const got = [...query(vintage, scenario).indices];
          const want = linearScan(vintage.slip, c.n, trials, (s) => 2 * s >= lo && 2 * s <= hi);
          if (got.length !== want.length || got.some((i, k) => i !== want[k])) {
            assert.deepEqual(got, want, `window [${halfStepsDecimal(lo)}, ${halfStepsDecimal(hi)}]`);
          }
          windows++;
        }
      }
      assert.equal(windows, (points.length * (points.length + 1)) / 2);
    });

    test(`N = ${n}: every offset-mode window with fixture-slip or midpoint endpoints`, () => {
      const c = caseOf(n);
      const { vintage } = c;
      const trials = c.spec.trials.length;
      const scale = vintage.manifest.columns.slip.scale as number;
      const base: Scenario = {
        ...defaultScenario(vintage.manifest),
        population: 'all_stages',
        window: { mode: 'offset', offsetMax: '1' },
      };
      const points = endpointsInHalfSteps(c.spec);
      for (let p = 0; p < points.length; p++) {
        for (let q = p; q < points.length; q++) {
          const lo = points[p] / 20000;
          const hi = points[q] / 20000;
          const [loS, hiS] = storedBounds(lo, hi, scale);
          const got = [...query(vintage, base, allDips(vintage, lo, hi)).indices];
          const want = linearScan(vintage.slip, c.n, trials, (s) => s >= loS && s <= hiS);
          if (got.length !== want.length || got.some((i, k) => i !== want[k])) {
            assert.deepEqual(got, want, `window [${lo}, ${hi}] m`);
          }
        }
      }
    });
  }
});

describe('engine: interface guards', () => {
  test('query throws on a missing, a superfluous, or an incomplete windows argument', () => {
    const c = caseOf(2);
    const base = defaultScenario(c.vintage.manifest);
    const offset: Scenario = { ...base, window: { mode: 'offset', offsetMax: '1' } };
    const windows = allDips(c.vintage, 0, 1);
    assert.throws(() => query(c.vintage, offset));
    assert.throws(() => query(c.vintage, base, windows));
    const firstDip = c.spec.trials[0][1];
    assert.throws(() => query(c.vintage, offset, windows.filter((w) => w.faultDip !== firstDip)));
    assert.doesNotThrow(() => query(c.vintage, offset, windows));
  });

  test('storedBounds returns 0, never −0', () => {
    const [lo, hi] = storedBounds(0, 0, 1e-4);
    assert.ok(Object.is(lo, 0) && Object.is(hi, 0), `${Object.is(lo, -0)} ${Object.is(hi, -0)}`);
  });
});
