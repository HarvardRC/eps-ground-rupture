// Guided wording shared by the page (app.ts) and the result report
// (report.ts), so the report says nothing in a second wording (guided DDD
// §13.7). `matchingStages` and `measurementsUsed` are §11.1's count wording;
// `missingExcluded` is the report's count-line phrase for §11.1's "Missing
// values (excluded)" (owner gate, G-13); the download hint, the report's
// failure line, its title, and its provenance heading are §13.7's.
//
// A browser-and-Node file (DDD §5.1): no DOM global, no DOM type.

import { formatCount } from '../views/format';

const plural = (n: number, one: string, many: string): string => `${formatCount(n)} ${n === 1 ? one : many}`;

/** The adopted count wording (§11.1). */
export const matchingStages = (n: number): string => plural(n, 'matching simulation stage', 'matching simulation stages');
export const measurementsUsed = (n: number): string => plural(n, 'measurement used', 'measurements used');
export const missingExcluded = (n: number): string => plural(n, 'missing value excluded', 'missing values excluded');

/** The chart views' names, as the page's view buttons show them. */
export const VIEW_NAMES = { histogram: 'Distribution', cumulative: 'Cumulative' } as const;

/** The statistics table's column headings and the empty state's heading, as the page shows them. */
export const STATISTIC_HEADING = 'Statistic';
export const VALUE_HEADING = 'Value';
export const NO_MATCHES = 'No matching simulation stages';

/** What Download data (ZIP) holds, shown before the click (§11.1; §13.7). */
export const DOWNLOAD_CONTENTS = 'Matching simulation stages, statistics, scenario settings and sources, with a report of this result in Microsoft Word format (report.docx) and a README.txt that describes each file.';

/** The whole-download failure, shown until the next attempt starts (§13.5). */
export const DOWNLOAD_FAILED = 'The download could not be created. Your confirmed result is unchanged; select Download data (ZIP) to retry.';

/** The status line after a delivery without the report (§13.5, §13.7). */
export const REPORT_FAILED = 'Your data download is ready. The report in Microsoft Word format could not be built this time, so the archive holds the data files without it.';

/** The report's title and its provenance heading (§13.7). */
export const REPORT_TITLE = 'Ground Rupture Explorer — result report';
export const PROVENANCE_HEADING = 'Provenance';

/**
 * The negative-height note (guided DDD §15.8; PDD D-46), assembled from the
 * research group's answer: shown on the scarp-height panel and in the
 * report's scarp-height section when the matched minimum is below zero.
 */
export const NEGATIVE_HEIGHT_NOTE = "Small negative heights are at the model's resolution — single particles are about 0.02 m — and can reflect smoothing or extra compaction at low slip, not measured subsidence.";

/** Whether a result's scarp-height panel carries the negative-height note: its matched minimum is below zero. */
export const negativeHeights = (input: { readonly measurements: { readonly [m: string]: { readonly stats: { readonly min: number } | null } } }, m: string): boolean =>
  m === 'scarp_height' && (input.measurements[m]?.stats?.min ?? 0) < 0;

/** The chart-image export's action and its card status lines (guided DDD §16; §16.6). */
export const CHART_EXPORT_BUTTON = 'Download this chart (PNG)';
export const CHART_EXPORT_READY = 'Your chart image and its provenance file are downloading. If your browser asks to allow multiple downloads, allow it to get the provenance file.';
export const CHART_EXPORT_FAILED = 'The chart image could not be created. Your results are unchanged; select Download this chart (PNG) to retry.';
export const CHART_SIDECAR_BLOCKED = 'The chart image is ready, but its provenance file could not be saved.';
