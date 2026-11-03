// Scenario state (docs/app/ddd.md §5.6, Scenario: accepted values only;
// Display state): the `Scenario`, which selects records, and the
// `DisplayState`, which changes only how a computed result is presented;
// `defaultScenario(manifest)` and `defaultDisplayState()`; and the pure
// reducers through which every control change of the §5.7 event map
// reaches them — a state and an action in, a new state out, nothing
// mutated. Reset replaces the Scenario with the default and sets
// `familyView` off in one update.
//
// `state/` imports `decode/`, never the reverse (§5.6).
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import type { Manifest } from '../decode/fields';
import { OFFSET_MAX_BOUND, compareDecimals, isCanonicalDecimal, recordedSlipMax } from './parse';

// --------------------------------------------------------------------
// Types
// --------------------------------------------------------------------

/** The three measurements, in the order of the result panels (§5.6, §3.6). */
export const MEASUREMENT_NAMES = ['scarp_height', 'dzw', 'scarp_dip'] as const;

/** A measurement name, the key of every per-panel display member. */
export type MeasurementName = (typeof MEASUREMENT_NAMES)[number];

/** The two overlay panels, the keys of `showAll` (§5.6). */
export const OVERLAY_MEASUREMENT_NAMES = ['scarp_height', 'dzw'] as const;

/** An overlay panel's measurement name. */
export type OverlayMeasurementName = (typeof OVERLAY_MEASUREMENT_NAMES)[number];

/** One `(set, sediment_strength)` pair of `arm_strength_states` (§3.2, §5.6). */
export interface SedimentPair {
  readonly set: string;
  readonly sedimentStrength: string;
}

/**
 * The slip-mode window: both endpoints null while the window is inactive
 * (the D-22 default), otherwise both the effective inclusive endpoints as
 * canonical decimals, 0 ≤ `min` ≤ `max` ≤ `slip_window_bounds.max`
 * exactly (§5.6).
 */
export type SlipWindow =
  | { readonly mode: 'slip'; readonly min: null; readonly max: null }
  | { readonly mode: 'slip'; readonly min: string; readonly max: string };

/** The offset-mode window: the canonical decimal of the offset entry, 0 to 1000 (§5.6). */
export interface OffsetWindow {
  readonly mode: 'offset';
  readonly offsetMax: string;
}

/** The Scenario's window, the tagged union of the two entry modes (§5.6). */
export type ScenarioWindow = SlipWindow | OffsetWindow;

/** The two populations (§5.6; FR-S6). */
export const POPULATIONS = ['all_stages', 'one_state_per_trial'] as const;

/** A population. */
export type Population = (typeof POPULATIONS)[number];

/**
 * The last accepted value of every scenario control (§5.6) — no float
 * anywhere. Each set is an array without repeats, held in the canonical
 * order of the §5.6 serialization: `faultDip` and `depth` ascending;
 * `sediment` by `set`, then `sedimentStrength`, in code-point order;
 * `density` in `trial_columns.density` dictionary order; `scarpClass` in
 * `scarp_classes` order. Every set may be empty.
 */
export interface Scenario {
  readonly faultDip: readonly number[];
  readonly sediment: readonly SedimentPair[];
  readonly depth: readonly number[];
  readonly density: readonly string[];
  readonly window: ScenarioWindow;
  readonly population: Population;
  readonly scarpClass: readonly string[];
}

/** A panel's view (§5.8). */
export type PanelView = 'histogram' | 'cumulative';

/**
 * How a computed result is presented (§5.6, Display state); the same
 * members as the reload-recovery display record. `readoff` is the
 * committed percentile, an integer from 0 to 100, or null.
 */
export interface DisplayState {
  readonly measurement: MeasurementName;
  readonly view: { readonly [m in MeasurementName]: PanelView };
  readonly readoff: { readonly [m in MeasurementName]: number | null };
  readonly chartDataOpen: { readonly [m in MeasurementName]: boolean };
  readonly showAll: { readonly [m in OverlayMeasurementName]: boolean };
  readonly logScale: boolean;
  readonly overlay: boolean;
  readonly familyView: boolean;
}

