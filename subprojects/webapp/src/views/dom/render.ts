// The render pass `render` of docs/app/ddd.md §5.8 (View layer; Region
// model), over the appliers of T-40–T-45 and T-49: it commits one
// `RenderInput` with the current display state into the stable skeleton
// that `main.ts` committed, and does only the two things a render pass
// does — it replaces the children of slot elements (`#gre-summary`,
// `#gre-assist-body`, `#gre-caveats`, `#gre-state`, and per panel `.gre-n`,
// `.gre-notice`, `.gre-legend`, `.gre-chart`, `.gre-info`, `.gre-table`,
// and the read-off `<output>`), and it sets `checked`, `disabled`, or
// `hidden` on skeleton controls, never `value` on
// `document.activeElement`. Around the pass it applies the two
// after-mount focus rules of §5.11 (`a11y/focus.ts`), and after it links
// the glossary terms whose first occurrence lies in a replaced slot
// (`linkGlossary`, §5.8).
//
// Two scopes: a result pass — a newly computed result, the first render
// included — renders every slot; a display pass (§5.3 item 3; §5.12,
// Resizing) re-renders only the panels whose display state changed, the
// chart slots `rerenderChart` asked for, and the slots that read `field`
// when the field export's state changed, with no query and no
// announcement.
//
// An applier (§5.1): every value and string comes from a builder.
//
// A browser-only file (§5.1).

import { captureFocus, restoreFocus } from '../../a11y/focus';
import * as config from '../../config';
import type { OverlaySwitch } from '../../overlay/field-overlay';
import { MEASUREMENT_NAMES, OVERLAY_MEASUREMENT_NAMES, type AppState, type MeasurementName } from '../../state/state';
import { assistLines } from '../assist';
import { selectNotices, type NoticePlan } from '../notices';
import type { RenderInput } from '../render-input';
import { controlModel } from '../scenario-controls';
import { statsRows, unclassifiedLine } from '../stats-table';
import { summaryText } from '../summary';
import { linkGlossary } from './glossary';
import { applyNotices } from './notices';
import type { Panels } from './panels';
import { applyStatsTable } from './table';

/** The committed skeleton's elements and appliers that a render pass writes. */
export interface RenderTargets {
  /** `#gre-root`. */
  readonly root: HTMLElement;
  /** `#gre-summary`. */
  readonly summary: HTMLElement;
  /** `#gre-assist-body`, inside `#gre-controls`. */
  readonly assistBody: HTMLElement;
  /** The family toggle `#gre-family-view` and its note `#gre-family-note` (§5.8, Family view). */
  readonly familyToggle: HTMLInputElement;
  readonly familyNote: HTMLElement;
  /** The overlay switch of the results header (T-49). */
  readonly overlay: OverlaySwitch;
  /** `#gre-caveats`. */
  readonly caveats: HTMLElement;
  /** `#gre-state`. */
  readonly state: HTMLElement;
  /** The committed `#gre-panels`, which holds the panel sections. */
  readonly panelsElement: HTMLElement;
  /** The panels' applier (T-41). */
  readonly panels: Panels;
}

/** What one render pass renders. */
export type RenderScope =
  /** A newly computed result, the mount's first render included: every slot. */
  | { readonly kind: 'result' }
  /**
   * A display pass: `panels`, the panels whose display state changed;
   * `charts`, the `.gre-chart` slots `rerenderChart` asked for; `field`,
   * whether the field export's state changed, which re-renders the
   * `.gre-legend` and `.gre-chart` slots of the height and width panels.
   */
  | {
      readonly kind: 'display';
      readonly panels: readonly MeasurementName[];
      readonly charts: readonly MeasurementName[];
      readonly field: boolean;
    };

/**
 * The family toggle's `checked` and `disabled` and its note's `hidden`
 * from the accepted state (§5.8, Family view): the same values the
 * scarp-filter handler of `views/dom/controls.ts` writes.
 */
function writeFamily(t: RenderTargets, current: AppState, input: RenderInput): void {
  const family = controlModel(input.vintage.manifest, current).familyView;
  t.familyToggle.checked = family.checked;
  t.familyToggle.disabled = family.disabled;
  t.familyNote.hidden = family.noteHidden;
}

/** One `<p>` per line. */
function paragraphs(doc: Document, lines: readonly string[]): HTMLParagraphElement[] {
  return lines.map((line) => {
    const p = doc.createElement('p');
    p.textContent = line;
    return p;
  });
}

/**
 * The render pass (§5.8): commits `input` with the display state of
 * `current` — the scheduler's held `{ scenario, display }`, whose Scenario
 * is read only for the family toggle — in the given scope. Returns the
 * `NoticePlan` a result pass placed, which the settled-update
 * announcement reads (§5.11), or null for a display pass.
 */
export function render(t: RenderTargets, input: RenderInput, current: AppState, scope: RenderScope): NoticePlan | null {
  const display = current.display;
  const focus = captureFocus(t.root);
  const doc = t.root.ownerDocument;
  const replaced: HTMLElement[] = [];
  const panelSlots = (m: MeasurementName): HTMLElement[] => {
    const section = t.panels.section(m);
    return [
      t.panels.slot(m, 'notice'),
      t.panels.slot(m, 'legend'),
      t.panels.slot(m, 'chart'),
      t.panels.slot(m, 'table'),
      ...Array.from(section.querySelectorAll<HTMLElement>('.gre-n, .gre-info, .gre-readoff output')),
    ];
  };

  let plan: NoticePlan | null = null;
  if (scope.kind === 'result') {
    const manifest = input.vintage.manifest;
    t.summary.replaceChildren(summaryText({ scenario: input.scenario, manifest }, input.selection));
    t.assistBody.replaceChildren(...paragraphs(doc, assistLines(input) ?? []));
    // The plan first: it shows or hides `#gre-panels`, so the panels then
    // draw each chart at its slot's laid-out width (§5.12), never inside a
    // hidden container.
    plan = selectNotices(input, config);
    applyNotices(plan, { panels: { element: t.panelsElement, slot: t.panels.slot }, caveats: t.caveats, state: t.state });
    t.panels.render(input, display);
    for (const m of MEASUREMENT_NAMES) {
      applyStatsTable(
        t.panels.slot(m, 'table'),
        statsRows(input.measurements[m].stats, input.selection.perMeasurement[m], m, config),
        unclassifiedLine(input.selection.unclassified),
      );
    }
    replaced.push(t.summary, t.assistBody, t.caveats, t.state);
    for (const m of MEASUREMENT_NAMES) replaced.push(...panelSlots(m));
  } else {
    const done = new Set<MeasurementName>(scope.panels);
    if (scope.panels.length > 0) t.panels.render(input, display, scope.panels);
    for (const m of scope.panels) replaced.push(...panelSlots(m));
    if (scope.field) {
      for (const m of OVERLAY_MEASUREMENT_NAMES) {
        if (done.has(m)) continue;
        t.panels.renderLegend(m, input, display);
        t.panels.renderChart(m, input, display);
        replaced.push(t.panels.slot(m, 'legend'), t.panels.slot(m, 'chart'));
        done.add(m);
      }
    }
    for (const m of scope.charts) {
      if (done.has(m)) continue;
      t.panels.renderChart(m, input, display);
      replaced.push(t.panels.slot(m, 'chart'));
      done.add(m);
    }
  }
  t.overlay.sync(display);
  writeFamily(t, current, input);

  linkGlossary(t.root, replaced);
  restoreFocus(focus, { root: t.root, measurement: display.measurement });
  return plan;
}
