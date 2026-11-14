// explore-coverage.test.ts (guided DDD §19.9): the sediment-profile
// coverage assessment and its sentences, over code-built releases.
//
// - "release-v1": data-v1's joint availability — Random Heterogeneous at
//   Dense, 10 m and every angle; Alternating Strong-Weak at Dense, 10 m and
//   20°, 40° and 60°; Uniform Strong everywhere. Every recorded §3.2
//   example renders character for character from it.
// - "irregular": availability that is no cross-product, and the "for"
//   absorption of the per-dimension site note (§19.3).
// - "silent": one profile whose stages carry no scarp height.
// - The saved-result compositions: the strip, the caption, the provenance
//   block at its three sites, and the README line.

import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';

import type { Vintage } from '../src/decode/decode';
import type { VersionStamps } from '../src/download/package';
import { sidecarText, stripLines } from '../src/explore/chart-export';
import { computeResult } from '../src/explore/compute';
import {
  availability, chartCoverageLines, listAnd, measurementNoun, pageProfile, panelCoverageNotes, PROVENANCE_COVERAGE_LABEL, PROVENANCE_FULL,
  provenanceCoverageLines, REQUESTED_PREFIX, resultsBlock, REVIEW_REST, reviewLines, siteNote, summaryProfile, withCoverage, type SiteSelection,
} from '../src/explore/coverage';
import { readmeText } from '../src/explore/readme';
import { captionLines, documentXml, guidedArchive, guidedProvenance, scenarioRows, scenarioSummary } from '../src/explore/report';
import { provenanceText } from '../src/download/package';
import { guided } from '../src/explore/copy-overlay';
import type { Scenario, SedimentPair } from '../src/state/state';
import type { RenderInput } from '../src/views/render-input';
import { buildFixture, decodeFixture, type FixtureSpec } from './fixtures';

const AT = new Date('2026-11-14T12:00:00Z');

/** The members of a stored ZIP in local-header order, as text. */
function unzipText(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Map<string, string>();
  let p = 0;
  while (view.getUint32(p, true) === 0x04034b50) {
    const size = view.getUint32(p + 18, true);
    const nameLength = view.getUint16(p + 26, true);
    const extra = view.getUint16(p + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 30, p + 30 + nameLength));
    const start = p + 30 + nameLength + extra;
    out.set(name, new TextDecoder().decode(bytes.subarray(start, start + size)));
    p = start + size;
  }
  return out;
}
const STAMPS: VersionStamps = { softwareVersion: 'v0.4.0-test', dataVersion: 'data-v0-test' };
const CLASSES = ['Monoclinal', 'Monoclinal Collapse', 'Pressure Ridge', 'Pressure Ridge Collapse', 'Simple', 'Simple Collapse'];
const DIPS = [20, 30, 40, 45, 50, 60, 70];
const DEPTHS = [3, 5, 10];
const DENSITIES = ['Dense', 'Medium', 'Loose'];

const UNIFORM = 'Homogeneous', LAYERED = 'Heterogeneous';
const U_STRONG: SedimentPair = { set: UNIFORM, sedimentStrength: 'Strong' };
const U_WEAK: SedimentPair = { set: UNIFORM, sedimentStrength: 'Weak' };
const RANDOM: SedimentPair = { set: LAYERED, sedimentStrength: 'Random Heterogeneous' };
const ALTERNATING: SedimentPair = { set: LAYERED, sedimentStrength: 'Alternating Strong-Weak' };
const COHESIVE: SedimentPair = { set: LAYERED, sedimentStrength: 'Cohesive Top Unit' };

interface TrialSpec { readonly pair: SedimentPair; readonly dip: number; readonly depth: number; readonly density: string; readonly silent?: boolean }

/**
 * A release of three stages per trial (slip 0, 1 and 2 m). The zero-slip
 * stage carries no value or class; at 40° the later stages are Pressure
 * Ridge, elsewhere Simple, so a scarp-type filter can exclude whole angles.
 * A silent trial records no scarp height.
 */
