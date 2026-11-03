// a11y.spec.ts (docs/app/ddd.md §7.5 inventory): "the automatable
// accessibility checks pass" (HLDD §9) — axe under the WCAG 2.2 AA tags,
// the DD-9 chart text alternatives, the read-off, rapid changes, and the
// §7.5 Transient announcement guards, Startup announcement ordering, and
// reload-recovery accessibility cases. The desktop project runs it.

import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { fillCopy, measurementLabel } from '../../src/views/chart-text';
import { copyText } from '../../src/views/copy';
import { formatCount } from '../../src/views/format';
import {
  BASE_URL,
  MEASUREMENTS,
  Net,
  RECOVERY_KEY,
  applyGolden,
  chromiumDescription,
  backToScenario,
  clearRecorded,
  gotoScenario,
  gs,
  installRecorder,
  installTimerWrapper,
  isHeld,
  leaveToGlossary,
  manifest,
  mounted,
  oneZeroTimer,
  pointer,
  recorded,
  recordedEntries,
  recoveryRecord,
  regionIndex,
  releaseHeld,
  seedRecovery,
  settle,
  withAppAttribute,
  type Measurement,
} from '../support';

test.describe.configure({ timeout: 180_000 });

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const LOADING = copyText('ddd5.11.loadingAnnouncement');
const V = () => pointer().export_version;

/** Runs axe with the §7.5 tags, records the engine version as the `axe-core-version` annotation, and asserts zero violations (soft, so every state is reported). */
async function axe(page: Page, testInfo: TestInfo, state: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  if (!testInfo.annotations.some((a) => a.type === 'axe-core-version')) {
    testInfo.annotations.push({ type: 'axe-core-version', description: results.testEngine.version });
  }
  const found = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
  expect.soft(found, `axe violations in ${state}`).toEqual([]);
}

/** Opens or closes every chart-data disclosure the page shows. */
async function disclosures(page: Page, open: boolean): Promise<void> {
  for (const m of MEASUREMENTS) {
    const details = page.locator(`#gre-${m}-data`);
    if ((await details.count()) === 0 || !(await details.isVisible())) continue;
    if ((await details.evaluate((d) => (d as HTMLDetailsElement).open)) !== open) {
      await details.locator('> summary').click();
      await expect.poll(() => details.evaluate((d) => (d as HTMLDetailsElement).open)).toBe(open);
    }
  }
  await settle(page);
}

/** axe with the disclosures closed and again open. */
async function axeBoth(page: Page, testInfo: TestInfo, state: string): Promise<void> {
  await disclosures(page, false);
  await axe(page, testInfo, `${state}, disclosures closed`);
  await disclosures(page, true);
  await axe(page, testInfo, `${state}, disclosures open`);
}

// --------------------------------------------------------------------
// axe (§7.5, Accessibility engine)
// --------------------------------------------------------------------

test('axe: the loaded state, again with the logarithmic scale', async ({ page }, testInfo) => {
  await gotoScenario(page);
  await axeBoth(page, testInfo, 'the loaded state');
  await page.locator('#gre-dzw-log').check();
  await settle(page);
  await axeBoth(page, testInfo, 'the loaded state with the logarithmic scale');
});

test('axe: the warning (GS-2), suppression (GS-5), and empty (GS-4) states', async ({ page }, testInfo) => {
  await gotoScenario(page);
  for (const id of ['GS-2', 'GS-5', 'GS-4']) {
    await applyGolden(page, id);
    await axeBoth(page, testInfo, id);
  }
});

