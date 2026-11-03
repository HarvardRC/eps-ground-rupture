// failure-states.spec.ts (docs/app/ddd.md §7.5 inventory): "each §6.1
// state appears when its condition holds — invalid or out-of-range input,
// no data for the selected scenario, unavailable browser capabilities, and
// internal failure — without being confused with one another" (HLDD §9;
// the §6.1 is HLDD §6.1), with the §7.5 Terminal state during startup and
// Reload recovery cases.

import { expect, test, type Browser, type Page } from '@playwright/test';
import { fillCopy } from '../../src/views/chart-text';
import { copyText } from '../../src/views/copy';
import {
  BASE_URL,
  Net,
  RECOVERY_KEY,
  applyGolden,
  applyInputs,
  armProbe,
  captureDownload,
  checkbox,
  clearRecorded,
  dispatchRoutedError,
  expectCount,
  expectProbe,
  fixtureVintage,
  gotoScenario,
  gs,
  htmlFor,
  installRecorder,
  manifest,
  mounted,
  oneZeroTimer,
  pointer,
  provenanceBlock,
  recorded,
  recoveryRecord,
  seedRecovery,
  servedData,
  settle,
  withAppAttribute,
  type CapturedDownload,
  type FixtureVintage,
  type Inputs,
} from '../support';

test.describe.configure({ timeout: 180_000 });

const SHORT_DISCLAIMER = copyText('pdd5.2.shortDisclaimer').replace('[Full disclaimer →]', 'Full disclaimer →');
const OFFSET_LINE = copyText('pdd5.6.rejectedEntryLine');
const slipLine = (): string => fillCopy('ddd5.7.slipRejection', { max: String(manifest().slip_window_bounds.max) });
const unavailable = (reason: string): string => fillCopy('ddd5.10.unavailableNotice', { reason });
const unavailablePreserving = (reason: string): string => fillCopy('ddd5.10.unavailablePreservingNotice', { reason });
const REASON = {
  retrieval: copyText('ddd5.10.reasonRetrieval'),
  read: copyText('ddd5.10.reasonRead'),
  attributes: copyText('ddd5.10.reasonMissingAttribute'),
  coefficients: copyText('ddd5.10.reasonCoefficients'),
  internal: copyText('ddd5.10.reasonInternal'),
};
const fieldLine = copyText('ddd5.8.fieldExportLine');
const restoredSame = (v: string): string => fillCopy('ddd5.10.recoveryRestored', { current: v });
const restoredChanged = (previous: string, current: string): string => fillCopy('ddd5.10.recoveryRestoredChanged', { previous, current });
const action = (page: Page, a: string) => page.locator(`#gre-recovery button[data-gre-action="${a}"]`);
const messages = (page: Page) => page.locator('#gre-recovery .gre-recovery-messages > p');
const V = () => pointer().export_version;

/** The provenance blocks a rejected entry must leave unchanged: every block but block 8, the generation instant. */
function provenanceWithoutInstant(d: CapturedDownload): string {
  const lines = d.provenance.split('\n');
  const at = lines.indexOf('Generated (UTC)');
  return [...lines.slice(0, at), ...lines.slice(at + 2)].join('\n');
}

/** The disclaimer invariants of §5.10: `#gre-disclaimer` in every state; the short disclaimer in `#gre-caveats` in every skeleton state. */
async function expectDisclaimers(page: Page, skeleton = true): Promise<void> {
  await expect(page.locator('#gre-disclaimer')).toHaveCount(1);
  expect(((await page.locator('#gre-disclaimer').textContent()) ?? '').trim()).not.toBe('');
  if (skeleton) await expect(page.locator('#gre-caveats > p').first()).toHaveText(SHORT_DISCLAIMER);
}

/** The unavailable state of §5.10: panels hidden, the notice in #gre-state, the summary emptied, controls disabled. */
async function expectUnavailable(page: Page, text: string): Promise<void> {
  await expect(page.locator('#gre-state')).toHaveText(text, { timeout: 30_000 });
  await expect(page.locator('#gre-panels')).toBeHidden();
  await expect(page.locator('#gre-summary')).toHaveText('');
  await expect(page.locator('#gre-caveats > p')).toHaveCount(1);
  await expectDisclaimers(page);
  for (const id of ['#gre-overlay', '#gre-download']) {
    const el = page.locator(id);
    if ((await el.count()) > 0) await expect(el).toBeDisabled();
  }
  const enabled = await page.locator('#gre-controls input, #gre-controls button').evaluateAll((els) => els.filter((e) => !(e as HTMLInputElement).disabled).length);
  expect(enabled).toBe(0);
}

// --------------------------------------------------------------------
// Invalid or out-of-range input
// --------------------------------------------------------------------

