// README.txt of the guided page's download (G-30; the owner's decisions
// of 2026-11-09 and 2026-11-10): what the package is, one entry per
// member, the meaning and unit of every records.csv and statistics.csv
// column, and a pointer to provenance.txt. Composed beside the shared
// `packageTexts`, as report.docx is (G-13), so the shared download code
// and the /scenario/ package do not change. Where the page's own wording
// (src/explore/glossary.ts) or the site glossary's fits, it is reused
// (D-51); the assembled lines are listed for the research group's sight.
//
// Plain UTF-8, LF line ends, every line ending in LF. A browser-and-Node
// file: no DOM global, no DOM type.

import { RECORDS_CSV_COLUMNS } from '../decode/fields';

export const README_MEMBER = 'README.txt';

const LF = '\n';

/** One entry: its name on a line, then its description indented by two spaces. */
type Entry = readonly [name: string, text: string];

/** The member entries, in archive order; report.docx only when the archive carries it. */
function memberEntries(withReport: boolean): readonly Entry[] {
  return [
    [README_MEMBER, 'This file.'],
    ['records.csv', 'The matching simulation stages, one row per stage.'],
    ['statistics.csv', 'Summary statistics for scarp height, deformation zone width, and scarp dip, with one row per measurement type.'],
    ['provenance.txt', 'The paper citation, the data DOIs, the software and data versions, the scenario settings, the population, the counts, the time the download was made, the caveats, and the licences.'],
    ['scenario.json', 'The scenario’s settings, in machine-readable form.'],
    ...(withReport ? [['report.docx', 'A report of this result in Microsoft Word format, with its charts.'] as const] : []),
  ];
}

/** The records.csv columns, in the file's order (RECORDS_CSV_COLUMNS). */
export const RECORDS_COLUMN_TEXTS: Readonly<Record<(typeof RECORDS_CSV_COLUMNS)[number], string>> = {
  trial: 'The identifier of the simulation run. Rows with the same trial value belong to the same simulation.',
  fault_dip: 'The fault’s angle from horizontal, in degrees. Smaller angles describe more gently inclined faults.',
  sediment_strength: 'The sediment-strength category or profile name. Weak, Moderate, and Strong occur in both uniform and layered simulations; read this column together with set. The other layered profiles are Alternating Strong-Weak, Cohesive Top Unit, and Random Heterogeneous. Strength describes how well sediment resists being pulled apart.',
  cohesion: 'The model setting that controls how strongly the simulated particles are bonded to one another. For uniform sediment, a number in pascals (1.00E+05 is 0.1 MPa); for layered sediment, the profile’s code (such as K or R1).',
  set: 'Homogeneous or Heterogeneous: whether the sediment is one uniform material top to bottom, or layered with different strengths.',
  depth: 'Sediment depth, in metres. The thickness of the sediment above bedrock.',
  density: 'Sediment density (Dense, Medium, or Loose). How tightly packed the sediment is.',
  slip: 'Fault slip at this stage, in metres. How far the two blocks of rock move past each other along the fault. The simulations increase this movement step by step.',
  scarp_height: 'Scarp height, in metres. The total height of the scarp above the undeformed ground on the lower side of the fault. Small negative heights are at the model’s resolution — single particles are about 0.02 m — and can reflect smoothing or extra compaction at low slip, not measured subsidence.',
  dzw: 'Deformation zone width, in metres. The width from the first sign of vertical ground movement on the raised side to the base of the scarp on the lower side.',
  scarp_dip: 'Scarp dip, in degrees. The angle of the scarp face from horizontal, from its top to its base. This is different from the angle of the fault underground.',
  scarp_class: 'Scarp type: one of the six shapes produced by the simulations — Monoclinal, Pressure Ridge, or Simple, each with or without Collapse. Blank for the zero-slip initial stages, which carry no scarp type.',
};

/** The statistics.csv columns: each of the first eleven alone, then the seven full-precision columns as one entry. */
export const STATISTICS_COLUMN_TEXTS: readonly Entry[] = [
  ['measurement', 'The measurement: scarp_height, dzw, or scarp_dip.'],
  ['label', 'The measurement’s name and unit.'],
  ['valid', 'The number of non-missing stage measurements used to calculate this row’s statistics. This is not necessarily the number of distinct simulations.'],
  ['excluded_null', 'The number of matching stages excluded from this row’s statistics because the measurement is missing.'],
  ['median', 'The middle of the sorted measurements, also called the 50th percentile.'],
  ['p16, p84', 'The 16th and 84th percentiles. They bound the middle 68% of the distribution.'],
  ['min, max', 'The smallest and largest measurement used.'],
  ['mean', 'The average of the measurements.'],
  ['sd', 'The sample standard deviation: a measure of how spread out the measurements are around their mean. It is blank when fewer than two measurements are available.'],
  ['median_full, p16_full, p84_full, min_full, max_full, mean_full, sd_full', 'The same calculated statistics before display rounding. Columns without _full are rounded as shown on the page. Additional decimal places do not imply greater scientific accuracy.'],
];

const entry = ([name, text]: Entry): string => `${name}${LF}  ${text}${LF}`;

/**
 * The README, with report.docx's lines only when the archive carries the
 * report (§13.5 fallback); `explorerUrl` — the page's canonical address,
 * the site's configured URL — stands under the title when given.
 */
export function readmeText(withReport: boolean, explorerUrl = ''): string {
  const contents = withReport
    ? 'This archive contains the results for one scenario from the Ground Rupture Explorer: the matching simulation records, summary statistics, scenario settings, source information, and a report in Microsoft Word format with charts.'
    : 'This archive contains the results for one scenario from the Ground Rupture Explorer: the matching simulation records, summary statistics, scenario settings, and source information.';
  return [
    `Ground Rupture Explorer — scenario download${LF}${explorerUrl ? `${explorerUrl}${LF}` : ''}`,
    `${contents}${LF}`,
    `Each simulation records several stages as fault slip increases. A stage is one saved point in that simulation. Depending on the Simulation stages choice — all stages within the slip range, or the last stage within the slip range — one simulation may contribute several rows to this archive. The statistics describe the included stage measurements.${LF}`,
    `These are results from computer simulations, not predictions for a particular site.${LF}`,
    `Files${LF}${LF}${memberEntries(withReport).map(entry).join('')}`,
    `records.csv columns${LF}${LF}${RECORDS_CSV_COLUMNS.map(name => entry([name, RECORDS_COLUMN_TEXTS[name]])).join('')}`,
    `A blank field means no value is recorded for that column at that stage. A blank is not zero. Missing measurements are excluded separately for each measurement type.${LF}`,
    `statistics.csv columns${LF}${LF}${STATISTICS_COLUMN_TEXTS.map(entry).join('')}`,
    `Statistics use the measurement’s unit shown in label. The valid and excluded_null columns contain counts. A blank statistical field means that statistic could not be calculated.${LF}`,
    `Percentiles use linear interpolation; sample standard deviation uses the n − 1 denominator.${LF}`,
    `The citation, the caveats, and the licences of these files are in provenance.txt.${LF}`,
  ].join(LF);
}

/** Every statistics.csv column the README names; the Node test holds it to STATISTICS_CSV_COLUMNS. */
export function readmeStatisticsColumns(): readonly string[] {
  return STATISTICS_COLUMN_TEXTS.flatMap(([names]) => names.split(', '));
}
