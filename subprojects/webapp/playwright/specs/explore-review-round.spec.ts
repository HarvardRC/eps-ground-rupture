// explore-review-round.spec.ts (guided DDD §§12.3–12.7, PDD D-47; §9.5):
// the deployed-build review's fixes — no floating Back to top on the
// guided page, the sample dialog's actions in view, both slip endpoints
// Required, neutral sample explanations, and the reworded mode note.

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { action, gotoExplore, pickSample, setChecked } from '../explore-support';

test.describe.configure({ timeout: 120_000 });

const WASH = 'rgb(245, 241, 235)';       // --gx-wash, the neutral treatment
const WARNING = 'rgb(255, 242, 237)';    // #fff2ed, .gx-warning, kept for coverage and interpretation warnings

/** Scroll down, then a little up: the theme reveals Back to top on the way up (scroll events, so touch projects too). */
async function revealBackToTop(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 1500));
  await page.waitForTimeout(300);
  // The theme reads the direction from successive scroll events: a single jump up is not enough.
  for (let i = 0; i < 6; i++) { await page.evaluate(() => window.scrollBy(0, -60)); await page.waitForTimeout(80); }
  await page.waitForTimeout(300);
}
const topDisplay = (page: Page) => page.locator('.md-top').evaluate((n) => getComputedStyle(n).display);

test('the theme\'s Back to top control leaves the guided page only (§12.3)', async ({ page }, info) => {
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  for (const group of ['faultDip', 'depth', 'density', 'sediment'] as const) await setChecked(page, `#gx-${group}-all`, true);
  await action(page, 'Continue to fault movement').click();
  await expect(page.locator('#gx-heading')).toHaveText('Choose the assumed fault movement');
  await revealBackToTop(page);
  // The theme's control is there but never rendered: out of view, the tab order and the accessibility tree.
  await expect(page.locator('.md-top')).toHaveCount(1);
  expect(await topDisplay(page)).toBe('none');
  // Another page keeps it, reached by the theme's instant navigation from here, and the theme reveals it.
  if (info.project.name === 'mobile') await page.locator('label.md-header__button[for="__drawer"]').click();
  await page.locator('.md-nav__link', { hasText: 'Glossary' }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/glossary\/$/);
  // The URL changes before the theme swaps the content in: wait for the new page itself.
  await expect(page.locator('#gre-explore')).toHaveCount(0);
  await expect(page.locator('article h1').first()).toContainText('Glossary');
  await page.waitForTimeout(300);
  await revealBackToTop(page);
  expect(await topDisplay(page)).toBe('block');
  await expect(page.locator('.md-top')).not.toHaveAttribute('hidden');
  // And the existing explorer, loaded directly.
  await page.goto('scenario/');
  await revealBackToTop(page);
  expect(await topDisplay(page)).toBe('block');
  await expect(page.locator('.md-top')).not.toHaveAttribute('hidden');
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

test('a very short viewport scrolls the whole dialog, so the actions are never clipped (§12.4)', async ({ page }) => {
  await gotoExplore(page);
  await page.setViewportSize({ width: 320, height: 180 });
  await page.locator('#gx-sample-trigger').click();
  const apply = page.locator('#gx-sample-apply');
  await apply.scrollIntoViewIfNeeded();
  expect(await apply.evaluate((node) => {
    const box = node.getBoundingClientRect();
    return box.top >= 0 && box.bottom <= innerHeight && node.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
  })).toBe(true);
  await apply.click();
  await expect(page.locator('#gx-sample-dialog')).toHaveCount(0);
});

test('both slip endpoints carry the Required mark; the initial minimum stays 0 (§12.5)', async ({ page }) => {
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  for (const group of ['faultDip', 'depth', 'density', 'sediment'] as const) await setChecked(page, `#gx-${group}-all`, true);
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
  for (const selector of ['.gx-sample-status', '.gx-annotation']) expect(await wash(selector)).toBe(WASH);
  await action(page, 'Continue to fault movement').click();
  await setChecked(page, '#gx-mode-slip', true);
  const note = page.locator('#gx-sample-mode-note');
  await expect(note).toHaveText('The sample has separate example values for each mode; one is not converted from the other. Switching modes can change the results.');
  expect(await wash('#gx-sample-mode-note')).toBe(WASH);
  const axe = await new AxeBuilder({ page }).include('#gre-explore').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  // A coverage warning keeps the caution styling.
  await setChecked(page, '#gx-mode-offset', true);
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
