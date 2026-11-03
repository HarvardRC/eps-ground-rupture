// render.spec.ts (docs/app/ddd.md §7.5 inventory): "product pages render
// correctly, including controls, charts, tables, notices, and fallback
// content" (HLDD §9). The MVP ships one product page, the scenario page;
// the P2/P3 pages of §6.4 join this spec when they ship.

import { expect, test } from '@playwright/test';
import { fillCopy } from '../../src/views/chart-text';
import { copyText, hasCopy } from '../../src/views/copy';
import { displayRound } from '../../src/views/format';
import { sedimentLabel } from '../../src/views/scenario-controls';
import {
  BASE_URL,
  MEASUREMENTS,
  SCENARIO_URL,
  applyGolden,
  citationVersion,
  gotoScenario,
  installRecorder,
  manifest,
  pointer,
  recorded,
  settle,
} from '../support';

test.describe.configure({ timeout: 120_000 });

const ACCURACY = copyText('pdd4.1.cumulativeAccuracy');

/** The accessible names of the checkboxes in `fieldset`, in DOM order. */
async function boxNames(page: import('@playwright/test').Page, fieldset: string): Promise<string[]> {
  return page.locator(fieldset).locator(':scope > label').evaluateAll((labels) => labels.map((l) => (l.textContent ?? '').trim()));
}

test('every scenario control is present with manifest-sourced enumerations', async ({ page }) => {
  await gotoScenario(page);
  const m = manifest();
  expect(await boxNames(page, 'fieldset.gre-dip')).toEqual(m.trial_columns.fault_dip.map((d) => `${d}°`));
  for (const [i, set] of [[0, 'Homogeneous'], [1, 'Heterogeneous']] as const) {
    expect(await boxNames(page, `fieldset.gre-arm >> nth=${i}`)).toEqual(
      m.arm_strength_states.filter((p) => p.set === set).map((p) => sedimentLabel(p.sediment_strength)),
    );
  }
  expect(await boxNames(page, 'fieldset.gre-depth')).toEqual(m.trial_columns.depth.map((d) => `${d} m`));
  expect(await boxNames(page, 'fieldset.gre-density')).toEqual([...m.trial_columns.density]);
  expect(await boxNames(page, 'fieldset.gre-scarp-filter')).toEqual([...m.scarp_classes]);
  // Every manifest-sourced default: all selected.
  for (const fs of ['fieldset.gre-dip', 'fieldset.gre-arm', 'fieldset.gre-depth', 'fieldset.gre-density', 'fieldset.gre-scarp-filter']) {
    const states = await page.locator(`${fs} > label > input[type=checkbox]`).evaluateAll((els) => els.map((e) => (e as HTMLInputElement).checked));
    expect(states.length).toBeGreaterThan(0);
    expect(states.every(Boolean)).toBe(true);
  }
  await expect(page.locator('#gre-dip-range')).toBeVisible();
  await expect(page.locator('#gre-dip-apply')).toBeDisabled();
  await expect(page.locator('#gre-dip-echo')).toHaveCount(1);
  await expect(page.locator('input[name="gre-entry-mode"]')).toHaveCount(2);
  await expect(page.locator('input[name="gre-entry-mode"][value="slip"]')).toBeChecked();
  await expect(page.locator('#gre-slip-min')).toBeVisible();
  await expect(page.locator('#gre-slip-max')).toBeVisible();
  await expect(page.locator('#gre-offset-max')).toBeHidden();
  await expect(page.locator('input[name="gre-population"]')).toHaveCount(2);
  await expect(page.locator('input[name="gre-population"][value="all_stages"]')).toBeChecked();
  await expect(page.locator('details.gre-population-explainer > summary')).toHaveText(copyText('ddd5.7.populationExplainerSummary'));
  await expect(page.locator('#gre-family-view')).not.toBeChecked();
  await expect(page.locator('#gre-reset')).toHaveText(copyText('pdd3.7.resetLabel'));
  // The Advanced <details>: collapsed, holding a disabled fieldset.
  const advanced = page.locator('details.gre-advanced');
  await expect(advanced.locator('> summary')).toHaveText(copyText('pdd3.2.advanced'));
  expect(await advanced.evaluate((d) => (d as HTMLDetailsElement).open)).toBe(false);
  await expect(advanced.locator('fieldset')).toHaveCount(1);
  expect(await advanced.locator('fieldset').evaluate((f) => (f as HTMLFieldSetElement).disabled)).toBe(true);
});

