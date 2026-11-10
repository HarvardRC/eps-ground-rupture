// explore-chart-export.spec.ts (guided DDD §16.5): the chart-image export.
// Each rendered chart of a confirmed result carries Download this chart
// (PNG); none renders before confirmation or where the chart is suppressed.
// An activation saves a real PNG — the chart at 600 × 300 CSS px drawn at
// twice that, with the caption strip beneath — and its provenance sidecar
// in the page's wording, named per §16.4. A second activation while one is
// in flight is ignored; a failing canvas saves nothing and says so; the
// action fits the 320 px and 1,024 px layouts.

import { readFileSync } from 'node:fs';
import { expect, test, type Download, type Page } from '@playwright/test';
import { CHART_EXPORT_BUTTON, CHART_EXPORT_FAILED, CHART_EXPORT_READY } from '../../src/explore/wording';
import { copyText } from '../../src/views/copy';
import { manifest } from '../support';
import { action, chooseRange, gotoExplore, overflows, pickSample, sedimentName, setChecked, siteChoice, typeEntry } from '../explore-support';

test.describe.configure({ timeout: 120_000 });

const DECIDED_LOW_SLIP = 'Low-slip measurements may be less reliable. Below 0.5 m of fault slip, surface deformation can be difficult to distinguish from model roughness. These values are shown, but interpret them with caution.';
const exportButton = (page: Page) => page.locator('#gx-chart-export');
const exportStatus = (page: Page) => page.locator('#gx-chart-export-status');

async function confirmKern(page: Page): Promise<void> {
  await gotoExplore(page);
  await pickSample(page, 'kern');
  await action(page, 'Continue to fault slip').click();
  await page.locator('#gx-offset-feedback table').waitFor();
  await action(page, 'Review scenario').click();
  await action(page, 'Show results').click();
  await page.locator('.gx-context').waitFor();
}

/** The two downloads of one activation, PNG first; their bytes and names. */
async function exportOnce(page: Page): Promise<{ png: Buffer; pngName: string; sidecar: string; sidecarName: string }> {
  const downloads: Download[] = [];
  const both = new Promise<void>(resolve => page.on('download', d => { downloads.push(d); if (downloads.length === 2) resolve(); }));
  await exportButton(page).click();
  await both;
  const [png, sidecar] = downloads;
  return {
    png: readFileSync((await png!.path())!), pngName: png!.suggestedFilename(),
    sidecar: readFileSync((await sidecar!.path())!, 'utf8'), sidecarName: sidecar!.suggestedFilename(),
  };
}

/** The PNG's IHDR width and height. */
const pngSize = (png: Buffer): [number, number] => {
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
};

test('each rendered chart offers the export; the PNG and its sidecar download with §16.4 names', async ({ page }) => {
  await confirmKern(page);
  await expect(exportButton(page)).toHaveText(CHART_EXPORT_BUTTON);

  // Scarp height, Distribution.
  const height = await exportOnce(page);
  expect(height.pngName).toMatch(/^ground-rupture-explorer_.+-scarp-height-histogram\.png$/);
  expect(height.sidecarName).toBe(height.pngName.replace(/\.png$/, '-provenance.txt'));
  const [w, h] = pngSize(height.png);
  expect(w).toBe(1200);
  // The strip lies beneath the 600 px-high chart: at least its eight fixed lines (the ODC-By 1.0 notice among them) plus the Kern sample's notes.
  expect(h).toBeGreaterThan(600 + 2 * 8 * 15);
  expect(height.png.length).toBeGreaterThan(20_000);
  expect(height.sidecar).toContain('Paper citation');
  // The sidecar closes with the Licences block and the notice ODC-By 1.0 asks for (G-28).
  expect(height.sidecar.endsWith(`Licences\n${copyText('ddd5.9.licenceData')}\n${copyText('ddd5.9.licenceWorks')}\n${copyText('ddd5.9.licenceNotice')}\n\n`)).toBe(true);
  expect(height.sidecar).toContain(DECIDED_LOW_SLIP);
  expect(height.sidecar).not.toContain(copyText('pdd5.9.lowSlipCaveat'));
  await expect(exportStatus(page)).toHaveText(CHART_EXPORT_READY);

  // Width, its logarithmic Distribution.
  await page.locator('#gx-measurement-dzw').click();
  await page.locator('#gx-dzw-log').check();
  const log = await exportOnce(page);
  expect(log.pngName).toMatch(/-dzw-histogram-log\.png$/);
  expect(pngSize(log.png)[0]).toBe(1200);

  // Scarp dip, Cumulative.
  await page.locator('#gx-measurement-scarp_dip').click();
  await page.locator('#gx-chart-cumulative').click();
  const dip = await exportOnce(page);
  expect(dip.pngName).toMatch(/-scarp-dip-cumulative\.png$/);
  expect(dip.sidecarName).toMatch(/-scarp-dip-cumulative-provenance\.txt$/);
});

