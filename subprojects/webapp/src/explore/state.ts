// Pure guided state. The legacy Scenario and decimal grammar remain
// authoritative; the wizard adds explicit completion and draft rules.
import type { Manifest, Regression } from '../decode/fields';
import { convertWindows } from '../convert/convert';
import { compareDecimals, judgeOffset, judgeSlipWindow, readDecimal, recordedSlipMax } from '../state/parse';
import { compareSedimentPairs, type Population, type Scenario, type SedimentPair } from '../state/state';

export type Step = 'intro' | 'site' | 'movement' | 'review' | 'results';
export interface Draft {
  faultDip: number[];
  depth: number[];
  density: string[];
  sediment: SedimentPair[];
  mode: 'slip' | 'offset';
  slipMin: string;
  slipMax: string;
  offsetMax: string;
  population: Population;
  scarpClass: string[];
}
export interface Issue {
  step: 'site' | 'movement' | 'results';
  field: string;
  message: string;
}
export interface Judgment {
  issues: Issue[];
  scenario: Scenario | null;
}

export function freshDraft(manifest: Manifest): Draft {
  return {
    faultDip: [], depth: [], density: [], sediment: [],
    mode: 'slip', slipMin: '0', slipMax: '', offsetMax: '',
    population: 'all_stages', scarpClass: [...manifest.scarpClasses],
  };
}

/** The reader-facing group of a manifest sediment set. */
export function sedimentGroup(set: string): string {
  if (/hetero|layer/i.test(set)) return 'Layered sediment';
  if (/homo|uniform/i.test(set)) return 'Uniform sediment';
  return set;
}

/** The named samples of the introduction's chooser (PDD D-42; guided DDD §10.1). */
export type SampleId = 'illustrative' | 'kern';

/**
 * A named sample draft (PDD D-37 and D-42; guided DDD §§9.1, 10.1).
 *
 * - `illustrative`: the approved scenario, unchanged from D-37 — fault
 *   angles 30° and 40°, 5 m depth, Dense density, Uniform: Strong and
 *   Layered: Strong sediment, and a 0–3 m vertical surface offset.
 * - `kern`: anchored to the scale of the 1952 Kern County earthquake —
 *   fault angles 60° and 70° and a 0–1.3 m vertical surface offset
 *   (D-42); its 10 m depth, Medium density, and Uniform: Moderate and
 *   Layered: Moderate sediment are agent selections under the PDD §2.3
 *   delegation, recorded in the G-14 evidence.
 *
 * Every member comes from the manifest dictionaries; a missing member
 * throws rather than shrinking the sample.
 */
export function sampleDraft(manifest: Manifest, sample: SampleId): Draft {
  const columns = manifest.trialColumns;
  const member = <T>(values: readonly T[], value: T, label: string): T => {
    if (!values.includes(value)) throw new Error(`Sample inputs: this data release has no ${label}.`);
    return value;
  };
  const sediments = (strength: string): Draft['sediment'] => (['Uniform', 'Layered'] as const).map(group => {
    const pairs = manifest.armStrengthStates.filter(pair =>
      sedimentGroup(pair.set) === `${group} sediment` && pair.sedimentStrength === strength);
    if (pairs.length !== 1) throw new Error(`Sample inputs: this data release has no single ${group}: ${strength} sediment.`);
    return { set: pairs[0].set, sedimentStrength: pairs[0].sedimentStrength };
  }).sort(compareSedimentPairs);
  const spec = sample === 'kern'
    ? { dips: [60, 70], depth: 10, density: 'Medium', strength: 'Moderate', offsetMax: '1.3' }
    : { dips: [30, 40], depth: 5, density: 'Dense', strength: 'Strong', offsetMax: '3' };
  return {
    ...freshDraft(manifest),
    faultDip: spec.dips.map(dip => member(columns.fault_dip, dip, `${dip}° fault angle`)),
    depth: [member(columns.depth, spec.depth, `${spec.depth} m sediment depth`)],
    density: [member(columns.density, spec.density, `${spec.density} sediment density`)],
    sediment: sediments(spec.strength),
    mode: 'offset',
    offsetMax: spec.offsetMax,
  };
}

