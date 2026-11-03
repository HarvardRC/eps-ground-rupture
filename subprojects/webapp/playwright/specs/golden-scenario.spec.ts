// golden-scenario.spec.ts (docs/app/ddd.md §7.5 inventory): "at least one
// golden scenario is evaluated end to end, and every displayed value
// equals the display-rounded reference result exactly" (HLDD §9). GS-1
// is replayed through the real page; every expected value is the
// reference-results file's, read from the served tree — the lane never
// rounds a result.

import { expect, test, type Page } from '@playwright/test';
import { fillCopy } from '../../src/views/chart-text';
import { copyText } from '../../src/views/copy';
import { formatCount } from '../../src/views/format';
import { MEASUREMENTS, applyGolden, countToken, gotoScenario, settle, type Measurement } from '../support';

test.describe.configure({ timeout: 180_000 });

/** The statistics-table rows of `m`'s panel: label → value. */
async function statsTable(page: Page, m: Measurement): Promise<Map<string, string>> {
  const rows = await page.locator(`#gre-${m} .gre-table tbody tr`).evaluateAll((trs) =>
    trs.map((tr) => [tr.querySelector('th')!.textContent ?? '', tr.querySelector('td')!.textContent ?? ''] as [string, string]),
  );
  return new Map(rows);
}

/** A quantity as the charts print it (§5.11): the display string, then ` m` or `°`. */
const quantity = (m: Measurement, display: string): string => (m === 'scarp_dip' ? `${display}°` : `${display} m`);

const STAT_ROWS: readonly (readonly [string, string])[] = [
  ['ddd5.8.rowMedian', 'median'],
  ['ddd5.8.rowP16', 'p16'],
  ['ddd5.8.rowP84', 'p84'],
  ['ddd5.8.rowMinimum', 'min'],
  ['ddd5.8.rowMaximum', 'max'],
  ['ddd5.8.rowMean', 'mean'],
  ['ddd5.8.rowStandardDeviation', 'sd'],
];

test('GS-1 replayed through the page: every displayed count, statistic, window, and bin equals the reference', async ({ page }) => {
  await gotoScenario(page);
  const ref = await applyGolden(page, 'GS-1');

  // Counts: the summary's matching records; per panel the head's N, the valid and excluded-null rows; the unclassified line.
  await expect(page.locator('#gre-summary')).toContainText(countToken(ref.counts.matching_records));
  for (const m of MEASUREMENTS) {
    const c = ref.counts.per_measurement[m];
    await expect(page.locator(`#gre-${m} .gre-n`)).toHaveText(fillCopy('ddd5.8.nLine', { N: formatCount(c.valid) }));
    const table = await statsTable(page, m);
    expect(table.get(copyText('ddd5.8.rowValidCount'))).toBe(formatCount(c.valid));
    expect(table.get(copyText('ddd5.8.rowExcludedNullCount'))).toBe(formatCount(c.excluded_null));
    const foot = page.locator(`#gre-${m} .gre-table tfoot`);
    if (ref.counts.unclassified > 0) {
      await expect(foot).toContainText(`${formatCount(ref.counts.unclassified)} (zero-slip initial stages)`);
    } else {
      await expect(foot).toHaveCount(0);
    }
    // Statistics: each row equals the reference display string exactly (SC-3).
    const display = ref.display[m]!;
    for (const [key, stat] of STAT_ROWS) expect(table.get(copyText(key)), `${m} ${stat}`).toBe(display[stat]);
  }

  // Converted windows: the assist panel's {lo} and {hi} per selected dip, and the {Y} of the 30° per-dip line.
  const assist = await page.locator('#gre-assist-body').innerText();
  for (const w of ref.converted_windows!) {
    expect(assist).toContain(`${w.fault_dip}°: fault slip ${w.window_lo_display}–${w.window_hi_display} m`);
  }
  const w30 = ref.converted_windows!.find((w) => w.fault_dip === 30)!;
  expect(w30.range_flag).toBe('partly_out');
  const perDip = fillCopy('pdd5.6.perDipLine', { Dip: '30', Y: w30.window_hi_display });

  // Every applicable caveat in the default view of the result (SC-5): the short disclaimer, the low-slip caveat, the 30° per-dip line, and the scarp-dip notice.
  const caveats = page.locator('#gre-caveats > p');
  await expect(caveats.nth(0)).toHaveText(copyText('pdd5.2.shortDisclaimer').replace('[Full disclaimer →]', 'Full disclaimer →'));
  await expect(caveats.nth(1)).toHaveText(copyText('pdd5.9.lowSlipCaveat'));
  await expect(caveats.nth(2)).toHaveText(perDip);
  await expect(caveats).toHaveCount(3);
  for (let i = 0; i < 3; i++) await expect(caveats.nth(i)).toBeVisible();
  await expect(page.locator('#gre-scarp_dip .gre-provisional')).toHaveText(copyText('pdd5.4.scarpDipNotice'));
  await expect(page.locator('#gre-scarp_dip .gre-provisional')).toBeVisible();

  // Bin tables: with each disclosure open, `bins` rows whose group cells equal the reference counts row by row.
  for (const m of MEASUREMENTS) {
    await page.locator(`#gre-${m}-data > summary`).click();
    await expect(page.locator(`#gre-${m}-bins`)).toHaveCount(1);
    const rows = await page.locator(`#gre-${m}-bins tbody tr`).evaluateAll((trs) =>
      trs.map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.textContent ?? '')),
    );
    const h = ref.histogram[m]!;
    expect(rows).toHaveLength(h.bins);
    rows.forEach((cells, i) => {
      const groups = cells.slice(0, -1);
      expect(groups, `${m} bin ${i}`).toEqual(h.counts[i].map(formatCount));
    });
  }

  // Pre-marks: in cumulative view the median and 84th-percentile labels carry the reference display strings.
  for (const m of MEASUREMENTS) {
    await page.locator(`input[name="gre-${m}-view"][value="cumulative"]`).check();
    await settle(page);
    const texts = await page.locator(`#gre-${m} .gre-chart svg text`).allTextContents();
    const display = ref.display[m]!;
    expect(texts, `${m} median pre-mark`).toContain(fillCopy('ddd5.12.medianMark', { value: quantity(m, display.median) }));
    expect(texts, `${m} 84th-percentile pre-mark`).toContain(fillCopy('ddd5.12.p84Mark', { value: quantity(m, display.p84) }));
  }
});
