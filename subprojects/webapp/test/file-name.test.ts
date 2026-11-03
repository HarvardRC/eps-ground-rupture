// file-name.test.ts (docs/app/ddd.md §7.4, the `file-name.test.ts` row,
// formerly `slug.test.ts`; §5.9 File naming): the DD-6 (Download
// file-name scenario-slug rules) slug and the PDD §6.2 file-name template
// of src/download/file-name.ts.
//
// - The key order `dip`, `sediment`, `depth`, `density`, `window`,
//   `offset`, `classes`; A → `sediment-uniform-strong-layered-weak`, B →
//   `sediment-uniform-weak-layered-strong`.
// - `.` encoded as `p`: `window-1p5-to-3` against `window-1-to-5p3`, and
//   a lone maximum `window-0-to-3`; an empty group's raw value `none`; the
//   all-default slug `all`.
// - Injectivity per token, never by enumerating complete scenarios: for
//   each group, the full slugs of the scenarios that differ from the
//   default in that group alone, over all its subsets — sediment (512),
//   dips (128), classes (64), depth (8), density (8) — are pairwise
//   distinct, the default subset giving `all`, and every other one is a
//   single token: its key, `-`, then only `[a-z0-9-]`; the `_` delimiter
//   is checked separately.
// - Truncation above 80 characters with the FNV-1a-64 suffix (vectors
//   `''` → `cbf29ce484222325`, `'a'` → `af63dc4c8601ec8c`); the
//   population token and the `YYYY-MM-DD` UTC date from `generatedAt`.
//
// The slug strings are formatting conventions §5.9 fixes, asserted
// directly (§7.4, pipeline-first rule). The manifest comes from
// test/fixtures.ts through the real decoder.

import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';

import type { Manifest } from '../src/decode/fields';
import {
  downloadFileName,
  fileNameBase,
  fnv1a64,
  fullSlug,
  sanitize,
  truncateSlug,
  utcDate,
} from '../src/download/file-name';
import { defaultScenario, type Scenario, type SedimentPair } from '../src/state/state';
import { buildFixture, decodeFixture, vocabularySpec } from './fixtures';

let manifest: Manifest;

before(async () => {
  manifest = (await decodeFixture(await buildFixture(vocabularySpec()))).manifest;
});

/** The default Scenario of the fixture manifest with `changes` applied. */
function scenario(changes: Partial<Scenario> = {}): Scenario {
  return { ...defaultScenario(manifest), ...changes };
}

const pair = (set: string, sedimentStrength: string): SedimentPair => ({ set, sedimentStrength });

/** Every subset of `values`, the empty and the full one included, each in the order of `values`. */
function subsets<V>(values: readonly V[]): V[][] {
  const out: V[][] = [];
  for (let mask = 0; mask < 1 << values.length; mask++) {
    out.push(values.filter((_, k) => (mask >> k) & 1));
  }
  return out;
}

const A = [pair('Homogeneous', 'Strong'), pair('Heterogeneous', 'Weak')];
const B = [pair('Homogeneous', 'Weak'), pair('Heterogeneous', 'Strong')];

