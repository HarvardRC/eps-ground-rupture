// explore-sample.spec.ts (guided DDD §9.5 item 5, parameterized by
// §10.1): the sample chooser — each sample's silent fresh fill, both
// ask-before-replace outcomes with the chosen sample keeping its
// identity, confirmed results untouched, and keyboard operation
// (§§9.1, 10.1; PDD D-37, D-42).

import { expect, test, type Page } from '@playwright/test';
import {
  SITE_HEADING, action, confirmGolden, confirmedCount, countText, gotoExplore, heading, setChecked, stepButton,
} from '../explore-support';

test.describe.configure({ timeout: 120_000 });

const HINT = 'Sample values, not recommended site values.';

const SAMPLES = [
  {
    id: 'illustrative',
    label: 'Illustrative sample',
    name: 'illustrative sample',
    site: ['30°', '40°', '5 m', 'Dense', 'Uniform sediment: Strong', 'Layered sediment: Strong'],
    offsetMax: '3',
  },
  {
    id: 'kern',
    label: 'Kern County 1952 sample',
    name: 'Kern County 1952 sample',
    site: ['60°', '70°', '10 m', 'Medium', 'Uniform sediment: Moderate', 'Layered sediment: Moderate'],
    offsetMax: '1.3',
  },
] as const;

type Sample = (typeof SAMPLES)[number];

const chooser = (page: Page, sample: Sample) => page.locator(`#gx-sample-${sample.id}`);
const status = (sample: Sample) => `Filled with the ${sample.name}: sample values, not recommended site values. Change anything.`;
const question = (sample: Sample) => `Replace your current choices with the ${sample.name}?`;

/** The checked site choices by accessible name, in page order. */
const checkedSite = (page: Page) =>
  page.locator('.gx-site-grid input[data-choice]:checked').evaluateAll((inputs) =>
    inputs.map((input) => input.getAttribute('aria-label') ?? input.closest('label')!.textContent!.trim()),
  );

/** The chosen sample filled the draft and opened Site conditions, naming itself. */
async function expectFilled(page: Page, sample: Sample): Promise<void> {
  await expect(heading(page)).toHaveText(SITE_HEADING);
  await expect(page.locator('.gx-sample-status')).toHaveText(status(sample));
  await expect(page.locator('.gx-sample-status')).toHaveAttribute('role', 'status');
  expect(await checkedSite(page)).toEqual([...sample.site]);
}

test('the chooser offers both samples by name, labeled as sample values', async ({ page }) => {
  await gotoExplore(page);
  await expect(page.locator('#gx-sample-label')).toHaveText('Try a sample:');
  await expect(page.locator('.gx-sample-choice')).toHaveAttribute('role', 'group');
  await expect(page.locator('.gx-sample-choice')).toHaveAttribute('aria-labelledby', 'gx-sample-label');
  await expect(page.locator('.gx-sample-choice button')).toHaveText(SAMPLES.map((s) => s.label));
  for (const sample of SAMPLES) await expect(chooser(page, sample)).toHaveAttribute('aria-describedby', 'gx-sample-hint');
  await expect(page.locator('#gx-sample-hint')).toHaveText(HINT);
  await expect(page.getByRole('button', { name: 'Try sample inputs' })).toHaveCount(0);
});