async function release(trials: readonly TrialSpec[]): Promise<Vintage> {
  const stages = { slip: [] as number[], scarp_height: [] as (number | null)[], dzw: [] as (number | null)[], scarp_dip: [] as (number | null)[], scarp_class: [] as (string | null)[] };
  for (const t of trials) {
    const cls = t.dip === 40 ? 'Pressure Ridge' : 'Simple';
    stages.slip.push(0, 10000, 20000);
    stages.scarp_height.push(null, t.silent ? null : 500, t.silent ? null : 900);
    stages.dzw.push(null, 1000, 2000);
    stages.scarp_dip.push(null, 30000, 40000);
    stages.scarp_class.push(null, cls, cls);
  }
  const spec: FixtureSpec = {
    stagesPerTrial: 3,
    scarpClasses: [...CLASSES],
    trials: trials.map((t, i) => [`T${String(i).padStart(4, '0')}`, t.dip, t.pair.sedimentStrength, 'A', t.pair.set, t.depth, t.density]),
    stages,
  };
  return decodeFixture(await buildFixture(spec));
}

const every = (pair: SedimentPair, dips = DIPS, depths = DEPTHS, densities = DENSITIES): TrialSpec[] =>
  dips.flatMap(dip => depths.flatMap(depth => densities.map(density => ({ pair, dip, depth, density }))));

let v1: Vintage;
let irregular: Vintage;
let silent: Vintage;

before(async () => {
  v1 = await release([
    ...every(U_STRONG),
    ...every(RANDOM, DIPS, [10], ['Dense']),
    ...every(ALTERNATING, [20, 40, 60], [10], ['Dense']),
  ]);
  irregular = await release([
    ...every(U_STRONG),
    // Not a cross-product: Dense at 10 m and Loose at 3 m, every angle.
    ...every(U_WEAK, DIPS, [10], ['Dense']), ...every(U_WEAK, DIPS, [3], ['Loose']),
    // Every density, 10 m, two angles: the per-dimension note whose density part is "every".
    ...every(RANDOM, [20, 40], [10]),
    // Dense at 10 m at 20° and 40°; Loose at 3 m at every angle: an item names its angles only when they are not all.
    ...every(ALTERNATING, [20, 40], [10], ['Dense']), ...every(ALTERNATING, DIPS, [3], ['Loose']),
  ]);
  silent = await release([...every(U_STRONG, [40], [10], ['Dense']), ...every(COHESIVE, [40], [10], ['Dense']).map(t => ({ ...t, silent: true }))]);
});

const site = (faultDip: number[], depth: number[], density: string[], sediment: SedimentPair[]): SiteSelection => ({ faultDip, depth, density, sediment });

function confirm(vintage: Vintage, s: SiteSelection, extra: Partial<Scenario> = {}): RenderInput {
  const scenario: Scenario = {
    faultDip: s.faultDip, depth: s.depth, density: s.density, sediment: s.sediment,
    window: { mode: 'slip', min: '0', max: '3' }, population: 'all_stages', scarpClass: [...vintage.manifest.scarpClasses], ...extra,
  };
  return computeResult(vintage, scenario, 1, null);
}

const all = (vintage: Vintage): SiteSelection => site(
  [...vintage.manifest.trialColumns.fault_dip], [...vintage.manifest.trialColumns.depth], [...vintage.manifest.trialColumns.density],
  vintage.manifest.armStrengthStates.map(p => ({ set: p.set, sedimentStrength: p.sedimentStrength })),
);

describe('availability', () => {
  test('is read from the trial records: modeled values and each profile’s combinations', () => {
    const a = availability(v1);
    assert.deepEqual(a.modeled, { faultDip: DIPS, depth: DEPTHS, density: DENSITIES });
    assert.equal(a.byProfile.get(`${LAYERED}\u0000Random Heterogeneous`)!.size, 7);
    assert.equal(a.byProfile.get(`${LAYERED}\u0000Alternating Strong-Weak`)!.size, 3);
    assert.equal(a.byProfile.get(`${UNIFORM}\u0000Strong`)!.size, 63);
  });

  test('joins condition values with commas and "and"', () => {
    assert.equal(listAnd(['a']), 'a');
    assert.equal(listAnd(['a', 'b']), 'a and b');
    assert.equal(listAnd(['a', 'b', 'c']), 'a, b and c');
  });

  test('names the profiles in the page and summary forms (hyphen vs en dash)', () => {
    assert.equal(pageProfile(ALTERNATING), 'Layered: Alternating Strong-Weak');
    assert.equal(pageProfile(U_STRONG), 'Uniform: Strong');
    assert.equal(summaryProfile(ALTERNATING), 'Alternating Strong–Weak (layered)');
    assert.equal(measurementNoun('dzw'), 'deformation zone width');
    assert.equal(measurementNoun('scarp_height'), 'scarp height');
  });
});

