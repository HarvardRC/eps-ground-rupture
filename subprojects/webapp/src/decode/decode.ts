// Artifact loading and decoding (docs/app/ddd.md §5.2; the `decode/` row
// of §5.1). `decodeVintage` is the in-memory core: four gated steps —
// manifest, artifact bytes, structural validation, views — each of which
// either passes or rejects with the `LoadError` of §5.10, never yielding
// a partial decode. `loadVintage` wraps it with the global `fetch`;
// `loadRegression` and `loadFieldExport` are the lazy exports' loaders;
// `parseReferences` maps the reference results for the parity harness
// only. Restoring stored values is `stats/`'s (§5.4).
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import {
  FIELD_EXPORT_FIELDS,
  MANIFEST_FIELDS,
  REFERENCE_FIELDS,
  REGRESSION_FIELDS,
  SchemaError,
  mapRecord,
  type BlockName,
  type FieldExport,
  type FieldRow,
  type Manifest,
  type RecordSpec,
  type References,
  type Regression,
} from './fields';
import { LoadError } from './load-error';

/** What the page requires of a vintage (§5.2 step 1; §5.11 `vintageFor`). */
export interface VintageExpectation {
  /** The page's `data-data-version` stamp (§6.2). */
  readonly exportVersion: string;
  /** The supported manifest schema versions: exactly `[1]` in this release. */
  readonly schemaVersions: readonly number[];
}

/**
 * A decoded vintage: the mapped manifest and the typed-array views over
 * the one decompressed artifact buffer, one per §3.1 block, holding
 * stored integers.
 */
export interface Vintage {
  readonly manifest: Manifest;
  readonly trialTable: Uint8Array;
  readonly slip: Uint16Array;
  readonly scarpHeight: Uint16Array;
  readonly dzw: Uint16Array;
  readonly scarpDip: Uint16Array;
  readonly scarpClass: Uint8Array;
  readonly dipDictionary: Int32Array;
}

/** Reads one vintage file, named as the manifest's `files` names it. */
export type ReadFile = (name: string) => Promise<Uint8Array>;

/** U of the §3.2 Count contract: the maximum unsigned 32-bit header count. */
const U32_MAX = 4294967295;

/** The schema version the lazy exports and the reference results require. */
const EXPORT_SCHEMA_VERSIONS: readonly number[] = [1];

/** The §3.1 blocks in physical order, with their dtypes (§3.2 `blocks`). */
const BLOCK_DTYPES: readonly (readonly [BlockName, 'uint8' | 'uint16' | 'int32'])[] = [
  ['trial_table', 'uint8'],
  ['slip', 'uint16'],
  ['scarp_height', 'uint16'],
  ['dzw', 'uint16'],
  ['scarp_dip', 'uint16'],
  ['scarp_class', 'uint8'],
  ['dip_dictionary', 'int32'],
];

const DTYPE_BYTES = { uint8: 1, uint16: 2, int32: 4 } as const;

/** The dtype maximum each column's `null_sentinel` must equal (§3.2). */
const NULL_SENTINELS = {
  slip: 65535,
  scarp_height: 65535,
  dzw: 65535,
  scarp_dip: 65535,
  scarp_class: 255,
} as const;

/** The 16-byte header's magic, ASCII `GRXA` (§3.1). */
const MAGIC = [0x47, 0x52, 0x58, 0x41] as const;
const HEADER_BYTES = 16;
const TRIAL_TABLE_WIDTH = 7;

/** The next multiple of 4, by arithmetic: offsets may exceed 32 bits. */
function align4(n: number): number {
  return Math.ceil(n / 4) * 4;
}

// --------------------------------------------------------------------
// Bytes, text, and JSON
// --------------------------------------------------------------------

/** Fetches `url` with the global `fetch`; any failure is `'retrieval'`. */
async function fetchBytes(url: string | URL, what: string): Promise<Uint8Array> {
  const response = await fetch(url).catch((e: unknown) => {
    throw new LoadError('retrieval', `${what}: the request for ${String(url)} failed`, e);
  });
  if (!response.ok) {
    throw new LoadError(
      'retrieval',
      `${what}: the request for ${String(url)} answered status ${response.status}`,
    );
  }
  try {
    return new Uint8Array(await response.arrayBuffer());
  } catch (e) {
    throw new LoadError('retrieval', `${what}: the response body of ${String(url)} failed`, e);
  }
}

/**
 * The gzip guard of §5.2 step 2: bytes that open with the gzip magic
 * `1f 8b` are inflated with `DecompressionStream('gzip')`; bytes without
 * it are used as-is, so double decompression cannot occur.
 */
