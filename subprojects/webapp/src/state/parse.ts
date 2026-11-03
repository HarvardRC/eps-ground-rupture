// The free-entry validation (docs/app/ddd.md §5.7, Free-entry
// validation): grammar G and its canonical form, the exact decimal
// comparison, the rows R1 (slip minimum and maximum), R2 (offset
// maximum), R4 (dip-range assist), and R6 (percentile read-off); and
// `storedBoundsFromDecimal` (§5.3, Window resolution). Every function is
// pure; the commit model, the rejection mechanics, and every text shown
// to the reader are the controls' (§5.7).
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import type { OffsetWindow, SlipWindow } from './state';

/** Grammar G's limit on the trimmed text and on its canonical form (§5.7). */
export const DECIMAL_TEXT_LIMIT = 16;

/** The R2 bound on the offset maximum, in metres, as a canonical decimal (§5.7). */
export const OFFSET_MAX_BOUND = '1000';

// The ASCII whitespace of the WHATWG Infra standard: TAB, LF, FF, CR, SPACE.
const LEADING_ASCII_WHITESPACE = /^[\t\n\f\r ]+/;
const TRAILING_ASCII_WHITESPACE = /[\t\n\f\r ]+$/;

/** `text` with its leading and trailing ASCII whitespace removed (§5.7). */
export function trimAsciiWhitespace(text: string): string {
  return text.replace(LEADING_ASCII_WHITESPACE, '').replace(TRAILING_ASCII_WHITESPACE, '');
}

// --------------------------------------------------------------------
// Grammar G
// --------------------------------------------------------------------

const GRAMMAR_G = /^(\d+(\.\d*)?|\.\d+)$/;

/** A text read by grammar G: BLANK, INVALID, or a canonical decimal. */
export type DecimalReading =
  | { readonly kind: 'blank' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'decimal'; readonly value: string };

const BLANK: DecimalReading = { kind: 'blank' };
const INVALID: DecimalReading = { kind: 'invalid' };

/**
 * The canonical form of a text that matches grammar G's pattern: the
 * digits before the point without their leading zeros (`0` when none
 * remain), then the point and the digits after it without their
 * trailing zeros, only when some remain.
 */
function canonicalForm(matched: string): string {
  const point = matched.indexOf('.');
  const whole = point < 0 ? matched : matched.slice(0, point);
  const fraction = point < 0 ? '' : matched.slice(point + 1);
  const intDigits = whole.replace(/^0+/, '') || '0';
  const fracDigits = fraction.replace(/0+$/, '');
  return fracDigits === '' ? intDigits : `${intDigits}.${fracDigits}`;
}

/**
 * Reads `text` by grammar G (§5.7): trim ASCII whitespace (empty is
 * BLANK); more than 16 characters is INVALID; with no `.` and exactly
 * one `,`, the `,` is the decimal point; the text must match
 * `^(\d+(\.\d*)?|\.\d+)$`; and a canonical form of more than 16
 * characters is INVALID too.
 */
export function readDecimal(text: string): DecimalReading {
  const trimmed = trimAsciiWhitespace(text);
  if (trimmed === '') return BLANK;
  if (trimmed.length > DECIMAL_TEXT_LIMIT) return INVALID;
  let candidate = trimmed;
  if (!candidate.includes('.') && candidate.split(',').length === 2) {
    candidate = candidate.replace(',', '.');
  }
  if (!GRAMMAR_G.test(candidate)) return INVALID;
  const value = canonicalForm(candidate);
  if (value.length > DECIMAL_TEXT_LIMIT) return INVALID;
  return { kind: 'decimal', value };
}

/**
 * True when `text` is a canonical decimal: grammar G reads it as a
 * decimal equal to `text` itself, so it carries no whitespace, no comma,
 * and no superfluous zero, and has at most 16 characters.
 */
export function isCanonicalDecimal(text: string): boolean {
  const reading = readDecimal(text);
  return reading.kind === 'decimal' && reading.value === text;
}

// --------------------------------------------------------------------
// Exact decimal comparison
// --------------------------------------------------------------------

const PLAIN_DECIMAL = /^\d+(\.\d+)?$/;

function splitDecimal(text: string): { readonly whole: string; readonly fraction: string } {
  if (!PLAIN_DECIMAL.test(text)) {
    throw new RangeError(`not a non-negative decimal: ${JSON.stringify(text)}`);
  }
  const point = text.indexOf('.');
  return point < 0
    ? { whole: text, fraction: '' }
    : { whole: text.slice(0, point), fraction: text.slice(point + 1) };
}

