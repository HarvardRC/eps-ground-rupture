// The summary builders of docs/app/ddd.md §5.1 (`views/*.ts`,
// `summary.ts`): `summaryText(state, counts)`, `settingsText(state)`, and
// `populationText(state)`, the one-line scenario summary of §5.7 (Layout
// and scenario summary) and its two portions; and `chartSummary`, the
// chart caption's statistics sentence of §5.11 (Chart text alternatives).
// Every token is generated from state through the copy registry (§5.8).
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import type * as Config from '../config';
import type { Manifest } from '../decode/fields';
import type { MeasurementCounts } from '../engine/query';
import type { MeasurementName, Scenario } from '../state/state';
import type { Stats } from '../stats/stats';
import { fillCopy, measurementLabel, quantityText } from './chart-text';
import { copyText } from './copy';
import { formatCount } from './format';
import { LAYERED_SET, UNIFORM_SET, dipLabel, sedimentLabel } from './scenario-controls';

// --------------------------------------------------------------------
// The scenario summary (§5.7)
// --------------------------------------------------------------------

/**
 * What the summary reads (§5.7): the accepted Scenario with the manifest
 * dictionaries it was accepted against, which define "all" for each
 * group.
 */
export interface SummaryState {
  readonly scenario: Scenario;
  readonly manifest: Manifest;
}

/** What the count token reads: the engine's matching-record count (`Selection.matchingRecords`, §5.3). */
export interface SummaryCounts {
  readonly matchingRecords: number;
}

/** True when `selected` holds every entry of `dictionary`. */
function selectsAll<V>(dictionary: readonly V[], selected: readonly V[]): boolean {
  return dictionary.every((v) => selected.includes(v));
}

/** Items joined with the list joiner ` or ` (§5.7). */
function orList(items: readonly string[]): string {
  return items.join(copyText('ddd5.7.summaryListJoiner'));
}

/** A group token: the "all" token, the empty-group token, or the filled template (§5.7 token table). */
function groupToken<V>(
  dictionary: readonly V[],
  selected: readonly V[],
  keys: { readonly all: string; readonly empty: string },
  filled: () => string,
): string {
  if (selected.length === 0) return copyText(keys.empty);
  if (selectsAll(dictionary, selected)) return copyText(keys.all);
  return filled();
}

/** The dip token: `any dip`, `no fault dip selected`, or `dip {dips}`, each `{d}°`, ascending. */
function dipToken({ scenario, manifest }: SummaryState): string {
  return groupToken(
    manifest.trialColumns.fault_dip,
    scenario.faultDip,
    { all: 'ddd5.7.tokenAnyDip', empty: 'ddd5.7.tokenNoDip' },
    () => fillCopy('ddd5.7.tokenDip', { dips: orList([...scenario.faultDip].sort((a, b) => a - b).map(dipLabel)) }),
  );
}

/**
 * The sediment token, lossless over the nine pairs (§5.7): `any
 * sediment`, `no sediment strength selected`, or one item per label with
 * at least one selected arm, in the order of the label's first appearance
 * in `arm_strength_states` — `{L} — uniform and layered`, `{L} (uniform)`,
 * or `{L} (layered)`, `{L}` through the display-label map.
 */
function sedimentToken({ scenario, manifest }: SummaryState): string {
  const pairs = manifest.armStrengthStates;
  const selected = (set: string, label: string): boolean =>
    scenario.sediment.some((p) => p.set === set && p.sedimentStrength === label);
  if (scenario.sediment.length === 0) return copyText('ddd5.7.tokenNoSediment');
  if (pairs.every((p) => selected(p.set, p.sedimentStrength))) return copyText('ddd5.7.tokenAnySediment');
  const labels: string[] = [];
  for (const p of pairs) {
    if (!labels.includes(p.sedimentStrength)) labels.push(p.sedimentStrength);
  }
  const items: string[] = [];
  for (const label of labels) {
    const uniform = selected(UNIFORM_SET, label);
    const layered = selected(LAYERED_SET, label);
    const L = sedimentLabel(label);
    if (uniform && layered) items.push(fillCopy('ddd5.7.sedimentBothArms', { L }));
    else if (uniform) items.push(fillCopy('ddd5.7.sedimentUniform', { L }));
    else if (layered) items.push(fillCopy('ddd5.7.sedimentLayered', { L }));
  }
  return orList(items);
}

/** The depth token: `any depth`, `no sediment depth selected`, or `depth {depths} m`, ascending. */
function depthToken({ scenario, manifest }: SummaryState): string {
  return groupToken(
    manifest.trialColumns.depth,
    scenario.depth,
    { all: 'ddd5.7.tokenAnyDepth', empty: 'ddd5.7.tokenNoDepth' },
    () => fillCopy('ddd5.7.tokenDepth', { depths: orList([...scenario.depth].sort((a, b) => a - b).map(String)) }),
  );
}

