// Sediment-profile coverage on the guided page (guided DDD §17; PDD §3.2
// "Guided coverage explanation" and "Coverage strings", D-56; ADR-0021
// options 1F + 2B). One assessment, derived from the loaded release's
// trial records and the confirmed query's matching stages, feeds every
// surface: the site step's stable notes, the review block, the results
// block and panel notes, the chart strip, the Word report's captions, and
// the "Sediment-profile coverage" provenance block appended explorer-side
// at the three guided provenance sites. Nothing here changes a query, a
// weight, or the shared /scenario/ code (D-39).
//
// Availability is per profile, a set of (fault angle, sediment depth,
// density) combinations with at least one simulation. Representation is
// the same, restricted to combinations with at least one matching stage
// (per measurement: with at least one recorded value). A set is phrased
// per dimension only when it is a full cross-product within the reader's
// selection; otherwise the exact combinations are listed (§3.2), so no
// sentence implies a simulation that does not exist.
//
// Every sentence below is the PDD §3.2 Coverage strings block's, character
// for character; §17.3 of the guided DDD fixes how the recorded fragments
// compose for sets the PDD's examples do not show.
//
// A browser-and-Node file (DDD §5.1): no DOM global, no DOM type.

import type { Vintage } from '../decode/decode';
import { TRIAL_TABLE_COLUMNS } from '../decode/fields';
import { MEASUREMENT_NAMES, type MeasurementName, type SedimentPair } from '../state/state';
import { fillCopy, measurementLabel } from '../views/chart-text';
import { LAYERED_SET, UNIFORM_SET, sedimentLabel } from '../views/scenario-controls';
import type { RenderInput } from '../views/render-input';
import { guided } from './copy-overlay';

// --------------------------------------------------------------------
// The recorded strings (PDD §3.2, Coverage strings, D-56)
// --------------------------------------------------------------------

/** The review block's heading and hint. */
export const REVIEW_COVERAGE_HEADING = 'Simulations for these site conditions';
export const REVIEW_COVERAGE_HINT = 'This describes what this data release contains for these site conditions. Your assumed range and the Refine results choices decide which stages reach the results.';
/** The review's closing line for the unaffected profiles. */
export const REVIEW_REST = 'All other selected profiles have simulations for every site condition you selected.';
/** The results block's heading. */
export const RESULTS_COVERAGE_HEADING = 'Represented in these results';
/** The provenance block's label and its full-coverage line. */
export const PROVENANCE_COVERAGE_LABEL = 'Sediment-profile coverage';
export const PROVENANCE_FULL = 'Every selected profile has simulations for the selected site conditions and contributes matching stages to this result.';
/** The strip's scenario-summary prefix (the D-14 amendment), applied only where the strip and the report's captions render. */
export const REQUESTED_PREFIX = 'Requested scenario: ';

const NO_STAGES_TAIL = 'but no stages remain after the confirmed range and refinements.';
const REMAINS = ' It remains part of your selection.';

// --------------------------------------------------------------------
// Dimensions, combinations, and the release's availability
// --------------------------------------------------------------------

/** The three site dimensions of a combination, as the reader selects them. */
export interface Dims {
  readonly faultDip: readonly number[];
  readonly depth: readonly number[];
  readonly density: readonly string[];
}

/** The page's density order: Dense, Medium, Loose; any other value keeps its place after them (guided DDD §11.2). */
export const DENSITY_ORDER: readonly string[] = ['Dense', 'Medium', 'Loose'];
export const densityRank = (value: string): number => { const i = DENSITY_ORDER.indexOf(value); return i < 0 ? DENSITY_ORDER.length : i; };
export const densityOrder = (values: readonly string[]): string[] =>
  values.map((value, i) => ({ value, i })).sort((a, b) => densityRank(a.value) - densityRank(b.value) || a.i - b.i).map(item => item.value);

const comboKey = (dip: number, depth: number, density: string): string => `${dip}\u0000${depth}\u0000${density}`;
const pairKey = (pair: SedimentPair): string => `${pair.set}\u0000${pair.sedimentStrength}`;
interface Combo { readonly dip: number; readonly depth: number; readonly density: string }
const unkey = (key: string): Combo => {
  const [dip, depth, density] = key.split('\u0000');
  return { dip: Number(dip), depth: Number(depth), density };
};