async function gunzipGuarded(bytes: Uint8Array, what: string): Promise<Uint8Array> {
  if (bytes.length < 2 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes;
  try {
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
    const reader = source.pipeThrough(new DecompressionStream('gzip')).getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    const out = new Uint8Array(total);
    let at = 0;
    for (const chunk of chunks) {
      out.set(chunk, at);
      at += chunk.length;
    }
    return out;
  } catch (e) {
    throw new LoadError('read', `${what}: the gzip data could not be decompressed`, e);
  }
}

/** UTF-8 JSON text to a value; any failure is `'read'`. */
function parseJson(bytes: Uint8Array, what: string): unknown {
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
  } catch (e) {
    throw new LoadError('read', `${what}: not valid UTF-8 JSON`, e);
  }
}

/**
 * Requires `schema_version` to be one of `supported` before any other
 * member is read (§3, Schema versions).
 */
function requireSchemaVersion(raw: unknown, supported: readonly number[], what: string): void {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new LoadError('read', `${what}: expected a JSON object`);
  }
  const version: unknown = (raw as { readonly schema_version?: unknown }).schema_version;
  if (typeof version !== 'number' || !supported.includes(version)) {
    throw new LoadError(
      'schema-version',
      `${what}: schema_version ${JSON.stringify(version) ?? 'absent'} is not one of the ` +
        `supported versions ${JSON.stringify(supported)}`,
    );
  }
}

/** `mapRecord`, with its `SchemaError` reported as `'read'`. */
function mapOrRead(raw: unknown, spec: RecordSpec, what: string): Record<string, unknown> {
  try {
    return mapRecord(raw, spec, what);
  } catch (e) {
    if (e instanceof SchemaError) throw new LoadError('read', e.message, e);
    throw e;
  }
}

// --------------------------------------------------------------------
// Step 1: the manifest
// --------------------------------------------------------------------

/**
 * The §3.2 Count contract over the mapped `counts`: T, N, and R are
 * integers with 1 <= T <= U, 2 <= N <= U, and 2 <= R <= U; T <= floor(U / N)
 * is checked before R = T * N. No bitwise operator touches a count.
 */
function checkCounts(counts: Manifest['counts']): void {
  const named: readonly (readonly [string, number, number])[] = [
    ['counts.trials', counts.trials, 1],
    ['counts.stages_per_trial', counts.stagesPerTrial, 2],
    ['counts.records', counts.records, 2],
  ];
  for (const [name, value] of named) {
    if (!Number.isInteger(value)) {
      throw new LoadError('read', `manifest: ${name} ${value} is not an integer`);
    }
  }
  for (const [name, value, low] of named) {
    if (value < low || value > U32_MAX) {
      throw new LoadError(
        'read',
        `manifest: ${name} ${value} breaks the bound ${low} <= ${name} <= ${U32_MAX}`,
      );
    }
  }
  const { trials: t, stagesPerTrial: n, records: r } = counts;
  const maxTrials = Math.floor(U32_MAX / n);
  if (t > maxTrials) {
    throw new LoadError(
      'read',
      `manifest: counts.trials ${t} breaks the bound counts.trials <= ` +
        `floor(${U32_MAX} / counts.stages_per_trial) = ${maxTrials}`,
    );
  }
  if (r !== t * n) {
    throw new LoadError(
      'read',
      `manifest: counts.records ${r} breaks the identity counts.records = ` +
        `counts.trials * counts.stages_per_trial = ${t * n}`,
    );
  }
}

/**
 * Step 1 of §5.2: schema version, DD-10 mapping, Count contract, `trials`
 * length, `decimals`, `null_sentinel`, and `export_version`, in that
 * order, all before any artifact byte is requested.
 */
function readManifest(manifestBytes: Uint8Array, expected: VintageExpectation): Manifest {
  const raw = parseJson(manifestBytes, 'manifest');
  requireSchemaVersion(raw, expected.schemaVersions, 'manifest');
  const manifest = mapOrRead(raw, MANIFEST_FIELDS, 'manifest') as unknown as Manifest;

  checkCounts(manifest.counts);
  if (manifest.trials.length !== manifest.counts.trials) {
    throw new LoadError(
      'read',
      `manifest: trials holds ${manifest.trials.length} strings, breaking the identity ` +
        `trials.length = counts.trials = ${manifest.counts.trials}`,
    );
  }

  for (const name of Object.keys(NULL_SENTINELS) as (keyof typeof NULL_SENTINELS)[]) {
    const column = manifest.columns[name];
    if (
      (column.encoding === 'scaled' || column.encoding === 'dict') &&
      column.decimals !== 3 &&
      column.decimals !== 4
    ) {
      throw new LoadError(
        'read',
        `manifest: columns.${name}.decimals ${String(column.decimals)} is not 3 or 4 ` +
          `for a ${column.encoding} column`,
      );
    }
  }
  for (const name of Object.keys(NULL_SENTINELS) as (keyof typeof NULL_SENTINELS)[]) {
    const sentinel = manifest.columns[name].nullSentinel;
    if (sentinel !== NULL_SENTINELS[name]) {
      throw new LoadError(
        'read',
        `manifest: columns.${name}.null_sentinel ${sentinel} is not its dtype's maximum ` +
          `${NULL_SENTINELS[name]}`,
      );
    }
  }

  if (manifest.exportVersion !== expected.exportVersion) {
    throw LoadError.dataVersion('manifest', expected.exportVersion, manifest.exportVersion);
  }
  return manifest;
}

