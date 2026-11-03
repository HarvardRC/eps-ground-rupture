// The query engine (docs/app/ddd.md §5.3; the `engine/` row of §5.1):
// `query(vintage, scenario, windows?)`, one pure, synchronous pass over
// the §3.1 arrays of a decoded vintage that returns the `Selection` —
// the trial mask over `(set, sediment_strength)` pairs and the other
// trial conditions, the window resolved to stored-integer bounds, the
// binary-searched segment `[t·N, (t+1)·N)` of each masked-in trial with
// N from the manifest's `counts.stagesPerTrial`, the one-state-per-trial
// rule, the scarp-type filter, the two-count model, and the empty-result
// diagnostic. Also `storedBounds`, the offset-mode bound conversion that
// `convert/` imports (§5.5), and the `PerDipWindows` type it returns.
//
// Pure and synchronous: no DOM, no clock, no randomness, no I/O. The
// vintage's arrays are only read. The scheduler that calls `query` is
// T-46's (§5.3, Scheduling).
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import type { Vintage } from '../decode/decode';
import { TRIAL_TABLE_COLUMNS } from '../decode/fields';
import { storedBoundsFromDecimal } from '../state/parse';
import {
  MEASUREMENT_NAMES,
  defaultScenario,
  selectsEveryScarpClass,
  type MeasurementName,
  type Scenario,
  type SedimentPair,
} from '../state/state';

// --------------------------------------------------------------------
// Types
// --------------------------------------------------------------------

/**
 * The converted offset-mode windows (§5.5): one `{ faultDip, lo, hi }`
 * per given dip, ascending by `faultDip`, `lo` and `hi` in metres
 * (float64). `convertWindows` of `convert/` returns it; the parity
 * harness builds it from a reference case's dip-keyed `windows` map.
 */
export type PerDipWindows = readonly Readonly<{ faultDip: number; lo: number; hi: number }>[];

/**
 * One measurement's two counts (§5.3, the two-count model): `valid`, the
 * matching records whose value is not the null sentinel, and
 * `excludedNull`, `matchingRecords − valid`.
 */
export type MeasurementCounts = Readonly<{ valid: number; excludedNull: number }>;

/** A key of the empty-result diagnostic (§5.3; the §3.6 `diagnosed_conditions` keys). */
export type ConditionGroup = 'fault_dip' | 'sediment' | 'depth' | 'density' | 'window' | 'scarp_class';

/** The diagnosed-condition groups in their fixed order (§5.3). */
export const CONDITION_GROUPS: readonly ConditionGroup[] = [
  'fault_dip',
  'sediment',
  'depth',
  'density',
  'window',
  'scarp_class',
];

/**
 * What `query` returns (§5.3, Selection) — the §3.6 `selection`,
 * `counts`, and `diagnosed_conditions` quantities under their DD-10
 * camelCase names.
 */
export interface Selection {
  /** The matching records' global indices, ascending: trial order, then stage. */
  readonly indices: Uint32Array;
  /** The number of matching records, `indices.length`. */
  readonly matchingRecords: number;
  /** The matching records whose class code is 255 (unclassified). */
  readonly unclassified: number;
  /** Per measurement, its `valid` and `excludedNull` counts. */
  readonly perMeasurement: { readonly [m in MeasurementName]: MeasurementCounts };
  /**
   * Null unless `matchingRecords` is 0; then the groups whose relaxation
   * alone yields matches, possibly none, in the order of CONDITION_GROUPS.
   */
  readonly diagnosedConditions: readonly ConditionGroup[] | null;
}

// --------------------------------------------------------------------
// Stored bounds
// --------------------------------------------------------------------

/** The guard of §5.3, in stored units: 1e-9 (1e-13 m). */
const STORED_BOUNDS_GUARD = 1e-9;

/** A −0 returned as 0; every other value unchanged. */
function noNegativeZero(x: number): number {
  return x === 0 ? 0 : x;
}

/**
 * The stored-integer bounds of a converted offset-mode window (§5.3,
 * Window resolution): `[⌈lo / scale − 1e-9⌉, ⌊hi / scale + 1e-9⌋]`, with
 * `scale` the manifest's `columns.slip.scale` (1e-4) and a −0 result
 * returned as 0. The twin of the reference generator's `_stored_bounds`.
 */
