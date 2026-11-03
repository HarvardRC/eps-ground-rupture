// The code-built fixture vintage of the Node tests (docs/app/ddd.md
// §7.4, Fixtures are built in code). `buildFixture(spec)` assembles a
// §3.1-conformant scenario artifact — the 16-byte header, the seven
// 4-byte-aligned blocks, the dip dictionary — together with its
// matching §3.2 artifact manifest and the two lazy exports the manifest
// names (§3.4, §3.5), from a declarative spec of exactly the shape of a
// reference `synthetic.ensembles` entry (§3.6): the parity harness (§7.2
// step 5) builds its four synthetic vintages through the same function.
//
// The spec's explicit N, `stagesPerTrial`, is written unchanged into the
// manifest's `counts.stages_per_trial`; the builder throws unless every
// stage array holds `trials.length * N` entries and the counts pass the
// §3.2 Count contract, and it never substitutes the literal 101. The
// manifest's `scarp_classes` is the spec's `scarpClasses`, and its
// `scarp_class_palette` one of the builder's choosing. A negative case
// builds a valid fixture and then applies its one corruption to the
// returned manifest object or bytes; no binary fixture is committed.
//
// Only browser-and-Node APIs are used — `CompressionStream`,
// `crypto.subtle`, `TextEncoder` — so the builder runs wherever the pure
// modules of §5.1 run. No DOM identifier appears here.

import { decodeVintage, type Vintage } from '../src/decode/decode';
import type { BlockName, ReferenceEnsemble } from '../src/decode/fields';

// --------------------------------------------------------------------
// The spec and the built fixture
// --------------------------------------------------------------------

/**
 * A fixture spec: the members of a decoded §3.6 `synthetic.ensembles`
 * entry that describe its vintage, so a whole `ReferenceEnsemble` is a
 * spec. `trials` rows are `[trial, fault_dip, sediment_strength,
 * cohesion, set, depth, density]` in ascending code-point order of
 * `trial`; `stages` holds trial-major arrays of recording steps — slip in
 * 1e-4 m, `scarp_height` and `dzw` in 1e-3 m, `scarp_dip` in thousandths
 * of a degree — and class names, nulls where a value is missing.
 */
export type FixtureSpec = Pick<
  ReferenceEnsemble,
  'stagesPerTrial' | 'scarpClasses' | 'trials' | 'stages'
>;

/** The envelope values every built file carries. */
export interface FixtureOptions {
  /** `export_version` of the manifest and both exports; default `data-v0-test`. */
  readonly exportVersion?: string;
  /** `export_date`; default `2026-01-01T00:00:00Z`. */
  readonly exportDate?: string;
}

/** A §3.2 `blocks` value. */
export interface BlockJson {
  offset: number;
  length: number;
  dtype: string;
}

/** A §3.2 `columns` value: the ten members. */
export interface ColumnJson {
  encoding: string;
  decimals: number | null;
  offset_steps: number | null;
  scale: number | null;
  offset: number | null;
  physical_min: number | null;
  physical_max: number | null;
  recording_step: number | null;
  null_sentinel: number;
  null_count: number;
}

/** The stage columns of the artifact (§3.1). */
export type StageColumn = 'slip' | 'scarp_height' | 'dzw' | 'scarp_dip' | 'scarp_class';

/** The §3.2 `provenance` record. */
export interface ProvenanceJson {
  source_commit: string;
  source_tree_clean: boolean;
  inputs: { path: string; sha256: string; bytes: number }[];
  environment: { [name: string]: string };
  compression: { format: string; call: string; compresslevel: number; mtime: number };
}

/** The §3.2 artifact manifest as written, snake_case, before DD-10 mapping. */
export interface ManifestJson {
  schema_version: number;
  export_version: string;
  export_date: string;
  pipeline_version: string;
  provenance: ProvenanceJson;
  counts: { records: number; trials: number; stages_per_trial: number };
  blocks: { [b in BlockName]: BlockJson };
  columns: { [c in StageColumn]: ColumnJson };
  trial_columns: {
    fault_dip: number[];
    sediment_strength: string[];
    cohesion: string[];
    set: string[];
    depth: number[];
    density: string[];
    model_family: string[];
  };
  arm_strength_states: { set: string; sediment_strength: string }[];
  scarp_classes: string[];
  scarp_class_palette: { [scarpClass: string]: string };
  trials: string[];
  stage_spacing: { min: number; max: number; mean: number };
  slip_window_bounds: { min: number; max: number; recording_step: number };
  files: { scenario_artifact: string; field_export: string; regression_export: string };
  reference_results_version: string;
  checksums: { [fileName: string]: string };
}

/** The §3.4/§3.5 envelope. */
export interface EnvelopeJson {
  schema_version: number;
  export_version: string;
  export_date: string;
  pipeline_version: string;
}

/** One §3.4 field row. */
export interface FieldRowJson {
  source: string;
  eq_name: string;
  magnitude: number | null;
  analogue: string;
  source_quantity: string;
  value: number;
  limited_comparison: boolean;
  criterion_sub50: string;
  labeled_set: boolean;
  kern_field_group: string | null;
}

