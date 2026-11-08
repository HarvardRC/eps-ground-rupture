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

/** The scale labels' boxes, in stop order. */
const scaleBoxes = (page: Page, group: 'faultDip' | 'depth') =>
  page.locator(`#gx-group-${group} .gx-range-scale span`).evaluateAll((spans) => spans.map((s) => { const r = s.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; }));

/** No two labels share any area (a narrow group staggers them onto two rows). */
function expectNoOverlap(boxes: { left: number; right: number; top: number; bottom: number }[]): void {
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i], b = boxes[j];
      const apart = a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
      expect(apart, `scale labels ${i} and ${j} overlap`).toBe(true);
    }
  }
}

type Clip = { x: number; y: number; width: number; height: number };

/** A 40 px square around the thumb at stop `i` of `group`'s scale. */
async function thumbClip(page: Page, group: 'faultDip' | 'depth', i: number): Promise<Clip> {
  const box = (await thumb(page, group, 'min').boundingBox())!;
  const last = group === 'faultDip' ? 6 : 2;
  const cx = box.x + 12 + ((box.width - 24) * i) / last, cy = box.y + box.height / 2;
  return { x: Math.round(cx - 20), y: Math.round(cy - 20), width: 40, height: 40 };
}

/** Decode a screenshot of `clip` in the page and hand its pixels to `read`. */
async function screenPixels<T>(page: Page, clip: Clip, read: string, arg: unknown): Promise<T> {
  const png = (await page.screenshot({ clip })).toString('base64');
  return page.evaluate(async ([b64, body, a]) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width; canvas.height = img.height;
    const g = canvas.getContext('2d')!;
    g.drawImage(img, 0, 0);
    const data = g.getImageData(0, 0, img.width, img.height).data;
    return new Function('data', 'w', 'h', 'arg', body as string)(data, img.width, img.height, a);
  }, [png, read, arg] as const) as Promise<T>;
}

/** Pixels within a small distance of `rgb`. */
const pixels = (page: Page, clip: Clip, rgb: [number, number, number]) => screenPixels<number>(page, clip, `
  let n = 0;
  for (let i = 0; i < data.length; i += 4) if (Math.abs(data[i] - arg[0]) + Math.abs(data[i + 1] - arg[1]) + Math.abs(data[i + 2] - arg[2]) < 40) n += 1;
  return n;`, rgb);

/** The height in CSS px of the accent (#8b2337) run down the clip's center column. */
const accentHeight = (page: Page, clip: Clip) => screenPixels<number>(page, clip, `
  const scale = w / arg, x = Math.floor(w / 2);
  let top = -1, bottom = -1;
  for (let y = 0; y < h; y += 1) {
    const i = (y * w + x) * 4;
    if (Math.abs(data[i] - 139) + Math.abs(data[i + 1] - 35) + Math.abs(data[i + 2] - 55) < 60) { if (top < 0) top = y; bottom = y; }
  }
  return top < 0 ? 0 : (bottom - top + 1) / scale;`, clip.width);

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
    // Its name carries the condition, since two Full range buttons share the step.
    await expect(group$.getByRole('button', { name: group === 'faultDip' ? 'Full range of fault angles' : 'Full range of sediment depths', exact: true })).toHaveText('Full range');
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
  test.skip(test.info().project.name === 'mobile', 'the mobile project drags by touch, below');
  await openSite(page);
  const slider = thumb(page, 'faultDip', 'max');
  const box = (await slider.boundingBox())!;
  const half = 12; // --gx-thumb / 2
  const at = (i: number) => box.x + half + ((box.width - 2 * half) * i) / 6;
  const y = box.y + box.height / 2;
  await page.mouse.move(at(6), y);
  await page.mouse.down();
  await page.mouse.move(at(5), y, { steps: 4 });
  // Mid-drag the group already looks answered (fill drawn), while the hint keeps its space until release.
  await expect(page.locator('#gx-range-faultDip')).toHaveAttribute('data-empty', 'false');
  await expect(page.locator('#gx-range-faultDip .gx-range-fill')).toBeVisible();
  await expect(page.locator('#gx-empty-faultDip')).toHaveCSS('visibility', 'hidden');
  await page.mouse.move(at(4), y, { steps: 4 });
  await page.mouse.up();
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 20°, 30°, 40°, 45°, 50° — 5 of 7 modeled angles.');
  await expect(page.locator('#gx-empty-faultDip')).toBeHidden();
  // A drag that changed a thumb's value answers the group even when it returns to where it began (§14.6 item 7).
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
  // Stacked mid-scale, the top thumb drags either way: the bound on that side follows the pointer.
  await pressThumb(page, 'faultDip', 'max', 'ArrowLeft', 3);
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 45° — 1 of 7 modeled angles.');
  await page.mouse.move(at(3), y);
  await page.mouse.down();
  await page.mouse.move(at(1), y, { steps: 8 });
  await page.mouse.up();
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 30°, 40°, 45° — 3 of 7 modeled angles.');
  await expect(thumb(page, 'faultDip', 'min')).toHaveValue('1');
  await expect(thumb(page, 'faultDip', 'max')).toHaveValue('3');
  await pressThumb(page, 'faultDip', 'min', 'ArrowRight', 2);
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 45° — 1 of 7 modeled angles.');
  await page.mouse.move(at(3), y);
  await page.mouse.down();
  await page.mouse.move(at(5), y, { steps: 8 });
  await page.mouse.up();
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 45°, 50°, 60° — 3 of 7 modeled angles.');
});

