// downloads.test.ts (docs/app/ddd.md §7.4, the `downloads.test.ts` row;
// §5.9 Downloads): `buildPackage(input, stamps, generatedAt)` of
// src/download/package.ts with a fixed `generatedAt`, on injected
// `RenderInput`s over fixture vintages that test/fixtures.ts builds and
// the real decoder decodes.
//
// - The members exactly `records.csv`, `statistics.csv`, `provenance.txt`,
//   `scenario.json`, in that order; both CSV column orders.
// - `records.csv` values by the §5.9 integer rule — `s = −182` at 3
//   decimals as `-0.182`, slip at 4 decimals, a null and an unclassified
//   record's `scarp_class` as empty fields; for N = 100 and N = 102, a
//   two-trial input selecting indices N − 1, N, and 2N − 1 writes the
//   first, second, and second trial's names and site conditions.
// - The `statistics.csv` display columns equal `displayRound` of the
//   injected values; both version stamps.
// - The nine provenance label lines in the PDD §6.1 order, block 5 equal
//   to `settingsText` of the snapshot, block 8 the `generatedAt` instant;
//   on an offset-mode input with a `partly_out` dip and a converted window
//   starting below `t_s`, block 9 equal, line for line, to the `caveats`
//   of `selectNotices` for the same input, and `converted_windows` equal
//   to the selected dips' injected `windows` entries and `flags`, null in
//   slip mode.
// - `scenario.json`'s `scenario` equal to
//   `JSON.parse(serializeScenario(snapshot, manifest))`.
// - No field row in any member when `field` is set; a header-only records
//   file for an empty match; nothing of one `RenderInput` in a package
//   built from another.
//
// Statistics and counts are injected, never computed here: these check
// serialization, not calculation (§7.4, pipeline-first rule).

import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';

import * as config from '../src/config';
import type { RangeFlag } from '../src/convert/convert';
import type { Vintage } from '../src/decode/decode';
import type { FieldRow } from '../src/decode/fields';
import { RECORDS_CSV_COLUMNS, STATISTICS_CSV_COLUMNS } from '../src/decode/fields';
import { recordedDecimal } from '../src/download/csv';
import { downloadFileName } from '../src/download/file-name';
import { PACKAGE_MEMBER_NAMES, buildPackage, type VersionStamps } from '../src/download/package';
import type { PerDipWindows } from '../src/engine/query';
import { canonicalJson, serializeScenario } from '../src/state/scenario-json';
import { MEASUREMENT_NAMES, defaultScenario, type MeasurementName, type Scenario } from '../src/state/state';
import type { Stats } from '../src/stats/stats';
import { measurementLabel } from '../src/views/chart-text';
import { CAVEAT_KEYS, noticeText, selectNotices } from '../src/views/notices';
import { displayRound } from '../src/views/format';
import type { MeasurementResult, RenderInput } from '../src/views/render-input';
import { settingsText } from '../src/views/summary';
import { buildFixture, decodeFixture, type FixtureSpec } from './fixtures';

// --------------------------------------------------------------------
// Fixtures
// --------------------------------------------------------------------

/** The one instant of every package here: 12:34:57 UTC. */
const AT = new Date('2026-11-03T12:34:57Z');

const STAMPS: VersionStamps = { softwareVersion: '0.4.0-test', dataVersion: 'data-v0-test' };

/** The trial rows of the two-trial vintage, its second cohesion holding a comma (RFC 4180 quoting). */
function trialRows(prefix: string): FixtureSpec['trials'] {
  return [
    [`${prefix}-a`, 30, 'Strong', 'c1', 'Homogeneous', 3, 'Dense'],
    [`${prefix}-b`, 60, 'Weak', 'c,2', 'Heterogeneous', 10, 'Loose'],
  ];
}

