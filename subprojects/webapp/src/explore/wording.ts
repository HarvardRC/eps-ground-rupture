// Guided wording shared by the page (app.ts) and the result report
// (report.ts), so the report says nothing in a second wording (guided DDD
// §13.7). The count wording is §11.1's; the download hint, the report's
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
export const DOWNLOAD_CONTENTS = 'Matching simulation stages, statistics, scenario settings and sources, with a Word report of this result (report.docx).';

/** The status line after a delivery without the report (§13.5, §13.7). */
export const REPORT_FAILED = 'Your data download is ready. The Word report could not be built this time, so the archive holds the data files without it.';

/** The report's title and its provenance heading (§13.7). */
export const REPORT_TITLE = 'Ground Rupture Explorer — result report';
export const PROVENANCE_HEADING = 'Provenance';