test('axe: the failure states', async ({ page, browser }, testInfo) => {
  // Invalid input.
  await gotoScenario(page);
  await page.locator('#gre-slip-max').fill('abc');
  await page.locator('#gre-slip-max').press('Enter');
  await expect(page.locator('#gre-slip-max')).toHaveAttribute('aria-invalid', 'true');
  await axeBoth(page, testInfo, 'a rejected entry');
  // Internal failure: the unavailable state.
  const unavailable = await (await browser.newContext({ baseURL: BASE_URL })).newPage();
  const net = await new Net(unavailable).install();
  net.abort(manifest().files.scenario_artifact);
  await unavailable.goto('scenario/');
  await mounted(unavailable);
  await expect(unavailable.locator('#gre-panels')).toBeHidden();
  await axe(unavailable, testInfo, 'the unavailable state');
  // Unavailable capabilities.
  const capability = await (await browser.newContext({ baseURL: BASE_URL })).newPage();
  await capability.addInitScript(() => {
    delete (window as unknown as { DecompressionStream?: unknown }).DecompressionStream;
  });
  await capability.goto('scenario/');
  await expect(capability.locator('#gre-root > p[role="alert"]')).toHaveCount(1, { timeout: 30_000 });
  await axe(capability, testInfo, 'the capability notice');
  // A recovery decision.
  const decision = await (await browser.newContext({ baseURL: BASE_URL })).newPage();
  await seedRecovery(decision, recoveryRecord({ ...gs('GS-0').inputs, fault_dip: [99] }));
  await gotoScenario(decision);
  await expect(decision.locator('#gre-recovery dl')).toHaveCount(1);
  await axe(decision, testInfo, 'the incompatible-settings decision');
  for (const p of [unavailable, capability, decision]) await p.context().close();
});

// --------------------------------------------------------------------
// DD-9: chart text alternatives (§5.11)
// --------------------------------------------------------------------

/** The panel head's valid count, as displayed. */
const headN = async (page: Page, m: Measurement): Promise<string> =>
  /^N = ([\d,]+) valid measurements$/.exec((await page.locator(`#gre-${m} .gre-n`).innerText()).trim())![1];

async function expectChartAlternatives(page: Page, m: Measurement, view: 'histogram' | 'cumulative'): Promise<void> {
  const svg = page.locator(`#gre-${m} .gre-chart figure > svg`);
  await expect(svg).toHaveRole('img');
  const N = await headN(page, m);
  const label = measurementLabel(m);
  const name =
    view === 'histogram'
      ? fillCopy('ddd5.11.histogramLabel', { label, N }) + copyText('ddd5.11.stackedByType')
      : fillCopy('ddd5.11.cumulativeLabel', { label, N });
  await expect(svg).toHaveAccessibleName(name);
  const caption = (await page.locator(`#gre-${m}-cap`).innerText()).replace(/\s+/g, ' ').trim();
  await expect(svg).toHaveAccessibleDescription(caption);
  const accuracy = copyText('pdd4.1.cumulativeAccuracy');
  if (view === 'cumulative') expect(caption).toContain(accuracy);
  else expect(caption).not.toContain(accuracy);
  const details = await svg.getAttribute('aria-details');
  expect(details).toBe(`gre-${m}-data`);
  await expect(page.locator(`details#${details}`)).toHaveCount(1);
}

/** The bin table's header row and body rows (row header, group cells, total). */
async function binTable(page: Page, m: Measurement): Promise<{ header: string[]; rows: { th: string; cells: number[]; total: number }[] }> {
  return page.locator(`#gre-${m}-bins`).evaluate((table) => {
    const n = (t: string | null) => Number((t ?? '').replace(/,/g, ''));
    const header = Array.from(table.querySelectorAll('thead th')).map((th) => th.textContent ?? '');
    const rows = Array.from(table.querySelectorAll('tbody tr')).map((tr) => {
      const tds = Array.from(tr.querySelectorAll('td')).map((td) => n(td.textContent));
      return { th: tr.querySelector('th')?.textContent ?? '', cells: tds.slice(0, -1), total: tds[tds.length - 1] };
    });
    return { header, rows };
  });
}