/** The density token: `any density`, `no sediment density selected`, or `density {densities}`, in dictionary order. */
function densityToken({ scenario, manifest }: SummaryState): string {
  const dictionary = manifest.trialColumns.density;
  return groupToken(
    dictionary,
    scenario.density,
    { all: 'ddd5.7.tokenAnyDensity', empty: 'ddd5.7.tokenNoDensity' },
    () => {
      const densities = orList(dictionary.filter((d) => scenario.density.includes(d)));
      return fillCopy('ddd5.7.tokenDensity', { densities });
    },
  );
}

/**
 * The window token: `slip: any` in slip mode with no window; `slip
 * {min}–{max} m` from the effective endpoints; in offset mode `offset
 * 0–{X} m (converted to slip per dip)`, `{X}` the accepted offset maximum.
 */
function windowToken({ scenario }: SummaryState): string {
  const w = scenario.window;
  if (w.mode === 'offset') return fillCopy('ddd5.7.tokenOffsetWindow', { X: w.offsetMax });
  if (w.min === null) return copyText('ddd5.7.tokenSlipAny');
  return fillCopy('ddd5.7.tokenSlipWindow', { min: w.min, max: w.max });
}

/**
 * The population token: `all stages in window` with an active window,
 * `all recorded stages` in slip mode with no window, `one state per
 * simulation trial` for the one-state population.
 */
function populationToken({ scenario }: SummaryState): string {
  if (scenario.population === 'one_state_per_trial') return copyText('ddd5.7.tokenOneState');
  const w = scenario.window;
  return w.mode === 'slip' && w.min === null
    ? copyText('ddd5.7.tokenAllRecordedStages')
    : copyText('ddd5.7.tokenAllStagesInWindow');
}

/**
 * The scarp-filter token: `all scarp types (no filter)`, `no resulting
 * scarp type selected`, or `scarp type {classes}`, in canonical order.
 */
function scarpToken({ scenario, manifest }: SummaryState): string {
  const classes = manifest.scarpClasses;
  return groupToken(
    classes,
    scenario.scarpClass,
    { all: 'ddd5.7.tokenAllScarpTypes', empty: 'ddd5.7.tokenNoScarpType' },
    () => {
      const selected = orList(classes.filter((c) => scenario.scarpClass.includes(c)));
      return fillCopy('ddd5.7.tokenScarpType', { classes: selected });
    },
  );
}

/** Tokens joined with ` · `, the first character upper-cased (§5.7). */
function joinTokens(tokens: readonly string[]): string {
  const text = tokens.join(copyText('ddd5.7.summaryJoiner'));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The settings tokens, in the PDD §3 order: dip, sediment, depth, density, window. */
function settingsTokens(state: SummaryState): string[] {
  return [dipToken(state), sedimentToken(state), depthToken(state), densityToken(state), windowToken(state)];
}

/**
 * The one-line scenario summary of `#gre-summary` (§5.7): the tokens in
 * the PDD §3 order — dip, sediment, depth, density, window, population,
 * scarp filter, matching records — joined with ` · `, the first character
 * upper-cased; the count `counts.matchingRecords` through `formatCount`.
 */
export function summaryText(state: SummaryState, counts: SummaryCounts): string {
  return joinTokens([
    ...settingsTokens(state),
    populationToken(state),
    scarpToken(state),
    fillCopy('ddd5.7.tokenCount', { count: formatCount(counts.matchingRecords) }),
  ]);
}

/**
 * The summary without the population and count tokens — the "settings
 * portion" of PDD §6.2 (§5.7): dip, sediment, depth, density, window,
 * scarp filter, joined and upper-cased as the summary is.
 */
export function settingsText(state: SummaryState): string {
  return joinTokens([...settingsTokens(state), scarpToken(state)]);
}

/** The population token alone (§5.7). */
export function populationText(state: SummaryState): string {
  return populationToken(state);
}

// --------------------------------------------------------------------
// The chart caption (§5.11)
// --------------------------------------------------------------------

/** The configuration `chartSummary` reads: callers pass the `config.ts` module namespace. */
export type ChartSummaryConfig = Pick<typeof Config, 'displayDecimals'>;

/**
 * The caption sentence (§5.11): "{label}: {N} valid measurements, median
 * {median}, 16th–84th percentile range {p16} to {p84}." — the three
 * statistics as quantities at the measurement's D-23 decimals, N
 * `formatCount(counts.valid)`, never inferred from `stats`. `counts` is
 * the same result's `Selection.perMeasurement[measurement]`. Called only
 * for a drawn chart, where `stats` is non-null; the cumulative accuracy
 * paragraph is the panel applier's, never part of this sentence.
 */
export function chartSummary(
  stats: Stats,
  counts: MeasurementCounts,
  measurement: MeasurementName,
  cfg: ChartSummaryConfig,
): string {
  const dd = cfg.displayDecimals(measurement);
  return fillCopy('ddd5.11.chartCaption', {
    label: measurementLabel(measurement),
    N: formatCount(counts.valid),
    median: quantityText(stats.median, measurement, dd),
    p16: quantityText(stats.p16, measurement, dd),
    p84: quantityText(stats.p84, measurement, dd),
  });
}
