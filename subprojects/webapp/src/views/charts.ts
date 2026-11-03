// The chart builders of docs/app/ddd.md §5.12 (Charts): `histogramSvg(spec,
// width)` and `ecdfSvg(spec, width)`, each returning an `SvgNode`, and
// `ecdfSteps(sorted)`, the cumulative curve's step points with the
// deterministic decimation above 512 distinct values. The specs are plain
// values built by `histogramSpec`, `histogramLogSpec`, and `ecdfSpec` from
// the statistics module's results — T-32's `histogram` and `histogramLog`
// bins and the §5.4 `sorted` array — so the charts only draw: the bins
// are never recomputed here, and percentiles come from `quantileLinear`
// over the full array, never from the decimated path.
//
// Geometry (fixed by §5.12): the `viewBox` is the panel's CSS width by
// 300 CSS px — margins left 56, right 16, top 8, bottom 40; a 240 px
// plot; and the 12 px overlay band directly above the value axis,
// reserved in every chart of both views, where the overlay's field
// ticks are drawn (Overlay marks). Drawing uses presentation
// attributes only. The chart is non-interactive: its text alternatives
// are siblings of the `<svg>` (§5.11), never inside it.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import type { MeasurementName } from '../state/state';
import type { Histogram, HistogramLog } from '../stats/histogram';
import { quantileLinear } from '../stats/quantile';
import {
  chartLabel,
  edgeValue,
  fillCopy,
  measurementLabel,
  quantityText,
  rangeText,
  segmentTitle,
  type BinEdges,
  type StackGroups,
} from './chart-text';
import { copyText } from './copy';
import { displayRound, formatCount } from './format';
import type { SvgNode } from './svg';

// --------------------------------------------------------------------
// Geometry (§5.12, Geometry and scales)
// --------------------------------------------------------------------

/** Every chart's height in CSS px, the minimum height of the `.gre-chart` slot (§5.8). */
export const CHART_HEIGHT = 300;
const PLOT_HEIGHT = 240;
const MARGIN_LEFT = 56;
const MARGIN_RIGHT = 16;
const MARGIN_TOP = 8;
/** The overlay band's height: 12 px directly above the value axis (§5.12, Overlay marks). */
const OVERLAY_BAND = 12;
/** The gap between the logarithmic scale's leading band and its axis (§5.12, Logarithmic scale). */
const LOG_GAP = 8;
/** The y of the plot's zero line, the top of the overlay band. */
const PLOT_BOTTOM = MARGIN_TOP + PLOT_HEIGHT;
/** The y of the value axis, the bottom of the overlay band. */
const AXIS_Y = PLOT_BOTTOM + OVERLAY_BAND;

/** The field marks' color: black, the field-mark convention of PDD §4.4 (§5.12, Overlay marks). */
const FIELD_MARK = '#000000';

/** The class fill opacity of §5.8 (Family view): 60 %. */
const FILL_OPACITY = '0.6';
/** The neutral ink of axes, labels, and the cumulative curve: the page's text color. */
const INK = 'currentColor';
const FONT_FAMILY = 'sans-serif';
const FONT_SIZE = '11';

/** The most ticks an axis carries (§5.12, the 1–2–5 rule). */
const MAX_TICKS = 6;
/** The most points the cumulative curve keeps (§5.12, Empirical cumulative curve). */
const MAX_POINTS = 512;

/**
 * One display step u in recording steps, `10^(3 − dd)` per D-23 decimals
 * dd (§5.12, Histogram): integer literals, never a computed power of ten.
 */
const DISPLAY_STEP_UNITS: { readonly [dd: number]: number } = { 2: 10, 1: 100, 0: 1000 };

/** The display step u of `decimals`, in recording steps. */
function displayStepUnits(decimals: number): number {
  const u = DISPLAY_STEP_UNITS[decimals];
  if (u === undefined) {
    throw new Error(`charts: no display step for ${decimals} decimals`);
  }
  return u;
}

