// The early feasibility diagnostic (docs/app/ip.md T-37, extending T-31
// step 3's decode-and-query timing spot check; docs/app/ddd.md §7.6, §5.3,
// §5.4): one representative scenario end to end through decode,
// selection, and statistics, timed against the 200 ms interaction budget
// of PDD §9.1. A diagnostic on the agent's machine, never acceptance
// evidence — the acceptance measurement is §7.6's in its reference
// environment (T-61); over budget it warns and still exits 0.
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
// own `export_version` and `schemaVersions` [1]) and times the decode
// once. Then it runs GS-0 — `defaultScenario(vintage.manifest)`, the
// all-default scenario — 30 times (§7.6's count) through selection,
// `query(vintage, scenario)`, and statistics, `validValues` and
// `summarize` for each measurement; the repeated interval is selection
// plus statistics. It prints `process.version`; the decode time; T-31's
// figure, the median of the 30 selection times alone (the mean of the
// 15th and 16th smallest); the minimum, median (`quantileLinear(sorted,
// 0.5)`), 95th percentile (the nearest rank, `sorted[28]`), and maximum
// of the 30 intervals, as §7.6 reports a workload; and the line
// `feasibility diagnostic: <p95> ms of 200 ms budget`. All times in
// milliseconds.

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

import { decodeVintage } from '../src/decode/decode';
import { query } from '../src/engine/query';
import { MEASUREMENT_NAMES, defaultScenario } from '../src/state/state';
import { quantileLinear } from '../src/stats/quantile';
import { summarize, validValues } from '../src/stats/stats';

/** The number of timed repetitions (§7.6, Repetitions and judging). */
const RUNS = 30;

/** The nearest-rank 95th percentile's index among 30 ascending samples (§7.6). */
const P95_INDEX = 28;

/** The interaction budget, scenario change to updated results (PDD §9.1), in ms. */
const BUDGET_MS = 200;

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

  // Each repetition: selection, then statistics for every measurement.
  // The selection's own time is read inside the same interval, so T-31's
  // query median comes from these 30 repetitions too.
  const queryTimes: number[] = [];
  const times: number[] = [];
  let records = 0;
  let summarized = 0;
  for (let run = 0; run < RUNS; run++) {
    const start = performance.now();
    const selection = query(vintage, defaultScenario(vintage.manifest));
    const selected = performance.now();
    let withStats = 0;
    for (const measurement of MEASUREMENT_NAMES) {
      if (summarize(validValues(vintage, selection, measurement)) !== null) withStats++;
    }
    const end = performance.now();
    queryTimes.push(selected - start);
    times.push(end - start);
    records = selection.matchingRecords;
    summarized = withStats;
  }
  queryTimes.sort((a, b) => a - b);
  const queryMedian = (queryTimes[RUNS / 2 - 1] + queryTimes[RUNS / 2]) / 2;
  times.sort((a, b) => a - b);
  const min = times[0];
  const median = quantileLinear(times, 0.5);
  const p95 = times[P95_INDEX];
  const max = times[RUNS - 1];

  console.log(process.version);
  console.log(`decode: ${decodeMs.toFixed(3)} ms`);
  console.log(`query median of ${RUNS} (GS-0, ${records} records): ${queryMedian.toFixed(3)} ms`);
  console.log(
    `selection + statistics over ${RUNS} runs (GS-0, ${records} records, ` +
      `${summarized} of ${MEASUREMENT_NAMES.length} measurements summarized): ` +
      `min ${min.toFixed(3)} ms, median ${median.toFixed(3)} ms, ` +
      `p95 ${p95.toFixed(3)} ms, max ${max.toFixed(3)} ms`,
  );
  console.log(`feasibility diagnostic: ${p95.toFixed(3)} ms of ${BUDGET_MS} ms budget`);
  if (p95 > BUDGET_MS) {
    console.warn(
      `warning: the 95th percentile, ${p95.toFixed(3)} ms, is over the ${BUDGET_MS} ms interaction budget — ` +
        `a diagnostic on this machine, not a gate; acceptance is T-61's measurement in the reference environment of DDD §7.6`,
    );
  }
}

main(process.argv.slice(2)).catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
