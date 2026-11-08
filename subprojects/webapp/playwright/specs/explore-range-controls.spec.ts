// explore-range-controls.spec.ts (guided DDD §14, §14.6; PDD D-50): the
// paired-thumb range controls for fault angle and sediment depth. Per-stop
// keyboard movement with spoken modeled values, clamping, the echo's list
// and count, the unanswered state, Full range, a restored set with gaps,
// pointer use, and the 320 and 1024 px layouts.

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  action, echo, explorerReady, gotoExplore, overflows, pickSample, pressThumb, SESSION_KEY, SITE_HEADING, heading, storedRecord, thumb,
} from '../explore-support';

test.describe.configure({ timeout: 120_000 });

const NONE_ANGLES = 'Selected: none — 0 of 7 modeled angles.';
const NONE_DEPTHS = 'Selected: none — 0 of 3 modeled depths.';
const EMPTY_HINT = 'Move a thumb or choose Full range to continue.';

async function openSite(page: Page): Promise<void> {
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  await expect(heading(page)).toHaveText(SITE_HEADING);
}

test('a fresh range is unanswered: thumbs parked at the ends, no fill, "not chosen" (§14.6 items 1, 3, 4)', async ({ page }) => {
  await openSite(page);
  for (const [group, title, none, ends, names] of [
    ['faultDip', 'Fault angle', NONE_ANGLES, ['20 degrees, not chosen', '70 degrees, not chosen'], ['Minimum fault angle', 'Maximum fault angle']],
    ['depth', 'Sediment depth', NONE_DEPTHS, ['3 metres, not chosen', '10 metres, not chosen'], ['Minimum sediment depth', 'Maximum sediment depth']],
  ] as const) {
    const group$ = page.locator(`#gx-group-${group}`);
    await expect(group$.locator('legend')).toContainText(title);
    // All four conditions keep the Required mark (§14.6 item 3).
    await expect(group$.locator('legend .gx-required')).toHaveText('Required');
    await expect(group$.locator('legend .gx-required')).toBeVisible();
    await expect(echo(page, group)).toHaveText(none);
    await expect(echo(page, group)).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator(`#gx-empty-${group}`)).toHaveText(EMPTY_HINT);
    await expect(page.locator(`#gx-empty-${group}`)).toBeVisible();
    await expect(page.locator(`#gx-range-${group}`)).toHaveAttribute('data-empty', 'true');
    await expect(page.locator(`#gx-range-${group} .gx-range-fill`)).toBeHidden();
    // Two native sliders, named and speaking modeled values, never indices.
    const sliders = group$.getByRole('slider');
    await expect(sliders).toHaveCount(2);
    await expect(group$.getByRole('slider', { name: names[0], exact: true })).toHaveAttribute('aria-valuetext', ends[0]);
    await expect(group$.getByRole('slider', { name: names[1], exact: true })).toHaveAttribute('aria-valuetext', ends[1]);
    // No Select all on a range group; Full range in its place.
    await expect(group$.locator('.gx-select-all')).toHaveCount(0);
    await expect(group$.getByRole('button', { name: 'Full range' })).toHaveCount(1);
  }
  // The scale row names every modeled stop.
  await expect(page.locator('#gx-group-faultDip .gx-range-scale span')).toHaveText(['20°', '30°', '40°', '45°', '50°', '60°', '70°']);
  await expect(page.locator('#gx-group-depth .gx-range-scale span')).toHaveText(['3 m', '5 m', '10 m']);
  // The hints keep §15.3's text and close with §14's line as amended (§14.6).
  await expect(page.locator('#gx-group-faultDip > p').first()).toContainText('How steeply the fault is dipping, measured from the horizontal. Also called fault dip. If unknown, select the full range.');
  await expect(page.locator('#gx-group-depth > p').first()).toContainText('Thickness of the sediment above bedrock. If unknown, select the full range.');
  // Unanswered groups are named by the readiness line, as before (D-47).
  await expect(page.locator('.gx-still-needed')).toHaveText('Still needed: Fault angle · Sediment depth · Sediment density · Sediment strength and structure.');
  // A new scenario is still unanswered: nothing is stored as chosen.
  expect((await storedRecord(page))?.draft.faultDip).toEqual([]);
  expect((await storedRecord(page))?.draft.depth).toEqual([]);
});

