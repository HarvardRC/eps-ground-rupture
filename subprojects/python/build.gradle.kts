// Thin Gradle wrapper around Poetry. Gradle owns task orchestration;
// Poetry owns the Python dependency graph and lockfile. Each task
// shells out via Exec — no Python-specific Gradle plugin required.
//
// Project convention: the virtualenv lives outside Poetry's cache, at a
// fixed path. poetry.toml sets virtualenvs.create=false so Poetry installs
// into the venv we activate here rather than creating its own.
//
// NB: the `venvDir` default below is /opt/python/venvs/<name>. Some
// machines keep venvs under /opt/venv/<name> instead (on the laptop that is
// a symlink to the same directory); if it is a different place, override
// via EGR_VENV, -Ppython.venv, or python.venv in ~/.gradle/gradle.properties.
// Verify which convention holds before changing the default — see
// docs/setup.md → Setup.

import java.io.File

plugins {
    base
    idea  // declaratively configure the IDEA module so re-syncs preserve Python config
}

/**
 * Resolve an absolute path to the `poetry` executable.
 *
 * Necessary because Gradle launched from a GUI app (IDEA) inherits a
 * stripped-down PATH on macOS — `/opt/homebrew/bin/` is typically absent,
 * so a bare `commandLine("poetry", ...)` fails with "command not found".
 *
 * Resolution order:
 *   1. `POETRY_BIN` environment variable
 *   2. `-Ppoetry.bin=...` Gradle property
 *   3. Common install locations on macOS / Linux
 *   4. Bare "poetry" (relies on PATH; works for terminal-launched Gradle)
 */
val poetryBin: String = run {
    val candidates = sequenceOf(
        System.getenv("POETRY_BIN"),
        findProperty("poetry.bin")?.toString(),
        "/opt/homebrew/bin/poetry",                                   // Homebrew, Apple Silicon
        "/usr/local/bin/poetry",                                      // Homebrew, Intel macOS / generic
        "${System.getProperty("user.home")}/.local/bin/poetry",       // pipx default
    ).filterNotNull()
    candidates.firstOrNull { File(it).canExecute() } ?: "poetry"
}

/**
 * Path to the virtualenv this module installs into and runs against.
 *
 * Override by setting the `EGR_VENV` environment variable or passing
 * `-Ppython.venv=/path/to/venv` on the Gradle command line.
 */
val venvDir: String = System.getenv("EGR_VENV")
    ?: findProperty("python.venv")?.toString()
    ?: "/opt/python/venvs/eps-ground-rapture"

/** Activate the venv for any Exec task by setting VIRTUAL_ENV and prepending its bin to PATH. */
fun Exec.useVenv() {
    val parentPath = System.getenv("PATH") ?: ""
    environment("VIRTUAL_ENV", venvDir)
    environment("PATH", "$venvDir/bin:$parentPath")
}

val poetryInstall by tasks.registering(Exec::class) {
    group = "build"
    description = "poetry install — sync the venv with poetry.lock."
    workingDir = projectDir
    useVenv()
    commandLine(poetryBin, "install")
}

val pytest by tasks.registering(Exec::class) {
    group = "verification"
    description = "Run the Python test suite under Poetry."
    workingDir = projectDir
    useVenv()
    commandLine(poetryBin, "run", "pytest")
    dependsOn(poetryInstall)
}

val egrBuild by tasks.registering(Exec::class) {
    group = "build"
    description = "Run the egr-build pipeline (Parquet outputs + DDL scripts). Requires every raw input in data/raw/, including the FDHI flatfile; exits 2 naming any that are missing."
    workingDir = projectDir
    useVenv()
    commandLine(poetryBin, "run", "egr-build")
    dependsOn(poetryInstall)
}

