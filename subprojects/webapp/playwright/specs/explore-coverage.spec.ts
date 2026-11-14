// explore-coverage.spec.ts (guided DDD §19.9; ADR-0021 "Verify the
// accepted scope"): sediment-profile coverage on the served data-v1
// release, through the real controls, in both lane projects. Every
// expected sentence is written out here as the PDD §3.2 Coverage strings
// block records it (hyphen on the page, en dash in the summary form), so
// a drift from the PDD fails here, not only in the Node suite.

import { readFileSync } from 'node:fs';
import { expect, test, type Download, type Page } from '@playwright/test';
import { readDownload, unzipStored } from '../support';
import {
  action, chooseRange, confirmedCount, countText, gotoExplore, heading, overflows, pickSample, REVIEW_HEADING, RESULTS_HEADING, setChecked, SESSION_KEY,
  stepButton, storedRecord, typeEntry, explorerReady,
} from '../explore-support';

test.describe.configure({ timeout: 180_000 });

// The served release's dictionaries: angles 20…70 (7), depths 3, 5, 10; density codes Dense 0, Loose 1, Medium 2;
// the nine profiles in arm_strength_states order, Uniform Strong 2, Random Heterogeneous 6, Alternating Strong-Weak 8.
const DENSE = 0, MEDIUM = 2;
const U_STRONG = 2, RANDOM = 6, ALTERNATING = 8;

const RANDOM_NOTE = 'Random Heterogeneous: this data release has simulations only for Dense sediment, 10 m deep, at every modeled fault angle.';
const ALTERNATING_NOTE = 'Alternating Strong-Weak: this data release has simulations only for Dense sediment, 10 m deep, at fault angles 20°, 40° and 60°.';
const REVIEW_HINT = 'This describes what this data release contains for these site conditions. Your assumed range and the Refine results choices decide which stages reach the results.';
const REST = 'All other selected profiles have simulations for every site condition you selected.';
const ABSENT_45 = 'Layered: Alternating Strong-Weak — this data release has no simulations for your selected site conditions, so it is not in these results. It remains part of your selection.';
const ABSENT_45_SUMMARY = 'Alternating Strong–Weak (layered) — this data release has no simulations for your selected site conditions, so it is not in these results.';
const STRIP_45 = 'Not represented in this chart: Alternating Strong–Weak (layered) — no simulations for the selected site conditions.';

const note = (page: Page, i: number) => page.locator(`#gx-sediment-note-${i}`);
const reviewBlock = (page: Page) => page.locator('#gx-review-coverage');
const resultsBlockOf = (page: Page) => page.locator('#gx-results-coverage');

/** Answer the site step: angle and depth ranges by modeled-stop index, density and profile checkboxes by code. */
async function chooseSiteBy(page: Page, dips: [number, number], depths: [number, number], densities: readonly number[], profiles: readonly number[]): Promise<void> {
  await chooseRange(page, 'faultDip', ...dips);
  await chooseRange(page, 'depth', ...depths);
  for (const d of densities) await setChecked(page, `#gx-density-${d}`, true);
  for (const p of profiles) await setChecked(page, `#gx-sediment-${p}`, true);
}

/** From the introduction to review, with fault slip `min`–`max` m. */
async function toReview(page: Page, dips: [number, number], depths: [number, number], densities: readonly number[], profiles: readonly number[], slip: [string, string] = ['0', '5']): Promise<void> {
  await action(page, 'Build your scenario').click();
  await chooseSiteBy(page, dips, depths, densities, profiles);
  await action(page, 'Continue to fault slip').click();
  await setChecked(page, '#gx-mode-slip', true);
  await typeEntry(page, 'slipMin', slip[0]);
  await typeEntry(page, 'slipMax', slip[1]);
  await action(page, 'Review scenario').click();
  await expect(heading(page)).toHaveText(REVIEW_HEADING);
}

async function showResults(page: Page): Promise<void> {
  await action(page, 'Show results').click();
  await expect(heading(page)).toHaveText(RESULTS_HEADING);
}

