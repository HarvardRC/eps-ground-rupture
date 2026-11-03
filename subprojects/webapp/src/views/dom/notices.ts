// The notices applier of docs/app/ddd.md §5.8 (Region model; Result
// notices; Caveats): it places the `NoticePlan` of `views/notices.ts` —
// the small-result warning in a panel's `.gre-notice`; the suppression
// and no-valid-measurement notices standing in for the chart in its
// `.gre-chart`; for zero matching records, `hidden` on `#gre-panels` and
// the empty-state explainer in `#gre-state`; and `#gre-caveats`, the
// short disclaimer first, then the plan's caveats other than the
// scarp-dip notice, which stands at the scarp-dip panel head
// (`views/dom/panels.ts`). It also builds, at mount, the prototype notice
// `#gre-prototype` while copy.json holds its entry, and `#gre-caveats`.
//
// It also renders the failure states of §5.10: the capability notice
// (`showCapabilityNotice`); the unavailable state (`enterUnavailable`),
// with its `{reason}` row; the minimal skeleton that state and a
// recovery decision commit before the first commit, reading nothing from
// the vintage; the single `#gre-recovery` presentation (`applyRecovery`);
// and the recovery-decision states (`enterRecoveryDecision`). `main.ts`
// (T-46) owns every listener, the storage operations, the announcements,
// the focus moves, and the resumption; these functions only render.
//
// An applier (§5.1): it builds nodes only from builder output and the copy
// registry and commits them by replacing slot children; it computes no
// value beyond the §5.10 choice of a failure's registry row, and writes
// no text of its own. Saved text is rendered only as text nodes. A click
// on the disclaimer link is taken by the same-page link guard of §5.11
// (`start`, T-46).
//
// A browser-only file (§5.1).

import { LoadError } from '../../decode/load-error';
import { MEASUREMENT_NAMES } from '../../state/state';
import { fillCopy } from '../chart-text';
import { copyText, hasCopy } from '../copy';
import { CAVEAT_KEYS, NOTICE_KEYS, noticeText, type NoticePlan, type NoticeRef } from '../notices';
import type { Panels } from './panels';

/** The fixed-here registry entry of the prototype notice (§5.8, Region model). */
const PROTOTYPE_KEY = 'ddd5.8.prototypeNotice';

/** The short disclaimer's registry key (PDD §5.2). */
const SHORT_DISCLAIMER_KEY = 'pdd5.2.shortDisclaimer';

/** The bracketed placeholder of the short disclaimer, rendered as the `#gre-disclaimer` link (§5.8). */
const FULL_DISCLAIMER = /\[([^\]]+)\]/;

/** The class of a notice standing in for the chart in `.gre-chart`. */
const STAND_IN_CLASS = 'gre-chart-notice';

/** The notices that stand in for a suppressed chart (§5.8: the second and third PDD §5.8 texts). */
const STAND_IN_KEYS: ReadonlySet<string> = new Set([NOTICE_KEYS.suppression, NOTICE_KEYS.noValid]);

/** A `<p>` holding one planned text. */
function paragraph(doc: Document, ref: NoticeRef): HTMLParagraphElement {
  const p = doc.createElement('p');
  p.textContent = noticeText(ref);
  return p;
}

/**
 * The prototype notice (§5.8, Region model): while copy.json holds the
 * fixed-here entry `ddd5.8.prototypeNotice`, a `<p id="gre-prototype">`
 * holding its text, built once at mount, which the skeleton places first
 * in the results header and no render replaces; null once the activation
 * commit has deleted the entry.
 */
export function buildPrototypeNotice(doc: Document = document): HTMLParagraphElement | null {
  if (!hasCopy(PROTOTYPE_KEY)) return null;
  const p = doc.createElement('p');
  p.id = 'gre-prototype';
  p.textContent = copyText(PROTOTYPE_KEY);
  return p;
}