/** The drawn bar segments, grouped per bar in drawing order: each segment's (group, count) from its <title>. */
async function barSegments(page: Page, m: Measurement): Promise<{ group: string; count: number }[][]> {
  return page.locator(`#gre-${m} .gre-chart svg [data-layer="bars"]`).evaluate((g) => {
    const bars: { x: string; segs: { group: string; count: number }[] }[] = [];
    for (const rect of Array.from(g.querySelectorAll('rect'))) {
      const title = rect.querySelector('title')?.textContent ?? '';
      const match = /^(.*): ([\d,]+) of [\d,]+ \(.*\)$/.exec(title)!;
      const seg = { group: match[1], count: Number(match[2].replace(/,/g, '')) };
      const x = rect.getAttribute('x') ?? '';
      const last = bars[bars.length - 1];
      if (last !== undefined && last.x === x) last.segs.push(seg);
      else bars.push({ x, segs: [seg] });
    }
    return bars.map((b) => b.segs);
  });
}

async function expectBinTable(page: Page, m: Measurement, groupCount: number): Promise<void> {
  const { header, rows } = await binTable(page, m);
  const legend = await page.locator(`#gre-${m} .gre-legend-types li`).allInnerTexts();
  expect(header).toEqual([measurementLabel(m), ...legend.map((t) => t.trim()), copyText('ddd5.11.binTableTotal')]);
  expect(legend).toHaveLength(groupCount);
  let sum = 0;
  for (const row of rows) {
    expect(row.cells.reduce((a, b) => a + b, 0)).toBe(row.total);
    sum += row.total;
  }
  expect(formatCount(sum)).toBe(await headN(page, m));
  const bars = await barSegments(page, m);
  const nonzero = rows.filter((r) => r.total > 0);
  expect(bars).toHaveLength(nonzero.length);
  nonzero.forEach((row, i) => {
    const cells = row.cells.map((count, g) => ({ group: header[g + 1], count })).filter((c) => c.count !== 0);
    expect(bars[i], `${m} bar ${i}`).toEqual(cells);
  });
}

test('DD-9 on GS-1 and GS-2: role, name, description, aria-details, and the bin tables against the drawn bars', async ({ page }) => {
  await gotoScenario(page);
  for (const id of ['GS-1', 'GS-2']) {
    if (id === 'GS-2') await page.locator('#gre-reset').click();
    await applyGolden(page, id);
    for (const m of MEASUREMENTS) {
      await page.locator(`input[name="gre-${m}-view"][value="histogram"]`).check();
      await settle(page);
      await expectChartAlternatives(page, m, 'histogram');
      await page.locator(`input[name="gre-${m}-view"][value="cumulative"]`).check();
      await settle(page);
      await expectChartAlternatives(page, m, 'cumulative');
      await page.locator(`input[name="gre-${m}-view"][value="histogram"]`).check();
      await settle(page);
    }
    await disclosures(page, true);
    for (const m of MEASUREMENTS) await expectBinTable(page, m, 6);
    // The family toggle: three group columns, Totals unchanged.
    const totals = await Promise.all(MEASUREMENTS.map(async (m) => (await binTable(page, m)).rows.map((r) => r.total)));
    await page.locator('#gre-family-view').check();
    await settle(page);
    for (const [i, m] of MEASUREMENTS.entries()) {
      await expectBinTable(page, m, 3);
      expect((await binTable(page, m)).rows.map((r) => r.total)).toEqual(totals[i]);
    }
    await page.locator('#gre-family-view').uncheck();
    // The overlay on: the field table has one row per tick drawn.
    await page.locator('#gre-overlay').check();
    for (const m of ['scarp_height', 'dzw'] as const) {
      const ticks = page.locator(`#gre-${m} .gre-chart svg [data-layer="field"] line`);
      await expect(ticks).not.toHaveCount(0, { timeout: 30_000 });
      await expect(page.locator(`#gre-${m}-field tbody tr`)).toHaveCount(await ticks.count());
    }
    await page.locator('#gre-overlay').uncheck();
    await disclosures(page, false);
  }
});