/**
 * A two-trial vintage of N stages per trial. Trial 0's last stage
 * (index N − 1) records `scarp_height` −182 (−0.182 m) and scarp dip
 * −12.529°; trial 1's first stage (index N) is the unclassified slip-0.0005
 * stage with every measurement null; trial 1's last stage (2N − 1) has a
 * null `dzw`.
 */
function twoTrialSpec(n: number, prefix: string): FixtureSpec {
  const stages = {
    slip: [] as number[],
    scarp_height: [] as (number | null)[],
    dzw: [] as (number | null)[],
    scarp_dip: [] as (number | null)[],
    scarp_class: [] as (string | null)[],
  };
  for (let t = 0; t < 2; t++) {
    for (let k = 0; k < n; k++) {
      const first = k === 0;
      const last = k === n - 1;
      stages.slip.push(t * 5 + k * 100);
      stages.scarp_height.push(first ? null : t === 0 && last ? -182 : k);
      stages.dzw.push(first || (t === 1 && last) ? null : 1000 + k);
      stages.scarp_dip.push(first ? null : t === 0 && last ? -12529 : t === 1 && last ? 45000 : 30000 + k);
      stages.scarp_class.push(first ? null : t === 0 && last ? 'Simple' : t === 1 && last ? 'Pressure Ridge' : 'Monoclinal');
    }
  }
  return {
    stagesPerTrial: n,
    scarpClasses: ['Monoclinal', 'Monoclinal Collapse', 'Pressure Ridge', 'Pressure Ridge Collapse', 'Simple', 'Simple Collapse'],
    trials: trialRows(prefix),
    stages,
  };
}

const vintages = new Map<string, Vintage>();

before(async () => {
  vintages.set('N100', await decodeFixture(await buildFixture(twoTrialSpec(100, 'T'))));
  vintages.set('N102', await decodeFixture(await buildFixture(twoTrialSpec(102, 'T'))));
  vintages.set(
    'other',
    await decodeFixture(
      await buildFixture(twoTrialSpec(102, 'Q'), { exportVersion: 'data-v9-other', exportDate: '2027-05-06T07:08:09Z' }),
    ),
  );
});

function vintage(key: string): Vintage {
  const v = vintages.get(key);
  if (v === undefined) throw new Error(`no fixture vintage ${key}`);
  return v;
}

/** Injected statistics: scarp height with a null `sd`, width with none at valid 0, dip with all seven. */
const STATS: { readonly [m in MeasurementName]: Stats | null } = {
  scarp_height: { median: 1.2345, p16: 0.5, p84: 2.675, min: -0.182, max: 5.029, mean: 0.1 + 0.2, sd: null },
  dzw: null,
  scarp_dip: { median: 44.9995, p16: 30.5, p84: 60.25, min: -12.529, max: 89.765, mean: 45.0000001, sd: 12.3456789 },
};

interface InputSpec {
  readonly vintage: Vintage;
  readonly indices?: readonly number[];
  readonly matching?: number;
  readonly valid?: { readonly [m in MeasurementName]: number };
  readonly stats?: { readonly [m in MeasurementName]: Stats | null };
  readonly scenario?: Partial<Scenario>;
  readonly windows?: PerDipWindows | null;
  readonly flags?: readonly { readonly faultDip: number; readonly rangeFlag: RangeFlag }[] | null;
  readonly field?: RenderInput['field'];
}