/** The accepted `{ scenario, display }` pair the scheduler holds (§5.3, Scheduling). */
export interface AppState {
  readonly scenario: Scenario;
  readonly display: DisplayState;
}

// --------------------------------------------------------------------
// Orders
// --------------------------------------------------------------------

/** Compares two strings by Unicode code point, as Python's `sorted()` does. */
export function compareCodePoints(a: string, b: string): number {
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const ca = a.codePointAt(i) as number;
    const cb = b.codePointAt(j) as number;
    if (ca !== cb) return ca < cb ? -1 : 1;
    i += ca > 0xffff ? 2 : 1;
    j += cb > 0xffff ? 2 : 1;
  }
  const restA = i < a.length;
  const restB = j < b.length;
  return restA === restB ? 0 : restA ? 1 : -1;
}

/** The canonical order of sediment pairs: by `set`, then `sedimentStrength` (§5.6). */
export function compareSedimentPairs(a: SedimentPair, b: SedimentPair): number {
  return compareCodePoints(a.set, b.set) || compareCodePoints(a.sedimentStrength, b.sedimentStrength);
}

const ascending = (a: number, b: number): number => a - b;

const byDictionary =
  (dictionary: readonly string[]) =>
  (a: string, b: string): number =>
    dictionary.indexOf(a) - dictionary.indexOf(b);

// --------------------------------------------------------------------
// Defaults
// --------------------------------------------------------------------

/**
 * The default Scenario (§5.6), built from the decoded manifest's
 * dictionaries, never from literals: every modeled dip, every
 * `arm_strength_states` pair, every depth and density, every scarp class;
 * the inactive slip-mode window (D-22); the population `'all_stages'`.
 */
export function defaultScenario(manifest: Manifest): Scenario {
  const columns = manifest.trialColumns;
  return {
    faultDip: [...columns.fault_dip].sort(ascending),
    sediment: manifest.armStrengthStates
      .map((p) => ({ set: p.set, sedimentStrength: p.sedimentStrength }))
      .sort(compareSedimentPairs),
    depth: [...columns.depth].sort(ascending),
    density: [...columns.density],
    window: { mode: 'slip', min: null, max: null },
    population: 'all_stages',
    scarpClass: [...manifest.scarpClasses],
  };
}

const perMeasurement = <T>(value: T): { readonly [m in MeasurementName]: T } => ({
  scarp_height: value,
  dzw: value,
  scarp_dip: value,
});

/**
 * The default display state (§5.6): measurement `scarp_height`; every
 * panel's view `'histogram'`, read-off null, chart data closed; show-all
 * off on both overlay panels; log scale, overlay, and family view off.
 */
export function defaultDisplayState(): DisplayState {
  return {
    measurement: 'scarp_height',
    view: perMeasurement<PanelView>('histogram'),
    readoff: perMeasurement<number | null>(null),
    chartDataOpen: perMeasurement(false),
    showAll: { scarp_height: false, dzw: false },
    logScale: false,
    overlay: false,
    familyView: false,
  };
}

// --------------------------------------------------------------------
// Validation shared with scenario-json.ts
// --------------------------------------------------------------------

/**
 * Why a window breaks the §5.7 rules, or null when it is valid against
 * `manifest`: `'min'` or `'max'` names a slip endpoint that is not a
 * canonical decimal or lies outside 0 to `slip_window_bounds.max`, `'order'`
 * a minimum above the maximum, `'offsetMax'` an offset maximum that is not
 * a canonical decimal or lies above 1000.
 */
