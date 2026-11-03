// The application entry (docs/app/ddd.md §5.1 Mount; §5.3 Scheduling;
// §5.10 Failure states; §5.11 Navigation lifecycle). This file holds:
//
// - the capability probe `missingCapabilities()`, step 1 of the §5.10
//   startup sequence, which `onPageReady` calls before it claims the
//   mount slot — the slot's `AbortController` is itself a probed API —
//   showing `showCapabilityNotice(root, missing)` of `views/dom/notices.ts`
//   on a miss;
// - `start(a, tag)`, the guarded startup of §5.10 — the live regions, the
//   same-page link guard, the startup announcement, the one-shot reload
//   recovery claim, the two `window` listeners of Error routing, then the
//   load and the first render inside one `try`/`catch` — with the
//   mount's terminal state, the recovery listeners and decisions, and
//   the initial focus and scroll;
// - the per-mount scheduler of §5.3 behind the `Scheduler` type of
//   `views/dom/wiring.ts`, whose frame callback computes the latest
//   accepted Scenario's result, commits it through the render pass
//   `render` of `views/dom/render.ts`, and makes the settled-update
//   announcement of §5.11;
// - at the end, the navigation-lifecycle algorithm exactly as §5.11
//   prints it: `SELF`, the document-global slot, `onPageReady`,
//   `vintageFor`, `fragmentTarget`, `guard`, and the subscription to
//   `window.document$` with its `readyState` fallback. It comes last
//   because it runs at module evaluation, after every declaration above.
//
// No module imports this one: `start` hands every listener-adding module
// one `Wiring` (§5.1).
//
// A browser-only file (§5.1).

import { announce } from './a11y/announce';
import { captureFocus, focusInside, mountFocus, restoreFocus, unavailableFocus } from './a11y/focus';
import * as config from './config';
import { convertWindows, rangeFlag } from './convert/convert';
import { loadFieldExport, loadRegression, loadVintage, type Vintage } from './decode/decode';
import type { FieldRow, Regression } from './decode/fields';
import { buildDownloadButton } from './download/deliver';
import type { VersionStamps } from './download/package';
import { query } from './engine/query';
import { buildOverlaySwitch } from './overlay/field-overlay';
import { claimRecovery, clearRecovery, discardAndReload, saveAndReload, type IncomingRecovery } from './recovery';
import { readRecovery, restoreRecovery, serializeRecovery, type RecoveryRecord } from './state/recovery';
import {
  MEASUREMENT_NAMES,
  OVERLAY_MEASUREMENT_NAMES,
  defaultDisplayState,
  defaultScenario,
  type AppState,
  type DisplayState,
  type MeasurementName,
  type Scenario,
} from './state/state';
import { histogram, histogramLog } from './stats/histogram';
import { summarize, validValues } from './stats/stats';
import { fillCopy, measurementLabel } from './views/chart-text';
import { copyText } from './views/copy';
import { buildControls } from './views/dom/controls';
import { linkGlossary } from './views/dom/glossary';
import { markAfterPaint, resultVisible } from './views/dom/marks';
import {
  RECOVERY_ACTION_ATTRIBUTE,
  applyRecovery,
  buildMinimalSkeleton,
  enterRecoveryDecision,
  enterUnavailable,
  recoveryMessageParts,
  showCapabilityNotice,
  type LiveRegions,
  type RecoveryAction,
  type RecoveryDecision,
  type RecoveryMessage,
  type UnavailableFailure,
} from './views/dom/notices';
import { buildPanels } from './views/dom/panels';
import { render, type RenderScope, type RenderTargets } from './views/dom/render';
import type { Scheduler, Wiring } from './views/dom/wiring';
import { formatCount } from './views/format';
import { CAVEAT_KEYS, noticeText, type NoticePlan, type NoticeRef } from './views/notices';
import type { RenderInput } from './views/render-input';
import { settingsText } from './views/summary';

// --------------------------------------------------------------------
// The capability probe (§5.10, step 1)
// --------------------------------------------------------------------

/**
 * The names `typeof` must give `'function'` for, each with the
 * expression it reads, in the §5.10 test order (fixed there).
 */
const FUNCTION_TESTS: readonly (readonly [string, () => unknown])[] = [
  ['fetch', () => fetch],
  ['ReadableStream', () => ReadableStream],
  ['ReadableStream.prototype.pipeThrough', () => ReadableStream.prototype.pipeThrough],
  ['TextDecoder', () => TextDecoder],
  ['TextEncoder', () => TextEncoder],
  ['Uint8Array', () => Uint8Array],
  ['Uint16Array', () => Uint16Array],
  ['Uint32Array', () => Uint32Array],
  ['Int32Array', () => Int32Array],
  ['Float64Array', () => Float64Array],
  ['DataView', () => DataView],
  ['Blob', () => Blob],
  ['URL', () => URL],
  ['URL.createObjectURL', () => URL.createObjectURL],
  ['URL.revokeObjectURL', () => URL.revokeObjectURL],
  ['ResizeObserver', () => ResizeObserver],
  ['AbortController', () => AbortController],
  ['requestAnimationFrame', () => requestAnimationFrame],
  ['cancelAnimationFrame', () => cancelAnimationFrame],
  ['Element.prototype.replaceChildren', () => Element.prototype.replaceChildren],
  ['performance.mark', () => performance.mark],
];

/** Whether `test` returns without throwing and its result passes `check`; a throwing test fails. */
function passes<T>(test: () => T, check: (value: T) => boolean): boolean {
  try {
    return check(test());
  } catch {
    return false;
  }
}

/**
 * The capability probe (§5.10, Unavailable browser capabilities): the
 * names of the failing tests, in test order — empty when every test
 * passes. The tests: `typeof` gives `'function'` for each name of
 * `FUNCTION_TESTS`; `new DecompressionStream('gzip')` returns without
 * throwing (reported as `DecompressionStream`); and
 * `'download' in HTMLAnchorElement.prototype` holds (reported as
 * `HTMLAnchorElement.download`). A test that throws fails. Only these
 * features are tested, never the browser's name or version: the rest of
 * the §7.6 inventory — `MessageChannel`, the User Timing Level 3 options
 * object of `performance.mark`, and the `signal` option of
 * `addEventListener` — is documented availability, never probed.
 */
