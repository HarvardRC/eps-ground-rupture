// Thin Gradle wrapper around MkDocs, mirroring the python subproject's
// pattern: Gradle owns task orchestration, Poetry owns the dependency graph.
//
// There is no second venv — mkdocs and mkdocs-material live in the `docs`
// dependency group of subprojects/python/pyproject.toml, so these tasks run
// the binaries out of the same virtualenv the pipeline uses and depend on
// that project's `poetryInstall`.

plugins {
    base
}

/**
 * The virtualenv these tasks run against. Same resolution order as
 * subprojects/python/build.gradle.kts, so a machine-level override
 * (EGR_VENV, -Ppython.venv, or python.venv in ~/.gradle/gradle.properties)
 * applies to both.
 */
val venvDir: String = System.getenv("EGR_VENV")
    ?: findProperty("python.venv")?.toString()
    ?: "/opt/python/venvs/eps-ground-rapture"

/** Run a venv binary with the venv activated (VIRTUAL_ENV + PATH). */
fun Exec.useVenv() {
    val parentPath = System.getenv("PATH") ?: ""
    environment("VIRTUAL_ENV", venvDir)
    environment("PATH", "$venvDir/bin:$parentPath")
}

val poetryInstall = ":subprojects:python:poetryInstall"

val mkdocsServe by tasks.registering(Exec::class) {
    group = "documentation"
    description = "Serve the companion site locally with live reload (http://127.0.0.1:8000)."
    workingDir = projectDir
    useVenv()
    commandLine("$venvDir/bin/mkdocs", "serve")
    dependsOn(poetryInstall)
}

val mkdocsBuild by tasks.registering(Exec::class) {
    group = "documentation"
    description = "Build the companion site into subprojects/mkdocs/site/ (strict: warnings fail)."
    workingDir = projectDir
    useVenv()
    commandLine("$venvDir/bin/mkdocs", "build", "--strict")
    dependsOn(poetryInstall)

    inputs.dir("docs")
    inputs.file("mkdocs.yml")
    outputs.dir(layout.projectDirectory.dir("site"))
}

// `gradle clean` should remove the generated site; the `base` plugin only
// knows about build/.
tasks.named<Delete>("clean") {
    delete(layout.projectDirectory.dir("site"))
}

// Wire into the standard lifecycle so `./gradlew build` catches a broken
// site (dead internal links, bad config) the same way it catches test
// failures. Deployment stays manual — see DEPLOY.md.
tasks.named("assemble") {
    dependsOn(mkdocsBuild)
}
