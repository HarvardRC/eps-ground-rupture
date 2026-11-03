// zip.test.ts (docs/app/ddd.md §7.4, the `zip.test.ts` row, with
// test/zipcheck.py; §5.9 Package form): `zip(members, modified)` of
// src/download/zip.ts.
//
// - `crc32('123456789')` is 0xCBF43926, and the CRC-32 equals
//   `node:zlib`'s `crc32` on 1,000 buffers from a fixed-seed generator,
//   lengths 0, 1, and 65,536 included.
// - Signatures, offsets, and the end-of-central-directory counts (4
//   entries) are correct, and every header field is the §5.9 one.
// - An independent reader accepts the archive: the test writes
//   `build/test/zip/fixture.zip` and runs
//   `python3 -I test/zipcheck.py <file> <ISO instant> <member SHA-256s>`,
//   which must exit 0; a missing `python3` fails the test, never skips it.
// - The same members and instant give identical bytes; the zip64 limits
//   throw `RangeError`.
//
// The only process this test starts is the local `python3`, on local
// files (§7.4).

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { crc32 as zlibCrc32 } from 'node:zlib';
import { describe, test } from 'node:test';

import { crc32, dosDateTime, zip, type ZipMember } from '../src/download/zip';

/** The subproject directory: this compiled file lives in its build/test/. */
const WEBAPP_DIR = fileURLToPath(new URL('../../', import.meta.url));

/** The archive the independent reader checks (§7.4). */
const FIXTURE_ZIP = fileURLToPath(new URL('./zip/fixture.zip', import.meta.url));

/** An odd second, so the DOS time's 2-second floor shows. */
const AT = new Date('2026-11-03T12:34:57Z');
const AT_ISO = '2026-11-03T12:34:57Z';

/** A fixed-seed generator (mulberry32): unsigned 32-bit integers. */
function generator(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
}

/** The four package members (§5.9) with fixed contents, non-ASCII text and an empty member among them. */
function members(): ZipMember[] {
  const encoder = new TextEncoder();
  return [
    { name: 'records.csv', bytes: encoder.encode('trial,slip\nT-a,0.0005\n') },
    { name: 'statistics.csv', bytes: encoder.encode('measurement,label\nscarp_dip,Scarp dip (°)\n') },
    { name: 'provenance.txt', bytes: encoder.encode('Caveats\n60°: converted slip ≈ 5.62 m — beyond\n\n') },
    { name: 'scenario.json', bytes: new Uint8Array(0) },
  ];
}

describe('crc32', () => {
  test("crc32('123456789') is 0xCBF43926", () => {
    assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  });

  test('equals node:zlib crc32 on 1,000 seeded buffers, lengths 0, 1, and 65,536 included', () => {
    const next = generator(20261103);
    const lengths = [0, 1, 65536];
    while (lengths.length < 1000) lengths.push(next() % 4097);
    for (const length of lengths) {
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i++) bytes[i] = next() & 0xff;
      assert.equal(crc32(bytes), zlibCrc32(bytes), `length ${length}`);
    }
  });
});

