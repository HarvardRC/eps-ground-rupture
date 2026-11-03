// parity-self-check.test.ts (docs/app/ddd.md §7.2 step 3; §7.4): the
// accounting of the parity harness's self-check, `selfCheck(found)` of
// test/parity-self-check.ts, on the three cases §7.2 names — a correct
// run, a missing injection, and an extra difference.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { INJECTED_DIFFERENCES, SELF_CHECK_PASSED_LINE, selfCheck } from './parity-self-check';

const MATCHING_RECORDS = { caseId: 'GS-0', quantity: 'counts.matching_records', rule: 'exact' };
const MEDIAN = { caseId: 'GS-0', quantity: 'statistics.scarp_height.median', rule: 'tolerance' };
const DISPLAY = { caseId: 'GS-0', quantity: 'display.scarp_height.median', rule: 'display' };

test('the injected differences are the three of §7.2 step 3', () => {
  assert.deepEqual(INJECTED_DIFFERENCES, [MATCHING_RECORDS, MEDIAN, DISPLAY]);
  assert.equal(
    SELF_CHECK_PASSED_LINE,
    'self-check: expected differences reported: GS-0 counts.matching_records exact; ' +
      'GS-0 statistics.scarp_height.median tolerance; GS-0 display.scarp_height.median display',
  );
});

test('a correct run: exactly the three found, in any order, nothing missing or extra', () => {
  assert.deepEqual(selfCheck([MATCHING_RECORDS, MEDIAN, DISPLAY]), { missing: [], extra: [] });
  assert.deepEqual(selfCheck([DISPLAY, MATCHING_RECORDS, MEDIAN]), { missing: [], extra: [] });
});

test('a missing injection: the display difference absent, it alone missing', () => {
  assert.deepEqual(selfCheck([MATCHING_RECORDS, MEDIAN]), { missing: [DISPLAY], extra: [] });
});

test('an extra difference: a fourth, (GS-0, counts.unclassified, exact), it alone extra', () => {
  const unclassified = { caseId: 'GS-0', quantity: 'counts.unclassified', rule: 'exact' };
  assert.deepEqual(selfCheck([MATCHING_RECORDS, MEDIAN, DISPLAY, unclassified]), {
    missing: [],
    extra: [unclassified],
  });
});
