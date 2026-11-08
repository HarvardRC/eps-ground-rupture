// Shared helpers of the guided /explore/ specs (guided DDD §9.5): entry,
// site and movement drives through the real controls from a reference
// golden scenario's inputs, confirmation, and layout probes. Expected
// values come from the served reference results (support.ts); nothing
// here invents a value. Not a spec.

import { expect, type Page } from '@playwright/test';
import { sedimentGroup } from '../src/explore/state';
import { formatCount } from '../src/views/format';
import { gs, manifest, type GoldenScenario, type Inputs } from './support';

export const EXPLORE_PATH = 'explore/';
export const SESSION_KEY = 'gre-explore-session';
export const INTRO_HEADING = 'Use simulations to understand ground rupture.';
export const SITE_HEADING = 'Describe the geological site conditions';
export const MOVEMENT_HEADING = 'Choose the assumed fault slip';
export const REVIEW_HEADING = 'Review your scenario';
export const RESULTS_HEADING = 'Explore your scenario';

/** Direct entry into the guided page, waiting for its application shell. */
export async function gotoExplore(page: Page): Promise<void> {
  await page.goto(EXPLORE_PATH);
  await explorerReady(page);
}

export async function explorerReady(page: Page): Promise<void> {
  await page.locator('#gre-explore .gx-shell').waitFor({ timeout: 30_000 });
}

export const heading = (page: Page) => page.locator('#gx-heading');
export const action = (page: Page, name: string) => page.locator('#gre-explore .gx-main button', { hasText: name });
export const stepButton = (page: Page, step: 'intro' | 'site' | 'movement' | 'review' | 'results') =>
  page.locator(`#gre-explore .gx-steps button[data-step="${step}"]`);
/**
 * A step not yet open (guided DDD §12.1): the list shows it as a plain,
 * non-interactive entry — never as a disabled button.
 */
export async function expectStepClosed(page: Page, step: 'intro' | 'site' | 'movement' | 'review' | 'results'): Promise<void> {
  await expect(page.locator(`#gre-explore .gx-steps .gx-step-entry[data-step="${step}"]`)).toHaveCount(1);
  await expect(stepButton(page, step)).toHaveCount(0);
}
/**
 * Choose a prefilled sample through the introduction's dialog (guided DDD
 * §10.5): open it, select the card, and Use this sample. Over a non-fresh
 * draft the replacement question follows.
 */
export async function pickSample(page: Page, id: 'illustrative' | 'kern'): Promise<void> {
  await page.locator('#gx-sample-trigger').click();
  await page.locator(`#gx-sample-${id}`).click();
  await expect(page.locator(`#gx-sample-${id}`)).toHaveAttribute('aria-checked', 'true');
  await page.locator('#gx-sample-apply').click();
}
export const confirmedCount = (page: Page) => page.locator('.gx-context .gx-section-head strong');
/** The confirmed count in the adopted wording (guided DDD §11.1). */
export const countText = (n: number): string => `${formatCount(n)} matching simulation ${n === 1 ? 'stage' : 'stages'}`;

type Group = 'density' | 'sediment';

/**
 * Set a checkbox or radio by clicking it, then assert the state through a
 * fresh query: every change re-renders the screen, so Playwright's own
 * check() would verify a replaced element.
 */
export async function setChecked(page: Page, selector: string, wanted: boolean): Promise<void> {
  const box = page.locator(selector);
  if ((await box.isChecked()) !== wanted) await box.click();
  if (wanted) await expect(page.locator(selector)).toBeChecked();
  else await expect(page.locator(selector)).not.toBeChecked();
}

/** A site checkbox by its visible (or, for sediment, accessible) name. */
export const siteChoice = (page: Page, group: Group, name: string) =>
  page.locator(`#gx-group-${group}`).getByRole('checkbox', { name, exact: true });

/** The guided accessible name of a manifest sediment pair. */
export const sedimentName = (pair: { readonly set: string; readonly sediment_strength: string }): string =>
  `${sedimentGroup(pair.set)}: ${pair.sediment_strength}`;

type RangeGroup = 'faultDip' | 'depth';