test('the keyboard moves one modeled stop per press; the thumbs clamp; the echo lists and counts', async ({ page }) => {
  await openSite(page);
  // The first move answers the group with the contiguous range between the thumbs (§14.6 item 1).
  await pressThumb(page, 'faultDip', 'max', 'ArrowLeft');
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 20°, 30°, 40°, 45°, 50°, 60° — 6 of 7 modeled angles.');
  await expect(thumb(page, 'faultDip', 'max')).toHaveAttribute('aria-valuetext', '60 degrees');
  await expect(thumb(page, 'faultDip', 'min')).toHaveAttribute('aria-valuetext', '20 degrees');
  await expect(page.locator('#gx-range-faultDip')).toHaveAttribute('data-empty', 'false');
  await expect(page.locator('#gx-range-faultDip .gx-range-fill')).toBeVisible();
  await expect(page.locator('#gx-empty-faultDip')).toBeHidden();
  await expect(page.locator('.gx-still-needed')).toHaveText('Still needed: Sediment depth · Sediment density · Sediment strength and structure.');
  // Each press is one modeled stop: 40 to 45 to 50 is two presses, never an interpolated value.
  await pressThumb(page, 'faultDip', 'min', 'ArrowRight', 2);
  await expect(thumb(page, 'faultDip', 'min')).toHaveAttribute('aria-valuetext', '40 degrees');
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 40°, 45°, 50°, 60° — 4 of 7 modeled angles.');
  await pressThumb(page, 'faultDip', 'min', 'ArrowRight');
  await expect(thumb(page, 'faultDip', 'min')).toHaveAttribute('aria-valuetext', '45 degrees');
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 45°, 50°, 60° — 3 of 7 modeled angles.');
  // Minimum never passes Maximum: End stops at the maximum's stop, one value.
  await pressThumb(page, 'faultDip', 'min', 'End');
  await expect(thumb(page, 'faultDip', 'min')).toHaveValue('5');
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 60° — 1 of 7 modeled angles.');
  await pressThumb(page, 'faultDip', 'min', 'ArrowRight');
  await expect(thumb(page, 'faultDip', 'min')).toHaveValue('5');
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 60° — 1 of 7 modeled angles.');
  // …and Maximum never passes Minimum.
  await pressThumb(page, 'faultDip', 'max', 'Home');
  await expect(thumb(page, 'faultDip', 'max')).toHaveValue('5');
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 60° — 1 of 7 modeled angles.');
  // The stored draft keeps a plain set of modeled values (§14.2).
  expect((await storedRecord(page))?.draft.faultDip).toEqual([60]);
  // Focus stays on the thumb through every move.
  await expect(thumb(page, 'faultDip', 'max')).toBeFocused();
  // Depth: Home and End reach the ends.
  await pressThumb(page, 'depth', 'min', 'End');
  await expect(echo(page, 'depth')).toHaveText('Selected: 10 m — 1 of 3 modeled depths.');
  await expect(thumb(page, 'depth', 'min')).toHaveAttribute('aria-valuetext', '10 metres');
  await pressThumb(page, 'depth', 'min', 'Home');
  await expect(echo(page, 'depth')).toHaveText('Selected: 3 m, 5 m, 10 m — 3 of 3 modeled depths.');
});