export function windowProblem(
  window: ScenarioWindow,
  manifest: Manifest,
): 'min' | 'max' | 'order' | 'offsetMax' | null {
  if (window.mode === 'offset') {
    if (typeof window.offsetMax !== 'string' || !isCanonicalDecimal(window.offsetMax)) return 'offsetMax';
    return compareDecimals(window.offsetMax, OFFSET_MAX_BOUND) > 0 ? 'offsetMax' : null;
  }
  if (window.min === null && window.max === null) return null;
  if (typeof window.min !== 'string' || !isCanonicalDecimal(window.min)) return 'min';
  if (typeof window.max !== 'string' || !isCanonicalDecimal(window.max)) return 'max';
  if (compareDecimals(window.max, recordedSlipMax(manifest.slipWindowBounds)) > 0) return 'max';
  return compareDecimals(window.min, window.max) > 0 ? 'order' : null;
}

/** True when `scenario` selects every scarp class of `manifest` — no filter. */
export function selectsEveryScarpClass(scenario: Scenario, manifest: Manifest): boolean {
  return manifest.scarpClasses.every((c) => scenario.scarpClass.includes(c));
}

// --------------------------------------------------------------------
// Reducers
// --------------------------------------------------------------------

/**
 * A change of the Scenario, one per control change of the §5.7 event
 * map: a checkbox change of a dip, a sediment pair, a depth, a density,
 * or a scarp class; a population radio change; an accepted slip or
 * offset commit, or an accepted entry-mode switch, setting the entry mode
 * and the window together; Apply of the dip-range assist, replacing the
 * dip set; and Reset.
 */
export type ScenarioAction =
  | { readonly type: 'setFaultDip'; readonly dip: number; readonly selected: boolean }
  | { readonly type: 'applyFaultDips'; readonly dips: readonly number[] }
  | { readonly type: 'setSediment'; readonly pair: SedimentPair; readonly selected: boolean }
  | { readonly type: 'setDepth'; readonly depth: number; readonly selected: boolean }
  | { readonly type: 'setDensity'; readonly density: string; readonly selected: boolean }
  | { readonly type: 'setScarpClass'; readonly scarpClass: string; readonly selected: boolean }
  | { readonly type: 'setPopulation'; readonly population: Population }
  | { readonly type: 'setWindow'; readonly window: ScenarioWindow }
  | { readonly type: 'reset' };

/** A display-only change (§5.6, Display state). */
export type DisplayAction =
  | { readonly type: 'setMeasurement'; readonly measurement: MeasurementName }
  | { readonly type: 'setView'; readonly measurement: MeasurementName; readonly view: PanelView }
  | {
      readonly type: 'setReadoff';
      readonly measurement: MeasurementName;
      readonly readoff: number | null;
    }
  | {
      readonly type: 'setChartDataOpen';
      readonly measurement: MeasurementName;
      readonly open: boolean;
    }
  | {
      readonly type: 'setShowAll';
      readonly measurement: OverlayMeasurementName;
      readonly showAll: boolean;
    }
  | { readonly type: 'setLogScale'; readonly logScale: boolean }
  | { readonly type: 'setOverlay'; readonly overlay: boolean }
  | { readonly type: 'setFamilyView'; readonly familyView: boolean };

/** Every reducer action. */
export type Action = ScenarioAction | DisplayAction;

function reject(what: string, value: unknown): never {
  throw new RangeError(`${what}: ${JSON.stringify(value)} is outside the permitted vocabulary`);
}

/**
 * `list` with `value` included (`selected`) or excluded, kept in the
 * order of `compare`; `list` itself when that changes nothing.
 */
function toggled<T>(
  list: readonly T[],
  value: T,
  selected: boolean,
  same: (a: T, b: T) => boolean,
  compare: (a: T, b: T) => number,
): readonly T[] {
  const present = list.some((e) => same(e, value));
  if (present === selected) return list;
  return selected ? [...list, value].sort(compare) : list.filter((e) => !same(e, value));
}

const sameValue = <T>(a: T, b: T): boolean => a === b;
const samePair = (a: SedimentPair, b: SedimentPair): boolean =>
  a.set === b.set && a.sedimentStrength === b.sedimentStrength;

