// views-text.test.ts (docs/app/ddd.md §7.4, the `views-text.test.ts`
// row; §5.8 View layer): the view text builders, formatting only, per
// the pipeline-first rule of §7.4.
//
// - `displayRound` on the display-rounding vectors of §7.3, in that
//   order, identical to the Python list (`DISPLAY_ROUNDING_VECTORS` of
//   eps_ground_rupture/reference_cases.py).
// - `statsRows` and `unclassifiedLine` (src/views/stats-table.ts) on
//   independently injected statistics and `MeasurementCounts`: rows in
//   the PDD §4.2 order, values by `displayRound` at the D-23 decimals of
//   config.ts, counts by `formatCount`, the null mark for a null
//   statistic, and the PDD §4.3 line.
//
// The `chartSummary` cases of the same row join this file with T-41.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import * as config from '../src/config';
import type { MeasurementCounts } from '../src/engine/query';
import { MEASUREMENT_NAMES } from '../src/state/state';
import type { Stats } from '../src/stats/stats';
import { displayRound, formatCount } from '../src/views/format';
import { statsRows, unclassifiedLine } from '../src/views/stats-table';

/** The §7.3 display-rounding vectors, in that order: `[value, decimals, expected]`. */
const DISPLAY_ROUNDING_VECTORS: readonly (readonly [number, number, string])[] = [
  [3.635, 2, '3.64'],
  [1.005, 2, '1.01'],
  [2.675, 2, '2.68'],
  [2.175, 2, '2.18'],
  [4.315, 2, '4.32'],
  [3.6350000000000002, 2, '3.64'],
  [3.6349999999999993, 2, '3.63'],
  [-0.055, 2, '-0.06'],
  [-0.004, 2, '0.00'],
  [-0.0, 2, '0.00'],
  [0.005, 2, '0.01'],
  [-0.005, 2, '-0.01'],
  [1e-7, 2, '0.00'],
  [0.30000000000000004, 2, '0.30'],
  [45.85, 1, '45.9'],
  [89.5, 0, '90'],
  [-12.5, 0, '-13'],
  [2.5, 0, '3'],
  [5.0135, 3, '5.014'],
];

describe('displayRound', () => {
  for (const [value, decimals, expected] of DISPLAY_ROUNDING_VECTORS) {
    const shown = Object.is(value, -0) ? '-0.0' : String(value);
    test(`displayRound(${shown}, ${decimals}) is "${expected}"`, () => {
      assert.equal(displayRound(value, decimals), expected);
    });
  }
});

/** The §5.8 row labels, in the PDD §4.2 order. */
const ROW_LABELS: readonly string[] = [
  'Valid count',
  'Excluded null count',
  'Median',
  '16th percentile',
  '84th percentile',
  'Minimum',
  'Maximum',
  'Mean',
  'Standard deviation',
];

/** The §5.8 null mark, U+2014. */
const NULL_MARK = '\u2014';

/** The `Stats` members of rows 3–9, in the PDD §4.2 order. */
const STAT_MEMBERS: readonly (keyof Stats)[] = ['median', 'p16', 'p84', 'min', 'max', 'mean', 'sd'];

/** Injected statistics, frozen so that any write to them throws. */
function injected(values: Stats): Stats {
  return Object.freeze({ ...values });
}

const SAMPLE: Stats = injected({
  median: 3.635,
  p16: 1.005,
  p84: 45.85,
  min: -0.004,
  max: 89.5,
  mean: 2.675,
  sd: 0.30000000000000004,
});

const COUNTS: MeasurementCounts = Object.freeze({ valid: 1234567, excludedNull: 3434 });

