// interactions.spec.ts (docs/app/ddd.md §7.5 inventory): "the scripted
// interactions of the DDD's test inventory each produce the response the
// PDD defines for them — scenario changes, offset-mode entry and its
// flags, notices, and downloads" (HLDD §9).

import { expect, test, type Page } from '@playwright/test';
import { fillCopy, measurementLabel } from '../../src/views/chart-text';
import { copyText } from '../../src/views/copy';
import { formatCount } from '../../src/views/format';
import {
  MEASUREMENTS,
  applyGolden,
  captureDownload,
  checkbox,
  countToken,
  expectCount,
  gotoScenario,
  gs,
  manifest,
  provenanceBlock,
  settle,
  type Measurement,
} from '../support';

test.describe.configure({ timeout: 180_000 });

const summary = (page: Page) => page.locator('#gre-summary');

/** The result notices a panel shows: its `.gre-notice` slot's text and the notice standing in for a suppressed chart. */
async function panelNotices(page: Page, m: Measurement): Promise<string[]> {
  return page.locator(`#gre-${m}`).evaluate((panel) => {
    const out: string[] = [];
    const notice = panel.querySelector('.gre-notice');
    if (notice !== null && (notice.textContent ?? '').trim() !== '') out.push((notice.textContent ?? '').trim());
    const chart = panel.querySelector('.gre-chart');
    if (chart !== null && chart.querySelector('figure') === null && (chart.textContent ?? '').trim() !== '') out.push((chart.textContent ?? '').trim());
    return out;
  });
}

const lowerLabel = (m: Measurement): string => measurementLabel(m).replace(/ \([^)]*\)$/, '').toLowerCase();

test('every scenario control changes the summary and results through one accepted change', async ({ page }) => {
  await gotoScenario(page);
  const m = manifest();
  const total = gs('GS-0').counts.matching_records;
  await expect(summary(page)).toContainText(countToken(total));
  // Dips: uncheck all but 30° and 40° (PDD §3: "Dip 30° or 40°").
  for (const d of m.trial_columns.fault_dip) if (d !== 30 && d !== 40) await checkbox(page, 'fieldset.gre-dip', `${d}°`).uncheck();
  await expect(summary(page)).toContainText(/^Dip 30° or 40° · /);
  // Sediment: Strong in the uniform arm only, and Weak in the layered arm only.
  for (const [i, set] of [[0, 'Homogeneous'], [1, 'Heterogeneous']] as const) {
    const keep = set === 'Homogeneous' ? 'Strong' : 'Weak';
    for (const p of m.arm_strength_states.filter((s) => s.set === set)) {
      if (p.sediment_strength !== keep) await page.locator(`fieldset.gre-arm >> nth=${i}`).getByRole('checkbox', { name: p.sediment_strength.replace('Strong-Weak', 'Strong–Weak'), exact: true }).uncheck();
    }
  }
  await expect(summary(page)).toContainText(' · Weak (layered) or Strong (uniform) · ');
  // Depth and density.
  await checkbox(page, 'fieldset.gre-depth', '3 m').uncheck();
  await expect(summary(page)).toContainText(' · depth 5 or 10 m · ');
  await checkbox(page, 'fieldset.gre-density', 'Loose').uncheck();
  await expect(summary(page)).toContainText(' · density Dense or Medium · ');
  // Population (PDD §3.7).
  await page.locator('input[name="gre-population"][value="one_state_per_trial"]').check();
  await expect(summary(page)).toContainText(' · one state per simulation trial · ');
  // Scarp-type filter: fewer than six types clears and disables the family toggle, its note shown.
  await page.locator('#gre-family-view').check();
  await expect(page.locator('#gre-scarp_height .gre-chart svg[role="img"]')).toHaveAttribute('aria-label', /stacked by scarp family/);
  await checkbox(page, 'fieldset.gre-scarp-filter', 'Simple').uncheck();
  await expect(summary(page)).toContainText(' · scarp type Monoclinal or Monoclinal Collapse or Pressure Ridge or Pressure Ridge Collapse or Simple Collapse · ');
  await expect(page.locator('#gre-family-view')).toBeDisabled();
  await expect(page.locator('#gre-family-view')).not.toBeChecked();
  await expect(page.locator('#gre-family-note')).toBeVisible();
  await expect(page.locator('#gre-family-note')).toHaveText(copyText('pdd3.7.familyNote'));
  await checkbox(page, 'fieldset.gre-scarp-filter', 'Simple').check();
  await expect(page.locator('#gre-family-view')).toBeEnabled();
  await expect(page.locator('#gre-family-note')).toBeHidden();
  // Reset restores the default scenario (FR-S8) and sets family view off.
  await page.locator('#gre-family-view').check();
  await page.locator('#gre-reset').click();
  await expectCount(page, total);
  await expect(summary(page)).toHaveText(/^Any dip · any sediment · any depth · any density · slip: any · all recorded stages · all .*scarp types.* \(no filter\) · matching records: /);
  await expect(page.locator('#gre-family-view')).not.toBeChecked();
});

