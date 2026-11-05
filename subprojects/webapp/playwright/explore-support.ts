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
export const SITE_HEADING = 'Describe the site conditions';
export const MOVEMENT_HEADING = 'Choose the assumed fault movement';
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
export const countText = (n: number): string => `${formatCount(n)} matching records`;

type Group = 'faultDip' | 'depth' | 'density' | 'sediment';

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

/** Select exactly the golden inputs' site values, using Select all where the input is the whole dictionary. */
export async function chooseSite(page: Page, inputs: Inputs): Promise<void> {
  const m = manifest();
  const groups: readonly [Group, readonly string[], readonly string[]][] = [
    ['faultDip', m.trial_columns.fault_dip.map((d) => `${d}°`), inputs.fault_dip.map((d) => `${d}°`)],
    ['depth', m.trial_columns.depth.map((d) => `${d} m`), inputs.depth.map((d) => `${d} m`)],
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
  await action(page, 'Continue to fault movement').click();
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
  // Clear each group (Select all on, then off), then choose the new values.
  for (const group of ['faultDip', 'depth', 'density', 'sediment'] as const) {
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