export function missingCapabilities(): string[] {
  const missing: string[] = [];
  for (const [name, read] of FUNCTION_TESTS) {
    if (!passes(read, (value) => typeof value === 'function')) missing.push(name);
  }
  if (!passes(() => new DecompressionStream('gzip'), () => true)) {
    missing.push('DecompressionStream');
  }
  if (!passes(() => 'download' in HTMLAnchorElement.prototype, (held) => held)) {
    missing.push('HTMLAnchorElement.download');
  }
  return missing;
}

// --------------------------------------------------------------------
// Copy (§5.11 announcement templates; §5.8 field-export line)
// --------------------------------------------------------------------

/** The fixed-here announcement templates of §5.11, parts 0–3. */
const ANNOUNCEMENT_KEYS = {
  loading: 'ddd5.11.loadingAnnouncement',
  resultsUpdated: 'ddd5.11.resultsUpdated',
  resultsUpdatedOne: 'ddd5.11.resultsUpdatedOne',
  panelNotice: 'ddd5.11.panelNoticeAnnouncement',
} as const;

/** The §5.8 field-export-unavailable line, announced on a failed field export (§5.3 item 3). */
const FIELD_EXPORT_LINE_KEY = 'ddd5.8.fieldExportLine';

// --------------------------------------------------------------------
// The computation of one result (§5.3 item 2)
// --------------------------------------------------------------------

/** A computed result: every `RenderInput` member but `field`, which a render takes from the field-export state then held. */
type Computed = Omit<RenderInput, 'field'>;

/** One measurement's `validValues`, `summarize`, and `histogram` (§5.1 event flow). */
function measurementResult(
  vintage: Vintage,
  selection: RenderInput['selection'],
  m: MeasurementName,
): RenderInput['measurements'][MeasurementName] {
  const values = validValues(vintage, selection, m);
  return {
    values,
    stats: summarize(values),
    histogram: histogram(values.steps, values.classes, values.sorted, config.displayDecimals(m)),
  };
}

/**
 * The result of `scenario`, stamped `sequence` (§5.3 item 2): in offset
 * mode `convertWindows` over every modeled dip and each selected dip's
 * `rangeFlag` against the manifest's `slip_window_bounds`, then `query`,
 * then per measurement `validValues`, `summarize`, and `histogram`, and
 * for `dzw` `histogramLog` with `logScaleOfferRatio()`. An offset-mode
 * Scenario requires the loaded `regression`.
 */
function compute(vintage: Vintage, scenario: Scenario, sequence: number, regression: Regression | null): Computed {
  const manifest = vintage.manifest;
  let windows: RenderInput['windows'] = null;
  let flags: RenderInput['flags'] = null;
  let used: Regression | null = null;
  if (scenario.window.mode === 'offset') {
    if (regression === null) throw new Error('compute: an offset-mode Scenario without the regression export');
    const converted = convertWindows(Number(scenario.window.offsetMax), manifest.trialColumns.fault_dip, regression.coefficients);
    windows = converted;
    flags = [...scenario.faultDip]
      .sort((x, y) => x - y)
      .map((faultDip) => {
        const w = converted.find((e) => e.faultDip === faultDip);
        if (w === undefined) throw new Error(`compute: no converted window for the selected dip ${faultDip}`);
        return { faultDip, rangeFlag: rangeFlag(w, manifest.slipWindowBounds) };
      });
    used = regression;
  }
  const selection = query(vintage, scenario, windows ?? undefined);
  const measurements = {
    scarp_height: measurementResult(vintage, selection, 'scarp_height'),
    dzw: measurementResult(vintage, selection, 'dzw'),
    scarp_dip: measurementResult(vintage, selection, 'scarp_dip'),
  };
  const dzw = measurements.dzw.values;
  return {
    selection,
    measurements,
    histogramLog: histogramLog(dzw.steps, dzw.classes, config.logScaleOfferRatio()),
    scenario,
    sequence,
    vintage,
    windows,
    flags,
    regression: used,
  };
}

// --------------------------------------------------------------------
// The settled-update announcement (§5.11, Live announcements)
// --------------------------------------------------------------------

/** What a render showed, for "never announced again" (§5.11): per panel its notice's registry key; the header caveats. */
interface Shown {
  readonly panels: { readonly [m in MeasurementName]: string | null };
  readonly caveats: ReadonlySet<string>;
}

/** The results-header caveats of a plan: every caveat but the scarp-dip notice, which stands at the panel head (§5.8). */
function headerCaveats(plan: NoticePlan): readonly NoticeRef[] {
  return plan.caveats.filter((ref) => ref.key !== CAVEAT_KEYS.scarpDip);
}

/** A caveat's identity (§5.11): its registry entry, and for a per-dip line also its dip, whatever its other slot values. */
function caveatId(ref: NoticeRef): string {
  return ref.key === CAVEAT_KEYS.perDip ? `${ref.key} ${ref.slots.Dip ?? ''}` : ref.key;
}

/** The notices and caveats `plan` shows. */
function shownOf(plan: NoticePlan): Shown {
  return {
    panels: {
      scarp_height: plan.panels.scarp_height?.key ?? null,
      dzw: plan.panels.dzw?.key ?? null,
      scarp_dip: plan.panels.scarp_dip?.key ?? null,
    },
    caveats: new Set(headerCaveats(plan).map(caveatId)),
  };
}

/** A text's first sentence: up to and including the first `.`, `!`, or `?` followed by white space or the end. */
function firstSentence(text: string): string {
  const end = /[.!?](?=\s|$)/.exec(text);
  return end === null ? text : text.slice(0, end.index + 1);
}

/**
 * The settled update's announcement (§5.11 inventory): with no matching
 * record, the first sentence of the empty-state explainer; otherwise
 * "Results updated: {matching} matching records." ("…1 matching record."
 * at 1), then "{label}: {notice}" for each panel whose result notice the
 * previous render did not show, in panel order, then the first sentence
 * of each results-header caveat the previous render did not show, filled
 * as `#gre-caveats` renders it — each sentence after the previous one,
 * separated by a space.
 */
