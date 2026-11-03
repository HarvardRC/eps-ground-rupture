// fields.test.ts (docs/app/ddd.md §7.4, the `fields.test.ts` row; §5.2,
// The DD-10 mapping; §1 DD-10): the six name tables of
// src/decode/fields.ts are total and injective over the closed field
// lists of §3.2–§3.6 and the §5.6 canonical scenario object, transcribed
// below from those sections; every camelCase name is `snakeToCamel` of
// its snake_case name; decoding each format's fixture leaves no
// snake_case key outside the data-keyed maps and the verbatim
// `provenance` and `inputs` objects; and the three column lists equal
// the orders §3.1 and §5.9 fix.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { decodeVintage, loadFieldExport, loadRegression, parseReferences } from '../src/decode/decode';
import {
  FIELD_EXPORT_FIELDS,
  MANIFEST_FIELDS,
  POINTER_FIELDS,
  RECORDS_CSV_COLUMNS,
  REFERENCE_FIELDS,
  REGRESSION_FIELDS,
  SCENARIO_INPUT_FIELDS,
  STATISTICS_CSV_COLUMNS,
  TRIAL_TABLE_COLUMNS,
  mapRecord,
  snakeToCamel,
  type RecordSpec,
  type ValueSpec,
} from '../src/decode/fields';
import { parseScenario } from '../src/state/scenario-json';
import {
  buildFixture,
  buildPointer,
  buildReferences,
  expectationOf,
  fileReader,
  jsonBytes,
  stageCountSpec,
  vocabularySpec,
} from './fixtures';

// --------------------------------------------------------------------
// The closed field lists, transcribed from the DDD
// --------------------------------------------------------------------

/**
 * One member's shape: a scalar or an array of scalars (`L`); an opaque
 * object kept verbatim (`O`); a record, alone or as array elements, with
 * its closed field list; a data-keyed map, with any keys (`'data'`) or
 * exactly the listed ones, and its values' shape; or one of several
 * records.
 */
type Node =
  | 'L'
  | 'O'
  | { readonly record: Shape }
  | { readonly map: 'data' | readonly string[]; readonly value: Node }
  | { readonly oneOf: readonly Shape[] };
type Shape = { readonly [snakeKey: string]: Node };

const record = (shape: Shape): Node => ({ record: shape });
const dataMap = (value: Node): Node => ({ map: 'data', value });
const keyedMap = (keys: readonly string[], value: Node): Node => ({ map: keys, value });

const MEASUREMENTS = ['scarp_height', 'dzw', 'scarp_dip'];
const perMeasurement = (value: Node): Node => keyedMap(MEASUREMENTS, value);

// §3.2 Artifact manifest.
const MANIFEST: Shape = {
  schema_version: 'L',
  export_version: 'L',
  export_date: 'L',
  pipeline_version: 'L',
  provenance: 'O',
  counts: record({ records: 'L', trials: 'L', stages_per_trial: 'L' }),
  blocks: keyedMap(
    ['trial_table', 'slip', 'scarp_height', 'dzw', 'scarp_dip', 'scarp_class', 'dip_dictionary'],
    record({ offset: 'L', length: 'L', dtype: 'L' }),
  ),
  columns: keyedMap(
    ['slip', 'scarp_height', 'dzw', 'scarp_dip', 'scarp_class'],
    record({
      encoding: 'L',
      decimals: 'L',
      offset_steps: 'L',
      scale: 'L',
      offset: 'L',
      physical_min: 'L',
      physical_max: 'L',
      recording_step: 'L',
      null_sentinel: 'L',
      null_count: 'L',
    }),
  ),
  trial_columns: keyedMap(
    ['fault_dip', 'sediment_strength', 'cohesion', 'set', 'depth', 'density', 'model_family'],
    'L',
  ),
  arm_strength_states: record({ set: 'L', sediment_strength: 'L' }),
  scarp_classes: 'L',
  scarp_class_palette: dataMap('L'),
  trials: 'L',
  stage_spacing: record({ min: 'L', max: 'L', mean: 'L' }),
  slip_window_bounds: record({ min: 'L', max: 'L', recording_step: 'L' }),
  files: record({ scenario_artifact: 'L', field_export: 'L', regression_export: 'L', media_index: 'L' }),
  reference_results_version: 'L',
  checksums: dataMap('L'),
};