// --------------------------------------------------------------------
// Steps 3 and 4: structural validation and views
// --------------------------------------------------------------------

/**
 * Step 3 of §5.2: the header against the manifest, the §3.1 alignment
 * rule, every block's dtype and length, and the decompressed length —
 * all before any offset is read.
 */
function validateStructure(bytes: Uint8Array, manifest: Manifest): void {
  if (bytes.length < HEADER_BYTES) {
    throw new LoadError(
      'read',
      `scenario artifact: ${bytes.length} bytes, shorter than the ${HEADER_BYTES}-byte header`,
    );
  }
  for (let i = 0; i < MAGIC.length; i++) {
    if (bytes[i] !== MAGIC[i]) {
      throw new LoadError('read', 'scenario artifact: the header magic is not GRXA');
    }
  }
  const header = new DataView(bytes.buffer, bytes.byteOffset, HEADER_BYTES);
  const fields: readonly (readonly [string, number, number])[] = [
    ['schema version', header.getUint32(4, true), manifest.schemaVersion],
    ['record count', header.getUint32(8, true), manifest.counts.records],
    ['trial count', header.getUint32(12, true), manifest.counts.trials],
  ];
  for (const [name, found, want] of fields) {
    if (found !== want) {
      throw new LoadError(
        'read',
        `scenario artifact: the header ${name} ${found} differs from the manifest's ${want}`,
      );
    }
  }

  const { records, trials } = manifest.counts;
  let previous: { readonly offset: number; readonly length: number } | null = null;
  for (const [name, dtype] of BLOCK_DTYPES) {
    const block = manifest.blocks[name];
    if (block.dtype !== dtype) {
      throw new LoadError(
        'read',
        `manifest: blocks.${name}.dtype ${JSON.stringify(block.dtype)} is not "${dtype}"`,
      );
    }
    const offset = previous === null ? HEADER_BYTES : align4(previous.offset + previous.length);
    if (block.offset !== offset || (previous !== null && block.offset <= previous.offset)) {
      throw new LoadError(
        'read',
        `manifest: blocks.${name}.offset ${block.offset} breaks the alignment rule, ` +
          `which places it at ${offset}`,
      );
    }
    const width = DTYPE_BYTES[dtype];
    if (name === 'dip_dictionary') {
      if (block.length < 0 || block.length % width !== 0) {
        throw new LoadError(
          'read',
          `manifest: blocks.dip_dictionary.length ${block.length} is not 4 times an entry count`,
        );
      }
    } else {
      const elements = name === 'trial_table' ? trials * TRIAL_TABLE_WIDTH : records;
      if (block.length !== elements * width) {
        throw new LoadError(
          'read',
          `manifest: blocks.${name}.length ${block.length} differs from ${elements} ` +
            `elements of ${dtype}, ${elements * width} bytes`,
        );
      }
    }
    previous = block;
  }
  const total = previous === null ? HEADER_BYTES : align4(previous.offset + previous.length);
  if (bytes.length !== total) {
    throw new LoadError(
      'read',
      `scenario artifact: ${bytes.length} decompressed bytes, but the manifest's blocks tile ${total}`,
    );
  }
}

/**
 * Step 4 of §5.2: typed-array views over the one decompressed buffer at
 * the declared offsets. Nothing is copied unless the bytes were handed
 * over at an offset that is not a multiple of 4.
 */
function buildViews(bytes: Uint8Array, manifest: Manifest): Vintage {
  const aligned = bytes.byteOffset % 4 === 0 ? bytes : bytes.slice();
  const { buffer, byteOffset } = aligned;
  const at = (name: BlockName): number => byteOffset + manifest.blocks[name].offset;
  const len = (name: BlockName, width: number): number => manifest.blocks[name].length / width;
  return {
    manifest,
    trialTable: new Uint8Array(buffer, at('trial_table'), len('trial_table', 1)),
    slip: new Uint16Array(buffer, at('slip'), len('slip', 2)),
    scarpHeight: new Uint16Array(buffer, at('scarp_height'), len('scarp_height', 2)),
    dzw: new Uint16Array(buffer, at('dzw'), len('dzw', 2)),
    scarpDip: new Uint16Array(buffer, at('scarp_dip'), len('scarp_dip', 2)),
    scarpClass: new Uint8Array(buffer, at('scarp_class'), len('scarp_class', 1)),
    dipDictionary: new Int32Array(buffer, at('dip_dictionary'), len('dip_dictionary', 4)),
  };
}

