// scenario-controls.test.ts (docs/app/ddd.md §7.4, the
// `scenario-controls.test.ts` row; §5.7 Scenario controls):
// `controlModel(manifest, state)` — every option list equals its
// fixture-manifest dictionary in dictionary order, the sediment pairs in
// `arm_strength_states` order with the uniform arm first, never
// hardcoded; the defaults equal the manifest-derived values; the disabled
// flags; the display-label map — and `dipRangeEcho(entry, dips)`, the
// modeled dips an entry includes. The manifests come from
// test/fixtures.ts through the real decoder. Rendering the echo is the
// browser lane's (§7.5).

import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';

import type { Manifest } from '../src/decode/fields';
import {
  defaultDisplayState,
  defaultScenario,
  reduce,
  type Action,
  type AppState,
} from '../src/state/state';
import { copyText } from '../src/views/copy';
import { displayRound } from '../src/views/format';
import {
  controlModel,
  dipRangeEcho,
  emphasisSpans,
  sedimentLabel,
  type ControlModel,
} from '../src/views/scenario-controls';
import { buildFixture, decodeFixture, vocabularySpec } from './fixtures';

let manifest: Manifest;
let other: Manifest;

before(async () => {
  manifest = (await decodeFixture(await buildFixture(vocabularySpec()))).manifest;
  other = (
    await decodeFixture(
      await buildFixture(vocabularySpec({ dips: [25, 35, 65], maxSlipSteps: 42000, scarpClasses: ['Alpha', 'Beta'] })),
    )
  ).manifest;
});

/** The fresh default AppState of `m`. */
const initial = (m: Manifest): AppState => ({ scenario: defaultScenario(m), display: defaultDisplayState() });

/** `reduce` over `actions` in order. */
const run = (m: Manifest, actions: readonly Action[]): AppState =>
  actions.reduce((s, a) => reduce(s, a, m), initial(m));

const values = <V>(options: readonly { readonly value: V }[]): V[] => options.map((o) => o.value);

