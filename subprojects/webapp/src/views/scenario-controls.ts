// The scenario controls' builder (docs/app/ddd.md §5.7, Scenario
// controls): `controlModel(manifest, state)` — every option list, bound,
// and default read from the decoded §3.2 manifest fields in manifest
// order, never hardcoded, with the labels from the copy registry (§5.8)
// and the disabled flags — and `dipRangeEcho(entry, dips)`, the R4
// dip-range assist's status, included dips, and echo text. The applier
// `views/dom/controls.ts` builds the elements from this model.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import type { Manifest } from '../decode/fields';
import { dipsInRange, readDipRange, recordedSlipMax } from '../state/parse';
import {
  defaultScenario,
  selectsEveryScarpClass,
  type AppState,
  type Population,
  type SedimentPair,
} from '../state/state';
import { fillCopy } from './chart-text';
import { copyText } from './copy';
import { displayRound } from './format';

// --------------------------------------------------------------------
// The model
// --------------------------------------------------------------------

/** One checkbox of a multi-select group (§5.7 inventory). */
export interface CheckOption<V> {
  /** The value the checkbox toggles, as the manifest holds it. */
  readonly value: V;
  /** The option label (§5.7: dips as `{d}°`, depths as `{d} m`, the rest verbatim or display-mapped). */
  readonly label: string;
  /** Whether `state`'s Scenario selects it. */
  readonly checked: boolean;
  /** Whether the default Scenario (`defaultScenario(manifest)`) selects it. */
  readonly defaultChecked: boolean;
}

/** A scarp-type option: the class name and its `scarp_class_palette` color (§3.2). */
export interface ScarpClassOption extends CheckOption<string> {
  readonly color: string;
}

/** One radio of a radio pair. */
export interface RadioOption<V> {
  readonly value: V;
  readonly label: string;
  readonly checked: boolean;
  readonly defaultChecked: boolean;
}

/** A span of a registry text: plain, or a `**…**` span the page renders as `<strong>` (§5.8, Copy registry). */
export interface TextSpan {
  readonly text: string;
  readonly strong: boolean;
}

/** One sediment arm's fieldset (§5.7, Two-arm sediment selection). */
export interface SedimentArm {
  /** The `arm_strength_states` `set` value of the arm. */
  readonly set: string;
  /** The arm name, "Uniform" or "Layered" (PDD §3.2). */
  readonly legend: string;
  /** The arm's pairs in `arm_strength_states` order. */
  readonly options: readonly CheckOption<SedimentPair>[];
}

/** The entry modes of the R3 radio pair. */
export type EntryMode = 'slip' | 'offset';

/** Everything `views/dom/controls.ts` renders into `#gre-controls` (§5.7). */
export interface ControlModel {
  readonly faultDip: {
    readonly legend: string;
    readonly options: readonly CheckOption<number>[];
    /** The R4 dip-range assist: the field label and the Apply label. */
    readonly rangeLabel: string;
    readonly applyLabel: string;
  };
  readonly sediment: {
    readonly legend: string;
    /** The uniform arm first, then the layered arm. */
    readonly arms: readonly SedimentArm[];
    /** The arm-ambiguity helper text. */
    readonly helper: string;
    /** The collapsed "Advanced" group: its summary, and its `disabled` fieldset (always true). */
    readonly advancedSummary: string;
    readonly advancedDisabled: true;
  };
  readonly depth: { readonly legend: string; readonly options: readonly CheckOption<number>[] };
  readonly density: { readonly legend: string; readonly options: readonly CheckOption<string>[] };
  readonly entryMode: {
    /** "Enter displacement as". */
    readonly legend: string;
    readonly options: readonly RadioOption<EntryMode>[];
  };
  readonly slip: {
    /** "Fault slip at depth (m)". */
    readonly legend: string;
    /** The PDD §3.4 descriptive label, `#gre-slip-range`. */
    readonly range: string;
    readonly minLabel: string;
    readonly maxLabel: string;
    /** The helper line `#gre-slip-help`, generated from the manifest. */
    readonly help: string;
    /** The minimum and maximum of the Scenario's slip window; empty while it is inactive or in offset mode. */
    readonly min: string;
    readonly max: string;
    /** The R1 rejection line of `#gre-slip-error`. */
    readonly rejection: string;
  };
  readonly offset: {
    /** "Anticipated vertical surface offset (m)". */
    readonly legend: string;
    /** "Maximum (m)", the slip maximum's label entry. */
    readonly label: string;
    /** The Scenario's offset maximum; empty in slip mode. */
    readonly value: string;
    /** The PDD §5.6 rejected-entry line of `#gre-offset-error`. */
    readonly rejection: string;
  };
  readonly population: {
    /** "Population". */
    readonly legend: string;
    readonly options: readonly RadioOption<Population>[];
    /** The explainer `<details>`: its `<summary>` and its PDD §5.3 text as spans. */
    readonly explainerSummary: string;
    readonly explainer: readonly TextSpan[];
  };
  readonly scarpClass: { readonly legend: string; readonly options: readonly ScarpClassOption[] };
  readonly familyView: {
    readonly label: string;
    readonly checked: boolean;
    /** Enabled only while every scarp type is selected (§5.8, Family view). */
    readonly disabled: boolean;
    /** `#gre-family-note`, shown while the toggle is disabled. */
    readonly note: string;
    readonly noteHidden: boolean;
  };
  readonly reset: { readonly label: string };
}

