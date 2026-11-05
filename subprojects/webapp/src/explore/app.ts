// The guided page owns its interaction state. Scientific selection,
// statistics, chart geometry, and downloads remain shared with /scenario/.
import * as config from '../config';
import { convertWindows, rangeFlag } from '../convert/convert';
import type { Vintage } from '../decode/decode';
import type { Regression } from '../decode/fields';
import { storedBounds } from '../engine/query';
import { buildPackage, type VersionStamps } from '../download/package';
import { readDecimal, compareDecimals } from '../state/parse';
import { defaultDisplayState, type MeasurementName, type SedimentPair } from '../state/state';
import { quantileLinear } from '../stats/quantile';
import { binTableSpec, quantityText } from '../views/chart-text';
import { histogramLogSpec, histogramSpec, histogramSvg, ecdfSpec, ecdfSvg } from '../views/charts';
import { copyText } from '../views/copy';
import { toSvgElement } from '../views/dom/svg';
import { displayRound, formatCount } from '../views/format';
import { CAVEAT_KEYS, selectNotices, noticeText } from '../views/notices';
import type { RenderInput } from '../views/render-input';
import { statsRows, unclassifiedLine } from '../views/stats-table';
import { computeResult } from './compute';
import { DEFINITIONS, type DefinitionKey } from './glossary';
import { classifySession, clearSession, loadSession, saveSession, type DisplayChoices, type SessionRecord } from './session';
import { STORIES, type StoryLink } from './stories';
import { cloneDraft, draftChanged, freshDraft, holdsSample, offsetShortcut, isSampleId, sampleDraft, sedimentGroup, stepDecimal, validateDraft, type Draft, type Issue, type SampleId, type Step } from './state';

export interface ExplorerOptions {
  vintage: Vintage;
  stamps: VersionStamps;
  loadRegression(): Promise<Regression>;
  signal: AbortSignal;
  /** The tab's session storage, or null when it is unavailable (guided DDD §9.2). */
  storage: Storage | null;
}

const KEPT_IN_TAB = 'Your work stays in this tab, including across a reload. Closing the tab or opening a new one starts a fresh scenario.';

const escape = (value: unknown): string => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
const STEPS: readonly Step[] = ['intro', 'site', 'movement', 'review', 'results'];
const STEP_NAMES: Record<Step, string> = { intro: 'Understand', site: 'Site conditions', movement: 'Fault movement', review: 'Review', results: 'Results' };
const MEASUREMENTS: readonly MeasurementName[] = ['scarp_height', 'dzw', 'scarp_dip'];
const MEASURE_NAMES: Record<MeasurementName, string> = { scarp_height: 'Scarp height', dzw: 'Deformation-zone width', scarp_dip: 'Scarp dip' };
const DESCRIPTIONS: Record<MeasurementName, string> = {
  scarp_height: 'The total height of the scarp above the undeformed ground on the footwall, the lower side of the fault.',
  dzw: 'The width of the main disturbed zone around the rupture.',
  scarp_dip: 'The steepness of the scarp face, measured from horizontal.',
};
const GLOSSARY: Record<MeasurementName, string> = { scarp_height: 'scarp-height', dzw: 'dzw', scarp_dip: 'scarp-dip' };
const SHAPES = [
  ['A smooth ramp or flexure.', 'M4 9H35C51 9 54 29 70 29H106'],
  ['A ramp with a slumped face.', 'M4 9H33Q43 9 48 18L54 20L64 29H106'],
  ['A raised ridge.', 'M4 28H27L44 9L57 6L74 28H106'],
  ['A ridge with a collapsed face.', 'M4 28H27L44 9L57 8L65 19L80 28H106'],
  ['A direct, steep offset.', 'M4 9H48L55 29H106'],
  ['A step with a crumbled face.', 'M4 9H43L52 17L64 29H106'],
] as const;
const link = (href: string, label: string): string => `<a href="${escape(href)}" target="_blank" rel="noopener">${escape(label)}<span class="gx-sr-only"> (opens in a new tab)</span></a>`;
const glossary = (anchor: string, label = 'Read the glossary'): string => link(`../glossary/#${anchor}`, label);
const help = (title: string, text: string, anchor: string): string => `<details class="gx-help"><summary>${escape(title)}</summary><p>${escape(text)} ${glossary(anchor)}</p></details>`;
const term = (key: DefinitionKey, label: string): string => `<button type="button" class="gx-term" data-explain="${key}" data-glossary-source="${DEFINITIONS[key].source}" aria-label="${escape(label)}: explanation">${escape(label)}</button>`;
const button = (action: string, label: string, primary = false, extra = ''): string => `<button type="button" class="gx-button${primary ? ' gx-primary' : ''}" data-action="${action}" ${extra}>${label}</button>`;
/**
 * The prefilled samples (PDD D-43, D-44; guided DDD §§10.3, 10.5): each
 * card's title and descriptor, named by inputs (the offset only), the name
 * the question and the prefill notice use before "sample", and the note
 * framing the slip window in the preview.
 */
const SAMPLES: readonly { id: SampleId; title: string; descriptor: string; name: string; slipNote: string }[] = [
  { id: 'illustrative', title: 'Lower fault angles', descriptor: '30° and 40°; surface offset up to 3 m', name: 'lower fault angles', slipNote: 'The slip range is an example band within the simulations’ coverage.' },
  { id: 'kern', title: 'Steeper fault angles', descriptor: '60° and 70°; surface offset up to 1.3 m', name: 'steeper fault angles', slipNote: 'The slip range spans Bawden (2001)’s two patch estimates, 1.6 m and 1.9 m, used as an example band.' },
];
const sampleInfo = (id: SampleId) => SAMPLES.find(sample => sample.id === id)!;
/** The prefill notice: as filled, then after the first edit (§10.5). */
const sampleNotice = (id: SampleId, modified: boolean): string => modified
  ? `Started from the ${sampleInfo(id).name} sample · Modified`
  : `Prefilled with the ${sampleInfo(id).name} sample. You can change any value.`;
/** The note on switching movement modes while a sample is active (§10.5). */
const MODE_NOTE = 'The two modes are separate assumptions. Each selects a different set of simulations, so results can differ.';
const populationName = (population: string): string => population === 'one_state_per_trial' ? 'Last stage within the slip range' : 'All stages within the slip range';
const sedimentName = (pair: SedimentPair): string => `${sedimentGroup(pair.set).replace(' sediment', '')}: ${pair.sedimentStrength}`;

