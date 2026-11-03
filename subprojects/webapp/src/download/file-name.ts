// The download file name of docs/app/ddd.md §5.9 (File naming): the
// DD-6 (Download file-name scenario-slug rules) scenario slug and the
// PDD §6.2 template
// `ground-rupture-explorer_{scenario-slug}_{population}_{data-version}_{date}`
// with `.zip` appended.
//
// The slug is the `_`-joined `key-value` tokens of every control that
// differs from its default, in the fixed key order `dip`, `sediment`,
// `depth`, `density`, `window`, `offset`, `classes`; an all-default
// scenario gives `all`, an empty group the raw value `none`. Each raw
// value has `.` replaced by `p`, is lowercased, has every character
// outside `[a-z0-9-]` turned into `-`, runs of `-` collapsed, and leading
// and trailing `-` dropped. A slug over 80 characters keeps its first
// 71, drops trailing `-` and `_`, and appends `-` and the first 8 hex
// digits of the FNV-1a 64-bit hash of the full slug's UTF-8 bytes.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import type { Manifest } from '../decode/fields';
import { defaultScenario, type Population, type Scenario } from '../state/state';
import { LAYERED_SET, UNIFORM_SET } from '../views/scenario-controls';

/** The template's fixed head (PDD §6.2). */
const PRODUCT = 'ground-rupture-explorer';

/** The token separator of the template and of the slug (§5.9). */
const SEPARATOR = '_';

/** The slug of the all-default scenario (§5.9). */
const ALL = 'all';

/** The raw value of an empty group (§5.9; §5.7 R5). */
const NONE = 'none';

/** The slug length limit, the kept prefix, and the hash digits of a truncated slug (§5.9). */
const SLUG_LIMIT = 80;
const SLUG_KEPT = 71;
const HASH_DIGITS = 8;

/** The `{population}` token (§5.9, fixed here). */
const POPULATION_TOKEN: { readonly [p in Population]: string } = {
  all_stages: 'all-stages',
  one_state_per_trial: 'one-state',
};

/** The sediment arm words, uniform arm first (§5.9). */
const ARM_WORDS: readonly (readonly [set: string, word: string])[] = [
  [UNIFORM_SET, 'uniform'],
  [LAYERED_SET, 'layered'],
];

/** The FNV-1a 64-bit offset basis and prime, and the 64-bit mask. */
const FNV_OFFSET = BigInt('0xcbf29ce484222325');
const FNV_PRIME = BigInt('0x100000001b3');
const MASK_64 = BigInt('0xffffffffffffffff');

/**
 * The 16-digit lowercase zero-padded hexadecimal FNV-1a 64-bit hash of
 * the UTF-8 bytes of `text` (§5.9): `''` gives `cbf29ce484222325`, `'a'`
 * `af63dc4c8601ec8c`.
 */
export function fnv1a64(text: string): string {
  let h = FNV_OFFSET;
  for (const byte of new TextEncoder().encode(text)) {
    h = ((h ^ BigInt(byte)) * FNV_PRIME) & MASK_64;
  }
  return h.toString(16).padStart(16, '0');
}

/**
 * A raw value sanitized (§5.9): `.` replaced by `p`, lowercased, every
 * character outside `[a-z0-9-]` turned into `-`, runs of `-` collapsed
 * to one, leading and trailing `-` dropped.
 */