/** An injected `RenderInput` over a real decoded vintage; counts and statistics injected. */
function inputOf(spec: InputSpec): RenderInput {
  const indices = Uint32Array.from(spec.indices ?? []);
  const matching = spec.matching ?? indices.length;
  const valid = spec.valid ?? { scarp_height: 2, dzw: 0, scarp_dip: 2 };
  const stats = spec.stats ?? STATS;
  const perMeasurement = {} as { [m in MeasurementName]: { valid: number; excludedNull: number } };
  const measurements = {} as { [m in MeasurementName]: MeasurementResult };
  for (const m of MEASUREMENT_NAMES) {
    perMeasurement[m] = { valid: valid[m], excludedNull: matching - valid[m] };
    measurements[m] = { values: null, stats: stats[m], histogram: null } as unknown as MeasurementResult;
  }
  return {
    selection: {
      indices,
      matchingRecords: matching,
      unclassified: 0,
      perMeasurement,
      diagnosedConditions: matching === 0 ? [] : null,
    },
    measurements,
    histogramLog: null,
    scenario: { ...defaultScenario(spec.vintage.manifest), ...spec.scenario },
    sequence: 7,
    vintage: spec.vintage,
    windows: spec.windows ?? null,
    flags: spec.flags ?? null,
    regression: null,
    field: spec.field ?? null,
  };
}

/** The members of a stored ZIP, read from its local headers in order (method 0 only). */
function readStored(bytes: Uint8Array): { name: string; bytes: Uint8Array }[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: { name: string; bytes: Uint8Array }[] = [];
  let p = 0;
  while (view.getUint32(p, true) === 0x04034b50) {
    assert.equal(view.getUint16(p + 8, true), 0, 'method 0 (stored)');
    const size = view.getUint32(p + 18, true);
    const nameLength = view.getUint16(p + 26, true);
    const extraLength = view.getUint16(p + 28, true);
    const nameStart = p + 30;
    const dataStart = nameStart + nameLength + extraLength;
    out.push({
      name: new TextDecoder().decode(bytes.subarray(nameStart, nameStart + nameLength)),
      bytes: bytes.subarray(dataStart, dataStart + size),
    });
    p = dataStart + size;
  }
  assert.equal(view.getUint32(p, true), 0x02014b50, 'the central directory follows the last member');
  return out;
}

/** The package's members as text, by name, checking UTF-8 without a byte-order mark. */
function members(input: RenderInput): Map<string, string> {
  const pkg = buildPackage(input, STAMPS, AT);
  const out = new Map<string, string>();
  for (const m of readStored(pkg.bytes)) {
    assert.ok(!(m.bytes[0] === 0xef && m.bytes[1] === 0xbb && m.bytes[2] === 0xbf), `${m.name} has no byte-order mark`);
    out.set(m.name, new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(m.bytes));
  }
  return out;
}

function member(input: RenderInput, name: string): string {
  const text = members(input).get(name);
  if (text === undefined) throw new Error(`no member ${name}`);
  return text;
}

/** The blocks of `provenance.txt`: each its lines without the closing empty line. */
function provenanceBlocks(text: string): string[][] {
  assert.ok(text.endsWith('\n\n'), 'the last block ends in its empty line');
  const blocks = text.slice(0, -2).split('\n\n');
  return blocks.map((b) => b.split('\n'));
}

/** An offset-mode input: dips 30 and 60, dip 30's window starting below `t_s`, dip 60 `partly_out`. */
function offsetInput(field: RenderInput['field'] = null): RenderInput {
  return inputOf({
    vintage: vintage('N100'),
    indices: [1, 2],
    scenario: { faultDip: [30, 60], window: { mode: 'offset', offsetMax: '2' } },
    // Injected out of dip order: the package writes the selected dips ascending.
    windows: [
      { faultDip: 60, lo: 2.5, hi: 5.623 },
      { faultDip: 30, lo: 0.1 + 0.2, hi: 1.5 },
    ],
    flags: [
      { faultDip: 60, rangeFlag: 'partly_out' },
      { faultDip: 30, rangeFlag: 'in_range' },
    ],
    field,
  });
}

// --------------------------------------------------------------------
// Members
// --------------------------------------------------------------------