/**
 * The short disclaimer (PDD §5.2), the first line of `#gre-caveats`: its
 * `[Full disclaimer →]` rendered as
 * `<a href="#gre-disclaimer" data-focus-key="disclaimer-full">`.
 */
function shortDisclaimer(doc: Document): HTMLParagraphElement {
  const text = copyText(SHORT_DISCLAIMER_KEY);
  const match = FULL_DISCLAIMER.exec(text);
  if (match === null) {
    throw new Error(`notices: ${SHORT_DISCLAIMER_KEY} has no bracketed link text`);
  }
  const link = doc.createElement('a');
  link.setAttribute('href', '#gre-disclaimer');
  link.setAttribute('data-focus-key', 'disclaimer-full');
  link.textContent = match[1];
  const p = doc.createElement('p');
  p.append(text.slice(0, match.index), link, text.slice(match.index + match[0].length));
  return p;
}

/**
 * Replaces the children of `#gre-caveats` (§5.8, Caveats): the short
 * disclaimer first, then the given caveats other than the scarp-dip
 * notice, one `<p>` each, in the plan's order — the low-slip caveat, then
 * the per-dip lines by ascending dip. With no caveats it holds only the
 * short disclaimer, as in the unavailable state (§5.10).
 */
export function applyCaveats(element: HTMLElement, caveats: readonly NoticeRef[]): void {
  const doc = element.ownerDocument;
  element.replaceChildren(
    shortDisclaimer(doc),
    ...caveats.filter((ref) => ref.key !== CAVEAT_KEYS.scarpDip).map((ref) => paragraph(doc, ref)),
  );
}

/**
 * `#gre-caveats` (§5.8, Region model), built at mount holding the short
 * disclaimer, so that every state that commits the skeleton shows it.
 */
export function buildCaveats(doc: Document = document): HTMLDivElement {
  const element = doc.createElement('div');
  element.id = 'gre-caveats';
  applyCaveats(element, []);
  return element;
}

/** The elements `applyNotices` fills. */
export interface NoticeTargets {
  /** The panels' applier: `#gre-panels` and each panel's `.gre-notice` and `.gre-chart` slots. */
  readonly panels: Pick<Panels, 'element' | 'slot'>;
  /** `#gre-caveats`. */
  readonly caveats: HTMLElement;
  /** `#gre-state`. */
  readonly state: HTMLElement;
}

/**
 * Places one `NoticePlan` (§5.8, Presentation precedence per update).
 * Zero matching records: `hidden` on `#gre-panels`, the explainer's parts
 * in `#gre-state`, one `<p>` each. Otherwise `#gre-state` is emptied,
 * `#gre-panels` shown, and each panel's notice placed: the warning in
 * `.gre-notice`; a suppression or no-valid-measurement notice as the only
 * content of `.gre-chart`, standing in for the chart, whose figure and
 * disclosure `views/dom/panels.ts` removes below the chart floor; with no
 * stand-in notice, any earlier one is removed from `.gre-chart` and the
 * panels' chart left as drawn. `#gre-caveats` takes the plan's caveats in
 * every case.
 */
export function applyNotices(plan: NoticePlan, targets: NoticeTargets): void {
  const { panels, state } = targets;
  const doc = state.ownerDocument;
  const empty = plan.state === 'empty';

  panels.element.hidden = empty;
  state.replaceChildren(...plan.explainer.map((ref) => paragraph(doc, ref)));

  for (const m of MEASUREMENT_NAMES) {
    const ref = plan.panels[m];
    const notice = panels.slot(m, 'notice');
    const chart = panels.slot(m, 'chart');
    if (ref !== null && ref.key === NOTICE_KEYS.warning) {
      notice.replaceChildren(paragraph(doc, ref));
    } else {
      notice.replaceChildren();
    }
    if (ref !== null && STAND_IN_KEYS.has(ref.key)) {
      const p = paragraph(doc, ref);
      p.className = STAND_IN_CLASS;
      chart.replaceChildren(p);
    } else {
      for (const child of Array.from(chart.children)) {
        if (child.classList.contains(STAND_IN_CLASS)) child.remove();
      }
    }
  }

  applyCaveats(targets.caveats, plan.caveats);
}

