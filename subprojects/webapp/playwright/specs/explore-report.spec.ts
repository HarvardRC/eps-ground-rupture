// explore-report.spec.ts (guided DDD §13.8): the result report inside the
// guided download. A confirmed sample's archive holds the four data
// members and report.docx last; the report holds the §13.4 part set, one
// PNG (drawn at twice the chart's CSS size) per chart the page draws, and
// the captions and accuracy statement as document text; test/zipcheck.py
// accepts the archive under the guided layout. A failing canvas still
// delivers the four data members and says so (§13.5); a second activation
// while the archive is assembled is ignored (§13.1).

import { spawnSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';
import { PACKAGE_MEMBER_NAMES } from '../../src/download/package';
import { guided } from '../../src/explore/copy-overlay';
import { GUIDED_MEMBER_NAMES, REPORT_PARTS } from '../../src/explore/report';
import { DOWNLOAD_CONTENTS, PROVENANCE_HEADING, REPORT_FAILED, REPORT_TITLE } from '../../src/explore/wording';
import { copyText } from '../../src/views/copy';
import { readDownload, unzipStored, WEBAPP_DIR } from '../support';
import { action, confirmedCount, gotoExplore, pickSample } from '../explore-support';

test.describe.configure({ timeout: 120_000 });

const READY = 'Your confirmed result download is ready.';
const MEASUREMENTS = ['scarp_height', 'dzw', 'scarp_dip'] as const;
const xmlEscape = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function confirmSample(page: Page, id: 'illustrative' | 'kern'): Promise<void> {
  await gotoExplore(page);
  await pickSample(page, id);
  await action(page, 'Continue to fault movement').click();
  await page.locator('#gx-offset-feedback table').waitFor();
  await action(page, 'Review scenario').click();
  await action(page, 'Show results').click();
  await page.locator('.gx-context').waitFor();
}

const downloadButton = (page: Page) => page.locator('#gre-explore button[data-action="download"]');

/** The page's valid count of each measurement, read from its statistics table. */
async function validCounts(page: Page): Promise<Record<(typeof MEASUREMENTS)[number], number>> {
  const out = {} as Record<(typeof MEASUREMENTS)[number], number>;
  for (const m of MEASUREMENTS) {
    await page.locator(`#gx-measurement-${m}`).click();
    const cell = page.locator('.gx-statistics tbody tr').first().locator('td');
    out[m] = Number((await cell.textContent())!.replace(/,/g, ''));
  }
  return out;
}

for (const id of ['illustrative', 'kern'] as const) {
  test(`the ${id} sample's archive carries report.docx with one image per drawn chart`, async ({ page }, testInfo) => {
    await confirmSample(page, id);
    await expect(downloadButton(page)).toHaveAccessibleDescription(DOWNLOAD_CONTENTS);
    const valid = await validCounts(page);
    const matching = (await confirmedCount(page).textContent())!;

    const [download] = await Promise.all([page.waitForEvent('download'), downloadButton(page).click()]);
    await expect(page.getByRole('status').filter({ hasText: READY })).toHaveCount(1);
    const captured = await readDownload(download, testInfo, `report-${id}`);
    expect([...captured.members.keys()]).toEqual([...GUIDED_MEMBER_NAMES]);

    // The independent reader: outer layout, nested part set, stored throughout.
    const check = spawnSync('python3', ['-I', 'test/zipcheck.py', `--members=${GUIDED_MEMBER_NAMES.join(',')}`, captured.path, captured.instant], { cwd: WEBAPP_DIR, encoding: 'utf8' });
    expect(check.error).toBeUndefined();
    expect(`${check.status} ${check.stdout}${check.stderr}`).toBe('0 ');

    const drawn = MEASUREMENTS.filter(m => valid[m] >= 10);
    const report = unzipStored(captured.members.get('report.docx')!);
    const media = drawn.flatMap((_, i) => [`word/media/chart-${2 * i + 1}.png`, `word/media/chart-${2 * i + 2}.png`]);
    expect([...report.keys()]).toEqual([...REPORT_PARTS, ...media]);
    for (const name of media) {
      const png = report.get(name)!;
      expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      // IHDR: twice the 600 × 300 CSS px chart.
      expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 600]);
    }

    const document = report.get('word/document.xml')!.toString('utf8');
    expect((document.match(/<w:drawing>/g) ?? []).length).toBe(media.length);
    for (const text of [REPORT_TITLE, PROVENANCE_HEADING, copyText('pdd5.4.scarpDipNotice')]) expect(document).toContain(xmlEscape(text));
    expect((document.match(/Cite: Chiama et al\. \(2025\)/g) ?? []).length).toBe(media.length);
    expect((document.match(new RegExp(xmlEscape(guided(copyText('pdd4.1.cumulativeAccuracy'))).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length).toBe(drawn.length);
    for (const m of drawn) {
      expect(document).toContain(`N = ${valid[m].toLocaleString('en-US')} ${valid[m] === 1 ? 'measurement used' : 'measurements used'} of ${matching}`);
    }
    expect(document).toContain(xmlEscape(`Generated (UTC): ${captured.instant}`));
  });
}

test('a failing canvas still delivers the data files and says the report is missing', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.toBlob = function toBlob(callback: BlobCallback): void { callback(null); };
  });
  await confirmSample(page, 'illustrative');
  const [download] = await Promise.all([page.waitForEvent('download'), downloadButton(page).click()]);
  await expect(page.getByRole('status').filter({ hasText: REPORT_FAILED })).toHaveCount(1);
  await expect(page.getByRole('alert').filter({ hasText: 'could not be created' })).toHaveCount(0);
  const captured = await readDownload(download, testInfo, 'report-fallback');
  expect([...captured.members.keys()]).toEqual([...PACKAGE_MEMBER_NAMES]);
  const check = spawnSync('python3', ['-I', 'test/zipcheck.py', captured.path, captured.instant], { cwd: WEBAPP_DIR, encoding: 'utf8' });
  expect(`${check.status} ${check.stdout}${check.stderr}`).toBe('0 ');
});

test('a second activation while the archive is assembled is ignored', async ({ page }) => {
  // Slow the canvas so the second click lands while the first archive is still being assembled.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function toBlob(this: HTMLCanvasElement, callback: BlobCallback, ...rest: unknown[]): void {
      setTimeout(() => original.call(this, callback, ...(rest as [string?, number?])), 300);
    };
  });
  await confirmSample(page, 'illustrative');
  let downloads = 0;
  page.on('download', () => { downloads += 1; });
  const first = page.waitForEvent('download');
  await downloadButton(page).click();
  await downloadButton(page).click();
  await first;
  await expect(page.getByRole('status').filter({ hasText: READY })).toHaveCount(1);
  // Long enough for a second archive, had one been started, to arrive.
  await page.waitForTimeout(3000);
  expect(downloads).toBe(1);
  // Once settled, the button works again.
  const [again] = await Promise.all([page.waitForEvent('download'), downloadButton(page).click()]);
  expect(again.suggestedFilename()).toMatch(/\.zip$/);
});