function settledText(input: RenderInput, plan: NoticePlan, previous: Shown): string {
  if (plan.state === 'empty') return firstSentence(noticeText(plan.explainer[0]));
  const n = input.selection.matchingRecords;
  const parts = [
    n === 1
      ? copyText(ANNOUNCEMENT_KEYS.resultsUpdatedOne)
      : fillCopy(ANNOUNCEMENT_KEYS.resultsUpdated, { matching: formatCount(n) }),
  ];
  for (const m of MEASUREMENT_NAMES) {
    const ref = plan.panels[m];
    if (ref !== null && ref.key !== previous.panels[m]) {
      parts.push(fillCopy(ANNOUNCEMENT_KEYS.panelNotice, { label: measurementLabel(m), notice: firstSentence(noticeText(ref)) }));
    }
  }
  for (const ref of headerCaveats(plan)) {
    if (!previous.caveats.has(caveatId(ref))) parts.push(firstSentence(noticeText(ref)));
  }
  return parts.join(' ');
}

// --------------------------------------------------------------------
// The per-mount scheduler (§5.3, Scheduling)
// --------------------------------------------------------------------

/** The field export's state (§5.3 item 3, fixed there). */
type FieldState =
  | { readonly kind: 'absent' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly rows: readonly FieldRow[] }
  | { readonly kind: 'failed' };

/** What the scheduler needs of its mount. */
interface SchedulerHost {
  readonly signal: AbortSignal;
  /** The `role="status"` region. */
  readonly status: HTMLElement;
  readonly root: HTMLElement;
  readonly vintage: Vintage;
  /** The lazy exports' load promises, started or joined on the vintage's cache entry (§5.11). */
  regression(): Promise<Regression>;
  field(): Promise<FieldRow[]>;
  /** Commits one frame's render (`render` of `views/dom/render.ts`). */
  renderPass(input: RenderInput, current: AppState, scope: RenderScope): NoticePlan | null;
  /** Enters the §5.10 unavailable state: a guarded-step throw, or the failed regression request of an accepted offset-mode Scenario. */
  fail(failure: UnavailableFailure): void;
  /** The field-export state or the overlay switch changed: `#gre-recovery` follows (§5.10). */
  recoveryChanged(): void;
}

/** The scheduler with the operations only `main.ts` uses beside the five of `Scheduler`. */
interface MountScheduler {
  /** The `Scheduler` handed to the appliers in their `Wiring`: exactly its five operations. */
  readonly api: Scheduler;
  /** Records the first render — sequence number 0, committed by startup — as the last committed frame. */
  commitFirst(input: RenderInput, plan: NoticePlan): void;
  /** §5.3 item 2's `isLatest(s)`: `s` is the latest stamp and the scheduler has not stopped. */
  isLatest(seq: number): boolean;
  /** Item 5's stop: the pending frame cancelled, every later frame and continuation ignored. */
  stop(): void;
  /** Item 3's field-export request, also the restored overlay's start after the first result commit (§5.10). */
  requestField(): void;
  /** Whether the field export's state is `failed`. */
  fieldFailed(): boolean;
}

/**
 * Creates the mount's scheduler (§5.3, Scheduling), holding `initial` as
 * the latest accepted `{ scenario, display }` with sequence number 0. It
 * stops on the mount signal's `abort` event (item 5).
 */