describe('controlModel option lists', () => {
  for (const which of ['shipped vocabulary', 'other vocabulary'] as const) {
    test(`every option list equals its fixture-manifest dictionary (${which})`, () => {
      const m = which === 'shipped vocabulary' ? manifest : other;
      const model = controlModel(m, initial(m));
      assert.deepEqual(values(model.faultDip.options), [...m.trialColumns.fault_dip]);
      assert.deepEqual(values(model.depth.options), [...m.trialColumns.depth]);
      assert.deepEqual(values(model.density.options), [...m.trialColumns.density]);
      assert.deepEqual(values(model.scarpClass.options), [...m.scarpClasses]);
      assert.deepEqual(
        model.scarpClass.options.map((o) => o.color),
        m.scarpClasses.map((c) => m.scarpClassPalette[c]),
      );
      const pairs = model.sediment.arms.flatMap((arm) => values(arm.options));
      assert.deepEqual(
        pairs,
        m.armStrengthStates.map((p) => ({ set: p.set, sedimentStrength: p.sedimentStrength })),
      );
    });
  }

  test('the sediment pairs split into the uniform arm first, then the layered arm, each in manifest order', () => {
    const model = controlModel(manifest, initial(manifest));
    const [uniform, layered] = model.sediment.arms;
    assert.equal(model.sediment.arms.length, 2);
    assert.equal(uniform.set, 'Homogeneous');
    assert.equal(uniform.legend, 'Uniform');
    assert.equal(layered.set, 'Heterogeneous');
    assert.equal(layered.legend, 'Layered');
    const ofSet = (set: string): string[] =>
      manifest.armStrengthStates.filter((p) => p.set === set).map((p) => p.sedimentStrength);
    assert.deepEqual(
      uniform.options.map((o) => o.value.sedimentStrength),
      ofSet('Homogeneous'),
    );
    assert.deepEqual(
      layered.options.map((o) => o.value.sedimentStrength),
      ofSet('Heterogeneous'),
    );
    assert.ok(uniform.options.every((o) => o.value.set === 'Homogeneous'));
    assert.ok(layered.options.every((o) => o.value.set === 'Heterogeneous'));
  });

  test('option labels: dips as {d}°, depths as {d} m, densities and classes verbatim', () => {
    const model = controlModel(manifest, initial(manifest));
    assert.deepEqual(
      model.faultDip.options.map((o) => o.label),
      manifest.trialColumns.fault_dip.map((d) => `${d}°`),
    );
    assert.deepEqual(
      model.depth.options.map((o) => o.label),
      manifest.trialColumns.depth.map((d) => `${d} m`),
    );
    assert.deepEqual(
      model.density.options.map((o) => o.label),
      [...manifest.trialColumns.density],
    );
    assert.deepEqual(
      model.scarpClass.options.map((o) => o.label),
      [...manifest.scarpClasses],
    );
  });

  test('the bounds come from the manifest: the helper line and the rejection line', () => {
    for (const m of [manifest, other]) {
      const model = controlModel(m, initial(m));
      const b = m.slipWindowBounds;
      assert.equal(
        model.slip.help,
        `Recorded range: ${String(b.min)}–${String(b.max)} m. Recording step: about ${displayRound(m.stageSpacing.mean, 2)} m.`,
      );
      assert.equal(
        model.slip.rejection,
        `Enter slip values from 0 to ${String(b.max)} m, the minimum not above the maximum. The results still show the last valid scenario.`,
      );
    }
    assert.equal(controlModel(other, initial(other)).slip.help.startsWith('Recorded range: 0–4.2 m.'), true);
  });

  test('the fixed labels come from the copy registry', () => {
    const model = controlModel(manifest, initial(manifest));
    assert.equal(model.entryMode.legend, 'Enter displacement as');
    assert.deepEqual(
      model.entryMode.options.map((o) => [o.value, o.label]),
      [
        ['slip', 'Fault slip at depth (m)'],
        ['offset', 'Anticipated vertical surface offset (m)'],
      ],
    );
    assert.equal(model.slip.legend, 'Fault slip at depth (m)');
    assert.equal(model.slip.range, 'approximately 0–5 m');
    assert.equal(model.slip.minLabel, 'Minimum (m)');
    assert.equal(model.slip.maxLabel, 'Maximum (m)');
    assert.equal(model.offset.legend, 'Anticipated vertical surface offset (m)');
    assert.equal(model.offset.label, 'Maximum (m)');
    assert.equal(model.offset.rejection, copyText('pdd5.6.rejectedEntryLine'));
    assert.equal(model.population.legend, 'Population');
    assert.deepEqual(
      model.population.options.map((o) => [o.value, o.label]),
      [
        ['all_stages', 'All model stages in the slip window'],
        ['one_state_per_trial', 'One state per simulation trial'],
      ],
    );
    assert.equal(model.population.explainerSummary, 'What do the two populations mean?');
    assert.equal(model.scarpClass.legend, 'Resulting scarp type (a model output, not a site input)');
    assert.equal(model.familyView.label, 'Group collapse variants');
    assert.equal(model.familyView.note, 'Family grouping needs all six types');
    assert.equal(model.sediment.helper, 'The same word means different built profiles in the two arms.');
    assert.equal(model.sediment.advancedSummary, 'Advanced');
    assert.equal(model.faultDip.rangeLabel, 'Fault dip range');
    assert.equal(model.faultDip.applyLabel, 'Apply');
    assert.equal(model.reset.label, 'Reset');
  });

  test('the population explainer keeps the PDD §5.3 emphasis as strong spans', () => {
    const model = controlModel(manifest, initial(manifest));
    const strong = model.population.explainer.filter((s) => s.strong).map((s) => s.text);
    assert.deepEqual(strong, ['All model stages in the slip window', 'One state per trial']);
    assert.equal(
      model.population.explainer.map((s) => s.text).join(''),
      copyText('pdd5.3.populationExplainer').split('**').join(''),
    );
    assert.deepEqual(emphasisSpans('a **b** c'), [
      { text: 'a ', strong: false },
      { text: 'b', strong: true },
      { text: ' c', strong: false },
    ]);
  });
});

