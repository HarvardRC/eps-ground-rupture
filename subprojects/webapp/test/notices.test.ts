// notices.test.ts (docs/app/ddd.md §7.4, the `notices.test.ts` row; §5.8
// Result notices and Caveats): `selectNotices(input, cfg)` of
// src/views/notices.ts on injected `RenderInput`s.
//
// - At N = 0, 9, 10, 29, and 30 and at zero matching records, exactly one
//   result notice per panel — the tier's — and the caveats coexist; N is
//   derived from the D-11 thresholds of config.ts, never from literals.
// - The empty-state explainer carries its second part exactly when the
//   diagnosed set is non-empty, its `{condition(s)}` named and joined as
//   §5.8 fixes.
// - The plan's `caveats` in their order: the scarp-dip notice first; the
//   low-slip caveat for a direct window whose `lo_s` is `t_s − 1`, not for
//   one at `t_s`, for a converted window of `windows` below `t_s`, and
//   never for the inactive window; a per-dip line, its `{Y}` from
//   `windows`, for exactly the `partly_out` entries of `flags` — `t_s`
//   read from config.ts.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import * as config from '../src/config';
import type { RangeFlag } from '../src/convert/convert';
import type { Vintage } from '../src/decode/decode';
import type { ConditionGroup, PerDipWindows, Selection } from '../src/engine/query';
import { storedBoundsFromDecimal } from '../src/state/parse';
import { MEASUREMENT_NAMES, type MeasurementName, type Scenario, type ScenarioWindow } from '../src/state/state';
import { copyText } from '../src/views/copy';
import { displayRound, formatCount } from '../src/views/format';
import { conditionList, noticeText, selectNotices, type NoticePlan, type NoticeRef } from '../src/views/notices';
import type { RenderInput } from '../src/views/render-input';
import { stepsDecimal } from './fixtures';

/** The stored slip unit (§3.1: `slip` scaled by 1e-4). */
const SLIP_SCALE = 1e-4;

const SCARP_DIP = 'pdd5.4.scarpDipNotice';
const LOW_SLIP = 'pdd5.9.lowSlipCaveat';
const PER_DIP = 'pdd5.6.perDipLine';
const WARNING = 'pdd5.8.smallResultWarning';
const SUPPRESSION = 'pdd5.8.suppressionNotice';
const NO_VALID = 'pdd5.8.noValidMeasurement';
const EXPLAINER = 'pdd5.8.emptyExplainer';
const RELAXATION = 'pdd5.8.emptyRelaxation';

const RESULT_NOTICE_KEYS: ReadonlySet<string> = new Set([WARNING, SUPPRESSION, NO_VALID]);

const INACTIVE: ScenarioWindow = { mode: 'slip', min: null, max: null };

interface InputSpec {
  /** Valid N per panel; default 100 for each. */
  readonly valid?: Partial<{ [m in MeasurementName]: number }>;
  /** Matching records; default the largest valid N (0 with no valid values). */
  readonly matching?: number;
  readonly diagnosed?: readonly ConditionGroup[] | null;
  readonly window?: ScenarioWindow;
  readonly faultDip?: readonly number[];
  readonly windows?: PerDipWindows | null;
  readonly flags?: readonly { readonly faultDip: number; readonly rangeFlag: RangeFlag }[] | null;
}

/** An injected `RenderInput`: the members `selectNotices` reads, the rest left out. */
function inputOf(spec: InputSpec): RenderInput {
  const valid = {} as { [m in MeasurementName]: number };
  for (const m of MEASUREMENT_NAMES) valid[m] = spec.valid?.[m] ?? 100;
  const matching = spec.matching ?? Math.max(...MEASUREMENT_NAMES.map((m) => valid[m]));
  const perMeasurement = {} as { [m in MeasurementName]: { valid: number; excludedNull: number } };
  for (const m of MEASUREMENT_NAMES) perMeasurement[m] = { valid: valid[m], excludedNull: matching - valid[m] };
  const selection: Selection = {
    indices: new Uint32Array(0),
    matchingRecords: matching,
    unclassified: 0,
    perMeasurement,
    diagnosedConditions: matching === 0 ? (spec.diagnosed ?? []) : null,
  };
  const scenario: Scenario = {
    faultDip: spec.faultDip ?? [30, 40, 50],
    sediment: [],
    depth: [],
    density: [],
    window: spec.window ?? INACTIVE,
    population: 'all_stages',
    scarpClass: [],
  };
  const vintage = { manifest: { columns: { slip: { scale: SLIP_SCALE } } } } as unknown as Vintage;
  return {
    selection,
    scenario,
    vintage,
    windows: spec.windows ?? null,
    flags: spec.flags ?? null,
    regression: null,
    field: null,
    sequence: 0,
    histogramLog: null,
  } as unknown as RenderInput;
}