/**
 * Resolve the Google service-account key-file path for the push, in order:
 *   1. `-Pgoogle.sheets.keyfile=...` Gradle property
 *   2. `GOOGLE_SHEETS_SA_KEYFILE` environment variable
 *   3. `GOOGLE_SHEETS_SA_KEYFILE=` line in the repo-root `.env` (convenience —
 *      Gradle does the "source .env" the Python CLI deliberately won't)
 * Returns null if none is set, in which case egr-push-sheets falls back to its
 * own default path (resources/local/eps-sheets-sa.json).
 */
fun resolveSheetsKeyfile(): String? {
    fun fromDotEnv(): String? {
        val envFile = rootProject.layout.projectDirectory.file(".env").asFile
        if (!envFile.isFile) return null
        return envFile.readLines()
            .map { it.trim() }
            .firstOrNull { it.startsWith("GOOGLE_SHEETS_SA_KEYFILE=") }
            ?.substringAfter("=")?.trim()?.trim('"', '\'')
            ?.takeIf { it.isNotEmpty() }
    }
    return findProperty("google.sheets.keyfile")?.toString()
        ?: System.getenv("GOOGLE_SHEETS_SA_KEYFILE")
        ?: fromDotEnv()
}

// Publish step — NOT wired into check/assemble so it never runs as a build
// side effect (it sends data to an external service). Run it explicitly.
val pushSheets by tasks.registering(Exec::class) {
    group = "deployment"
    description =
        "Push DuckDB views to Google Sheets for Tableau Public (egr-push-sheets). " +
            "Key path from -Pgoogle.sheets.keyfile, GOOGLE_SHEETS_SA_KEYFILE, or .env. " +
            "Extra CLI args via -Psheets.args=\"--view unified_observations\"."
    workingDir = projectDir
    useVenv()
    resolveSheetsKeyfile()?.let { environment("GOOGLE_SHEETS_SA_KEYFILE", it) }
    val extraArgs = (findProperty("sheets.args")?.toString() ?: "")
        .split(" ").filter { it.isNotBlank() }
    commandLine(listOf(poetryBin, "run", "egr-push-sheets") + extraArgs)
    dependsOn(poetryInstall)
}

// Export a DuckDB view to CSV (e.g. the Drive-CSV fallback for the full `dem`
// view). Output defaults to dist/csv/<view>.csv (gitignored under dist/).
val csvOutDir = rootProject.layout.projectDirectory.dir("dist/csv").asFile

// Generic, parameterized export — for a custom view or output path.
// (IDEA can't pass -P on a double-click, so use the per-view tasks below for
// menu/double-click runs.)
val csvExport by tasks.registering(Exec::class) {
    group = "csv"
    description =
        "Export a DuckDB view to CSV. -Pview=<view> (default dem), -Pcsv.out=<path>. " +
            "For a double-click in IDEA use one of the csvExport<View> tasks."
    workingDir = projectDir
    useVenv()
    val args = mutableListOf(poetryBin, "run", "egr-csv", "--view", findProperty("view")?.toString() ?: "dem")
    findProperty("csv.out")?.toString()?.let { args += listOf("--out", it) }
    commandLine(args)
    dependsOn(poetryInstall)
}

// Per-view convenience tasks — double-clickable in IDEA (no -P needed), one
// per view in dashboards/duckdb/eps.duckdb. Mirrors views.build_duckdb_views;
// add a name here if a new view should be CSV-exportable from the menu.
//
// `fdhi_measurements` is in views.OPTIONAL_TABLES: its view exists only when
// its Parquet was found at view-build time. The task is still registered —
// where the view is absent it exits 2 with a message naming the available
// views (see views.require_view).
val csvViews = listOf(
    "dem", "fdhi_cleaned", "fdhi_measurements", "sure", "sure_enriched",
    "kern_combined", "kern_combined_geo", "unified_observations",
    // Dashboard 4 (regression + inference) — all tiny.
    "dem_regression", "dem_regression_lines", "kern_inferred_slip",
    // Dashboard 5 — per-measurement historic reference values (Fig. 15).
    // Like fdhi_measurements, needs the raw-flatfile lane: where the view is
    // absent the task exits 2 naming the available views (views.require_view).
    "historic_events",
)

