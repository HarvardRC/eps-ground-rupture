// Guided drafts must remain distinct from confirmed scientific inputs.
// These tests exercise the public pure-state contract, without DOM mocks.
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';

import { convertWindows, rangeFlag } from '../src/convert/convert';
import { mapRecord, REGRESSION_FIELDS, type Manifest, type Regression } from '../src/decode/fields';
import { compareSedimentPairs } from '../src/state/state';
import {
  cloneDraft,
  draftChanged,
  freshDraft,
  offsetShortcut,
  isSampleId,
  sampleDraft,
  sedimentGroup,
  stepDecimal,
  validateDraft,
  type Draft,
} from '../src/explore/state';
import { buildFixture, decodeFixture, vocabularySpec } from './fixtures';

let manifest: Manifest;
let regression: Regression;

before(async () => {
  const fixture = await buildFixture(vocabularySpec());
  manifest = (await decodeFixture(fixture)).manifest;
  regression = mapRecord(fixture.regressionExport, REGRESSION_FIELDS, 'regression') as unknown as Regression;
});

function completeDraft(): Draft {
  return {
    ...freshDraft(manifest),
    faultDip: [...manifest.trialColumns.fault_dip],
    depth: [...manifest.trialColumns.depth],
    density: [...manifest.trialColumns.density],
    sediment: manifest.armStrengthStates.map((pair) => ({ ...pair })),
    slipMax: '5.0135',
  };
}

function fields(draft: Draft): string[] {
  const result = validateDraft(draft, manifest);
  assert.equal(result.scenario, null);
  return result.issues.map((issue) => issue.field);
}