const items = (block: ReturnType<typeof reviewBlock>) => block.locator('li');

/** Record every SVG the page hands to an image decoder, so the PNG's strip can be read as text. */
async function recordRasterized(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __greSvgs: string[] }).__greSvgs = seen;
    const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')!;
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      ...descriptor,
      set(value: string) {
        if (typeof value === 'string' && value.startsWith('data:image/svg+xml')) seen.push(decodeURIComponent(value.slice(value.indexOf(',') + 1)));
        descriptor.set!.call(this, value);
      },
    });
  });
}

/** The strip text of the last exported chart image, its wrapped lines joined with spaces. */
async function stripText(page: Page): Promise<string> {
  const svgs = await page.evaluate(() => (window as unknown as { __greSvgs: string[] }).__greSvgs);
  const strip = [...svgs].reverse().find(svg => svg.includes('Requested scenario:'));
  expect(strip, 'an exported image with its strip').toBeTruthy();
  const texts = [...strip!.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m => m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'));
  return texts.join(' ');
}

/** The paragraphs of a document.xml, each its runs' text joined. */
const paragraphs = (xml: string): string[] => [...xml.matchAll(/<w:p>(.*?)<\/w:p>/g)].map(p => [...p[1].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(t => t[1]).join('').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'));

test('site notes: beside both limited profiles from the start, stable, described, neutral, never live', async ({ page }) => {
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  // Before any other answer (incomplete inputs).
  await expect(note(page, RANDOM)).toHaveText(RANDOM_NOTE);
  await expect(note(page, ALTERNATING)).toHaveText(ALTERNATING_NOTE);
  await expect(page.locator('.gx-choice-note')).toHaveCount(2);
  await expect(page.locator('#gx-sediment-6')).toHaveAccessibleDescription(RANDOM_NOTE);
  await expect(page.locator('#gx-sediment-8')).toHaveAccessibleDescription(ALTERNATING_NOTE);
  await expect(page.locator('#gx-sediment-2')).toHaveAccessibleDescription('');
  for (const i of [RANDOM, ALTERNATING]) {
    // Information, not a warning or an error, and outside every live region.
    expect(await note(page, i).evaluate(el => el.closest('[aria-live], [role="status"], [role="alert"], .gx-warning, .gx-field-error') === null)).toBe(true);
  }
  // The uncertainty hint and Select all are unchanged.
  await expect(page.locator('#gx-group-sediment > p').first()).toContainText('If unknown, select all.');
  await expect(page.locator('#gx-sediment-all')).toHaveCount(1);

  // Slider movement and other choices change no note and add no live region; the range echo still announces.
  const live = await page.locator('[aria-live]').count();
  const echo = page.locator('#gx-echo-faultDip');
  await chooseRange(page, 'faultDip', 3, 3);
  await expect(echo).toHaveText('Selected: 45° — 1 of 7 modeled angles.');
  await setChecked(page, '#gx-sediment-8', true);
  await setChecked(page, `#gx-density-${MEDIUM}`, true);
  await expect(note(page, RANDOM)).toHaveText(RANDOM_NOTE);
  await expect(note(page, ALTERNATING)).toHaveText(ALTERNATING_NOTE);
  await expect(page.locator('[aria-live]')).toHaveCount(live);
  await expect(page.locator('[role="status"]').first()).not.toContainText('this data release');
  // Select all keeps every profile; the notes stay.
  await setChecked(page, '#gx-sediment-all', true);
  await expect(page.locator('#gx-group-sediment input[data-choice="sediment"]:checked')).toHaveCount(9);
  await expect(page.locator('.gx-choice-note')).toHaveCount(2);
});

test('the 45° absence: review, results, draft edits, the strip PNG, the sidecar, and the download', async ({ page }, testInfo) => {
  await recordRasterized(page);
  await gotoExplore(page);
  await toReview(page, [3, 3], [2, 2], [DENSE], [U_STRONG, ALTERNATING]);
  await expect(reviewBlock(page).locator('h4')).toHaveText('Simulations for these site conditions');
  await expect(reviewBlock(page).locator('.gx-hint')).toHaveText(REVIEW_HINT);
  await expect(items(reviewBlock(page))).toHaveText(['Layered: Alternating Strong-Weak — this data release has no simulations for your selected site conditions.']);
  await expect(reviewBlock(page).locator('> p').last()).toHaveText(REST);
  // The offset-conversion table and its messages are untouched by the block (slip mode shows none).
  await expect(page.locator('.gx-conversions')).toHaveCount(0);

  await showResults(page);
  await expect(confirmedCount(page)).toHaveText(countText(1200));
  await expect(page.locator('.gx-measurement .gx-section-head strong')).toHaveText('1,164 measurements used');
  await expect(resultsBlockOf(page).locator('h4')).toHaveText('Represented in these results');
  await expect(resultsBlockOf(page).locator('> p')).toHaveText('Uniform: Strong');
  await expect(items(resultsBlockOf(page))).toHaveText([ABSENT_45]);
  // The block sits in the confirmed-scenario section and is no live region.
  expect(await resultsBlockOf(page).evaluate(el => el.closest('.gx-context') !== null && el.closest('[aria-live], [role="status"]') === null)).toBe(true);

  // Draft edits leave the confirmed block alone (D-27).
  await stepButton(page, 'site').click();
  await setChecked(page, `#gx-sediment-${ALTERNATING}`, false);
  await stepButton(page, 'results').click();
  await expect(page.locator('.gx-pending')).toContainText('You have unapplied changes');
  await expect(items(resultsBlockOf(page))).toHaveText([ABSENT_45]);

  // The chart image: its strip names the request and qualifies the plotted measurement.
  const downloads: Download[] = [];
  const both = new Promise<void>(resolve => page.on('download', d => { downloads.push(d); if (downloads.length === 2) resolve(); }));
  await page.locator('#gx-chart-export').click();
  await both;
  const strip = await stripText(page);
  expect(strip).toContain('Requested scenario: Dip 45° · Strong (uniform) or Alternating Strong–Weak (layered) · depth 10 m · density Dense · slip 0–5 m');
  expect(strip).toContain(STRIP_45);
  expect(strip.indexOf(STRIP_45)).toBeGreaterThan(strip.indexOf('N = 1,164 measurements used of 1,200 matching simulation stages'));
  const sidecar = readFileSync((await downloads[1]!.path())!, 'utf8');
  expect(sidecar).toContain(`\n\nSediment-profile coverage\n${ABSENT_45_SUMMARY}\n\nLicences\n`);
  page.removeAllListeners('download');

  // The download: provenance.txt, README.txt, and report.docx.
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#gre-explore button[data-action="download"]').click()]);
  const captured = await readDownload(download, testInfo, 'explore-coverage');
  const provenance = captured.members.get('provenance.txt')!.toString('utf8');
  expect(provenance).toContain(`\n\nSediment-profile coverage\n${ABSENT_45_SUMMARY}\n\nLicences\n`);
  expect(provenance.indexOf('Sediment-profile coverage')).toBeLessThan(provenance.lastIndexOf('Licences'));
  expect(captured.members.get('README.txt')!.toString('utf8')).toContain('provenance.txt\n  The paper citation, the data DOIs, the software and data versions, the scenario settings, the population, the counts, the sediment-profile coverage, the time the download was made, the caveats, and the licences.\n');
  const document = paragraphs(unzipStored(captured.members.get('report.docx')!).get('word/document.xml')!.toString('utf8'));
  const at = document.indexOf('Sediment-profile coverage');
  expect(at).toBeGreaterThan(0);
  expect(document[at + 1]).toBe(ABSENT_45_SUMMARY);
  expect(document.filter(line => line.startsWith('Requested scenario: Dip 45°'))).toHaveLength(6);
  expect(document.filter(line => line === STRIP_45)).toHaveLength(6);
  // The report's scenario table still reads the unprefixed summary.
  expect(document).toContain('Sediment strength and structure');
  expect(document.some(line => line.startsWith('Strong (uniform) or Alternating Strong–Weak (layered)'))).toBe(true);
});

test('the 40–45° partial case', async ({ page }) => {
  await gotoExplore(page);
  await toReview(page, [2, 3], [2, 2], [DENSE], [U_STRONG, ALTERNATING]);
  await expect(items(reviewBlock(page))).toHaveText(['Layered: Alternating Strong-Weak — simulations at fault angle 40°; none at fault angle 45°.']);
  await expect(reviewBlock(page).locator('> p').last()).toHaveText(REST);
  await showResults(page);
  await expect(items(resultsBlockOf(page))).toHaveText(['Layered: Alternating Strong-Weak — represented at fault angle 40°. No simulations at fault angle 45° in this data release.']);
  await expect(resultsBlockOf(page).locator('> p')).toHaveText('Uniform: Strong; Layered: Alternating Strong-Weak');
});

test('depth and density restrictions, one and two partial dimensions', async ({ page }) => {
  await gotoExplore(page);
  await toReview(page, [0, 0], [1, 2], [DENSE], [RANDOM]);
  await expect(items(reviewBlock(page))).toHaveText(['Layered: Random Heterogeneous — simulations at sediment depth 10 m; none at sediment depth 5 m.']);
  // Every selected profile is affected: no closing line.
  await expect(reviewBlock(page).locator('> p')).toHaveCount(1);
  await stepButton(page, 'site').click();
  await setChecked(page, `#gx-density-${MEDIUM}`, true);
  await stepButton(page, 'review').click();
  await expect(items(reviewBlock(page))).toHaveText(['Layered: Random Heterogeneous — simulations at sediment depth 10 m and density Dense; none for the other selected combinations.']);
});

test('Select all: every profile kept; review and results close with the catch-all', async ({ page }) => {
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  for (const group of ['faultDip', 'depth'] as const) await page.locator(`#gx-${group}-full`).click();
  for (const group of ['density', 'sediment'] as const) await setChecked(page, `#gx-${group}-all`, true);
  await action(page, 'Continue to fault slip').click();
  await setChecked(page, '#gx-mode-slip', true);
  await typeEntry(page, 'slipMin', '0');
  await typeEntry(page, 'slipMax', '5');
  await action(page, 'Review scenario').click();
  await expect(items(reviewBlock(page))).toHaveText([
    'Layered: Random Heterogeneous — simulations at sediment depth 10 m and density Dense; none for the other selected combinations.',
    'Layered: Alternating Strong-Weak — simulations at fault angles 20°, 40° and 60°, sediment depth 10 m and density Dense; none for the other selected combinations.',
  ]);
  await expect(reviewBlock(page).locator('> p').last()).toHaveText(REST);
  await showResults(page);
  await expect(items(resultsBlockOf(page))).toHaveText([
    'Layered: Random Heterogeneous — represented at sediment depth 10 m and density Dense. No simulations for the other selected combinations in this data release.',
    'Layered: Alternating Strong-Weak — represented at fault angles 20°, 40° and 60°, sediment depth 10 m and density Dense. No simulations for the other selected combinations in this data release.',
  ]);
  await expect(resultsBlockOf(page).locator('> p')).toHaveText('Uniform: Weak; Uniform: Moderate; Uniform: Strong; Layered: Weak; Layered: Moderate; Layered: Strong; Layered: Random Heterogeneous; Layered: Cohesive Top Unit; Layered: Alternating Strong-Weak');
});

for (const sample of ['illustrative', 'kern'] as const) {
  test(`the ${sample} sample: notes on the site step, no coverage block at review or in results`, async ({ page }) => {
    await gotoExplore(page);
    await pickSample(page, sample);
    await expect(note(page, RANDOM)).toHaveText(RANDOM_NOTE);
    await expect(note(page, ALTERNATING)).toHaveText(ALTERNATING_NOTE);
    await action(page, 'Continue to fault slip').click();
    await page.locator('#gx-offset-feedback table').waitFor();
    await action(page, 'Review scenario').click();
    await expect(heading(page)).toHaveText(REVIEW_HEADING);
    await expect(reviewBlock(page)).toHaveCount(0);
    await showResults(page);
    await expect(resultsBlockOf(page)).toHaveCount(0);
    await expect(page.locator('.gx-coverage-note')).toHaveCount(0);
  });
}

test('a restored gapped set is assessed by its stored values', async ({ page }) => {
  await gotoExplore(page);
  await toReview(page, [2, 3], [2, 2], [DENSE], [U_STRONG, ALTERNATING]);
  await showResults(page);
  const record = (await storedRecord(page))!;
  const gapped = { ...record, draft: { ...record.draft, faultDip: [20, 45] }, confirmed: { ...record.confirmed, faultDip: [20, 45] } };
  await page.evaluate(([key, value]) => sessionStorage.setItem(key, value), [SESSION_KEY, JSON.stringify(gapped)] as const);
  await page.reload();
  await explorerReady(page);
  await expect(page.locator('.gx-restored')).toHaveCount(1);
  await expect(items(resultsBlockOf(page))).toHaveText(['Layered: Alternating Strong-Weak — represented at fault angle 20°. No simulations at fault angle 45° in this data release.']);
  await stepButton(page, 'review').click();
  await expect(items(reviewBlock(page))).toHaveText(['Layered: Alternating Strong-Weak — simulations at fault angle 20°; none at fault angle 45°.']);
});

test('a later-filter exclusion (scarp type) keeps the reasons distinct', async ({ page }) => {
  await gotoExplore(page);
  await toReview(page, [0, 2], [2, 2], [DENSE], [U_STRONG, ALTERNATING]);
  await showResults(page);
  await expect(items(resultsBlockOf(page))).toHaveText(['Layered: Alternating Strong-Weak — represented at fault angles 20° and 40°. No simulations at fault angle 30° in this data release.']);
  await page.locator('#gx-refine-button').click();
  await setChecked(page, '#gx-scarpClass-all', true);
  await setChecked(page, '#gx-scarpClass-all', false);
  await setChecked(page, '#gx-scarpClass-1', true);
  await action(page, 'Review changes').click();
  await expect(heading(page)).toHaveText(REVIEW_HEADING);
  // Review describes availability only: the filter changes nothing there.
  await expect(items(reviewBlock(page))).toHaveText(['Layered: Alternating Strong-Weak — simulations at fault angles 20° and 40°; none at fault angle 30°.']);
  await showResults(page);
  await expect(confirmedCount(page)).toHaveText(countText(174));
  await expect(items(resultsBlockOf(page))).toHaveText([
    'Uniform: Strong — represented at fault angles 30° and 40°. No stages at fault angle 20° remain after the confirmed range and refinements.',
    'Layered: Alternating Strong-Weak — represented at fault angle 40°. No stages at fault angle 20° remain after the confirmed range and refinements. No simulations at fault angle 30° in this data release.',
  ]);
});

test('no recorded values (PDD §4.5’s 0–0.04 m window): §5.8’s notice alone on the page; the provenance names each profile', async ({ page }, testInfo) => {
  await gotoExplore(page);
  await toReview(page, [2, 2], [2, 2], [DENSE], [U_STRONG, ALTERNATING], ['0', '0.04']);
  await expect(reviewBlock(page)).toHaveCount(0);
  await showResults(page);
  await expect(page.locator('.gx-measurement .gx-warning').last()).toContainText('but none has a scarp height value');
  await expect(page.locator('.gx-coverage-note')).toHaveCount(0);
  await expect(resultsBlockOf(page)).toHaveCount(0);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#gre-explore button[data-action="download"]').click()]);
  const provenance = (await readDownload(download, testInfo, 'explore-coverage-null')).members.get('provenance.txt')!.toString('utf8');
  const block = provenance.slice(provenance.indexOf('Sediment-profile coverage\n'), provenance.lastIndexOf('\n\nLicences\n'));
  const tail = 'are in your results, but their stages have no recorded';
  expect(block.split('\n').slice(1)).toEqual([
    `Simulations for Strong (uniform) ${tail} scarp height values, so this chart cannot show them. Their stages are part of the Missing values (excluded) count in the statistics table.`,
    `Simulations for Alternating Strong–Weak (layered) ${tail} scarp height values, so this chart cannot show them. Their stages are part of the Missing values (excluded) count in the statistics table.`,
    `Simulations for Strong (uniform) ${tail} deformation zone width values, so this chart cannot show them. Their stages are part of the Missing values (excluded) count in the statistics table.`,
    `Simulations for Alternating Strong–Weak (layered) ${tail} deformation zone width values, so this chart cannot show them. Their stages are part of the Missing values (excluded) count in the statistics table.`,
    `Simulations for Strong (uniform) ${tail} scarp dip values, so this chart cannot show them. Their stages are part of the Missing values (excluded) count in the statistics table.`,
    `Simulations for Alternating Strong–Weak (layered) ${tail} scarp dip values, so this chart cannot show them. Their stages are part of the Missing values (excluded) count in the statistics table.`,
  ]);
  expect(provenance).not.toContain('Every selected profile has simulations');
});

test('full coverage: the provenance full line', async ({ page }, testInfo) => {
  await gotoExplore(page);
  await toReview(page, [2, 2], [2, 2], [DENSE], [U_STRONG]);
  await showResults(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#gre-explore button[data-action="download"]').click()]);
  const provenance = (await readDownload(download, testInfo, 'explore-coverage-full')).members.get('provenance.txt')!.toString('utf8');
  expect(provenance).toContain('\n\nSediment-profile coverage\nEvery selected profile has simulations for the selected site conditions and contributes matching stages to this result.\n\nLicences\n');
});

test('an empty result: the existing explainer, unchanged, with the coverage lines beside it', async ({ page }) => {
  await gotoExplore(page);
  await toReview(page, [3, 3], [2, 2], [DENSE], [ALTERNATING]);
  await expect(items(reviewBlock(page))).toHaveText(['Layered: Alternating Strong-Weak — this data release has no simulations for your selected site conditions.']);
  await showResults(page);
  await expect(confirmedCount(page)).toHaveText(countText(0));
  const empty = page.locator('.gx-empty');
  await expect(empty.locator('> h3')).toHaveText('No matching simulation stages');
  await expect(empty.locator('> p').first()).toHaveText(/^No simulations match this scenario\./);
  await expect(empty.locator('> p').last()).toHaveText('Change a condition or slip range, then review the scenario again.');
  await expect(empty.locator('#gx-results-coverage li')).toHaveText([ABSENT_45]);
  await expect(empty.locator('#gx-results-coverage > p')).toHaveCount(0);
  await expect(page.locator('.gx-context #gx-results-coverage')).toHaveCount(0);
});

test('320 px: notes, review and results blocks fit without horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  await expect(note(page, ALTERNATING)).toBeVisible();
  expect(await overflows(page)).toBe(false);
  await chooseSiteBy(page, [0, 6], [0, 2], [DENSE], [U_STRONG, RANDOM, ALTERNATING]);
  await action(page, 'Continue to fault slip').click();
  await setChecked(page, '#gx-mode-slip', true);
  await typeEntry(page, 'slipMin', '0');
  await typeEntry(page, 'slipMax', '5');
  await action(page, 'Review scenario').click();
  await expect(reviewBlock(page)).toBeVisible();
  expect(await overflows(page)).toBe(false);
  await showResults(page);
  await expect(resultsBlockOf(page)).toBeVisible();
  expect(await overflows(page)).toBe(false);
});
