// explore-review-round.spec.ts (guided DDD §§12.3–12.7, PDD D-47; §9.5):
// the deployed-build review's fixes — no floating Back to top on the
// guided page, the sample dialog's actions in view, both slip endpoints
// Required, neutral sample explanations, and the reworded mode note.

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { action, gotoExplore, pickSample } from '../explore-support';

test.describe.configure({ timeout: 120_000 });

const WASH = 'rgb(245, 241, 235)';       // --gx-wash, the neutral treatment
const CAUTION = 'rgb(255, 245, 223)';    // #fff5df, the warning-family wash the explanations leave
const WARNING = 'rgb(255, 242, 237)';    // #fff2ed, .gx-warning, kept for coverage and interpretation warnings

/** Scroll down, then a little up: the theme reveals Back to top on the way up. */
async function revealBackToTop(page: Page): Promise<void> {
  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(150);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(400);
}

test('the theme\'s Back to top control leaves the guided page only (§12.3)', async ({ page }, info) => {
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  await action(page, 'Continue to fault movement').click();
  await revealBackToTop(page);
  await expect(page.locator('.md-top')).toBeHidden();
  // Another page keeps it, reached by the theme's instant navigation from here.
  if (info.project.name === 'mobile') await page.locator('label.md-header__button[for="__drawer"]').click();
  await page.locator('.md-nav__link', { hasText: 'Glossary' }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/glossary\/$/);
  await revealBackToTop(page);
  await expect(page.locator('.md-top')).toBeVisible();
  // And the existing explorer, loaded directly.
  await page.goto('scenario/');
  await revealBackToTop(page);
  await expect(page.locator('.md-top')).toBeVisible();
});

for (const id of ['illustrative', 'kern'] as const) {
  test(`${id}: the sample dialog keeps Use this sample and Cancel in view while the preview scrolls (§12.4)`, async ({ page }, info) => {
    if (info.project.name === 'desktop') await page.setViewportSize({ width: 1280, height: 720 });
    await gotoExplore(page);
    await page.locator('#gx-sample-trigger').click();
    await page.locator(`#gx-sample-${id}`).click();
    const body = page.locator('#gx-sample-dialog .gx-dialog-body');
    const inView = async () => {
      for (const selector of ['#gx-sample-apply', '#gx-sample-cancel']) {
        const hit = await page.evaluate((s) => {
          const node = document.querySelector(s)!; const box = node.getBoundingClientRect();
          const x = box.left + box.width / 2, y = box.top + box.height / 2;
          return box.top >= 0 && box.bottom <= innerHeight && node.contains(document.elementFromPoint(x, y));
        }, selector);
        expect(hit, `${selector} in view and uncovered`).toBe(true);
      }
    };
    // The preview — values, story, photograph, sources — is taller than the dialog and scrolls.
    expect(await body.evaluate((n) => n.scrollHeight > n.clientHeight)).toBe(true);
    await expect(body.locator('.gx-story-figure img')).toHaveCount(1);
    await inView();
    await body.evaluate((n) => { n.scrollTop = n.scrollHeight; });
    await inView();
    // The dialog itself holds nothing beyond its box: only its body scrolls.
    expect(await page.locator('#gx-sample-dialog').evaluate((n) => n.scrollHeight <= n.clientHeight + 1)).toBe(true);
    await page.locator('#gx-sample-apply').click();
    await expect(page.locator('#gx-sample-dialog')).toHaveCount(0);
    await expect(page.locator('.gx-sample-status')).toBeVisible();
  });
}

test('both slip endpoints carry the Required mark; the initial minimum stays 0 (§12.5)', async ({ page }) => {
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  for (const group of ['faultDip', 'depth', 'density', 'sediment']) await page.locator(`#gx-${group}-all`).check();
  await action(page, 'Continue to fault movement').click();
  await expect(page.locator('label[for="gx-slipMin"] .gx-required')).toHaveText('Required');
  await expect(page.locator('label[for="gx-slipMax"] .gx-required')).toHaveText('Required');
  await expect(page.locator('#gx-slipMin')).toHaveValue('0');
  // Clearing the minimum blocks review, as its mark now says.
  await page.locator('#gx-slipMin').fill('');
  await page.locator('#gx-slipMax').fill('2');
  await action(page, 'Review scenario').click();
  await expect(page.locator('#gx-error-slipMin')).toHaveText('Enter the minimum fault slip in metres.');
});

test('sample explanations take the neutral treatment; warnings keep caution; the mode note reads per §12.7 (§§12.6–12.7)', async ({ page }) => {
  await gotoExplore(page);
  await pickSample(page, 'kern');
  const wash = (selector: string) => page.locator(selector).first().evaluate((n) => getComputedStyle(n).backgroundColor);
  await expect(page.locator('.gx-sample-status')).toBeVisible();
  await expect(page.locator('.gx-annotation').first()).toBeVisible();
  for (const selector of ['.gx-sample-status', '.gx-annotation']) {
    expect(await wash(selector)).toBe(WASH);
    expect(await wash(selector)).not.toBe(CAUTION);
  }
  await action(page, 'Continue to fault movement').click();
  await page.locator('#gx-mode-slip').check();
  const note = page.locator('#gx-sample-mode-note');
  await expect(note).toHaveText('The sample has separate example values for each mode; one is not converted from the other. Switching modes can change the results.');
  expect(await wash('#gx-sample-mode-note')).toBe(WASH);
  const axe = await new AxeBuilder({ page }).include('#gre-explore').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  // A coverage warning keeps the caution styling.
  await page.locator('#gx-slipMax').fill('9');
  await page.locator('#gx-mode-offset').check();
  await page.locator('#gx-offsetMax').fill('40');
  await page.locator('#gx-offset-feedback .gx-warning').first().waitFor();
  expect(await wash('#gx-offset-feedback .gx-warning')).toBe(WARNING);
});

test('axe: the sample dialog with its footer, in both lane projects (§12.4)', async ({ page }) => {
  await gotoExplore(page);
  await page.locator('#gx-sample-trigger').click();
  await expect(page.locator('#gx-sample-dialog .gx-dialog-actions')).toBeVisible();
  const axe = await new AxeBuilder({ page }).include('#gx-sample-dialog').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
});
