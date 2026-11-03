// Canonical scenario serialization (docs/app/ddd.md §5.6, Canonical
// serialization; §1 DD-11 — Canonical scenario serialization).
// `serializeScenario` writes the canonical scenario object with
// `canonicalJson`, the one canonical JSON writer of the TypeScript side;
// `parseScenario` builds a `Scenario` from a parsed object, mapping its
// keys through SCENARIO_INPUT_FIELDS and throwing `ScenarioInputError`,
// the typed invalid-input failure of §5.10, on every violation §5.6
// lists. The Python twin is `canonical_scenario()` in
// `product_export.py`.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import { SCENARIO_INPUT_FIELDS, SchemaError, mapRecord, type Manifest } from '../decode/fields';
import { isCanonicalDecimal } from './parse';
import {
  POPULATIONS,
  compareCodePoints,
  compareSedimentPairs,
  windowProblem,
  type Population,
  type Scenario,
  type ScenarioWindow,
  type SedimentPair,
} from './state';

// --------------------------------------------------------------------
// canonicalJson
// --------------------------------------------------------------------

/**
 * The canonical JSON text of `v` (§5.6): every object's keys sorted by
 * code point at every depth, no whitespace — the bytes of Python's
 * `json.dumps(v, sort_keys=True, separators=(",", ":"),
 * ensure_ascii=False)` for the integers, strings, booleans, nulls,
 * arrays, and objects the scenario and recovery objects hold. Throws
 * `TypeError` on a value JSON cannot represent (`undefined`, a function,
 * a symbol, a bigint, a non-finite number) instead of dropping it.
 */
export function canonicalJson(v: unknown): string {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new TypeError(`canonicalJson: non-finite number ${v}`);
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  if (typeof v === 'object') {
    const o = v as { readonly [key: string]: unknown };
    const keys = Object.keys(o).sort(compareCodePoints);
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(',')}}`;
  }
  throw new TypeError(`canonicalJson: a ${typeof v} has no JSON form`);
}

// --------------------------------------------------------------------
// serializeScenario
// --------------------------------------------------------------------

/** The canonical scenario object (§5.6): DD-10 snake_case keys, no float, no display state. */
export interface ScenarioObject {
  readonly fault_dip: readonly number[];
  readonly sediment: readonly { readonly set: string; readonly sediment_strength: string }[];
  readonly depth: readonly number[];
  readonly density: readonly string[];
  readonly entry_mode: 'slip' | 'offset';
  readonly slip_window: { readonly min: string; readonly max: string } | null;
  readonly offset_max: string | null;
  readonly population: Population;
  readonly scarp_class: readonly string[];
}

/** `values` in the order of `dictionary`; throws `RangeError` on a value outside it. */
function inDictionaryOrder(
  values: readonly string[],
  dictionary: readonly string[],
  key: string,
): string[] {
  const indices = values.map((v) => {
    const i = dictionary.indexOf(v);
    if (i < 0) throw new RangeError(`${key}: ${JSON.stringify(v)} is not in the manifest's dictionary`);
    return i;
  });
  return indices.sort((a, b) => a - b).map((i) => dictionary[i]);
}

/**
 * The canonical scenario object of `s` (§5.6), its vocabularies and
 * orders fixed by `manifest`'s dictionaries: `fault_dip` and `depth`
 * ascending; `sediment` sorted by `set`, then `sediment_strength`, in
 * code-point order; `density` in `trial_columns.density` order;
 * `scarp_class` in `scarp_classes` order; `slip_window` null while the
 * window is inactive and in offset mode; `offset_max` non-null exactly in
 * offset mode.
 */
function scenarioObject(s: Scenario, manifest: Manifest): ScenarioObject {
  const w = s.window;
  return {
    fault_dip: [...s.faultDip].sort((a, b) => a - b),
    sediment: [...s.sediment]
      .sort(compareSedimentPairs)
      .map((p) => ({ set: p.set, sediment_strength: p.sedimentStrength })),
    depth: [...s.depth].sort((a, b) => a - b),
    density: inDictionaryOrder(s.density, manifest.trialColumns.density, 'density'),
    entry_mode: w.mode,
    slip_window: w.mode === 'slip' && w.min !== null ? { min: w.min, max: w.max } : null,
    offset_max: w.mode === 'offset' ? w.offsetMax : null,
    population: s.population,
    scarp_class: inDictionaryOrder(s.scarpClass, manifest.scarpClasses, 'scarp_class'),
  };
}

