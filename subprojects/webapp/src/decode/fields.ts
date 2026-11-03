// The DD-10 mapping point (docs/app/ddd.md §5.2, The DD-10 mapping;
// §1 DD-10 — Field-naming convention at the pipeline-to-application
// boundary). Every structural key of every JSON format the TypeScript
// reads — the artifact manifest (§3.2), the pointer manifest (§3.3),
// the field and regression exports (§3.4, §3.5), the reference results
// (§3.6), and the canonical scenario object (§5.6) — is renamed here,
// nested members included, to its `snakeToCamel` form, and only here.
//
// Never renamed: the keys of data-keyed maps (block, column,
// measurement, class, or file names, and dips written as decimal
// strings), kept verbatim; enumerated values; `provenance`, carried as
// one opaque object; and every §3.6 `inputs` object, kept verbatim for
// `parseScenario` (src/state/scenario-json.ts) to map strictly through
// SCENARIO_INPUT_FIELDS. No file of src/decode/ imports src/state/.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

/** The thirteen DD-10 names of pipeline columns (§1 DD-10). */
export type ColumnName =
  | 'trial'
  | 'fault_dip'
  | 'sediment_strength'
  | 'cohesion'
  | 'set'
  | 'depth'
  | 'density'
  | 'slip'
  | 'scarp_height'
  | 'dzw'
  | 'scarp_dip'
  | 'scarp_class'
  | 'us_ud';

/** The seven blocks of the scenario artifact (§3.1, §3.2 `blocks`). */
export type BlockName =
  | 'trial_table'
  | 'slip'
  | 'scarp_height'
  | 'dzw'
  | 'scarp_dip'
  | 'scarp_class'
  | 'dip_dictionary';

/**
 * The trial-table column order, fixed by schema version 1 (§3.1) and
 * never read from the manifest's `trial_columns`, whose keys the
 * canonical JSON form sorts alphabetically.
 */
export const TRIAL_TABLE_COLUMNS = [
  'fault_dip',
  'sediment_strength',
  'cohesion',
  'set',
  'depth',
  'density',
  'model_family',
] as const;

/**
 * The `records.csv` header (§5.9): `trial`; the trial conditions in the
 * TRIAL_TABLE_COLUMNS order without `model_family`; the stage columns.
 */
export const RECORDS_CSV_COLUMNS = [
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
] as const;

/**
 * The `statistics.csv` header (§5.9): `measurement`, `label`, the two
 * counts, the FR-O2 set display-rounded under the §3.6 keys, then the
 * same set at full precision.
 */
export const STATISTICS_CSV_COLUMNS = [
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
] as const;

