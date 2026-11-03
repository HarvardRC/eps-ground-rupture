// The scenario controls' applier (docs/app/ddd.md §5.7, Scenario
// controls): builds `#gre-controls` once from native elements only —
// fieldsets of checkboxes, radio groups, text inputs, buttons, and
// `<details>` disclosures — from the builder output of
// `views/scenario-controls.ts`, and implements the §5.7 event map once:
// the free-entry commit model (`commitField(id)`) with the R1 and R2
// rejection mechanics, the R3 entry-mode switch, the R4 dip-range assist
// and its Apply, the R5 checkbox groups, the population radios, the
// family toggle (display only), Reset, and `sync(scenario)`.
//
// Every listener takes the mount's `Wiring` (§5.1): its `signal`; each
// reducer call starts from `scheduler.current()` and hands its result to
// `scheduler.update(next)` (§5.3, Scheduling); a rejection line is
// announced once through `announce` on `wiring.status` (§5.11, Live
// announcements). The render pass (T-46) fills `#gre-assist-body` and
// `#gre-summary`; this module writes the echo and the two error lines.
//
// An applier (§5.1): it builds nodes only from builder output and
// registry text and commits them.
//
// A browser-only file (§5.1).

import { announce } from '../../a11y/announce';
import type { Manifest } from '../../decode/fields';
import { judgeOffset, judgeSlipWindow, readDecimal } from '../../state/parse';
import {
  defaultDisplayState,
  defaultScenario,
  reduce,
  type Action,
  type AppState,
  type Population,
  type Scenario,
  type ScenarioWindow,
  type SedimentPair,
} from '../../state/state';
import { swatchSvg } from '../charts';
import {
  controlModel,
  dipRangeEcho,
  type CheckOption,
  type ControlModel,
  type EntryMode,
  type TextSpan,
} from '../scenario-controls';
import { toSvgElement } from './svg';
import type { Wiring } from './wiring';

// --------------------------------------------------------------------
// Ids
// --------------------------------------------------------------------

/** The ids of the three free-entry fields of R1 and R2 (§5.7). */
export const SLIP_MIN_ID = 'gre-slip-min';
export const SLIP_MAX_ID = 'gre-slip-max';
export const OFFSET_MAX_ID = 'gre-offset-max';

/** A free-entry field that commits: a slip field (R1) or the offset field (R2). */
export type FieldId = typeof SLIP_MIN_ID | typeof SLIP_MAX_ID | typeof OFFSET_MAX_ID;

/** The ids §5.7 and the §5.8 region model fix. */
const SLIP_RANGE_ID = 'gre-slip-range';
const SLIP_HELP_ID = 'gre-slip-help';
const SLIP_ERROR_ID = 'gre-slip-error';
const OFFSET_ERROR_ID = 'gre-offset-error';
const DIP_ECHO_ID = 'gre-dip-echo';
const FAMILY_NOTE_ID = 'gre-family-note';

// --------------------------------------------------------------------
// The applier's interface
// --------------------------------------------------------------------

/** The controls' applier, as the mount and the render pass use it. */
export interface Controls {
  /** `#gre-controls`, holding every §5.7 control. */
  readonly element: HTMLElement;
  /**
   * Writes `checked`, `value`, `disabled`, and `hidden` on the controls
   * from the accepted `scenario` (and the scheduler's display state for
   * the family toggle) — after Reset, validated reload recovery, and a P2
   * link restore. Skips the `value` of `document.activeElement` and never
   * writes a `<details>` `open` (§5.7).
   */
  sync(scenario: Scenario): void;
  /**
   * Commits the slip or offset field `id` (§5.7 event map): a no-op when
   * the field's text equals the text it last committed; otherwise records
   * the text and judges it by R1 or R2. Returns the sequence number
   * `scheduler.update(next)` returned for its one reducer call, or null
   * when it made none (a rejection, or no accepted value changed).
   */
  commitField(id: FieldId): number | null;
}

// --------------------------------------------------------------------
// Element helpers
// --------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: readonly (readonly [string, string])[] = [],
  children: readonly (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [name, value] of attrs) element.setAttribute(name, value);
  element.append(...children);
  return element;
}