/** A coordinate as an attribute value: rounded to 0.01 px, no negative zero. */
function num(v: number): string {
  const r = Math.round(v * 100) / 100;
  return String(r === 0 ? 0 : r);
}

/** The plot width P for a chart `width` CSS px wide. */
function plotWidth(width: number): number {
  return Math.max(width - MARGIN_LEFT - MARGIN_RIGHT, 1);
}

function node(tag: string, attrs: readonly (readonly [string, string])[], children: readonly (SvgNode | string)[] = []): SvgNode {
  return { tag, attrs, children };
}

function line(x1: number, y1: number, x2: number, y2: number): SvgNode {
  return node('line', [
    ['x1', num(x1)],
    ['y1', num(y1)],
    ['x2', num(x2)],
    ['y2', num(y2)],
    ['stroke', INK],
  ]);
}

function text(x: number, y: number, anchor: 'start' | 'middle' | 'end', content: string, extra: readonly (readonly [string, string])[] = []): SvgNode {
  return node('text', [['x', num(x)], ['y', num(y)], ['text-anchor', anchor], ['fill', INK], ...extra], [content]);
}

// --------------------------------------------------------------------
// Ticks (§5.12, the 1–2–5 rule)
// --------------------------------------------------------------------

/**
 * The ticks over `[lo, hi]` (integers, in units where `minStep` is the
 * smallest admissible step): the smallest step {1, 2, 5}·10^k that is at
 * least `minStep` and gives at most six ticks, the ticks at its multiples
 * inside the extent, ends included. On a value axis the units are
 * recording steps and `minStep` the display step u, so adjacent labels
 * never print alike; on a count axis `minStep` is 1.
 */
export function axisTicks(lo: number, hi: number, minStep: number): number[] {
  for (let decade = minStep; ; decade *= 10) {
    for (const mantissa of [1, 2, 5]) {
      const step = mantissa * decade;
      const first = Math.ceil(lo / step);
      const last = Math.floor(hi / step);
      if (last - first + 1 <= MAX_TICKS) {
        const ticks: number[] = [];
        for (let k = first; k <= last; k++) ticks.push(k * step);
        return ticks;
      }
    }
  }
}

/** The vertical axis: ticks, their labels, and its rotated title. */
function verticalAxis(ticks: readonly number[], yOf: (v: number) => number, title: string, kind: string): SvgNode {
  const children: SvgNode[] = [line(MARGIN_LEFT, MARGIN_TOP, MARGIN_LEFT, PLOT_BOTTOM)];
  for (const t of ticks) {
    const y = yOf(t);
    children.push(line(MARGIN_LEFT - 4, y, MARGIN_LEFT, y));
    children.push(text(MARGIN_LEFT - 6, y + 4, 'end', formatCount(t)));
  }
  const cy = MARGIN_TOP + PLOT_HEIGHT / 2;
  children.push(text(12, cy, 'middle', title, [['transform', `rotate(-90 12 ${num(cy)})`]]));
  return node('g', [['data-axis', kind]], children);
}

/** A value-axis tick: its x, label, and whether a tick mark is drawn. */
interface ValueTick {
  readonly x: number;
  readonly label: string;
}

/**
 * The value axis: its line segments, ticks, labels, any extra labels
 * (the logarithmic scale's "below 0.1 m"), and its title — the
 * measurement's canonical label with unit.
 */
function valueAxis(
  segments: readonly (readonly [number, number])[],
  ticks: readonly ValueTick[],
  extra: readonly SvgNode[],
  measurement: MeasurementName,
  width: number,
): SvgNode {
  const children: SvgNode[] = segments.map(([x1, x2]) => line(x1, AXIS_Y, x2, AXIS_Y));
  for (const tick of ticks) {
    children.push(line(tick.x, AXIS_Y, tick.x, AXIS_Y + 4));
    children.push(text(tick.x, AXIS_Y + 16, 'middle', tick.label));
  }
  children.push(...extra);
  children.push(text(MARGIN_LEFT + plotWidth(width) / 2, CHART_HEIGHT - 6, 'middle', measurementLabel(measurement)));
  return node('g', [['data-axis', 'value']], children);
}

