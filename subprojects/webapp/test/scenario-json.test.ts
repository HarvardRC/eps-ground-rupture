// scenario-json.test.ts (docs/app/ddd.md §7.4, the `scenario-json.test.ts`
// row; §5.6 Canonical serialization; DD-11): GS-1's golden bytes, the
// round trips both ways, the canonical decimals, the 16-character limit,
// the pair sets A and B, and the ScenarioInputError paths. Scenarios are
// built the way the controls build them — reducer calls with accepted
// free-entry judgments — over a fixture manifest carrying the shipped
// vocabulary.

import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';

import type { Manifest } from '../src/decode/fields';
import { judgeOffset, judgeSlipWindow, readDecimal } from '../src/state/parse';
import { ScenarioInputError, parseScenario, serializeScenario } from '../src/state/scenario-json';
import {
  defaultDisplayState,
  defaultScenario,
  reduce,
  type Action,
  type Scenario,
  type ScenarioWindow,
  type SedimentPair,
} from '../src/state/state';
import { buildFixture, decodeFixture, vocabularySpec } from './fixtures';

let manifest: Manifest;

before(async () => {
  manifest = (await decodeFixture(await buildFixture(vocabularySpec()))).manifest;
});

/** The Scenario the reducer reaches from the default through `actions`. */
function scenarioAfter(actions: readonly Action[]): Scenario {
  let state = { scenario: defaultScenario(manifest), display: defaultDisplayState() };
  for (const action of actions) state = reduce(state, action, manifest);
  return state.scenario;
}

/** Deselects every sediment pair except `keep`. */
function onlyPairs(keep: readonly SedimentPair[]): Action[] {
  return manifest.armStrengthStates
    .filter((p) => !keep.some((k) => k.set === p.set && k.sedimentStrength === p.sedimentStrength))
    .map((pair) => ({ type: 'setSediment', pair, selected: false }));
}

/** The window an accepted slip commit of `min` and `max` sets. */
function slipEntry(min: string, max: string): ScenarioWindow {
  const judgment = judgeSlipWindow(min, max, manifest.slipWindowBounds);
  assert.equal(judgment.kind, 'accepted', `${min} / ${max}`);
  return (judgment as { window: ScenarioWindow }).window;
}

/** The window an accepted offset commit of `text` sets. */
function offsetEntry(text: string): ScenarioWindow {
  const judgment = judgeOffset(text);
  assert.equal(judgment.kind, 'accepted', text);
  return (judgment as { window: ScenarioWindow }).window;
}

const strong = (set: string): SedimentPair => ({ set, sedimentStrength: 'Strong' });
const weak = (set: string): SedimentPair => ({ set, sedimentStrength: 'Weak' });

/** GS-1 (PDD §10.2; US-1): dips 30° and 40°, Strong in both arms, offset mode 3 m. */
const gs1 = (): Scenario =>
  scenarioAfter([
    { type: 'applyFaultDips', dips: [30, 40] },
    ...onlyPairs([strong('Homogeneous'), strong('Heterogeneous')]),
    { type: 'setWindow', window: offsetEntry('3') },
  ]);

/** A = {(Homogeneous, Strong), (Heterogeneous, Weak)}. */
const pairSetA = (): Scenario => scenarioAfter(onlyPairs([strong('Homogeneous'), weak('Heterogeneous')]));
/** B = {(Homogeneous, Weak), (Heterogeneous, Strong)}. */
const pairSetB = (): Scenario => scenarioAfter(onlyPairs([weak('Homogeneous'), strong('Heterogeneous')]));

/** The golden bytes of §5.6. */
const GS1_GOLDEN =
  '{"density":["Dense","Loose","Medium"],"depth":[3,5,10],"entry_mode":"offset","fault_dip":[30,40],' +
  '"offset_max":"3","population":"all_stages","scarp_class":["Monoclinal","Monoclinal Collapse",' +
  '"Pressure Ridge","Pressure Ridge Collapse","Simple","Simple Collapse"],"sediment":[{"sediment_strength":' +
  '"Strong","set":"Heterogeneous"},{"sediment_strength":"Strong","set":"Homogeneous"}],"slip_window":null}';

/** Asserts both round trips of §5.6 for `s`. */
function assertRoundTrips(s: Scenario, name: string): void {
  const text = serializeScenario(s, manifest);
  const object = JSON.parse(text) as unknown;
  const parsed = parseScenario(object, manifest);
  assert.deepEqual(parsed, s, `${name}: parseScenario(JSON.parse(serializeScenario(s)))`);
  assert.deepEqual(JSON.parse(serializeScenario(parsed, manifest)), object, `${name}: the object round trip`);
  assert.equal(serializeScenario(parsed, manifest), text, `${name}: identical bytes`);
}

/** Asserts that `parseScenario(o)` throws ScenarioInputError whose path is `path`. */
function assertInputError(o: unknown, path: string): void {
  assert.throws(
    () => parseScenario(o, manifest),
    (e: unknown) => {
      assert.ok(e instanceof ScenarioInputError, `threw ${String(e)}`);
      assert.equal(e.path, path);
      return true;
    },
  );
}

/** The serialized object of `s`, as a mutable record. */
const objectOf = (s: Scenario): { [key: string]: unknown } =>
  JSON.parse(serializeScenario(s, manifest)) as { [key: string]: unknown };