for (const sample of SAMPLES) {
  test(`${sample.id}: a fresh draft fills silently with the named sample`, async ({ page }) => {
    let dialogs = 0;
    page.on('dialog', (d) => { dialogs += 1; void d.dismiss(); });
    await gotoExplore(page);
    await chooser(page, sample).click();
    await expectFilled(page, sample);

    await action(page, 'Continue to fault movement').click();
    await expect(page.locator('.gx-sample-status')).toHaveCount(0);
    await expect(page.locator('#gx-mode-offset')).toBeChecked();
    await expect(page.locator('#gx-offsetMax')).toHaveValue(sample.offsetMax);
    await page.locator('#gx-offset-feedback table').waitFor();
    if (sample.id === 'illustrative') {
      // The deliberate coverage demonstration at 30° (D-37), not at 40°.
      await expect(page.locator('#gx-offset-feedback .gx-warning')).toContainText('At 30°');
      await expect(page.locator('#gx-offset-feedback .gx-warning')).not.toContainText('At 40°');
    } else {
      // The observed state recorded in the G-14 evidence: 1.3 m is within
      // per-dip coverage at both 60° and 70°, so no warning appears.
      await expect(page.locator('#gx-offset-feedback .gx-warning')).toHaveCount(0);
      await expect(page.locator('#gx-offset-feedback tbody tr')).toHaveCount(2);
      for (const dip of ['60°', '70°']) {
        await expect(page.locator('#gx-offset-feedback tbody tr', { hasText: dip })).toContainText('Within range');
      }
    }
    expect(dialogs).toBe(0);
  });

  test(`${sample.id}: with a confirmed scenario, Keep my choices keeps them and Use the sample replaces only the draft`, async ({ page }) => {
    let dialogs = 0;
    page.on('dialog', (d) => { dialogs += 1; void d.dismiss(); });
    await gotoExplore(page);
    const ref = await confirmGolden(page, 'GS-6');
    const count = countText(ref.counts.matching_records);
    await page.locator('#gx-refine-button').click();
    await setChecked(page, '#gx-population-one_state_per_trial', true);

    await stepButton(page, 'intro').click();
    await chooser(page, sample).click();
    await expect(page.locator('#gx-sample-question')).toHaveText(question(sample));
    await expect(page.locator('#gx-sample-question')).toBeFocused();
    await expect(action(page, 'Build your scenario')).toHaveCount(0);
    await action(page, 'Keep my choices').click();
    // Focus returns to the option that asked, not to the other one.
    await expect(chooser(page, sample)).toBeFocused();
    await stepButton(page, 'results').click();
    await expect(page.locator('#gx-population-one_state_per_trial')).toBeChecked();

    await stepButton(page, 'intro').click();
    await chooser(page, sample).click();
    await expect(page.locator('#gx-sample-question')).toHaveText(question(sample));
    await action(page, 'Use the sample').click();
    await expectFilled(page, sample);
    await stepButton(page, 'results').click();
    await expect(confirmedCount(page)).toHaveText(count);
    await expect(page.locator('.gx-pending')).toContainText('You have unapplied changes');
    await expect(page.locator('#gx-population-all_stages')).toBeChecked();
    expect(dialogs).toBe(0);
  });
}

test('an edited draft without a confirmation asks first, and each option keeps its identity', async ({ page }) => {
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  await setChecked(page, '#gx-faultDip-0', true);
  await stepButton(page, 'intro').click();
  const [illustrative, kern] = SAMPLES;

  await chooser(page, illustrative).click();
  await expect(page.locator('#gx-sample-question')).toHaveText(question(illustrative));
  await action(page, 'Keep my choices').click();
  await expect(chooser(page, illustrative)).toBeFocused();

  // Asking about one sample and then the other names the second.
  await chooser(page, kern).click();
  await expect(page.locator('#gx-sample-question')).toHaveText(question(kern));
  await action(page, 'Keep my choices').click();
  await expect(chooser(page, kern)).toBeFocused();
  await action(page, 'Build your scenario').click();
  await expect(page.locator('#gx-faultDip-0')).toBeChecked();
  await expect(page.locator('.gx-sample-status')).toHaveCount(0);

  await stepButton(page, 'intro').click();
  await chooser(page, kern).click();
  await action(page, 'Use the sample').click();
  await expectFilled(page, kern);

  // From a filled Kern draft, the illustrative option asks and replaces with its own values.
  await stepButton(page, 'intro').click();
  await chooser(page, illustrative).click();
  await expect(page.locator('#gx-sample-question')).toHaveText(question(illustrative));
  await action(page, 'Use the sample').click();
  await expectFilled(page, illustrative);
});

