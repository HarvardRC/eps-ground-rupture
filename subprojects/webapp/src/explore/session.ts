// Same-tab continuity for the guided page (PDD D-38; guided DDD §9.2).
// A pure record shape, its validation, and a storage wrapper whose every
// access is guarded. Results, RenderInput, counts, and version stamps
// beyond dataVersion are never stored; the walkthrough index is never
// stored either.
import type { Manifest } from '../decode/fields';
import { MEASUREMENT_NAMES, type MeasurementName, type PanelView } from '../state/state';
import { isSampleId, validateDraft, type Draft, type SampleId, type Step } from './state';

export const SESSION_KEY = 'gre-explore-session';
const STEPS: readonly Step[] = ['intro', 'site', 'movement', 'review', 'results'];

/** A sample fill's identity and whether it has been edited (§10.5; owner decision R, 2026-11-05). */
export interface StoredSample {
  id: SampleId;
  modified: boolean;
}

/**
 * The fill standing when the current confirmation was made; `current`
 * says it is still the working fill rather than an earlier one that a
 * later fill replaced (Discard returns to its notice, §10.5).
 */
export interface StoredConfirmedSample extends StoredSample {
  current: boolean;
}

/** The §5 presentation choices that persist with the record (§9.2). */
export interface DisplayChoices {
  measurement: MeasurementName;
  view: Record<MeasurementName, PanelView>;
  readoff: Record<MeasurementName, number | null>;
  logScale: boolean;
  chartDataOpen: Record<MeasurementName, boolean>;
  exampleOpen: boolean;
  refineOpen: boolean;
  /**
   * The active sample notice, so a reload keeps it (owner decision R,
   * 2026-11-05). A record written before these keys existed reads them as null.
   */
  sample: StoredSample | null;
  confirmedSample: StoredConfirmedSample | null;
}

export interface SessionRecord {
  record: 1;
  dataVersion: string;
  step: Step;
  draft: Draft;
  confirmed: Draft | null;
  display: DisplayChoices;
}

/** What a mount does with the stored record (§9.2, steps 1–3). */
export type SessionClass =
  | { kind: 'absent' }
  | { kind: 'unreadable' }
  | { kind: 'data-changed' }
  | { kind: 'restore'; record: SessionRecord };