/** The camelCase form of a snake_case name: `stages_per_trial` → `stagesPerTrial`. */
export function snakeToCamel(name: string): string {
  return name.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

// --------------------------------------------------------------------
// Specs
// --------------------------------------------------------------------

/**
 * The JSON shape of one value. `int` is a JSON number with an integer
 * value, `number` a finite JSON number; `opaque` is a JSON object carried
 * through as is (`provenance`, `inputs`); `map` is a data-keyed map whose
 * keys stay verbatim, and `keyedMap` one with exactly the listed keys,
 * each with its own value spec; `oneOf` takes the first record spec the
 * value satisfies.
 */
export type ValueSpec =
  | { readonly kind: 'int' }
  | { readonly kind: 'number' }
  | { readonly kind: 'string' }
  | { readonly kind: 'bool' }
  | { readonly kind: 'opaque' }
  | { readonly kind: 'nullable'; readonly value: ValueSpec }
  | { readonly kind: 'record'; readonly spec: RecordSpec }
  | { readonly kind: 'oneOf'; readonly specs: readonly RecordSpec[] }
  | { readonly kind: 'array'; readonly element: ValueSpec }
  | { readonly kind: 'tuple'; readonly elements: readonly ValueSpec[] }
  | { readonly kind: 'map'; readonly value: ValueSpec }
  | { readonly kind: 'keyedMap'; readonly values: Readonly<Record<string, ValueSpec>> };

/**
 * One record member: its snake_case `key` in the file, its camelCase
 * `name` (`snakeToCamel(key)`), and its value spec. `optional` marks the
 * one member a release may omit: the manifest's P2 `files.media_index`.
 */
export interface FieldSpec {
  readonly key: string;
  readonly name: string;
  readonly value: ValueSpec;
  readonly optional?: true;
}

/** A record's closed field list. */
export type RecordSpec = readonly FieldSpec[];

const INT: ValueSpec = { kind: 'int' };
const NUM: ValueSpec = { kind: 'number' };
const STR: ValueSpec = { kind: 'string' };
const BOOL: ValueSpec = { kind: 'bool' };
const OPAQUE: ValueSpec = { kind: 'opaque' };
const nullable = (value: ValueSpec): ValueSpec => ({ kind: 'nullable', value });
const record = (spec: RecordSpec): ValueSpec => ({ kind: 'record', spec });
const oneOf = (...specs: RecordSpec[]): ValueSpec => ({ kind: 'oneOf', specs });
const array = (element: ValueSpec): ValueSpec => ({ kind: 'array', element });
const tuple = (...elements: ValueSpec[]): ValueSpec => ({ kind: 'tuple', elements });
const map = (value: ValueSpec): ValueSpec => ({ kind: 'map', value });
const keyedMap = (values: Readonly<Record<string, ValueSpec>>): ValueSpec => ({
  kind: 'keyedMap',
  values,
});
const field = (key: string, name: string, value: ValueSpec): FieldSpec => ({ key, name, value });
const optionalField = (key: string, name: string, value: ValueSpec): FieldSpec => ({
  key,
  name,
  value,
  optional: true,
});

/** A map keyed by the three measurement names (§3.6 scenario entry). */
const perMeasurement = (value: ValueSpec): ValueSpec =>
  keyedMap({ scarp_height: value, dzw: value, scarp_dip: value });

// --------------------------------------------------------------------
// §3.2 Artifact manifest
// --------------------------------------------------------------------

const BLOCK_FIELDS: RecordSpec = [
  field('offset', 'offset', INT),
  field('length', 'length', INT),
  field('dtype', 'dtype', STR),
];

const COLUMN_FIELDS: RecordSpec = [
  field('encoding', 'encoding', STR),
  field('decimals', 'decimals', nullable(INT)),
  field('offset_steps', 'offsetSteps', nullable(INT)),
  field('scale', 'scale', nullable(NUM)),
  field('offset', 'offset', nullable(NUM)),
  field('physical_min', 'physicalMin', nullable(NUM)),
  field('physical_max', 'physicalMax', nullable(NUM)),
  field('recording_step', 'recordingStep', nullable(NUM)),
  field('null_sentinel', 'nullSentinel', INT),
  field('null_count', 'nullCount', INT),
];

export const MANIFEST_FIELDS: RecordSpec = [
  field('schema_version', 'schemaVersion', INT),
  field('export_version', 'exportVersion', STR),
  field('export_date', 'exportDate', STR),
  field('pipeline_version', 'pipelineVersion', STR),
  field('provenance', 'provenance', OPAQUE),
  field(
    'counts',
    'counts',
    record([
      field('records', 'records', INT),
      field('trials', 'trials', INT),
      field('stages_per_trial', 'stagesPerTrial', INT),
    ]),
  ),
  field(
    'blocks',
    'blocks',
    keyedMap({
      trial_table: record(BLOCK_FIELDS),
      slip: record(BLOCK_FIELDS),
      scarp_height: record(BLOCK_FIELDS),
      dzw: record(BLOCK_FIELDS),
      scarp_dip: record(BLOCK_FIELDS),
      scarp_class: record(BLOCK_FIELDS),
      dip_dictionary: record(BLOCK_FIELDS),
    }),
  ),
  field(
    'columns',
    'columns',
    keyedMap({
      slip: record(COLUMN_FIELDS),
      scarp_height: record(COLUMN_FIELDS),
      dzw: record(COLUMN_FIELDS),
      scarp_dip: record(COLUMN_FIELDS),
      scarp_class: record(COLUMN_FIELDS),
    }),
  ),
  field(
    'trial_columns',
    'trialColumns',
    keyedMap({
      fault_dip: array(INT),
      sediment_strength: array(STR),
      cohesion: array(STR),
      set: array(STR),
      depth: array(INT),
      density: array(STR),
      model_family: array(STR),
    }),
  ),
  field(
    'arm_strength_states',
    'armStrengthStates',
    array(
      record([field('set', 'set', STR), field('sediment_strength', 'sedimentStrength', STR)]),
    ),
  ),
  field('scarp_classes', 'scarpClasses', array(STR)),
  field('scarp_class_palette', 'scarpClassPalette', map(STR)),
  field('trials', 'trials', array(STR)),
  field(
    'stage_spacing',
    'stageSpacing',
    record([field('min', 'min', NUM), field('max', 'max', NUM), field('mean', 'mean', NUM)]),
  ),
  field(
    'slip_window_bounds',
    'slipWindowBounds',
    record([
      field('min', 'min', NUM),
      field('max', 'max', NUM),
      field('recording_step', 'recordingStep', NUM),
    ]),
  ),
  field(
    'files',
    'files',
    record([
      field('scenario_artifact', 'scenarioArtifact', STR),
      field('field_export', 'fieldExport', STR),
      field('regression_export', 'regressionExport', STR),
      optionalField('media_index', 'mediaIndex', STR),
    ]),
  ),
  field('reference_results_version', 'referenceResultsVersion', STR),
  field('checksums', 'checksums', map(STR)),
];

// --------------------------------------------------------------------
// §3.3 Pointer manifest
// --------------------------------------------------------------------

export const POINTER_FIELDS: RecordSpec = [
  field('schema_version', 'schemaVersion', INT),
  field('data_tag', 'dataTag', STR),
  field('export_version', 'exportVersion', STR),
  field('export_date', 'exportDate', STR),
  field('provenance', 'provenance', OPAQUE),
  field('files', 'files', map(STR)),
];

// --------------------------------------------------------------------
// §3.4 Field-data export
// --------------------------------------------------------------------

const ENVELOPE_FIELDS: RecordSpec = [
  field('schema_version', 'schemaVersion', INT),
  field('export_version', 'exportVersion', STR),
  field('export_date', 'exportDate', STR),
  field('pipeline_version', 'pipelineVersion', STR),
];

const FIELD_ROW_FIELDS: RecordSpec = [
  field('source', 'source', STR),
  field('eq_name', 'eqName', STR),
  field('magnitude', 'magnitude', nullable(NUM)),
  field('analogue', 'analogue', STR),
  field('source_quantity', 'sourceQuantity', STR),
  field('value', 'value', NUM),
  field('limited_comparison', 'limitedComparison', BOOL),
  field('criterion_sub50', 'criterionSub50', STR),
  field('labeled_set', 'labeledSet', BOOL),
  field('kern_field_group', 'kernFieldGroup', nullable(STR)),
];

export const FIELD_EXPORT_FIELDS: RecordSpec = [
  ...ENVELOPE_FIELDS,
  field('rows', 'rows', array(record(FIELD_ROW_FIELDS))),
];

// --------------------------------------------------------------------
// §3.5 Regression export
// --------------------------------------------------------------------

const VARIABLE_FIELDS: RecordSpec = [
  field('name', 'name', STR),
  field('description', 'description', STR),
  field('unit', 'unit', STR),
];

export const REGRESSION_FIELDS: RecordSpec = [
  ...ENVELOPE_FIELDS,
  field(
    'relationship',
    'relationship',
    record([
      field('y', 'y', record(VARIABLE_FIELDS)),
      field('x', 'x', record(VARIABLE_FIELDS)),
      field('form', 'form', STR),
      field('fit', 'fit', STR),
      field('back_projection', 'backProjection', STR),
    ]),
  ),
  field(
    'coefficients',
    'coefficients',
    array(
      record([
        field('fault_dip', 'faultDip', INT),
        field('n', 'n', INT),
        field('slope', 'slope', NUM),
        field('intercept', 'intercept', NUM),
        field('r2', 'r2', NUM),
      ]),
    ),
  ),
];

// --------------------------------------------------------------------
// §3.6 Reference results
// --------------------------------------------------------------------

const COUNTS_FIELDS: RecordSpec = [
  field('matching_records', 'matchingRecords', INT),
  field('unclassified', 'unclassified', INT),
  field(
    'per_measurement',
    'perMeasurement',
    perMeasurement(
      record([field('valid', 'valid', INT), field('excluded_null', 'excludedNull', INT)]),
    ),
  ),
];

const STATISTICS_FIELDS: RecordSpec = [
  field('median', 'median', NUM),
  field('p16', 'p16', NUM),
  field('p84', 'p84', NUM),
  field('min', 'min', NUM),
  field('max', 'max', NUM),
  field('mean', 'mean', NUM),
  field('sd', 'sd', nullable(NUM)),
];

const HISTOGRAM_FIELDS: RecordSpec = [
  field('rule', 'rule', STR),
  field('width_units', 'widthUnits', INT),
  field('first_edge', 'firstEdge', INT),
  field('bins', 'bins', INT),
  field('counts', 'counts', array(array(INT))),
];

const HISTOGRAM_LOG_FIELDS: RecordSpec = [
  field('first_edge', 'firstEdge', INT),
  field('bins', 'bins', INT),
  field('counts', 'counts', array(array(INT))),
  field('below_counts', 'belowCounts', array(INT)),
];

const DISPLAY_FIELDS: RecordSpec = [
  field('median', 'median', STR),
  field('p16', 'p16', STR),
  field('p84', 'p84', STR),
  field('min', 'min', STR),
  field('max', 'max', STR),
  field('mean', 'mean', STR),
  field('sd', 'sd', nullable(STR)),
];

/** `[trial, stage_index, class_code]`, one per selected record (§3.6 Selection). */
const IDENTITIES_FIELDS: RecordSpec = [field('identities', 'identities', array(tuple(STR, INT, INT)))];

const SIGNATURE_FIELDS: RecordSpec = [
  field('signature', 'signature', STR),
  field('count', 'count', INT),
];

const CONVERTED_WINDOW_FIELDS: RecordSpec = [
  field('fault_dip', 'faultDip', INT),
  field('window_lo', 'windowLo', NUM),
  field('window_hi', 'windowHi', NUM),
  field('range_flag', 'rangeFlag', STR),
  field('window_lo_display', 'windowLoDisplay', STR),
  field('window_hi_display', 'windowHiDisplay', STR),
];

/** A dip-keyed map of converted windows {`lo`, `hi`}, or null (slip path). */
const WINDOWS = nullable(map(record([field('lo', 'lo', NUM), field('hi', 'hi', NUM)])));

const SCENARIO_ENTRY_FIELDS: RecordSpec = [
  field('id', 'id', STR),
  field('inputs', 'inputs', OPAQUE),
  field('counts', 'counts', record(COUNTS_FIELDS)),
  field('statistics', 'statistics', perMeasurement(nullable(record(STATISTICS_FIELDS)))),
  field('percentiles', 'percentiles', perMeasurement(nullable(array(NUM)))),
  field('histogram', 'histogram', perMeasurement(nullable(record(HISTOGRAM_FIELDS)))),
  field('histogram_log', 'histogramLog', keyedMap({ dzw: nullable(record(HISTOGRAM_LOG_FIELDS)) })),
  field('display', 'display', perMeasurement(nullable(record(DISPLAY_FIELDS)))),
  field('selection', 'selection', oneOf(IDENTITIES_FIELDS, SIGNATURE_FIELDS)),
  field('converted_windows', 'convertedWindows', nullable(array(record(CONVERTED_WINDOW_FIELDS)))),
  field('diagnosed_conditions', 'diagnosedConditions', nullable(array(STR))),
];

const BOUNDARY_CASE_FIELDS: RecordSpec = [
  field('id', 'id', STR),
  field('base', 'base', STR),
  field('inputs', 'inputs', OPAQUE),
  field('windows', 'windows', WINDOWS),
  field(
    'expected',
    'expected',
    record([
      field('stored_bounds', 'storedBounds', map(tuple(INT, INT))),
      field('counts', 'counts', record(COUNTS_FIELDS)),
      field('selection', 'selection', oneOf(IDENTITIES_FIELDS, SIGNATURE_FIELDS)),
    ]),
  ),
];

const SYNTHETIC_CASE_FIELDS: RecordSpec = [
  field('id', 'id', STR),
  field('inputs', 'inputs', OPAQUE),
  field('windows', 'windows', WINDOWS),
  field(
    'expected',
    'expected',
    record([
      field('counts', 'counts', record(COUNTS_FIELDS)),
      field('selection', 'selection', record(IDENTITIES_FIELDS)),
      field('statistics', 'statistics', perMeasurement(nullable(record(STATISTICS_FIELDS)))),
      field('diagnosed_conditions', 'diagnosedConditions', nullable(array(STR))),
    ]),
  ),
];

const ENSEMBLE_FIELDS: RecordSpec = [
  field('id', 'id', STR),
  field('purpose', 'purpose', STR),
  field('stages_per_trial', 'stagesPerTrial', INT),
  field('scarp_classes', 'scarpClasses', array(STR)),
  // [trial, fault_dip, sediment_strength, cohesion, set, depth, density]
  field('trials', 'trials', array(tuple(STR, INT, STR, STR, STR, INT, STR))),
  field(
    'stages',
    'stages',
    keyedMap({
      slip: array(INT),
      scarp_height: array(nullable(INT)),
      dzw: array(nullable(INT)),
      scarp_dip: array(nullable(INT)),
      scarp_class: array(nullable(STR)),
    }),
  ),
  field('cases', 'cases', array(record(SYNTHETIC_CASE_FIELDS))),
];

const STATISTICS_CASE_FIELDS: RecordSpec = [
  field('id', 'id', STR),
  field('decimals', 'decimals', INT),
  field('steps', 'steps', array(INT)),
  field(
    'expected',
    'expected',
    record([
      field('statistics', 'statistics', nullable(record(STATISTICS_FIELDS))),
      field('percentiles', 'percentiles', nullable(array(NUM))),
    ]),
  ),
];

const HISTOGRAM_CASE_FIELDS: RecordSpec = [
  field('id', 'id', STR),
  field('display_decimals', 'displayDecimals', INT),
  field('steps', 'steps', array(INT)),
  field('class_codes', 'classCodes', array(INT)),
  field(
    'expected',
    'expected',
    record([
      field('histogram', 'histogram', nullable(record(HISTOGRAM_FIELDS))),
      field('histogram_log', 'histogramLog', nullable(record(HISTOGRAM_LOG_FIELDS))),
    ]),
  ),
];

const DISPLAY_ROUNDING_CASE_FIELDS: RecordSpec = [
  field('id', 'id', STR),
  field('value', 'value', NUM),
  field('decimals', 'decimals', INT),
  field('expected', 'expected', STR),
];

const CONVERSION_CASE_FIELDS: RecordSpec = [
  field('id', 'id', STR),
  field(
    'slip_window_bounds',
    'slipWindowBounds',
    record([field('max', 'max', NUM), field('recording_step', 'recordingStep', NUM)]),
  ),
  field(
    'coefficients',
    'coefficients',
    array(
      record([
        field('fault_dip', 'faultDip', INT),
        field('slope', 'slope', NUM),
        field('intercept', 'intercept', NUM),
      ]),
    ),
  ),
  field('offset_max', 'offsetMax', STR),
  field(
    'expected',
    'expected',
    record([
      field(
        'converted_windows',
        'convertedWindows',
        nullable(array(record(CONVERTED_WINDOW_FIELDS))),
      ),
    ]),
  ),
];

export const REFERENCE_FIELDS: RecordSpec = [
  field('schema_version', 'schemaVersion', INT),
  field('reference_version', 'referenceVersion', STR),
  field('export_version', 'exportVersion', STR),
  field('export_date', 'exportDate', STR),
  field('pipeline_version', 'pipelineVersion', STR),
  field(
    'display_decimals',
    'displayDecimals',
    keyedMap({ slip: INT, scarp_height: INT, dzw: INT, scarp_dip: INT }),
  ),
  field('log_scale_min_decades', 'logScaleMinDecades', INT),
  field('scenarios', 'scenarios', array(record(SCENARIO_ENTRY_FIELDS))),
  field('boundary_cases', 'boundaryCases', array(record(BOUNDARY_CASE_FIELDS))),
  field(
    'synthetic',
    'synthetic',
    record([
      field('ensembles', 'ensembles', array(record(ENSEMBLE_FIELDS))),
      field('statistics', 'statistics', array(record(STATISTICS_CASE_FIELDS))),
      field('histograms', 'histograms', array(record(HISTOGRAM_CASE_FIELDS))),
      field('display_rounding', 'displayRounding', array(record(DISPLAY_ROUNDING_CASE_FIELDS))),
      field('conversion', 'conversion', array(record(CONVERSION_CASE_FIELDS))),
    ]),
  ),
];

// --------------------------------------------------------------------
// §5.6 Canonical scenario object (DD-11)
// --------------------------------------------------------------------

/**
 * The canonical scenario object's members (§5.6). `parseScenario` maps a
 * scenario object through this table and interprets it; the unknown-key
 * rejection that §5.6 requires of it is `parseScenario`'s, since
 * `mapRecord` drops unknown keys.
 */
export const SCENARIO_INPUT_FIELDS: RecordSpec = [
  field('fault_dip', 'faultDip', array(INT)),
  field(
    'sediment',
    'sediment',
    array(record([field('set', 'set', STR), field('sediment_strength', 'sedimentStrength', STR)])),
  ),
  field('depth', 'depth', array(INT)),
  field('density', 'density', array(STR)),
  field('entry_mode', 'entryMode', STR),
  field(
    'slip_window',
    'slipWindow',
    nullable(record([field('min', 'min', STR), field('max', 'max', STR)])),
  ),
  field('offset_max', 'offsetMax', nullable(STR)),
  field('population', 'population', STR),
  field('scarp_class', 'scarpClass', array(STR)),
];

// --------------------------------------------------------------------
// mapRecord
// --------------------------------------------------------------------

/**
 * A missing required key or a wrong JSON type, found by `mapRecord`:
 * `path` locates the containing record, array, or map; `key` names the
 * member, map key, or array index (null when the value at `path` itself
 * is not a JSON object). The loaders report it as a `LoadError` of kind
 * `'read'` (§5.10).
 */
export class SchemaError extends Error {
  readonly path: string;
  readonly key: string | null;

  constructor(path: string, key: string | null, detail = 'missing or of the wrong JSON type') {
    super(`${key === null ? path : `${path}: ${JSON.stringify(key)}`}: ${detail}`);
    this.name = 'SchemaError';
    this.path = path;
    this.key = key;
  }
}

type JsonObject = { readonly [key: string]: unknown };

function isObject(v: unknown): v is JsonObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function describe(v: unknown): string {
  if (v === undefined) return 'nothing';
  try {
    const text = JSON.stringify(v);
    return text.length > 60 ? `${text.slice(0, 57)}...` : text;
  } catch {
    return String(v);
  }
}

/** Sets a data key verbatim, `__proto__` included, as an own property. */
function setOwn(out: Record<string, unknown>, key: string, value: unknown): void {
  Object.defineProperty(out, key, { value, enumerable: true, writable: true, configurable: true });
}

function has(o: JsonObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(o, key);
}

/**
 * Maps `v`, the member `key` of the container at `path`, by `spec`;
 * `here` is the location of `v` itself, the path of its own members.
 */
function mapValue(v: unknown, spec: ValueSpec, path: string, key: string, here: string): unknown {
  const wrong = (expected: string): SchemaError =>
    new SchemaError(path, key, `expected ${expected}, found ${describe(v)}`);
  switch (spec.kind) {
    case 'int':
      if (typeof v !== 'number' || !Number.isInteger(v)) throw wrong('an integer');
      return v;
    case 'number':
      if (typeof v !== 'number' || !Number.isFinite(v)) throw wrong('a finite number');
      return v;
    case 'string':
      if (typeof v !== 'string') throw wrong('a string');
      return v;
    case 'bool':
      if (typeof v !== 'boolean') throw wrong('a boolean');
      return v;
    case 'opaque':
      if (!isObject(v)) throw wrong('a JSON object');
      return v;
    case 'nullable':
      return v === null ? null : mapValue(v, spec.value, path, key, here);
    case 'record':
      if (!isObject(v)) throw wrong('a JSON object');
      return mapMembers(v, spec.spec, here);
    case 'oneOf': {
      if (!isObject(v)) throw wrong('a JSON object');
      let last: SchemaError | null = null;
      for (const option of spec.specs) {
        try {
          return mapMembers(v, option, here);
        } catch (e) {
          if (!(e instanceof SchemaError)) throw e;
          last = e;
        }
      }
      throw last ?? wrong('a JSON object');
    }
    case 'array':
      if (!Array.isArray(v)) throw wrong('an array');
      return v.map((e: unknown, i) => mapValue(e, spec.element, here, String(i), `${here}[${i}]`));
    case 'tuple':
      if (!Array.isArray(v) || v.length !== spec.elements.length) {
        throw wrong(`an array of ${spec.elements.length}`);
      }
      return spec.elements.map((s, i) =>
        mapValue(v[i] as unknown, s, here, String(i), `${here}[${i}]`),
      );
    case 'map': {
      if (!isObject(v)) throw wrong('a JSON object');
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v)) {
        setOwn(out, k, mapValue(v[k], spec.value, here, k, `${here}[${JSON.stringify(k)}]`));
      }
      return out;
    }
    case 'keyedMap': {
      if (!isObject(v)) throw wrong('a JSON object');
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(spec.values)) {
        if (!has(v, k)) throw new SchemaError(here, k, 'missing required key');
        setOwn(out, k, mapValue(v[k], spec.values[k], here, k, `${here}[${JSON.stringify(k)}]`));
      }
      return out;
    }
  }
}

