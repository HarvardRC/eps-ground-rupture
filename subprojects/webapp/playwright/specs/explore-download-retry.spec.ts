// explore-download-retry.spec.ts (guided DDD §13.5): a failed guided
// download shows its message and alert; the next attempt clears them
// when it starts, so a successful retry leaves only the ready status.

import { expect, test } from '@playwright/test';
import { DOWNLOAD_FAILED } from '../../src/explore/wording';
import { action, gotoExplore, pickSample } from '../explore-support';

test.describe.configure({ timeout: 120_000 });

test('a retry after a failed download leaves no failure message or alert', async ({ page }) => {
  // The first archive Blob URL fails; chart exports and later calls are untouched.
  await page.addInitScript(() => {
    const original = URL.createObjectURL.bind(URL);
    let failed = false;
    URL.createObjectURL = (object: Blob | MediaSource): string => {
      if (!failed && object instanceof Blob && object.type === 'application/zip') {
        failed = true;
        throw new Error('injected archive failure');
      }
      return original(object);
    };
  });
  await gotoExplore(page);
  await pickSample(page, 'illustrative');
  await action(page, 'Continue to fault slip').click();
  await page.locator('#gx-offset-feedback table').waitFor();
  await action(page, 'Review scenario').click();
  await action(page, 'Show results').click();
  await page.locator('.gx-context').waitFor();

  const explorer = page.locator('#gre-explore');
  const button = page.locator('#gre-explore button[data-action="download"]');
  // Assembling the archive (report images included) can take several seconds.
  const assembled = { timeout: 30_000 };
  const srAlert = page.locator('#gre-explore > p.gx-sr-only[role="alert"]');

  await button.click();
  await expect(page.locator('#gre-explore .gx-warning[role="alert"]')).toHaveText(DOWNLOAD_FAILED, assembled);
  await expect(srAlert).toHaveText(DOWNLOAD_FAILED);

  await button.focus();
  await Promise.all([page.waitForEvent('download'), button.click()]);
  await expect(page.locator('#gx-download-status')).toHaveText('Your confirmed result download is ready.', assembled);
  await expect(explorer.getByText('The download could not be created')).toHaveCount(0);
  await expect(srAlert).not.toContainText('The download could not be created');
  await expect(button).toBeFocused();
});
