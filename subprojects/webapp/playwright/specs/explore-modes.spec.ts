// explore-modes.spec.ts (guided DDD §9.5 item 4): displacement-mode
// preservation across switches and discard (PDD D-28; §3).

import { expect, test } from '@playwright/test';
import { gs } from '../support';
import { action, answerEverySite, confirmGolden, gotoExplore, setChecked, stepButton, typeEntry } from '../explore-support';

test.describe.configure({ timeout: 120_000 });

test('each mode keeps its own entries across switches', async ({ page }) => {
  const offset = gs('GS-1').inputs.offset_max!;
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  await answerEverySite(page);
  await action(page, 'Continue to fault slip').click();
  await expect(page.locator('.gx-hint').filter({ hasText: 'Your entries are kept when you switch modes.' })).toHaveCount(1);
  await typeEntry(page, 'slipMin', '0.5');
  await typeEntry(page, 'slipMax', '1.5');
  await setChecked(page, '#gx-mode-offset', true);
  await expect(page.locator('#gx-offsetMax')).toHaveValue('');
  await typeEntry(page, 'offsetMax', offset);
  await setChecked(page, '#gx-mode-slip', true);
  await expect(page.locator('#gx-slipMin')).toHaveValue('0.5');
  await expect(page.locator('#gx-slipMax')).toHaveValue('1.5');
  await setChecked(page, '#gx-mode-offset', true);
  await expect(page.locator('#gx-offsetMax')).toHaveValue(offset);

  // Only the selected mode is reviewed; the other mode's entry survives.
  await action(page, 'Review scenario').click();
  await expect(page.locator('.gx-review-section').nth(1)).toContainText(`0–${offset} m surface offset`);
  await stepButton(page, 'movement').click();
  await setChecked(page, '#gx-mode-slip', true);
  await expect(page.locator('#gx-slipMax')).toHaveValue('1.5');
});

test('Discard restores both modes as they stood at confirmation', async ({ page }) => {
  await gotoExplore(page);
  const ref = await confirmGolden(page, 'GS-6');
  const window = ref.inputs.slip_window!;
  await stepButton(page, 'movement').click();
  await typeEntry(page, 'slipMax', '0.03');
  await setChecked(page, '#gx-mode-offset', true);
  await typeEntry(page, 'offsetMax', gs('GS-1').inputs.offset_max!);
  await stepButton(page, 'results').click();
  await page.locator('.gx-pending').getByRole('button', { name: 'Discard changes' }).click();
  await stepButton(page, 'movement').click();
  await expect(page.locator('#gx-mode-slip')).toBeChecked();
  await expect(page.locator('#gx-slipMin')).toHaveValue(window.min);
  await expect(page.locator('#gx-slipMax')).toHaveValue(window.max);
  await setChecked(page, '#gx-mode-offset', true);
  await expect(page.locator('#gx-offsetMax')).toHaveValue('');
});