test('GS-5: a suppressed chart shows no figure and no disclosure, and keeps its statistics table', async ({ page }) => {
  await gotoScenario(page);
  await applyGolden(page, 'GS-5');
  for (const m of MEASUREMENTS) {
    await expect(page.locator(`#gre-${m} .gre-chart figure`)).toHaveCount(0);
    await expect(page.locator(`#gre-${m}-data`)).toHaveCount(0);
    await expect(page.locator(`#gre-${m} .gre-table table`)).toHaveCount(1);
  }
});

test('read-off: 95 then Tab describes the input with its output, announced exactly once', async ({ page }) => {
  await installRecorder(page);
  await gotoScenario(page);
  await page.locator('input[name="gre-scarp_height-view"][value="cumulative"]').check();
  const input = page.locator('#gre-scarp_height-pct');
  await expect(input).toBeVisible();
  await settle(page);
  await clearRecorded(page);
  await input.fill('95');
  await page.keyboard.press('Tab');
  // The description Chromium's accessibility tree gives the input (its aria-describedby names the read-off <output>).
  await expect.poll(() => chromiumDescription(page, '#gre-scarp_height-pct')).toMatch(/^Percentile 95: /);
  await expect(page.locator('#gre-scarp_height-pct')).toHaveAttribute('aria-describedby', 'gre-scarp_height-pct-out');
  await settle(page);
  await oneZeroTimer(page);
  const writes = await recorded(page, 'status');
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatch(/^Percentile 95: /);
});

test('rapid changes: the superseded first change announces and marks nothing', async ({ page }) => {
  await gotoScenario(page);
  await settle(page);
  const gs0 = gs('GS-0');
  const texts = await page.evaluate(
    () =>
      new Promise<string[]>((done) => {
        performance.clearMarks();
        const status = document.querySelector('#gre-root > [role=status]')!;
        const seen: string[] = [];
        new MutationObserver(() => {
          const t = status.textContent ?? '';
          if (t !== '') {
            seen.push(t);
            setTimeout(() => done(seen), 200);
          }
        }).observe(status, { childList: true, characterData: true, subtree: true });
        (document.querySelector('input[name="gre-population"][value="one_state_per_trial"]') as HTMLInputElement).click();
        requestAnimationFrame(() => {
          (document.querySelector('input[name="gre-population"][value="all_stages"]') as HTMLInputElement).click();
        });
      }),
  );
  expect(texts).toEqual([fillCopy('ddd5.11.resultsUpdated', { matching: formatCount(gs0.counts.matching_records) })]);
  const marks = await page.evaluate(() => ({
    updated: performance.getEntriesByName('egr:results-updated').map((e) => (e as PerformanceMark).detail as { seq: number }),
    accepted: performance.getEntriesByName('egr:change-accepted').map((e) => (e as PerformanceMark).detail as { seq: number }),
  }));
  expect(marks.accepted).toHaveLength(2);
  expect(marks.updated).toHaveLength(1);
  expect(marks.updated[0].seq).toBe(Math.max(...marks.accepted.map((a) => a.seq)));
});

// --------------------------------------------------------------------
// Transient announcement guards (§7.5)
// --------------------------------------------------------------------

/** One evaluate: arm the wrapper for one commit, set the field's value, dispatch its `change`, disarm. */
async function heldCommit(page: Page, selector: string, value: string): Promise<void> {
  await page.evaluate(
    ([sel, v]) => {
      const timers = window.__greTimers as unknown as { armCommit(): void; disarm(): void };
      timers.armCommit();
      const field = document.querySelector(sel) as HTMLInputElement;
      field.value = v;
      field.dispatchEvent(new Event('change', { bubbles: true }));
      timers.disarm();
    },
    [selector, value] as [string, string],
  );
  expect(await isHeld(page)).toBe(true);
}

