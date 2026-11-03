// recovery.test.ts (docs/app/ddd.md §7.4, the `recovery.test.ts` row;
// §5.6 Reload recovery (MVP)): the pure recovery envelope of
// src/state/recovery.ts — envelope and display-record validation, round
// trips of the accepted Scenario and every DisplayState member, same-
// and new-version restoration against the newly loaded manifest, and
// incompatible settings returned without partial application or silent
// adjustment. The old and new manifests are fixture vintages that differ
// in exactly one dictionary or bound. No storage or DOM is touched: the
// globals a browser would offer for either throw here if read.

import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import type { Manifest } from '../src/decode/fields';
import { judgeOffset } from '../src/state/parse';
import {
  RECOVERY_VERSION,
  readRecovery,
  restoreRecovery,
  serializeRecovery,
  type RecoveryRecord,
} from '../src/state/recovery';
import { canonicalJson, serializeScenario } from '../src/state/scenario-json';
import {
  defaultDisplayState,
  defaultScenario,
  reduce,
  type Action,
  type AppState,
  type DisplayState,
  type Scenario,
} from '../src/state/state';
import { SCARP_CLASSES, buildFixture, decodeFixture, vocabularySpec, type VocabularyOptions } from './fixtures';

const SUMMARY = 'Fault dip 30° and 40° only; offset maximum 0.12345678901234 m';

/** The decoded manifest of a vocabulary fixture vintage. */
async function manifestOf(options: VocabularyOptions = {}, exportVersion = 'data-v1'): Promise<Manifest> {
  return (await decodeFixture(await buildFixture(vocabularySpec(options), { exportVersion }))).manifest;
}

let old: Manifest;
const BROWSER_GLOBALS = ['sessionStorage', 'localStorage', 'document', 'window', 'location'];

before(async () => {
  old = await manifestOf();
  // A storage or DOM access in the module under test fails loudly.
  for (const name of BROWSER_GLOBALS) {
    assert.equal(name in globalThis, false, `${name} exists in Node`);
    Object.defineProperty(globalThis, name, {
      configurable: true,
      get() {
        throw new Error(`recovery.test: ${name} was accessed`);
      },
    });
  }
});

after(() => {
  for (const name of BROWSER_GLOBALS) delete (globalThis as { [key: string]: unknown })[name];
});

/** `reduce` over `actions` from the default state of `m`. */
function stateAfter(actions: readonly Action[], m: Manifest = old): AppState {
  let state: AppState = { scenario: defaultScenario(m), display: defaultDisplayState() };
  for (const action of actions) state = reduce(state, action, m);
  return state;
}

/** Every DisplayState member away from its default, the overlay and family view on. */
const DISPLAY_ACTIONS: readonly Action[] = [
  { type: 'setFamilyView', familyView: true },
  { type: 'setMeasurement', measurement: 'dzw' },
  { type: 'setView', measurement: 'scarp_height', view: 'cumulative' },
  { type: 'setView', measurement: 'scarp_dip', view: 'cumulative' },
  { type: 'setReadoff', measurement: 'scarp_height', readoff: 0 },
  { type: 'setReadoff', measurement: 'dzw', readoff: 100 },
  { type: 'setChartDataOpen', measurement: 'dzw', open: true },
  { type: 'setChartDataOpen', measurement: 'scarp_dip', open: true },
  { type: 'setShowAll', measurement: 'scarp_height', showAll: true },
  { type: 'setShowAll', measurement: 'dzw', showAll: true },
  { type: 'setLogScale', logScale: true },
  { type: 'setOverlay', overlay: true },
];

/** An accepted offset-mode scenario with every display member set. */
function offsetState(m: Manifest = old): AppState {
  const offset = judgeOffset('.12345678901234');
  assert.equal(offset.kind, 'accepted');
  return stateAfter(
    [
      ...DISPLAY_ACTIONS,
      { type: 'applyFaultDips', dips: [30, 40] },
      { type: 'setWindow', window: (offset as { window: Scenario['window'] }).window },
      { type: 'setPopulation', population: 'one_state_per_trial' },
    ],
    m,
  );
}

/** The saved text of `state` over `m`. */
const save = (state: AppState, m: Manifest = old): string =>
  serializeRecovery(state.scenario, state.display, m, SUMMARY);

