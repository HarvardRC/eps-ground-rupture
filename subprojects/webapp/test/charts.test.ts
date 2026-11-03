// charts.test.ts (docs/app/ddd.md §7.4, the `charts.test.ts` row; §5.12
// Charts): the chart builders' drawing conventions, asserted directly per
// the pipeline-first rule of §7.4 — no calculation expectation. Bins are
// injected `Histogram` and `HistogramLog` values, never computed here.
//
// - `histogramSvg`: two independently built specs serialize identically
//   through `serializeSvg`, on a linear and on a logarithmic value axis;
//   tick labels equal `displayRound` at the D-23 decimals; each
//   segment's `<title>` equals `segmentTitle`.
// - `ecdfSteps`: tied values, constant data, 511/512/513 distinct
//   values, the heavy-tie, threshold-equality, and cap fixtures, each
//   with endpoints, exact counts, ascending values, the cap, and
//   `0 ≤ 511 * (exactCount − drawnCount) ≤ n` at every distinct value.
// - `ecdfSvg`: 2M vertices for M points; the constant-data rise at the
//   plot's horizontal center; no table, list, or text alternative inside
//   the `<svg>`.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { MeasurementName } from '../src/state/state';
import type { Histogram, HistogramLog } from '../src/stats/histogram';
import { edgeValue, rangeText, segmentTitle } from '../src/views/chart-text';
import {
  ecdfSpec,
  ecdfSteps,
  ecdfSvg,
  histogramLogSpec,
  histogramSpec,
  histogramSvg,
  type HistogramSpec,
  type HistogramSpecInput,
} from '../src/views/charts';
import { copyText } from '../src/views/copy';
import { displayRound } from '../src/views/format';
import { serializeSvg, type SvgNode } from '../src/views/svg';

// --------------------------------------------------------------------
// Fixtures
// --------------------------------------------------------------------

const CLASSES = [
  'Monoclinal',
  'Monoclinal Collapse',
  'Pressure Ridge',
  'Pressure Ridge Collapse',
  'Simple',
  'Simple Collapse',
] as const;

const PALETTE: { readonly [c: string]: string } = {
  Monoclinal: '#009ffa',
  'Monoclinal Collapse': '#00489e',
  'Pressure Ridge': '#ff6e3a',
  'Pressure Ridge Collapse': '#9a2400',
  Simple: '#00c278',
  'Simple Collapse': '#005a01',
};

function linearHistogram(): Histogram {
  return {
    rule: 'fd',
    widthUnits: 2,
    firstEdge: 120,
    bins: 4,
    counts: [
      [1, 0, 2, 0, 0, 3],
      [0, 1, 0, 0, 4, 0],
      [2, 2, 2, 2, 2, 2],
      [0, 0, 0, 1, 0, 0],
    ],
  };
}

function logHistogram(): HistogramLog {
  const counts: number[][] = [];
  for (let j = 0; j < 10; j++) counts.push([j % 3, 1, 0, j % 2, 2, 0]);
  return { firstEdge: 100, bins: 10, counts, belowCounts: [1, 0, 0, 0, 2, 0] };
}

function specInput(measurement: MeasurementName, decimals: number, familyView = false): HistogramSpecInput {
  return {
    measurement,
    decimals,
    valid: 123,
    scarpClasses: [...CLASSES],
    palette: { ...PALETTE },
    familyView,
    fieldTicks: false,
  };
}

function walk(node: SvgNode, visit: (n: SvgNode, parent: SvgNode | null) => void, parent: SvgNode | null = null): void {
  visit(node, parent);
  for (const child of node.children) if (typeof child !== 'string') walk(child, visit, node);
}

function attr(node: SvgNode, name: string): string | undefined {
  return node.attrs.find(([k]) => k === name)?.[1];
}

function textOf(node: SvgNode): string {
  return node.children.map((c) => (typeof c === 'string' ? c : textOf(c))).join('');
}

