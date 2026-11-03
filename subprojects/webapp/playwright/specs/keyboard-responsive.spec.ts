// keyboard-responsive.spec.ts (docs/app/ddd.md §7.5 inventory): "keyboard
// interaction and responsive layouts behave as PDD §9.2, PDD §9.3, and
// §7.2 specify" (HLDD §9; the §7.2 is HLDD §7.2).

import { expect, test, type Page } from '@playwright/test';
import {
  MEASUREMENTS,
  Net,
  clearRecorded,
  gotoScenario,
  installRecorder,
  manifest,
  recorded,
  settle,
} from '../support';

test.describe.configure({ timeout: 180_000 });

/** Stores `h = document.activeElement` in the page. */
const storeActive = (page: Page) =>
  page.evaluate(() => {
    (window as unknown as { __h: Element | null }).__h = document.activeElement;
  });

/** `h === document.activeElement && h.isConnected`. */
const sameFocus = (page: Page) =>
  page.evaluate(() => {
    const h = (window as unknown as { __h: Element | null }).__h;
    return h !== null && h === document.activeElement && h.isConnected;
  });

/** Arms a watch for the next replacement of panel `m`'s `.gre-chart` slot children. */
const watchChart = (page: Page, m: string) =>
  page.evaluate((id) => {
    const w = window as unknown as { __chartReplaced: boolean };
    w.__chartReplaced = false;
    const slot = document.querySelector(`#${id} .gre-chart`)!;
    const observer = new MutationObserver(() => {
      w.__chartReplaced = true;
      observer.disconnect();
    });
    observer.observe(slot, { childList: true });
  }, `gre-${m}`);

const chartReplaced = (page: Page) => page.waitForFunction(() => (window as unknown as { __chartReplaced: boolean }).__chartReplaced === true);

/** Waits for a status-region write after `before` recorded texts. */
async function statusChange(page: Page, before: number): Promise<void> {
  await expect.poll(async () => (await recorded(page, 'status')).length, { timeout: 30_000 }).toBeGreaterThan(before);
  await settle(page);
}

test('every control is reachable by keyboard with visible focus', async ({ page }) => {
  await gotoScenario(page);
  // The focusable controls inside #gre-root; a radio group counts once (Tab enters it at its checked radio).
  const expected = await page.evaluate(() => {
    const root = document.getElementById('gre-root')!;
    const all = Array.from(root.querySelectorAll<HTMLElement>('input, button, select, textarea, summary, a[href], [tabindex="0"]'));
    const keys = new Set<string>();
    for (const el of all) {
      if ((el as HTMLInputElement).disabled || el.closest('[hidden]') !== null || el.getClientRects().length === 0) continue;
      if (el.closest('details:not([open])') !== null && el.tagName !== 'SUMMARY') continue;
      keys.add(el instanceof HTMLInputElement && el.type === 'radio' ? `radio:${el.name}` : `el:${all.indexOf(el)}`);
    }
    return [...keys].sort();
  });
  await page.locator('#gre-summary').evaluate((el) => (el as HTMLElement).focus());
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    const start = document.createElement('a');
    start.id = 'gre-test-start';
    start.href = '#';
    document.getElementById('gre-root')!.before(start);
    start.focus();
  });
  const reached = new Set<string>();
  const invisible: string[] = [];
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press('Tab');
    const step = await page.evaluate(() => {
      const root = document.getElementById('gre-root')!;
      const el = document.activeElement as HTMLElement | null;
      if (el === null || !root.contains(el)) return { inside: false, key: '', visible: true, desc: '' };
      const all = Array.from(root.querySelectorAll<HTMLElement>('input, button, select, textarea, summary, a[href], [tabindex="0"]'));
      const key = el instanceof HTMLInputElement && el.type === 'radio' ? `radio:${el.name}` : `el:${all.indexOf(el)}`;
      return { inside: true, key, visible: el.matches(':focus-visible'), desc: el.outerHTML.slice(0, 80) };
    });
    if (!step.inside) {
      if (reached.size > 0) break;
      continue;
    }
    reached.add(step.key);
    if (!step.visible) invisible.push(step.desc);
  }
  expect(invisible).toEqual([]);
  expect(expected.filter((k) => !reached.has(k))).toEqual([]);
});

