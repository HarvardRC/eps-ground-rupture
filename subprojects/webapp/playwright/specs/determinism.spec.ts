// determinism.spec.ts (docs/app/ddd.md §7.5 inventory): "the same
// starting state and action sequence produce identical scenario settings
// and displayed results on every run" (HLDD §9).

import { expect, test, type Browser, type TestInfo } from '@playwright/test';
import { BASE_URL, applyGolden, captureDownload, gotoScenario } from '../support';

test.describe.configure({ timeout: 180_000 });

interface Run {
  readonly summary: string;
  readonly displayed: string;
  readonly charts: readonly string[];
  readonly scenarioJson: Buffer;
}

/** The GS-1 action sequence in a fresh context: the summary, every displayed result, and the downloaded scenario.json bytes. */
async function run(browser: Browser, testInfo: TestInfo, label: string): Promise<Run> {
  const context = await browser.newContext({ baseURL: BASE_URL, acceptDownloads: true });
  const page = await context.newPage();
  await gotoScenario(page);
  await applyGolden(page, 'GS-1');
  for (const m of ['scarp_height', 'dzw', 'scarp_dip']) await page.locator(`#gre-${m}-data > summary`).click();
  await expect(page.locator('#gre-scarp_dip-bins')).toHaveCount(1);
  const summary = await page.locator('#gre-summary').innerText();
  const displayed = await page.evaluate(() =>
    ['#gre-caveats', '#gre-assist-body', '#gre-panels', '#gre-state', '#gre-versions']
      .map((s) => document.querySelector<HTMLElement>(s)!.innerText)
      .join('\n----\n'),
  );
  const charts = await page.locator('#gre-panels .gre-chart svg').evaluateAll((svgs) => svgs.map((s) => s.outerHTML));
  const download = await captureDownload(page, testInfo, label);
  await context.close();
  return { summary, displayed, charts, scenarioJson: download.members.get('scenario.json')! };
}

test('the GS-1 action sequence twice in fresh contexts gives identical settings, results, and scenario.json bytes', async ({ browser }, testInfo) => {
  const first = await run(browser, testInfo, 'run-1');
  const second = await run(browser, testInfo, 'run-2');
  expect(second.summary).toBe(first.summary);
  expect(second.displayed).toBe(first.displayed);
  expect(second.charts).toEqual(first.charts);
  expect(first.scenarioJson.length).toBeGreaterThan(0);
  expect(second.scenarioJson.equals(first.scenarioJson)).toBe(true);
});