// --------------------------------------------------------------------
// Failure states (§5.10)
// --------------------------------------------------------------------

/** The joiner of the capability notice's `{apis}`: the failing names joined with `, ` (§5.10). */
const API_JOINER = ', ';

/** The fixed-here registry keys of the §5.10 notices, reasons, and recovery messages (the action labels follow below). */
const FAILURE_KEYS = {
  capability: 'ddd5.10.capabilityNotice',
  unavailable: 'ddd5.10.unavailableNotice',
  unavailablePreserving: 'ddd5.10.unavailablePreservingNotice',
  reasonRetrieval: 'ddd5.10.reasonRetrieval',
  reasonRead: 'ddd5.10.reasonRead',
  reasonSchemaVersion: 'ddd5.10.reasonSchemaVersion',
  reasonDataVersion: 'ddd5.10.reasonDataVersion',
  reasonMissingAttribute: 'ddd5.10.reasonMissingAttribute',
  reasonCoefficients: 'ddd5.10.reasonCoefficients',
  reasonInternal: 'ddd5.10.reasonInternal',
  loadFailed: 'ddd5.10.recoveryLoadFailed',
  saveFailed: 'ddd5.10.recoverySaveFailed',
  reloadFailed: 'ddd5.10.recoveryReloadFailed',
  storageUnavailable: 'ddd5.10.recoveryStorageUnavailable',
  defaultStarted: 'ddd5.10.recoveryDefaultStarted',
  clearFailed: 'ddd5.10.recoveryClearFailed',
  discardFailed: 'ddd5.10.recoveryDiscardFailed',
  invalidRecord: 'ddd5.10.recoveryInvalidRecord',
  incompatible: 'ddd5.10.recoveryIncompatible',
  savedSettingsLabel: 'ddd5.10.savedSettingsLabel',
  restored: 'ddd5.10.recoveryRestored',
  restoredChanged: 'ddd5.10.recoveryRestoredChanged',
  logScaleOff: 'ddd5.10.recoveryLogScaleOff',
} as const;

/** The `LoadError` kinds' `{reason}` rows (§5.10); `'data-version'` fills `{expected}` and `{loaded}`. */
const LOAD_ERROR_REASONS: { readonly [kind in Exclude<LoadError['kind'], 'data-version'>]: string } = {
  retrieval: FAILURE_KEYS.reasonRetrieval,
  read: FAILURE_KEYS.reasonRead,
  'schema-version': FAILURE_KEYS.reasonSchemaVersion,
};

/**
 * The capability notice (§5.10, Unavailable browser capabilities):
 * inserts, as the first child of `#gre-root`, a `<p role="alert">`
 * holding the fixed-here notice, `{apis}` the failing names of
 * `missingCapabilities()` in test order joined with `, `. The fallback
 * body stays standing; no skeleton is built and no live region exists.
 */
export function showCapabilityNotice(root: HTMLElement, missing: readonly string[]): void {
  const p = root.ownerDocument.createElement('p');
  p.setAttribute('role', 'alert');
  p.textContent = fillCopy(FAILURE_KEYS.capability, { apis: missing.join(API_JOINER) });
  root.prepend(p);
}

/** The two live regions `start(a, tag)` created (§5.11), which every skeleton commit keeps. */
export interface LiveRegions {
  /** The `role="status"` region. */
  readonly status: HTMLElement;
  /** The `role="alert"` region. */
  readonly alert: HTMLElement;
}

/**
 * The stable skeleton of the §5.8 region model that this module commits
 * before the first commit, reading nothing from the vintage (§5.10).
 */
