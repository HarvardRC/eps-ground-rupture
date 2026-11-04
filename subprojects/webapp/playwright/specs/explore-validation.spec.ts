// explore-validation.spec.ts (guided DDD §9.5 item 2): validation routing
// and focus for incomplete site, movement, and scarp selections,
// including review attempts from Results (§3, §5).

import { expect, test } from '@playwright/test';
import { manifest } from '../support';
import {
  MOVEMENT_HEADING, RESULTS_HEADING, SITE_HEADING,
  action, confirmGolden, confirmedCount, countText, gotoExplore, heading, setChecked, stepButton, typeEntry,
} from '../explore-support';

test.describe.configure({ timeout: 120_000 });

test('incomplete site conditions block progress, mark each group, and focus the first', async ({ page }) => {
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  for (const group of ['faultDip', 'depth', 'density', 'sediment']) {
    await expect(page.locator(`#gx-group-${group} .gx-required`)).toHaveText('Required');
  }
  await action(page, 'Continue to fault movement').click();
  await expect(heading(page)).toHaveText(SITE_HEADING);
  await expect(page.locator('#gx-faultDip-all')).toBeFocused();
  for (const [group, message] of [
    ['faultDip', 'Choose one or more fault angles.'],
    ['depth', 'Choose one or more sediment depths.'],
    ['density', 'Choose one or more sediment densities.'],
    ['sediment', 'Choose one or more sediment strength and structure values.'],
  ] as const) {
    await expect(page.locator(`#gx-error-${group}`)).toHaveText(message);
    await expect(page.locator(`#gx-${group}-all`)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator(`#gx-${group}-0`)).toHaveAttribute('aria-describedby', `gx-error-${group}`);
  }
  await expect(page.getByRole('alert').filter({ hasText: 'Choose one or more fault angles.' })).toHaveCount(1);

  // Fixing the first group moves the focus to the next incomplete one.
  await setChecked(page, '#gx-faultDip-0', true);
  await action(page, 'Continue to fault movement').click();
  await expect(page.locator('#gx-depth-all')).toBeFocused();
  await expect(page.locator('#gx-error-faultDip')).toBeHidden();
});

test('movement entries route review back to the first invalid field', async ({ page }) => {
  const max = String(manifest().slip_window_bounds.max);
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  for (const group of ['faultDip', 'depth', 'density', 'sediment']) await setChecked(page, `#gx-${group}-all`, true);
  await action(page, 'Continue to fault movement').click();

  await action(page, 'Review scenario').click();
  await expect(heading(page)).toHaveText(MOVEMENT_HEADING);
  await expect(page.locator('#gx-slipMax')).toBeFocused();
  await expect(page.locator('#gx-slipMax')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#gx-error-slipMax')).toHaveText('Enter the maximum fault slip in metres.');

  await typeEntry(page, 'slipMax', '9999');
  await expect(page.locator('#gx-feedback-slipMax')).toContainText(`The actual modeled maximum is ${max} m`);
  await action(page, 'Review scenario').click();
  await expect(page.locator('#gx-error-slipMax')).toHaveText(`The simulations cover slip up to ${max} m. Enter a value within that range.`);

  await typeEntry(page, 'slipMin', '2');
  await typeEntry(page, 'slipMax', '1');
  await action(page, 'Review scenario').click();
  await expect(page.locator('#gx-error-slipMax')).toHaveText('Maximum slip must be at least the minimum slip.');
  await expect(page.locator('#gx-slipMax')).toBeFocused();

  // Back on Site, the step's own route forward still validates first.
  await stepButton(page, 'site').click();
  await action(page, 'Continue to fault movement').click();
  await action(page, 'Review scenario').click();
  await expect(heading(page)).toHaveText(MOVEMENT_HEADING);
  await expect(page.locator('#gx-slipMax')).toBeFocused();
});

test('an empty scarp selection blocks review from Results with the confirmed result kept', async ({ page }) => {
  await gotoExplore(page);
  const ref = await confirmGolden(page, 'GS-6');
  await page.locator('#gx-refine-button').click();
  await expect(page.locator('#gx-refine-button')).toHaveAttribute('aria-expanded', 'true');
  await setChecked(page, '#gx-scarpClass-all', false);
  await page.locator('#gx-refinements').getByRole('button', { name: 'Review changes' }).click();
  await expect(heading(page)).toHaveText(RESULTS_HEADING);
  await expect(page.locator('#gx-scarpClass-all')).toBeFocused();
  await expect(page.locator('#gx-error-scarpClass')).toHaveText('Select one or more scarp types before review.');
  await expect(page.locator('#gx-scarpClass-all')).toHaveAttribute('aria-invalid', 'true');
  await expect(confirmedCount(page)).toHaveText(countText(ref.counts.matching_records));

  // The same block from the page's own Review scenario action.
  await page.locator('.gx-main > .gx-section-head').getByRole('button', { name: 'Review scenario' }).click();
  await expect(page.locator('#gx-scarpClass-all')).toBeFocused();
  await expect(page.locator('#gx-refine-button')).toHaveAttribute('aria-expanded', 'true');
});
