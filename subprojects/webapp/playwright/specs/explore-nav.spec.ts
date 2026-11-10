// explore-nav.spec.ts (PDD D-52; guided-journey-ip.md G-29): the guided
// explorer is listed in the site's sidebar, after Dashboards and before
// Data, and as a listed page it links nowhere into the unlisted /scenario/
// (PDD D-39): its disclaimer link is its own, and its supporting links and
// startup messages no longer name the existing explorer.

import { expect, test, type Page } from '@playwright/test';
import { Net, pointerName } from '../support';
import { action, confirmGolden, explorerReady, gotoExplore, heading, RESULTS_HEADING } from '../explore-support';

test.describe.configure({ timeout: 120_000 });

/** Every link on the page that resolves into /scenario/. */
const scenarioLinks = (page: Page) =>
  page.locator('a[href]').evaluateAll((links) =>
    links.map((a) => (a as HTMLAnchorElement).href).filter((href) => new URL(href).pathname.includes('/scenario/')),
  );

test('the sidebar lists Ground Rupture Explorer after Dashboards and before Data', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'the theme collapses the sidebar into a drawer on narrow screens; the order is the same');
  await page.goto('');
  const top = page.locator('.md-nav--primary > .md-nav__list > .md-nav__item');
  const labels = (await top.evaluateAll((items) => items.map((item) => (item.querySelector(':scope > .md-nav__link, :scope > label.md-nav__link, :scope > a') as HTMLElement | null)?.textContent?.trim() ?? ''))).map((text) => text.replace(/\s+/g, ' '));
  const at = labels.indexOf('Ground Rupture Explorer');
  expect(at, labels.join(' | ')).toBeGreaterThan(0);
  expect(labels[at - 1]).toBe('Dashboards');
  expect(labels[at + 1]).toBe('Data');
  const link = top.nth(at).locator('a').first();
  await expect(link).toHaveAttribute('href', /explore\/$/);
  await link.click();
  await explorerReady(page);
  expect(new URL(page.url()).pathname).toMatch(/\/explore\/$/);
});

test('no state of the guided page links into /scenario/', async ({ page }) => {
  await gotoExplore(page);
  expect(await scenarioLinks(page)).toEqual([]);
  await action(page, 'Build your scenario').click();
  expect(await scenarioLinks(page)).toEqual([]);
  await page.locator('.gx-restart').getByRole('button', { name: 'Start a new scenario' }).click();
  await confirmGolden(page, 'GS-1');
  await expect(heading(page)).toHaveText(RESULTS_HEADING);
  expect(await scenarioLinks(page)).toEqual([]);
  // The supporting links keep the paper, the data, and the glossary.
  await expect(page.locator('.gx-support nav a')).toHaveText([/^Research paper/, /^Data and citation/, /^Glossary/]);
});

test('the results hint points to the dashboards, Model vs reality for real surface ruptures', async ({ page }) => {
  await gotoExplore(page);
  await confirmGolden(page, 'GS-1');
  // The owner's sentence (2026-11-09) replaces the existing-explorer pointer.
  const hint = page.locator('#gre-explore .gx-main > .gx-research + .gx-hint');
  await expect(hint).toHaveText('The Distributions (opens in a new tab) and Model vs reality (opens in a new tab) dashboards show broader datasets rather than this confirmed scenario. Model vs reality (opens in a new tab) also overlays measurements from real surface ruptures on the full simulation set.');
  const links = hint.locator('a');
  await expect(links).toHaveCount(3);
  for (const [i, href] of [[0, '../dashboards/distributions/'], [1, '../dashboards/model-vs-reality/'], [2, '../dashboards/model-vs-reality/']] as const) {
    await expect(links.nth(i)).toHaveAttribute('href', href);
    await expect(links.nth(i)).toHaveAttribute('target', '_blank');
    await expect(links.nth(i)).toHaveAttribute('rel', 'noopener');
  }
});

test('Full disclaimer goes to the page\'s own disclaimer', async ({ page }) => {
  await gotoExplore(page);
  await confirmGolden(page, 'GS-1');
  const link = page.locator('#gre-explore .gx-main > .gx-research').getByRole('link', { name: 'Full disclaimer' });
  await expect(link).toHaveAttribute('href', '#gre-explore-disclaimer');
  await expect(link).not.toHaveAttribute('target', /.+/);
  await expect(page.locator('#gre-explore-disclaimer')).toHaveCount(1);
  await link.click();
  // It stays on the page: no instant navigation, so the explorer keeps its results.
  await expect(page.locator('#gre-explore-disclaimer')).toBeInViewport();
  // Its first line clears the theme's sticky header.
  const header = (await page.locator('.md-header').boundingBox())!;
  const top = (await page.locator('#gre-explore-disclaimer').boundingBox())!.y;
  expect(top).toBeGreaterThanOrEqual(header.y + header.height - 1);
  await expect(page.locator('#gre-explore-disclaimer')).toBeFocused();
  await page.waitForTimeout(500);
  await expect(page.locator('#gre-explore-disclaimer')).toBeInViewport();
  await expect(heading(page)).toHaveText(RESULTS_HEADING);
  await expect(page.locator('#gre-explore .gx-loading')).toHaveCount(0);
  expect(new URL(page.url()).pathname).toMatch(/\/explore\/$/);
});

test('the built explorer module names no /scenario/ page', async ({ page, request }) => {
  // Links the hook cannot see (built at run time) come only from this module.
  await gotoExplore(page);
  const src = await page.locator('#gre-explore-app').getAttribute('src');
  const body = await (await request.get(new URL(src!, page.url()).href)).text();
  expect(body).not.toMatch(/\.\.\/scenario\/(?!data\/)/);
  expect(body).not.toMatch(/existing explorer/i);
});

test('a startup failure offers Data and citation and Glossary, not the existing explorer', async ({ page }) => {
  const net = await new Net(page).install();
  net.notFound.set(pointerName('scenario-'), 1);
  await page.goto('explore/');
  const box = page.locator('#gre-explore .gx-loading');
  await expect(box.locator('[role="alert"]')).toContainText('could not be loaded or read');
  await expect(box.locator('a')).toHaveText(['Data and citation', 'Glossary']);
  expect(await scenarioLinks(page)).toEqual([]);
});