export interface MinimalSkeleton {
  /** `#gre-summary`, empty. */
  readonly summary: HTMLElement;
  /** `#gre-controls`, empty and `hidden`. */
  readonly controls: HTMLElement;
  /** The results header: `#gre-prototype` while its entry exists, `#gre-caveats`, `#gre-recovery`. */
  readonly header: HTMLElement;
  /** `#gre-caveats`, holding only the short disclaimer. */
  readonly caveats: HTMLElement;
  /** `#gre-recovery`, empty. */
  readonly recovery: HTMLElement;
  /** `#gre-panels`, empty and `hidden`. */
  readonly panels: HTMLElement;
  /** `#gre-state` (`tabindex="-1"`), empty. */
  readonly state: HTMLElement;
  /** `#gre-versions`, empty: T-50 fills it from the two stamps. */
  readonly versions: HTMLElement;
}

/** An element of tag `tag` with id `id`. */
function withId<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, id: string): HTMLElementTagNameMap[K] {
  const element = doc.createElement(tag);
  element.id = id;
  return element;
}

/**
 * Builds the minimal skeleton (§5.10, Internal failure; Reload recovery
 * presentation and startup), in the §5.8 region-model order with
 * `#gre-summary` first: `#gre-controls` and `#gre-panels` empty and
 * `hidden`, the results header holding the prototype notice while its
 * entry exists, `#gre-caveats` with the short disclaimer, and the empty
 * `#gre-recovery`. The results header's overlay switch and download
 * button are built from the mounted vintage and its `Wiring` (T-49,
 * T-45), so they are not part of it.
 */
export function buildMinimalSkeleton(doc: Document = document): MinimalSkeleton {
  const summary = withId(doc, 'div', 'gre-summary');
  const controls = withId(doc, 'div', 'gre-controls');
  controls.hidden = true;
  const caveats = buildCaveats(doc);
  const recovery = withId(doc, 'div', 'gre-recovery');
  const header = doc.createElement('div');
  header.className = 'gre-results-header';
  const prototype = buildPrototypeNotice(doc);
  if (prototype !== null) header.append(prototype);
  header.append(caveats, recovery);
  const panels = withId(doc, 'div', 'gre-panels');
  panels.hidden = true;
  const state = withId(doc, 'div', 'gre-state');
  state.tabIndex = -1;
  const versions = withId(doc, 'p', 'gre-versions');
  return { summary, controls, header, caveats, recovery, panels, state, versions };
}

/** The element of `root` with id `id`, or null. */
function byId(root: HTMLElement, id: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`#${id}`);
}

/**
 * The skeleton's `#gre-state` in `root`; before the first commit — when
 * `root` holds none — commits the minimal skeleton through
 * `#gre-root.replaceChildren(…)` with the two live regions after it
 * (§5.10; §5.11, Live announcements), replacing the fallback body.
 */
function ensureSkeleton(root: HTMLElement, regions: LiveRegions): HTMLElement {
  const existing = byId(root, 'gre-state');
  if (existing !== null) return existing;
  const s = buildMinimalSkeleton(root.ownerDocument);
  root.replaceChildren(
    s.summary,
    s.controls,
    s.header,
    s.panels,
    s.state,
    s.versions,
    regions.status,
    regions.alert,
  );
  return s.state;
}

/** The skeleton element `id` of `root`; throws when the committed skeleton lacks it. */
function skeletonElement(root: HTMLElement, id: string): HTMLElement {
  const element = byId(root, id);
  if (element === null) throw new Error(`notices: the skeleton has no #${id}`);
  return element;
}

/**
 * The results-level part both the unavailable and the decision states
 * share (§5.10): `#gre-panels` hidden, `#gre-summary` emptied,
 * `#gre-caveats` keeping only the short disclaimer, and `#gre-state`
 * holding one `<p>` with `text`.
 */
