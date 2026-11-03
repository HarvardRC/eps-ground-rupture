// summary.test.ts (docs/app/ddd.md §7.4, the `summary.test.ts` row; §5.7
// Layout and scenario summary): `summaryText(state, counts)` — the PDD
// tokens verbatim (`Strong (uniform)`, `Strong — uniform and layered`,
// `slip: any` for the inactive window, `all recorded stages` for the
// all-stages population without a window, `any sediment` for all nine
// pairs), the pair sets A → `Weak (layered) or Strong (uniform)` and B →
// `Weak (uniform) or Strong (layered)`, 512 distinct sediment tokens over
// all 512 pair subsets, each checkbox group's empty-group token, and the
// offset-mode window token — with `settingsText` and `populationText`.
// The manifest comes from test/fixtures.ts through the real decoder.

import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';

import type { Manifest } from '../src/decode/fields';
import { defaultScenario, type Scenario, type SedimentPair } from '../src/state/state';
import { populationText, settingsText, summaryText, type SummaryState } from '../src/views/summary';
import { buildFixture, codePointCompare, decodeFixture, vocabularySpec } from './fixtures';

let manifest: Manifest;

before(async () => {
  manifest = (await decodeFixture(await buildFixture(vocabularySpec()))).manifest;
});

/** The default Scenario of the fixture manifest with `changes` applied. */
function scenario(changes: Partial<Scenario> = {}): Scenario {
  return { ...defaultScenario(manifest), ...changes };
}

const state = (changes: Partial<Scenario> = {}): SummaryState => ({ scenario: scenario(changes), manifest });

const pair = (set: string, sedimentStrength: string): SedimentPair => ({ set, sedimentStrength });
const sortPairs = (pairs: SedimentPair[]): SedimentPair[] =>
  pairs.sort((a, b) => codePointCompare(a.set, b.set) || codePointCompare(a.sedimentStrength, b.sedimentStrength));

/** The tokens of a summary, split at ` · `. */
const tokens = (text: string): string[] => text.split(' · ');

/** The sediment token (the second) of the summary of `sediment`. */
const sedimentToken = (sediment: SedimentPair[]): string =>
  tokens(summaryText(state({ sediment: sortPairs(sediment) }), { matchingRecords: 1 }))[1];

