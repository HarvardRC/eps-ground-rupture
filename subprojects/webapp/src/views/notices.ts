// The result notices and caveats of docs/app/ddd.md §5.8 (Result notices —
// exactly one at a time; Caveats — independent, coexisting):
// `selectNotices(input, cfg)`, the pure selection of the `NoticePlan` over
// one `RenderInput`, and `noticeText(ref)`, a planned text filled exactly
// as it renders. The thresholds come from config.ts (§5.13; D-11, D-4) and
// every text from the copy registry (copy.json); the plan carries registry
// keys with their slot values, filled here and nowhere else.
// `views/dom/notices.ts` places the plan; provenance block 9 of §5.9 writes
// `caveats` as the plan returns them, never re-deriving them.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import type * as Config from '../config';
import { storedBounds, type ConditionGroup } from '../engine/query';
import { storedBoundsFromDecimal } from '../state/parse';
import { MEASUREMENT_NAMES, type MeasurementName } from '../state/state';
import { fillCopy, measurementLabel } from './chart-text';
import { copyText } from './copy';
import { displayRound, formatCount } from './format';
import type { RenderInput } from './render-input';

/** The configuration `selectNotices` reads: callers pass the `config.ts` module namespace. */
export type NoticeConfig = Pick<typeof Config, 'smallResultWarnBelow' | 'chartFloorBelow' | 'lowSlipThresholdStored'>;

/** A planned text: a registry key and its slot values, already formatted (§5.8, Slots fill as rendered). */
export interface NoticeRef {
  readonly key: string;
  readonly slots: { readonly [slot: string]: string };
}

/** The registry keys of the PDD §5.8 texts (§5.8 use-site map: five parts). */
export const NOTICE_KEYS = {
  /** First text: the small-result warning, in `.gre-notice` (N 10–29). */
  warning: 'pdd5.8.smallResultWarning',
  /** Second text: the suppression notice, standing in for the chart (N 1–9). */
  suppression: 'pdd5.8.suppressionNotice',
  /** Third text: the no-valid-measurement notice, standing in for the chart (N 0). */
  noValid: 'pdd5.8.noValidMeasurement',
  /** Fourth text, first part: the empty-state explainer, in `#gre-state`. */
  emptyExplainer: 'pdd5.8.emptyExplainer',
  /** Fourth text, second part: only with a non-empty diagnosed set. */
  emptyRelaxation: 'pdd5.8.emptyRelaxation',
} as const;

/** The registry keys of the caveats, in plan order (§5.8, Caveats). */
export const CAVEAT_KEYS = {
  /** The PDD §5.4 scarp-dip notice, first in every plan while D-5 stands. */
  scarpDip: 'pdd5.4.scarpDipNotice',
  /** The PDD §5.9 low-slip caveat (D-4). */
  lowSlip: 'pdd5.9.lowSlipCaveat',
  /** The PDD §5.6 per-dip out-of-range line, one per `partly_out` selected dip. */
  perDip: 'pdd5.6.perDipLine',
} as const;

/** The §5.8 fixed-here condition names, by the §3.6 `diagnosed_conditions` key. */
const CONDITION_NAME_KEYS: { readonly [g in ConditionGroup]: string } = {
  fault_dip: 'ddd5.8.conditionFaultDip',
  sediment: 'ddd5.8.conditionSediment',
  depth: 'ddd5.8.conditionDepth',
  density: 'ddd5.8.conditionDensity',
  window: 'ddd5.8.conditionWindow',
  scarp_class: 'ddd5.8.conditionScarpClass',
};

/** What one render presents beyond the panels' own content (§5.8, Result notices). */
export interface NoticePlan {
  /** The results-level state: `'empty'` at zero matching records, otherwise null. */
  readonly state: 'empty' | null;
  /**
   * The empty-state explainer's parts in order — the first always, the
   * second only when the diagnosed set is non-empty; empty unless `state`
   * is `'empty'`.
   */
  readonly explainer: readonly NoticeRef[];
  /** Per panel, its one result notice by the valid count N, or null (none at 30 and above, and in the empty state). */
  readonly panels: { readonly [m in MeasurementName]: NoticeRef | null };
  /**
   * The active caveats in order: the scarp-dip notice; the low-slip caveat
   * when its trigger holds; the per-dip line of each `partly_out` selected
   * dip, by ascending dip.
   */
  readonly caveats: readonly NoticeRef[];
}

/** A planned text filled exactly as it renders; none of these texts carries `**` markers. */
export function noticeText(ref: NoticeRef): string {
  return fillCopy(ref.key, ref.slots);
}

/**
 * `{measurement}` (§5.8): the panel's canonical label without its unit,
 * lower-cased — "scarp height", "deformation-zone width", "scarp dip".
 */
function measurementSlot(m: MeasurementName): string {
  const label = measurementLabel(m);
  const unit = / \([^()]*\)$/.exec(label);
  if (unit === null) {
    throw new Error(`notices: the label ${label} carries no unit`);
  }
  return label.slice(0, unit.index).toLowerCase();
}

/**
 * `{condition(s)}` (§5.8): the diagnosed groups' fixed-here names in the
 * given order (the §3.6 order, as the engine returns them), joined with
 * the registry joiner `, ` and a final ` and `.
 */