function mapMembers(raw: JsonObject, spec: RecordSpec, path: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of spec) {
    if (!has(raw, f.key)) {
      if (f.optional) continue;
      throw new SchemaError(path, f.key, 'missing required key');
    }
    out[f.name] = mapValue(raw[f.key], f.value, path, f.key, `${path}.${f.key}`);
  }
  return out;
}

/**
 * Renames the keys of the record `raw` by `spec`, nested members
 * included, and checks each member's JSON type; drops unknown keys (the
 * unlisted-members rule of §3); keeps data-keyed maps, `provenance`, and
 * `inputs` verbatim. Throws `SchemaError(path, key)` on a missing
 * required key or a wrong JSON type.
 */
export function mapRecord(raw: unknown, spec: RecordSpec, path: string): Record<string, unknown> {
  if (!isObject(raw)) throw new SchemaError(path, null, `expected a JSON object, found ${describe(raw)}`);
  return mapMembers(raw, spec, path);
}

// --------------------------------------------------------------------
// Mapped types
// --------------------------------------------------------------------

type StageColumnName = Extract<ColumnName, 'slip' | 'scarp_height' | 'dzw' | 'scarp_dip' | 'scarp_class'>;
type MeasurementName = Extract<ColumnName, 'scarp_height' | 'dzw' | 'scarp_dip'>;
type PerMeasurement<T> = { readonly [m in MeasurementName]: T };