/** The record `readRecovery` accepts from `text`. */
function recordOf(text: string): RecoveryRecord {
  const reading = readRecovery(text);
  assert.equal(reading.kind, 'record', text);
  return (reading as { record: RecoveryRecord }).record;
}

/** The saved text as a mutable object. */
const envelopeOf = (state: AppState): { [key: string]: unknown } =>
  JSON.parse(save(state)) as { [key: string]: unknown };

describe('serializeRecovery and readRecovery: the envelope', () => {
  test('exactly five keys, canonical JSON, version 1, the old export version, the scenario object', () => {
    const state = offsetState();
    const text = save(state);
    const envelope = JSON.parse(text) as { [key: string]: unknown };
    assert.deepEqual(Object.keys(envelope), ['display', 'recoveryVersion', 'scenario', 'sourceExportVersion', 'summary']);
    assert.equal(text, canonicalJson(envelope));
    assert.equal(envelope.recoveryVersion, RECOVERY_VERSION);
    assert.equal(envelope.recoveryVersion, 1);
    assert.equal(envelope.sourceExportVersion, old.exportVersion);
    assert.deepEqual(envelope.scenario, JSON.parse(serializeScenario(state.scenario, old)));
    assert.equal(envelope.summary, SUMMARY);
    assert.deepEqual(Object.keys(envelope.display as object).sort(), [
      'chartDataOpen',
      'familyView',
      'logScale',
      'measurement',
      'overlay',
      'readoff',
      'showAll',
      'view',
    ]);
  });

  test('nothing but the accepted settings is stored: no result, manifest, coefficient, field row, or URL', () => {
    const text = save(offsetState());
    for (const absent of ['coefficients', 'slope', 'intercept', 'regression', 'rows', 'counts', 'checksums', 'http', '?']) {
      assert.equal(text.includes(absent), false, absent);
    }
  });

  test('the accepted Scenario and every DisplayState member round-trip, offset input and overlay on included', () => {
    const state = offsetState();
    assert.equal(state.display.overlay, true);
    assert.deepEqual(state.scenario.window, { mode: 'offset', offsetMax: '0.12345678901234' });
    const record = recordOf(save(state));
    assert.deepEqual(record.display, state.display);
    assert.deepEqual(record.scenario, JSON.parse(serializeScenario(state.scenario, old)));
    const restored = restoreRecovery(record, old);
    assert.deepEqual(restored, {
      kind: 'ready',
      scenario: state.scenario,
      display: state.display,
      sourceExportVersion: old.exportVersion,
      summary: SUMMARY,
    });
  });

  test('the default state round-trips', () => {
    const state = stateAfter([]);
    const restored = restoreRecovery(recordOf(save(state)), old);
    assert.deepEqual(restored, {
      kind: 'ready',
      scenario: state.scenario,
      display: state.display,
      sourceExportVersion: old.exportVersion,
      summary: SUMMARY,
    });
  });
});