test('invalid offset entries: marked, described, the summary and provenance unchanged', async ({ page }, testInfo) => {
  await gotoScenario(page);
  const summary = await page.locator('#gre-summary').innerText();
  const before = provenanceWithoutInstant(await captureDownload(page, testInfo, 'before'));
  const field = page.locator('#gre-offset-max');
  // Entering offset mode with a blank field shows no error and changes nothing.
  await page.locator('input[name="gre-entry-mode"][value="offset"]').check();
  await settle(page);
  await expect(field).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#gre-offset-error')).toHaveText('');
  await expect(page.locator('#gre-summary')).toHaveText(summary);
  for (const text of ['abc', '-1', '1000.0001', '']) {
    await field.fill(text);
    await field.press('Enter');
    await expect(field, `"${text}"`).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveValue(text);
    await expect(field).toHaveAccessibleDescription(new RegExp(`${OFFSET_LINE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
    const ids = ((await field.getAttribute('aria-describedby')) ?? '').split(/\s+/);
    await expect(page.locator(`#${ids[ids.length - 1]}`)).toHaveText(OFFSET_LINE);
    await expect(page.locator('#gre-summary')).toHaveText(summary);
    expect(provenanceWithoutInstant(await captureDownload(page, testInfo, `offset-${text || 'blank'}`))).toBe(before);
    // A different text, so the next commit is judged afresh.
    await field.fill('x');
    await field.press('Enter');
  }
  await expectDisclaimers(page);
});

test('invalid slip entries: marked, described after the range and helper texts, summary and provenance unchanged', async ({ page }, testInfo) => {
  await gotoScenario(page);
  const range = (await page.locator('#gre-slip-range').innerText()).trim();
  const help = (await page.locator('#gre-slip-help').innerText()).trim();
  const line = slipLine();
  const above = String(manifest().slip_window_bounds.max + 1);
  // Each case: accepted setup commits, then the rejected commit; the summary and provenance are those before it.
  const cases: readonly { readonly label: string; readonly setup: readonly (readonly [string, string])[]; readonly field: '#gre-slip-min' | '#gre-slip-max'; readonly text: string }[] = [
    { label: 'minimum -1', setup: [], field: '#gre-slip-min', text: '-1' },
    { label: 'maximum abc', setup: [], field: '#gre-slip-max', text: 'abc' },
    { label: 'minimum 3 with maximum 2', setup: [['#gre-slip-min', '3']], field: '#gre-slip-max', text: '2' },
    { label: 'a maximum above the recorded one', setup: [], field: '#gre-slip-max', text: above },
  ];
  for (const c of cases) {
    for (const [id, text] of c.setup) {
      await page.locator(id).fill(text);
      await page.locator(id).press('Enter');
      await expect(page.locator(id)).not.toHaveAttribute('aria-invalid', 'true');
    }
    await settle(page);
    const summary = await page.locator('#gre-summary').innerText();
    const before = provenanceWithoutInstant(await captureDownload(page, testInfo, `before-${c.label}`));
    const texts = { min: await page.locator('#gre-slip-min').inputValue(), max: await page.locator('#gre-slip-max').inputValue() };
    const field = page.locator(c.field);
    await field.fill(c.text);
    await field.press('Enter');
    await expect(field, c.label).toHaveAttribute('aria-invalid', 'true');
    await expect(field).toHaveValue(c.text);
    const other = c.field === '#gre-slip-min' ? '#gre-slip-max' : '#gre-slip-min';
    await expect(page.locator(other)).toHaveValue(c.field === '#gre-slip-min' ? texts.max : texts.min);
    await expect(field).toHaveAccessibleDescription(`${range} ${help} ${line}`);
    const ids = ((await field.getAttribute('aria-describedby')) ?? '').split(/\s+/);
    expect(ids.slice(0, 2)).toEqual(['gre-slip-range', 'gre-slip-help']);
    await expect(page.locator(`#${ids[ids.length - 1]}`)).toHaveText(line);
    await settle(page);
    await expect(page.locator('#gre-summary')).toHaveText(summary);
    expect(provenanceWithoutInstant(await captureDownload(page, testInfo, `after-${c.label}`))).toBe(before);
    await page.locator('#gre-reset').click();
    await expect(field).not.toHaveAttribute('aria-invalid', 'true');
  }
});

test('out-of-range offsets are accepted and flagged, the 1000 m bound accepted with results', async ({ page }) => {
  await gotoScenario(page);
  // GS-1's 3 m offset runs the 30° window past the recorded maximum: accepted, flagged partly_out.
  const gs1 = await applyGolden(page, 'GS-1');
  expect(gs1.converted_windows!.find((w) => w.fault_dip === 30)!.range_flag).toBe('partly_out');
  await expect(page.locator('#gre-offset-max')).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#gre-assist-body')).toContainText(`30°: fault slip`);
  await expect(page.locator('#gre-assist-body')).toContainText(copyText('pdd3.5.flagPartlyOutOfRange'));
  // 1000, the largest R2 accepts: accepted, results rendered, never the unavailable state.
  await page.locator('#gre-offset-max').fill('1000');
  await page.locator('#gre-offset-max').press('Enter');
  await expect(page.locator('#gre-summary')).toContainText(' · offset 0–1000 m (converted to slip per dip) · ');
  await settle(page);
  await expect(page.locator('#gre-offset-max')).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#gre-panels')).toBeVisible();
  await expect(page.locator('#gre-state')).toHaveText('');
  await expect(page.locator('#gre-scarp_height .gre-chart figure svg')).toHaveCount(1);
});

test('no data: GS-4 shows the empty state, not a failure', async ({ page }) => {
  await installRecorder(page);
  await gotoScenario(page);
  await clearRecorded(page);
  await applyGolden(page, 'GS-4');
  await expect(page.locator('#gre-panels')).toBeHidden();
  await expect(page.locator('#gre-state > p').first()).toHaveText(copyText('pdd5.8.emptyExplainer'));
  await expect(page.locator('#gre-download')).toBeEnabled();
  await expect(page.locator('fieldset.gre-dip input').first()).toBeEnabled();
  expect(await recorded(page, 'alert')).toEqual([]);
  expect((await recorded(page, 'status')).at(-1)).toBe(copyText('pdd5.8.emptyExplainer'));
  await expectDisclaimers(page);
});

// --------------------------------------------------------------------
// Unavailable browser capabilities
// --------------------------------------------------------------------

test('a missing DecompressionStream yields the complete capability notice, no skeleton', async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as unknown as { DecompressionStream?: unknown }).DecompressionStream;
  });
  await page.goto('scenario/');
  const notice = page.locator('#gre-root > p[role="alert"]:first-child');
  const text = fillCopy('ddd5.10.capabilityNotice', { apis: 'DecompressionStream' });
  await expect(notice).toHaveText(text, { timeout: 30_000 });
  expect(text).toContain('(DecompressionStream)');
  expect(text).toContain('Supported browsers are versions released within the 12 months before this application release.');
  expect(text).toContain('Update Chrome, Edge, Firefox, or Safari to the latest stable version, then reload this page.');
  expect(text).toContain('For Safari on iPhone or iPad, update iOS or iPadOS.');
  await expect(page.locator('#gre-root')).toContainText('Ground Rupture Explorer shows conditional results from a published');
  await expectDisclaimers(page, false);
  await expect(page.locator('#gre-summary')).toHaveCount(0);
  await expect(page.locator('#gre-caveats')).toHaveCount(0);
  await expect(page.locator('[role=status]')).toHaveCount(0);
  await expect(page.locator('#gre-root')).not.toHaveAttribute('data-gre-mounted');
});

const POLICY = 'The interactive controls require JavaScript and a supported browser';
const NOSCRIPT = 'The scenario controls and results need JavaScript';

test('the application bundle aborted: the browser-policy paragraph visible, the <noscript> text absent', async ({ page }) => {
  await page.route(`${BASE_URL}assets/scenario/app-*.js`, (route) => route.abort());
  await page.goto('scenario/');
  await page.waitForLoadState('load');
  await expect(page.getByText(POLICY)).toBeVisible();
  // With scripting on, <noscript> holds raw text, never rendered.
  await expect(page.locator('#gre-root noscript p')).toHaveCount(0);
  await expect(page.locator('#gre-root noscript')).toBeHidden();
  expect(await page.locator('#gre-root').innerText()).not.toContain(NOSCRIPT);
  await expect(page.locator('#gre-root')).not.toHaveAttribute('data-gre-mounted');
});

