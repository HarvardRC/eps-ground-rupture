// The calculation-parity harness (docs/app/ddd.md §7.2), run under Node
// by the Gradle task `webappParity` — the npm script `parity`,
// `node build.mjs --tests && node build/test/parity.js` (§2). It replays
// the pipeline's reference results (§3.6) through the application's real
// modules and never computes an expected value: every expected number,
// string, bound, and selection is read from the reference-results file.
//
// 1. Fetch and verify: every file the committed pointer names, by a plain
//    HTTPS GET of its release asset, into build/parity/<data_tag>/, a
//    cached file reused when its SHA-256 matches (rule `fetch`).
// 2. Load and pair: `decodeVintage`, `loadRegression` through the
//    harness's own `fetch`, `parseReferences`; rules `pairing`,
//    `D-23 transcription`, and `PDD §4.1 transcription`.
// 3. Golden scenarios, the GS-0 self-check first (test/parity-self-check.ts).
// 4. Boundary cases.
// 5. Synthetic cases, each ensemble built through test/fixtures.ts.
//
// Report (§7.2): agreement prints nothing; each difference prints one
// `difference:` line naming the case, the quantity, both values, and the
// rule; the exit status is non-zero exactly when a difference line was
// printed — or when the harness itself fails, which prints a
// `parity: error:` line instead.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

import { displayDecimals, logScaleMinDecades, logScaleOfferRatio } from '../src/config';
import { convertWindows, rangeFlag, type RangeFlag } from '../src/convert/convert';
import { decodeVintage, loadRegression, parseReferences, type Vintage } from '../src/decode/decode';
import {
  POINTER_FIELDS,
  mapRecord,
  type Pointer,
  type ReferenceConvertedWindow,
  type ReferenceCounts,
  type ReferenceDisplay,
  type ReferenceHistogram,
  type ReferenceHistogramLog,
  type ReferenceScenario,
  type ReferenceSelection,
  type ReferenceStatistics,
  type ReferenceWindows,
  type References,
} from '../src/decode/fields';
import { query, storedBounds, type PerDipWindows, type Selection } from '../src/engine/query';
import { storedBoundsFromDecimal } from '../src/state/parse';
import { parseScenario, serializeScenario } from '../src/state/scenario-json';
import { MEASUREMENT_NAMES, type MeasurementName } from '../src/state/state';
import { histogram, histogramLog, type Histogram, type HistogramLog } from '../src/stats/histogram';
import { quantileLinear } from '../src/stats/quantile';
import { restoredAscending, summarize, validValues, type Stats, type ValidValues } from '../src/stats/stats';
import { displayRound } from '../src/views/format';
import { buildFixture, expectationOf, fileReader, jsonBytes } from './fixtures';
import { SELF_CHECK_PASSED_LINE, selfCheck, type FoundDifference } from './parity-self-check';

// --------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------

/** The web application module's directory: build/test/parity.js lives two levels below it. */
const WEBAPP_DIR = fileURLToPath(new URL('../../', import.meta.url));

/** The committed pointer manifest (§3.3). */
const POINTER_PATH = join(WEBAPP_DIR, 'data', 'pointer.json');

/** The release-asset URL of a vintage file (§7.2 step 1). */
function assetUrl(dataTag: string, name: string): string {
  return `https://github.com/HarvardRC/eps-ground-rupture/releases/download/${dataTag}/${name}`;
}

/** The manifest schema versions the page supports (§5.2 step 1). */
const SCHEMA_VERSIONS: readonly number[] = [1];

/** The four (`id`, `stages_per_trial`) pairs `synthetic.ensembles` holds, in that order (§3.6). */
const REQUIRED_ENSEMBLES: readonly (readonly [string, number])[] = [
  ['stages-2', 2],
  ['stages-100', 100],
  ['stages-101', 101],
  ['stages-102', 102],
];

/** The divisor D of a synthetic statistics case's `decimals` (§3.6, generator step 3): literals. */
const STATISTICS_DIVISORS: { readonly [decimals: number]: number } = { 3: 1000, 4: 10000 };

/** The divisor of the 0.001 recording steps of a synthetic histogram case (§3.6). */
const HISTOGRAM_DIVISOR = 1000;

/** The FR-O2 statistics in the member order of the §3.6 `statistics` record. */
const STAT_KEYS = ['median', 'p16', 'p84', 'min', 'max', 'mean', 'sd'] as const;

/** The quantities whose decimals rule `D-23 transcription` checks (§7.2 step 2). */
const DECIMAL_QUANTITIES = ['slip', 'scarp_height', 'dzw', 'scarp_dip'] as const;

/** The `selection` bound of §3.6: identities up to this many records, a signature above. */
const IDENTITY_LIMIT = 10000;

/** The §7.1 tolerance: |app − reference| ≤ 1e-9 · max(|reference|, 1e-3). */
function withinTolerance(app: number, reference: number): boolean {
  return Math.abs(app - reference) <= 1e-9 * Math.max(Math.abs(reference), 1e-3);
}

