// The measurement panels (docs/app/ddd.md §5.8, Measurement panels; §5.11
// Chart text alternatives; §5.12 Charts): the three DD-4 panel
// `<section>`s stacked in `#gre-panels`, each holding the eight §5.8
// panel contents in order — the head with N; the view switch (and, on the
// width panel, the log-scale toggle); `.gre-notice`; `.gre-legend`;
// `.gre-chart` with the figure and its chart-data disclosure; the
// percentile read-off; `.gre-info`; `.gre-table` — and the panels'
// listeners and resize observers.
//
// An applier (§5.1): it builds nodes only from builder output — the
// chart `SvgNode`s, the table specs, and registry text — and commits them.
// The render pass `render` of `views/dom/render.ts` (T-46) calls
// `render` and `renderChart`; `.gre-notice` and the stand-in notice in
// `.gre-chart` are `views/dom/notices.ts`'s (T-43), `.gre-table` is
// `views/dom/table.ts`'s (T-42), and the overlay legend, marks, and field
// table are `overlay/field-overlay.ts`'s (T-49).
//
// A browser-only file (§5.1).

import { announce } from '../../a11y/announce';
import * as config from '../../config';
import type { Manifest } from '../../decode/fields';
import { readReadoff } from '../../state/parse';
import { reduce, type DisplayAction, type DisplayState, type MeasurementName, type PanelView } from '../../state/state';
import { quantileLinear } from '../../stats/quantile';
import { binTableSpec, fillCopy, measurementLabel, quantityText, type TableSpec } from '../chart-text';
import {
  CHART_HEIGHT,
  ecdfSpec,
  ecdfSvg,
  histogramLogSpec,
  histogramSpec,
  histogramSvg,
  stackGroups,
  swatchSvg,
  type HistogramSpecInput,
} from '../charts';
import { copyText } from '../copy';
import { formatCount } from '../format';
import type { RenderInput } from '../render-input';
import { chartSummary } from '../summary';
import { toSvgElement } from './svg';
import type { Wiring } from './wiring';

/** The panels in the canonical measurement order (§5.8, DD-4). */
const PANEL_ORDER: readonly MeasurementName[] = [
  'scarp_height',
  'dzw',
  'scarp_dip',
  // Reserved fourth slot (D-20, Us − Ud as a fourth displayed measurement;
  // PDD §4.1): the documented insertion point after the third panel. No
  // fourth panel ships in the MVP.
];

/** The two views in the switch's order (§5.8: the PDD §4.1 listing order; the histogram opens). */
const VIEWS: readonly { readonly view: PanelView; readonly key: string }[] = [
  { view: 'histogram', key: 'ddd5.8.viewHistogram' },
  { view: 'cumulative', key: 'ddd5.8.viewCumulative' },
];

/** The elements of one panel's skeleton. */
interface PanelElements {
  readonly section: HTMLElement;
  readonly n: HTMLElement;
  readonly views: { readonly [v in PanelView]: HTMLInputElement };
  /** The width panel's log-scale toggle: its `<label>` and checkbox; null on the other panels. */
  readonly log: { readonly label: HTMLLabelElement; readonly input: HTMLInputElement } | null;
  readonly notice: HTMLElement;
  readonly legend: HTMLElement;
  readonly chart: HTMLElement;
  readonly readoff: { readonly wrap: HTMLElement; readonly input: HTMLInputElement; readonly output: HTMLOutputElement };
  readonly info: HTMLElement;
  readonly table: HTMLElement;
}

/** The slots other appliers fill. */
export type PanelSlot = 'notice' | 'legend' | 'chart' | 'table';