test('operating a control by keyboard gives the same result update as the pointer', async ({ page }) => {
  await gotoScenario(page);
  const box = page.locator('fieldset.gre-dip input[type=checkbox]').first();
  await box.focus();
  await page.keyboard.press('Space');
  await expect(box).not.toBeChecked();
  await settle(page);
  const byKey = { summary: await page.locator('#gre-summary').innerText(), panels: await page.locator('#gre-panels').innerText() };
  await page.locator('#gre-reset').click();
  await settle(page);
  await page.locator('fieldset.gre-dip label').first().click();
  await expect(box).not.toBeChecked();
  await settle(page);
  expect(await page.locator('#gre-summary').innerText()).toBe(byKey.summary);
  expect(await page.locator('#gre-panels').innerText()).toBe(byKey.panels);
});

/**
 * Focus retention (§7.5): the control is operated with `h =
 * document.activeElement` stored first; after the update settles —
 * a status-region change for a settled update, or for a display-only
 * update the next replacement of the operated panel's `.gre-chart` slot
 * with the status region unchanged — `h === document.activeElement &&
 * h.isConnected`.
 */
async function retained(page: Page, focus: string, keys: readonly string[], settled: { readonly chart: string } | 'status'): Promise<void> {
  const before = (await recorded(page, 'status')).length;
  const status = await page.locator('#gre-root [role=status]').textContent();
  await page.locator(focus).focus();
  await storeActive(page);
  // A radio group: h is the radio the arrow key moves focus to and checks — the next one of the
  // group in DOM order (the DDD erratum on the radio steps, pending the owner).
  await page.evaluate(() => {
    const w = window as unknown as { __h: Element | null };
    const r = w.__h;
    if (r instanceof HTMLInputElement && r.type === 'radio') {
      const group = Array.from(document.querySelectorAll<HTMLInputElement>(`input[type=radio][name="${r.name}"]`));
      w.__h = group[(group.indexOf(r) + 1) % group.length];
    }
  });
  if (settled !== 'status') await watchChart(page, settled.chart);
  for (const key of keys) await page.keyboard.press(key);
  if (settled === 'status') {
    await statusChange(page, before);
  } else {
    await chartReplaced(page);
    await settle(page);
    expect(await page.locator('#gre-root [role=status]').textContent()).toBe(status);
    expect((await recorded(page, 'status')).length).toBe(before);
  }
  const where = await page.evaluate(() => {
    const describe = (el: Element | null) => (el === null ? 'null' : `${el.tagName.toLowerCase()}#${el.id}[name=${el.getAttribute('name')}][value=${el.getAttribute('value')}]`);
    return `h ${describe((window as unknown as { __h: Element | null }).__h)}, activeElement ${describe(document.activeElement)}`;
  });
  expect(await sameFocus(page), `focus retained on ${focus}: ${where}`).toBe(true);
}

test.describe('focus retention across settled and display-only updates', () => {
  test.beforeEach(async ({ page }) => {
    await installRecorder(page);
    await gotoScenario(page);
    await settle(page);
  });

  test('a dip checkbox (Space)', async ({ page }) => {
    await retained(page, 'fieldset.gre-dip input[type=checkbox] >> nth=1', ['Space'], 'status');
  });

  test('a population radio (ArrowDown)', async ({ page }) => {
    await retained(page, 'input[name="gre-population"]:checked', ['ArrowDown'], 'status');
  });

  test('a panel view-switch radio (ArrowRight)', async ({ page }) => {
    await retained(page, 'input[name="gre-scarp_height-view"]:checked', ['ArrowRight'], { chart: 'scarp_height' });
  });

  test('the read-off input (84, Enter)', async ({ page }) => {
    await page.locator('input[name="gre-scarp_height-view"][value="cumulative"]').check();
    await expect(page.locator('#gre-scarp_height-pct')).toBeVisible();
    await settle(page);
    await retained(page, '#gre-scarp_height-pct', ['8', '4', 'Enter'], 'status');
    expect((await recorded(page, 'status')).at(-1)).toMatch(/^Percentile 84: /);
  });

  test('the overlay switch (Space)', async ({ page }) => {
    await retained(page, '#gre-overlay', ['Space'], { chart: 'scarp_height' });
  });

  test('the slip maximum (3, Enter)', async ({ page }) => {
    await retained(page, '#gre-slip-max', ['3', 'Enter'], 'status');
  });
});

