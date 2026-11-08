// explore-validation.spec.ts (guided DDD §9.5 item 2): validation routing
// and focus for incomplete site, movement, and scarp selections,
// including review attempts from Results (§3, §5).

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { manifest } from '../support';
import { action, answerEverySite, pressThumb, confirmedCount, confirmGolden, countText, expectStepClosed, gotoExplore, heading, MOVEMENT_HEADING, RESULTS_HEADING, setChecked, SITE_HEADING, stepButton, typeEntry } from '../explore-support';

test.describe.configure({ timeout: 120_000 });

test('incomplete site conditions: the Still-needed line, then a focused summary and the group boundaries', async ({ page }) => {
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  for (const group of ['faultDip', 'depth', 'density', 'sediment']) {
    await expect(page.locator(`#gx-group-${group} .gx-required`)).toHaveText('Required');
  }
  // The step list is a sequence indicator: steps not yet open are plain entries.
  for (const step of ['movement', 'review', 'results'] as const) await expectStepClosed(page, step);
  await expect(stepButton(page, 'intro')).toBeEnabled();
  await expect(stepButton(page, 'site')).toHaveAttribute('aria-current', 'step');
  // Before any attempt: a neutral line near the forward button, and no
  // error marking on arrival (guided DDD §12.1).
  const line = page.locator('.gx-still-needed');
  const summary = page.locator('#gx-issue-summary');
  await expect(line).toHaveText('Still needed: Fault angle · Sediment depth · Sediment density · Sediment strength and structure.');
  await expect(summary).toHaveCount(0);
  await expect(page.locator('#gre-explore .gx-invalid, #gre-explore [aria-invalid="true"]')).toHaveCount(0);
  await expect(page.locator('#gre-explore .gx-field-error:visible')).toHaveCount(0);
  // It follows the conditions as they change.
  await setChecked(page, '#gx-density-0', true);
  await expect(line).toHaveText('Still needed: Fault angle · Sediment depth · Sediment strength and structure.');
  await setChecked(page, '#gx-density-0', false);
  await expect(line).toHaveText('Still needed: Fault angle · Sediment depth · Sediment density · Sediment strength and structure.');
  // Each name moves focus to its group, without leaving the step.
  const url = page.url();
  await line.getByRole('link', { name: 'Sediment density' }).click();
  await expect(page.locator('#gx-group-density')).toBeFocused();
  await expect(heading(page)).toHaveText(SITE_HEADING);
  // Not a navigation: the theme's instant navigation never sees the fragment.
  expect(page.url()).toBe(url);

  // The forward action stays enabled; an unsuccessful click answers with a
  // visible summary that takes the focus, not the first Select all.
  const forward = action(page, 'Continue to fault slip');
  await expect(forward).toBeEnabled();
  await forward.click();
  await expect(heading(page)).toHaveText(SITE_HEADING);
  await expect(summary).toBeFocused();
  await expect(page.getByRole('group', { name: 'Choose values for 4 conditions before continuing.' })).toHaveCount(1);
  await expect(summary.getByRole('heading')).toHaveText('Choose values for 4 conditions before continuing.');
  await expect(summary.getByRole('link')).toHaveText(['Fault angle', 'Sediment depth', 'Sediment density', 'Sediment strength and structure']);
  await expect(line).toHaveCount(0);
  for (const [group, message] of [
    ['faultDip', 'Choose one or more fault angles.'],
    ['depth', 'Choose one or more sediment depths.'],
    ['density', 'Choose one or more sediment densities.'],
    ['sediment', 'Choose one or more sediment strength and structure values.'],
  ] as const) {
    // The group boundary and its message carry the error; the checkboxes and thumbs carry no invalid marks.
    await expect(page.locator(`#gx-error-${group}`)).toHaveText(message);
    await expect(page.locator(`#gx-group-${group}`)).toHaveClass(/gx-invalid/);
    await expect(page.locator(`#gx-group-${group} input[aria-invalid]`)).toHaveCount(0);
    const control = group === 'faultDip' || group === 'depth' ? `#gx-${group}-min` : `#gx-${group}-0`;
    await expect(page.locator(control)).toHaveAttribute('aria-describedby', `gx-error-${group}`);
  }
  // While its message shows, an unanswered range drops its own hint (§14.6 item 1).
  await expect(page.locator('#gx-empty-faultDip')).toBeHidden();
  // The focused summary speaks for itself; no alert repeats it.
  await expect(page.getByRole('alert').filter({ hasText: 'Choose' })).toHaveCount(0);

  // A corrected condition clears its message at once and leaves the summary.
  await pressThumb(page, 'faultDip', 'min', 'ArrowRight');
  await expect(page.locator('#gx-error-faultDip')).toBeHidden();
  await expect(page.locator('#gx-group-faultDip')).not.toHaveClass(/gx-invalid/);
  await expect(summary.getByRole('heading')).toHaveText('Choose values for 3 conditions before continuing.');
  await summary.getByRole('link', { name: 'Sediment depth' }).click();
  await expect(page.locator('#gx-group-depth')).toBeFocused();
  // Another attempt focuses the summary again.
  await forward.click();
  await expect(summary).toBeFocused();
  await page.locator('#gx-depth-full').click();
  await setChecked(page, '#gx-density-all', true);
  await expect(summary.getByRole('heading')).toHaveText('Choose a value for 1 condition before continuing.');
  await expect(summary.getByRole('link')).toHaveText(['Sediment strength and structure']);
  // Leaving the step ends the attempt: coming back shows the neutral line again.
  await action(page, 'Back').click();
  await action(page, 'Build your scenario').click();
  await expect(summary).toHaveCount(0);
  await expect(page.locator('#gre-explore .gx-invalid')).toHaveCount(0);
  await expect(line).toHaveText('Still needed: Sediment strength and structure.');
  await setChecked(page, '#gx-sediment-all', true);
  await expect(summary).toHaveCount(0);
  await expect(line).toHaveCount(0);
  await forward.click();
  await expect(heading(page)).toHaveText(MOVEMENT_HEADING);
});

