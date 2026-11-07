// explore-journey.spec.ts (guided DDD §9.5 item 1): the five-step
// journey to a confirmed result with its matching count, and /scenario/
// still mounting. GS-1's inputs and count are the reference file's.

import { expect, test } from '@playwright/test';
import { formatCount } from '../../src/views/format';
import { gs, mounted } from '../support';
import {
  INTRO_HEADING, MOVEMENT_HEADING, RESULTS_HEADING, REVIEW_HEADING, SITE_HEADING,
  action, chooseMovement, chooseSite, confirmedCount, countText, gotoExplore, heading, expectStepClosed, stepButton,
} from '../explore-support';

test.describe.configure({ timeout: 120_000 });

test('the five-step journey confirms GS-1 with the reference count', async ({ page }) => {
  const ref = gs('GS-1');
  await gotoExplore(page);
  await expect(heading(page)).toHaveText(INTRO_HEADING);
  await expect(stepButton(page, 'intro')).toHaveAttribute('aria-current', 'step');
  await expectStepClosed(page, 'results');

  await action(page, 'Build your scenario').click();
  await expect(heading(page)).toHaveText(SITE_HEADING);
  await expect(heading(page)).toBeFocused();
  await expect(stepButton(page, 'site')).toHaveAttribute('aria-current', 'step');
  await chooseSite(page, ref.inputs);

  await action(page, 'Continue to fault slip').click();
  await expect(heading(page)).toHaveText(MOVEMENT_HEADING);
  await chooseMovement(page, ref.inputs);

  await action(page, 'Review scenario').click();
  await expect(heading(page)).toHaveText(REVIEW_HEADING);
  await expect(page.locator('.gx-review-section').nth(1)).toContainText(`0–${ref.inputs.offset_max} m surface offset`);
  await expect(page.locator('.gx-review-section table.gx-conversions tbody tr')).toHaveCount(ref.inputs.fault_dip.length);
  await expectStepClosed(page, 'results');

  await action(page, 'Show results').click();
  await expect(heading(page)).toHaveText(RESULTS_HEADING);
  await expect(confirmedCount(page)).toHaveText(countText(ref.counts.matching_records));
  await expect(stepButton(page, 'results')).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('#gx-chart svg')).toHaveCount(1);
  await expect(page.locator('.gx-measurement .gx-section-head strong')).toHaveText(
    `${formatCount(ref.counts.per_measurement.scarp_height.valid)} measurements used`,
  );
  await expect(page.locator('#gx-measurement-scarp_height')).toHaveAttribute('aria-pressed', 'true');
});

test('/scenario/ still mounts beside the guided page', async ({ page }) => {
  await gotoExplore(page);
  await page.goto('scenario/');
  await mounted(page);
  await expect(page.locator('#gre-root')).toHaveAttribute('data-gre-mounted', /.*/);
});