// --------------------------------------------------------------------
// Differences and the report
// --------------------------------------------------------------------

/** The rules of §7.2, Report. */
type Rule =
  | 'fetch'
  | 'pairing'
  | 'D-23 transcription'
  | 'PDD §4.1 transcription'
  | 'inputs-roundtrip'
  | 'self-check'
  | 'presence'
  | 'exact'
  | 'tolerance'
  | 'display';

/** A value already written for the report, printed as is. */
class Text {
  constructor(readonly text: string) {}
}

interface Difference {
  readonly caseId: string;
  readonly quantity: string;
  readonly app: unknown;
  readonly reference: unknown;
  readonly rule: Rule;
}

/** A value as the report prints it: numbers shortest round-trip (−0 kept), the rest as JSON. */
function show(v: unknown): string {
  if (v instanceof Text) return v.text;
  if (v === undefined) return 'absent';
  if (typeof v === 'number') return Object.is(v, -0) ? '-0' : String(v);
  return JSON.stringify(v);
}

function differenceLine(d: Difference): string {
  return (
    `difference: case=${d.caseId} quantity=${d.quantity} ` +
    `app=${show(d.app)} reference=${show(d.reference)} rule=${d.rule}`
  );
}

/** The run's report: difference lines as they are found, then diagnostics and summaries. */
class Report {
  differenceCount = 0;

  difference(d: Difference): void {
    this.differenceCount++;
    console.log(differenceLine(d));
  }

  all(ds: readonly Difference[]): void {
    for (const d of ds) this.difference(d);
  }

  line(text: string): void {
    console.log(text);
  }
}

/** Structural equality of JSON-shaped values, object key order ignored. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') return Number.isNaN(a) && Number.isNaN(b);
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  }
  const ka = Object.keys(a as object).sort();
  const kb = Object.keys(b as object).sort();
  return (
    deepEqual(ka, kb) &&
    ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  );
}

/**
 * One comparison's differences for one case, by the rules of §7.2: presence
 * first, then exact, tolerance, and display. Tracks the largest
 * |app − reference| of its tolerance comparisons.
 */
class Comparator {
  readonly differences: Difference[] = [];
  largest = 0;

  constructor(readonly caseId: string) {}

  private add(quantity: string, app: unknown, reference: unknown, rule: Rule): void {
    this.differences.push({ caseId: this.caseId, quantity, app, reference, rule });
  }

  /**
   * Rule `presence`: true when both sides hold a value, so the member's
   * other rules apply; false when both are null, or when one is — then a
   * `presence` difference, before any other rule.
   */
  present(quantity: string, app: unknown, reference: unknown): boolean {
    const appNull = app === null || app === undefined;
    const referenceNull = reference === null || reference === undefined;
    if (appNull !== referenceNull) this.add(quantity, app, reference, 'presence');
    return !appNull && !referenceNull;
  }

  /** Rule `exact`. */
  exact(quantity: string, app: unknown, reference: unknown): void {
    if (!deepEqual(app, reference)) this.add(quantity, app, reference, 'exact');
  }

  /** Rule `tolerance` (§7.1). */
  tolerance(quantity: string, app: number, reference: number): void {
    const gap = Math.abs(app - reference);
    if (gap > this.largest || Number.isNaN(gap)) this.largest = gap;
    if (!withinTolerance(app, reference)) this.add(quantity, app, reference, 'tolerance');
  }

  /** Rule `display`. */
  display(quantity: string, app: string, reference: string): void {
    if (app !== reference) this.add(quantity, app, reference, 'display');
  }

  /** A difference under a step rule (`inputs-roundtrip`). */
  rule(quantity: string, app: unknown, reference: unknown, rule: Rule): void {
    this.add(quantity, app, reference, rule);
  }
}

// --------------------------------------------------------------------
// Shared comparisons
// --------------------------------------------------------------------

/** `counts` — every member exactly (§7.2 step 3). */
function compareCounts(cmp: Comparator, path: string, selection: Selection, reference: ReferenceCounts): void {
  cmp.exact(`${path}.matching_records`, selection.matchingRecords, reference.matchingRecords);
  cmp.exact(`${path}.unclassified`, selection.unclassified, reference.unclassified);
  for (const m of MEASUREMENT_NAMES) {
    const app = selection.perMeasurement[m];
    const ref = reference.perMeasurement[m];
    cmp.exact(`${path}.per_measurement.${m}.valid`, app.valid, ref.valid);
    cmp.exact(`${path}.per_measurement.${m}.excluded_null`, app.excludedNull, ref.excludedNull);
  }
}

/**
 * The `[trial, stage_index, class_code]` identity of global index i (§5.3,
 * Selection): trial-table row `floor(i / N)` named by the manifest's
 * `trials`, stage `i % N`, and the stored class code (255 unclassified).
 */
function identityOf(vintage: Vintage, n: number, i: number): [string, number, number] {
  return [vintage.manifest.trials[Math.floor(i / n)], i % n, vintage.scarpClass[i]];
}