export function sanitize(raw: string): string {
  return raw
    .split('.')
    .join('p')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** True when `a` and `b` hold the same members. */
function sameMembers<V>(a: readonly V[], b: readonly V[]): boolean {
  return a.length === b.length && a.every((v) => b.includes(v)) && b.every((v) => a.includes(v));
}

/** A group's raw value: `none` when empty, else its values joined with `-`. */
function joined(values: readonly (string | number)[]): string {
  return values.length === 0 ? NONE : values.join('-');
}

/** `selected` in the order of `dictionary`. */
function inOrder<V>(dictionary: readonly V[], selected: readonly V[]): V[] {
  return dictionary.filter((v) => selected.includes(v));
}

/**
 * The sediment raw value (§5.9): for the uniform arm, then the layered
 * arm, each arm with a selection contributes its word followed by its
 * selected labels in `arm_strength_states` order; `none` when no pair
 * is selected.
 */
function sedimentRaw(scenario: Scenario, manifest: Manifest): string {
  const parts: string[] = [];
  for (const [set, word] of ARM_WORDS) {
    const labels = manifest.armStrengthStates
      .filter((p) => p.set === set)
      .map((p) => p.sedimentStrength)
      .filter((label) => scenario.sediment.some((s) => s.set === set && s.sedimentStrength === label));
    if (labels.length > 0) parts.push(word, ...labels);
  }
  return joined(parts);
}

/**
 * The full scenario slug of `scenario` (§5.9), before truncation: the
 * `_`-joined `key-value` tokens of every control that differs from its
 * default (`defaultScenario(manifest)`), in the key order `dip`,
 * `sediment`, `depth`, `density`, `window`, `offset`, `classes`; `all`
 * when none differs.
 */
export function fullSlug(scenario: Scenario, manifest: Manifest): string {
  const base = defaultScenario(manifest);
  const raw: (readonly [key: string, value: string])[] = [];

  if (!sameMembers(scenario.faultDip, base.faultDip)) {
    raw.push(['dip', joined([...scenario.faultDip].sort((a, b) => a - b))]);
  }
  const pairKey = (p: { readonly set: string; readonly sedimentStrength: string }): string =>
    JSON.stringify([p.set, p.sedimentStrength]);
  if (!sameMembers(scenario.sediment.map(pairKey), base.sediment.map(pairKey))) {
    raw.push(['sediment', sedimentRaw(scenario, manifest)]);
  }
  if (!sameMembers(scenario.depth, base.depth)) {
    raw.push(['depth', joined(inOrder(manifest.trialColumns.depth, scenario.depth))]);
  }
  if (!sameMembers(scenario.density, base.density)) {
    raw.push(['density', joined(inOrder(manifest.trialColumns.density, scenario.density))]);
  }
  const w = scenario.window;
  if (w.mode === 'slip' && w.min !== null) {
    raw.push(['window', `${w.min}-to-${w.max}`]);
  }
  if (w.mode === 'offset') {
    raw.push(['offset', w.offsetMax]);
  }
  if (!sameMembers(scenario.scarpClass, base.scarpClass)) {
    raw.push(['classes', joined(inOrder(manifest.scarpClasses, scenario.scarpClass))]);
  }

  if (raw.length === 0) return ALL;
  return raw.map(([key, value]) => `${key}-${sanitize(value)}`).join(SEPARATOR);
}

/**
 * `slug` truncated (§5.9): unchanged up to 80 characters; longer, its
 * first 71 characters without trailing `-` and `_`, then `-` and the
 * first 8 hex digits of `fnv1a64(slug)`.
 */
export function truncateSlug(slug: string): string {
  if (slug.length <= SLUG_LIMIT) return slug;
  const kept = slug.slice(0, SLUG_KEPT).replace(/[-_]+$/, '');
  return `${kept}-${fnv1a64(slug).slice(0, HASH_DIGITS)}`;
}

/** `generatedAt` as `YYYY-MM-DD`, from its UTC fields (§5.9), never through a locale API. */
export function utcDate(generatedAt: Date): string {
  const two = (n: number): string => String(n).padStart(2, '0');
  const year = String(generatedAt.getUTCFullYear()).padStart(4, '0');
  return `${year}-${two(generatedAt.getUTCMonth() + 1)}-${two(generatedAt.getUTCDate())}`;
}

/**
 * The file-name base (§5.9; PDD §6.2), without an extension:
 * `ground-rupture-explorer_{scenario-slug}_{population}_{data-version}_{date}`,
 * `{data-version}` the manifest's `export_version` and `{date}`
 * `generatedAt` as `YYYY-MM-DD` UTC. Chart-export names (§5.12, P2)
 * reuse it.
 */
export function fileNameBase(scenario: Scenario, manifest: Manifest, generatedAt: Date): string {
  return [
    PRODUCT,
    truncateSlug(fullSlug(scenario, manifest)),
    POPULATION_TOKEN[scenario.population],
    manifest.exportVersion,
    utcDate(generatedAt),
  ].join(SEPARATOR);
}

/** The archive's file name (§5.9): the file-name base with `.zip` appended. */
export function downloadFileName(scenario: Scenario, manifest: Manifest, generatedAt: Date): string {
  return `${fileNameBase(scenario, manifest, generatedAt)}.zip`;
}