/** A fieldset with its legend. */
function fieldset(legend: string, attrs: readonly (readonly [string, string])[] = []): HTMLFieldSetElement {
  return el('fieldset', attrs, [el('legend', [], [legend])]);
}

/** A checkbox inside its `<label>`, after it the label text (and an optional swatch). */
function checkbox(label: string, before: readonly Node[] = []): { label: HTMLLabelElement; input: HTMLInputElement } {
  const input = el('input', [['type', 'checkbox']]);
  return { label: el('label', [], [input, ' ', ...before, label]), input };
}

/** A radio of group `name` inside its `<label>`. */
function radio(name: string, value: string, label: string): { label: HTMLLabelElement; input: HTMLInputElement } {
  const input = el('input', [
    ['type', 'radio'],
    ['name', name],
    ['value', value],
  ]);
  return { label: el('label', [], [input, ' ', label]), input };
}

/**
 * An R1 or R2 free-entry field with its `<label for>`:
 * `<input type="text" inputmode="decimal" autocomplete="off">`, no `min`,
 * `max`, or `step`.
 */
function decimalField(
  id: string,
  label: string,
  describedBy: string | null,
): { label: HTMLLabelElement; input: HTMLInputElement } {
  const attrs: [string, string][] = [
    ['type', 'text'],
    ['id', id],
    ['inputmode', 'decimal'],
    ['autocomplete', 'off'],
  ];
  if (describedBy !== null) attrs.push(['aria-describedby', describedBy]);
  const input = el('input', attrs);
  return { label: el('label', [['for', id]], [label]), input };
}

/** A registry text's spans, each `**…**` span as `<strong>` (§5.8, Copy registry). */
function spansToNodes(spans: readonly TextSpan[]): Node[] {
  return spans.map((s) => (s.strong ? el('strong', [], [s.text]) : document.createTextNode(s.text)));
}