/** The panels' applier, as the render pass uses it. */
export interface Panels {
  /** `#gre-panels`, holding the three panel sections. */
  readonly element: HTMLElement;
  /** A panel's `<section>`, `#gre-{measurement}`. */
  section(m: MeasurementName): HTMLElement;
  /** A panel's slot element. */
  slot(m: MeasurementName, name: PanelSlot): HTMLElement;
  /**
   * Renders this module's slots and skeleton-control states of the given
   * panels (all three by default): `.gre-n`, the view switch, the
   * log-scale toggle, the scarp-type legend, `.gre-chart`, the read-off,
   * and `.gre-info`.
   */
  render(input: RenderInput, display: DisplayState, measurements?: readonly MeasurementName[]): void;
  /**
   * Re-renders one panel's `.gre-chart` slot at its current width — the
   * figure and the chart-data disclosure — the `rerenderChart` path
   * (§5.12, Resizing). Below the chart floor it removes this module's
   * figure and disclosure and leaves the stand-in notice of
   * `views/dom/notices.ts` in place.
   */
  renderChart(m: MeasurementName, input: RenderInput, display: DisplayState): void;
}

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
 * A chart-data table (§5.11, Markup): `<table id="{tid}">` with its
 * `<caption id="{tid}-cap">`, inside its own scroll wrapper
 * `<div class="gre-table-scroll" role="region" tabindex="0"
 * aria-labelledby="{tid}-cap" data-focus-key="{tid}">`.
 */
export function chartDataTable(spec: TableSpec, tid: string): HTMLElement {
  const head = el('tr', [], spec.head.map((cell) => el('th', [['scope', 'col']], [cell])));
  const body = spec.rows.map((row) =>
    el('tr', [], [
      ...(row.header === null ? [] : [el('th', [['scope', 'row']], [row.header])]),
      ...row.cells.map((cell) => el('td', [], [cell])),
    ]),
  );
  const table = el('table', [['id', tid]], [
    el('caption', [['id', `${tid}-cap`]], [spec.caption]),
    el('thead', [], [head]),
    el('tbody', [], body),
  ]);
  return el(
    'div',
    [
      ['class', 'gre-table-scroll'],
      ['role', 'region'],
      ['tabindex', '0'],
      ['aria-labelledby', `${tid}-cap`],
      ['data-focus-key', tid],
    ],
    [table],
  );
}

// --------------------------------------------------------------------
// Render decisions
// --------------------------------------------------------------------

/** Whether the panel's chart renders: N at or above the chart floor (§5.8, D-11). */
function chartRenders(input: RenderInput, m: MeasurementName): boolean {
  return input.selection.perMeasurement[m].valid >= config.chartFloorBelow() && input.measurements[m].stats !== null;
}

/**
 * Whether the width panel's log-scale toggle shows: its histogram view
 * renders a chart and the result's `dzw` `histogramLog` is non-null
 * (§5.8 panel contents 2; §5.12 offer rule).
 */
function logToggleShown(input: RenderInput, display: DisplayState): boolean {
  return display.view.dzw === 'histogram' && chartRenders(input, 'dzw') && input.histogramLog !== null;
}

/** Whether panel `m`'s histogram is drawn on the logarithmic scale (§5.12). */
function logScaleDrawn(m: MeasurementName, input: RenderInput, display: DisplayState): boolean {
  return m === 'dzw' && display.logScale && input.histogramLog !== null;
}

/** The read-off output (§5.12): "Percentile {q}: {value}" for a committed q, else empty. */
function readoffText(m: MeasurementName, input: RenderInput, q: number): string {
  const value = quantileLinear(input.measurements[m].values.sorted, q / 100);
  return fillCopy('ddd5.12.readoffOutput', {
    q: String(q),
    value: quantityText(value, m, config.displayDecimals(m)),
  });
}

// --------------------------------------------------------------------
// The skeleton
// --------------------------------------------------------------------

/**
 * Builds `#gre-panels` with the three panel sections and wires their
 * listeners and resize observers to the mount (`wiring`). `manifest` is
 * the mounted vintage's, the third argument of every reducer call.
 */