test('JavaScript disabled: the browser-policy paragraph and the <noscript> text both visible', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: BASE_URL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('scenario/');
  await expect(page.getByText(POLICY)).toBeVisible();
  await expect(page.locator('#gre-root noscript p')).toBeVisible();
  await expect(page.locator('#gre-root noscript p')).toContainText(NOSCRIPT);
  await context.close();
});

// --------------------------------------------------------------------
// Internal failure
// --------------------------------------------------------------------

test('an aborted artifact request: the unavailable state, focus on #gre-state', async ({ page }) => {
  const net = await new Net(page).install();
  net.abort(manifest().files.scenario_artifact);
  await page.goto('scenario/');
  await mounted(page);
  await expectUnavailable(page, unavailable(REASON.retrieval));
  await expect(page.locator('#gre-state')).toBeFocused();
});

test('a truncated artifact: the unavailable state', async ({ page }) => {
  const net = await new Net(page).install();
  const name = manifest().files.scenario_artifact;
  const bytes = servedData(name);
  net.files.set(name, { body: bytes.subarray(0, Math.floor(bytes.length / 2)), contentType: 'application/gzip' });
  await page.goto('scenario/');
  await mounted(page);
  await expectUnavailable(page, unavailable(REASON.read));
  await expect(page.locator('#gre-state')).toBeFocused();
});

test('a manifest whose export_version differs from the page stamp: the version-mismatch variant naming both', async ({ page }) => {
  const net = await new Net(page).install();
  const name = Object.keys(pointer().files).find((n) => n.startsWith('manifest-'))!;
  const m = JSON.parse(servedData(name).toString('utf8')) as { export_version: string };
  m.export_version = `${V()}-other`;
  net.files.set(name, { body: JSON.stringify(m), contentType: 'application/json; charset=utf-8' });
  await page.goto('scenario/');
  await mounted(page);
  const reason = fillCopy('ddd5.10.reasonDataVersion', { expected: V(), loaded: `${V()}-other` });
  await expectUnavailable(page, unavailable(reason));
  await expect(page.locator('#gre-state')).toContainText(V());
  await expect(page.locator('#gre-state')).toContainText(`${V()}-other`);
  await expect(page.locator('#gre-state')).toBeFocused();
});

test('the scenario HTML with data-software-version="": the missing-information reason, #gre-versions empty', async ({ page }) => {
  const net = await new Net(page).install();
  net.html = withAppAttribute('data-software-version', '');
  await page.goto('scenario/');
  await mounted(page);
  await expectUnavailable(page, unavailable(REASON.attributes));
  await expect(page.locator('#gre-versions')).toHaveText('');
  await expect(page.locator('#gre-state')).toBeFocused();
});

test('aborted regression exports: the prefetch shows nothing; the accepted offset then names the coefficients', async ({ page }) => {
  const net = await new Net(page).install();
  net.abort(manifest().files.regression_export);
  await gotoScenario(page);
  await page.locator('input[name="gre-entry-mode"][value="offset"]').check();
  await settle(page);
  await settle(page);
  await expect(page.locator('#gre-state')).toHaveText('');
  await expect(page.locator('#gre-panels')).toBeVisible();
  await page.locator('#gre-offset-max').fill('3');
  const link = page.locator('#gre-caveats a[href="#gre-disclaimer"]');
  await link.focus();
  await expectUnavailable(page, unavailablePreserving(REASON.coefficients));
  await expect(page.locator('#gre-state')).toBeFocused();
});

test('an aborted field export: the legend line, results kept; off and on again unrouted draws the marks', async ({ page }) => {
  const net = await new Net(page).install();
  net.abort(manifest().files.field_export);
  await gotoScenario(page);
  const panels = await page.locator('#gre-panels').innerText();
  await page.locator('#gre-overlay').check();
  for (const m of ['scarp_height', 'dzw']) await expect(page.locator(`#gre-${m} .gre-legend .gre-overlay-failed`)).toHaveText(fieldLine);
  await expect(page.locator('#gre-panels')).toBeVisible();
  await expect(page.locator('#gre-state')).toHaveText('');
  await expect(page.locator('#gre-scarp_height .gre-chart figure svg')).toHaveCount(1);
  net.unabort(manifest().files.field_export);
  await page.locator('#gre-overlay').uncheck();
  await page.locator('#gre-overlay').check();
  for (const m of ['scarp_height', 'dzw']) {
    await expect(page.locator(`#gre-${m} .gre-chart svg [data-layer="field"] line`)).not.toHaveCount(0, { timeout: 30_000 });
    await expect(page.locator(`#gre-${m} .gre-overlay-failed`)).toHaveCount(0);
  }
  expect(panels.length).toBeGreaterThan(0);
});

test('an error thrown by an unrelated script leaves the results rendered', async ({ page }) => {
  await gotoScenario(page);
  await page.addScriptTag({ content: 'setTimeout(() => { throw new Error("unrelated"); }, 0);' });
  await settle(page);
  await settle(page);
  await expect(page.locator('#gre-panels')).toBeVisible();
  await expect(page.locator('#gre-state')).toHaveText('');
  await expect(page.locator('#gre-scarp_height .gre-chart figure svg')).toHaveCount(1);
});

test('the four presentations are pairwise distinct; the disclaimers stand in each', async ({ browser }) => {
  const open = async (): Promise<Page> => (await browser.newContext({ baseURL: BASE_URL })).newPage();
  // Invalid input.
  const invalid = await open();
  await gotoScenario(invalid);
  await invalid.locator('#gre-slip-max').fill('abc');
  await invalid.locator('#gre-slip-max').press('Enter');
  await expect(invalid.locator('#gre-slip-error')).toHaveText(slipLine());
  const invalidText = await invalid.locator('#gre-slip-error').innerText();
  await expect(invalid.locator('#gre-panels')).toBeVisible();
  await expect(invalid.locator('#gre-state')).toHaveText('');
  await expectDisclaimers(invalid);
  // No data.
  const empty = await open();
  await gotoScenario(empty);
  await applyGolden(empty, 'GS-4');
  const emptyText = await empty.locator('#gre-state').innerText();
  await expect(empty.locator('#gre-download')).toBeEnabled();
  await expectDisclaimers(empty);
  // Unavailable capabilities.
  const capability = await open();
  await capability.addInitScript(() => {
    delete (window as unknown as { DecompressionStream?: unknown }).DecompressionStream;
  });
  await capability.goto('scenario/');
  const capabilityNotice = capability.locator('#gre-root > p[role="alert"]');
  await expect(capabilityNotice).toHaveCount(1, { timeout: 30_000 });
  const capabilityText = await capabilityNotice.innerText();
  await expectDisclaimers(capability, false);
  // Internal failure.
  const internal = await open();
  const net = await new Net(internal).install();
  net.abort(manifest().files.scenario_artifact);
  await internal.goto('scenario/');
  await mounted(internal);
  await expectUnavailable(internal, unavailable(REASON.retrieval));
  const internalText = await internal.locator('#gre-state').innerText();
  const texts = [invalidText, emptyText, capabilityText, internalText];
  expect(new Set(texts).size).toBe(4);
  expect(emptyText).not.toMatch(/unavailable/i);
  expect(internalText).not.toMatch(/no simulations match|matching records/i);
  for (const p of [invalid, empty, capability, internal]) await p.context().close();
});

