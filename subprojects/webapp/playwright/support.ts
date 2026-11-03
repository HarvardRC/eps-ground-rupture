// Shared helpers of the browser lane's functional specs (docs/app/ddd.md
// §7.5): the expected values read from the served tree, the instant-
// navigation probe, routing (held, aborted, and replaced responses), the
// live-region recorder, the test-only timer wrapper of Startup
// announcement ordering, scenario drives through the real controls, and
// download capture. Not a spec: the eleven specs import it.

import { expect, type Download, type Page, type Request, type Route, type TestInfo } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { BASE_PATH, BASE_URL } from '../playwright.config';
import { canonicalJson } from '../src/state/scenario-json';
import { defaultDisplayState, type DisplayState } from '../src/state/state';
import { sedimentLabel } from '../src/views/scenario-controls';
import { formatCount } from '../src/views/format';

export { BASE_PATH, BASE_URL };

// --------------------------------------------------------------------
// The served tree and its expected values (§7.5, Expected values)
// --------------------------------------------------------------------

export const WEBAPP_DIR = join(__dirname, '..');
export const SITE_DIR = join(WEBAPP_DIR, '..', 'mkdocs', 'site-preview');
export const DATA_DIR = join(SITE_DIR, 'assets', 'scenario', 'data');
export const DATA_URL = BASE_URL + 'assets/scenario/data/';
export const SCENARIO_URL = BASE_URL + 'scenario/';
/** The recovery key of the scenario page (§5.6): the prefix and the served pathname. */
export const RECOVERY_KEY = 'gre.reload-recovery.v1:' + BASE_PATH + 'scenario/';

const sha256 = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

export interface Pointer {
  readonly export_version: string;
  readonly files: { readonly [name: string]: string };
}

/** The committed pointer manifest (§3.3). */
export function pointer(): Pointer {
  return JSON.parse(readFileSync(join(WEBAPP_DIR, 'data', 'pointer.json'), 'utf8')) as Pointer;
}

/** The pointer entry whose name begins `prefix`. */
export function pointerName(prefix: string): string {
  const name = Object.keys(pointer().files).find((n) => n.startsWith(prefix));
  if (name === undefined) throw new Error(`support: the pointer names no ${prefix}* file`);
  return name;
}

/** The bytes of a served data file, re-verified against the pointer's SHA-256. */
export function servedData(name: string): Buffer {
  const bytes = readFileSync(join(DATA_DIR, name));
  const expected = pointer().files[name];
  if (expected === undefined) throw new Error(`support: ${name} is not in the pointer`);
  const actual = sha256(bytes);
  if (actual !== expected) throw new Error(`support: ${name} SHA-256 ${actual} differs from the pointer's ${expected}`);
  return bytes;
}

export type Inputs = {
  readonly density: readonly string[];
  readonly depth: readonly number[];
  readonly entry_mode: 'slip' | 'offset';
  readonly fault_dip: readonly number[];
  readonly offset_max: string | null;
  readonly population: 'all_stages' | 'one_state_per_trial';
  readonly scarp_class: readonly string[];
  readonly sediment: readonly { readonly sediment_strength: string; readonly set: string }[];
  readonly slip_window: { readonly min: string; readonly max: string } | null;
};

export type Counts = {
  readonly matching_records: number;
  readonly per_measurement: { readonly [m in Measurement]: { readonly excluded_null: number; readonly valid: number } };
  readonly unclassified: number;
};

export type Measurement = 'scarp_height' | 'dzw' | 'scarp_dip';
export const MEASUREMENTS: readonly Measurement[] = ['scarp_height', 'dzw', 'scarp_dip'];

export type Histogram = { readonly bins: number; readonly counts: readonly (readonly number[])[] };
export type HistogramLog = Histogram & { readonly below_counts: readonly number[] };