test('the dip-range assist echoes the included dips before Apply, and Apply replaces the dip set', async ({ page }) => {
  await gotoScenario(page);
  const range = page.locator('#gre-dip-range');
  const echo = page.locator('#gre-dip-echo');
  const apply = page.locator('#gre-dip-apply');
  await range.fill('30–40');
  await expect(echo).toHaveText('30° and 40° only');
  await expect(apply).toBeEnabled();
  // Nothing applied before Apply: the summary still names every dip.
  await expect(summary(page)).toContainText(/^Any dip · /);
  await apply.click();
  await expect(summary(page)).toContainText(/^Dip 30° or 40° · /);
  await range.fill('41-44');
  await expect(echo).toHaveText(copyText('ddd5.7.dipEchoNone'));
  await expect(apply).toBeDisabled();
  await range.fill('steep');
  await expect(echo).toHaveText(copyText('ddd5.7.dipEchoUnreadable'));
  await expect(apply).toBeDisabled();
  // Enter in the field activates Apply.
  await range.fill('45');
  await expect(echo).toHaveText('45° only');
  await range.press('Enter');
  await expect(summary(page)).toContainText(/^Dip 45° · /);
  await page.locator('#gre-reset').click();
  await expect(echo).toHaveText('');
  await expect(summary(page)).toContainText(/^Any dip · /);
});