// --------------------------------------------------------------------
// Terminal state during startup (§7.5)
// --------------------------------------------------------------------

/** The terminal-state assertions: the internal reason, panels hidden, announced once, no first-result mark. */
async function expectTerminal(page: Page): Promise<void> {
  const notice = unavailable(REASON.internal);
  await expect(page.locator('#gre-state')).toHaveText(notice);
  await expect(page.locator('#gre-panels')).toBeHidden();
  expect((await recorded(page, 'alert')).filter((t) => t === notice)).toHaveLength(1);
  expect(await page.evaluate(() => performance.getEntriesByName('egr:first-result').length)).toBe(0);
}

test('terminal state, first startup: a routed error while the artifact is held; nothing commits after release', async ({ page }) => {
  await installRecorder(page);
  const net = await new Net(page).install();
  const held = net.hold(manifest().files.scenario_artifact);
  await page.goto('scenario/');
  await held.arrived;
  await page.locator('#gre-root [role=status]').waitFor({ state: 'attached' });
  await dispatchRoutedError(page);
  await mounted(page);
  await expectTerminal(page);
  held.release();
  await settle(page);
  await settle(page);
  await expectTerminal(page);
});

test('terminal state, restored-offset loading: a routed error once the regression request arrives', async ({ page }) => {
  await installRecorder(page);
  await seedRecovery(page, recoveryRecord(gs('GS-1').inputs));
  const net = await new Net(page).install();
  const held = net.hold(manifest().files.regression_export);
  await page.goto('scenario/');
  await held.arrived;
  await dispatchRoutedError(page);
  await mounted(page);
  await expectTerminal(page);
  held.release();
  await settle(page);
  await settle(page);
  await expectTerminal(page);
});

test('terminal state, resumed startup: a routed error while the resumption waits removes Start a new scenario', async ({ page }) => {
  await installRecorder(page);
  await seedRecovery(page, '{bad');
  const net = await new Net(page).install();
  const held = net.hold(manifest().files.scenario_artifact);
  await page.goto('scenario/');
  await mounted(page);
  await expect(page.locator('#gre-state')).toHaveText(copyText('ddd5.10.recoveryInvalidRecord'));
  await action(page, 'start-new').click();
  await held.arrived;
  await dispatchRoutedError(page);
  await expectTerminal(page);
  await expect(action(page, 'start-new')).toHaveCount(0);
  held.release();
  await settle(page);
  await settle(page);
  await expectTerminal(page);
  await expect(action(page, 'start-new')).toHaveCount(0);
});

test('terminal state, decision state: the saved summary kept, no decision action, focus on #gre-state', async ({ page }) => {
  await installRecorder(page);
  await seedRecovery(page, recoveryRecord({ ...gs('GS-0').inputs, fault_dip: [99] }, {}, V(), 'Dip 99°'));
  await page.goto('scenario/');
  await mounted(page);
  await expect(page.locator('#gre-state')).toHaveText(fillCopy('ddd5.10.recoveryIncompatible', { current: V() }));
  await action(page, 'start-new').focus();
  await dispatchRoutedError(page);
  await expectTerminal(page);
  await expect(page.locator('#gre-recovery dl')).toContainText('Dip 99°');
  await expect(action(page, 'start-new')).toHaveCount(0);
  await expect(action(page, 'retry-recovery')).toHaveCount(0);
  await expect(page.locator('#gre-state')).toBeFocused();
});

// --------------------------------------------------------------------
// Reload recovery cases (§7.5)
// --------------------------------------------------------------------

/** A page whose routes serve the replacement vintage's files (its HTML only once `replace` is called). */
async function withFixture(page: Page): Promise<{ net: Net; r2: FixtureVintage; replace(): void }> {
  const net = await new Net(page).install();
  const r2 = fixtureVintage(`${V()}-r2`);
  for (const [n, f] of r2.files) net.files.set(n, f);
  return { net, r2, replace: () => (net.htmlOverride = htmlFor(r2)) };
}

/** Clicks a reloading action and waits for the new document's mount. */
async function reloadBy(page: Page, a: string): Promise<void> {
  await Promise.all([page.waitForEvent('load'), action(page, a).click()]);
  await mounted(page);
}