describe('controlModel defaults', () => {
  test('the default state selects every option, slip mode, and the all-stages population', () => {
    for (const m of [manifest, other]) {
      const model = controlModel(m, initial(m));
      const checks = [
        ...model.faultDip.options,
        ...model.sediment.arms.flatMap((a) => a.options),
        ...model.depth.options,
        ...model.density.options,
        ...model.scarpClass.options,
      ];
      assert.ok(checks.length > 0);
      assert.ok(checks.every((o) => o.checked && o.defaultChecked));
      assert.deepEqual(
        model.entryMode.options.map((o) => [o.value, o.checked, o.defaultChecked]),
        [
          ['slip', true, true],
          ['offset', false, false],
        ],
      );
      assert.deepEqual(
        model.population.options.map((o) => [o.value, o.checked, o.defaultChecked]),
        [
          ['all_stages', true, true],
          ['one_state_per_trial', false, false],
        ],
      );
      assert.equal(model.slip.min, '');
      assert.equal(model.slip.max, '');
      assert.equal(model.offset.value, '');
      assert.equal(model.familyView.checked, false);
    }
  });

  test('the defaults equal the manifest-derived default Scenario', () => {
    const defaults = defaultScenario(manifest);
    const model = controlModel(manifest, run(manifest, [{ type: 'setFaultDip', dip: 30, selected: false }]));
    assert.deepEqual(
      model.faultDip.options.filter((o) => o.defaultChecked).map((o) => o.value),
      [...defaults.faultDip],
    );
    assert.deepEqual(
      model.faultDip.options.filter((o) => o.checked).map((o) => o.value),
      defaults.faultDip.filter((d) => d !== 30),
    );
  });

  test('checked follows the accepted Scenario; the free entries show its canonical decimals', () => {
    const slip = controlModel(
      manifest,
      run(manifest, [
        { type: 'setSediment', pair: { set: 'Heterogeneous', sedimentStrength: 'Weak' }, selected: false },
        { type: 'setDensity', density: 'Loose', selected: false },
        { type: 'setPopulation', population: 'one_state_per_trial' },
        { type: 'setWindow', window: { mode: 'slip', min: '0', max: '3' } },
      ]),
    );
    const layeredWeak = slip.sediment.arms[1].options.find((o) => o.value.sedimentStrength === 'Weak');
    assert.equal(layeredWeak?.checked, false);
    assert.equal(layeredWeak?.defaultChecked, true);
    assert.equal(slip.density.options.find((o) => o.value === 'Loose')?.checked, false);
    assert.deepEqual(
      slip.population.options.map((o) => o.checked),
      [false, true],
    );
    assert.equal(slip.slip.min, '0');
    assert.equal(slip.slip.max, '3');
    const offset = controlModel(
      manifest,
      run(manifest, [{ type: 'setWindow', window: { mode: 'offset', offsetMax: '3' } }]),
    );
    assert.deepEqual(
      offset.entryMode.options.map((o) => o.checked),
      [false, true],
    );
    assert.equal(offset.offset.value, '3');
    assert.equal(offset.slip.min, '');
  });
});

describe('controlModel disabled flags', () => {
  const family = (model: ControlModel) => model.familyView;

  test('the family toggle is enabled, its note hidden, while every scarp type is selected', () => {
    const f = family(controlModel(manifest, initial(manifest)));
    assert.equal(f.disabled, false);
    assert.equal(f.noteHidden, true);
    const on = family(controlModel(manifest, run(manifest, [{ type: 'setFamilyView', familyView: true }])));
    assert.equal(on.checked, true);
    assert.equal(on.disabled, false);
  });

  test('a partial scarp-type filter disables and unchecks the family toggle and shows its note', () => {
    for (const c of manifest.scarpClasses) {
      const state = run(manifest, [
        { type: 'setFamilyView', familyView: true },
        { type: 'setScarpClass', scarpClass: c, selected: false },
      ]);
      const f = family(controlModel(manifest, state));
      assert.equal(f.disabled, true);
      assert.equal(f.checked, false);
      assert.equal(f.noteHidden, false);
    }
    const none = run(
      manifest,
      manifest.scarpClasses.map((c) => ({ type: 'setScarpClass', scarpClass: c, selected: false }) as const),
    );
    assert.equal(family(controlModel(manifest, none)).disabled, true);
    const back = run(manifest, [
      { type: 'setScarpClass', scarpClass: manifest.scarpClasses[0], selected: false },
      { type: 'setScarpClass', scarpClass: manifest.scarpClasses[0], selected: true },
    ]);
    assert.equal(family(controlModel(manifest, back)).disabled, false);
  });

  test('the Advanced group is always disabled', () => {
    assert.equal(controlModel(manifest, initial(manifest)).sediment.advancedDisabled, true);
  });
});