// --------------------------------------------------------------------
// Labels
// --------------------------------------------------------------------

/** The `arm_strength_states` `set` of the uniform arm and of the layered arm (§3.2, §5.7). */
export const UNIFORM_SET = 'Homogeneous';
export const LAYERED_SET = 'Heterogeneous';

/**
 * The registry's display-label map (§5.7, Two-arm sediment selection),
 * keyed by the data string: the registry key of the PDD §3.2 spelling.
 * A label without an entry displays as its data string.
 */
const DISPLAY_LABEL_KEYS: ReadonlyMap<string, string> = new Map([
  ['Alternating Strong-Weak', 'pdd3.2.alternatingStrongWeak'],
]);

/** A sediment label as displayed: the PDD spelling where the display-label map has one, else the data string. */
export function sedimentLabel(dataLabel: string): string {
  const key = DISPLAY_LABEL_KEYS.get(dataLabel);
  return key === undefined ? dataLabel : copyText(key);
}

/** A fault-dip option label, `{d}°` (§5.7). */
export function dipLabel(d: number): string {
  return fillCopy('ddd5.7.dipOption', { d: String(d) });
}

/** A depth option label, `{d} m` (§5.7). */
function depthLabel(d: number): string {
  return fillCopy('ddd5.7.depthOption', { d: String(d) });
}

/** A registry text split at its `**` markers into plain and strong spans (§5.8, Copy registry). */
export function emphasisSpans(text: string): readonly TextSpan[] {
  return text
    .split('**')
    .map((part, i) => ({ text: part, strong: i % 2 === 1 }))
    .filter((span) => span.text !== '');
}

// --------------------------------------------------------------------
// controlModel
// --------------------------------------------------------------------

const samePair = (a: SedimentPair, b: SedimentPair): boolean =>
  a.set === b.set && a.sedimentStrength === b.sedimentStrength;

function checkOptions<V>(
  dictionary: readonly V[],
  selected: readonly V[],
  defaults: readonly V[],
  label: (v: V) => string,
  same: (a: V, b: V) => boolean = (a, b) => a === b,
): CheckOption<V>[] {
  return dictionary.map((value) => ({
    value,
    label: label(value),
    checked: selected.some((s) => same(s, value)),
    defaultChecked: defaults.some((s) => same(s, value)),
  }));
}

/**
 * The control model (§5.7): every option list, bound, and default from
 * `manifest`, in manifest order — the sediment pairs in
 * `arm_strength_states` order, split into the uniform arm (`set`
 * `Homogeneous`) and then the layered arm (`Heterogeneous`) — with each
 * option's `checked` from `state` and `defaultChecked` from
 * `defaultScenario(manifest)`; the labels from the copy registry; and the
 * disabled flags: the family toggle enabled only while every scarp type
 * is selected, the Advanced group always disabled.
 */
