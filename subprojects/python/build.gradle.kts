// Thin Gradle wrapper around Poetry. Gradle owns task orchestration;
// Poetry owns the Python dependency graph and lockfile. Each task
// shells out via Exec — no Python-specific Gradle plugin required.
//
// Project convention: the virtualenv lives at /opt/python/venvs/<name>/
// (not in Poetry's cache). poetry.toml sets virtualenvs.create=false so
// Poetry installs into the venv we activate here rather than creating
// its own.

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
    description = "Run the egr-build pipeline (Parquet outputs + DDL scripts). --skip-fdhi by default."
    workingDir = projectDir
    useVenv()
    commandLine(poetryBin, "run", "egr-build", "--skip-fdhi")
    dependsOn(poetryInstall)
}

// Build artifacts live under a single top-level `dist/` with one subdir per
// subproject — e.g. `dist/python/<wheel>`, future `dist/java/<jar>`.
val wheelOutDir = rootProject.layout.projectDirectory.dir("dist/python").asFile

val wheel by tasks.registering(Exec::class) {
    group = "build"
    description = "Build a wheel for the Python package (output: dist/python/eps_ground_rapture-*.whl)."
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

// `gradle clean` should also remove this module's slice of dist/; `base`
// plugin only cleans `build/`.
tasks.named<Delete>("clean") {
    delete(wheelOutDir)
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