/** The §3.4 field-data export. */
export interface FieldExportJson extends EnvelopeJson {
  rows: FieldRowJson[];
}

/** The §3.5 regression export. */
export interface RegressionExportJson extends EnvelopeJson {
  relationship: {
    y: { name: string; description: string; unit: string };
    x: { name: string; description: string; unit: string };
    form: string;
    fit: string;
    back_projection: string;
  };
  coefficients: { fault_dip: number; n: number; slope: number; intercept: number; r2: number }[];
}

/** A built fixture vintage. Every member is fresh: a negative case may corrupt it. */
export interface Fixture {
  readonly spec: FixtureSpec;
  /** The artifact manifest, valid as built. */
  readonly manifest: ManifestJson;
  /** The decompressed scenario artifact. */
  readonly artifact: Uint8Array;
  /** The scenario artifact as served: one gzip member. */
  readonly artifactGz: Uint8Array;
  /** The field-data export the manifest names, before compression. */
  readonly fieldExport: FieldExportJson;
  /** The regression export the manifest names, before compression. */
  readonly regressionExport: RegressionExportJson;
  /** Every file the manifest's `files` names, by name, as served (compressed). */
  readonly files: Map<string, Uint8Array>;
}

// --------------------------------------------------------------------
// Constants of the formats
// --------------------------------------------------------------------

/** U of the §3.2 Count contract. */
export const U32_MAX = 4294967295;

/** The six class names in `config.SCARP_CLASSES` order (§3.2 `scarp_classes`). */
export const SCARP_CLASSES = [
  'Monoclinal',
  'Monoclinal Collapse',
  'Pressure Ridge',
  'Pressure Ridge Collapse',
  'Simple',
  'Simple Collapse',
] as const;

/**
 * The nine `arm_strength_states` pairs in the §3.2 display order: the
 * uniform arm first, then the layered arm, each in the PDD §3.2 order.
 */
export const ARM_STRENGTH_STATES: readonly (readonly [string, string])[] = [
  ['Homogeneous', 'Weak'],
  ['Homogeneous', 'Moderate'],
  ['Homogeneous', 'Strong'],
  ['Heterogeneous', 'Weak'],
  ['Heterogeneous', 'Moderate'],
  ['Heterogeneous', 'Strong'],
  ['Heterogeneous', 'Random Heterogeneous'],
  ['Heterogeneous', 'Cohesive Top Unit'],
  ['Heterogeneous', 'Alternating Strong-Weak'],
];

/** The §3.5 `relationship` texts, verbatim. */
const RELATIONSHIP: RegressionExportJson['relationship'] = {
  y: { name: 'vd_hw', description: 'vertical displacement on the hanging wall', unit: 'm' },
  x: { name: 'slip', description: 'fault slip at depth', unit: 'm' },
  form: 'vd_hw = slope * slip + intercept',
  fit:
    'ordinary least squares of vd_hw on slip per fault_dip over all dem records with both ' +
    'vd_hw and slip present; intercept fitted, not constrained through zero; DuckDB ' +
    'regr_slope, regr_intercept, and regr_r2 in the view dem_regression',
  back_projection: 'slip = (vd_hw - intercept) / slope',
};

/** The nine export inputs of §3.2 `provenance.inputs`, sorted by path. */
const PROVENANCE_INPUT_PATHS = [
  'data/processed/dem/data.parquet',
  'data/processed/fdhi_cleaned/data.parquet',
  'data/processed/fdhi_measurements/data.parquet',
  'data/processed/kern_combined/data.parquet',
  'data/processed/sure/data.parquet',
  'data/raw/Combine_BuwaldaFDHI_KernSDC.csv',
  'data/raw/DEM_dataset.csv',
  'data/raw/FDHI_flatfile.csv',
  'data/raw/SURE.csv',
];

const HEADER_BYTES = 16;
const TRIAL_TABLE_WIDTH = 7;
const UINT16_NULL = 65535;
const UINT8_NULL = 255;
const SCARP_HEIGHT_OFFSET_STEPS = -182;

/** The trial-table column order of schema version 1 (§3.1), independent of fields.ts. */
const TRIAL_COLUMN_ORDER = [
  'fault_dip',
  'sediment_strength',
  'cohesion',
  'set',
  'depth',
  'density',
  'model_family',
] as const;

// --------------------------------------------------------------------
// Byte helpers (browser-and-Node APIs only)
// --------------------------------------------------------------------

/** Compares two strings by Unicode code point, as Python's `sorted()` does. */
export function codePointCompare(a: string, b: string): number {
  const x = Array.from(a, (c) => c.codePointAt(0) as number);
  const y = Array.from(b, (c) => c.codePointAt(0) as number);
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  }
  return x.length - y.length;
}

/** `v` with every object's keys sorted by code point, at every depth. */
function sortKeysDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeysDeep);
  if (v !== null && typeof v === 'object') {
    const o = v as { readonly [k: string]: unknown };
    const out: { [k: string]: unknown } = {};
    for (const k of Object.keys(o).sort(codePointCompare)) out[k] = sortKeysDeep(o[k]);
    return out;
  }
  return v;
}

