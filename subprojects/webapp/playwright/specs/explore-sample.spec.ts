// explore-sample.spec.ts (guided DDD §9.5 item 5, parameterized by
// §§10.1 and 10.3): the Try a prefilled sample listbox and its keyboard
// operation; each sample's silent fresh fill, prefilled in both movement
// modes; the modal replacement question, its focus, and both outcomes
// with the chosen sample keeping its identity; confirmed results
// untouched; the prefill notice standing on both input steps until the
// first draft edit; and the sequential footer after a fill (§§9.1,
// 10.1–10.3; PDD D-37, D-42, D-43).

import { expect, test, type Page } from '@playwright/test';
import {
  MOVEMENT_HEADING, SITE_HEADING, action, confirmGolden, confirmedCount, countText, gotoExplore, heading, pickSample,
  setChecked, stepButton, typeEntry,
} from '../explore-support';

test.describe.configure({ timeout: 120_000 });

const HINT = 'Sample values, not recommended site values.';

const SAMPLES = [
  {
    id: 'illustrative',
    label: 'Chi-Chi scale — shallow fault (30°/40°)',
    descriptor: 'Up to 3 m of surface offset or 3–5 m of fault slip, at the scale of the 1999 Chi-Chi earthquake.',
    name: 'Chi-Chi scale',
    site: ['30°', '40°', '5 m', 'Dense', 'Uniform sediment: Strong', 'Layered sediment: Strong'],
    offsetMax: '3', slipMin: '3', slipMax: '5',
  },
  {
    id: 'kern',
    label: 'Kern County 1952 scale — steep fault (60°/70°)',
    descriptor: 'Up to 1.3 m of surface offset or 1.6–1.9 m of fault slip, at the scale of the 1952 Kern County earthquake.',
    name: 'Kern County 1952 scale',
    site: ['60°', '70°', '10 m', 'Medium', 'Uniform sediment: Moderate', 'Layered sediment: Moderate'],
    offsetMax: '1.3', slipMin: '1.6', slipMax: '1.9',
  },
] as const;

type Sample = (typeof SAMPLES)[number];

const trigger = (page: Page) => page.locator('#gx-sample-trigger');
const list = (page: Page) => page.locator('#gx-sample-list');
const option = (page: Page, sample: Sample) => page.locator(`#gx-sample-${sample.id}`);
const dialog = (page: Page) => page.locator('#gx-sample-dialog');
const notice = (page: Page) => page.locator('.gx-sample-status');
const announced = (page: Page) => page.locator('#gre-explore > p.gx-sr-only[role="status"]');
const noticeText = (sample: Sample) => `Prefilled with the ${sample.name} values. This is an illustration — change anything you wish.`;
const question = (sample: Sample) => `Replace your current choices with the ${sample.name} values?`;

/** The checked site choices by accessible name, in page order. */
const checkedSite = (page: Page) =>
  page.locator('.gx-site-grid input[data-choice]:checked').evaluateAll((inputs) =>
    inputs.map((input) => input.getAttribute('aria-label') ?? input.closest('label')!.textContent!.trim()),
  );

/** The chosen sample filled the draft and opened Site conditions, naming itself once. */
async function expectFilled(page: Page, sample: Sample): Promise<void> {
  await expect(heading(page)).toHaveText(SITE_HEADING);
  await expect(notice(page)).toHaveText(noticeText(sample));
  // Announced once through the shared status region, not by the standing notice.
  await expect(announced(page)).toHaveText(noticeText(sample));
  await expect(notice(page)).not.toHaveAttribute('role');
  expect(await checkedSite(page)).toEqual([...sample.site]);
}

/** The modal question is open, names the sample, and holds focus on Keep my choices. */
async function expectAsked(page: Page, sample: Sample): Promise<void> {
  await expect(dialog(page)).toBeVisible();
  await expect(page.getByRole('dialog', { name: question(sample) })).toBeVisible();
  expect(await dialog(page).evaluate((node) => node.matches(':modal'))).toBe(true);
  await expect(page.locator('#gx-sample-keep')).toBeFocused();
}

