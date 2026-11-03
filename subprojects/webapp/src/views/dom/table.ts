// The statistics-table applier of docs/app/ddd.md §5.8 (Statistics
// tables): the one real HTML `<table>` of a panel's `.gre-table` slot,
// built from the rows of `statsRows` and the line of `unclassifiedLine`
// (src/views/stats-table.ts), which the render pass computes from one
// `RenderInput`. Its `<caption>` is the statistics framing of PDD §5.5
// (CR-5); a non-null unclassified line stands, unchanged, as its
// `<tfoot>` line. The applier constructs nodes only from that builder
// output and the copy registry and commits them by replacing the slot's
// children; it computes no value and writes no text of its own.
//
// A browser-only file (§5.1): checked under tsconfig.json only.

import { copyText } from '../copy';
import type { StatsRow } from '../stats-table';

/**
 * Replace the children of `slot`, a panel's `.gre-table` element, with
 * its statistics table: the PDD §5.5 caption, one body row per entry of
 * `rows` in their order (label as the row header, value as its cell),
 * and, when `unclassified` is not null, a `<tfoot>` holding that line.
 */
export function applyStatsTable(
  slot: HTMLElement,
  rows: readonly StatsRow[],
  unclassified: string | null,
): void {
  const doc = slot.ownerDocument;
  const table = doc.createElement('table');

  const caption = doc.createElement('caption');
  caption.textContent = copyText('pdd5.5.statisticsFraming');
  table.append(caption);

  const body = doc.createElement('tbody');
  for (const row of rows) {
    const tr = doc.createElement('tr');
    const th = doc.createElement('th');
    th.scope = 'row';
    th.textContent = row.label;
    const td = doc.createElement('td');
    td.textContent = row.value;
    tr.append(th, td);
    body.append(tr);
  }
  table.append(body);

  if (unclassified !== null) {
    const foot = doc.createElement('tfoot');
    const tr = doc.createElement('tr');
    const td = doc.createElement('td');
    td.colSpan = 2;
    td.textContent = unclassified;
    tr.append(td);
    foot.append(tr);
    table.append(foot);
  }

  slot.replaceChildren(table);
}