/** The value axis's tick labels: its `<text>` children but the last (the axis title). */
function valueTickLabels(svg: SvgNode, skip: readonly string[] = []): string[] {
  const axis = svg.children.find((c): c is SvgNode => typeof c !== 'string' && attr(c, 'data-axis') === 'value');
  assert.ok(axis, 'a value axis');
  const texts = axis.children.filter((c): c is SvgNode => typeof c !== 'string' && c.tag === 'text').map(textOf);
  return texts.slice(0, -1).filter((t) => !skip.includes(t));
}

/** The expected segment titles of a spec, in drawing order. */
function expectedTitles(spec: HistogramSpec): string[] {
  const { edges } = spec;
  const lead = edges.below ? 1 : 0;
  const titles: string[] = [];
  spec.bins.forEach((row, k) => {
    const total = row.reduce((a, b) => a + b, 0);
    const j = k - lead;
    const range =
      j < 0
        ? copyText('ddd5.12.belowLabel')
        : rangeText(edgeValue(edges.steps[j]), edgeValue(edges.steps[j + 1]), edges.measurement, edges.decimals);
    row.forEach((count, g) => {
      if (count > 0) titles.push(segmentTitle(spec.groups.items[g].label, count, total, range));
    });
  });
  return titles;
}

function segmentTitles(svg: SvgNode): string[] {
  const titles: string[] = [];
  walk(svg, (n, parent) => {
    if (n.tag === 'title' && parent?.tag === 'rect') titles.push(textOf(n));
  });
  return titles;
}

// --------------------------------------------------------------------
// Histogram
// --------------------------------------------------------------------

describe('histogramSvg', () => {
  test('two independently built specs serialize identically on a linear value axis', () => {
    const a = serializeSvg(histogramSvg(histogramSpec(linearHistogram(), specInput('scarp_height', 2)), 480));
    const b = serializeSvg(histogramSvg(histogramSpec(linearHistogram(), specInput('scarp_height', 2)), 480));
    assert.equal(a, b);
    assert.match(a, /^<svg role="img" aria-label="[^"]+" aria-describedby="gre-scarp_height-cap" aria-details="gre-scarp_height-data" viewBox="0 0 480 300"/);
  });

  test('two independently built specs serialize identically on a logarithmic value axis', () => {
    const a = serializeSvg(histogramSvg(histogramLogSpec(logHistogram(), specInput('dzw', 1)), 600));
    const b = serializeSvg(histogramSvg(histogramLogSpec(logHistogram(), specInput('dzw', 1)), 600));
    assert.equal(a, b);
  });

  test('linear tick labels equal displayRound at the D-23 decimals', () => {
    const svg = histogramSvg(histogramSpec(linearHistogram(), specInput('scarp_height', 2)), 480);
    // Extent 120–200 recording steps, display step 10: the 1–2–5 rule takes 20.
    const labels = valueTickLabels(svg);
    assert.deepEqual(labels, [120, 140, 160, 180, 200].map((s) => displayRound(s / 1000, 2)));
    assert.deepEqual(labels, ['0.12', '0.14', '0.16', '0.18', '0.20']);
  });

  test('logarithmic tick labels sit at the decades, by displayRound at one decimal', () => {
    const svg = histogramSvg(histogramLogSpec(logHistogram(), specInput('dzw', 1)), 600);
    const below = copyText('ddd5.12.belowLabel');
    const labels = valueTickLabels(svg, [below]);
    assert.deepEqual(labels, [100, 1000, 10000, 100000].map((s) => displayRound(s / 1000, 1)));
    assert.deepEqual(labels, ['0.1', '1.0', '10.0', '100.0']);
    assert.ok(serializeSvg(svg).includes(`>${below}</text>`), 'the leading band is labeled');
  });

  test("each segment's <title> equals segmentTitle", () => {
    for (const spec of [
      histogramSpec(linearHistogram(), specInput('scarp_height', 2)),
      histogramSpec(linearHistogram(), specInput('scarp_height', 2, true)),
      histogramLogSpec(logHistogram(), specInput('dzw', 1)),
    ]) {
      const titles = segmentTitles(histogramSvg(spec, 500));
      assert.deepEqual(titles, expectedTitles(spec));
      assert.ok(titles.length > 0);
    }
  });

  test('segments carry no stroke and fill at 60 % opacity', () => {
    const svg = histogramSvg(histogramSpec(linearHistogram(), specInput('scarp_height', 2)), 480);
    walk(svg, (n) => {
      if (n.tag !== 'rect') return;
      assert.equal(attr(n, 'stroke'), undefined);
      assert.equal(attr(n, 'fill-opacity'), '0.6');
    });
  });
});