/** Every combination of `dims`. */
function cross(dims: Dims): Set<string> {
  const out = new Set<string>();
  for (const dip of dims.faultDip) for (const depth of dims.depth) for (const density of dims.density) out.add(comboKey(dip, depth, density));
  return out;
}

const ascending = (values: Iterable<number>): number[] => [...new Set(values)].sort((a, b) => a - b);

/** The per-dimension values of a set, in the page's orders. */
function project(set: ReadonlySet<string>): Dims {
  const combos = [...set].map(unkey);
  return {
    faultDip: ascending(combos.map(c => c.dip)),
    depth: ascending(combos.map(c => c.depth)),
    density: densityOrder([...new Set(combos.map(c => c.density))]),
  };
}

/** The set's per-dimension values when it is exactly their full cross-product; otherwise null. */
function asProduct(set: ReadonlySet<string>): Dims | null {
  if (set.size === 0) return null;
  const dims = project(set);
  return dims.faultDip.length * dims.depth.length * dims.density.length === set.size ? dims : null;
}

const intersect = (a: ReadonlySet<string>, b: ReadonlySet<string>): Set<string> => new Set([...a].filter(k => b.has(k)));
const minus = (a: ReadonlySet<string>, b: ReadonlySet<string>): Set<string> => new Set([...a].filter(k => !b.has(k)));
const sameSet = <T>(a: readonly T[], b: readonly T[]): boolean => a.length === b.length && a.every(v => b.includes(v));

/** What the loaded release contains (§17.1): each profile's combinations, and the modeled values. */
export interface Availability {
  readonly byProfile: ReadonlyMap<string, ReadonlySet<string>>;
  /** "Modeled values": the distinct values present in the loaded release (§3.2). */
  readonly modeled: Dims;
}

const AVAILABILITY = new WeakMap<Vintage, Availability>();
const COLUMN = (name: (typeof TRIAL_TABLE_COLUMNS)[number]): number => TRIAL_TABLE_COLUMNS.indexOf(name);

/** The release's availability, read once per vintage from its trial records; no limit is hard-coded. */
export function availability(vintage: Vintage): Availability {
  const known = AVAILABILITY.get(vintage);
  if (known) return known;
  const byProfile = new Map<string, Set<string>>();
  const all = new Set<string>();
  for (let t = 0; t < vintage.manifest.counts.trials; t++) {
    const key = trialCombo(vintage, t);
    const pair = trialPair(vintage, t);
    let set = byProfile.get(pair);
    if (!set) byProfile.set(pair, set = new Set());
    set.add(key);
    all.add(key);
  }
  const result: Availability = { byProfile, modeled: project(all) };
  AVAILABILITY.set(vintage, result);
  return result;
}

function trialCombo(vintage: Vintage, t: number): string {
  const columns = vintage.manifest.trialColumns;
  const row = t * TRIAL_TABLE_COLUMNS.length;
  return comboKey(
    columns.fault_dip[vintage.trialTable[row + COLUMN('fault_dip')]],
    columns.depth[vintage.trialTable[row + COLUMN('depth')]],
    columns.density[vintage.trialTable[row + COLUMN('density')]],
  );
}

function trialPair(vintage: Vintage, t: number): string {
  const columns = vintage.manifest.trialColumns;
  const row = t * TRIAL_TABLE_COLUMNS.length;
  return pairKey({ set: columns.set[vintage.trialTable[row + COLUMN('set')]], sedimentStrength: columns.sediment_strength[vintage.trialTable[row + COLUMN('sediment_strength')]] });
}

// --------------------------------------------------------------------
// Phrases (§3.2 condition values; guided DDD §17.3)
// --------------------------------------------------------------------

