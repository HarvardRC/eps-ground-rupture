// README.txt of the guided page's download (G-30; the owner's decision
// of 2026-11-09): what the package is, one entry per member, the meaning
// and unit of every records.csv and statistics.csv column, and a pointer
// to provenance.txt. Composed beside the shared `packageTexts`, as
// report.docx is (G-13), so the shared download code and the /scenario/
// package do not change. Column meanings reuse the page's own wording
// (src/explore/glossary.ts) and the site glossary's (D-51); the lines the
// evidence lists as assembled went to the research group for sight.
//
// Plain UTF-8, LF line ends, every line ending in LF. A browser-and-Node
// file: no DOM global, no DOM type.

import { RECORDS_CSV_COLUMNS, STATISTICS_CSV_COLUMNS } from '../decode/fields';

export const README_MEMBER = 'README.txt';

const LF = '\n';

/** One entry: its name on a line, then its description indented by two spaces. */
type Entry = readonly [name: string, text: string];

/** The member entries, in archive order; report.docx only when the archive carries it. */
function memberEntries(withReport: boolean): readonly Entry[] {
  return [
    [README_MEMBER, 'This file.'],
    ['records.csv', 'The matching simulation stages, one row per stage.'],
    ['statistics.csv', 'Summary statistics of the matching measurements, one row per measurement.'],
    ['provenance.txt', 'The paper citation, the data DOIs, the software and data versions, the scenario settings, the counts, the caveats, and the licences.'],
    ['scenario.json', 'The confirmed scenario’s settings, in machine-readable form.'],
    ...(withReport ? [['report.docx', 'A Word report of this result, with its charts.'] as const] : []),
  ];
}

/** The records.csv columns, in the file's order (RECORDS_CSV_COLUMNS). */
export const RECORDS_COLUMN_TEXTS: Readonly<Record<(typeof RECORDS_CSV_COLUMNS)[number], string>> = {
  trial: 'The simulation the stage belongs to, by its identifier.',
  fault_dip: 'Fault angle, in degrees. How steeply the fault is tilted, measured in degrees from horizontal. A smaller angle describes a shallower fault.',
  sediment_strength: 'Sediment strength and structure: a uniform material (Weak, Moderate, or Strong) or a layered profile (Alternating Strong-Weak, Cohesive Top Unit, or Random Heterogeneous). Strength describes how well sediment resists being pulled apart.',
  cohesion: 'How strongly the simulated particles are bonded to one another — the model’s handle on sediment strength. A number for uniform sediment; a letter code for a layered profile.',
  set: 'Homogeneous or Heterogeneous: whether the sediment is one uniform material top to bottom, or layered with different strengths.',
  depth: 'Sediment depth, in metres. The thickness of the sediment above bedrock.',
  density: 'Sediment density (Dense, Medium, or Loose). How tightly packed the sediment is.',
  slip: 'Fault slip at this stage, in metres. How far the two blocks of rock move past each other along the fault. The simulations increase this movement step by step.',
  scarp_height: 'Scarp height, in metres. The total height of the scarp above the undeformed ground on the lower side of the fault.',
  dzw: 'Deformation zone width, in metres. The width from the first sign of vertical ground movement on the raised side to the base of the scarp on the lower side.',
  scarp_dip: 'Scarp dip, in degrees. The angle of the scarp face from horizontal, from its top to its base. This is different from the angle of the fault underground.',
  scarp_class: 'Scarp type: one of the six shapes produced by the simulations — Monoclinal, Pressure Ridge, or Simple, each with or without Collapse. Empty for the zero-slip initial stages, which carry no scarp type.',
};

/** The statistics.csv columns: each of the first eleven alone, then the seven full-precision columns as one entry. */
export const STATISTICS_COLUMN_TEXTS: readonly Entry[] = [
  ['measurement', 'The measurement: scarp_height, dzw, or scarp_dip.'],
  ['label', 'The measurement’s name and unit, as the page shows them.'],
  ['valid', 'The number of measurements used.'],
  ['excluded_null', 'The number of matching stages without this measurement (missing values, excluded).'],
  ['median', 'The middle of the sorted measurements, also called the 50th percentile.'],
  ['p16, p84', 'The 16th and 84th percentiles. They bound the middle 68% of the distribution.'],
  ['min, max', 'The smallest and largest measurement used.'],
  ['mean', 'The average of the measurements.'],
  ['sd', 'The standard deviation: how far a typical measurement sits from the mean.'],
  ['median_full, p16_full, p84_full, min_full, max_full, mean_full, sd_full', 'The same statistics at full precision; the columns without _full are rounded as the page shows them.'],
];

const entry = ([name, text]: Entry): string => `${name}${LF}  ${text}${LF}`;

/** The README, with report.docx's lines only when the archive carries the report (§13.5 fallback). */
export function readmeText(withReport: boolean): string {
  const opening = withReport
    ? 'This archive holds the result of one scenario confirmed on the Ground Rupture Explorer page: the matching simulation stages, their statistics, the scenario’s settings and sources, and a Word report of the result.'
    : 'This archive holds the result of one scenario confirmed on the Ground Rupture Explorer page: the matching simulation stages, their statistics, and the scenario’s settings and sources.';
  return [
    `Ground Rupture Explorer — scenario download${LF}`,
    `${opening}${LF}`,
    `Files${LF}${LF}${memberEntries(withReport).map(entry).join('')}`,
    `records.csv columns${LF}${LF}${RECORDS_CSV_COLUMNS.map(name => entry([name, RECORDS_COLUMN_TEXTS[name]])).join('')}`,
    `An empty field means the stage has no recorded value for that column.${LF}`,
    `statistics.csv columns${LF}${LF}${STATISTICS_COLUMN_TEXTS.map(entry).join('')}`,
    `Values are in the unit of the measurement’s label. An empty field means the statistic could not be computed, for example when no measurement is used.${LF}`,
    `The citation, the caveats, and the licences of these files are in provenance.txt.${LF}`,
  ].join(LF);
}

/** Every statistics.csv column the README names, for the coverage test. */
export function readmeStatisticsColumns(): readonly string[] {
  return STATISTICS_COLUMN_TEXTS.flatMap(([names]) => names.split(', '));
}

// The README must name every column of both headers; a header change fails here at load.
for (const name of STATISTICS_CSV_COLUMNS) {
  if (!readmeStatisticsColumns().includes(name)) throw new Error(`readme: statistics.csv column ${name} is not described`);
}