/** A plain commit through the same `change` event. */
async function commit(page: Page, selector: string, value: string): Promise<void> {
  await page.evaluate(
    ([sel, v]) => {
      const field = document.querySelector(sel) as HTMLInputElement;
      field.value = v;
      field.dispatchEvent(new Event('change', { bubbles: true }));
    },
    [selector, value] as [string, string],
  );
}

test.describe('transient announcement guards', () => {
  test.beforeEach(async ({ page }) => {
    await installRecorder(page);
    await installTimerWrapper(page, false);
    await gotoScenario(page);
    await settle(page);
    await clearRecorded(page);
  });

  test('disposal: a held rejection, then leaving, writes nothing', async ({ page }) => {
    await heldCommit(page, '#gre-slip-max', 'abc');
    await leaveToGlossary(page);
    await releaseHeld(page);
    await oneZeroTimer(page);
    expect(await recordedEntries(page)).toEqual([]);
  });

  test('disposal: a held read-off, then leaving, writes nothing', async ({ page }) => {
    await page.locator('input[name="gre-scarp_height-view"][value="cumulative"]').check();
    await expect(page.locator('#gre-scarp_height-pct')).toBeVisible();
    await settle(page);
    await clearRecorded(page);
    await heldCommit(page, '#gre-scarp_height-pct', '95');
    await leaveToGlossary(page);
    await releaseHeld(page);
    await oneZeroTimer(page);
    expect(await recordedEntries(page)).toEqual([]);
  });

  test('correction: a held rejection superseded by an accepted commit is never written', async ({ page }) => {
    await heldCommit(page, '#gre-slip-max', 'abc');
    await commit(page, '#gre-slip-max', '3');
    await expect(page.locator('#gre-summary')).toContainText(' · slip 0–3 m · ');
    await releaseHeld(page);
    await settle(page);
    await oneZeroTimer(page);
    const writes = await recorded(page, 'status');
    expect(writes).not.toContain(fillCopy('ddd5.7.slipRejection', { max: String(manifest().slip_window_bounds.max) }));
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatch(/^Results updated: /);
  });

  test('correction: a held read-off of 95 superseded by 50 is never written; 50 is written once', async ({ page }) => {
    await page.locator('input[name="gre-scarp_height-view"][value="cumulative"]').check();
    await expect(page.locator('#gre-scarp_height-pct')).toBeVisible();
    await settle(page);
    await clearRecorded(page);
    await heldCommit(page, '#gre-scarp_height-pct', '95');
    await commit(page, '#gre-scarp_height-pct', '50');
    await releaseHeld(page);
    await settle(page);
    await oneZeroTimer(page);
    const writes = await recorded(page, 'status');
    expect(writes.filter((t) => t.startsWith('Percentile 95: '))).toEqual([]);
    expect(writes.filter((t) => t.startsWith('Percentile 50: '))).toHaveLength(1);
  });

  test('reset: a held rejection, then Reset, is never written', async ({ page }) => {
    await heldCommit(page, '#gre-slip-max', 'abc');
    await page.locator('#gre-reset').click();
    await releaseHeld(page);
    await settle(page);
    await oneZeroTimer(page);
    expect(await recorded(page, 'status')).not.toContain(fillCopy('ddd5.7.slipRejection', { max: String(manifest().slip_window_bounds.max) }));
  });
});

// --------------------------------------------------------------------
// Startup announcement ordering (§7.5)
// --------------------------------------------------------------------

const loadingWrites = async (page: Page): Promise<number> => (await recorded(page, 'status')).filter((t) => t === LOADING).length;