describe('buildPackage: the archive', () => {
  test('the members are exactly records.csv, statistics.csv, provenance.txt, scenario.json, in that order', () => {
    const pkg = buildPackage(inputOf({ vintage: vintage('N100'), indices: [1] }), STAMPS, AT);
    assert.deepEqual(
      readStored(pkg.bytes).map((m) => m.name),
      ['records.csv', 'statistics.csv', 'provenance.txt', 'scenario.json'],
    );
    assert.deepEqual([...PACKAGE_MEMBER_NAMES], ['records.csv', 'statistics.csv', 'provenance.txt', 'scenario.json']);
  });

  test('the file name is the DD-6 name of the snapshot', () => {
    const input = inputOf({ vintage: vintage('N100'), indices: [1], scenario: { faultDip: [30] } });
    const pkg = buildPackage(input, STAMPS, AT);
    assert.equal(pkg.fileName, downloadFileName(input.scenario, input.vintage.manifest, AT));
    assert.equal(pkg.fileName, 'ground-rupture-explorer_dip-30_all-stages_data-v0-test_2026-11-03.zip');
  });

  test('the same input and instant give identical bytes', () => {
    const input = offsetInput();
    assert.deepEqual(buildPackage(input, STAMPS, AT).bytes, buildPackage(input, STAMPS, AT).bytes);
  });
});

// --------------------------------------------------------------------
// records.csv
// --------------------------------------------------------------------

const RECORDS_HEADER =
  'trial,fault_dip,sediment_strength,cohesion,set,depth,density,slip,scarp_height,dzw,scarp_dip,scarp_class';
const STATISTICS_HEADER =
  'measurement,label,valid,excluded_null,median,p16,p84,min,max,mean,sd,' +
  'median_full,p16_full,p84_full,min_full,max_full,mean_full,sd_full';

describe('records.csv', () => {
  test('the header is RECORDS_CSV_COLUMNS, the §5.9 order', () => {
    const lines = member(inputOf({ vintage: vintage('N100'), indices: [1] }), 'records.csv').split('\n');
    assert.equal(lines[0], RECORDS_HEADER);
    assert.equal(lines[0], RECORDS_CSV_COLUMNS.join(','));
  });

  test('the integer rule: −182 at 3 decimals is -0.182; slip at 4 decimals', () => {
    assert.equal(recordedDecimal(-182, 3), '-0.182');
    assert.equal(recordedDecimal(9900, 4), '0.9900');
    assert.equal(recordedDecimal(5, 4), '0.0005');
    assert.equal(recordedDecimal(0, 3), '0.000');
    assert.equal(recordedDecimal(45000, 3), '45.000');
    assert.equal(recordedDecimal(-12529, 3), '-12.529');
  });

  for (const n of [100, 102]) {
    test(`N = ${n}: indices N − 1, N, and 2N − 1 write the first, second, and second trial`, () => {
      const v = vintage(`N${n}`);
      assert.equal(v.manifest.counts.stagesPerTrial, n);
      const text = member(inputOf({ vintage: v, indices: [n - 1, n, 2 * n - 1] }), 'records.csv');
      const slip = (steps: number): string => recordedDecimal(steps, 4);
      assert.equal(
        text,
        [
          RECORDS_HEADER,
          // Trial 0's last stage: s = −182 at 3 decimals, slip at 4 decimals.
          `T-a,30,Strong,c1,Homogeneous,3,Dense,${slip((n - 1) * 100)},-0.182,${recordedDecimal(1000 + n - 1, 3)},-12.529,Simple`,
          // Trial 1's first stage: unclassified, every measurement null.
          'T-b,60,Weak,"c,2",Heterogeneous,10,Loose,0.0005,,,,',
          // Trial 1's last stage: a null dzw in a classified record.
          `T-b,60,Weak,"c,2",Heterogeneous,10,Loose,${slip(5 + (n - 1) * 100)},${recordedDecimal(n - 1, 3)},,45.000,Pressure Ridge`,
          '',
        ].join('\n'),
      );
      if (n === 100) {
        assert.ok(text.includes(',0.9900,-0.182,'), 'slip with its 4 fraction digits, then -0.182');
      }
    });
  }

  test('an empty match gives the header row only', () => {
    const text = member(inputOf({ vintage: vintage('N100'), indices: [], matching: 0 }), 'records.csv');
    assert.equal(text, `${RECORDS_HEADER}\n`);
  });
});