/** The UTF-8 bytes of `v` in the canonical JSON form of §3: sorted keys, compact, one newline. */
export function jsonBytes(v: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(sortKeysDeep(v))}\n`);
}

/** Reads a byte stream to one array. */
async function readAll(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
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
}

/** One gzip member of `bytes`, by `CompressionStream('gzip')`. */
export async function gzip(bytes: Uint8Array): Promise<Uint8Array> {
  const source = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  return readAll(source.pipeThrough(new CompressionStream('gzip')));
}

/** The lowercase hexadecimal SHA-256 of `bytes`. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The §4.1 content-hashed name `<stem>-<h12><suffix>` of `bytes`. */
async function hashedName(stem: string, suffix: string, bytes: Uint8Array): Promise<string> {
  return `${stem}-${(await sha256Hex(bytes)).slice(0, 12)}${suffix}`;
}

/**
 * Python's `math.fsum`: the correctly rounded sum of `xs`, by Shewchuk's
 * exact partials and the round-half-even correction of CPython's
 * `math_fsum` — the §3.2 `stage_spacing.mean` arithmetic.
 */
export function fsum(xs: readonly number[]): number {
  const partials: number[] = [];
  for (const value of xs) {
    let x = value;
    let i = 0;
    for (let j = 0; j < partials.length; j++) {
      let y = partials[j];
      if (Math.abs(x) < Math.abs(y)) [x, y] = [y, x];
      const hi = x + y;
      const lo = y - (hi - x);
      if (lo !== 0) partials[i++] = lo;
      x = hi;
    }
    partials.length = i;
    partials.push(x);
  }
  let n = partials.length;
  if (n === 0) return 0;
  let hi = partials[--n];
  let lo = 0;
  while (n > 0) {
    const x = hi;
    const y = partials[--n];
    hi = x + y;
    lo = y - (hi - x);
    if (lo !== 0) break;
  }
  if (n > 0 && ((lo < 0 && partials[n - 1] < 0) || (lo > 0 && partials[n - 1] > 0))) {
    const y = lo * 2;
    const x = hi + y;
    if (y === x - hi) hi = x;
  }
  return hi;
}

// --------------------------------------------------------------------
// The builder
// --------------------------------------------------------------------

function fail(detail: string): never {
  throw new Error(`buildFixture: ${detail}`);
}

/** The §3.2 Count contract for T and N, with R = T × N by construction. */
function checkCounts(trials: number, stagesPerTrial: number): number {
  if (!Number.isInteger(stagesPerTrial) || stagesPerTrial < 2 || stagesPerTrial > U32_MAX) {
    fail(`stagesPerTrial ${stagesPerTrial} breaks 2 <= N <= ${U32_MAX}`);
  }
  if (trials < 1 || trials > U32_MAX) fail(`${trials} trials break 1 <= T <= ${U32_MAX}`);
  if (trials > Math.floor(U32_MAX / stagesPerTrial)) {
    fail(`${trials} trials break T <= floor(U / N) for N = ${stagesPerTrial}`);
  }
  return trials * stagesPerTrial;
}

/** The distinct values of `values`, ascending (numbers) or in code-point order (strings). */
function dictionary<T extends number | string>(values: readonly T[]): T[] {
  const distinct = [...new Set(values)];
  return distinct.sort((a, b) =>
    typeof a === 'number' ? (a as number) - (b as number) : codePointCompare(a as string, b as string),
  );
}

function align4(n: number): number {
  return Math.ceil(n / 4) * 4;
}

/** The ten-member `columns` value of a column. */
function column(
  encoding: string,
  decimals: number | null,
  offsetSteps: number | null,
  scale: number | null,
  offset: number | null,
  physical: readonly number[],
  recordingStep: number | null,
  nullSentinel: number,
  nullCount: number,
): ColumnJson {
  const known = encoding !== 'code' && physical.length > 0;
  return {
    encoding,
    decimals,
    offset_steps: offsetSteps,
    scale,
    offset,
    physical_min: known ? Math.min(...physical) : null,
    physical_max: known ? Math.max(...physical) : null,
    recording_step: recordingStep,
    null_sentinel: nullSentinel,
    null_count: nullCount,
  };
}

/** A palette of the builder's choosing: one distinct `#rrggbb` per class. */
function palette(classes: readonly string[]): { [scarpClass: string]: string } {
  const out: { [scarpClass: string]: string } = {};
  classes.forEach((name, i) => {
    out[name] = `#${((0x2040a0 + i * 0x1f3d5b) & 0xffffff).toString(16).padStart(6, '0')}`;
  });
  return out;
}