export function cloneDraft(draft: Draft): Draft {
  return {
    ...draft, faultDip: [...draft.faultDip], depth: [...draft.depth],
    density: [...draft.density], scarpClass: [...draft.scarpClass],
    sediment: draft.sediment.map(pair => ({ ...pair })),
  };
}

function comparable(draft: Draft): string {
  const copy = cloneDraft(draft);
  copy.faultDip = [...new Set(copy.faultDip)].sort((a, b) => a - b);
  copy.depth = [...new Set(copy.depth)].sort((a, b) => a - b);
  copy.density = [...new Set(copy.density)].sort();
  copy.scarpClass = [...new Set(copy.scarpClass)].sort();
  copy.sediment = copy.sediment.sort(compareSedimentPairs).filter((p, i, pairs) =>
    i === 0 || compareSedimentPairs(p, pairs[i - 1]) !== 0);
  return JSON.stringify([
    copy.faultDip, copy.depth, copy.density,
    copy.sediment.map(p => [p.set, p.sedimentStrength]),
    copy.mode, copy.slipMin, copy.slipMax, copy.offsetMax,
    copy.population, copy.scarpClass,
  ]);
}

/** Inactive strings count; set order and repeated set members do not. */
export function draftChanged(draft: Draft, confirmed: Draft | null): boolean {
  return confirmed !== null && comparable(draft) !== comparable(confirmed);
}

export function validateDraft(draft: Draft, manifest: Manifest): Judgment {
  const issues: Issue[] = [];
  const add = (step: Issue['step'], field: string, message: string) => issues.push({ step, field, message });
  const checkSet = <T>(values: readonly T[], dictionary: readonly T[], field: string, label: string) => {
    if (!values.length) add('site', field, `Choose one or more ${label}.`);
    else if (values.some(value => !dictionary.includes(value))) add('site', field, `Choose only the available ${label}.`);
  };
  const columns = manifest.trialColumns;
  checkSet(draft.faultDip, columns.fault_dip, 'faultDip', 'fault angles');
  checkSet(draft.depth, columns.depth, 'depth', 'sediment depths');
  checkSet(draft.density, columns.density, 'density', 'sediment densities');
  const pairs = manifest.armStrengthStates.map(p => ({ set: p.set, sedimentStrength: p.sedimentStrength }));
  if (!draft.sediment.length) add('site', 'sediment', 'Choose one or more sediment strength and structure values.');
  else if (draft.sediment.some(p => !pairs.some(q => compareSedimentPairs(p, q) === 0))) {
    add('site', 'sediment', 'Choose only the available sediment strength and structure values.');
  }

  let window: Scenario['window'] | null = null;
  if (draft.mode === 'slip') {
    const readings = { slipMin: readDecimal(draft.slipMin), slipMax: readDecimal(draft.slipMax) };
    for (const field of ['slipMin', 'slipMax'] as const) {
      const label = field === 'slipMin' ? 'minimum' : 'maximum';
      if (readings[field].kind === 'blank') add('movement', field, `Enter the ${label} fault slip in metres.`);
      if (readings[field].kind === 'invalid') add('movement', field,
        `Enter a nonnegative decimal for ${label} slip, using at most 16 characters before and after normalization.`);
      const reading = readings[field];
      if (reading.kind === 'decimal' && compareDecimals(reading.value, recordedSlipMax(manifest.slipWindowBounds)) > 0) {
        add('movement', field, `The simulations cover slip up to ${recordedSlipMax(manifest.slipWindowBounds)} m. Enter a value within that range.`);
      }
    }
    if (readings.slipMin.kind === 'decimal' && readings.slipMax.kind === 'decimal') {
      const judged = judgeSlipWindow(draft.slipMin, draft.slipMax, manifest.slipWindowBounds);
      if (judged.kind === 'accepted') window = judged.window;
      else if (judged.reason === 'min-above-max') add('movement', 'slipMax', 'Maximum slip must be at least the minimum slip.');
    }
  } else {
    const judged = judgeOffset(draft.offsetMax);
    if (judged.kind === 'accepted') window = judged.window;
    else add('movement', 'offsetMax', judged.reason === 'blank'
      ? 'Enter the maximum vertical surface offset in metres.'
      : judged.reason === 'above-bound' ? 'Enter a vertical surface offset from 0 to 1000 m.'
        : 'Enter a nonnegative decimal offset, using at most 16 characters before and after normalization.');
  }
  if (!draft.scarpClass.length) add('results', 'scarpClass', 'Select one or more scarp types before review.');
  else if (draft.scarpClass.some(c => !manifest.scarpClasses.includes(c))) {
    add('results', 'scarpClass', 'Select only the available scarp types.');
  }
  if (draft.population !== 'all_stages' && draft.population !== 'one_state_per_trial') {
    add('results', 'population', 'Choose which simulation stages should contribute.');
  }
  if (issues.length || window === null) return { issues, scenario: null };
  return {
    issues,
    scenario: {
      faultDip: columns.fault_dip.filter(d => draft.faultDip.includes(d)).sort((a, b) => a - b),
      depth: columns.depth.filter(d => draft.depth.includes(d)).sort((a, b) => a - b),
      density: columns.density.filter(d => draft.density.includes(d)),
      sediment: pairs.filter(p => draft.sediment.some(q => compareSedimentPairs(p, q) === 0)).sort(compareSedimentPairs),
      window, population: draft.population,
      scarpClass: manifest.scarpClasses.filter(c => draft.scarpClass.includes(c)),
    },
  };
}