test('Try a prefilled sample opens a listbox naming both samples by scale, with descriptors', async ({ page }) => {
  await gotoExplore(page);
  await expect(trigger(page)).toHaveText(/^Try a prefilled sample/);
  await expect(trigger(page)).toHaveAttribute('aria-haspopup', 'listbox');
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger(page)).toHaveAccessibleDescription(HINT);
  await expect(list(page)).toBeHidden();
  await expect(page.locator('.gx-sample-choice')).toHaveCount(0);

  await trigger(page).click();
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('listbox', { name: 'Try a prefilled sample' })).toBeVisible();
  for (const sample of SAMPLES) {
    const item = page.getByRole('option', { name: sample.label, exact: true });
    await expect(item).toBeVisible();
    await expect(item).toHaveAccessibleDescription(sample.descriptor);
  }
  await expect(option(page, SAMPLES[0])).toBeFocused();
  await expect(option(page, SAMPLES[0])).toHaveAttribute('aria-selected', 'true');
  // The button closes it again, keeping focus.
  await trigger(page).click();
  await expect(list(page)).toBeHidden();
  await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger(page)).toBeFocused();
  // A click elsewhere closes it too.
  await trigger(page).click();
  await page.locator('.gx-intro-grid').click();
  await expect(list(page)).toBeHidden();
  await expect(heading(page)).toHaveText('Use simulations to understand ground rupture.');
});