const keys = (refs: readonly NoticeRef[]): string[] => refs.map((r) => r.key);

/** Every result notice the plan shows: the results-level explainer, or the panels' notices. */
function resultNotices(plan: NoticePlan, m: MeasurementName): string[] {
  const ref = plan.panels[m];
  return ref === null ? [] : [ref.key];
}

// --------------------------------------------------------------------
// The tiers
// --------------------------------------------------------------------

describe('selectNotices: one result notice per panel by the D-11 tiers', () => {
  const floor = config.chartFloorBelow();
  const warnBelow = config.smallResultWarnBelow();
  const tiers: readonly (readonly [string, number, string | null])[] = [
    ['N = 0', 0, NO_VALID],
    ['N = chart floor − 1 (9)', floor - 1, SUPPRESSION],
    ['N = chart floor (10)', floor, WARNING],
    ['N = warning threshold − 1 (29)', warnBelow - 1, WARNING],
    ['N = warning threshold (30)', warnBelow, null],
  ];

  for (const [name, n, expected] of tiers) {
    test(`${name}: ${expected ?? 'no notice'} on that panel, the caveats coexisting`, () => {
      const plan = selectNotices(inputOf({ valid: { dzw: n }, matching: 120 }), config);
      assert.equal(plan.state, null);
      assert.deepEqual(plan.explainer, []);
      assert.deepEqual(resultNotices(plan, 'dzw'), expected === null ? [] : [expected]);
      for (const m of MEASUREMENT_NAMES) {
        assert.ok(resultNotices(plan, m).length <= 1);
        const ref = plan.panels[m];
        if (ref !== null) assert.ok(RESULT_NOTICE_KEYS.has(ref.key));
      }
      assert.equal(plan.panels.scarp_height, null);
      assert.equal(plan.panels.scarp_dip, null);
      assert.equal(plan.caveats[0].key, SCARP_DIP);
    });
  }

  test('every panel at its own tier at once', () => {
    const plan = selectNotices(inputOf({ valid: { scarp_height: floor - 1, dzw: 0, scarp_dip: warnBelow - 1 }, matching: 50 }), config);
    assert.equal(plan.panels.scarp_height?.key, SUPPRESSION);
    assert.equal(plan.panels.dzw?.key, NO_VALID);
    assert.equal(plan.panels.scarp_dip?.key, WARNING);
  });

  test('slots fill as rendered: {N} and {X} through formatCount, {measurement} the lower-cased label without unit', () => {
    const big = selectNotices(inputOf({ valid: { scarp_height: 0, dzw: 0, scarp_dip: 0 }, matching: 1234 }), config);
    assert.deepEqual(big.panels.scarp_height?.slots, { X: formatCount(1234), measurement: 'scarp height' });
    assert.deepEqual(big.panels.dzw?.slots, { X: '1,234', measurement: 'deformation-zone width' });
    assert.deepEqual(big.panels.scarp_dip?.slots, { X: '1,234', measurement: 'scarp dip' });
    assert.equal(
      noticeText(big.panels.dzw!),
      '1,234 simulation records match this scenario, but none has a valid deformation-zone width value — no distribution can be computed. The records appear in the excluded count of the statistics table.',
    );
    const warn = selectNotices(inputOf({ valid: { scarp_height: warnBelow - 1 } }), config);
    assert.deepEqual(warn.panels.scarp_height?.slots, { N: formatCount(warnBelow - 1) });
    assert.equal(
      noticeText(warn.panels.scarp_height!),
      `Only ${formatCount(warnBelow - 1)} valid measurements match this scenario — too few for a reliable distribution. Interpret with caution.`,
    );
  });
});

// --------------------------------------------------------------------
// The empty state
// --------------------------------------------------------------------