describe('zip: the byte format', () => {
  test('signatures, header fields, offsets, and the end-of-central-directory counts', () => {
    const input = members();
    const bytes = zip(input, AT);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const { time, date } = dosDateTime(AT);
    assert.equal(time, (12 << 11) | (34 << 5) | (57 >> 1));
    assert.equal(date, ((2026 - 1980) << 9) | (11 << 5) | 3);

    // Local headers, in member order.
    const offsets: number[] = [];
    let p = 0;
    for (const m of input) {
      offsets.push(p);
      const name = new TextEncoder().encode(m.name);
      assert.equal(view.getUint32(p, true), 0x04034b50, `${m.name}: local signature`);
      assert.equal(view.getUint16(p + 4, true), 20, 'version needed');
      assert.equal(view.getUint16(p + 6, true), 0, 'flags');
      assert.equal(view.getUint16(p + 8, true), 0, 'method stored');
      assert.equal(view.getUint16(p + 10, true), time);
      assert.equal(view.getUint16(p + 12, true), date);
      assert.equal(view.getUint32(p + 14, true), zlibCrc32(m.bytes));
      assert.equal(view.getUint32(p + 18, true), m.bytes.length, 'compressed size');
      assert.equal(view.getUint32(p + 22, true), m.bytes.length, 'uncompressed size');
      assert.equal(view.getUint16(p + 26, true), name.length);
      assert.equal(view.getUint16(p + 28, true), 0, 'extra length');
      assert.deepEqual(bytes.subarray(p + 30, p + 30 + name.length), name);
      assert.deepEqual(bytes.subarray(p + 30 + name.length, p + 30 + name.length + m.bytes.length), m.bytes);
      p += 30 + name.length + m.bytes.length;
    }

    // The central directory, in the same order.
    const centralOffset = p;
    input.forEach((m, k) => {
      const name = new TextEncoder().encode(m.name);
      assert.equal(view.getUint32(p, true), 0x02014b50, `${m.name}: central signature`);
      assert.equal(view.getUint16(p + 4, true), 20, 'version made by');
      assert.equal(view.getUint16(p + 6, true), 20, 'version needed');
      assert.equal(view.getUint16(p + 8, true), 0, 'flags');
      assert.equal(view.getUint16(p + 10, true), 0, 'method');
      assert.equal(view.getUint16(p + 12, true), time);
      assert.equal(view.getUint16(p + 14, true), date);
      assert.equal(view.getUint32(p + 16, true), zlibCrc32(m.bytes));
      assert.equal(view.getUint32(p + 20, true), m.bytes.length);
      assert.equal(view.getUint32(p + 24, true), m.bytes.length);
      assert.equal(view.getUint16(p + 28, true), name.length);
      assert.equal(view.getUint16(p + 30, true), 0, 'extra length');
      assert.equal(view.getUint16(p + 32, true), 0, 'comment length');
      assert.equal(view.getUint16(p + 34, true), 0, 'disk');
      assert.equal(view.getUint16(p + 36, true), 0, 'internal attributes');
      assert.equal(view.getUint32(p + 38, true), 0, 'external attributes');
      assert.equal(view.getUint32(p + 42, true), offsets[k], 'the local-header offset');
      assert.deepEqual(bytes.subarray(p + 46, p + 46 + name.length), name);
      p += 46 + name.length;
    });
    const centralSize = p - centralOffset;

    // The end-of-central-directory record.
    assert.equal(view.getUint32(p, true), 0x06054b50, 'end signature');
    assert.equal(view.getUint16(p + 4, true), 0, 'this disk');
    assert.equal(view.getUint16(p + 6, true), 0, 'the central directory’s disk');
    assert.equal(view.getUint16(p + 8, true), 4, '4 entries on this disk');
    assert.equal(view.getUint16(p + 10, true), 4, '4 entries in total');
    assert.equal(view.getUint32(p + 12, true), centralSize);
    assert.equal(view.getUint32(p + 16, true), centralOffset);
    assert.equal(view.getUint16(p + 20, true), 0, 'comment length');
    assert.equal(p + 22, bytes.length, 'nothing follows the end record');
  });

  test('the same members and instant give identical bytes', () => {
    assert.deepEqual(zip(members(), AT), zip(members(), new Date(AT.getTime())));
  });

  test('the zip64 limits throw RangeError', () => {
    const many: ZipMember[] = Array.from({ length: 0xffff }, () => ({ name: 'a', bytes: new Uint8Array(0) }));
    assert.throws(() => zip(many, AT), RangeError);
    const huge = { name: 'records.csv', bytes: { length: 0xffffffff } as unknown as Uint8Array };
    assert.throws(() => zip([huge], AT), RangeError);
  });
});

describe('zip: the independent reader', () => {
  /** Runs test/zipcheck.py under `python3 -I` from the subproject directory. */
  function zipcheck(args: readonly string[]): { status: number | null; output: string } {
    const run = spawnSync('python3', ['-I', 'test/zipcheck.py', ...args], { cwd: WEBAPP_DIR, encoding: 'utf8' });
    assert.equal(run.error, undefined, `python3 must run: ${String(run.error)}`);
    return { status: run.status, output: `${run.stdout}${run.stderr}` };
  }

  test('zipcheck.py accepts the archive: names, stored, flags 0, the instant floored to 2 s, the digests', () => {
    const input = members();
    mkdirSync(fileURLToPath(new URL('./zip/', import.meta.url)), { recursive: true });
    writeFileSync(FIXTURE_ZIP, zip(input, AT));
    const digests = input.map((m) => createHash('sha256').update(m.bytes).digest('hex'));
    const ok = zipcheck([FIXTURE_ZIP, AT_ISO, ...digests]);
    assert.equal(ok.status, 0, ok.output);
    assert.equal(zipcheck([FIXTURE_ZIP, AT_ISO]).status, 0, 'digests are optional');
  });

  test('zipcheck.py rejects a wrong instant and a wrong digest', () => {
    const input = members();
    mkdirSync(fileURLToPath(new URL('./zip/', import.meta.url)), { recursive: true });
    writeFileSync(FIXTURE_ZIP, zip(input, AT));
    assert.equal(zipcheck([FIXTURE_ZIP, '2026-11-03T12:34:59Z']).status, 1, 'another 2-second slot');
    const digests = input.map((m) => createHash('sha256').update(m.bytes).digest('hex'));
    digests[2] = '0'.repeat(64);
    assert.equal(zipcheck([FIXTURE_ZIP, AT_ISO, ...digests]).status, 1);
  });
});