export function storedBounds(lo: number, hi: number, scale: number): [number, number] {
  return [
    noNegativeZero(Math.ceil(lo / scale - STORED_BOUNDS_GUARD)),
    noNegativeZero(Math.floor(hi / scale + STORED_BOUNDS_GUARD)),
  ];
}

// --------------------------------------------------------------------
// The match
// --------------------------------------------------------------------

/** The number of trial-table columns (§3.1). */
const TRIAL_TABLE_WIDTH = TRIAL_TABLE_COLUMNS.length;

/** The position of a trial-table column in a row (§3.1, TRIAL_TABLE_COLUMNS). */
function columnIndex(name: (typeof TRIAL_TABLE_COLUMNS)[number]): number {
  return TRIAL_TABLE_COLUMNS.indexOf(name);
}

const DIP_COLUMN = columnIndex('fault_dip');
const STRENGTH_COLUMN = columnIndex('sediment_strength');
const SET_COLUMN = columnIndex('set');
const DEPTH_COLUMN = columnIndex('depth');
const DENSITY_COLUMN = columnIndex('density');

/** A lookup of selected dictionary codes, one flag per code. */
function selectedCodes<T>(dictionary: readonly T[], selected: readonly T[]): boolean[] {
  return dictionary.map((value) => selected.includes(value));
}

/** The pair-code key of a `(set, sediment_strength)` code pair. */
function pairKey(setCode: number, strengthCode: number): number {
  return setCode * 256 + strengthCode;
}

/**
 * The first index in `[from, to)` whose stored slip is at least `bound`,
 * or `to` when none is (the segment ascends strictly, §3.1).
 */
