// state.test.ts (docs/app/ddd.md §7.4, the `state.test.ts` row; §5.6
// Scenario state; §5.7 Reset and the scarp-type filter): the defaults
// derived from the fixture manifest, accepted values only, pure
// reducers, rejection of settings outside the permitted vocabulary,
// Reset, and the family view turning off when a scarp type is
// deselected. The manifests come from test/fixtures.ts through the real
// decoder, so no default is a literal here.

import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';

import type { Manifest } from '../src/decode/fields';
import { judgeSlipWindow } from '../src/state/parse';
import {
  defaultDisplayState,
  defaultScenario,
  reduce,
  type Action,
  type AppState,
  type DisplayState,
  type Scenario,
} from '../src/state/state';
import { buildFixture, codePointCompare, decodeFixture, stageCountSpec, vocabularySpec } from './fixtures';

let manifest: Manifest;
let other: Manifest;

before(async () => {
  manifest = (await decodeFixture(await buildFixture(vocabularySpec()))).manifest;
  other = (await decodeFixture(await buildFixture(stageCountSpec(100)))).manifest;
});

/** Freezes `v` and everything it holds. */
function deepFreeze<T>(v: T): T {
  if (v !== null && typeof v === 'object' && !Object.isFrozen(v)) {
    Object.freeze(v);
    for (const member of Object.values(v as object)) deepFreeze(member);
  }
  return v;
}

/** The fresh default AppState of `m`. */
const initial = (m: Manifest): AppState => ({ scenario: defaultScenario(m), display: defaultDisplayState() });

/** `reduce` over `actions` in order. */
function run(state: AppState, actions: readonly Action[], m: Manifest = manifest): AppState {
  return actions.reduce((s, a) => reduce(s, a, m), state);
}

/** The defaults §5.6 derives from a manifest's dictionaries, read from the mapped manifest. */
function manifestDefaults(m: Manifest): Scenario {
  return {
    faultDip: [...m.trialColumns.fault_dip],
    sediment: m.armStrengthStates
      .map((p) => ({ set: p.set, sedimentStrength: p.sedimentStrength }))
      .sort((a, b) => codePointCompare(a.set, b.set) || codePointCompare(a.sedimentStrength, b.sedimentStrength)),
    depth: [...m.trialColumns.depth],
    density: [...m.trialColumns.density],
    window: { mode: 'slip', min: null, max: null },
    population: 'all_stages',
    scarpClass: [...m.scarpClasses],
  };
}

describe('defaultScenario(manifest)', () => {
  test('equals the defaults derived from the fixture manifest', () => {
    assert.deepEqual(defaultScenario(manifest), manifestDefaults(manifest));
    assert.equal(defaultScenario(manifest).sediment.length, manifest.armStrengthStates.length);
    assert.equal(manifest.armStrengthStates.length, 9);
  });

  test('follows the manifest it is given, never literals', () => {
    assert.deepEqual(defaultScenario(other), manifestDefaults(other));
    assert.notDeepEqual(defaultScenario(other), defaultScenario(manifest));
  });

  test('the default display state: scarp height, histograms, every switch off', () => {
    assert.deepEqual(defaultDisplayState(), {
      measurement: 'scarp_height',
      view: { scarp_height: 'histogram', dzw: 'histogram', scarp_dip: 'histogram' },
      readoff: { scarp_height: null, dzw: null, scarp_dip: null },
      chartDataOpen: { scarp_height: false, dzw: false, scarp_dip: false },
      showAll: { scarp_height: false, dzw: false },
      logScale: false,
      overlay: false,
      familyView: false,
    });
  });
});

describe('Scenario holds accepted values only', () => {
  test('the Scenario has exactly the seven §5.6 members, no float and no editing state', () => {
    const accepted = judgeSlipWindow('03.50', '', manifest.slipWindowBounds);
    assert.equal(accepted.kind, 'accepted');
    if (accepted.kind !== 'accepted') return;
    const state = run(initial(manifest), [{ type: 'setWindow', window: accepted.window }]);
    assert.deepEqual(Object.keys(state.scenario).sort(), [
      'density',
      'depth',
      'faultDip',
      'population',
      'scarpClass',
      'sediment',
      'window',
    ]);
    assert.deepEqual(state.scenario.window, { mode: 'slip', min: '3.5', max: '5.0135' });
    const floats: unknown[] = [];
    JSON.stringify(state.scenario, (_, v: unknown) => {
      if (typeof v === 'number' && !Number.isInteger(v)) floats.push(v);
      return v;
    });
    assert.deepEqual(floats, []);
  });

  test('a window that free-entry validation would reject never reaches the Scenario', () => {
    const state = initial(manifest);
    const rejected = [
      { mode: 'slip', min: '03.50', max: '4' }, // not a canonical decimal
      { mode: 'slip', min: '0', max: '5.01350000000001' }, // above slip_window_bounds.max
      { mode: 'slip', min: '3', max: '2' }, // minimum above the maximum
      { mode: 'slip', min: '-1', max: '2' }, // negative
      { mode: 'slip', min: '1', max: null }, // half a window
      { mode: 'offset', offsetMax: '1000.0001' }, // above the R2 bound
      { mode: 'offset', offsetMax: '.5' }, // not a canonical decimal
      { mode: 'offset', offsetMax: '0.123456789012345' }, // 17 characters
      { mode: 'diagonal', min: null, max: null },
    ];
    for (const window of rejected) {
      assert.throws(
        () => reduce(state, { type: 'setWindow', window } as unknown as Action, manifest),
        RangeError,
        JSON.stringify(window),
      );
    }
    assert.deepEqual(state, initial(manifest));
  });
});