for (const sample of SAMPLES) {
  test(`${sample.id}: the listbox works from the keyboard`, async ({ page }) => {
    await gotoExplore(page);
    const [first, last] = SAMPLES;
    await action(page, 'Build your scenario').focus();
    await page.keyboard.press('Tab');
    await expect(trigger(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(option(page, first)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(option(page, last)).toBeFocused();
    await expect(option(page, last)).toHaveAttribute('aria-selected', 'true');
    await expect(option(page, first)).toHaveAttribute('aria-selected', 'false');
    await page.keyboard.press('ArrowDown');
    await expect(option(page, last)).toBeFocused();
    await page.keyboard.press('Home');
    await expect(option(page, first)).toBeFocused();
    await page.keyboard.press('End');
    await expect(option(page, last)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(list(page)).toBeHidden();
    await expect(trigger(page)).toBeFocused();
    // ArrowUp opens on the last option; Tab leaves and closes the list.
    await page.keyboard.press('ArrowUp');
    await expect(option(page, last)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(list(page)).toBeHidden();
    await expect(trigger(page)).toHaveAttribute('aria-expanded', 'false');

    // Space opens; the arrows reach this sample; Enter chooses it.
    await trigger(page).focus();
    await page.keyboard.press('Space');
    await expect(option(page, first)).toBeFocused();
    if (sample.id === last.id) await page.keyboard.press('ArrowDown');
    await expect(option(page, sample)).toBeFocused();
    await page.keyboard.press('Enter');
    await expectFilled(page, sample);
  });

  test(`${sample.id}: a fresh draft fills silently, prefilled in both movement modes, and the walk stays sequential`, async ({ page }) => {
    let dialogs = 0;
    page.on('dialog', (d) => { dialogs += 1; void d.dismiss(); });
    await gotoExplore(page);
    await pickSample(page, sample.id);
    await expectFilled(page, sample);
    await expect(dialog(page)).toHaveCount(0);
    await expect(action(page, 'Return to review')).toHaveCount(0);

    await action(page, 'Continue to fault movement').click();
    await expect(heading(page)).toHaveText(MOVEMENT_HEADING);
    await expect(notice(page)).toHaveText(noticeText(sample));
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
    // Switching modes shows the other prefilled window; it is not an edit.
    await setChecked(page, '#gx-mode-slip', true);
    await expect(page.locator('#gx-slipMin')).toHaveValue(sample.slipMin);
    await expect(page.locator('#gx-slipMax')).toHaveValue(sample.slipMax);
    await expect(page.locator('#gx-error-slipMin')).toBeHidden();
    await expect(page.locator('#gx-error-slipMax')).toBeHidden();
    await expect(notice(page)).toHaveText(noticeText(sample));

    // The slip-mode sample is a valid scenario on review.
    await action(page, 'Review scenario').click();
    await expect(page.locator('.gx-review-section', { hasText: 'Edit fault movement' })).toContainText(`${sample.slipMin}–${sample.slipMax} m fault slip`);
    await expect(page.locator('.gx-warning')).toHaveCount(0);
    await stepButton(page, 'site').click();
    await expect(notice(page)).toHaveText(noticeText(sample));
    // Review now reached and the walk past Site conditions, Return to review leads again.
    await expect(page.locator('.gx-footer .gx-primary')).toHaveText('Return to review');
    expect(dialogs).toBe(0);
  });

  test(`${sample.id}: the notice stands on both input steps until the first draft edit`, async ({ page }) => {
    await gotoExplore(page);
    await pickSample(page, sample.id);
    await expectFilled(page, sample);
    await action(page, 'Continue to fault movement').click();
    await expect(notice(page)).toHaveText(noticeText(sample));
    await stepButton(page, 'site').click();
    await expect(notice(page)).toHaveText(noticeText(sample));
    await stepButton(page, 'intro').click();
    await stepButton(page, 'movement').click();
    await expect(notice(page)).toHaveText(noticeText(sample));

    // Typing removes it in place, without a re-render; it does not come back.
    await typeEntry(page, 'offsetMax', '1');
    await expect(notice(page)).toHaveCount(0);
    await typeEntry(page, 'offsetMax', sample.offsetMax);
    await stepButton(page, 'site').click();
    await expect(notice(page)).toHaveCount(0);
    await expect(page.locator('.gx-sample-story')).toHaveCount(0);

    // A site edit clears a fresh fill as well.
    await stepButton(page, 'intro').click();
    await pickSample(page, sample.id);
    await action(page, 'Use the sample').click();
    await expectFilled(page, sample);
    await setChecked(page, '#gx-depth-0', !(await page.locator('#gx-depth-0').isChecked()));
    await expect(notice(page)).toHaveCount(0);
    await action(page, 'Continue to fault movement').click();
    await expect(notice(page)).toHaveCount(0);
  });

  test(`${sample.id}: with a confirmed scenario, the modal asks; Escape and Keep my choices keep them, Use the sample replaces only the draft`, async ({ page }) => {
    let dialogs = 0;
    page.on('dialog', (d) => { dialogs += 1; void d.dismiss(); });
    await gotoExplore(page);
    const ref = await confirmGolden(page, 'GS-6');
    const count = countText(ref.counts.matching_records);
    await page.locator('#gx-refine-button').click();
    await setChecked(page, '#gx-population-one_state_per_trial', true);

    await stepButton(page, 'intro').click();
    await pickSample(page, sample.id);
    await expectAsked(page, sample);
    // Focus stays inside the dialog: Tab and Shift+Tab cycle its two choices.
    await page.keyboard.press('Tab');
    await expect(page.locator('#gx-sample-use')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#gx-sample-keep')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#gx-sample-use')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#gx-sample-keep')).toBeFocused();
    // Escape is Keep my choices.
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
    await stepButton(page, 'results').click();
    await expect(page.locator('#gx-population-one_state_per_trial')).toBeChecked();

    await stepButton(page, 'intro').click();
    await pickSample(page, sample.id);
    await expectAsked(page, sample);
    await action(page, 'Keep my choices').click();
    await expect(dialog(page)).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();

    await pickSample(page, sample.id);
    await expectAsked(page, sample);
    await action(page, 'Use the sample').click();
    await expectFilled(page, sample);
    // After a fill the walk is sequential; review stays reachable.
    await expect(page.locator('.gx-footer .gx-primary')).toHaveText('Continue to fault movement');
    await expect(action(page, 'Return to review')).toBeVisible();
    await stepButton(page, 'results').click();
    await expect(confirmedCount(page)).toHaveText(count);
    await expect(page.locator('.gx-pending')).toContainText('You have unapplied changes');
    await expect(page.locator('#gx-population-all_stages')).toBeChecked();
    await stepButton(page, 'site').click();
    await expect(page.locator('.gx-footer .gx-primary')).toHaveText('Return to review');
    expect(dialogs).toBe(0);
  });
}

test('an edited draft without a confirmation asks first, and each option keeps its identity', async ({ page }) => {
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  await setChecked(page, '#gx-faultDip-0', true);
  await stepButton(page, 'intro').click();
  const [illustrative, kern] = SAMPLES;

  await pickSample(page, illustrative.id);
  await expectAsked(page, illustrative);
  await action(page, 'Keep my choices').click();
  // Asking about one sample and then the other names the second.
  await pickSample(page, kern.id);
  await expectAsked(page, kern);
  await action(page, 'Keep my choices').click();
  await action(page, 'Build your scenario').click();
  await expect(page.locator('#gx-faultDip-0')).toBeChecked();
  await expect(notice(page)).toHaveCount(0);

  await stepButton(page, 'intro').click();
  await pickSample(page, kern.id);
  await action(page, 'Use the sample').click();
  await expectFilled(page, kern);

  // From a filled Kern draft, the Chi-Chi option asks and replaces with its own values.
  await stepButton(page, 'intro').click();
  await pickSample(page, illustrative.id);
  await expectAsked(page, illustrative);
  await action(page, 'Use the sample').click();
  await expectFilled(page, illustrative);
});

// The "About this sample" disclosure (guided DDD §10.2): closed after
// either fill, the sample's own story with loaded, credited images, kept
// open across steps while the fill stands, and gone with the notice.
const STORY = {
  illustrative: { text: '1999 M 7.6 Chi-Chi earthquake', credit: 'Photo: Liu Shu fu / Office of the President, Taiwan', image: 'sample-chichi-kuangfu-track.jpg' },
  kern: { text: 'M 7.36 Kern County earthquake', credit: 'Photo: D. H. Kupfer, U.S. Geological Survey, 1952. Public domain.', image: 'sample-kern-bealville-tracks.jpg' },
} as const;

for (const sample of SAMPLES) {
  test(`${sample.id}: the story disclosure follows the fill`, async ({ page }) => {
    await gotoExplore(page);
    await action(page, 'Build your scenario').click();
    await expect(page.locator('.gx-sample-story')).toHaveCount(0);
    await stepButton(page, 'intro').click();
    // Build your scenario alone leaves the draft fresh: the fill is silent.
    await pickSample(page, sample.id);
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
    // Every link opens a separate tab and says so: the sources plus the image's source (and license).
    const anchors = story.locator('a');
    await expect(anchors).toHaveCount(4);
    for (const anchor of await anchors.all()) {
      await expect(anchor).toHaveAttribute('target', '_blank');
      await expect(anchor.locator('.gx-sr-only')).toHaveText(' (opens in a new tab)');
    }

    // The story stays on Site conditions, and its open state survives the trip to Fault movement.
    await action(page, 'Continue to fault movement').click();
    await expect(page.locator('.gx-sample-story')).toHaveCount(0);
    await stepButton(page, 'site').click();
    await expect(page.locator('details.gx-sample-story')).toHaveAttribute('open');
    // The first edit takes it away with the notice.
    await setChecked(page, '#gx-faultDip-0', true);
    await expect(page.locator('.gx-sample-story')).toHaveCount(0);

    // A new fill starts closed.
    await stepButton(page, 'intro').click();
    await pickSample(page, sample.id);
    await action(page, 'Use the sample').click();
    await expect(page.locator('details.gx-sample-story')).not.toHaveAttribute('open');
  });
}