test('the slip window carries the descriptive label and the manifest-generated helper line', async ({ page }) => {
  await gotoScenario(page);
  const m = manifest();
  await expect(page.locator('#gre-slip-range')).toHaveText(copyText('pdd3.4.descriptiveLabel'));
  await expect(page.locator('#gre-slip-range')).toHaveText('approximately 0–5 m');
  await expect(page.locator('#gre-slip-help')).toHaveText(
    fillCopy('ddd5.7.slipHelp', {
      min: String(m.slip_window_bounds.min),
      max: String(m.slip_window_bounds.max),
      step: displayRound(m.stage_spacing.mean, 2),
    }),
  );
});

test('the stacked panels, caveats, prototype notice, info notes, disclaimer, and footer', async ({ page }) => {
  await gotoScenario(page);
  // DD-4: three stacked panels in canonical order.
  expect(await page.locator('#gre-panels > section').evaluateAll((s) => s.map((e) => e.id))).toEqual(MEASUREMENTS.map((m) => `gre-${m}`));
  for (const m of MEASUREMENTS) {
    const panel = page.locator(`#gre-${m}`);
    await expect(panel.locator('.gre-chart figure svg[role="img"]')).toHaveCount(1);
    const details = panel.locator(`details#gre-${m}-data`);
    await expect(details).toHaveCount(1);
    expect(await details.evaluate((d) => (d as HTMLDetailsElement).open)).toBe(false);
    await expect(panel.locator('.gre-table table')).toHaveCount(1);
    await expect(panel.locator('.gre-notice')).toHaveCount(1);
  }
  await expect(page.locator('#gre-caveats')).toHaveCount(1);
  // The prototype notice: first in the results header, exactly its registry text, while copy.json holds it.
  const header = page.locator('.gre-results-header');
  if (hasCopy('ddd5.8.prototypeNotice')) {
    await expect(header.locator(':scope > :first-child')).toHaveId('gre-prototype');
    await expect(page.locator('#gre-prototype')).toHaveText(copyText('ddd5.8.prototypeNotice'));
  } else {
    await expect(page.locator('#gre-prototype')).toHaveCount(0);
  }
  // DD-5 info notes: the bin-rule sentence; on the width panel, while its log-scale checkbox shows, followed by the log-scale sentence.
  for (const m of ['scarp_height', 'scarp_dip'] as const) {
    expect(await page.locator(`#gre-${m} .gre-info > p`).allTextContents()).toEqual([copyText('ddd5.12.binRule')]);
  }
  await expect(page.locator('#gre-dzw-log')).toBeVisible();
  expect(await page.locator('#gre-dzw .gre-info > p').allTextContents()).toEqual([copyText('ddd5.12.binRule'), copyText('ddd5.12.logScaleNote')]);
  // Exactly one #gre-disclaimer, non-empty, outside #gre-root.
  await expect(page.locator('#gre-disclaimer')).toHaveCount(1);
  expect(((await page.locator('#gre-disclaimer').textContent()) ?? '').trim()).not.toBe('');
  await expect(page.locator('#gre-root #gre-disclaimer')).toHaveCount(0);
  // The footer: the committed CITATION.cff version and the pointer's export_version.
  await expect(page.locator('#gre-versions')).toHaveText(
    fillCopy('ddd5.8.versionFooter', { software: citationVersion(), data: pointer().export_version }),
  );
});

test('PDD emphasis renders as <strong>, never literal **', async ({ page }) => {
  await gotoScenario(page);
  const explainer = page.locator('details.gre-population-explainer');
  await expect(explainer.locator('strong')).not.toHaveCount(0);
  expect(await explainer.textContent()).not.toContain('**');
  await page.locator('#gre-overlay').check();
  for (const m of ['scarp_height', 'dzw'] as const) {
    const legend = page.locator(`#gre-${m} .gre-overlay-legend`);
    await expect(legend).toHaveCount(1, { timeout: 30_000 });
    await expect(legend.locator('strong')).not.toHaveCount(0);
    expect(await legend.textContent()).not.toContain('**');
  }
});

test("each first-use glossary link's target and each overlay source link's target exist in the served pages", async ({ page, request }) => {
  await gotoScenario(page);
  const glossary = await (await request.get('glossary/')).text();
  const glossaryAnchors = await page
    .locator('#gre-root a[data-focus-key^="glossary:"]')
    .evaluateAll((as) => as.map((a) => ({ path: new URL((a as HTMLAnchorElement).href).pathname, hash: new URL((a as HTMLAnchorElement).href).hash.slice(1) })));
  expect(glossaryAnchors.length).toBeGreaterThan(0);
  for (const { path, hash } of glossaryAnchors) {
    expect(path).toBe(new URL('glossary/', BASE_URL).pathname);
    expect(glossary, `glossary anchor #${hash}`).toContain(`id="${hash}"`);
  }
  // Overlay on: each source link's target anchor in the served data page.
  await page.locator('#gre-overlay').check();
  await expect(page.locator('#gre-scarp_height .gre-overlay-groups a')).not.toHaveCount(0, { timeout: 30_000 });
  const data = await (await request.get('data/')).text();
  const links = await page.locator('.gre-overlay-groups a').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
  const hashes = new Set(links.map((h) => new URL(h).hash.slice(1)));
  for (const link of links) expect(new URL(link).pathname).toBe(new URL('data/', BASE_URL).pathname);
  expect([...hashes].sort()).toEqual(['fdhi-flatfile', 'kern-county-1952', 'sure-database']);
  for (const h of hashes) expect(data, `data anchor #${h}`).toContain(`id="${h}"`);
});