describe('readRecovery returns invalid-record', () => {
  const invalid = { kind: 'invalid-record' };

  test('on invalid JSON', () => {
    for (const text of ['', '{', 'null', '[]', '"text"', '{"recoveryVersion":1,}']) {
      assert.deepEqual(readRecovery(text), invalid, JSON.stringify(text));
    }
  });

  test('on a version other than the integer 1', () => {
    for (const version of [0, 2, '1', null, true, 1.5]) {
      const envelope = envelopeOf(offsetState());
      envelope.recoveryVersion = version;
      assert.deepEqual(readRecovery(JSON.stringify(envelope)), invalid, JSON.stringify(version));
    }
  });

  test('on a missing or an unknown envelope key', () => {
    for (const key of ['recoveryVersion', 'sourceExportVersion', 'scenario', 'display', 'summary']) {
      const envelope = envelopeOf(offsetState());
      delete envelope[key];
      assert.deepEqual(readRecovery(JSON.stringify(envelope)), invalid, key);
    }
    const extra = envelopeOf(offsetState());
    extra.results = [];
    assert.deepEqual(readRecovery(JSON.stringify(extra)), invalid);
  });

  test('on an empty or mistyped source version or summary, and a non-object scenario', () => {
    const cases: readonly (readonly [string, unknown])[] = [
      ['sourceExportVersion', ''],
      ['sourceExportVersion', 1],
      ['summary', ''],
      ['summary', null],
      ['scenario', null],
      ['scenario', []],
      ['scenario', 'GS-1'],
    ];
    for (const [key, value] of cases) {
      const envelope = envelopeOf(offsetState());
      envelope[key] = value;
      assert.deepEqual(readRecovery(JSON.stringify(envelope)), invalid, `${key} ${JSON.stringify(value)}`);
    }
  });

  test('on a bad display map', () => {
    const corruptions: readonly (readonly [string, (d: { [key: string]: unknown }) => void])[] = [
      ['a missing display key', (d) => void delete d.logScale],
      ['an unknown display key', (d) => void (d.familyview = false)],
      ['an unknown measurement', (d) => void (d.measurement = 'slip')],
      ['a view map missing a panel', (d) => void delete (d.view as { [key: string]: unknown }).dzw],
      ['a view map with an extra panel', (d) => void ((d.view as { [key: string]: unknown }).slip = 'histogram')],
      ['an unknown view', (d) => void ((d.view as { [key: string]: unknown }).dzw = 'table')],
      ['a read-off above 100', (d) => void ((d.readoff as { [key: string]: unknown }).dzw = 101)],
      ['a fractional read-off', (d) => void ((d.readoff as { [key: string]: unknown }).dzw = 2.5)],
      ['a read-off string', (d) => void ((d.readoff as { [key: string]: unknown }).dzw = '50')],
      ['a non-boolean disclosure', (d) => void ((d.chartDataOpen as { [key: string]: unknown }).dzw = 1)],
      ['show-all on the scarp-dip panel', (d) => void ((d.showAll as { [key: string]: unknown }).scarp_dip = false)],
      ['a non-boolean overlay', (d) => void (d.overlay = 'on')],
      ['a non-boolean family view', (d) => void (d.familyView = null)],
      ['a display array', (d) => void (d.view = ['histogram', 'histogram', 'histogram'])],
    ];
    for (const [name, corrupt] of corruptions) {
      const envelope = envelopeOf(offsetState());
      corrupt(envelope.display as { [key: string]: unknown });
      assert.deepEqual(readRecovery(JSON.stringify(envelope)), invalid, name);
    }
    const nullDisplay = envelopeOf(offsetState());
    nullDisplay.display = null;
    assert.deepEqual(readRecovery(JSON.stringify(nullDisplay)), invalid);
  });
});

describe('restoreRecovery against the newly loaded manifest', () => {
  test('unchanged inputs pass through parseScenario against a new version', async () => {
    const fresh = await manifestOf({}, 'data-v2');
    assert.notEqual(fresh.exportVersion, old.exportVersion);
    const state = offsetState();
    const restored = restoreRecovery(recordOf(save(state)), fresh);
    assert.deepEqual(restored, {
      kind: 'ready',
      scenario: state.scenario,
      display: state.display,
      sourceExportVersion: old.exportVersion,
      summary: SUMMARY,
    });
  });

  test('added dictionary members do not expand an old explicit selection', async () => {
    const fresh = await manifestOf({ dips: [20, 30, 40, 45, 50, 60, 70, 80] }, 'data-v2');
    const state = stateAfter([]); // every old dip selected
    const restored = restoreRecovery(recordOf(save(state)), fresh);
    assert.equal(restored.kind, 'ready');
    if (restored.kind !== 'ready') return;
    assert.deepEqual(restored.scenario.faultDip, [20, 30, 40, 45, 50, 60, 70]);
    assert.deepEqual(restored.scenario, state.scenario);
    assert.notDeepEqual(restored.scenario.faultDip, defaultScenario(fresh).faultDip);
  });

  test('saved effective endpoints and canonical decimal strings stay unchanged', async () => {
    const fresh = await manifestOf({ maxSlipSteps: 60000 }, 'data-v2');
    // A lone minimum saved its effective maximum, the old recorded maximum.
    const slip = stateAfter([{ type: 'setWindow', window: { mode: 'slip', min: '1.5', max: '5.0135' } }]);
    const restored = restoreRecovery(recordOf(save(slip)), fresh);
    assert.equal(restored.kind, 'ready');
    if (restored.kind === 'ready') assert.deepEqual(restored.scenario.window, { mode: 'slip', min: '1.5', max: '5.0135' });
    const offset = restoreRecovery(recordOf(save(offsetState())), fresh);
    assert.equal(offset.kind, 'ready');
    if (offset.kind === 'ready') {
      assert.deepEqual(offset.scenario.window, { mode: 'offset', offsetMax: '0.12345678901234' });
    }
  });

  test('a same-version record is validated too', () => {
    const envelope = envelopeOf(offsetState());
    (envelope.scenario as { [key: string]: unknown }).fault_dip = [30, 35];
    const restored = restoreRecovery(recordOf(JSON.stringify(envelope)), old);
    assert.deepEqual(restored, { kind: 'incompatible', path: 'fault_dip[1]', summary: SUMMARY });
  });

  test('a changed coefficient file is neither stored nor read', async () => {
    // The new vintage differs only in its regression export's version, file name, and checksum.
    const fresh = await manifestOf({}, 'data-v9');
    assert.notEqual(fresh.files.regressionExport, old.files.regressionExport);
    const text = save(offsetState());
    assert.equal(text.includes(old.files.regressionExport), false);
    const restored = restoreRecovery(recordOf(text), fresh);
    assert.equal(restored.kind, 'ready');
  });
});

