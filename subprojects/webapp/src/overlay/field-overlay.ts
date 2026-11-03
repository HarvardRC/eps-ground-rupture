// The field overlay's applier (docs/app/ddd.md §5.8, Field overlay;
// §5.12, Overlay marks; §5.11, Chart text alternatives): the one
// results-header switch "Compare with field measurements (past
// earthquakes)" — `<input type="checkbox" id="gre-overlay">` inside its
// `<label>`, off by default, display state that Reset leaves alone — and,
// over the `field` member of the `RenderInput` (the `FieldRow[]` that
// `loadFieldExport` yields while the field export is `ready`, `'failed'`
// while it is `failed`, null otherwise; §5.3 item 3), what the
// measurement panels show while the switch is on:
//
// - the height and width panels' drawn rows as overlay-group marks for
//   the chart builders (`panelOverlay`), black ticks in the reserved 12 px
//   band (`views/charts.ts`);
// - their `.gre-legend` overlay legend: "Analogous, not identical", the
//   PDD §5.7 framing with each `**…**` span as `<strong>`, the show-all
//   toggle button with `aria-pressed`, and one entry per group in the
//   PDD §4.4 order with its label and data-page link; or, while `field`
//   is `'failed'`, the §5.8 field-export line instead;
// - the scarp-dip panel's `.gre-legend` note, `overlayNote('scarp_dip')`,
//   as HTML, never inside the chart's `<svg>`;
// - the field table of exactly the drawn rows, `fieldTableSpec` (§5.11)
//   in its own scroll wrapper `<div class="gre-table-scroll" role="region"
//   tabindex="0" aria-labelledby="{pid}-field-cap"
//   data-focus-key="{pid}-field">`, built by `chartDataTable`.
//
// Field rows never reach `engine/` or `stats/`: no count, statistic, or
// matching population reads them. Field marks never use a scarp-class
// color. The listeners — the switch's and the show-all buttons' — take the
// mount's `Wiring` (§5.1): each is added with `{ signal: wiring.signal }`
// and hands its display-state change to `wiring.scheduler.update(next)`,
// built from `wiring.scheduler.current()`. The field-export request when
// the switch turns on, the re-render when it settles, and the failure's
// announcement are the scheduler's (§5.3 item 3); this module neither
// loads, stores settings, nor starts a reload.
//
// An applier (§5.1): it builds nodes only from builder output — the
// overlay model's rows and groups, the field-table spec, and registry
// text — and commits them. A browser-only file (§5.1).

import type { FieldRow, Manifest } from '../decode/fields';
import { reduce, type DisplayAction, type DisplayState, type MeasurementName, type OverlayMeasurementName } from '../state/state';
import { fieldTableSpec } from '../views/chart-text';
import { copyText } from '../views/copy';
import { chartDataTable } from '../views/dom/panels';
import type { Wiring } from '../views/dom/wiring';
import type { RenderInput } from '../views/render-input';
import { fieldOrder, isOverlayMeasurement, overlayGroups, overlayNote, overlayRows, type OverlayGroup } from './model';

// --------------------------------------------------------------------
// Element helpers
// --------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: readonly (readonly [string, string])[] = [],
  children: readonly (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [name, value] of attrs) element.setAttribute(name, value);
  element.append(...children);
  return element;
}

/**
 * A registry text with each `**…**` span as `<strong>` (§5.8, Copy
 * registry: the PDD's emphasis, shown as the PDD sets it). Throws for an
 * unpaired marker.
 */
function emphasized(text: string): (Node | string)[] {
  const parts = text.split('**');
  if (parts.length % 2 === 0) {
    throw new Error(`overlay: unpaired ** in ${JSON.stringify(text)}`);
  }
  const nodes: (Node | string)[] = [];
  parts.forEach((part, k) => {
    if (k % 2 === 1) nodes.push(el('strong', [], [part]));
    else if (part !== '') nodes.push(part);
  });
  return nodes;
}

/**
 * A bracketed placeholder's text, rendered as the element its use site
 * names (§5.8, Copy registry): `[Show all field widths]` as the width
 * panel's show-all button label.
 */
