// explore-sample.spec.ts (guided DDD §9.5 item 5): sample inputs — the
// silent fresh fill, both ask-before-replace outcomes, and confirmed
// results untouched (§9.1, PDD D-37).

import { expect, test, type Page } from '@playwright/test';
import {
  SITE_HEADING, action, confirmGolden, confirmedCount, countText, gotoExplore, heading, setChecked, stepButton,
} from '../explore-support';

test.describe.configure({ timeout: 120_000 });

const STATUS = 'These are sample inputs, not recommended site values. Change anything.';
const QUESTION = 'Replace your current choices with the sample inputs?';

/** The checked site choices by accessible name, in page order. */
const checkedSite = (page: Page) =>
  page.locator('.gx-site-grid input[data-choice]:checked').evaluateAll((inputs) =>
    inputs.map((input) => input.getAttribute('aria-label') ?? input.closest('label')!.textContent!.trim()),
  );

test('a fresh draft fills silently, labeled as sample inputs', async ({ page }) => {
  let dialogs = 0;
  page.on('dialog', (d) => { dialogs += 1; void d.dismiss(); });
  await gotoExplore(page);
  await expect(page.locator('#gx-sample')).toHaveText('Try sample inputs');
  await expect(page.locator('#gx-sample')).toHaveAttribute('aria-describedby', 'gx-sample-hint');
  await expect(page.locator('#gx-sample-hint')).toHaveText('Sample inputs, not recommended site values.');
  await page.locator('#gx-sample').click();
  await expect(heading(page)).toHaveText(SITE_HEADING);
  await expect(page.locator('.gx-sample-status')).toHaveText(STATUS);
  await expect(page.locator('.gx-sample-status')).toHaveAttribute('role', 'status');
  expect(await checkedSite(page)).toEqual(['30°', '40°', '5 m', 'Dense', 'Uniform sediment: Strong', 'Layered sediment: Strong']);

  await action(page, 'Continue to fault movement').click();
  await expect(page.locator('.gx-sample-status')).toHaveCount(0);
  await expect(page.locator('#gx-mode-offset')).toBeChecked();
  await expect(page.locator('#gx-offsetMax')).toHaveValue('3');
  // The deliberate coverage demonstration at 30° (D-37), not at 40°.
  await expect(page.locator('#gx-offset-feedback .gx-warning')).toContainText('At 30°');
  await expect(page.locator('#gx-offset-feedback .gx-warning')).not.toContainText('At 40°');
  expect(dialogs).toBe(0);
});

test('with a confirmed scenario, Keep my choices keeps them and Use the sample replaces only the draft', async ({ page }) => {
  let dialogs = 0;
  page.on('dialog', (d) => { dialogs += 1; void d.dismiss(); });
  await gotoExplore(page);
  const ref = await confirmGolden(page, 'GS-6');
  const count = countText(ref.counts.matching_records);
  await page.locator('#gx-refine-button').click();
  await setChecked(page, '#gx-population-one_state_per_trial', true);

  await stepButton(page, 'intro').click();
  await page.locator('#gx-sample').click();
  await expect(page.locator('#gx-sample-question')).toHaveText(QUESTION);
  await expect(page.locator('#gx-sample-question')).toBeFocused();
  await expect(action(page, 'Build your scenario')).toHaveCount(0);
  await action(page, 'Keep my choices').click();
  await expect(page.locator('#gx-sample')).toBeFocused();
  await stepButton(page, 'results').click();
  await expect(page.locator('#gx-population-one_state_per_trial')).toBeChecked();

  await stepButton(page, 'intro').click();
  await page.locator('#gx-sample').click();
  await action(page, 'Use the sample').click();
  await expect(heading(page)).toHaveText(SITE_HEADING);
  await expect(page.locator('.gx-sample-status')).toHaveText(STATUS);
  await stepButton(page, 'results').click();
  await expect(confirmedCount(page)).toHaveText(count);
  await expect(page.locator('.gx-pending')).toContainText('You have unapplied changes');
  await expect(page.locator('#gx-population-all_stages')).toBeChecked();
  expect(dialogs).toBe(0);
});

test('an edited draft without a confirmation also asks first', async ({ page }) => {
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  await setChecked(page, '#gx-faultDip-0', true);
  await stepButton(page, 'intro').click();
  await page.locator('#gx-sample').click();
  await expect(page.locator('#gx-sample-question')).toHaveText(QUESTION);
  await action(page, 'Keep my choices').click();
  await action(page, 'Build your scenario').click();
  await expect(page.locator('#gx-faultDip-0')).toBeChecked();
  await expect(page.locator('.gx-sample-status')).toHaveCount(0);
});