describe('site notes (2B)', () => {
  test('render the two recorded data-v1 notes exactly, and none for a fully covered profile', () => {
    assert.equal(siteNote(v1, RANDOM), 'Random Heterogeneous: this data release has simulations only for Dense sediment, 10 m deep, at every modeled fault angle.');
    assert.equal(siteNote(v1, ALTERNATING), 'Alternating Strong-Weak: this data release has simulations only for Dense sediment, 10 m deep, at fault angles 20°, 40° and 60°.');
    assert.equal(siteNote(v1, U_STRONG), null);
  });

  test('list exact combinations when the availability is no cross-product', () => {
    assert.equal(siteNote(irregular, U_WEAK), 'Weak: this data release has simulations only for Dense sediment at 10 m; Loose sediment at 3 m.');
    assert.equal(siteNote(irregular, ALTERNATING), 'Alternating Strong-Weak: this data release has simulations only for Dense sediment at 10 m, at fault angles 20° and 40°; Loose sediment at 3 m.');
  });

  test('let the pattern’s "only for" absorb the "for every modeled density" part', () => {
    assert.equal(siteNote(irregular, RANDOM), 'Random Heterogeneous: this data release has simulations only for every modeled density, 10 m deep, at fault angles 20° and 40°.');
  });
});

describe('review (1F)', () => {
  test('the 45° absence', () => {
    assert.deepEqual(reviewLines(v1, site([45], [10], ['Dense'], [U_STRONG, ALTERNATING])), [
      'Layered: Alternating Strong-Weak — this data release has no simulations for your selected site conditions.',
      REVIEW_REST,
    ]);
    assert.equal(REVIEW_REST, 'All other selected profiles have simulations for every site condition you selected.');
  });

  test('the 40–45° partial case renders the recorded example', () => {
    assert.deepEqual(reviewLines(v1, site([40, 45], [10], ['Dense'], [U_STRONG, ALTERNATING])), [
      'Layered: Alternating Strong-Weak — simulations at fault angle 40°; none at fault angle 45°.',
      REVIEW_REST,
    ]);
  });

  test('a depth restriction, and a density restriction, with no closing line when every selected profile is affected', () => {
    assert.deepEqual(reviewLines(v1, site([20], [5, 10], ['Dense'], [RANDOM])), ['Layered: Random Heterogeneous — simulations at sediment depth 10 m; none at sediment depth 5 m.']);
    assert.deepEqual(reviewLines(v1, site([20], [10], ['Dense', 'Loose'], [RANDOM])), ['Layered: Random Heterogeneous — simulations at density Dense; none at density Loose.']);
  });

  test('condition values as §3.2 writes them: "sediment depth 3 m and 5 m", "density Medium and Loose"', () => {
    assert.deepEqual(reviewLines(v1, site([20], [3, 5, 10], ['Dense'], [RANDOM])), ['Layered: Random Heterogeneous — simulations at sediment depth 10 m; none at sediment depth 3 m and 5 m.']);
    assert.deepEqual(reviewLines(v1, site([20], [10], ['Loose', 'Dense', 'Medium'], [RANDOM])), ['Layered: Random Heterogeneous — simulations at density Dense; none at density Medium and Loose.']);
  });

  test('two partial dimensions close with the recorded "other selected combinations" tail', () => {
    assert.deepEqual(reviewLines(v1, site([20], [5, 10], ['Dense', 'Medium'], [RANDOM])), [
      'Layered: Random Heterogeneous — simulations at sediment depth 10 m and density Dense; none for the other selected combinations.',
    ]);
  });

  test('Select all', () => {
    assert.deepEqual(reviewLines(v1, all(v1)), [
      'Layered: Random Heterogeneous — simulations at sediment depth 10 m and density Dense; none for the other selected combinations.',
      'Layered: Alternating Strong-Weak — simulations at fault angles 20°, 40° and 60°, sediment depth 10 m and density Dense; none for the other selected combinations.',
      REVIEW_REST,
    ]);
  });

  test('a restored gapped set is assessed by its stored values', () => {
    assert.deepEqual(reviewLines(v1, site([20, 45], [10], ['Dense'], [ALTERNATING])), ['Layered: Alternating Strong-Weak — simulations at fault angle 20°; none at fault angle 45°.']);
  });

  test('irregular availability takes the exact-combination form', () => {
    assert.deepEqual(reviewLines(irregular, site([20], [3, 10], ['Dense', 'Loose'], [U_WEAK])), [
      'Uniform: Weak — simulations only for Dense sediment at 10 m; Loose sediment at 3 m; none for the other selected combinations.',
    ]);
  });

  test('no block when every selected profile is covered (both samples select neither limited profile)', () => {
    assert.equal(reviewLines(v1, site([30, 40], [5], ['Dense'], [U_STRONG])), null);
  });
});