function bracketed(text: string): string {
  if (!(text.startsWith('[') && text.endsWith(']'))) {
    throw new Error(`overlay: ${JSON.stringify(text)} is not a bracketed placeholder`);
  }
  return text.slice(1, -1);
}

/** One display-only change: a reducer call on `current()`, handed to `update(next)` (§5.1, Wiring). */
function dispatch(action: DisplayAction, manifest: Manifest, wiring: Wiring): void {
  const current = wiring.scheduler.current();
  const next = reduce(current, action, manifest);
  if (next !== current) wiring.scheduler.update(next);
}

// --------------------------------------------------------------------
// The results-header switch
// --------------------------------------------------------------------

/** The overlay switch of the results header (§5.8, Region model). */
export interface OverlaySwitch {
  /** The `<label>` holding `#gre-overlay` and the PDD §4.4 switch label, for the results header. */
  readonly element: HTMLLabelElement;
  /** `#gre-overlay`. */
  readonly input: HTMLInputElement;
  /** Sets the checkbox's `checked` from the display state's `overlay` (a render-pass skeleton write). */
  sync(display: DisplayState): void;
}

/**
 * Builds the switch, off, and adds its `change` listener with the mount's
 * signal: the next display state's `overlay` goes to the scheduler's
 * `update(next)`, a display-only update. `manifest` is the mounted
 * vintage's, the third argument of every reducer call.
 */
export function buildOverlaySwitch(manifest: Manifest, wiring: Wiring): OverlaySwitch {
  const input = el('input', [
    ['type', 'checkbox'],
    ['id', 'gre-overlay'],
  ]);
  const element = el('label', [['class', 'gre-overlay-switch']], [input, ' ', copyText('pdd4.4.overlaySwitch')]);
  input.addEventListener('change', () => dispatch({ type: 'setOverlay', overlay: input.checked }, manifest, wiring), {
    signal: wiring.signal,
  });
  return {
    element,
    input,
    sync: (display) => {
      input.checked = display.overlay;
    },
  };
}

// --------------------------------------------------------------------
// The show-all toggles
// --------------------------------------------------------------------

/**
 * Adds the listener of panel `m`'s show-all toggle to its `.gre-legend`
 * slot, with the mount's signal. The toggle is regenerated with the
 * legend on every render pass, so the stable slot listens for the
 * button's `click`; it flips the display state's `showAll[m]` through the
 * scheduler's `update(next)`, a display-only update of that panel.
 */
export function wireShowAll(legend: HTMLElement, m: OverlayMeasurementName, manifest: Manifest, wiring: Wiring): void {
  const key = showAllKey(m);
  legend.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const button = target.closest('button');
      if (button === null || !legend.contains(button) || button.dataset.focusKey !== key) return;
      const showAll = !wiring.scheduler.current().display.showAll[m];
      dispatch({ type: 'setShowAll', measurement: m, showAll }, manifest, wiring);
    },
    { signal: wiring.signal },
  );
}

function showAllKey(m: OverlayMeasurementName): string {
  return `showall:${m}`;
}

// --------------------------------------------------------------------
// Per-panel overlay of one render
// --------------------------------------------------------------------

/** What panel `m` draws of the overlay in one render (§5.8, §5.12). */
export interface PanelOverlay {
  /** The rows the panel marks: `overlayRows` while the switch is on and `field` is ready; none otherwise. */
  readonly rows: readonly FieldRow[];
  /** `overlayGroups(rows)`: the marks per (`source`, `source_quantity`), for the chart builders. */
  readonly groups: readonly OverlayGroup[];
}

const NOTHING: PanelOverlay = Object.freeze({ rows: Object.freeze([]), groups: Object.freeze([]) });

/**
 * Panel `m`'s overlay: while the switch is on and `field` holds the rows,
 * `overlayRows(field, m, showAll[m])` and its groups; nothing while the
 * switch is off, while `field` is null (absent or loading) or `'failed'`,
 * and on the scarp-dip panel.
 */