/**
 * `selection` exactly (§3.6, Selection): the identities in artifact
 * order, or the SHA-256 signature and count. A differing identity list is
 * one difference, reported with both lengths and the first position where
 * the lists part.
 */
function compareSelection(
  cmp: Comparator,
  path: string,
  vintage: Vintage,
  n: number,
  selection: Selection,
  reference: ReferenceSelection,
): void {
  const { indices } = selection;
  if ('identities' in reference) {
    const expected = reference.identities;
    let at = -1;
    const length = Math.max(indices.length, expected.length);
    for (let k = 0; k < length; k++) {
      const app = k < indices.length ? identityOf(vintage, n, indices[k]) : null;
      if (!deepEqual(app, k < expected.length ? expected[k] : null)) {
        at = k;
        break;
      }
    }
    if (at >= 0) {
      const app = at < indices.length ? identityOf(vintage, n, indices[at]) : null;
      const ref = at < expected.length ? expected[at] : null;
      cmp.exact(
        `${path}.identities`,
        new Text(`${indices.length} identities, [${at}] ${JSON.stringify(app)}`),
        new Text(`${expected.length} identities, [${at}] ${JSON.stringify(ref)}`),
      );
    }
    return;
  }
  const lines: string[] = [];
  for (let k = 0; k < indices.length; k++) lines.push(identityOf(vintage, n, indices[k]).join(';'));
  const signature = createHash('sha256').update(lines.join('\n'), 'utf8').digest('hex');
  cmp.exact(`${path}.signature`, signature, reference.signature);
  cmp.exact(`${path}.count`, indices.length, reference.count);
}

/** One measurement's `statistics` record within the tolerance, `sd` presence first. */
function compareStatistics(cmp: Comparator, path: string, app: Stats | null, reference: ReferenceStatistics | null): void {
  if (!cmp.present(path, app, reference)) return;
  for (const key of STAT_KEYS) {
    const a = app![key];
    const r = reference![key];
    if (!cmp.present(`${path}.${key}`, a, r)) continue;
    cmp.tolerance(`${path}.${key}`, a as number, r as number);
  }
}

/** One measurement's 101 `percentiles` within the tolerance. */
function comparePercentiles(
  cmp: Comparator,
  path: string,
  app: readonly number[] | null,
  reference: readonly number[] | null,
): void {
  if (!cmp.present(path, app, reference)) return;
  cmp.exact(`${path}.length`, app!.length, reference!.length);
  const n = Math.min(app!.length, reference!.length);
  for (let q = 0; q < n; q++) cmp.tolerance(`${path}[${q}]`, app![q], reference![q]);
}

/** A linear histogram exactly: `rule`, `width_units`, `first_edge`, `bins`, the K × 6 `counts`. */
function compareHistogram(cmp: Comparator, path: string, app: Histogram | null, reference: ReferenceHistogram | null): void {
  if (!cmp.present(path, app, reference)) return;
  cmp.exact(`${path}.rule`, app!.rule, reference!.rule);
  cmp.exact(`${path}.width_units`, app!.widthUnits, reference!.widthUnits);
  cmp.exact(`${path}.first_edge`, app!.firstEdge, reference!.firstEdge);
  cmp.exact(`${path}.bins`, app!.bins, reference!.bins);
  cmp.exact(`${path}.counts`, app!.counts, reference!.counts);
}

/** A logarithmic histogram exactly: `first_edge`, `bins`, the K × 6 `counts`, the six `below_counts`. */
function compareHistogramLog(
  cmp: Comparator,
  path: string,
  app: HistogramLog | null,
  reference: ReferenceHistogramLog | null,
): void {
  if (!cmp.present(path, app, reference)) return;
  cmp.exact(`${path}.first_edge`, app!.firstEdge, reference!.firstEdge);
  cmp.exact(`${path}.bins`, app!.bins, reference!.bins);
  cmp.exact(`${path}.counts`, app!.counts, reference!.counts);
  cmp.exact(`${path}.below_counts`, app!.belowCounts, reference!.belowCounts);
}

/** The percentiles of §3.6: `quantileLinear(v, q/100)` for q = 0 … 100, or null with no valid value. */
function percentilesOf(values: ValidValues): number[] | null {
  if (values.sorted.length === 0) return null;
  const out: number[] = [];
  for (let q = 0; q <= 100; q++) out.push(quantileLinear(values.sorted, q / 100));
  return out;
}

/** A dip-keyed `windows` map as `PerDipWindows` (§5.3): one entry per key, values unaltered, ascending. */
function perDipWindows(windows: ReferenceWindows): PerDipWindows {
  return Object.keys(windows)
    .map((key) => ({ faultDip: Number(key), lo: windows[key].lo, hi: windows[key].hi }))
    .sort((a, b) => a.faultDip - b.faultDip);
}