// --------------------------------------------------------------------
// ecdfSteps
// --------------------------------------------------------------------

/**
 * Checks every fixture invariant of §7.4: endpoints, exact cumulative
 * counts, ascending retained values, M ≤ 512, and the error bound at
 * every original distinct value. Returns the maximum count deficit.
 */
function checkSteps(values: readonly number[]): { x: number[]; c: number[]; maxDeficit: number } {
  const sorted = Float64Array.from(values).sort();
  const n = sorted.length;
  const exactX: number[] = [];
  const exactC: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i + 1 < n && sorted[i + 1] === sorted[i]) continue;
    exactX.push(sorted[i]);
    exactC.push(i + 1);
  }
  const { x, c } = ecdfSteps(sorted);
  const xs = Array.from(x);
  const cs = Array.from(c);
  assert.equal(xs.length, cs.length);
  assert.ok(xs.length <= 512, 'at most 512 points');
  assert.equal(xs[0], exactX[0], 'first endpoint');
  assert.equal(xs[xs.length - 1], exactX[exactX.length - 1], 'last endpoint');
  assert.equal(cs[cs.length - 1], n);
  for (let j = 1; j < xs.length; j++) assert.ok(xs[j] > xs[j - 1], 'ascending retained values');
  for (let j = 0; j < xs.length; j++) {
    const k = exactX.indexOf(xs[j]);
    assert.ok(k >= 0, 'a retained value is a distinct value');
    assert.equal(cs[j], exactC[k], 'exact cumulative count');
  }
  let maxDeficit = 0;
  let r = 0;
  for (let k = 0; k < exactX.length; k++) {
    while (r + 1 < xs.length && xs[r + 1] <= exactX[k]) r++;
    const deficit = exactC[k] - cs[r];
    assert.ok(deficit >= 0 && 511 * deficit <= n, `bound at ${exactX[k]}`);
    if (deficit > maxDeficit) maxDeficit = deficit;
  }
  return { x: xs, c: cs, maxDeficit };
}

function range(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let v = lo; v <= hi; v++) out.push(v);
  return out;
}

describe('ecdfSteps', () => {
  test('tied values share one point: [1, 1, 2, 2, 2, 5]', () => {
    const { x, c } = checkSteps([1, 1, 2, 2, 2, 5]);
    assert.deepEqual(x, [1, 2, 5]);
    assert.deepEqual(c, [2, 5, 6]);
  });

  test('constant data: [3, 3, 3]', () => {
    const { x, c } = checkSteps([3, 3, 3]);
    assert.deepEqual(x, [3]);
    assert.deepEqual(c, [3]);
  });

  test('511 and 512 distinct values keep every point', () => {
    assert.equal(checkSteps(range(0, 510)).x.length, 511);
    assert.equal(checkSteps(range(0, 511)).x.length, 512);
  });

  test('513 distinct values keep the 257 even-indexed points', () => {
    const { x } = checkSteps(range(0, 512));
    assert.equal(x.length, 257);
    assert.deepEqual(x, range(0, 256).map((k) => 2 * k));
  });

  test('heavy tie: 256 appearing 45 times keeps its jump', () => {
    const values = range(0, 512);
    for (let k = 0; k < 44; k++) values.push(256);
    assert.equal(values.length, 557);
    const { x, c, maxDeficit } = checkSteps(values);
    assert.deepEqual(x, range(0, 256).map((k) => 2 * k));
    assert.equal(c[x.indexOf(256)], 301);
    assert.equal(maxDeficit, 1);
  });

  test('threshold equality: 1022 values keep 342 points', () => {
    const { x, c, maxDeficit } = checkSteps(range(0, 1021));
    const expected = [...range(0, 340).map((k) => 3 * k), 1021];
    assert.equal(x.length, 342);
    assert.deepEqual(x, expected);
    assert.deepEqual(c, expected.map((v) => v + 1));
    assert.equal(maxDeficit, 2);
  });

  test('cap: 1532 values keep 512 points', () => {
    const { x } = checkSteps(range(0, 1531));
    assert.equal(x.length, 512);
    assert.deepEqual(x, [...range(0, 510).map((k) => 3 * k), 1531]);
  });
});

