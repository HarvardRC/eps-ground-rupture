// The display formatters of docs/app/ddd.md §5.8 (Statistics tables):
// `displayRound(v, decimals)`, the one display rounding of every value
// the page shows — the twin of the reference generator's `display_round`
// (§3.6), so the page's strings equal the reference `display` strings
// exactly — and `formatCount(n)`, every displayed count. Both work on
// decimal digit strings, never through a locale API or a computed power
// of ten.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

/**
 * The digits and the power-of-ten exponent of a shortest round-trip
 * decimal string, exponent forms included: `'2.675'` gives `2675` and −3,
 * `'1e-7'` gives `1` and −7, `'1.5e+21'` gives `15` and 20.
 */
function decimalParts(text: string): { digits: string; exponent: number } {
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/.exec(text);
  if (match === null) {
    throw new Error(`displayRound: unreadable decimal string ${text}`);
  }
  const fraction = match[2] ?? '';
  return { digits: match[1] + fraction, exponent: Number(match[3] ?? '0') - fraction.length };
}

/** A string of decimal digits plus one, by string arithmetic. */
function incrementDigits(digits: string): string {
  const out = digits.split('');
  let k = out.length - 1;
  while (k >= 0 && out[k] === '9') {
    out[k] = '0';
    k--;
  }
  if (k < 0) return '1' + out.join('');
  out[k] = String(Number(out[k]) + 1);
  return out.join('');
}

/**
 * `v` rounded for display to `decimals` places (§5.8): the shortest
 * round-trip digits of `|v|` (`String(Math.abs(v))`), rounded half away
 * from zero by string arithmetic; no sign on a zero result, otherwise the
 * ASCII hyphen-minus for `v < 0`; exactly `decimals` fraction digits, no
 * grouping. A non-finite `v` throws — an internal failure (§5.10).
 */
export function displayRound(v: number, decimals: number): string {
  if (!Number.isFinite(v)) {
    throw new Error(`displayRound: non-finite value ${v}`);
  }
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new Error(`displayRound: decimals ${decimals} is not a count of places`);
  }
  const { digits, exponent } = decimalParts(String(Math.abs(v)));

  // The magnitude in units of 10^−decimals, rounded half up: `scaled`.
  const shift = exponent + decimals;
  let scaled: string;
  if (shift >= 0) {
    scaled = digits + '0'.repeat(shift);
  } else {
    const cut = -shift;
    const padded = digits.length > cut ? digits : '0'.repeat(cut + 1 - digits.length) + digits;
    const kept = padded.slice(0, padded.length - cut);
    scaled = padded.charAt(padded.length - cut) >= '5' ? incrementDigits(kept) : kept;
  }
  scaled = scaled.replace(/^0+(?=\d)/, '');

  const isZero = /^0+$/.test(scaled);
  let text: string;
  if (decimals === 0) {
    text = scaled;
  } else {
    const whole = scaled.length > decimals ? scaled : '0'.repeat(decimals + 1 - scaled.length) + scaled;
    text = `${whole.slice(0, whole.length - decimals)}.${whole.slice(whole.length - decimals)}`;
  }
  return !isZero && v < 0 ? `-${text}` : text;
}

/**
 * A count for display (§5.8): its exact decimal digits with a comma
 * between each group of three, never a locale API — `3434` gives
 * `'3,434'`. Throws unless `n` is a non-negative safe integer.
 */
export function formatCount(n: number): string {
  if (!Number.isSafeInteger(n) || n < 0) {
    throw new Error(`formatCount: ${n} is not a count`);
  }
  const digits = String(n);
  let out = '';
  for (let k = 0; k < digits.length; k++) {
    if (k > 0 && (digits.length - k) % 3 === 0) out += ',';
    out += digits.charAt(k);
  }
  return out;
}
