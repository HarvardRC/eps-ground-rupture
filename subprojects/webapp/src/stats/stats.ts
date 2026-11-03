// The statistics module (docs/app/ddd.md §5.4; the `stats/` row of §5.1):
// `validValues(vintage, selection, measurement)`, which gathers one
// measurement's valid values from a query's selection as integer
// recording steps with their class codes and the restored float64
// values in ascending order, and `summarize(values)`, the FR-O2 set —
// median, p16, p84, min, max, mean, and the sample standard deviation —
// by the operation-identical algorithms whose Python twins write the
// reference results (§3.6).
//
// Measurement hygiene is the export's (§5.4): no value is re-filtered,
// clamped, or excluded here; only the column's null sentinel marks a
// value as not valid.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import type { Vintage } from '../decode/decode';
import type { Selection } from '../engine/query';
import type { MeasurementName } from '../state/state';
import { quantileLinear } from './quantile';

// --------------------------------------------------------------------
// Types
// --------------------------------------------------------------------

/**
 * One measurement's valid values among a selection (§5.4, Gather), in
 * artifact order: `steps`, the integers `s` in recording steps, and
 * `classes`, their class codes 0–5; `divisor`, the divisor `D` of the
 * §5.2 restore rule (1000 for all three measurements); and `sorted`, the
 * restored values `s / D` ascending.
 */
export interface ValidValues {
  readonly steps: Int32Array;
  readonly classes: Uint8Array;
  readonly divisor: number;
  readonly sorted: Float64Array;
}

/**
 * The FR-O2 summary statistics of one measurement (§5.4), in physical
 * units, under the member names of the §3.6 `statistics` record. `sd` is
 * null with one valid value.
 */
export interface Stats {
  readonly median: number;
  readonly p16: number;
  readonly p84: number;
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly sd: number | null;
}

// --------------------------------------------------------------------
// Gather
// --------------------------------------------------------------------

/** The class code of an unclassified record (§3.1, `scarp_class`). */
const UNCLASSIFIED = 255;

/**
 * The divisor `D` of the §5.2 restore rule for a measurement: every
 * measurement's `decimals` is 3 (§5.12), so `D` is the integer literal
 * 1000 for all three (§5.4), never a computed power of ten. Any other
 * `decimals` is an internal failure (§5.10).
 */
function measurementDivisor(measurement: MeasurementName, decimals: number | null): number {
  if (decimals !== 3) {
    throw new Error(`stats: ${measurement} decimals ${decimals}, expected 3`);
  }
  return 1000;
}

/**
 * A reader of the integer recording step of measurement `m` at a record
 * index (§5.4, Gather): `stored + offset_steps` for scarp height and
 * width, the dip dictionary entry (thousandths of a degree) for scarp dip.
 */
function stepReader(vintage: Vintage, m: MeasurementName): (index: number) => number {
  if (m === 'scarp_dip') {
    const { scarpDip, dipDictionary } = vintage;
    return (index) => dipDictionary[scarpDip[index]];
  }
  const values = m === 'scarp_height' ? vintage.scarpHeight : vintage.dzw;
  const offsetSteps = vintage.manifest.columns[m].offsetSteps;
  if (offsetSteps === null) {
    throw new Error(`stats: the manifest gives columns.${m} no offset_steps`);
  }
  return (index) => values[index] + offsetSteps;
}

/** The stored-integer array of measurement `m` (§3.1). */
function storedArray(vintage: Vintage, m: MeasurementName): Uint16Array {
  switch (m) {
    case 'scarp_height':
      return vintage.scarpHeight;
    case 'dzw':
      return vintage.dzw;
    case 'scarp_dip':
      return vintage.scarpDip;
  }
}

/**
 * The valid values of `measurement` among the records `selection` holds
 * (§5.4, Gather): the selected records in artifact order, each value that
 * is not the column's null sentinel kept as its recording step with its
 * class code. A kept value whose class code is 255 breaks the export's
 * `unclassified-has-no-valid-measurement` rule and throws — an internal
 * failure (§5.10).
 */
export function validValues(vintage: Vintage, selection: Selection, measurement: MeasurementName): ValidValues {
  const column = vintage.manifest.columns[measurement];
  const divisor = measurementDivisor(measurement, column.decimals);
  const sentinel = column.nullSentinel;
  const stored = storedArray(vintage, measurement);
  const step = stepReader(vintage, measurement);
  const { scarpClass } = vintage;
  const { indices } = selection;

  let n = 0;
  for (let k = 0; k < indices.length; k++) {
    if (stored[indices[k]] !== sentinel) n++;
  }

  const steps = new Int32Array(n);
  const classes = new Uint8Array(n);
  let j = 0;
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k];
    if (stored[i] === sentinel) continue;
    const code = scarpClass[i];
    if (code === UNCLASSIFIED) {
      throw new Error(
        `stats: record ${i} holds a valid ${measurement} value and class code 255 ` +
          '(rule unclassified-has-no-valid-measurement)',
      );
    }
    steps[j] = step(i);
    classes[j] = code;
    j++;
  }

  const sorted = new Float64Array(n);
  for (let k = 0; k < n; k++) sorted[k] = steps[k] / divisor;
  sorted.sort();

  return { steps, classes, divisor, sorted };
}

// --------------------------------------------------------------------
// Summarize
// --------------------------------------------------------------------

/**
 * The mean of §5.4 step 4: `S / (n · D)`, with `S` the sum of the
 * integer steps, exact in a float64 accumulator (every partial sum stays
 * below 2^53), and one correctly rounded division.
 */
export function meanFromSteps(steps: Int32Array, divisor: number): number {
  let total = 0;
  for (let k = 0; k < steps.length; k++) total += steps[k];
  return total / (steps.length * divisor);
}

/**
 * The sample standard deviation of §5.4 step 5: an explicit ascending
 * loop over `sorted` accumulating `(x − mean) · (x − mean)`, then
 * `sqrt(acc / (n − 1))`. Needs at least two values.
 */
export function sampleSd(sorted: Float64Array, mean: number): number {
  let acc = 0;
  for (let k = 0; k < sorted.length; k++) {
    const x = sorted[k];
    acc += (x - mean) * (x - mean);
  }
  return Math.sqrt(acc / (sorted.length - 1));
}

/**
 * The FR-O2 set over `values` (§5.4): null with no valid value; with
 * one, `sd` null and the percentiles from the endpoint branch; with two
 * or more, all seven numbers.
 */
export function summarize(values: ValidValues): Stats | null {
  const { steps, divisor, sorted } = values;
  const n = sorted.length;
  if (n === 0) return null;
  const mean = meanFromSteps(steps, divisor);
  return {
    median: quantileLinear(sorted, 50 / 100),
    p16: quantileLinear(sorted, 16 / 100),
    p84: quantileLinear(sorted, 84 / 100),
    min: sorted[0],
    max: sorted[n - 1],
    mean,
    sd: n >= 2 ? sampleSd(sorted, mean) : null,
  };
}
