// Range controls for the two ordered site conditions (guided DDD §14;
// PDD D-50). Pure helpers: the draft keeps its `number[]` sets (§14.2),
// and these map a set to its thumbs and its echo, and a thumb move back
// to the contiguous set of modeled values between the bounds.

export type RangeField = 'faultDip' | 'depth';

export const RANGE_FIELDS: readonly RangeField[] = ['faultDip', 'depth'];

export const isRangeField = (field: string): field is RangeField => field === 'faultDip' || field === 'depth';

/** §14.3 as amended by §14.6: the closing line of the two range groups' hints, after G-26's §15.3 hints. */
export const RANGE_IF_UNKNOWN = 'If unknown, select the full range.';

/** §14.3: the action that sets both thumbs to the extremes; it also answers an empty group (§14.6 item 6). */
export const FULL_RANGE = 'Full range';

/** The hint under an unanswered (empty) range group: a fresh one, or a restored empty set (§14.6 items 1–2). */
export const RANGE_EMPTY_HINT = 'Move a thumb or choose Full range to continue.';

const NAMES: Record<RangeField, string> = { faultDip: 'fault angle', depth: 'sediment depth' };
const NOUNS: Record<RangeField, string> = { faultDip: 'angles', depth: 'depths' };

/** A modeled stop as the scale row and the echo show it: "40°", "5 m". */
export function stopLabel(field: RangeField, value: number): string {
  return field === 'faultDip' ? `${value}°` : `${value} m`;
}

/**
 * A thumb's accessible value (§14.1, §14.6 item 4): the modeled value with
 * its unit, never an index; while the group is unanswered, ", not chosen".
 */
export function spokenValue(field: RangeField, value: number, empty = false): string {
  const unit = field === 'faultDip' ? (value === 1 ? 'degree' : 'degrees') : (value === 1 ? 'metre' : 'metres');
  return `${value} ${unit}${empty ? ', not chosen' : ''}`;
}

/** A thumb's accessible name (§14.1, §14.6 item 4): "Minimum fault angle". */
export function thumbName(field: RangeField, end: 'min' | 'max'): string {
  return `${end === 'min' ? 'Minimum' : 'Maximum'} ${NAMES[field]}`;
}

/** The thumbs' stop indices for `set`: its extremes, or parked at the scale's ends when it is empty (§14.6 item 1). */
export function rangeBounds(values: readonly number[], set: readonly number[]): { lo: number; hi: number } {
  const indices = values.map((value, i) => (set.includes(value) ? i : -1)).filter(i => i >= 0);
  if (!indices.length) return { lo: 0, hi: values.length - 1 };
  return { lo: indices[0], hi: indices[indices.length - 1] };
}

/** §14.2: a thumb move materializes every modeled value from stop `lo` to stop `hi`. */
export function rangeSet(values: readonly number[], lo: number, hi: number): number[] {
  const a = Math.max(0, Math.min(lo, hi)), b = Math.min(values.length - 1, Math.max(lo, hi));
  return values.slice(a, b + 1);
}

/** Whether `set` skips a modeled value between its extremes (a pre-§14 record). */
export function hasGaps(values: readonly number[], set: readonly number[]): boolean {
  const members = values.filter(value => set.includes(value));
  if (!members.length) return false;
  const { lo, hi } = rangeBounds(values, set);
  return hi - lo + 1 !== members.length;
}

/**
 * The selection echo (§14.2): every selected modeled value and the count,
 * "Selected: 30°, 40°, 45° — 3 of 7 modeled angles.", with "(with gaps)"
 * appended for a restored set that skips a value.
 */
export function echoText(field: RangeField, values: readonly number[], set: readonly number[]): string {
  const members = values.filter(value => set.includes(value));
  const list = members.length ? members.map(value => stopLabel(field, value)).join(', ') : 'none';
  const gaps = hasGaps(values, set) ? ' (with gaps)' : '';
  return `Selected: ${list} — ${members.length} of ${values.length} modeled ${NOUNS[field]}${gaps}.`;
}
