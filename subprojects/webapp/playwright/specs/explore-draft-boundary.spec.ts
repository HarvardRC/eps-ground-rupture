// explore-draft-boundary.spec.ts (guided DDD §9.5 item 3): the
// draft/confirmed boundary — pending banner, Discard changes, Start a
// new scenario, and retained results unchanged during edits (§3).

import { expect, test } from '@playwright/test';
import {
  INTRO_HEADING, MOVEMENT_HEADING, RESULTS_HEADING, SITE_HEADING,
  action, confirmGolden, confirmedCount, countText, gotoExplore, heading, setChecked, expectStepClosed, stepButton, typeEntry,
} from '../explore-support';

test.describe.configure({ timeout: 120_000 });

test('draft edits leave the confirmed result until review, and Discard restores the confirmation', async ({ page }) => {
  await gotoExplore(page);
  const ref = await confirmGolden(page, 'GS-6');
  const count = countText(ref.counts.matching_records);
  const window = ref.inputs.slip_window!;
  await expect(page.locator('.gx-pending')).toHaveCount(0);

  await stepButton(page, 'movement').click();
  await expect(heading(page)).toHaveText(MOVEMENT_HEADING);
  await typeEntry(page, 'slipMin', '0.01');
  await stepButton(page, 'results').click();
  await expect(page.locator('.gx-pending')).toContainText('You have unapplied changes');
  await expect(page.locator('.gx-pending')).toContainText('These results still describe your confirmed scenario.');
  await expect(confirmedCount(page)).toHaveText(count);
  await expect(page.locator('.gx-context')).toContainText(`Fault slip: ${window.min}–${window.max} m`);

  // A refinement edit joins the same draft.
  await page.locator('#gx-refine-button').click();
  await setChecked(page, '#gx-population-one_state_per_trial', true);
  await expect(confirmedCount(page)).toHaveText(count);
  await expect(page.locator('.gx-context')).toContainText('All stages within the slip range');

  await page.locator('.gx-pending').getByRole('button', { name: 'Discard changes' }).click();
  await expect(heading(page)).toHaveText(RESULTS_HEADING);
  await expect(page.locator('.gx-pending')).toHaveCount(0);
  await expect(confirmedCount(page)).toHaveText(count);
  await expect(page.locator('#gx-population-all_stages')).toBeChecked();
  await stepButton(page, 'movement').click();
  await expect(page.locator('#gx-slipMin')).toHaveValue(window.min);
  await expect(page.locator('#gx-slipMax')).toHaveValue(window.max);

  // Return to review from the banner leads to the draft review.
  await typeEntry(page, 'slipMin', '0.01');
  await stepButton(page, 'results').click();
  await page.locator('.gx-pending').getByRole('button', { name: 'Return to review' }).click();
  await expect(page.locator('.gx-review-section').nth(1)).toContainText(`0.01–${window.max} m fault slip`);
  await expect(stepButton(page, 'results')).toBeEnabled();
});

test('Start a new scenario clears the result and returns to the opening step, then unanswered site conditions', async ({ page }) => {
  await gotoExplore(page);
  await confirmGolden(page, 'GS-6');
  await page.locator('.gx-restart').getByRole('button', { name: 'Start a new scenario' }).click();
  // The opening step offers both entry points again (guided DDD §12.2).
  await expect(heading(page)).toHaveText(INTRO_HEADING);
  await expect(heading(page)).toBeFocused();
  await expect(action(page, 'Build your scenario')).toHaveCount(1);
  await expect(page.locator('#gx-sample-trigger')).toHaveCount(1);
  await expect(page.locator('#gre-explore > [role="status"]')).toHaveText('New scenario. Build your scenario or try a prefilled sample.');
  for (const step of ['site', 'movement', 'review', 'results'] as const) await expectStepClosed(page, step);
  await action(page, 'Build your scenario').click();
  await expect(heading(page)).toHaveText(SITE_HEADING);
  // The ranges are unanswered again (guided DDD §14.6 item 1); the checkbox groups are clear.
  await expect(page.locator('#gx-echo-faultDip')).toHaveText('Selected: none — 0 of 7 modeled angles.');
  await expect(page.locator('#gx-echo-depth')).toHaveText('Selected: none — 0 of 3 modeled depths.');
  for (const group of ['density', 'sediment']) {
    await expect(page.locator(`#gx-${group}-all`)).not.toBeChecked();
    await expect(page.locator(`#gx-group-${group} input[data-choice]:checked`)).toHaveCount(0);
  }
  for (const group of ['faultDip', 'depth']) await page.locator(`#gx-${group}-full`).click();
  for (const group of ['density', 'sediment']) await setChecked(page, `#gx-${group}-all`, true);
  await action(page, 'Continue to fault slip').click();
  await expect(page.locator('#gx-mode-slip')).toBeChecked();
  await expect(page.locator('#gx-slipMin')).toHaveValue('0');
  await expect(page.locator('#gx-slipMax')).toHaveValue('');
});