test('a sample with one depth widens downward by pointer (stacked thumbs)', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'the mobile project drags by touch, below');
  await gotoExplore(page);
  await pickSample(page, 'illustrative');
  await expect(echo(page, 'depth')).toHaveText('Selected: 5 m — 1 of 3 modeled depths.');
  const box = (await thumb(page, 'depth', 'max').boundingBox())!;
  const at = (i: number) => box.x + 12 + ((box.width - 24) * i) / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(at(1), y);
  await page.mouse.down();
  await page.mouse.move(at(0), y, { steps: 8 });
  // The sample's annotation stays until the release, so the group keeps its size mid-drag.
  await expect(page.locator('#gx-annotation-depth')).toHaveCount(1);
  await page.mouse.up();
  await expect(echo(page, 'depth')).toHaveText('Selected: 3 m, 5 m — 2 of 3 modeled depths.');
  await expect(page.locator('#gx-annotation-depth')).toHaveCount(0);
});

/** A group still unanswered: the echo, no fill, the hint, and nothing stored. */
async function expectUnanswered(page: Page, group: 'faultDip' | 'depth'): Promise<void> {
  await expect(echo(page, group)).toHaveText(group === 'faultDip' ? NONE_ANGLES : NONE_DEPTHS);
  await expect(page.locator(`#gx-range-${group}`)).toHaveAttribute('data-empty', 'true');
  await expect(page.locator(`#gx-range-${group} .gx-range-fill`)).toBeHidden();
  await expect(page.locator(`#gx-empty-${group}`)).toBeVisible();
  await expect(page.locator(`#gx-empty-${group}`)).not.toHaveCSS('visibility', 'hidden');
  expect((await storedRecord(page))?.draft[group]).toEqual([]);
}

test('a stray click that moves no thumb leaves the group unanswered (§14.6 item 7)', async ({ page }) => {
  test.skip(test.info().project.name === 'mobile', 'the mobile project taps, below');
  await openSite(page);
  for (const group of ['faultDip', 'depth'] as const) {
    const box = (await thumb(page, group, 'min').boundingBox())!;
    const y = box.y + box.height / 2;
    // On each parked thumb: its center, and off-center within the thumb.
    for (const x of [box.x + 12, box.x + 6, box.x + 18, box.x + box.width - 12, box.x + box.width - 18]) {
      await page.mouse.click(x, y);
      await expectUnanswered(page, group);
    }
  }
  await expect(page.locator('.gx-still-needed')).toHaveText('Still needed: Fault angle · Sediment depth · Sediment density · Sediment strength and structure.');
  // On stacked thumbs of an answered single value, a click changes nothing either.
  // The stray clicks left the draft untouched, so the sample fills without asking.
  await action(page, 'Back').click();
  await pickSample(page, 'illustrative');
  const box = (await thumb(page, 'depth', 'max').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(echo(page, 'depth')).toHaveText('Selected: 5 m — 1 of 3 modeled depths.');
  await expect(page.locator('#gx-annotation-depth')).toHaveCount(1);
});

test('a stray tap that moves no thumb leaves the group unanswered (§14.6 item 7)', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'the desktop project clicks, above');
  await openSite(page);
  for (const group of ['faultDip', 'depth'] as const) {
    await thumb(page, group, 'min').scrollIntoViewIfNeeded();
    const box = (await thumb(page, group, 'min').boundingBox())!;
    const y = box.y + box.height / 2;
    for (const x of [box.x + 12, box.x + 6, box.x + box.width - 12, box.x + box.width - 18]) {
      await page.touchscreen.tap(x, y);
      await expectUnanswered(page, group);
    }
  }
});

test('a touch drags a thumb to a modeled stop', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'the desktop project drags by mouse, above');
  await openSite(page);
  const box = (await thumb(page, 'faultDip', 'max').boundingBox())!;
  const at = (i: number) => box.x + 12 + ((box.width - 24) * i) / 6;
  const y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await touch('touchStart', at(6));
  for (const i of [5.6, 5.2, 4.8, 4.4, 4]) await touch('touchMove', at(i));
  await touch('touchEnd', at(4));
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 20°, 30°, 40°, 45°, 50° — 5 of 7 modeled angles.');
  await expect(page.locator('#gx-empty-faultDip')).toBeHidden();
});