/** A range group's thumb (guided DDD §14.1). */
export const thumb = (page: Page, group: RangeGroup, end: 'min' | 'max') => page.locator(`#gx-${group}-${end}`);

/** A range group's selection echo (§14.2). */
export const echo = (page: Page, group: RangeGroup) => page.locator(`#gx-echo-${group}`);

/** Press `key` on a thumb `times` times, the way a keyboard reader moves it one modeled stop per press. */
export async function pressThumb(page: Page, group: RangeGroup, end: 'min' | 'max', key: string, times = 1): Promise<void> {
  await thumb(page, group, end).focus();
  for (let i = 0; i < times; i += 1) await page.keyboard.press(key);
}

/**
 * Answer a range group with the modeled stops `lo`…`hi` by keyboard, from
 * any state: Full range when that is the whole scale; otherwise both thumbs
 * to the ends (a press at an end moves nothing), then each in to its stop.
 */
export async function chooseRange(page: Page, group: RangeGroup, lo: number, hi: number): Promise<void> {
  const values = group === 'faultDip' ? manifest().trial_columns.fault_dip : manifest().trial_columns.depth;
  const last = values.length - 1;
  if (lo === 0 && hi === last) {
    await page.locator(`#gx-${group}-full`).click();
  } else {
    await pressThumb(page, group, 'min', 'Home');
    await pressThumb(page, group, 'max', 'End');
    await pressThumb(page, group, 'max', 'ArrowLeft', last - hi);
    await pressThumb(page, group, 'min', 'ArrowRight', lo);
  }
  const unit = group === 'faultDip' ? '°' : ' m';
  const chosen = values.slice(lo, hi + 1).map((v) => `${v}${unit}`).join(', ');
  await expect(echo(page, group)).toHaveText(`Selected: ${chosen} — ${hi - lo + 1} of ${values.length} modeled ${group === 'faultDip' ? 'angles' : 'depths'}.`);
}

/**
 * Edit a non-empty range by one stop on a thumb, and return the press that
 * undoes it: the minimum in by one where the range is wider than one stop,
 * otherwise out by one.
 */
export async function nudgeRange(page: Page, group: RangeGroup): Promise<() => Promise<void>> {
  const lo = Number(await thumb(page, group, 'min').inputValue());
  const hi = Number(await thumb(page, group, 'max').inputValue());
  const [end, key, back]: ['min' | 'max', string, string] = lo < hi ? ['min', 'ArrowRight', 'ArrowLeft'] : lo > 0 ? ['min', 'ArrowLeft', 'ArrowRight'] : ['max', 'ArrowRight', 'ArrowLeft'];
  await pressThumb(page, group, end, key);
  return () => pressThumb(page, group, end, back);
}

/** Answer every site condition with everything: Full range on both ranges, Select all on both checkbox groups. */
export async function answerEverySite(page: Page): Promise<void> {
  for (const group of ['faultDip', 'depth'] as const) await page.locator(`#gx-${group}-full`).click();
  for (const group of ['density', 'sediment'] as const) await setChecked(page, `#gx-${group}-all`, true);
}

/** Answer a range group with a contiguous set of modeled values. */
async function chooseRangeValues(page: Page, group: RangeGroup, wanted: readonly number[]): Promise<void> {
  const values = group === 'faultDip' ? manifest().trial_columns.fault_dip : manifest().trial_columns.depth;
  const indices = wanted.map((v) => values.indexOf(v)).sort((a, b) => a - b);
  if (indices.some((i) => i < 0) || indices[indices.length - 1] - indices[0] + 1 !== indices.length) {
    throw new Error(`explore-support: the guided ${group} range cannot select ${wanted.join(', ')}`);
  }
  await chooseRange(page, group, indices[0], indices[indices.length - 1]);
}