// §3.3 Pointer manifest.
const POINTER: Shape = {
  schema_version: 'L',
  data_tag: 'L',
  export_version: 'L',
  export_date: 'L',
  provenance: 'O',
  files: dataMap('L'),
};

// §3.4 and §3.5 envelope.
const ENVELOPE: Shape = { schema_version: 'L', export_version: 'L', export_date: 'L', pipeline_version: 'L' };

// §3.4 Field-data export.
const FIELD_EXPORT: Shape = {
  ...ENVELOPE,
  rows: record({
    source: 'L',
    eq_name: 'L',
    magnitude: 'L',
    analogue: 'L',
    source_quantity: 'L',
    value: 'L',
    limited_comparison: 'L',
    criterion_sub50: 'L',
    labeled_set: 'L',
    kern_field_group: 'L',
  }),
};

// §3.5 Regression export.
const VARIABLE: Node = record({ name: 'L', description: 'L', unit: 'L' });
const REGRESSION: Shape = {
  ...ENVELOPE,
  relationship: record({ y: VARIABLE, x: VARIABLE, form: 'L', fit: 'L', back_projection: 'L' }),
  coefficients: record({ fault_dip: 'L', n: 'L', slope: 'L', intercept: 'L', r2: 'L' }),
};

// §3.6 Reference results.
const COUNTS: Node = record({
  matching_records: 'L',
  unclassified: 'L',
  per_measurement: perMeasurement(record({ valid: 'L', excluded_null: 'L' })),
});
const STATISTICS: Shape = { median: 'L', p16: 'L', p84: 'L', min: 'L', max: 'L', mean: 'L', sd: 'L' };
const HISTOGRAM: Node = record({ rule: 'L', width_units: 'L', first_edge: 'L', bins: 'L', counts: 'L' });
const HISTOGRAM_LOG: Node = record({ first_edge: 'L', bins: 'L', counts: 'L', below_counts: 'L' });
const SELECTION: Node = { oneOf: [{ identities: 'L' }, { signature: 'L', count: 'L' }] };
const CONVERTED_WINDOW: Node = record({
  fault_dip: 'L',
  window_lo: 'L',
  window_hi: 'L',
  range_flag: 'L',
  window_lo_display: 'L',
  window_hi_display: 'L',
});
const WINDOWS: Node = dataMap(record({ lo: 'L', hi: 'L' }));
const REFERENCES: Shape = {
  schema_version: 'L',
  reference_version: 'L',
  export_version: 'L',
  export_date: 'L',
  pipeline_version: 'L',
  display_decimals: keyedMap(['slip', 'scarp_height', 'dzw', 'scarp_dip'], 'L'),
  log_scale_min_decades: 'L',
  scenarios: record({
    id: 'L',
    inputs: 'O',
    counts: COUNTS,
    statistics: perMeasurement(record(STATISTICS)),
    percentiles: perMeasurement('L'),
    histogram: perMeasurement(HISTOGRAM),
    histogram_log: keyedMap(['dzw'], HISTOGRAM_LOG),
    display: perMeasurement(record(STATISTICS)),
    selection: SELECTION,
    converted_windows: CONVERTED_WINDOW,
    diagnosed_conditions: 'L',
  }),
  boundary_cases: record({
    id: 'L',
    base: 'L',
    inputs: 'O',
    windows: WINDOWS,
    expected: record({ stored_bounds: dataMap('L'), counts: COUNTS, selection: SELECTION }),
  }),
  synthetic: record({
    ensembles: record({
      id: 'L',
      purpose: 'L',
      stages_per_trial: 'L',
      scarp_classes: 'L',
      trials: 'L',
      stages: keyedMap(['slip', 'scarp_height', 'dzw', 'scarp_dip', 'scarp_class'], 'L'),
      cases: record({
        id: 'L',
        inputs: 'O',
        windows: WINDOWS,
        expected: record({
          counts: COUNTS,
          selection: record({ identities: 'L' }),
          statistics: perMeasurement(record(STATISTICS)),
          diagnosed_conditions: 'L',
        }),
      }),
    }),
    statistics: record({
      id: 'L',
      decimals: 'L',
      steps: 'L',
      expected: record({ statistics: record(STATISTICS), percentiles: 'L' }),
    }),
    histograms: record({
      id: 'L',
      display_decimals: 'L',
      steps: 'L',
      class_codes: 'L',
      expected: record({ histogram: HISTOGRAM, histogram_log: HISTOGRAM_LOG }),
    }),
    display_rounding: record({ id: 'L', value: 'L', decimals: 'L', expected: 'L' }),
    conversion: record({
      id: 'L',
      slip_window_bounds: record({ max: 'L', recording_step: 'L' }),
      coefficients: record({ fault_dip: 'L', slope: 'L', intercept: 'L' }),
      offset_max: 'L',
      expected: record({ converted_windows: CONVERTED_WINDOW }),
    }),
  }),
};