val csvExportTasks = csvViews.map { view ->
    val taskName = "csvExport" + view.split("_").joinToString("") { it.replaceFirstChar(Char::uppercase) }
    tasks.register<Exec>(taskName) {
        group = "csv"
        description = "Export the `$view` view to dist/csv/$view.csv."
        workingDir = projectDir
        useVenv()
        commandLine(poetryBin, "run", "egr-csv", "--view", view)
        dependsOn(poetryInstall)
        // Exports read whatever views the last egrBuild left in eps.duckdb.
        // Never *require* the build here (a plain export must stay cheap),
        // but when both are in the task graph, order the build first —
        // otherwise `csvExportAll` against a stale eps.duckdb dies mid-run
        // on a view the old file has never heard of (the 2026-08-15 laptop
        // footgun: June duckdb, post-June view list).
        mustRunAfter(egrBuild)
    }
}

// One task to refresh every CSV — what the Tableau Public workbooks are fed
// from, so they should be regenerated together after an egrBuild.
tasks.register("csvExportAll") {
    group = "csv"
    description = "Export every view in dist/csv/ (${csvViews.size} files; `dem` alone is ~70 MB)."
    dependsOn(csvExportTasks)
}

// The safe one-click refresh: pipeline rebuild, then every export, in that
// order. This is the task to double-click in IDEA on arrive-on-a-machine
// days (see notes/multi-machine.md) — it cannot export from a stale
// eps.duckdb the way a bare `csvExportAll` can.
tasks.register("egrBuildAndExport") {
    group = "csv"
    description = "egrBuild, then csvExportAll — full refresh of dist/csv/ in one click."
    dependsOn(egrBuild)
    dependsOn(csvExportTasks)
}

// Build artifacts live under a single top-level `dist/` with one subdir per
// subproject — e.g. `dist/python/<wheel>`, future `dist/java/<jar>`.
val wheelOutDir = rootProject.layout.projectDirectory.dir("dist/python").asFile

val wheel by tasks.registering(Exec::class) {
    group = "build"
    description = "Build a wheel for the Python package (output: dist/python/eps_ground_rupture-*.whl)."
    workingDir = projectDir
    useVenv()
    commandLine(
        poetryBin, "build",
        "--format", "wheel",
        "--output", wheelOutDir.absolutePath,
    )
    dependsOn(poetryInstall)

    // Re-run the build whenever sources / metadata change; treat the wheel as the output.
    inputs.dir("src")
    inputs.file("pyproject.toml")
    inputs.file("poetry.lock")
    inputs.file("README.md")
    outputs.dir(wheelOutDir)
}

// `gradle clean` should also remove this module's slices of dist/; `base`
// plugin only cleans `build/`.
tasks.named<Delete>("clean") {
    delete(wheelOutDir, csvOutDir)
}

// Wire into Gradle lifecycle so `./gradlew check` and `./gradlew build`
// from the root project trigger the Python tasks.
tasks.named("check") {
    dependsOn(pytest)
}

tasks.named("assemble") {
    dependsOn(wheel, egrBuild)
}

// ----------------------------------------------------------------------------
// IDEA module customization (partial)
// ----------------------------------------------------------------------------
//
// IDEA's "Sync Project with Gradle Files" honors the `idea.module`
// properties below (source roots, test sources, excluded folders) but
// does *not* honor `iml.withXml` customizations for facets or orderEntry
// — those would only show up if you ran `./gradlew :subprojects:python:ideaModule`
// from the command line, which IDEA's sync does not do. JetBrains has not
// closed this gap. So the Python interpreter / facet must be set up
// per-machine via the IDEA UI; see subprojects/python/README.md for the
// one-time steps. Re-applying after each Gradle sync is currently
// unavoidable.

idea {
    module {
        sourceDirs.add(file("src"))
        testSources.from(file("tests"))
        excludeDirs.add(file(".venv"))
        excludeDirs.add(file("dist"))
    }
}
