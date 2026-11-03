// Focus management (docs/app/ddd.md §5.11, Focus management): the
// at-mount focus move, and the two cases in which a render pass moves
// focus afterwards — slot replacement (rule 1) and hidden, disabled, or
// emptied focus (rule 2) — each with `{ preventScroll: true }`, so the
// reader's position holds. Besides these, only the same-page link guard of
// `main.ts` moves focus. A rejected commit never moves focus, and Reset
// leaves it on its button: neither replaces, hides, disables, or empties
// the focused element.
//
// An element's focus fallback is its nearest ancestor with
// `tabindex="-1"` that the render leaves visible — a panel `<section>` or
// `#gre-state` — and otherwise `#gre-state` while `#gre-panels` is hidden,
// or the selected measurement's panel `<section>`.
//
// A browser-only file (§5.1).

import type { MeasurementName } from '../state/state';

/** The slot elements a render pass replaces the children of (§5.8, Region model). */
const SLOT_SELECTOR = [
  '#gre-summary',
  '#gre-assist-body',
  '#gre-caveats',
  '#gre-state',
  '.gre-n',
  '.gre-notice',
  '.gre-legend',
  '.gre-chart',
  '.gre-info',
  '.gre-table',
  '.gre-readoff output',
].join(', ');

/**
 * The at-mount focus move (§5.11; DD-4): `focus({ preventScroll: true })`
 * on `target` — the selected measurement's panel `<section>`, or
 * `#gre-state` when the first render shows the empty, an unavailable, or a
 * recovery-decision state — then its `scrollIntoView()`. The caller makes
 * it only after the mount's first commit and only while `location.hash`
 * is empty.
 */
export function mountFocus(target: HTMLElement): void {
  target.focus({ preventScroll: true });
  target.scrollIntoView();
}

/** True when `element` or an ancestor up to `root` is `hidden`. */
function isHidden(element: Element, root: HTMLElement): boolean {
  for (let e: Element | null = element; e !== null; e = e.parentElement) {
    if (e instanceof HTMLElement && e.hidden) return true;
    if (e === root) break;
  }
  return false;
}

/** True when `element` is a disabled form control, or inside a disabled fieldset. */
function isDisabled(element: Element): boolean {
  return element.matches(':disabled');
}

/** The mount's focus context: `#gre-root` and the selected measurement. */
export interface FocusContext {
  readonly root: HTMLElement;
  /** The display state's selected measurement, whose panel is the last fallback (§5.11). */
  readonly measurement: MeasurementName;
}

/**
 * The focus fallback of `element` (§5.11): its nearest ancestor with
 * `tabindex="-1"` that is not hidden, and otherwise `#gre-state` while
 * `#gre-panels` is hidden, or the selected measurement's panel
 * `<section>`.
 */
export function focusFallback(element: Element | null, ctx: FocusContext): HTMLElement | null {
  const { root } = ctx;
  for (let e = element?.parentElement ?? null; e !== null && e !== root; e = e.parentElement) {
    if (e.getAttribute('tabindex') === '-1' && !isHidden(e, root)) return e;
  }
  const panels = root.querySelector<HTMLElement>('#gre-panels');
  if (panels === null || panels.hidden) return root.querySelector<HTMLElement>('#gre-state');
  return root.querySelector<HTMLElement>(`#gre-${ctx.measurement}`);
}

/** What `captureFocus` records before a render pass (§5.11, rule 1). */
export interface FocusRecord {
  /** The focused element inside `#gre-root`, or null when focus is elsewhere. */
  readonly element: HTMLElement | null;
  /** The slot holding it, or null. */
  readonly slot: HTMLElement | null;
  /** Its `data-focus-key`, or null. */
  readonly key: string | null;
  /** Whether it is `#gre-state` holding content (rule 2's emptied case). */
  readonly stateFilled: boolean;
}

/** Records the focused element, its slot, and its `data-focus-key` before a render pass (§5.11, rule 1). */
export function captureFocus(root: HTMLElement): FocusRecord {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || active === root || !root.contains(active)) {
    return { element: null, slot: null, key: null, stateFilled: false };
  }
  const slot = active.closest<HTMLElement>(SLOT_SELECTOR);
  return {
    element: active,
    slot: slot !== null && root.contains(slot) ? slot : null,
    key: active.getAttribute('data-focus-key'),
    stateFilled: active.id === 'gre-state' && active.childNodes.length > 0,
  };
}

/** Focuses `element` without scrolling. */
function focusQuietly(element: HTMLElement | null): void {
  element?.focus({ preventScroll: true });
}

/**
 * Applies the two after-mount focus rules once a render pass has run
 * (§5.11): rule 1 — when the recorded element was replaced with its
 * slot's children, focus the element in that slot with the same
 * `data-focus-key`, or the slot's fallback; rule 2 — when the recorded
 * element is still there but hidden, disabled, or (for `#gre-state`)
 * emptied, focus its fallback. Otherwise focus stays where it is.
 */
export function restoreFocus(record: FocusRecord, ctx: FocusContext): void {
  const element = record.element;
  if (element === null) return;
  if (!element.isConnected || !ctx.root.contains(element)) {
    const slot = record.slot;
    if (slot === null || !slot.isConnected) {
      focusQuietly(focusFallback(null, ctx));
      return;
    }
    if (record.key !== null) {
      for (const candidate of Array.from(slot.querySelectorAll<HTMLElement>('[data-focus-key]'))) {
        if (candidate.getAttribute('data-focus-key') === record.key && !isHidden(candidate, ctx.root)) {
          candidate.focus({ preventScroll: true });
          if (document.activeElement === candidate) return;
        }
      }
    }
    focusQuietly(focusFallback(slot, ctx));
    return;
  }
  const emptied = record.stateFilled && element.childNodes.length === 0;
  if (emptied || isHidden(element, ctx.root) || isDisabled(element)) {
    focusQuietly(focusFallback(element, ctx));
  }
}

/**
 * The unavailable state's focus move (§5.11, rule 2): the render that
 * enters it moves any focus that was inside `#gre-root` before it —
 * `focusWasInside` — to `#gre-state`, the short disclaimer's link
 * included, overriding rule 1.
 */
export function unavailableFocus(root: HTMLElement, focusWasInside: boolean): void {
  if (!focusWasInside) return;
  focusQuietly(root.querySelector<HTMLElement>('#gre-state'));
}

/** True when the focused element is inside `root` (before a render that may move it). */
export function focusInside(root: HTMLElement): boolean {
  const active = document.activeElement;
  return active !== null && active !== root && root.contains(active);
}