// --------------------------------------------------------------------
// statistics.csv
// --------------------------------------------------------------------

describe('statistics.csv', () => {
  test('the header is STATISTICS_CSV_COLUMNS, the §5.9 order', () => {
    const lines = member(inputOf({ vintage: vintage('N100'), indices: [1] }), 'statistics.csv').split('\n');
    assert.equal(lines[0], STATISTICS_HEADER);
    assert.equal(lines[0], STATISTICS_CSV_COLUMNS.join(','));
  });

  test('one row per panel in canonical order; display columns equal displayRound, full columns toString', () => {
    const valid = { scarp_height: 1234, dzw: 0, scarp_dip: 3434 };
    const text = member(
      inputOf({ vintage: vintage('N100'), indices: [1], matching: 5000, valid }),
      'statistics.csv',
    );
    const rows = text.split('\n');
    assert.equal(rows.length, 5, 'header, three rows, and the final LF');
    assert.equal(rows[4], '');
    const keys = ['median', 'p16', 'p84', 'min', 'max', 'mean', 'sd'] as const;
    MEASUREMENT_NAMES.forEach((m, k) => {
      const fields = rows[k + 1].split(',');
      assert.equal(fields.length, STATISTICS_CSV_COLUMNS.length);
      assert.equal(fields[0], m);
      assert.equal(fields[1], measurementLabel(m));
      assert.equal(fields[2], String(valid[m]), 'counts as plain digits, no separator');
      assert.equal(fields[3], String(5000 - valid[m]));
      const stats = STATS[m];
      keys.forEach((key, j) => {
        const v = stats === null ? null : stats[key];
        const display = fields[4 + j];
        const full = fields[11 + j];
        if (v === null) {
          assert.equal(display, '', `${m} ${key}: a null is an empty field`);
          assert.equal(full, '', `${m} ${key}_full: a null is an empty field`);
        } else {
          assert.equal(display, displayRound(v, config.displayDecimals(m)), `${m} ${key}`);
          assert.equal(full, v.toString(), `${m} ${key}_full`);
        }
      });
    });
    assert.ok(text.includes(',0.30000000000000004,'), 'the full mean by Number.prototype.toString');
    assert.ok(rows[3].includes(',3434,'), 'a count of four digits without a thousands separator');
  });
});

// --------------------------------------------------------------------
// provenance.txt
// --------------------------------------------------------------------