/**
 * The canonical JSON text of the scenario object of `s` (§5.6, DD-11),
 * written with `canonicalJson`. GS-1 serializes to the golden bytes of
 * §5.6.
 */
export function serializeScenario(s: Scenario, manifest: Manifest): string {
  return canonicalJson(scenarioObject(s, manifest));
}

// --------------------------------------------------------------------
// parseScenario
// --------------------------------------------------------------------

/**
 * The typed invalid-input failure (§5.10): a scenario object that
 * `parseScenario` cannot accept. `path` names the offending key or
 * element — `offset_max`, `fault_dip[2]`, `sediment[0].set`,
 * `slip_window.max`; the empty string names the object itself.
 */
export class ScenarioInputError extends Error {
  readonly path: string;

  constructor(path: string, detail = 'invalid scenario input') {
    super(`${path === '' ? 'scenario object' : path}: ${detail}`);
    this.name = 'ScenarioInputError';
    this.path = path;
  }
}

type JsonObject = { readonly [key: string]: unknown };

const isObject = (v: unknown): v is JsonObject =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** The key path of the member `key` of the object at `path`. */
const memberPath = (path: string, key: string): string => (path === '' ? key : `${path}.${key}`);

/**
 * The key path of `key` in the container at `path`, as `mapRecord`
 * reports it: an array index for a digit string (no record of
 * SCENARIO_INPUT_FIELDS has a digit-string key), otherwise a member.
 */
function childPath(path: string, key: string): string {
  return /^\d+$/.test(key) ? `${path}[${key}]` : memberPath(path, key);
}

/** The ScenarioInputError for the same key as a `SchemaError` of `mapRecord`. */
function fromSchemaError(e: SchemaError): ScenarioInputError {
  // mapRecord was given the root path '', so its member paths start with '.'.
  const path = (e.key === null ? e.path : childPath(e.path, e.key)).replace(/^\./, '');
  return new ScenarioInputError(path, e.message);
}

/** Rejects every key of `o` outside `allowed`, naming the first. */
function rejectUnknownKeys(o: JsonObject, allowed: readonly string[], path: string): void {
  for (const k of Object.keys(o)) {
    if (!allowed.includes(k)) throw new ScenarioInputError(memberPath(path, k), 'unknown key');
  }
}

/**
 * Checks that every element of the array `key` is in vocabulary and that
 * the elements stand in strictly increasing `compare` order — so none
 * repeats — naming the first offending element.
 */
function checkCanonicalArray<T>(
  values: readonly T[],
  key: string,
  inVocabulary: (v: T) => boolean,
  compare: (a: T, b: T) => number,
): void {
  values.forEach((v, i) => {
    const path = `${key}[${i}]`;
    if (!inVocabulary(v)) throw new ScenarioInputError(path, `${JSON.stringify(v)} is out of vocabulary`);
    if (i > 0 && compare(values[i - 1], v) >= 0) {
      throw new ScenarioInputError(path, 'out of canonical order or repeated');
    }
  });
}

/** The scenario object's members after `mapRecord` (§5.2, SCENARIO_INPUT_FIELDS). */
interface MappedScenario {
  readonly faultDip: readonly number[];
  readonly sediment: readonly SedimentPair[];
  readonly depth: readonly number[];
  readonly density: readonly string[];
  readonly entryMode: string;
  readonly slipWindow: { readonly min: string; readonly max: string } | null;
  readonly offsetMax: string | null;
  readonly population: string;
  readonly scarpClass: readonly string[];
}

/**
 * Builds a `Scenario` from the parsed scenario object `o` (§5.6), mapping
 * its keys through SCENARIO_INPUT_FIELDS against `manifest`'s
 * vocabularies and orders. Throws `ScenarioInputError(path)` on a missing
 * or unknown key, a wrong JSON type (a `SchemaError` of `mapRecord`
 * becoming a `ScenarioInputError` for the same key), an
 * out-of-vocabulary value, array elements out of canonical order or
 * repeated, a non-canonical decimal or one grammar G rejects, and an
 * inconsistent combination — `slip_window` or `offset_max` disagreeing
 * with `entry_mode`, or a slip window or offset that breaks the §5.7
 * rules. Nothing is sorted, widened, or clipped.
 */