describe('guided draft validation', () => {
  test('fresh defaults require explicit site sets and maximum', () => {
    const draft = freshDraft(manifest);
    assert.deepEqual(draft.faultDip, []);
    assert.deepEqual(draft.depth, []);
    assert.deepEqual(draft.density, []);
    assert.deepEqual(draft.sediment, []);
    assert.equal(draft.mode, 'slip');
    assert.equal(draft.slipMin, '0');
    assert.equal(draft.slipMax, '');
    assert.equal(draft.offsetMax, '');
    assert.equal(draft.population, 'all_stages');
    assert.deepEqual(draft.scarpClass, manifest.scarpClasses);
    assert.deepEqual(fields(draft), ['faultDip', 'depth', 'density', 'sediment', 'slipMax']);
  });

  test('blank endpoints cannot become an implicit no-window scenario', () => {
    const draft = completeDraft();
    draft.slipMin = ' ';
    draft.slipMax = '';
    assert.deepEqual(fields(draft), ['slipMin', 'slipMax']);
    draft.mode = 'offset';
    assert.deepEqual(fields(draft), ['offsetMax']);
  });

  test('explicit zero and equal endpoints are valid', () => {
    const draft = completeDraft();
    draft.slipMin = '0';
    draft.slipMax = '0';
    assert.deepEqual(validateDraft(draft, manifest).scenario?.window, { mode: 'slip', min: '0', max: '0' });
    draft.mode = 'offset';
    draft.offsetMax = '0';
    assert.deepEqual(validateDraft(draft, manifest).scenario?.window, { mode: 'offset', offsetMax: '0' });
  });

  test('normalization preserves raw edits and respects both length limits', () => {
    const draft = completeDraft();
    draft.slipMin = '00,50';
    draft.slipMax = '05.01350';
    const before = cloneDraft(draft);
    assert.deepEqual(validateDraft(draft, manifest).scenario?.window, { mode: 'slip', min: '0.5', max: '5.0135' });
    assert.deepEqual(draft, before);
    for (const input of ['.12345678901234', '.123456789012340']) {
      draft.slipMin = input;
      assert.equal(validateDraft(draft, manifest).issues.length, 0, input);
    }
    for (const input of ['.123456789012345', '00000000000000000', '0.123456789012345']) {
      draft.slipMin = input;
      assert.ok(fields(draft).includes('slipMin'), input);
    }
  });

  test('slip ordering and the actual manifest maximum are enforced', () => {
    const draft = completeDraft();
    draft.slipMin = '5.01';
    draft.slipMax = '5.0135';
    assert.equal(validateDraft(draft, manifest).issues.length, 0);
    draft.slipMax = '5.0136';
    assert.ok(fields(draft).includes('slipMax'));
    draft.slipMax = '5';
    assert.ok(validateDraft(draft, manifest).issues.length > 0);
    assert.equal(validateDraft(draft, manifest).scenario, null);
  });

  test('offset has its numeric bound, not the slip or coverage limit', () => {
    const draft = completeDraft();
    draft.mode = 'offset';
    for (const value of ['3', '1000']) {
      draft.offsetMax = value;
      assert.equal(validateDraft(draft, manifest).issues.length, 0, value);
    }
    for (const value of ['1000.1', '-1', '1e3']) {
      draft.offsetMax = value;
      assert.deepEqual(fields(draft), ['offsetMax'], value);
    }
  });

  test('inactive invalid entries are preserved and become errors only on activation', () => {
    const draft = completeDraft();
    draft.offsetMax = 'unfinished';
    assert.equal(validateDraft(draft, manifest).issues.length, 0);
    draft.mode = 'offset';
    assert.deepEqual(fields(draft), ['offsetMax']);
    draft.offsetMax = '2';
    draft.slipMin = '-';
    draft.slipMax = 'too much';
    assert.equal(validateDraft(draft, manifest).issues.length, 0);
    assert.equal(draft.slipMin, '-');
    assert.equal(draft.slipMax, 'too much');
    draft.mode = 'slip';
    assert.deepEqual(fields(draft), ['slipMin', 'slipMax']);
  });

  test('unknown members are rejected even alongside a known selection', () => {
    const mutations: readonly (readonly [string, (draft: Draft) => void])[] = [
      ['faultDip', (d) => d.faultDip.push(31)],
      ['depth', (d) => d.depth.push(999)],
      ['density', (d) => d.density.push('Unknown')],
      ['sediment', (d) => d.sediment.push({ set: 'Homogeneous', sedimentStrength: 'Unknown' })],
      ['scarpClass', (d) => d.scarpClass.push('Unknown')],
    ];
    for (const [field, change] of mutations) {
      const draft = completeDraft();
      change(draft);
      assert.deepEqual(fields(draft), [field]);
    }
  });

  test('empty scarp selection remains empty and blocks review at refinements', () => {
    const draft = completeDraft();
    draft.scarpClass = [];
    const result = validateDraft(draft, manifest);
    assert.equal(result.scenario, null);
    assert.deepEqual(result.issues.map(({ step, field }) => ({ step, field })), [{ step: 'results', field: 'scarpClass' }]);
    assert.deepEqual(draft.scarpClass, []);
  });

  test('accepted sets have canonical order without reordering the editable draft', () => {
    const draft = completeDraft();
    draft.faultDip.reverse();
    draft.depth.reverse();
    draft.density.reverse();
    draft.sediment.reverse();
    draft.scarpClass.reverse();
    const before = cloneDraft(draft);
    const result = validateDraft(draft, manifest);
    assert.deepEqual(result.issues, []);
    assert.ok(result.scenario);
    assert.deepEqual(result.scenario.faultDip, manifest.trialColumns.fault_dip);
    assert.deepEqual(result.scenario.depth, manifest.trialColumns.depth);
    assert.deepEqual(result.scenario.density, manifest.trialColumns.density);
    assert.deepEqual(result.scenario.scarpClass, manifest.scarpClasses);
    assert.deepEqual(result.scenario.sediment, [...manifest.armStrengthStates].sort(compareSedimentPairs));
    assert.deepEqual(draft, before);
  });
});

describe('draft snapshots and change detection', () => {
  test('cloning separates every selection array and sediment object', () => {
    const original = completeDraft();
    const copy = cloneDraft(original);
    assert.deepEqual(copy, original);
    for (const key of ['faultDip', 'depth', 'density', 'sediment', 'scarpClass'] as const) {
      assert.notEqual(copy[key], original[key], key);
    }
    copy.sediment.forEach((pair, i) => assert.notEqual(pair, original.sediment[i]));
    copy.faultDip.pop();
    copy.scarpClass.pop();
    copy.sediment[0] = { set: 'changed', sedimentStrength: 'changed' };
    copy.offsetMax = 'invalid draft';
    assert.deepEqual(original, completeDraft());
  });

  test('set order is irrelevant, but raw inactive text and refinements count', () => {
    const confirmed = completeDraft();
    const draft = cloneDraft(confirmed);
    for (const key of ['faultDip', 'depth', 'density', 'sediment', 'scarpClass'] as const) draft[key].reverse();
    assert.equal(draftChanged(draft, confirmed), false);
    draft.slipMin = '0.0';
    assert.equal(draftChanged(draft, confirmed), true);
    draft.slipMin = '0';
    draft.offsetMax = 'unfinished';
    assert.equal(draftChanged(draft, confirmed), true);
    draft.offsetMax = '';
    draft.population = 'one_state_per_trial';
    assert.equal(draftChanged(draft, confirmed), true);
    draft.population = 'all_stages';
    draft.scarpClass.pop();
    assert.equal(draftChanged(draft, confirmed), true);
    assert.equal(draftChanged(draft, null), false);
  });
});