/** The chart root (§5.11 Markup): `role="img"`, its label, description, and details targets. */
function root(pid: string, label: string, width: number, children: readonly SvgNode[]): SvgNode {
  return node(
    'svg',
    [
      ['role', 'img'],
      ['aria-label', label],
      ['aria-describedby', `${pid}-cap`],
      ['aria-details', `${pid}-data`],
      ['viewBox', `0 0 ${num(width)} ${CHART_HEIGHT}`],
      ['width', num(width)],
      ['height', String(CHART_HEIGHT)],
      ['font-family', FONT_FAMILY],
      ['font-size', FONT_SIZE],
    ],
    children,
  );
}

// --------------------------------------------------------------------
// Overlay marks (§5.12, Overlay marks)
// --------------------------------------------------------------------

/**
 * One overlay group's drawn field rows (§5.8, Field overlay): a
 * (`source`, `source_quantity`) pair, never pooled with another pair's —
 * `overlayGroups` of `overlay/model.ts` yields these.
 */
export interface FieldMarkGroup {
  readonly source: string;
  readonly sourceQuantity: string;
  /** The rows the chart marks, one tick each at its `value` (m). */
  readonly rows: readonly { readonly value: number }[];
}

const NO_MARKS: readonly FieldMarkGroup[] = [];

/**
 * A spec input's field marks, checked against its `fieldTicks`: the
 * panel draws field ticks exactly while it marks at least one row.
 */
function marksOf(input: { readonly fieldTicks: boolean; readonly fieldMarks?: readonly FieldMarkGroup[] }): readonly FieldMarkGroup[] {
  const marks = input.fieldMarks ?? NO_MARKS;
  const any = marks.some((g) => g.rows.length > 0);
  if (any !== input.fieldTicks) {
    throw new Error(`charts: fieldTicks ${input.fieldTicks} with ${any ? 'some' : 'no'} field rows`);
  }
  return marks;
}

/** The drawn rows' value extent in recording steps (`value · 1000`), or null when nothing is marked. */
function markExtent(marks: readonly FieldMarkGroup[], keep: (v: number) => boolean = () => true): { lo: number; hi: number } | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (const g of marks) {
    for (const row of g.rows) {
      if (!keep(row.value)) continue;
      const s = row.value * 1000;
      if (s < lo) lo = s;
      if (s > hi) hi = s;
    }
  }
  return lo <= hi ? { lo, hi } : null;
}

/**
 * The overlay marks (§5.12): black vertical ticks spanning the 12 px
 * overlay band, one per drawn row at `xOf(value)`, one `<g>` per
 * (`source`, `source_quantity`) group; null when nothing is marked.
 */
function fieldLayer(marks: readonly FieldMarkGroup[], xOf: (value: number) => number): SvgNode | null {
  if (!marks.some((g) => g.rows.length > 0)) return null;
  return node(
    'g',
    [['data-layer', 'field']],
    marks.map((g) =>
      node(
        'g',
        [
          ['data-source', g.source],
          ['data-source-quantity', g.sourceQuantity],
        ],
        g.rows.map((row) => {
          const x = num(xOf(row.value));
          return node('line', [
            ['x1', x],
            ['y1', num(PLOT_BOTTOM)],
            ['x2', x],
            ['y2', num(AXIS_Y)],
            ['stroke', FIELD_MARK],
          ]);
        }),
      ),
    ),
  );
}

// --------------------------------------------------------------------
// Histogram specs
// --------------------------------------------------------------------

/** What a histogram spec is built from beside its bins. */
export interface HistogramSpecInput {
  readonly measurement: MeasurementName;
  /** The measurement's D-23 decimals (dd), `displayDecimals` of `config.ts`. */
  readonly decimals: number;
  /** N, the panel's `counts.valid`. */
  readonly valid: number;
  /** The manifest's `scarp_classes`, canonical order (§3.2). */
  readonly scarpClasses: readonly string[];
  /** The manifest's `scarp_class_palette` (§3.2). */
  readonly palette: { readonly [scarpClass: string]: string };
  /** The D-13 family view (§5.8). */
  readonly familyView: boolean;
  /** Whether the panel draws field ticks (the overlay's, §5.12): exactly while `fieldMarks` holds a row. */
  readonly fieldTicks: boolean;
  /** The drawn field rows per overlay group (§5.12, Overlay marks); none when absent. */
  readonly fieldMarks?: readonly FieldMarkGroup[];
}