test('notice tiers: GS-2 warns with the chart, GS-5 suppresses it, GS-4 is empty, GS-6 has no valid measurement', async ({ page }) => {
  await gotoScenario(page);
  // GS-2: the small-result warning (N 10–29) with the chart still rendered.
  const gs2 = await applyGolden(page, 'GS-2');
  for (const m of MEASUREMENTS) {
    const n = gs2.counts.per_measurement[m].valid;
    expect(n).toBeGreaterThanOrEqual(10);
    expect(n).toBeLessThan(30);
    await expect(page.locator(`#gre-${m} .gre-notice`)).toHaveText(fillCopy('pdd5.8.smallResultWarning', { N: formatCount(n) }));
    await expect(page.locator(`#gre-${m} .gre-chart figure svg`)).toHaveCount(1);
    expect(await panelNotices(page, m)).toHaveLength(1);
  }
  await expect(page.locator('#gre-caveats > p').first()).toContainText('Research tool: simulated results');
  // GS-5: the chart suppressed (N < 10), the table kept.
  const gs5 = await applyGolden(page, 'GS-5');
  for (const m of MEASUREMENTS) {
    expect(gs5.counts.per_measurement[m].valid).toBeLessThan(10);
    await expect(page.locator(`#gre-${m} .gre-chart figure`)).toHaveCount(0);
    await expect(page.locator(`#gre-${m} .gre-chart`)).toHaveText(copyText('pdd5.8.suppressionNotice'));
    await expect(page.locator(`#gre-${m} .gre-table table`)).toHaveCount(1);
    expect(await panelNotices(page, m)).toHaveLength(1);
  }
  // GS-4: #gre-panels hidden, #gre-state holding the explainer naming both conditions, the short disclaimer kept.
  const gs4 = await applyGolden(page, 'GS-4');
  expect(gs4.diagnosed_conditions).toEqual(['sediment', 'depth']);
  await expect(page.locator('#gre-panels')).toBeHidden();
  await expect(page.locator('#gre-state > p')).toHaveText([
    copyText('pdd5.8.emptyExplainer'),
    fillCopy('pdd5.8.emptyRelaxation', { 'condition(s)': 'sediment strength and sediment depth' }),
  ]);
  await expect(page.locator('#gre-caveats > p').first()).toContainText('Research tool: simulated results');
  await expect(page.locator('#gre-caveats a[href="#gre-disclaimer"]')).toBeVisible();
  // GS-6: the no-valid-measurement notice in every panel, never the no-match diagnostic.
  await page.locator('#gre-reset').click();
  const gs6 = await applyGolden(page, 'GS-6');
  await expect(page.locator('#gre-panels')).toBeVisible();
  await expect(page.locator('#gre-state')).toHaveText('');
  for (const m of MEASUREMENTS) {
    expect(gs6.counts.per_measurement[m].valid).toBe(0);
    await expect(page.locator(`#gre-${m} .gre-chart`)).toHaveText(
      fillCopy('pdd5.8.noValidMeasurement', { X: formatCount(gs6.counts.matching_records), measurement: lowerLabel(m) }),
    );
    expect(await panelNotices(page, m)).toHaveLength(1);
  }
  // GS-6's window fires the low-slip caveat beside the notices: caveats coexist.
  await expect(page.locator('#gre-caveats > p').nth(1)).toHaveText(copyText('pdd5.9.lowSlipCaveat'));
});

test('GS-1 offset entry shows the per-dip lines: 30° partly out of range, 40° in range', async ({ page }) => {
  await gotoScenario(page);
  const gs1 = await applyGolden(page, 'GS-1');
  const windows = gs1.converted_windows!;
  const lines = await page.locator('#gre-assist-body > p').allInnerTexts();
  expect(lines[0]).toBe(fillCopy('pdd5.6.assistText', { X: '3' }));
  for (const w of windows) {
    const flag = w.range_flag === 'partly_out' ? copyText('pdd3.5.flagPartlyOutOfRange') : copyText('pdd3.5.flagInRange');
    expect(lines).toContain(fillCopy('ddd5.5.windowLine', { Dip: String(w.fault_dip), lo: w.window_lo_display, hi: w.window_hi_display, flag }));
  }
  expect(windows.map((w) => [w.fault_dip, w.range_flag])).toEqual([[30, 'partly_out'], [40, 'in_range']]);
  const w30 = windows[0];
  await expect(page.locator('#gre-caveats > p')).toHaveText([
    /^Research tool: simulated results/,
    copyText('pdd5.9.lowSlipCaveat'),
    fillCopy('pdd5.6.perDipLine', { Dip: '30', Y: w30.window_hi_display }),
  ]);
  for (const m of MEASUREMENTS) expect((await panelNotices(page, m)).length).toBeLessThanOrEqual(1);
});