describe('the display-label map', () => {
  test('data `Alternating Strong-Weak` displays as `Alternating Strong–Weak`; other labels verbatim', () => {
    assert.equal(sedimentLabel('Alternating Strong-Weak'), 'Alternating Strong–Weak');
    for (const label of ['Weak', 'Moderate', 'Strong', 'Random Heterogeneous', 'Cohesive Top Unit']) {
      assert.equal(sedimentLabel(label), label);
    }
    const layered = controlModel(manifest, initial(manifest)).sediment.arms[1];
    assert.deepEqual(
      layered.options.map((o) => o.label),
      manifest.armStrengthStates
        .filter((p) => p.set === 'Heterogeneous')
        .map((p) => (p.sedimentStrength === 'Alternating Strong-Weak' ? 'Alternating Strong–Weak' : p.sedimentStrength)),
    );
    assert.ok(layered.options.some((o) => o.label === 'Alternating Strong–Weak'));
  });
});

describe('dipRangeEcho', () => {
  const dips = (): readonly number[] => manifest.trialColumns.fault_dip;

  test('a range includes the modeled dips inside it, both ends inclusive, in either order and with either dash', () => {
    for (const entry of ['30–40', '30-40', '40–30', ' 30° – 40° ', '30 °-40 °', '29.5–40.25', '35–40', '30–44.99']) {
      const echo = dipRangeEcho(entry, dips());
      const expected = dips().filter((d) => {
        const [a, b] = entry
          .replace(/[°\s]/g, '')
          .split(/[-–]/)
          .map(Number);
        return d >= Math.min(a, b) && d <= Math.max(a, b);
      });
      assert.equal(echo.status, 'included', entry);
      assert.deepEqual(echo.dips, expected, entry);
    }
    assert.deepEqual(dipRangeEcho('30–40', dips()).dips, [30, 40]);
    assert.equal(dipRangeEcho('30–40', dips()).text, '30° and 40° only');
    assert.deepEqual(dipRangeEcho('35–40', dips()).dips, [40]);
  });

  test('one value means [v, v]; the echo lists the dips with `, ` between and ` and ` before the last', () => {
    assert.deepEqual(dipRangeEcho('45', dips()), { status: 'included', dips: [45], text: '45° only' });
    assert.deepEqual(dipRangeEcho('45.0°', dips()).dips, [45]);
    const all = dipRangeEcho('20–70', dips());
    assert.deepEqual(all.dips, [...dips()].sort((a, b) => a - b));
    assert.equal(all.text, '20°, 30°, 40°, 45°, 50°, 60° and 70° only');
    assert.equal(dipRangeEcho('40–50', dips()).text, '40°, 45° and 50° only');
  });

  test('the dips come from the given dictionary, never a literal list', () => {
    const o = other.trialColumns.fault_dip;
    assert.deepEqual(dipRangeEcho('20–40', o).dips, [25, 35]);
    assert.equal(dipRangeEcho('20–40', o).text, '25° and 35° only');
    assert.equal(dipRangeEcho('30', o).status, 'none');
  });

  test('no modeled dip included', () => {
    for (const entry of ['31', '31–39', '0', '71–90', '45.5']) {
      assert.deepEqual(
        dipRangeEcho(entry, dips()),
        { status: 'none', dips: [], text: 'No modeled fault dip in this range.' },
        entry,
      );
    }
  });

  test('unreadable entries', () => {
    for (const entry of ['abc', '-30', '30–', '30–40–50', '30 40', '3e1', '30,5', '30.', '.5', '12345678901234567', '30—40']) {
      assert.deepEqual(
        dipRangeEcho(entry, dips()),
        { status: 'unreadable', dips: [], text: 'Enter one fault dip or a range such as 30–40.' },
        entry,
      );
    }
  });

  test('BLANK echoes nothing', () => {
    for (const entry of ['', '   ', '\t\n']) {
      assert.deepEqual(dipRangeEcho(entry, dips()), { status: 'blank', dips: [], text: '' });
    }
  });
});