export interface GoldenScenario {
  readonly id: string;
  readonly inputs: Inputs;
  readonly counts: Counts;
  readonly display: { readonly [m in Measurement]: { readonly [stat: string]: string } | null };
  readonly histogram: { readonly [m in Measurement]: Histogram | null };
  readonly histogram_log: { readonly dzw: HistogramLog | null };
  readonly converted_windows:
    | readonly {
        readonly fault_dip: number;
        readonly range_flag: string;
        readonly window_lo_display: string;
        readonly window_hi_display: string;
      }[]
    | null;
  readonly diagnosed_conditions: readonly string[] | null;
}

export interface References {
  readonly export_version: string;
  readonly scenarios: readonly GoldenScenario[];
}

let references: References | null = null;

/** The pinned reference results (§3.6) from the served tree, SHA-256 re-verified against the pointer, gunzipped with node:zlib. */
export function reference(): References {
  if (references === null) {
    references = JSON.parse(gunzipSync(servedData(pointerName('references-'))).toString('utf8')) as References;
  }
  return references;
}

/** The reference golden scenario `id`. */
export function gs(id: string): GoldenScenario {
  const found = reference().scenarios.find((s) => s.id === id);
  if (found === undefined) throw new Error(`support: no reference scenario ${id}`);
  return found;
}

export interface ServedManifest {
  readonly export_version: string;
  readonly export_date: string;
  readonly files: { readonly field_export: string; readonly regression_export: string; readonly scenario_artifact: string };
  readonly slip_window_bounds: { readonly min: number; readonly max: number; readonly recording_step: number };
  readonly stage_spacing: { readonly mean: number };
  readonly scarp_classes: readonly string[];
  readonly scarp_class_palette: { readonly [cls: string]: string };
  readonly trial_columns: { readonly fault_dip: readonly number[]; readonly depth: readonly number[]; readonly density: readonly string[] };
  readonly arm_strength_states: readonly { readonly sediment_strength: string; readonly set: string }[];
}

/** The served artifact manifest (§3.2). */
export function manifest(): ServedManifest {
  return JSON.parse(servedData(pointerName('manifest-')).toString('utf8')) as ServedManifest;
}

/** The committed `CITATION.cff` version (§6.2). */
export function citationVersion(): string {
  const text = readFileSync(join(WEBAPP_DIR, '..', '..', 'CITATION.cff'), 'utf8');
  const line = /^version:\s*(\S+)\s*$/m.exec(text);
  if (line === null) throw new Error('support: CITATION.cff has no version line');
  return line[1];
}

// --------------------------------------------------------------------
// Page state
// --------------------------------------------------------------------

/** Waits for the mount's test hook `data-gre-mounted` (§6.1). */
export async function mounted(page: Page): Promise<void> {
  await page.locator('#gre-root[data-gre-mounted]').waitFor({ timeout: 30_000 });
}

/** Waits two animation frames and one zero-delay task in the page. */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((done) =>
        requestAnimationFrame(() => requestAnimationFrame(() => (window.__greOrig?.setTimeout ?? setTimeout)(() => done(), 0))),
      ),
  );
}

/** Direct entry into the scenario page, waiting for the mount. */
export async function gotoScenario(page: Page, hash = ''): Promise<void> {
  await page.goto('scenario/' + hash);
  await mounted(page);
}

/** The scenario summary's text. */
export const summaryText = (page: Page): Promise<string> => page.locator('#gre-summary').innerText();

/** The summary's count token for `n` (§5.7). */
export const countToken = (n: number): string => `matching records: ${formatCount(n)}`;

/** Waits until the summary names `n` matching records, then settles. */
export async function expectCount(page: Page, n: number): Promise<void> {
  await expect(page.locator('#gre-summary')).toContainText(countToken(n), { timeout: 30_000 });
  await settle(page);
}

// --------------------------------------------------------------------
// Instant navigation, proven (§7.5)
// --------------------------------------------------------------------

/** Sets `window.__greProbe = 1` before an instant step. */
export async function armProbe(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __greProbe?: number }).__greProbe = 1;
  });
}