describe('summaryText', () => {
  test('the default scenario', () => {
    assert.equal(
      summaryText(state(), { matchingRecords: 346834 }),
      'Any dip · any sediment · any depth · any density · slip: any · all recorded stages · ' +
        'all scarp types (no filter) · matching records: 346,834',
    );
  });

  test('the PDD §3 example, token for token', () => {
    const text = summaryText(
      state({
        faultDip: [30, 40],
        sediment: [pair('Homogeneous', 'Strong')],
        depth: [5, 10],
        window: { mode: 'slip', min: '0', max: '3' },
      }),
      { matchingRecords: 3434 },
    );
    assert.equal(
      text,
      'Dip 30° or 40° · Strong (uniform) · depth 5 or 10 m · any density · slip 0–3 m · all stages in window · ' +
        'all scarp types (no filter) · matching records: 3,434',
    );
  });

  test('the PDD sediment tokens verbatim', () => {
    assert.equal(sedimentToken([pair('Homogeneous', 'Strong')]), 'Strong (uniform)');
    assert.equal(
      sedimentToken([pair('Homogeneous', 'Strong'), pair('Heterogeneous', 'Strong')]),
      'Strong — uniform and layered',
    );
    assert.equal(sedimentToken([pair('Heterogeneous', 'Strong')]), 'Strong (layered)');
    assert.equal(sedimentToken(manifest.armStrengthStates.map((p) => pair(p.set, p.sedimentStrength))), 'any sediment');
  });

  test('pair set A reads `Weak (layered) or Strong (uniform)`, pair set B `Weak (uniform) or Strong (layered)`', () => {
    assert.equal(
      sedimentToken([pair('Homogeneous', 'Strong'), pair('Heterogeneous', 'Weak')]),
      'Weak (layered) or Strong (uniform)',
    );
    assert.equal(
      sedimentToken([pair('Homogeneous', 'Weak'), pair('Heterogeneous', 'Strong')]),
      'Weak (uniform) or Strong (layered)',
    );
  });

  test('labels pass through the display-label map, in the order of first appearance', () => {
    assert.equal(
      sedimentToken([
        pair('Heterogeneous', 'Alternating Strong-Weak'),
        pair('Heterogeneous', 'Cohesive Top Unit'),
        pair('Homogeneous', 'Moderate'),
        pair('Heterogeneous', 'Moderate'),
      ]),
      'Moderate — uniform and layered or Cohesive Top Unit (layered) or Alternating Strong–Weak (layered)',
    );
  });

  test('512 distinct sediment tokens over all 512 subsets of the nine pairs', () => {
    const pairs = manifest.armStrengthStates.map((p) => pair(p.set, p.sedimentStrength));
    assert.equal(pairs.length, 9);
    const seen = new Set<string>();
    for (let mask = 0; mask < 1 << pairs.length; mask++) {
      seen.add(sedimentToken(pairs.filter((_, i) => (mask & (1 << i)) !== 0)));
    }
    assert.equal(seen.size, 512);
  });

  test('each checkbox group has its empty-group token', () => {
    const empty: [Partial<Scenario>, number, string][] = [
      [{ faultDip: [] }, 0, 'No fault dip selected'],
      [{ sediment: [] }, 1, 'no sediment strength selected'],
      [{ depth: [] }, 2, 'no sediment depth selected'],
      [{ density: [] }, 3, 'no sediment density selected'],
      [{ scarpClass: [] }, 6, 'no resulting scarp type selected'],
    ];
    for (const [changes, index, token] of empty) {
      assert.equal(tokens(summaryText(state(changes), { matchingRecords: 0 }))[index], token);
    }
  });

  test('the other group tokens: ascending dips and depths, densities and classes in dictionary order', () => {
    const dips = manifest.trialColumns.fault_dip;
    const classes = manifest.scarpClasses;
    const t = tokens(
      summaryText(
        state({
          faultDip: [dips[4], dips[1]].sort((a, b) => a - b),
          depth: [10, 3],
          density: [manifest.trialColumns.density[2], manifest.trialColumns.density[0]],
          scarpClass: [classes[4], classes[0]],
        }),
        { matchingRecords: 0 },
      ),
    );
    assert.equal(t[0], `Dip ${dips[1]}° or ${dips[4]}°`);
    assert.equal(t[2], 'depth 3 or 10 m');
    assert.equal(t[3], `density ${manifest.trialColumns.density[0]} or ${manifest.trialColumns.density[2]}`);
    assert.equal(t[6], `scarp type ${classes[0]} or ${classes[4]}`);
    assert.equal(t[7], 'matching records: 0');
  });

  test('the window and population tokens', () => {
    const t = (changes: Partial<Scenario>): string[] => tokens(summaryText(state(changes), { matchingRecords: 7 }));
    assert.deepEqual(t({}).slice(4, 6), ['slip: any', 'all recorded stages']);
    assert.deepEqual(t({ window: { mode: 'slip', min: '0.5', max: '5.0135' } }).slice(4, 6), [
      'slip 0.5–5.0135 m',
      'all stages in window',
    ]);
    assert.deepEqual(t({ window: { mode: 'offset', offsetMax: '3' } }).slice(4, 6), [
      'offset 0–3 m (converted to slip per dip)',
      'all stages in window',
    ]);
    assert.deepEqual(t({ population: 'one_state_per_trial' }).slice(4, 6), [
      'slip: any',
      'one state per simulation trial',
    ]);
    assert.deepEqual(
      t({ window: { mode: 'offset', offsetMax: '0.25' }, population: 'one_state_per_trial' }).slice(4, 6),
      ['offset 0–0.25 m (converted to slip per dip)', 'one state per simulation trial'],
    );
  });

  test('the first character is upper-cased whichever token leads', () => {
    assert.ok(summaryText(state(), { matchingRecords: 1 }).startsWith('Any dip · '));
    assert.ok(summaryText(state({ faultDip: [] }), { matchingRecords: 0 }).startsWith('No fault dip selected · '));
    assert.ok(summaryText(state({ faultDip: [30] }), { matchingRecords: 1 }).startsWith('Dip 30° · '));
  });
});

describe('settingsText and populationText', () => {
  test('settingsText is the summary without the population and count tokens', () => {
    const s = state({ faultDip: [30, 40], window: { mode: 'offset', offsetMax: '3' }, scarpClass: ['Simple'] });
    assert.equal(
      settingsText(s),
      'Dip 30° or 40° · any sediment · any depth · any density · offset 0–3 m (converted to slip per dip) · ' +
        'scarp type Simple',
    );
    const all = tokens(summaryText(s, { matchingRecords: 12 }));
    assert.equal(settingsText(s), [...all.slice(0, 5), all[6]].join(' · '));
  });

  test('populationText is the population token alone', () => {
    assert.equal(populationText(state()), 'all recorded stages');
    assert.equal(populationText(state({ window: { mode: 'slip', min: '0', max: '3' } })), 'all stages in window');
    assert.equal(populationText(state({ population: 'one_state_per_trial' })), 'one state per simulation trial');
  });
});