/** A histogram to draw (§5.12): bins as per-group count rows, edges, groups, and the chart label. */
export interface HistogramSpec {
  /** `gre-{measurement}` (§5.11). */
  readonly pid: string;
  readonly scale: 'linear' | 'log';
  readonly groups: StackGroups;
  readonly edges: BinEdges;
  /** One row of per-group counts per bin, the leading bar's first while `edges.below` — `binsByGroup` of `binTableSpec`. */
  readonly bins: readonly (readonly number[])[];
  /** `chartLabel` of the chart (§5.11). */
  readonly label: string;
  /** The drawn field rows per overlay group, ticked in the overlay band (§5.12). */
  readonly fieldMarks: readonly FieldMarkGroup[];
}

/** The number of scarp classes (§3.1). */
const CLASS_COUNT = 6;

/**
 * The stacking groups (§5.12; §5.8, Family view): the six classes with
 * their palette colors, or, in the family view, the three base types —
 * each collapse variant directly follows its base type in the canonical
 * order (§6.4, Family toggle), so group k folds classes 2k and 2k+1 and
 * carries class 2k's name and color.
 */
export function stackGroups(
  scarpClasses: readonly string[],
  palette: { readonly [scarpClass: string]: string },
  familyView: boolean,
): StackGroups {
  if (scarpClasses.length !== CLASS_COUNT) {
    throw new Error(`charts: ${scarpClasses.length} scarp classes, expected ${CLASS_COUNT}`);
  }
  const names = familyView ? scarpClasses.filter((_, k) => k % 2 === 0) : scarpClasses;
  return {
    family: familyView,
    items: names.map((name) => {
      const color = palette[name];
      if (color === undefined) {
        throw new Error(`charts: no palette color for ${name}`);
      }
      return { label: name, color };
    }),
  };
}

/** One bin's six class counts as the displayed groups' counts: unchanged, or folded in pairs (family view). */
export function foldCounts(counts: readonly number[], familyView: boolean): number[] {
  if (counts.length !== CLASS_COUNT) {
    throw new Error(`charts: ${counts.length} class counts, expected ${CLASS_COUNT}`);
  }
  if (!familyView) return counts.slice();
  return [counts[0] + counts[1], counts[2] + counts[3], counts[4] + counts[5]];
}

function pidOf(m: MeasurementName): string {
  return `gre-${m}`;
}

/**
 * The linear histogram spec of T-32's `histogram` result (§5.12): edges
 * `e0 + j·W` recording steps with `W = widthUnits · u`, one row of group
 * counts per bin.
 */
export function histogramSpec(h: Histogram, input: HistogramSpecInput): HistogramSpec {
  const width = h.widthUnits * displayStepUnits(input.decimals);
  const steps: number[] = [];
  for (let j = 0; j <= h.bins; j++) steps.push(h.firstEdge + j * width);
  return {
    pid: pidOf(input.measurement),
    scale: 'linear',
    groups: stackGroups(input.scarpClasses, input.palette, input.familyView),
    edges: { measurement: input.measurement, decimals: input.decimals, steps, below: false },
    bins: h.counts.map((row) => foldCounts(row, input.familyView)),
    label: chartLabel({
      measurement: input.measurement,
      view: 'histogram',
      valid: input.valid,
      familyView: input.familyView,
      logScale: false,
      fieldTicks: input.fieldTicks,
    }),
    fieldMarks: marksOf(input),
  };
}

/**
 * The logarithmic histogram spec of T-32's `histogramLog` result (§5.12,
 * Logarithmic scale): the octave edges `f · 2^j` by integer doubling and,
 * while any leading count is nonzero, the leading "below 0.1 m" bar's
 * group counts first.
 */