function presentState(root: HTMLElement, state: HTMLElement, text: string): void {
  skeletonElement(root, 'gre-panels').hidden = true;
  skeletonElement(root, 'gre-summary').replaceChildren();
  applyCaveats(skeletonElement(root, 'gre-caveats'), []);
  const p = state.ownerDocument.createElement('p');
  p.textContent = text;
  state.replaceChildren(p);
}

/** What entered the unavailable state (§5.10, Internal failure). */
export interface UnavailableFailure {
  /** The thrown or rejected value, written with `console.error`. */
  readonly error: unknown;
  /**
   * The failed step when the error alone does not name its row:
   * `'attributes'` for a missing or empty `data-*` attribute of
   * `#gre-app` (T-50); `'regression'` for the regression-export request
   * of an accepted offset-mode Scenario, which takes its row whatever the
   * error. Otherwise the row follows the error: each `LoadError` kind its
   * own, any other throw and a routed `window` error the internal one.
   */
  readonly step?: 'attributes' | 'regression';
}

/** The `{reason}` of a failure (§5.10 table), as a registry key with its slot values. */
export function unavailableReason(failure: UnavailableFailure): NoticeRef {
  if (failure.step === 'attributes') return { key: FAILURE_KEYS.reasonMissingAttribute, slots: {} };
  if (failure.step === 'regression') return { key: FAILURE_KEYS.reasonCoefficients, slots: {} };
  const error = failure.error;
  if (error instanceof LoadError) {
    if (error.kind === 'data-version') {
      return {
        key: FAILURE_KEYS.reasonDataVersion,
        slots: { expected: String(error.expected), loaded: String(error.loaded) },
      };
    }
    return { key: LOAD_ERROR_REASONS[error.kind], slots: {} };
  }
  return { key: FAILURE_KEYS.reasonInternal, slots: {} };
}

/** The `data-gre-action` value of each `#gre-recovery` action (§5.10), in the order the region shows them. */
export const RECOVERY_ACTIONS = ['reload-restore', 'reload-fresh', 'retry-recovery', 'start-new'] as const;

/** One `#gre-recovery` action: its button carries the value as `data-gre-action`, which `main.ts`'s listeners read. */
export type RecoveryAction = (typeof RECOVERY_ACTIONS)[number];

/** The attribute naming a `#gre-recovery` button's action. */
export const RECOVERY_ACTION_ATTRIBUTE = 'data-gre-action';

/** Each action's label (§5.10). */
const ACTION_LABEL_KEYS: { readonly [a in RecoveryAction]: string } = {
  'reload-restore': 'ddd5.10.actionReloadRestore',
  'reload-fresh': 'ddd5.10.actionReloadFresh',
  'retry-recovery': 'ddd5.10.actionRetryRecovery',
  'start-new': 'ddd5.10.actionStartNew',
};

/** The recovery-decision actions, which entering the unavailable state removes (§5.10). */
const DECISION_ACTIONS: ReadonlySet<RecoveryAction> = new Set<RecoveryAction>(['retry-recovery', 'start-new']);

/** The class of the region's message box, its saved-settings summary, and its action box. */
const RECOVERY_MESSAGES_CLASS = 'gre-recovery-messages';
const RECOVERY_SAVED_CLASS = 'gre-recovery-saved';
const RECOVERY_ACTIONS_CLASS = 'gre-recovery-actions';

/** The direct child of `region` with class `cls`, or null. */
function regionPart(region: HTMLElement, cls: string): HTMLElement | null {
  for (const child of Array.from(region.children)) {
    if (child.classList.contains(cls)) return child as HTMLElement;
  }
  return null;
}

/** The action of a `#gre-recovery` button. */
function buttonAction(button: Element): RecoveryAction | null {
  const value = button.getAttribute(RECOVERY_ACTION_ATTRIBUTE);
  return (RECOVERY_ACTIONS as readonly string[]).includes(value ?? '') ? (value as RecoveryAction) : null;
}

