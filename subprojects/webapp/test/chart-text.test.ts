// chart-text.test.ts (docs/app/ddd.md §7.4, the `chart-text.test.ts` row;
// §5.11 Chart text alternatives): the chart-text generators with injected
// counts — the canonical header order; the six-to-three family fold
// keeping row totals; group cells summing to each Total; the field-row
// order; one distinct `chartLabel` per combination of chart kind and
// field ticks and, for the histogram, family view and log scale; and a
// `below 0.1 m` first row exactly when the below counts are not all zero.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { FieldRow } from '../src/decode/fields';
import type { MeasurementName, PanelView } from '../src/state/state';
import type { Histogram, HistogramLog } from '../src/stats/histogram';
import {
  binTableSpec,
  chartLabel,
  fieldTableSpec,
  measurementLabel,
  segmentTitle,
  type FieldOrder,
  type TableSpec,
} from '../src/views/chart-text';
import { histogramLogSpec, histogramSpec, type HistogramSpec, type HistogramSpecInput } from '../src/views/charts';

const CLASSES = [
  'Monoclinal',
  'Monoclinal Collapse',
  'Pressure Ridge',
  'Pressure Ridge Collapse',
  'Simple',
  'Simple Collapse',
] as const;

const PALETTE: { readonly [c: string]: string } = Object.fromEntries(CLASSES.map((c, k) => [c, `#00000${k}`]));

function specInput(measurement: MeasurementName, decimals: number, familyView: boolean): HistogramSpecInput {
  return { measurement, decimals, valid: 99, scarpClasses: CLASSES, palette: PALETTE, familyView, fieldTicks: false };
}

const HISTOGRAM: Histogram = {
  rule: 'fd',
  widthUnits: 3,
  firstEdge: -1500,
  bins: 3,
  counts: [
    [1, 2, 3, 4, 5, 6],
    [0, 0, 1000, 234, 0, 0],
    [7, 0, 0, 0, 0, 1],
  ],
};

function tableOf(spec: HistogramSpec): TableSpec {
  return binTableSpec(spec.bins, spec.groups, spec.edges);
}

function count(cell: string): number {
  assert.match(cell, /^\d{1,3}(,\d{3})*$/);
  return Number(cell.replace(/,/g, ''));
}

describe('binTableSpec', () => {
  test('the header order is canonical: label, the six classes, Total', () => {
    const table = tableOf(histogramSpec(HISTOGRAM, specInput('scarp_height', 2, false)));
    assert.deepEqual(table.head, ['Scarp height (m)', ...CLASSES, 'Total']);
    assert.equal(table.caption, 'Scarp height (m): valid measurements per bin, by scarp type');
    // Bin width 3 · 10 recording steps from −1500: −1.50–−1.47 and so on, at two decimals.
    assert.deepEqual(
      table.rows.map((r) => r.header),
      ['-1.50–-1.47', '-1.47–-1.44', '-1.44–-1.41'],
    );
  });

  test('the six-to-three family fold keeps the row totals', () => {
    const six = tableOf(histogramSpec(HISTOGRAM, specInput('scarp_dip', 0, false)));
    const three = tableOf(histogramSpec(HISTOGRAM, specInput('scarp_dip', 0, true)));
    assert.deepEqual(three.head, ['Scarp dip (°)', 'Monoclinal', 'Pressure Ridge', 'Simple', 'Total']);
    assert.equal(three.caption, 'Scarp dip (°): valid measurements per bin, by scarp family');
    assert.equal(three.rows.length, six.rows.length);
    for (let r = 0; r < six.rows.length; r++) {
      assert.equal(three.rows[r].cells.length, 4);
      assert.equal(three.rows[r].cells.at(-1), six.rows[r].cells.at(-1));
      assert.equal(three.rows[r].header, six.rows[r].header);
    }
    assert.deepEqual(three.rows[1].cells, ['0', '1,234', '0', '1,234']);
  });

  test('the group cells of each row sum to its Total', () => {
    for (const familyView of [false, true]) {
      for (const spec of [
        histogramSpec(HISTOGRAM, specInput('dzw', 1, familyView)),
        histogramLogSpec(
          { firstEdge: 200, bins: 2, counts: [[1, 1, 1, 1, 1, 1], [0, 9, 0, 0, 0, 3]], belowCounts: [0, 0, 5, 0, 0, 0] },
          specInput('dzw', 1, familyView),
        ),
      ]) {
        for (const row of tableOf(spec).rows) {
          const cells = row.cells.map(count);
          const total = cells.pop()!;
          assert.equal(cells.reduce((a, b) => a + b, 0), total);
        }
      }
    }
  });

  test('on the logarithmic axis the first row is "below 0.1 m" exactly when the below counts are not all zero', () => {
    const base: HistogramLog = { firstEdge: 100, bins: 3, counts: [[1, 0, 0, 0, 0, 0], [0, 2, 0, 0, 0, 0], [0, 0, 3, 0, 0, 0]], belowCounts: [0, 0, 0, 0, 0, 0] };
    const without = tableOf(histogramLogSpec(base, specInput('dzw', 1, false)));
    assert.deepEqual(
      without.rows.map((r) => r.header),
      ['0.1–0.2', '0.2–0.4', '0.4–0.8'],
    );
    for (let k = 0; k < 6; k++) {
      const belowCounts = [0, 0, 0, 0, 0, 0];
      belowCounts[k] = 4;
      for (const familyView of [false, true]) {
        const table = tableOf(histogramLogSpec({ ...base, belowCounts }, specInput('dzw', 1, familyView)));
        assert.deepEqual(
          table.rows.map((r) => r.header),
          ['below 0.1 m', '0.1–0.2', '0.2–0.4', '0.4–0.8'],
        );
        assert.equal(table.rows[0].cells.at(-1), '4');
      }
    }
  });
});