export function parseScenario(o: unknown, manifest: Manifest): Scenario {
  if (!isObject(o)) throw new ScenarioInputError('', 'expected a JSON object');
  const keys = SCENARIO_INPUT_FIELDS.map((f) => f.key);
  rejectUnknownKeys(o, keys, '');

  let m: MappedScenario;
  try {
    m = mapRecord(o, SCENARIO_INPUT_FIELDS, '') as unknown as MappedScenario;
  } catch (e) {
    if (e instanceof SchemaError) throw fromSchemaError(e);
    throw e;
  }
  // mapRecord drops unknown keys; the nested records are closed too.
  (o.sediment as readonly JsonObject[]).forEach((p, i) =>
    rejectUnknownKeys(p, ['set', 'sediment_strength'], `sediment[${i}]`),
  );
  if (isObject(o.slip_window)) rejectUnknownKeys(o.slip_window, ['min', 'max'], 'slip_window');

  const columns = manifest.trialColumns;
  checkCanonicalArray(m.faultDip, 'fault_dip', (d) => columns.fault_dip.includes(d), (a, b) => a - b);
  checkCanonicalArray(
    m.sediment,
    'sediment',
    (p) =>
      manifest.armStrengthStates.some(
        (s) => s.set === p.set && s.sedimentStrength === p.sedimentStrength,
      ),
    compareSedimentPairs,
  );
  checkCanonicalArray(m.depth, 'depth', (d) => columns.depth.includes(d), (a, b) => a - b);
  checkCanonicalArray(
    m.density,
    'density',
    (d) => columns.density.includes(d),
    (a, b) => columns.density.indexOf(a) - columns.density.indexOf(b),
  );
  checkCanonicalArray(
    m.scarpClass,
    'scarp_class',
    (c) => manifest.scarpClasses.includes(c),
    (a, b) => manifest.scarpClasses.indexOf(a) - manifest.scarpClasses.indexOf(b),
  );
  if (!(POPULATIONS as readonly string[]).includes(m.population)) {
    throw new ScenarioInputError('population', `${JSON.stringify(m.population)} is out of vocabulary`);
  }

  let window: ScenarioWindow;
  if (m.entryMode === 'slip') {
    if (m.offsetMax !== null) throw new ScenarioInputError('offset_max', 'must be null in slip mode');
    window =
      m.slipWindow === null
        ? { mode: 'slip', min: null, max: null }
        : { mode: 'slip', min: m.slipWindow.min, max: m.slipWindow.max };
  } else if (m.entryMode === 'offset') {
    if (m.slipWindow !== null) throw new ScenarioInputError('slip_window', 'must be null in offset mode');
    if (m.offsetMax === null) throw new ScenarioInputError('offset_max', 'must not be null in offset mode');
    window = { mode: 'offset', offsetMax: m.offsetMax };
  } else {
    throw new ScenarioInputError('entry_mode', `${JSON.stringify(m.entryMode)} is out of vocabulary`);
  }
  switch (windowProblem(window, manifest)) {
    case null:
      break;
    case 'min':
      throw new ScenarioInputError('slip_window.min', 'not a canonical decimal');
    case 'max':
      throw new ScenarioInputError(
        'slip_window.max',
        isCanonicalDecimal(String(m.slipWindow?.max))
          ? 'above slip_window_bounds.max'
          : 'not a canonical decimal',
      );
    case 'order':
      throw new ScenarioInputError('slip_window', 'minimum above the maximum');
    case 'offsetMax':
      throw new ScenarioInputError(
        'offset_max',
        isCanonicalDecimal(String(m.offsetMax)) ? 'above 1000' : 'not a canonical decimal',
      );
  }

  return {
    faultDip: [...m.faultDip],
    sediment: m.sediment.map((p) => ({ set: p.set, sedimentStrength: p.sedimentStrength })),
    depth: [...m.depth],
    density: [...m.density],
    window,
    population: m.population as Population,
    scarpClass: [...m.scarpClass],
  };
}