/** Asserts the probe survived: no full page load happened. */
export async function expectProbe(page: Page): Promise<void> {
  expect(await page.evaluate(() => (window as unknown as { __greProbe?: number }).__greProbe)).toBe(1);
}

/** Waits until Material has emitted `document$` for the current page (its instant navigation is wired). */
export async function materialReady(page: Page): Promise<void> {
  await page.waitForFunction(() => typeof (window as unknown as { document$?: unknown }).document$ !== 'undefined');
  await page.waitForLoadState('load');
}

/**
 * The first instant entry into the scenario page (§7.5): from the home
 * page, inject `<a id="gre-test-entry" href="scenario/">` into
 * `.md-content__inner`, set the probe, click it, wait for `until`
 * (default: the mount), and assert the probe survived.
 */
export async function instantEntryFromHome(page: Page, until: 'mounted' | 'none' = 'mounted'): Promise<void> {
  await page.goto('');
  await materialReady(page);
  await page.evaluate(() => {
    const a = document.createElement('a');
    a.id = 'gre-test-entry';
    a.href = 'scenario/';
    a.textContent = 'Scenario (test entry)';
    document.querySelector('.md-content__inner')!.prepend(a);
  });
  await armProbe(page);
  await page.locator('#gre-test-entry').click();
  await page.waitForURL(SCENARIO_URL);
  if (until === 'mounted') await mounted(page);
  await expectProbe(page);
}

/** An instant step through a site link: probe set, click, URL reached, probe asserted. */
export async function instantClick(page: Page, selector: string, url: string): Promise<void> {
  await armProbe(page);
  await page.locator(selector).first().click();
  await page.waitForURL(url);
  await page.waitForLoadState('domcontentloaded');
  await expectProbe(page);
}

/** Leaves the scenario page by the Glossary nav link (instant), probe asserted. */
export async function leaveToGlossary(page: Page): Promise<void> {
  await instantClick(page, '.md-nav__link[href$="glossary/"]', BASE_URL + 'glossary/');
  await expect(page.locator('#gre-root')).toHaveCount(0);
}

/** Returns with `page.goBack()` (instant: Material handles popstate), probe asserted. */
export async function backToScenario(page: Page, until: 'mounted' | 'none' = 'mounted'): Promise<void> {
  await armProbe(page);
  await page.goBack();
  await page.waitForURL(SCENARIO_URL);
  await page.locator('#gre-root').waitFor();
  if (until === 'mounted') await mounted(page);
  await expectProbe(page);
}

// --------------------------------------------------------------------
// Routing (§7.5, Routing): held, aborted, and replaced responses
// --------------------------------------------------------------------

interface Hold {
  readonly arrived: Promise<void>;
  readonly released: Promise<void>;
  arrive(): void;
  release(): void;
  count: number;
}