function sameWindow(a: ScenarioWindow, b: ScenarioWindow): boolean {
  if (a.mode === 'offset' || b.mode === 'offset') {
    return a.mode === b.mode && (a as OffsetWindow).offsetMax === (b as OffsetWindow).offsetMax;
  }
  return a.min === b.min && a.max === b.max;
}

function isMeasurement(m: unknown): m is MeasurementName {
  return (MEASUREMENT_NAMES as readonly unknown[]).includes(m);
}

function isOverlayMeasurement(m: unknown): m is OverlayMeasurementName {
  return (OVERLAY_MEASUREMENT_NAMES as readonly unknown[]).includes(m);
}

/** The Scenario after `action`, or `scenario` itself when nothing changes. */
function reduceScenario(scenario: Scenario, action: ScenarioAction, manifest: Manifest): Scenario {
  const columns = manifest.trialColumns;
  switch (action.type) {
    case 'setFaultDip': {
      if (!columns.fault_dip.includes(action.dip)) reject('fault_dip', action.dip);
      const faultDip = toggled(scenario.faultDip, action.dip, action.selected, sameValue, ascending);
      return faultDip === scenario.faultDip ? scenario : { ...scenario, faultDip };
    }
    case 'applyFaultDips': {
      const dips = [...action.dips].sort(ascending);
      dips.forEach((d, i) => {
        if (!columns.fault_dip.includes(d) || (i > 0 && dips[i - 1] === d)) reject('fault_dip', d);
      });
      const same =
        dips.length === scenario.faultDip.length && dips.every((d, i) => d === scenario.faultDip[i]);
      return same ? scenario : { ...scenario, faultDip: dips };
    }
    case 'setSediment': {
      const pair = { set: action.pair.set, sedimentStrength: action.pair.sedimentStrength };
      if (!manifest.armStrengthStates.some((p) => samePair(p, pair))) reject('sediment', pair);
      const sediment = toggled(scenario.sediment, pair, action.selected, samePair, compareSedimentPairs);
      return sediment === scenario.sediment ? scenario : { ...scenario, sediment };
    }
    case 'setDepth': {
      if (!columns.depth.includes(action.depth)) reject('depth', action.depth);
      const depth = toggled(scenario.depth, action.depth, action.selected, sameValue, ascending);
      return depth === scenario.depth ? scenario : { ...scenario, depth };
    }
    case 'setDensity': {
      if (!columns.density.includes(action.density)) reject('density', action.density);
      const order = byDictionary(columns.density);
      const density = toggled(scenario.density, action.density, action.selected, sameValue, order);
      return density === scenario.density ? scenario : { ...scenario, density };
    }
    case 'setScarpClass': {
      if (!manifest.scarpClasses.includes(action.scarpClass)) reject('scarp_class', action.scarpClass);
      const order = byDictionary(manifest.scarpClasses);
      const scarpClass = toggled(scenario.scarpClass, action.scarpClass, action.selected, sameValue, order);
      return scarpClass === scenario.scarpClass ? scenario : { ...scenario, scarpClass };
    }
    case 'setPopulation':
      if (!POPULATIONS.includes(action.population)) reject('population', action.population);
      return action.population === scenario.population
        ? scenario
        : { ...scenario, population: action.population };
    case 'setWindow': {
      const w = action.window;
      if ((w.mode !== 'slip' && w.mode !== 'offset') || windowProblem(w, manifest) !== null) {
        reject('window', w);
      }
      const window: ScenarioWindow =
        w.mode === 'offset'
          ? { mode: 'offset', offsetMax: w.offsetMax }
          : w.min === null
            ? { mode: 'slip', min: null, max: null }
            : { mode: 'slip', min: w.min, max: w.max };
      return sameWindow(window, scenario.window) ? scenario : { ...scenario, window };
    }
    case 'reset':
      return defaultScenario(manifest);
  }
}