/** A `blocks` entry (§3.2). */
export interface ManifestBlock {
  readonly offset: number;
  readonly length: number;
  readonly dtype: string;
}

/** A `columns` entry (§3.2, `columns` members). */
export interface ManifestColumn {
  readonly encoding: string;
  readonly decimals: number | null;
  readonly offsetSteps: number | null;
  readonly scale: number | null;
  readonly offset: number | null;
  readonly physicalMin: number | null;
  readonly physicalMax: number | null;
  readonly recordingStep: number | null;
  readonly nullSentinel: number;
  readonly nullCount: number;
}

/** The artifact manifest (§3.2) mapped through MANIFEST_FIELDS. */
export interface Manifest {
  readonly schemaVersion: number;
  readonly exportVersion: string;
  readonly exportDate: string;
  readonly pipelineVersion: string;
  readonly provenance: { readonly [key: string]: unknown };
  readonly counts: {
    readonly records: number;
    readonly trials: number;
    readonly stagesPerTrial: number;
  };
  readonly blocks: { readonly [b in BlockName]: ManifestBlock };
  readonly columns: { readonly [c in StageColumnName]: ManifestColumn };
  readonly trialColumns: {
    readonly fault_dip: readonly number[];
    readonly sediment_strength: readonly string[];
    readonly cohesion: readonly string[];
    readonly set: readonly string[];
    readonly depth: readonly number[];
    readonly density: readonly string[];
    readonly model_family: readonly string[];
  };
  readonly armStrengthStates: readonly { readonly set: string; readonly sedimentStrength: string }[];
  readonly scarpClasses: readonly string[];
  readonly scarpClassPalette: { readonly [scarpClass: string]: string };
  readonly trials: readonly string[];
  readonly stageSpacing: { readonly min: number; readonly max: number; readonly mean: number };
  readonly slipWindowBounds: {
    readonly min: number;
    readonly max: number;
    readonly recordingStep: number;
  };
  readonly files: {
    readonly scenarioArtifact: string;
    readonly fieldExport: string;
    readonly regressionExport: string;
    readonly mediaIndex?: string;
  };
  readonly referenceResultsVersion: string;
  readonly checksums: { readonly [fileName: string]: string };
}