test('the no-JS fallback body is inside #gre-root in the page source, its five link targets served', async ({ request }) => {
  const source = await (await request.get('scenario/')).text();
  const root = source.indexOf('<div id="gre-root">');
  const disclaimer = source.indexOf('<div id="gre-disclaimer">');
  expect(root).toBeGreaterThanOrEqual(0);
  expect(disclaimer).toBeGreaterThan(root);
  const body = source.slice(root, disclaimer);
  expect(body).toContain('Ground Rupture Explorer shows conditional results from a published');
  expect(body).toContain('The interactive controls require JavaScript and a supported browser');
  expect(body).toContain('<noscript>');
  const hrefs = [...body.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
  expect(hrefs).toHaveLength(5);
  for (const href of hrefs) {
    const url = new URL(href, SCENARIO_URL);
    if (url.pathname === new URL(SCENARIO_URL).pathname) {
      expect(source, href).toContain(`id="${url.hash.slice(1)}"`);
    } else {
      const response = await request.get(url.href);
      expect(response.status(), href).toBe(200);
    }
  }
});

test('the cumulative view carries the PDD §4.1 accuracy statement, histograms and suppressed charts never', async ({ page }) => {
  await gotoScenario(page);
  for (const m of MEASUREMENTS) {
    const caption = page.locator(`#gre-${m}-cap`);
    await expect(caption).toBeVisible();
    expect(await caption.textContent()).not.toContain(ACCURACY);
    await page.locator(`input[name="gre-${m}-view"][value="cumulative"]`).check();
    await expect(page.locator(`#gre-${m}-cap`)).toContainText(ACCURACY);
    await expect(page.locator(`#gre-${m}-cap`)).toBeVisible();
    await page.locator(`input[name="gre-${m}-view"][value="histogram"]`).check();
    await expect(page.locator(`#gre-${m}-cap`)).not.toContainText(ACCURACY);
    await page.locator(`input[name="gre-${m}-view"][value="cumulative"]`).check();
    await expect(page.locator(`#gre-${m}-cap`)).toContainText(ACCURACY);
    await expect(page.locator(`#gre-${m}-cap`)).toBeVisible();
  }
  // GS-5 suppresses every chart (N < 10): no caption, and the accuracy statement nowhere in the chart slots, in either view.
  await applyGolden(page, 'GS-5');
  for (const m of MEASUREMENTS) {
    await expect(page.locator(`#gre-${m} .gre-chart figure`)).toHaveCount(0);
    expect(await page.locator(`#gre-${m}`).textContent()).not.toContain(ACCURACY);
    await page.locator(`input[name="gre-${m}-view"][value="histogram"]`).check();
    await settle(page);
    expect(await page.locator(`#gre-${m}`).textContent()).not.toContain(ACCURACY);
  }
});

test('resize: each chart re-renders at its panel width, the status region unchanged', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'the resize drive is the desktop project’s (§7.5)');
  await installRecorder(page);
  await gotoScenario(page);
  await settle(page);
  const status = await page.locator('#gre-root [role=status]').textContent();
  const writes = (await recorded(page)).length;
  await page.setViewportSize({ width: 600, height: 720 });
  await expect
    .poll(async () =>
      page.locator('#gre-panels > section').evaluateAll((sections) =>
        sections.map((s) => {
          const svg = s.querySelector('.gre-chart svg');
          const width = s.querySelector('.gre-chart')!.clientWidth;
          return svg === null ? null : Number(svg.getAttribute('viewBox')!.split(' ')[2]) === width;
        }),
      ),
    )
    .toEqual([true, true, true]);
  const widths = await page.locator('#gre-panels > section').evaluateAll((sections) =>
    sections.map((s) => ({
      viewBox: Number(s.querySelector('.gre-chart svg')!.getAttribute('viewBox')!.split(' ')[2]),
      panel: (s as HTMLElement).clientWidth,
      slot: s.querySelector('.gre-chart')!.clientWidth,
    })),
  );
  for (const w of widths) expect(w.viewBox).toBe(w.panel);
  await settle(page);
  expect(await page.locator('#gre-root [role=status]').textContent()).toBe(status);
  expect((await recorded(page)).length).toBe(writes);
});