function deferred(): { promise: Promise<void>; resolve(): void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** A file of a routed fixture vintage: its body and Content-Type. */
export interface Served {
  readonly body: Buffer | string;
  readonly contentType: string;
}

/**
 * One page's routes over the scenario page and `assets/scenario/`:
 * `hold(prefix)` holds every request for a data or bundle file whose name
 * begins `prefix` until `release`; `abort(prefix)` aborts them;
 * `fail404(prefix, n)` answers the next `n` of them with 404; `files`
 * serves fixture files by name; `html` rewrites the scenario page's HTML,
 * for direct and instant entries alike. Requests are counted by name.
 */
export class Net {
  readonly holds = new Map<string, Hold>();
  readonly aborts = new Set<string>();
  readonly notFound = new Map<string, number>();
  readonly files = new Map<string, Served>();
  readonly counts = new Map<string, number>();
  html: ((html: string) => string) | null = null;
  /** HTML served in place of the page's own (a replacement vintage's stamps). */
  htmlOverride: string | null = null;

  constructor(readonly page: Page) {}

  async install(): Promise<this> {
    await this.page.route(`${BASE_URL}assets/scenario/**`, (route) => this.asset(route));
    await this.page.route(SCENARIO_URL, (route) => this.scenario(route));
    return this;
  }

  private async asset(route: Route): Promise<void> {
    const name = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    this.counts.set(name, (this.counts.get(name) ?? 0) + 1);
    for (const [prefix, hold] of this.holds) {
      if (name.startsWith(prefix)) {
        hold.count++;
        hold.arrive();
        await hold.released;
      }
    }
    try {
      for (const prefix of this.aborts) if (name.startsWith(prefix)) return await route.abort();
      for (const [prefix, left] of this.notFound) {
        if (name.startsWith(prefix) && left > 0) {
          this.notFound.set(prefix, left - 1);
          return await route.fulfill({ status: 404, contentType: 'text/plain', body: 'not found' });
        }
      }
      const file = this.files.get(name);
      if (file !== undefined) return await route.fulfill({ status: 200, contentType: file.contentType, body: file.body });
      await route.fallback();
    } catch {
      // The page closed or navigated while the request was held.
    }
  }

  private async scenario(route: Route): Promise<void> {
    try {
      if (this.htmlOverride !== null) {
        return await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: this.htmlOverride });
      }
      if (this.html === null) return await route.fallback();
      const response = await route.fetch();
      const body = this.html(await response.text());
      const headers = { ...response.headers() };
      delete headers['content-encoding'];
      delete headers['content-length'];
      await route.fulfill({ status: response.status(), headers, body });
    } catch {
      // The page closed while the request was routed.
    }
  }

  /** Holds every request whose file name begins `prefix`. */
  hold(prefix: string): Hold {
    const arrived = deferred();
    const released = deferred();
    const hold: Hold = {
      arrived: arrived.promise,
      released: released.promise,
      arrive: arrived.resolve,
      release: () => {
        this.holds.delete(prefix);
        released.resolve();
      },
      count: 0,
    };
    this.holds.set(prefix, hold);
    return hold;
  }

  abort(prefix: string): void {
    this.aborts.add(prefix);
  }

  unabort(prefix: string): void {
    this.aborts.delete(prefix);
  }

  fail404(prefix: string, n = 1): void {
    this.notFound.set(prefix, n);
  }

  /** How often a file whose name begins `prefix` was requested. */
  requested(prefix: string): number {
    let n = 0;
    for (const [name, count] of this.counts) if (name.startsWith(prefix)) n += count;
    return n;
  }
}

/** Counts every request (routed or not) whose URL path ends in a file name beginning `prefix`. */
export function countRequests(page: Page, prefix: string): { readonly n: () => number; readonly urls: string[] } {
  const urls: string[] = [];
  page.on('request', (request: Request) => {
    const name = new URL(request.url()).pathname.split('/').pop() ?? '';
    if (name.startsWith(prefix)) urls.push(request.url());
  });
  return { n: () => urls.length, urls };
}

/** The scenario page HTML with `#gre-app`'s attribute `name` set to `value`, or removed when `value` is null. */
export function withAppAttribute(name: string, value: string | null): (html: string) => string {
  return (html) => {
    const tag = /<script[^>]*id="?gre-app"?[^>]*>/.exec(html);
    if (tag === null) throw new Error('support: the scenario page has no #gre-app tag');
    const attr = new RegExp(`\\s${name}="[^"]*"`);
    if (!attr.test(tag[0])) throw new Error(`support: #gre-app has no ${name}`);
    const replaced = value === null ? tag[0].replace(attr, '') : tag[0].replace(attr, ` ${name}="${value}"`);
    return html.replace(tag[0], replaced);
  };
}

/** The `src` of `#gre-app` as the page resolves it (the bundle's `import.meta.url`). */
export const bundleUrl = (page: Page): Promise<string> =>
  page.evaluate(() => (document.getElementById('gre-app') as HTMLScriptElement).src);

