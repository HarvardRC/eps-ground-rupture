// The Ground Rupture Explorer web application (docs/app/ddd.md §2;
// docs/adr/0011-webapp-toolchain.md). The node-gradle plugin downloads
// the pinned Node.js runtime into .gradle/nodejs/ and runs the npm that
// ships with it, so every build, local and CI, runs the same runtime.
// Every task of this module is a plugin task type, never Gradle Exec,
// which would run whatever `node` the machine provides.

import com.github.gradle.node.npm.task.NpmTask
import com.github.gradle.node.task.NodeTask

plugins {
    base
    id("com.github.node-gradle.node") version "7.1.0"
}

node {
    version.set("22.12.0")
    download.set(true)
}

// Installs the package tree the committed package-lock.json pins.
val npmCi by tasks.registering(NpmTask::class) {
    npmCommand.set(listOf("ci"))
    inputs.file("package.json")
    inputs.file("package-lock.json")
    outputs.dir("node_modules")
}

// Type-checks both TypeScript configurations: tsconfig.json, the whole
// module, and tsconfig.node.json, the pure modules without DOM types.
// Never fused with bundling, and wired into `check` as its own task.
val tscCheck by tasks.registering(NpmTask::class) {
    dependsOn(npmCi)
    npmCommand.set(listOf("run", "typecheck"))
}

// Compiles the Node unit tests into build/test/ and runs them with
// `node --test` (docs/app/ddd.md §7.4). test/toolchain.test.ts fails
// unless the runtime is v<EGR_EXPECTED_NODE>, the pin above, so a run
// on any other runtime, or outside Gradle, fails.
val webappTest by tasks.registering(NpmTask::class) {
    dependsOn(npmCi)
    npmCommand.set(listOf("run", "test"))
    environment.put("EGR_EXPECTED_NODE", node.version)
}

// The calculation-parity harness (docs/app/ddd.md §7.2): fetch, verify,
// replay. In no lifecycle task: CI runs it in its own Parity steps
// (§6.3), and locally it runs on demand.
val webappParity by tasks.registering(NpmTask::class) {
    dependsOn(npmCi)
    npmCommand.set(listOf("run", "parity"))
}

// Builds the page assets build/dist/app.js and build/dist/app.css under
// stable names; scenarioAssets copies them under content-hashed names
// (docs/app/ddd.md §6.1).
val webappBundle by tasks.registering(NodeTask::class) {
    dependsOn(npmCi)
    script.set(file("build.mjs"))
}

tasks.named("check") {
    dependsOn(tscCheck, webappTest)
}

tasks.named("assemble") {
    dependsOn(webappBundle)
}
