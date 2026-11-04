// explore-layout.spec.ts (guided DDD §9.5 item 11): 320 px and 1,024 px
// layouts without horizontal overflow across steps, results,
// refinements, and the guide.

import { expect, test } from '@playwright/test';
import { gs } from '../support';
import {
  action, chooseMovement, chooseSite, gotoExplore, overflows,
} from '../explore-support';

test.describe.configure({ timeout: 180_000 });

for (const width of [320, 1024] as const) {
  test(`no horizontal overflow at ${width} px`, async ({ page }) => {
    const ref = gs('GS-1');
    await page.setViewportSize({ width, height: 900 });
    await gotoExplore(page);
    const fits = async (where: string) => expect(await overflows(page), `${where} at ${width} px`).toBe(false);
    await fits('introduction');
    await page.locator('#gx-sample').click();
    await fits('site conditions with the sample status');
    // Start a new scenario returns to unanswered site conditions.
    await page.locator('.gx-restart button').click();
    await action(page, 'Continue to fault movement').click();
    await fits('site validation errors');
    await chooseSite(page, ref.inputs);
    await action(page, 'Continue to fault movement').click();
    await chooseMovement(page, ref.inputs);
    await page.locator('#gx-offset-feedback table').waitFor();
    await fits('fault movement with conversions');
    await action(page, 'Review scenario').click();
    await fits('review');
    await action(page, 'Show results').click();
    await page.locator('.gx-context').waitFor();
    await fits('results');
    for (const m of ['dzw', 'scarp_dip'] as const) {
      await page.locator(`#gx-measurement-${m}`).click();
      await fits(`results, ${m}`);
    }
    await page.locator('#gx-chart-cumulative').click();
    await fits('cumulative chart');
    await page.locator('#gx-refine-button').click();
    await fits('refinements');
    await page.getByRole('button', { name: 'Walk me through results' }).click();
    for (let stop = 0; stop < 5; stop++) {
      await fits(`walkthrough stop ${stop + 1}`);
      if (stop < 4) await page.locator('.gx-guide-nav .gx-primary').click();
    }
  });
}
