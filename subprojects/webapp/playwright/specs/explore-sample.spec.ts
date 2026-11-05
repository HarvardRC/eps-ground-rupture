// explore-sample.spec.ts (guided DDD §9.5 item 5, parameterized by
// §§10.1, 10.3, and 10.5): the Try a prefilled sample dialog — two cards
// forming one tab stop, previewing values without changing the draft;
// Use this sample, and the replacement question as its next step with
// the chosen sample keeping its identity; confirmed results untouched;
// the prefill notice and its Modified form on both input steps; the
// sequential footer after a fill; both-mode prefills and the mode-switch
// note; the card previews' story material, the Why these sample
// values? trigger, and the per-field annotations (§§9.1, 10.1–10.5;
// PDD D-37, D-42, D-43, D-44).

import { expect, test, type Page } from '@playwright/test';
import {
  INTRO_HEADING, MOVEMENT_HEADING, SITE_HEADING, action, confirmGolden, confirmedCount, countText, explorerReady,
  gotoExplore, heading, holdRegression, pickSample, setChecked, settleFrames, stepButton, storedRecord, typeEntry,
} from '../explore-support';

test.describe.configure({ timeout: 120_000 });

const HINT = 'Sample values, not recommended site values.';
const TRIGGER = 'Why these sample values?';
const HELPER = 'Background, photos and sources';
const SHARED = 'These examples help you try the tool. They do not reconstruct either earthquake.';
const MODE_NOTE = 'The two modes are separate assumptions. Each selects a different set of simulations, so results can differ.';

const SAMPLES = [
  {
    id: 'illustrative',
    title: 'Lower fault angles',
    descriptor: '30° and 40°; surface offset up to 3 m',
    name: 'lower fault angles',
    site: ['30°', '40°', '5 m', 'Dense', 'Uniform sediment: Strong', 'Layered sediment: Strong'],
    preview: ['30°; 40°', '5 m', 'Dense', 'Layered: Strong; Uniform: Strong', '0–3 m', '3–5 m'],
    slipNote: 'The slip range is an example band within the simulations’ coverage.',
    offsetMax: '3', slipMin: '3', slipMax: '5',
  },
  {
    id: 'kern',
    title: 'Steeper fault angles',
    descriptor: '60° and 70°; surface offset up to 1.3 m',
    name: 'steeper fault angles',
    site: ['60°', '70°', '10 m', 'Medium', 'Uniform sediment: Moderate', 'Layered sediment: Moderate'],
    preview: ['60°; 70°', '10 m', 'Medium', 'Layered: Moderate; Uniform: Moderate', '0–1.3 m', '1.6–1.9 m'],
    slipNote: 'The slip range spans Bawden (2001)’s two patch estimates, 1.6 m and 1.9 m, used as an example band.',
    offsetMax: '1.3', slipMin: '1.6', slipMax: '1.9',
  },
] as const;

type Sample = (typeof SAMPLES)[number];

const trigger = (page: Page) => page.locator('#gx-sample-trigger');
const dialog = (page: Page) => page.locator('#gx-sample-dialog');
const card = (page: Page, sample: Sample) => page.locator(`#gx-sample-${sample.id}`);
const preview = (page: Page) => page.locator('#gx-sample-preview');
const notice = (page: Page) => page.locator('.gx-sample-status');
const modeNote = (page: Page) => page.locator('#gx-sample-mode-note');
const announced = (page: Page) => page.locator('#gre-explore > p.gx-sr-only[role="status"]');
const prefilled = (sample: Sample) => `Prefilled with the ${sample.name} sample. You can change any value.`;
const modified = (sample: Sample) => `Started from the ${sample.name} sample · Modified`;
const question = (sample: Sample) => `Replace your current choices with the ${sample.name} sample?`;

/** The checked site choices by accessible name, in page order. */
const checkedSite = (page: Page) =>
  page.locator('.gx-site-grid input[data-choice]:checked').evaluateAll((inputs) =>
    inputs.map((input) => input.getAttribute('aria-label') ?? input.closest('label')!.textContent!.trim()),
  );