export function mountExplorer(root: HTMLElement, options: ExplorerOptions): void {
  const { vintage, stamps, signal } = options;
  const manifest = vintage.manifest;
  let draft = freshDraft(manifest);
  let confirmed: Draft | null = null;
  let result: RenderInput | null = null;
  let step: Step = 'intro';
  let issues: Issue[] = [];
  let generalError = '';
  let reached = new Set<Step>(['intro']);
  let display = defaultDisplayState();
  let refineOpen = false;
  let guideIndex: 0 | 1 | 2 | 3 | 4 | null = null;
  let exampleOpen = false;
  // Sample presentation state (guided DDD §§9.1, 10.3), never part of Draft.
  // `sampleChoice` is the open sample dialog: its selected card and its step
  // (the card preview, then the replacement question). `sampleFill` is the
  // fill behind the prefill notice, `modified` from the first draft edit
  // until replacement or a new scenario; `sampleModeNote` shows the
  // mode-switch note once the reader switches modes during it.
  // `sampleWalk` keeps Site conditions sequential after a fill until a
  // later step is reached.
  let sampleChoice: { selected: SampleId; stage: 'preview' | 'confirm' } | null = null;
  // `confirmedFill` is the fill standing when the current confirmation was
  // made, so discarding back to it keeps the notice of the fill it started
  // from; `serial` tells one fill from another of the same sample.
  type SampleFill = { id: SampleId; values: Draft; modified: boolean; serial: number };
  let sampleFill: SampleFill | null = null;
  let confirmedFill: SampleFill | null = null;
  let fillSerial = 0;
  let sampleModeNote = false;
  let sampleWalk = false;
  // The story disclosure's open state across re-renders of Site conditions (§10.2); every fill starts closed.
  let storyOpen = false;
  // Same-tab continuity (guided DDD §9.2). `continuity` turns off for the
  // mount when storage is unavailable or a save fails; `blocked` holds an
  // unrestorable record until the explicit fresh start; `restoreTarget` is
  // a restored confirmation awaiting recomputation.
  let continuity = options.storage !== null;
  let blocked: 'unreadable' | 'data-changed' | null = null;
  let restoredNotice = false;
  let restoreTarget: Draft | null = null;
  let restoreError = '';
  // The one-time width log-scale off-adjustment status (guided DDD §9.3).
  let logOffNotice = false;
  let regression: Regression | null = null;
  let regressionPromise: Promise<boolean> | null = null;
  let regressionError = '';
  let busy = false;
  // True while a restore owns `busy` (§9.2, step 3); `invalidate` releases it at once (G-16).
  let restoring = false;
  let navigationVersion = 0;
  let sequence = 0;
  let chartObserver: ResizeObserver | null = null;
  let lastChartWidth = 0;
  const downloadUrls = new Set<string>();
  const shell = document.createElement('div'); shell.className = 'gx-shell';
  const status = document.createElement('p'); status.className = 'gx-sr-only'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const alert = document.createElement('p'); alert.className = 'gx-sr-only'; alert.setAttribute('role', 'alert');
  const floatingHelp = document.createElement('div'); floatingHelp.id = 'gx-definition'; floatingHelp.className = 'gx-tooltip'; floatingHelp.hidden = true; floatingHelp.setAttribute('role', 'tooltip');
  root.replaceChildren(shell, status, alert, floatingHelp);
  let helpTrigger: HTMLButtonElement | null = null;
  let helpPinned = false;
  let helpHovered = false;
  let helpTimer: number | null = null;
  let helpFocusTrigger: HTMLButtonElement | null = null;
  let helpFocusFrame: number | null = null;
  let helpFocusVersion = 0;
  const alive = () => !signal.aborted && root.isConnected;
  const $ = <T extends HTMLElement = HTMLElement>(selector: string): T | null => shell.querySelector<T>(selector);
  const issue = (field: string): string => issues.find(item => item.field === field)?.message ?? '';
  const dirty = () => draftChanged(draft, confirmed);
  const heading = (name: string, intro: string) => `<p class="gx-step">Step ${STEPS.indexOf(step) + 1} of 5 · ${STEP_NAMES[step]}</p><h2 id="gx-heading" tabindex="-1">${name}</h2><p class="gx-intro">${intro}</p>`;
  const issueHtml = (field: string): string => `<p id="gx-error-${field}" class="gx-field-error" ${issue(field) ? '' : 'hidden'}>${escape(issue(field))}</p>`;

  function cancelHelpTimer(): void {
    if (helpTimer !== null) window.clearTimeout(helpTimer);
    helpTimer = null;
  }

  function hideHelp(): void {
    cancelHelpTimer();
    if (helpTrigger) {
      const ids = (helpTrigger.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(id => id && id !== floatingHelp.id);
      if (ids.length) helpTrigger.setAttribute('aria-describedby', ids.join(' '));
      else helpTrigger.removeAttribute('aria-describedby');
    }
    helpTrigger = null; helpPinned = false; helpHovered = false;
    floatingHelp.hidden = true;
  }

  function closeHelp(): void {
    helpFocusVersion += 1;
    if (helpFocusFrame !== null) window.cancelAnimationFrame(helpFocusFrame);
    helpFocusFrame = null; helpFocusTrigger = null;
    hideHelp();
  }

  function queueFocusedHelp(): void {
    if (helpFocusFrame !== null) window.cancelAnimationFrame(helpFocusFrame);
    const version = helpFocusVersion;
    // Focus may scroll its term into view after focusin. Wait for two
    // quiet frames; another focus-generated scroll restarts this wait.
    helpFocusFrame = window.requestAnimationFrame(() => {
      helpFocusFrame = window.requestAnimationFrame(() => {
        helpFocusFrame = null;
        const trigger = helpFocusTrigger;
        if (version !== helpFocusVersion || !trigger || !alive() || !shell.contains(trigger) || document.activeElement !== trigger) return;
        helpFocusTrigger = null;
        showHelp(trigger);
      });
    });
  }

  function helpScrolled(): void {
    if (helpFocusTrigger && document.activeElement === helpFocusTrigger) {
      hideHelp(); queueFocusedHelp();
    } else closeHelp();
  }

  function cancelPendingFocusedHelp(): void {
    if (helpFocusTrigger) closeHelp();
  }

  function showHelp(trigger: HTMLButtonElement, pin = false): void {
    const key = trigger.dataset.explain as DefinitionKey;
    if (!(key in DEFINITIONS)) return;
    closeHelp();
    helpTrigger = trigger; helpPinned = pin;
    floatingHelp.textContent = DEFINITIONS[key].text;
    const described = (trigger.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    trigger.setAttribute('aria-describedby', [...described, floatingHelp.id].join(' '));
    const viewport = window.visualViewport;
    const width = viewport?.width ?? document.documentElement.clientWidth;
    const height = viewport?.height ?? window.innerHeight;
    const offsetLeft = viewport?.offsetLeft ?? 0, offsetTop = viewport?.offsetTop ?? 0;
    const margin = 12, gap = 9;
    floatingHelp.style.maxWidth = `${Math.max(1, width - margin * 2)}px`;
    floatingHelp.style.maxHeight = `${Math.max(1, height - margin * 2)}px`;
    floatingHelp.style.visibility = 'hidden'; floatingHelp.hidden = false;
    const rect = trigger.getBoundingClientRect(), box = floatingHelp.getBoundingClientRect();
    const left = Math.max(offsetLeft + margin, Math.min(rect.left + rect.width / 2 - box.width / 2, offsetLeft + width - margin - box.width));
    const below = rect.bottom + gap;
    const preferredTop = below + box.height <= offsetTop + height - margin ? below : rect.top - gap - box.height;
    const top = Math.max(offsetTop + margin, Math.min(preferredTop, offsetTop + height - margin - box.height));
    floatingHelp.style.left = `${left}px`; floatingHelp.style.top = `${top}px`; floatingHelp.style.visibility = '';
  }

  function scheduleHelpClose(): void {
    cancelHelpTimer();
    if (helpPinned) return;
    helpTimer = window.setTimeout(() => {
      helpTimer = null;
      if (!helpPinned && !helpHovered && document.activeElement !== helpTrigger) closeHelp();
    }, 150);
  }

  function support(): string {
    return `<aside class="gx-support"><p>Supporting pages open in a separate tab. ${continuity ? KEPT_IN_TAB : 'Your draft stays here while this page remains open; reloading starts a new draft.'}</p><nav aria-label="Supporting information">${link('../paper/', 'Research paper')} · ${link('../data/', 'Data and citation')} · ${link('../glossary/', 'Glossary')} · ${link('../scenario/', 'Existing explorer')}</nav><p>Software ${escape(stamps.softwareVersion)} · Data ${escape(stamps.dataVersion)}</p></aside>`;
  }

  function navigation(): string {
    return `<nav class="gx-steps" aria-label="Scenario steps">${STEPS.map((s, i) => `<button type="button" data-action="step" data-step="${s}" ${s === step ? 'aria-current="step"' : ''} ${!reached.has(s) || (s === 'results' && !result) ? 'disabled' : ''}><span>${i + 1}</span>${STEP_NAMES[s]}</button>`).join('')}</nav>`;
  }

  function introView(): string {
    return `${heading('Use simulations to understand ground rupture.', 'Describe the site conditions and fault movement you want to investigate, then see the simulated results.')}<p class="gx-research">This is a research tool; it does not predict what will happen at a particular site.</p><div class="gx-intro-grid"><div><h3>Describe your assumptions</h3><p>Choose the modeled site conditions and fault movement you want to investigate.</p></div><div><h3>Review your scenario</h3><p>Check your choices and see whether the simulations cover your movement range.</p></div><div><h3>Understand the results</h3><p>Explore scarp height, deformation-zone width, and scarp dip, then download the matching records.</p></div></div><p>Results come from an existing set of research simulations. This page does not run a new simulation.</p><p class="gx-session-note">${continuity ? KEPT_IN_TAB : 'Your choices are kept while this page remains open. Reloading or leaving and returning starts a new draft.'}</p>${introActions()}`;
  }

  /** The introduction's actions — Build your scenario and Try a prefilled sample (§10.5) — or the unrestorable-record choice (§9.2). */
  function introActions(): string {
    if (blocked) return `<div class="gx-footer gx-warning gx-restore-blocked"><p>${blocked === 'data-changed' ? 'The data release changed since this tab last used it.' : 'The work saved in this tab could not be read.'} Your earlier choices have not been restored.</p><div>${button('new', 'Start a new scenario', true, 'id="gx-restore-new"')}</div></div>`;
    return `<footer class="gx-footer gx-intro-actions"><div>${button('start', 'Build your scenario', true)}${button('sample-open', 'Try a prefilled sample', false, 'id="gx-sample-trigger" aria-haspopup="dialog" aria-describedby="gx-sample-hint"')}</div><p id="gx-sample-hint" class="gx-hint">Sample values, not recommended site values.</p></footer>${sampleChoice ? `<dialog class="gx-sample-dialog" id="gx-sample-dialog" aria-labelledby="${sampleChoice.stage === 'preview' ? 'gx-sample-title' : 'gx-sample-question'}">${sampleDialogBody()}</dialog>` : ''}`;
  }

  /**
   * The sample dialog's content (§10.5), never a browser dialog: two cards
   * forming one radio group and the selected card's preview, which changes
   * nothing in the draft; or the replacement question as its next step.
   */
  function sampleDialogBody(): string {
    if (!sampleChoice) return '';
    const chosen = sampleInfo(sampleChoice.selected);
    if (sampleChoice.stage === 'confirm') {
      return `<h2 id="gx-sample-question">Replace your current choices with the ${escape(chosen.name)} sample?</h2><div class="gx-dialog-actions">${button('sample-use', 'Use the sample', true, `id="gx-sample-use" data-sample="${chosen.id}"`)}${button('sample-keep', 'Keep my choices', false, 'id="gx-sample-keep" autofocus')}</div>`;
    }
    const cards = SAMPLES.map(sample => {
      const checked = sample.id === chosen.id;
      return `<div class="gx-sample-card" role="radio" id="gx-sample-${sample.id}" data-sample-card="${sample.id}" aria-checked="${checked}" tabindex="${checked ? 0 : -1}" aria-labelledby="gx-sample-${sample.id}-title" aria-describedby="gx-sample-${sample.id}-descriptor" aria-controls="gx-sample-preview"${checked ? ' autofocus' : ''}><strong id="gx-sample-${sample.id}-title">${escape(sample.title)}</strong><span id="gx-sample-${sample.id}-descriptor">${escape(sample.descriptor)}</span></div>`;
    }).join('');
    let preview: string;
    try {
      const values = sampleDraft(manifest, chosen.id);
      preview = `${selectionSummary(values)}<dl class="gx-summary"><div><dt>Vertical surface offset</dt><dd>0–${escape(values.offsetMax)} m</dd></div><div><dt>Fault slip at depth, if you switch modes</dt><dd>${escape(values.slipMin)}–${escape(values.slipMax)} m</dd></div></dl><p class="gx-hint">${escape(chosen.slipNote)}</p>`;
    } catch (error) {
      preview = `<p class="gx-warning">${escape(error instanceof Error ? error.message : String(error))}</p>`;
    }
    return `<h2 id="gx-sample-title">Try a prefilled sample</h2><div class="gx-sample-cards" role="radiogroup" aria-label="Samples">${cards}</div><section class="gx-sample-preview" id="gx-sample-preview" aria-labelledby="gx-sample-preview-title"><h3 id="gx-sample-preview-title">${escape(chosen.title)}</h3>${preview}</section><div class="gx-dialog-actions">${button('sample-apply', 'Use this sample', true, 'id="gx-sample-apply"')}${button('sample-close', 'Cancel', false, 'id="gx-sample-cancel"')}</div>`;
  }

  /** Redraw the open dialog's content in place (a card selection, the next step) and focus `focusId`. */
  function refreshSampleDialog(focusId: string): void {
    const dialog = $<HTMLDialogElement>('#gx-sample-dialog');
    if (!dialog || !sampleChoice) return;
    dialog.setAttribute('aria-labelledby', sampleChoice.stage === 'preview' ? 'gx-sample-title' : 'gx-sample-question');
    dialog.innerHTML = sampleDialogBody();
    $(`#${focusId}`)?.focus();
  }

  function selectSampleCard(id: SampleId): void {
    if (!sampleChoice || sampleChoice.stage !== 'preview') return;
    sampleChoice = { ...sampleChoice, selected: id };
    refreshSampleDialog(`gx-sample-${id}`);
  }

  /** Use this sample: fill silently over an untouched fresh draft with nothing confirmed or awaiting restoration; otherwise ask first. */
  function applySample(): void {
    if (!sampleChoice) return;
    if (confirmed === null && restoreTarget === null && !draftChanged(draft, freshDraft(manifest))) useSample(sampleChoice.selected);
    else { sampleChoice = { ...sampleChoice, stage: 'confirm' }; refreshSampleDialog('gx-sample-keep'); }
  }

  /** Cancel, Keep my choices, Escape, or any other close of the dialog: nothing changes. */
  function closeSampleDialog(): void {
    if (!sampleChoice) return;
    sampleChoice = null; render('gx-sample-trigger');
  }

  /** Fill the whole draft with the named sample and open Site conditions; the confirmation, results, and walkthrough are untouched. */
  function useSample(id: SampleId): void {
    draft = sampleDraft(manifest, id);
    fillSerial += 1;
    sampleFill = { id, values: cloneDraft(draft), modified: false, serial: fillSerial }; sampleModeNote = false; sampleWalk = true;
    issues = []; sampleChoice = null; storyOpen = false;
    setStep('site');
    status.textContent = sampleNotice(id, false);
  }

  /** The prefill notice on both input steps (§§10.3, 10.5); the §10.2 story stays on Site conditions. */
  function sampleNoticeView(): string {
    if (!sampleFill) return '';
    return `<div class="gx-sample-active"><p class="gx-sample-status">${escape(sampleNotice(sampleFill.id, sampleFill.modified))}</p>${step === 'site' ? storyView(sampleFill.id) : ''}</div>`;
  }

  /** The first draft edit turns the notice to its Modified form; callers that do not re-render update it in place. */
  function checkSampleFill(): void {
    if (!sampleFill || sampleFill.modified || holdsSample(draft, sampleFill.values)) return;
    sampleFill = { ...sampleFill, modified: true };
    // Once Modified, always Modified (§10.5): the confirmed scenario's fill, while it is
    // still the working fill, carries the change, so a later Discard never shows it as Prefilled.
    if (confirmedFill?.serial === sampleFill.serial) confirmedFill = { ...confirmedFill, modified: true };
    const line = $('.gx-sample-status');
    if (line) line.textContent = sampleNotice(sampleFill.id, true);
  }

  /** The closed "About this sample" disclosure under the sample status line (guided DDD §10.2). */
  function storyView(id: SampleId): string {
    const story = STORIES[id];
    const sourceLink = (item: StoryLink): string => link(item.href, item.label);
    const figures = story.images.map(image => `<figure class="gx-story-figure"><img src="${escape(image.src)}" width="${image.width}" height="${image.height}" alt="${escape(image.alt)}" loading="lazy" decoding="async"><figcaption>${escape(image.caption)} <span class="gx-credit">${escape(image.credit.text)}${image.credit.license ? ` ${sourceLink(image.credit.license)}.` : ''} ${sourceLink(image.credit.source)}</span></figcaption></figure>`).join('');
    return `<details class="gx-sample-story" id="gx-sample-story"${storyOpen ? ' open' : ''}><summary>About this sample</summary>${story.paragraphs.map(text => `<p>${escape(text)}</p>`).join('')}${figures}<p class="gx-story-sources">Sources: ${story.sources.map(sourceLink).join('; ')}.</p></details>`;
  }

  function siteGroup(field: 'faultDip' | 'depth' | 'density' | 'sediment', title: string, hint: string, anchor: string): string {
    const choices: { value: string; label: string; group?: string; selected: boolean }[] = field === 'sediment'
      ? manifest.armStrengthStates.map((pair, i) => ({ value: String(i), label: pair.sedimentStrength, group: sedimentGroup(pair.set), selected: draft.sediment.some(p => p.set === pair.set && p.sedimentStrength === pair.sedimentStrength) }))
      : (field === 'faultDip' ? manifest.trialColumns.fault_dip : field === 'depth' ? manifest.trialColumns.depth : manifest.trialColumns.density).map((value, i) => ({ value: String(i), label: `${value}${field === 'faultDip' ? '°' : field === 'depth' ? ' m' : ''}`, selected: (draft[field] as readonly (string | number)[]).includes(value) }));
    const selectedCount = choices.filter(c => c.selected).length;
    let lastGroup = '';
    const content = choices.map(choice => {
      let prefix = '';
      if (choice.group && choice.group !== lastGroup) { lastGroup = choice.group; prefix = `<h4 class="gx-choice-subheading">${escape(lastGroup)}</h4>`; }
      return `${prefix}<label class="gx-choice ${choice.selected ? 'gx-selected' : ''}"><input type="checkbox" id="gx-${field}-${choice.value}" data-choice="${field}" value="${choice.value}" ${choice.group ? `aria-label="${escape(choice.group)}: ${escape(choice.label)}"` : ''} ${choice.selected ? 'checked' : ''} aria-describedby="gx-error-${field}" ${issue(field) ? 'aria-invalid="true"' : ''}><span>${escape(choice.label)}</span></label>`;
    }).join('');
    return `<fieldset class="gx-site-group" id="gx-group-${field}"><legend>${term(field, title)} <span class="gx-required">Required</span></legend><p>${hint}</p>${help(`About ${title.toLowerCase()}`, hint, anchor)}<label class="gx-select-all"><input type="checkbox" id="gx-${field}-all" data-all="${field}" aria-describedby="gx-error-${field}" ${issue(field) ? 'aria-invalid="true"' : ''} ${selectedCount === choices.length ? 'checked' : ''} data-mixed="${selectedCount > 0 && selectedCount < choices.length}"> Select all</label><div class="gx-choices">${content}</div>${issueHtml(field)}${selectedCount === 0 && !issue(field) ? '<p class="gx-hint">Choose one or more values to continue.</p>' : ''}</fieldset>`;
  }

  function siteView(): string {
    return `${heading('Describe the site conditions', 'Choose one or more values for each condition.')}${sampleNoticeView()}<div class="gx-site-grid">${siteGroup('faultDip', 'Fault angle', 'How steeply the fault is tilted, measured from horizontal.', 'fault-dip')}${siteGroup('depth', 'Sediment depth', 'The thickness of the sediment layer above the fault.', 'sediment-depth')}${siteGroup('density', 'Sediment density', 'How tightly the sediment is packed.', 'sediment-strength')}${siteGroup('sediment', 'Sediment strength and structure', 'Choose uniform material or a layered profile. You can include more than one possibility.', 'set')}</div><footer class="gx-footer">${button('intro', 'Back')}${reached.has('review') && !sampleWalk ? button('review', 'Return to review', true) : `<div>${reached.has('review') ? button('review', 'Return to review') : ''}${button('site-next', 'Continue to fault movement', true)}</div>`}</footer>`;
  }

  function numeric(field: 'slipMin' | 'slipMax' | 'offsetMax', label: string, required: boolean): string {
    return `<div class="gx-numeric"><label for="gx-${field}">${label} (m)${required ? ' <span class="gx-required">Required</span>' : ''}</label><div class="gx-stepper">${button('minus', '−', false, `data-field="${field}" aria-label="Decrease ${label.toLowerCase()} by 0.1 m"`)}<input type="text" inputmode="decimal" autocomplete="off" id="gx-${field}" data-number="${field}" value="${escape(draft[field])}" aria-describedby="gx-error-${field} gx-feedback-${field}" ${issue(field) ? 'aria-invalid="true"' : ''} required>${button('plus', '+', false, `data-field="${field}" aria-label="Increase ${label.toLowerCase()} by 0.1 m"`)}</div>${issueHtml(field)}<p class="gx-field-error" id="gx-feedback-${field}" hidden></p></div>`;
  }

  function regressionStatus(): string {
    if (regression) return '';
    if (regressionPromise) return '<p class="gx-hint" role="status">Loading the offset conversion…</p>';
    return `<div class="gx-warning"><p>${escape(regressionError || 'The offset conversion is not loaded yet.')}</p>${button('retry-regression', 'Retry offset conversion')}</div>`;
  }

  function movementView(): string {
    const shortcut = regression ? offsetShortcut(draft.faultDip, regression, manifest.slipWindowBounds.max) : null;
    return `${heading('Choose the assumed fault movement', 'Choose what you want to specify, then enter the range you want to investigate.')}${sampleNoticeView()}<fieldset class="gx-modes"><legend>What are you specifying?</legend><label><input type="radio" id="gx-mode-slip" name="gx-mode" value="slip" ${draft.mode === 'slip' ? 'checked' : ''}><span><strong>Fault slip at depth</strong><span>The distance the fault moves underground.</span></span></label><label><input type="radio" id="gx-mode-offset" name="gx-mode" value="offset" ${draft.mode === 'offset' ? 'checked' : ''}><span><strong>Vertical surface offset</strong><span>The vertical difference across the rupture at the ground surface.</span></span></label></fieldset><p class="gx-hint">Your entries are kept when you switch modes.</p>${sampleFill && sampleModeNote ? `<p class="gx-sample-mode-note" id="gx-sample-mode-note">${escape(MODE_NOTE)}</p>` : ''}${draft.mode === 'slip' ? `<section class="gx-movement"><h3>${term('slip', 'Fault-slip range')}</h3><p>Modeled fault slip: ${escape(manifest.slipWindowBounds.min)}–${escape(manifest.slipWindowBounds.max)} m. Stages are recorded about every ${displayRound(manifest.stageSpacing.mean, 2)} m of slip.</p>${help('What is fault slip?', 'Slip is how far the two blocks move past each other along the fault.', 'slip')}<div class="gx-number-row">${numeric('slipMin', 'Minimum', false)}${numeric('slipMax', 'Maximum', true)}</div>${button('slip-shortcut', 'Set maximum to 5 m')}</section>` : `<section class="gx-movement"><h3>${term('offset', 'Surface-offset range')}</h3><p>The range starts at 0 m and ends at the maximum you enter.</p>${help('How is surface offset related to fault slip?', 'Surface offset is a vertical difference at the ground surface. The app estimates a corresponding fault-slip range for each selected fault angle; raised surface ridges can make that estimate too large.', 'vertical-separation')}${numeric('offsetMax', 'Maximum', true)}${regression ? (shortcut !== null ? button('offset-shortcut', `Set maximum to ${escape(shortcut)} m`) : '') : regressionStatus()}<div id="gx-offset-feedback"></div></section>`}<p class="gx-hint gx-spaced">Type a value or use − / + to change it by 0.1 m. The maximum buttons use the modeled coverage; they are not recommendations for your site.</p><p>${link('../dashboards/slip-regression/', 'See the slip-regression dashboard')} for the broader simulation relationship.</p><footer class="gx-footer">${button('site', 'Back')}${button('review', reached.has('review') ? 'Return to review' : 'Review scenario', true)}</footer>`;
  }

  function selectionSummary(value: Draft): string {
    return `<dl class="gx-summary"><div><dt>Fault angle</dt><dd>${value.faultDip.map(v => `${v}°`).join('; ')}</dd></div><div><dt>Sediment depth</dt><dd>${value.depth.map(v => `${v} m`).join('; ')}</dd></div><div><dt>Sediment density</dt><dd>${value.density.map(escape).join('; ')}</dd></div><div><dt>Sediment strength and structure</dt><dd>${value.sediment.map(p => escape(sedimentName(p))).join('; ')}</dd></div></dl>`;
  }
  function movementSummary(value: Draft): string {
    return value.mode === 'slip' ? `${escape(value.slipMin)}–${escape(value.slipMax)} m fault slip` : `0–${escape(value.offsetMax)} m surface offset`;
  }
  function typesSummary(value: Draft): string {
    return value.scarpClass.length === manifest.scarpClasses.length ? 'All scarp types (no filter)' : value.scarpClass.map(escape).join('; ');
  }

  function coverage(value: Draft): string {
    if (value.mode !== 'offset' || !regression) return '';
    const number = readDecimal(value.offsetMax);
    if (number.kind !== 'decimal') return '';
    const windows = convertWindows(Number(number.value), value.faultDip, regression.coefficients);
    const rows = windows.map(w => {
      const flag = rangeFlag(w, manifest.slipWindowBounds);
      return `<tr><th scope="row">${w.faultDip}°</th><td>≈ ${displayRound(w.lo, 2)}–${displayRound(w.hi, 2)} m</td><td>${flag === 'in_range' ? 'Within range' : flag === 'partly_out' ? 'Partly covered' : 'Outside modeled range'}</td></tr>`;
    }).join('');
    const warnings = windows.filter(w => rangeFlag(w, manifest.slipWindowBounds) !== 'in_range').map(w => {
      const [lo, hi] = storedBounds(w.lo, w.hi, manifest.slipWindowBounds.recordingStep);
      const max = Math.round(manifest.slipWindowBounds.max / manifest.slipWindowBounds.recordingStep);
      const coefficient = regression!.coefficients.find(c => c.faultDip === w.faultDip)!;
      const cap = coefficient.slope * manifest.slipWindowBounds.max + coefficient.intercept;
      if (hi < 0) return `<p>At ${w.faultDip}°, the estimated slip range lies entirely below 0 m, outside the modeled range. There are no matching stages for this angle.</p>`;
      if (lo > max) return `<p>At ${w.faultDip}°, the estimated slip range lies entirely above the modeled maximum. There are no matching stages for this angle.</p>`;
      const lower = lo < 0 ? `Part of the estimated slip range lies below 0 m, outside the modeled range. ` : '';
      const upper = hi > max ? `The simulations cover offsets up to approximately ${displayRound(Math.max(0, cap), 2)} m; your ${escape(value.offsetMax)} m maximum exceeds that coverage.` : '';
      return `<p>At ${w.faultDip}°: ${lower}${upper}</p>`;
    }).join('');
    return `<h4>Corresponding fault slip at depth</h4><table class="gx-conversions"><thead><tr><th>Fault angle</th><th>Slip range</th><th>Coverage</th></tr></thead><tbody>${rows}</tbody></table><p class="gx-hint">Modeled slip: ${escape(manifest.slipWindowBounds.min)}–${escape(manifest.slipWindowBounds.max)} m. Conversion is approximate. Raised surface ridges can cause it to overestimate fault slip. ${glossary('back-projection', 'How offset is converted to slip')}</p>${warnings ? `<div class="gx-warning"><strong>The simulations do not cover the full requested range</strong>${warnings}<p>Results describe only the part covered by the simulations.</p></div>` : ''}`;
  }

  function reviewView(): string {
    return `${heading('Review your scenario', 'Check your assumptions before showing results.')}<section class="gx-review-section"><div class="gx-section-head"><h3>Site conditions</h3>${button('site', 'Edit site conditions')}</div>${selectionSummary(draft)}</section><section class="gx-review-section"><div class="gx-section-head"><h3>Fault movement</h3>${button('movement', 'Edit fault movement')}</div><dl class="gx-summary"><div><dt>Specified as</dt><dd>${draft.mode === 'offset' ? 'Vertical surface offset' : 'Fault slip at depth'}</dd></div><div><dt>Your assumed range</dt><dd>${movementSummary(draft)}</dd></div></dl>${coverage(draft)}</section><section class="gx-review-section"><div class="gx-section-head"><h3>What the results will include</h3>${result ? button('edit-refinements', 'Edit refinements') : ''}</div><p><strong>${populationName(draft.population)}</strong></p><p>${draft.population === 'one_state_per_trial' ? 'For each matching simulation, use its last recorded stage within the slip range. It may fall below the upper end of the range. Then apply the resulting-scarp-type filter; an earlier stage is not substituted.' : 'Include every recorded stage within the slip range from simulations matching these site conditions. Each simulation may contribute more than one stage.'}</p><p class="gx-spaced"><strong>Resulting scarp types:</strong> ${typesSummary(draft)}</p><p class="gx-hint">A stage is a saved point as fault movement increases.</p></section><footer class="gx-footer">${result ? button('back-results', 'Back to results') : button('movement', 'Back')}${button('confirm', busy ? 'Calculating…' : 'Show results', true, busy ? 'disabled' : '')}</footer>`;
  }

  function populationEditor(): string {
    const last = draft.population === 'one_state_per_trial';
    return `<fieldset><legend>Which ${term('stages', 'simulation stages')} should contribute?</legend><p>A simulation records the ground's shape as fault slip increases. Each saved point is a <strong>stage</strong>, with its own measurements.</p><label class="gx-population"><input type="radio" id="gx-population-all_stages" name="gx-population" value="all_stages" ${!last ? 'checked' : ''}><span><strong>All stages within the slip range</strong><span>Explore results throughout the range. Use every recorded stage within it; one simulation may contribute several measurements.</span></span></label><label class="gx-population"><input type="radio" id="gx-population-one_state_per_trial" name="gx-population" value="one_state_per_trial" ${last ? 'checked' : ''}><span><strong>Last stage within the slip range</strong><span>Compare simulations at their greatest recorded slip within the range. Use at most one stage per simulation, which may fall below the upper end.</span></span></label><p class="gx-hint">This choice can change the record count, chart shape, median, and percentiles.</p><details id="gx-stage-example" ${exampleOpen ? 'open' : ''}><summary>See how stages change the results</summary><p><strong>Example: one simulation, three stages.</strong> Invented values for a fault-slip range of 0–3 m, with all scarp types included.</p><table><thead><tr><th>Fault slip</th><th>Scarp height</th><th>Used by stage choice</th></tr></thead><tbody>${[['0.5', '0.2'], ['1.5', '0.7'], ['2.5', '1.1']].map(([slip, height], i) => `<tr><td>${slip} m</td><td>${height} m</td><td>${!last || i === 2 ? 'Included' : 'Omitted'}</td></tr>`).join('')}</tbody></table><p>${last ? 'This simulation contributes only the 1.1 m height at 2.5 m slip. No stage was recorded at 3 m; no value is invented there. With one height, the median is 1.1 m.' : 'This simulation contributes three heights: 0.2, 0.7, and 1.1 m. Their median is 0.7 m.'}</p><p>This example follows only your stage choice and keeps all scarp types included. The results wait for confirmation.</p><p>All stages gives more influence to simulations with more included measurements. Last stage uses at most one measurement per simulation. Neither choice guarantees larger or smaller results.</p></details>${help('What is a simulation stage?', 'One experiment is a simulation run. A model stage is one saved point as fault slip increases within that run.', 'model-stage')}</fieldset>`;
  }

  function scarpEditor(): string {
    return `<fieldset id="gx-group-scarpClass"><legend>Which resulting ${term('scarpTypes', 'scarp types')}?</legend><p>Choose one or more types. These are simulated outcomes, not site inputs.</p>${issueHtml('scarpClass')}<label class="gx-select-all"><input type="checkbox" id="gx-scarpClass-all" data-all="scarpClass" aria-describedby="gx-error-scarpClass" ${issue('scarpClass') ? 'aria-invalid="true"' : ''} ${draft.scarpClass.length === manifest.scarpClasses.length ? 'checked' : ''} data-mixed="${draft.scarpClass.length > 0 && draft.scarpClass.length < manifest.scarpClasses.length}"> Select all</label><div class="gx-types">${manifest.scarpClasses.map((name, i) => `<label class="gx-type"><input type="checkbox" id="gx-scarpClass-${i}" data-choice="scarpClass" value="${i}" ${draft.scarpClass.includes(name) ? 'checked' : ''} aria-describedby="gx-error-scarpClass" ${issue('scarpClass') ? 'aria-invalid="true"' : ''}><span class="gx-type-name"><i style="background:${escape(manifest.scarpClassPalette[name])}" aria-hidden="true"></i>${escape(name)}</span><svg viewBox="0 0 110 38" aria-hidden="true"><path d="${SHAPES[i]?.[1] ?? SHAPES[0][1]}" fill="none" stroke="currentColor" stroke-width="2"/></svg><span class="gx-hint">${SHAPES[i]?.[0] ?? ''}</span></label>`).join('')}</div><p class="gx-hint">Profiles are schematic. ${glossary('scarp-classes', 'About scarp classes')}</p></fieldset>`;
  }

  function refinementsView(): string {
    return `<section class="gx-refinements" id="gx-refinements"><div class="gx-section-head"><h3>Refine results</h3><span class="gx-hint">Draft choices</span></div><p>Review your changes before they affect the results.</p><div class="gx-refinement-grid">${populationEditor()}${scarpEditor()}</div><footer class="gx-footer"><p class="gx-hint">The charts keep the confirmed settings until you choose Show results.</p>${button('review', 'Review changes', true)}</footer></section>`;
  }

  function refinementDisclosure(): string {
    return `<div class="gx-refine-toggle"><button type="button" id="gx-refine-button" class="gx-refine-disclosure" data-action="refine" aria-expanded="${refineOpen}" aria-controls="gx-refinements"><span class="gx-refine-label"><strong>Refine results</strong><span>Simulation stages · Scarp types</span></span><span class="gx-refine-action">${refineOpen ? 'Hide options' : 'Show options'} <span aria-hidden="true">${refineOpen ? '⌃' : '⌄'}</span></span></button><p class="gx-hint">Review changes before applying them.</p></div>${refineOpen ? refinementsView() : '<section id="gx-refinements" hidden></section>'}`;
  }

  const guideLabels = ['Scarp height', 'Deformation-zone width', 'Scarp dip', 'Simulation stages', 'Scarp types'] as const;
  const guideProgress = ['Height', 'Width', 'Dip', 'Stages', 'Types'] as const;
  const guidePrompts: readonly string[] = ['How high is the scarp?', 'How wide is the disturbed ground?', 'How steep is the scarp face?'];

  function guideHeader(): string {
    if (guideIndex === null) return '';
    const nextLabel = guideIndex < 4 ? `Next: ${guideLabels[guideIndex + 1]}` : dirty() ? 'Review changes' : 'Finish walkthrough';
    return `<section class="gx-guide-header" aria-label="Results walkthrough"><div class="gx-section-head"><div><p class="gx-step">Step ${guideIndex + 1} of 5</p><h3 id="gx-guide-heading" tabindex="-1">${guideLabels[guideIndex]}</h3></div>${button('guide-exit', 'Browse freely')}</div>${guideIndex < 3 ? `<p class="gx-guide-prompt">${guidePrompts[guideIndex]}</p>` : ''}<ol class="gx-guide-progress" aria-label="Walkthrough progress">${guideProgress.map((label, i) => `<li ${i === guideIndex ? 'aria-current="step"' : ''}><span aria-hidden="true">${i + 1}</span>${label}</li>`).join('')}</ol><div class="gx-guide-nav">${button('guide-back', 'Back', false, guideIndex === 0 ? 'disabled' : '')}${button('guide-next', nextLabel, true)}</div></section>`;
  }

  function guideEditor(): string {
    return `<section class="gx-guide-editor"><p class="gx-guide-draft"><strong>Draft choices.</strong> Review changes before applying them. Results keep the confirmed settings until you choose Show results.</p>${guideIndex === 3 ? populationEditor() : scarpEditor()}</section>`;
  }

  function moveGuide(index: 0 | 1 | 2 | 3 | 4): void {
    invalidate();
    guideIndex = index;
    if (index < 3) display = { ...display, measurement: MEASUREMENTS[index] };
    render('gx-guide-heading', true);
  }

  function leaveGuide(): void {
    invalidate();
    const previous = guideIndex;
    guideIndex = null;
    if (previous !== null && previous >= 3) refineOpen = true;
    const target = previous === 3 ? `gx-population-${draft.population}` : previous === 4 ? 'gx-scarpClass-all' : `gx-measurement-${display.measurement}`;
    render(target, true);
  }

  function resultsView(): string {
    if (!result || !confirmed) return '';
    const plan = selectNotices(result, config);
    const m = display.measurement;
    const count = result.selection.perMeasurement[m];
    const statistics = result.measurements[m].stats;
    const warning = plan.panels[m];
    const rows = statsRows(statistics, count, m, config);
    const unclassified = unclassifiedLine(result.selection.unclassified);
    const unit = m === 'scarp_dip' ? '°' : ' m';
    const caveats = plan.caveats.filter(ref => {
      if (ref.key === CAVEAT_KEYS.scarpDip) return false;
      // The shared per-dip sentence specifically describes upper
      // exceedance. The visible conversion table above handles a
      // lower-only partial range without falsely claiming its maximum
      // exceeds the simulations (guided DDD §5).
      if (ref.key === CAVEAT_KEYS.perDip) {
        const window = result!.windows?.find(w => w.faultDip === Number(ref.slots.Dip));
        if (window) return storedBounds(window.lo, window.hi, manifest.slipWindowBounds.recordingStep)[1] > Math.round(manifest.slipWindowBounds.max / manifest.slipWindowBounds.recordingStep);
      }
      return true;
    }).map(ref => `<p>${escape(noticeText(ref))}</p>`).join('');
    const canChart = count.valid >= config.chartFloorBelow() && statistics !== null;
    const statisticTable = `<section class="gx-statistics"><h4>Statistics</h4><p class="gx-hint">Matching simulation records.</p><table><caption class="gx-sr-only">${MEASURE_NAMES[m]} statistics</caption><thead><tr><th>Statistic</th><th>Value</th></tr></thead><tbody>${rows.map((row, i) => `<tr><th scope="row">${i === 2 ? term('median', row.label) : i === 3 || i === 4 ? term('percentile', row.label) : escape(row.label)}</th><td>${escape(row.value)}${i > 1 && row.value !== '—' ? unit : ''}</td></tr>`).join('')}</tbody></table>${unclassified ? `<p class="gx-hint">${escape(unclassified)}</p>` : ''}<p class="gx-hint">Missing values are excluded from this measurement's chart and statistics.</p></section>`;
    const selector = `<section class="gx-selector" aria-labelledby="gx-selector-heading"><div class="gx-selector-heading"><h3 id="gx-selector-heading">What would you like to examine?</h3>${button('guide-start', 'Walk me through results')}</div><div class="gx-measurement-cards" role="group" aria-label="Measurement">${MEASUREMENTS.map((measure, i) => `<button type="button" id="gx-measurement-${measure}" data-measurement="${measure}" aria-pressed="${m === measure}"><strong>${MEASURE_NAMES[measure]}</strong><span class="gx-card-question">${guidePrompts[i]}</span><span class="gx-card-status" ${m === measure ? '' : 'aria-hidden="true"'}>${m === measure ? '<span aria-hidden="true">✓</span> Viewing' : '&nbsp;'}</span></button>`).join('')}</div></section>`;
    // Width's Distribution view offers the logarithmic scale exactly when the confirmed result has one (§9.3).
    const logOffered = m === 'dzw' && display.view[m] === 'histogram' && result.histogramLog !== null;
    const logToggle = logOffered ? `<label class="gx-log" for="gx-dzw-log"><input type="checkbox" id="gx-dzw-log" ${display.logScale ? 'checked' : ''}> ${escape(copyText('ddd5.8.logScaleLabel'))}</label>` : '';
    const measurement = plan.state === 'empty' ? `<section class="gx-measurement"><h3>${term(m, MEASURE_NAMES[m])}</h3><p class="gx-hint">${DESCRIPTIONS[m]} ${glossary(GLOSSARY[m], 'About this measurement')}</p>${m === 'dzw' ? `<p class="gx-warning">${escape(copyText('pdd5.7.widthScopeNote'))}</p>` : m === 'scarp_dip' ? `<p class="gx-warning">${escape(copyText('pdd5.4.scarpDipNotice'))}</p>` : ''}<section class="gx-empty"><h3>No matching simulation records</h3>${plan.explainer.map(ref => `<p>${escape(noticeText(ref))}</p>`).join('')}<p>Change a condition or movement range, then review the scenario again.</p></section></section>` : `<section class="gx-measurement"><div class="gx-section-head"><h3>${term(m, MEASURE_NAMES[m])}</h3><strong>${formatCount(count.valid)} valid measurements</strong></div><p class="gx-hint">${DESCRIPTIONS[m]} ${glossary(GLOSSARY[m], 'About this measurement')}</p>${m === 'dzw' ? `<p class="gx-warning">${escape(copyText('pdd5.7.widthScopeNote'))}</p>` : m === 'scarp_dip' ? `<p class="gx-warning">${escape(copyText('pdd5.4.scarpDipNotice'))}</p>` : ''}${warning ? `<p class="gx-warning">${escape(noticeText(warning))}</p>` : ''}<div class="gx-analysis${canChart ? '' : ' gx-table-only'}">${canChart ? `<section class="gx-chart-side"><div class="gx-chart-choices" role="group" aria-label="Chart view"><button type="button" id="gx-chart-histogram" data-chart="histogram" aria-pressed="${display.view[m] === 'histogram'}">Distribution</button><button type="button" id="gx-chart-cumulative" data-chart="cumulative" aria-pressed="${display.view[m] === 'cumulative'}">Cumulative</button></div>${logToggle}<p class="gx-hint">${display.view[m] === 'histogram' ? 'How often each range appears among the matching measurements.' : 'The share of matching measurements at or below each value.'}</p><figure id="gx-chart"></figure><div id="gx-chart-legend" class="gx-chart-legend"></div>${display.view[m] === 'cumulative' ? `<div class="gx-percentile"><label for="gx-percentile">Percentile <output>${display.readoff[m] ?? 84}</output></label><input id="gx-percentile" type="range" min="0" max="100" step="1" value="${display.readoff[m] ?? 84}"><p id="gx-percentile-output" aria-live="polite"></p></div>` : ''}<div id="gx-chart-table"></div></section>` : ''}${statisticTable}</div><div class="gx-interpretation"><strong>Reading these results</strong><p>The median is the middle measurement; the 16th–84th percentile range describes the middle 68% of measurements. These summaries are not recommended design values. Choosing a design value requires engineering judgment.</p>${glossary('statistics-terms', 'Statistics explained')}</div></section>`;
    const controls = guideIndex === null ? `${refinementDisclosure()}${caveats ? `<div class="gx-warning">${caveats}</div>` : ''}${selector}` : `${guideHeader()}${caveats ? `<div class="gx-warning">${caveats}</div>` : ''}`;
    return `<div class="gx-section-head"><div>${heading('Explore your scenario', 'See the range of simulated measurements for the scenario you confirmed.')}</div>${button('review', 'Review scenario')}</div><section class="gx-context"><div class="gx-section-head"><h3>Your confirmed scenario</h3><strong>${formatCount(result.selection.matchingRecords)} matching records</strong></div>${selectionSummary(confirmed)}<p><strong>Movement:</strong> ${movementSummary(confirmed)}</p><p><strong>Included:</strong> ${populationName(confirmed.population)} · ${typesSummary(confirmed)}</p><p class="gx-hint">${confirmed.population === 'one_state_per_trial' ? 'Charts and statistics use the last recorded stage within the slip range from each simulation. Each simulation contributes at most one record.' : 'Charts and statistics combine measurements from all included stages. One simulation may contribute several records.'}</p>${coverage(confirmed)}</section>${dirty() ? `<div class="gx-pending"><div><strong>You have unapplied changes</strong><p>These results still describe your confirmed scenario.</p></div><div>${button('review', 'Return to review')}${button('discard', 'Discard changes')}</div></div>` : ''}${controls}${guideIndex !== null && guideIndex >= 3 ? guideEditor() : measurement}<footer class="gx-footer"><div>${button('site', 'Change site conditions')}${button('movement', 'Change fault movement')}</div>${button('download', 'Download results', true)}</footer><p class="gx-research">This is a research tool; it does not predict what will happen at a particular site. ${link('../scenario/#gre-disclaimer', 'Full disclaimer')}</p><p class="gx-hint">The ${link('../dashboards/distributions/', 'Distributions')} and ${link('../dashboards/model-vs-reality/', 'Model vs reality')} dashboards show broader datasets rather than this confirmed scenario. The ${link('../scenario/', 'existing explorer')} also offers field comparisons and additional chart controls.</p>`;
  }

  function refreshMovementFeedback(): void {
    if (step !== 'movement') return;
    for (const field of ['slipMin', 'slipMax'] as const) {
      const node = $(`#gx-feedback-${field}`), input = $<HTMLInputElement>(`#gx-${field}`);
      if (!node || !input) continue;
      const reading = readDecimal(draft[field]);
      const warn = reading.kind === 'decimal' && compareDecimals(reading.value, '5') > 0;
      node.hidden = !warn;
      node.textContent = warn ? `Above 5 m. The actual modeled maximum is ${manifest.slipWindowBounds.max} m; values above that maximum cannot be reviewed.` : '';
      input.classList.toggle('gx-over-range', warn);
    }
    const offset = $('#gx-offset-feedback');
    if (offset && regression) {
      offset.innerHTML = coverage(draft);
      const reading = readDecimal(draft.offsetMax);
      const input = $<HTMLInputElement>('#gx-offsetMax');
      const warn = reading.kind === 'decimal' && convertWindows(Number(reading.value), draft.faultDip, regression.coefficients).some(window => rangeFlag(window, manifest.slipWindowBounds) !== 'in_range');
      input?.classList.toggle('gx-over-range', warn);
      if (input) input.setAttribute('aria-describedby', 'gx-error-offsetMax gx-offset-feedback');
    }
  }

  function drawChart(): void {
    if (!alive() || step !== 'results' || !result) return;
    const container = $('#gx-chart');
    if (!container) return;
    const m = display.measurement, measurement = result.measurements[m];
    const counts = result.selection.perMeasurement[m];
    if (!measurement.histogram || counts.valid < config.chartFloorBelow()) return;
    const width = Math.max(240, Math.floor(container.getBoundingClientRect().width));
    lastChartWidth = width;
    const specInput = { measurement: m, decimals: config.displayDecimals(m), valid: counts.valid, scarpClasses: manifest.scarpClasses, palette: manifest.scarpClassPalette, familyView: false, fieldTicks: false };
    // The log scale applies to width's Distribution view only, through the shared builders (§9.3).
    const useLog = m === 'dzw' && display.view[m] === 'histogram' && display.logScale && result.histogramLog !== null;
    const bins = useLog ? histogramLogSpec(result.histogramLog!, specInput) : histogramSpec(measurement.histogram, specInput);
    const q = display.readoff[m] ?? 84;
    const svg = display.view[m] === 'histogram' ? histogramSvg(bins, width) : ecdfSvg(ecdfSpec(measurement.values.sorted, { measurement: m, decimals: config.displayDecimals(m), valid: counts.valid, readoff: q, fieldTicks: false }), width);
    const caption = document.createElement('figcaption'); caption.id = `gre-${m}-cap`;
    caption.textContent = display.view[m] === 'cumulative' ? copyText('pdd4.1.cumulativeAccuracy') : useLog ? copyText('ddd5.12.logScaleNote') : 'Histogram intervals follow the distribution of matching measurements; the chart-data table lists their exact boundaries and counts.';
    const chartElement = toSvgElement(svg);
    // The guided page uses larger type than the shared chart's original
    // presentation. Adjust only its title ink, never data or geometry.
    const cumulativeTitle = chartElement.querySelector('g[data-axis="cumulative"] text[transform]');
    if (cumulativeTitle) cumulativeTitle.textContent = 'Measurements at or below (%)';
    chartElement.querySelectorAll('g[data-axis] text[transform]').forEach(title => {
      title.setAttribute('x', '14');
      title.setAttribute('transform', `rotate(-90 14 ${title.getAttribute('y')})`);
    });
    container.replaceChildren(chartElement, caption);
    const legend = $('#gx-chart-legend');
    if (legend) legend.innerHTML = display.view[m] === 'histogram' ? manifest.scarpClasses.map(name => `<span><i style="background:${escape(manifest.scarpClassPalette[name])}" aria-hidden="true"></i>${escape(name)}</span>`).join('') : '';
    const tableContainer = $('#gx-chart-table');
    if (tableContainer) {
      const spec = binTableSpec(bins.bins, bins.groups, bins.edges);
      tableContainer.innerHTML = `<details id="gre-${m}-data" ${display.chartDataOpen[m] ? 'open' : ''}><summary>Histogram bin data</summary>${display.view[m] === 'cumulative' ? '<p class="gx-hint">These are histogram bins for the same measurements. They do not list points on the cumulative curve. Use the percentile control above for cumulative read-offs.</p>' : ''}<div class="gx-table-scroll"><table><caption>${escape(spec.caption)}</caption><thead><tr>${spec.head.map(cell => `<th scope="col">${escape(cell)}</th>`).join('')}</tr></thead><tbody>${spec.rows.map(row => `<tr>${row.header === null ? '' : `<th scope="row">${escape(row.header)}</th>`}${row.cells.map(cell => `<td>${escape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
    }
    const readout = $('#gx-percentile-output');
    if (readout) readout.textContent = `Percentile ${q}: ${quantityText(quantileLinear(measurement.values.sorted, q / 100), m, config.displayDecimals(m))}. This describes matching measurements, not the chance of an earthquake.`;
  }

  function render(focusId?: string, scroll = false): void {
    if (!alive()) return;
    closeHelp();
    // The replacement question belongs to the introduction; the prefill
    // notice stands on both input steps until the first draft edit, and
    // the sequential walk after a fill ends at any later step (§10.3).
    if (step !== 'intro') sampleChoice = null;
    if (step !== 'intro' && step !== 'site') sampleWalk = false;
    checkSampleFill();
    chartObserver?.disconnect(); chartObserver = null;
    const active = document.activeElement as HTMLElement | null;
    const activeId = active && shell.contains(active) ? active.id : '';
    // Replacing a screen must retain keyboard focus even for repeated
    // action buttons without an id (for example Return to review).
    const controlKey = (node: HTMLElement): string => ['data-action', 'data-field', 'data-step', 'data-measurement', 'data-chart', 'data-explain', 'name', 'value'].map(key => node.getAttribute(key) ?? '').join('|');
    const activeKey = active && shell.contains(active) ? controlKey(active) : null;
    const matchingControls = () => [...shell.querySelectorAll<HTMLElement>('button, input')].filter(node => controlKey(node) === activeKey);
    const activePosition = activeKey === null ? -1 : matchingControls().indexOf(active!);
    const views: Record<Step, () => string> = { intro: introView, site: siteView, movement: movementView, review: reviewView, results: () => result ? resultsView() : heading('Explore your scenario', 'See the range of simulated measurements for the scenario you confirmed.') };
    shell.innerHTML = `<header class="gx-brand"><strong>Ground Rupture Explorer</strong><span>Research companion</span></header>${navigation()}<main class="gx-main">${restoredNotice ? '<p class="gx-restored" role="status">Restored the work in this tab.</p>' : ''}${logOffNotice ? `<p class="gx-log-off" role="status">${escape(copyText('ddd5.10.recoveryLogScaleOff'))}</p>` : ''}${generalError ? `<div class="gx-warning" role="alert">${escape(generalError)}</div>` : ''}${restorePanel()}${views[step]()}${step !== 'intro' ? `<div class="gx-restart">${button('new', 'Start a new scenario')}</div>` : ''}</main>${support()}`;
    shell.querySelectorAll<HTMLInputElement>('input[data-mixed]').forEach(input => { input.indeterminate = input.dataset.mixed === 'true'; });
    const dialog = $<HTMLDialogElement>('#gx-sample-dialog');
    if (dialog && !dialog.open) dialog.showModal();
    refreshMovementFeedback();
    if (step === 'results') {
      drawChart();
      const chart = $('#gx-chart');
      if (chart) {
        chartObserver = new ResizeObserver(() => { if (Math.floor(chart.getBoundingClientRect().width) !== lastChartWidth) drawChart(); });
        chartObserver.observe(chart);
      }
    }
    const targetId = focusId ?? activeId;
    if (targetId) $(`#${targetId}`)?.focus({ preventScroll: true });
    else if (activePosition >= 0) matchingControls()[activePosition]?.focus({ preventScroll: true });
    if (scroll) ($(`#${focusId ?? 'gx-heading'}`) ?? $('#gx-heading'))?.scrollIntoView({ block: 'start' });
    persist();
  }

  /** A restored confirmation still awaiting its results (§9.2, step 3). */
  function restorePanel(): string {
    if (!restoreTarget) return '';
    if (busy) return '<p class="gx-hint gx-restoring" role="status">Recalculating the results of your confirmed scenario…</p>';
    return `<div class="gx-warning gx-restore-retry"><p>${escape(restoreError || 'The results of your confirmed scenario have not been recalculated yet.')} Your choices have been kept.</p>${button('retry-restore', 'Retry restoring results', false, 'id="gx-retry-restore"')}</div>`;
  }

  function displayChoices(): DisplayChoices {
    return {
      measurement: display.measurement, view: { ...display.view }, readoff: { ...display.readoff },
      logScale: display.logScale, chartDataOpen: { ...display.chartDataOpen }, exampleOpen, refineOpen,
      sample: sampleFill ? { id: sampleFill.id, modified: sampleFill.modified } : null,
      confirmedSample: confirmedFill ? { id: confirmedFill.id, modified: confirmedFill.modified, current: sampleFill?.serial === confirmedFill.serial } : null,
    };
  }

  /** Save the committed state (§9.2). Never while an unrestorable record awaits the explicit fresh start. */
  function persist(): void {
    if (!options.storage || !continuity || blocked) return;
    const kept = confirmed ?? restoreTarget;
    const record: SessionRecord = {
      record: 1, dataVersion: stamps.dataVersion, step, draft: cloneDraft(draft),
      confirmed: kept ? cloneDraft(kept) : null, display: displayChoices(),
    };
    if (!saveSession(options.storage, record)) {
      // A failed save never interrupts the reader; the mount falls back to
      // the first-version fresh behavior and its wording.
      // Clear any older record so a reload really starts fresh, as the
      // fallback wording then says.
      continuity = false;
      clearSession(options.storage);
      const note = $('.gx-session-note');
      if (note) note.textContent = 'Your choices are kept while this page remains open. Reloading or leaving and returning starts a new draft.';
      const aside = $('.gx-support p');
      if (aside) aside.textContent = 'Supporting pages open in a separate tab. Your draft stays here while this page remains open; reloading starts a new draft.';
    }
  }

  /** Recompute a restored confirmation through the ordinary pipeline (§9.2, step 3). */
  async function restoreResults(): Promise<void> {
    const target = restoreTarget;
    if (!target || busy) return;
    const version = navigationVersion;
    // A newer confirmation or Start a new scenario supersedes this restore;
    // its continuation then leaves every shared flag alone.
    // A navigation (`invalidate`) has already released the busy state and
    // recorded the interruption; either way the continuation stops here.
    const superseded = () => !alive() || restoreTarget !== target || version !== navigationVersion;
    busy = true; restoring = true; restoreError = ''; render();
    const checked = validateDraft(target, manifest);
    if (!checked.scenario) { busy = false; restoring = false; restoreError = 'The results of your confirmed scenario could not be recalculated.'; render(); return; }
    if (target.mode === 'offset') {
      const loaded = await ensureRegression();
      if (superseded()) return;
      if (!loaded) { busy = false; restoring = false; restoreError = 'The offset-conversion data could not be loaded, so the results of your confirmed scenario could not be recalculated.'; render(); return; }
    }
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    if (superseded()) return;
    try {
      const computed = computeResult(vintage, checked.scenario, sequence + 1, regression);
      confirmed = target; result = computed; sequence += 1; busy = false; restoring = false; restoreTarget = null; restoreError = '';
      adjustLogScale(computed);
      restoredNotice = true;
      // Move focus only when the reader has not already moved it into the page.
      const focusFree = !shell.contains(document.activeElement);
      render(step === 'results' && focusFree ? 'gx-heading' : undefined);
      status.textContent = `${formatCount(computed.selection.matchingRecords)} simulation records match your confirmed scenario.${logOffNotice ? ` ${copyText('ddd5.10.recoveryLogScaleOff')}` : ''}`;
    } catch (error) {
      console.error('Guided restore:', error); busy = false; restoring = false;
      restoreError = 'The results of your confirmed scenario could not be recalculated.';
      render();
    }
  }

  /** Turn the width log scale off, once reporting it, when a new result no longer offers it (§9.3; PDD §7.3). */
  function adjustLogScale(computed: RenderInput): void {
    if (display.logScale && computed.histogramLog === null) {
      display = { ...display, logScale: false };
      logOffNotice = true;
    }
  }

  /** Apply a validated record (§9.2, step 3); results recompute separately. */
  function applyRecord(record: SessionRecord): void {
    draft = cloneDraft(record.draft);
    step = record.step;
    const { measurement, view, readoff, logScale, chartDataOpen } = record.display;
    display = { ...defaultDisplayState(), measurement, view: { ...view }, readoff: { ...readoff }, logScale, chartDataOpen: { ...chartDataOpen } };
    exampleOpen = record.display.exampleOpen; refineOpen = record.display.refineOpen;
    restoreFills(record);
    reached = new Set(record.confirmed ? STEPS : STEPS.slice(0, STEPS.indexOf(step) + 1));
    restoreTarget = record.confirmed ? cloneDraft(record.confirmed) : null;
    // An untouched introduction is not restored work: no claim (§9.2, step 4).
    const untouched = step === 'intro' && record.confirmed === null && !draftChanged(record.draft, freshDraft(manifest));
    restoredNotice = restoreTarget === null && !untouched;
  }

  /**
   * Restore the sample notice with the record (owner decision R, 2026-11-05).
   * A fill's values are rebuilt from the served release; a sample the release
   * no longer supports drops its notice rather than the record. Modified is
   * never undone: an unmodified fill whose values no longer match turns
   * Modified at the first render. The mode-switch note returns when the draft
   * is in the mode the sample did not set; the story starts closed.
   */
  function restoreFills(record: SessionRecord): void {
    const rebuild = (id: SampleId, modified: boolean): SampleFill | null => {
      try {
        fillSerial += 1;
        return { id, values: sampleDraft(manifest, id), modified, serial: fillSerial };
      } catch (error) {
        console.error('Guided restore: sample', error);
        return null;
      }
    };
    const { sample, confirmedSample } = record.display;
    sampleFill = sample ? rebuild(sample.id, sample.modified) : null;
    // A confirmed fill never stands without a working one (the record's own rule).
    confirmedFill = !record.confirmed || !confirmedSample || !sampleFill ? null
      : confirmedSample.current ? { ...sampleFill, modified: confirmedSample.modified }
      : rebuild(confirmedSample.id, confirmedSample.modified);
    sampleModeNote = sampleFill !== null && draft.mode !== sampleFill.values.mode;
  }

  /**
   * Cancel pending async work (§9.2, step 3: a restore in flight is cancelled
   * exactly as a review request). A pending restore releases its busy state
   * here rather than when its conversion fetch settles, so Show results is
   * available at once; its late continuation then leaves every shared flag alone.
   */
  function invalidate(): void {
    navigationVersion += 1;
    if (!restoring) return;
    restoring = false; busy = false; restoreError = 'Restoring the results was interrupted.';
    // Callers that do not re-render (typing) still replace the stale progress line.
    const pending = $('.gx-restoring');
    if (pending) pending.outerHTML = restorePanel();
  }

  function setStep(next: Step): void {
    if (next === 'results' && !result) return;
    if (next !== 'results') guideIndex = null;
    invalidate(); restoredNotice = false; logOffNotice = false;
    step = next; reached.add(next); generalError = ''; alert.textContent = ''; render('gx-heading', true);
    if (next === 'movement' && draft.mode === 'offset') void ensureRegression();
  }

  async function ensureRegression(): Promise<boolean> {
    if (regression) return true;
    if (regressionPromise) return regressionPromise;
    regressionError = '';
    const pending = options.loadRegression().then(value => {
      if (!alive()) return false;
      regression = value; regressionError = ''; return true;
    }).catch(error => {
      if (!alive()) return false;
      console.error('Guided offset conversion:', error);
      regressionError = 'The offset-conversion data could not be loaded. Retry, or use fault-slip entry. Your entries have been kept.';
      alert.textContent = regressionError; return false;
    }).finally(() => {
      if (regressionPromise === pending) regressionPromise = null;
      if (alive() && (step === 'movement' || step === 'review')) render();
    });
    regressionPromise = pending;
    if (alive() && step === 'movement') render();
    return pending;
  }

  function showIssues(found: Issue[]): void {
    guideIndex = null;
    invalidate();
    issues = found;
    const first = found[0];
    if (!first) return;
    step = first.step === 'results' && !result ? 'review' : first.step;
    if (step === 'results') refineOpen = true;
    reached.add(step);
    alert.textContent = found.map(item => item.message).join(' ');
    const field = first.field;
    render(`gx-${field}${['faultDip', 'depth', 'density', 'sediment', 'scarpClass'].includes(field) ? '-all' : ''}`, true);
  }

  async function goReview(): Promise<void> {
    const guideWasActive = guideIndex !== null;
    guideIndex = null;
    if (guideWasActive) render();
    const version = navigationVersion;
    generalError = '';
    const judgment = validateDraft(draft, manifest);
    if (judgment.issues.length) { showIssues(judgment.issues); return; }
    issues = [];
    if (draft.mode === 'offset') {
      const loaded = await ensureRegression();
      if (!alive() || version !== navigationVersion) return;
      if (!loaded) { setStep('movement'); return; }
    }
    if (!alive() || version !== navigationVersion) return;
    const latest = validateDraft(draft, manifest);
    if (latest.issues.length) { showIssues(latest.issues); return; }
    setStep('review');
  }

  async function confirm(): Promise<void> {
    if (busy) return;
    const version = navigationVersion;
    const judgment = validateDraft(draft, manifest);
    if (!judgment.scenario) { showIssues(judgment.issues); return; }
    if (draft.mode === 'offset') {
      const loaded = await ensureRegression();
      if (!alive() || version !== navigationVersion) return;
      if (!loaded) { setStep('movement'); return; }
    }
    if (!alive() || version !== navigationVersion) return;
    busy = true; generalError = ''; render();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    if (!alive() || version !== navigationVersion) { busy = false; return; }
    try {
      const snapshot = cloneDraft(draft);
      const checked = validateDraft(snapshot, manifest);
      if (!checked.scenario) { busy = false; showIssues(checked.issues); return; }
      const computed = computeResult(vintage, checked.scenario, sequence + 1, regression);
      confirmed = snapshot; confirmedFill = sampleFill ? { ...sampleFill } : null;
      result = computed; sequence += 1; busy = false; issues = []; refineOpen = false; guideIndex = null; alert.textContent = '';
      restoreTarget = null; restoring = false; restoreError = ''; restoredNotice = false; logOffNotice = false;
      adjustLogScale(computed);
      step = 'results'; reached.add('results');
      render('gx-heading', true);
      status.textContent = `Results updated. ${formatCount(computed.selection.matchingRecords)} simulation records match your confirmed scenario.${logOffNotice ? ` ${copyText('ddd5.10.recoveryLogScaleOff')}` : ''}`;
    } catch (error) {
      console.error('Guided calculation:', error); busy = false;
      generalError = 'The results could not be calculated. Your previous confirmed scenario and results have been kept. Try Show results again.';
      alert.textContent = generalError; render();
    }
  }

  function download(): void {
    if (!result) return;
    try {
      const archive = buildPackage(result, stamps, new Date());
      const url = URL.createObjectURL(new Blob([archive.bytes], { type: 'application/zip' })); downloadUrls.add(url);
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = archive.fileName; root.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => { URL.revokeObjectURL(url); downloadUrls.delete(url); }, 1000);
      status.textContent = 'Your confirmed result download is ready.';
    } catch (error) {
      console.error('Guided download:', error);
      generalError = 'The download could not be created. Your confirmed result is unchanged; select Download results to retry.';
      alert.textContent = generalError; render();
    }
  }

  shell.addEventListener('mouseover', event => {
    const trigger = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-explain]') : null;
    if (!trigger || !shell.contains(trigger) || helpPinned) return;
    if (event.relatedTarget instanceof Node && trigger.contains(event.relatedTarget)) return;
    showHelp(trigger);
  }, { signal });
  shell.addEventListener('mouseout', event => {
    if (!helpTrigger || !(event.target instanceof Node) || !helpTrigger.contains(event.target)) return;
    if (event.relatedTarget instanceof Node && helpTrigger.contains(event.relatedTarget)) return;
    scheduleHelpClose();
  }, { signal });
  shell.addEventListener('focusin', event => {
    const trigger = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-explain]') : null;
    if (trigger && shell.contains(trigger)) {
      closeHelp(); helpFocusTrigger = trigger; queueFocusedHelp();
    }
  }, { signal });
  shell.addEventListener('focusout', event => {
    if (event.target === helpFocusTrigger) closeHelp();
    else if (event.target === helpTrigger) scheduleHelpClose();
  }, { signal });
  floatingHelp.addEventListener('mouseenter', () => { helpHovered = true; cancelHelpTimer(); }, { signal });
  floatingHelp.addEventListener('mouseleave', () => { helpHovered = false; scheduleHelpClose(); }, { signal });
  document.addEventListener('click', event => {
    const target = event.target;
    const trigger = helpTrigger ?? helpFocusTrigger;
    if (trigger && target instanceof Node && !trigger.contains(target) && !floatingHelp.contains(target)) closeHelp();
  }, { signal });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && (helpTrigger || helpFocusTrigger)) { closeHelp(); event.preventDefault(); }
    else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(event.key)) cancelPendingFocusedHelp();
  }, { signal });
  // User scrolling cancels pending focus help rather than reopening it
  // after the scroll. Only automatic focus scrolling gets the short wait.
  document.addEventListener('wheel', closeHelp, { passive: true, signal });
  document.addEventListener('touchmove', closeHelp, { passive: true, signal });
  document.addEventListener('mousedown', cancelPendingFocusedHelp, { capture: true, signal });
  document.addEventListener('scroll', helpScrolled, { capture: true, passive: true, signal });
  window.addEventListener('resize', closeHelp, { passive: true, signal });
  window.visualViewport?.addEventListener('resize', closeHelp, { passive: true, signal });
  window.visualViewport?.addEventListener('scroll', helpScrolled, { passive: true, signal });

  shell.addEventListener('click', event => {
    // Buttons, and the sample dialog's cards (§10.5).
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>('button, [data-sample-card]') : null;
    if (!target || (target instanceof HTMLButtonElement && target.disabled)) return;
    if (target instanceof HTMLButtonElement && target.dataset.explain) {
      if (helpTrigger === target && helpPinned) closeHelp();
      else showHelp(target, true);
      return;
    }
    // The restore notice lasts until the next navigation or edit (§9.2);
    // the one-time log-scale status likewise. A click that does not
    // re-render (a successful download) must not leave the dismissed
    // log-scale line on screen (G-17), so its element goes with its flag.
    // Opening, browsing, or closing the sample dialog is neither a navigation nor an edit.
    if (!['sample-open', 'sample-close', 'sample-keep', 'sample-apply'].includes(target.dataset.action ?? '') && !target.dataset.sampleCard) {
      restoredNotice = false; logOffNotice = false;
      $('.gx-log-off')?.remove();
    }
    try {
      const measurement = target.dataset.measurement as MeasurementName | undefined;
      if (measurement) { display = { ...display, measurement }; render(); return; }
      const chart = target.dataset.chart as 'histogram' | 'cumulative' | undefined;
      if (chart) { display = { ...display, view: { ...display.view, [display.measurement]: chart } }; render(); return; }
      const action = target.dataset.action;
      const sample = isSampleId(target.dataset.sample) ? target.dataset.sample : null;
      const card = isSampleId(target.dataset.sampleCard) ? target.dataset.sampleCard : null;
      if (card) selectSampleCard(card);
      else if (action === 'sample-open') { sampleChoice = { selected: SAMPLES[0].id, stage: 'preview' }; render(`gx-sample-${SAMPLES[0].id}`); }
      else if (action === 'sample-apply') applySample();
      else if (action === 'sample-use' && sample) useSample(sample);
      else if (action === 'sample-keep' || action === 'sample-close') closeSampleDialog();
      else if (action === 'start' || action === 'site') setStep('site');
      else if (action === 'intro') setStep('intro');
      else if (action === 'movement') setStep('movement');
      else if (action === 'back-results' && result) setStep('results');
      else if (action === 'site-next') {
        const invalid = validateDraft(draft, manifest).issues.filter(item => item.step === 'site');
        if (invalid.length) showIssues(invalid); else { issues = []; setStep('movement'); }
      } else if (action === 'review') void goReview();
      else if (action === 'confirm') void confirm();
      else if (action === 'step') { const next = target.dataset.step as Step; if (next === 'review') void goReview(); else if (reached.has(next)) setStep(next); }
      else if (action === 'guide-start') { refineOpen = false; moveGuide(0); }
      else if (action === 'guide-exit') leaveGuide();
      else if (action === 'guide-back' && guideIndex !== null && guideIndex > 0) moveGuide((guideIndex - 1) as 0 | 1 | 2 | 3);
      else if (action === 'guide-next' && guideIndex !== null) {
        if (guideIndex < 4) moveGuide((guideIndex + 1) as 1 | 2 | 3 | 4);
        else if (dirty()) void goReview();
        else leaveGuide();
      }
      else if (action === 'refine') { refineOpen = !refineOpen; render(); }
      else if (action === 'edit-refinements') { refineOpen = true; setStep('results'); $(`#gx-population-${draft.population}`)?.focus({ preventScroll: true }); $('#gx-refinements')?.scrollIntoView({ block: 'start' }); }
      else if (action === 'discard' && confirmed) { if (guideIndex !== null && guideIndex >= 3) refineOpen = true; guideIndex = null; draft = cloneDraft(confirmed); issues = []; generalError = '';
        // Discarding returns to the confirmed draft: the notice is that of the fill it started from, if any,
        // and once Modified it stays Modified (§10.5).
        if (confirmedFill) {
          const lineage: SampleFill = sampleFill !== null && sampleFill.serial === confirmedFill.serial ? sampleFill : confirmedFill;
          sampleFill = { ...lineage, modified: lineage.modified || !holdsSample(draft, lineage.values) };
        } else sampleFill = null;
        setStep('results'); status.textContent = 'Draft changes discarded. The confirmed scenario has been restored.'; }
      else if (action === 'new') {
        // Clear the record before the fresh state is saved (§9.2), including an unrestorable one.
        if (options.storage) clearSession(options.storage);
        blocked = null; restoreTarget = null; restoreError = ''; busy = false; restoring = false;
        guideIndex = null; sampleFill = null; confirmedFill = null; sampleModeNote = false; sampleWalk = false; draft = freshDraft(manifest); confirmed = null; result = null; issues = []; generalError = ''; reached = new Set(['intro', 'site']); display = defaultDisplayState(); refineOpen = false; setStep('site'); status.textContent = 'New scenario. Choose one or more values for each site condition.';
      }
      else if (action === 'retry-restore') void restoreResults();
      else if (action === 'plus' || action === 'minus') { invalidate(); const field = target.dataset.field as 'slipMin' | 'slipMax' | 'offsetMax'; draft[field] = stepDecimal(draft[field], action === 'plus' ? 1 : -1); issues = issues.filter(item => item.field !== field); render(); status.textContent = `${field === 'slipMin' ? 'Minimum' : 'Maximum'}: ${draft[field]} m.`; }
      else if (action === 'slip-shortcut') { invalidate(); draft.slipMax = '5'; issues = issues.filter(item => item.field !== 'slipMax'); render('gx-slipMax'); }
      else if (action === 'offset-shortcut' && regression) { invalidate(); const cap = offsetShortcut(draft.faultDip, regression, manifest.slipWindowBounds.max); if (cap !== null) draft.offsetMax = cap; issues = issues.filter(item => item.field !== 'offsetMax'); render('gx-offsetMax'); }
      else if (action === 'retry-regression') { $('#gx-offsetMax')?.focus(); void ensureRegression(); }
      else if (action === 'download') download();
    } catch (error) {
      console.error('Guided interaction:', error); generalError = 'This action could not be completed. Your confirmed results have not changed.'; alert.textContent = generalError; render();
    }
  }, { signal });

  // The sample dialog (§10.5): its cards are one tab stop, with arrows,
  // Home and End moving the selection; Tab stays inside the dialog; Escape
  // closes it without applying.
  shell.addEventListener('keydown', event => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.closest('#gx-sample-dialog')) return;
    const card = isSampleId(target.dataset.sampleCard) ? target.dataset.sampleCard : null;
    if (card) {
      const index = SAMPLES.findIndex(sample => sample.id === card), last = SAMPLES.length - 1;
      const moves: Partial<Record<string, number>> = {
        ArrowDown: index === last ? 0 : index + 1, ArrowRight: index === last ? 0 : index + 1,
        ArrowUp: index === 0 ? last : index - 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last,
      };
      const move = moves[event.key];
      if (move !== undefined) { event.preventDefault(); selectSampleCard(SAMPLES[move].id); return; }
      if (event.key === ' ') { event.preventDefault(); return; }
    }
    if (event.key === 'Tab') {
      // Every tab stop in the dialog, in order: the selected card, links, disclosures, and buttons.
      const stops = [...shell.querySelectorAll<HTMLElement>('#gx-sample-dialog :is([data-sample-card][tabindex="0"], a[href], summary, input, button:not(:disabled))')]
        .filter(stop => stop.getClientRects().length > 0);
      if (!stops.length) return;
      // From an element outside the stops (focused by a click), continue from its place in the document.
      let index = stops.indexOf(target);
      if (index < 0) {
        const after = stops.findIndex(stop => target.compareDocumentPosition(stop) & Node.DOCUMENT_POSITION_FOLLOWING);
        index = event.shiftKey ? (after < 0 ? stops.length : after) : (after < 0 ? 0 : after) - 1;
      }
      const next = event.shiftKey ? (index <= 0 ? stops.length - 1 : index - 1) : (index + 1) % stops.length;
      event.preventDefault(); stops[next]?.focus();
    }
  }, { signal });
  // Escape closes the dialog without applying (Keep my choices at its second step); any other close likewise.
  shell.addEventListener('cancel', event => {
    if (!(event.target instanceof HTMLDialogElement) || event.target.id !== 'gx-sample-dialog') return;
    event.preventDefault(); closeSampleDialog();
  }, { capture: true, signal });
  shell.addEventListener('close', event => {
    if (event.target instanceof HTMLDialogElement && event.target.id === 'gx-sample-dialog' && event.target.isConnected) closeSampleDialog();
  }, { capture: true, signal });

  shell.addEventListener('change', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.id === 'gx-dzw-log') {
      // Immediate presentation (D-34): never a draft edit or a navigation.
      display = { ...display, logScale: input.checked }; restoredNotice = false; logOffNotice = false;
      render(input.id); return;
    }
    // The read-off slider is display state handled on `input`; its closing
    // `change` is neither an edit nor a navigation, so it clears no notice
    // and cancels nothing (§9.3, G-17).
    if (input.id === 'gx-percentile') return;
    invalidate(); restoredNotice = false; logOffNotice = false;
    if (input.name === 'gx-mode') {
      draft.mode = input.value as 'slip' | 'offset'; issues = issues.filter(item => item.step !== 'movement');
      // While a sample is active, a mode switch says the modes are separate assumptions (§10.5).
      const noteNow = sampleFill !== null && !sampleModeNote;
      if (sampleFill) sampleModeNote = true;
      render();
      if (noteNow) status.textContent = MODE_NOTE; if (draft.mode === 'offset') void ensureRegression(); return; }
    if (input.name === 'gx-population') { draft.population = input.value as Draft['population']; render(); return; }
    const field = input.dataset.all ?? input.dataset.choice;
    if (!field) return;
    const all = input.dataset.all !== undefined, index = Number(input.value);
    if (field === 'sediment') {
      const values = manifest.armStrengthStates;
      draft.sediment = values.filter((value, i) => all ? input.checked : i === index ? input.checked : draft.sediment.some(p => p.set === value.set && p.sedimentStrength === value.sedimentStrength)).map(pair => ({ ...pair }));
    } else if (field === 'faultDip' || field === 'depth') {
      const values = field === 'faultDip' ? manifest.trialColumns.fault_dip : manifest.trialColumns.depth;
      draft[field] = values.filter((value, i) => all ? input.checked : i === index ? input.checked : draft[field].includes(value));
    } else if (field === 'density' || field === 'scarpClass') {
      const values = field === 'density' ? manifest.trialColumns.density : manifest.scarpClasses;
      draft[field] = values.filter((value, i) => all ? input.checked : i === index ? input.checked : draft[field].includes(value));
    }
    issues = issues.filter(item => item.field !== field);
    render(input.id);
  }, { signal });

  shell.addEventListener('input', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    if (input.dataset.number) {
      invalidate();
      const field = input.dataset.number as 'slipMin' | 'slipMax' | 'offsetMax';
      draft[field] = input.value; issues = issues.filter(item => item.field !== field);
      input.removeAttribute('aria-invalid'); const error = $(`#gx-error-${field}`); if (error) { error.hidden = true; error.textContent = ''; }
      refreshMovementFeedback();
      checkSampleFill();
      if (restoredNotice) { restoredNotice = false; $('.gx-restored')?.remove(); }
      if (logOffNotice) { logOffNotice = false; $('.gx-log-off')?.remove(); }
      persist();
    } else if (input.id === 'gx-percentile') {
      const q = Number(input.value);
      display = { ...display, readoff: { ...display.readoff, [display.measurement]: q } };
      const label = input.parentElement?.querySelector('output'); if (label) label.textContent = String(q);
      drawChart();
      persist();
    }
  }, { signal });

  shell.addEventListener('toggle', event => {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || !shell.contains(details)) return;
    if (details.id === 'gx-stage-example') { exampleOpen = details.open; persist(); }
    if (details.id === 'gx-sample-story') storyOpen = details.open;
    if (details.id === `gre-${display.measurement}-data`) { display = { ...display, chartDataOpen: { ...display.chartDataOpen, [display.measurement]: details.open } }; persist(); }
  }, { capture: true, signal });
  signal.addEventListener('abort', () => { closeHelp(); chartObserver?.disconnect(); downloadUrls.forEach(url => URL.revokeObjectURL(url)); downloadUrls.clear(); }, { once: true });

  // Same-tab continuity on mount, including the pageshow remount (§9.2).
  // The walkthrough is presentation state and always starts off.
  if (options.storage) {
    const found = classifySession(loadSession(options.storage), stamps.dataVersion, manifest);
    if (found.kind === 'unreadable' || found.kind === 'data-changed') { blocked = found.kind; step = 'intro'; }
    else if (found.kind === 'restore') applyRecord(found.record);
  }
  render();
  if (((step as Step) === 'movement' || (step as Step) === 'review') && draft.mode === 'offset') void ensureRegression();
  if (restoreTarget) void restoreResults();
}
