// decode.test.ts (docs/app/ddd.md §7.4, the `decode.test.ts` row; §5.2
// Artifact loading and decoding; §5.10 LoadError kinds): `decodeVintage`
// on in-memory fixture files built by test/fixtures.ts; the lazy
// loaders through a `fetch` stub that answers only the fixture's URLs;
// `parseReferences`. Every failure must reject with its LoadError kind
// and never resolve to a partial decode. No network is touched.

import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import {
  decodeVintage,
  loadFieldExport,
  loadRegression,
  loadVintage,
  parseReferences,
  type Vintage,
} from '../src/decode/decode';
import { SchemaError, TRIAL_TABLE_COLUMNS } from '../src/decode/fields';
import { LoadError, type LoadErrorKind } from '../src/decode/load-error';
import {
  U32_MAX,
  buildFixture,
  buildReferences,
  expectationOf,
  fileReader,
  gzip,
  jsonBytes,
  stageCountSpec,
  stepsDecimal,
  type Fixture,
  type ManifestJson,
} from './fixtures';

/** The stage counts §7.4 requires: N = 2, 100, 101, 102, each with several trials. */
const STAGE_COUNTS = [2, 100, 101, 102];

/** A fresh valid fixture of `n` stages per trial. */
const fixtureOf = (n = 2): Promise<Fixture> => buildFixture(stageCountSpec(n));

/** Asserts that `promise` rejects with a LoadError of `kind`, returning it. */
async function rejectsWith(promise: Promise<unknown>, kind: LoadErrorKind): Promise<LoadError> {
  let error: unknown = null;
  let value: unknown = undefined;
  try {
    value = await promise;
  } catch (e) {
    error = e;
  }
  assert.equal(value, undefined, 'resolved instead of rejecting: a partial or complete decode');
  assert.ok(error instanceof LoadError, `rejected with ${String(error)}, not a LoadError`);
  assert.equal(error.kind, kind, error.message);
  if (kind !== 'data-version') {
    assert.equal(error.expected, undefined);
    assert.equal(error.loaded, undefined);
  }
  return error;
}

/** Decodes `fixture` with `manifest` (default its own) over its files. */
function decode(fixture: Fixture, manifest: unknown = fixture.manifest) {
  const reader = fileReader(fixture.files);
  return {
    reader,
    result: decodeVintage(jsonBytes(manifest), reader.readFile, expectationOf(fixture)),
  };
}

/** The fixture's files with the scenario artifact replaced by `bytes`. */
function withArtifact(fixture: Fixture, bytes: Uint8Array): Map<string, Uint8Array> {
  const files = new Map(fixture.files);
  files.set(fixture.manifest.files.scenario_artifact, bytes);
  return files;
}

/** Decodes `fixture` with its artifact replaced by `bytes` (served as-is). */
function decodeBytes(fixture: Fixture, bytes: Uint8Array) {
  const reader = fileReader(withArtifact(fixture, bytes));
  return decodeVintage(jsonBytes(fixture.manifest), reader.readFile, expectationOf(fixture));
}

// --------------------------------------------------------------------
// The fetch stub
// --------------------------------------------------------------------

const realFetch = globalThis.fetch;
/** The URLs the stub was asked for, in order. */
let fetched: string[] = [];

/**
 * Replaces the global `fetch` with a stub that answers each URL of
 * `served` with its bytes and status (default 200) and every other URL
 * with 404 — so no test reaches the network.
 */
function stubFetch(served: ReadonlyMap<string, Uint8Array>, status = 200): void {
  fetched = [];
  globalThis.fetch = async (input: string | URL | Request): Promise<Response> => {
    const url = input instanceof Request ? input.url : String(input);
    fetched.push(url);
    const bytes = served.get(url);
    if (bytes === undefined) return new Response(null, { status: 404 });
    return new Response(bytes, { status });
  };
}

/** Puts the real `fetch` back; every describe that stubs it runs this after each test. */
function restoreFetch(): void {
  globalThis.fetch = realFetch;
}

// --------------------------------------------------------------------
// Valid fixtures
// --------------------------------------------------------------------

/**
 * Asserts that `vintage` holds exactly the values of `fixture.spec`: the
 * counts, the trial table, the stored integers of every block, and the
 * values restored by the §3.1 rule equal bit for bit to the decimals the
 * recording steps denote.
 */