test('mid-edit: a field export arriving during an edit keeps the draft, caret, focus, and summary', async ({ page }) => {
  const net = await new Net(page).install();
  await gotoScenario(page);
  const held = net.hold(manifest().files.field_export);
  await page.locator('#gre-overlay').check();
  await held.arrived;
  const max = page.locator('#gre-slip-max');
  await max.focus();
  await page.keyboard.type('2.5');
  const summary = await page.locator('#gre-summary').innerText();
  const invalid = await max.getAttribute('aria-invalid');
  const display = await page.evaluate(() => ({
    overlay: (document.getElementById('gre-overlay') as HTMLInputElement).checked,
    views: Array.from(document.querySelectorAll<HTMLInputElement>('.gre-view input:checked')).map((r) => r.value),
  }));
  held.release();
  for (const m of ['scarp_height', 'dzw'] as const) {
    await expect(page.locator(`#gre-${m} .gre-chart svg [data-layer="field"] line`)).not.toHaveCount(0, { timeout: 30_000 });
  }
  await settle(page);
  await expect(max).toHaveValue('2.5');
  expect(await max.evaluate((el) => (el as HTMLInputElement).selectionStart)).toBe(3);
  await expect(max).toBeFocused();
  expect(await page.locator('#gre-summary').innerText()).toBe(summary);
  expect(await max.getAttribute('aria-invalid')).toBe(invalid);
  expect(
    await page.evaluate(() => ({
      overlay: (document.getElementById('gre-overlay') as HTMLInputElement).checked,
      views: Array.from(document.querySelectorAll<HTMLInputElement>('.gre-view input:checked')).map((r) => r.value),
    })),
  ).toEqual(display);
  await page.keyboard.press('Enter');
  await expect(page.locator('#gre-summary')).toContainText(' · slip 0–2.5 m · ');
});

test('empty-state focus: an offset of 0 committed by clicking panel 1’s Cumulative radio focuses #gre-state', async ({ page }) => {
  await gotoScenario(page);
  await page.locator('input[name="gre-entry-mode"][value="offset"]').check();
  await page.locator('#gre-offset-max').fill('0');
  await page.locator('input[name="gre-scarp_height-view"][value="cumulative"]').click();
  await expect(page.locator('#gre-panels')).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('gre-state');
});

test('mobile: tap operates the view switch and the read-off', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'the mobile project’s drive (§7.5)');
  await installRecorder(page);
  await gotoScenario(page);
  await page.locator('#gre-scarp_height fieldset.gre-view label').nth(1).tap();
  await expect(page.locator('input[name="gre-scarp_height-view"][value="cumulative"]')).toBeChecked();
  await expect(page.locator('#gre-scarp_height-cap')).toContainText('The curve may be simplified for display.');
  const input = page.locator('#gre-scarp_height-pct');
  await expect(input).toBeVisible();
  await input.tap();
  await clearRecorded(page);
  await input.fill('84');
  await input.press('Enter');
  await expect(page.locator('#gre-scarp_height-pct-out')).toHaveText(/^Percentile 84: /);
  await expect.poll(async () => recorded(page, 'status')).toEqual([await page.locator('#gre-scarp_height-pct-out').innerText()]);
});

