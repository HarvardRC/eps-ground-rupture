// explore-log-scale.spec.ts (guided DDD §9.5 item 9): the width
// log-scale offer, its caption clause and bin note, and the off-
// adjustment when a confirmation stops offering it (§9.3). GS-1 has a
// reference log histogram; GS-6 has none. Texts are the copy registry's.
// A download after the off-adjustment clears the notice with its flag
// and leaves the package unchanged (G-17).

import { expect, test } from '@playwright/test';
import { PACKAGE_MEMBER_NAMES } from '../../src/download/package';
import { copyText } from '../../src/views/copy';
import { gs, readDownload } from '../support';
import { confirmGolden, gotoExplore, reconfirmMovement, storedRecord } from '../explore-support';

test.describe.configure({ timeout: 180_000 });

test('the offer, its chart, and the off-adjustment', async ({ page }) => {
  const log = gs('GS-1').histogram_log.dzw;
  expect(log).not.toBeNull();
  expect(gs('GS-6').histogram_log.dzw).toBeNull();
  await gotoExplore(page);
  await confirmGolden(page, 'GS-1');
  const toggle = page.locator('#gx-dzw-log');
  const chart = page.locator('#gx-chart svg');

  await expect(toggle).toHaveCount(0);
  await page.locator('#gx-measurement-dzw').click();
  await expect(toggle).toHaveCount(1);
  await expect(page.locator('label[for="gx-dzw-log"]')).toHaveText(` ${copyText('ddd5.8.logScaleLabel')}`);
  await expect(toggle).not.toBeChecked();
  await expect(chart).not.toHaveAttribute('aria-label', new RegExp(copyText('ddd5.11.logAxisClause')));

  await toggle.click();
  await expect(page.locator('#gx-dzw-log')).toBeChecked();
  await expect(chart).toHaveAttribute('aria-label', new RegExp(`${copyText('ddd5.11.logAxisClause')}$`));
  await expect(page.locator('#gx-chart figcaption')).toHaveText(copyText('ddd5.12.logScaleNote'));
  const bars = log!.bins + (log!.below_counts.some((c) => c !== 0) ? 1 : 0);
  await expect(page.locator('#gx-chart-table tbody tr')).toHaveCount(bars);
  await expect(page.locator('.gx-pending')).toHaveCount(0);
  expect((await storedRecord(page))!.display.logScale).toBe(true);

  // Cumulative and the other measurements are untouched.
  await page.locator('#gx-chart-cumulative').click();
  await expect(toggle).toHaveCount(0);
  await expect(chart).not.toHaveAttribute('aria-label', new RegExp(copyText('ddd5.11.logAxisClause')));
  await page.locator('#gx-chart-histogram').click();
  await expect(page.locator('#gx-dzw-log')).toBeChecked();
  await page.locator('#gx-measurement-scarp_height').click();
  await expect(toggle).toHaveCount(0);

  // The walkthrough's width stop uses the same live section.
  await page.getByRole('button', { name: 'Walk me through results' }).click();
  await page.locator('.gx-guide-nav .gx-primary').click();
  await expect(page.locator('#gx-dzw-log')).toBeChecked();
  await page.locator('.gx-guide-header').getByRole('button', { name: 'Browse freely' }).click();

  // A confirmation without a log histogram turns it off and says so once.
  await reconfirmMovement(page, 'GS-6');
  const off = page.locator('.gx-log-off');
  await expect(off).toHaveText(copyText('ddd5.10.recoveryLogScaleOff'));
  await expect(off).toHaveAttribute('role', 'status');
  await page.locator('#gx-measurement-dzw').click();
  await expect(off).toHaveCount(0);
  await expect(toggle).toHaveCount(0);
  expect((await storedRecord(page))!.display.logScale).toBe(false);
});

test('a download after the off-adjustment clears the notice and keeps the package', async ({ page }, testInfo) => {
  await gotoExplore(page);
  await confirmGolden(page, 'GS-1');
  await page.locator('#gx-measurement-dzw').click();
  await page.locator('#gx-dzw-log').click();
  await expect(page.locator('#gx-dzw-log')).toBeChecked();

  const ref = await reconfirmMovement(page, 'GS-6');
  const off = page.locator('.gx-log-off');
  await expect(off).toHaveText(copyText('ddd5.10.recoveryLogScaleOff'));

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#gre-explore button[data-action="download"]').click(),
  ]);
  // The notice's flag clears on the click; its element goes with it, though a download does not re-render.
  await expect(off).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Your confirmed result download is ready.' })).toHaveCount(1);
  const captured = await readDownload(download, testInfo, 'explore-log-off');
  expect([...captured.members.keys()]).toEqual([...PACKAGE_MEMBER_NAMES]);
  const records = captured.members.get('records.csv')!.toString('utf8').trimEnd().split('\n');
  expect(records.length - 1).toBe(ref.counts.matching_records);

  // A later render does not bring it back, and the log scale stays off.
  await page.locator('#gx-measurement-scarp_height').click();
  await page.locator('#gx-measurement-dzw').click();
  await expect(off).toHaveCount(0);
  await expect(page.locator('#gx-dzw-log')).toHaveCount(0);
  expect((await storedRecord(page))!.display.logScale).toBe(false);
});