/** Exact tenths, preserving extra typed precision without float drift. */
export function stepDecimal(raw: string, direction: -1 | 1): string {
  const reading = readDecimal(raw);
  if (reading.kind === 'invalid') return raw;
  if (reading.kind === 'blank') return direction === 1 ? '0.1' : '0';
  const [whole, fraction = ''] = reading.value.split('.');
  const scale = Math.max(1, fraction.length);
  const value = BigInt(whole + fraction.padEnd(scale, '0'));
  const step = BigInt('1' + '0'.repeat(scale - 1));
  const sum = direction === 1 ? value + step : value > step ? value - step : BigInt(0);
  const digits = sum.toString().padStart(scale + 1, '0');
  const result = readDecimal(digits.slice(0, -scale) + '.' + digits.slice(-scale));
  return result.kind === 'decimal' ? result.value : raw;
}

/** Smallest coverage cap over the chosen angles, rounded down to cents. */
export function offsetShortcut(dips: readonly number[], regression: Regression, slipMax: number): string | null {
  if (!dips.length || !Number.isFinite(slipMax) || slipMax < 0) return null;
  let cap = Infinity;
  for (const dip of dips) {
    const row = regression.coefficients.find(r => r.faultDip === dip);
    if (!row || !Number.isFinite(row.slope) || row.slope <= 0 || !Number.isFinite(row.intercept)) return null;
    const limit = row.slope * slipMax + row.intercept;
    if (!Number.isFinite(limit) || limit < 0) return null;
    cap = Math.min(cap, limit);
  }
  const text = (Math.floor(cap * 100) / 100).toFixed(2);
  const value = readDecimal(text);
  if (value.kind !== 'decimal' || judgeOffset(value.value).kind !== 'accepted') return null;
  try {
    const windows = convertWindows(Number(value.value), dips, regression.coefficients);
    return windows.some(window => window.hi > slipMax) ? null : value.value;
  } catch {
    return null;
  }
}