/** The pointer manifest (§3.3) mapped through POINTER_FIELDS. */
export interface Pointer {
  readonly schemaVersion: number;
  readonly dataTag: string;
  readonly exportVersion: string;
  readonly exportDate: string;
  readonly provenance: { readonly [key: string]: unknown };
  readonly files: { readonly [fileName: string]: string };
}

/** One row of the field-data export (§3.4). */
export interface FieldRow {
  readonly source: string;
  readonly eqName: string;
  readonly magnitude: number | null;
  readonly analogue: string;
  readonly sourceQuantity: string;
  readonly value: number;
  readonly limitedComparison: boolean;
  readonly criterionSub50: string;
  readonly labeledSet: boolean;
  readonly kernFieldGroup: string | null;
}

/** The field-data export (§3.4) mapped through FIELD_EXPORT_FIELDS. */
export interface FieldExport {
  readonly schemaVersion: number;
  readonly exportVersion: string;
  readonly exportDate: string;
  readonly pipelineVersion: string;
  readonly rows: readonly FieldRow[];
}

/** A `relationship` variable (§3.5). */
export interface RegressionVariable {
  readonly name: string;
  readonly description: string;
  readonly unit: string;
}

/** One `coefficients` row (§3.5). */
export interface RegressionCoefficient {
  readonly faultDip: number;
  readonly n: number;
  readonly slope: number;
  readonly intercept: number;
  readonly r2: number;
}