/** Select exactly the golden inputs' site values: ranges for angle and depth, Select all where a checkbox input is the whole dictionary. */
export async function chooseSite(page: Page, inputs: Inputs): Promise<void> {
  const m = manifest();
  await chooseRangeValues(page, 'faultDip', inputs.fault_dip);
  await chooseRangeValues(page, 'depth', inputs.depth);
  const groups: readonly [Group, readonly string[], readonly string[]][] = [
    ['density', [...m.trial_columns.density], [...inputs.density]],
    ['sediment', m.arm_strength_states.map(sedimentName), inputs.sediment.map(sedimentName)],
  ];
  for (const [group, all, wanted] of groups) {
    if (wanted.length === all.length) await setChecked(page, `#gx-${group}-all`, true);
    else for (const name of wanted) await setChecked(page, `#gx-${group}-${all.indexOf(name)}`, true);
  }
}

/** Type a movement entry the way a reader does. */
export async function typeEntry(page: Page, field: 'slipMin' | 'slipMax' | 'offsetMax', value: string): Promise<void> {
  await page.locator(`#gx-${field}`).fill(value);
}

/** Enter the golden inputs' movement on the Fault movement step. */
export async function chooseMovement(page: Page, inputs: Inputs): Promise<void> {
  if (inputs.entry_mode === 'offset') {
    await setChecked(page, '#gx-mode-offset', true);
    await typeEntry(page, 'offsetMax', inputs.offset_max!);
  } else {
    if (inputs.slip_window === null) throw new Error('explore-support: the guided page needs an explicit slip window');
    await setChecked(page, '#gx-mode-slip', true);
    await typeEntry(page, 'slipMin', inputs.slip_window.min);
    await typeEntry(page, 'slipMax', inputs.slip_window.max);
  }
}

/** Drive a fresh page from the introduction to the confirmed golden scenario; returns the reference. */
export async function confirmGolden(page: Page, id: string): Promise<GoldenScenario> {
  const ref = gs(id);
  if (ref.inputs.population !== 'all_stages' || ref.inputs.scarp_class.length !== manifest().scarp_classes.length) {
    throw new Error(`explore-support: ${id} needs refinements this drive does not set`);
  }
  await action(page, 'Build your scenario').click();
  await chooseSite(page, ref.inputs);
  await action(page, 'Continue to fault slip').click();
  await chooseMovement(page, ref.inputs);
  await action(page, 'Review scenario').click();
  await expect(heading(page)).toHaveText(REVIEW_HEADING);
  await action(page, 'Show results').click();
  await expect(heading(page)).toHaveText(RESULTS_HEADING);
  await expect(confirmedCount(page)).toHaveText(countText(ref.counts.matching_records));
  return ref;
}

/** Re-confirm another golden scenario's movement over the current site choices (both all-stages, all types). */
export async function reconfirmMovement(page: Page, id: string): Promise<GoldenScenario> {
  const ref = gs(id);
  await stepButton(page, 'site').click();
  // Clear each checkbox group (Select all on, then off), then choose the new values; the ranges are set from any state.
  for (const group of ['density', 'sediment'] as const) {
    await setChecked(page, `#gx-${group}-all`, true);
    await setChecked(page, `#gx-${group}-all`, false);
  }
  await chooseSite(page, ref.inputs);
  await stepButton(page, 'movement').click();
  await chooseMovement(page, ref.inputs);
  await stepButton(page, 'review').click();
  await expect(heading(page)).toHaveText(REVIEW_HEADING);
  await action(page, 'Show results').click();
  await expect(confirmedCount(page)).toHaveText(countText(ref.counts.matching_records));
  return ref;
}

/** True when the document scrolls horizontally. */
export const overflows = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);

/** The stored session record, parsed, or null. */
export const storedRecord = (page: Page): Promise<Record<string, any> | null> =>
  page.evaluate((key) => {
    const text = sessionStorage.getItem(key);
    return text === null ? null : JSON.parse(text);
  }, SESSION_KEY);

/** The regression export's served path, matched by glob. */
export const REGRESSION = '**/regression-*.json.gz';

/** Hold every regression response until the returned release is called. */
export async function holdRegression(page: Page): Promise<() => void> {
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route(REGRESSION, async (route) => { await held; await route.continue(); });
  return release;
}

/** Two animation frames and a task, so pending continuations run. */
export const settleFrames = (page: Page) =>
  page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 0)))));