describe('fullSlug: tokens and their order', () => {
  test('the all-default scenario gives `all`', () => {
    assert.equal(fullSlug(scenario(), manifest), 'all');
  });

  test('every group differing, slip mode: dip, sediment, depth, density, window, classes', () => {
    const s = scenario({
      faultDip: [40, 30],
      sediment: A,
      depth: [10, 5],
      density: ['Medium', 'Dense'],
      window: { mode: 'slip', min: '1.5', max: '3' },
      scarpClass: ['Simple', 'Monoclinal'],
    });
    assert.equal(
      fullSlug(s, manifest),
      'dip-30-40_sediment-uniform-strong-layered-weak_depth-5-10_density-dense-medium_window-1p5-to-3_classes-monoclinal-simple',
    );
  });

  test('offset mode has an `offset` token and no `window` token, before `classes`', () => {
    const s = scenario({
      faultDip: [45],
      window: { mode: 'offset', offsetMax: '2.25' },
      scarpClass: ['Pressure Ridge Collapse'],
    });
    assert.equal(fullSlug(s, manifest), 'dip-45_offset-2p25_classes-pressure-ridge-collapse');
  });

  test('pair set A → `sediment-uniform-strong-layered-weak`, B → `sediment-uniform-weak-layered-strong`', () => {
    assert.equal(fullSlug(scenario({ sediment: A }), manifest), 'sediment-uniform-strong-layered-weak');
    assert.equal(fullSlug(scenario({ sediment: B }), manifest), 'sediment-uniform-weak-layered-strong');
  });

  test('one arm alone contributes only its own word; labels in manifest order', () => {
    const layered = [pair('Heterogeneous', 'Alternating Strong-Weak'), pair('Heterogeneous', 'Weak')];
    assert.equal(fullSlug(scenario({ sediment: layered }), manifest), 'sediment-layered-weak-alternating-strong-weak');
  });

  test('`.` is encoded as `p` before the sanitizer', () => {
    const slip = (min: string, max: string) => fullSlug(scenario({ window: { mode: 'slip', min, max } }), manifest);
    assert.equal(slip('1.5', '3'), 'window-1p5-to-3');
    assert.equal(slip('1', '5.3'), 'window-1-to-5p3');
    assert.equal(slip('0', '3'), 'window-0-to-3', 'a lone maximum: the effective minimum is 0');
    assert.equal(sanitize('A.b_C d--e.'), 'apb-c-d-ep');
  });

  test('an empty group has the raw value `none`', () => {
    assert.equal(fullSlug(scenario({ faultDip: [] }), manifest), 'dip-none');
    assert.equal(fullSlug(scenario({ sediment: [] }), manifest), 'sediment-none');
    assert.equal(fullSlug(scenario({ depth: [] }), manifest), 'depth-none');
    assert.equal(fullSlug(scenario({ density: [] }), manifest), 'density-none');
    assert.equal(fullSlug(scenario({ scarpClass: [] }), manifest), 'classes-none');
  });

  test('the population is not part of the slug', () => {
    assert.equal(fullSlug(scenario({ population: 'one_state_per_trial' }), manifest), 'all');
  });
});

describe('fullSlug: injectivity per token', () => {
  /** The full slugs of the scenarios differing from the default in one group alone, over all its subsets. */
  function groupSlugs(key: string, make: (k: number) => Partial<Scenario>, count: number): void {
    const slugs = new Set<string>();
    let all = 0;
    for (let k = 0; k < count; k++) {
      const slug = fullSlug(scenario(make(k)), manifest);
      slugs.add(slug);
      if (slug === 'all') {
        all++;
        continue;
      }
      assert.match(slug, new RegExp(`^${key}-[a-z0-9-]+$`), `${slug} is one ${key} token`);
      assert.ok(!slug.includes('_'), `${slug} holds no _`);
    }
    assert.equal(slugs.size, count, `${count} subsets of ${key} give ${count} distinct slugs`);
    assert.equal(all, 1, `only the default ${key} subset gives all`);
  }

  test('sediment: 512 subsets of the nine pairs', () => {
    const pairs = manifest.armStrengthStates.map((p) => pair(p.set, p.sedimentStrength));
    assert.equal(pairs.length, 9);
    const all = subsets(pairs);
    assert.equal(all.length, 512);
    groupSlugs('sediment', (k) => ({ sediment: all[k] }), all.length);
  });

  test('dip: 128 subsets of the seven dips', () => {
    const all = subsets(manifest.trialColumns.fault_dip);
    assert.equal(all.length, 128);
    groupSlugs('dip', (k) => ({ faultDip: all[k] }), all.length);
  });

  test('classes: 64 subsets of the six scarp types', () => {
    const all = subsets(manifest.scarpClasses);
    assert.equal(all.length, 64);
    groupSlugs('classes', (k) => ({ scarpClass: all[k] }), all.length);
  });

  test('depth: 8 subsets', () => {
    const all = subsets(manifest.trialColumns.depth);
    assert.equal(all.length, 8);
    groupSlugs('depth', (k) => ({ depth: all[k] }), all.length);
  });

  test('density: 8 subsets', () => {
    const all = subsets(manifest.trialColumns.density);
    assert.equal(all.length, 8);
    groupSlugs('density', (k) => ({ density: all[k] }), all.length);
  });

  test('the delimiter rule: a full slug splits at `_` into its groups’ tokens', () => {
    const s = scenario({
      faultDip: [20],
      sediment: [pair('Homogeneous', 'Moderate')],
      depth: [3],
      density: ['Loose'],
      window: { mode: 'slip', min: '0.25', max: '4' },
      scarpClass: ['Simple Collapse'],
    });
    const tokens = fullSlug(s, manifest).split('_');
    assert.deepEqual(tokens, [
      'dip-20',
      'sediment-uniform-moderate',
      'depth-3',
      'density-loose',
      'window-0p25-to-4',
      'classes-simple-collapse',
    ]);
    for (const [key, changes] of [
      ['dip', { faultDip: s.faultDip }],
      ['sediment', { sediment: s.sediment }],
      ['depth', { depth: s.depth }],
      ['density', { density: s.density }],
      ['window', { window: s.window }],
      ['classes', { scarpClass: s.scarpClass }],
    ] as const) {
      const alone = fullSlug(scenario(changes), manifest);
      assert.ok(tokens.includes(alone), `${key}: ${alone} is the token of that group alone`);
    }
  });
});

