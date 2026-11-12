// explore-download.spec.ts (guided DDD §9.5 item 10): a downloaded
// package delivered from the confirmed result during draft edits (§6).
// The record count is GS-6's reference count. GS-6 has no valid
// measurement in any panel, so its report (§13.3) holds no chart image
// and prints the page's notice in each chart's place.

import { expect, test } from '@playwright/test';
import { GUIDED_MEMBER_NAMES, REPORT_PARTS } from '../../src/explore/report';
import { readmeText } from '../../src/explore/readme';
import { SITE_URL } from '../../playwright.config';
import { pointer, readDownload, scenarioJson, unzipStored } from '../support';
import { confirmGolden, gotoExplore, stepButton, typeEntry } from '../explore-support';

test.describe.configure({ timeout: 120_000 });

test('the confirmed package downloads while the draft differs', async ({ page }, testInfo) => {
  await gotoExplore(page);
  const ref = await confirmGolden(page, 'GS-6');
  await stepButton(page, 'movement').click();
  await typeEntry(page, 'slipMax', '0.03');
  await stepButton(page, 'results').click();
  await expect(page.locator('.gx-pending')).toContainText('You have unapplied changes');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#gre-explore button[data-action="download"]').click(),
  ]);
  const captured = await readDownload(download, testInfo, 'explore');
  expect([...captured.members.keys()]).toEqual([...GUIDED_MEMBER_NAMES]);
  // README.txt opens the archive, the approved text exactly (G-30).
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical).toBe(new URL('explore/', SITE_URL).href);
  expect(captured.members.get('README.txt')!.toString('utf8')).toBe(readmeText(true, canonical!));
  const report = unzipStored(captured.members.get('report.docx')!);
  expect([...report.keys()]).toEqual([...REPORT_PARTS]);
  const document = report.get('word/document.xml')!.toString('utf8');
  expect(document).not.toContain('<w:drawing>');
  expect(document.match(/none has a/g)).toHaveLength(3);
  const records = captured.members.get('records.csv')!.toString('utf8').trimEnd().split('\n');
  expect(records.length - 1).toBe(ref.counts.matching_records);
  const json = scenarioJson(captured);
  expect(json.export_version).toBe(pointer().export_version);
  expect(JSON.stringify(json.scenario)).toContain(`"${ref.inputs.slip_window!.max}"`);
  expect(JSON.stringify(json.scenario)).not.toContain('"0.03"');
  await expect(page.getByRole('status').filter({ hasText: 'Your confirmed result download is ready.' })).toHaveCount(1);
});