/** The chosen sample filled the draft and opened Site conditions, naming itself once. */
async function expectFilled(page: Page, sample: Sample): Promise<void> {
  await expect(dialog(page)).toHaveCount(0);
  await expect(heading(page)).toHaveText(SITE_HEADING);
  await expect(heading(page)).toBeFocused();
  await expect(notice(page)).toHaveText(prefilled(sample));
  // Announced once through the shared status region, not by the standing notice.
  await expect(announced(page)).toHaveText(prefilled(sample));
  await expect(notice(page)).not.toHaveAttribute('role');
  expect(await checkedSite(page)).toEqual([...sample.site]);
}

/** The dialog is open and modal on its card step, `sample` selected and previewed. */
async function expectPreview(page: Page, sample: Sample): Promise<void> {
  await expect(page.getByRole('dialog', { name: 'Try a prefilled sample' })).toBeVisible();
  expect(await dialog(page).evaluate((node) => node.matches(':modal'))).toBe(true);
  await expect(card(page, sample)).toHaveAttribute('aria-checked', 'true');
  await expect(card(page, sample)).toHaveAttribute('tabindex', '0');
  for (const other of SAMPLES.filter((s) => s.id !== sample.id)) {
    await expect(card(page, other)).toHaveAttribute('aria-checked', 'false');
    await expect(card(page, other)).toHaveAttribute('tabindex', '-1');
  }
  await expect(preview(page).locator('h3')).toHaveText(sample.title);
  await expect(preview(page).locator('dd')).toHaveText([...sample.preview]);
  await expect(preview(page)).toContainText(sample.slipNote);
  // The preview shares the §10.2 story material: background, photographs, and sources (§10.5).
  const background = preview(page).locator('.gx-sample-background');
  await expect(background.locator('h4')).toHaveText(TRIGGER);
  await expect(background).toContainText(STORY[sample.id].text);
  await expect(background).toContainText(SHARED);
  await expect(background.locator('img')).toHaveAttribute('src', `../images/${STORY[sample.id].image}`);
  await expect(background.locator('.gx-credit')).toContainText(STORY[sample.id].credit);
  await expect(background.locator('.gx-story-sources a')).toHaveCount(STORY[sample.id].sources);
  for (const other of SAMPLES.filter((s) => s.id !== sample.id)) await expect(background).not.toContainText(STORY[other.id].text);
}

/** The dialog's second step: the replacement question, focus on Keep my choices. */
async function expectAsked(page: Page, sample: Sample): Promise<void> {
  await expect(page.getByRole('dialog', { name: question(sample) })).toBeVisible();
  expect(await dialog(page).evaluate((node) => node.matches(':modal'))).toBe(true);
  await expect(page.locator('#gx-sample-keep')).toBeFocused();
}

/** The draft as last saved, without the presentation. */
const savedDraft = async (page: Page) => (await storedRecord(page))?.draft;

test('Try a prefilled sample opens a dialog of two cards that preview without changing the draft', async ({ page }) => {
  let dialogs = 0;
  page.on('dialog', (d) => { dialogs += 1; void d.dismiss(); });
  await gotoExplore(page);
  await expect(page.locator('.gx-intro-actions button')).toHaveText(['Build your scenario', 'Try a prefilled sample']);
  await expect(trigger(page)).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(trigger(page)).toHaveAccessibleDescription(HINT);
  await expect(dialog(page)).toHaveCount(0);
  const before = await savedDraft(page);

  await trigger(page).click();
  const [first, second] = SAMPLES;
  await expectPreview(page, first);
  await expect(card(page, first)).toBeFocused();
  await expect(page.getByRole('radiogroup', { name: 'Samples' })).toBeVisible();
  for (const sample of SAMPLES) {
    const item = page.getByRole('radio', { name: sample.title, exact: true });
    await expect(item).toBeVisible();
    await expect(item).toHaveAccessibleDescription(sample.descriptor);
    // Titles and descriptors name inputs; the slip window stays out of them.
    await expect(item).not.toContainText('slip');
  }
  await card(page, second).click();
  await expectPreview(page, second);
  await expect(card(page, second)).toBeFocused();
  // Previewing changed nothing: Cancel closes, the draft is the one before.
  await page.locator('#gx-sample-cancel').click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(trigger(page)).toBeFocused();
  await expect(heading(page)).toHaveText(INTRO_HEADING);
  expect(await savedDraft(page)).toEqual(before);
  await action(page, 'Build your scenario').click();
  expect(await checkedSite(page)).toEqual([]);
  await expect(notice(page)).toHaveCount(0);
  expect(dialogs).toBe(0);
});