/** The small field-data export of every fixture vintage (§3.4), rows in §3.4 order. */
function fieldExport(envelope: EnvelopeJson): FieldExportJson {
  return {
    ...envelope,
    rows: [
      {
        source: 'FDHI',
        eq_name: 'Wenchuan',
        magnitude: 7.9,
        analogue: 'scarp_height',
        source_quantity: 'vs_central_meters',
        value: 2.5,
        limited_comparison: false,
        criterion_sub50: 'not_applicable',
        labeled_set: true,
        kern_field_group: null,
      },
      {
        source: 'Kern',
        eq_name: 'Kern County (1952)',
        magnitude: 7.36,
        analogue: 'dzw',
        source_quantity: 'DZW',
        value: 60,
        limited_comparison: false,
        criterion_sub50: 'not_met',
        labeled_set: true,
        kern_field_group: null,
      },
      {
        source: 'SURE',
        eq_name: 'Fixture Event',
        magnitude: null,
        analogue: 'dzw',
        source_quantity: 'FNC',
        value: 12.25,
        limited_comparison: true,
        criterion_sub50: 'met',
        labeled_set: false,
        kern_field_group: null,
      },
    ],
  };
}

/** The regression export (§3.5): one injected coefficient row per modeled dip, ascending. */
function regressionExport(envelope: EnvelopeJson, dips: readonly number[]): RegressionExportJson {
  return {
    ...envelope,
    relationship: structuredClone(RELATIONSHIP),
    coefficients: dips.map((d, i) => ({
      fault_dip: d,
      n: 100 + i,
      slope: 0.5 + i / 64,
      intercept: -0.0078125,
      r2: 0.9921875,
    })),
  };
}

/**
 * Builds the fixture vintage of `spec` (§7.4): the scenario artifact, its
 * manifest, and the field and regression exports the manifest names.
 * Throws unless every stage array holds `trials.length * N` entries and
 * the counts pass the §3.2 Count contract, and on any value the §3.1
 * layout cannot store: trials out of code-point order, slip not strictly
 * ascending within a trial, a value outside its dtype, an unknown class,
 * or an arm-and-strength pair outside the nine of §3.2.
 */