function createScheduler(host: SchedulerHost, initial: AppState): MountScheduler {
  let held = initial;
  let latest = 0;
  let computed: Computed | null = null;
  let last: RenderInput | null = null;
  let frame: number | null = null;
  let stopped = false;
  let regression: Regression | null = null;
  let field: FieldState = { kind: 'absent' };
  let fieldToken = 0;
  let fieldDirty = false;
  const dirtyPanels = new Set<MeasurementName>();
  const dirtyCharts = new Set<MeasurementName>();
  /** §5.11's previous render: the last render whose settled-update announcement was written, else the first. */
  let shown: Shown | null = null;

  const isLatest = (seq: number): boolean => !stopped && !host.signal.aborted && seq === latest;

  const fieldMember = (): RenderInput['field'] =>
    field.kind === 'ready' ? field.rows : field.kind === 'failed' ? 'failed' : null;

  function stop(): void {
    stopped = true;
    if (frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  }
  host.signal.addEventListener('abort', stop, { once: true });

  function requestFrame(): void {
    if (stopped || frame !== null) return;
    frame = requestAnimationFrame(onFrame);
  }

  /** Marks the panels whose display state changed; a change of `overlay` or `familyView` counts for every panel. */
  function markDisplay(a: DisplayState, b: DisplayState): void {
    if (a === b) return;
    if (a.overlay !== b.overlay || a.familyView !== b.familyView) {
      for (const m of MEASUREMENT_NAMES) dirtyPanels.add(m);
      return;
    }
    for (const m of MEASUREMENT_NAMES) {
      if (a.view[m] !== b.view[m] || a.readoff[m] !== b.readoff[m] || a.chartDataOpen[m] !== b.chartDataOpen[m]) {
        dirtyPanels.add(m);
      }
    }
    for (const m of OVERLAY_MEASUREMENT_NAMES) {
      if (a.showAll[m] !== b.showAll[m]) dirtyPanels.add(m);
    }
    if (a.logScale !== b.logScale) dirtyPanels.add('dzw');
  }

  /**
   * The regression export (item 3): `seq` null for the prefetch, whose
   * failure shows nothing; otherwise the request of the accepted
   * offset-mode Scenario stamped `seq`, whose continuation returns when a
   * newer Scenario has been accepted since, requests a frame on
   * fulfilment, and on rejection enters the unavailable state with the
   * coefficients reason.
   */
  function requestRegression(seq: number | null): void {
    host.regression().then(
      (loaded) => {
        if (stopped || host.signal.aborted) return;
        if (seq !== null && seq !== latest) return;
        regression = loaded;
        if (seq !== null) requestFrame();
      },
      (error: unknown) => {
        if (stopped || host.signal.aborted || seq === null || seq !== latest) {
          console.debug(error);
          return;
        }
        host.fail({ error, step: 'regression' });
      },
    );
  }

  /**
   * The field export (item 3): sets `loading`, then `ready` with its rows
   * or `failed` — on `failed` also announcing the §5.8 field-export line
   * — marks the height and width panels' `.gre-legend` and `.gre-chart`
   * slots, and requests a frame. A superseded continuation is dropped.
   */
  function requestField(): void {
    if (stopped) return;
    const token = ++fieldToken;
    field = { kind: 'loading' };
    fieldDirty = true;
    host.recoveryChanged();
    host.field().then(
      (rows) => {
        if (stopped || host.signal.aborted || token !== fieldToken) return;
        field = { kind: 'ready', rows };
        fieldDirty = true;
        host.recoveryChanged();
        requestFrame();
      },
      (error: unknown) => {
        if (stopped || host.signal.aborted || token !== fieldToken) {
          console.debug(error);
          return;
        }
        console.error(error);
        field = { kind: 'failed' };
        fieldDirty = true;
        host.recoveryChanged();
        announce(
          host.status,
          copyText(FIELD_EXPORT_LINE_KEY),
          () => !stopped && !host.signal.aborted && token === fieldToken && field.kind === 'failed',
        );
        requestFrame();
      },
    );
  }

  /** The frame callback (items 2–4), inside the one `try`/`catch` of the scheduler's guarded step. */
  function onFrame(): void {
    frame = null;
    if (stopped || host.signal.aborted || last === null) return;
    try {
      let fresh: Computed | null = null;
      if (computed === null || latest > computed.sequence) {
        const scenario = held.scenario;
        if (scenario.window.mode !== 'offset' || regression !== null) {
          fresh = compute(host.vintage, scenario, latest, scenario.window.mode === 'offset' ? regression : null);
          computed = fresh;
          if (fresh.histogramLog === null && held.display.logScale) {
            held = { scenario: held.scenario, display: { ...held.display, logScale: false } };
          }
        }
      }
      if (fresh !== null) {
        const input: RenderInput = { ...fresh, field: fieldMember() };
        const current = held;
        dirtyPanels.clear();
        dirtyCharts.clear();
        fieldDirty = false;
        const plan = host.renderPass(input, current, { kind: 'result' });
        last = input;
        const s = fresh.sequence;
        markAfterPaint(
          'egr:results-updated',
          s,
          () => resultVisible(host.root, current.display.measurement, false),
          () => isLatest(s),
        );
        if (plan !== null) {
          const previous = shown ?? shownOf(plan);
          const next = shownOf(plan);
          announce(host.status, settledText(input, plan, previous), () => {
            if (!isLatest(s)) return false;
            shown = next;
            return true;
          });
        }
        return;
      }
      const order = (set: ReadonlySet<MeasurementName>): MeasurementName[] => MEASUREMENT_NAMES.filter((m) => set.has(m));
      const scope: RenderScope = { kind: 'display', panels: order(dirtyPanels), charts: order(dirtyCharts), field: fieldDirty };
      dirtyPanels.clear();
      dirtyCharts.clear();
      fieldDirty = false;
      const input: RenderInput = { ...last, field: fieldMember() };
      host.renderPass(input, held, scope);
      last = input;
    } catch (error) {
      host.fail({ error });
    }
  }

  const api: Scheduler = {
    current: () => held,
    update(next: AppState): number | null {
      const previous = held;
      held = next;
      if (stopped) return null;
      let stamped: number | null = null;
      if (next.scenario !== previous.scenario) {
        stamped = ++latest;
        if (next.scenario.window.mode === 'offset' && regression === null) requestRegression(stamped);
      }
      markDisplay(previous.display, next.display);
      if (next.display.overlay && !previous.display.overlay && (field.kind === 'absent' || field.kind === 'failed')) {
        requestField();
      }
      if (next.display.overlay !== previous.display.overlay) host.recoveryChanged();
      requestFrame();
      return stamped;
    },
    prefetchRegression(): void {
      if (stopped || regression !== null) return;
      requestRegression(null);
    },
    rerenderChart(measurement: MeasurementName): void {
      if (stopped) return;
      dirtyCharts.add(measurement);
      requestFrame();
    },
    lastRenderInput: () => last,
  };

  return {
    api,
    commitFirst(input: RenderInput, plan: NoticePlan): void {
      computed = input;
      last = input;
      if (input.regression !== null) regression = input.regression;
      shown = shownOf(plan);
    },
    isLatest,
    stop,
    requestField,
    fieldFailed: () => field.kind === 'failed',
  };
}

// --------------------------------------------------------------------
// The mount (§5.10 startup sequence; §5.11 rules binding `start`)
// --------------------------------------------------------------------

/** A live region of class `gre-visually-hidden` (§5.11, Live announcements). */
function liveRegion(role: 'status' | 'alert'): HTMLDivElement {
  const region = document.createElement('div');
  region.setAttribute('role', role);
  region.className = 'gre-visually-hidden';
  return region;
}

/** The regression export's load promise on the cache entry, started or joined; deleted when it rejects (§5.11). */
function entryRegression(entry: Entry, url: string, exportVersion: string): Promise<Regression> {
  if (entry.regression !== undefined) return entry.regression;
  const started = loadRegression(url, exportVersion);
  entry.regression = started;
  started.catch(() => {
    if (entry.regression === started) delete entry.regression;
  });
  return started;
}

/** The field export's load promise on the cache entry, started or joined; deleted when it rejects (§5.11). */
function entryField(entry: Entry, url: string, exportVersion: string): Promise<FieldRow[]> {
  if (entry.field !== undefined) return entry.field;
  const started = loadFieldExport(url, exportVersion);
  entry.field = started;
  started.catch(() => {
    if (entry.field === started) delete entry.field;
  });
  return started;
}

/**
 * Which preserving reload a failure offers (§5.10, Reload recovery
 * presentation): `'accepted'` — the accepted offset Scenario's failed
 * regression load, with the "Some required data could not be loaded."
 * message and both reload actions; `'retained'` — a consumed valid
 * record's failed startup load, the same actions with the retained
 * record; null — none, the ordinary manual-reload instruction.
 */
type Preserving = 'accepted' | 'retained' | null;

/**
 * The mount (§5.10, Startup sequence; §5.11, Navigation lifecycle): the
 * two live regions, appended after the fallback body; the same-page link
 * guard; the startup announcement, guarded by this call's
 * `initialPending`; the one-shot reload-recovery claim, before any await;
 * the two `window` listeners of Error routing; then, inside one
 * `try`/`catch`, the load and the first render. `terminal` is the §5.10
 * terminal state, set as the mount enters the unavailable state and never
 * reset; it aborts nothing.
 */
async function start(a: Active, tag: HTMLScriptElement): Promise<void> {
  const root = a.root;
  const signal = a.ac.signal;
  const status = liveRegion('status');
  const alert = liveRegion('alert');
  root.append(status, alert);
  document.addEventListener('click', guard, { capture: true, signal: a.ac.signal });
  let initialPending = true;
  let terminal = false;
  announce(status, copyText(ANNOUNCEMENT_KEYS.loading), () => !a.ac.signal.aborted && initialPending);
  const incoming: IncomingRecovery = claimRecovery();
  const regions: LiveRegions = { status, alert };

  // ---- Mount state ----------------------------------------------------
  /** Whether the mount's first commit — of results, the unavailable state, or a recovery decision — has happened. */
  let committed = false;
  /** Whether the first-commit work (`afterFirstCommit`) has run: a throw after a first commit leaves it to `fail`. */
  let hooked = false;
  /** The scheduler, once the first result is committed. */
  let scheduler: MountScheduler | null = null;
  /** The vintage the first result was computed over. */
  let mounted: Vintage | null = null;
  /** The shown recovery-decision state, or null. */
  let decision: RecoveryDecision | null = null;
  /** Whether an explicit decision's resumption is under way: a repeated click resumes nothing. */
  let resuming = false;
  /** Clears the pending resumption's `resumePending` and the status region before the resumed first commit. */
  let clearResume: (() => void) | null = null;
  /** A consumed valid incoming record's raw text, retained while no scheduler exists, for an explicit preserving retry (§5.6). */
  let retained: string | null = null;
  /** Whether the initial storage read was impossible (§5.10). */
  const storageUnreadable = incoming.kind === 'unreadable';
  /** The persistent `#gre-recovery` message: the successful restoration, or the storage-read warning. */
  let persistent: RecoveryMessage | null = null;
  /** The last failed recovery action's message. */
  let actionError: RecoveryMessage | null = null;
  /** The preserving reload a failed load offers. */
  let loadFailure: Preserving = null;
  /** Whether a recovery action executes: its buttons are disabled. */
  let busy = false;
  let recoveryListening = false;

  const byId = (id: string): HTMLElement => {
    const element = root.querySelector<HTMLElement>(`#${id}`);
    if (element === null) throw new Error(`main: the skeleton has no #${id}`);
    return element;
  };

  /** Commits the minimal skeleton (§5.10) through `#gre-root.replaceChildren(…)`, with the two live regions after it. */
  function commitSkeleton(): void {
    const s = buildMinimalSkeleton(document);
    root.replaceChildren(s.summary, s.controls, s.header, s.panels, s.state, s.versions, status, alert);
  }

  /** Immediately before a first commit (§5.11): the startup flag and, for a resumption, its own flag cleared, the status region emptied. */
  function beforeCommit(): void {
    if (!committed) {
      initialPending = false;
      status.textContent = '';
    }
    clearResume?.();
  }

  /** The focus-fallback context of the held display state (§5.11). */
  const focusContext = () => ({ root, measurement: scheduler?.api.current().display.measurement ?? 'scarp_height' });

  /**
   * After the mount's first commit (§5.11, rules binding `start`):
   * `#gre-summary`'s border-box height written to `--gre-summary-block`
   * on `#gre-root` and its `ResizeObserver` attached (§5.7); the at-mount
   * focus move to `target`, or with a fragment in the URL no focus move
   * and, when the fragment names an element outside `#gre-root`, that
   * element's `scrollIntoView()`; then the test hooks.
   */
  function afterFirstCommit(target: HTMLElement): void {
    hooked = true;
    const summary = byId('gre-summary');
    const write = (height: number): void => root.style.setProperty('--gre-summary-block', `${height}px`);
    write(summary.getBoundingClientRect().height);
    const observer = new ResizeObserver((entries) => {
      if (signal.aborted) return;
      for (const entry of entries) {
        const box = entry.borderBoxSize?.[0];
        write(box !== undefined ? box.blockSize : entry.target.getBoundingClientRect().height);
      }
    });
    observer.observe(summary);
    signal.addEventListener('abort', () => observer.disconnect(), { once: true });
    if (location.hash === '') {
      mountFocus(target);
    } else {
      const named = fragmentTarget(location.hash);
      if (named !== null && !root.contains(named)) named.scrollIntoView();
    }
    root.setAttribute('data-gre-mounted', '');
    root.setAttribute('data-gre-build', SELF);
  }

  /** Announces `message` once through `region` while it is still the one shown (§5.10). */
  function announceMessage(region: HTMLElement, message: RecoveryMessage, current: () => RecoveryMessage | null): void {
    announce(region, recoveryMessageParts(message).join(' '), () => !signal.aborted && current() === message);
  }

  // ---- `#gre-recovery` (§5.10, Reload recovery presentation) ---------
  /**
   * Renders `#gre-recovery` outside a decision state, current with the
   * field state and the overlay switch: the persistent message, a load
   * failure's message, and the last failed action's message, then the
   * preserving actions while a failed load offers them. `clearSaved`
   * removes a decision's saved summary. A removed action that held focus
   * follows the focus-fallback rule (§5.11).
   */
  function renderRecovery(clearSaved = false): void {
    if (decision !== null || !committed) return;
    const overlayFailed = scheduler !== null && scheduler.fieldFailed() && scheduler.api.current().display.overlay;
    const preserving = loadFailure !== null || overlayFailed;
    if (!preserving) actionError = null;
    const messages: RecoveryMessage[] = [];
    if (persistent !== null) messages.push(persistent);
    if (loadFailure === 'accepted' || overlayFailed) messages.push({ kind: 'load-failed' });
    if (actionError !== null) messages.push(actionError);
    const focus = captureFocus(root);
    applyRecovery(byId('gre-recovery'), {
      messages,
      ...(clearSaved ? { saved: null } : {}),
      actions: preserving ? ['reload-restore', 'reload-fresh'] : [],
      busy,
    });
    if (focus.element !== null && !focus.element.isConnected) restoreFocus(focus, focusContext());
  }

  /** A failed recovery action's message, shown and announced once through the alert region (§5.10); focus stays on the action. */
  function actionFailed(message: RecoveryMessage): void {
    busy = false;
    actionError = message;
    renderRecovery();
    announceMessage(alert, message, () => actionError);
  }

  /** **Reload and restore settings** (§5.6): the held Scenario and display at click time, or before a scheduler exists the retained record. */
  function reloadRestore(): void {
    let text: string | null = retained;
    if (scheduler !== null && mounted !== null) {
      const current = scheduler.api.current();
      const manifest = mounted.manifest;
      text = serializeRecovery(current.scenario, current.display, manifest, settingsText({ scenario: current.scenario, manifest }));
    }
    if (text === null) return;
    busy = true;
    renderRecovery();
    const outcome = saveAndReload(text);
    if (outcome === 'reloading') return;
    actionFailed(outcome === 'save-failed' ? { kind: 'save-failed' } : { kind: 'reload-failed' });
  }

  /** **Reload without restoring settings** (§5.6): clears and verifies the key first; a failed clear keeps the page. */
  function reloadFresh(): void {
    busy = true;
    renderRecovery();
    const outcome = discardAndReload();
    if (outcome === 'reloading') return;
    actionFailed(outcome === 'save-failed' ? { kind: 'discard-failed' } : { kind: 'reload-failed' });
  }

  /** A decision action whose storage clear failed again: the decision stays, and its message is announced once more (§5.10). */
  function clearFailedAgain(): void {
    const shown = decision;
    if (shown === null) return;
    announce(alert, byId('gre-state').textContent ?? '', () => !signal.aborted && decision === shown);
  }

  /** **Retry recovery** (§5.6): clears and verifies the key, then resumes startup with the retained text. */
  function retryRecovery(): void {
    if (resuming || decision?.kind !== 'clear-failed' || incoming.kind !== 'blocked') return;
    if (!clearRecovery()) {
      clearFailedAgain();
      return;
    }
    resume(incoming.text);
  }

  /** **Start a new scenario** (§5.6): after a known removal failure, clears the key first; then resumes startup with defaults. */
  function startNew(): void {
    if (resuming || decision === null) return;
    if (decision.kind === 'clear-failed' && !clearRecovery()) {
      clearFailedAgain();
      return;
    }
    resume(null);
  }

  /** The recovery listener, owned here and registered with the mount signal (§5.10). */
  function listenRecovery(): void {
    if (recoveryListening) return;
    recoveryListening = true;
    const region = byId('gre-recovery');
    region.addEventListener(
      'click',
      (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const button = target.closest(`button[${RECOVERY_ACTION_ATTRIBUTE}]`);
        if (!(button instanceof HTMLButtonElement) || !region.contains(button) || button.disabled) return;
        const action = button.getAttribute(RECOVERY_ACTION_ATTRIBUTE) as RecoveryAction;
        if (action === 'reload-restore') reloadRestore();
        else if (action === 'reload-fresh') reloadFresh();
        else if (action === 'retry-recovery') retryRecovery();
        else if (action === 'start-new') startNew();
      },
      { signal },
    );
  }

  // ---- The unavailable state (§5.10) ---------------------------------
  /**
   * Enters the unavailable state: terminal for the mount, the scheduler
   * stopped, the failure's recovery actions rendered first, the state
   * committed by `notices.ts`, its notice announced through the alert
   * region, and focus following §5.11.
   */
  function fail(failure: UnavailableFailure, preserving: Preserving = null): void {
    if (signal.aborted) {
      console.debug(failure.error);
      return;
    }
    if (terminal) {
      console.error(failure.error);
      return;
    }
    terminal = true;
    scheduler?.stop();
    beforeCommit();
    const first = !committed;
    const wasInside = focusInside(root);
    if (first) commitSkeleton();
    committed = true;
    decision = null;
    resuming = false;
    if (preserving !== null) loadFailure = preserving;
    if (scheduler === null && storageUnreadable) persistent = { kind: 'storage-unavailable', defaultStarted: false };
    renderRecovery();
    listenRecovery();
    const text = enterUnavailable(root, regions, failure);
    announce(alert, text, () => !signal.aborted);
    const hook = !hooked;
    if (hook) afterFirstCommit(byId('gre-state'));
    else unavailableFocus(root, wasInside);
    if (hook && persistent !== null) announceMessage(status, persistent, () => persistent);
  }

  // ---- Recovery decisions (§5.10) -------------------------------------
  /** Commits a recovery-decision state; only its root commit is the mount's first commit. */
  function commitDecision(next: RecoveryDecision): void {
    if (terminal) return;
    beforeCommit();
    const first = !committed;
    const focus = captureFocus(root);
    if (first) commitSkeleton();
    committed = true;
    decision = next;
    resuming = false;
    const text = enterRecoveryDecision(root, regions, next);
    listenRecovery();
    announce(alert, text, () => !signal.aborted && decision === next);
    if (first) afterFirstCommit(byId('gre-state'));
    else restoreFocus(focus, focusContext());
  }

  // ---- Startup (§5.10 steps 2 and 3) ---------------------------------
  /**
   * Commits the first result (sequence number 0): the appliers built with
   * the mount's `Wiring`; the skeleton committed through
   * `#gre-root.replaceChildren(…)` unless a recovery decision already
   * committed it, in which case its stable containers are populated in
   * place — the overlay switch and the download button inserted before
   * `#gre-recovery`, the controls and panels moved into the committed
   * `#gre-controls` and `#gre-panels`; the render pass; then the
   * first-commit focus and hooks, or after an explicit decision its focus
   * rule; the first-result mark; the one-time restoration or storage-read
   * announcement; and a restored overlay's field load.
   */
  function commitResult(
    vintage: Vintage,
    state0: AppState,
    result: Computed,
    stamps: VersionStamps,
    lazyExports: Pick<SchedulerHost, 'regression' | 'field'>,
    previous: string | null,
    logScaleOff: boolean,
  ): void {
    if (terminal) return;
    const manifest = vintage.manifest;
    let targets: RenderTargets | null = null;
    const created = createScheduler(
      {
        signal,
        status,
        root,
        vintage,
        regression: lazyExports.regression,
        field: lazyExports.field,
        renderPass: (input, current, scope) => {
          if (targets === null) throw new Error('main: a frame before the first commit');
          return render(targets, input, current, scope);
        },
        fail: (failure) => fail(failure, failure.step === 'regression' ? 'accepted' : null),
        recoveryChanged: () => renderRecovery(),
      },
      state0,
    );
    const wiring: Wiring = { signal, scheduler: created.api, status };
    const controls = buildControls(manifest, wiring);
    const panels = buildPanels(manifest, wiring);
    const overlay = buildOverlaySwitch(manifest, wiring);
    const download = buildDownloadButton(wiring, stamps);

    beforeCommit();
    const first = !committed;
    const resumed = decision !== null;
    if (first) commitSkeleton();
    committed = true;
    byId('gre-recovery').before(overlay.element, download);
    const controlsElement = byId('gre-controls');
    controlsElement.replaceChildren(...Array.from(controls.element.childNodes));
    controlsElement.hidden = false;
    const panelsElement = byId('gre-panels');
    panelsElement.replaceChildren(...Array.from(panels.element.childNodes));
    const familyToggle = byId('gre-family-view');
    if (!(familyToggle instanceof HTMLInputElement)) throw new Error('main: #gre-family-view is not a checkbox');
    targets = {
      root,
      summary: byId('gre-summary'),
      assistBody: byId('gre-assist-body'),
      familyToggle,
      familyNote: byId('gre-family-note'),
      overlay,
      caveats: byId('gre-caveats'),
      state: byId('gre-state'),
      panelsElement,
      panels,
    };
    scheduler = created;
    mounted = vintage;
    decision = null;
    resuming = false;
    retained = null;
    if (previous !== null) controls.sync(state0.scenario);

    const input: RenderInput = { ...result, field: null };
    const plan = render(targets, input, state0, { kind: 'result' });
    if (plan === null) throw new Error('main: the first render placed no notice plan');
    linkGlossary(root);
    created.commitFirst(input, plan);

    if (previous !== null) {
      persistent = { kind: 'restored', previous, current: manifest.exportVersion, logScaleOff };
    } else if (storageUnreadable) {
      persistent = { kind: 'storage-unavailable', defaultStarted: true };
    }
    renderRecovery(resumed);
    listenRecovery();

    const selected = state0.display.measurement;
    const target = panelsElement.hidden ? targets.state : panels.section(selected);
    if (!hooked) afterFirstCommit(target);
    else target.focus({ preventScroll: true });
    markAfterPaint('egr:first-result', 0, () => resultVisible(root, selected, true), () => created.isLatest(0));
    if (persistent !== null) announceMessage(status, persistent, () => persistent);
    if (state0.display.overlay) created.requestField();
  }

  /**
   * Steps 2 and 3: the load — the three `data-*` attributes of `#gre-app`
   * read from `tag.dataset` now, the vintage from `vintageFor(tag)` — and
   * the first result: the default Scenario and display, or `record`'s
   * after validation against this vintage, a restored offset Scenario
   * awaiting its regression export first. Any throw enters the
   * unavailable state; after every await the recipe returns when the
   * mount is aborted or terminal, logging a late rejection with
   * `console.debug`.
   */
  async function proceed(record: RecoveryRecord | null): Promise<void> {
    let loading = true;
    try {
      const ds = tag.dataset;
      const stamps: VersionStamps = { softwareVersion: ds.softwareVersion ?? '', dataVersion: ds.dataVersion ?? '' };
      const manifestUrl = new URL(ds.manifest!, tag.src).href;
      const pending = vintageFor(tag);
      const entry = cache!;
      const vintage = await pending;
      if (signal.aborted || terminal) return;
      loading = false;
      const manifest = vintage.manifest;
      const regressionUrl = new URL(manifest.files.regressionExport, manifestUrl).href;
      const fieldUrl = new URL(manifest.files.fieldExport, manifestUrl).href;
      const lazyExports = {
        regression: () => entryRegression(entry, regressionUrl, manifest.exportVersion),
        field: () => entryField(entry, fieldUrl, manifest.exportVersion),
      };

      let initial: AppState = { scenario: defaultScenario(manifest), display: defaultDisplayState() };
      let previous: string | null = null;
      if (record !== null) {
        const restoration = restoreRecovery(record, manifest);
        if (restoration.kind === 'incompatible') {
          retained = null;
          commitDecision({ kind: 'incompatible', current: manifest.exportVersion, summary: restoration.summary, path: restoration.path });
          return;
        }
        initial = { scenario: restoration.scenario, display: restoration.display };
        previous = restoration.sourceExportVersion;
      }

      let regression: Regression | null = null;
      if (initial.scenario.window.mode === 'offset') {
        try {
          regression = await lazyExports.regression();
        } catch (error) {
          if (signal.aborted || terminal) {
            console.debug(error);
            return;
          }
          fail({ error, step: 'regression' }, retained !== null ? 'retained' : null);
          return;
        }
        if (signal.aborted || terminal) return;
      }

      // Step 3: the result of sequence number 0, then the commit.
      const result = compute(vintage, initial.scenario, 0, regression);
      let display = initial.display;
      let logScaleOff = false;
      if (result.histogramLog === null && display.logScale) {
        display = { ...display, logScale: false };
        logScaleOff = true;
      }
      commitResult(vintage, { scenario: initial.scenario, display }, result, stamps, lazyExports, previous, logScaleOff);
    } catch (error) {
      if (signal.aborted || terminal) {
        console.debug(error);
        return;
      }
      fail({ error }, loading && retained !== null ? 'retained' : null);
    }
  }

  /**
   * Resumes startup after an explicit decision (§5.10), within the same
   * live mount: `resumePending`, local to this resumption, guards its one
   * "Loading simulation data…" announcement and is cleared, with the
   * status region, immediately before the resumed first commit, so only a
   * resumption that waits for a network load announces. `text` is the
   * retained record to retry, or null for a new scenario.
   */
  function resume(text: string | null): void {
    resuming = true;
    let resumePending = true;
    clearResume = () => {
      resumePending = false;
      status.textContent = '';
      clearResume = null;
    };
    announce(status, copyText(ANNOUNCEMENT_KEYS.loading), () => !a.ac.signal.aborted && resumePending);
    if (text === null) {
      retained = null;
      void proceed(null);
      return;
    }
    const reading = readRecovery(text);
    if (reading.kind === 'invalid-record') {
      retained = null;
      commitDecision({ kind: 'invalid-record' });
      return;
    }
    retained = text;
    void proceed(reading.record);
  }

  // ---- Error routing (§5.10): only this bundle's errors ---------------
  window.addEventListener(
    'error',
    (event) => {
      if (event.filename === SELF) fail({ error: event.error ?? event.message });
    },
    { signal: a.ac.signal },
  );
  window.addEventListener(
    'unhandledrejection',
    (event) => {
      const reason: unknown = event.reason;
      if (reason instanceof Error && typeof reason.stack === 'string' && reason.stack.includes(SELF)) fail({ error: reason });
    },
    { signal: a.ac.signal },
  );

  // ---- The load and the first render ----------------------------------
  try {
    if (incoming.kind === 'blocked') {
      commitDecision({ kind: 'clear-failed' });
      return;
    }
    let record: RecoveryRecord | null = null;
    if (incoming.kind === 'consumed') {
      const reading = readRecovery(incoming.text);
      if (reading.kind === 'invalid-record') {
        commitDecision({ kind: 'invalid-record' });
        return;
      }
      record = reading.record;
      retained = incoming.text;
    }
    await proceed(record);
  } catch (error) {
    if (signal.aborted || terminal) {
      console.debug(error);
      return;
    }
    fail({ error });
  }
}

// --------------------------------------------------------------------
// The navigation lifecycle (§5.11), as §5.11 prints it
// --------------------------------------------------------------------

const SELF = import.meta.url;
const SLOT = Symbol.for('gre.activeMount');   // document-global: at most one live mount
type Active = { build: string; root: HTMLElement; ac: AbortController };
type Entry = { key: string; vintage: Promise<Vintage>; field?: Promise<FieldRow[]>; regression?: Promise<Regression> };
const g = window as unknown as { [SLOT]?: Active };
const same = (a: string, b: string) => { const x = new URL(a), y = new URL(b); return x.pathname + x.search === y.pathname + y.search; };
let cache: Entry | null = null;   // one vintage per bundle instance
function release(a: Active) { a.ac.abort(); if (g[SLOT] === a) delete g[SLOT]; }
function onPageReady(): void {
  try {
    const root = document.getElementById('gre-root');
    const tag = document.getElementById('gre-app') as HTMLScriptElement | null;
    const held = g[SLOT];
    if (!root || !tag || !same(tag.src, SELF)) {   // another page, or a page naming another bundle URL
      if (held?.build === SELF) release(held);
      if (tag && !same(tag.src, SELF)) cache = null;
      return;
    }
    if (held?.root === root) return;   // this element's mount already started
    if (held) release(held);   // whichever instance held the slot
    const missing = missingCapabilities();   // the §5.10 capability probe, before any probed API is used
    if (missing.length > 0) { showCapabilityNotice(root, missing); return; }
    const a: Active = { build: SELF, root, ac: new AbortController() };
    g[SLOT] = a;   // claimed before the first await
    void start(a, tag);
  } catch (e) { console.error(e); }   // never throw into document$: rxjs re-throws consumer errors asynchronously
}
function vintageFor(tag: HTMLScriptElement): Promise<Vintage> {
  const manifestUrl = new URL(tag.dataset.manifest!, tag.src).href;
  const key = manifestUrl + ' ' + tag.dataset.dataVersion;
  if (cache?.key !== key) {
    const entry: Entry = { key, vintage: loadVintage(manifestUrl, { exportVersion: tag.dataset.dataVersion!, schemaVersions: [1] }) };
    cache = entry;
    entry.vintage.catch(() => { if (cache === entry) cache = null; });   // failures are never cached
  }
  return cache!.vintage;
}
function fragmentTarget(hash: string): HTMLElement | null {   // the element a non-empty URL hash names
  let id = hash.slice(1);
  try { id = decodeURIComponent(id); } catch { /* a malformed escape: the id as written */ }
  return document.getElementById(id);
}
function guard(ev: MouseEvent): void {   // same-page fragment links; start() registers it on document, capture phase
  const el = ev.target instanceof Element ? ev.target.closest('a[href]') : null;
  if (!(el instanceof HTMLAnchorElement) || el.target || ev.ctrlKey || ev.metaKey) return;   // the clicks handle() skips (L104)
  let u: URL;
  try { u = new URL(el.href); } catch { return; }   // an unparsable href is left to the browser
  if (u.origin !== location.origin || u.pathname !== location.pathname || u.search !== location.search || u.hash === '') return;
  ev.preventDefault();             // no fragment navigation, so no history entry
  ev.stopImmediatePropagation();   // never reaches Material's document.body listener
  const t = fragmentTarget(u.hash);
  if (!t) return;
  t.scrollIntoView();
  t.focus({ preventScroll: true });
  if (document.activeElement !== t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
}
const ready = (window as unknown as { document$?: { subscribe(next: () => void): unknown } }).document$;
if (ready && typeof ready.subscribe === 'function') ready.subscribe(onPageReady);   // the replay covers late evaluation
else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onPageReady, { once: true });
else onPageReady();