export function histogramLogSpec(h: HistogramLog, input: HistogramSpecInput): HistogramSpec {
  const steps: number[] = [h.firstEdge];
  for (let j = 0; j < h.bins; j++) steps.push(steps[j] * 2);
  const below = h.belowCounts.some((c) => c !== 0);
  const rows = h.counts.map((row) => foldCounts(row, input.familyView));
  return {
    pid: pidOf(input.measurement),
    scale: 'log',
    groups: stackGroups(input.scarpClasses, input.palette, input.familyView),
    edges: { measurement: input.measurement, decimals: input.decimals, steps, below },
    bins: below ? [foldCounts(h.belowCounts, input.familyView), ...rows] : rows,
    label: chartLabel({
      measurement: input.measurement,
      view: 'histogram',
      valid: input.valid,
      familyView: input.familyView,
      logScale: true,
      fieldTicks: input.fieldTicks,
    }),
    fieldMarks: marksOf(input),
  };
}

// --------------------------------------------------------------------
// Histogram drawing
// --------------------------------------------------------------------

/** One bar: its horizontal extent, its group counts, and the range its segment titles name. */
interface Bar {
  readonly x1: number;
  readonly x2: number;
  readonly counts: readonly number[];
  readonly range: string;
}

/**
 * The histogram (§5.12, Histogram; Logarithmic scale): bars tiling the
 * bins, each a stack of per-group `<rect>` segments in canonical order,
 * first group at the bottom, a segment only for a nonzero count, filled
 * at 60 % opacity with no stroke, each carrying its `segmentTitle`
 * `<title>`; the count axis over every bar; the value axis linear, or
 * logarithmic with the leading band, gap, and decade ticks; and the
 * field ticks in the overlay band. Drawn field rows outside the bins'
 * extent extend the value axis (§5.12, Overlay marks): on the linear
 * axis to the extreme rows' values, on the logarithmic axis by whole
 * octaves for rows of 0.1 m and above, a row below 0.1 m laying out the
 * leading band, at whose center it is drawn. The bins keep their DD-5
 * extent; the extension is empty plot with marks.
 */