for (const sample of SAMPLES) {
  test(`${sample.id}: the dialog works from the keyboard`, async ({ page }) => {
    await gotoExplore(page);
    const [first, last] = SAMPLES;
    const before = await savedDraft(page);
    await action(page, 'Build your scenario').focus();
    await page.keyboard.press('Tab');
    await expect(trigger(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(card(page, first)).toBeFocused();
    // Arrows move the selection and the preview with it, wrapping; Home and End jump.
    await page.keyboard.press('ArrowDown');
    await expect(card(page, last)).toBeFocused();
    await expectPreview(page, last);
    await page.keyboard.press('ArrowDown');
    await expect(card(page, first)).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(card(page, last)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(card(page, first)).toBeFocused();
    await page.keyboard.press('End');
    await expectPreview(page, last);
    await page.keyboard.press('Home');
    await expectPreview(page, first);
    // The cards are one tab stop; Tab passes the preview's links in order and stays inside the dialog.
    const links = await preview(page).locator('a[href]').all();
    expect(links.length).toBe(STORY[first.id].links);
    for (const item of links) {
      await page.keyboard.press('Tab');
      await expect(item).toBeFocused();
    }
    await page.keyboard.press('Tab');
    await expect(page.locator('#gx-sample-apply')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#gx-sample-cancel')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(card(page, first)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#gx-sample-cancel')).toBeFocused();
    // Escape closes without applying.
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
    expect(await savedDraft(page)).toEqual(before);

    // Select this sample by keyboard and apply it.
    await page.keyboard.press('Space');
    await expect(card(page, first)).toBeFocused();
    if (sample.id === last.id) await page.keyboard.press('ArrowDown');
    await expectPreview(page, sample);
    // Backwards from the cards: Cancel, then Use this sample.
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#gx-sample-apply')).toBeFocused();
    await page.keyboard.press('Enter');
    await expectFilled(page, sample);
  });

  test(`${sample.id}: a fresh draft fills silently, prefilled in both movement modes, with the mode-switch note`, async ({ page }) => {
    let dialogs = 0;
    page.on('dialog', (d) => { dialogs += 1; void d.dismiss(); });
    await gotoExplore(page);
    await pickSample(page, sample.id);
    await expectFilled(page, sample);
    await expect(action(page, 'Return to review')).toHaveCount(0);

    await action(page, 'Continue to fault movement').click();
    await expect(heading(page)).toHaveText(MOVEMENT_HEADING);
    await expect(notice(page)).toHaveText(prefilled(sample));
    await expect(modeNote(page)).toHaveCount(0);
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
    // Switching modes shows the other prefilled window and the note; it is not an edit.
    await setChecked(page, '#gx-mode-slip', true);
    await expect(page.locator('#gx-slipMin')).toHaveValue(sample.slipMin);
    await expect(page.locator('#gx-slipMax')).toHaveValue(sample.slipMax);
    await expect(page.locator('#gx-error-slipMin')).toBeHidden();
    await expect(page.locator('#gx-error-slipMax')).toBeHidden();
    await expect(modeNote(page)).toHaveText(MODE_NOTE);
    await expect(announced(page)).toHaveText(MODE_NOTE);
    await expect(notice(page)).toHaveText(prefilled(sample));
    await setChecked(page, '#gx-mode-offset', true);
    await expect(modeNote(page)).toHaveText(MODE_NOTE);
    await setChecked(page, '#gx-mode-slip', true);

    // The slip-mode sample is a valid scenario on review.
    await action(page, 'Review scenario').click();
    await expect(page.locator('.gx-review-section', { hasText: 'Edit fault movement' })).toContainText(`${sample.slipMin}–${sample.slipMax} m fault slip`);
    await expect(page.locator('.gx-warning')).toHaveCount(0);
    await stepButton(page, 'site').click();
    await expect(notice(page)).toHaveText(prefilled(sample));
    // Review now reached and the walk past Site conditions, Return to review leads again.
    await expect(page.locator('.gx-footer .gx-primary')).toHaveText('Return to review');
    expect(dialogs).toBe(0);
  });

  test(`${sample.id}: the notice turns Modified at the first edit and stays until replacement or a new scenario`, async ({ page }) => {
    await gotoExplore(page);
    await pickSample(page, sample.id);
    await expectFilled(page, sample);
    await action(page, 'Continue to fault movement').click();
    await stepButton(page, 'intro').click();
    await stepButton(page, 'movement').click();
    await expect(notice(page)).toHaveText(prefilled(sample));

    // Typing updates it in place, without a re-render (the tagged node survives); restoring the value keeps it Modified.
    await notice(page).evaluate((node) => node.setAttribute('data-probe', 'kept'));
    await typeEntry(page, 'offsetMax', '1');
    await expect(notice(page)).toHaveText(modified(sample));
    await expect(notice(page)).toHaveAttribute('data-probe', 'kept');
    await typeEntry(page, 'offsetMax', sample.offsetMax);
    await expect(notice(page)).toHaveText(modified(sample));
    await stepButton(page, 'site').click();
    await expect(notice(page)).toHaveText(modified(sample));
    await expect(page.locator('.gx-sample-story')).toHaveCount(1);
    // The mode-switch note belongs to the sample too.
    await stepButton(page, 'movement').click();
    await setChecked(page, '#gx-mode-slip', true);
    await expect(modeNote(page)).toHaveText(MODE_NOTE);

    // Replacement starts over in the first form.
    await stepButton(page, 'intro').click();
    await pickSample(page, sample.id);
    await expectAsked(page, sample);
    await action(page, 'Use the sample').click();
    await expectFilled(page, sample);
    await setChecked(page, '#gx-depth-0', !(await page.locator('#gx-depth-0').isChecked()));
    await expect(notice(page)).toHaveText(modified(sample));
    await action(page, 'Continue to fault movement').click();
    await expect(notice(page)).toHaveText(modified(sample));
    await expect(modeNote(page)).toHaveCount(0);

    // Start a new scenario removes it.
    await page.locator('.gx-restart button').click();
    await expect(heading(page)).toHaveText(SITE_HEADING);
    await expect(notice(page)).toHaveCount(0);
    await expect(page.locator('.gx-sample-story')).toHaveCount(0);
  });

  test(`${sample.id}: with a confirmed scenario, the question follows; Escape and Keep my choices keep them, Use the sample replaces only the draft`, async ({ page }) => {
    let dialogs = 0;
    page.on('dialog', (d) => { dialogs += 1; void d.dismiss(); });
    await gotoExplore(page);
    const ref = await confirmGolden(page, 'GS-6');
    const count = countText(ref.counts.matching_records);
    await page.locator('#gx-refine-button').click();
    await setChecked(page, '#gx-population-one_state_per_trial', true);

    await stepButton(page, 'intro').click();
    // Previewing over a confirmed scenario changes neither the draft nor the confirmation.
    const before = await storedRecord(page);
    await trigger(page).click();
    for (const other of [...SAMPLES].reverse()) { await card(page, other).click(); await expectPreview(page, other); }
    await page.locator('#gx-sample-cancel').click();
    const after = await storedRecord(page);
    expect(after?.draft).toEqual(before?.draft);
    expect(after?.confirmed).toEqual(before?.confirmed);

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
    await expect(notice(page)).toHaveText(prefilled(sample));
    // A refinement is a draft edit too.
    await stepButton(page, 'results').click();
    await setChecked(page, '#gx-population-one_state_per_trial', true);
    await stepButton(page, 'site').click();
    await expect(notice(page)).toHaveText(modified(sample));
    expect(dialogs).toBe(0);
  });
}

for (const sample of SAMPLES) {
  test(`${sample.id}: Discard changes returns to the notice of the fill the confirmation started from, never un-Modified`, async ({ page }) => {
    await gotoExplore(page);
    await pickSample(page, sample.id);
    await action(page, 'Continue to fault movement').click();
    await page.locator('#gx-offset-feedback table').waitFor();
    await action(page, 'Review scenario').click();
    await action(page, 'Show results').click();
    await page.locator('.gx-context').waitFor();
    const discard = () => page.locator('.gx-pending').getByRole('button', { name: 'Discard changes' }).click();

    // Confirmed unedited; an edit turns it Modified, and discarding back to the sample's values keeps Modified.
    await page.locator('#gx-refine-button').click();
    await setChecked(page, '#gx-population-one_state_per_trial', true);
    await discard();
    await expect(page.locator('#gx-population-all_stages')).toBeChecked();
    await stepButton(page, 'site').click();
    await expect(notice(page)).toHaveText(modified(sample));

    // Confirmed while Modified; a further edit and a discard keep the same fill's notice.
    await setChecked(page, '#gx-faultDip-0', !(await page.locator('#gx-faultDip-0').isChecked()));
    await action(page, 'Return to review').click();
    await action(page, 'Show results').click();
    await page.locator('.gx-context').waitFor();
    await stepButton(page, 'site').click();
    await setChecked(page, '#gx-depth-0', !(await page.locator('#gx-depth-0').isChecked()));
    await stepButton(page, 'results').click();
    await discard();
    await stepButton(page, 'site').click();
    await expect(notice(page)).toHaveText(modified(sample));

    // A confirmation made without a sample discards the notice with the sample's draft.
    await page.locator('.gx-restart button').click();
    await stepButton(page, 'intro').click();
    await confirmGolden(page, 'GS-6');
    await stepButton(page, 'intro').click();
    await pickSample(page, sample.id);
    await action(page, 'Use the sample').click();
    await expect(notice(page)).toHaveText(prefilled(sample));
    await stepButton(page, 'results').click();
    await discard();
    await stepButton(page, 'site').click();
    await expect(notice(page)).toHaveCount(0);
  });
}

for (const sample of SAMPLES) {
  test(`${sample.id}: the notice, its story, and the mode-switch note survive a reload (owner decision R)`, async ({ page }) => {
    const reload = async () => { await page.reload(); await explorerReady(page); };
    await gotoExplore(page);
    await pickSample(page, sample.id);
    expect((await storedRecord(page))!.display.sample).toEqual({ id: sample.id, modified: false });
    await reload();
    await expect(heading(page)).toHaveText(SITE_HEADING);
    await expect(notice(page)).toHaveText(prefilled(sample));
    await expect(page.locator('details.gx-sample-story')).toHaveCount(1);
    await expect(page.locator('details.gx-sample-story')).not.toHaveAttribute('open');

    // A mode switch is not an edit; its note returns with the record while the draft is in the other mode.
    await action(page, 'Continue to fault movement').click();
    await page.locator('#gx-mode-slip').check();
    await expect(modeNote(page)).toHaveText(MODE_NOTE);
    await reload();
    await expect(heading(page)).toHaveText(MOVEMENT_HEADING);
    await expect(notice(page)).toHaveText(prefilled(sample));
    await expect(modeNote(page)).toHaveText(MODE_NOTE);

    // Modified survives too.
    await typeEntry(page, 'slipMax', '4.5');
    await expect(notice(page)).toHaveText(modified(sample));
    await reload();
    await expect(notice(page)).toHaveText(modified(sample));
    expect((await storedRecord(page))!.display.sample).toEqual({ id: sample.id, modified: true });

    // Start a new scenario ends it, across a reload as well.
    await page.locator('.gx-restart button').click();
    await expect(notice(page)).toHaveCount(0);
    await reload();
    await expect(notice(page)).toHaveCount(0);
    expect((await storedRecord(page))!.display.sample).toBeNull();
  });

  test(`${sample.id}: after a reload, Discard changes still returns to the confirmed fill's notice`, async ({ page }) => {
    const other = SAMPLES.find((s) => s.id !== sample.id)!;
    const discard = () => page.locator('.gx-pending').getByRole('button', { name: 'Discard changes' }).click();
    const restored = async () => {
      await page.reload(); await explorerReady(page);
      await expect(page.locator('.gx-restoring')).toHaveCount(0);
      await page.locator('.gx-context').waitFor();
    };
    await gotoExplore(page);
    await pickSample(page, sample.id);
    await action(page, 'Continue to fault movement').click();
    await page.locator('#gx-offset-feedback table').waitFor();
    await action(page, 'Review scenario').click();
    await action(page, 'Show results').click();
    await page.locator('.gx-context').waitFor();

    // The same fill (stored as current): an edit turns it Modified, and after a reload discarding keeps Modified.
    await page.locator('#gx-refine-button').click();
    await setChecked(page, '#gx-population-one_state_per_trial', true);
    await restored();
    await discard();
    await stepButton(page, 'site').click();
    await expect(notice(page)).toHaveText(modified(sample));

    // A later fill of the other sample: the confirmed fill carries the Modified it gained while
    // current, so after a reload discarding returns to its notice still Modified.
    await stepButton(page, 'intro').click();
    await pickSample(page, other.id);
    await action(page, 'Use the sample').click();
    await expect(notice(page)).toHaveText(prefilled(other));
    expect((await storedRecord(page))!.display.confirmedSample).toEqual({ id: sample.id, modified: true, current: false });
    await stepButton(page, 'results').click();
    await restored();
    await discard();
    await stepButton(page, 'site').click();
    await expect(notice(page)).toHaveText(modified(sample));
  });
}

test('an open dialog survives the re-render of a settling restore, at either step', async ({ page }) => {
  await gotoExplore(page);
  await confirmGolden(page, 'GS-1');
  await stepButton(page, 'intro').click();
  const [first, last] = SAMPLES;

  // Hold the restore's conversion data so it settles while the dialog is open.
  let release = await holdRegression(page);
  await page.reload();
  await explorerReady(page);
  await expect(page.locator('.gx-restoring')).toHaveCount(1);
  await trigger(page).click();
  await page.keyboard.press('ArrowDown');
  await expectPreview(page, last);
  release();
  await expect(page.locator('.gx-restoring')).toHaveCount(0);
  await settleFrames(page);
  await expectPreview(page, last);
  await expect(card(page, last)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expectPreview(page, first);
  await page.keyboard.press('Escape');
  await expect(trigger(page)).toBeFocused();

  release = await holdRegression(page);
  await page.reload();
  await explorerReady(page);
  await expect(page.locator('.gx-restoring')).toHaveCount(1);
  await pickSample(page, last.id);
  await expectAsked(page, last);
  await page.keyboard.press('Tab');
  await expect(page.locator('#gx-sample-use')).toBeFocused();
  release();
  await expect(page.locator('.gx-restoring')).toHaveCount(0);
  await settleFrames(page);
  expect(await dialog(page).evaluate((node) => node.matches(':modal'))).toBe(true);
  await expect(page.locator('#gx-sample-use')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(trigger(page)).toBeFocused();
  await stepButton(page, 'results').click();
  await expect(page.locator('.gx-context')).toBeVisible();
});

test('opening, browsing, and closing the dialog is neither a navigation nor an edit: the restore notice stays', async ({ page }) => {
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  await setChecked(page, '#gx-faultDip-0', true);
  await stepButton(page, 'intro').click();
  await page.reload();
  await explorerReady(page);
  await expect(page.locator('.gx-restored')).toHaveCount(1);
  await trigger(page).click();
  await card(page, SAMPLES[1]).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.gx-restored')).toHaveCount(1);
  // Asking and keeping changes nothing either.
  await pickSample(page, 'illustrative');
  await action(page, 'Keep my choices').click();
  await expect(page.locator('.gx-restored')).toHaveCount(1);
});

test('an edited draft without a confirmation asks first, and each card keeps its identity', async ({ page }) => {
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

  // From a filled steeper-angle draft, the lower-angle card asks and replaces with its own values.
  await stepButton(page, 'intro').click();
  await pickSample(page, illustrative.id);
  await expectAsked(page, illustrative);
  await action(page, 'Use the sample').click();
  await expectFilled(page, illustrative);
});

// The Why these sample values? trigger (guided DDD §§10.2, 10.4, 10.5):
// closed after either fill, directly under the notice on both input
// steps, the sample's own story with loaded, credited images, its open
// state kept across steps, and staying with the notice through edits.
const STORY = {
  illustrative: { text: '1999 M 7.6 Chi-Chi earthquake', credit: 'Photo: Liu Shu fu / Office of the President, Taiwan', image: 'sample-chichi-kuangfu-track.jpg', sources: 2, links: 4 },
  kern: { text: 'M 7.36 Kern County earthquake', credit: 'Photo: D. H. Kupfer, U.S. Geological Survey, 1952. Public domain.', image: 'sample-kern-bealville-tracks.jpg', sources: 3, links: 4 },
} as const;

for (const sample of SAMPLES) {
  test(`${sample.id}: the Why these sample values? trigger follows the notice`, async ({ page }) => {
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
    await expect(story.locator('summary')).toHaveText(`${TRIGGER} ${HELPER}`);
    await expect(story.locator('summary .gx-story-trigger')).toHaveText(TRIGGER);
    await expect(story.locator('summary .gx-story-helper')).toHaveText(HELPER);
    // Directly under the notice.
    expect(await notice(page).evaluate((node) => node.nextElementSibling?.id)).toBe('gx-sample-story');
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

    await expect(story).toContainText(SHARED);
    await expect(story).not.toContainText('reproduce no event');

    // The trigger stands on Fault movement too, under the notice and still open; and back on Site conditions.
    await action(page, 'Continue to fault movement').click();
    await expect(heading(page)).toHaveText(MOVEMENT_HEADING);
    await expect(page.locator('details.gx-sample-story')).toHaveAttribute('open');
    expect(await notice(page).evaluate((node) => node.nextElementSibling?.id)).toBe('gx-sample-story');
    await page.locator('details.gx-sample-story summary').click();
    await expect(page.locator('details.gx-sample-story')).not.toHaveAttribute('open');
    await page.locator('details.gx-sample-story summary').click();
    await stepButton(page, 'site').click();
    await expect(page.locator('details.gx-sample-story')).toHaveAttribute('open');
    await setChecked(page, '#gx-faultDip-0', true);
    await expect(notice(page)).toHaveText(modified(sample));
    await expect(page.locator('details.gx-sample-story')).toHaveAttribute('open');
    // Modified is not the end of it: the trigger follows the notice's lifetime, not the first edit.
    await action(page, 'Continue to fault movement').click();
    await expect(page.locator('details.gx-sample-story')).toHaveCount(1);
    await stepButton(page, 'site').click();

    // A new fill starts closed.
    await stepButton(page, 'intro').click();
    await pickSample(page, sample.id);
    await action(page, 'Use the sample').click();
    await expect(page.locator('details.gx-sample-story')).not.toHaveAttribute('open');
  });
}

// Per-field annotations (guided DDD §§10.4, 10.5): beside each prefilled
// control while it still holds the sample's value, clearing (and
// returning) with that value alone, never announced on their own.
const ANNOTATION = {
  illustrative: {
    faultDip: 'A sample choice; the background earthquake does not set these angles.',
    offsetMax: 'Of the scale of the surface offsets in the sample’s background: meters of uplift, including about 2.5 m at a school playground.',
    slip: 'An example band within the simulations’ coverage. It is not converted from the surface offset.',
    sources: { faultDip: 0, offsetMax: 2, slip: 0 },
  },
  kern: {
    faultDip: 'Geodetic studies put the dip of the fault in the sample’s background near 75°; the sample uses the two steepest modeled angles.',
    offsetMax: 'The scale of the largest surface elevation change in the sample’s background, about 1.3 m.',
    slip: 'Bawden (2001)’s two patch estimates, 1.6 m and 1.9 m, used as an example band, not an uncertainty range.',
    sources: { faultDip: 2, offsetMax: 1, slip: 1 },
  },
} as const;
const SAMPLE_CHOICE = 'A sample choice, not a description of any real site.';
const note = (page: Page, field: string) => page.locator(`#gx-annotation-${field}`);
const straight = (text: string) => text.replace(/’/g, "'");

for (const sample of SAMPLES) {
  test(`${sample.id}: annotations stand beside the prefilled controls and clear with their own value`, async ({ page }) => {
    const expected = ANNOTATION[sample.id];
    await gotoExplore(page);
    await expect(page.locator('.gx-annotation')).toHaveCount(0);
    await pickSample(page, sample.id);

    // Site conditions: one per prefilled group, inside it, after its choices.
    await expect(page.locator('.gx-annotation')).toHaveCount(4);
    await expect(note(page, 'faultDip')).toContainText(straight(expected.faultDip));
    await expect(note(page, 'faultDip').locator('a')).toHaveCount(expected.sources.faultDip);
    for (const field of ['depth', 'density', 'sediment']) {
      await expect(note(page, field)).toHaveText(SAMPLE_CHOICE);
      expect(await note(page, field).evaluate((node) => node.closest('fieldset')?.id)).toBe(`gx-group-${field}`);
    }
    // Never announced on their own: no live region, and no control is described by one.
    for (const item of await page.locator('.gx-annotation').all()) {
      expect(await item.evaluate((node) => node.closest('[aria-live], [role="status"], [role="alert"]') === null)).toBe(true);
    }
    expect(await page.locator('[aria-describedby*="gx-annotation"]').count()).toBe(0);

    // A change clears that control's annotation only; the sample's value again brings it back.
    const box = page.locator('#gx-faultDip-0');
    const was = await box.isChecked();
    await setChecked(page, '#gx-faultDip-0', !was);
    await expect(note(page, 'faultDip')).toHaveCount(0);
    await expect(page.locator('.gx-annotation')).toHaveCount(3);
    await setChecked(page, '#gx-faultDip-0', was);
    await expect(note(page, 'faultDip')).toContainText(straight(expected.faultDip));
    await setChecked(page, '#gx-depth-0', !(await page.locator('#gx-depth-0').isChecked()));
    await expect(note(page, 'depth')).toHaveCount(0);
    await expect(note(page, 'density')).toHaveText(SAMPLE_CHOICE);

    // Fault movement: the offset annotation below the entry, updated in place while typing.
    await action(page, 'Continue to fault movement').click();
    // The conversion data re-renders the step once it loads; probe after that.
    await page.locator('#gx-offset-feedback table').waitFor();
    await expect(note(page, 'offsetMax')).toContainText(straight(expected.offsetMax));
    await expect(note(page, 'offsetMax').locator('a')).toHaveCount(expected.sources.offsetMax);
    await expect(note(page, 'offsetMax')).not.toContainText(sample.id === 'kern' ? 'Kern' : 'Taiwan');
    const input = page.locator('#gx-offsetMax');
    await input.evaluate((node) => node.setAttribute('data-probe', 'kept'));
    await typeEntry(page, 'offsetMax', '2');
    await expect(note(page, 'offsetMax')).toHaveCount(0);
    await expect(input).toHaveAttribute('data-probe', 'kept');
    await expect(input).toBeFocused();
    await typeEntry(page, 'offsetMax', sample.offsetMax);
    await expect(note(page, 'offsetMax')).toContainText(straight(expected.offsetMax));
    // The + button is a value change as well.
    await page.getByRole('button', { name: 'Increase maximum by 0.1 m' }).click();
    await expect(note(page, 'offsetMax')).toHaveCount(0);

    // Slip mode: the slip range's annotation, cleared by either entry.
    await setChecked(page, '#gx-mode-slip', true);
    await expect(note(page, 'slip')).toContainText(straight(expected.slip));
    await expect(note(page, 'slip').locator('a')).toHaveCount(expected.sources.slip);
    await typeEntry(page, 'slipMin', '0');
    await expect(note(page, 'slip')).toHaveCount(0);
    await typeEntry(page, 'slipMin', sample.slipMin);
    await expect(note(page, 'slip')).toContainText(straight(expected.slip));

    // They survive a reload with the notice, and leave with it.
    await page.reload();
    await explorerReady(page);
    await expect(note(page, 'slip')).toContainText(straight(expected.slip));
    await page.locator('.gx-restart button').click();
    await expect(page.locator('.gx-annotation')).toHaveCount(0);
  });
}