function assertDecodesSpec(vintage: Vintage, fixture: Fixture): void {
  const spec = fixture.spec;
  const n = spec.stagesPerTrial;
  const t = spec.trials.length;
  const records = t * n;
  const m = vintage.manifest;
  assert.deepEqual(m.counts, { records, trials: t, stagesPerTrial: n });
  assert.deepEqual(m.trials, spec.trials.map((row) => row[0]));
  assert.deepEqual(m.scarpClasses, spec.scarpClasses);

  // The trial table: row t, column c indexes trial_columns[TRIAL_TABLE_COLUMNS[c]].
  assert.equal(vintage.trialTable.length, t * TRIAL_TABLE_COLUMNS.length);
  spec.trials.forEach((row, trial) => {
    TRIAL_TABLE_COLUMNS.forEach((name, c) => {
      const cell = vintage.trialTable[trial * TRIAL_TABLE_COLUMNS.length + c];
      const value = (m.trialColumns[name] as readonly (number | string)[])[cell];
      assert.equal(value, name === 'model_family' ? '2D' : row[c + 1], `trial ${trial} ${name}`);
    });
  });

  for (const view of [vintage.slip, vintage.scarpHeight, vintage.dzw, vintage.scarpDip, vintage.scarpClass]) {
    assert.equal(view.length, records);
  }
  const restore = (column: 'slip' | 'scarp_height' | 'dzw', stored: number): number => {
    const { decimals, offsetSteps } = m.columns[column];
    const divisor = decimals === 4 ? 10000 : 1000;
    return (stored + (offsetSteps as number)) / divisor;
  };
  const same = (actual: number, steps: number, decimals: number, what: string): void => {
    const expected = Number(stepsDecimal(steps, decimals));
    assert.ok(Object.is(actual, expected), `${what}: restored ${actual}, expected ${expected}`);
  };
  for (let i = 0; i < records; i++) {
    // Trial-major: entry i is stage i - t·N of trial floor(i / N).
    const where = `record ${i} (trial ${Math.floor(i / n)}, stage ${i % n})`;
    same(restore('slip', vintage.slip[i]), spec.stages.slip[i], 4, `${where} slip`);
    const height = spec.stages.scarp_height[i];
    if (height === null) assert.equal(vintage.scarpHeight[i], 65535, `${where} scarp_height null`);
    else same(restore('scarp_height', vintage.scarpHeight[i]), height, 3, `${where} scarp_height`);
    const dzw = spec.stages.dzw[i];
    if (dzw === null) assert.equal(vintage.dzw[i], 65535, `${where} dzw null`);
    else same(restore('dzw', vintage.dzw[i]), dzw, 3, `${where} dzw`);
    const dip = spec.stages.scarp_dip[i];
    if (dip === null) assert.equal(vintage.scarpDip[i], 65535, `${where} scarp_dip null`);
    else same(vintage.dipDictionary[vintage.scarpDip[i]] / 1000, dip, 3, `${where} scarp_dip`);
    const cls = spec.stages.scarp_class[i];
    assert.equal(vintage.scarpClass[i], cls === null ? 255 : m.scarpClasses.indexOf(cls), `${where} class`);
  }
  // The dip dictionary: every distinct recorded dip, ascending.
  const dips = [...new Set(spec.stages.scarp_dip.filter((d): d is number => d !== null))].sort(
    (a, b) => a - b,
  );
  assert.deepEqual([...vintage.dipDictionary], dips);
}