// --------------------------------------------------------------------
// Step 1 — fetch and verify
// --------------------------------------------------------------------

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** A pointer file name the cache directory can hold as one plain file. */
const PLAIN_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Downloads every pointer file into `dir`, reusing a cached file whose
 * SHA-256 matches, and verifies every SHA-256 (§7.2 step 1). Returns the
 * verified bytes by name; each failure is a `fetch` difference.
 */
async function fetchAndVerify(pointer: Pointer, dir: string, report: Report): Promise<Map<string, Uint8Array>> {
  mkdirSync(dir, { recursive: true });
  const verified = new Map<string, Uint8Array>();
  const fail = (name: string, app: string, reference: string) =>
    report.difference({ caseId: 'pointer', quantity: `files.${name}`, app: new Text(app), reference: new Text(reference), rule: 'fetch' });

  for (const name of Object.keys(pointer.files)) {
    const expected = pointer.files[name];
    if (!PLAIN_NAME.test(name)) {
      fail(name, 'not a plain file name', `sha256 ${expected}`);
      continue;
    }
    const path = join(dir, name);
    if (existsSync(path)) {
      const cached = new Uint8Array(readFileSync(path));
      if (sha256Hex(cached) === expected) {
        verified.set(name, cached);
        continue;
      }
    }
    const url = assetUrl(pointer.dataTag, name);
    let bytes: Uint8Array;
    try {
      const response = await fetch(url, { redirect: 'follow' });
      if (response.status !== 200) {
        await response.body?.cancel();
        fail(name, `status ${response.status} from ${url}`, 'status 200');
        continue;
      }
      bytes = new Uint8Array(await response.arrayBuffer());
    } catch (e) {
      fail(name, `transport error from ${url}: ${e instanceof Error ? e.message : String(e)}`, 'status 200');
      continue;
    }
    const temporary = `${path}.part`;
    writeFileSync(temporary, bytes);
    renameSync(temporary, path);
    const actual = sha256Hex(bytes);
    if (actual !== expected) {
      fail(name, `sha256 ${actual}`, `sha256 ${expected}`);
      continue;
    }
    verified.set(name, bytes);
  }
  return verified;
}

/** The one pointer file name matching a role's §4.1 pattern, or null. */
function roleFile(pointer: Pointer, pattern: RegExp): string | null {
  const names = Object.keys(pointer.files).filter((name) => pattern.test(name));
  return names.length === 1 ? names[0] : null;
}

// --------------------------------------------------------------------
// Step 2 — load and pair
// --------------------------------------------------------------------

/**
 * Installs the harness's own `fetch` for this process (§7.2 step 2): a
 * `file:` URL inside the verified directory naming a verified file is
 * answered with `new Response(<bytes>)`; every other URL is rejected.
 */
function installFetch(dir: string, verified: ReadonlyMap<string, Uint8Array>): void {
  const harnessFetch = async (input: string | URL | { readonly url: string }): Promise<Response> => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(href);
    if (url.protocol === 'file:') {
      const path = fileURLToPath(url);
      const name = path.slice(dir.length + 1);
      const bytes = verified.get(name);
      if (dirname(path) === dir && bytes !== undefined) {
        return new Response(bytes);
      }
    }
    throw new TypeError(`parity: the harness fetch refuses ${href}`);
  };
  globalThis.fetch = harnessFetch as typeof fetch;
}

// --------------------------------------------------------------------
// Step 3 — golden scenarios
// --------------------------------------------------------------------

/** The application's results for one golden scenario: the production sequence of §5.3. */
interface ScenarioResult {
  readonly selection: Selection;
  readonly stats: { readonly [m in MeasurementName]: Stats | null };
  readonly percentiles: { readonly [m in MeasurementName]: number[] | null };
  readonly histogram: { readonly [m in MeasurementName]: Histogram | null };
  readonly histogramLog: HistogramLog | null;
  /** Offset mode: per selected dip, ascending, its converted window and range flag; slip mode null. */
  readonly windows: readonly { faultDip: number; lo: number; hi: number; flag: RangeFlag }[] | null;
}

interface Run {
  readonly vintage: Vintage;
  readonly references: References;
  readonly coefficients: readonly { faultDip: number; slope: number; intercept: number }[];
  readonly report: Report;
}

/**
 * The scheduler's production sequence (§5.3 item 2; §7.2 step 3): in
 * offset mode `convertWindows` for every modeled dip and `rangeFlag` of
 * each selected dip against the manifest's `slip_window_bounds`; `query`;
 * per measurement `validValues`, `summarize`, `quantileLinear` for
 * q = 0 … 100, and `histogram` at the configured D-23 decimals; for `dzw`
 * also `histogramLog` with `logScaleOfferRatio()`.
 */