test('Full range answers an empty group with every value, and widens a narrowed one', async ({ page }) => {
  await openSite(page);
  const full = page.locator('#gx-faultDip-full');
  await full.click();
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 20°, 30°, 40°, 45°, 50°, 60°, 70° — 7 of 7 modeled angles.');
  await expect(thumb(page, 'faultDip', 'min')).toHaveAttribute('aria-valuetext', '20 degrees');
  await expect(thumb(page, 'faultDip', 'max')).toHaveAttribute('aria-valuetext', '70 degrees');
  await expect(full).toBeFocused();
  await pressThumb(page, 'faultDip', 'max', 'ArrowLeft', 3);
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 20°, 30°, 40°, 45° — 4 of 7 modeled angles.');
  await full.click();
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 20°, 30°, 40°, 45°, 50°, 60°, 70° — 7 of 7 modeled angles.');
  // At full range it changes nothing.
  await full.click();
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 20°, 30°, 40°, 45°, 50°, 60°, 70° — 7 of 7 modeled angles.');
  await page.locator('#gx-depth-full').click();
  await expect(echo(page, 'depth')).toHaveText('Selected: 3 m, 5 m, 10 m — 3 of 3 modeled depths.');
  expect((await storedRecord(page))?.draft.depth).toEqual([3, 5, 10]);
});

test('a sample prefill renders at its extremes', async ({ page }) => {
  await gotoExplore(page);
  await pickSample(page, 'illustrative');
  await expect(thumb(page, 'faultDip', 'min')).toHaveAttribute('aria-valuetext', '30 degrees');
  await expect(thumb(page, 'faultDip', 'max')).toHaveAttribute('aria-valuetext', '40 degrees');
  await expect(thumb(page, 'depth', 'min')).toHaveAttribute('aria-valuetext', '5 metres');
  await expect(thumb(page, 'depth', 'max')).toHaveAttribute('aria-valuetext', '5 metres');
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 30°, 40° — 2 of 7 modeled angles.');
  await expect(echo(page, 'depth')).toHaveText('Selected: 5 m — 1 of 3 modeled depths.');
});

test('a restored set with gaps stays verbatim until a thumb moves (§14.2)', async ({ page }) => {
  await openSite(page);
  await page.locator('#gx-faultDip-full').click();
  // A pre-§14 record could hold separated angles; plant one and restore it.
  const record = (await storedRecord(page))!;
  record.draft.faultDip = [30, 50];
  record.draft.depth = [];
  await page.evaluate(([key, text]) => sessionStorage.setItem(key, text), [SESSION_KEY, JSON.stringify(record)] as const);
  await page.reload();
  await explorerReady(page);
  await expect(heading(page)).toHaveText(SITE_HEADING);
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 30°, 50° — 2 of 7 modeled angles (with gaps).');
  await expect(thumb(page, 'faultDip', 'min')).toHaveAttribute('aria-valuetext', '30 degrees');
  await expect(thumb(page, 'faultDip', 'max')).toHaveAttribute('aria-valuetext', '50 degrees');
  // A restored empty set is unanswered, as a fresh one (§14.6 item 2).
  await expect(echo(page, 'depth')).toHaveText(NONE_DEPTHS);
  await expect(page.locator('#gx-empty-depth')).toBeVisible();
  // No scenario changes silently on restore.
  expect((await storedRecord(page))?.draft.faultDip).toEqual([30, 50]);
  expect((await storedRecord(page))?.draft.depth).toEqual([]);
  // The first move materializes the contiguous range between the thumbs.
  await pressThumb(page, 'faultDip', 'max', 'ArrowLeft');
  await expect(thumb(page, 'faultDip', 'max')).toHaveAttribute('aria-valuetext', '45 degrees');
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 30°, 40°, 45° — 3 of 7 modeled angles.');
  expect((await storedRecord(page))?.draft.faultDip).toEqual([30, 40, 45]);
});