/** Joined with commas and "and": "a", "a and b", "a, b and c". */
export function listAnd(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

const degrees = (dips: readonly number[]): string => listAnd(ascending(dips).map(d => `${d}°`));
const metres = (depths: readonly number[]): string => listAnd(ascending(depths).map(d => `${d} m`));
const densities = (values: readonly string[]): string => listAnd(densityOrder(values));
/** "fault angle 40°" / "fault angles 20°, 40° and 60°". */
const anglePhrase = (dips: readonly number[]): string => `fault angle${dips.length === 1 ? '' : 's'} ${degrees(dips)}`;

/** Condition phrases for the named dimensions, in the order angle, depth, density, joined with commas and "and". */
function conditions(dims: Partial<Dims>): string {
  const parts: string[] = [];
  if (dims.faultDip?.length) parts.push(anglePhrase(dims.faultDip));
  if (dims.depth?.length) parts.push(`sediment depth ${metres(dims.depth)}`);
  if (dims.density?.length) parts.push(`density ${densities(dims.density)}`);
  return listAnd(parts);
}

/**
 * The exact-combination form (§3.2): one item per density and depth, "Dense
 * sediment at 10 m", joined with semicolons; an item names its fault angles
 * only when they are not every angle in play (§17.3).
 */
function exactList(set: ReadonlySet<string>, anglesInPlay: readonly number[]): string {
  const groups = new Map<string, { density: string; depth: number; dips: number[] }>();
  for (const combo of [...set].map(unkey)) {
    const key = `${combo.density}\u0000${combo.depth}`;
    let group = groups.get(key);
    if (!group) groups.set(key, group = { density: combo.density, depth: combo.depth, dips: [] });
    group.dips.push(combo.dip);
  }
  return [...groups.values()]
    .sort((a, b) => densityRank(a.density) - densityRank(b.density) || a.density.localeCompare(b.density) || a.depth - b.depth)
    .map(g => `${g.density} sediment at ${g.depth} m${sameSet(ascending(g.dips), ascending(anglesInPlay)) ? '' : `, at ${anglePhrase(g.dips)}`}`)
    .join('; ');
}

/** A non-empty part of the selection `s`: the dimensions where it differs, or the exact combinations. */
function present(part: ReadonlySet<string>, s: Dims): string {
  const dims = asProduct(part);
  if (dims === null) return exactList(part, s.faultDip);
  return conditions({
    faultDip: sameSet(dims.faultDip, s.faultDip) ? [] : dims.faultDip,
    depth: sameSet(dims.depth, s.depth) ? [] : dims.depth,
    density: sameSet(dims.density, s.density) ? [] : dims.density,
  });
}

/**
 * The values of `outer` absent from `inner` when both are cross-products
 * differing in exactly one dimension — each such value has none, and no
 * reader can take two named values for one combination; otherwise null.
 */
function absentValues(outer: ReadonlySet<string>, inner: ReadonlySet<string>): Partial<Dims> | null {
  const o = asProduct(outer), i = asProduct(inner);
  if (o === null || i === null) return null;
  const missing = {
    faultDip: o.faultDip.filter(v => !i.faultDip.includes(v)),
    depth: o.depth.filter(v => !i.depth.includes(v)),
    density: o.density.filter(v => !i.density.includes(v)),
  };
  return [missing.faultDip, missing.depth, missing.density].filter(values => values.length > 0).length === 1 ? missing : null;
}

/** What `outer` holds beyond `inner`: the one dimension's absent values, or the exact combinations (§17.3). */
function absent(outer: ReadonlySet<string>, inner: ReadonlySet<string>, s: Dims): string {
  const values = absentValues(outer, inner);
  return values === null ? exactList(minus(outer, inner), s.faultDip) : conditions(values);
}

// --------------------------------------------------------------------
// Profile names (§3.2, name forms)
// --------------------------------------------------------------------

/** The page's profile form: "Layered: Alternating Strong-Weak" (hyphen), as the review and results list profiles. */
export function pageProfile(pair: SedimentPair): string {
  return `${pair.set === LAYERED_SET ? 'Layered' : pair.set === UNIFORM_SET ? 'Uniform' : pair.set}: ${pair.sedimentStrength}`;
}

/** The summary form: "Alternating Strong–Weak (layered)" (en dash), as the summary, provenance, report and strip do. */
export function summaryProfile(pair: SedimentPair): string {
  const L = sedimentLabel(pair.sedimentStrength);
  if (pair.set === LAYERED_SET) return fillCopy('ddd5.7.sedimentLayered', { L });
  if (pair.set === UNIFORM_SET) return fillCopy('ddd5.7.sedimentUniform', { L });
  return L;
}

type NameForm = 'page' | 'summary';
const profileName = (pair: SedimentPair, form: NameForm): string => form === 'page' ? pageProfile(pair) : summaryProfile(pair);

/** The measurement's lowercase name without unit, in the guided page's spelling, as §5.8's notice writes it. */
export function measurementNoun(m: MeasurementName): string {
  const label = guided(measurementLabel(m));
  return label.replace(/ \([^()]*\)$/, '').toLowerCase();
}

// --------------------------------------------------------------------
// The site step (2B): stable notes (§17.2)
// --------------------------------------------------------------------

/**
 * The stable note beside a limited profile — "{profile}: this data release
 * has simulations only for {combinations}." — or null when the release has
 * simulations for every modeled combination. It depends on the release
 * alone, never on the reader's choices.
 */
export function siteNote(vintage: Vintage, pair: SedimentPair): string | null {
  const { byProfile, modeled } = availability(vintage);
  const set = byProfile.get(pairKey(pair));
  if (!set || set.size === 0 || set.size === cross(modeled).size) return null;
  const dims = asProduct(set);
  let combinations: string;
  if (dims === null) combinations = `for ${exactList(set, modeled.faultDip)}`;
  else {
    const parts = [
      sameSet(dims.density, modeled.density) ? 'for every modeled density' : `${densities(dims.density)} sediment`,
      sameSet(dims.depth, modeled.depth) ? 'at every modeled sediment depth' : `${metres(dims.depth)} deep`,
      sameSet(dims.faultDip, modeled.faultDip) ? 'at every modeled fault angle' : `at ${anglePhrase(dims.faultDip)}`,
    ].join(', ');
    combinations = parts.startsWith('for ') ? parts : `for ${parts}`;
  }
  return `${pair.sedimentStrength}: this data release has simulations only ${combinations}.`;
}

// --------------------------------------------------------------------
// Review (1F): model availability for the draft (§17.4)
// --------------------------------------------------------------------

/** The site part of a scenario or draft. */
export interface SiteSelection extends Dims {
  readonly sediment: readonly SedimentPair[];
}

/** The review block's lines, or null when every selected profile has simulations for every selected combination. */
export function reviewLines(vintage: Vintage, site: SiteSelection): readonly string[] | null {
  const { byProfile } = availability(vintage);
  const s = selected(site);
  const all = cross(s);
  const lines: string[] = [];
  let unaffected = 0;
  for (const pair of orderedPairs(vintage, site.sediment)) {
    const a = intersect(byProfile.get(pairKey(pair)) ?? new Set(), all);
    const name = pageProfile(pair);
    if (a.size === all.size) { unaffected += 1; continue; }
    if (a.size === 0) lines.push(`${name} — this data release has no simulations for your selected site conditions.`);
    else if (asProduct(a) === null) lines.push(`${name} — simulations only for ${exactList(a, s.faultDip)}; none for the other selected combinations.`);
    else {
      // One partial dimension: "none at {values}"; several: the recorded tail, since the available half names the whole cross-product.
      const values = absentValues(all, a);
      lines.push(`${name} — simulations at ${present(a, s)}; ${values === null ? 'none for the other selected combinations' : `none at ${conditions(values)}`}.`);
    }
  }
  if (lines.length === 0) return null;
  return unaffected > 0 ? [...lines, REVIEW_REST] : lines;
}

function selected(site: Dims): Dims {
  return { faultDip: ascending(site.faultDip), depth: ascending(site.depth), density: densityOrder([...new Set(site.density)]) };
}

/** The selected profiles in the manifest's order, each once. */
function orderedPairs(vintage: Vintage, sediment: readonly SedimentPair[]): SedimentPair[] {
  return vintage.manifest.armStrengthStates
    .filter(p => sediment.some(q => q.set === p.set && q.sedimentStrength === p.sedimentStrength))
    .map(p => ({ set: p.set, sedimentStrength: p.sedimentStrength }));
}

// --------------------------------------------------------------------
// Confirmed results (1F): representation (§17.5)
// --------------------------------------------------------------------

/** One selected profile in the confirmed result. */
export interface ProfileCoverage {
  readonly pair: SedimentPair;
  /** Selected combinations with simulations. */
  readonly available: ReadonlySet<string>;
  /** Selected combinations with matching stages. */
  readonly represented: ReadonlySet<string>;
  /** Per measurement, the combinations whose matching stages carry a recorded value. */
  readonly measured: { readonly [m in MeasurementName]: ReadonlySet<string> };
}

/** The confirmed result's coverage: the selection and each selected profile. */
export interface ResultCoverage {
  readonly selection: Dims;
  readonly all: ReadonlySet<string>;
  readonly profiles: readonly ProfileCoverage[];
  /** Per measurement, whether the panel has any recorded value. */
  readonly panelValid: { readonly [m in MeasurementName]: boolean };
}

const RESULT_COVERAGE = new WeakMap<RenderInput, ResultCoverage>();

/** The confirmed snapshot's coverage, from its scenario and its matching stages; draft edits never reach it (D-27). */
export function resultCoverage(input: RenderInput): ResultCoverage {
  const known = RESULT_COVERAGE.get(input);
  if (known) return known;
  const { vintage, scenario, selection } = input;
  const s = selected(scenario);
  const all = cross(s);
  const { byProfile } = availability(vintage);
  const n = vintage.manifest.counts.stagesPerTrial;
  const stored: { readonly [m in MeasurementName]: Uint16Array } = { scarp_height: vintage.scarpHeight, dzw: vintage.dzw, scarp_dip: vintage.scarpDip };
  const represented = new Map<string, Set<string>>();
  const measured = new Map<string, { [m in MeasurementName]: Set<string> }>();
  for (let k = 0; k < selection.indices.length; k++) {
    const i = selection.indices[k];
    const t = Math.floor(i / n);
    const pair = trialPair(vintage, t), combo = trialCombo(vintage, t);
    let r = represented.get(pair);
    if (!r) represented.set(pair, r = new Set());
    r.add(combo);
    let byM = measured.get(pair);
    if (!byM) measured.set(pair, byM = { scarp_height: new Set(), dzw: new Set(), scarp_dip: new Set() });
    for (const m of MEASUREMENT_NAMES) if (stored[m][i] !== vintage.manifest.columns[m].nullSentinel) byM[m].add(combo);
  }
  const empty = new Set<string>();
  const profiles = orderedPairs(vintage, scenario.sediment).map((pair): ProfileCoverage => {
    const key = pairKey(pair);
    const byM = measured.get(key);
    return {
      pair,
      available: intersect(byProfile.get(key) ?? empty, all),
      represented: represented.get(key) ?? empty,
      measured: { scarp_height: byM?.scarp_height ?? empty, dzw: byM?.dzw ?? empty, scarp_dip: byM?.scarp_dip ?? empty },
    };
  });
  const panelValid = {
    scarp_height: selection.perMeasurement.scarp_height.valid > 0,
    dzw: selection.perMeasurement.dzw.valid > 0,
    scarp_dip: selection.perMeasurement.scarp_dip.valid > 0,
  };
  const result: ResultCoverage = { selection: s, all, profiles, panelValid };
  RESULT_COVERAGE.set(input, result);
  return result;
}

/** A profile's results line, or null when every selected combination is represented. */
function resultLine(p: ProfileCoverage, cov: ResultCoverage, form: NameForm): string | null {
  const { all, selection: s } = cov;
  const name = profileName(p.pair, form);
  if (p.represented.size === all.size) return null;
  if (p.available.size === 0) return `${name} — this data release has no simulations for your selected site conditions, so it is not in these results.${form === 'page' ? REMAINS : ''}`;
  if (p.represented.size === 0) {
    return p.available.size === all.size
      ? `${name} — simulations exist for your selected site conditions, ${NO_STAGES_TAIL}`
      : `${name} — simulations exist for some of your selected site conditions (at ${present(p.available, s)}), ${NO_STAGES_TAIL}`;
  }
  // Order is fixed (§17.3): the represented part, then the no-stages part
  // with explicit values or combinations, and the no-simulations part last,
  // so its catch-all "other selected combinations" follows every set named.
  let line = `${name} — represented at ${present(p.represented, s)}.`;
  if (p.represented.size !== p.available.size) line += ` No stages at ${absent(p.available, p.represented, s)} remain after the confirmed range and refinements.`;
  if (p.available.size !== all.size) {
    const values = absentValues(all, p.available);
    line += values === null ? ' No simulations for the other selected combinations in this data release.' : ` No simulations at ${conditions(values)} in this data release.`;
  }
  return line;
}

/** The "Represented in these results" block: the represented profiles (page form) and one line per affected profile; null when none is affected. */
export function resultsBlock(input: RenderInput): { readonly represented: readonly string[]; readonly lines: readonly string[] } | null {
  const cov = resultCoverage(input);
  const lines = cov.profiles.map(p => resultLine(p, cov, 'page')).filter((line): line is string => line !== null);
  if (lines.length === 0) return null;
  return { represented: cov.profiles.filter(p => p.represented.size > 0).map(p => pageProfile(p.pair)), lines };
}

/** The no-recorded-values note for one profile and measurement. */
const noValuesNote = (pair: SedimentPair, m: MeasurementName, form: NameForm): string =>
  `Simulations for ${profileName(pair, form)} are in your results, but their stages have no recorded ${measurementNoun(m)} values, so this chart cannot show them. Their stages are part of the Missing values (excluded) count in the statistics table.`;

/** Profiles with matching stages that carry no recorded value for `m`. */
function silentProfiles(cov: ResultCoverage, m: MeasurementName): readonly ProfileCoverage[] {
  return cov.profiles.filter(p => p.represented.size > 0 && p.measured[m].size === 0);
}

/**
 * The measurement panel's notes, in the page's profile form (§3.2): only
 * while other profiles' stages carry values — when the whole panel has
 * none, §5.8's notice stands alone.
 */
export function panelCoverageNotes(input: RenderInput, m: MeasurementName): readonly string[] {
  const cov = resultCoverage(input);
  return cov.panelValid[m] ? silentProfiles(cov, m).map(p => noValuesNote(p.pair, m, 'page')) : [];
}

// --------------------------------------------------------------------
// Saved results: the strip and the provenance block (§17.6, §17.7)
// --------------------------------------------------------------------

/**
 * The strip's qualification lines for the plotted measurement, one per
 * selected profile absent from or only partly represented in it, in the
 * summary form; they follow the count line (D-14 amendment).
 */
export function chartCoverageLines(input: RenderInput, m: MeasurementName): readonly string[] {
  const cov = resultCoverage(input);
  const lines: string[] = [];
  for (const p of cov.profiles) {
    const shown = p.measured[m];
    if (shown.size === cov.all.size) continue;
    const name = summaryProfile(p.pair);
    if (shown.size === 0) {
      const reason = p.available.size === 0 ? 'no simulations for the selected site conditions'
        : p.represented.size === 0 ? 'no stages after the range and refinements'
          : `no recorded ${measurementNoun(m)} values`;
      lines.push(`Not represented in this chart: ${name} — ${reason}.`);
    } else {
      lines.push(`Partly represented in this chart: ${name} — ${present(shown, cov.selection)} only.`);
    }
  }
  return lines;
}

/**
 * The provenance block's lines (summary form), or the full-coverage line.
 * The no-recorded-values note covers every reported measurement, the
 * whole-panel case included: the full line never implies usable values.
 */
export function provenanceCoverageLines(input: RenderInput): readonly string[] {
  const cov = resultCoverage(input);
  const lines = cov.profiles.map(p => resultLine(p, cov, 'summary')).filter((line): line is string => line !== null);
  for (const m of MEASUREMENT_NAMES) for (const p of silentProfiles(cov, m)) lines.push(noValuesNote(p.pair, m, 'summary'));
  return lines.length ? lines : [PROVENANCE_FULL];
}

/**
 * `provenance` with the "Sediment-profile coverage" block added, in the
 * shared builder's block format (label, lines, blank line), directly before
 * its last block: the Licences block still closes the text (PDD §6.1,
 * G-28). The one explorer-side composition used by provenance.txt, the
 * chart sidecar, and the Word report's Provenance section (ADR-0021).
 */
export function withCoverage(provenance: string, input: RenderInput): string {
  if (!provenance.endsWith('\n\n')) throw new Error('coverage: the provenance text does not end with a closed block');
  const at = provenance.lastIndexOf('\n\n', provenance.length - 3) + 2;
  if (at < 2) throw new Error('coverage: the provenance text has no block before its last');
  const block = [PROVENANCE_COVERAGE_LABEL, ...provenanceCoverageLines(input), ''].map(line => `${line}\n`).join('');
  return `${provenance.slice(0, at)}${block}${provenance.slice(at)}`;
}
