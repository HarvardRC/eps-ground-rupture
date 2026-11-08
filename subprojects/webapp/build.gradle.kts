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

// Downloads the Chromium build the locked @playwright/test pins into
// Playwright's per-user browser cache, unless it is already there
// (docs/app/ddd.md §2, §7.5). Never `check`, never CI; run by hand before
// a local `measure` diagnostic.
val playwrightInstall by tasks.registering(NpmTask::class) {
    dependsOn(npmCi)
    npmCommand.set(listOf("run", "browser-install"))
}

// The browser test lane (docs/app/ddd.md §7.5): the functional projects
// `desktop` and `mobile` against the freshly built preview tree. The
// release checklist only — never `check`, never CI.
val webappBrowserTest by tasks.registering(NpmTask::class) {
    dependsOn(":subprojects:mkdocs:mkdocsPreview")
    dependsOn(playwrightInstall)
    npmCommand.set(listOf("run", "browser-test"))
}

// The performance reference environment (docs/app/ddd.md §2, task table;
// §7.6): perf/run.mjs on the pinned runtime. Owner-invoked only — never
// `check`, never CI. Nothing is read or checked while Gradle configures
// this script: run.mjs checks the profile and terraform, and the doFirst
// below checks egr.perf.target, when the task executes.
val perfAwsProfile = providers.gradleProperty("egr.perf.awsProfile")
val perfTarget = providers.gradleProperty("egr.perf.target")
val perfProfileEnvironment = perfAwsProfile.map { mapOf("TF_VAR_aws_profile" to it) }.orElse(emptyMap())
val mkdocsYml = rootProject.file("subprojects/mkdocs/mkdocs.yml")

// Create or reconcile the reference VM, run the `measure` project on it,
// and destroy it once the run has completed and its report is downloaded.
val webappMeasureReference by tasks.registering(NodeTask::class) {
    dependsOn(npmCi)
    dependsOn(":subprojects:mkdocs:mkdocsPreview")
    script.set(file("perf/run.mjs"))
    args.set(listOf("run"))
    environment.putAll(perfProfileEnvironment)
    // -Pegr.perf.target=published measures the published site: its URL is
    // the site_url of mkdocs.yml, read when the task executes.
    environment.putAll(perfTarget.map { target ->
        if (target != "published") emptyMap()
        else {
            val siteUrl = mkdocsYml.readLines()
                .firstNotNullOfOrNull { Regex("""^site_url:\s*(\S+)\s*$""").find(it)?.groupValues?.get(1) }
                ?: throw GradleException("site_url not found in $mkdocsYml")
            mapOf("EGR_BASE_URL" to siteUrl)
        }
    }.orElse(emptyMap()))
    doFirst {
        val target = perfTarget.orNull
        if (target != null && target != "published") {
            throw GradleException("egr.perf.target must be 'published' (got '$target')")
        }
    }
}

// Destroy every resource the reference environment's state records.
val webappMeasureDestroy by tasks.registering(NodeTask::class) {
    dependsOn(npmCi)
    script.set(file("perf/run.mjs"))
    args.set(listOf("destroy"))
    environment.putAll(perfProfileEnvironment)
}

tasks.named("check") {
    dependsOn(tscCheck, webappTest)
}

tasks.named("assemble") {
    dependsOn(webappBundle)
}