/**
 * Compares two non-negative decimal texts (`\d+(\.\d+)?`, canonical
 * decimals among them) exactly, as `BigInt` integers after scaling both
 * to the larger number of fraction digits — never through a float (§5.7).
 * Returns -1, 0, or 1. Throws `RangeError` on any other text.
 */
export function compareDecimals(a: string, b: string): -1 | 0 | 1 {
  const x = splitDecimal(a);
  const y = splitDecimal(b);
  const digits = Math.max(x.fraction.length, y.fraction.length);
  const xi = BigInt(x.whole + x.fraction.padEnd(digits, '0'));
  const yi = BigInt(y.whole + y.fraction.padEnd(digits, '0'));
  return xi < yi ? -1 : xi > yi ? 1 : 0;
}

// --------------------------------------------------------------------
// Stored bounds (§5.3)
// --------------------------------------------------------------------

/** Slip's stored-unit exponent: slip is stored in units of 1e-4 m (§3.1). */
const SLIP_STORED_DIGITS = 4;

function scaledSlip(text: string, roundUp: boolean): number {
  const { whole, fraction } = splitDecimal(text);
  const kept = fraction.slice(0, SLIP_STORED_DIGITS).padEnd(SLIP_STORED_DIGITS, '0');
  const dropped = fraction.slice(SLIP_STORED_DIGITS);
  let units = BigInt(whole + kept);
  if (roundUp && /[1-9]/.test(dropped)) units += BigInt(1);
  return Number(units);
}

/**
 * The stored-integer bounds of a slip-mode window (§5.3, Window
 * resolution): `lo_s = ⌈min · 10^4⌉` and `hi_s = ⌊max · 10^4⌋`, computed
 * by integer (`BigInt`) arithmetic on the digit strings of the canonical
 * decimals `min` and `max`, never through a float — so `"0.00005"` gives
 * `lo_s` 1, `"5.01349"` gives `hi_s` 50134, and `"5.0135"` gives 50135.
 */
export function storedBoundsFromDecimal(min: string, max: string): [number, number] {
  return [scaledSlip(min, true), scaledSlip(max, false)];
}

// --------------------------------------------------------------------
// R1 — slip minimum and maximum
// --------------------------------------------------------------------

/**
 * The recorded maximum `String(slip_window_bounds.max)` (§3.2, §5.7): the
 * canonical decimal against which the slip-window rules compare. Throws
 * `RangeError` when it is not a canonical decimal.
 */
export function recordedSlipMax(bounds: { readonly max: number }): string {
  const text = String(bounds.max);
  if (!isCanonicalDecimal(text)) {
    throw new RangeError(`slip_window_bounds.max ${text} is not a canonical decimal`);
  }
  return text;
}

/** Why R1 rejected a pair of slip texts. */
export type SlipRejection = 'invalid' | 'above-recorded-max' | 'min-above-max';

/** R1's judgment of the two slip texts. */
export type SlipJudgment =
  | { readonly kind: 'accepted'; readonly window: SlipWindow }
  | { readonly kind: 'rejected'; readonly reason: SlipRejection };

/**
 * R1 (§5.7): judges the slip minimum and maximum texts together against
 * `bounds`, the manifest's `slipWindowBounds`. Both BLANK: accepted, the
 * inactive window. Otherwise the effective endpoints are the canonical
 * decimals, a BLANK minimum read as `0` and a BLANK maximum as
 * `String(slip_window_bounds.max)`. Rejected: either text INVALID; an
 * effective maximum above the recorded maximum; an effective minimum
 * above the effective maximum (a lone minimum above the recorded
 * maximum included). Every comparison is exact.
 */
export function judgeSlipWindow(
  minText: string,
  maxText: string,
  bounds: { readonly max: number },
): SlipJudgment {
  const min = readDecimal(minText);
  const max = readDecimal(maxText);
  if (min.kind === 'invalid' || max.kind === 'invalid') return { kind: 'rejected', reason: 'invalid' };
  if (min.kind === 'blank' && max.kind === 'blank') {
    return { kind: 'accepted', window: { mode: 'slip', min: null, max: null } };
  }
  const recorded = recordedSlipMax(bounds);
  const lo = min.kind === 'decimal' ? min.value : '0';
  const hi = max.kind === 'decimal' ? max.value : recorded;
  if (compareDecimals(hi, recorded) > 0) return { kind: 'rejected', reason: 'above-recorded-max' };
  if (compareDecimals(lo, hi) > 0) return { kind: 'rejected', reason: 'min-above-max' };
  return { kind: 'accepted', window: { mode: 'slip', min: lo, max: hi } };
}