export async function buildFixture(spec: FixtureSpec, options: FixtureOptions = {}): Promise<Fixture> {
  const n = spec.stagesPerTrial;
  const t = spec.trials.length;
  const records = checkCounts(t, n);
  for (const name of ['slip', 'scarp_height', 'dzw', 'scarp_dip', 'scarp_class'] as const) {
    if (spec.stages[name].length !== records) {
      fail(`stages.${name} holds ${spec.stages[name].length} entries, not trials.length * N = ${records}`);
    }
  }
  spec.trials.forEach((row, i) => {
    if (i > 0 && codePointCompare(spec.trials[i - 1][0], row[0]) >= 0) {
      fail(`trial ${JSON.stringify(row[0])} is out of ascending code-point order`);
    }
  });
  if (spec.scarpClasses.length === 0 || spec.scarpClasses.length >= UINT8_NULL) {
    fail(`${spec.scarpClasses.length} scarp classes do not fit the uint8 codes`);
  }

  // Dictionaries (§3.2 `trial_columns`), from the trials.
  const byColumn = (i: number) => spec.trials.map((row) => row[i]);
  const trialColumns: ManifestJson['trial_columns'] = {
    fault_dip: dictionary(byColumn(1) as number[]),
    sediment_strength: dictionary(byColumn(2) as string[]),
    cohesion: dictionary(byColumn(3) as string[]),
    set: dictionary(byColumn(4) as string[]),
    depth: dictionary(byColumn(5) as number[]),
    density: dictionary(byColumn(6) as string[]),
    model_family: ['2D'],
  };
  // The nine pairs in the §3.2 display order, keeping only those present.
  const rank = (set: string, strength: string): number =>
    ARM_STRENGTH_STATES.findIndex(([a, s]) => a === set && s === strength);
  for (const row of spec.trials) {
    if (rank(row[4], row[2]) < 0) fail(`(${row[4]}, ${row[2]}) is not one of the nine arm-and-strength pairs`);
  }
  const pairs = ARM_STRENGTH_STATES.filter(([set, strength]) =>
    spec.trials.some((row) => row[4] === set && row[2] === strength),
  ).map(([set, strength]) => ({ set, sediment_strength: strength }));

  // Stage values to stored integers (§3.1, Restoring values).
  const { slip, scarp_height: height, dzw, scarp_dip: dip, scarp_class: cls } = spec.stages;
  for (let trial = 0; trial < t; trial++) {
    for (let k = trial * n + 1; k < (trial + 1) * n; k++) {
      if (!(slip[k] > slip[k - 1])) fail(`slip is not strictly ascending within trial ${trial}`);
    }
  }
  const uint16 = (value: number, what: string): number => {
    if (!Number.isInteger(value) || value < 0 || value >= UINT16_NULL) {
      fail(`${what} stores ${value}, outside 0 to ${UINT16_NULL - 1}`);
    }
    return value;
  };
  const dips = dictionary(dip.filter((v): v is number => v !== null));
  for (const v of dips) {
    if (!Number.isInteger(v) || Math.abs(v) > 180000) fail(`scarp_dip ${v} is outside ±180000`);
  }
  if (dips.length >= UINT16_NULL) fail(`${dips.length} distinct dips exceed the uint16 index`);

  // Layout (§3.1): the header, then the seven blocks at align4 offsets.
  const lengths: { [b in BlockName]: number } = {
    trial_table: t * TRIAL_TABLE_WIDTH,
    slip: records * 2,
    scarp_height: records * 2,
    dzw: records * 2,
    scarp_dip: records * 2,
    scarp_class: records,
    dip_dictionary: dips.length * 4,
  };
  const dtypes: { [b in BlockName]: string } = {
    trial_table: 'uint8',
    slip: 'uint16',
    scarp_height: 'uint16',
    dzw: 'uint16',
    scarp_dip: 'uint16',
    scarp_class: 'uint8',
    dip_dictionary: 'int32',
  };
  const blocks = {} as { [b in BlockName]: BlockJson };
  let end = HEADER_BYTES;
  for (const name of Object.keys(lengths) as BlockName[]) {
    const offset = align4(end);
    blocks[name] = { offset, length: lengths[name], dtype: dtypes[name] };
    end = offset + lengths[name];
  }
  const artifact = new Uint8Array(align4(end));
  const view = new DataView(artifact.buffer);
  artifact.set([0x47, 0x52, 0x58, 0x41], 0); // GRXA
  view.setUint32(4, 1, true);
  view.setUint32(8, records, true);
  view.setUint32(12, t, true);

  spec.trials.forEach((row, trial) => {
    TRIAL_COLUMN_ORDER.forEach((name, c) => {
      const cell =
        name === 'model_family'
          ? 0
          : (trialColumns[name] as readonly (number | string)[]).indexOf(row[c + 1]);
      artifact[blocks.trial_table.offset + trial * TRIAL_TABLE_WIDTH + c] = cell;
    });
  });
  const nulls = { scarp_height: 0, dzw: 0, scarp_dip: 0, scarp_class: 0 };
  for (let i = 0; i < records; i++) {
    view.setUint16(blocks.slip.offset + 2 * i, uint16(slip[i], 'slip'), true);
    const h = height[i];
    if (h === null) nulls.scarp_height++;
    view.setUint16(
      blocks.scarp_height.offset + 2 * i,
      h === null ? UINT16_NULL : uint16(h - SCARP_HEIGHT_OFFSET_STEPS, 'scarp_height'),
      true,
    );
    const w = dzw[i];
    if (w === null) nulls.dzw++;
    view.setUint16(blocks.dzw.offset + 2 * i, w === null ? UINT16_NULL : uint16(w, 'dzw'), true);
    const d = dip[i];
    if (d === null) nulls.scarp_dip++;
    view.setUint16(blocks.scarp_dip.offset + 2 * i, d === null ? UINT16_NULL : dips.indexOf(d), true);
    const c = cls[i];
    if (c === null) nulls.scarp_class++;
    const code = c === null ? UINT8_NULL : spec.scarpClasses.indexOf(c);
    if (code < 0) fail(`scarp_class ${JSON.stringify(c)} is not one of scarpClasses`);
    artifact[blocks.scarp_class.offset + i] = code;
  }
  dips.forEach((v, i) => view.setInt32(blocks.dip_dictionary.offset + 4 * i, v, true));

  // Measured figures (§3.2): physical extremes, stage spacing, slip bounds.
  // Each spec value is a recorded step count s, so x = s / D (§3.1).
  const restored = (values: readonly (number | null)[], divisor: number) =>
    values.filter((v): v is number => v !== null).map((v) => v / divisor);
  const slipMetres = slip.map((s) => s / 10000);
  const differences: number[] = [];
  for (let trial = 0; trial < t; trial++) {
    for (let k = trial * n + 1; k < (trial + 1) * n; k++) {
      differences.push(slipMetres[k] - slipMetres[k - 1]);
    }
  }

  const exportVersion = options.exportVersion ?? 'data-v0-test';
  const envelope: EnvelopeJson = {
    schema_version: 1,
    export_version: exportVersion,
    export_date: options.exportDate ?? '2026-01-01T00:00:00Z',
    pipeline_version: '0.0.0+fixture',
  };
  const field = fieldExport(envelope);
  const regression = regressionExport(envelope, trialColumns.fault_dip);
  const artifactGz = await gzip(artifact);
  const fieldGz = await gzip(jsonBytes(field));
  const regressionGz = await gzip(jsonBytes(regression));
  const names = {
    scenario_artifact: await hashedName('scenario', '.bin.gz', artifactGz),
    field_export: await hashedName('field', '.json.gz', fieldGz),
    regression_export: await hashedName('regression', '.json.gz', regressionGz),
  };
  const files = new Map<string, Uint8Array>([
    [names.scenario_artifact, artifactGz],
    [names.field_export, fieldGz],
    [names.regression_export, regressionGz],
  ]);
  const checksums: { [fileName: string]: string } = {};
  for (const [name, bytes] of files) checksums[name] = await sha256Hex(bytes);

  const manifest: ManifestJson = {
    ...envelope,
    provenance: {
      source_commit: '0'.repeat(40),
      source_tree_clean: true,
      inputs: PROVENANCE_INPUT_PATHS.map((path) => ({ path, sha256: '0'.repeat(64), bytes: 0 })),
      environment: {
        python: '3.13.0',
        duckdb: '1.0.0',
        numpy: '2.0.0',
        pandas: '2.2.0',
        pyarrow: '17.0.0',
        zlib: '1.3.1',
        platform: 'fixture-none',
      },
      compression: { format: 'gzip', call: 'gzip.compress', compresslevel: 9, mtime: 0 },
    },
    counts: { records, trials: t, stages_per_trial: n },
    blocks,
    columns: {
      slip: column('scaled', 4, 0, 0.0001, 0, slipMetres, 0.0001, UINT16_NULL, 0),
      scarp_height: column(
        'scaled',
        3,
        SCARP_HEIGHT_OFFSET_STEPS,
        0.001,
        -0.182,
        restored(height, 1000),
        0.001,
        UINT16_NULL,
        nulls.scarp_height,
      ),
      dzw: column('scaled', 3, 0, 0.001, 0, restored(dzw, 1000), 0.001, UINT16_NULL, nulls.dzw),
      scarp_dip: column('dict', 3, 0, 0.001, 0, restored(dip, 1000), 0.001, UINT16_NULL, nulls.scarp_dip),
      scarp_class: column('code', null, null, null, null, [], null, UINT8_NULL, nulls.scarp_class),
    },
    trial_columns: trialColumns,
    arm_strength_states: pairs,
    scarp_classes: [...spec.scarpClasses],
    scarp_class_palette: palette(spec.scarpClasses),
    trials: spec.trials.map((row) => row[0]),
    stage_spacing: {
      min: Math.min(...differences),
      max: Math.max(...differences),
      mean: fsum(differences) / (t * (n - 1)),
    },
    slip_window_bounds: { min: 0, max: Math.max(...slipMetres), recording_step: 0.0001 },
    files: names,
    reference_results_version: exportVersion,
    checksums,
  };
  return { spec, manifest, artifact, artifactGz, fieldExport: field, regressionExport: regression, files };
}

