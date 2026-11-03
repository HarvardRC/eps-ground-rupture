// Reload recovery, the pure part (docs/app/ddd.md §5.6, Reload recovery
// (MVP); §5.10). `serializeRecovery` writes the five-key envelope with
// `canonicalJson`; `readRecovery` validates a saved text's envelope and
// display record; `restoreRecovery` validates the saved scenario object
// unchanged with `parseScenario` against the newly loaded manifest —
// never widening an old selection, clipping an endpoint, sorting an
// array, or applying only a compatible portion. This module touches no
// storage or browser API: `src/recovery.ts` (T-46) supplies those effects
// and the caller supplies `settingsText`.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import type { Manifest } from '../decode/fields';
import { ScenarioInputError, canonicalJson, parseScenario, serializeScenario } from './scenario-json';
import {
  MEASUREMENT_NAMES,
  OVERLAY_MEASUREMENT_NAMES,
  selectsEveryScarpClass,
  type DisplayState,
  type MeasurementName,
  type PanelView,
  type Scenario,
} from './state';

/** The one envelope version (§5.6). */
export const RECOVERY_VERSION = 1;

/** A saved record that `readRecovery` accepted (§5.6). */
export interface RecoveryRecord {
  readonly recoveryVersion: 1;
  readonly sourceExportVersion: string;
  /** The saved canonical scenario object, still unvalidated against any manifest. */
  readonly scenario: { readonly [key: string]: unknown };
  readonly display: DisplayState;
  readonly summary: string;
}

/** `readRecovery`'s result: the record, or `invalid-record`. */
export type RecoveryReading =
  | { readonly kind: 'record'; readonly record: RecoveryRecord }
  | { readonly kind: 'invalid-record' };

/** `restoreRecovery`'s result: `ready`, or `incompatible` with the offending path. */
export type RecoveryRestoration =
  | {
      readonly kind: 'ready';
      readonly scenario: Scenario;
      readonly display: DisplayState;
      readonly sourceExportVersion: string;
      readonly summary: string;
    }
  | { readonly kind: 'incompatible'; readonly path: string; readonly summary: string };

const ENVELOPE_KEYS = ['recoveryVersion', 'sourceExportVersion', 'scenario', 'display', 'summary'];
const DISPLAY_KEYS = [
  'measurement',
  'view',
  'readoff',
  'chartDataOpen',
  'showAll',
  'overlay',
  'familyView',
  'logScale',
];

/** The display record of §5.6: exactly its eight keys, from the accepted DisplayState. */
function displayRecord(d: DisplayState): DisplayState {
  const perMeasurement = <T>(m: { readonly [k in MeasurementName]: T }) => ({
    scarp_height: m.scarp_height,
    dzw: m.dzw,
    scarp_dip: m.scarp_dip,
  });
  return {
    measurement: d.measurement,
    view: perMeasurement(d.view),
    readoff: perMeasurement(d.readoff),
    chartDataOpen: perMeasurement(d.chartDataOpen),
    showAll: { scarp_height: d.showAll.scarp_height, dzw: d.showAll.dzw },
    overlay: d.overlay,
    familyView: d.familyView,
    logScale: d.logScale,
  };
}

/**
 * The saved text of a preserving reload (§5.6): `canonicalJson` of
 * exactly `recoveryVersion` 1, `sourceExportVersion` (the loaded old
 * manifest's `exportVersion`), `scenario`
 * (`JSON.parse(serializeScenario(scenario, manifest))`), `display` (the
 * eight-key display record), and `summary` (`settingsText(scenario)`
 * from the caller, explanatory text only). No result, manifest,
 * coefficient, field row, editing state, or URL parameter is stored.
 */
export function serializeRecovery(
  scenario: Scenario,
  display: DisplayState,
  manifest: Manifest,
  summary: string,
): string {
  return canonicalJson({
    recoveryVersion: RECOVERY_VERSION,
    sourceExportVersion: manifest.exportVersion,
    scenario: JSON.parse(serializeScenario(scenario, manifest)) as unknown,
    display: displayRecord(display),
    summary,
  });
}

type JsonObject = { readonly [key: string]: unknown };

const isObject = (v: unknown): v is JsonObject =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** True when `o` has exactly the own keys `keys`. */
function hasExactKeys(o: JsonObject, keys: readonly string[]): boolean {
  const own = Object.keys(o);
  return own.length === keys.length && keys.every((k) => own.includes(k));
}