describe('truncation and the FNV-1a-64 hash', () => {
  test('the hash vectors', () => {
    assert.equal(fnv1a64(''), 'cbf29ce484222325');
    assert.equal(fnv1a64('a'), 'af63dc4c8601ec8c');
  });

  test('a slug of 80 characters is kept; one over 80 is truncated to at most 80 with the hash suffix', () => {
    const eighty = 'x'.repeat(80);
    assert.equal(truncateSlug(eighty), eighty);
    const s = scenario({
      faultDip: [20, 30, 40, 45, 50, 60],
      sediment: manifest.armStrengthStates.slice(0, 8).map((p) => pair(p.set, p.sedimentStrength)),
      density: ['Dense', 'Loose'],
      scarpClass: manifest.scarpClasses.slice(0, 5),
    });
    const full = fullSlug(s, manifest);
    assert.ok(full.length > 80, `the fixture slug has ${full.length} characters`);
    const cut = truncateSlug(full);
    assert.ok(cut.length <= 80);
    assert.equal(cut, `${full.slice(0, 71).replace(/[-_]+$/, '')}-${fnv1a64(full).slice(0, 8)}`);
    assert.ok(cut.endsWith(`-${fnv1a64(full).slice(0, 8)}`));
  });

  test('trailing `-` and `_` of the kept 71 characters are dropped', () => {
    const slug = `${'a'.repeat(68)}-_-${'b'.repeat(20)}`;
    assert.equal(slug.slice(0, 71), `${'a'.repeat(68)}-_-`);
    assert.equal(truncateSlug(slug), `${'a'.repeat(68)}-${fnv1a64(slug).slice(0, 8)}`);
  });
});

describe('the file-name template', () => {
  const at = new Date('2026-11-03T12:34:57Z');

  test('ground-rupture-explorer_{scenario-slug}_{population}_{data-version}_{date}.zip', () => {
    assert.equal(
      downloadFileName(scenario(), manifest, at),
      `ground-rupture-explorer_all_all-stages_${manifest.exportVersion}_2026-11-03.zip`,
    );
    assert.equal(
      downloadFileName(scenario({ population: 'one_state_per_trial', depth: [5] }), manifest, at),
      `ground-rupture-explorer_depth-5_one-state_${manifest.exportVersion}_2026-11-03.zip`,
    );
    assert.equal(fileNameBase(scenario(), manifest, at) + '.zip', downloadFileName(scenario(), manifest, at));
  });

  test('the date is generatedAt’s UTC date', () => {
    assert.equal(utcDate(new Date('2026-11-03T23:59:59Z')), '2026-11-03');
    assert.equal(utcDate(new Date('2026-11-04T00:30:00+01:00')), '2026-11-03');
    assert.equal(utcDate(new Date('2027-01-01T00:00:00Z')), '2027-01-01');
  });
});
