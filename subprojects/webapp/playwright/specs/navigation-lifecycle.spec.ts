// navigation-lifecycle.spec.ts (docs/app/ddd.md §7.5 inventory): "leaving
// and returning to the scenario page does not duplicate controls, event
// handlers, or result updates" (HLDD §9), with the §7.5 Reload recovery
// additions of this spec.

import { expect, test, type Page } from '@playwright/test';
import { fillCopy } from '../../src/views/chart-text';
import { copyText } from '../../src/views/copy';
import {
  Net,
  RECOVERY_KEY,
  SCENARIO_URL,
  backToScenario,
  clearRecorded,
  countRequests,
  gotoScenario,
  gs,
  installRecorder,
  leaveToGlossary,
  manifest,
  mounted,
  pageErrors,
  pointer,
  recorded,
  recordedEntries,
  recoveryRecord,
  seedRecovery,
  settle,
  withAppAttribute,
} from '../support';

test.describe.configure({ timeout: 180_000 });

interface Shape {
  readonly controls: number;
  readonly panels: number;
  readonly regions: number;
  readonly roots: number;
}

const shape = (page: Page): Promise<Shape> =>
  page.evaluate(() => ({
    controls: document.querySelectorAll('#gre-controls input, #gre-controls button').length,
    panels: document.querySelectorAll('#gre-panels > section').length,
    regions: document.querySelectorAll('[role=status], [role=alert]').length,
    roots: document.querySelectorAll('#gre-root').length,
  }));

/** One accepted scenario change; returns the status texts it wrote. */
async function oneChange(page: Page): Promise<string[]> {
  await clearRecorded(page);
  const before = await page.locator('#gre-summary').innerText();
  await page.locator('fieldset.gre-dip label').first().click();
  await expect(page.locator('#gre-summary')).not.toHaveText(before);
  await settle(page);
  await settle(page);
  return recorded(page, 'status');
}

test('three leave-and-return cycles: no duplicated controls, handlers, updates, or requests', async ({ page }) => {
  await installRecorder(page);
  const bundle = countRequests(page, 'app-');
  const artifact = countRequests(page, manifest().files.scenario_artifact);
  await gotoScenario(page);
  const first = await shape(page);
  expect(first.roots).toBe(1);
  expect(first.regions).toBe(2);
  for (let i = 0; i < 3; i++) {
    await leaveToGlossary(page);
    await backToScenario(page);
    await settle(page);
    expect(await shape(page)).toEqual(first);
  }
  const writes = await oneChange(page);
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatch(/^Results updated: /);
  expect(bundle.urls.filter((u) => u.endsWith('.js'))).toHaveLength(1);
  expect(artifact.n()).toBe(1);
});

test('a changed bundle URL mounts once under the new instance; an unrouted re-entry restores the original', async ({ page }) => {
  const net = await new Net(page).install();
  await gotoScenario(page);
  const original = (await page.locator('#gre-root').getAttribute('data-gre-build'))!;
  await leaveToGlossary(page);
  net.html = (html) => html.replace(/(src="[^"]*app-[0-9a-f]+\.js)"/, '$1?swap=1"');
  await backToScenario(page);
  await expect(page.locator('#gre-root')).toHaveAttribute('data-gre-build', /\?swap=1$/);
  await settle(page);
  expect((await shape(page)).panels).toBe(3);
  await expect(page.locator('#gre-controls')).toHaveCount(1);
  await expect(page.locator('#gre-controls fieldset.gre-dip')).toHaveCount(1);
  await leaveToGlossary(page);
  net.html = null;
  await backToScenario(page);
  await expect(page.locator('#gre-root')).toHaveAttribute('data-gre-build', original);
  await settle(page);
  await expect(page.locator('#gre-controls fieldset.gre-dip')).toHaveCount(1);
  expect((await shape(page)).regions).toBe(2);
});