describe('confirmed results (1F)', () => {
  test('the 45° absence: no simulations, still part of the selection', () => {
    const input = confirm(v1, site([45], [10], ['Dense'], [U_STRONG, ALTERNATING]));
    assert.deepEqual(resultsBlock(input), {
      represented: ['Uniform: Strong'],
      lines: ['Layered: Alternating Strong-Weak — this data release has no simulations for your selected site conditions, so it is not in these results. It remains part of your selection.'],
    });
    assert.deepEqual(chartCoverageLines(input, 'scarp_height'), ['Not represented in this chart: Alternating Strong–Weak (layered) — no simulations for the selected site conditions.']);
    assert.deepEqual(provenanceCoverageLines(input), ['Alternating Strong–Weak (layered) — this data release has no simulations for your selected site conditions, so it is not in these results.']);
  });

  test('the 40–45° partial case renders the recorded examples', () => {
    const input = confirm(v1, site([40, 45], [10], ['Dense'], [U_STRONG, ALTERNATING]));
    assert.deepEqual(resultsBlock(input)!.lines, ['Layered: Alternating Strong-Weak — represented at fault angle 40°. No simulations at fault angle 45° in this data release.']);
    assert.deepEqual(chartCoverageLines(input, 'scarp_height'), ['Partly represented in this chart: Alternating Strong–Weak (layered) — fault angle 40° only.']);
  });

  test('Select all: the catch-all closes the line', () => {
    const input = confirm(v1, all(v1));
    assert.deepEqual(resultsBlock(input)!.lines, [
      'Layered: Random Heterogeneous — represented at sediment depth 10 m and density Dense. No simulations for the other selected combinations in this data release.',
      'Layered: Alternating Strong-Weak — represented at fault angles 20°, 40° and 60°, sediment depth 10 m and density Dense. No simulations for the other selected combinations in this data release.',
    ]);
    assert.deepEqual(resultsBlock(input)!.represented, v1.manifest.armStrengthStates.map(p => pageProfile({ set: p.set, sedimentStrength: p.sedimentStrength })));
  });

  test('a later-filter exclusion (scarp type) keeps its reason distinct, and the catch-all comes last', () => {
    const ridge = { scarpClass: ['Pressure Ridge'] };
    const input = confirm(v1, site([20, 40], [10], ['Dense'], [U_STRONG, ALTERNATING]), ridge);
    assert.deepEqual(resultsBlock(input)!.lines, [
      'Uniform: Strong — represented at fault angle 40°. No stages at fault angle 20° remain after the confirmed range and refinements.',
      'Layered: Alternating Strong-Weak — represented at fault angle 40°. No stages at fault angle 20° remain after the confirmed range and refinements.',
    ]);
    const both = confirm(v1, site([20, 40, 45], [10], ['Dense'], [ALTERNATING]), ridge);
    assert.deepEqual(resultsBlock(both)!.lines, [
      'Layered: Alternating Strong-Weak — represented at fault angle 40°. No stages at fault angle 20° remain after the confirmed range and refinements. No simulations at fault angle 45° in this data release.',
    ]);
  });

  test('simulations exist but no stage remains: whole and partial availability', () => {
    const ridge = { scarpClass: ['Pressure Ridge'] };
    const none = confirm(v1, site([20], [10], ['Dense'], [ALTERNATING]), ridge);
    assert.equal(none.selection.matchingRecords, 0);
    assert.deepEqual(resultsBlock(none), { represented: [], lines: ['Layered: Alternating Strong-Weak — simulations exist for your selected site conditions, but no stages remain after the confirmed range and refinements.'] });
    const some = confirm(v1, site([20, 45], [10], ['Dense'], [ALTERNATING]), ridge);
    assert.deepEqual(resultsBlock(some)!.lines, ['Layered: Alternating Strong-Weak — simulations exist for some of your selected site conditions (at fault angle 20°), but no stages remain after the confirmed range and refinements.']);
    assert.deepEqual(chartCoverageLines(some, 'dzw'), ['Not represented in this chart: Alternating Strong–Weak (layered) — no stages after the range and refinements.']);
  });

  test('a restored gapped set is assessed by its stored values', () => {
    const input = confirm(v1, site([20, 45], [10], ['Dense'], [U_STRONG, ALTERNATING]));
    assert.deepEqual(resultsBlock(input)!.lines, ['Layered: Alternating Strong-Weak — represented at fault angle 20°. No simulations at fault angle 45° in this data release.']);
  });

  test('irregular availability lists the exact combinations represented', () => {
    const input = confirm(irregular, site([20], [3, 10], ['Dense', 'Loose'], [U_STRONG, U_WEAK]));
    assert.deepEqual(resultsBlock(input)!.lines, ['Uniform: Weak — represented at Dense sediment at 10 m; Loose sediment at 3 m. No simulations for the other selected combinations in this data release.']);
  });

  test('full representation: no block, and the provenance full line', () => {
    const input = confirm(v1, site([30, 40], [5], ['Dense'], [U_STRONG]));
    assert.equal(resultsBlock(input), null);
    assert.deepEqual(chartCoverageLines(input, 'scarp_height'), []);
    assert.deepEqual(provenanceCoverageLines(input), [PROVENANCE_FULL]);
    assert.equal(PROVENANCE_FULL, 'Every selected profile has simulations for the selected site conditions and contributes matching stages to this result.');
  });
});

