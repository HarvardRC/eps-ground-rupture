// The esbuild driver of the web application (docs/app/ddd.md §2, npm
// scripts and build.mjs). It runs in this module's directory, as the
// npm scripts and the webappBundle task run it.
//
// Without flags it builds the page assets under stable names —
// build/dist/app.js and build/dist/app.css, which scenarioAssets
// copies under content-hashed names (§6.1). The bundle is ESM because
// the navigation lifecycle identifies it by import.meta.url, which
// esbuild's browser default format empties; no source map is written,
// because scenarioAssets publishes exactly the one .js and the one
// .css file.
//
// With --tests it compiles every test/**/*.test.ts file and, when it
// exists, test/parity.ts into build/test/ at the same relative paths,
// each bundled with its imports, and writes build/test/package.json so
// that Node loads them as ES modules; no other file of test/ is an
// entry point.

import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import * as esbuild from "esbuild";

if (process.argv.slice(2).includes("--tests")) {
  const entryPoints = readdirSync("test", { recursive: true })
    .filter((path) => path.endsWith(".test.ts"))
    .map((path) => join("test", path))
    .sort();
  if (existsSync("test/parity.ts")) {
    entryPoints.push("test/parity.ts");
  }
  await esbuild.build({
    entryPoints,
    outdir: "build/test",
    outbase: "test",
    bundle: true,
    platform: "node",
    format: "esm",
    target: "es2020",
  });
  mkdirSync("build/test", { recursive: true });
  writeFileSync("build/test/package.json", '{"type": "module"}\n');
} else {
  await esbuild.build({
    entryPoints: ["src/main.ts"],
    outfile: "build/dist/app.js",
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2020",
    minify: true,
    sourcemap: false,
  });
  await esbuild.build({
    entryPoints: ["src/app.css"],
    outfile: "build/dist/app.css",
    bundle: true,
    minify: true,
    sourcemap: false,
  });
}