describe('decodeVintage on valid fixtures', () => {
  afterEach(restoreFetch);

  for (const n of STAGE_COUNTS) {
    test(`N = ${n}: a multi-trial vintage decodes to the spec's values, bit for bit`, async () => {
      const fixture = await fixtureOf(n);
      assert.ok(fixture.spec.trials.length > 1);
      assert.equal(fixture.manifest.counts.stages_per_trial, n, 'the builder copies N, never 101');
      const { reader, result } = decode(fixture);
      const vintage = await result;
      assert.deepEqual(reader.calls, [fixture.manifest.files.scenario_artifact]);
      assertDecodesSpec(vintage, fixture);
    });
  }

  test('restored values carry negative steps and the scarp-height offset exactly', async () => {
    const fixture = await fixtureOf(2);
    const vintage = await decode(fixture).result;
    assert.equal(vintage.manifest.columns.scarp_height.offsetSteps, -182);
    const i = fixture.spec.stages.scarp_height.indexOf(-182);
    assert.ok(i >= 0, 'the fixture holds the recorded step -182');
    assert.equal(vintage.scarpHeight[i], 0);
    assert.ok(Object.is((vintage.scarpHeight[i] + -182) / 1000, -0.182));
    assert.ok(vintage.dipDictionary[0] < 0, 'the fixture holds a negative dip');
  });

  test('gzip guard: bytes opening with 1f 8b inflate; bytes without it are used as-is', async () => {
    const fixture = await fixtureOf(100);
    assert.deepEqual([...fixture.artifactGz.subarray(0, 2)], [0x1f, 0x8b]);
    assert.notDeepEqual([...fixture.artifact.subarray(0, 2)], [0x1f, 0x8b]);
    const inflated = await decodeBytes(fixture, fixture.artifactGz);
    const asIs = await decodeBytes(fixture, fixture.artifact);
    assertDecodesSpec(inflated, fixture);
    assertDecodesSpec(asIs, fixture);
  });

  test('a gzip magic over bytes that are not gzip data rejects with read', async () => {
    const fixture = await fixtureOf(2);
    const bytes = fixture.artifactGz.slice(0, 24);
    await rejectsWith(decodeBytes(fixture, bytes), 'read');
  });

  test('bytes handed over at an offset that is not a multiple of 4 still decode', async () => {
    const fixture = await fixtureOf(101);
    const padded = new Uint8Array(fixture.artifact.length + 1);
    padded.set(fixture.artifact, 1);
    assertDecodesSpec(await decodeBytes(fixture, padded.subarray(1)), fixture);
  });

  test('unknown additional manifest fields are ignored', async () => {
    const fixture = await fixtureOf(2);
    const manifest = structuredClone(fixture.manifest) as ManifestJson & { [key: string]: unknown };
    manifest.future_member = { anything: [1, 2, 3] };
    (manifest.counts as { [key: string]: unknown }).future_count = 7;
    (manifest.blocks.slip as unknown as { [key: string]: unknown }).future_flag = true;
    const vintage = await decode(fixture, manifest).result;
    assertDecodesSpec(vintage, fixture);
    assert.equal('futureMember' in vintage.manifest, false);
    assert.equal('future_member' in vintage.manifest, false);
    assert.deepEqual(Object.keys(vintage.manifest.counts).sort(), ['records', 'stagesPerTrial', 'trials']);
  });

  test('loadVintage resolves each file against the manifest URL through fetch', async () => {
    const fixture = await fixtureOf(102);
    const base = 'https://fixture.invalid/data/data-v0-test/';
    const served = new Map<string, Uint8Array>([[`${base}manifest.json`, jsonBytes(fixture.manifest)]]);
    for (const [name, bytes] of fixture.files) served.set(`${base}${name}`, bytes);
    stubFetch(served);
    assertDecodesSpec(await loadVintage(`${base}manifest.json`, expectationOf(fixture)), fixture);
    assert.deepEqual(fetched, [`${base}manifest.json`, `${base}${fixture.manifest.files.scenario_artifact}`]);
  });
});

// --------------------------------------------------------------------
// The fixture builder's own contract (§7.4, Fixtures are built in code)
// --------------------------------------------------------------------