// --------------------------------------------------------------------
// Decoding helpers
// --------------------------------------------------------------------

/** The `VintageExpectation` a fixture satisfies: its version, schema `[1]`. */
export function expectationOf(fixture: Fixture): { exportVersion: string; schemaVersions: number[] } {
  return { exportVersion: fixture.manifest.export_version, schemaVersions: [1] };
}

/** A `readFile` stub over `files` that records every name it is asked for. */
export function fileReader(files: ReadonlyMap<string, Uint8Array>): {
  readonly readFile: (name: string) => Promise<Uint8Array>;
  readonly calls: string[];
} {
  const calls: string[] = [];
  return {
    calls,
    readFile: async (name) => {
      calls.push(name);
      const bytes = files.get(name);
      if (bytes === undefined) throw new Error(`no fixture file ${name}`);
      return bytes;
    },
  };
}

/** The fixture decoded by the real `decodeVintage`: the mapped manifest and the views. */
export async function decodeFixture(fixture: Fixture): Promise<Vintage> {
  return decodeVintage(
    jsonBytes(fixture.manifest),
    fileReader(fixture.files).readFile,
    expectationOf(fixture),
  );
}

// --------------------------------------------------------------------
// Specs the tests share
// --------------------------------------------------------------------

/** The canonical decimal of `steps` recording steps at `decimals` digits, by integer arithmetic. */
export function stepsDecimal(steps: number, decimals: number): string {
  const sign = steps < 0 ? '-' : '';
  const digits = String(Math.abs(steps)).padStart(decimals + 1, '0');
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = digits.slice(digits.length - decimals).replace(/0+$/, '');
  return fraction === '' ? `${sign}${whole}` : `${sign}${whole}.${fraction}`;
}

/**
 * A three-trial ensemble of N stages per trial, as a whole
 * `ReferenceEnsemble` record with no cases: slip strictly ascending in
 * each trial, a slip-0 unclassified first stage with every measurement
 * null in two trials, nulls scattered through the measurements, and
 * negative scarp heights and dips, so every block carries nulls and
 * extreme stored values.
 */