test('Page Up and Page Down move one stop; an answered range survives reload and the steps; Full range clears a restored gap', async ({ page }) => {
  await openSite(page);
  await page.locator('#gx-faultDip-full').click();
  await pressThumb(page, 'faultDip', 'max', 'PageDown');
  await expect(thumb(page, 'faultDip', 'max')).toHaveAttribute('aria-valuetext', '60 degrees');
  await pressThumb(page, 'faultDip', 'min', 'PageUp');
  await expect(thumb(page, 'faultDip', 'min')).toHaveAttribute('aria-valuetext', '30 degrees');
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 30°, 40°, 45°, 50°, 60° — 5 of 7 modeled angles.');
  await pressThumb(page, 'depth', 'min', 'End');
  // The answered ranges survive a reload…
  await page.reload();
  await explorerReady(page);
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 30°, 40°, 45°, 50°, 60° — 5 of 7 modeled angles.');
  await expect(echo(page, 'depth')).toHaveText('Selected: 10 m — 1 of 3 modeled depths.');
  await expect(page.locator('#gx-range-faultDip')).toHaveAttribute('data-empty', 'false');
  // …and leaving the step and coming back.
  await action(page, 'Back').click();
  await action(page, 'Build your scenario').click();
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 30°, 40°, 45°, 50°, 60° — 5 of 7 modeled angles.');
  await expect(thumb(page, 'faultDip', 'min')).toHaveValue('1');
  await expect(thumb(page, 'faultDip', 'max')).toHaveValue('5');
  // Full range on a restored gapped set answers it with the whole contiguous range.
  const record = (await storedRecord(page))!;
  record.draft.faultDip = [30, 50];
  await page.evaluate(([key, text]) => sessionStorage.setItem(key, text), [SESSION_KEY, JSON.stringify(record)] as const);
  await page.reload();
  await explorerReady(page);
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 30°, 50° — 2 of 7 modeled angles (with gaps).');
  await page.locator('#gx-faultDip-full').click();
  await expect(echo(page, 'faultDip')).toHaveText('Selected: 20°, 30°, 40°, 45°, 50°, 60°, 70° — 7 of 7 modeled angles.');
});

test('a keyboard-focused thumb shows the focus ring, in normal and forced colors', async ({ page }) => {
  await openSite(page);
  await page.locator('#gx-faultDip-full').click();
  const around = await thumbClip(page, 'faultDip', 0);
  // Tab from Full range reaches the minimum thumb by keyboard: the page's blue ring is drawn.
  await page.locator('#gx-faultDip-full').focus();
  await page.keyboard.press('Tab');
  await expect(thumb(page, 'faultDip', 'min')).toBeFocused();
  expect(await pixels(page, around, [55, 110, 186])).toBeGreaterThan(20);
  const focusedForced = async () => { await page.emulateMedia({ forcedColors: 'active' }); return page.screenshot({ clip: around }); };
  const ringed = await focusedForced();
  // Moving focus to the far thumb leaves no ring here.
  await page.keyboard.press('Tab');
  await expect(thumb(page, 'faultDip', 'max')).toBeFocused();
  await page.emulateMedia({ forcedColors: 'none' });
  expect(await pixels(page, around, [55, 110, 186])).toBe(0);
  // In forced colors the focused thumb still looks different from the unfocused one.
  const plain = await focusedForced();
  expect(Buffer.compare(ringed, plain)).not.toBe(0);
});

for (const width of [320, 1024]) {
  test(`the ranges fit ${width} px: no horizontal scroll, every stop labeled under its thumb`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openSite(page);
    await page.locator('#gx-faultDip-full').click();
    await page.locator('#gx-depth-full').click();
    expect(await overflows(page)).toBe(false);
    for (const group of ['faultDip', 'depth'] as const) {
      const fieldset = (await page.locator(`#gx-group-${group}`).boundingBox())!;
      const labels = await scaleBoxes(page, group);
      for (const { left, right } of labels) {
        expect(left).toBeGreaterThanOrEqual(fieldset.x);
        expect(right).toBeLessThanOrEqual(fieldset.x + fieldset.width);
      }
      expectNoOverlap(labels);
      // Each inner label is centered under its stop (the end labels align to the scale's edges).
      const stops = await page.locator(`#gx-range-${group} .gx-range-track i`).evaluateAll((dots) => dots.map((d) => { const r = d.getBoundingClientRect(); return (r.left + r.right) / 2; }));
      for (let i = 1; i < labels.length - 1; i += 1) expect(Math.abs((labels[i].left + labels[i].right) / 2 - stops[i])).toBeLessThanOrEqual(2);
      // The thumbs are at least the 24 px target: the accent disc's height down its center column.
      await thumb(page, group, 'min').scrollIntoViewIfNeeded();
      const height = await accentHeight(page, await thumbClip(page, group, 0));
      expect(height).toBeGreaterThanOrEqual(24);
      expect(height).toBeLessThanOrEqual(28);
    }
  });
}

test('WCAG 1.4.12 text spacing at 320 px keeps every scale label apart', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await openSite(page);
  await page.addStyleTag({ content: '#gre-explore * { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; }' });
  for (const group of ['faultDip', 'depth'] as const) expectNoOverlap(await scaleBoxes(page, group));
  expect(await overflows(page)).toBe(false);
});

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