export function conditionList(groups: readonly ConditionGroup[]): string {
  const names = groups.map((g) => copyText(CONDITION_NAME_KEYS[g]));
  if (names.length <= 1) return names.join('');
  return names.slice(0, -1).join(copyText('ddd5.8.conditionJoiner')) + copyText('ddd5.8.conditionFinalJoiner') + names[names.length - 1];
}

/** One panel's result notice by its valid count N (§5.8; PDD §4.5, D-11). */
function panelNotice(input: RenderInput, m: MeasurementName, cfg: NoticeConfig): NoticeRef | null {
  const n = input.selection.perMeasurement[m].valid;
  if (n === 0) {
    return {
      key: NOTICE_KEYS.noValid,
      slots: { X: formatCount(input.selection.matchingRecords), measurement: measurementSlot(m) },
    };
  }
  if (n < cfg.chartFloorBelow()) return { key: NOTICE_KEYS.suppression, slots: {} };
  if (n < cfg.smallResultWarnBelow()) return { key: NOTICE_KEYS.warning, slots: { N: formatCount(n) } };
  return null;
}

/**
 * The converted window of the selected dip `dip` (§5.8, `windows`); throws
 * when `windows` holds none — the result's `convertWindows` covers every
 * modeled dip.
 */
function dipWindow(input: RenderInput, dip: number): { readonly lo: number; readonly hi: number } {
  const entry = input.windows?.find((w) => w.faultDip === dip);
  if (entry === undefined) {
    throw new Error(`notices: no converted window for the selected fault dip ${dip}`);
  }
  return entry;
}

/**
 * The low-slip trigger (§5.8, Caveats; D-4): the stored lower bound `lo_s`
 * of the direct window (`storedBoundsFromDecimal`), or of any selected
 * dip's converted window in `windows` (`storedBounds`), below `t_s`,
 * `lowSlipThresholdStored()`. The inactive window never fires it.
 */
function lowSlipFires(input: RenderInput, cfg: NoticeConfig): boolean {
  const threshold = cfg.lowSlipThresholdStored();
  const window = input.scenario.window;
  if (window.mode === 'slip') {
    if (window.min === null || window.max === null) return false;
    return storedBoundsFromDecimal(window.min, window.max)[0] < threshold;
  }
  const scale = input.vintage.manifest.columns.slip.scale;
  if (scale === null) {
    throw new Error('notices: the manifest gives columns.slip no scale');
  }
  return input.scenario.faultDip.some((dip) => {
    const { lo, hi } = dipWindow(input, dip);
    return storedBounds(lo, hi, scale)[0] < threshold;
  });
}

/**
 * The per-dip out-of-range lines (§5.8, Partial coverage): one per
 * selected dip whose `flags` entry is `partly_out`, by ascending dip;
 * `{Dip}` the dip in degrees, `{Y}` that dip's `window_hi(d)` — the `hi`
 * of its `windows` entry — by `displayRound(v, 2)`, as §5.5 writes the
 * window line's `{hi}`.
 */
function perDipLines(input: RenderInput): NoticeRef[] {
  if (input.flags === null) return [];
  return input.flags
    .filter((f) => f.rangeFlag === 'partly_out')
    .map((f) => f.faultDip)
    .sort((a, b) => a - b)
    .map((dip) => ({
      key: CAVEAT_KEYS.perDip,
      slots: { Dip: String(dip), Y: displayRound(dipWindow(input, dip).hi, 2) },
    }));
}

/**
 * The `NoticePlan` of one `RenderInput` (§5.8, Result notices): zero
 * matching records give the results-level `'empty'` with its explainer;
 * otherwise each panel gets, by valid N, the no-valid-measurement notice
 * (0), the suppression notice (below `chartFloorBelow()`), the warning
 * (below `smallResultWarnBelow()`), or none. The caveats are independent
 * of both and coexist with any of them.
 */
export function selectNotices(input: RenderInput, cfg: NoticeConfig): NoticePlan {
  const empty = input.selection.matchingRecords === 0;

  const explainer: NoticeRef[] = [];
  if (empty) {
    explainer.push({ key: NOTICE_KEYS.emptyExplainer, slots: {} });
    const diagnosed = input.selection.diagnosedConditions ?? [];
    if (diagnosed.length > 0) {
      explainer.push({ key: NOTICE_KEYS.emptyRelaxation, slots: { 'condition(s)': conditionList(diagnosed) } });
    }
  }

  const panels = {} as { [m in MeasurementName]: NoticeRef | null };
  for (const m of MEASUREMENT_NAMES) {
    panels[m] = empty ? null : panelNotice(input, m, cfg);
  }

  // The scarp-dip notice stands in every plan while D-5 (Scarp-dip
  // correction status at release) stands; the decision closing D-5 removes it here.
  const caveats: NoticeRef[] = [{ key: CAVEAT_KEYS.scarpDip, slots: {} }];
  if (lowSlipFires(input, cfg)) caveats.push({ key: CAVEAT_KEYS.lowSlip, slots: {} });
  caveats.push(...perDipLines(input));

  return { state: empty ? 'empty' : null, explainer, panels, caveats };
}
