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
// An applier (§5.1): it builds nodes only from builder output and the copy
// registry and commits them by replacing slot children; it computes no
// value and writes no text of its own. A click on the disclaimer link is
// taken by the same-page link guard of §5.11 (`start`, T-46).
//
// A browser-only file (§5.1).

import { MEASUREMENT_NAMES } from '../../state/state';
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