test('field failure across a replaced vintage: one preserving action, the click-time settings restored, overlay marks loaded after the first result', async ({ page }) => {
  await installRecorder(page);
  const { net, r2, replace } = await withFixture(page);
  await gotoScenario(page);
  // Every display setting this mount offers before the failure, set off its default (§5.6 DisplayState):
  // view and read-off (height and scarp dip cumulative, read-offs 84 and 16), chartDataOpen (width),
  // logScale (width histogram), familyView, and, below, overlay. The selected measurement has no MVP
  // control, and the show-all toggles exist only once the field export has loaded — the regression
  // case below restores them.
  for (const [m, q] of [['scarp_height', '84'], ['scarp_dip', '16']] as const) {
    await page.locator(`input[name="gre-${m}-view"][value="cumulative"]`).check();
    await page.locator(`#gre-${m}-pct`).fill(q);
    await page.locator(`#gre-${m}-pct`).press('Enter');
    await expect(page.locator(`#gre-${m}-pct-out`)).toHaveText(new RegExp(`^Percentile ${q}: `));
  }
  await page.locator('#gre-dzw-data > summary').click();
  await expect(page.locator('#gre-dzw-bins')).toHaveCount(1);
  await page.locator('#gre-dzw-log').check();
  await expect(page.locator('#gre-dzw .gre-chart svg[role="img"]')).toHaveAttribute('aria-label', /logarithmic value axis/);
  await page.locator('#gre-family-view').check();
  await expect(page.locator('#gre-dzw .gre-chart svg[role="img"]')).toHaveAttribute('aria-label', /stacked by scarp family/);
  // The served vintage is replaced while this page stays open; its first old field URL returns 404.
  replace();
  net.fail404(manifest().files.field_export, 1);
  await page.locator('#gre-overlay').check();
  for (const m of ['scarp_height', 'dzw']) await expect(page.locator(`#gre-${m} .gre-overlay-failed`)).toHaveText(fieldLine);
  await expect(page.locator('#gre-panels')).toBeVisible();
  await expect(action(page, 'reload-restore')).toHaveCount(1);
  await expect(messages(page)).toHaveText([copyText('ddd5.10.recoveryLoadFailed')]);
  // A scenario change after the failure, before the click, one that keeps the log scale offered:
  // the click-time Scenario is the one restored.
  await checkbox(page, 'fieldset.gre-depth', '3 m').uncheck();
  await expect(page.locator('#gre-summary')).toContainText(' · depth 5 or 10 m · ');
  await settle(page);
  await expect(page.locator('#gre-dzw-log')).toBeVisible();
  await expect(page.locator('#gre-dzw-log')).toBeChecked();
  const clickTime = await page.locator('#gre-summary').innerText();
  const newField = net.hold(r2.fieldName);
  await reloadBy(page, 'reload-restore');
  await newField.arrived;
  // The field request is the new manifest's, and starts after the first result.
  expect(await page.evaluate(() => document.querySelector('#gre-root[data-gre-mounted] #gre-panels') !== null)).toBe(true);
  await expect(page.locator('#gre-summary')).toHaveText(clickTime);
  // Every accepted display setting restored, the overlay on.
  await expect(page.locator('#gre-overlay')).toBeChecked();
  for (const [m, q] of [['scarp_height', '84'], ['scarp_dip', '16']] as const) {
    await expect(page.locator(`input[name="gre-${m}-view"][value="cumulative"]`)).toBeChecked();
    await expect(page.locator(`#gre-${m}-pct-out`)).toHaveText(new RegExp(`^Percentile ${q}: `));
  }
  await expect(page.locator('input[name="gre-dzw-view"][value="histogram"]')).toBeChecked();
  expect(await page.locator('#gre-dzw-data').evaluate((d) => (d as HTMLDetailsElement).open)).toBe(true);
  expect(await page.locator('#gre-scarp_height-data').evaluate((d) => (d as HTMLDetailsElement).open)).toBe(false);
  await expect(page.locator('#gre-dzw-log')).toBeChecked();
  await expect(page.locator('#gre-dzw .gre-chart svg[role="img"]')).toHaveAttribute('aria-label', /logarithmic value axis/);
  await expect(page.locator('#gre-family-view')).toBeChecked();
  await expect(page.locator('#gre-dzw .gre-chart svg[role="img"]')).toHaveAttribute('aria-label', /stacked by scarp family/);
  await expect(page.locator('#gre-versions')).toContainText(r2.exportVersion);
  const message = restoredChanged(V(), r2.exportVersion);
  await expect(messages(page)).toHaveText([message]);
  newField.release();
  for (const m of ['scarp_height', 'dzw']) {
    await expect(page.locator(`#gre-${m} .gre-chart svg [data-layer="field"] line`)).not.toHaveCount(0, { timeout: 30_000 });
  }
  await settle(page);
  expect((await recorded(page, 'status')).filter((t) => t === message)).toHaveLength(1);
});

test('regression failure across a replaced vintage: the accepted offset Scenario is stored and restored, coefficients first, no flash', async ({ page, browser }, testInfo) => {
  await installRecorder(page);
  const { net, r2, replace } = await withFixture(page);
  await page.addInitScript((key: string) => {
    (window as unknown as { __greStored: string | null }).__greStored = sessionStorage.getItem(key);
  }, RECOVERY_KEY);
  const oldRegression = manifest().files.regression_export;
  await gotoScenario(page);
  // The show-all display state (offered once the field export has loaded): on for both overlay panels.
  await page.locator('#gre-overlay').check();
  await showAllOn(page);
  await page.locator('input[name="gre-population"][value="one_state_per_trial"]').check();
  await expectCount(page, gs('GS-7').counts.matching_records);
  const slipSummary = await page.locator('#gre-summary').innerText();
  // The old page's first regression URL — the prefetch — returns 404, which shows nothing.
  net.fail404(oldRegression, 1);
  await page.locator('input[name="gre-entry-mode"][value="offset"]').check();
  await settle(page);
  await settle(page);
  await expect(page.locator('#gre-state')).toHaveText('');
  // Accept an offset Scenario while its coefficients are withheld: the screen still shows the slip result.
  const withheld = net.hold(oldRegression);
  await page.locator('#gre-offset-max').fill('3');
  await page.locator('#gre-offset-max').press('Enter');
  await withheld.arrived;
  await settle(page);
  await expect(page.locator('#gre-summary')).toHaveText(slipSummary);
  // That load fails: the coefficients reason with the preserving actions.
  net.abort(oldRegression);
  withheld.release();
  await expectUnavailable(page, unavailablePreserving(REASON.coefficients));
  await expect(action(page, 'reload-restore')).toHaveCount(1);
  // The served vintage is replaced; recover.
  replace();
  net.unabort(oldRegression);
  const newRegression = net.hold(r2.regressionName);
  await Promise.all([page.waitForEvent('load'), action(page, 'reload-restore').click()]);
  await newRegression.arrived;
  // Current-vintage coefficients are requested before any result: nothing mounted, no panel drawn.
  await expect(page.locator('#gre-root[data-gre-mounted]')).toHaveCount(0);
  await expect(page.locator('#gre-panels')).toHaveCount(0);
  const stored = JSON.parse((await page.evaluate(() => (window as unknown as { __greStored: string | null }).__greStored))!) as { scenario: Inputs; sourceExportVersion: string };
  expect(stored.scenario.entry_mode).toBe('offset');
  expect(stored.scenario.offset_max).toBe('3');
  expect(stored.scenario.population).toBe('one_state_per_trial');
  expect(stored.sourceExportVersion).toBe(V());
  newRegression.release();
  await mounted(page);
  await settle(page);
  await settle(page);
  // No default or old result before the restored one: one first-result mark, no settled update.
  expect(await page.evaluate(() => performance.getEntriesByName('egr:first-result').length)).toBe(1);
  expect(await page.evaluate(() => performance.getEntriesByName('egr:results-updated').length)).toBe(0);
  expect((await recorded(page, 'status')).filter((t) => t.startsWith('Results updated'))).toEqual([]);
  await expect(page.locator('#gre-summary')).toContainText(' · offset 0–3 m (converted to slip per dip) · ');
  await expect(page.locator('#gre-summary')).toContainText('one state per simulation trial');
  await expect(messages(page)).toHaveText([restoredChanged(V(), r2.exportVersion)]);
  await expect(page.locator('#gre-overlay')).toBeChecked();
  for (const m of ['scarp_height', 'dzw']) {
    await expect(page.locator(`#gre-${m} .gre-overlay-legend button[aria-pressed]`)).toHaveAttribute('aria-pressed', 'true', { timeout: 30_000 });
  }
  const restoredPanels = await page.locator('#gre-panels').innerText();
  const restoredDownload = await captureDownload(page, testInfo, 'restored');
  // A fresh page, independently set to the same inputs on the new vintage.
  const fresh = await freshOn(browser, r2);
  const count = Number(/matching records: ([\d,]+)$/.exec(await page.locator('#gre-summary').innerText())![1].replace(/,/g, ''));
  await applyInputs(fresh, stored.scenario, count);
  await fresh.locator('#gre-overlay').check();
  await showAllOn(fresh);
  expect(await fresh.locator('#gre-panels').innerText()).toBe(restoredPanels);
  const freshDownload = await captureDownload(fresh, testInfo, 'fresh');
  for (const member of ['records.csv', 'statistics.csv', 'scenario.json']) {
    expect(freshDownload.members.get(member)!.equals(restoredDownload.members.get(member)!), member).toBe(true);
  }
  await fresh.context().close();
});