/** The regression export (§3.5) mapped through REGRESSION_FIELDS. */
export interface Regression {
  readonly schemaVersion: number;
  readonly exportVersion: string;
  readonly exportDate: string;
  readonly pipelineVersion: string;
  readonly relationship: {
    readonly y: RegressionVariable;
    readonly x: RegressionVariable;
    readonly form: string;
    readonly fit: string;
    readonly backProjection: string;
  };
  readonly coefficients: readonly RegressionCoefficient[];
}

/** A scenario entry's `counts` (§3.6). */
export interface ReferenceCounts {
  readonly matchingRecords: number;
  readonly unclassified: number;
  readonly perMeasurement: PerMeasurement<{ readonly valid: number; readonly excludedNull: number }>;
}

/** The FR-O2 set of one measurement (§3.6 `statistics`). */
export interface ReferenceStatistics {
  readonly median: number;
  readonly p16: number;
  readonly p84: number;
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly sd: number | null;
}

/** One measurement's linear histogram (§3.6 `histogram`). */
export interface ReferenceHistogram {
  readonly rule: string;
  readonly widthUnits: number;
  readonly firstEdge: number;
  readonly bins: number;
  readonly counts: readonly (readonly number[])[];
}

/** The width panel's logarithmic histogram (§3.6 `histogram_log`). */
export interface ReferenceHistogramLog {
  readonly firstEdge: number;
  readonly bins: number;
  readonly counts: readonly (readonly number[])[];
  readonly belowCounts: readonly number[];
}

