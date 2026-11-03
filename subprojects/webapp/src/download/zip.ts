// The archive writer of docs/app/ddd.md §5.9 (Package form):
// `zip(members, modified)`, an uncompressed ZIP written without a
// dependency, in exactly the byte format §5.9 fixes so that an
// independent reader can check it — every integer little-endian:
//
// - per member, a local file header: signature 0x04034b50; version
//   needed 20; flags 0 (ASCII names, no data descriptor); method 0
//   (stored); the DOS time and date of `modified`'s UTC fields; the
//   CRC-32; compressed and uncompressed sizes, both the byte length; the
//   name length; extra length 0 — then the name and the raw bytes;
// - one central-directory header per member, in the same order:
//   signature 0x02014b50; version made by 20; version needed 20; the
//   same flags, method, time, date, CRC, and sizes; the name length;
//   extra and comment lengths 0; disk 0; internal and external
//   attributes 0; the member's local-header offset — then the name;
// - the end-of-central-directory record: signature 0x06054b50; disk
//   numbers 0; the entry count on this disk and in total; the central
//   directory's size and offset; comment length 0.
//
// No zip64: a size or offset reaching 0xFFFFFFFF, or an entry count
// reaching 0xFFFF, throws `RangeError`.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

/** One archive member: its ASCII name and its bytes. */
export interface ZipMember {
  readonly name: string;
  readonly bytes: Uint8Array;
}

const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;
const VERSION = 20;
const FLAGS = 0;
const METHOD_STORED = 0;

/** The fixed lengths of the three records, before their names (§5.9). */
const LOCAL_HEADER_LENGTH = 30;
const CENTRAL_HEADER_LENGTH = 46;
const END_RECORD_LENGTH = 22;

/** The zip64 limits (§5.9). */
const SIZE_LIMIT = 0xffffffff;
const COUNT_LIMIT = 0xffff;

/** The reflected CRC-32 polynomial (§5.9). */
const CRC_POLYNOMIAL = 0xedb88320;

/** The 256-entry CRC-32 table, built once. */
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? CRC_POLYNOMIAL ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/**
 * The CRC-32 of `bytes` (§5.9): the reflected polynomial 0xEDB88320,
 * initial value 0xFFFFFFFF, final xor 0xFFFFFFFF; an unsigned 32-bit
 * integer. `crc32` of the ASCII `123456789` is 0xCBF43926.
 */
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** The DOS time `(h<<11)|(m<<5)|(s>>1)` and date `((y−1980)<<9)|(mo<<5)|d` of `modified`'s UTC fields (§5.9). */
export function dosDateTime(modified: Date): { readonly time: number; readonly date: number } {
  const year = modified.getUTCFullYear();
  if (!(year >= 1980 && year <= 2107)) {
    throw new RangeError(`zip: the year ${year} has no DOS date`);
  }
  return {
    time: (modified.getUTCHours() << 11) | (modified.getUTCMinutes() << 5) | (modified.getUTCSeconds() >> 1),
    date: ((year - 1980) << 9) | ((modified.getUTCMonth() + 1) << 5) | modified.getUTCDate(),
  };
}

/** `name`'s bytes; throws unless every character is ASCII (flags 0, §5.9). */
function asciiName(name: string): Uint8Array {
  if (!/^[\x20-\x7e]+$/.test(name)) {
    throw new RangeError(`zip: the member name ${JSON.stringify(name)} is not printable ASCII`);
  }
  return new TextEncoder().encode(name);
}

/** Throws `RangeError` when a 32-bit size or offset reaches 0xFFFFFFFF (no zip64, §5.9). */
function checkSize(value: number, what: string): void {
  if (value >= SIZE_LIMIT) {
    throw new RangeError(`zip: ${what} ${value} reaches 0xFFFFFFFF; zip64 is not written`);
  }
}

/**
 * The stored ZIP archive of `members`, in their order, every timestamp
 * `modified` (§5.9). Identical members and instant give identical bytes.
 */
export function zip(members: readonly ZipMember[], modified: Date): Uint8Array {
  if (members.length >= COUNT_LIMIT) {
    throw new RangeError(`zip: ${members.length} entries reach 0xFFFF; zip64 is not written`);
  }
  const { time, date } = dosDateTime(modified);
  const entries = members.map((m) => ({ name: asciiName(m.name), bytes: m.bytes, crc: 0, offset: 0 }));

  let offset = 0;
  for (const e of entries) {
    checkSize(e.bytes.length, 'the member size');
    checkSize(offset, 'the local-header offset');
    e.offset = offset;
    offset += LOCAL_HEADER_LENGTH + e.name.length + e.bytes.length;
  }
  const centralOffset = offset;
  let centralSize = 0;
  for (const e of entries) centralSize += CENTRAL_HEADER_LENGTH + e.name.length;
  checkSize(centralOffset, 'the central-directory offset');
  checkSize(centralSize, 'the central-directory size');
  for (const e of entries) e.crc = crc32(e.bytes);

  const out = new Uint8Array(centralOffset + centralSize + END_RECORD_LENGTH);
  const view = new DataView(out.buffer);
  let p = 0;
  const u16 = (v: number): void => {
    view.setUint16(p, v, true);
    p += 2;
  };
  const u32 = (v: number): void => {
    view.setUint32(p, v, true);
    p += 4;
  };
  const raw = (bytes: Uint8Array): void => {
    out.set(bytes, p);
    p += bytes.length;
  };

  for (const e of entries) {
    u32(LOCAL_SIGNATURE);
    u16(VERSION);
    u16(FLAGS);
    u16(METHOD_STORED);
    u16(time);
    u16(date);
    u32(e.crc);
    u32(e.bytes.length);
    u32(e.bytes.length);
    u16(e.name.length);
    u16(0);
    raw(e.name);
    raw(e.bytes);
  }
  for (const e of entries) {
    u32(CENTRAL_SIGNATURE);
    u16(VERSION);
    u16(VERSION);
    u16(FLAGS);
    u16(METHOD_STORED);
    u16(time);
    u16(date);
    u32(e.crc);
    u32(e.bytes.length);
    u32(e.bytes.length);
    u16(e.name.length);
    u16(0);
    u16(0);
    u16(0);
    u16(0);
    u32(0);
    u32(e.offset);
    raw(e.name);
  }
  u32(END_SIGNATURE);
  u16(0);
  u16(0);
  u16(entries.length);
  u16(entries.length);
  u32(centralSize);
  u32(centralOffset);
  u16(0);

  if (p !== out.length) {
    throw new Error(`zip: wrote ${p} of ${out.length} bytes`);
  }
  return out;
}