test('a changed data stamp re-runs the load: the version-mismatch state, then results again unrouted', async ({ page }) => {
  const net = await new Net(page).install();
  const v = pointer().export_version;
  await gotoScenario(page);
  await leaveToGlossary(page);
  net.html = withAppAttribute('data-data-version', `${v}-x`);
  await backToScenario(page);
  const reason = fillCopy('ddd5.10.reasonDataVersion', { expected: `${v}-x`, loaded: v });
  await expect(page.locator('#gre-state')).toHaveText(fillCopy('ddd5.10.unavailableNotice', { reason }));
  await expect(page.locator('#gre-panels')).toBeHidden();
  await expect(page.locator('#gre-summary')).toHaveText('');
  await leaveToGlossary(page);
  net.html = null;
  await backToScenario(page);
  await expect(page.locator('#gre-panels')).toBeVisible();
  await expect(page.locator('#gre-state')).toHaveText('');
  await expect(page.locator('#gre-scarp_height .gre-chart svg')).toHaveCount(1);
});

test('in-flight disposal: a held artifact released after leaving; the return mounts once, no unavailable notice', async ({ page }) => {
  const errors = pageErrors(page);
  const net = await new Net(page).install();
  const held = net.hold(manifest().files.scenario_artifact);
  await page.goto('scenario/');
  await held.arrived;
  await page.locator('#gre-root [role=status]').waitFor({ state: 'attached' });
  await leaveToGlossary(page);
  held.release();
  await settle(page);
  await backToScenario(page);
  await settle(page);
  await expect(page.locator('#gre-controls fieldset.gre-dip')).toHaveCount(1);
  expect((await shape(page)).regions).toBe(2);
  await expect(page.locator('#gre-state')).toHaveText('');
  await expect(page.locator('#gre-panels')).toBeVisible();
  expect(errors).toEqual([]);
});

/** Records every Storage call on the recovery key as `op`. */
async function recordKeyAccesses(page: Page): Promise<void> {
  await page.addInitScript((key: string) => {
    const log: string[] = [];
    (window as unknown as { __greKeyLog: string[] }).__greKeyLog = log;
    for (const op of ['getItem', 'setItem', 'removeItem'] as const) {
      const original = Storage.prototype[op] as (...a: unknown[]) => unknown;
      Storage.prototype[op] = function (this: Storage, ...args: unknown[]) {
        if (args[0] === key) log.push(op);
        return original.apply(this, args);
      } as never;
    }
  }, RECOVERY_KEY);
}

const keyLog = (page: Page): Promise<string[]> => page.evaluate(() => (window as unknown as { __greKeyLog: string[] }).__greKeyLog.slice());

test('reload recovery: the record is consumed once, and no re-entry re-reads or replays it, a changed bundle instance included', async ({ page }) => {
  await installRecorder(page);
  const gs7 = gs('GS-7');
  await seedRecovery(page, recoveryRecord(gs7.inputs));
  await recordKeyAccesses(page);
  const net = await new Net(page).install();
  await gotoScenario(page);
  const restored = copyText('ddd5.10.recoveryRestored').replace('{current}', pointer().export_version);
  await expect(page.locator('#gre-recovery')).toHaveText(restored);
  await expect(page.locator('#gre-summary')).toContainText('one state per simulation trial');
  expect(await keyLog(page)).toEqual(['getItem', 'removeItem', 'getItem']);
  // The key is gone (read without getItem, so the access log stays the app's).
  expect(await page.evaluate((k) => Object.keys(sessionStorage).includes(k), RECOVERY_KEY)).toBe(false);
  await settle(page);
  expect((await recorded(page, 'status')).filter((t) => t === restored)).toHaveLength(1);
  // Leave and return: no re-read, no restoration replay; then once more under a changed bundle instance.
  for (const swap of [false, true]) {
    await leaveToGlossary(page);
    net.html = swap ? (html) => html.replace(/(src="[^"]*app-[0-9a-f]+\.js)"/, '$1?swap=1"') : null;
    await clearRecorded(page);
    await backToScenario(page);
    await settle(page);
    if (swap) await expect(page.locator('#gre-root')).toHaveAttribute('data-gre-build', /\?swap=1$/);
    expect(await keyLog(page), `re-entry ${swap ? 'with' : 'without'} a changed bundle`).toEqual(['getItem', 'removeItem', 'getItem']);
    await expect(page.locator('#gre-recovery')).toHaveText('');
    // No restoration replay: nothing announces it again (a changed bundle instance loads its own vintage, announcing only the load).
    expect((await recorded(page)).filter((t) => t !== copyText('ddd5.11.loadingAnnouncement'))).toEqual([]);
    // Defaults on re-entry: a new mount with no restoration.
    await expect(page.locator('#gre-summary')).toContainText('all recorded stages');
  }
});