test('the chooser works from the keyboard', async ({ page }) => {
  await gotoExplore(page);
  const [illustrative, kern] = SAMPLES;
  await action(page, 'Build your scenario').focus();
  await page.keyboard.press('Tab');
  await expect(chooser(page, illustrative)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(chooser(page, kern)).toBeFocused();
  await page.keyboard.press('Enter');
  await expectFilled(page, kern);

  // Back on the introduction with a non-fresh draft: the question, then Keep and Use by keyboard.
  await stepButton(page, 'intro').click();
  await chooser(page, illustrative).focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#gx-sample-question')).toBeFocused();
  await expect(page.locator('#gx-sample-question')).toHaveText(question(illustrative));
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Use the sample' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Keep my choices' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(chooser(page, illustrative)).toBeFocused();
  // Ask again and accept by keyboard: Enter asks, Tab reaches Use the sample.
  await page.keyboard.press('Enter');
  await expect(page.locator('#gx-sample-question')).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expectFilled(page, illustrative);
});

// The "About this sample" disclosure (guided DDD §10.2): closed after
// either fill, the sample's own story with loaded, credited images,
// kept open across a re-render, and gone with the status line.
const STORY = {
  illustrative: { text: 'do not model the Chi-Chi earthquake', credit: 'Photo: Liu Shu fu / Office of the President, Taiwan', image: 'sample-chichi-kuangfu-track.jpg' },
  kern: { text: 'M 7.36 Kern County earthquake', credit: 'Photo: D. H. Kupfer, U.S. Geological Survey, 1952. Public domain.', image: 'sample-kern-bealville-tracks.jpg' },
} as const;

for (const sample of SAMPLES) {
  test(`${sample.id}: the story disclosure follows the fill`, async ({ page }) => {
    await gotoExplore(page);
    await action(page, 'Build your scenario').click();
    await expect(page.locator('.gx-sample-story')).toHaveCount(0);
    await stepButton(page, 'intro').click();
    await chooser(page, sample).click();
    await expectFilled(page, sample);

    const story = page.locator('details.gx-sample-story');
    await expect(story).toHaveCount(1);
    await expect(story).not.toHaveAttribute('open');
    await expect(story.locator('summary')).toHaveText('About this sample');
    await story.locator('summary').click();
    await expect(story).toHaveAttribute('open');
    await expect(story).toContainText(STORY[sample.id].text);
    const other = SAMPLES.find((s) => s.id !== sample.id)!;
    await expect(story).not.toContainText(STORY[other.id].text);

    const image = story.locator('img');
    await expect(image).toHaveCount(1);
    await expect(image).toHaveAttribute('src', `../images/${STORY[sample.id].image}`);
    expect((await image.getAttribute('alt'))!.length).toBeGreaterThan(20);
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(0);
    await expect(story.locator('.gx-credit')).toContainText(STORY[sample.id].credit);
    for (const anchor of await story.locator('a').all()) await expect(anchor).toHaveAttribute('target', '_blank');

    // Open state survives a re-render of Site conditions; the story is never part of the draft.
    await setChecked(page, '#gx-faultDip-0', true);
    await expect(page.locator('details.gx-sample-story')).toHaveAttribute('open');
    await action(page, 'Continue to fault movement').click();
    await expect(page.locator('.gx-sample-story')).toHaveCount(0);
    await stepButton(page, 'site').click();
    await expect(page.locator('.gx-sample-story')).toHaveCount(0);

    // A new fill starts closed.
    await stepButton(page, 'intro').click();
    await chooser(page, sample).click();
    await action(page, 'Use the sample').click();
    await expect(page.locator('details.gx-sample-story')).not.toHaveAttribute('open');
  });
}