function runScenario(run: Run, scenario: ReturnType<typeof parseScenario>): ScenarioResult {
  const { vintage } = run;
  const { manifest } = vintage;
  let converted: PerDipWindows | undefined;
  let windows: ScenarioResult['windows'] = null;
  if (scenario.window.mode === 'offset') {
    converted = convertWindows(Number(scenario.window.offsetMax), manifest.trialColumns.fault_dip, run.coefficients);
    const selected = [...scenario.faultDip].sort((a, b) => a - b);
    windows = selected.map((dip) => {
      const w = converted!.find((entry) => entry.faultDip === dip);
      if (w === undefined) throw new Error(`parity: no converted window for selected dip ${dip}`);
      return { faultDip: dip, lo: w.lo, hi: w.hi, flag: rangeFlag(w, manifest.slipWindowBounds) };
    });
  }
  const selection = query(vintage, scenario, converted);
  const stats = {} as { [m in MeasurementName]: Stats | null };
  const percentiles = {} as { [m in MeasurementName]: number[] | null };
  const histograms = {} as { [m in MeasurementName]: Histogram | null };
  let log: HistogramLog | null = null;
  for (const m of MEASUREMENT_NAMES) {
    const values = validValues(vintage, selection, m);
    stats[m] = summarize(values);
    percentiles[m] = percentilesOf(values);
    histograms[m] = histogram(values.steps, values.classes, values.sorted, displayDecimals(m));
    if (m === 'dzw') log = histogramLog(values.steps, values.classes, logScaleOfferRatio());
  }
  return { selection, stats, percentiles, histogram: histograms, histogramLog: log, windows };
}

/** The display strings of one measurement's statistics at `decimals`, or null with no statistics. */
function displayOf(stats: Stats | null, decimals: number): { [k in (typeof STAT_KEYS)[number]]: string | null } | null {
  if (stats === null) return null;
  const out = {} as { [k in (typeof STAT_KEYS)[number]]: string | null };
  for (const key of STAT_KEYS) {
    const v = stats[key];
    out[key] = v === null ? null : displayRound(v, decimals);
  }
  return out;
}

/**
 * Compares one golden scenario's results with a reference entry (§7.2
 * step 3): presence first; exactly the counts, the selection, the range
 * flags, the diagnosed conditions, and the histograms; within the
 * tolerance the statistics, percentiles, and converted windows; as
 * strings the display entries and the converted windows' display ends,
 * each `displayRound` of the application's value at the envelope's
 * `display_decimals`.
 */
function compareScenario(cmp: Comparator, run: Run, app: ScenarioResult, ref: ReferenceScenario): void {
  const { vintage, references } = run;
  const decimals = references.displayDecimals;
  const n = vintage.manifest.counts.stagesPerTrial;

  // Exactly.
  compareCounts(cmp, 'counts', app.selection, ref.counts);
  compareSelection(cmp, 'selection', vintage, n, app.selection, ref.selection);
  type AppWindows = NonNullable<ScenarioResult['windows']>;
  const windowPairs: readonly [AppWindows, readonly ReferenceConvertedWindow[]] | null = cmp.present(
    'converted_windows',
    app.windows,
    ref.convertedWindows,
  )
    ? [app.windows!, ref.convertedWindows!]
    : null;
  if (windowPairs !== null) {
    const [a, r] = windowPairs;
    cmp.exact('converted_windows.length', a.length, r.length);
    for (let k = 0; k < Math.min(a.length, r.length); k++) {
      cmp.exact(`converted_windows[${k}].fault_dip`, a[k].faultDip, r[k].faultDip);
      cmp.exact(`converted_windows[${k}].range_flag`, a[k].flag, r[k].rangeFlag);
    }
  }
  if (cmp.present('diagnosed_conditions', app.selection.diagnosedConditions, ref.diagnosedConditions)) {
    cmp.exact('diagnosed_conditions', app.selection.diagnosedConditions, ref.diagnosedConditions);
  }
  for (const m of MEASUREMENT_NAMES) {
    compareHistogram(cmp, `histogram.${m}`, app.histogram[m], ref.histogram[m]);
  }
  compareHistogramLog(cmp, 'histogram_log.dzw', app.histogramLog, ref.histogramLog.dzw);

  // Within the tolerance.
  for (const m of MEASUREMENT_NAMES) {
    compareStatistics(cmp, `statistics.${m}`, app.stats[m], ref.statistics[m]);
    comparePercentiles(cmp, `percentiles.${m}`, app.percentiles[m], ref.percentiles[m]);
  }
  if (windowPairs !== null) {
    const [a, r] = windowPairs;
    for (let k = 0; k < Math.min(a.length, r.length); k++) {
      cmp.tolerance(`converted_windows[${k}].window_lo`, a[k].lo, r[k].windowLo);
      cmp.tolerance(`converted_windows[${k}].window_hi`, a[k].hi, r[k].windowHi);
    }
  }

  // As strings.
  for (const m of MEASUREMENT_NAMES) {
    const path = `display.${m}`;
    const appDisplay = displayOf(app.stats[m], decimals[m]);
    const refDisplay: ReferenceDisplay | null = ref.display[m];
    if (!cmp.present(path, appDisplay, refDisplay)) continue;
    for (const key of STAT_KEYS) {
      const a = appDisplay![key];
      const r = refDisplay![key];
      if (!cmp.present(`${path}.${key}`, a, r)) continue;
      cmp.display(`${path}.${key}`, a!, r!);
    }
  }
  if (windowPairs !== null) {
    const [a, r] = windowPairs;
    for (let k = 0; k < Math.min(a.length, r.length); k++) {
      cmp.display(`converted_windows[${k}].window_lo_display`, displayRound(a[k].lo, decimals.slip), r[k].windowLoDisplay);
      cmp.display(`converted_windows[${k}].window_hi_display`, displayRound(a[k].hi, decimals.slip), r[k].windowHiDisplay);
    }
  }
}

