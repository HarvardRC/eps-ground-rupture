// The decode-and-query timing spot check (docs/app/ip.md T-31 step 3;
// docs/app/ddd.md §5.3, the expected cost): a diagnostic, never
// acceptance evidence — the acceptance measurement is §7.6's (T-61).
// Not a `*.test.ts` file, so `webappTest` never runs it; it is bundled
// and run by hand on the plugin-downloaded runtime, in the one form of
// §2 (Node.js outside Gradle), from `subprojects/webapp`:
//
//   export PATH="$(ls -d "$PWD"/.gradle/nodejs/node-v22.12.0-*)/bin:$PATH"
//   npx esbuild test/spot-timing.ts --bundle --platform=node --format=esm --target=es2020 --outfile=build/spot/spot-timing.mjs
//   node build/spot/spot-timing.mjs ../../dist/app/data-v0-test
//
// Given a local export directory as its one argument, it reads the files
// there, decodes them with `decodeVintage` (`expected` = the manifest's
// own `export_version` and `schemaVersions` [1]), times the decode once,
// then times `query(vintage, defaultScenario(vintage.manifest))` — the
// GS-0 selection — 30 times, and prints `process.version`, the decode
// time, and the median of the 30 query times (the mean of the 15th and
// 16th smallest) in milliseconds. T-37 extends it end to end.

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

import { decodeVintage } from '../src/decode/decode';
import { query } from '../src/engine/query';
import { defaultScenario } from '../src/state/state';

/** The number of timed queries. */
const RUNS = 30;

/** The artifact manifest's file name pattern (§4.1 step 2). */
const MANIFEST_NAME = /^manifest-[0-9a-f]{12}\.json$/;

async function main(argv: readonly string[]): Promise<void> {
  if (argv.length !== 1) {
    throw new Error('usage: node build/spot/spot-timing.mjs <export directory>');
  }
  const dir = argv[0];

  // Read every file of the export directory into memory first, so the
  // timed decode includes no disk I/O.
  const names = (await readdir(dir)).sort();
  const manifests = names.filter((name) => MANIFEST_NAME.test(name));
  if (manifests.length !== 1) {
    throw new Error(`${dir}: expected exactly one manifest-<h12>.json, found ${manifests.length}`);
  }
  const files = new Map<string, Uint8Array>();
  for (const name of names) {
    files.set(name, new Uint8Array(await readFile(join(dir, name))));
  }
  const manifestBytes = files.get(manifests[0]) as Uint8Array;
  const exportVersion = (JSON.parse(new TextDecoder().decode(manifestBytes)) as { export_version: string })
    .export_version;
  const read = async (name: string): Promise<Uint8Array> => {
    const bytes = files.get(name);
    if (bytes === undefined) throw new Error(`${dir}: no file ${name}`);
    return bytes;
  };

  const decodeStart = performance.now();
  const vintage = await decodeVintage(manifestBytes, read, { exportVersion, schemaVersions: [1] });
  const decodeMs = performance.now() - decodeStart;

  const scenario = defaultScenario(vintage.manifest);
  const times: number[] = [];
  let records = 0;
  for (let run = 0; run < RUNS; run++) {
    const start = performance.now();
    const selection = query(vintage, scenario);
    times.push(performance.now() - start);
    records = selection.matchingRecords;
  }
  times.sort((a, b) => a - b);
  const median = (times[RUNS / 2 - 1] + times[RUNS / 2]) / 2;

  console.log(process.version);
  console.log(`decode: ${decodeMs.toFixed(3)} ms`);
  console.log(`query median of ${RUNS} (GS-0, ${records} records): ${median.toFixed(3)} ms`);
}

main(process.argv.slice(2)).catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
