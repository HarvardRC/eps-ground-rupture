// explore-download.spec.ts (guided DDD §9.5 item 10): a downloaded
// package delivered from the confirmed result during draft edits (§6).
// The record count is GS-6's reference count.

import { expect, test } from '@playwright/test';
import { PACKAGE_MEMBER_NAMES } from '../../src/download/package';
import { pointer, readDownload, scenarioJson } from '../support';
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
  expect([...captured.members.keys()]).toEqual([...PACKAGE_MEMBER_NAMES]);
  const records = captured.members.get('records.csv')!.toString('utf8').trimEnd().split('\n');
  expect(records.length - 1).toBe(ref.counts.matching_records);
  const json = scenarioJson(captured);
  expect(json.export_version).toBe(pointer().export_version);
  expect(JSON.stringify(json.scenario)).toContain(`"${ref.inputs.slip_window!.max}"`);
  expect(JSON.stringify(json.scenario)).not.toContain('"0.03"');
  await expect(page.getByRole('status').filter({ hasText: 'Your confirmed result download is ready.' })).toHaveCount(1);
});