test('mobile: no page-level horizontal scroll, open tables scrolling inside their wrappers', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'the mobile project’s drive (§7.5)');
  await gotoScenario(page);
  const pageScroll = () => page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  let s = await pageScroll();
  expect(s.scrollWidth).toBeLessThanOrEqual(s.innerWidth);
  await page.locator('#gre-overlay').check();
  for (const m of MEASUREMENTS) {
    await page.locator(`#gre-${m}-data > summary`).tap();
    await expect(page.locator(`#gre-${m}-bins`)).toHaveCount(1);
  }
  await expect(page.locator('#gre-dzw-field')).toHaveCount(1, { timeout: 30_000 });
  await settle(page);
  s = await pageScroll();
  expect(s.scrollWidth).toBeLessThanOrEqual(s.innerWidth);
  const wrappers = await page.locator('.gre-table-scroll').evaluateAll((ws) =>
    ws.map((w) => {
      const table = w.querySelector('table')!;
      return {
        id: table.id,
        overflowX: getComputedStyle(w).overflowX,
        // The table lays out at its full width inside the wrapper, which scrolls it.
        wrapperScrolls: w.scrollWidth > w.clientWidth,
        tableClipped: table.scrollWidth > table.clientWidth,
        wide: table.scrollWidth > w.clientWidth,
      };
    }),
  );
  expect(wrappers.length).toBeGreaterThan(0);
  for (const w of wrappers) {
    expect(w.overflowX, w.id).toBe('auto');
    if (w.wide) {
      expect(w.wrapperScrolls, `${w.id} scrolls inside its .gre-table-scroll wrapper`).toBe(true);
      expect(w.tableClipped, `${w.id} itself does not scroll`).toBe(false);
    }
  }
});

test('mobile: #gre-summary stays in view, clear of the focused control, reached by Tab', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'the mobile project’s drive (§7.5)');
  await gotoScenario(page);
  const clear = () =>
    page.evaluate(() => {
      const s = document.getElementById('gre-summary')!.getBoundingClientRect();
      const f = (document.activeElement as HTMLElement).getBoundingClientRect();
      const inView = s.bottom > 0 && s.top < window.innerHeight && s.right > 0 && s.left < window.innerWidth;
      const overlap = !(f.bottom <= s.top || f.top >= s.bottom || f.right <= s.left || f.left >= s.right);
      return { inView, overlap };
    });
  // The first fault-dip checkbox, reached by Tab from the control before it.
  await page.locator('fieldset.gre-dip legend a').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('fieldset.gre-dip input[type=checkbox]').first()).toBeFocused();
  expect(await clear()).toEqual({ inView: true, overlap: false });
  // Reset, reached by Tab from the family toggle.
  await page.locator('#gre-family-view').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('#gre-reset')).toBeFocused();
  expect(await clear()).toEqual({ inView: true, overlap: false });
});

test('mobile: nothing essential depends on hover', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'the mobile project’s drive (§7.5)');
  await gotoScenario(page);
  // No style rule that a hover reveals or hides an element of #gre-root by: display, visibility, opacity, or content.
  const hoverRules = await page.evaluate(() => {
    const root = document.getElementById('gre-root')!;
    const found: string[] = [];
    const visit = (rules: CSSRuleList): void => {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule && rule.selectorText.includes(':hover')) {
          const plain = rule.selectorText.replace(/:hover/g, '');
          let matches = false;
          try {
            matches = root.querySelector(plain) !== null || root.matches(plain);
          } catch {
            matches = false;
          }
          const s = rule.style;
          if (matches && (s.display || s.visibility || s.opacity || s.content || s.maxHeight)) found.push(rule.selectorText);
        } else if ('cssRules' in rule && (rule as CSSGroupingRule).cssRules) {
          visit((rule as CSSGroupingRule).cssRules);
        }
      }
    };
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        visit(sheet.cssRules);
      } catch {
        // A cross-origin sheet.
      }
    }
    return found;
  });
  expect(hoverRules).toEqual([]);
  // Segment tooltips duplicate the bin table: every bar segment has a <title>, and the table carries the same counts.
  const titles = await page.locator('#gre-scarp_height .gre-chart svg title').count();
  expect(titles).toBeGreaterThan(0);
  await page.locator('#gre-scarp_height-data > summary').tap();
  await expect(page.locator('#gre-scarp_height-bins')).toHaveCount(1);
});