/**
 * The perturbed copy of the GS-0 entry (§7.2 step 3):
 * `counts.matching_records` plus 1, `statistics.scarp_height.median`
 * multiplied by 1 + 1e-6, and the last digit of
 * `display.scarp_height.median` incremented modulo 10.
 */
function perturbed(entry: ReferenceScenario): ReferenceScenario {
  const copy = JSON.parse(JSON.stringify(entry)) as {
    counts: { matchingRecords: number };
    statistics: { scarp_height: { median: number } };
    display: { scarp_height: { median: string } };
  };
  copy.counts.matchingRecords += 1;
  copy.statistics.scarp_height.median *= 1 + 1e-6;
  const text = copy.display.scarp_height.median;
  const last = Number(text.charAt(text.length - 1));
  if (!/[0-9]$/.test(text)) throw new Error(`parity: GS-0 display.scarp_height.median ${text} ends in no digit`);
  copy.display.scarp_height.median = text.slice(0, -1) + String((last + 1) % 10);
  return copy as unknown as ReferenceScenario;
}

function selfCheckDifference(d: FoundDifference, kind: 'missing' | 'extra'): Difference {
  return {
    caseId: d.caseId,
    quantity: d.quantity,
    app: new Text(kind === 'missing' ? 'not reported' : `reported under rule ${d.rule}`),
    reference: new Text(kind === 'missing' ? `injected under rule ${d.rule}` : 'not injected'),
    rule: 'self-check',
  };
}

function goldenScenarios(run: Run, summaries: string[]): void {
  const { vintage, references, report } = run;
  const gs0 = references.scenarios.find((entry) => entry.id === 'GS-0');
  if (gs0 === undefined) {
    // No GS-0 entry: nothing was injected, so every injected difference is missing.
    const { missing } = selfCheck([]);
    report.all(missing.map((d) => selfCheckDifference(d, 'missing')));
  }
  for (const entry of references.scenarios) {
    const cmp = new Comparator(entry.id);
    let scenario: ReturnType<typeof parseScenario>;
    try {
      scenario = parseScenario(entry.inputs, vintage.manifest);
    } catch (e) {
      cmp.rule('inputs', new Text(`rejected: ${e instanceof Error ? e.message : String(e)}`), entry.inputs, 'inputs-roundtrip');
      report.all(cmp.differences);
      summaries.push(`summary: ${entry.id}: not replayed, inputs rejected`);
      continue;
    }
    const roundTrip: unknown = JSON.parse(serializeScenario(scenario, vintage.manifest));
    if (!deepEqual(roundTrip, entry.inputs)) cmp.rule('inputs', roundTrip, entry.inputs, 'inputs-roundtrip');

    const app = runScenario(run, scenario);
    if (entry.id === 'GS-0') {
      const injected = new Comparator(entry.id);
      compareScenario(injected, run, app, perturbed(entry));
      const { missing, extra } = selfCheck(injected.differences);
      if (missing.length === 0 && extra.length === 0) {
        report.line(SELF_CHECK_PASSED_LINE);
      } else {
        report.all([
          ...missing.map((d) => selfCheckDifference(d, 'missing')),
          ...extra.map((d) => selfCheckDifference(d, 'extra')),
        ]);
      }
    }
    compareScenario(cmp, run, app, entry);
    report.all(cmp.differences);
    report.line(`diagnostic: ${entry.id} largest |app - reference| = ${show(cmp.largest)}`);
    summaries.push(`summary: ${entry.id}: replayed, ${cmp.differences.length} differences`);
  }
}

// --------------------------------------------------------------------
// Step 4 — boundary cases
// --------------------------------------------------------------------