// §5.6 Canonical scenario object.
const SCENARIO_INPUT: Shape = {
  fault_dip: 'L',
  sediment: record({ set: 'L', sediment_strength: 'L' }),
  depth: 'L',
  density: 'L',
  entry_mode: 'L',
  slip_window: record({ min: 'L', max: 'L' }),
  offset_max: 'L',
  population: 'L',
  scarp_class: 'L',
};

const TABLES: readonly (readonly [string, RecordSpec, Shape])[] = [
  ['MANIFEST_FIELDS', MANIFEST_FIELDS, MANIFEST],
  ['POINTER_FIELDS', POINTER_FIELDS, POINTER],
  ['FIELD_EXPORT_FIELDS', FIELD_EXPORT_FIELDS, FIELD_EXPORT],
  ['REGRESSION_FIELDS', REGRESSION_FIELDS, REGRESSION],
  ['REFERENCE_FIELDS', REFERENCE_FIELDS, REFERENCES],
  ['SCENARIO_INPUT_FIELDS', SCENARIO_INPUT_FIELDS, SCENARIO_INPUT],
];

// --------------------------------------------------------------------
// Table walk
// --------------------------------------------------------------------

/** A value spec without its array and nullable wrappers. */
function core(spec: ValueSpec): ValueSpec {
  if (spec.kind === 'nullable') return core(spec.value);
  if (spec.kind === 'array') return core(spec.element);
  return spec;
}

const SCALARS = new Set(['int', 'number', 'string', 'bool']);

/** Asserts that `spec` has the shape `node`; `optional` collects the optional members' paths. */
function assertNode(node: Node, spec: ValueSpec, path: string, optional: string[]): void {
  const c = core(spec);
  if (node === 'L') {
    const scalar =
      SCALARS.has(c.kind) || (c.kind === 'tuple' && c.elements.every((e) => SCALARS.has(core(e).kind)));
    assert.ok(scalar, `${path}: expected a scalar or scalar array, found ${c.kind}`);
  } else if (node === 'O') {
    assert.equal(c.kind, 'opaque', `${path}: expected an opaque object`);
  } else if ('record' in node) {
    assert.equal(c.kind, 'record', `${path}: expected a record`);
    if (c.kind === 'record') assertRecord(node.record, c.spec, path, optional);
  } else if ('map' in node) {
    if (node.map === 'data') {
      assert.equal(c.kind, 'map', `${path}: expected a data-keyed map`);
      if (c.kind === 'map') assertNode(node.value, c.value, `${path}[*]`, optional);
    } else {
      assert.equal(c.kind, 'keyedMap', `${path}: expected a map with fixed keys`);
      if (c.kind === 'keyedMap') {
        assert.deepEqual(Object.keys(c.values).sort(), [...node.map].sort(), `${path}: map keys`);
        for (const k of node.map) assertNode(node.value, c.values[k], `${path}[${k}]`, optional);
      }
    }
  } else {
    assert.equal(c.kind, 'oneOf', `${path}: expected one of several records`);
    if (c.kind === 'oneOf') {
      assert.equal(c.specs.length, node.oneOf.length, `${path}: alternatives`);
      node.oneOf.forEach((shape, i) => assertRecord(shape, c.specs[i], `${path}<${i}>`, optional));
    }
  }
}

/**
 * Asserts that `spec` is total and injective over the closed list
 * `shape`: exactly its keys, each once, and each camelCase name
 * `snakeToCamel` of its key and distinct from every other.
 */
function assertRecord(shape: Shape, spec: RecordSpec, path: string, optional: string[]): void {
  const keys = spec.map((f) => f.key);
  assert.deepEqual([...keys].sort(), Object.keys(shape).sort(), `${path}: the closed field list`);
  assert.equal(new Set(keys).size, keys.length, `${path}: a key listed twice`);
  const names = spec.map((f) => f.name);
  assert.equal(new Set(names).size, names.length, `${path}: two keys map to one name`);
  for (const f of spec) {
    const at = path === '' ? f.key : `${path}.${f.key}`;
    assert.equal(f.name, snakeToCamel(f.key), `${at}: camelCase name`);
    if (f.optional) optional.push(at);
    assertNode(shape[f.key], f.value, at, optional);
  }
}

