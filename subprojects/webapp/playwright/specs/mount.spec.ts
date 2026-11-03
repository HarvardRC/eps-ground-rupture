// mount.spec.ts (docs/app/ddd.md §7.5 inventory): "direct visits and
// site navigation initialize the application correctly, and the
// application replaces the fallback presentation only once its
// interactive content is ready" (HLDD §9).

import { expect, test, type Page } from '@playwright/test';
import {
  Net,
  bundleUrl,
  gotoScenario,
  instantEntryFromHome,
  installRecorder,
  manifest,
  mounted,
  recorded,
  settle,
  summaryText,
} from '../support';

/** A sentence of the no-JS fallback body (§5.10). */
const FALLBACK = 'Ground Rupture Explorer shows conditional results from a published';

test.describe.configure({ timeout: 120_000 });

/** The loading-state and mounted-state assertions of a held-artifact entry. */
async function expectHeldThenMounted(page: Page, release: () => void): Promise<void> {
  await page.locator('#gre-root [role=status]').waitFor({ state: 'attached' });
  await expect(page.locator('#gre-root')).toHaveCount(1);
  await expect(page.locator('#gre-app')).toHaveCount(1);
  const loading = page.locator('#gre-root:not([data-gre-mounted])');
  await expect(loading).toHaveCount(1);
  await expect(loading).toContainText(FALLBACK);
  release();
  await mounted(page);
  await settle(page);
  const root = page.locator('#gre-root[data-gre-mounted]');
  await expect(root).toHaveCount(1);
  await expect(page.locator('#gre-root')).toHaveCount(1);
  await expect(page.locator('#gre-app')).toHaveCount(1);
  await expect(root).not.toContainText(FALLBACK);
  expect(await root.getAttribute('data-gre-build')).toBe(await bundleUrl(page));
  expect(await page.evaluate(() => location.hash)).toBe('');
  await expect(page.locator('#gre-scarp_height')).toBeFocused();
  await expect(page.locator('#gre-scarp_height')).toBeInViewport();
}

test('direct entry: the fallback stands while loading, then one mount with focus on the first panel', async ({ page }) => {
  const net = await new Net(page).install();
  const held = net.hold(manifest().files.scenario_artifact);
  await page.goto('scenario/');
  await held.arrived;
  await expectHeldThenMounted(page, () => held.release());
});

test('first instant entry through the injected #gre-test-entry link: the same assertions, the probe surviving', async ({ page }) => {
  const net = await new Net(page).install();
  const held = net.hold(manifest().files.scenario_artifact);
  await instantEntryFromHome(page, 'none');
  await held.arrived;
  await expectHeldThenMounted(page, () => held.release());
  expect(await page.evaluate(() => (window as unknown as { __greProbe?: number }).__greProbe)).toBe(1);
});

test('with JavaScript disabled the fallback body remains the page content', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('scenario/');
  const root = page.locator('#gre-root');
  await expect(root).toContainText(FALLBACK);
  await expect(root).toContainText('The interactive controls require JavaScript and a supported browser');
  await expect(root).not.toHaveAttribute('data-gre-mounted');
  await expect(page.locator('#gre-disclaimer')).toBeVisible();
  await context.close();
});

test('disclaimer link after a committed change: the fragment-link guard keeps the mount and focuses #gre-disclaimer', async ({ page }) => {
  await installRecorder(page);
  await gotoScenario(page);
  await expect(page.locator('#gre-root #gre-disclaimer')).toHaveCount(0);
  await expect(page.locator('#gre-disclaimer')).toHaveCount(1);
  // One committed scenario change: the one-state population.
  await page.locator('input[name="gre-population"][value="one_state_per_trial"]').check();
  await expect(page.locator('#gre-summary')).toContainText('one state per simulation trial');
  await settle(page);
  await expect(page.locator('#gre-root #gre-disclaimer')).toHaveCount(0);
  await expect(page.locator('#gre-disclaimer')).toHaveCount(1);
  const changed = await summaryText(page);
  const root = await page.locator('#gre-root').elementHandle();
  const historyLength = await page.evaluate(() => history.length);
  const statusBefore = await page.locator('#gre-root [role=status]').textContent();
  const writesBefore = (await recorded(page)).length;
  await page.locator('#gre-caveats a[href="#gre-disclaimer"]').click();
  await settle(page);
  expect(await root!.evaluate((el) => el.isConnected)).toBe(true);
  expect(await summaryText(page)).toBe(changed);
  expect(await page.evaluate(() => history.length)).toBe(historyLength);
  expect(await page.locator('#gre-root [role=status]').textContent()).toBe(statusBefore);
  expect((await recorded(page)).length).toBe(writesBefore);
  await expect(page.locator('#gre-disclaimer')).toBeInViewport();
  await expect(page.locator('#gre-disclaimer')).toBeFocused();
});

test("Material's skip link leaves #gre-root connected and focuses its target", async ({ page }) => {
  await gotoScenario(page);
  const root = await page.locator('#gre-root').elementHandle();
  const target = new URL((await page.locator('.md-skip').getAttribute('href'))!, page.url()).hash.slice(1);
  await page.locator('.md-skip').focus();
  await page.keyboard.press('Enter');
  await settle(page);
  expect(await root!.evaluate((el) => el.isConnected)).toBe(true);
  expect(await page.evaluate(() => document.activeElement?.id)).toBe(target);
});

test("the h1's permalink leaves #gre-root connected and focuses its target", async ({ page }) => {
  await gotoScenario(page);
  const root = await page.locator('#gre-root').elementHandle();
  const permalink = page.locator('h1 .headerlink');
  const target = new URL((await permalink.getAttribute('href'))!, page.url()).hash.slice(1);
  await permalink.click();
  await settle(page);
  expect(await root!.evaluate((el) => el.isConnected)).toBe(true);
  expect(await page.evaluate(() => document.activeElement?.id)).toBe(target);
});

test('fragment entry with the first commit after the load event: #gre-disclaimer in view, focus not on the first panel', async ({ page }) => {
  const net = await new Net(page).install();
  const held = net.hold(manifest().files.scenario_artifact);
  await page.goto('scenario/#gre-disclaimer', { waitUntil: 'load' });
  await held.arrived;
  held.release();
  await mounted(page);
  await settle(page);
  await expect(page.locator('#gre-disclaimer')).toBeInViewport();
  await expect(page.locator('#gre-scarp_height')).not.toBeFocused();
});