/** Store the record; false when the storage refuses or throws. */
export function saveSession(storage: Storage, record: SessionRecord): boolean {
  try {
    storage.setItem(SESSION_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

/** The stored record, 'absent' when there is none, or 'invalid' when it cannot be read as one. */
export function loadSession(storage: Storage): SessionRecord | 'absent' | 'invalid' {
  let text: string | null;
  try {
    text = storage.getItem(SESSION_KEY);
  } catch {
    return 'invalid';
  }
  if (text === null) return 'absent';
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return 'invalid';
  }
  if (!isRecord(value)) return 'invalid';
  // A record from before the sample keys reads them as null.
  if (!('sample' in value.display)) Object.assign(value.display, { sample: null, confirmedSample: null });
  return value;
}

export function clearSession(storage: Storage): void {
  try {
    storage.removeItem(SESSION_KEY);
  } catch {
    // An unusable storage has nothing further to clear.
  }
}

/**
 * Classify a loaded record against the served data (§9.2): a wrong
 * data version, or a confirmed draft that no longer validates, stops the
 * restore. An incomplete or invalid working draft is restorable (D-30).
 */
export function classifySession(
  loaded: SessionRecord | 'absent' | 'invalid',
  dataVersion: string,
  manifest: Manifest,
): SessionClass {
  if (loaded === 'absent') return { kind: 'absent' };
  if (loaded === 'invalid') return { kind: 'unreadable' };
  if (loaded.dataVersion !== dataVersion) return { kind: 'data-changed' };
  if (loaded.confirmed !== null && validateDraft(loaded.confirmed, manifest).issues.length) return { kind: 'unreadable' };
  if (loaded.step === 'results' && loaded.confirmed === null) return { kind: 'unreadable' };
  return { kind: 'restore', record: loaded };
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const arrayOf = <T>(value: unknown, item: (v: unknown) => v is T): value is T[] =>
  Array.isArray(value) && value.every(item);
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const hasExactly = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).length === keys.length && keys.every(key => key in value);
const perMeasurement = <T>(value: unknown, item: (v: unknown) => v is T): value is Record<MeasurementName, T> =>
  isObject(value) && hasExactly(value, MEASUREMENT_NAMES) && MEASUREMENT_NAMES.every(m => item(value[m]));

const DRAFT_KEYS = ['faultDip', 'depth', 'density', 'sediment', 'mode', 'slipMin', 'slipMax', 'offsetMax', 'population', 'scarpClass'] as const;
const DISPLAY_KEYS = ['measurement', 'view', 'readoff', 'logScale', 'chartDataOpen', 'exampleOpen', 'refineOpen'] as const;
const SAMPLE_KEYS = ['sample', 'confirmedSample'] as const;
const RECORD_KEYS = ['record', 'dataVersion', 'step', 'draft', 'confirmed', 'display'] as const;

/** The §2 Draft structure; values need not validate against the manifest. */
export function isDraft(value: unknown): value is Draft {
  if (!isObject(value) || !hasExactly(value, DRAFT_KEYS)) return false;
  return arrayOf(value.faultDip, isNumber) && arrayOf(value.depth, isNumber)
    && arrayOf(value.density, isString)
    && arrayOf(value.sediment, (pair): pair is { set: string; sedimentStrength: string } =>
      isObject(pair) && hasExactly(pair, ['set', 'sedimentStrength']) && isString(pair.set) && isString(pair.sedimentStrength))
    && (value.mode === 'slip' || value.mode === 'offset')
    && isString(value.slipMin) && isString(value.slipMax) && isString(value.offsetMax)
    && isString(value.population) && arrayOf(value.scarpClass, isString);
}

const isStoredSample = (value: unknown): value is StoredSample =>
  isObject(value) && hasExactly(value, ['id', 'modified']) && isSampleId(value.id) && typeof value.modified === 'boolean';
const isStoredConfirmed = (value: unknown): value is StoredConfirmedSample =>
  isObject(value) && hasExactly(value, ['id', 'modified', 'current']) && isSampleId(value.id)
  && typeof value.modified === 'boolean' && typeof value.current === 'boolean';

/** The display choices; the sample keys may be absent together (a record written before them). */
function isDisplay(value: unknown): value is DisplayChoices {
  if (!isObject(value)) return false;
  // Both sample keys or neither: a record from before them restores without a notice.
  const sampleKeys = SAMPLE_KEYS.filter(key => key in value).length;
  if (sampleKeys === 1 || !hasExactly(value, sampleKeys ? [...DISPLAY_KEYS, ...SAMPLE_KEYS] : DISPLAY_KEYS)) return false;
  if (sampleKeys) {
    const { sample, confirmedSample } = value;
    if (!(sample === null || isStoredSample(sample)) || !(confirmedSample === null || isStoredConfirmed(confirmedSample))) return false;
    // A confirmed fill still current is the working fill itself; a confirmed fill implies a working one.
    if (confirmedSample !== null && (sample === null || (confirmedSample.current && confirmedSample.id !== sample.id))) return false;
  }
  const readoff = (v: unknown): v is number | null => v === null || (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 100);
  const view = (v: unknown): v is PanelView => v === 'histogram' || v === 'cumulative';
  const flag = (v: unknown): v is boolean => typeof v === 'boolean';
  return (MEASUREMENT_NAMES as readonly unknown[]).includes(value.measurement)
    && perMeasurement(value.view, view) && perMeasurement(value.readoff, readoff)
    && flag(value.logScale) && perMeasurement(value.chartDataOpen, flag)
    && flag(value.exampleOpen) && flag(value.refineOpen);
}

function isRecord(value: unknown): value is SessionRecord {
  return isObject(value) && hasExactly(value, RECORD_KEYS) && value.record === 1
    && isString(value.dataVersion) && (STEPS as readonly unknown[]).includes(value.step)
    && isDraft(value.draft) && (value.confirmed === null || isDraft(value.confirmed))
    && isDisplay(value.display)
    // The confirmed scenario's fill needs a confirmed scenario.
    && (value.confirmed !== null || !(value.display as Partial<DisplayChoices>).confirmedSample);
}