export function histogramSvg(spec: HistogramSpec, width: number): SvgNode {
  const { edges, groups } = spec;
  const m = edges.measurement;
  const dd = edges.decimals;
  const P = plotWidth(width);
  const K = edges.steps.length - 1;
  const lead = edges.below ? 1 : 0;
  if (K < 1 || spec.bins.length !== K + lead) {
    throw new Error(`histogramSvg: ${spec.bins.length} rows for ${K} bins`);
  }

  const bars: Bar[] = [];
  const valueTicks: ValueTick[] = [];
  const segments: (readonly [number, number])[] = [];
  const extra: SvgNode[] = [];
  const marks = spec.fieldMarks;
  /** A drawn field row's x, set by the scale below. */
  let markX: (value: number) => number;

  if (spec.scale === 'linear') {
    const reach = markExtent(marks);
    const lo = reach === null ? edges.steps[0] : Math.min(edges.steps[0], reach.lo);
    const hi = reach === null ? edges.steps[K] : Math.max(edges.steps[K], reach.hi);
    const xOf = (s: number): number => MARGIN_LEFT + (P * (s - lo)) / (hi - lo);
    markX = (value) => xOf(value * 1000);
    for (let j = 0; j < K; j++) {
      bars.push({
        x1: xOf(edges.steps[j]),
        x2: xOf(edges.steps[j + 1]),
        counts: spec.bins[j],
        range: rangeText(edgeValue(edges.steps[j]), edgeValue(edges.steps[j + 1]), m, dd),
      });
    }
    segments.push([MARGIN_LEFT, MARGIN_LEFT + P]);
    for (const t of axisTicks(lo, hi, displayStepUnits(dd))) {
      valueTicks.push({ x: xOf(t), label: displayRound(edgeValue(t), dd) });
    }
  } else {
    // The band is laid out while the leading count is nonzero or a drawn
    // field row lies below 0.1 m; the axis extends by whole octaves to
    // cover drawn rows of 0.1 m and above.
    const band = edges.below || marks.some((g) => g.rows.some((row) => row.value < 0.1));
    let a = edges.steps[0];
    let end = edges.steps[K];
    const reach = markExtent(marks, (v) => v >= 0.1);
    if (reach !== null) {
      while (reach.lo < a) a /= 2;
      while (reach.hi > end) end *= 2;
    }
    const O = Math.round(Math.log2(end / a));
    // Every octave one width b; the leading band one b wide, then an 8 px gap.
    const b = band ? (P - LOG_GAP) / (O + 1) : P / O;
    const x0 = band ? MARGIN_LEFT + b + LOG_GAP : MARGIN_LEFT;
    const xOf = (s: number): number => x0 + (b * Math.log10(s / a)) / Math.log10(2);
    markX = (value) => (value < 0.1 ? MARGIN_LEFT + b / 2 : xOf(value * 1000));
    if (band) {
      const below = copyText('ddd5.12.belowLabel');
      if (edges.below) bars.push({ x1: MARGIN_LEFT, x2: MARGIN_LEFT + b, counts: spec.bins[0], range: below });
      segments.push([MARGIN_LEFT, MARGIN_LEFT + b]);
      // Beneath the band, one line below the tick labels, so it never meets the first decade label.
      extra.push(text(MARGIN_LEFT + b / 2, AXIS_Y + 28, 'middle', below));
    }
    for (let j = 0; j < K; j++) {
      bars.push({
        x1: xOf(edges.steps[j]),
        x2: xOf(edges.steps[j + 1]),
        counts: spec.bins[j + lead],
        range: rangeText(edgeValue(edges.steps[j]), edgeValue(edges.steps[j + 1]), m, dd),
      });
    }
    segments.push([x0, xOf(end)]);
    // Decade ticks, ends included: 100 · 10^i recording steps (0.1, 1, 10, … m).
    for (let d = 100; d <= end; d *= 10) {
      if (d >= a) valueTicks.push({ x: xOf(d), label: displayRound(edgeValue(d), dd) });
    }
  }

  let maxTotal = 0;
  const totals = bars.map((bar) => {
    let total = 0;
    for (const c of bar.counts) total += c;
    if (total > maxTotal) maxTotal = total;
    return total;
  });
  if (maxTotal === 0) {
    throw new Error('histogramSvg: no counts to draw');
  }
  const yOf = (count: number): number => PLOT_BOTTOM - (PLOT_HEIGHT * count) / maxTotal;

  const rects: SvgNode[] = [];
  bars.forEach((bar, k) => {
    let below = 0;
    bar.counts.forEach((count, g) => {
      if (count === 0) return;
      const top = below + count;
      const group = groups.items[g];
      rects.push(
        node(
          'rect',
          [
            ['x', num(bar.x1)],
            ['y', num(yOf(top))],
            ['width', num(bar.x2 - bar.x1)],
            ['height', num(yOf(below) - yOf(top))],
            ['fill', group.color],
            ['fill-opacity', FILL_OPACITY],
          ],
          [node('title', [], [segmentTitle(group.label, count, totals[k], bar.range)])],
        ),
      );
      below = top;
    });
  });

  const field = fieldLayer(marks, markX);
  return root(spec.pid, spec.label, width, [
    node('g', [['data-layer', 'bars']], rects),
    ...(field === null ? [] : [field]),
    verticalAxis(axisTicks(0, maxTotal, 1), yOf, copyText('ddd5.12.countAxisTitle'), 'count'),
    valueAxis(segments, valueTicks, extra, m, width),
  ]);
}

/** A legend swatch (§5.8, `.gre-legend`): a 12 px square in the group's color at the class fill opacity, hidden from assistive technology beside its text label. */
export function swatchSvg(color: string): SvgNode {
  return node(
    'svg',
    [
      ['width', '12'],
      ['height', '12'],
      ['viewBox', '0 0 12 12'],
      ['aria-hidden', 'true'],
      ['focusable', 'false'],
    ],
    [node('rect', [['width', '12'], ['height', '12'], ['fill', color], ['fill-opacity', FILL_OPACITY]])],
  );
}