test('mode switch: values never convert across modes, and a switch back judges the retained slip texts', async ({ page }) => {
  await gotoScenario(page);
  const slipMin = page.locator('#gre-slip-min');
  const slipMax = page.locator('#gre-slip-max');
  const offset = page.locator('#gre-offset-max');
  // Slip 0–3.
  await slipMin.fill('0');
  await slipMax.fill('3');
  await slipMax.press('Enter');
  await expect(summary(page)).toContainText(' · slip 0–3 m · ');
  const slipSummary = await summary(page).innerText();
  // Offset mode with a blank field: no error, summary unchanged.
  await page.locator('input[name="gre-entry-mode"][value="offset"]').check();
  await settle(page);
  await expect(offset).toBeVisible();
  await expect(offset).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#gre-offset-error')).toHaveText('');
  await expect(summary(page)).toHaveText(slipSummary);
  // 3 and Enter: the offset token and the per-dip flags.
  await offset.fill('3');
  await offset.press('Enter');
  await expect(summary(page)).toContainText(' · offset 0–3 m (converted to slip per dip) · ');
  await expect(page.locator('#gre-assist-body')).toContainText(/20°: fault slip [\d.]+–[\d.]+ m, (in-range|partly-out-of-range|out-of-range)/);
  const offsetSummary = await summary(page).innerText();
  // Slip mode again: the fields 0 and 3, the summary "slip 0–3 m".
  await page.locator('input[name="gre-entry-mode"][value="slip"]').check();
  await expect(slipMin).toHaveValue('0');
  await expect(slipMax).toHaveValue('3');
  await expect(summary(page)).toContainText(' · slip 0–3 m · ');
  // 6 and Enter in the slip maximum: rejected.
  await slipMax.fill('6');
  await slipMax.press('Enter');
  await expect(slipMax).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#gre-slip-error')).toHaveText(fillCopy('ddd5.7.slipRejection', { max: String(manifest().slip_window_bounds.max) }));
  await expect(summary(page)).toContainText(' · slip 0–3 m · ');
  // Offset mode (its retained 3 applies again), then slip mode, which rejects at the switch.
  await page.locator('input[name="gre-entry-mode"][value="offset"]').check();
  await expect(summary(page)).toHaveText(offsetSummary);
  await page.locator('input[name="gre-entry-mode"][value="slip"]').check();
  await settle(page);
  await expect(slipMin).toHaveAttribute('aria-invalid', 'true');
  await expect(slipMax).toHaveAttribute('aria-invalid', 'true');
  await expect(slipMax).toHaveValue('6');
  await expect(summary(page)).toHaveText(offsetSummary);
});

test('overlay: marks on the height and width panels, the scarp-dip note as HTML; Reset keeps the switch', async ({ page }) => {
  await gotoScenario(page);
  await page.locator('#gre-overlay').check();
  for (const m of ['scarp_height', 'dzw'] as const) {
    await expect(page.locator(`#gre-${m} .gre-chart svg [data-layer="field"] line`)).not.toHaveCount(0, { timeout: 30_000 });
  }
  await expect(page.locator('#gre-scarp_dip .gre-chart svg [data-layer="field"]')).toHaveCount(0);
  await expect(page.locator('#gre-scarp_dip .gre-legend .gre-overlay-note')).toHaveText(copyText('pdd4.4.scarpDipNote'));
  await expect(page.locator('#gre-scarp_dip .gre-legend')).toContainText('Field sources provide no comparable scarp-dip measurement.');
  expect(await page.locator('#gre-scarp_dip .gre-chart svg').textContent()).not.toContain('Field sources');
  // Reset leaves the overlay switch as it was and turns family view off.
  await page.locator('#gre-family-view').check();
  await page.locator('input[name="gre-population"][value="one_state_per_trial"]').check();
  await page.locator('#gre-reset').click();
  await expectCount(page, gs('GS-0').counts.matching_records);
  await expect(page.locator('#gre-overlay')).toBeChecked();
  await expect(page.locator('#gre-family-view')).not.toBeChecked();
  await expect(page.locator('#gre-scarp_height .gre-chart svg [data-layer="field"] line')).not.toHaveCount(0);
});

