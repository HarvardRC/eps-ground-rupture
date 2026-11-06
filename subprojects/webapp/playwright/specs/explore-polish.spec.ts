// explore-polish.spec.ts (guided DDD §§11.1–11.2; PDD D-45): the adopted
// wording on the guided page, the shared builders' output included
// through the guided copy overlay (ruling (A), 2026-11-05); the results
// screen with the compact confirmed scenario and its critical warning
// above the results and the full scenario behind View full scenario;
// the Scarp dip card's provisional mark; physical density order; help
// disclosures that only repeated their sentence replaced by the glossary
// link; the plain-language messages for refused numbers.

import { expect, test, type Page } from '@playwright/test';
import { DOWNLOAD_CONTENTS } from '../../src/explore/wording';
import {
  action, confirmGolden, gotoExplore, pickSample, setChecked, stepButton, typeEntry,
} from '../explore-support';

test.describe.configure({ timeout: 120_000 });

/** The illustrative sample confirmed as filled: offset mode, 30° partly covered, low slip included. */
async function confirmIllustrative(page: Page): Promise<void> {
  await gotoExplore(page);
  await pickSample(page, 'illustrative');
  await action(page, 'Continue to fault movement').click();
  await page.locator('#gx-offset-feedback table').waitFor();
  await action(page, 'Review scenario').click();
  await action(page, 'Show results').click();
  await page.locator('.gx-context').waitFor();
}

test('the results screen: compact scenario and its warning first, results next, the full scenario behind a disclosure', async ({ page }) => {
  await confirmIllustrative(page);
  const context = page.locator('.gx-context');
  await expect(context.locator('h3')).toHaveText('Your confirmed scenario');
  await expect(context.locator('.gx-compact')).toHaveText([
    'Fault angle: 30°; 40° · Sediment depth: 5 m · Sediment density: Dense · Sediment strength and structure: Layered: Strong; Uniform: Strong',
    'Movement: 0–3 m surface offset · Included: All stages within the slip range · All scarp types (no filter)',
  ]);
  // The critical coverage warning stays visible; the conversion table does not repeat up here.
  await expect(context.locator('.gx-warning')).toContainText('The simulations do not cover the full requested range');
  await expect(context.locator('table')).toHaveCount(0);

  // Measurement choices and the chart come before the full scenario.
  const full = page.locator('details#gx-full-scenario');
  await expect(full).not.toHaveAttribute('open');
  await expect(full.locator('summary')).toHaveText('View full scenario');
  const order = await page.evaluate(() => ['.gx-context', '.gx-selector', '.gx-measurement', '#gx-full-scenario', '.gx-footer']
    .map(selector => document.querySelector(selector)).every((node, i, all) => i === 0 || Boolean(all[i - 1]!.compareDocumentPosition(node!) & Node.DOCUMENT_POSITION_FOLLOWING)));
  expect(order).toBe(true);
  // Inside: the full summary and the conversion table, with its adopted heading.
  await full.locator('summary').click();
  await expect(full.locator('dl.gx-summary dt')).toHaveText(['Fault angle', 'Sediment depth', 'Sediment density', 'Sediment strength and structure']);
  await expect(full.locator('h4')).toHaveText('Estimated fault slip at depth');
  await expect(full.locator('table.gx-conversions tbody tr')).toHaveCount(2);
  // Its open state survives a re-render (another measurement).
  await page.locator('#gx-measurement-dzw').click();
  await expect(page.locator('details#gx-full-scenario')).toHaveAttribute('open');
});