test.describe('startup announcement ordering', () => {
  test.afterEach(async ({ page }) => {
    // Restore the wrappers after each case.
    await page.evaluate(() => window.__greTimers?.restore()).catch(() => undefined);
  });

  test('cached success: the held startup write is never made after the result commit', async ({ page }) => {
    await installRecorder(page);
    await installTimerWrapper(page, false);
    await gotoScenario(page);
    await leaveToGlossary(page);
    await page.evaluate(() => window.__greTimers!.arm());
    await clearRecorded(page);
    await backToScenario(page);
    expect(await isHeld(page)).toBe(true);
    await releaseHeld(page);
    await oneZeroTimer(page);
    expect(await loadingWrites(page)).toBe(0);
  });

  test('immediate failure: no loading write, the alert keeps the missing-information notice', async ({ page }) => {
    await installRecorder(page);
    await installTimerWrapper(page, true);
    const net = await new Net(page).install();
    net.html = withAppAttribute('data-manifest', null);
    await page.goto('scenario/');
    await mounted(page);
    const notice = fillCopy('ddd5.10.unavailableNotice', { reason: copyText('ddd5.10.reasonMissingAttribute') });
    await expect(page.locator('#gre-state')).toHaveText(notice);
    expect(await isHeld(page)).toBe(true);
    await releaseHeld(page);
    await oneZeroTimer(page);
    expect(await loadingWrites(page)).toBe(0);
    await expect(page.locator('#gre-root > [role=alert]')).toHaveText(notice);
  });

  test('recovery decision after the load: no loading write; Start a new scenario writes none through the default result', async ({ page }) => {
    await installRecorder(page);
    await installTimerWrapper(page, true);
    await seedRecovery(page, recoveryRecord({ ...gs('GS-0').inputs, fault_dip: [99] }));
    await page.goto('scenario/');
    await mounted(page);
    const message = fillCopy('ddd5.10.recoveryIncompatible', { current: V() });
    await expect(page.locator('#gre-state')).toHaveText(message);
    expect(await releaseHeld(page)).toBe(true);
    await oneZeroTimer(page);
    expect(await loadingWrites(page)).toBe(0);
    await page.locator('#gre-recovery button[data-gre-action="start-new"]').click();
    await expect(page.locator('#gre-panels')).toBeVisible();
    await settle(page);
    await oneZeroTimer(page);
    expect(await loadingWrites(page)).toBe(0);
    expect((await recorded(page, 'alert')).filter((t) => t === message)).toHaveLength(1);
  });

  test('recovery decision before the first await: the resumption waiting for its load writes once', async ({ page }) => {
    await installRecorder(page);
    await installTimerWrapper(page, true);
    await seedRecovery(page, '{bad');
    const net = await new Net(page).install();
    const held = net.hold(manifest().files.scenario_artifact);
    await page.goto('scenario/');
    await mounted(page);
    const message = copyText('ddd5.10.recoveryInvalidRecord');
    await expect(page.locator('#gre-state')).toHaveText(message);
    expect(await releaseHeld(page)).toBe(true);
    await oneZeroTimer(page);
    expect(await loadingWrites(page)).toBe(0);
    await page.locator('#gre-recovery button[data-gre-action="start-new"]').click();
    await held.arrived;
    await expect.poll(() => loadingWrites(page)).toBe(1);
    held.release();
    await expect(page.locator('#gre-panels')).toBeVisible();
    await settle(page);
    await oneZeroTimer(page);
    await expect(page.locator('#gre-root > [role=status]')).toHaveText('');
    expect(await loadingWrites(page)).toBe(1);
    expect((await recorded(page, 'alert')).filter((t) => t === message)).toHaveLength(1);
  });

  test('navigation away: no write on the detached region; the re-entered mount writes once to its own', async ({ page }) => {
    await installRecorder(page);
    await installTimerWrapper(page, true);
    const net = await new Net(page).install();
    const held = net.hold(manifest().files.scenario_artifact);
    await page.goto('scenario/');
    await held.arrived;
    await page.locator('#gre-root > [role=status]').waitFor({ state: 'attached' });
    expect(await isHeld(page)).toBe(true);
    await leaveToGlossary(page);
    await releaseHeld(page);
    await oneZeroTimer(page);
    expect(await loadingWrites(page)).toBe(0);
    await page.evaluate(() => window.__greTimers!.arm());
    await backToScenario(page, 'none');
    await page.locator('#gre-root > [role=status]').waitFor({ state: 'attached' });
    expect(await page.evaluate(() => [document.querySelectorAll('#gre-root > [role=status]').length, document.querySelectorAll('#gre-root > [role=alert]').length])).toEqual([1, 1]);
    expect(await isHeld(page)).toBe(true);
    const own = await regionIndex(page, 'status');
    await releaseHeld(page);
    await oneZeroTimer(page);
    const entries = (await recordedEntries(page)).filter((e) => e.text === LOADING);
    expect(entries).toHaveLength(1);
    expect(entries[0].region).toBe(own);
    held.release();
    await mounted(page);
    await settle(page);
    await oneZeroTimer(page);
    await expect(page.locator('#gre-root > [role=status]')).toHaveText('');
    expect(await loadingWrites(page)).toBe(1);
  });

  test('slow startup: one loading write, cleared by the first result', async ({ page }) => {
    await installRecorder(page);
    await installTimerWrapper(page, true);
    const net = await new Net(page).install();
    const held = net.hold(manifest().files.scenario_artifact);
    await page.goto('scenario/');
    await held.arrived;
    await expect.poll(() => isHeld(page)).toBe(true);
    await releaseHeld(page);
    await oneZeroTimer(page);
    expect(await loadingWrites(page)).toBe(1);
    held.release();
    await mounted(page);
    await settle(page);
    await oneZeroTimer(page);
    await expect(page.locator('#gre-root > [role=status]')).toHaveText('');
    expect(await loadingWrites(page)).toBe(1);
  });

  test('slow startup, restored offset with the overlay on: one loading write until the result, then only the restoration message', async ({ page }) => {
    await installRecorder(page);
    await installTimerWrapper(page, true);
    await seedRecovery(page, recoveryRecord(gs('GS-1').inputs, { overlay: true }));
    const net = await new Net(page).install();
    const regression = net.hold(manifest().files.regression_export);
    const field = net.hold(manifest().files.field_export);
    await page.goto('scenario/');
    await regression.arrived;
    expect(await isHeld(page)).toBe(true);
    await releaseHeld(page);
    await oneZeroTimer(page);
    expect(await loadingWrites(page)).toBe(1);
    await expect(page.locator('#gre-root > [role=status]')).toHaveText(LOADING);
    await clearRecorded(page);
    regression.release();
    await mounted(page);
    await field.arrived;
    await settle(page);
    await oneZeroTimer(page);
    const restored = fillCopy('ddd5.10.recoveryRestored', { current: V() });
    expect(await recorded(page, 'status')).toEqual([restored]);
    field.release();
    await expect(page.locator('#gre-scarp_height .gre-chart svg [data-layer="field"] line')).not.toHaveCount(0, { timeout: 30_000 });
    await settle(page);
    await oneZeroTimer(page);
    expect(await recorded(page, 'status')).toEqual([restored]);
  });
});

