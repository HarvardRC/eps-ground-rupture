// README.txt of the guided download (G-30): what it names, its form, and
// how test/zipcheck.py holds the guided layouts to it.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { RECORDS_CSV_COLUMNS, STATISTICS_CSV_COLUMNS } from '../src/decode/fields';
import { PACKAGE_MEMBER_NAMES } from '../src/download/package';
import { zip, type ZipMember } from '../src/download/zip';
import { GUIDED_FALLBACK_MEMBER_NAMES, GUIDED_MEMBER_NAMES } from '../src/explore/report';
import { README_MEMBER, readmeStatisticsColumns, readmeText, RECORDS_COLUMN_TEXTS } from '../src/explore/readme';
import { copyText } from '../src/views/copy';

const WEBAPP_DIR = fileURLToPath(new URL('../../', import.meta.url));
const OUT = fileURLToPath(new URL('./readme/', import.meta.url));
const AT = new Date('2026-11-09T12:00:00Z');
const AT_ISO = '2026-11-09T12:00:00Z';

/** The entry names: lines that start a member or column entry (unindented, not a sentence). */
const names = (text: string): string[] => text.split('\n').filter(line => line !== '' && !line.startsWith('  ')).flatMap(line => line.split(', '));

describe('README.txt (G-30)', () => {
  test('it opens the guided archive and names every member, the report only when carried', () => {
    assert.equal(GUIDED_MEMBER_NAMES[0], README_MEMBER);
    assert.deepEqual([...GUIDED_FALLBACK_MEMBER_NAMES], [README_MEMBER, ...PACKAGE_MEMBER_NAMES]);
    const full = names(readmeText(true));
    for (const member of GUIDED_MEMBER_NAMES) assert.ok(full.includes(member), member);
    const fallback = readmeText(false);
    for (const member of GUIDED_FALLBACK_MEMBER_NAMES) assert.ok(names(fallback).includes(member), member);
    assert.ok(!fallback.includes('report.docx'), 'the fallback README never mentions the absent report');
    assert.ok(!fallback.includes('Word report'));
  });

  test('it describes every records.csv and statistics.csv column, in the files’ order', () => {
    const text = readmeText(true);
    const listed = names(text);
    assert.deepEqual(Object.keys(RECORDS_COLUMN_TEXTS), [...RECORDS_CSV_COLUMNS]);
    const recordsAt = RECORDS_CSV_COLUMNS.map(column => listed.indexOf(column));
    assert.ok(recordsAt.every((at, i) => at >= 0 && (i === 0 || at > recordsAt[i - 1]!)), 'records.csv columns in order');
    assert.deepEqual([...readmeStatisticsColumns()].sort(), [...STATISTICS_CSV_COLUMNS].sort());
    for (const column of STATISTICS_CSV_COLUMNS) assert.ok(listed.includes(column), column);
  });

  test('plain text: LF line ends, a final LF, no tab, and the pointer to provenance.txt', () => {
    for (const text of [readmeText(true), readmeText(false)]) {
      assert.ok(!text.includes('\r') && !text.includes('\t'));
      assert.ok(text.endsWith('\n') && !text.endsWith('\n\n'));
      assert.ok(text.startsWith('Ground Rupture Explorer — scenario download\n\n'));
      assert.ok(text.endsWith('The citation, the caveats, and the licences of these files are in provenance.txt.\n'));
    }
  });

  test('the page’s own wording carries the measurements', () => {
    const text = readmeText(true);
    assert.ok(text.includes('The thickness of the sediment above bedrock.'));
    assert.ok(text.includes('The middle of the sorted measurements, also called the 50th percentile.'));
    assert.ok(text.includes('They bound the middle 68% of the distribution.'));
  });
});

describe('zipcheck.py and README.txt', () => {
  function zipcheck(args: readonly string[]): { status: number | null; output: string } {
    const run = spawnSync('python3', ['-I', 'test/zipcheck.py', ...args], { cwd: WEBAPP_DIR, encoding: 'utf8' });
    assert.equal(run.error, undefined, `python3 must run: ${String(run.error)}`);
    return { status: run.status, output: `${run.stdout}${run.stderr}` };
  }
  const encoder = new TextEncoder();
  const LICENCES = ['ddd5.9.labelLicences', 'ddd5.9.licenceData', 'ddd5.9.licenceWorks', 'ddd5.9.licenceNotice'].map(key => `${copyText(key)}\n`).join('') + '\n';
  const members = (readme: string): ZipMember[] => [
    { name: README_MEMBER, bytes: encoder.encode(readme) },
    { name: 'records.csv', bytes: encoder.encode(`${RECORDS_CSV_COLUMNS.join(',')}\n`) },
    { name: 'statistics.csv', bytes: encoder.encode(`${STATISTICS_CSV_COLUMNS.join(',')}\n`) },
    { name: 'provenance.txt', bytes: encoder.encode(LICENCES) },
    { name: 'scenario.json', bytes: encoder.encode('{}\n') },
  ];
  const layout = `--members=${GUIDED_FALLBACK_MEMBER_NAMES.join(',')}`;
  const check = (readme: string, name: string) => {
    mkdirSync(OUT, { recursive: true });
    const file = `${OUT}${name}.zip`;
    writeFileSync(file, zip(members(readme), AT));
    return zipcheck([layout, file, AT_ISO]);
  };

  test('the fallback layout with its README passes', () => {
    const ok = check(readmeText(false), 'ok');
    assert.equal(ok.status, 0, ok.output);
  });

  test('a README that misses a column, names an absent report, or has CR line ends fails', () => {
    const missing = check(readmeText(false).replace('\nscarp_dip\n', '\nscarp_dip_\n'), 'missing');
    assert.equal(missing.status, 1);
    assert.match(missing.output, /does not describe the records\.csv columns \['scarp_dip'\]/);
    const report = check(readmeText(true), 'report');
    assert.equal(report.status, 1);
    assert.match(report.output, /names report\.docx, which the archive does not carry/);
    const crlf = check(readmeText(false).split('\n').join('\r\n'), 'crlf');
    assert.equal(crlf.status, 1);
    assert.match(crlf.output, /not LF-ended text/);
  });
});
