// Range controls for fault angle and sediment depth (guided DDD §14, §14.6).
// The pure mapping between a draft's `number[]` set, the thumbs, and the echo.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  echoText,
  FULL_RANGE,
  hasGaps,
  isRangeField,
  RANGE_EMPTY_HINT,
  RANGE_IF_UNKNOWN,
  rangeBounds,
  rangeSet,
  spokenValue,
  stopLabel,
  thumbName,
} from '../src/explore/range';

const ANGLES = [20, 30, 40, 45, 50, 60, 70];
const DEPTHS = [3, 5, 10];

describe('guided range controls', () => {
  test('the owner-gated strings', () => {
    assert.equal(RANGE_IF_UNKNOWN, 'If unknown, select the full range.');
    assert.equal(FULL_RANGE, 'Full range');
    assert.equal(RANGE_EMPTY_HINT, 'Move a thumb or choose Full range to continue.');
    assert.equal(thumbName('faultDip', 'min'), 'Minimum fault angle');
    assert.equal(thumbName('faultDip', 'max'), 'Maximum fault angle');
    assert.equal(thumbName('depth', 'min'), 'Minimum sediment depth');
    assert.equal(thumbName('depth', 'max'), 'Maximum sediment depth');
  });

  test('stops and spoken values carry the modeled value and unit, never an index', () => {
    assert.equal(stopLabel('faultDip', 45), '45°');
    assert.equal(stopLabel('depth', 10), '10 m');
    assert.equal(spokenValue('faultDip', 40), '40 degrees');
    assert.equal(spokenValue('depth', 5), '5 metres');
    assert.equal(spokenValue('faultDip', 20, true), '20 degrees, not chosen');
    assert.equal(spokenValue('depth', 10, true), '10 metres, not chosen');
  });

  test('a thumb move materializes the contiguous modeled set between the stops', () => {
    assert.deepEqual(rangeSet(ANGLES, 1, 3), [30, 40, 45]);
    assert.deepEqual(rangeSet(ANGLES, 3, 3), [45]);
    assert.deepEqual(rangeSet(ANGLES, 0, 6), ANGLES);
    // Crossed or out-of-range indices still give the set between them, within the scale.
    assert.deepEqual(rangeSet(ANGLES, 4, 2), [40, 45, 50]);
    assert.deepEqual(rangeSet(DEPTHS, -1, 9), DEPTHS);
  });

  test('the thumbs render a set at its extremes, and an empty set at the scale ends', () => {
    assert.deepEqual(rangeBounds(ANGLES, [30, 40]), { lo: 1, hi: 2 });
    assert.deepEqual(rangeBounds(ANGLES, [60, 70]), { lo: 5, hi: 6 });
    assert.deepEqual(rangeBounds(ANGLES, [50, 20]), { lo: 0, hi: 4 });
    assert.deepEqual(rangeBounds(ANGLES, []), { lo: 0, hi: 6 });
    assert.deepEqual(rangeBounds(DEPTHS, [5]), { lo: 1, hi: 1 });
  });

  test('the echo lists every selected value and the count', () => {
    assert.equal(echoText('faultDip', ANGLES, [30, 40, 45]), 'Selected: 30°, 40°, 45° — 3 of 7 modeled angles.');
    assert.equal(echoText('faultDip', ANGLES, [40]), 'Selected: 40° — 1 of 7 modeled angles.');
    assert.equal(echoText('depth', DEPTHS, [10, 5]), 'Selected: 5 m, 10 m — 2 of 3 modeled depths.');
    assert.equal(echoText('depth', DEPTHS, DEPTHS), 'Selected: 3 m, 5 m, 10 m — 3 of 3 modeled depths.');
  });

  test('an empty group reads as unanswered', () => {
    assert.equal(echoText('faultDip', ANGLES, []), 'Selected: none — 0 of 7 modeled angles.');
    assert.equal(echoText('depth', DEPTHS, []), 'Selected: none — 0 of 3 modeled depths.');
    assert.equal(hasGaps(ANGLES, []), false);
  });

  test('a restored set with gaps is listed verbatim with "(with gaps)"', () => {
    assert.equal(hasGaps(ANGLES, [30, 50]), true);
    assert.equal(hasGaps(ANGLES, [30, 40, 45]), false);
    assert.equal(echoText('faultDip', ANGLES, [30, 50]), 'Selected: 30°, 50° — 2 of 7 modeled angles (with gaps).');
    assert.equal(echoText('depth', DEPTHS, [3, 10]), 'Selected: 3 m, 10 m — 2 of 3 modeled depths (with gaps).');
  });

  test('only the two ordered conditions are range fields', () => {
    assert.equal(isRangeField('faultDip'), true);
    assert.equal(isRangeField('depth'), true);
    assert.equal(isRangeField('density'), false);
    assert.equal(isRangeField('sediment'), false);
  });
});