/** Every action of the reducer, applied in turn to a fresh frozen state. */
function everyAction(m: Manifest): Action[] {
  const dips = m.trialColumns.fault_dip;
  return [
    { type: 'setFaultDip', dip: dips[0], selected: false },
    { type: 'applyFaultDips', dips: [dips[1], dips[2]] },
    { type: 'setSediment', pair: m.armStrengthStates[0], selected: false },
    { type: 'setDepth', depth: m.trialColumns.depth[0], selected: false },
    { type: 'setDensity', density: m.trialColumns.density[0], selected: false },
    { type: 'setScarpClass', scarpClass: m.scarpClasses[0], selected: false },
    { type: 'setPopulation', population: 'one_state_per_trial' },
    { type: 'setWindow', window: { mode: 'slip', min: '0', max: '3' } },
    { type: 'setWindow', window: { mode: 'offset', offsetMax: '3' } },
    { type: 'reset' },
    { type: 'setMeasurement', measurement: 'dzw' },
    { type: 'setView', measurement: 'scarp_dip', view: 'cumulative' },
    { type: 'setReadoff', measurement: 'dzw', readoff: 84 },
    { type: 'setChartDataOpen', measurement: 'scarp_height', open: true },
    { type: 'setShowAll', measurement: 'dzw', showAll: true },
    { type: 'setLogScale', logScale: true },
    { type: 'setOverlay', overlay: true },
    { type: 'setFamilyView', familyView: true },
  ];
}

describe('reducers are pure', () => {
  test('a frozen state and manifest in, a new state out, nothing mutated, same output for same input', () => {
    const frozenManifest = deepFreeze(structuredClone(manifest));
    for (const action of everyAction(manifest)) {
      const state = deepFreeze(run(initial(manifest), [{ type: 'setOverlay', overlay: true }]));
      const snapshot = structuredClone(state);
      const first = reduce(state, deepFreeze(structuredClone(action)), frozenManifest);
      const second = reduce(state, deepFreeze(structuredClone(action)), frozenManifest);
      assert.deepEqual(state, snapshot, `${action.type} mutated its input`);
      assert.deepEqual(first, second, `${action.type} is not deterministic`);
    }
    assert.deepEqual(frozenManifest, manifest);
  });

  test('a display-only action keeps the Scenario object; a no-op returns the state itself', () => {
    const state = initial(manifest);
    const next = reduce(state, { type: 'setOverlay', overlay: true }, manifest);
    assert.equal(next.scenario, state.scenario);
    assert.equal(reduce(state, { type: 'setOverlay', overlay: false }, manifest), state);
    assert.equal(reduce(state, { type: 'setFaultDip', dip: manifest.trialColumns.fault_dip[0], selected: true }, manifest), state);
  });
});

describe('settings outside the permitted vocabulary are rejected', () => {
  const outside = (m: Manifest): readonly (readonly [string, Action])[] => [
    ['an unmodeled dip', { type: 'setFaultDip', dip: 35, selected: true }],
    ['an unmodeled dip in a dip set', { type: 'applyFaultDips', dips: [m.trialColumns.fault_dip[0], 35] }],
    ['a repeated dip in a dip set', { type: 'applyFaultDips', dips: [30, 30] }],
    ['a pair that is not an arm-and-strength state', { type: 'setSediment', pair: { set: 'Homogeneous', sedimentStrength: 'Cohesive Top Unit' }, selected: true }],
    ['a strength label without its arm', { type: 'setSediment', pair: { set: 'Layered', sedimentStrength: 'Strong' }, selected: true }],
    ['an unmodeled depth', { type: 'setDepth', depth: 7, selected: true }],
    ['an unknown density', { type: 'setDensity', density: 'Firm', selected: true }],
    ['an unknown scarp class', { type: 'setScarpClass', scarpClass: 'Graben', selected: true }],
    ['an unknown population', { type: 'setPopulation', population: 'every_trial' as never }],
    ['an unknown measurement', { type: 'setMeasurement', measurement: 'slip' as never }],
    ['an unknown view', { type: 'setView', measurement: 'dzw', view: 'table' as never }],
    ['a read-off above 100', { type: 'setReadoff', measurement: 'dzw', readoff: 101 }],
    ['a negative read-off', { type: 'setReadoff', measurement: 'dzw', readoff: -1 }],
    ['a fractional read-off', { type: 'setReadoff', measurement: 'dzw', readoff: 2.5 }],
    ['show-all on the scarp-dip panel', { type: 'setShowAll', measurement: 'scarp_dip' as never, showAll: true }],
  ];
  test('each throws RangeError and changes nothing', () => {
    const state = deepFreeze(initial(manifest));
    for (const [name, action] of outside(manifest)) {
      assert.throws(() => reduce(state, action, manifest), RangeError, name);
    }
  });

  test('family view cannot turn on while a scarp type is deselected', () => {
    const state = run(initial(manifest), [{ type: 'setScarpClass', scarpClass: manifest.scarpClasses[2], selected: false }]);
    assert.throws(() => reduce(state, { type: 'setFamilyView', familyView: true }, manifest), RangeError);
  });
});