// --------------------------------------------------------------------
// Empirical cumulative curve
// --------------------------------------------------------------------

/**
 * The cumulative curve's points (§5.12, Empirical cumulative curve): the
 * m distinct values x_k of the ascending `sorted` (adjacent entries
 * compared with `===`) with c_k, the count of values ≤ x_k. For
 * m ≤ 512 every point; otherwise index 0, each interior k with
 * `511 * (c_k − c_lastKept) > n` (exact integer comparison), and m − 1.
 */
export function ecdfSteps(sorted: Float64Array): { x: Float64Array; c: Int32Array } {
  const n = sorted.length;
  if (n === 0) {
    throw new Error('ecdfSteps: no value');
  }
  const xs: number[] = [];
  const cs: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i + 1 < n && sorted[i + 1] === sorted[i]) continue;
    xs.push(sorted[i]);
    cs.push(i + 1);
  }
  const m = xs.length;
  if (m <= MAX_POINTS) {
    return { x: Float64Array.from(xs), c: Int32Array.from(cs) };
  }
  const keep: number[] = [0];
  let lastKept = 0;
  for (let k = 1; k <= m - 2; k++) {
    if ((MAX_POINTS - 1) * (cs[k] - cs[lastKept]) > n) {
      keep.push(k);
      lastKept = k;
    }
  }
  keep.push(m - 1);
  return { x: Float64Array.from(keep, (k) => xs[k]), c: Int32Array.from(keep, (k) => cs[k]) };
}

/** What a cumulative-curve spec is built from beside the values. */
export interface EcdfSpecInput {
  readonly measurement: MeasurementName;
  /** The measurement's D-23 decimals (dd). */
  readonly decimals: number;
  /** N, the panel's `counts.valid` (the length of `sorted`). */
  readonly valid: number;
  /** The committed read-off percentile, `readoff[measurement]`, or null (§5.6). */
  readonly readoff: number | null;
  /** Whether the panel draws field ticks (the overlay's, §5.12): exactly while `fieldMarks` holds a row. */
  readonly fieldTicks: boolean;
  /** The drawn field rows per overlay group (§5.12, Overlay marks); none when absent. */
  readonly fieldMarks?: readonly FieldMarkGroup[];
}

/** A cumulative curve to draw (§5.12). */
export interface EcdfSpec {
  /** `gre-{measurement}` (§5.11). */
  readonly pid: string;
  readonly measurement: MeasurementName;
  readonly decimals: number;
  /** The full ascending valid values (§5.4), n ≥ 1. */
  readonly sorted: Float64Array;
  readonly readoff: number | null;
  /** `chartLabel` of the chart (§5.11). */
  readonly label: string;
  /** The drawn field rows per overlay group, ticked in the overlay band (§5.12). */
  readonly fieldMarks: readonly FieldMarkGroup[];
}

/** The cumulative-curve spec of the §5.4 `sorted` array. */
export function ecdfSpec(sorted: Float64Array, input: EcdfSpecInput): EcdfSpec {
  return {
    pid: pidOf(input.measurement),
    measurement: input.measurement,
    decimals: input.decimals,
    sorted,
    readoff: input.readoff,
    label: chartLabel({
      measurement: input.measurement,
      view: 'cumulative',
      valid: input.valid,
      familyView: false,
      logScale: false,
      fieldTicks: input.fieldTicks,
    }),
    fieldMarks: marksOf(input),
  };
}

/**
 * The cumulative curve (§5.12): the step polyline of `ecdfSteps` in the
 * neutral ink, (X_0, 0) → (X_0, F_0) → (X_1, F_0) → … → (X_{M−1}, 1);
 * the value axis over [x_0, x_{m−1}] — for constant data one display
 * step centered on the value — and the cumulative axis 0–100; the
 * "Median" and "84th percentile" pre-marks and the read-off marker at
 * (`quantileLinear(sorted, q / 100)`, q / 100) from the full array, each
 * with a guide from the cumulative axis to the point and from the point
 * down to the overlay band; and the field ticks in the overlay band,
 * drawn field rows outside the value axis's span extending it to the
 * extreme rows' values while the curve keeps [x_0, x_{m−1}].
 */