/**
 * Sets the region's action buttons to exactly `actions`, in the
 * `RECOVERY_ACTIONS` order: a kept action's button is the same element,
 * never moved or re-created, so a focused action keeps focus (§5.10:
 * storage-write errors keep focus on the action); `disabled` is `busy`.
 * With no action, the action box is removed.
 */
function setActions(region: HTMLElement, actions: readonly RecoveryAction[], busy: boolean): void {
  let box = regionPart(region, RECOVERY_ACTIONS_CLASS);
  if (actions.length === 0) {
    box?.remove();
    return;
  }
  const doc = region.ownerDocument;
  if (box === null) {
    box = doc.createElement('div');
    box.className = RECOVERY_ACTIONS_CLASS;
    region.append(box);
  }
  const existing = new Map<RecoveryAction, HTMLButtonElement>();
  for (const button of Array.from(box.querySelectorAll('button'))) {
    const action = buttonAction(button);
    if (action !== null && actions.includes(action) && !existing.has(action)) {
      existing.set(action, button);
    } else {
      button.remove();
    }
  }
  let previous: HTMLButtonElement | null = null;
  for (const action of RECOVERY_ACTIONS) {
    if (!actions.includes(action)) continue;
    let button = existing.get(action);
    if (button === undefined) {
      button = doc.createElement('button');
      button.type = 'button';
      button.setAttribute(RECOVERY_ACTION_ATTRIBUTE, action);
      button.textContent = copyText(ACTION_LABEL_KEYS[action]);
    }
    const next: ChildNode | null = previous === null ? box.firstChild : previous.nextSibling;
    if (button !== next) box.insertBefore(button, next);
    button.disabled = busy;
    previous = button;
  }
}

/** The region's saved-settings summary (§5.10): the label **Saved scenario settings** and the saved `summary`, as text. */
function savedSummary(doc: Document, summary: string): HTMLElement {
  const dl = doc.createElement('dl');
  dl.className = RECOVERY_SAVED_CLASS;
  const dt = doc.createElement('dt');
  dt.textContent = copyText(FAILURE_KEYS.savedSettingsLabel);
  const dd = doc.createElement('dd');
  dd.textContent = summary;
  dl.append(dt, dd);
  return dl;
}

/** A message `#gre-recovery` shows (§5.10, Reload recovery presentation and startup table). */
export type RecoveryMessage =
  /** A field-export failure while the overlay is on, or the accepted offset Scenario's failed regression load. */
  | { readonly kind: 'load-failed' }
  /** The save or its exact read-back failed. */
  | { readonly kind: 'save-failed' }
  /** `location.reload()` threw. */
  | { readonly kind: 'reload-failed' }
  /**
   * The initial storage read was impossible; `defaultStarted` appends
   * "The page started with default settings." once a default result
   * commits — false when startup failed before any result.
   */
  | { readonly kind: 'storage-unavailable'; readonly defaultStarted: boolean }
  /** An explicit discard failed on an already running page. */
  | { readonly kind: 'discard-failed' }
  /**
   * A successful restore: `previous` the saved source stamp, `current`
   * the verified newly loaded manifest's `exportVersion`; equal versions
   * give the same-version text. `logScaleOff` appends the logarithmic-scale
   * sentence.
   */
  | { readonly kind: 'restored'; readonly previous: string; readonly current: string; readonly logScaleOff: boolean };

/**
 * The parts of `message`, filled, in order (§5.10): an appended sentence
 * is its own part, rendered as its own `<p>`; a plain-text use, such as
 * an announcement, takes the same parts.
 */