/** Dispatches a routed error on `window` (§7.5, Terminal state during startup). */
export async function dispatchRoutedError(page: Page): Promise<void> {
  await page.evaluate(() => {
    const filename = (document.getElementById('gre-app') as HTMLScriptElement).src;
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('routed'), filename }));
  });
}

// --------------------------------------------------------------------
// A coherent replacement vintage (§7.5, Reload recovery cases)
// --------------------------------------------------------------------

export interface FixtureVintage {
  readonly exportVersion: string;
  readonly manifestName: string;
  readonly fieldName: string;
  readonly regressionName: string;
  readonly files: ReadonlyMap<string, Served>;
}

/** Rewrites a gzip JSON envelope's `export_version`. */
function reversion(name: string, exportVersion: string): Buffer {
  const raw = JSON.parse(gunzipSync(servedData(name)).toString('utf8')) as { export_version: string };
  raw.export_version = exportVersion;
  return gzipSync(Buffer.from(JSON.stringify(raw), 'utf8'));
}

/**
 * A replacement vintage `exportVersion`, coherent with itself: a manifest
 * stamped `exportVersion` whose lazy exports are new content-addressed
 * files carrying the same `export_version`; the scenario artifact is the
 * served one, which carries no version. Served only through `Net.files`.
 */
export function fixtureVintage(exportVersion: string): FixtureVintage {
  const m = JSON.parse(servedData(pointerName('manifest-')).toString('utf8')) as {
    export_version: string;
    files: { field_export: string; regression_export: string; scenario_artifact: string };
    checksums: { [name: string]: string };
  };
  const field = reversion(m.files.field_export, exportVersion);
  const regression = reversion(m.files.regression_export, exportVersion);
  const fieldName = `field-${sha256(field).slice(0, 12)}.json.gz`;
  const regressionName = `regression-${sha256(regression).slice(0, 12)}.json.gz`;
  const checksums: { [name: string]: string } = { [m.files.scenario_artifact]: m.checksums[m.files.scenario_artifact] };
  checksums[fieldName] = sha256(field);
  checksums[regressionName] = sha256(regression);
  const next = {
    ...m,
    export_version: exportVersion,
    files: { ...m.files, field_export: fieldName, regression_export: regressionName },
    checksums,
  };
  const manifestBytes = Buffer.from(JSON.stringify(next), 'utf8');
  const manifestName = `manifest-${sha256(manifestBytes).slice(0, 12)}.json`;
  const files = new Map<string, Served>([
    [manifestName, { body: manifestBytes, contentType: 'application/json; charset=utf-8' }],
    [fieldName, { body: field, contentType: 'application/gzip' }],
    [regressionName, { body: regression, contentType: 'application/gzip' }],
  ]);
  return { exportVersion, manifestName, fieldName, regressionName, files };
}

/** The served scenario page HTML with `#gre-app` stamped for `vintage`. */
export function htmlFor(vintage: FixtureVintage): string {
  const html = readFileSync(join(SITE_DIR, 'scenario', 'index.html'), 'utf8');
  return withAppAttribute('data-manifest', `data/${vintage.manifestName}`)(
    withAppAttribute('data-data-version', vintage.exportVersion)(html),
  );
}

// --------------------------------------------------------------------
// Live-region recorder and the test-only timer wrapper (§7.5)
// --------------------------------------------------------------------

declare global {
  interface Window {
    __greTexts?: { role: string; text: string; region: number; connected: boolean }[];
    __greOrig?: { setTimeout: typeof setTimeout; clearTimeout: typeof clearTimeout };
    __greTimers?: {
      arm(): void;
      disarm(): void;
      armed(): boolean;
      held(): boolean;
      release(): boolean;
      restore(): void;
    };
  }
}

/**
 * Records every non-empty text written to a `role="status"` or
 * `role="alert"` region, observing each region element itself so a write
 * to a detached region is recorded too. Each region gets an index in
 * order of appearance.
 */