export function buildPanels(manifest: Manifest, wiring: Wiring): Panels {
  const { signal, scheduler } = wiring;
  const panels = new Map<MeasurementName, PanelElements>();
  /** The width each panel's chart was last drawn at, while it is drawn. */
  const drawnWidth = new Map<MeasurementName, number>();
  /** Each read-off's last commit, `{badInput}|{value}`, so that a repeated commit is idempotent. */
  const lastCommit = new Map<MeasurementName, string>();

  /** One display-only change through the scheduler: a reducer call on `current()` (§5.7 event map). */
  const dispatch = (action: DisplayAction): void => {
    const current = scheduler.current();
    const next = reduce(current, action, manifest);
    if (next !== current) scheduler.update(next);
  };

  const element = el('div', [['id', 'gre-panels']]);

  for (const m of PANEL_ORDER) {
    const pid = `gre-${m}`;

    // 1. The panel head: the <h2>, `.gre-n`, and the stable notes built at mount.
    const n = el('p', [['class', 'gre-n']]);
    const head = el('div', [['class', 'gre-panel-head']], [el('h2', [], [measurementLabel(m)]), n]);
    if (m === 'scarp_dip') head.append(el('p', [['class', 'gre-provisional']], [copyText('pdd5.4.scarpDipNotice')]));
    if (m === 'dzw') head.append(el('p', [['class', 'gre-width-scope']], [copyText('pdd5.7.widthScopeNote')]));

    // 2. The view switch, and on the width panel the log-scale toggle.
    const radios = {} as { [v in PanelView]: HTMLInputElement };
    const fieldset = el('fieldset', [['class', 'gre-view']], [el('legend', [], [copyText('ddd5.8.viewLegend')])]);
    for (const { view, key } of VIEWS) {
      const radio = el('input', [
        ['type', 'radio'],
        ['name', `${pid}-view`],
        ['value', view],
      ]);
      radios[view] = radio;
      fieldset.append(el('label', [], [radio, ' ', copyText(key)]));
      radio.addEventListener(
        'change',
        () => {
          if (radio.checked) dispatch({ type: 'setView', measurement: m, view });
        },
        { signal },
      );
    }
    let log: PanelElements['log'] = null;
    if (m === 'dzw') {
      const input = el('input', [
        ['type', 'checkbox'],
        ['id', 'gre-dzw-log'],
      ]);
      const label = el('label', [['class', 'gre-log']], [input, ' ', copyText('ddd5.8.logScaleLabel')]);
      label.hidden = true;
      log = { label, input };
      input.addEventListener('change', () => dispatch({ type: 'setLogScale', logScale: input.checked }), { signal });
    }

    // 3–5. The notice, legend, and chart slots; the chart slot keeps the chart's height.
    const notice = el('div', [['class', 'gre-notice']]);
    const legend = el('div', [['class', 'gre-legend']]);
    const chart = el('div', [['class', 'gre-chart']]);
    chart.style.minHeight = `${CHART_HEIGHT}px`;

    // 6. The percentile read-off (§5.12).
    const readoffInput = el('input', [
      ['type', 'number'],
      ['id', `${pid}-pct`],
      ['min', '0'],
      ['max', '100'],
      ['step', '1'],
      ['aria-describedby', `${pid}-pct-out`],
    ]);
    const output = el('output', [
      ['id', `${pid}-pct-out`],
      ['for', `${pid}-pct`],
      ['aria-live', 'off'],
    ]);
    const readoffWrap = el('div', [['class', 'gre-readoff']], [
      el('label', [['for', `${pid}-pct`]], [copyText('ddd5.12.readoffLabel')]),
      ' ',
      readoffInput,
      ' ',
      output,
    ]);
    readoffWrap.hidden = true;
    readoffInput.hidden = true;

    // 7–8. The info note and the statistics-table slot.
    const info = el('div', [['class', 'gre-info']]);
    const table = el('div', [['class', 'gre-table']]);

    const children: Node[] = [head, fieldset];
    if (log !== null) children.push(log.label);
    children.push(notice, legend, chart, readoffWrap, info, table);
    const section = el('section', [['id', pid], ['tabindex', '-1']], children);
    element.append(section);

    panels.set(m, {
      section,
      n,
      views: radios,
      log,
      notice,
      legend,
      chart,
      readoff: { wrap: readoffWrap, input: readoffInput, output },
      info,
      table,
    });

    // The read-off commit (§5.12; R6 of §5.7), on `change` and on Enter.
    const commit = (): void => {
      const key = `${readoffInput.validity.badInput}|${readoffInput.value}`;
      if (lastCommit.get(m) === key) return;
      lastCommit.set(m, key);
      const reading = readReadoff(readoffInput.value, readoffInput.validity.badInput);
      let readoff: number | null = null;
      let text = '';
      if (reading.kind === 'blank') {
        readoffInput.removeAttribute('aria-invalid');
        output.textContent = '';
      } else if (reading.kind === 'invalid') {
        readoffInput.setAttribute('aria-invalid', 'true');
        text = copyText('ddd5.12.readoffHint');
      } else {
        readoffInput.removeAttribute('aria-invalid');
        readoff = reading.q;
        const last = scheduler.lastRenderInput();
        if (last !== null && chartRenders(last, m)) text = readoffText(m, last, reading.q);
      }
      if (text !== '') {
        output.textContent = text;
        announce(wiring.status, text, () => !signal.aborted && output.textContent === text);
      }
      dispatch({ type: 'setReadoff', measurement: m, readoff });
    };
    readoffInput.addEventListener('change', commit, { signal });
    readoffInput.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Enter') commit();
      },
      { signal },
    );

    // The chart-data disclosure's state (§5.11, Disclosure state): `toggle`
    // does not bubble, so the section listens in the capture phase.
    section.addEventListener(
      'toggle',
      (event) => {
        const target = event.target;
        if (!(target instanceof HTMLDetailsElement) || target.id !== `${pid}-data`) return;
        if (target.open !== scheduler.current().display.chartDataOpen[m]) {
          dispatch({ type: 'setChartDataOpen', measurement: m, open: target.open });
        }
      },
      { capture: true, signal },
    );

    // One ResizeObserver per panel (§5.12, Resizing): a width change re-renders the chart slot.
    if (!signal.aborted) {
      const observer = new ResizeObserver(() => {
        const drawn = drawnWidth.get(m);
        if (drawn !== undefined && chart.clientWidth !== drawn) scheduler.rerenderChart(m);
      });
      observer.observe(section);
      signal.addEventListener('abort', () => observer.disconnect(), { once: true });
    }
  }

  const get = (m: MeasurementName): PanelElements => {
    const panel = panels.get(m);
    if (panel === undefined) throw new Error(`panels: no panel ${m}`);
    return panel;
  };

  const renderChart = (m: MeasurementName, input: RenderInput, display: DisplayState): void => {
    const { chart } = get(m);
    const pid = `gre-${m}`;
    if (!chartRenders(input, m)) {
      for (const child of Array.from(chart.children)) {
        if (child instanceof HTMLElement && (child.tagName === 'FIGURE' || child.id === `${pid}-data`)) child.remove();
      }
      drawnWidth.delete(m);
      return;
    }
    const result = input.measurements[m];
    const counts = input.selection.perMeasurement[m];
    const stats = result.stats!;
    const decimals = config.displayDecimals(m);
    const width = chart.clientWidth;
    const view = display.view[m];
    const specInput: HistogramSpecInput = {
      measurement: m,
      decimals,
      valid: counts.valid,
      scarpClasses: input.vintage.manifest.scarpClasses,
      palette: input.vintage.manifest.scarpClassPalette,
      familyView: display.familyView,
      fieldTicks: false,
    };
    // The bin table follows the histogram's scale in both views: the disclosure belongs to the panel.
    const bins = logScaleDrawn(m, input, display)
      ? histogramLogSpec(input.histogramLog!, specInput)
      : histogramSpec(result.histogram!, specInput);
    const svg =
      view === 'histogram'
        ? histogramSvg(bins, width)
        : ecdfSvg(
            ecdfSpec(result.values.sorted, {
              measurement: m,
              decimals,
              valid: counts.valid,
              readoff: display.readoff[m],
              fieldTicks: false,
            }),
            width,
          );

    const caption = el('figcaption', [['id', `${pid}-cap`]], [el('p', [], [chartSummary(stats, counts, m, config)])]);
    if (view === 'cumulative') caption.append(el('p', [], [copyText('pdd4.1.cumulativeAccuracy')]));
    const figure = el('figure', [], [toSvgElement(svg), caption]);

    const open = display.chartDataOpen[m];
    const details = el('details', [['id', `${pid}-data`]], [
      el('summary', [['data-focus-key', `chart-data:${m}`]], [copyText('ddd5.8.chartDataLabel')]),
    ]);
    if (open) {
      details.open = true;
      details.append(chartDataTable(binTableSpec(bins.bins, bins.groups, bins.edges), `${pid}-bins`));
    }
    chart.replaceChildren(figure, details);
    drawnWidth.set(m, width);
  };

  const renderPanel = (m: MeasurementName, input: RenderInput, display: DisplayState): void => {
    const panel = get(m);
    const valid = input.selection.perMeasurement[m].valid;
    const drawn = chartRenders(input, m);
    const view = display.view[m];

    panel.n.replaceChildren(fillCopy('ddd5.8.nLine', { N: formatCount(valid) }));
    panel.views.histogram.checked = view === 'histogram';
    panel.views.cumulative.checked = view === 'cumulative';

    const logShown = m === 'dzw' && logToggleShown(input, display);
    if (panel.log !== null) {
      panel.log.label.hidden = !logShown;
      panel.log.input.checked = display.logScale && input.histogramLog !== null;
    }

    // The scarp-type legend, in histogram view while the chart renders (§5.8 panel contents 4).
    if (drawn && view === 'histogram') {
      const groups = stackGroups(input.vintage.manifest.scarpClasses, input.vintage.manifest.scarpClassPalette, display.familyView);
      panel.legend.replaceChildren(
        el(
          'ul',
          [['class', 'gre-legend-types']],
          groups.items.map((g) => el('li', [], [toSvgElement(swatchSvg(g.color)), ' ', g.label])),
        ),
      );
    } else {
      panel.legend.replaceChildren();
    }

    renderChart(m, input, display);

    // The read-off, in cumulative view while the chart renders (§5.8 panel contents 6).
    const readoffShown = drawn && view === 'cumulative';
    panel.readoff.wrap.hidden = !readoffShown;
    panel.readoff.input.hidden = !readoffShown;
    const q = display.readoff[m];
    let text = '';
    if (readoffShown) {
      if (q !== null) text = readoffText(m, input, q);
      else if (panel.readoff.input.getAttribute('aria-invalid') === 'true') text = copyText('ddd5.12.readoffHint');
    }
    panel.readoff.output.textContent = text;

    // The info note, in histogram view while the chart renders (§5.8 panel contents 7).
    if (drawn && view === 'histogram') {
      const sentences = [el('p', [], [copyText('ddd5.12.binRule')])];
      if (logShown) sentences.push(el('p', [], [copyText('ddd5.12.logScaleNote')]));
      panel.info.replaceChildren(...sentences);
    } else {
      panel.info.replaceChildren();
    }
  };

  return {
    element,
    section: (m) => get(m).section,
    slot: (m, name) => get(m)[name],
    render: (input, display, measurements = PANEL_ORDER) => {
      for (const m of measurements) renderPanel(m, input, display);
    },
    renderChart,
  };
}