/** Axe over the explorer's own region with the lane's tags (§7.5); the theme around it is the site's. */
async function axeExplorer(page: Page, state: string): Promise<void> {
  const results = await new AxeBuilder({ page }).include('#gre-explore').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect.soft(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`), `axe violations in ${state}`).toEqual([]);
}

test('axe: the Still-needed line, the summary, the emphasized groups, and the step entries (§12.1)', async ({ page }) => {
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  await expect(page.locator('.gx-still-needed')).toBeVisible();
  await axeExplorer(page, 'site step with the Still-needed line');
  await action(page, 'Continue to fault slip').click();
  await expect(page.locator('#gx-issue-summary')).toBeFocused();
  await axeExplorer(page, 'site step after an unsuccessful attempt');
  await answerEverySite(page);
  await action(page, 'Continue to fault slip').click();
  await action(page, 'Review scenario').click();
  await expect(page.locator('#gx-issue-summary')).toBeFocused();
  await axeExplorer(page, 'movement step after an unsuccessful attempt');
});

test('movement entries route review back to the first invalid field', async ({ page }) => {
  const max = String(manifest().slip_window_bounds.max);
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  await answerEverySite(page);
  await action(page, 'Continue to fault slip').click();
  const line = page.locator('.gx-still-needed');
  const summary = page.locator('#gx-issue-summary');
  await expect(line).toHaveText('Still needed: Maximum fault slip.');
  await expect(page.locator('#gre-explore [aria-invalid="true"]')).toHaveCount(0);
  await expect(page.locator('#gre-explore .gx-field-error:visible')).toHaveCount(0);

  await action(page, 'Review scenario').click();
  await expect(heading(page)).toHaveText(MOVEMENT_HEADING);
  await expect(summary).toBeFocused();
  await expect(summary.getByRole('heading')).toHaveText('Choose a value for 1 condition before continuing.');
  // A single numeric field keeps its own invalid mark (§12.1).
  await expect(page.locator('#gx-slipMax')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#gx-error-slipMax')).toHaveText('Enter the maximum fault slip in metres.');
  // The step's own entry in the list is no departure: the attempt stays.
  await stepButton(page, 'movement').click();
  await expect(summary).toHaveCount(1);
  await expect(page.locator('#gx-error-slipMax')).toHaveText('Enter the maximum fault slip in metres.');
  await summary.getByRole('link', { name: 'Maximum fault slip' }).click();
  await expect(page.locator('#gx-slipMax')).toBeFocused();

  // Typing clears the field's message at once; the line names it while it stays invalid.
  await typeEntry(page, 'slipMax', '9999');
  await expect(summary).toHaveCount(0);
  await expect(line).toHaveText('Still needed: Maximum fault slip.');
  await expect(page.locator('#gx-feedback-slipMax')).toContainText(`The actual modeled maximum is ${max} m`);
  await action(page, 'Review scenario').click();
  await expect(page.locator('#gx-error-slipMax')).toHaveText(`The simulations cover slip up to ${max} m. Enter a value within that range.`);

  await typeEntry(page, 'slipMin', '2');
  await typeEntry(page, 'slipMax', '1');
  await action(page, 'Review scenario').click();
  await expect(page.locator('#gx-error-slipMax')).toHaveText('Maximum slip must be at least the minimum slip.');
  await expect(summary).toBeFocused();
  // Correcting the other end clears the message it corrected, at once.
  await typeEntry(page, 'slipMin', '0.5');
  await expect(page.locator('#gx-error-slipMax')).toBeHidden();
  await expect(page.locator('#gx-slipMax')).not.toHaveAttribute('aria-invalid', 'true');
  await expect(summary).toHaveCount(0);
  await expect(line).toHaveCount(0);
  await typeEntry(page, 'slipMin', '2');

  // Back on Site, the step's own route forward still validates first.
  await stepButton(page, 'site').click();
  await action(page, 'Continue to fault slip').click();
  await action(page, 'Review scenario').click();
  await expect(heading(page)).toHaveText(MOVEMENT_HEADING);
  await expect(summary).toBeFocused();
});

test('an empty scarp selection blocks review from Results with the confirmed result kept', async ({ page }) => {
  await gotoExplore(page);
  const ref = await confirmGolden(page, 'GS-6');
  await page.locator('#gx-refine-button').click();
  await expect(page.locator('#gx-refine-button')).toHaveAttribute('aria-expanded', 'true');
  await setChecked(page, '#gx-scarpClass-all', false);
  await page.locator('#gx-refinements').getByRole('button', { name: 'Review changes' }).click();
  await expect(heading(page)).toHaveText(RESULTS_HEADING);
  const summary = page.locator('#gx-refinements #gx-issue-summary');
  await expect(summary).toBeFocused();
  await expect(summary.getByRole('link')).toHaveText(['Scarp types']);
  await expect(page.locator('#gx-error-scarpClass')).toHaveText('Select one or more scarp types before review.');
  await expect(page.locator('#gx-group-scarpClass')).toHaveClass(/gx-invalid/);
  await expect(page.locator('#gx-group-scarpClass input[aria-invalid]')).toHaveCount(0);
  await summary.getByRole('link', { name: 'Scarp types' }).click();
  await expect(page.locator('#gx-group-scarpClass')).toBeFocused();
  await expect(confirmedCount(page)).toHaveText(countText(ref.counts.matching_records));

  // The same block from the page's own Review scenario action.
  await page.locator('.gx-main > .gx-section-head').getByRole('button', { name: 'Review scenario' }).click();
  await expect(summary).toBeFocused();
  await expect(page.locator('#gx-refine-button')).toHaveAttribute('aria-expanded', 'true');
});

test('a review attempt from Results routes back to the first invalid earlier step', async ({ page }) => {
  await gotoExplore(page);
  const ref = await confirmGolden(page, 'GS-6');
  const count = countText(ref.counts.matching_records);

  // An emptied site group: review from Results returns to Site, focused on that group.
  // (A range cannot be emptied, so a checkbox group stands in, guided DDD §14.3.)
  await stepButton(page, 'site').click();
  await setChecked(page, '#gx-density-all', false);
  await stepButton(page, 'results').click();
  await page.locator('.gx-main > .gx-section-head').getByRole('button', { name: 'Review scenario' }).click();
  await expect(heading(page)).toHaveText(SITE_HEADING);
  await expect(page.locator('#gx-issue-summary')).toBeFocused();
  await expect(page.locator('#gx-issue-summary').getByRole('link')).toHaveText(['Sediment density']);
  await expect(page.locator('#gx-error-density')).toHaveText('Choose one or more sediment densities.');
  await setChecked(page, '#gx-density-all', true);

  // An invalid slip entry: review from Results returns to Movement, focused on the field.
  await stepButton(page, 'movement').click();
  await typeEntry(page, 'slipMax', '');
  await stepButton(page, 'results').click();
  await expect(confirmedCount(page)).toHaveText(count);
  await page.locator('.gx-pending').getByRole('button', { name: 'Return to review' }).click();
  await expect(heading(page)).toHaveText(MOVEMENT_HEADING);
  await expect(page.locator('#gx-issue-summary')).toBeFocused();
  await expect(page.locator('#gx-error-slipMax')).toHaveText('Enter the maximum fault slip in metres.');
  await stepButton(page, 'results').click();
  await expect(confirmedCount(page)).toHaveText(count);
});
