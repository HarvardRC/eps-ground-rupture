// explore-continuity.spec.ts (guided DDD §9.5 item 6): reload restores
// work and says so; an injected corrupt or version-mismatched record
// requires the explicit fresh-start choice; a new context starts fresh
// (§9.2, PDD D-38 and §7.3); a stalled restore is cancelled as soon as
// the reader supersedes it (G-16).

import { expect, test } from '@playwright/test';
import { pointer } from '../support';
import {
  INTRO_HEADING, MOVEMENT_HEADING, RESULTS_HEADING, REVIEW_HEADING, SESSION_KEY, SITE_HEADING,
  action, confirmGolden, confirmedCount, countText, explorerReady, gotoExplore, heading, setChecked, stepButton, storedRecord,
  REGRESSION, holdRegression, pickSample, settleFrames, typeEntry,
} from '../explore-support';

test.describe.configure({ timeout: 120_000 });

const RESTORED = 'Restored the work in this tab.';
const KEPT = 'Your work stays in this tab, including across a reload. Closing the tab or opening a new one starts a fresh scenario.';

test('reload restores the draft, confirmed result, step, and display, and says so', async ({ page }) => {
  await gotoExplore(page);
  await expect(page.locator('.gx-session-note')).toHaveText(KEPT);
  await page.reload();
  await explorerReady(page);
  await expect(heading(page)).toHaveText(INTRO_HEADING);
  await expect(page.locator('.gx-restored')).toHaveCount(0);

  const ref = await confirmGolden(page, 'GS-1');
  await page.locator('#gx-measurement-dzw').click();
  await page.locator('#gx-chart-cumulative').click();
  await page.locator('#gx-refine-button').click();
  await setChecked(page, '#gx-population-one_state_per_trial', true);
  const saved = await storedRecord(page);
  expect(Object.keys(saved!).sort()).toEqual(['confirmed', 'dataVersion', 'display', 'draft', 'record', 'step']);
  expect(JSON.stringify(saved)).not.toContain('matchingRecords');

  await page.reload();
  await explorerReady(page);
  await expect(confirmedCount(page)).toHaveText(countText(ref.counts.matching_records));
  await expect(heading(page)).toHaveText(RESULTS_HEADING);
  await expect(page.locator('.gx-restored')).toHaveText(RESTORED);
  await expect(page.locator('.gx-restored')).toHaveAttribute('role', 'status');
  await expect(page.locator('#gx-measurement-dzw')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#gx-chart-cumulative')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.gx-pending')).toContainText('You have unapplied changes');
  await expect(page.locator('#gx-population-one_state_per_trial')).toBeChecked();
  await expect(page.locator('.gx-guide-header')).toHaveCount(0);

  await page.locator('#gx-measurement-scarp_dip').click();
  await expect(page.locator('.gx-restored')).toHaveCount(0);
});

test('a corrupt record requires Start a new scenario and is kept until then', async ({ page }) => {
  await gotoExplore(page);
  await page.evaluate((key) => sessionStorage.setItem(key, '{"record":1,'), SESSION_KEY);
  await page.reload();
  await explorerReady(page);
  await expect(heading(page)).toHaveText(INTRO_HEADING);
  await expect(page.locator('.gx-restore-blocked')).toContainText('The work saved in this tab could not be read.');
  await expect(action(page, 'Build your scenario')).toHaveCount(0);
  await expect(page.locator('#gx-sample-trigger')).toHaveCount(0);
  await expect(page.locator('.gx-restored')).toHaveCount(0);
  expect(await page.evaluate((key) => sessionStorage.getItem(key), SESSION_KEY)).toBe('{"record":1,');
  await page.locator('#gx-restore-new').click();
  await expect(heading(page)).toHaveText(SITE_HEADING);
  const fresh = await storedRecord(page);
  expect(fresh!.step).toBe('site');
  expect(fresh!.confirmed).toBeNull();
});

test('a record from another data release requires the explicit fresh start', async ({ page }) => {
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  const record = await storedRecord(page);
  expect(record!.dataVersion).toBe(pointer().export_version);
  const other = JSON.stringify({ ...record, dataVersion: `${pointer().export_version}-earlier` });
  await page.evaluate(([key, value]) => sessionStorage.setItem(key, value), [SESSION_KEY, other] as const);
  await page.reload();
  await explorerReady(page);
  await expect(page.locator('.gx-restore-blocked')).toContainText('The data release changed since this tab last used it.');
  expect(await page.evaluate((key) => sessionStorage.getItem(key), SESSION_KEY)).toBe(other);
  await expect(stepButton(page, 'site')).toBeDisabled();
});

/** A new context with the running project's viewport and device emulation. */
const projectContext = (browser: import('@playwright/test').Browser) => {
  const use = test.info().project.use;
  return browser.newContext({ baseURL: use.baseURL, viewport: use.viewport, isMobile: use.isMobile, hasTouch: use.hasTouch });
};

test('a new tab and a new browser context start fresh', async ({ page, browser }) => {
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  await setChecked(page, '#gx-faultDip-0', true);
  const tab = await page.context().newPage();
  await tab.goto('explore/');
  await explorerReady(tab);
  await expect(tab.locator('#gx-heading')).toHaveText(INTRO_HEADING);
  await expect(tab.locator('.gx-restored')).toHaveCount(0);
  await tab.close();
  const context = await projectContext(browser);
  try {
    const fresh = await context.newPage();
    await fresh.goto('explore/');
    await explorerReady(fresh);
    await expect(fresh.locator('#gx-heading')).toHaveText(INTRO_HEADING);
    await expect(fresh.locator('.gx-restored')).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('a Review reload in offset mode shows the conversion without a confirmation', async ({ page }) => {
  await gotoExplore(page);
  await pickSample(page, 'illustrative');
  await action(page, 'Continue to fault movement').click();
  await page.locator('#gx-offset-feedback table').waitFor();
  await action(page, 'Review scenario').click();
  await page.reload();
  await explorerReady(page);
  await expect(heading(page)).toHaveText('Review your scenario');
  await expect(page.locator('.gx-review-section table.gx-conversions')).toHaveCount(1);
  await expect(page.locator('.gx-review-section .gx-warning')).toContainText('At 30°');
  await expect(page.locator('.gx-restored')).toHaveText(RESTORED);
});

test('a save failing mid-session clears the older record, so reload starts fresh', async ({ browser }) => {
  const context = await projectContext(browser);
  try {
    await context.addInitScript(() => {
      const original = Storage.prototype.setItem;
      let saves = 0;
      Storage.prototype.setItem = function (key: string, value: string) {
        saves += 1;
        if (saves > 3) throw new DOMException('full', 'QuotaExceededError');
        return original.call(this, key, value);
      };
    });
    const tab = await context.newPage();
    await tab.goto('explore/');
    await explorerReady(tab);
    await tab.locator('#gre-explore .gx-main button', { hasText: 'Build your scenario' }).click();
    for (const id of ['#gx-faultDip-0', '#gx-depth-0', '#gx-density-0']) await tab.locator(id).click();
    expect(await tab.evaluate((key) => sessionStorage.getItem(key), SESSION_KEY)).toBeNull();
    // The failed save switched this mount back to the first-version wording.
    await tab.locator('#gre-explore .gx-steps button[data-step="intro"]').click();
    await expect(tab.locator('.gx-session-note')).toHaveText(
      'Your choices are kept while this page remains open. Reloading or leaving and returning starts a new draft.',
    );
    await tab.reload();
    await explorerReady(tab);
    await expect(tab.locator('#gx-heading')).toHaveText(INTRO_HEADING);
    await expect(tab.locator('.gx-restored')).toHaveCount(0);
  } finally {
    await context.close();
  }
});

// G-16: a stalled restore must not hold the busy state once the reader
// supersedes it. The regression response is held for the whole test;
// navigation cancels the restore at once (§9.2, step 3).
const INTERRUPTED = 'Restoring the results was interrupted.';

test('superseding a stalled restore releases Show results at once, and the late fetch changes nothing', async ({ page }) => {
  await gotoExplore(page);
  await confirmGolden(page, 'GS-1');
  const release = await holdRegression(page);
  await page.reload();
  await explorerReady(page);
  await expect(page.locator('.gx-restoring')).toHaveText('Recalculating the results of your confirmed scenario…');

  // Navigate while the conversion fetch is still held: the restore is
  // cancelled now, not when the fetch settles.
  await stepButton(page, 'movement').click();
  await expect(heading(page)).toHaveText(MOVEMENT_HEADING);
  await expect(page.locator('.gx-restoring')).toHaveCount(0);
  await expect(page.locator('.gx-restore-retry')).toContainText(INTERRUPTED);

  // A slip-mode draft needs no conversion data, so Show results works while the fetch is still held.
  await setChecked(page, '#gx-mode-slip', true);
  await typeEntry(page, 'slipMin', '0');
  await typeEntry(page, 'slipMax', '1');
  await action(page, 'Return to review').click();
  await expect(heading(page)).toHaveText(REVIEW_HEADING);
  await expect(action(page, 'Show results')).toBeEnabled();
  await action(page, 'Show results').click();
  await expect(heading(page)).toHaveText(RESULTS_HEADING);
  await expect(page.locator('.gx-context')).toContainText('Movement: 0–1 m fault slip');
  const count = await confirmedCount(page).textContent();
  await expect(page.locator('.gx-restore-retry')).toHaveCount(0);

  // The late continuation leaves every shared flag alone.
  release();
  await page.waitForResponse(REGRESSION);
  await settleFrames(page);
  await expect(heading(page)).toHaveText(RESULTS_HEADING);
  await expect(page.locator('.gx-restored')).toHaveCount(0);
  // Prove the held response was processed before the remaining checks: the
  // offset conversion table renders only once the regression has loaded.
  await stepButton(page, 'movement').click();
  await setChecked(page, '#gx-mode-offset', true);
  await page.locator('#gx-offset-feedback table').waitFor();
  await settleFrames(page);
  await stepButton(page, 'results').click();
  await expect(heading(page)).toHaveText(RESULTS_HEADING);
  await expect(confirmedCount(page)).toHaveText(count!);
  await expect(page.locator('.gx-context')).toContainText('Movement: 0–1 m fault slip');
  await expect(page.locator('.gx-restored')).toHaveCount(0);
  await expect(page.locator('.gx-restoring')).toHaveCount(0);
  await expect(page.locator('.gx-restore-retry')).toHaveCount(0);
  await page.unroute(REGRESSION);
  await stepButton(page, 'review').click();
  await expect(action(page, 'Show results')).toBeEnabled();
});

test('typing during a stalled restore cancels it in place', async ({ page }) => {
  await gotoExplore(page);
  await confirmGolden(page, 'GS-1');
  await stepButton(page, 'movement').click();
  await expect(heading(page)).toHaveText(MOVEMENT_HEADING);
  const release = await holdRegression(page);
  await page.reload();
  await explorerReady(page);
  await expect(heading(page)).toHaveText(MOVEMENT_HEADING);
  await expect(page.locator('.gx-restoring')).toHaveCount(1);
  await page.locator('#gx-offsetMax').pressSequentially('5');
  await expect(page.locator('#gx-offsetMax')).toBeFocused();
  await expect(page.locator('.gx-restoring')).toHaveCount(0);
  await expect(page.locator('.gx-restore-retry')).toContainText(INTERRUPTED);
  release();
  await page.waitForResponse(REGRESSION);
  // Prove the held response was processed: the conversion table renders only once the regression has loaded.
  await page.locator('#gx-offset-feedback table').waitFor();
  await settleFrames(page);
  await expect(page.locator('.gx-restore-retry')).toContainText(INTERRUPTED);
  await expect(page.locator('.gx-restored')).toHaveCount(0);
  await expect(stepButton(page, 'results')).toBeDisabled();
  await page.unroute(REGRESSION);
  await page.locator('#gx-retry-restore').click();
  await expect(stepButton(page, 'results')).toBeEnabled();
});