describe('Reset (§5.7)', () => {
  /** A display state with every member away from its default, family view on. */
  const busyDisplay = (): Action[] => [
    { type: 'setFamilyView', familyView: true },
    { type: 'setMeasurement', measurement: 'scarp_dip' },
    { type: 'setView', measurement: 'dzw', view: 'cumulative' },
    { type: 'setReadoff', measurement: 'scarp_height', readoff: 16 },
    { type: 'setChartDataOpen', measurement: 'dzw', open: true },
    { type: 'setShowAll', measurement: 'scarp_height', showAll: true },
    { type: 'setLogScale', logScale: true },
    { type: 'setOverlay', overlay: true },
  ];
  /** Every Scenario control of §5.7 away from its default. */
  const busyScenario = (m: Manifest): Action[] => [
    { type: 'applyFaultDips', dips: [m.trialColumns.fault_dip[1]] },
    { type: 'setSediment', pair: m.armStrengthStates[4], selected: false },
    { type: 'setDepth', depth: m.trialColumns.depth[2], selected: false },
    { type: 'setDensity', density: m.trialColumns.density[1], selected: false },
    { type: 'setPopulation', population: 'one_state_per_trial' },
    { type: 'setWindow', window: { mode: 'offset', offsetMax: '2.5' } },
  ];

  /** The display members Reset leaves alone: all but familyView. */
  const kept = (d: DisplayState) => ({ ...d, familyView: undefined });

  test('restores every Scenario control and turns family view off; the overlay switch and logScale stay', () => {
    const prior = run(initial(manifest), [...busyDisplay(), ...busyScenario(manifest)]);
    assert.equal(prior.display.familyView, true);
    assert.notDeepEqual(prior.scenario, defaultScenario(manifest));
    const after = reduce(prior, { type: 'reset' }, manifest);
    assert.deepEqual(after.scenario, defaultScenario(manifest));
    assert.deepEqual(after.scenario, manifestDefaults(manifest));
    assert.equal(after.scenario.window.mode, 'slip', 'the entry mode returns to slip');
    assert.equal(after.display.familyView, false);
    assert.equal(after.display.overlay, true);
    assert.equal(after.display.logScale, true);
    assert.deepEqual(kept(after.display), kept(prior.display));
  });

  test('from a scarp-type filter and a slip window too', () => {
    const prior = run(initial(manifest), [
      { type: 'setOverlay', overlay: true },
      { type: 'setScarpClass', scarpClass: manifest.scarpClasses[0], selected: false },
      { type: 'setWindow', window: { mode: 'slip', min: '1', max: '2' } },
      { type: 'setFaultDip', dip: manifest.trialColumns.fault_dip[0], selected: false },
    ]);
    const after = reduce(prior, { type: 'reset' }, manifest);
    assert.deepEqual(after.scenario, defaultScenario(manifest));
    assert.deepEqual(after.display, { ...prior.display, familyView: false });
  });

  test('from the default state, Reset changes nothing', () => {
    const state = initial(manifest);
    const after = reduce(state, { type: 'reset' }, manifest);
    assert.deepEqual(after, state);
  });
});

describe('deselecting any scarp type turns family view off', () => {
  test('for each class, in the same update', () => {
    for (const scarpClass of manifest.scarpClasses) {
      const on = run(initial(manifest), [{ type: 'setFamilyView', familyView: true }]);
      assert.equal(on.display.familyView, true);
      const off = reduce(on, { type: 'setScarpClass', scarpClass, selected: false }, manifest);
      assert.equal(off.display.familyView, false, scarpClass);
      assert.equal(off.scenario.scarpClass.includes(scarpClass), false);
      // Re-selecting the class does not turn it back on.
      const again = reduce(off, { type: 'setScarpClass', scarpClass, selected: true }, manifest);
      assert.equal(again.display.familyView, false);
    }
  });
});