describe('missing measurement values', () => {
  test('a profile without recorded values while others have them: the panel note, the strip reason, the provenance note', () => {
    const input = confirm(silent, site([40], [10], ['Dense'], [U_STRONG, COHESIVE]));
    assert.equal(resultsBlock(input), null, 'the profile is represented by matching stages');
    assert.deepEqual(panelCoverageNotes(input, 'scarp_height'), ['Simulations for Layered: Cohesive Top Unit are in your results, but their stages have no recorded scarp height values, so this chart cannot show them. Their stages are part of the Missing values (excluded) count in the statistics table.']);
    assert.deepEqual(panelCoverageNotes(input, 'dzw'), []);
    assert.deepEqual(chartCoverageLines(input, 'scarp_height'), ['Not represented in this chart: Cohesive Top Unit (layered) — no recorded scarp height values.']);
    assert.deepEqual(provenanceCoverageLines(input), ['Simulations for Cohesive Top Unit (layered) are in your results, but their stages have no recorded scarp height values, so this chart cannot show them. Their stages are part of the Missing values (excluded) count in the statistics table.']);
  });

  test('the all-null window (PDD §4.5): §5.8’s notice stands alone on the page; provenance carries every profile’s note, never the full line', () => {
    const input = confirm(v1, site([40], [10], ['Dense'], [U_STRONG, ALTERNATING]), { window: { mode: 'slip', min: '0', max: '0.04' } });
    assert.ok(input.selection.matchingRecords > 0);
    assert.equal(input.selection.perMeasurement.scarp_height.valid, 0);
    for (const m of ['scarp_height', 'dzw', 'scarp_dip'] as const) assert.deepEqual(panelCoverageNotes(input, m), []);
    assert.equal(resultsBlock(input), null);
    const lines = provenanceCoverageLines(input);
    assert.equal(lines.length, 6);
    assert.ok(!lines.includes(PROVENANCE_FULL));
    assert.equal(lines[0], 'Simulations for Strong (uniform) are in your results, but their stages have no recorded scarp height values, so this chart cannot show them. Their stages are part of the Missing values (excluded) count in the statistics table.');
    assert.equal(lines[5], 'Simulations for Alternating Strong–Weak (layered) are in your results, but their stages have no recorded scarp dip values, so this chart cannot show them. Their stages are part of the Missing values (excluded) count in the statistics table.');
  });
});