test('an aborted restoring mount commits and announces nothing after the abort', async ({ page }) => {
  const errors = pageErrors(page);
  await installRecorder(page);
  const net = await new Net(page).install();
  const gs1 = gs('GS-1');
  await seedRecovery(page, recoveryRecord(gs1.inputs));
  // The regression export pending: the vintage loaded, the restored offset Scenario waiting.
  const held = net.hold(manifest().files.regression_export);
  await page.goto('scenario/');
  await held.arrived;
  const root = await page.locator('#gre-root').elementHandle();
  await leaveToGlossary(page);
  await clearRecorded(page);
  held.release();
  await settle(page);
  await settle(page);
  expect(await recordedEntries(page)).toEqual([]);
  expect(await root!.evaluate((el) => el.hasAttribute('data-gre-mounted') || el.querySelector('#gre-panels') !== null)).toBe(false);
  expect(errors).toEqual([]);
});

test('an aborted restoring mount with its vintage pending commits and announces nothing after the abort', async ({ page }) => {
  const errors = pageErrors(page);
  await installRecorder(page);
  const net = await new Net(page).install();
  await seedRecovery(page, recoveryRecord(gs('GS-7').inputs));
  const held = net.hold(manifest().files.scenario_artifact);
  await page.goto('scenario/');
  await held.arrived;
  const root = await page.locator('#gre-root').elementHandle();
  await leaveToGlossary(page);
  await clearRecorded(page);
  held.release();
  await settle(page);
  await settle(page);
  expect(await recordedEntries(page)).toEqual([]);
  expect(await root!.evaluate((el) => el.hasAttribute('data-gre-mounted') || el.querySelector('#gre-panels') !== null)).toBe(false);
  expect(errors).toEqual([]);
});

test('resuming from a blocked decision keeps the same #gre-root, skeleton containers, and live regions', async ({ page }) => {
  await installRecorder(page);
  await seedRecovery(page, recoveryRecord(gs('GS-7').inputs));
  // The first removal of the key throws: a known record whose removal failed (blocked).
  await page.addInitScript((key: string) => {
    let failed = false;
    const original = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (this: Storage, k: string) {
      if (k === key && !failed) {
        failed = true;
        throw new DOMException('blocked', 'SecurityError');
      }
      return original.call(this, k);
    };
  }, RECOVERY_KEY);
  await page.goto('scenario/');
  await mounted(page);
  await expect(page.locator('#gre-state')).toHaveText(copyText('ddd5.10.recoveryClearFailed'));
  const handles = await page.evaluate(() => {
    const w = window as unknown as { __greNodes: Element[] };
    w.__greNodes = ['#gre-root', '#gre-summary', '#gre-controls', '#gre-panels', '#gre-state', '#gre-recovery', '#gre-versions', '#gre-root > [role=status]', '#gre-root > [role=alert]'].map(
      (s) => document.querySelector(s)!,
    );
    return w.__greNodes.length;
  });
  expect(handles).toBe(9);
  await page.locator('#gre-recovery button', { hasText: copyText('ddd5.10.actionRetryRecovery') }).click();
  await expect(page.locator('#gre-panels')).toBeVisible();
  await expect(page.locator('#gre-summary')).toContainText('one state per simulation trial');
  const same = await page.evaluate(() => {
    const w = window as unknown as { __greNodes: Element[] };
    const now = ['#gre-root', '#gre-summary', '#gre-controls', '#gre-panels', '#gre-state', '#gre-recovery', '#gre-versions', '#gre-root > [role=status]', '#gre-root > [role=alert]'].map(
      (s) => document.querySelector(s),
    );
    return now.map((el, i) => el === w.__greNodes[i] && el!.isConnected);
  });
  expect(same).toEqual(Array(9).fill(true));
  expect(await page.evaluate(() => document.querySelectorAll('[role=status], [role=alert]').length)).toBe(2);
  expect(page.url()).toBe(SCENARIO_URL);
});
