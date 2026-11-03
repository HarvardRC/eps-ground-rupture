// field-overlay.test.ts (docs/app/ddd.md §7.4, the `field-overlay.test.ts`
// row): the pure overlay model `src/overlay/model.ts` (§5.8, Field
// overlay; §3.4) on injected rows — `overlayRows` default sets (scarp
// height: `labeled_set`; width: `labeled_set` and `criterion_sub50`
// `met`) and the show-all expansion; `overlayGroups` per source, never
// pooled, carrying the `limited_comparison` flag; `overlayNote('scarp_dip')`
// yields the PDD §4.4 note, and `overlayNote` of the other two
// measurements yields null.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { FieldRow } from '../src/decode/fields';
import { fieldOrder, overlayGroups, overlayNote, overlayRows } from '../src/overlay/model';
import { fieldTableSpec } from '../src/views/chart-text';

function row(
  source: string,
  analogue: 'scarp_height' | 'dzw',
  sourceQuantity: string,
  eqName: string,
  value: number,
  labeledSet: boolean,
): FieldRow {
  return {
    source,
    eqName,
    magnitude: null,
    analogue,
    sourceQuantity,
    value,
    limitedComparison: source === 'SURE' && sourceQuantity === 'FNC',
    criterionSub50: analogue === 'dzw' ? (value < 50.0 ? 'met' : 'not_met') : 'not_applicable',
    labeledSet,
    kernFieldGroup: null,
  };
}

// Injected rows in the §3.4 export order: (source, analogue, eq_name, source_quantity, value).
const ROWS: readonly FieldRow[] = [
  row('FDHI', 'dzw', 'fzw_central_meters', 'Kashmir', 12.5, true),
  row('FDHI', 'dzw', 'fzw_central_meters', 'Landers', 30, false),
  row('FDHI', 'dzw', 'fzw_central_meters', 'Wenchuan', 50.0, true),
  row('FDHI', 'dzw', 'fzw_central_meters', 'Wenchuan', 120, true),
  row('FDHI', 'scarp_height', 'vs_central_meters', 'Kashmir', 2.1, true),
  row('FDHI', 'scarp_height', 'vs_central_meters', 'Landers', 1.4, false),
  row('Kern', 'dzw', 'DZW', 'Kern County (1952)', 8, true),
  row('Kern', 'dzw', 'DZW', 'Kern County (1952)', 75, true),
  row('Kern', 'scarp_height', 'Vertical', 'Kern County (1952)', 0.6, true),
  row('SURE', 'dzw', 'FNC', 'Hector Mine', 3.2, true),
  row('SURE', 'dzw', 'FNC', 'Hector Mine', 64, true),
  row('SURE', 'scarp_height', 'SH', 'Hector Mine', 0.9, true),
];

function keys(rows: readonly FieldRow[]): string[] {
  return rows.map((r) => `${r.source}/${r.analogue}/${r.eqName}/${r.value}`);
}

describe('overlayRows', () => {
  test('scarp-height default set: the scarp-height rows with labeled_set true', () => {
    assert.deepEqual(keys(overlayRows(ROWS, 'scarp_height', false)), [
      'FDHI/scarp_height/Kashmir/2.1',
      'Kern/scarp_height/Kern County (1952)/0.6',
      'SURE/scarp_height/Hector Mine/0.9',
    ]);
  });

  test('width default set: labeled_set true and criterion_sub50 met (50.0 m is not met)', () => {
    assert.deepEqual(keys(overlayRows(ROWS, 'dzw', false)), [
      'FDHI/dzw/Kashmir/12.5',
      'Kern/dzw/Kern County (1952)/8',
      'SURE/dzw/Hector Mine/3.2',
    ]);
  });

  test('show-all: every row of the panel analogue, labeled or not, any criterion', () => {
    assert.deepEqual(keys(overlayRows(ROWS, 'scarp_height', true)), [
      'FDHI/scarp_height/Kashmir/2.1',
      'FDHI/scarp_height/Landers/1.4',
      'Kern/scarp_height/Kern County (1952)/0.6',
      'SURE/scarp_height/Hector Mine/0.9',
    ]);
    assert.deepEqual(keys(overlayRows(ROWS, 'dzw', true)), [
      'FDHI/dzw/Kashmir/12.5',
      'FDHI/dzw/Landers/30',
      'FDHI/dzw/Wenchuan/50',
      'FDHI/dzw/Wenchuan/120',
      'Kern/dzw/Kern County (1952)/8',
      'Kern/dzw/Kern County (1952)/75',
      'SURE/dzw/Hector Mine/3.2',
      'SURE/dzw/Hector Mine/64',
    ]);
  });

  test('the scarp-dip panel draws no row', () => {
    assert.deepEqual(overlayRows(ROWS, 'scarp_dip', false), []);
    assert.deepEqual(overlayRows(ROWS, 'scarp_dip', true), []);
  });

  test('the same rows, measurement, and showAll give the same array (fieldTableSpec memo)', () => {
    assert.equal(overlayRows(ROWS, 'dzw', false), overlayRows(ROWS, 'dzw', false));
    assert.equal(overlayRows(ROWS, 'dzw', true), overlayRows(ROWS, 'dzw', true));
    assert.notEqual(overlayRows(ROWS, 'dzw', false), overlayRows(ROWS, 'dzw', true));
    const spec = fieldTableSpec(overlayRows(ROWS, 'dzw', true), fieldOrder('dzw'));
    assert.equal(fieldTableSpec(overlayRows(ROWS, 'dzw', true), fieldOrder('dzw')), spec);
  });
});