function boundaryCases(run: Run, summaries: string[]): void {
  const { vintage, references, report } = run;
  const { manifest } = vintage;
  const n = manifest.counts.stagesPerTrial;
  const scale = manifest.columns.slip.scale;
  if (scale === null) throw new Error('parity: the manifest gives columns.slip no scale');
  let count = 0;
  let differences = 0;
  for (const c of references.boundaryCases) {
    const cmp = new Comparator(c.id);
    const scenario = parseScenario(c.inputs, manifest);
    let windows: PerDipWindows | undefined;
    if (c.windows !== null) {
      windows = perDipWindows(c.windows);
      for (const w of windows) {
        const key = String(w.faultDip);
        cmp.exact(`expected.stored_bounds.${key}`, storedBounds(w.lo, w.hi, scale), c.expected.storedBounds[key]);
      }
    } else {
      const slipWindow = (c.inputs as { slip_window?: { min?: unknown; max?: unknown } | null }).slip_window;
      if (slipWindow == null || typeof slipWindow.min !== 'string' || typeof slipWindow.max !== 'string') {
        throw new Error(`parity: boundary case ${c.id} has neither windows nor slip_window strings`);
      }
      const bounds = storedBoundsFromDecimal(slipWindow.min, slipWindow.max);
      for (const key of Object.keys(c.expected.storedBounds)) {
        cmp.exact(`expected.stored_bounds.${key}`, bounds, c.expected.storedBounds[key]);
      }
    }
    const selection = query(vintage, scenario, windows);
    compareCounts(cmp, 'expected.counts', selection, c.expected.counts);
    compareSelection(cmp, 'expected.selection', vintage, n, selection, c.expected.selection);
    report.all(cmp.differences);
    differences += cmp.differences.length;
    count++;
  }
  summaries.push(`summary: boundary_cases: ${count} cases replayed, ${differences} differences`);
}

// --------------------------------------------------------------------
// Step 5 — synthetic cases
// --------------------------------------------------------------------

async function syntheticEnsembles(run: Run, summaries: string[]): Promise<void> {
  const { references, report } = run;
  const { ensembles } = references.synthetic;
  const pairs = ensembles.map((e) => [e.id, e.stagesPerTrial]);
  if (!deepEqual(pairs, REQUIRED_ENSEMBLES)) {
    report.difference({
      caseId: 'synthetic.ensembles',
      quantity: '(id,stages_per_trial)',
      app: REQUIRED_ENSEMBLES,
      reference: pairs,
      rule: 'exact',
    });
  }
  for (const ensemble of ensembles) {
    const n = ensemble.stagesPerTrial;
    const fixture = await buildFixture(ensemble);
    const vintage = await decodeVintage(
      jsonBytes(fixture.manifest),
      fileReader(fixture.files).readFile,
      expectationOf(fixture),
    );
    let differences = 0;
    for (const c of ensemble.cases) {
      const cmp = new Comparator(c.id);
      const scenario = parseScenario(c.inputs, vintage.manifest);
      const windows = c.windows === null ? undefined : perDipWindows(c.windows);
      const selection = query(vintage, scenario, windows);
      compareCounts(cmp, 'expected.counts', selection, c.expected.counts);
      compareSelection(cmp, 'expected.selection', vintage, n, selection, c.expected.selection);
      if (cmp.present('expected.diagnosed_conditions', selection.diagnosedConditions, c.expected.diagnosedConditions)) {
        cmp.exact('expected.diagnosed_conditions', selection.diagnosedConditions, c.expected.diagnosedConditions);
      }
      for (const m of MEASUREMENT_NAMES) {
        const stats = summarize(validValues(vintage, selection, m));
        compareStatistics(cmp, `expected.statistics.${m}`, stats, c.expected.statistics[m]);
      }
      report.all(cmp.differences);
      differences += cmp.differences.length;
    }
    summaries.push(`summary: ${ensemble.id}: ${ensemble.cases.length} cases replayed, ${differences} differences`);
  }
}

/** A group's summary line, its cases replayed and its differences. */
function groupSummary(group: string, cases: number, differences: number): string {
  return `summary: ${group}: ${cases} cases replayed, ${differences} differences`;
}

