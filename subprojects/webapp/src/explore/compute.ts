// The guided page shares all scientific algorithms with /scenario/.
import * as config from '../config';
import { convertWindows, rangeFlag } from '../convert/convert';
import type { Vintage } from '../decode/decode';
import type { Regression } from '../decode/fields';
import { query } from '../engine/query';
import type { MeasurementName, Scenario } from '../state/state';
import { histogram, histogramLog } from '../stats/histogram';
import { summarize, validValues } from '../stats/stats';
import type { MeasurementResult, RenderInput } from '../views/render-input';

export function computeResult(vintage: Vintage, scenario: Scenario, sequence: number, regression: Regression | null): RenderInput {
  let windows: RenderInput['windows'] = null;
  let flags: RenderInput['flags'] = null;
  let used: Regression | null = null;
  if (scenario.window.mode === 'offset') {
    if (regression === null) throw new Error('Offset conversion is unavailable. Retry loading it or use fault slip.');
    windows = convertWindows(Number(scenario.window.offsetMax), vintage.manifest.trialColumns.fault_dip, regression.coefficients);
    flags = [...scenario.faultDip].sort((a, b) => a - b).map(faultDip => {
      const window = windows!.find(w => w.faultDip === faultDip);
      if (!window) throw new Error(`No conversion for fault angle ${faultDip}.`);
      return { faultDip, rangeFlag: rangeFlag(window, vintage.manifest.slipWindowBounds) };
    });
    used = regression;
  }
  const selection = query(vintage, scenario, windows ?? undefined);
  const measurement = (m: MeasurementName): MeasurementResult => {
    const values = validValues(vintage, selection, m);
    return {
      values, stats: summarize(values),
      histogram: histogram(values.steps, values.classes, values.sorted, config.displayDecimals(m)),
    };
  };
  const measurements = {
    scarp_height: measurement('scarp_height'),
    dzw: measurement('dzw'),
    scarp_dip: measurement('scarp_dip'),
  };
  return {
    selection, measurements, scenario, sequence, vintage, windows, flags,
    regression: used, field: null,
    histogramLog: histogramLog(measurements.dzw.values.steps, measurements.dzw.values.classes, config.logScaleOfferRatio()),
  };
}