describe('the DD-10 tables are total and injective over the closed field lists', () => {
  for (const [name, spec, shape] of TABLES) {
    test(name, () => {
      const optional: string[] = [];
      assertRecord(shape, spec, '', optional);
      // The one member a release may omit: the manifest's P2 files.media_index (§3.2).
      assert.deepEqual(optional, name === 'MANIFEST_FIELDS' ? ['files.media_index'] : []);
    });
  }

  test('snakeToCamel', () => {
    assert.equal(snakeToCamel('stages_per_trial'), 'stagesPerTrial');
    assert.equal(snakeToCamel('criterion_sub50'), 'criterionSub50');
    assert.equal(snakeToCamel('r2'), 'r2');
    assert.equal(snakeToCamel('schema_version'), 'schemaVersion');
  });
});

// --------------------------------------------------------------------
// No snake_case key left after decoding
// --------------------------------------------------------------------

/**
 * Paths, in decoded (camelCase) names with `*` for any array index or
 * map key, of the data-keyed maps of the §3 records-and-maps rule, whose
 * own keys stay verbatim, and of the verbatim objects, skipped whole.
 */
interface Exemptions {
  readonly dataMaps: readonly string[];
  readonly verbatim: readonly string[];
}

const SNAKE = /_/;

/** The snake_case keys at any depth of `v`, outside the exempt paths. */
function snakeKeys(v: unknown, exempt: Exemptions, path = ''): string[] {
  if (exempt.verbatim.includes(path)) return [];
  if (Array.isArray(v)) return v.flatMap((e) => snakeKeys(e, exempt, `${path}[*]`));
  if (v === null || typeof v !== 'object') return [];
  const isMap = exempt.dataMaps.includes(path);
  const found: string[] = [];
  for (const [k, value] of Object.entries(v)) {
    if (!isMap && SNAKE.test(k)) found.push(`${path}.${k}`);
    found.push(...snakeKeys(value, exempt, isMap ? `${path}.*` : `${path}.${k}`));
  }
  return found;
}