describe('selectNotices: zero matching records', () => {
  test("the results-level 'empty', no panel notice, the caveats coexisting", () => {
    const plan = selectNotices(inputOf({ valid: { scarp_height: 0, dzw: 0, scarp_dip: 0 }, matching: 0, diagnosed: [] }), config);
    assert.equal(plan.state, 'empty');
    for (const m of MEASUREMENT_NAMES) assert.deepEqual(resultNotices(plan, m), []);
    assert.deepEqual(keys(plan.caveats), [SCARP_DIP]);
  });

  test('an empty diagnosed set: the explainer without its second part', () => {
    const plan = selectNotices(inputOf({ valid: { scarp_height: 0, dzw: 0, scarp_dip: 0 }, matching: 0, diagnosed: [] }), config);
    assert.deepEqual(keys(plan.explainer), [EXPLAINER]);
    assert.equal(noticeText(plan.explainer[0]), 'No simulations match this scenario.');
  });

  const cases: readonly (readonly [readonly ConditionGroup[], string])[] = [
    [['depth'], 'sediment depth'],
    [['sediment', 'depth'], 'sediment strength and sediment depth'],
    [['fault_dip', 'density', 'window'], 'fault dip, sediment density and displacement window'],
    [
      ['fault_dip', 'sediment', 'depth', 'density', 'window', 'scarp_class'],
      'fault dip, sediment strength, sediment depth, sediment density, displacement window and resulting scarp type',
    ],
  ];
  for (const [diagnosed, list] of cases) {
    test(`diagnosed [${diagnosed.join(', ')}]: the second part names "${list}"`, () => {
      const plan = selectNotices(inputOf({ valid: { scarp_height: 0, dzw: 0, scarp_dip: 0 }, matching: 0, diagnosed }), config);
      assert.deepEqual(keys(plan.explainer), [EXPLAINER, RELAXATION]);
      assert.deepEqual(plan.explainer[1].slots, { 'condition(s)': list });
      assert.equal(conditionList(diagnosed), list);
      assert.equal(noticeText(plan.explainer[1]), `Relaxing any one of ${list} alone would produce matches.`);
    });
  }

  test('matching records: no explainer, whatever the panels show', () => {
    const plan = selectNotices(inputOf({ valid: { scarp_height: 0, dzw: 0, scarp_dip: 0 }, matching: 7 }), config);
    assert.equal(plan.state, null);
    assert.deepEqual(plan.explainer, []);
    for (const m of MEASUREMENT_NAMES) assert.deepEqual(resultNotices(plan, m), [NO_VALID]);
  });
});

// --------------------------------------------------------------------
// The caveats
// --------------------------------------------------------------------

