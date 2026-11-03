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
