// explore-sme-wording.spec.ts (guided DDD §15; PDD D-51): the research
// group's wording on the guided page. The step renames reach the step list,
// headings, and buttons; the introduction, the site-condition hints, and the
// fault-slip help read as §15 fixes them; pressure ridge replaces raised
// ridge; the width term is unhyphenated; the summaries label the movement
// Fault slip (§15.11); the negative-height note joins the scarp-height panel
// when its matched minimum is below zero. The static landing text and the
// glossary's adopted definitions are checked where a reader meets them.

import { expect, test, type Page } from '@playwright/test';
import { NEGATIVE_HEIGHT_NOTE } from '../../src/explore/wording';
import { BASE_URL, manifest } from '../support';
import { action, gotoExplore, heading, pickSample, sedimentName, setChecked, siteChoice, typeEntry } from '../explore-support';

const INTRO_LINE = 'Describe the geological site conditions and fault slip you want to investigate, then see the simulated results.';
const FORECAST = 'This research tool helps you forecast what could happen at a site with known conditions — probabilities from simulations, not a prediction of what will happen at a particular site.';
const SLIP_HELP = 'Fault slip is the displacement between the two sides of a fault as they move past each other. It is different from the vertical displacement measured at the ground surface. These models measure fault slip as cumulative dip-slip — movement along the fault plane, parallel to its dip. The models run the fault at a slip rate of 0.3 m/s — near coseismic slip rates, chosen so the models stay stable.';

async function confirmKern(page: Page): Promise<void> {
  await gotoExplore(page);
  await pickSample(page, 'kern');
  await action(page, 'Continue to fault slip').click();
  await page.locator('#gx-offset-feedback table').waitFor();
  await action(page, 'Review scenario').click();
  await action(page, 'Show results').click();
  await page.locator('.gx-context').waitFor();
}

test('the introduction and the step list carry the amended wording (§§15.1–15.2)', async ({ page }) => {
  await gotoExplore(page);
  await expect(page.locator('#gre-explore .gx-main')).toContainText(INTRO_LINE);
  await expect(page.locator('#gre-explore .gx-main .gx-research')).toHaveText(FORECAST);
  const cards = page.locator('.gx-intro-grid p');
  await expect(cards.nth(0)).toHaveText('Choose the modeled geological site conditions and fault slip you want to investigate.');
  await expect(cards.nth(1)).toHaveText('Check your choices and see whether the simulations cover your slip range.');
  await expect(cards.nth(2)).toContainText('deformation zone width');
  await expect(page.locator('#gre-explore .gx-steps')).toContainText('Geological site conditions');
  await expect(page.locator('#gre-explore .gx-steps')).toContainText('Fault slip');
  await expect(page.locator('#gre-explore .gx-steps')).not.toContainText('Fault movement');
});

test('site-condition hints, the fault-slip step, and the review blocks (§§15.1, 15.3–15.4, 15.6)', async ({ page }) => {
  await gotoExplore(page);
  await pickSample(page, 'illustrative');
  await expect(heading(page)).toHaveText('Describe the geological site conditions');
  await expect(page.locator('#gx-group-faultDip > p').first()).toContainText('How steeply the fault is dipping, measured from the horizontal. Also called fault dip.');
  await expect(page.locator('#gx-group-depth > p').first()).toContainText('Thickness of the sediment above bedrock.');
  await expect(page.locator('#gx-group-density > p').first()).toContainText('How tightly the sediment is packed. If unknown, select all.');
  await expect(page.locator('#gx-group-sediment > p').first()).toContainText('You can include more than one possibility. If unknown, select all.');
  // §15.3 gives the if-unknown line to density and strength only; the range groups get theirs with §14.
  await expect(page.locator('#gx-group-faultDip > p').first()).not.toContainText('If unknown');
  await expect(page.locator('#gx-group-depth > p').first()).not.toContainText('If unknown');

  await action(page, 'Continue to fault slip').click();
  await expect(heading(page)).toHaveText('Choose the assumed fault slip');
  await expect(page.locator('details.gx-help', { hasText: 'How is surface offset related to fault slip?' }).locator('p')).toContainText('pressure ridges can make that estimate too large.');
  await page.locator('#gx-offset-feedback table').waitFor();
  await expect(page.locator('#gx-offset-feedback .gx-hint')).toContainText('Pressure ridges can cause it to overestimate fault slip.');
  await page.locator('#gx-mode-slip').check();
  const help = page.locator('details.gx-help', { hasText: 'What is fault slip?' });
  await help.locator('summary').click();
  await expect(help.locator('p')).toContainText(SLIP_HELP);
  await page.locator('#gx-mode-offset').check();

  await action(page, 'Review scenario').click();
  const sections = page.locator('.gx-review-section');
  await expect(sections.nth(0).locator('h3')).toHaveText('Geological site conditions');
  await expect(sections.nth(0).getByRole('button', { name: 'Edit geological site conditions' })).toHaveCount(1);
  await expect(sections.nth(1).locator('h3')).toHaveText('Fault slip');
  await expect(sections.nth(1).getByRole('button', { name: 'Edit fault slip' })).toHaveCount(1);
  await expect(sections.nth(2)).toContainText('A stage is a saved point as fault slip increases.');
  await expect(page.locator('#gre-explore .gx-main')).not.toContainText(/raised ridge|fault movement/i);
});