/** Waits for the overlay legends and turns each panel's show-all toggle on. */
async function showAllOn(page: Page): Promise<void> {
  for (const m of ['scarp_height', 'dzw']) {
    const toggle = page.locator(`#gre-${m} .gre-overlay-legend button[aria-pressed]`);
    await expect(toggle).toHaveAttribute('aria-pressed', 'false', { timeout: 30_000 });
    await toggle.click();
    await expect(page.locator(`#gre-${m} .gre-overlay-legend button[aria-pressed]`)).toHaveAttribute('aria-pressed', 'true');
  }
  await settle(page);
}

/** A fresh page serving the replacement vintage, at its default state. */
async function freshOn(browser: Browser, r2: FixtureVintage): Promise<Page> {
  const context = await browser.newContext({ baseURL: BASE_URL, acceptDownloads: true });
  const page = await context.newPage();
  const net = await new Net(page).install();
  for (const [n, f] of r2.files) net.files.set(n, f);
  net.htmlOverride = htmlFor(r2);
  await gotoScenario(page);
  return page;
}

test('same-vintage transient failure recovery recomputes, shown and announced once', async ({ page }) => {
  await installRecorder(page);
  const net = await new Net(page).install();
  await gotoScenario(page);
  net.fail404(manifest().files.field_export, 1);
  await page.locator('#gre-overlay').check();
  await expect(page.locator('#gre-scarp_height .gre-overlay-failed')).toHaveText(fieldLine);
  await reloadBy(page, 'reload-restore');
  const message = restoredSame(V());
  await expect(messages(page)).toHaveText([message]);
  await expect(messages(page)).toBeVisible();
  await expect(page.locator('#gre-overlay')).toBeChecked();
  await expect(page.locator('#gre-scarp_height .gre-chart svg [data-layer="field"] line')).not.toHaveCount(0, { timeout: 30_000 });
  await settle(page);
  expect((await recorded(page, 'status')).filter((t) => t === message)).toHaveLength(1);
});

test('a restored valid empty match is the normal empty result', async ({ page }) => {
  await seedRecovery(page, recoveryRecord(gs('GS-4').inputs));
  await gotoScenario(page);
  await expect(page.locator('#gre-panels')).toBeHidden();
  await expect(page.locator('#gre-state > p').first()).toHaveText(copyText('pdd5.8.emptyExplainer'));
  await expect(messages(page)).toHaveText([restoredSame(V())]);
  await expect(page.locator('#gre-download')).toBeEnabled();
});

test('a saved log scale the restored result cannot offer is turned off with its notice, the Scenario unchanged', async ({ page }) => {
  const gs7 = gs('GS-7');
  expect(gs7.histogram_log.dzw).toBeNull();
  await seedRecovery(page, recoveryRecord(gs7.inputs, { logScale: true }));
  await gotoScenario(page);
  await expect(messages(page)).toHaveText([restoredSame(V()), copyText('ddd5.10.recoveryLogScaleOff')]);
  await expect(page.locator('#gre-dzw-log')).toBeHidden();
  await expect(page.locator('#gre-dzw-log')).not.toBeChecked();
  await expect(page.locator('#gre-summary')).toContainText('one state per simulation trial');
  await expectCount(page, gs7.counts.matching_records);
});

test('incompatible saved settings: the saved summary and decision, no result, defaults, or download; Start a new scenario gives defaults', async ({ page, browser }) => {
  const base = gs('GS-0').inputs;
  const cases: readonly [string, unknown, Record<string, unknown>][] = [
    ['a removed vocabulary item', { ...base, fault_dip: [20, 30, 99] }, {}],
    ['a reduced slip maximum', { ...base, slip_window: { min: '0', max: String(manifest().slip_window_bounds.max + 0.5) } }, {}],
    ['an incompatible family-view selection', { ...base, scarp_class: base.scarp_class.slice(0, 5) }, { familyView: true }],
  ];
  for (const [label, scenario, display] of cases) {
    const context = await browser.newContext({ baseURL: BASE_URL });
    const p = await context.newPage();
    await seedRecovery(p, recoveryRecord(scenario, display, V(), `Saved: ${label}`));
    await gotoScenario(p);
    await expect(p.locator('#gre-state'), label).toHaveText(fillCopy('ddd5.10.recoveryIncompatible', { current: V() }));
    await expect(p.locator('#gre-recovery dl dt')).toHaveText(copyText('ddd5.10.savedSettingsLabel'));
    await expect(p.locator('#gre-recovery dl dd')).toHaveText(`Saved: ${label}`);
    await expect(p.locator('#gre-panels')).toBeHidden();
    await expect(p.locator('#gre-controls')).toBeHidden();
    await expect(p.locator('#gre-summary')).toHaveText('');
    await expect(p.locator('#gre-download')).toHaveCount(0);
    await expect(p.locator('#gre-recovery button')).toHaveCount(1);
    await action(p, 'start-new').click();
    await expectCount(p, gs('GS-0').counts.matching_records);
    await expect(p.locator('#gre-summary')).toContainText(/^Any dip · /);
    await expect(p.locator('#gre-recovery dl')).toHaveCount(0);
    await context.close();
  }
});

test('malformed JSON, a wrong record version, and a bad display shape: the distinct invalid-record message', async ({ browser }) => {
  const good = JSON.parse(recoveryRecord(gs('GS-0').inputs)) as Record<string, unknown>;
  const badDisplay = { ...good, display: { ...(good.display as Record<string, unknown>), extra: true } };
  const cases: readonly [string, string][] = [
    ['malformed JSON', '{bad'],
    ['a wrong record version', JSON.stringify({ ...good, recoveryVersion: 2 })],
    ['a bad display shape', JSON.stringify(badDisplay)],
  ];
  const invalid = copyText('ddd5.10.recoveryInvalidRecord');
  expect(invalid).not.toBe(fillCopy('ddd5.10.recoveryIncompatible', { current: V() }));
  for (const [label, text] of cases) {
    const context = await browser.newContext({ baseURL: BASE_URL });
    const p = await context.newPage();
    await seedRecovery(p, text);
    await gotoScenario(p);
    await expect(p.locator('#gre-state'), label).toHaveText(invalid);
    await expect(p.locator('#gre-panels')).toBeHidden();
    await expect(p.locator('#gre-summary')).toHaveText('');
    await expect(p.locator('#gre-recovery button')).toHaveCount(1);
    await expect(action(p, 'start-new')).toHaveCount(1);
    await context.close();
  }
});

