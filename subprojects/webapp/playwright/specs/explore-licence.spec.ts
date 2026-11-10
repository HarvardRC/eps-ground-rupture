// explore-licence.spec.ts (G-28; ADR-0017 amendment of 2026-11-08;
// data/REDISTRIBUTION.md): the notice the DEM experiments' licence,
// ODC-By 1.0, asks for — under the guided page's chart, on the existing
// explorer's page after its application, and under every embedded
// dashboard, the licence's name linked — and the Licences block that
// closes every download's provenance.txt, carried into report.docx.

import { expect, test } from '@playwright/test';
import { copyText } from '../../src/views/copy';
import { captureDownload, gotoScenario, manifest, provenanceBlock, readDownload, unzipStored } from '../support';
import { action, chooseRange, confirmGolden, gotoExplore, sedimentName, setChecked, siteChoice, stepButton, typeEntry } from '../explore-support';

test.describe.configure({ timeout: 120_000 });

const NOTICE = 'Contains information from the Homogeneous and Heterogeneous 2D DEM Experiments (Chiama et al. 2024a, 2024b; DesignSafe-CI), which is made available here under the Open Data Commons Attribution License (ODC-By 1.0).';
const ODC_BY_NAME = 'Open Data Commons Attribution License (ODC-By 1.0)';
const ODC_BY_URL = 'https://opendatacommons.org/licenses/by/1-0/';
const LICENCES = [
  'records.csv and statistics.csv: Open Data Commons Attribution License (ODC-By 1.0), https://opendatacommons.org/licenses/by/1-0/',
  'Charts, chart images, and reports built from these results: Creative Commons Attribution 4.0 International (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/',
  NOTICE,
];
const DASHBOARDS = ['distributions', 'model-vs-reality', 'per-event-boxplots', 'response-curves', 'slip-regression'];

test('the registry holds the notice of data/REDISTRIBUTION.md', () => {
  expect(copyText('ddd5.9.licenceNotice')).toBe(NOTICE);
  expect([copyText('ddd5.9.licenceData'), copyText('ddd5.9.licenceWorks'), copyText('ddd5.9.licenceNotice')]).toEqual(LICENCES);
});

test('the guided page: the notice under the chart, and the Licences block in the download and its report', async ({ page }, testInfo) => {
  await gotoExplore(page);
  await confirmGolden(page, 'GS-1');
  const notice = page.locator('#gx-licence-notice');
  // Directly under the displayed chart and its legend.
  expect(await notice.evaluate((node) => node.previousElementSibling?.id)).toBe('gx-chart-legend');
  await expect(notice).toHaveText(NOTICE.replace(ODC_BY_NAME, `${ODC_BY_NAME} (opens in a new tab)`));
  const link = notice.getByRole('link');
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute('href', ODC_BY_URL);
  await expect(link).toHaveAttribute('target', '_blank');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#gre-explore button[data-action="download"]').click(),
  ]);
  const captured = await readDownload(download, testInfo, 'licence-explore');
  expect(provenanceBlock(captured.provenance, 'Licences')).toEqual(LICENCES);
  expect(captured.provenance.endsWith(`${NOTICE}\n\n`)).toBe(true);
  const document = unzipStored(captured.members.get('report.docx')!).get('word/document.xml')!.toString('utf8');
  // The report's Provenance section carries the same three lines (none holds an XML-escaped character).
  for (const line of LICENCES) expect(document).toContain(line);
});

test('a result too small to chart shows the notice under its statistics table; an empty result shows none', async ({ page }) => {
  // Random Heterogeneous at dense 10 m and 20°, slip 0–0.15 m: scarp dip has one measurement, below the chart floor.
  const random = manifest().arm_strength_states.find((pair) => /random/i.test(pair.sediment_strength))!;
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  await chooseRange(page, 'faultDip', 0, 0);
  await chooseRange(page, 'depth', 2, 2);
  await siteChoice(page, 'density', 'Dense').click();
  await siteChoice(page, 'sediment', sedimentName(random)).click();
  await action(page, 'Continue to fault slip').click();
  await setChecked(page, '#gx-mode-slip', true);
  await typeEntry(page, 'slipMin', '0');
  await typeEntry(page, 'slipMax', '0.15');
  await action(page, 'Review scenario').click();
  await action(page, 'Show results').click();
  await page.locator('.gx-context').waitFor();
  await page.locator('#gx-measurement-scarp_dip').click();
  await expect(page.locator('#gx-chart')).toHaveCount(0);
  const notice = page.locator('#gx-licence-notice');
  await expect(notice).toHaveCount(1);
  // Directly under the statistics table, the licence linked (owner's decision, 2026-11-09).
  expect(await notice.evaluate((node) => node.previousElementSibling?.classList.contains('gx-statistics'))).toBe(true);
  await expect(notice.getByRole('link')).toHaveAttribute('href', ODC_BY_URL);
  await expect(notice).toContainText('Contains information from the Homogeneous and Heterogeneous 2D DEM Experiments');

  // An empty result shows no simulation values, and no notice: Random Heterogeneous is modeled only at 10 m.
  await stepButton(page, 'site').click();
  await chooseRange(page, 'depth', 1, 1);
  await stepButton(page, 'review').click();
  await action(page, 'Show results').click();
  await expect(page.locator('.gx-empty').first()).toBeVisible();
  await expect(page.locator('#gx-licence-notice')).toHaveCount(0);
});

test('the existing explorer: the notice after its application, and the Licences block in its download', async ({ page }, testInfo) => {
  await gotoScenario(page);
  const notice = page.locator('p.licence-notice');
  await expect(notice).toHaveCount(1);
  await expect(notice).toHaveText(NOTICE);
  await expect(notice.getByRole('link')).toHaveAttribute('href', ODC_BY_URL);
  // Below the application, never over it: its own box starts where the mount ends.
  const root = (await page.locator('#gre-root').boundingBox())!;
  const box = (await notice.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(root.y + root.height - 1);
  const captured = await captureDownload(page, testInfo, 'licence-scenario');
  expect(provenanceBlock(captured.provenance, 'Licences')).toEqual(LICENCES);
});

test('every embedded dashboard carries the notice, the licence linked', async ({ request }) => {
  for (const name of DASHBOARDS) {
    const html = await (await request.get(`dashboards/${name}/`)).text();
    const embeds = (html.match(/<tableau-viz /g) ?? []).length;
    const notices = [...html.matchAll(/<p class="licence-notice">([\s\S]*?)<\/p>/g)].map((m) => m[1]!);
    expect(embeds, name).toBeGreaterThanOrEqual(1);
    expect(notices, name).toHaveLength(embeds);
    for (const notice of notices) {
      expect(notice, name).toContain(`<a href="${ODC_BY_URL}">${ODC_BY_NAME}</a>`);
      expect(notice.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(), name).toBe(NOTICE);
    }
  }
});