test('the adopted wording reaches the guided page, the shared builders included', async ({ page }) => {
  await confirmIllustrative(page);
  await expect(page.locator('.gx-context .gx-section-head strong')).toHaveText(/^[\d,]+ matching simulation stages$/);
  await expect(page.locator('.gx-measurement .gx-section-head strong')).toHaveText(/^[\d,]+ measurements used$/);
  await expect(page.locator('.gx-statistics .gx-hint').first()).toHaveText('Matching simulation stages.');
  const rows = page.locator('.gx-statistics tbody th');
  await expect(rows.nth(0)).toHaveText('Measurements used');
  await expect(rows.nth(1)).toHaveText('Missing values (excluded)');
  // The low-slip caveat, through the overlay.
  await expect(page.locator('.gx-warning').filter({ hasText: 'very small slip values' })).toContainText('Your selected range includes very small slip values');
  // The chart's accessible name and the histogram table.
  await expect(page.locator('#gx-chart svg')).toHaveAttribute('aria-label', /histogram of [\d,]+ measurements used/);
  await expect(page.locator('#gx-chart svg')).toContainText('Measurements used');
  await expect(page.locator('#gx-chart svg')).not.toContainText('Valid');
  const table = page.locator('#gx-chart-table details');
  await expect(table.locator('summary')).toHaveText('Histogram counts by value range');
  await expect(table.locator('caption')).toContainText('measurements used per bin, by scarp type');
  await page.locator('#gx-chart-cumulative').click();
  await expect(page.locator('#gx-chart svg')).toHaveAttribute('aria-label', /cumulative distribution of [\d,]+ measurements used/);
  await expect(page.locator('#gx-chart')).toContainText('rely on all measurements used for this scenario');
  // No replaced wording anywhere on the page.
  for (const old of ['valid measurements', 'Valid count', 'Excluded null count', 'matching records', 'Your window includes', 'Histogram bin data', 'Corresponding fault slip', 'Download results']) {
    await expect(page.locator('#gre-explore')).not.toContainText(old);
  }
  // The download states its contents before the click.
  const download = page.getByRole('button', { name: 'Download data (ZIP)' });
  await expect(download).toHaveAccessibleDescription(DOWNLOAD_CONTENTS);
  await expect(page.locator('#gx-download-contents')).toBeVisible();
});

test('Scarp dip carries its provisional mark before selection', async ({ page }) => {
  await confirmIllustrative(page);
  const card = page.locator('#gx-measurement-scarp_dip');
  await expect(card).toHaveAttribute('aria-pressed', 'false');
  await expect(card.locator('.gx-card-flag')).toHaveText('Provisional data');
  for (const other of ['scarp_height', 'dzw']) await expect(page.locator(`#gx-measurement-${other} .gx-card-flag`)).toHaveCount(0);
});

test('density choices order physically, and the summaries follow', async ({ page }) => {
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  await expect(page.locator('#gx-group-density .gx-choice span')).toHaveText(['Dense', 'Medium', 'Loose']);
  // Each choice still selects its own value.
  await setChecked(page, '#gx-group-density .gx-choice:has-text("Loose") input', true);
  await setChecked(page, '#gx-group-density .gx-choice:has-text("Dense") input', true);
  await stepButton(page, 'intro').click();
  await action(page, 'Build your scenario').click();
  await expect(page.locator('#gx-group-density .gx-choice.gx-selected span')).toHaveText(['Dense', 'Loose']);
});

test('site help that only repeated its sentence gives way to the glossary link; movement help stays', async ({ page }) => {
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  for (const group of ['faultDip', 'depth', 'density', 'sediment']) {
    const fieldset = page.locator(`#gx-group-${group}`);
    await expect(fieldset.locator('details.gx-help')).toHaveCount(0);
    await expect(fieldset.locator('p').first().getByRole('link', { name: /Read the glossary/ })).toHaveCount(1);
  }
  await stepButton(page, 'intro').click();
  await pickSample(page, 'kern');
  await action(page, 'Continue to fault movement').click();
  await expect(page.locator('details.gx-help summary')).toHaveText(['How is surface offset related to fault slip?']);
});

test('a refused number says which rule it broke', async ({ page }) => {
  await gotoExplore(page);
  await pickSample(page, 'kern');
  await action(page, 'Continue to fault movement').click();
  await page.locator('#gx-offset-feedback table').waitFor();
  const error = page.locator('#gx-error-offsetMax');
  await typeEntry(page, 'offsetMax', 'abc');
  await action(page, 'Review scenario').click();
  await expect(error).toHaveText('Enter 0 or a positive number, such as 0.5.');
  await typeEntry(page, 'offsetMax', '0.123456789012345');
  await action(page, 'Review scenario').click();
  await expect(error).toHaveText('Use at most 16 characters, counting the decimal point and the 0 before it.');
  await expect(page.locator('#gre-explore')).not.toContainText('normalization');
});

test('Exit walkthrough leaves the walkthrough', async ({ page }) => {
  await gotoExplore(page);
  await confirmGolden(page, 'GS-1');
  await action(page, 'Walk me through results').click();
  await expect(page.locator('.gx-guide-header .gx-step')).toHaveText('Results walkthrough · 1 of 5');
  await page.locator('.gx-guide-header').getByRole('button', { name: 'Exit walkthrough' }).click();
  await expect(page.locator('.gx-guide-header')).toHaveCount(0);
});