describe('incompatible settings: no partial restoration, no silent adjustment', () => {
  /** Asserts the incompatible result for `path`, carrying no scenario or display. */
  function assertIncompatible(result: ReturnType<typeof restoreRecovery>, path: string): void {
    assert.deepEqual(result, { kind: 'incompatible', path, summary: SUMMARY });
    assert.deepEqual(Object.keys(result).sort(), ['kind', 'path', 'summary']);
  }

  test('removed vocabulary', async () => {
    const fresh = await manifestOf({ dips: [20, 30, 40, 45, 50, 60] }, 'data-v2');
    assertIncompatible(restoreRecovery(recordOf(save(stateAfter([]))), fresh), 'fault_dip[6]');
    const noClass = await manifestOf({ scarpClasses: SCARP_CLASSES.slice(0, 5) }, 'data-v2');
    assertIncompatible(restoreRecovery(recordOf(save(stateAfter([]))), noClass), 'scarp_class[5]');
  });

  test('reordered canonical arrays are not sorted', () => {
    const envelope = envelopeOf(stateAfter([]));
    const scenario = envelope.scenario as { [key: string]: unknown };
    scenario.depth = [10, 5, 3];
    assertIncompatible(restoreRecovery(recordOf(JSON.stringify(envelope)), old), 'depth[1]');
  });

  test('a reduced slip maximum is not clipped', async () => {
    const fresh = await manifestOf({ maxSlipSteps: 45000 }, 'data-v2');
    const state = stateAfter([{ type: 'setWindow', window: { mode: 'slip', min: '0', max: '5' } }]);
    assertIncompatible(restoreRecovery(recordOf(save(state)), fresh), 'slip_window.max');
  });

  test('a family view that the new scarp classes make incompatible', async () => {
    const fresh = await manifestOf({ scarpClasses: [...SCARP_CLASSES, 'Graben'] }, 'data-v2');
    const state = stateAfter([{ type: 'setFamilyView', familyView: true }]);
    assertIncompatible(restoreRecovery(recordOf(save(state)), fresh), 'display.familyView');
    // Without the family view the same saved selection restores, unexpanded.
    const plain = restoreRecovery(recordOf(save(stateAfter([]))), fresh);
    assert.equal(plain.kind, 'ready');
    if (plain.kind === 'ready') assert.deepEqual(plain.scenario.scarpClass, [...SCARP_CLASSES]);
  });

  test('a true family view with a saved scarp-type filter', () => {
    const envelope = envelopeOf(stateAfter([{ type: 'setScarpClass', scarpClass: SCARP_CLASSES[2], selected: false }]));
    (envelope.display as DisplayState & { familyView: boolean }).familyView = true;
    assertIncompatible(restoreRecovery(recordOf(JSON.stringify(envelope)), old), 'display.familyView');
  });
});