/** One measurement's display strings (§3.6 `display`). */
export interface ReferenceDisplay {
  readonly median: string;
  readonly p16: string;
  readonly p84: string;
  readonly min: string;
  readonly max: string;
  readonly mean: string;
  readonly sd: string | null;
}

/** `[trial, stage_index, class_code]` (§3.6 Selection). */
export type ReferenceIdentity = readonly [string, number, number];

/** A §3.6 selection: its identities, or its signature and count. */
export type ReferenceSelection =
  | { readonly identities: readonly ReferenceIdentity[] }
  | { readonly signature: string; readonly count: number };

/** One `converted_windows` record (§3.6). */
export interface ReferenceConvertedWindow {
  readonly faultDip: number;
  readonly windowLo: number;
  readonly windowHi: number;
  readonly rangeFlag: string;
  readonly windowLoDisplay: string;
  readonly windowHiDisplay: string;
}

/** A dip-keyed map of converted windows (§3.6 `windows`). */
export type ReferenceWindows = { readonly [dip: string]: { readonly lo: number; readonly hi: number } };

/** A golden-scenario entry (§3.6). `inputs` is the verbatim scenario object. */
export interface ReferenceScenario {
  readonly id: string;
  readonly inputs: { readonly [key: string]: unknown };
  readonly counts: ReferenceCounts;
  readonly statistics: PerMeasurement<ReferenceStatistics | null>;
  readonly percentiles: PerMeasurement<readonly number[] | null>;
  readonly histogram: PerMeasurement<ReferenceHistogram | null>;
  readonly histogramLog: { readonly dzw: ReferenceHistogramLog | null };
  readonly display: PerMeasurement<ReferenceDisplay | null>;
  readonly selection: ReferenceSelection;
  readonly convertedWindows: readonly ReferenceConvertedWindow[] | null;
  readonly diagnosedConditions: readonly string[] | null;
}