describe('overlayGroups', () => {
  test('one group per (source, source_quantity), never pooled, in the PDD §4.4 order', () => {
    const height = overlayGroups(overlayRows(ROWS, 'scarp_height', true));
    assert.deepEqual(
      height.map((g) => [g.source, g.sourceQuantity, g.label, g.link, g.rows.length]),
      [
        ['FDHI', 'vs_central_meters', 'FDHI vertical separation', '../data/#fdhi-flatfile', 2],
        ['SURE', 'SH', "SURE's scarp-height measurement", '../data/#sure-database', 1],
        ['Kern', 'Vertical', "Kern County's vertical scarp-height values", '../data/#kern-county-1952', 1],
      ],
    );
    const width = overlayGroups(overlayRows(ROWS, 'dzw', true));
    assert.deepEqual(
      width.map((g) => [g.source, g.sourceQuantity, g.label, g.link, g.rows.length]),
      [
        ['FDHI', 'fzw_central_meters', 'FDHI fault-zone width', '../data/#fdhi-flatfile', 4],
        ['Kern', 'DZW', 'Kern County deformation-zone width', '../data/#kern-county-1952', 2],
        ['SURE', 'FNC', 'SURE fault-normal component', '../data/#sure-database', 2],
      ],
    );
    // Every row lands in the group of its own pair, none pooled with another.
    for (const g of [...height, ...width]) {
      for (const r of g.rows) {
        assert.equal(r.source, g.source);
        assert.equal(r.sourceQuantity, g.sourceQuantity);
      }
    }
  });

  test('groups carry limited_comparison: true exactly for SURE FNC', () => {
    const width = overlayGroups(overlayRows(ROWS, 'dzw', false));
    assert.deepEqual(
      width.map((g) => [g.source, g.limitedComparison]),
      [
        ['FDHI', false],
        ['Kern', false],
        ['SURE', true],
      ],
    );
    for (const g of overlayGroups(overlayRows(ROWS, 'scarp_height', true))) {
      assert.equal(g.limitedComparison, false);
    }
  });

  test('only pairs present form groups; no rows give no group', () => {
    const sureOnly = ROWS.filter((r) => r.source === 'SURE' && r.analogue === 'dzw');
    assert.deepEqual(
      overlayGroups(sureOnly).map((g) => g.source),
      ['SURE'],
    );
    assert.deepEqual(overlayGroups([]), []);
  });

  test('a row whose pair the §5.8 table does not list throws', () => {
    assert.throws(() => overlayGroups([row('FDHI', 'scarp_height', 'sh_central_meters', 'X', 1, true)]), /no group/);
  });
});

describe('overlayNote', () => {
  test('scarp dip: the PDD §4.4 note; the other two measurements: null', () => {
    assert.equal(overlayNote('scarp_dip'), 'Field sources provide no comparable scarp-dip measurement.');
    assert.equal(overlayNote('scarp_height'), null);
    assert.equal(overlayNote('dzw'), null);
  });
});