export async function installRecorder(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as Window;
    w.__greTexts = [];
    const seen = new WeakMap<Element, number>();
    let next = 0;
    const watch = (el: Element): void => {
      if (seen.has(el)) return;
      const index = next++;
      seen.set(el, index);
      new MutationObserver(() => {
        const text = el.textContent ?? '';
        if (text !== '') w.__greTexts!.push({ role: el.getAttribute('role') ?? '', text, region: index, connected: el.isConnected });
      }).observe(el, { childList: true, characterData: true, subtree: true });
    };
    const scan = (node: Node): void => {
      if (!(node instanceof Element)) return;
      if (node.matches('[role=status], [role=alert]')) watch(node);
      for (const el of Array.from(node.querySelectorAll('[role=status], [role=alert]'))) watch(el);
    };
    new MutationObserver((records) => {
      for (const r of records) for (const n of Array.from(r.addedNodes)) scan(n);
    }).observe(document, { childList: true, subtree: true });
  });
}

/** The recorded texts, optionally of one role. */
export async function recorded(page: Page, role?: 'status' | 'alert'): Promise<string[]> {
  const all = await page.evaluate(() => window.__greTexts ?? []);
  return all.filter((t) => role === undefined || t.role === role).map((t) => t.text);
}

/** The full recorded entries. */
export const recordedEntries = (page: Page) => page.evaluate(() => window.__greTexts ?? []);

export async function clearRecorded(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__greTexts = [];
  });
}

/**
 * The test-only wrapper of `setTimeout` and `clearTimeout` (§7.5, Startup
 * announcement ordering). Armed, it holds the first zero-delay callback
 * scheduled while the new `#gre-root` holds its status and alert regions
 * but has no `data-gre-mounted` (`mode` 'mount'), or the first zero-delay
 * callback at all (`mode` 'commit', armed for one commit by the caller);
 * every other timer is delegated unchanged and cancellation is honoured.
 * `armAtStart` arms it for the first mount of every document.
 */
export async function installTimerWrapper(page: Page, armAtStart: boolean): Promise<void> {
  await page.addInitScript((armedAtStart: boolean) => {
    const w = window as Window;
    const origSet = window.setTimeout.bind(window);
    const origClear = window.clearTimeout.bind(window);
    w.__greOrig = { setTimeout: origSet as typeof setTimeout, clearTimeout: origClear as typeof clearTimeout };
    let armed: 'mount' | 'commit' | null = armedAtStart ? 'mount' : null;
    let held: { id: number; run: () => void } | null = null;
    let fakeId = -1;
    const mountWindow = (): boolean => {
      const root = document.getElementById('gre-root');
      return (
        root !== null &&
        !root.hasAttribute('data-gre-mounted') &&
        root.querySelector(':scope > [role=status]') !== null &&
        root.querySelector(':scope > [role=alert]') !== null
      );
    };
    function wrappedSet(handler: TimerHandler, delay?: number, ...args: unknown[]): number {
      const zero = delay === undefined || Number(delay) <= 0;
      if (armed !== null && held === null && zero && typeof handler === 'function' && (armed === 'commit' || mountWindow())) {
        armed = null;
        const id = fakeId--;
        held = { id, run: () => (handler as (...a: unknown[]) => void)(...args) };
        return id;
      }
      return origSet(handler, delay, ...args) as unknown as number;
    }
    function wrappedClear(id?: number): void {
      if (held !== null && id === held.id) {
        held = null;
        return;
      }
      origClear(id);
    }
    window.setTimeout = wrappedSet as typeof setTimeout;
    window.clearTimeout = wrappedClear as typeof clearTimeout;
    w.__greTimers = {
      arm: () => {
        armed = 'mount';
        held = null;
      },
      disarm: () => {
        armed = null;
      },
      armed: () => armed !== null,
      held: () => held !== null,
      release: () => {
        const h = held;
        held = null;
        if (h === null) return false;
        h.run();
        return true;
      },
      restore: () => {
        window.setTimeout = origSet as typeof setTimeout;
        window.clearTimeout = origClear as typeof clearTimeout;
        armed = null;
        held = null;
      },
    };
    (w.__greTimers as unknown as { armCommit(): void }).armCommit = () => {
      armed = 'commit';
      held = null;
    };
  }, armAtStart);
}