/** A selection-boundary case (§3.6 Boundary cases). */
export interface ReferenceBoundaryCase {
  readonly id: string;
  readonly base: string;
  readonly inputs: { readonly [key: string]: unknown };
  readonly windows: ReferenceWindows | null;
  readonly expected: {
    readonly storedBounds: { readonly [dip: string]: readonly [number, number] };
    readonly counts: ReferenceCounts;
    readonly selection: ReferenceSelection;
  };
}

/** A case of a synthetic ensemble (§3.6 Synthetic cases). */
export interface ReferenceSyntheticCase {
  readonly id: string;
  readonly inputs: { readonly [key: string]: unknown };
  readonly windows: ReferenceWindows | null;
  readonly expected: {
    readonly counts: ReferenceCounts;
    readonly selection: { readonly identities: readonly ReferenceIdentity[] };
    readonly statistics: PerMeasurement<ReferenceStatistics | null>;
    readonly diagnosedConditions: readonly string[] | null;
  };
}

/** A synthetic ensemble (§3.6 `ensembles`). */
export interface ReferenceEnsemble {
  readonly id: string;
  readonly purpose: string;
  readonly stagesPerTrial: number;
  readonly scarpClasses: readonly string[];
  /** `[trial, fault_dip, sediment_strength, cohesion, set, depth, density]`. */
  readonly trials: readonly (readonly [string, number, string, string, string, number, string])[];
  readonly stages: {
    readonly slip: readonly number[];
    readonly scarp_height: readonly (number | null)[];
    readonly dzw: readonly (number | null)[];
    readonly scarp_dip: readonly (number | null)[];
    readonly scarp_class: readonly (string | null)[];
  };
  readonly cases: readonly ReferenceSyntheticCase[];
}

/** The reference results (§3.6) mapped through REFERENCE_FIELDS. */
export interface References {
  readonly schemaVersion: number;
  readonly referenceVersion: string;
  readonly exportVersion: string;
  readonly exportDate: string;
  readonly pipelineVersion: string;
  readonly displayDecimals: {
    readonly slip: number;
    readonly scarp_height: number;
    readonly dzw: number;
    readonly scarp_dip: number;
  };
  readonly logScaleMinDecades: number;
  readonly scenarios: readonly ReferenceScenario[];
  readonly boundaryCases: readonly ReferenceBoundaryCase[];
  readonly synthetic: {
    readonly ensembles: readonly ReferenceEnsemble[];
    readonly statistics: readonly {
      readonly id: string;
      readonly decimals: number;
      readonly steps: readonly number[];
      readonly expected: {
        readonly statistics: ReferenceStatistics | null;
        readonly percentiles: readonly number[] | null;
      };
    }[];
    readonly histograms: readonly {
      readonly id: string;
      readonly displayDecimals: number;
      readonly steps: readonly number[];
      readonly classCodes: readonly number[];
      readonly expected: {
        readonly histogram: ReferenceHistogram | null;
        readonly histogramLog: ReferenceHistogramLog | null;
      };
    }[];
    readonly displayRounding: readonly {
      readonly id: string;
      readonly value: number;
      readonly decimals: number;
      readonly expected: string;
    }[];
    readonly conversion: readonly {
      readonly id: string;
      readonly slipWindowBounds: { readonly max: number; readonly recordingStep: number };
      readonly coefficients: readonly {
        readonly faultDip: number;
        readonly slope: number;
        readonly intercept: number;
      }[];
      readonly offsetMax: string;
      readonly expected: { readonly convertedWindows: readonly ReferenceConvertedWindow[] | null };
    }[];
  };
}