describe('saved results', () => {
  test('the strip: the request prefix on the summary line only, the qualification after the count line, every field kept', () => {
    const input = confirm(v1, site([40, 45], [10], ['Dense'], [U_STRONG, ALTERNATING]));
    const lines = stripLines(input, STAMPS, 'scarp_height', 'histogram');
    assert.equal(lines[2], `Requested scenario: ${scenarioSummary(input)}`);
    assert.equal(REQUESTED_PREFIX, 'Requested scenario: ');
    assert.match(lines[3], /^N = /);
    assert.equal(lines[4], 'Partly represented in this chart: Alternating Strong–Weak (layered) — fault angle 40° only.');
    assert.match(lines[5], /^Software version: /);
    // The report's scenario table still parses the unprefixed summary into seven rows.
    assert.equal(scenarioRows(input).length, 7);
    assert.ok(!scenarioSummary(input).startsWith(REQUESTED_PREFIX));
  });

  test('the Word report’s captions carry the same lines', () => {
    const input = confirm(v1, site([45], [10], ['Dense'], [U_STRONG, ALTERNATING]));
    const caption = captionLines(input, STAMPS, { measurement: 'dzw', view: 'histogram' });
    assert.equal(caption[1], `Requested scenario: ${scenarioSummary(input)}`);
    assert.equal(caption[3], 'Not represented in this chart: Alternating Strong–Weak (layered) — no simulations for the selected site conditions.');
  });

  test('one provenance composition at the three sites: provenance.txt, the sidecar, the report', async () => {
    const input = confirm(v1, site([45], [10], ['Dense'], [U_STRONG, ALTERNATING]));
    const shared = provenanceText(input, STAMPS, AT).split('\n').map(line => guided(line)).join('\n');
    // Directly before the Licences block, which still closes the text (PDD §6.1, G-28).
    const licences = shared.lastIndexOf('\n\nLicences\n') + 2;
    assert.ok(licences > 2);
    const expected = `${shared.slice(0, licences)}${PROVENANCE_COVERAGE_LABEL}\nAlternating Strong–Weak (layered) — this data release has no simulations for your selected site conditions, so it is not in these results.\n\n${shared.slice(licences)}`;
    assert.ok(expected.endsWith(shared.slice(licences)) && shared.slice(licences).startsWith('Licences\n'));
    assert.equal(PROVENANCE_COVERAGE_LABEL, 'Sediment-profile coverage');
    assert.equal(withCoverage(shared, input), expected);
    assert.equal(guidedProvenance(input, STAMPS, AT), expected);
    assert.equal(sidecarText(input, STAMPS, AT), expected);
    const archive = await guidedArchive(input, STAMPS, AT, async () => Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]));
    assert.equal(archive.reportError, null);
    const members = unzipText(archive.bytes);
    assert.equal(members.get('provenance.txt'), expected);
    const xml = documentXml(input, STAMPS, AT);
    assert.ok(xml.includes('<w:t xml:space="preserve">Sediment-profile coverage</w:t>'));
    assert.ok(xml.includes('Alternating Strong–Weak (layered) — this data release has no simulations for your selected site conditions, so it is not in these results.'));
    assert.ok(members.get('README.txt')!.includes('the counts, the sediment-profile coverage, the time the download was made'));
  });

  test('the README’s provenance.txt line', () => {
    assert.ok(readmeText(true).includes('provenance.txt\n  The paper citation, the data DOIs, the software and data versions, the scenario settings, the population, the counts, the sediment-profile coverage, the time the download was made, the caveats, and the licences.\n'));
  });
});