export function ecdfSvg(spec: EcdfSpec, width: number): SvgNode {
  const { sorted, measurement: m, decimals: dd } = spec;
  const n = sorted.length;
  const { x, c } = ecdfSteps(sorted);
  const M = x.length;
  const P = plotWidth(width);
  const u = displayStepUnits(dd);

  // The value axis in recording steps (the divisor D is 1000, §5.4).
  const firstStep = Math.round(x[0] * 1000);
  const lastStep = Math.round(x[M - 1] * 1000);
  const reach = markExtent(spec.fieldMarks);
  const curveLo = M === 1 ? firstStep - u / 2 : firstStep;
  const curveHi = M === 1 ? firstStep + u / 2 : lastStep;
  const loS = reach === null ? curveLo : Math.min(curveLo, reach.lo);
  const hiS = reach === null ? curveHi : Math.max(curveHi, reach.hi);
  const xOf = (v: number): number => MARGIN_LEFT + (P * (v * 1000 - loS)) / (hiS - loS);
  const yOf = (pct: number): number => PLOT_BOTTOM - (PLOT_HEIGHT * pct) / 100;

  const points: string[] = [];
  let previous = 0;
  for (let j = 0; j < M; j++) {
    const px = num(xOf(x[j]));
    const F = c[j] / n;
    points.push(`${px},${num(yOf(100 * previous))}`, `${px},${num(yOf(100 * F))}`);
    previous = F;
  }
  const curve = node('polyline', [
    ['points', points.join(' ')],
    ['fill', 'none'],
    ['stroke', INK],
    ['stroke-width', '1.5'],
  ]);

  const guide = (q: number, dashed: boolean): { node: SvgNode; px: number; py: number; v: number } => {
    const v = quantileLinear(sorted, q / 100);
    const px = xOf(v);
    const py = yOf(q);
    const attrs: [string, string][] = [
      ['points', `${num(MARGIN_LEFT)},${num(py)} ${num(px)},${num(py)} ${num(px)},${num(PLOT_BOTTOM)}`],
      ['fill', 'none'],
      ['stroke', INK],
    ];
    if (dashed) attrs.push(['stroke-dasharray', '4 3']);
    return { node: node('polyline', attrs), px, py, v };
  };
  const marks: SvgNode[] = [];
  for (const [q, key] of [
    [50, 'ddd5.12.medianMark'],
    [84, 'ddd5.12.p84Mark'],
  ] as const) {
    const g = guide(q, true);
    const right = g.px > MARGIN_LEFT + P / 2;
    marks.push(g.node);
    marks.push(
      text(right ? g.px - 4 : g.px + 4, g.py - 4, right ? 'end' : 'start', fillCopy(key, { value: quantityText(g.v, m, dd) })),
    );
  }
  if (spec.readoff !== null) {
    const g = guide(spec.readoff, false);
    marks.push(node('g', [['data-layer', 'readoff']], [g.node]));
  }

  const valueTicks: ValueTick[] = axisTicks(loS, hiS, u).map((t) => ({
    x: xOf(edgeValue(t)),
    label: displayRound(edgeValue(t), dd),
  }));

  const field = fieldLayer(spec.fieldMarks, xOf);
  return root(spec.pid, spec.label, width, [
    node('g', [['data-layer', 'curve']], [curve]),
    node('g', [['data-layer', 'marks']], marks),
    ...(field === null ? [] : [field]),
    verticalAxis(axisTicks(0, 100, 1), yOf, copyText('ddd5.12.cumulativeAxisTitle'), 'cumulative'),
    valueAxis([[MARGIN_LEFT, MARGIN_LEFT + P]], valueTicks, [], m, width),
  ]);
}