export function recoveryMessageParts(message: RecoveryMessage): string[] {
  switch (message.kind) {
    case 'load-failed':
      return [copyText(FAILURE_KEYS.loadFailed)];
    case 'save-failed':
      return [copyText(FAILURE_KEYS.saveFailed)];
    case 'reload-failed':
      return [copyText(FAILURE_KEYS.reloadFailed)];
    case 'storage-unavailable':
      return message.defaultStarted
        ? [copyText(FAILURE_KEYS.storageUnavailable), copyText(FAILURE_KEYS.defaultStarted)]
        : [copyText(FAILURE_KEYS.storageUnavailable)];
    case 'discard-failed':
      return [copyText(FAILURE_KEYS.discardFailed)];
    case 'restored': {
      const parts =
        message.previous === message.current
          ? [fillCopy(FAILURE_KEYS.restored, { current: message.current })]
          : [fillCopy(FAILURE_KEYS.restoredChanged, { previous: message.previous, current: message.current })];
      if (message.logScaleOff) parts.push(copyText(FAILURE_KEYS.logScaleOff));
      return parts;
    }
  }
}

/** What `#gre-recovery` shows outside a recovery-decision state (§5.10). */
export interface RecoveryView {
  /** The messages in order — e.g. an earlier successful-restoration notice, then a field failure's message. */
  readonly messages: readonly RecoveryMessage[];
  /**
   * An incompatible record's saved summary, shown under **Saved scenario
   * settings**: a string sets it, null removes it, and an absent member
   * keeps whatever the region shows.
   */
  readonly saved?: string | null;
  /** The actions, shown in the `RECOVERY_ACTIONS` order. */
  readonly actions: readonly RecoveryAction[];
  /** True while an action executes: its buttons are `disabled` until it reports failure or navigation starts. */
  readonly busy?: boolean;
}

/**
 * Renders `#gre-recovery` (§5.10): the messages, one `<p>` per part, in a
 * message box first; an incompatible record's saved summary; then the
 * actions. Empty when nothing applies. A kept action's button is never
 * re-created, so a focused action keeps focus. Saved text is set only as
 * text.
 */
export function applyRecovery(region: HTMLElement, view: RecoveryView): void {
  const doc = region.ownerDocument;
  const parts = view.messages.flatMap(recoveryMessageParts);
  let box = regionPart(region, RECOVERY_MESSAGES_CLASS);
  if (parts.length === 0) {
    box?.remove();
  } else {
    if (box === null) {
      box = doc.createElement('div');
      box.className = RECOVERY_MESSAGES_CLASS;
      region.prepend(box);
    }
    box.replaceChildren(
      ...parts.map((text) => {
        const p = doc.createElement('p');
        p.textContent = text;
        return p;
      }),
    );
  }
  if (view.saved !== undefined) {
    regionPart(region, RECOVERY_SAVED_CLASS)?.remove();
    if (view.saved !== null) {
      const next = regionPart(region, RECOVERY_ACTIONS_CLASS);
      region.insertBefore(savedSummary(doc, view.saved), next);
    }
  }
  setActions(region, view.actions, view.busy ?? false);
}

/**
 * Enters the unavailable state (§5.10, Internal failure) and returns its
 * notice, the text the alert region announces (`main.ts`): the error
 * written with `console.error`; before the first commit, the minimal
 * skeleton committed; a shown recovery decision's **Retry recovery** and
 * **Start a new scenario** removed from `#gre-recovery`, whose reload
 * actions and saved summary stay; `#gre-panels` hidden; `#gre-state`
 * holding "Results are unavailable: {reason}. Reload the page to try
 * again." — or, while `#gre-recovery` offers **Reload and restore
 * settings**, its preserving variant — which replaces any decision
 * message; `#gre-summary` emptied; `#gre-caveats` keeping only the short
 * disclaimer; and `disabled` on every control in `#gre-controls`, on
 * `#gre-overlay`, and on `#gre-download`. Render the failure's recovery
 * actions first. The focus move to `#gre-state` is `main.ts`'s, so the
 * caller notes whether focus was inside `#gre-root` before this call.
 */