export function controlModel(manifest: Manifest, state: AppState): ControlModel {
  const { scenario, display } = state;
  const defaults = defaultScenario(manifest);
  const columns = manifest.trialColumns;
  const bounds = manifest.slipWindowBounds;
  const window = scenario.window;
  const pairOption = (p: SedimentPair): string => sedimentLabel(p.sedimentStrength);
  const pairs = manifest.armStrengthStates.map((p) => ({ set: p.set, sedimentStrength: p.sedimentStrength }));
  const arm = (set: string, legendKey: string): SedimentArm => ({
    set,
    legend: copyText(legendKey),
    options: checkOptions(
      pairs.filter((p) => p.set === set),
      scenario.sediment,
      defaults.sediment,
      pairOption,
      samePair,
    ),
  });
  const radio = <V>(value: V, label: string, current: V, initial: V): RadioOption<V> => ({
    value,
    label,
    checked: value === current,
    defaultChecked: value === initial,
  });
  const familyEnabled = selectsEveryScarpClass(scenario, manifest);
  return {
    faultDip: {
      legend: copyText('pdd5.11.faultDipLabel'),
      options: checkOptions(columns.fault_dip, scenario.faultDip, defaults.faultDip, dipLabel),
      rangeLabel: copyText('ddd5.7.dipRangeLabel'),
      applyLabel: copyText('ddd5.7.dipRangeApply'),
    },
    sediment: {
      legend: copyText('pdd5.11.strengthLabel'),
      arms: [arm(UNIFORM_SET, 'pdd3.2.armUniform'), arm(LAYERED_SET, 'pdd3.2.armLayered')],
      helper: copyText('ddd5.7.armHelper'),
      advancedSummary: copyText('pdd3.2.advanced'),
      advancedDisabled: true,
    },
    depth: {
      legend: copyText('pdd5.11.depthLabel'),
      options: checkOptions(columns.depth, scenario.depth, defaults.depth, depthLabel),
    },
    density: {
      legend: copyText('pdd5.11.densityLabel'),
      options: checkOptions(columns.density, scenario.density, defaults.density, (d) => d),
    },
    entryMode: {
      legend: copyText('ddd5.7.entryModeLegend'),
      options: [
        radio<EntryMode>('slip', copyText('pdd5.11.slipLabel'), window.mode, defaults.window.mode),
        radio<EntryMode>('offset', copyText('pdd5.11.offsetLabel'), window.mode, defaults.window.mode),
      ],
    },
    slip: {
      legend: copyText('pdd5.11.slipLabel'),
      range: copyText('pdd3.4.descriptiveLabel'),
      minLabel: copyText('ddd5.7.slipMinLabel'),
      maxLabel: copyText('ddd5.7.slipMaxLabel'),
      help: fillCopy('ddd5.7.slipHelp', {
        min: String(bounds.min),
        max: String(bounds.max),
        step: displayRound(manifest.stageSpacing.mean, 2),
      }),
      min: window.mode === 'slip' && window.min !== null ? window.min : '',
      max: window.mode === 'slip' && window.max !== null ? window.max : '',
      rejection: fillCopy('ddd5.7.slipRejection', { max: recordedSlipMax(bounds) }),
    },
    offset: {
      legend: copyText('pdd5.11.offsetLabel'),
      label: copyText('ddd5.7.slipMaxLabel'),
      value: window.mode === 'offset' ? window.offsetMax : '',
      rejection: copyText('pdd5.6.rejectedEntryLine'),
    },
    population: {
      legend: copyText('pdd3.7.populationLegend'),
      options: [
        radio<Population>(
          'all_stages',
          copyText('pdd3.7.populationAllStages'),
          scenario.population,
          defaults.population,
        ),
        radio<Population>(
          'one_state_per_trial',
          copyText('pdd3.7.populationOneState'),
          scenario.population,
          defaults.population,
        ),
      ],
      explainerSummary: copyText('ddd5.7.populationExplainerSummary'),
      explainer: emphasisSpans(copyText('pdd5.3.populationExplainer')),
    },
    scarpClass: {
      legend: copyText('pdd3.7.scarpFilterLabel'),
      options: checkOptions(manifest.scarpClasses, scenario.scarpClass, defaults.scarpClass, (c) => c).map(
        (option) => ({ ...option, color: manifest.scarpClassPalette[option.value] }),
      ),
    },
    familyView: {
      label: copyText('pdd3.7.familyToggleLabel'),
      checked: familyEnabled && display.familyView,
      disabled: !familyEnabled,
      note: copyText('pdd3.7.familyNote'),
      noteHidden: familyEnabled,
    },
    reset: { label: copyText('pdd3.7.resetLabel') },
  };
}

// --------------------------------------------------------------------
// dipRangeEcho (R4)
// --------------------------------------------------------------------

/** The R4 statuses: BLANK, unreadable, readable with no modeled dip included, or some dips included. */
export type DipRangeStatus = 'blank' | 'unreadable' | 'none' | 'included';

/** What the dip-range field's `input` event writes (§5.7, R4). */
export interface DipRangeEcho {
  readonly status: DipRangeStatus;
  /** The included modeled dips, ascending; empty unless `status` is `'included'`. */
  readonly dips: readonly number[];
  /** The echo `#gre-dip-echo` shows; empty for BLANK. */
  readonly text: string;
}

/** The included dips as the echo lists them: `{d}°` each, `, ` between, ` and ` before the last. */
function dipList(dips: readonly number[]): string {
  const items = dips.map(dipLabel);
  if (items.length === 1) return items[0];
  const head = items.slice(0, -1).join(copyText('ddd5.7.dipEchoSeparator'));
  return head + copyText('ddd5.7.dipEchoLastSeparator') + items[items.length - 1];
}

/**
 * R4 (§5.7): reads `entry` by the dip-range grammar of `state/parse.ts`
 * and returns the modeled dips of `dips` it includes — compared exactly as
 * decimals, ascending — with the status and the echo text: `{list} only`,
 * "No modeled fault dip in this range.", "Enter one fault dip or a range
 * such as 30–40.", or empty for BLANK.
 */
export function dipRangeEcho(entry: string, dips: readonly number[]): DipRangeEcho {
  const reading = readDipRange(entry);
  if (reading.kind === 'blank') return { status: 'blank', dips: [], text: '' };
  if (reading.kind === 'unreadable') {
    return { status: 'unreadable', dips: [], text: copyText('ddd5.7.dipEchoUnreadable') };
  }
  const included = dipsInRange(reading, dips);
  if (included.length === 0) return { status: 'none', dips: [], text: copyText('ddd5.7.dipEchoNone') };
  return {
    status: 'included',
    dips: included,
    text: fillCopy('ddd5.7.dipEchoIncluded', { list: dipList(included) }),
  };
}