/** The keys of the data-keyed map at `path` of `v` (`*` matching the first element). */
function keysAt(v: unknown, path: string): string[] {
  let at: unknown = v;
  for (const part of path.split(/\.|(?=\[)/).filter((p) => p !== '')) {
    if (part === '[*]') at = (at as unknown[])[0];
    else at = (at as { [key: string]: unknown })[part];
  }
  return Object.keys(at as object);
}

describe('decoding each format leaves no snake_case key outside the data-keyed maps', () => {
  test('artifact manifest', async () => {
    const fixture = await buildFixture(stageCountSpec(2));
    const vintage = await decodeVintage(
      jsonBytes(fixture.manifest),
      fileReader(fixture.files).readFile,
      expectationOf(fixture),
    );
    const exempt = {
      dataMaps: ['.blocks', '.columns', '.trialColumns', '.scarpClassPalette', '.checksums'],
      verbatim: ['.provenance'],
    };
    assert.deepEqual(snakeKeys(vintage.manifest, exempt), []);
    // The map keys stay verbatim, snake_case included; provenance is the file's object.
    assert.deepEqual(keysAt(vintage.manifest, '.blocks'), Object.keys(fixture.manifest.blocks));
    assert.deepEqual(keysAt(vintage.manifest, '.trialColumns'), Object.keys(fixture.manifest.trial_columns));
    assert.deepEqual(vintage.manifest.provenance, fixture.manifest.provenance);
  });

  test('pointer manifest', async () => {
    const fixture = await buildFixture(stageCountSpec(2));
    const raw = await buildPointer(fixture);
    const pointer = mapRecord(raw, POINTER_FIELDS, 'pointer');
    assert.deepEqual(snakeKeys(pointer, { dataMaps: ['.files'], verbatim: ['.provenance'] }), []);
    assert.deepEqual(pointer.files, raw.files);
    assert.deepEqual(pointer.provenance, raw.provenance);
  });

  test('field-data and regression exports', async () => {
    const fixture = await buildFixture(stageCountSpec(2));
    const field = 'https://fixture.invalid/field.json.gz';
    const regression = 'https://fixture.invalid/regression.json.gz';
    const served = new Map([
      [field, fixture.files.get(fixture.manifest.files.field_export) as Uint8Array],
      [regression, fixture.files.get(fixture.manifest.files.regression_export) as Uint8Array],
    ]);
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (input: string | URL | Request): Promise<Response> => {
      const bytes = served.get(String(input));
      return bytes === undefined ? new Response(null, { status: 404 }) : new Response(bytes);
    };
    try {
      const version = fixture.manifest.export_version;
      const none = { dataMaps: [], verbatim: [] };
      assert.deepEqual(snakeKeys(await loadFieldExport(field, version), none), []);
      assert.deepEqual(snakeKeys(await loadRegression(regression, version), none), []);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test('reference results', async () => {
    const fixture = await buildFixture(stageCountSpec(2));
    const raw = buildReferences(fixture);
    const references = parseReferences(jsonBytes(raw));
    const scenario = '.scenarios[*]';
    const boundary = '.boundaryCases[*]';
    const ensemble = '.synthetic.ensembles[*]';
    const caseAt = `${ensemble}.cases[*]`;
    const exempt = {
      dataMaps: [
        '.displayDecimals',
        `${scenario}.counts.perMeasurement`,
        `${scenario}.statistics`,
        `${scenario}.percentiles`,
        `${scenario}.histogram`,
        `${scenario}.histogramLog`,
        `${scenario}.display`,
        `${boundary}.windows`,
        `${boundary}.expected.storedBounds`,
        `${boundary}.expected.counts.perMeasurement`,
        `${ensemble}.stages`,
        `${caseAt}.windows`,
        `${caseAt}.expected.counts.perMeasurement`,
        `${caseAt}.expected.statistics`,
      ],
      verbatim: [`${scenario}.inputs`, `${boundary}.inputs`, `${caseAt}.inputs`],
    };
    assert.deepEqual(snakeKeys(references, exempt), []);
    // The verbatim inputs keep their snake_case keys for parseScenario.
    const inputs = references.scenarios[0].inputs;
    assert.deepEqual(inputs, (raw.scenarios as { inputs: unknown }[])[0].inputs);
    assert.ok('fault_dip' in inputs && 'entry_mode' in inputs);
    assert.deepEqual(keysAt(references, `${ensemble}.stages`), [
      'slip',
      'scarp_height',
      'dzw',
      'scarp_dip',
      'scarp_class',
    ]);
  });

  test('canonical scenario object', async () => {
    const fixture = await buildFixture(vocabularySpec());
    const vintage = await decodeVintage(
      jsonBytes(fixture.manifest),
      fileReader(fixture.files).readFile,
      expectationOf(fixture),
    );
    const raw = buildReferences(fixture);
    const scenario = parseScenario((raw.scenarios as { inputs: unknown }[])[0].inputs, vintage.manifest);
    assert.deepEqual(snakeKeys(scenario, { dataMaps: [], verbatim: [] }), []);
  });
});

// --------------------------------------------------------------------
// Column orders
// --------------------------------------------------------------------

describe('the column lists in their §3.1 and §5.9 orders', () => {
  test('TRIAL_TABLE_COLUMNS: the §3.1 trial-table order', () => {
    assert.deepEqual(
      [...TRIAL_TABLE_COLUMNS],
      ['fault_dip', 'sediment_strength', 'cohesion', 'set', 'depth', 'density', 'model_family'],
    );
  });

  test('RECORDS_CSV_COLUMNS: trial, the trial conditions without model_family, the stage columns', () => {
    assert.deepEqual(
      [...RECORDS_CSV_COLUMNS],
      [
        'trial',
        'fault_dip',
        'sediment_strength',
        'cohesion',
        'set',
        'depth',
        'density',
        'slip',
        'scarp_height',
        'dzw',
        'scarp_dip',
        'scarp_class',
      ],
    );
    assert.deepEqual(
      RECORDS_CSV_COLUMNS.slice(1, 7),
      TRIAL_TABLE_COLUMNS.filter((c) => c !== 'model_family'),
    );
  });

  test('STATISTICS_CSV_COLUMNS: the §5.9 header', () => {
    assert.deepEqual(
      [...STATISTICS_CSV_COLUMNS],
      [
        'measurement',
        'label',
        'valid',
        'excluded_null',
        'median',
        'p16',
        'p84',
        'min',
        'max',
        'mean',
        'sd',
        'median_full',
        'p16_full',
        'p84_full',
        'min_full',
        'max_full',
        'mean_full',
        'sd_full',
      ],
    );
  });
});