/** Adds `id` to the end of `input`'s `aria-describedby` (§5.7, Rejection mechanics). */
function addDescribedBy(input: HTMLElement, id: string): void {
  const ids = (input.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((t) => t !== '');
  if (!ids.includes(id)) ids.push(id);
  input.setAttribute('aria-describedby', ids.join(' '));
}

/** Removes `id` from `input`'s `aria-describedby`, and the attribute when it empties. */
function removeDescribedBy(input: HTMLElement, id: string): void {
  const ids = (input.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((t) => t !== '' && t !== id);
  if (ids.length === 0) input.removeAttribute('aria-describedby');
  else input.setAttribute('aria-describedby', ids.join(' '));
}

/** Records the start of the interaction interval of §7.6 for an accepted Scenario change. */
function markAccepted(event: Event, seq: number | null): void {
  if (seq !== null) performance.mark('egr:change-accepted', { startTime: event.timeStamp, detail: { seq } });
}

// --------------------------------------------------------------------
// The applier
// --------------------------------------------------------------------

const samePair = (a: SedimentPair, b: SedimentPair): boolean =>
  a.set === b.set && a.sedimentStrength === b.sedimentStrength;

function sameWindow(a: ScenarioWindow, b: ScenarioWindow): boolean {
  if (a.mode === 'offset') return b.mode === 'offset' && a.offsetMax === b.offsetMax;
  return b.mode === 'slip' && a.min === b.min && a.max === b.max;
}

/**
 * Builds `#gre-controls` once (§5.7, §5.8 region model) for the mounted
 * vintage's `manifest` — the third argument of every reducer call — and
 * wires its listeners to the mount (`wiring`). The controls start at the
 * default Scenario; a validated reload recovery then calls `sync`.
 */
export function buildControls(manifest: Manifest, wiring: Wiring): Controls {
  const { signal, scheduler } = wiring;
  const on = <E extends Event>(target: EventTarget, type: string, listener: (event: E) => void): void => {
    target.addEventListener(type, listener as EventListener, { signal });
  };
  const initial: AppState = { scenario: defaultScenario(manifest), display: defaultDisplayState() };
  const model = controlModel(manifest, initial);
  const dips = manifest.trialColumns.fault_dip;

  /** One reducer call from `current()`, handed to `update(next)` when it changes the state (§5.7 event map). */
  const dispatch = (action: Action): number | null => {
    const current = scheduler.current();
    const next = reduce(current, action, manifest);
    return next === current ? null : scheduler.update(next);
  };

  const element = el('div', [['id', 'gre-controls']]);

  // ---- Fault dip (R5) and the dip-range assist (R4) ------------------
  const dipBoxes = new Map<number, HTMLInputElement>();
  const dipSet = fieldset(model.faultDip.legend, [['class', 'gre-dip']]);
  for (const option of model.faultDip.options) {
    const { label, input } = checkbox(option.label);
    dipBoxes.set(option.value, input);
    dipSet.append(label);
    on(input, 'change', (ev) =>
      markAccepted(ev, dispatch({ type: 'setFaultDip', dip: option.value, selected: input.checked })),
    );
  }
  const dipRange = el('input', [
    ['type', 'text'],
    ['id', 'gre-dip-range'],
    ['aria-describedby', DIP_ECHO_ID],
  ]);
  const apply = el('button', [['type', 'button'], ['id', 'gre-dip-apply']], [model.faultDip.applyLabel]);
  apply.disabled = true;
  const echo = el('p', [['id', DIP_ECHO_ID]]);
  dipSet.append(
    el('div', [['class', 'gre-dip-range']], [
      el('label', [['for', 'gre-dip-range']], [model.faultDip.rangeLabel]),
      ' ',
      dipRange,
      ' ',
      apply,
      echo,
    ]),
  );
  element.append(dipSet);

  /** Writes the echo and Apply's `disabled` from the field's text (R4). */
  const refreshEcho = (): void => {
    const result = dipRangeEcho(dipRange.value, dips);
    echo.textContent = result.text;
    apply.disabled = result.status !== 'included';
  };
  /** Apply (R4): one reducer call setting exactly the echoed dips; `checked` on the dip boxes alone. */
  const applyDips = (ev: Event): void => {
    const result = dipRangeEcho(dipRange.value, dips);
    if (result.status !== 'included') return;
    markAccepted(ev, dispatch({ type: 'applyFaultDips', dips: result.dips }));
    const applied = scheduler.current().scenario.faultDip;
    for (const [dip, box] of dipBoxes) box.checked = applied.includes(dip);
  };
  on(dipRange, 'input', refreshEcho);
  on<KeyboardEvent>(dipRange, 'keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.isComposing && !apply.disabled) applyDips(ev);
  });
  on(apply, 'click', applyDips);

  // ---- Sediment strength and structure (R5) --------------------------
  const pairBoxes: { readonly pair: SedimentPair; readonly input: HTMLInputElement }[] = [];
  const sedimentSet = fieldset(model.sediment.legend, [['class', 'gre-sediment']]);
  for (const arm of model.sediment.arms) {
    const armSet = fieldset(arm.legend, [['class', 'gre-arm']]);
    for (const option of arm.options) {
      const { label, input } = checkbox(option.label);
      pairBoxes.push({ pair: option.value, input });
      armSet.append(label);
      on(input, 'change', (ev) =>
        markAccepted(ev, dispatch({ type: 'setSediment', pair: option.value, selected: input.checked })),
      );
    }
    sedimentSet.append(armSet);
  }
  const advancedSet = el('fieldset');
  advancedSet.disabled = model.sediment.advancedDisabled;
  sedimentSet.append(
    el('p', [['class', 'gre-arm-help']], [model.sediment.helper]),
    el('details', [['class', 'gre-advanced']], [el('summary', [], [model.sediment.advancedSummary]), advancedSet]),
  );
  element.append(sedimentSet);

  // ---- Sediment depth and density (R5) -------------------------------
  const depthBoxes = new Map<number, HTMLInputElement>();
  const depthSet = fieldset(model.depth.legend, [['class', 'gre-depth']]);
  for (const option of model.depth.options) {
    const { label, input } = checkbox(option.label);
    depthBoxes.set(option.value, input);
    depthSet.append(label);
    on(input, 'change', (ev) =>
      markAccepted(ev, dispatch({ type: 'setDepth', depth: option.value, selected: input.checked })),
    );
  }
  const densityBoxes = new Map<string, HTMLInputElement>();
  const densitySet = fieldset(model.density.legend, [['class', 'gre-density']]);
  for (const option of model.density.options) {
    const { label, input } = checkbox(option.label);
    densityBoxes.set(option.value, input);
    densitySet.append(label);
    on(input, 'change', (ev) =>
      markAccepted(ev, dispatch({ type: 'setDensity', density: option.value, selected: input.checked })),
    );
  }
  element.append(depthSet, densitySet);

  // ---- Entry mode (R3), the slip fields (R1), the offset field (R2) --
  const modeRadios = new Map<EntryMode, HTMLInputElement>();
  const modeSet = fieldset(model.entryMode.legend, [['class', 'gre-entry-mode']]);
  for (const option of model.entryMode.options) {
    const { label, input } = radio('gre-entry-mode', option.value, option.label);
    modeRadios.set(option.value, input);
    modeSet.append(label);
  }

  const slipSet = fieldset(model.slip.legend, [['class', 'gre-slip']]);
  const slipDescribedBy = `${SLIP_RANGE_ID} ${SLIP_HELP_ID}`;
  const slipMin = decimalField(SLIP_MIN_ID, model.slip.minLabel, slipDescribedBy);
  const slipMax = decimalField(SLIP_MAX_ID, model.slip.maxLabel, slipDescribedBy);
  const slipError = el('p', [['id', SLIP_ERROR_ID]]);
  slipSet.append(
    el('p', [['id', SLIP_RANGE_ID]], [model.slip.range]),
    el('div', [['class', 'gre-field']], [slipMin.label, ' ', slipMin.input]),
    el('div', [['class', 'gre-field']], [slipMax.label, ' ', slipMax.input]),
    el('p', [['id', SLIP_HELP_ID]], [model.slip.help]),
    slipError,
  );

  const offsetSet = fieldset(model.offset.legend, [['class', 'gre-offset']]);
  const offsetMax = decimalField(OFFSET_MAX_ID, model.offset.label, null);
  const offsetError = el('p', [['id', OFFSET_ERROR_ID]]);
  offsetSet.append(
    el('div', [['class', 'gre-field']], [offsetMax.label, ' ', offsetMax.input]),
    offsetError,
    el('div', [['id', 'gre-assist-body']]),
  );
  element.append(modeSet, slipSet, offsetSet);

  // ---- Population, the explainer, the scarp-type filter (R5) ---------
  const populationRadios = new Map<Population, HTMLInputElement>();
  const populationSet = fieldset(model.population.legend, [['class', 'gre-population']]);
  for (const option of model.population.options) {
    const { label, input } = radio('gre-population', option.value, option.label);
    populationRadios.set(option.value, input);
    populationSet.append(label);
    on(input, 'change', (ev) => {
      if (input.checked) markAccepted(ev, dispatch({ type: 'setPopulation', population: option.value }));
    });
  }
  populationSet.append(
    el('details', [['class', 'gre-population-explainer']], [
      el('summary', [], [model.population.explainerSummary]),
      el('p', [], spansToNodes(model.population.explainer)),
    ]),
  );
  element.append(populationSet);

  const scarpBoxes = new Map<string, HTMLInputElement>();
  const scarpSet = fieldset(model.scarpClass.legend, [['class', 'gre-scarp-filter']]);
  for (const option of model.scarpClass.options) {
    const swatch = [toSvgElement(swatchSvg(option.color)), document.createTextNode(' ')];
    const { label, input } = checkbox(option.label, swatch);
    scarpBoxes.set(option.value, input);
    scarpSet.append(label);
    on(input, 'change', (ev) => {
      markAccepted(ev, dispatch({ type: 'setScarpClass', scarpClass: option.value, selected: input.checked }));
      writeFamily(controlModel(manifest, scheduler.current()));
    });
  }
  element.append(scarpSet);

  // ---- Family view (display state) and Reset -------------------------
  const family = checkbox(model.familyView.label);
  family.input.setAttribute('id', 'gre-family-view');
  family.input.setAttribute('aria-describedby', FAMILY_NOTE_ID);
  const familyNote = el('p', [['id', FAMILY_NOTE_ID]], [model.familyView.note]);
  on(family.input, 'change', () => {
    dispatch({ type: 'setFamilyView', familyView: family.input.checked });
  });
  const reset = el('button', [['type', 'button'], ['id', 'gre-reset']], [model.reset.label]);
  element.append(el('div', [['class', 'gre-family']], [family.label, familyNote]), reset);

  // ---- Writing the controls from a model -----------------------------
  function writeChecks<V>(boxes: ReadonlyMap<V, HTMLInputElement>, options: readonly CheckOption<V>[]): void {
    for (const option of options) {
      const box = boxes.get(option.value);
      if (box !== undefined) box.checked = option.checked;
    }
  }

  /** The family toggle's `checked` and `disabled`, and the note's `hidden` (§5.8, Family view). */
  function writeFamily(m: ControlModel): void {
    family.input.checked = m.familyView.checked;
    family.input.disabled = m.familyView.disabled;
    familyNote.hidden = m.familyView.noteHidden;
  }

  /** Shows the chosen mode's fieldset and sets `hidden` on the other's (R3). */
  function showMode(mode: EntryMode): void {
    slipSet.hidden = mode !== 'slip';
    offsetSet.hidden = mode !== 'offset';
  }

  /** Writes `value` on a text field unless it is `document.activeElement`. */
  function writeValue(input: HTMLInputElement, value: string): void {
    if (input !== document.activeElement) input.value = value;
  }

  function write(m: ControlModel, values: boolean): void {
    writeChecks(dipBoxes, m.faultDip.options);
    for (const { pair, input } of pairBoxes) {
      const option = m.sediment.arms.flatMap((a) => a.options).find((o) => samePair(o.value, pair));
      if (option !== undefined) input.checked = option.checked;
    }
    writeChecks(depthBoxes, m.depth.options);
    writeChecks(densityBoxes, m.density.options);
    writeChecks(scarpBoxes, m.scarpClass.options);
    for (const option of m.entryMode.options) {
      const input = modeRadios.get(option.value);
      if (input !== undefined) input.checked = option.checked;
    }
    for (const option of m.population.options) {
      const input = populationRadios.get(option.value);
      if (input !== undefined) input.checked = option.checked;
    }
    writeFamily(m);
    const mode = m.entryMode.options.find((o) => o.checked)?.value ?? 'slip';
    showMode(mode);
    if (values) {
      if (mode === 'slip') {
        writeValue(slipMin.input, m.slip.min);
        writeValue(slipMax.input, m.slip.max);
      } else {
        writeValue(offsetMax.input, m.offset.value);
      }
    }
  }

  write(model, false);

  // ---- The free entries: records, marks, and judgments (R1–R3) -------
  /** Each field's last-committed text; null is the record "none" (§5.7 event map). */
  const records = new Map<FieldId, string | null>([
    [SLIP_MIN_ID, null],
    [SLIP_MAX_ID, null],
    [OFFSET_MAX_ID, null],
  ]);
  const fields: { readonly [id in FieldId]: HTMLInputElement } = {
    [SLIP_MIN_ID]: slipMin.input,
    [SLIP_MAX_ID]: slipMax.input,
    [OFFSET_MAX_ID]: offsetMax.input,
  };

  /** Marks `inputs` rejected with `line` in `errorLine` and announces the line once (§5.7, Rejection mechanics). */
  function reject(inputs: readonly HTMLInputElement[], errorLine: HTMLElement, line: string): void {
    for (const input of inputs) {
      input.setAttribute('aria-invalid', 'true');
      addDescribedBy(input, errorLine.id);
    }
    errorLine.textContent = line;
    announce(wiring.status, line, () => !signal.aborted && errorLine.textContent === line);
  }

  /** Clears the marks: attribute and id removed from `inputs`, `errorLine` emptied. */
  function clearMarks(inputs: readonly HTMLInputElement[], errorLine: HTMLElement): void {
    for (const input of inputs) {
      input.removeAttribute('aria-invalid');
      removeDescribedBy(input, errorLine.id);
    }
    errorLine.textContent = '';
  }

  const clearSlipMarks = (): void => clearMarks([slipMin.input, slipMax.input], slipError);
  const clearOffsetMarks = (): void => clearMarks([offsetMax.input], offsetError);

  /** One reducer call setting the entry mode and the window together, unless the window is already the Scenario's. */
  const setWindow = (window: ScenarioWindow): number | null =>
    sameWindow(window, scheduler.current().scenario.window) ? null : dispatch({ type: 'setWindow', window });

  /**
   * R1 on the two slip texts: accepted — the slip marks cleared and the
   * window set; rejected — `rejected` marked. Returns `setWindow`'s result.
   */
  function judgeSlip(rejected: readonly HTMLInputElement[]): number | null {
    const judgment = judgeSlipWindow(slipMin.input.value, slipMax.input.value, manifest.slipWindowBounds);
    if (judgment.kind === 'rejected') {
      reject(rejected, slipError, model.slip.rejection);
      return null;
    }
    clearSlipMarks();
    return setWindow(judgment.window);
  }

  /** R2 on the offset text: accepted — the offset marks cleared and the window set; rejected — the field marked. */
  function judgeOffsetField(): number | null {
    const judgment = judgeOffset(offsetMax.input.value);
    if (judgment.kind === 'rejected') {
      reject([offsetMax.input], offsetError, model.offset.rejection);
      return null;
    }
    clearOffsetMarks();
    return setWindow(judgment.window);
  }

  function commitField(id: FieldId): number | null {
    const input = fields[id];
    const text = input.value;
    if (records.get(id) === text) return null;
    records.set(id, text);
    return id === OFFSET_MAX_ID ? judgeOffsetField() : judgeSlip([input]);
  }

  for (const id of [SLIP_MIN_ID, SLIP_MAX_ID, OFFSET_MAX_ID] as const) {
    on(fields[id], 'change', (ev) => markAccepted(ev, commitField(id)));
    on<KeyboardEvent>(fields[id], 'keydown', (ev) => {
      if (ev.key === 'Enter' && !ev.isComposing) markAccepted(ev, commitField(id));
    });
  }

  /**
   * R3: shows the chosen mode, clears the marks of the mode switched away
   * from, prefetches the regression export for offset mode, then judges
   * the chosen mode's retained texts directly — never through the
   * last-committed records — and sets those records to the texts judged.
   * A never-committed BLANK offset field is not judged and keeps its
   * record none; an R1 rejection marks every non-BLANK slip field.
   */
  function switchMode(mode: EntryMode): number | null {
    showMode(mode);
    if (mode === 'offset') {
      clearSlipMarks();
      scheduler.prefetchRegression();
      const text = offsetMax.input.value;
      if (records.get(OFFSET_MAX_ID) === null && readDecimal(text).kind === 'blank') return null;
      records.set(OFFSET_MAX_ID, text);
      return judgeOffsetField();
    }
    clearOffsetMarks();
    records.set(SLIP_MIN_ID, slipMin.input.value);
    records.set(SLIP_MAX_ID, slipMax.input.value);
    const nonBlank = [slipMin.input, slipMax.input].filter((f) => readDecimal(f.value).kind !== 'blank');
    return judgeSlip(nonBlank);
  }

  for (const [mode, input] of modeRadios) {
    on(input, 'change', (ev) => {
      if (input.checked) markAccepted(ev, switchMode(mode));
    });
  }

  // ---- Reset ----------------------------------------------------------
  function sync(scenario: Scenario): void {
    write(controlModel(manifest, { scenario, display: scheduler.current().display }), true);
  }

  on(reset, 'click', (ev) => {
    markAccepted(ev, dispatch({ type: 'reset' }));
    for (const input of [slipMin.input, slipMax.input, offsetMax.input, dipRange]) input.value = '';
    for (const id of records.keys()) records.set(id, null);
    clearSlipMarks();
    clearOffsetMarks();
    echo.textContent = '';
    apply.disabled = true;
    sync(scheduler.current().scenario);
  });

  return { element, sync, commitField };
}