test('results: the Fault slip summaries, the renamed actions, the width spelling, and the negative-height note (§§15.1, 15.7–15.8, 15.11)', async ({ page }) => {
  await confirmKern(page);
  await expect(page.locator('.gx-context')).toContainText('Fault slip: 0–1.3 m surface offset');
  await expect(page.locator('.gx-footer').getByRole('button', { name: 'Change geological site conditions' })).toHaveCount(1);
  await expect(page.locator('.gx-footer').getByRole('button', { name: 'Change fault slip' })).toHaveCount(1);
  await page.locator('details#gx-full-scenario summary').click();
  await expect(page.locator('details#gx-full-scenario')).toContainText('Fault slip: 0–1.3 m surface offset');

  // The Kern sample's matched minimum scarp height is −0.02 m (briefing question 6).
  await expect(page.locator('.gx-statistics tbody tr', { hasText: 'Minimum' }).locator('td')).toHaveText(/^[−-]0\.\d+ m$/);
  await expect(page.locator('.gx-measurement .gx-note')).toHaveText(NEGATIVE_HEIGHT_NOTE);

  await page.locator('#gx-measurement-dzw').click();
  await expect(page.locator('#gx-measurement-dzw strong')).toHaveText('Deformation zone width');
  await expect(page.locator('.gx-measurement h3')).toHaveText('Deformation zone width');
  await expect(page.locator('.gx-measurement .gx-warning').first()).toHaveText(/^Deformation zone width measures the main modeled rupture zone\./);
  await expect(page.locator('#gx-chart svg')).toHaveAttribute('aria-label', /^Deformation zone width \(m\): histogram/);
  await expect(page.locator('.gx-measurement .gx-note')).toHaveCount(0);
  await expect(page.locator('#gre-explore .gx-main')).not.toContainText(/deformation-zone/i);
  // The results footer's framing follows the amended introduction (§15.11 item 8), its disclaimer link kept.
  const footer = page.locator('#gre-explore .gx-main > .gx-research');
  await expect(footer).toContainText(FORECAST);
  await expect(footer.getByRole('link', { name: /Full disclaimer/ })).toHaveAttribute('href', '../scenario/#gre-disclaimer');
});

test('the empty state asks for a condition or slip range (§15.11 item 8)', async ({ page }) => {
  // Random Heterogeneous is modeled only for dense, 10 m profiles (briefing question 8): at 5 m nothing matches.
  const random = manifest().arm_strength_states.find(pair => /random/i.test(pair.sediment_strength));
  expect(random, 'the manifest names a random-heterogeneous profile').toBeDefined();
  await gotoExplore(page);
  await action(page, 'Build your scenario').click();
  await setChecked(page, '#gx-faultDip-all', true);
  await siteChoice(page, 'depth', '5 m').click();
  await setChecked(page, '#gx-density-all', true);
  await siteChoice(page, 'sediment', sedimentName(random!)).click();
  await action(page, 'Continue to fault slip').click();
  await setChecked(page, '#gx-mode-slip', true);
  await typeEntry(page, 'slipMin', '0');
  await typeEntry(page, 'slipMax', '5');
  await action(page, 'Review scenario').click();
  await action(page, 'Show results').click();
  await expect(page.locator('.gx-empty').first()).toContainText('Change a condition or slip range, then review the scenario again.');
});