function syntheticGroups(run: Run, summaries: string[]): void {
  const { references, report } = run;
  const { synthetic } = references;

  // `statistics`: summarize and quantileLinear.
  let differences = 0;
  for (const c of synthetic.statistics) {
    const cmp = new Comparator(c.id);
    const divisor = STATISTICS_DIVISORS[c.decimals];
    if (divisor === undefined) throw new Error(`parity: statistics case ${c.id}: decimals ${c.decimals}`);
    const steps = Int32Array.from(c.steps);
    const values: ValidValues = {
      steps,
      classes: new Uint8Array(steps.length),
      divisor,
      sorted: restoredAscending(steps, divisor),
    };
    compareStatistics(cmp, 'expected.statistics', summarize(values), c.expected.statistics);
    comparePercentiles(cmp, 'expected.percentiles', percentilesOf(values), c.expected.percentiles);
    report.all(cmp.differences);
    differences += cmp.differences.length;
  }
  summaries.push(groupSummary('synthetic.statistics', synthetic.statistics.length, differences));

  // `histograms`: histogram, and histogramLog when display_decimals is 1.
  differences = 0;
  for (const c of synthetic.histograms) {
    const cmp = new Comparator(c.id);
    const steps = Int32Array.from(c.steps);
    const classes = Uint8Array.from(c.classCodes);
    const sorted = restoredAscending(steps, HISTOGRAM_DIVISOR);
    compareHistogram(cmp, 'expected.histogram', histogram(steps, classes, sorted, c.displayDecimals), c.expected.histogram);
    const log = c.displayDecimals === 1 ? histogramLog(steps, classes, logScaleOfferRatio()) : null;
    compareHistogramLog(cmp, 'expected.histogram_log', log, c.expected.histogramLog);
    report.all(cmp.differences);
    differences += cmp.differences.length;
  }
  summaries.push(groupSummary('synthetic.histograms', synthetic.histograms.length, differences));

  // `display_rounding`: displayRound.
  differences = 0;
  for (const c of synthetic.displayRounding) {
    const cmp = new Comparator(c.id);
    cmp.display('expected', displayRound(c.value, c.decimals), c.expected);
    report.all(cmp.differences);
    differences += cmp.differences.length;
  }
  summaries.push(groupSummary('synthetic.display_rounding', synthetic.displayRounding.length, differences));

  // `conversion`: convertWindows and rangeFlag with the case's bounds.
  differences = 0;
  for (const c of synthetic.conversion) {
    const cmp = new Comparator(c.id);
    const windows = convertWindows(
      Number(c.offsetMax),
      c.coefficients.map((row) => row.faultDip),
      c.coefficients,
    );
    const expected = c.expected.convertedWindows;
    if (cmp.present('expected.converted_windows', windows, expected)) {
      cmp.exact('expected.converted_windows.length', windows.length, expected!.length);
      for (let k = 0; k < Math.min(windows.length, expected!.length); k++) {
        const path = `expected.converted_windows[${k}]`;
        cmp.exact(`${path}.fault_dip`, windows[k].faultDip, expected![k].faultDip);
        cmp.exact(`${path}.range_flag`, rangeFlag(windows[k], c.slipWindowBounds), expected![k].rangeFlag);
        cmp.tolerance(`${path}.window_lo`, windows[k].lo, expected![k].windowLo);
        cmp.tolerance(`${path}.window_hi`, windows[k].hi, expected![k].windowHi);
      }
    }
    report.all(cmp.differences);
    differences += cmp.differences.length;
  }
  summaries.push(groupSummary('synthetic.conversion', synthetic.conversion.length, differences));
}

// --------------------------------------------------------------------
// The run
// --------------------------------------------------------------------

async function main(): Promise<number> {
  const report = new Report();
  const pointer = mapRecord(JSON.parse(readFileSync(POINTER_PATH, 'utf8')), POINTER_FIELDS, 'pointer') as unknown as Pointer;

  // Step 1.
  const dir = join(WEBAPP_DIR, 'build', 'parity', pointer.dataTag);
  const verified = await fetchAndVerify(pointer, dir, report);
  const manifestName = roleFile(pointer, /^manifest-[0-9a-f]{12}\.json$/);
  const referencesName = roleFile(pointer, /^references-[0-9a-f]{12}\.json\.gz$/);
  for (const [role, name] of [
    ['manifest-<h12>.json', manifestName],
    ['references-<h12>.json.gz', referencesName],
  ] as const) {
    if (name === null) {
      report.difference({
        caseId: 'pointer',
        quantity: `files.${role}`,
        app: new Text('no single file of this role'),
        reference: new Text('exactly one'),
        rule: 'fetch',
      });
    }
  }
  if (report.differenceCount > 0) return 1;

  // Step 2.
  const vintage = await decodeVintage(
    verified.get(manifestName!)!,
    async (name) => {
      const bytes = verified.get(name);
      if (bytes === undefined) throw new Error(`parity: ${name} is not a verified pointer file`);
      return bytes;
    },
    { exportVersion: pointer.exportVersion, schemaVersions: SCHEMA_VERSIONS },
  );
  installFetch(dir, verified);
  const regression = await loadRegression(
    pathToFileURL(join(dir, vintage.manifest.files.regressionExport)),
    pointer.exportVersion,
  );
  const references = parseReferences(new Uint8Array(gunzipSync(verified.get(referencesName!)!)));

  const envelope = (quantity: string, app: unknown, reference: unknown, rule: Rule) => {
    if (!deepEqual(app, reference)) report.difference({ caseId: 'envelope', quantity, app, reference, rule });
  };
  envelope('reference_version', vintage.manifest.referenceResultsVersion, references.referenceVersion, 'pairing');
  envelope('export_version', vintage.manifest.exportVersion, references.exportVersion, 'pairing');
  for (const m of DECIMAL_QUANTITIES) {
    envelope(`display_decimals.${m}`, displayDecimals(m), references.displayDecimals[m], 'D-23 transcription');
  }
  envelope('log_scale_min_decades', logScaleMinDecades(), references.logScaleMinDecades, 'PDD §4.1 transcription');

  const run: Run = { vintage, references, coefficients: regression.coefficients, report };
  const summaries: string[] = [];

  // Steps 3 to 5.
  goldenScenarios(run, summaries);
  boundaryCases(run, summaries);
  await syntheticEnsembles(run, summaries);
  syntheticGroups(run, summaries);

  for (const line of summaries) report.line(line);
  return report.differenceCount > 0 ? 1 : 0;
}

main().then(
  (status) => {
    process.exitCode = status;
  },
  (e: unknown) => {
    console.log(`parity: error: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
    process.exitCode = 2;
  },
);