/** A map with exactly the keys `keys`, each value satisfying `valid`, or null. */
function readMap<K extends string, T>(
  v: unknown,
  keys: readonly K[],
  valid: (x: unknown) => x is T,
): { readonly [k in K]: T } | null {
  if (!isObject(v) || !hasExactKeys(v, keys)) return null;
  const out = {} as { [k in K]: T };
  for (const k of keys) {
    const x = v[k];
    if (!valid(x)) return null;
    out[k] = x;
  }
  return out;
}

const isBoolean = (x: unknown): x is boolean => typeof x === 'boolean';
const isView = (x: unknown): x is PanelView => x === 'histogram' || x === 'cumulative';
const isReadoff = (x: unknown): x is number | null =>
  x === null || (typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= 100);
const isNonEmptyString = (x: unknown): x is string => typeof x === 'string' && x !== '';

/** The display record as a DisplayState, or null when any key or value is wrong. */
function readDisplay(v: unknown): DisplayState | null {
  if (!isObject(v) || !hasExactKeys(v, DISPLAY_KEYS)) return null;
  const measurement = v.measurement;
  if (!(MEASUREMENT_NAMES as readonly unknown[]).includes(measurement)) return null;
  const view = readMap(v.view, MEASUREMENT_NAMES, isView);
  const readoffRaw = readMap(v.readoff, MEASUREMENT_NAMES, isReadoff);
  const chartDataOpen = readMap(v.chartDataOpen, MEASUREMENT_NAMES, isBoolean);
  const showAll = readMap(v.showAll, OVERLAY_MEASUREMENT_NAMES, isBoolean);
  const { overlay, familyView, logScale } = v;
  if (view === null || readoffRaw === null || chartDataOpen === null || showAll === null) return null;
  if (!isBoolean(overlay) || !isBoolean(familyView) || !isBoolean(logScale)) return null;
  // A JSON `-0` reads as the integer 0.
  const q = (x: number | null): number | null => (x === null ? null : x + 0);
  return {
    measurement: measurement as MeasurementName,
    view,
    readoff: {
      scarp_height: q(readoffRaw.scarp_height),
      dzw: q(readoffRaw.dzw),
      scarp_dip: q(readoffRaw.scarp_dip),
    },
    chartDataOpen,
    showAll,
    logScale,
    overlay,
    familyView,
  };
}

/**
 * Reads a saved text (§5.6): `{ kind: 'record', record }`, or
 * `{ kind: 'invalid-record' }` on a JSON syntax error, a missing or
 * unknown envelope or display key, a version other than integer 1, an
 * empty `sourceExportVersion` or `summary`, a null, array, or other
 * non-object `scenario`, and any mistyped or out-of-vocabulary display
 * value. The scenario object itself is validated only by
 * `restoreRecovery`.
 */
export function readRecovery(text: string): RecoveryReading {
  const invalid: RecoveryReading = { kind: 'invalid-record' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    if (e instanceof SyntaxError) return invalid;
    throw e;
  }
  if (!isObject(raw) || !hasExactKeys(raw, ENVELOPE_KEYS)) return invalid;
  const { recoveryVersion, sourceExportVersion, scenario, summary } = raw;
  if (recoveryVersion !== RECOVERY_VERSION) return invalid;
  if (!isNonEmptyString(sourceExportVersion) || !isNonEmptyString(summary)) return invalid;
  if (!isObject(scenario)) return invalid;
  const display = readDisplay(raw.display);
  if (display === null) return invalid;
  return {
    kind: 'record',
    record: { recoveryVersion: RECOVERY_VERSION, sourceExportVersion, scenario, display, summary },
  };
}

/**
 * Validates `record` against the newly loaded `manifest` (§5.6), even when
 * the export versions match: `parseScenario(record.scenario, manifest)`
 * unchanged. Returns `ready` with the Scenario, the saved display state,
 * the source export version, and the summary; or `incompatible` with the
 * `ScenarioInputError`'s path, or with the path `display.familyView` when
 * a true `familyView` meets a scenario that does not select every current
 * scarp class. Any other error propagates.
 */
export function restoreRecovery(record: RecoveryRecord, manifest: Manifest): RecoveryRestoration {
  let scenario: Scenario;
  try {
    scenario = parseScenario(record.scenario, manifest);
  } catch (e) {
    if (e instanceof ScenarioInputError) {
      return { kind: 'incompatible', path: e.path, summary: record.summary };
    }
    throw e;
  }
  if (record.display.familyView && !selectsEveryScarpClass(scenario, manifest)) {
    return { kind: 'incompatible', path: 'display.familyView', summary: record.summary };
  }
  return {
    kind: 'ready',
    scenario,
    display: record.display,
    sourceExportVersion: record.sourceExportVersion,
    summary: record.summary,
  };
}