/** Awaits one zero-delay timer scheduled through the original `setTimeout`. */
export async function oneZeroTimer(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((done) => window.__greOrig!.setTimeout(() => done(), 0)));
}

/** Runs the held callback synchronously in one evaluate; true when one was held. */
export const releaseHeld = (page: Page): Promise<boolean> => page.evaluate(() => window.__greTimers!.release());
export const isHeld = (page: Page): Promise<boolean> => page.evaluate(() => window.__greTimers!.held());

// --------------------------------------------------------------------
// Recovery records (§5.6)
// --------------------------------------------------------------------

/** A recovery record's text: the five-key envelope by `canonicalJson`. */
export function recoveryRecord(scenario: unknown, display: Partial<DisplayState> = {}, sourceExportVersion = reference().export_version, summary = 'Saved scenario'): string {
  return canonicalJson({
    recoveryVersion: 1,
    sourceExportVersion,
    scenario,
    display: { ...defaultDisplayState(), ...display },
    summary,
  });
}

/** Seeds `sessionStorage` with `text` under the recovery key before the first document of this page only. */
export async function seedRecovery(page: Page, text: string): Promise<void> {
  await page.addInitScript(
    ([key, value]: [string, string]) => {
      if (sessionStorage.getItem('gre-test-seeded') !== null) return;
      sessionStorage.setItem('gre-test-seeded', '1');
      sessionStorage.setItem(key, value);
    },
    [RECOVERY_KEY, text] as [string, string],
  );
}

// --------------------------------------------------------------------
// Scenario drives through the real controls (§5.7)
// --------------------------------------------------------------------

const dipName = (d: number): string => `${d}°`;

/** A group's checkbox by its accessible name. */
export const checkbox = (page: Page, fieldset: string, name: string) =>
  page.locator(fieldset).getByRole('checkbox', { name, exact: true });

/** The two sediment arms: uniform (`Homogeneous`) and layered (`Heterogeneous`). */
export const armFieldset = (set: string): string =>
  set === 'Homogeneous' ? 'fieldset.gre-arm >> nth=0' : 'fieldset.gre-arm >> nth=1';

async function setGroup(page: Page, fieldset: string, all: readonly string[], selected: readonly string[]): Promise<void> {
  for (const name of all) {
    const box = checkbox(page, fieldset, name);
    const want = selected.includes(name);
    if ((await box.isChecked()) !== want) await box.setChecked(want);
  }
}

/** Drives every control to `inputs` (a reference `inputs` object) and waits for `expected` matching records. */
export async function applyInputs(page: Page, inputs: Inputs, expected: number): Promise<void> {
  const m = manifest();
  await page.locator(`input[name="gre-population"][value="${inputs.population}"]`).check();
  await setGroup(page, 'fieldset.gre-dip', m.trial_columns.fault_dip.map(dipName), inputs.fault_dip.map(dipName));
  for (const set of ['Homogeneous', 'Heterogeneous']) {
    const all = m.arm_strength_states.filter((p) => p.set === set).map((p) => sedimentLabel(p.sediment_strength));
    const sel = inputs.sediment.filter((p) => p.set === set).map((p) => sedimentLabel(p.sediment_strength));
    await setGroup(page, armFieldset(set), all, sel);
  }
  await setGroup(page, 'fieldset.gre-depth', m.trial_columns.depth.map((d) => `${d} m`), inputs.depth.map((d) => `${d} m`));
  await setGroup(page, 'fieldset.gre-density', m.trial_columns.density, inputs.density);
  await setGroup(page, 'fieldset.gre-scarp-filter', m.scarp_classes, inputs.scarp_class);
  if (inputs.entry_mode === 'offset') {
    await page.locator('input[name="gre-entry-mode"][value="offset"]').check();
    await page.locator('#gre-offset-max').fill(inputs.offset_max ?? '');
    await page.locator('#gre-offset-max').press('Enter');
  } else if (inputs.slip_window !== null) {
    await page.locator('input[name="gre-entry-mode"][value="slip"]').check();
    await page.locator('#gre-slip-min').fill(inputs.slip_window.min);
    await page.locator('#gre-slip-max').fill(inputs.slip_window.max);
    await page.locator('#gre-slip-max').press('Enter');
  }
  await expectCount(page, expected);
}

