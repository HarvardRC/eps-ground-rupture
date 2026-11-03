// consistency.spec.ts (docs/app/ddd.md §7.5 inventory): "scenario
// summaries, charts, tables, and downloads describe the same active
// scenario" (HLDD §9) — SC-2's reviewer path.

import { expect, test, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { copyText } from '../../src/views/copy';
import { fillCopy, measurementLabel } from '../../src/views/chart-text';
import {
  MEASUREMENTS,
  WEBAPP_DIR,
  applyGolden,
  captureDownload,
  gotoScenario,
  provenanceBlock,
  scenarioJson,
  type Measurement,
} from '../support';

test.describe.configure({ timeout: 180_000 });

/** RFC 4180 rows of a CSV text with LF line ends. */
function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const STAT_ROWS: readonly (readonly [string, string])[] = [
  ['ddd5.8.rowMedian', 'median'],
  ['ddd5.8.rowP16', 'p16'],
  ['ddd5.8.rowP84', 'p84'],
  ['ddd5.8.rowMinimum', 'min'],
  ['ddd5.8.rowMaximum', 'max'],
  ['ddd5.8.rowMean', 'mean'],
  ['ddd5.8.rowStandardDeviation', 'sd'],
];

async function statsTable(page: Page, m: Measurement): Promise<Map<string, string>> {
  const rows = await page.locator(`#gre-${m} .gre-table tbody tr`).evaluateAll((trs) =>
    trs.map((tr) => [tr.querySelector('th')!.textContent ?? '', tr.querySelector('td')!.textContent ?? ''] as [string, string]),
  );
  return new Map(rows);
}

test('GS-1: the summary, chart labels, tables, footer, and the downloaded package describe one scenario', async ({ page }, testInfo) => {
  await gotoScenario(page);
  const ref = await applyGolden(page, 'GS-1');
  const summary = await page.locator('#gre-summary').innerText();
  const footer = (await page.locator('#gre-versions').innerText()).trim();
  const tables = new Map<Measurement, Map<string, string>>();
  const heads = new Map<Measurement, string>();
  const labels = new Map<Measurement, string>();
  for (const m of MEASUREMENTS) {
    tables.set(m, await statsTable(page, m));
    heads.set(m, (await page.locator(`#gre-${m} .gre-n`).innerText()).trim());
    labels.set(m, (await page.locator(`#gre-${m} .gre-chart svg[role="img"]`).getAttribute('aria-label')) ?? '');
  }
  const download = await captureDownload(page, testInfo, 'gs1');

  // scenario.json: the scenario deep-equals the reference GS-1 inputs.
  const json = scenarioJson(download);
  expect(json.scenario).toEqual(ref.inputs);

  // The independent ZIP reader: four members, stored and well formed, timestamps at provenance block 8's instant.
  expect(download.instant).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  execFileSync('python3', ['-I', 'test/zipcheck.py', download.path, download.instant], { cwd: WEBAPP_DIR, stdio: 'pipe' });

  // Settings and population: provenance blocks 5 and 6 are the summary's settings and population tokens.
  const tokens = summary.split(' · ');
  const count = tokens.pop()!;
  const population = tokens.splice(5, 1)[0];
  expect(provenanceBlock(download.provenance, 'Scenario settings')).toEqual([tokens.join(' · ')]);
  expect(provenanceBlock(download.provenance, 'Population')).toEqual([population]);

  // Versions: the footer stamps, provenance blocks 3 and 4, and scenario.json name the same versions.
  const [software, data] = /^Software version (\S+) · Data-export version (\S+)$/.exec(footer)!.slice(1);
  expect(footer).toBe(fillCopy('ddd5.8.versionFooter', { software, data }));
  expect(provenanceBlock(download.provenance, 'Software version')).toEqual([software]);
  expect(provenanceBlock(download.provenance, 'Data-export version and date')[0]).toMatch(new RegExp(`^${data} \\(`));
  expect(json.software_version).toBe(software);
  expect(json.export_version).toBe(data);

  // Counts: block 7 equals the summary's count and each panel head's N; the chart labels carry the same N.
  const counts = provenanceBlock(download.provenance, 'Counts');
  expect(counts[0]).toBe(count);
  MEASUREMENTS.forEach((m, i) => {
    const n = /^N = ([\d,]+) valid measurements$/.exec(heads.get(m)!)![1];
    expect(counts[i + 1]).toBe(fillCopy('ddd5.9.countsPanelLine', { label: measurementLabel(m), N: n }));
    expect(labels.get(m)).toContain(` of ${n} valid measurements`);
  });

  // Statistics: statistics.csv holds the displayed strings and counts.
  const rows = csvRows(download.members.get('statistics.csv')!.toString('utf8'));
  const header = rows[0];
  MEASUREMENTS.forEach((m, i) => {
    const row = new Map(header.map((h, j) => [h, rows[i + 1][j]]));
    const table = tables.get(m)!;
    expect(row.get('measurement')).toBe(m);
    expect(row.get('valid')).toBe(table.get(copyText('ddd5.8.rowValidCount'))!.replace(/,/g, ''));
    expect(row.get('excluded_null')).toBe(table.get(copyText('ddd5.8.rowExcludedNullCount'))!.replace(/,/g, ''));
    for (const [key, stat] of STAT_ROWS) expect(row.get(stat), `${m} ${stat}`).toBe(table.get(copyText(key)));
  });

  // Caveats: block 9 holds the caveats the page shows (the scarp-dip notice, the low-slip caveat, the 30° line).
  const caveats = provenanceBlock(download.provenance, 'Caveats');
  expect(caveats[0]).toBe(copyText('pdd5.4.scarpDipNotice'));
  const shown = await page.locator('#gre-caveats > p').allInnerTexts();
  expect(caveats.slice(1)).toEqual(shown.slice(1));
});