test('log scale: offered in GS-0 histogram view, the log bin table, kept by Reset, withdrawn for GS-7', async ({ page }) => {
  const gs0 = gs('GS-0');
  const gs7 = gs('GS-7');
  // Both paths run: GS-0 offers the axis, GS-7 does not.
  expect(gs0.histogram_log.dzw).not.toBeNull();
  expect(gs7.histogram_log.dzw).toBeNull();
  await gotoScenario(page);
  const log = page.locator('#gre-dzw-log');
  const logSentence = copyText('ddd5.12.logScaleNote');
  await expect(log).toBeVisible();
  await expect(page.locator('#gre-dzw .gre-info')).toContainText(logSentence);
  // Not in the cumulative view.
  await page.locator('input[name="gre-dzw-view"][value="cumulative"]').check();
  await expect(log).toBeHidden();
  await expect(page.locator('#gre-dzw .gre-info')).not.toContainText(logSentence);
  await page.locator('input[name="gre-dzw-view"][value="histogram"]').check();
  await expect(log).toBeVisible();
  // Checked: the open bin table starts with "below 0.1 m" (when its counts are not all zero), then the log counts.
  await page.locator('#gre-dzw-data > summary').click();
  await log.check();
  const h = gs0.histogram_log.dzw!;
  const expected = [
    ...(h.below_counts.some((c) => c !== 0) ? [[copyText('ddd5.12.belowLabel'), ...h.below_counts.map(formatCount)]] : []),
  ];
  await expect(page.locator('#gre-dzw .gre-chart svg[role="img"]')).toHaveAttribute('aria-label', /logarithmic value axis/);
  const rows = await page.locator('#gre-dzw-bins tbody tr').evaluateAll((trs) =>
    trs.map((tr) => [tr.querySelector('th')!.textContent ?? '', ...Array.from(tr.querySelectorAll('td')).map((td) => td.textContent ?? '')]),
  );
  if (expected.length > 0) {
    expect(rows[0].slice(0, -1)).toEqual(expected[0]);
  }
  const body = rows.slice(expected.length).map((r) => r.slice(1, -1));
  expect(body).toEqual(h.counts.map((row) => row.map(formatCount)));
  // Reset leaves it checked.
  await page.locator('#gre-reset').click();
  await expectCount(page, gs0.counts.matching_records);
  await expect(log).toBeChecked();
  // The one-state population (GS-7) hides the checkbox and the sentence and restores the linear table.
  await page.locator('input[name="gre-population"][value="one_state_per_trial"]').check();
  await expectCount(page, gs7.counts.matching_records);
  await expect(log).toBeHidden();
  await expect(page.locator('#gre-dzw .gre-info')).not.toContainText(logSentence);
  await expect(page.locator('#gre-dzw .gre-chart svg[role="img"]')).not.toHaveAttribute('aria-label', /logarithmic value axis/);
  const linear = await page.locator('#gre-dzw-bins tbody tr').evaluateAll((trs) =>
    trs.map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.textContent ?? '').slice(0, -1)),
  );
  expect(linear).toEqual(gs7.histogram.dzw!.counts.map((row) => row.map(formatCount)));
  // Reset, back to GS-0: the checkbox shows, unchecked.
  await page.locator('#gre-reset').click();
  await expectCount(page, gs0.counts.matching_records);
  await expect(log).toBeVisible();
  await expect(log).not.toBeChecked();
});

test('"Download this result" delivers a file named by the §5.9 template', async ({ page }, testInfo) => {
  await gotoScenario(page);
  const d = await captureDownload(page, testInfo);
  const date = d.instant.slice(0, 10);
  expect(d.fileName).toBe(`ground-rupture-explorer_all_all-stages_${manifest().export_version}_${date}.zip`);
  expect(provenanceBlock(d.provenance, 'Population')).toEqual(['all recorded stages']);
  // A changed scenario changes the slug and population tokens.
  await page.locator('input[name="gre-population"][value="one_state_per_trial"]').check();
  await checkbox(page, 'fieldset.gre-depth', '3 m').uncheck();
  await expect(summary(page)).toContainText(' · depth 5 or 10 m · ');
  await settle(page);
  const changed = await captureDownload(page, testInfo, 'changed');
  expect(changed.fileName).toBe(`ground-rupture-explorer_depth-5-10_one-state_${manifest().export_version}_${changed.instant.slice(0, 10)}.zip`);
});
