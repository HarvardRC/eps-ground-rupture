// site-regression.spec.ts (docs/app/ddd.md §7.5 inventory): the
// per-release regression checks of §7.7 on existing surfaces — the
// dashboards, navigation, and citation pages unaffected, the scenario
// bundle and the Tableau Embedding API each loaded only where they
// belong (§6.1), and the served tree's host fidelity.

import { expect, test, type Page } from '@playwright/test';
import {
  BASE_URL,
  DATA_URL,
  armProbe,
  expectProbe,
  gotoScenario,
  instantEntryFromHome,
  materialReady,
  pointer,
} from '../support';

test.describe.configure({ timeout: 180_000 });

const DASHBOARDS = ['model-vs-reality', 'response-curves', 'per-event-boxplots', 'slip-regression', 'distributions'];
const CITATION_PAGES = ['', 'data/', 'paper/', 'figures/'];
const EMBEDDING_API = 'tableau.embedding';

/** Records every request URL of `page`. */
function requests(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (r) => urls.push(r.url()));
  return urls;
}

const isBundle = (url: string): boolean => url.startsWith(`${BASE_URL}assets/scenario/`) && url.endsWith('.js');

/** Every <tableau-viz> on the page upgraded (the Embedding API defined it) and holding its loading iframe. */
async function expectEmbedsUpgraded(page: Page): Promise<void> {
  const vizzes = page.locator('tableau-viz');
  expect(await vizzes.count()).toBeGreaterThan(0);
  await expect(page.locator('tableau-viz:not(:defined)')).toHaveCount(0, { timeout: 60_000 });
  await expect
    .poll(
      () =>
        vizzes.evaluateAll((els) =>
          els.every((v) => {
            const frame = v.querySelector('iframe') ?? v.shadowRoot?.querySelector('iframe');
            return frame !== null && frame !== undefined && (frame.getAttribute('src') ?? '').startsWith(v.getAttribute('src') ?? '\u0000');
          }),
        ),
      { timeout: 60_000 },
    )
    .toBe(true);
}

test('the navigation: every nav link of the home page is served', async ({ page, request }) => {
  await page.goto('');
  const links = await page.locator('.md-nav__link[href]').evaluateAll((as) => [...new Set(as.map((a) => (a as HTMLAnchorElement).href))]);
  expect(links.length).toBeGreaterThanOrEqual(10);
  for (const link of links) {
    const url = new URL(link);
    url.hash = '';
    expect((await request.get(url.href)).status(), link).toBe(200);
  }
});

test('the citation pages: the How-to-cite dialog opens with the citation, and every internal link is served', async ({ page, request }) => {
  for (const path of CITATION_PAGES) {
    await page.goto(path);
    await materialReady(page);
    const open = page.locator('button.cite-open').first();
    await expect(open, path).toBeVisible();
    await open.click();
    const dialog = page.locator('dialog[open]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Chiama');
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog[open]')).toHaveCount(0);
    const internal = await page
      .locator('.md-content a[href]')
      .evaluateAll((as, base) => [...new Set(as.map((a) => (a as HTMLAnchorElement).href).filter((h) => h.startsWith(base)))], BASE_URL);
    for (const link of internal) {
      const url = new URL(link);
      url.hash = '';
      expect((await request.get(url.href)).status(), `${path || 'home'} → ${link}`).toBe(200);
    }
  }
});

test('the scenario bundle is requested only on the scenario page', async ({ page }) => {
  const urls = requests(page);
  for (const path of ['', 'glossary/', 'data/', 'paper/', 'figures/', ...DASHBOARDS.map((d) => `dashboards/${d}/`)]) {
    await page.goto(path);
    await page.waitForLoadState('load');
  }
  expect(urls.filter(isBundle)).toEqual([]);
  await gotoScenario(page);
  expect(urls.filter(isBundle).length).toBe(1);
});

test('the Tableau Embedding API is never requested on the scenario page, direct or instant', async ({ page }) => {
  const urls = requests(page);
  await gotoScenario(page);
  await page.waitForLoadState('load');
  expect(urls.filter((u) => u.includes(EMBEDDING_API))).toEqual([]);
  const fresh = await page.context().newPage();
  const freshUrls = requests(fresh);
  await instantEntryFromHome(fresh);
  await fresh.waitForLoadState('load');
  expect(freshUrls.filter((u) => u.includes(EMBEDDING_API))).toEqual([]);
  await fresh.close();
});

for (const dashboard of DASHBOARDS) {
  test(`dashboard ${dashboard}: its embeds upgrade on direct entry and on instant entry from a non-dashboard page`, async ({ page, browser }) => {
    const urls = requests(page);
    await page.goto(`dashboards/${dashboard}/`);
    await expectEmbedsUpgraded(page);
    expect(urls.filter((u) => u.includes(EMBEDDING_API)).length).toBeGreaterThan(0);
    // Instant entry from the glossary, in a fresh context so no module is cached in the document.
    const context = await browser.newContext({ baseURL: BASE_URL });
    const instant = await context.newPage();
    await instant.goto('glossary/');
    await materialReady(instant);
    await armProbe(instant);
    await instant.locator(`.md-nav__link[href$="dashboards/${dashboard}/"]`).first().click();
    await instant.waitForURL(`${BASE_URL}dashboards/${dashboard}/`);
    await expectEmbedsUpgraded(instant);
    await expectProbe(instant);
    await context.close();
  });
}

test('host fidelity: the directory redirect, the 404 page, and a .gz file served as stored', async ({ request }) => {
  const redirect = await request.get('data', { maxRedirects: 0 });
  expect(redirect.status()).toBe(301);
  expect(new URL(redirect.headers()['location'], `${BASE_URL}data`).href).toBe(`${BASE_URL}data/`);
  const missing = await request.get('no-such-page/');
  expect(missing.status()).toBe(404);
  expect(missing.headers()['content-type']).toMatch(/^text\/html/);
  const gz = Object.keys(pointer().files).find((n) => n.endsWith('.gz'))!;
  const file = await request.get(DATA_URL + gz, { headers: { 'Accept-Encoding': 'gzip' } });
  expect(file.status()).toBe(200);
  expect(file.headers()['content-encoding']).toBeUndefined();
  expect(file.headers()['content-type']).toBe('application/gzip');
});