export function panelOverlay(input: RenderInput, display: DisplayState, m: MeasurementName): PanelOverlay {
  const field = input.field;
  if (!display.overlay || field === null || field === 'failed' || !isOverlayMeasurement(m)) return NOTHING;
  const rows = overlayRows(field, m, display.showAll[m]);
  return rows.length === 0 ? NOTHING : { rows, groups: overlayGroups(rows) };
}

// --------------------------------------------------------------------
// The legend
// --------------------------------------------------------------------

/**
 * The overlay's part of panel `m`'s `.gre-legend` slot, which the panel
 * appends after its scarp-type legend while the chart renders (§5.8 panel
 * contents 4); none while the switch is off.
 *
 * - Scarp dip: the PDD §4.4 note, `overlayNote('scarp_dip')`, as HTML.
 * - Height and width, `field` `'failed'`: the §5.8 field-export line.
 * - Height and width, `field` ready: the overlay legend — the PDD §4.4
 *   label "Analogous, not identical"; the PDD §5.7 framing, its first two
 *   sentences on the height panel and its whole first text on the width
 *   panel, `[Show all field widths]` rendering as that panel's show-all
 *   toggle; the height panel's toggle "Show all field measurements"
 *   (fixed in §5.8) after its framing; then one entry per drawn group in
 *   the PDD §4.4 order, its label — with the §5.8 limited-comparison
 *   suffix when its rows carry `limited_comparison` — linking to the
 *   source's section of the data page.
 * - Height and width, `field` null (absent or loading): nothing.
 */
export function overlayLegend(input: RenderInput, display: DisplayState, m: MeasurementName): HTMLElement[] {
  if (!display.overlay) return [];
  const note = overlayNote(m);
  if (note !== null) return [el('p', [['class', 'gre-overlay-note']], [note])];
  if (!isOverlayMeasurement(m)) return [];
  const field = input.field;
  if (field === 'failed') return [el('p', [['class', 'gre-overlay-failed']], [copyText('ddd5.8.fieldExportLine')])];
  if (field === null) return [];

  const showAll = display.showAll[m];
  const toggle = el(
    'button',
    [
      ['type', 'button'],
      ['aria-pressed', String(showAll)],
      ['data-focus-key', showAllKey(m)],
    ],
    [m === 'dzw' ? bracketed(copyText('pdd5.7.showAllWidths')) : copyText('ddd5.8.showAllMeasurements')],
  );
  const children: HTMLElement[] = [
    el('p', [['class', 'gre-overlay-label']], [copyText('pdd4.4.analogousLabel')]),
    el('p', [], emphasized(copyText('pdd5.7.overlayFraming'))),
  ];
  if (m === 'dzw') children.push(el('p', [], emphasized(copyText('pdd5.7.widthDefault'))));
  children.push(el('p', [], [toggle]));

  const { groups } = panelOverlay(input, display, m);
  if (groups.length > 0) {
    children.push(
      el(
        'ul',
        [['class', 'gre-overlay-groups']],
        groups.map((g) =>
          el('li', [], [
            el(
              'a',
              [
                ['href', g.link],
                ['data-focus-key', `overlay-source:${m}:${g.source}`],
              ],
              [g.limitedComparison ? g.label + copyText('ddd5.8.limitedComparison') : g.label],
            ),
          ]),
        ),
      ),
    );
  }
  return [el('div', [['class', 'gre-overlay-legend']], children)];
}

// --------------------------------------------------------------------
// The field table
// --------------------------------------------------------------------

/**
 * Panel `m`'s field table for its chart-data disclosure, after the bin
 * table, while the panel draws ticks (§5.11, Markup): `<table
 * id="{pid}-field">` from `fieldTableSpec` over exactly the drawn rows,
 * with its `<caption id="{pid}-field-cap">`, inside its own `.gre-table-scroll`
 * wrapper (`chartDataTable`); null while the panel draws no tick.
 */
export function fieldTable(input: RenderInput, display: DisplayState, m: MeasurementName): HTMLElement | null {
  const { rows } = panelOverlay(input, display, m);
  if (rows.length === 0 || !isOverlayMeasurement(m)) return null;
  return chartDataTable(fieldTableSpec(rows, fieldOrder(m)), `gre-${m}-field`);
}