describe('fieldTableSpec', () => {
  const row = (source: string, sourceQuantity: string, eqName: string, value: number, magnitude: number | null, limitedComparison = false): FieldRow => ({
    source,
    eqName,
    magnitude,
    analogue: 'dzw',
    sourceQuantity,
    value,
    limitedComparison,
    criterionSub50: 'met',
    labeledSet: true,
    kernFieldGroup: null,
  });
  const order: FieldOrder = {
    measurement: 'dzw',
    decimals: 1,
    groups: [
      { source: 'FDHI', sourceQuantity: 'fzw_central_meters', label: 'FDHI fault-zone width' },
      { source: 'Kern', sourceQuantity: 'DZW', label: 'Kern County deformation-zone width' },
      { source: 'SURE', sourceQuantity: 'FNC', label: 'SURE fault-normal component' },
    ],
    limitedComparison: ' (limited comparison)',
  };
  const rows: FieldRow[] = [
    row('SURE', 'FNC', 'Napa', 3.25, 6, true),
    row('FDHI', 'fzw_central_meters', 'alpha', 12, 7.1),
    row('Kern', 'DZW', 'Kern County', 4, null),
    row('FDHI', 'fzw_central_meters', 'Zeta', 12, 6.5),
    row('FDHI', 'fzw_central_meters', 'Borrego', 2.05, 6.6),
  ];

  test('rows follow the PDD §4.4 source order, ascending value, ties by eq_name in code-point order', () => {
    const table = fieldTableSpec(rows, order);
    assert.equal(table.caption, 'Deformation-zone width (m): field measurements marked on the chart');
    assert.deepEqual(table.head, ['Source and measure', 'Event', 'Value (m)']);
    assert.deepEqual(
      table.rows.map((r) => r.cells),
      [
        ['FDHI fault-zone width', 'Borrego (M 6.6)', '2.1'],
        ['FDHI fault-zone width', 'Zeta (M 6.5)', '12.0'],
        ['FDHI fault-zone width', 'alpha (M 7.1)', '12.0'],
        ['Kern County deformation-zone width', 'Kern County', '4.0'],
        ['SURE fault-normal component (limited comparison)', 'Napa (M 6)', '3.3'],
      ],
    );
    assert.ok(table.rows.every((r) => r.header === null));
  });

  test('is memoized per rows and order', () => {
    assert.equal(fieldTableSpec(rows, order), fieldTableSpec(rows, order));
  });
});

describe('chartLabel', () => {
  test('one distinct label per chart kind and field ticks, and for the histogram family view and log scale', () => {
    const labels = new Set<string>();
    let combinations = 0;
    for (const fieldTicks of [false, true]) {
      for (const familyView of [false, true]) {
        for (const logScale of [false, true]) {
          labels.add(chartLabel({ measurement: 'dzw', view: 'histogram', valid: 1234, familyView, logScale, fieldTicks }));
          combinations++;
        }
      }
      labels.add(chartLabel({ measurement: 'dzw', view: 'cumulative', valid: 1234, familyView: false, logScale: false, fieldTicks }));
      combinations++;
    }
    assert.equal(combinations, 10);
    assert.equal(labels.size, 10);
  });

  test('the cumulative label ignores family view and log scale', () => {
    const at = (familyView: boolean, logScale: boolean): string =>
      chartLabel({ measurement: 'scarp_height', view: 'cumulative' as PanelView, valid: 30, familyView, logScale, fieldTicks: false });
    assert.equal(at(true, true), at(false, false));
    assert.equal(at(false, false), 'Scarp height (m): cumulative distribution of 30 valid measurements');
  });

  test('the templates compose in order', () => {
    assert.equal(
      chartLabel({ measurement: 'dzw', view: 'histogram', valid: 12345, familyView: true, logScale: true, fieldTicks: true }),
      'Deformation-zone width (m): histogram of 12,345 valid measurements, stacked by scarp family, logarithmic value axis, with field measurements marked',
    );
    assert.equal(measurementLabel('scarp_dip'), 'Scarp dip (°)');
  });
});

describe('segmentTitle', () => {
  test('{group}: {count} of {total} ({range})', () => {
    assert.equal(segmentTitle('Simple', 1234, 5678, '0.10–0.20 m'), 'Simple: 1,234 of 5,678 (0.10–0.20 m)');
  });
});
