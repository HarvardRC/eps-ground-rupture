// explore-race.spec.ts (guided DDD §9.5 item 7): the offset-review race.
// The regression response is held while the reader navigates away; no
// stale review or restore applies afterwards (navigationVersion, §5.2,
// §9.2).

import { expect, test } from '@playwright/test';
import { gs } from '../support';
import {
  MOVEMENT_HEADING, REGRESSION, SITE_HEADING, action, chooseMovement, chooseSite, explorerReady, gotoExplore, heading,
  holdRegression, settleFrames, expectStepClosed, stepButton,
} from '../explore-support';

test.describe.configure({ timeout: 120_000 });

test('navigating away during a held offset review keeps the reader where they went', async ({ page }) => {
  const ref = gs('GS-1');
  await gotoExplore(page);
  const release = await holdRegression(page);
  await action(page, 'Build your scenario').click();
  await chooseSite(page, ref.inputs);
  await action(page, 'Continue to fault movement').click();
  await chooseMovement(page, ref.inputs);
  await expect(page.locator('.gx-movement [role="status"]')).toHaveText('Loading the offset conversion…');
  await action(page, 'Review scenario').click();
  await expect(heading(page)).toHaveText(MOVEMENT_HEADING);

  await stepButton(page, 'site').click();
  await expect(heading(page)).toHaveText(SITE_HEADING);
  release();
  await page.waitForResponse(REGRESSION);
  await settleFrames(page);
  await expect(heading(page)).toHaveText(SITE_HEADING);
  // Prove the held response was processed before asserting nothing stale applied.
  await action(page, 'Continue to fault movement').click();
  await page.locator('#gx-offset-feedback table').waitFor();
  await expect(heading(page)).toHaveText(MOVEMENT_HEADING);
  // The stale review never applied: Review was never reached.
  await expectStepClosed(page, 'review');
  await expectStepClosed(page, 'results');
  await page.unroute(REGRESSION);
});

test('navigating away during a held restore applies no stale result', async ({ page }) => {
  const ref = gs('GS-1');
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  await chooseSite(page, ref.inputs);
  await action(page, 'Continue to fault movement').click();
  await chooseMovement(page, ref.inputs);
  await action(page, 'Review scenario').click();
  await action(page, 'Show results').click();
  await page.locator('.gx-context').waitFor();

  const release = await holdRegression(page);
  await page.reload();
  await explorerReady(page);
  await expect(page.locator('.gx-restoring')).toHaveText('Recalculating the results of your confirmed scenario…');
  await stepButton(page, 'site').click();
  release();
  await page.waitForResponse(REGRESSION);
  await settleFrames(page);
  await expect(heading(page)).toHaveText(SITE_HEADING);
  await expectStepClosed(page, 'results');
  await expect(page.locator('.gx-restore-retry')).toContainText('Restoring the results was interrupted.');
  await expect(page.locator('.gx-restored')).toHaveCount(0);
  await page.unroute(REGRESSION);

  await page.locator('#gx-retry-restore').click();
  await expect(stepButton(page, 'results')).toBeEnabled();
  await expect(heading(page)).toHaveText(SITE_HEADING);
});