export function stageCountSpec(n: number): ReferenceEnsemble {
  const trials: ReferenceEnsemble['trials'] = [
    ['S0', 30, 'Strong', 'A', 'Homogeneous', 3, 'Dense'],
    ['S1', 45, 'Weak', 'B', 'Heterogeneous', 5, 'Loose'],
    ['S2', 70, 'Cohesive Top Unit', 'C', 'Heterogeneous', 10, 'Medium'],
  ];
  const base = [0, 5, 0];
  const extent = [30000, 26000, 50000];
  const slip: number[] = [];
  const height: (number | null)[] = [];
  const dzw: (number | null)[] = [];
  const dip: (number | null)[] = [];
  const cls: (string | null)[] = [];
  trials.forEach((_, t) => {
    for (let k = 0; k < n; k++) {
      const s = base[t] + k * Math.floor(extent[t] / (n - 1));
      slip.push(s);
      if (s === 0) {
        height.push(null);
        dzw.push(null);
        dip.push(null);
        cls.push(null);
        continue;
      }
      height.push((k + t) % 9 === 4 ? null : -182 + ((k * 37 + (t - 1) * 101 + 5400) % 5400));
      dzw.push((k + 2 * t) % 7 === 3 ? null : (k * 13 * (t + 1)) % 45812);
      dip.push((k + t) % 5 === 2 ? null : -12529 + ((k * 977 + t * 1777) % 102294));
      cls.push(SCARP_CLASSES[(k + 2 * t) % SCARP_CLASSES.length]);
    }
  });
  return {
    id: `stages-${n}`,
    purpose: `a fixture of ${n} stages per trial`,
    stagesPerTrial: n,
    scarpClasses: [...SCARP_CLASSES],
    trials,
    stages: { slip, scarp_height: height, dzw, scarp_dip: dip, scarp_class: cls },
    cases: [],
  };
}

/** What `vocabularySpec` varies. */
export interface VocabularyOptions {
  /** The modeled dips; default 20, 30, 40, 45, 50, 60, 70. */
  readonly dips?: readonly number[];
  /** The largest recorded slip, in 1e-4 m steps; default 50135 (5.0135 m). */
  readonly maxSlipSteps?: number;
  /** The class names; default the six of `config.SCARP_CLASSES`. */
  readonly scarpClasses?: readonly string[];
}

/**
 * A two-stage ensemble carrying the shipped vocabulary — every modeled
 * dip, the nine arm-and-strength pairs, depths 3, 5, and 10 m, densities
 * Dense, Loose, and Medium, the six scarp classes — and a recorded slip
 * maximum of 5.0135 m, so the state tests read the §5.6 defaults and
 * GS-1 from a fixture manifest; `options` varies the dictionaries for
 * the reload-recovery cases.
 */
export function vocabularySpec(options: VocabularyOptions = {}): FixtureSpec {
  const dips = options.dips ?? [20, 30, 40, 45, 50, 60, 70];
  const classes = options.scarpClasses ?? [...SCARP_CLASSES];
  const maxSlip = options.maxSlipSteps ?? 50135;
  const count = Math.max(ARM_STRENGTH_STATES.length, dips.length, classes.length);
  const trials: FixtureSpec['trials'][number][] = [];
  const stages = {
    slip: [] as number[],
    scarp_height: [] as (number | null)[],
    dzw: [] as (number | null)[],
    scarp_dip: [] as (number | null)[],
    scarp_class: [] as (string | null)[],
  };
  for (let t = 0; t < count; t++) {
    const [set, strength] = ARM_STRENGTH_STATES[t % ARM_STRENGTH_STATES.length];
    trials.push([
      `V${String(t).padStart(2, '0')}`,
      dips[t % dips.length],
      strength,
      'A',
      set,
      [3, 5, 10][t % 3],
      ['Dense', 'Loose', 'Medium'][t % 3],
    ]);
    stages.slip.push(0, t === count - 1 ? maxSlip : Math.min(1000 * (t + 1), maxSlip - 1));
    stages.scarp_height.push(null, -182 + 10 * t);
    stages.dzw.push(null, 100 + t);
    stages.scarp_dip.push(null, 30000 + t);
    stages.scarp_class.push(null, classes[t % classes.length]);
  }
  return { stagesPerTrial: 2, scarpClasses: classes, trials, stages };
}

// --------------------------------------------------------------------
// The other formats of a fixture vintage
// --------------------------------------------------------------------

/** The §3.3 pointer manifest of `fixture`: the manifest and the files it names. */
export async function buildPointer(fixture: Fixture): Promise<{ [key: string]: unknown }> {
  const manifestBytes = jsonBytes(fixture.manifest);
  const files: { [fileName: string]: string } = {
    [await hashedName('manifest', '.json', manifestBytes)]: await sha256Hex(manifestBytes),
  };
  for (const [name, bytes] of fixture.files) files[name] = await sha256Hex(bytes);
  return {
    schema_version: 1,
    data_tag: fixture.manifest.export_version,
    export_version: fixture.manifest.export_version,
    export_date: fixture.manifest.export_date,
    provenance: structuredClone(fixture.manifest.provenance),
    files,
  };
}

/** A §3.6 counts record of `matching` records, every one valid. */
function countsJson(matching: number): { [key: string]: unknown } {
  const valid = { valid: matching, excluded_null: 0 };
  return {
    matching_records: matching,
    unclassified: 0,
    per_measurement: { scarp_height: { ...valid }, dzw: { ...valid }, scarp_dip: { ...valid } },
  };
}

/** A §3.6 statistics record whose seven members all equal `v`. */
function statisticsJson(v: number): { [key: string]: number } {
  return { median: v, p16: v, p84: v, min: v, max: v, mean: v, sd: v };
}