/** Makes `window.sessionStorage` throw in every document of `page` (or only while `window.name` is `gate`). */
async function breakStorageGetter(page: Page, gate: string | null = null): Promise<void> {
  await page.addInitScript((g: string | null) => {
    if (g !== null && window.name !== g) return;
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });
  }, gate);
}

const storageWarning = [copyText('ddd5.10.recoveryStorageUnavailable'), copyText('ddd5.10.recoveryDefaultStarted')];

test('storage getter failure on ordinary startup: defaults with the visible, announced read warning, truthful after a change', async ({ page }) => {
  await installRecorder(page);
  await breakStorageGetter(page);
  await gotoScenario(page);
  await expect(messages(page)).toHaveText(storageWarning);
  await expectCount(page, gs('GS-0').counts.matching_records);
  await settle(page);
  expect((await recorded(page, 'status')).filter((t) => t === storageWarning.join(' '))).toHaveLength(1);
  await checkbox(page, 'fieldset.gre-depth', '3 m').uncheck();
  await expect(page.locator('#gre-summary')).toContainText(' · depth 5 or 10 m · ');
  await expect(messages(page)).toHaveText(storageWarning);
});

test('storage read failure on ordinary startup: the same warning', async ({ page }) => {
  await installRecorder(page);
  await page.addInitScript((key: string) => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (this: Storage, k: string) {
      if (k === key) throw new DOMException('denied', 'SecurityError');
      return original.call(this, k);
    };
  }, RECOVERY_KEY);
  await gotoScenario(page);
  await expect(messages(page)).toHaveText(storageWarning);
  await settle(page);
  expect((await recorded(page, 'status')).filter((t) => t === storageWarning.join(' '))).toHaveLength(1);
});

test('storage failure after a successful preserving save: no restoration claimed', async ({ page }) => {
  const net = await new Net(page).install();
  await breakStorageGetter(page, 'gre-test-break-storage');
  await gotoScenario(page);
  net.fail404(manifest().files.field_export, 1);
  await page.locator('#gre-overlay').check();
  await expect(page.locator('#gre-scarp_height .gre-overlay-failed')).toHaveText(fieldLine);
  await page.evaluate(() => {
    window.name = 'gre-test-break-storage';
  });
  await reloadBy(page, 'reload-restore');
  await expect(messages(page)).toHaveText(storageWarning);
  await expect(page.locator('#gre-recovery')).not.toContainText('restored');
  await expect(page.locator('#gre-overlay')).not.toBeChecked();
  await page.evaluate(() => {
    window.name = '';
  });
});

test('storage failure with a concurrent vintage-load failure: only the first sentence, no defaults claimed', async ({ page }) => {
  await breakStorageGetter(page);
  const net = await new Net(page).install();
  net.abort(manifest().files.scenario_artifact);
  await page.goto('scenario/');
  await mounted(page);
  await expectUnavailable(page, unavailable(REASON.retrieval));
  await expect(messages(page)).toHaveText([copyText('ddd5.10.recoveryStorageUnavailable')]);
});

/** A field failure on a mounted page, so the preserving actions show. */
async function fieldFailure(page: Page, net: Net): Promise<void> {
  net.fail404(manifest().files.field_export, 1);
  await page.locator('#gre-overlay').check();
  await expect(page.locator('#gre-scarp_height .gre-overlay-failed')).toHaveText(fieldLine);
  await expect(action(page, 'reload-restore')).toHaveCount(1);
}

test('a write failure: its exact message, no navigation', async ({ page }) => {
  await installRecorder(page);
  const net = await new Net(page).install();
  await page.addInitScript((key: string) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (this: Storage, k: string, v: string) {
      if (k === key) throw new DOMException('full', 'QuotaExceededError');
      return original.call(this, k, v);
    };
  }, RECOVERY_KEY);
  await gotoScenario(page);
  await fieldFailure(page, net);
  await armProbe(page);
  await action(page, 'reload-restore').click();
  const saveFailed = copyText('ddd5.10.recoverySaveFailed');
  await expect(messages(page)).toContainText([saveFailed]);
  await settle(page);
  await expectProbe(page);
  expect((await recorded(page, 'alert')).filter((t) => t === saveFailed)).toHaveLength(1);
  await expect(action(page, 'reload-restore')).toBeEnabled();
  await expect(action(page, 'reload-fresh')).toBeEnabled();
});

test('a read-back failure: the save-failure message, no navigation', async ({ page }) => {
  const net = await new Net(page).install();
  await page.addInitScript((key: string) => {
    const set = Storage.prototype.setItem;
    const get = Storage.prototype.getItem;
    let written = false;
    Storage.prototype.setItem = function (this: Storage, k: string, v: string) {
      if (k === key) written = true;
      return set.call(this, k, v);
    };
    Storage.prototype.getItem = function (this: Storage, k: string) {
      const value = get.call(this, k);
      return k === key && written && value !== null ? `${value} ` : value;
    };
  }, RECOVERY_KEY);
  await gotoScenario(page);
  await fieldFailure(page, net);
  await armProbe(page);
  await action(page, 'reload-restore').click();
  await expect(messages(page)).toContainText([copyText('ddd5.10.recoverySaveFailed')]);
  await settle(page);
  await expectProbe(page);
});

/** Seeds a valid record and stubs the key's storage so the claim's removal path fails as `mode` says, once. */
async function blockedStartup(page: Page, mode: 'remove-throws' | 'verify-throws' | 'still-present'): Promise<void> {
  await seedRecovery(page, recoveryRecord(gs('GS-7').inputs));
  await page.addInitScript(
    ([key, m]: [string, string]) => {
      let armed = true;
      let reads = 0;
      const remove = Storage.prototype.removeItem;
      const get = Storage.prototype.getItem;
      Storage.prototype.removeItem = function (this: Storage, k: string) {
        if (k === key && armed && m === 'remove-throws') {
          armed = false;
          throw new DOMException('denied', 'SecurityError');
        }
        if (k === key && armed && m === 'still-present') {
          armed = false;
          return undefined;
        }
        return remove.call(this, k);
      };
      Storage.prototype.getItem = function (this: Storage, k: string) {
        if (k === key && armed && m === 'verify-throws' && ++reads === 2) {
          armed = false;
          throw new DOMException('denied', 'SecurityError');
        }
        return get.call(this, k);
      };
    },
    [RECOVERY_KEY, mode] as [string, string],
  );
}