describe('provenance.txt', () => {
  test('the nine label lines in the PDD §6.1 order, each block closed by an empty line', () => {
    const text = member(inputOf({ vintage: vintage('N100'), indices: [1] }), 'provenance.txt');
    const blocks = provenanceBlocks(text);
    assert.deepEqual(
      blocks.map((b) => b[0]),
      [
        'Paper citation',
        'DesignSafe DOIs',
        'Software version',
        'Data-export version and date',
        'Scenario settings',
        'Population',
        'Counts',
        'Generated (UTC)',
        'Caveats',
      ],
    );
    assert.ok(!text.includes('\r'), 'LF line ends');
  });

  test('blocks 1–8: citation, DOIs, both version stamps, settings, population, counts, instant', () => {
    const input = inputOf({
      vintage: vintage('N100'),
      indices: [1],
      matching: 3434,
      valid: { scarp_height: 3000, dzw: 0, scarp_dip: 1234 },
      scenario: { faultDip: [30], population: 'one_state_per_trial' },
    });
    const blocks = provenanceBlocks(member(input, 'provenance.txt'));
    const manifest = input.vintage.manifest;
    assert.equal(blocks[0].length, 2);
    assert.match(blocks[0][1], /^Chiama, K\., Bednarz, W\., .*DOI: 10\.1177\/87552930251346434$/);
    assert.equal(blocks[1].length, 3);
    assert.match(blocks[1][1], /DOI: 10\.17603\/ds2-xpq0-gw80$/);
    assert.match(blocks[1][2], /DOI: 10\.17603\/ds2-gfsj-pp60$/);
    assert.deepEqual(blocks[2], ['Software version', STAMPS.softwareVersion]);
    assert.deepEqual(blocks[3], ['Data-export version and date', `${manifest.exportVersion} (${manifest.exportDate})`]);
    assert.deepEqual(blocks[4], ['Scenario settings', settingsText({ scenario: input.scenario, manifest })]);
    assert.deepEqual(blocks[5], ['Population', 'one state per simulation trial']);
    assert.deepEqual(blocks[6], [
      'Counts',
      'matching records: 3,434',
      `${measurementLabel('scarp_height')}: N = 3,000`,
      `${measurementLabel('dzw')}: N = 0`,
      `${measurementLabel('scarp_dip')}: N = 1,234`,
    ]);
    assert.deepEqual(blocks[7], ['Generated (UTC)', '2026-11-03T12:34:57Z']);
  });

  test('block 9, offset mode: the caveats of selectNotices for the same input, line for line', () => {
    const input = offsetInput();
    const caveats = selectNotices(input, config).caveats;
    assert.deepEqual(
      caveats.map((c) => c.key),
      [CAVEAT_KEYS.scarpDip, CAVEAT_KEYS.lowSlip, CAVEAT_KEYS.perDip],
      'the fixture fires the scarp-dip notice, the low-slip caveat, and one per-dip line',
    );
    const blocks = provenanceBlocks(member(input, 'provenance.txt'));
    assert.deepEqual(blocks[8], ['Caveats', ...caveats.map((c) => noticeText(c).split('**').join(''))]);
    assert.ok(blocks[8][3].startsWith('60°: converted slip ≈ 5.62 m'));
  });

  test('block 9, slip mode: the scarp-dip notice alone while D-5 stands', () => {
    const input = inputOf({ vintage: vintage('N100'), indices: [1] });
    const blocks = provenanceBlocks(member(input, 'provenance.txt'));
    assert.deepEqual(blocks[8], ['Caveats', ...selectNotices(input, config).caveats.map(noticeText)]);
    assert.equal(blocks[8].length, 2);
  });
});

// --------------------------------------------------------------------
// scenario.json
// --------------------------------------------------------------------

describe('scenario.json', () => {
  test('slip mode: canonical JSON of the five keys plus one LF; converted_windows null', () => {
    const input = inputOf({
      vintage: vintage('N100'),
      indices: [1],
      scenario: { window: { mode: 'slip', min: '0.5', max: '3' }, depth: [3] },
    });
    const text = member(input, 'scenario.json');
    assert.ok(text.endsWith('}\n') && !text.endsWith('\n\n'), 'one LF');
    const parsed = JSON.parse(text);
    const scenario = JSON.parse(serializeScenario(input.scenario, input.vintage.manifest));
    assert.deepEqual(parsed, {
      schema_version: 1,
      software_version: STAMPS.softwareVersion,
      export_version: input.vintage.manifest.exportVersion,
      scenario,
      converted_windows: null,
    });
    assert.deepEqual(parsed.scenario, scenario);
    assert.equal(text, canonicalJson(parsed) + '\n');
  });

  test('offset mode: converted_windows are the selected dips’ injected windows and flags, ascending', () => {
    const input = offsetInput();
    const text = member(input, 'scenario.json');
    const parsed = JSON.parse(text);
    assert.deepEqual(parsed.converted_windows, [
      { fault_dip: 30, window_lo: 0.1 + 0.2, window_hi: 1.5, range_flag: 'in_range' },
      { fault_dip: 60, window_lo: 2.5, window_hi: 5.623, range_flag: 'partly_out' },
    ]);
    assert.ok(text.includes(`"window_lo":${(0.1 + 0.2).toString()}`), 'floats by Number.prototype.toString');
    assert.deepEqual(parsed.scenario, JSON.parse(serializeScenario(input.scenario, input.vintage.manifest)));
    assert.equal(text, canonicalJson(parsed) + '\n');
  });
});

