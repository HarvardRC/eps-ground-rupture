// views-text.test.ts (docs/app/ddd.md §7.4, the `views-text.test.ts`
// row; §5.8 View layer): the view text builders, formatting only, per
// the pipeline-first rule of §7.4.
//
// - `displayRound` on the display-rounding vectors of §7.3, in that
//   order, identical to the Python list (`DISPLAY_ROUNDING_VECTORS` of
//   eps_ground_rupture/reference_cases.py).
//
// The `chartSummary`, `statsRows`, and `unclassifiedLine` cases of the
// same row join this file with T-41 and T-42.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { displayRound } from '../src/views/format';
import * as config from '../src/config';
import type { Stats } from '../src/stats/stats';
import { formatCount } from '../src/views/format';
import { chartSummary } from '../src/views/summary';

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

// --------------------------------------------------------------------
// chartSummary (T-41): the caption sentence's N is `formatCount(counts.valid)`.
// --------------------------------------------------------------------

describe('chartSummary', () => {
  const stats: Stats = { median: 1.235, p16: 0.5, p84: 2.004, min: 0.1, max: 4, mean: 1.3, sd: 0.7 };

  test('prints N as formatCount(counts.valid) and the statistics as quantities', () => {
    assert.equal(
      chartSummary(stats, { valid: 1234, excludedNull: 7 }, 'scarp_height', config),
      `Scarp height (m): ${formatCount(1234)} valid measurements, median 1.24 m, 16th–84th percentile range 0.50 m to 2.00 m.`,
    );
    assert.equal(
      chartSummary(stats, { valid: 30, excludedNull: 0 }, 'scarp_dip', config),
      'Scarp dip (°): 30 valid measurements, median 1°, 16th–84th percentile range 1° to 2°.',
    );
  });

  test('is unchanged when only counts.excludedNull changes', () => {
    assert.equal(
      chartSummary(stats, { valid: 1234, excludedNull: 0 }, 'dzw', config),
      chartSummary(stats, { valid: 1234, excludedNull: 99 }, 'dzw', config),
    );
  });

  test('changes when counts.valid changes', () => {
    assert.notEqual(
      chartSummary(stats, { valid: 1234, excludedNull: 0 }, 'dzw', config),
      chartSummary(stats, { valid: 1235, excludedNull: 0 }, 'dzw', config),
    );
  });
});