/** The canonical scenario object of the default selection of `fixture` (§5.6). */
function defaultInputs(fixture: Fixture): { [key: string]: unknown } {
  const m = fixture.manifest;
  return {
    fault_dip: [...m.trial_columns.fault_dip],
    sediment: m.arm_strength_states
      .map((p) => ({ set: p.set, sediment_strength: p.sediment_strength }))
      .sort((a, b) => codePointCompare(a.set, b.set) || codePointCompare(a.sediment_strength, b.sediment_strength)),
    depth: [...m.trial_columns.depth],
    density: [...m.trial_columns.density],
    entry_mode: 'slip',
    slip_window: null,
    offset_max: null,
    population: 'all_stages',
    scarp_class: [...m.scarp_classes],
  };
}

/**
 * A §3.6 reference-results file paired with `fixture`, every member
 * present with its JSON type: one scenario entry, one boundary case, the
 * fixture's own spec as the one synthetic ensemble with one case, and
 * one case of each other synthetic kind. Its numbers are placeholders
 * of the right type for the decoding tests, never calculation
 * expectations: nothing compares a computed result with them.
 */
export function buildReferences(fixture: Fixture): { [key: string]: unknown } {
  const m = fixture.manifest;
  const spec = fixture.spec;
  const inputs = defaultInputs(fixture);
  const selection = { identities: [[m.trials[0], 0, 255]] };
  const windows = { [String(m.trial_columns.fault_dip[0])]: { lo: 0.5, hi: 1.5 } };
  const histogram = { rule: 'single', width_units: 1, first_edge: 0, bins: 1, counts: [[1, 0, 0, 0, 0, 0]] };
  const histogramLog = { first_edge: 100, bins: 1, counts: [[1, 0, 0, 0, 0, 0]], below_counts: [0, 0, 0, 0, 0, 0] };
  const display = { median: '1', p16: '1', p84: '1', min: '1', max: '1', mean: '1', sd: null };
  const convertedWindow = {
    fault_dip: m.trial_columns.fault_dip[0],
    window_lo: 0.5,
    window_hi: 1.5,
    range_flag: 'in_range',
    window_lo_display: '0.5',
    window_hi_display: '1.5',
  };
  return {
    schema_version: 1,
    reference_version: m.export_version,
    export_version: m.export_version,
    export_date: m.export_date,
    pipeline_version: m.pipeline_version,
    display_decimals: { slip: 2, scarp_height: 2, dzw: 1, scarp_dip: 0 },
    log_scale_min_decades: 2,
    scenarios: [
      {
        id: 'GS-0',
        inputs,
        counts: countsJson(1),
        statistics: { scarp_height: statisticsJson(1), dzw: statisticsJson(1), scarp_dip: null },
        percentiles: { scarp_height: [1, 1], dzw: [1, 1], scarp_dip: null },
        histogram: { scarp_height: histogram, dzw: histogram, scarp_dip: null },
        histogram_log: { dzw: histogramLog },
        display: { scarp_height: display, dzw: display, scarp_dip: null },
        selection,
        converted_windows: [convertedWindow],
        diagnosed_conditions: null,
      },
    ],
    boundary_cases: [
      {
        id: 'B-GS0-slip-0-1',
        base: 'GS-0',
        inputs,
        windows,
        expected: {
          stored_bounds: { [String(m.trial_columns.fault_dip[0])]: [0, 10000] },
          counts: countsJson(1),
          selection: { signature: '0'.repeat(64), count: 1 },
        },
      },
    ],
    synthetic: {
      ensembles: [
        {
          id: `stages-${spec.stagesPerTrial}`,
          purpose: 'a fixture ensemble',
          stages_per_trial: spec.stagesPerTrial,
          scarp_classes: [...spec.scarpClasses],
          trials: spec.trials.map((row) => [...row]),
          stages: structuredClone(spec.stages),
          cases: [
            {
              id: `stages-${spec.stagesPerTrial}-allstages-nowindow`,
              inputs,
              windows: null,
              expected: {
                counts: countsJson(1),
                selection,
                statistics: { scarp_height: statisticsJson(1), dzw: null, scarp_dip: null },
                diagnosed_conditions: null,
              },
            },
          ],
        },
      ],
      statistics: [
        {
          id: 'stats-n1',
          decimals: 3,
          steps: [1],
          expected: { statistics: { ...statisticsJson(0.001), sd: null }, percentiles: [0.001, 0.001] },
        },
      ],
      histograms: [
        {
          id: 'hist-n1',
          display_decimals: 1,
          steps: [100],
          class_codes: [0],
          expected: { histogram, histogram_log: histogramLog },
        },
      ],
      display_rounding: [{ id: 'round-0-1', value: 1, decimals: 0, expected: '1' }],
      conversion: [
        {
          id: 'conv-0',
          slip_window_bounds: { max: 5.0135, recording_step: 0.0001 },
          coefficients: [{ fault_dip: m.trial_columns.fault_dip[0], slope: 0.3, intercept: -0.02 }],
          offset_max: '0',
          expected: { converted_windows: [convertedWindow] },
        },
      ],
    },
  };
}