describe('serializeScenario', () => {
  test('GS-1 serializes to the §5.6 golden bytes', () => {
    assert.equal(serializeScenario(gs1(), manifest), GS1_GOLDEN);
  });

  test('A and B, disjoint trial sets of equal size, serialize differently', () => {
    const a = serializeScenario(pairSetA(), manifest);
    const b = serializeScenario(pairSetB(), manifest);
    assert.notEqual(a, b);
    assert.deepEqual(JSON.parse(a).sediment, [
      { set: 'Heterogeneous', sediment_strength: 'Weak' },
      { set: 'Homogeneous', sediment_strength: 'Strong' },
    ]);
    assert.deepEqual(JSON.parse(b).sediment, [
      { set: 'Heterogeneous', sediment_strength: 'Strong' },
      { set: 'Homogeneous', sediment_strength: 'Weak' },
    ]);
  });

  test('the canonical decimals: 03.50 → 3.5, 0.000 → 0', () => {
    const s = scenarioAfter([{ type: 'setWindow', window: slipEntry('0.000', '03.50') }]);
    assert.deepEqual(objectOf(s).slip_window, { min: '0', max: '3.5' });
    assert.equal(objectOf(scenarioAfter([{ type: 'setWindow', window: offsetEntry('03.50') }])).offset_max, '3.5');
    assert.equal(objectOf(scenarioAfter([{ type: 'setWindow', window: offsetEntry('0.000') }])).offset_max, '0');
  });
});

describe('round trips', () => {
  const cases: readonly (readonly [string, () => Scenario])[] = [
    ['the default scenario', () => defaultScenario(manifest)],
    ['GS-1', gs1],
    ['A', pairSetA],
    ['B', pairSetB],
    ['a lone minimum', () => scenarioAfter([{ type: 'setWindow', window: slipEntry('1.25', '') }])],
    ['a lone maximum', () => scenarioAfter([{ type: 'setWindow', window: slipEntry('', '3') }])],
    [
      'offset mode',
      () =>
        scenarioAfter([
          { type: 'setWindow', window: offsetEntry('2.75') },
          { type: 'setPopulation', population: 'one_state_per_trial' },
          { type: 'setScarpClass', scarpClass: manifest.scarpClasses[3], selected: false },
          { type: 'setDepth', depth: 5, selected: false },
        ]),
    ],
    [
      'empty groups',
      () =>
        scenarioAfter([
          { type: 'applyFaultDips', dips: [] },
          ...manifest.trialColumns.density.map((density): Action => ({ type: 'setDensity', density, selected: false })),
        ]),
    ],
  ];
  for (const [name, build] of cases) {
    test(name, () => assertRoundTrips(build(), name));
  }

  test('a lone minimum and a lone maximum carry their effective endpoints', () => {
    assert.deepEqual(objectOf(cases[4][1]()).slip_window, { min: '1.25', max: '5.0135' });
    assert.deepEqual(objectOf(cases[5][1]()).slip_window, { min: '0', max: '3' });
  });
});

describe('the 16-character limit', () => {
  test('an offset maximum entered as .12345678901234 round-trips as 0.12345678901234', () => {
    const s = scenarioAfter([{ type: 'setWindow', window: offsetEntry('.12345678901234') }]);
    const object = objectOf(s);
    assert.equal(object.offset_max, '0.12345678901234');
    const parsed = parseScenario(object, manifest);
    assert.deepEqual(parsed, s);
    // Grammar G reads the serialized decimal, shown and committed again, back unchanged.
    assert.deepEqual(readDecimal(object.offset_max as string), { kind: 'decimal', value: '0.12345678901234' });
    assertRoundTrips(s, 'offset .12345678901234');
  });

  test('offset_max 0.123456789012345 (17 characters) throws ScenarioInputError at offset_max', () => {
    const object = objectOf(scenarioAfter([{ type: 'setWindow', window: offsetEntry('3') }]));
    object.offset_max = '0.123456789012345';
    assertInputError(object, 'offset_max');
  });
});

describe('parseScenario rejects with ScenarioInputError naming the offending key or element', () => {
  test('an unknown key', () => {
    const object = objectOf(gs1());
    object.colour = 'red';
    assertInputError(object, 'colour');
    const nested = objectOf(gs1());
    (nested.sediment as { [key: string]: unknown }[])[1].label = 'Strong (uniform)';
    assertInputError(nested, 'sediment[1].label');
  });

  test('an out-of-vocabulary value', () => {
    const cases: readonly (readonly [string, (o: { [key: string]: unknown }) => void])[] = [
      ['fault_dip[1]', (o) => void (o.fault_dip = [30, 35])],
      ['sediment[0]', (o) => void (o.sediment = [{ set: 'Heterogeneous', sediment_strength: 'Firm' }])],
      ['depth[0]', (o) => void (o.depth = [4])],
      ['density[2]', (o) => void (o.density = ['Dense', 'Loose', 'Firm'])],
      ['scarp_class[0]', (o) => void (o.scarp_class = ['Graben'])],
      ['population', (o) => void (o.population = 'every_trial')],
      ['entry_mode', (o) => void (o.entry_mode = 'height')],
    ];
    for (const [path, corrupt] of cases) {
      const object = objectOf(gs1());
      corrupt(object);
      assertInputError(object, path);
    }
  });

  test('a missing key, elements out of canonical order or repeated, a non-canonical decimal', () => {
    const missing = objectOf(gs1());
    delete missing.population;
    assertInputError(missing, 'population');
    const reordered = objectOf(gs1());
    reordered.fault_dip = [40, 30];
    assertInputError(reordered, 'fault_dip[1]');
    const repeated = objectOf(gs1());
    repeated.depth = [3, 3, 5];
    assertInputError(repeated, 'depth[1]');
    const nonCanonical = objectOf(gs1());
    nonCanonical.offset_max = '3.0';
    assertInputError(nonCanonical, 'offset_max');
  });
});