describe('selectNotices: the caveats in their order', () => {
  const ts = config.lowSlipThresholdStored();
  const below = stepsDecimal(ts - 1, 4);
  const at = stepsDecimal(ts, 4);

  test('the stored bounds of the injected windows are t_s − 1 and t_s', () => {
    assert.equal(storedBoundsFromDecimal(below, '5')[0], ts - 1);
    assert.equal(storedBoundsFromDecimal(at, '5')[0], ts);
  });

  test('the scarp-dip notice first, in every plan', () => {
    assert.deepEqual(keys(selectNotices(inputOf({}), config).caveats), [SCARP_DIP]);
  });

  test('the inactive window never fires the low-slip caveat', () => {
    const plan = selectNotices(inputOf({ window: INACTIVE }), config);
    assert.ok(!keys(plan.caveats).includes(LOW_SLIP));
  });

  test('a direct window whose lo_s is t_s − 1 fires it', () => {
    const plan = selectNotices(inputOf({ window: { mode: 'slip', min: below, max: '3' } }), config);
    assert.deepEqual(keys(plan.caveats), [SCARP_DIP, LOW_SLIP]);
    assert.equal(noticeText(plan.caveats[1]), copyText(LOW_SLIP));
  });

  test('a direct window whose lo_s is t_s does not', () => {
    const plan = selectNotices(inputOf({ window: { mode: 'slip', min: at, max: '3' } }), config);
    assert.deepEqual(keys(plan.caveats), [SCARP_DIP]);
  });

  /** Converted windows of 30°, 40°, 50°, and 60°, ending above the modeled range at 30° and 50°. */
  const windowsAt = (lo: number): PerDipWindows => [
    { faultDip: 30, lo, hi: 5.985399936373104 },
    { faultDip: 40, lo, hi: 4.660021065319635 },
    { faultDip: 50, lo, hi: 5.0251 },
    { faultDip: 60, lo: 0.0102, hi: 3.9 },
  ];
  const offset: ScenarioWindow = { mode: 'offset', offsetMax: '3' };

  test('a converted window of a selected dip below t_s fires it', () => {
    const plan = selectNotices(inputOf({ window: offset, faultDip: [30, 40], windows: windowsAt(0.010208562014765728) }), config);
    assert.deepEqual(keys(plan.caveats), [SCARP_DIP, LOW_SLIP]);
  });

  test('converted windows at t_s do not, nor an unselected dip below it', () => {
    const plan = selectNotices(
      inputOf({ window: offset, faultDip: [30, 40], windows: windowsAt(ts * SLIP_SCALE), flags: [] }),
      config,
    );
    assert.deepEqual(keys(plan.caveats), [SCARP_DIP]);
  });

  test('one converted window below t_s among selected dips at t_s fires it', () => {
    const windows = windowsAt(ts * SLIP_SCALE).map((w) => (w.faultDip === 40 ? { ...w, lo: (ts - 1) * SLIP_SCALE } : w));
    const plan = selectNotices(inputOf({ window: offset, faultDip: [30, 40], windows }), config);
    assert.deepEqual(keys(plan.caveats), [SCARP_DIP, LOW_SLIP]);
  });

  test('a per-dip line, its {Y} from windows, for exactly the partly_out entries of flags, by ascending dip', () => {
    const windows = windowsAt(0.010208562014765728);
    const plan = selectNotices(
      inputOf({
        window: offset,
        faultDip: [30, 40, 50],
        windows,
        flags: [
          { faultDip: 30, rangeFlag: 'partly_out' },
          { faultDip: 40, rangeFlag: 'in_range' },
          { faultDip: 50, rangeFlag: 'partly_out' },
        ],
      }),
      config,
    );
    assert.deepEqual(keys(plan.caveats), [SCARP_DIP, LOW_SLIP, PER_DIP, PER_DIP]);
    assert.deepEqual(plan.caveats[2].slots, { Dip: '30', Y: displayRound(windows[0].hi, 2) });
    assert.deepEqual(plan.caveats[3].slots, { Dip: '50', Y: displayRound(windows[2].hi, 2) });
    assert.equal(plan.caveats[2].slots.Y, '5.99');
    assert.equal(
      noticeText(plan.caveats[2]),
      '30°: converted slip ≈ 5.99 m — beyond the modeled range (approximately 0–5 m). Coverage for this dip is partial; matching simulations exist only up to the modeled maximum (≈5 m of slip).',
    );
  });

  test('no per-dip line without a partly_out flag, and none in slip mode', () => {
    const windows = windowsAt(ts * SLIP_SCALE);
    const inRange = selectNotices(
      inputOf({ window: offset, faultDip: [40], windows, flags: [{ faultDip: 40, rangeFlag: 'in_range' }] }),
      config,
    );
    assert.deepEqual(keys(inRange.caveats), [SCARP_DIP]);
    // `out_of_range` has no copy (§5.5): no line for it either.
    const outOfRange = selectNotices(
      inputOf({ window: offset, faultDip: [40], windows, flags: [{ faultDip: 40, rangeFlag: 'out_of_range' }] }),
      config,
    );
    assert.deepEqual(keys(outOfRange.caveats), [SCARP_DIP]);
    const slip = selectNotices(inputOf({ window: { mode: 'slip', min: at, max: '5' } }), config);
    assert.deepEqual(keys(slip.caveats), [SCARP_DIP]);
  });

  test('the caveats coexist with the empty state and with every tier', () => {
    const windows = windowsAt(0.010208562014765728);
    const flags = [{ faultDip: 30, rangeFlag: 'partly_out' as const }];
    const empty = selectNotices(
      inputOf({ valid: { scarp_height: 0, dzw: 0, scarp_dip: 0 }, matching: 0, diagnosed: ['window'], window: offset, faultDip: [30], windows, flags }),
      config,
    );
    assert.equal(empty.state, 'empty');
    assert.deepEqual(keys(empty.caveats), [SCARP_DIP, LOW_SLIP, PER_DIP]);
    const tiers = selectNotices(
      inputOf({
        valid: { scarp_height: 0, dzw: config.chartFloorBelow() - 1, scarp_dip: config.smallResultWarnBelow() - 1 },
        matching: 40,
        window: offset,
        faultDip: [30],
        windows,
        flags,
      }),
      config,
    );
    assert.deepEqual(keys(tiers.caveats), [SCARP_DIP, LOW_SLIP, PER_DIP]);
    assert.deepEqual(
      MEASUREMENT_NAMES.map((m) => tiers.panels[m]?.key),
      [NO_VALID, SUPPRESSION, WARNING],
    );
  });
});
