// explore-walkthrough.spec.ts (guided DDD §9.5 item 8): the results
// walkthrough's five stops, exits, the empty-type review block, and
// focus targets (§5.2).

import { expect, test } from '@playwright/test';
import {
  RESULTS_HEADING, action, confirmGolden, confirmedCount, countText, gotoExplore, heading, setChecked,
} from '../explore-support';

test.describe.configure({ timeout: 120_000 });

const STOPS = ['Scarp height', 'Deformation zone width', 'Scarp dip', 'Simulation stages', 'Scarp types'] as const;
const PROGRESS = ['Height', 'Width', 'Dip', 'Stages', 'Types'] as const;
const PROMPTS = ['How high is the scarp?', 'How wide is the disturbed ground?', 'How steep is the scarp face?'] as const;
const MEASURES = ['scarp_height', 'dzw', 'scarp_dip'] as const;

test('the five stops, their progress, and Finish walkthrough', async ({ page }) => {
  await gotoExplore(page);
  const ref = await confirmGolden(page, 'GS-6');
  const guide = page.locator('.gx-guide-header');
  await action(page, 'Walk me through results').click();
  await expect(page.locator('.gx-selector')).toHaveCount(0);
  await expect(page.locator('#gx-refine-button')).toHaveCount(0);
  for (let i = 0; i < STOPS.length; i++) {
    await expect(page.locator('#gx-guide-heading')).toHaveText(STOPS[i]);
    await expect(page.locator('#gx-guide-heading')).toBeFocused();
    await expect(guide.locator('.gx-step')).toHaveText(`Results walkthrough · ${i + 1} of 5`);
    await expect(guide.locator('.gx-guide-progress li')).toHaveText([...PROGRESS].map((label, j) => `${j + 1}${label}`));
    await expect(guide.locator('.gx-guide-progress li[aria-current="step"]')).toContainText(PROGRESS[i]);
    await expect(guide.getByRole('button', { name: 'Back' })).toBeEnabled({ enabled: i > 0 });
    if (i < 3) {
      await expect(guide.locator('.gx-guide-prompt')).toHaveText(PROMPTS[i]);
      await expect(page.locator(`#gx-measurement-${MEASURES[i]}`)).toHaveCount(0);
      await expect(page.locator('.gx-measurement h3').first()).toContainText(STOPS[i]);
    } else if (i === 3) {
      await expect(page.locator('input[name="gx-population"]')).toHaveCount(2);
      await expect(page.locator('#gx-scarpClass-all')).toHaveCount(0);
    } else {
      await expect(page.locator('#gx-scarpClass-all')).toHaveCount(1);
      await expect(page.locator('input[name="gx-population"]')).toHaveCount(0);
    }
    const next = i < 4 ? `Next: ${STOPS[i + 1]}` : 'Finish walkthrough';
    await expect(guide.locator('.gx-guide-nav .gx-primary')).toHaveText(next);
    // Next stays within reach after the stop's content: the same Back and Next follow it (§11.2).
    const bottom = page.locator('.gx-guide-nav-bottom');
    await expect(bottom.locator('.gx-primary')).toHaveText(next);
    await expect(bottom.getByRole('button', { name: 'Back' })).toBeEnabled({ enabled: i > 0 });
    expect(await bottom.evaluate((node) => {
      const content = document.querySelector('.gx-measurement, .gx-guide-editor');
      return content !== null && Boolean(content.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
    })).toBe(true);
    // The lower Next works like the upper one (used at the second stop).
    if (i === 1) await bottom.locator('.gx-primary').click();
    else if (i < 4) await guide.locator('.gx-guide-nav .gx-primary').click();
  }
  await expect(confirmedCount(page)).toHaveText(countText(ref.counts.matching_records));
  await guide.locator('.gx-guide-nav .gx-primary').click();
  await expect(guide).toHaveCount(0);
  await expect(page.locator('#gx-refine-button')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#gx-scarpClass-all')).toBeFocused();
});

test('Exit walkthrough keeps the measurement and focuses its card; Back returns', async ({ page }) => {
  await gotoExplore(page);
  // GS-1 has charts; GS-6's records carry no valid measurement.
  await confirmGolden(page, 'GS-1');
  await action(page, 'Walk me through results').click();
  await page.locator('.gx-guide-header .gx-guide-nav .gx-primary').click();
  await page.locator('.gx-guide-header .gx-guide-nav').getByRole('button', { name: 'Back' }).click();
  await expect(page.locator('#gx-guide-heading')).toHaveText(STOPS[0]);
  await page.locator('.gx-guide-header .gx-guide-nav .gx-primary').click();
  await page.locator('#gx-chart-cumulative').click();
  await page.locator('.gx-guide-header').getByRole('button', { name: 'Exit walkthrough' }).click();
  await expect(page.locator('.gx-guide-header')).toHaveCount(0);
  await expect(page.locator('#gx-measurement-dzw')).toBeFocused();
  await expect(page.locator('#gx-measurement-dzw')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#gx-chart-cumulative')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.gx-pending')).toHaveCount(0);
});

test('an empty type selection ends the guide at review and focuses the summary', async ({ page }) => {
  await gotoExplore(page);
  const ref = await confirmGolden(page, 'GS-6');
  await action(page, 'Walk me through results').click();
  for (let i = 0; i < 4; i++) await page.locator('.gx-guide-header .gx-guide-nav .gx-primary').click();
  await setChecked(page, '#gx-scarpClass-all', false);
  await expect(page.locator('.gx-guide-header .gx-guide-nav .gx-primary')).toHaveText('Review changes');
  // The stop's own guidance names the condition before the attempt (§12.1);
  // the stages stop names only what it shows, so no link lacks its target.
  await expect(page.locator('.gx-guide-editor .gx-still-needed')).toHaveText('Still needed: Scarp types.');
  await page.locator('.gx-guide-header .gx-guide-nav').getByRole('button', { name: 'Back' }).click();
  await expect(page.locator('.gx-guide-editor .gx-still-needed')).toHaveCount(0);
  await page.locator('.gx-guide-header .gx-guide-nav .gx-primary').click();
  await page.locator('.gx-guide-editor .gx-still-needed').getByRole('link', { name: 'Scarp types' }).click();
  await expect(page.locator('#gx-group-scarpClass')).toBeFocused();
  await page.locator('.gx-guide-header .gx-guide-nav .gx-primary').click();
  await expect(page.locator('.gx-guide-header')).toHaveCount(0);
  await expect(heading(page)).toHaveText(RESULTS_HEADING);
  await expect(page.locator('#gx-refinements #gx-issue-summary')).toBeFocused();
  await expect(page.locator('#gx-error-scarpClass')).toHaveText('Select one or more scarp types before review.');
  await expect(page.locator('#gx-refine-button')).toHaveAttribute('aria-expanded', 'true');
  await expect(confirmedCount(page)).toHaveText(countText(ref.counts.matching_records));

  // Leaving from the stages stop opens refinements and focuses its selected radio.
  await setChecked(page, '#gx-scarpClass-all', true);
  await action(page, 'Walk me through results').click();
  for (let i = 0; i < 3; i++) await page.locator('.gx-guide-header .gx-guide-nav .gx-primary').click();
  await page.locator('.gx-guide-header').getByRole('button', { name: 'Exit walkthrough' }).click();
  await expect(page.locator('#gx-population-all_stages')).toBeFocused();
  await expect(page.locator('#gx-refine-button')).toHaveAttribute('aria-expanded', 'true');
});