describe('statsRows', () => {
  test('rows are labeled in the PDD §4.2 order for every measurement', () => {
    for (const m of MEASUREMENT_NAMES) {
      const rows = statsRows(SAMPLE, COUNTS, m, config);
      assert.deepEqual(
        rows.map((row) => row.label),
        ROW_LABELS,
      );
    }
  });

  test('values are displayRound at the D-23 decimals of config.ts', () => {
    for (const m of MEASUREMENT_NAMES) {
      const rows = statsRows(SAMPLE, COUNTS, m, config);
      const decimals = config.displayDecimals(m);
      STAT_MEMBERS.forEach((member, k) => {
        assert.equal(rows[k + 2].value, displayRound(SAMPLE[member] as number, decimals), `${m} ${member}`);
      });
    }
  });

  test('the D-23 decimals per measurement: 2, 1, and 0 places', () => {
    const median = (m: (typeof MEASUREMENT_NAMES)[number]): string =>
      statsRows(SAMPLE, COUNTS, m, config)[2].value;
    assert.equal(median('scarp_height'), '3.64');
    assert.equal(median('dzw'), '3.6');
    assert.equal(median('scarp_dip'), '4');
  });

  test('-0.005 at two decimals renders "-0.01" with the ASCII hyphen-minus; -0.004 renders "0.00"', () => {
    const stats = injected({ ...SAMPLE, median: -0.005, mean: -0.004 });
    const rows = statsRows(stats, COUNTS, 'scarp_height', config);
    assert.equal(config.displayDecimals('scarp_height'), 2);
    assert.equal(rows[2].value, '-0.01');
    assert.equal(rows[2].value.charCodeAt(0), 0x2d);
    assert.equal(rows[7].value, '0.00');
  });

  test('counts print by formatCount: 1234567 as "1,234,567"', () => {
    const rows = statsRows(SAMPLE, COUNTS, 'dzw', config);
    assert.equal(rows[0].value, '1,234,567');
    assert.equal(rows[0].value, formatCount(COUNTS.valid));
    assert.equal(rows[1].value, '3,434');
    assert.equal(rows[1].value, formatCount(COUNTS.excludedNull));
  });

  test('null statistics with { valid: 0, excludedNull: 1 }: 0, 1, and seven null marks', () => {
    for (const m of MEASUREMENT_NAMES) {
      const rows = statsRows(null, { valid: 0, excludedNull: 1 }, m, config);
      assert.deepEqual(
        rows.map((row) => row.value),
        ['0', '1', NULL_MARK, NULL_MARK, NULL_MARK, NULL_MARK, NULL_MARK, NULL_MARK, NULL_MARK],
      );
    }
  });

  test('null statistics with { valid: 0, excludedNull: 2 }: the excluded-null row shows 2', () => {
    const rows = statsRows(null, { valid: 0, excludedNull: 2 }, 'scarp_height', config);
    assert.deepEqual(
      rows.map((row) => row.value),
      ['0', '2', NULL_MARK, NULL_MARK, NULL_MARK, NULL_MARK, NULL_MARK, NULL_MARK, NULL_MARK],
    );
  });

  test('a null standard deviation (valid 1) shows the null mark in its row only', () => {
    const stats = injected({ median: 1.5, p16: 1.5, p84: 1.5, min: 1.5, max: 1.5, mean: 1.5, sd: null });
    const rows = statsRows(stats, { valid: 1, excludedNull: 0 }, 'scarp_height', config);
    assert.deepEqual(
      rows.map((row) => row.value),
      ['1', '0', '1.50', '1.50', '1.50', '1.50', '1.50', '1.50', NULL_MARK],
    );
  });

  test('the injected float64 statistics are never mutated', () => {
    const before = { ...SAMPLE };
    statsRows(SAMPLE, COUNTS, 'scarp_dip', config);
    assert.deepEqual({ ...SAMPLE }, before);
  });
});

describe('unclassifiedLine', () => {
  test('unclassifiedLine(0) is null', () => {
    assert.equal(unclassifiedLine(0), null);
  });

  test('unclassifiedLine(3434) is the PDD §4.3 line with X "3,434"', () => {
    assert.equal(
      unclassifiedLine(3434),
      'Unclassified records excluded from scarp-type views: 3,434 (zero-slip initial stages).',
    );
  });
});