test('no export before confirmation, and none where the chart is suppressed', async ({ page }) => {
  // Random Heterogeneous at dense 10 m and 20°, slip 0–0.15 m: scarp dip has one measurement, below the chart floor.
  const random = manifest().arm_strength_states.find(pair => /random/i.test(pair.sediment_strength))!;
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
  await expect(exportButton(page)).toHaveCount(0);
  await action(page, 'Show results').click();
  await page.locator('.gx-context').waitFor();
  await expect(page.locator('#gx-chart svg')).toHaveCount(1);
  await expect(exportButton(page)).toHaveCount(1);
  await page.locator('#gx-measurement-scarp_dip').click();
  // The suppressed dip panel is on screen: its card pressed, the statistics table alone, one measurement used.
  await expect(page.locator('#gx-measurement-scarp_dip')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.gx-analysis.gx-table-only .gx-statistics table')).toHaveCount(1);
  await expect(page.locator('.gx-measurement .gx-section-head strong')).toHaveText('1 measurement used');
  await expect(page.locator('#gx-chart')).toHaveCount(0);
  await expect(exportButton(page)).toHaveCount(0);
});

test('a scenario replaced while an export is in flight saves nothing and keeps the newer status', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function toBlob(this: HTMLCanvasElement, callback: BlobCallback, ...rest: unknown[]): void {
      setTimeout(() => original.call(this, callback, ...(rest as [string?, number?])), 800);
    };
  });
  await confirmKern(page);
  let downloads = 0;
  page.on('download', () => { downloads += 1; });
  await exportButton(page).click();
  await page.locator('.gx-restart').getByRole('button', { name: 'Start a new scenario' }).click();
  const fresh = page.getByRole('status').filter({ hasText: 'New scenario. Build your scenario or try a prefilled sample.' });
  await expect(fresh).toHaveCount(1);
  await page.waitForTimeout(2500);
  expect(downloads).toBe(0);
  await expect(fresh).toHaveCount(1);
});

test('the card\u2019s outcome stays with its measurement across a switch mid-flight', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function toBlob(this: HTMLCanvasElement, callback: BlobCallback, ...rest: unknown[]): void {
      setTimeout(() => original.call(this, callback, ...(rest as [string?, number?])), 800);
    };
  });
  await confirmKern(page);
  const names: string[] = [];
  page.on('download', d => names.push(d.suggestedFilename()));
  await exportButton(page).click();
  await page.locator('#gx-measurement-dzw').click();
  await expect.poll(() => names.length).toBe(2);
  expect(names[0]).toMatch(/-scarp-height-histogram\.png$/);
  // The width card says nothing; the height card carries the outcome when the reader returns.
  await expect(exportStatus(page)).toHaveText('');
  await page.locator('#gx-measurement-scarp_height').click();
  await expect(exportStatus(page)).toHaveText(CHART_EXPORT_READY);
});

test('a second activation while an export is in flight is ignored', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function toBlob(this: HTMLCanvasElement, callback: BlobCallback, ...rest: unknown[]): void {
      setTimeout(() => original.call(this, callback, ...(rest as [string?, number?])), 600);
    };
  });
  await confirmKern(page);
  const names: string[] = [];
  page.on('download', d => names.push(d.suggestedFilename()));
  await exportButton(page).click();
  await exportButton(page).click();
  await expect(exportStatus(page)).toHaveText(CHART_EXPORT_READY);
  await page.waitForTimeout(2000);
  expect(names.filter(name => name.endsWith('.png'))).toHaveLength(1);
  expect(names.filter(name => name.endsWith('-provenance.txt'))).toHaveLength(1);
});

test('a failing canvas saves nothing and says so in the card', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.toBlob = function toBlob(callback: BlobCallback): void { callback(null); };
  });
  await confirmKern(page);
  let downloads = 0;
  page.on('download', () => { downloads += 1; });
  await exportButton(page).click();
  await expect(exportStatus(page)).toHaveText(CHART_EXPORT_FAILED);
  await page.waitForTimeout(1000);
  expect(downloads).toBe(0);
  // The status line stays with its card across a re-render.
  await page.locator('#gx-chart-cumulative').click();
  await page.locator('#gx-chart-histogram').click();
  await expect(exportStatus(page)).toHaveText(CHART_EXPORT_FAILED);
});

for (const width of [320, 1024] as const) {
  test(`the action fits the ${width} px layout`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await confirmKern(page);
    await exportButton(page).scrollIntoViewIfNeeded();
    const box = (await exportButton(page).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(await overflows(page), `results with the export action at ${width} px`).toBe(false);
    await exportOnce(page);
    await expect(exportStatus(page)).toHaveText(CHART_EXPORT_READY);
    expect(await overflows(page), `results with the export status at ${width} px`).toBe(false);
  });
}