// --------------------------------------------------------------------
// The loaders
// --------------------------------------------------------------------

/**
 * Decodes a vintage from the manifest's bytes and a `readFile` that
 * yields the bytes of a file the manifest names (§5.2). Rejects with a
 * `LoadError` — never with a partial decode.
 */
export async function decodeVintage(
  manifestBytes: Uint8Array,
  readFile: ReadFile,
  expected: VintageExpectation,
): Promise<Vintage> {
  // Step 1.
  const manifest = readManifest(manifestBytes, expected);

  // Step 2.
  performance.mark('egr:decode-start');
  const name = manifest.files.scenarioArtifact;
  let stored: Uint8Array;
  try {
    stored = await readFile(name);
  } catch (e) {
    if (e instanceof LoadError) throw e;
    throw new LoadError('retrieval', `scenario artifact: ${name} could not be read`, e);
  }
  const bytes = await gunzipGuarded(stored, 'scenario artifact');

  // Steps 3 and 4.
  validateStructure(bytes, manifest);
  const vintage = buildViews(bytes, manifest);
  performance.mark('egr:decode-end');
  return vintage;
}

/**
 * Fetches the artifact manifest at `manifestUrl` and decodes the vintage
 * it describes, each file fetched as `new URL(name, manifestUrl)` (§5.2).
 */
export async function loadVintage(
  manifestUrl: string | URL,
  expected: VintageExpectation,
): Promise<Vintage> {
  const manifestBytes = await fetchBytes(manifestUrl, 'manifest');
  const readFile: ReadFile = async (name) => {
    let url: URL;
    try {
      url = new URL(name, manifestUrl);
    } catch (e) {
      throw new LoadError('retrieval', `${name}: not resolvable against ${String(manifestUrl)}`, e);
    }
    return fetchBytes(url, name);
  };
  return decodeVintage(manifestBytes, readFile, expected);
}

/**
 * A lazy export (§5.2, Lazy exports): fetched, behind the gzip guard,
 * `schema_version` 1, mapped by `spec`, and its `exportVersion` equal to
 * `expectedExportVersion` before anything is returned.
 */
async function loadExport(
  url: string | URL,
  expectedExportVersion: string,
  spec: RecordSpec,
  what: string,
): Promise<Record<string, unknown> & { readonly exportVersion: string }> {
  const bytes = await gunzipGuarded(await fetchBytes(url, what), what);
  const raw = parseJson(bytes, what);
  requireSchemaVersion(raw, EXPORT_SCHEMA_VERSIONS, what);
  const mapped = mapOrRead(raw, spec, what) as Record<string, unknown> & {
    readonly exportVersion: string;
  };
  if (mapped.exportVersion !== expectedExportVersion) {
    throw LoadError.dataVersion(what, expectedExportVersion, mapped.exportVersion);
  }
  return mapped;
}

/**
 * Loads the regression export (§3.5) at `url`. Browser callers pass
 * `vintage.manifest.exportVersion`; the parity harness the pointer's
 * `export_version`.
 */
export async function loadRegression(
  url: string | URL,
  expectedExportVersion: string,
): Promise<Regression> {
  const mapped = await loadExport(url, expectedExportVersion, REGRESSION_FIELDS, 'regression export');
  return mapped as unknown as Regression;
}

/**
 * Loads the field-data export (§3.4) at `url` and returns only its
 * `rows`. Browser callers pass `vintage.manifest.exportVersion`.
 */
export async function loadFieldExport(
  url: string | URL,
  expectedExportVersion: string,
): Promise<FieldRow[]> {
  const mapped = await loadExport(url, expectedExportVersion, FIELD_EXPORT_FIELDS, 'field export');
  return [...(mapped as unknown as FieldExport).rows];
}

/**
 * Maps the decompressed reference results (§3.6) through
 * REFERENCE_FIELDS — for the parity harness only; the page never fetches
 * them. Throws a `LoadError`.
 */
export function parseReferences(bytes: Uint8Array): References {
  const raw = parseJson(bytes, 'reference results');
  requireSchemaVersion(raw, EXPORT_SCHEMA_VERSIONS, 'reference results');
  return mapOrRead(raw, REFERENCE_FIELDS, 'reference results') as unknown as References;
}