// --------------------------------------------------------------------
// The consistency invariant
// --------------------------------------------------------------------

describe('the consistency invariant', () => {
  const MARKER = 'Field-row-marker-Zq9';
  const fieldRows: FieldRow[] = [
    {
      source: MARKER,
      eqName: `${MARKER} quake`,
      magnitude: 6.5,
      analogue: 'scarp_height',
      sourceQuantity: MARKER,
      value: 98765.4321,
      limitedComparison: false,
      criterionSub50: 'met',
      labeledSet: true,
      kernFieldGroup: null,
    },
  ];

  test('no field row in any member when `field` is set, and `field` is never read', () => {
    const input = offsetInput(fieldRows);
    let reads = 0;
    const guarded = new Proxy(input, {
      get(target, key, receiver) {
        if (key === 'field') reads++;
        return Reflect.get(target, key, receiver);
      },
    });
    const pkg = buildPackage(guarded, STAMPS, AT);
    assert.equal(reads, 0, 'buildPackage never reads `field`');
    for (const m of readStored(pkg.bytes)) {
      const text = new TextDecoder().decode(m.bytes);
      assert.ok(!text.includes(MARKER), `${m.name} holds no field row`);
      assert.ok(!text.includes('98765'), `${m.name} holds no field value`);
    }
    assert.deepEqual(pkg.bytes, buildPackage(offsetInput(null), STAMPS, AT).bytes, 'the same bytes with field null');
  });

  test('a package built from one RenderInput contains nothing of another', () => {
    const statsB: { [m in MeasurementName]: Stats | null } = {
      scarp_height: { median: 7.7771, p16: 7.7772, p84: 7.7773, min: 7.7774, max: 7.7775, mean: 7.7776, sd: 7.7777 },
      dzw: null,
      scarp_dip: null,
    };
    const a = inputOf({ vintage: vintage('N100'), indices: [99, 100], scenario: { faultDip: [30] } });
    const b = inputOf({
      vintage: vintage('other'),
      indices: [101, 203],
      matching: 2,
      valid: { scarp_height: 2, dzw: 0, scarp_dip: 0 },
      stats: statsB,
      scenario: { faultDip: [60], window: { mode: 'slip', min: '0.375', max: '0.875' } },
    });
    const first = buildPackage(a, STAMPS, AT);
    const other = buildPackage(b, STAMPS, AT);
    const again = buildPackage(a, STAMPS, AT);
    assert.deepEqual(again.bytes, first.bytes, 'building another package between leaves this one unchanged');
    assert.notEqual(other.fileName, first.fileName);
    const textA = readStored(first.bytes)
      .map((m) => new TextDecoder().decode(m.bytes))
      .join('\n');
    for (const fromB of ['Q-a', 'Q-b', 'data-v9-other', '2027-05-06', '7.777', '0.375', '0p375', 'dip-60']) {
      assert.ok(!textA.includes(fromB), `package A holds nothing of B (${fromB})`);
      assert.ok(!first.fileName.includes(fromB), `A's file name holds nothing of B (${fromB})`);
    }
    const textB = readStored(other.bytes)
      .map((m) => new TextDecoder().decode(m.bytes))
      .join('\n');
    assert.ok(textB.includes('Q-b') && textB.includes('data-v9-other'), 'package B describes B');
    assert.ok(!textB.includes('T-a') && !textB.includes('1.2345'), 'package B holds nothing of A');
  });
});
