// explore-defects.spec.ts (guided DDD §11.3; PDD D-45): every guided
// disclosure's label clears the theme's info icon and chevron; a failed
// calculation claims earlier results only when there are some; the
// version-mismatch message and its control agree.

import { gunzipSync, gzipSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import {
  action, explorerReady, gotoExplore, pickSample, setChecked, stepButton, typeEntry, REGRESSION,
} from '../explore-support';
import { Net, manifest, pointerName, servedData } from '../support';

test.describe.configure({ timeout: 120_000 });

/** Each visible summary's label against the theme's absolutely placed icon (left) and chevron (right). */
const clearances = (page: Page) => page.evaluate(() => [...document.querySelectorAll('#gre-explore details > summary')]
  .filter((summary) => (summary as HTMLElement).offsetParent !== null)
  .map((summary) => {
    const box = summary.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(summary);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0);
    const before = getComputedStyle(summary, '::before'), after = getComputedStyle(summary, '::after');
    const icon = before.content !== 'none' && before.position === 'absolute' ? parseFloat(before.left) + parseFloat(before.width) : 0;
    const chevron = after.content !== 'none' && after.position === 'absolute' ? parseFloat(after.right) + parseFloat(after.width) : 0;
    const left = Math.min(...rects.map((r) => r.left)) - box.left;
    const right = box.right - Math.max(...rects.map((r) => r.right));
    return { label: (summary.textContent ?? '').trim().slice(0, 40), clear: icon > 0 && left >= icon && right >= chevron };
  }));

async function expectClear(page: Page, where: string): Promise<void> {
  const found = await clearances(page);
  expect(found.length, `${where}: disclosures present`).toBeGreaterThan(0);
  expect(found.filter((item) => !item.clear), `${where}: overlapping labels`).toEqual([]);
}

test('every guided disclosure label clears the theme\'s icon and chevron', async ({ page }) => {
  await gotoExplore(page);
  await pickSample(page, 'illustrative');
  await expectClear(page, 'site conditions');
  await action(page, 'Continue to fault slip').click();
  await page.locator('#gx-offset-feedback table').waitFor();
  await expectClear(page, 'fault movement');
  await action(page, 'Review scenario').click();
  await action(page, 'Show results').click();
  await page.locator('.gx-context').waitFor();
  await page.locator('#gx-refine-button').click();
  await expectClear(page, 'results');
  // Open, a disclosure keeps its label clear too.
  await page.locator('#gx-full-scenario summary').click();
  await page.locator('#gx-stage-example summary').click();
  await expectClear(page, 'results, disclosures open');
  // A larger default font scales the theme's icon; the label's clearance scales with it.
  await page.evaluate(() => { document.documentElement.style.fontSize = '170%'; });
  await expectClear(page, 'results, larger font');
});

/** Conversion data without the 20° coefficients: the movement and review steps convert only the selected angles, the calculation converts them all and fails. */
async function conversionWithoutTwenty(page: Page): Promise<void> {
  const name = manifest().files.regression_export;
  const raw = JSON.parse(gunzipSync(servedData(name)).toString('utf8')) as { coefficients: { fault_dip: number }[] };
  raw.coefficients = raw.coefficients.filter((row) => row.fault_dip !== 20);
  const body = gzipSync(Buffer.from(JSON.stringify(raw), 'utf8'));
  await page.route(REGRESSION, (route) => route.fulfill({ status: 200, contentType: 'application/gzip', body }));
}

async function showOffsetResults(page: Page): Promise<void> {
  await action(page, 'Continue to fault slip').click();
  await page.locator('#gx-offset-feedback table').waitFor();
  await action(page, 'Review scenario').click();
  await action(page, 'Show results').click();
}

test('a first failed calculation claims no earlier results', async ({ page }) => {
  await conversionWithoutTwenty(page);
  await gotoExplore(page);
  await pickSample(page, 'illustrative');
  await showOffsetResults(page);
  const alert = page.locator('#gre-explore > p.gx-sr-only[role="alert"]');
  const expected = 'We couldn’t calculate results. Your entries are still here. Select Show results to try again.';
  await expect(alert).toHaveText(expected);
  await expect(page.locator('#gre-explore')).toContainText(expected);
  await expect(page.locator('#gre-explore')).not.toContainText('previous');
  await expect(page.locator('.gx-context')).toHaveCount(0);
});

test('a failed recalculation says the earlier results are unchanged', async ({ page }) => {
  await conversionWithoutTwenty(page);
  await gotoExplore(page);
  await pickSample(page, 'illustrative');
  // First results in slip mode, which needs no conversion.
  await action(page, 'Continue to fault slip').click();
  await setChecked(page, '#gx-mode-slip', true);
  await action(page, 'Review scenario').click();
  await action(page, 'Show results').click();
  await page.locator('.gx-context').waitFor();
  const before = await page.locator('.gx-context .gx-section-head strong').textContent();
  // Then the offset scenario, whose calculation fails.
  await stepButton(page, 'movement').click();
  await setChecked(page, '#gx-mode-offset', true);
  await typeEntry(page, 'offsetMax', '2');
  await page.locator('#gx-offset-feedback table').waitFor();
  await action(page, 'Return to review').click();
  await action(page, 'Show results').click();
  const alert = page.locator('#gre-explore > p.gx-sr-only[role="alert"]');
  await expect(alert).toHaveText('We couldn’t calculate results. Your entries are still here. Your previous results are unchanged. Select Show results to try again.');
  await stepButton(page, 'results').click();
  await expect(page.locator('.gx-context .gx-section-head strong')).toHaveText(before!);
});

test('a version mismatch offers Reload page, which reloads', async ({ page }) => {
  const net = await new Net(page).install();
  const name = pointerName('manifest-');
  const changed = { ...JSON.parse(servedData(name).toString('utf8')), export_version: 'not-this-release' };
  net.files.set(name, { contentType: 'application/json', body: Buffer.from(JSON.stringify(changed), 'utf8') });
  await page.goto('explore/');
  const box = page.locator('#gre-explore .gx-loading');
  await expect(box.locator('h2')).toHaveText('The explorer could not start');
  await expect(box.locator('[role="alert"]')).toHaveText('This page and its simulation data use incompatible versions. Reload the page to try again. No results have been calculated.');
  await expect(box.getByRole('button')).toHaveText(['Reload page']);
  // The control reloads the page: with the served data restored, the explorer starts.
  net.files.delete(name);
  await Promise.all([page.waitForEvent('load'), box.getByRole('button', { name: 'Reload page' }).click()]);
  await explorerReady(page);
  await expect(page.locator('#gre-explore .gx-loading')).toHaveCount(0);
});

test('a loading failure keeps Try loading again, which loads again', async ({ page }) => {
  const net = await new Net(page).install();
  const name = pointerName('scenario-');
  net.notFound.set(name, 1);
  await page.goto('explore/');
  const box = page.locator('#gre-explore .gx-loading');
  await expect(box.locator('[role="alert"]')).toContainText('could not be loaded or read');
  await box.getByRole('button', { name: 'Try loading again' }).click();
  await explorerReady(page);
});