// --------------------------------------------------------------------
// ecdfSvg
// --------------------------------------------------------------------

function curvePoints(svg: SvgNode): string[] {
  let points: string | undefined;
  walk(svg, (n, parent) => {
    if (n.tag === 'polyline' && parent !== null && attr(parent, 'data-layer') === 'curve') points = attr(n, 'points');
  });
  assert.ok(points !== undefined, 'a curve');
  return points.split(' ');
}

function cumulative(values: readonly number[], readoff: number | null = null): SvgNode {
  const sorted = Float64Array.from(values).sort();
  return ecdfSvg(
    ecdfSpec(sorted, { measurement: 'scarp_height', decimals: 2, valid: sorted.length, readoff, fieldTicks: false }),
    400,
  );
}

describe('ecdfSvg', () => {
  test('draws 2M vertices for M points', () => {
    for (const values of [[1.25, 1.25, 2.5, 2.5, 2.5, 5], range(0, 1531).map((v) => v / 1000), [3, 3, 3]]) {
      const sorted = Float64Array.from(values).sort();
      assert.equal(curvePoints(cumulative(values)).length, 2 * ecdfSteps(sorted).x.length);
    }
  });

  test('the constant-data rise stands at the plot horizontal center', () => {
    // Width 400: plot from x = 56 to 384, center 220; heights 0 % at y 248, 100 % at y 8.
    assert.deepEqual(curvePoints(cumulative([3, 3, 3])), ['220,248', '220,8']);
  });

  test('two independently built specs serialize identically', () => {
    const values = [0.5, 0.75, 0.75, 1.25, 2, 3.5];
    assert.equal(serializeSvg(cumulative(values, 30)), serializeSvg(cumulative([...values], 30)));
  });

  test('pre-marks carry the Median and 84th percentile labels', () => {
    const out = serializeSvg(cumulative([1, 1, 2, 2, 2, 5]));
    assert.ok(out.includes('>Median 2.00 m</text>'));
    assert.ok(out.includes('>84th percentile 2.60 m</text>'));
  });

  test('no table, list, or text alternative sits inside the <svg>', () => {
    const forbidden = new Set(['table', 'caption', 'ul', 'ol', 'li', 'dl', 'foreignObject', 'desc']);
    for (const svg of [
      cumulative([1, 1, 2, 2, 2, 5], 50),
      histogramSvg(histogramSpec(linearHistogram(), specInput('scarp_height', 2)), 480),
      histogramSvg(histogramLogSpec(logHistogram(), specInput('dzw', 1)), 480),
    ]) {
      walk(svg, (n, parent) => {
        assert.ok(!forbidden.has(n.tag), `no <${n.tag}> inside the chart`);
        if (n.tag === 'title') assert.equal(parent?.tag, 'rect', 'a <title> only on a segment');
      });
      assert.equal(attr(svg, 'role'), 'img');
    }
  });
});