export function enterUnavailable(root: HTMLElement, regions: LiveRegions, failure: UnavailableFailure): string {
  console.error(failure.error);
  const state = ensureSkeleton(root, regions);

  const recovery = skeletonElement(root, 'gre-recovery');
  const actions = regionPart(recovery, RECOVERY_ACTIONS_CLASS);
  if (actions !== null) {
    for (const button of Array.from(actions.querySelectorAll('button'))) {
      const action = buttonAction(button);
      if (action !== null && DECISION_ACTIONS.has(action)) button.remove();
    }
    if (actions.children.length === 0) actions.remove();
  }
  const preserving = recovery.querySelector(`button[${RECOVERY_ACTION_ATTRIBUTE}="reload-restore"]`) !== null;

  const reason = noticeText(unavailableReason(failure));
  const text = fillCopy(preserving ? FAILURE_KEYS.unavailablePreserving : FAILURE_KEYS.unavailable, { reason });
  presentState(root, state, text);

  const controls = skeletonElement(root, 'gre-controls');
  for (const control of Array.from(
    controls.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement>(
      'input, button, select, textarea',
    ),
  )) {
    control.disabled = true;
  }
  for (const id of ['gre-overlay', 'gre-download']) {
    const control = byId(root, id);
    if (control instanceof HTMLInputElement || control instanceof HTMLButtonElement) control.disabled = true;
  }
  return text;
}

/** A recovery-decision state (§5.10): startup holds, with no default result, until an explicit choice. */
export type RecoveryDecision =
  /** An initial known saved record could not be removed or its removal verified: **Retry recovery** and **Start a new scenario**. */
  | { readonly kind: 'clear-failed' }
  /** An invalid or unsupported recovery record: **Start a new scenario**. */
  | { readonly kind: 'invalid-record' }
  /**
   * Saved settings incompatible with the loaded manifest: `current` its
   * `exportVersion`, `summary` the saved summary, shown under **Saved
   * scenario settings**, and `path` the incompatible path, logged for
   * diagnosis and never shown; **Start a new scenario**.
   */
  | { readonly kind: 'incompatible'; readonly current: string; readonly summary: string; readonly path: string };

/**
 * Enters a recovery-decision state (§5.10, Reload recovery presentation
 * and startup) and returns its message, the text the alert region
 * announces (`main.ts`): before the first commit, the minimal skeleton
 * committed — whose root commit is the mount's first commit, so a
 * resumption populates it in place; `#gre-panels` and `#gre-controls`
 * hidden; `#gre-summary` empty; `#gre-caveats` keeping only the short
 * disclaimer; `#gre-state` holding the message; and `#gre-recovery`
 * holding the saved summary, for an incompatible record, and the
 * decision's actions, enabled. No result is committed.
 */
export function enterRecoveryDecision(root: HTMLElement, regions: LiveRegions, decision: RecoveryDecision): string {
  const state = ensureSkeleton(root, regions);
  let text: string;
  let actions: RecoveryAction[];
  switch (decision.kind) {
    case 'clear-failed':
      text = copyText(FAILURE_KEYS.clearFailed);
      actions = ['retry-recovery', 'start-new'];
      break;
    case 'invalid-record':
      text = copyText(FAILURE_KEYS.invalidRecord);
      actions = ['start-new'];
      break;
    case 'incompatible':
      console.warn(`recovery: saved settings incompatible at ${decision.path === '' ? '(root)' : decision.path}`);
      text = fillCopy(FAILURE_KEYS.incompatible, { current: decision.current });
      actions = ['start-new'];
      break;
  }
  skeletonElement(root, 'gre-controls').hidden = true;
  presentState(root, state, text);

  applyRecovery(skeletonElement(root, 'gre-recovery'), {
    messages: [],
    saved: decision.kind === 'incompatible' ? decision.summary : null,
    actions,
  });
  return text;
}