// --------------------------------------------------------------------
// R2 — offset maximum
// --------------------------------------------------------------------

/** Why R2 rejected an offset text. */
export type OffsetRejection = 'blank' | 'invalid' | 'above-bound';

/** R2's judgment of the offset text at a commit. */
export type OffsetJudgment =
  | { readonly kind: 'accepted'; readonly window: OffsetWindow }
  | { readonly kind: 'rejected'; readonly reason: OffsetRejection };

/**
 * R2 (§5.7): judges the offset maximum text at a commit. Accepted: a
 * G-valid text whose canonical decimal is at most `1000`, compared
 * exactly; `0` is valid. Rejected: BLANK, INVALID, and a canonical
 * decimal above `1000`. (A never-committed BLANK field at a mode switch
 * is not judged at all — the controls' rule, R3.)
 */
export function judgeOffset(text: string): OffsetJudgment {
  const reading = readDecimal(text);
  if (reading.kind === 'blank') return { kind: 'rejected', reason: 'blank' };
  if (reading.kind === 'invalid') return { kind: 'rejected', reason: 'invalid' };
  if (compareDecimals(reading.value, OFFSET_MAX_BOUND) > 0) {
    return { kind: 'rejected', reason: 'above-bound' };
  }
  return { kind: 'accepted', window: { mode: 'offset', offsetMax: reading.value } };
}

// --------------------------------------------------------------------
// R4 — dip-range assist
// --------------------------------------------------------------------

const DIP_RANGE = /^\s*(\d+(\.\d+)?)\s*°?\s*([-–]\s*(\d+(\.\d+)?)\s*°?)?\s*$/;

/**
 * A dip-range text read by R4: BLANK, unreadable, or the inclusive
 * interval [`lo`, `hi`] as canonical decimals, `lo` ≤ `hi`.
 */
export type DipRangeReading =
  | { readonly kind: 'blank' }
  | { readonly kind: 'unreadable' }
  | { readonly kind: 'range'; readonly lo: string; readonly hi: string };

/**
 * R4's grammar (§5.7): readable text has at most 16 characters after
 * trimming ASCII whitespace and matches
 * `^\s*(\d+(\.\d+)?)\s*°?\s*([-–]\s*(\d+(\.\d+)?)\s*°?)?\s*$` — one value
 * meaning [v, v], two values in either order the interval between them.
 */
export function readDipRange(text: string): DipRangeReading {
  const trimmed = trimAsciiWhitespace(text);
  if (trimmed === '') return { kind: 'blank' };
  if (trimmed.length > DECIMAL_TEXT_LIMIT) return { kind: 'unreadable' };
  const m = DIP_RANGE.exec(trimmed);
  if (m === null) return { kind: 'unreadable' };
  const first = canonicalForm(m[1]);
  const second = m[4] === undefined ? first : canonicalForm(m[4]);
  return compareDecimals(first, second) <= 0
    ? { kind: 'range', lo: first, hi: second }
    : { kind: 'range', lo: second, hi: first };
}

/**
 * The modeled dips inside the interval of `range`, both ends inclusive,
 * compared exactly as decimals (§5.7, R4); ascending.
 */
export function dipsInRange(
  range: { readonly lo: string; readonly hi: string },
  dips: readonly number[],
): number[] {
  return dips
    .filter((d) => {
      const text = String(d);
      return compareDecimals(range.lo, text) <= 0 && compareDecimals(text, range.hi) <= 0;
    })
    .sort((a, b) => a - b);
}

// --------------------------------------------------------------------
// R6 — percentile read-off
// --------------------------------------------------------------------

/** A read-off commit classified by R6: BLANK, invalid, or the percentile q. */
export type ReadoffReading =
  | { readonly kind: 'blank' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'percentile'; readonly q: number };

// The HTML "valid floating-point number", the only non-empty value a
// number input's value sanitization lets through.
const FLOATING_POINT_NUMBER = /^-?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?$/;

/**
 * R6 (§5.7): classifies a read-off commit from the number input's
 * `value` and `validity.badInput`. BLANK when `value === ''` and
 * `badInput` is false; invalid when `badInput` is true or the value is
 * not an integer from 0 to 100; otherwise the percentile q.
 */
export function readReadoff(value: string, badInput: boolean): ReadoffReading {
  if (badInput) return { kind: 'invalid' };
  if (value === '') return { kind: 'blank' };
  if (!FLOATING_POINT_NUMBER.test(value)) return { kind: 'invalid' };
  const q = Number(value);
  if (!Number.isInteger(q) || q < 0 || q > 100) return { kind: 'invalid' };
  return { kind: 'percentile', q: q + 0 };
}