/** Drives the controls to golden scenario `id` and waits for its reference count. */
export async function applyGolden(page: Page, id: string): Promise<GoldenScenario> {
  const s = gs(id);
  await applyInputs(page, s.inputs, s.counts.matching_records);
  return s;
}

// --------------------------------------------------------------------
// Downloads (§5.9)
// --------------------------------------------------------------------

export interface CapturedDownload {
  readonly fileName: string;
  readonly path: string;
  readonly bytes: Buffer;
  readonly members: ReadonlyMap<string, Buffer>;
  readonly provenance: string;
  /** Provenance block 8, `Generated (UTC)`. */
  readonly instant: string;
}

/** Reads the members of a stored (method 0) ZIP archive in local-header order. */
export function unzipStored(bytes: Buffer): Map<string, Buffer> {
  const members = new Map<string, Buffer>();
  let at = 0;
  while (at + 30 <= bytes.length && bytes.readUInt32LE(at) === 0x04034b50) {
    const method = bytes.readUInt16LE(at + 8);
    const size = bytes.readUInt32LE(at + 18);
    const nameLength = bytes.readUInt16LE(at + 26);
    const extraLength = bytes.readUInt16LE(at + 28);
    if (method !== 0) throw new Error('support: a ZIP member is not stored');
    const name = bytes.subarray(at + 30, at + 30 + nameLength).toString('utf8');
    const start = at + 30 + nameLength + extraLength;
    members.set(name, bytes.subarray(start, start + size));
    at = start + size;
  }
  return members;
}

/** Clicks "Download this result" and captures the archive (Playwright's download event). */
export async function captureDownload(page: Page, testInfo: TestInfo, label = 'download'): Promise<CapturedDownload> {
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#gre-download').click()]);
  return readDownload(download, testInfo, label);
}

export async function readDownload(download: Download, testInfo: TestInfo, label: string): Promise<CapturedDownload> {
  const path = testInfo.outputPath(`${label}-${download.suggestedFilename()}`);
  await download.saveAs(path);
  const bytes = readFileSync(path);
  const members = unzipStored(bytes);
  const provenance = members.get('provenance.txt')?.toString('utf8') ?? '';
  const lines = provenance.split('\n');
  const at = lines.indexOf('Generated (UTC)');
  return { fileName: download.suggestedFilename(), path, bytes, members, provenance, instant: at >= 0 ? lines[at + 1] : '' };
}

/** The content lines of a provenance block, by its label. */
export function provenanceBlock(provenance: string, label: string): string[] {
  const lines = provenance.split('\n');
  const at = lines.indexOf(label);
  if (at < 0) return [];
  const out: string[] = [];
  for (let i = at + 1; i < lines.length && lines[i] !== ''; i++) out.push(lines[i]);
  return out;
}

/** The parsed `scenario.json` member. */
export const scenarioJson = (d: CapturedDownload): { scenario: unknown; software_version: string; export_version: string; converted_windows: unknown } =>
  JSON.parse(d.members.get('scenario.json')!.toString('utf8'));

/** Errors the page reports (`pageerror`). */
export function pageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}