test('a pointer drags a thumb to a modeled stop', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'touch drags are covered by the keyboard and layout tests; the mobile project emulates touch');
  await openSite(page);
  const slider = thumb(page, 'faultDip', 'max');
  const box = (await slider.boundingBox())!;
  const half = 12; // --gx-thumb / 2
  const at = (i: number) => box.x + half + ((box.width - 2 * half) * i) / 6;
  const y = box.y + box.height / 2;
  await page.mouse.move(at(6), y);
  await page.mouse.down();
  await page.mouse.move(at(4), y, { steps: 8 });
  await page.mouse.up();
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 20°, 30°, 40°, 45°, 50° — 5 of 7 modeled angles.');
  // The answered look follows the release: fill drawn, hint gone.
  await expect(page.locator('#gx-range-faultDip')).toHaveAttribute('data-empty', 'false');
  await expect(page.locator('#gx-empty-faultDip')).toBeHidden();
  // A drag that returns to where it began still settles on release.
  const depth = thumb(page, 'depth', 'max');
  const dbox = (await depth.boundingBox())!;
  const dy = dbox.y + dbox.height / 2, dend = dbox.x + dbox.width - half;
  await page.mouse.move(dend, dy);
  await page.mouse.down();
  await page.mouse.move(dbox.x + dbox.width / 2, dy, { steps: 6 });
  await page.mouse.move(dend, dy, { steps: 6 });
  await page.mouse.up();
  await expect(echo(page, 'depth')).toHaveText('Selected: 3 m, 5 m, 10 m — 3 of 3 modeled depths.');
  await expect(page.locator('#gx-range-depth')).toHaveAttribute('data-empty', 'false');
  await expect(page.locator('#gx-empty-depth')).toBeHidden();
  // The minimum is still reachable when the thumbs meet at the right end.
  await page.locator('#gx-faultDip-full').click();
  await pressThumb(page, 'faultDip', 'min', 'End');
  const minBox = (await thumb(page, 'faultDip', 'min').boundingBox())!;
  await page.mouse.move(minBox.x + minBox.width - half, y);
  await page.mouse.down();
  await page.mouse.move(at(3), y, { steps: 8 });
  await page.mouse.up();
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 45°, 50°, 60°, 70° — 4 of 7 modeled angles.');
});

for (const width of [320, 1024]) {
  test(`the ranges fit ${width} px: no horizontal scroll, every stop labeled under its thumb`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openSite(page);
    await page.locator('#gx-faultDip-full').click();
    expect(await overflows(page)).toBe(false);
    for (const group of ['faultDip', 'depth'] as const) {
      const fieldset = (await page.locator(`#gx-group-${group}`).boundingBox())!;
      const labels = await page.locator(`#gx-group-${group} .gx-range-scale span`).evaluateAll((spans) => spans.map((s) => { const r = s.getBoundingClientRect(); return [r.left, r.right]; }));
      for (const [left, right] of labels) {
        expect(left).toBeGreaterThanOrEqual(fieldset.x);
        expect(right).toBeLessThanOrEqual(fieldset.x + fieldset.width);
      }
      // Labels never overlap one another.
      for (let i = 1; i < labels.length; i += 1) expect(labels[i][0]).toBeGreaterThan(labels[i - 1][1]);
      // Each slider is at least the 24 px target and spans the scale.
      const slider = (await thumb(page, group, 'min').boundingBox())!;
      expect(slider.height).toBeGreaterThanOrEqual(24);
    }
  });
}

test('axe: the site step with unanswered and answered ranges', async ({ page }) => {
  await openSite(page);
  const scan = async (state: string) => {
    const results = await new AxeBuilder({ page }).include('#gre-explore').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    expect.soft(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`), `axe violations in ${state}`).toEqual([]);
  };
  await scan('unanswered ranges');
  await page.locator('#gx-faultDip-full').click();
  await pressThumb(page, 'depth', 'max', 'ArrowLeft');
  await scan('answered ranges');
  await action(page, 'Continue to fault slip').click();
  await expect(page.locator('#gx-issue-summary')).toBeFocused();
  await scan('after an unsuccessful attempt');
});