// --------------------------------------------------------------------
// Reload recovery accessibility (§7.5, desktop)
// --------------------------------------------------------------------

/** Seeds a valid record whose first removal throws: the blocked decision at startup. */
async function blocked(page: Page, inputs = gs('GS-7').inputs): Promise<void> {
  await seedRecovery(page, recoveryRecord(inputs));
  await page.addInitScript((key: string) => {
    let failed = false;
    const remove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (this: Storage, k: string) {
      if (k === key && !failed) {
        failed = true;
        throw new DOMException('denied', 'SecurityError');
      }
      return remove.call(this, k);
    };
  }, RECOVERY_KEY);
}

test.describe('reload recovery accessibility', () => {
  test('initial blocked recovery focuses #gre-state, its message visible and announced once', async ({ page }) => {
    await installRecorder(page);
    await blocked(page);
    await gotoScenario(page);
    const message = copyText('ddd5.10.recoveryClearFailed');
    await expect(page.locator('#gre-state')).toHaveText(message);
    await expect(page.locator('#gre-state')).toBeVisible();
    await expect(page.locator('#gre-state')).toBeFocused();
    await settle(page);
    expect((await recorded(page, 'alert')).filter((t) => t === message)).toHaveLength(1);
  });

  test('initial blocked recovery under the fragment exception: no focus move, the fragment target in view', async ({ page }) => {
    await blocked(page);
    await gotoScenario(page, '#gre-disclaimer');
    await expect(page.locator('#gre-state')).toHaveText(copyText('ddd5.10.recoveryClearFailed'));
    await expect(page.locator('#gre-state')).not.toBeFocused();
    await expect(page.locator('#gre-disclaimer')).toBeInViewport();
  });

  test('keyboard Retry recovery focuses the selected panel without scrolling; the restoration visible and announced', async ({ page }) => {
    await installRecorder(page);
    await blocked(page);
    await gotoScenario(page);
    const retry = page.locator('#gre-recovery button[data-gre-action="retry-recovery"]');
    await retry.focus();
    const y = await page.evaluate(() => window.scrollY);
    await page.keyboard.press('Enter');
    await expect(page.locator('#gre-panels')).toBeVisible();
    await expect(page.locator('#gre-scarp_height')).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(y);
    const message = fillCopy('ddd5.10.recoveryRestored', { current: V() });
    await expect(page.locator('#gre-recovery .gre-recovery-messages')).toBeVisible();
    await expect(page.locator('#gre-recovery .gre-recovery-messages > p')).toHaveText([message]);
    await settle(page);
    await oneZeroTimer(page);
    expect((await recorded(page, 'status')).filter((t) => t === message)).toHaveLength(1);
  });

  test('keyboard Start a new scenario focuses the selected panel without scrolling', async ({ page }) => {
    await blocked(page);
    await gotoScenario(page);
    const start = page.locator('#gre-recovery button[data-gre-action="start-new"]');
    await start.focus();
    const y = await page.evaluate(() => window.scrollY);
    await page.keyboard.press('Space');
    await expect(page.locator('#gre-panels')).toBeVisible();
    await expect(page.locator('#gre-scarp_height')).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(y);
  });

  test('a retried restoration with an empty result focuses #gre-state without scrolling', async ({ page }) => {
    await blocked(page, gs('GS-4').inputs);
    await gotoScenario(page);
    const retry = page.locator('#gre-recovery button[data-gre-action="retry-recovery"]');
    await retry.focus();
    const y = await page.evaluate(() => window.scrollY);
    await page.keyboard.press('Enter');
    await expect(page.locator('#gre-state > p').first()).toHaveText(copyText('pdd5.8.emptyExplainer'));
    await expect(page.locator('#gre-state')).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(y);
  });

  test('a storage write error keeps focus on the action, its message visible and announced', async ({ page }) => {
    await installRecorder(page);
    const net = await new Net(page).install();
    await page.addInitScript((key: string) => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (this: Storage, k: string, v: string) {
        if (k === key) throw new DOMException('full', 'QuotaExceededError');
        return set.call(this, k, v);
      };
    }, RECOVERY_KEY);
    await gotoScenario(page);
    net.fail404(manifest().files.field_export, 1);
    await page.locator('#gre-overlay').check();
    const button = page.locator('#gre-recovery button[data-gre-action="reload-restore"]');
    await expect(button).toHaveCount(1, { timeout: 30_000 });
    await button.focus();
    await page.keyboard.press('Enter');
    const message = copyText('ddd5.10.recoverySaveFailed');
    await expect(page.locator('#gre-recovery .gre-recovery-messages')).toContainText(message);
    await expect(page.locator('#gre-recovery .gre-recovery-messages')).toBeVisible();
    await expect(button).toBeFocused();
    await settle(page);
    await oneZeroTimer(page);
    expect((await recorded(page, 'alert')).filter((t) => t === message)).toHaveLength(1);
  });
});