describe('exact decimal adjustment and offset shortcut', () => {
  test('tenths are exact and retain fine typed precision', () => {
    const cases: readonly (readonly [string, -1 | 1, string])[] = [
      ['0.2', 1, '0.3'], ['0.3', -1, '0.2'],
      ['0.12345678901234', 1, '0.22345678901234'],
      ['01,20', -1, '1.1'], ['0.05', -1, '0'],
      ['', 1, '0.1'], ['', -1, '0'], ['5.0135', 1, '5.1135'],
    ];
    for (const [raw, direction, expected] of cases) assert.equal(stepDecimal(raw, direction), expected, raw);
  });

  test('invalid and unrepresentable changes preserve input instead of rounding', () => {
    for (const raw of ['-', '1e3', '.123456789012345', '9999999999999999', '9.99999999999999']) {
      assert.equal(stepDecimal(raw, 1), raw, raw);
    }
  });

  test('shared cap rounds down and remains within each selected conversion', () => {
    const fitted: Regression = {
      ...regression,
      coefficients: [
        { faultDip: 30, slope: 0.5020759691269575, intercept: -0.0051254736669561485, n: 10, r2: 1 },
        { faultDip: 40, slope: 0.6453072800312353, intercept: -0.007145518549672714, n: 10, r2: 1 },
      ],
    };
    const value = offsetShortcut([40, 30], fitted, manifest.slipWindowBounds.max);
    assert.equal(value, '2.51');
    for (const window of convertWindows(Number(value), [30, 40], fitted.coefficients)) {
      assert.equal(rangeFlag(window, manifest.slipWindowBounds), 'in_range');
    }
    assert.equal(offsetShortcut([40], fitted, manifest.slipWindowBounds.max), '3.22');
  });

  test('no shortcut is offered without complete positive coefficients', () => {
    assert.equal(offsetShortcut([], regression, 5), null);
    assert.equal(offsetShortcut([999], regression, 5), null);
    for (const slope of [0, -0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const bad = { ...regression, coefficients: [{ faultDip: 30, slope, intercept: 0, n: 10, r2: 1 }] };
      assert.equal(offsetShortcut([30], bad, 5), null);
    }
  });

  test('generated shortcuts obey the same inclusive 1000 m offset bound as typing', () => {
    const fitted = (slope: number): Regression => ({
      ...regression,
      coefficients: [{ faultDip: 30, slope, intercept: 0, n: 10, r2: 1 }],
    });
    assert.equal(offsetShortcut([30], fitted(200), 5), '1000');
    assert.equal(offsetShortcut([30], fitted(300), 5), null);
  });

  test('an upper coverage shortcut preserves a lower-end coverage warning', () => {
    const fitted: Regression = {
      ...regression,
      coefficients: [{ faultDip: 30, slope: 0.5, intercept: 1, n: 10, r2: 1 }],
    };
    const value = offsetShortcut([30], fitted, 5);
    assert.equal(value, '3.5');
    const [window] = convertWindows(Number(value), [30], fitted.coefficients);
    assert.deepEqual(window, { faultDip: 30, lo: -2, hi: 5 });
    assert.equal(rangeFlag(window, { max: 5, recordingStep: 0.0001 }), 'partly_out');
  });

  test('finite coefficients cannot offer a shortcut with nonfinite cap or back-projection', () => {
    const fitted = (slope: number, intercept: number): Regression => ({
      ...regression,
      coefficients: [{ faultDip: 30, slope, intercept, n: 10, r2: 1 }],
    });
    // Multiplication overflows before an offset can be offered.
    assert.equal(offsetShortcut([30], fitted(Number.MAX_VALUE, 0), 5), null);
    // The cap is the finite value 1, but its zero-offset endpoint
    // back-projects to -Infinity. A syntactically valid cap is insufficient.
    assert.equal(offsetShortcut([30], fitted(Number.MIN_VALUE, 1), 5), null);
  });
});

describe('sample inputs (guided DDD §§9.1, 10.1)', () => {
  const EXPECTED = {
    illustrative: {
      faultDip: [30, 40], depth: [5], density: ['Dense'], strength: 'Strong', offsetMax: '3',
      members: [['fault_dip', 30, /30° fault angle/], ['fault_dip', 40, /40° fault angle/], ['depth', 5, /5 m sediment depth/], ['density', 'Dense', /Dense sediment density/]],
    },
    kern: {
      faultDip: [60, 70], depth: [10], density: ['Medium'], strength: 'Moderate', offsetMax: '1.3',
      members: [['fault_dip', 60, /60° fault angle/], ['fault_dip', 70, /70° fault angle/], ['depth', 10, /10 m sediment depth/], ['density', 'Medium', /Medium sediment density/]],
    },
  } as const;

  for (const id of ['illustrative', 'kern'] as const) {
    const expected = EXPECTED[id];

    test(`the ${id} sample is complete, valid, canonical, and offset-mode`, () => {
      const sample = sampleDraft(manifest, id);
      assert.deepEqual(sample.faultDip, expected.faultDip);
      assert.deepEqual(sample.depth, expected.depth);
      assert.deepEqual(sample.density, expected.density);
      assert.deepEqual(sample.sediment.map(pair => sedimentGroup(pair.set) + ': ' + pair.sedimentStrength),
        [`Layered sediment: ${expected.strength}`, `Uniform sediment: ${expected.strength}`]);
      assert.equal(sample.mode, 'offset');
      assert.equal(sample.offsetMax, expected.offsetMax);
      const judged = validateDraft(sample, manifest);
      assert.deepEqual(judged.issues, []);
      assert.ok(judged.scenario);
      // The editable sample is already in the scenario's canonical order.
      assert.deepEqual(judged.scenario.faultDip, sample.faultDip);
      assert.deepEqual(judged.scenario.depth, sample.depth);
      assert.deepEqual(judged.scenario.density, sample.density);
      assert.deepEqual(judged.scenario.sediment, sample.sediment);
      assert.deepEqual([...sample.sediment].sort(compareSedimentPairs), sample.sediment);
      assert.deepEqual(judged.scenario.window, { mode: 'offset', offsetMax: expected.offsetMax });
    });

    test(`the ${id} sample keeps fresh slip entries, population, and scarp classes`, () => {
      const sample = sampleDraft(manifest, id), fresh = freshDraft(manifest);
      assert.equal(sample.slipMin, fresh.slipMin);
      assert.equal(sample.slipMax, fresh.slipMax);
      assert.equal(sample.population, fresh.population);
      assert.deepEqual(sample.scarpClass, fresh.scarpClass);
      assert.equal(draftChanged(sample, fresh), true);
      // Each call returns independent arrays.
      const other = sampleDraft(manifest, id);
      assert.notEqual(other.sediment[0], sample.sediment[0]);
      other.faultDip.push(20);
      assert.deepEqual(sampleDraft(manifest, id).faultDip, expected.faultDip);
    });

    test(`a missing ${id} member throws instead of shrinking the sample`, () => {
      const without = (column: 'fault_dip' | 'depth' | 'density', value: number | string): Manifest => ({
        ...manifest,
        trialColumns: {
          ...manifest.trialColumns,
          [column]: (manifest.trialColumns[column] as readonly (number | string)[]).filter(v => v !== value),
        },
      });
      for (const [column, value, message] of expected.members) assert.throws(() => sampleDraft(without(column, value), id), message);
      for (const group of ['Uniform', 'Layered']) {
        const pruned: Manifest = {
          ...manifest,
          armStrengthStates: manifest.armStrengthStates.filter(pair =>
            !(sedimentGroup(pair.set) === `${group} sediment` && pair.sedimentStrength === expected.strength)),
        };
        assert.throws(() => sampleDraft(pruned, id), new RegExp(`${group}: ${expected.strength}`));
      }
    });
  }

  test('the two samples differ and neither builder depends on the other', () => {
    assert.equal(draftChanged(sampleDraft(manifest, 'illustrative'), sampleDraft(manifest, 'kern')), true);
    // Removing a Kern-only member leaves the illustrative builder intact, and vice versa.
    const no70: Manifest = { ...manifest, trialColumns: { ...manifest.trialColumns, fault_dip: manifest.trialColumns.fault_dip.filter(v => v !== 70) } };
    assert.deepEqual(sampleDraft(no70, 'illustrative').faultDip, [30, 40]);
    const no30: Manifest = { ...manifest, trialColumns: { ...manifest.trialColumns, fault_dip: manifest.trialColumns.fault_dip.filter(v => v !== 30) } };
    assert.deepEqual(sampleDraft(no30, 'kern').faultDip, [60, 70]);
  });
});

describe('sample identifiers', () => {
  test('isSampleId accepts exactly the named samples', () => {
    assert.equal(isSampleId('illustrative'), true);
    assert.equal(isSampleId('kern'), true);
    for (const other of [undefined, null, '', 'Kern', 'toString', '__proto__', 'constructor', 1]) assert.equal(isSampleId(other), false);
  });
});