for (const mode of ['remove-throws', 'verify-throws', 'still-present'] as const) {
  test(`a blocked restoration (${mode}): Retry recovery after clearing resumes it`, async ({ page }) => {
    await blockedStartup(page, mode);
    await gotoScenario(page);
    await expect(page.locator('#gre-state')).toHaveText(copyText('ddd5.10.recoveryClearFailed'));
    await expect(page.locator('#gre-panels')).toBeHidden();
    await expect(action(page, 'retry-recovery')).toHaveCount(1);
    await expect(action(page, 'start-new')).toHaveCount(1);
    await armProbe(page);
    await action(page, 'retry-recovery').click();
    await expect(page.locator('#gre-panels')).toBeVisible();
    await expect(page.locator('#gre-summary')).toContainText('one state per simulation trial');
    await expect(messages(page)).toHaveText([restoredSame(V())]);
    await expectProbe(page);
  });

  test(`a blocked restoration (${mode}): Start a new scenario after clearing uses no saved settings`, async ({ page }) => {
    await blockedStartup(page, mode);
    await gotoScenario(page);
    await expect(page.locator('#gre-state')).toHaveText(copyText('ddd5.10.recoveryClearFailed'));
    await armProbe(page);
    await action(page, 'start-new').click();
    await expectCount(page, gs('GS-0').counts.matching_records);
    await expect(page.locator('#gre-summary')).toContainText('all recorded stages');
    await expect(page.locator('#gre-recovery')).not.toContainText('restored');
    expect(await page.evaluate((k) => Object.keys(sessionStorage).includes(k), RECOVERY_KEY)).toBe(false);
    await expectProbe(page);
  });
}

test('a failed discard never reloads and leaves the results and settings untouched', async ({ page }) => {
  const net = await new Net(page).install();
  await gotoScenario(page);
  await page.locator('input[name="gre-population"][value="one_state_per_trial"]').check();
  await expectCount(page, gs('GS-7').counts.matching_records);
  await fieldFailure(page, net);
  const summary = await page.locator('#gre-summary').innerText();
  const panels = await page.locator('#gre-panels').innerText();
  await page.evaluate((key: string) => {
    const remove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (this: Storage, k: string) {
      if (k === key) throw new DOMException('denied', 'SecurityError');
      return remove.call(this, k);
    };
  }, RECOVERY_KEY);
  await armProbe(page);
  await action(page, 'reload-fresh').click();
  await expect(messages(page)).toContainText([copyText('ddd5.10.recoveryDiscardFailed')]);
  await settle(page);
  await expectProbe(page);
  await expect(page.locator('#gre-summary')).toHaveText(summary);
  expect(await page.locator('#gre-panels').innerText()).toBe(panels);
});

test('the new vintage failing again: the consumed record kept for an explicit preserving action, no loop, no defaults', async ({ page }) => {
  await installRecorder(page);
  const net = await new Net(page).install();
  await seedRecovery(page, recoveryRecord(gs('GS-7').inputs));
  net.abort(manifest().files.scenario_artifact);
  let loads = 0;
  page.on('load', () => loads++);
  await page.goto('scenario/');
  await mounted(page);
  await expectUnavailable(page, unavailablePreserving(REASON.retrieval));
  await expect(action(page, 'reload-restore')).toHaveCount(1);
  await page.waitForTimeout(1500);
  expect(loads).toBe(1);
  await expect(page.locator('#gre-panels')).toBeHidden();
  net.unabort(manifest().files.scenario_artifact);
  await reloadBy(page, 'reload-restore');
  await expect(page.locator('#gre-summary')).toContainText('one state per simulation trial');
  await expect(messages(page)).toHaveText([restoredSame(V())]);
});

test('the required regression failing again: the coefficients reason with the preserving action, no loop', async ({ page }) => {
  const net = await new Net(page).install();
  await seedRecovery(page, recoveryRecord(gs('GS-1').inputs));
  net.abort(manifest().files.regression_export);
  let loads = 0;
  page.on('load', () => loads++);
  await page.goto('scenario/');
  await mounted(page);
  await expectUnavailable(page, unavailablePreserving(REASON.coefficients));
  await expect(action(page, 'reload-restore')).toHaveCount(1);
  await page.waitForTimeout(1500);
  expect(loads).toBe(1);
});

test('a failed overlay load after a successful restoration: the ordinary nonblocking field failure with its action', async ({ page }) => {
  const net = await new Net(page).install();
  await seedRecovery(page, recoveryRecord(gs('GS-7').inputs, { overlay: true }));
  net.fail404(manifest().files.field_export, 1);
  await gotoScenario(page);
  await expect(page.locator('#gre-scarp_height .gre-overlay-failed')).toHaveText(fieldLine);
  await expect(page.locator('#gre-panels')).toBeVisible();
  await expect(messages(page)).toHaveText([restoredSame(V()), copyText('ddd5.10.recoveryLoadFailed')]);
  await expect(action(page, 'reload-restore')).toHaveCount(1);
});

test('a reload exception: its exact message, no navigation, the key removed', async ({ page }) => {
  await installRecorder(page);
  // Chromium's location.reload is an unforgeable own property, so the bundle is routed with every
  // location.reload() call replaced by a throwing one (the DDD erratum for the owner).
  await page.route(`${BASE_URL}assets/scenario/app-*.js`, async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    expect(source).toContain('location.reload()');
    const body = source.split('location.reload()').join('(()=>{throw new DOMException("blocked","SecurityError")})()');
    await route.fulfill({ status: 200, contentType: 'application/javascript; charset=utf-8', body });
  });
  const net = await new Net(page).install();
  await gotoScenario(page);
  const failed = copyText('ddd5.10.recoveryReloadFailed');
  for (const a of ['reload-restore', 'reload-fresh']) {
    await fieldFailure(page, net);
    await clearRecorded(page);
    await armProbe(page);
    await action(page, a).click();
    await expect(messages(page), a).toContainText([failed]);
    await settle(page);
    await oneZeroTimer(page);
    await expectProbe(page);
    expect((await recorded(page, 'alert')).filter((t) => t === failed), a).toHaveLength(1);
    expect(await page.evaluate((k) => Object.keys(sessionStorage).includes(k), RECOVERY_KEY), a).toBe(false);
    await expect(action(page, a)).toBeEnabled();
    await page.locator('#gre-overlay').uncheck();
  }
});
