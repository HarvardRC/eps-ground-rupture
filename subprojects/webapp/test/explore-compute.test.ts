// The guided page must reuse the established scientific pipeline.
// Decoded fixtures exercise selections, nulls, statistics and coverage.
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';

import * as config from '../src/config';
import { convertWindows, rangeFlag } from '../src/convert/convert';
import type { Vintage } from '../src/decode/decode';
import { mapRecord, REGRESSION_FIELDS, type Regression } from '../src/decode/fields';
import { query } from '../src/engine/query';
import { computeResult } from '../src/explore/compute';
import { defaultScenario, MEASUREMENT_NAMES, type Scenario } from '../src/state/state';
import { histogram, histogramLog } from '../src/stats/histogram';
import { summarize, validValues } from '../src/stats/stats';
import { buildFixture, decodeFixture, stageCountSpec, type FixtureSpec } from './fixtures';

let vintage: Vintage;
let regression: Regression;
let selectionTrap: Vintage;

before(async () => {
  const fixture = await buildFixture(stageCountSpec(102));
  vintage = await decodeFixture(fixture);
  regression = mapRecord(fixture.regressionExport, REGRESSION_FIELDS, 'regression') as unknown as Regression;
  const base = stageCountSpec(4);
  const trap: FixtureSpec = {
    ...base,
    stages: {
      slip: [0, 10000, 20000, 30000, 0, 10000, 20000, 30000, 0, 10000, 20000, 30000],
      scarp_height: [null, 100, 200, 300, null, 400, 500, null, null, 600, 700, null],
      dzw: [null, 1000, 2000, 3000, null, 4000, 5000, 6000, null, 7000, 8000, null],
      scarp_dip: [null, 10000, 20000, 30000, null, 20000, 30000, 40000, null, 30000, 40000, null],
      scarp_class: [null, 'Monoclinal', 'Simple', 'Pressure Ridge', null, 'Monoclinal', 'Simple', 'Simple', null, 'Monoclinal', 'Simple', null],
    },
  };
  selectionTrap = await decodeFixture(await buildFixture(trap));
});

function assertPipeline(scenario: Scenario, sequence: number, fitted: Regression | null): void {
  const actual = computeResult(vintage, scenario, sequence, fitted);
  const windows = scenario.window.mode === 'offset'
    ? convertWindows(Number(scenario.window.offsetMax), vintage.manifest.trialColumns.fault_dip, regression.coefficients)
    : undefined;
  const selection = query(vintage, scenario, windows);
  assert.deepEqual(actual.selection, selection);
  assert.deepEqual(actual.scenario, scenario);
  assert.equal(actual.sequence, sequence);
  assert.equal(actual.vintage, vintage);
  assert.equal(actual.field, null);
  assert.deepEqual(actual.windows, windows ?? null);
  assert.equal(actual.regression, windows ? fitted : null);
  assert.deepEqual(actual.flags, windows ? [...scenario.faultDip].sort((a, b) => a - b).map((faultDip) => ({
    faultDip,
    rangeFlag: rangeFlag(windows.find((window) => window.faultDip === faultDip)!, vintage.manifest.slipWindowBounds),
  })) : null);
  for (const measurement of MEASUREMENT_NAMES) {
    const values = validValues(vintage, selection, measurement);
    assert.deepEqual(actual.measurements[measurement], {
      values,
      stats: summarize(values),
      histogram: histogram(values.steps, values.classes, values.sorted, config.displayDecimals(measurement)),
    }, measurement);
  }
  const width = validValues(vintage, selection, 'dzw');
  assert.deepEqual(actual.histogramLog, histogramLog(width.steps, width.classes, config.logScaleOfferRatio()));
}

describe('guided computation parity', () => {
  test('direct-slip populations match existing query/statistics/histograms', () => {
    for (const population of ['all_stages', 'one_state_per_trial'] as const) {
      assertPipeline({ ...defaultScenario(vintage.manifest), population, window: { mode: 'slip', min: '0', max: '5' } }, 7, regression);
      assertPipeline({ ...defaultScenario(vintage.manifest), population, scarpClass: ['Simple'], window: { mode: 'slip', min: '0.5', max: '2' } }, 8, null);
    }
  });

  test('offset converts every modeled angle while flags describe selected angles', () => {
    const scenario: Scenario = {
      ...defaultScenario(vintage.manifest),
      faultDip: [70, 30],
      window: { mode: 'offset', offsetMax: '3' },
    };
    assertPipeline(scenario, 9, regression);
    const result = computeResult(vintage, scenario, 9, regression);
    assert.deepEqual(result.windows?.map((window) => window.faultDip), vintage.manifest.trialColumns.fault_dip);
    assert.deepEqual(result.flags?.map((flag) => flag.faultDip), [30, 70]);
  });

  test('empty and zero-valid outputs retain the existing null-statistic contract', () => {
    assertPipeline({ ...defaultScenario(vintage.manifest), window: { mode: 'slip', min: '4.9998', max: '4.9999' } }, 10, null);
    assertPipeline({ ...defaultScenario(vintage.manifest), window: { mode: 'slip', min: '0', max: '0' } }, 11, null);
  });

  test('missing regression fails offset computation but cannot block slip mode', () => {
    const scenario = defaultScenario(vintage.manifest);
    assert.throws(() => computeResult(vintage, { ...scenario, window: { mode: 'offset', offsetMax: '2' } }, 1, null), /conversion|regression/i);
    assert.doesNotThrow(() => computeResult(vintage, { ...scenario, window: { mode: 'slip', min: '0', max: '1' } }, 2, null));
  });

  test('last stage is chosen before class filtering, with no earlier substitute for nulls', () => {
    const scenario: Scenario = {
      ...defaultScenario(selectionTrap.manifest),
      population: 'one_state_per_trial',
      scarpClass: ['Simple'],
      window: { mode: 'slip', min: '0', max: '3' },
    };
    const result = computeResult(selectionTrap, scenario, 12, null);
    assert.deepEqual([...result.selection.indices], [7]);
    assert.equal(result.selection.matchingRecords, 1);
    assert.deepEqual(result.selection.perMeasurement.scarp_height, { valid: 0, excludedNull: 1 });
    assert.equal(result.measurements.scarp_height.stats, null);
    assert.equal(result.measurements.scarp_height.histogram, null);
    assert.equal(result.measurements.dzw.values.sorted.length, 1);
    assert.equal(result.measurements.dzw.stats?.sd, null);
  });

  test('all types keep unclassified last stages and separate missing measurements', () => {
    const scenario: Scenario = {
      ...defaultScenario(selectionTrap.manifest),
      population: 'one_state_per_trial',
      window: { mode: 'slip', min: '0', max: '3' },
    };
    const result = computeResult(selectionTrap, scenario, 13, null);
    assert.deepEqual([...result.selection.indices], [3, 7, 11]);
    assert.equal(result.selection.unclassified, 1);
    assert.deepEqual(result.selection.perMeasurement.scarp_height, { valid: 1, excludedNull: 2 });
    assert.deepEqual(result.selection.perMeasurement.dzw, { valid: 2, excludedNull: 1 });
  });
});
