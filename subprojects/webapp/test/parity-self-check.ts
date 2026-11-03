// The parity harness's self-check accounting (docs/app/ddd.md §7.2
// step 3): `selfCheck(found)`, a pure function. On the GS-0 entry the
// harness first compares the application's results against a perturbed
// copy of the entry — `counts.matching_records` plus 1,
// `statistics.scarp_height.median` multiplied by 1 + 1e-6, and the last
// digit of `display.scarp_height.median` incremented modulo 10 — and
// collects that comparison's differences apart from the run's real ones.
// Rule `self-check` requires them to be exactly the three injected
// differences, each identified by case, quantity, and rule, in any
// order. `test/parity-self-check.test.ts` asserts the accounting.
//
// No I/O and no import: the harness (test/parity.ts) and the unit test
// both call it.

/** A collected difference as the self-check identifies it. */
export interface FoundDifference {
  readonly caseId: string;
  readonly quantity: string;
  readonly rule: string;
}

/** The three differences the GS-0 perturbation injects (§7.2 step 3), in that order. */
export const INJECTED_DIFFERENCES: readonly FoundDifference[] = [
  { caseId: 'GS-0', quantity: 'counts.matching_records', rule: 'exact' },
  { caseId: 'GS-0', quantity: 'statistics.scarp_height.median', rule: 'tolerance' },
  { caseId: 'GS-0', quantity: 'display.scarp_height.median', rule: 'display' },
];

/**
 * The one diagnostic line a passing self-check prints (§7.2, Report),
 * naming the three injected differences.
 */
export const SELF_CHECK_PASSED_LINE =
  'self-check: expected differences reported: ' +
  INJECTED_DIFFERENCES.map((d) => `${d.caseId} ${d.quantity} ${d.rule}`).join('; ');

function same(a: FoundDifference, b: FoundDifference): boolean {
  return a.caseId === b.caseId && a.quantity === b.quantity && a.rule === b.rule;
}

/**
 * The self-check of §7.2 step 3: `found` against the three injected
 * differences, in any order. `missing` holds each injected difference
 * that `found` lacks; `extra` each found difference left over once every
 * injected one is matched — a repeat of an injected difference included.
 * The check passes exactly when both are empty.
 */
export function selfCheck(found: readonly FoundDifference[]): {
  missing: FoundDifference[];
  extra: FoundDifference[];
} {
  const unmatched = [...found];
  const missing: FoundDifference[] = [];
  for (const injected of INJECTED_DIFFERENCES) {
    const k = unmatched.findIndex((d) => same(d, injected));
    if (k < 0) missing.push(injected);
    else unmatched.splice(k, 1);
  }
  const extra = unmatched.map((d) => ({ caseId: d.caseId, quantity: d.quantity, rule: d.rule }));
  return { missing, extra };
}