test('the scarp-type overview and its diagram caption say pressure ridge (§15.6)', async ({ page }) => {
  await confirmKern(page);
  await page.locator('#gx-refine-button').click();
  await expect(page.locator('.gx-types')).toContainText('A pressure ridge.');
  await expect(page.locator('.gx-types')).not.toContainText('raised ridge');
});

test('with JavaScript disabled the landing text follows the amended introduction (§15.2)', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: BASE_URL, javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('explore/');
  const root = page.locator('#gre-explore');
  await expect(root).toContainText('Describe the geological site conditions and fault slip you want to investigate, then see the simulated results.');
  await expect(root).toContainText(FORECAST);
  await expect(root).not.toContainText('fault movement');
  await context.close();
});

test('the glossary carries the review’s definitions under unchanged anchors, and a new surface-offset entry (§15.9)', async ({ page }) => {
  await page.goto('glossary/');
  const entry = (id: string) => page.locator(`[id="${id}"]`);
  const expectations: readonly [string, string][] = [
    ['slip', 'The displacement observed between the two sides of a fault as they move relative to one another.'],
    ['surface-offset', 'It describes surface displacement, not movement along the fault plane.'],
    ['fault-dip', 'Fault dip is distinct from scarp dip.'],
    ['scarp', 'A step, slope, or ridge formed at the ground surface by fault slip and related deformation.'],
    ['scarp-height', 'Scarp height is therefore not always the same as the vertical displacement across the fault.'],
    ['us-ud', 'Here, Us is total scarp height and Ud is vertical displacement on the fault at depth.'],
    ['dzw', 'It may not include every secondary fault or distant splay in a natural rupture.'],
    ['scarp-dip', 'It is measured from the maximum scarp height to the base of the scarp.'],
    ['model-stage', 'A single simulation can have many stages, each with its own SDC measurements.'],
    ['sediment-depth', 'The thickness of the sediment above bedrock.'],
  ];
  for (const [id, sentence] of expectations) {
    await expect(entry(id), id).toHaveCount(1);
    // Each definition is the <dd> after its term.
    await expect(page.locator(`dt:has([id="${id}"]) + dd, dt[id="${id}"] + dd`), id).toContainText(sentence);
  }
  await expect(page.locator('article')).not.toContainText('raised ridge');
});

test('the depth and scarp-height explanations carry the adopted definitions (§§15.6, 15.11)', async ({ page }) => {
  const explanation = page.locator('#gx-definition');
  await gotoExplore(page);
  await pickSample(page, 'kern');
  await page.locator('#gx-group-depth .gx-term[data-explain="depth"]').focus();
  await expect(explanation).toBeVisible();
  await expect(explanation).toContainText('The thickness of the sediment above bedrock.');
  await action(page, 'Continue to fault slip').click();
  await page.locator('#gx-offset-feedback table').waitFor();
  await action(page, 'Review scenario').click();
  await action(page, 'Show results').click();
  await page.locator('.gx-measurement .gx-term[data-explain="scarp_height"]').focus();
  await expect(explanation).toBeVisible();
  await expect(explanation).toContainText('A pressure ridge can stand above the undeformed ground on the lifted side as well — that extra height is called additional uplift (Us − Ud).');
});

test('slip mode: the summary value drops its redundant tail under the Fault slip label (§15.11)', async ({ page }) => {
  await gotoExplore(page);
  await pickSample(page, 'illustrative');
  await action(page, 'Continue to fault slip').click();
  await page.locator('#gx-mode-slip').check();
  await action(page, 'Review scenario').click();
  await expect(page.locator('.gx-review-section').nth(1)).toContainText('3–5 m fault slip');
  await action(page, 'Show results').click();
  await page.locator('.gx-context').waitFor();
  await expect(page.locator('.gx-context .gx-compact').nth(1)).toHaveText(/^Fault slip: 3–5 m · Included: /);
  await page.locator('details#gx-full-scenario summary').click();
  await expect(page.locator('details#gx-full-scenario p').first()).toHaveText('Fault slip: 3–5 m');
});
