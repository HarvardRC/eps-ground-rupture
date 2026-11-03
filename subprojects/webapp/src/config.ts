// Application configuration (docs/app/ddd.md §5.13): the product
// settings the PDD decides, read from config.json and nowhere else. No
// other module reads the JSON; every accessor derives what the code
// consumes from an entry's `value` and holds no second literal of it.
// check_pdd_agreement.py (.github/scripts/) checks each entry against
// the PDD section its `source` cites.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import type { ColumnName } from './decode/fields';
import configJson from './config.json';

/** Slip and the three measurements: the DD-10 names of §5.13's per-quantity entries. */
export type PrecisionMeasurement = Extract<ColumnName, 'scarp_height' | 'dzw' | 'scarp_dip' | 'slip'>;

/** The two count quantities of §5.13's per-quantity entries. */
type CountQuantity = 'counts' | 'shares';

/** One register entry (§5.13): the setting and where the PDD states it. */
interface ConfigEntry<V> {
  readonly value: V;
  readonly governs: string;
  readonly decision: string | null;
  readonly source: string;
  readonly quote: string;
  readonly quoted: string;
}

/**
 * The MVP member names, typed by the §5.13 naming rule: camelCase, and a
 * per-quantity entry ends in its quantity's name.
 */
type NumericEntryName =
  | 'smallResultWarnBelow'
  | 'chartFloorBelow'
  | 'lowSlipCaveatBelowMetres'
  | `displayPrecision.${PrecisionMeasurement}`
  | 'logScaleMinDecades';
type WordEntryName = `displayPrecision.${CountQuantity}`;

type ConfigFile = { readonly [K in NumericEntryName]: ConfigEntry<number> } & {
  readonly [K in WordEntryName]: ConfigEntry<string>;
};

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const member of Object.values(value as object)) {
      deepFreeze(member);
    }
  }
  return value;
}

const config: ConfigFile = deepFreeze(configJson satisfies ConfigFile);

/** The digits and power-of-ten exponent of a number's shortest decimal string. */
function decimalParts(value: number): { digits: string; exponent: number } {
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]\d+))?$/.exec(String(value));
  if (match === null) {
    throw new Error(`config: ${value} is not a finite non-negative decimal`);
  }
  const fraction = match[2] ?? '';
  return { digits: match[1] + fraction, exponent: Number(match[3] ?? '0') - fraction.length };
}

/** Number of fraction digits in the shortest decimal string of `value`. */
function fractionDigits(value: number): number {
  return Math.max(0, -decimalParts(value).exponent);
}

/**
 * Slip is stored in units of 1e-4 m (§3.1, `slip`: `scaled`, `decimals` 4),
 * the unit of the stored window bounds the low-slip trigger compares with.
 */
const SLIP_STORED_DECIMALS = 4;

/** D-11: the small-result warning shows while N is below this (§5.8). */
export function smallResultWarnBelow(): number {
  return config.smallResultWarnBelow.value;
}

/** D-11: the chart is suppressed while N is below this (§5.8). */
export function chartFloorBelow(): number {
  return config.chartFloorBelow.value;
}

/**
 * `t_s`: the `lowSlipCaveatBelowMetres` value in 1e-4 m stored units, by
 * exact decimal arithmetic on its shortest decimal string (5,000 for 0.5).
 */
export function lowSlipThresholdStored(): number {
  const { digits, exponent } = decimalParts(config.lowSlipCaveatBelowMetres.value);
  const shift = exponent + SLIP_STORED_DECIMALS;
  const kept = shift >= 0 ? digits + '0'.repeat(shift) : digits.slice(0, shift);
  if (shift < 0 && /[^0]/.test(digits.slice(shift))) {
    throw new Error('config: lowSlipCaveatBelowMetres is finer than the 1e-4 m stored unit');
  }
  return Number(kept);
}

/**
 * The fraction digits of the shortest decimal string of
 * `displayPrecision.<m>` (0.01 gives 2, 0.1 gives 1, 1 gives 0).
 */
export function displayDecimals(m: PrecisionMeasurement): number {
  return fractionDigits(config[`displayPrecision.${m}`].value);
}

/** The decades the matched width range must exceed to offer the log scale (§5.12). */
export function logScaleMinDecades(): number {
  return config.logScaleMinDecades.value;
}

/** The ratio R of the §5.12 offer rule for each `logScaleMinDecades` value. */
const OFFER_RATIO: { readonly [decades: number]: number } = { 1: 10, 2: 100, 3: 1000 };

/** R of the §5.12 offer rule: 100 for the value 2; throws outside the table. */
export function logScaleOfferRatio(): number {
  const decades = logScaleMinDecades();
  const ratio = OFFER_RATIO[decades];
  if (ratio === undefined) {
    throw new Error(`config: no offer ratio for logScaleMinDecades ${decades}`);
  }
  return ratio;
}