/** The display state after `action`, or `display` itself when nothing changes. */
function reduceDisplay(display: DisplayState, action: DisplayAction): DisplayState {
  switch (action.type) {
    case 'setMeasurement':
      if (!isMeasurement(action.measurement)) reject('measurement', action.measurement);
      return display.measurement === action.measurement
        ? display
        : { ...display, measurement: action.measurement };
    case 'setView': {
      const { measurement: m, view } = action;
      if (!isMeasurement(m)) reject('measurement', m);
      if (view !== 'histogram' && view !== 'cumulative') reject('view', view);
      return display.view[m] === view ? display : { ...display, view: { ...display.view, [m]: view } };
    }
    case 'setReadoff': {
      const { measurement: m, readoff } = action;
      if (!isMeasurement(m)) reject('measurement', m);
      if (readoff !== null && !(Number.isInteger(readoff) && readoff >= 0 && readoff <= 100)) {
        reject('readoff', readoff);
      }
      const q = readoff === null ? null : readoff + 0;
      return display.readoff[m] === q ? display : { ...display, readoff: { ...display.readoff, [m]: q } };
    }
    case 'setChartDataOpen': {
      const { measurement: m, open } = action;
      if (!isMeasurement(m)) reject('measurement', m);
      return display.chartDataOpen[m] === open
        ? display
        : { ...display, chartDataOpen: { ...display.chartDataOpen, [m]: open } };
    }
    case 'setShowAll': {
      const { measurement: m, showAll } = action;
      if (!isOverlayMeasurement(m)) reject('showAll measurement', m);
      return display.showAll[m] === showAll
        ? display
        : { ...display, showAll: { ...display.showAll, [m]: showAll } };
    }
    case 'setLogScale':
      return display.logScale === action.logScale ? display : { ...display, logScale: action.logScale };
    case 'setOverlay':
      return display.overlay === action.overlay ? display : { ...display, overlay: action.overlay };
    case 'setFamilyView':
      return display.familyView === action.familyView
        ? display
        : { ...display, familyView: action.familyView };
  }
}

const SCENARIO_ACTIONS: ReadonlySet<string> = new Set([
  'setFaultDip',
  'applyFaultDips',
  'setSediment',
  'setDepth',
  'setDensity',
  'setScarpClass',
  'setPopulation',
  'setWindow',
  'reset',
]);

/**
 * The one reducer (§5.6): `state` and `action` in, the next state out,
 * nothing mutated. A display-only action keeps `state.scenario` itself,
 * so the scheduler's `next.scenario !== current().scenario` test sees no
 * Scenario change (§5.3, Scheduling); an action that changes nothing
 * returns `state` itself. Reset replaces the Scenario with
 * `defaultScenario(manifest)` and sets `familyView` off in the same
 * update, the rest of the display state unchanged; a scarp-filter change
 * that leaves fewer than all the manifest's classes sets `familyView` to
 * false in the same update; `familyView` turns on only while every class
 * is selected. Throws `RangeError` on a value outside the vocabulary the
 * manifest and §5.6 permit, and on an invalid window.
 */
export function reduce(state: AppState, action: Action, manifest: Manifest): AppState {
  if (!SCENARIO_ACTIONS.has(action.type)) {
    const display = action as DisplayAction;
    if (
      display.type === 'setFamilyView' &&
      display.familyView &&
      !selectsEveryScarpClass(state.scenario, manifest)
    ) {
      reject('familyView with a scarp-type filter', display.familyView);
    }
    const next = reduceDisplay(state.display, display);
    return next === state.display ? state : { scenario: state.scenario, display: next };
  }
  const scenarioAction = action as ScenarioAction;
  const scenario = reduceScenario(state.scenario, scenarioAction, manifest);
  let display = state.display;
  if (scenarioAction.type === 'reset') {
    display = reduceDisplay(display, { type: 'setFamilyView', familyView: false });
  } else if (scenarioAction.type === 'setScarpClass' && !selectsEveryScarpClass(scenario, manifest)) {
    display = reduceDisplay(display, { type: 'setFamilyView', familyView: false });
  }
  return scenario === state.scenario && display === state.display ? state : { scenario, display };
}