describe('buildFixture', () => {
  test('writes the spec N into counts.stages_per_trial, never 101', async () => {
    for (const n of STAGE_COUNTS) {
      const fixture = await fixtureOf(n);
      assert.deepEqual(fixture.manifest.counts, {
        records: fixture.spec.trials.length * n,
        trials: fixture.spec.trials.length,
        stages_per_trial: n,
      });
      assert.deepEqual(fixture.manifest.scarp_classes, fixture.spec.scarpClasses);
      assert.deepEqual(Object.keys(fixture.manifest.scarp_class_palette), fixture.spec.scarpClasses);
      for (const color of Object.values(fixture.manifest.scarp_class_palette)) {
        assert.match(color, /^#[0-9a-f]{6}$/);
      }
    }
  });

  test('throws unless every stage array holds trials.length * N entries', async () => {
    for (const name of ['slip', 'scarp_height', 'dzw', 'scarp_dip', 'scarp_class'] as const) {
      const spec = stageCountSpec(100);
      const stages = { ...spec.stages, [name]: spec.stages[name].slice(0, -1) };
      await assert.rejects(buildFixture({ ...spec, stages }), /trials\.length \* N/, name);
    }
    // An N that disagrees with the arrays: 3 trials of 101 stages declared as 100.
    await assert.rejects(buildFixture({ ...stageCountSpec(101), stagesPerTrial: 100 }), /trials\.length \* N/);
  });

  test('throws unless the counts pass the Count contract', async () => {
    for (const n of [0, 1, 2.5, U32_MAX + 1]) {
      await assert.rejects(buildFixture({ ...stageCountSpec(2), stagesPerTrial: n }), /N/, String(n));
    }
    const spec = stageCountSpec(2);
    const empty = { slip: [], scarp_height: [], dzw: [], scarp_dip: [], scarp_class: [] };
    await assert.rejects(buildFixture({ ...spec, trials: [], stages: empty }), /trials/);
  });
});

// --------------------------------------------------------------------
// Manifest-only rejections: before readFile, no large buffer
// --------------------------------------------------------------------

/** One corruption of the built manifest's counts or `trials`. */
interface CountCase {
  readonly name: string;
  readonly corrupt: (m: ManifestJson) => void;
}

const COUNT_CASES: readonly CountCase[] = [
  { name: 'counts.stages_per_trial 0', corrupt: (m) => void (m.counts.stages_per_trial = 0) },
  { name: 'counts.stages_per_trial 1', corrupt: (m) => void (m.counts.stages_per_trial = 1) },
  { name: 'counts.stages_per_trial fractional', corrupt: (m) => void (m.counts.stages_per_trial = 2.5) },
  { name: 'counts.trials 0', corrupt: (m) => void (m.counts.trials = 0) },
  { name: 'counts.trials fractional', corrupt: (m) => void (m.counts.trials = 1.5) },
  { name: 'counts.records fractional', corrupt: (m) => void (m.counts.records = 5.5) },
  { name: 'counts.trials above 4,294,967,295', corrupt: (m) => void (m.counts.trials = U32_MAX + 1) },
  { name: 'counts.records above 4,294,967,295', corrupt: (m) => void (m.counts.records = U32_MAX + 1) },
  {
    name: 'counts.stages_per_trial above 4,294,967,295',
    corrupt: (m) => void (m.counts.stages_per_trial = U32_MAX + 1),
  },
  {
    // T and N each within bounds, R = U within bounds, but T > floor(U / N).
    name: 'trials * N above 4,294,967,295',
    corrupt: (m) => {
      m.counts.trials = 65536;
      m.counts.stages_per_trial = 65536;
      m.counts.records = U32_MAX;
    },
  },
  { name: 'records one above trials * N', corrupt: (m) => void (m.counts.records += 1) },
  { name: 'records one below trials * N', corrupt: (m) => void (m.counts.records -= 1) },
  { name: 'a trials array one shorter than counts.trials', corrupt: (m) => void m.trials.pop() },
  { name: 'a trials array one longer than counts.trials', corrupt: (m) => void m.trials.push('S9') },
];

describe('manifest-only count cases reject with read before readFile', () => {
  for (const c of COUNT_CASES) {
    test(c.name, async () => {
      const fixture = await fixtureOf(2);
      const manifest = structuredClone(fixture.manifest);
      c.corrupt(manifest);
      const before = process.memoryUsage().arrayBuffers;
      const { reader, result } = decode(fixture, manifest);
      await rejectsWith(result, 'read');
      assert.deepEqual(reader.calls, [], 'readFile was called');
      const grown = process.memoryUsage().arrayBuffers - before;
      assert.ok(grown < 1 << 20, `${grown} bytes of ArrayBuffer were allocated`);
    });
  }

  test('a wrong null_sentinel rejects with read before readFile, for each column', async () => {
    for (const name of ['slip', 'scarp_height', 'dzw', 'scarp_dip', 'scarp_class'] as const) {
      const fixture = await fixtureOf(2);
      const manifest = structuredClone(fixture.manifest);
      manifest.columns[name].null_sentinel -= 1;
      const { reader, result } = decode(fixture, manifest);
      const error = await rejectsWith(result, 'read');
      assert.match(error.message, new RegExp(`columns\\.${name}\\.null_sentinel`));
      assert.deepEqual(reader.calls, []);
    }
  });

  test('decimals other than 3 or 4 on a scaled or dict column rejects with read', async () => {
    for (const name of ['slip', 'scarp_height', 'dzw', 'scarp_dip'] as const) {
      const fixture = await fixtureOf(2);
      const manifest = structuredClone(fixture.manifest);
      manifest.columns[name].decimals = 2;
      const { reader, result } = decode(fixture, manifest);
      await rejectsWith(result, 'read');
      assert.deepEqual(reader.calls, []);
    }
  });
});

// --------------------------------------------------------------------
// Structural validation before any read of the artifact
// --------------------------------------------------------------------

/** The artifact bytes with the header's uint32 at `at` set to `value`. */
function withHeaderWord(artifact: Uint8Array, at: number, value: number): Uint8Array {
  const bytes = artifact.slice();
  new DataView(bytes.buffer).setUint32(at, value, true);
  return bytes;
}

describe('structural validation rejects with read, never a partial decode', () => {
  test('a buffer truncated by one byte', async () => {
    const fixture = await fixtureOf(2);
    await rejectsWith(decodeBytes(fixture, fixture.artifact.slice(0, -1)), 'read');
    await rejectsWith(decodeBytes(fixture, await gzip(fixture.artifact.slice(0, -1))), 'read');
  });

  test('a buffer shorter than the 16-byte header', async () => {
    const fixture = await fixtureOf(2);
    await rejectsWith(decodeBytes(fixture, fixture.artifact.slice(0, 15)), 'read');
    await rejectsWith(decodeBytes(fixture, new Uint8Array(0)), 'read');
  });

  test('bytes beyond the block tiling', async () => {
    const fixture = await fixtureOf(2);
    const longer = new Uint8Array(fixture.artifact.length + 4);
    longer.set(fixture.artifact);
    await rejectsWith(decodeBytes(fixture, longer), 'read');
  });

  test('a header magic other than GRXA', async () => {
    const fixture = await fixtureOf(2);
    const bytes = fixture.artifact.slice();
    bytes[3] = 0x42;
    await rejectsWith(decodeBytes(fixture, bytes), 'read');
  });

  test('a header schema version that differs from the manifest', async () => {
    const fixture = await fixtureOf(2);
    await rejectsWith(decodeBytes(fixture, withHeaderWord(fixture.artifact, 4, 2)), 'read');
  });

  test('a count mismatch between the header and the manifest', async () => {
    const fixture = await fixtureOf(2);
    const { records, trials } = fixture.manifest.counts;
    await rejectsWith(decodeBytes(fixture, withHeaderWord(fixture.artifact, 8, records + 1)), 'read');
    await rejectsWith(decodeBytes(fixture, withHeaderWord(fixture.artifact, 12, trials - 1)), 'read');
  });

  test('a manifest whose counts agree with each other but not with the header', async () => {
    // Two trials fewer in every count: the Count contract holds, the header disagrees.
    const fixture = await fixtureOf(2);
    const manifest = structuredClone(fixture.manifest);
    manifest.counts.trials -= 1;
    manifest.counts.records -= 2;
    manifest.trials.pop();
    const { reader, result } = decode(fixture, manifest);
    await rejectsWith(result, 'read');
    assert.equal(reader.calls.length, 1);
  });

  for (const name of ['slip', 'scarp_height', 'dzw', 'scarp_dip', 'scarp_class', 'trial_table'] as const) {
    test(`a ${name} block length other than its element count times the dtype width`, async () => {
      const fixture = await fixtureOf(100);
      const manifest = structuredClone(fixture.manifest);
      manifest.blocks[name].length += name === 'trial_table' || name === 'scarp_class' ? 1 : 2;
      const { result } = decode(fixture, manifest);
      const error = await rejectsWith(result, 'read');
      assert.match(error.message, new RegExp(`blocks\\.${name}\\.length`));
    });
  }

  test('a dip_dictionary length that is not a whole number of int32 entries', async () => {
    const fixture = await fixtureOf(2);
    const manifest = structuredClone(fixture.manifest);
    manifest.blocks.dip_dictionary.length -= 2;
    const error = await rejectsWith(decode(fixture, manifest).result, 'read');
    assert.match(error.message, /blocks\.dip_dictionary\.length/);
  });

  test('a dip_dictionary extent reaching past the artifact', async () => {
    const fixture = await fixtureOf(2);
    const manifest = structuredClone(fixture.manifest);
    manifest.blocks.dip_dictionary.length += 4;
    await rejectsWith(decode(fixture, manifest).result, 'read');
  });

  test('a block offset that breaks the align4 tiling', async () => {
    for (const name of ['trial_table', 'slip', 'scarp_class', 'dip_dictionary'] as const) {
      const fixture = await fixtureOf(2);
      const manifest = structuredClone(fixture.manifest);
      manifest.blocks[name].offset += 4;
      const error = await rejectsWith(decode(fixture, manifest).result, 'read');
      assert.match(error.message, new RegExp(`blocks\\.${name}\\.offset`));
    }
  });

  test('a block dtype other than the §3.2 dtype', async () => {
    for (const [name, dtype] of [
      ['slip', 'uint8'],
      ['scarp_class', 'uint16'],
      ['dip_dictionary', 'uint32'],
      ['trial_table', 'int32'],
    ] as const) {
      const fixture = await fixtureOf(2);
      const manifest = structuredClone(fixture.manifest);
      manifest.blocks[name].dtype = dtype;
      const error = await rejectsWith(decode(fixture, manifest).result, 'read');
      assert.match(error.message, new RegExp(`blocks\\.${name}\\.dtype`));
    }
  });
});

// --------------------------------------------------------------------
// SchemaError, schema version, data version
// --------------------------------------------------------------------

describe('manifest schema, schema version, and data version', () => {
  test('bytes that are not JSON reject with read', async () => {
    const fixture = await fixtureOf(2);
    const reader = fileReader(fixture.files);
    const bytes = new TextEncoder().encode('{"schema_version": 1,');
    await rejectsWith(decodeVintage(bytes, reader.readFile, expectationOf(fixture)), 'read');
    assert.deepEqual(reader.calls, []);
  });

  const SCHEMA_CASES: readonly (readonly [string, (m: { [key: string]: unknown }) => void])[] = [
    ['a missing top-level key', (m) => void delete m.stage_spacing],
    ['a missing nested key', (m) => void delete (m.counts as { [key: string]: unknown }).records],
    ['a missing data-map key', (m) => void delete (m.blocks as { [key: string]: unknown }).dzw],
    [
      'a missing column member',
      (m) => void delete ((m.columns as ManifestJson['columns']).dzw as unknown as { [key: string]: unknown }).scale,
    ],
    ['a string where an int belongs', (m) => void ((m.counts as { [key: string]: unknown }).trials = '6')],
    ['a number where a string belongs', (m) => void (m.export_version = 1)],
    ['a float where an int belongs', (m) => void ((m.blocks as ManifestJson['blocks']).slip.offset = 16.5)],
    ['an object where an array belongs', (m) => void (m.trials = { 0: 'S0' })],
    ['a null where null is not allowed', (m) => void (m.files = null)],
    ['a string inside an int array', (m) => void ((m.trial_columns as ManifestJson['trial_columns']).fault_dip as unknown[]).push('80')],
  ];
  for (const [name, corrupt] of SCHEMA_CASES) {
    test(`${name} is a SchemaError, kind read, before readFile`, async () => {
      const fixture = await fixtureOf(2);
      const manifest = structuredClone(fixture.manifest) as unknown as { [key: string]: unknown };
      corrupt(manifest);
      const { reader, result } = decode(fixture, manifest);
      const error = await rejectsWith(result, 'read');
      assert.ok(error.cause instanceof SchemaError, 'the cause is a SchemaError');
      assert.deepEqual(reader.calls, []);
    });
  }

  for (const version of [0, 2, '1', null]) {
    test(`schema_version ${JSON.stringify(version)} rejects with schema-version`, async () => {
      const fixture = await fixtureOf(2);
      const manifest = structuredClone(fixture.manifest) as unknown as { [key: string]: unknown };
      manifest.schema_version = version;
      const { reader, result } = decode(fixture, manifest);
      await rejectsWith(result, 'schema-version');
      assert.deepEqual(reader.calls, []);
    });
  }

  test('a missing schema_version rejects with schema-version before any other member', async () => {
    const fixture = await fixtureOf(2);
    const manifest = structuredClone(fixture.manifest) as unknown as { [key: string]: unknown };
    delete manifest.schema_version;
    delete manifest.counts; // would be a SchemaError, were the version not checked first
    await rejectsWith(decode(fixture, manifest).result, 'schema-version');
  });

  test('a schema version outside expected.schemaVersions rejects with schema-version', async () => {
    const fixture = await fixtureOf(2);
    const reader = fileReader(fixture.files);
    const expected = { exportVersion: fixture.manifest.export_version, schemaVersions: [2] };
    await rejectsWith(decodeVintage(jsonBytes(fixture.manifest), reader.readFile, expected), 'schema-version');
  });

  test('a data-version mismatch rejects with data-version, carrying expected and loaded', async () => {
    const fixture = await buildFixture(stageCountSpec(2), { exportVersion: 'data-v3' });
    const reader = fileReader(fixture.files);
    const expected = { exportVersion: 'data-v4', schemaVersions: [1] };
    const error = await rejectsWith(
      decodeVintage(jsonBytes(fixture.manifest), reader.readFile, expected),
      'data-version',
    );
    assert.equal(error.expected, 'data-v4');
    assert.equal(error.loaded, 'data-v3');
    assert.deepEqual(reader.calls, []);
  });

  test('a readFile failure rejects with retrieval', async () => {
    const fixture = await fixtureOf(2);
    const readFile = async (): Promise<Uint8Array> => {
      throw new Error('stub: unreadable');
    };
    await rejectsWith(decodeVintage(jsonBytes(fixture.manifest), readFile, expectationOf(fixture)), 'retrieval');
  });
});

// --------------------------------------------------------------------
// The lazy loaders, through a fetch stub; parseReferences
// --------------------------------------------------------------------

const FIELD_URL = 'https://fixture.invalid/data/field.json.gz';
const REGRESSION_URL = 'https://fixture.invalid/data/regression.json.gz';

describe('loadFieldExport and loadRegression', () => {
  afterEach(restoreFetch);

  test('loadFieldExport with the matching version returns the rows, mapped', async () => {
    const fixture = await fixtureOf(2);
    const version = fixture.manifest.export_version;
    stubFetch(new Map([[FIELD_URL, fixture.files.get(fixture.manifest.files.field_export) as Uint8Array]]));
    const rows = await loadFieldExport(FIELD_URL, version);
    assert.deepEqual(fetched, [FIELD_URL]);
    assert.deepEqual(
      rows,
      fixture.fieldExport.rows.map((r) => ({
        source: r.source,
        eqName: r.eq_name,
        magnitude: r.magnitude,
        analogue: r.analogue,
        sourceQuantity: r.source_quantity,
        value: r.value,
        limitedComparison: r.limited_comparison,
        criterionSub50: r.criterion_sub50,
        labeledSet: r.labeled_set,
        kernFieldGroup: r.kern_field_group,
      })),
    );
    assert.ok(Array.isArray(rows));
    assert.deepEqual(Object.keys(rows), ['0', '1', '2'], 'no metadata is attached to the array');
  });

  test('loadRegression with the matching version returns the mapped regression', async () => {
    const fixture = await fixtureOf(2);
    const raw = fixture.regressionExport;
    stubFetch(new Map([[REGRESSION_URL, fixture.files.get(fixture.manifest.files.regression_export) as Uint8Array]]));
    const regression = await loadRegression(REGRESSION_URL, raw.export_version);
    assert.deepEqual(regression, {
      schemaVersion: 1,
      exportVersion: raw.export_version,
      exportDate: raw.export_date,
      pipelineVersion: raw.pipeline_version,
      relationship: {
        y: raw.relationship.y,
        x: raw.relationship.x,
        form: raw.relationship.form,
        fit: raw.relationship.fit,
        backProjection: raw.relationship.back_projection,
      },
      coefficients: raw.coefficients.map((c) => ({
        faultDip: c.fault_dip,
        n: c.n,
        slope: c.slope,
        intercept: c.intercept,
        r2: c.r2,
      })),
    });
  });

  test('an uncompressed export body is used as-is (the gzip guard)', async () => {
    const fixture = await fixtureOf(2);
    stubFetch(
      new Map([
        [FIELD_URL, jsonBytes(fixture.fieldExport)],
        [REGRESSION_URL, jsonBytes(fixture.regressionExport)],
      ]),
    );
    const version = fixture.manifest.export_version;
    assert.equal((await loadFieldExport(FIELD_URL, version)).length, fixture.fieldExport.rows.length);
    assert.equal((await loadRegression(REGRESSION_URL, version)).exportVersion, version);
  });

  test('a different expectedExportVersion rejects with data-version: expected the argument, loaded the envelope', async () => {
    const fixture = await buildFixture(stageCountSpec(2), { exportVersion: 'data-v7' });
    stubFetch(
      new Map([
        [FIELD_URL, fixture.files.get(fixture.manifest.files.field_export) as Uint8Array],
        [REGRESSION_URL, fixture.files.get(fixture.manifest.files.regression_export) as Uint8Array],
      ]),
    );
    const field = await rejectsWith(loadFieldExport(FIELD_URL, 'data-v8'), 'data-version');
    assert.equal(field.expected, 'data-v8');
    assert.equal(field.loaded, 'data-v7');
    const regression = await rejectsWith(loadRegression(REGRESSION_URL, 'data-v6'), 'data-version');
    assert.equal(regression.expected, 'data-v6');
    assert.equal(regression.loaded, 'data-v7');
  });

  for (const status of [404, 500, 304]) {
    test(`a stub answering status ${status} rejects with retrieval`, async () => {
      const fixture = await fixtureOf(2);
      const version = fixture.manifest.export_version;
      stubFetch(
        new Map([
          [FIELD_URL, fixture.files.get(fixture.manifest.files.field_export) as Uint8Array],
          [REGRESSION_URL, fixture.files.get(fixture.manifest.files.regression_export) as Uint8Array],
        ]),
        status,
      );
      await rejectsWith(loadFieldExport(FIELD_URL, version), 'retrieval');
      await rejectsWith(loadRegression(REGRESSION_URL, version), 'retrieval');
    });
  }

  test('a rejected fetch rejects with retrieval', async () => {
    globalThis.fetch = async () => {
      throw new TypeError('stub: network unreachable');
    };
    await rejectsWith(loadFieldExport(FIELD_URL, 'data-v0-test'), 'retrieval');
    await rejectsWith(loadRegression(REGRESSION_URL, 'data-v0-test'), 'retrieval');
  });

  test('an unsupported schema_version rejects with schema-version', async () => {
    const fixture = await fixtureOf(2);
    const field = { ...fixture.fieldExport, schema_version: 2 };
    const regression = { ...fixture.regressionExport, schema_version: 2 };
    stubFetch(new Map([[FIELD_URL, jsonBytes(field)], [REGRESSION_URL, jsonBytes(regression)]]));
    await rejectsWith(loadFieldExport(FIELD_URL, field.export_version), 'schema-version');
    await rejectsWith(loadRegression(REGRESSION_URL, regression.export_version), 'schema-version');
  });

  test('a missing key or a wrong JSON type is a SchemaError, kind read', async () => {
    const fixture = await fixtureOf(2);
    const version = fixture.manifest.export_version;
    const field = structuredClone(fixture.fieldExport) as unknown as { rows: { [key: string]: unknown }[] };
    delete field.rows[1].labeled_set;
    const regression = structuredClone(fixture.regressionExport) as unknown as {
      coefficients: { [key: string]: unknown }[];
    };
    regression.coefficients[0].slope = '0.5';
    stubFetch(new Map([[FIELD_URL, jsonBytes(field)], [REGRESSION_URL, jsonBytes(regression)]]));
    const a = await rejectsWith(loadFieldExport(FIELD_URL, version), 'read');
    assert.ok(a.cause instanceof SchemaError);
    const b = await rejectsWith(loadRegression(REGRESSION_URL, version), 'read');
    assert.ok(b.cause instanceof SchemaError);
  });
});

describe('parseReferences', () => {
  test('maps a reference file through REFERENCE_FIELDS', async () => {
    const fixture = await fixtureOf(100);
    const raw = buildReferences(fixture);
    const references = parseReferences(jsonBytes(raw));
    assert.equal(references.exportVersion, fixture.manifest.export_version);
    assert.equal(references.referenceVersion, fixture.manifest.reference_results_version);
    const ensemble = references.synthetic.ensembles[0];
    assert.equal(ensemble.stagesPerTrial, 100);
    assert.deepEqual(ensemble.stages, fixture.spec.stages);
    assert.deepEqual(ensemble.trials, fixture.spec.trials);
    assert.deepEqual(references.scenarios[0].inputs, (raw.scenarios as { inputs: unknown }[])[0].inputs);
  });

  test('a decoded ensemble is itself a fixture spec that builds the same vintage', async () => {
    const fixture = await fixtureOf(101);
    const ensemble = parseReferences(jsonBytes(buildReferences(fixture))).synthetic.ensembles[0];
    const rebuilt = await buildFixture(ensemble);
    assert.deepEqual(rebuilt.artifact, fixture.artifact);
    assert.deepEqual(rebuilt.manifest, fixture.manifest);
  });

  test('a missing key or a wrong JSON type rejects with read', async () => {
    const fixture = await fixtureOf(2);
    const missing = buildReferences(fixture);
    delete (missing.synthetic as { [key: string]: unknown }).conversion;
    assert.throws(
      () => parseReferences(jsonBytes(missing)),
      (e: unknown) => e instanceof LoadError && e.kind === 'read' && e.cause instanceof SchemaError,
    );
    const mistyped = buildReferences(fixture);
    mistyped.log_scale_min_decades = '2';
    assert.throws(
      () => parseReferences(jsonBytes(mistyped)),
      (e: unknown) => e instanceof LoadError && e.kind === 'read' && e.cause instanceof SchemaError,
    );
    assert.throws(
      () => parseReferences(new TextEncoder().encode('not json')),
      (e: unknown) => e instanceof LoadError && e.kind === 'read',
    );
  });

  test('an unsupported schema_version rejects with schema-version', async () => {
    const fixture = await fixtureOf(2);
    const raw = { ...buildReferences(fixture), schema_version: 2 };
    assert.throws(
      () => parseReferences(jsonBytes(raw)),
      (e: unknown) => e instanceof LoadError && e.kind === 'schema-version',
    );
  });
});