function firstAtLeast(slip: Uint16Array, from: number, to: number, bound: number): number {
  let lo = from;
  let hi = to;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (slip[mid] < bound) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * The first index in `[from, to)` whose stored slip exceeds `bound`, or
 * `to` when none does.
 */
function firstAbove(slip: Uint16Array, from: number, to: number, bound: number): number {
  let lo = from;
  let hi = to;
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (slip[mid] <= bound) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * The trial mask (§5.3, Trial mask): one flag per trial-table row, set
 * exactly when the trial's dip, `(set, sediment_strength)` pair, depth,
 * and density are each selected. An empty set masks every trial out.
 */
function trialMask(vintage: Vintage, scenario: Scenario): Uint8Array {
  const { manifest, trialTable } = vintage;
  const columns = manifest.trialColumns;
  const dips = selectedCodes(columns.fault_dip, scenario.faultDip);
  const depths = selectedCodes(columns.depth, scenario.depth);
  const densities = selectedCodes(columns.density, scenario.density);
  const pairs = new Set<number>();
  for (const pair of scenario.sediment) {
    const setCode = columns.set.indexOf(pair.set);
    const strengthCode = columns.sediment_strength.indexOf(pair.sedimentStrength);
    if (setCode >= 0 && strengthCode >= 0) pairs.add(pairKey(setCode, strengthCode));
  }
  const trials = manifest.counts.trials;
  const mask = new Uint8Array(trials);
  for (let t = 0; t < trials; t++) {
    const row = t * TRIAL_TABLE_WIDTH;
    if (
      dips[trialTable[row + DIP_COLUMN]] === true &&
      pairs.has(pairKey(trialTable[row + SET_COLUMN], trialTable[row + STRENGTH_COLUMN])) &&
      depths[trialTable[row + DEPTH_COLUMN]] === true &&
      densities[trialTable[row + DENSITY_COLUMN]] === true
    ) {
      mask[t] = 1;
    }
  }
  return mask;
}

/**
 * The stored window of each fault-dip code (§5.3, Window resolution):
 * null for the inactive window; otherwise one `[lo_s, hi_s]` per code —
 * the same pair for every code in slip mode, each dip's own converted
 * window in offset mode. Throws when `windows` is given in slip mode or
 * missing in offset mode, and when a dip that `mask` keeps has no entry.
 */
function storedWindows(
  vintage: Vintage,
  scenario: Scenario,
  windows: PerDipWindows | undefined,
  mask: Uint8Array,
): (readonly [number, number] | null)[] | null {
  const { manifest, trialTable } = vintage;
  const dipValues = manifest.trialColumns.fault_dip;
  const window = scenario.window;
  if (window.mode === 'slip') {
    if (windows !== undefined) {
      throw new Error('query: a slip-mode Scenario takes no per-dip windows');
    }
    if (window.min === null || window.max === null) return null;
    const bounds = storedBoundsFromDecimal(window.min, window.max);
    return dipValues.map(() => bounds);
  }
  if (windows === undefined) {
    throw new Error('query: an offset-mode Scenario needs per-dip windows');
  }
  const scale = manifest.columns.slip.scale;
  if (scale === null) {
    throw new Error('query: the manifest gives columns.slip no scale');
  }
  const byCode: (readonly [number, number] | null)[] = dipValues.map((dip) => {
    const entry = windows.find((w) => w.faultDip === dip);
    return entry === undefined ? null : storedBounds(entry.lo, entry.hi, scale);
  });
  for (let t = 0; t < mask.length; t++) {
    if (mask[t] === 1) {
      const code = trialTable[t * TRIAL_TABLE_WIDTH + DIP_COLUMN];
      if (byCode[code] === null) {
        throw new Error(`query: no per-dip window for the masked-in fault dip ${dipValues[code]}`);
      }
    }
  }
  return byCode;
}

/**
 * The selected records' indices, ascending (§5.3, Scan; Class filter):
 * for each masked-in trial, its binary-searched window segment, the
 * population rule, then the scarp-type filter.
 */
function matchIndices(vintage: Vintage, scenario: Scenario, windows: PerDipWindows | undefined): Uint32Array {
  const { manifest, trialTable, slip, scarpClass } = vintage;
  const n = manifest.counts.stagesPerTrial;
  const trials = manifest.counts.trials;
  const mask = trialMask(vintage, scenario);
  const bounds = storedWindows(vintage, scenario, windows, mask);
  const oneState = scenario.population === 'one_state_per_trial';

  const filterActive = !selectsEveryScarpClass(scenario, manifest);
  const classKept = new Uint8Array(256);
  if (filterActive) {
    for (const name of scenario.scarpClass) {
      const code = manifest.scarpClasses.indexOf(name);
      if (code >= 0) classKept[code] = 1;
    }
  }

  const capacity = oneState ? trials : manifest.counts.records;
  const out = new Uint32Array(capacity);
  let count = 0;
  for (let t = 0; t < trials; t++) {
    if (mask[t] !== 1) continue;
    const start = t * n;
    const end = start + n;
    let a = start;
    let b = end;
    if (bounds !== null) {
      const window = bounds[trialTable[t * TRIAL_TABLE_WIDTH + DIP_COLUMN]] as readonly [number, number];
      a = firstAtLeast(slip, start, end, window[0]);
      b = firstAbove(slip, start, end, window[1]);
    }
    if (oneState) {
      if (b > a) {
        const i = b - 1;
        if (!filterActive || classKept[scarpClass[i]] === 1) out[count++] = i;
      }
    } else {
      for (let i = a; i < b; i++) {
        if (!filterActive || classKept[scarpClass[i]] === 1) out[count++] = i;
      }
    }
  }
  return out.slice(0, count);
}

// --------------------------------------------------------------------
// The empty-result diagnostic
// --------------------------------------------------------------------

/** True when two arrays hold the same members, compared with `same`. */
function sameMembers<T>(a: readonly T[], b: readonly T[], same: (x: T, y: T) => boolean): boolean {
  return (
    a.length === b.length &&
    a.every((x) => b.some((y) => same(x, y))) &&
    b.every((y) => a.some((x) => same(x, y)))
  );
}

const sameValue = <T>(x: T, y: T): boolean => x === y;

const samePair = (x: SedimentPair, y: SedimentPair): boolean =>
  x.set === y.set && x.sedimentStrength === y.sedimentStrength;

/** True when the Scenario's value of `group` differs from the default's (§5.3). */
function groupDiffers(group: ConditionGroup, scenario: Scenario, base: Scenario): boolean {
  switch (group) {
    case 'fault_dip':
      return !sameMembers(scenario.faultDip, base.faultDip, sameValue);
    case 'sediment':
      return !sameMembers(scenario.sediment, base.sediment, samePair);
    case 'depth':
      return !sameMembers(scenario.depth, base.depth, sameValue);
    case 'density':
      return !sameMembers(scenario.density, base.density, sameValue);
    case 'scarp_class':
      return !sameMembers(scenario.scarpClass, base.scarpClass, sameValue);
    case 'window': {
      const w = scenario.window;
      const d = base.window;
      if (w.mode !== d.mode) return true;
      if (w.mode === 'offset' && d.mode === 'offset') return w.offsetMax !== d.offsetMax;
      if (w.mode === 'slip' && d.mode === 'slip') return w.min !== d.min || w.max !== d.max;
      return true;
    }
  }
}

/** The Scenario with `group` alone reset to its value in `base` (§5.3). */
function relaxed(group: ConditionGroup, scenario: Scenario, base: Scenario): Scenario {
  switch (group) {
    case 'fault_dip':
      return { ...scenario, faultDip: base.faultDip };
    case 'sediment':
      return { ...scenario, sediment: base.sediment };
    case 'depth':
      return { ...scenario, depth: base.depth };
    case 'density':
      return { ...scenario, density: base.density };
    case 'window':
      return { ...scenario, window: base.window };
    case 'scarp_class':
      return { ...scenario, scarpClass: base.scarpClass };
  }
}

/**
 * The empty-result diagnostic (§5.3): each group whose Scenario value
 * differs from its `defaultScenario` value is reset alone to that value
 * and the match re-run — the window group to the inactive slip-mode
 * window, with no `windows`; the population is never relaxed. The groups
 * whose relaxation alone yields matches, in the fixed order.
 */
function diagnose(vintage: Vintage, scenario: Scenario, windows: PerDipWindows | undefined): ConditionGroup[] {
  const base = defaultScenario(vintage.manifest);
  const found: ConditionGroup[] = [];
  for (const group of CONDITION_GROUPS) {
    if (!groupDiffers(group, scenario, base)) continue;
    const next = relaxed(group, scenario, base);
    const nextWindows = group === 'window' ? undefined : windows;
    if (matchIndices(vintage, next, nextWindows).length > 0) found.push(group);
  }
  return found;
}

// --------------------------------------------------------------------
// The query
// --------------------------------------------------------------------

/** The stage array of each measurement (§3.1). */
function measurementArray(vintage: Vintage, m: MeasurementName): Uint16Array {
  switch (m) {
    case 'scarp_height':
      return vintage.scarpHeight;
    case 'dzw':
      return vintage.dzw;
    case 'scarp_dip':
      return vintage.scarpDip;
  }
}

/**
 * Selects the records of an accepted `scenario` from `vintage` (§5.3).
 * `windows` is given exactly when the Scenario's window is in offset mode
 * and holds an entry for every dip the query masks in, the diagnostic's
 * re-runs included; `query` throws otherwise.
 */
export function query(vintage: Vintage, scenario: Scenario, windows?: PerDipWindows): Selection {
  const { manifest, scarpClass } = vintage;
  const indices = matchIndices(vintage, scenario, windows);
  const matchingRecords = indices.length;

  const unclassifiedCode = manifest.columns.scarp_class.nullSentinel;
  let unclassified = 0;
  for (let k = 0; k < matchingRecords; k++) {
    if (scarpClass[indices[k]] === unclassifiedCode) unclassified++;
  }

  const perMeasurement = {} as { [m in MeasurementName]: MeasurementCounts };
  for (const m of MEASUREMENT_NAMES) {
    const values = measurementArray(vintage, m);
    const sentinel = manifest.columns[m].nullSentinel;
    let valid = 0;
    for (let k = 0; k < matchingRecords; k++) {
      if (values[indices[k]] !== sentinel) valid++;
    }
    perMeasurement[m] = { valid, excludedNull: matchingRecords - valid };
  }

  return {
    indices,
    matchingRecords,
    unclassified,
    perMeasurement,
    diagnosedConditions: matchingRecords === 0 ? diagnose(vintage, scenario, windows) : null,
  };
}
