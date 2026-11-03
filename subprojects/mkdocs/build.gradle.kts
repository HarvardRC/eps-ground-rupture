// Thin Gradle wrapper around MkDocs, mirroring the python subproject's
// pattern: Gradle owns task orchestration, Poetry owns the dependency graph.
//
// There is no second venv — mkdocs and mkdocs-material live in the `docs`
// dependency group of subprojects/python/pyproject.toml, so these tasks run
// the binaries out of the same virtualenv the pipeline uses and depend on
// that project's `poetryInstall`.

import groovy.json.JsonSlurper
import java.security.MessageDigest

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

// ---------------------------------------------------------------------------
// Scenario-page staging (docs/app/ddd.md §6.1, Staging tasks). Every file
// the scenario page adds to the site is a build product: fetchVintage keeps
// a checksum-verified cache of the pinned data vintage under build/vintage/,
// and scenarioAssets is the only writer of the application subtree under
// docs/ (assets/scenario/ and includes/scenario-head.html, both gitignored).
// ---------------------------------------------------------------------------

/** The repository the pointer's data releases live in. */
val dataRepository = "HarvardRC/eps-ground-rupture"

/** The committed pointer manifest (docs/app/ddd.md §3.3). */
val pointerFile: File = rootProject.file("subprojects/webapp/data/pointer.json")

/** The webapp's bundle output, the `webappBundle` task's build/dist/. */
val webappDist: File = rootProject.file("subprojects/webapp/build/dist")

/** The cache fetchVintage keeps; the repository's `build/` rule ignores it. */
val vintageCache: File = layout.buildDirectory.dir("vintage").get().asFile

/** The pointer's data release tag and its `files` map (name -> SHA-256). */
data class Pointer(val dataTag: String, val files: Map<String, String>)

fun readPointer(): Pointer {
    @Suppress("UNCHECKED_CAST")
    val json = JsonSlurper().parse(pointerFile) as Map<String, Any?>
    val dataTag = json["data_tag"] as? String
        ?: throw GradleException("$pointerFile has no string data_tag.")
    @Suppress("UNCHECKED_CAST")
    val files = json["files"] as? Map<String, String>
        ?: throw GradleException("$pointerFile has no files map.")
    return Pointer(dataTag, files.toSortedMap())
}

/** The lowercase hexadecimal SHA-256 of a file's bytes. */
fun sha256(file: File): String {
    val digest = MessageDigest.getInstance("SHA-256")
    file.inputStream().use { input ->
        val buffer = ByteArray(1 shl 16)
        while (true) {
            val n = input.read(buffer)
            if (n < 0) break
            digest.update(buffer, 0, n)
        }
    }
    return digest.digest().joinToString("") { "%02x".format(it) }
}

/** `app.js` -> `app-<first 12 lowercase hex of its SHA-256>.js`. */
fun hashedName(file: File): String =
    "${file.nameWithoutExtension}-${sha256(file).take(12)}.${file.extension}"

/** The result of one `gh` call: exit code and combined output. */
data class GhResult(val exitCode: Int, val output: String)

/**
 * Run `gh` with the given arguments in this module's directory, resolving
 * `gh` on the PATH of the Gradle process. A `gh` that cannot be started is
 * reported as a failed call, never thrown.
 */
fun runGh(args: List<String>): GhResult =
    try {
        val process = ProcessBuilder(listOf("gh") + args)
            .directory(projectDir)
            .redirectErrorStream(true)
            .start()
        val output = process.inputStream.bufferedReader().readText()
        GhResult(process.waitFor(), output)
    } catch (e: java.io.IOException) {
        GhResult(-1, "gh could not be started: ${e.message}")
    }

val fetchVintage by tasks.registering {
    group = "documentation"
    description =
        "Download the data vintage the pointer manifest pins into build/vintage/<data_tag>/, " +
            "verifying every SHA-256; offline when the cache already matches."
    inputs.file(pointerFile)
    outputs.dir(vintageCache)
    doLast {
        val pointer = readPointer()
        val tag = pointer.dataTag
        val dir = File(vintageCache, tag)
        val pending = pointer.files.filter { (name, digest) ->
            val cached = File(dir, name)
            !(cached.isFile && sha256(cached) == digest)
        }
        if (pending.isEmpty()) {
            logger.lifecycle("fetchVintage: every file of $tag matches its pointer SHA-256.")
            return@doLast
        }

        // The data release must be a published prerelease (docs/app/ddd.md
        // §6.1); checked once, before any download.
        val release = "data release $tag of $dataRepository"
        val view = runGh(
            listOf("release", "view", tag, "--repo", dataRepository, "--json", "isDraft,isPrerelease"),
        )
        if (view.exitCode != 0) {
            if (view.output.contains("release not found")) {
                throw GradleException("fetchVintage: the $release is missing (release not found).")
            }
            throw GradleException(
                "fetchVintage: the lookup of the $release failed (gh exit ${view.exitCode}): " +
                    view.output.trim(),
            )
        }
        @Suppress("UNCHECKED_CAST")
        val state = try {
            JsonSlurper().parseText(view.output) as Map<String, Any?>
        } catch (e: Exception) {
            throw GradleException(
                "fetchVintage: the lookup of the $release failed: unreadable gh output: " +
                    view.output.trim(),
            )
        }
        val isDraft = state["isDraft"]
        val isPrerelease = state["isPrerelease"]
        if (isDraft !is Boolean || isPrerelease !is Boolean) {
            throw GradleException(
                "fetchVintage: the lookup of the $release failed: no isDraft/isPrerelease in " +
                    view.output.trim(),
            )
        }
        val failed = mutableListOf<String>()
        if (isDraft) failed += "it is a draft"
        if (!isPrerelease) failed += "it is not a prerelease"
        if (failed.isNotEmpty()) {
            var message = "fetchVintage: the $release cannot be used: ${failed.joinToString(" and ")}."
            if (!isPrerelease) {
                val repair = "gh release edit $tag --repo $dataRepository --prerelease"
                logger.error("Repair: $repair")
                message += " Repair: $repair"
            }
            throw GradleException(message)
        }

        dir.mkdirs()
        for ((name, digest) in pending) {
            val download = runGh(
                listOf(
                    "release", "download", tag, "--repo", dataRepository,
                    "--pattern", name, "--dir", "build/vintage/$tag", "--clobber",
                ),
            )
            val cached = File(dir, name)
            if (!cached.isFile) {
                throw GradleException(
                    "fetchVintage: $name is missing after its download from the $release " +
                        "(gh exit ${download.exitCode}): ${download.output.trim()}",
                )
            }
            val actual = sha256(cached)
            if (actual != digest) {
                throw GradleException(
                    "fetchVintage: $name does not match its pointer SHA-256 after its download " +
                        "from the $release (expected $digest, got $actual).",
                )
            }
            logger.lifecycle("fetchVintage: downloaded and verified $name.")
        }
    }
}

val scenarioHead: File = file("docs/includes/scenario-head.html")

val scenarioAssets by tasks.registering(Sync::class) {
    group = "documentation"
    description =
        "Stage the webapp bundle under content-hashed names and the pinned vintage into " +
            "docs/assets/scenario/, and write docs/includes/scenario-head.html."
    dependsOn(":subprojects:webapp:webappBundle", fetchVintage)
    inputs.file(pointerFile)
    inputs.file(rootProject.file("CITATION.cff"))
    outputs.file(scenarioHead)
    into("docs/assets/scenario")
    // Gradle ignores files that something else adds to an output directory,
    // so a stray file alone would leave this task UP-TO-DATE. The task is
    // up to date only when the destination holds exactly the files it
    // copies, so the Sync always removes strays.
    outputs.upToDateWhen {
        val pointer = readPointer()
        val expected = pointer.files.keys.map { "data/$it" }.toMutableSet()
        for (asset in listOf("app.js", "app.css")) {
            val source = File(webappDist, asset)
            if (!source.isFile) return@upToDateWhen false
            expected += hashedName(source)
        }
        val destination = file("docs/assets/scenario")
        val actual = fileTree(destination).files.map { it.relativeTo(destination).invariantSeparatorsPath }.toSet()
        actual == expected
    }

    from(webappDist) {
        include("app.js", "app.css")
        eachFile { name = hashedName(file) }
    }
    from(vintageCache) {
        // Exactly the names the pointer's `files` lists, from the pointer's
        // data release, staged as data/<name>.
        include { element ->
            val pointer = readPointer()
            val parts = element.relativePath.segments
            when (parts.size) {
                1 -> parts[0] == pointer.dataTag && element.isDirectory
                2 -> parts[0] == pointer.dataTag && parts[1] in pointer.files
                else -> false
            }
        }
        eachFile { relativePath = RelativePath(true, "data", name) }
        includeEmptyDirs = false
    }

    doLast {
        val pointer = readPointer()
        val js = hashedName(File(webappDist, "app.js"))
        val css = hashedName(File(webappDist, "app.css"))
        val manifestPattern = Regex("manifest-[0-9a-f]{12}\\.json")
        val manifests = pointer.files.keys.filter { manifestPattern.matches(it) }
        if (manifests.size != 1) {
            throw GradleException(
                "scenarioAssets: the pointer must list exactly one manifest-<h12>.json; it lists $manifests.",
            )
        }
        // The generated tag block of docs/app/ddd.md §6.1. The two version
        // values stay empty here: their sourcing and writing (§6.2) is T-50's.
        scenarioHead.parentFile.mkdirs()
        scenarioHead.writeText(
            """
            |<link rel="stylesheet" href="../assets/scenario/$css">
            |<script type="module" id="gre-app"
            |        src="../assets/scenario/$js"
            |        data-software-version=""
            |        data-data-version=""
            |        data-manifest="data/${manifests.single()}"></script>
            |""".trimMargin(),
        )
    }
}

val mkdocsServe by tasks.registering(Exec::class) {
    group = "documentation"
    description = "Serve the companion site locally with live reload (http://127.0.0.1:8000)."
    workingDir = projectDir
    useVenv()
    commandLine("$venvDir/bin/mkdocs", "serve")
    dependsOn(poetryInstall, scenarioAssets)
}

val mkdocsBuild by tasks.registering(Exec::class) {
    group = "documentation"
    description = "Build the companion site into subprojects/mkdocs/site/ (strict: warnings fail)."
    workingDir = projectDir
    useVenv()
    commandLine("$venvDir/bin/mkdocs", "build", "--strict")
    dependsOn(poetryInstall, scenarioAssets)

    inputs.dir("docs")
    inputs.file("mkdocs.yml")
    // The site checks hook and its allowlist decide what the build may
    // publish (docs/app/ddd.md §6.1): an edit to either re-runs the build.
    inputs.file("hooks/site_checks.py")
    inputs.file("publication-allowlist.txt")
    outputs.dir(layout.projectDirectory.dir("site"))
}

// The preview build (docs/app/ddd.md §6.1): the publication configuration
// with every product draft included, into site-preview/. CI validates it;
// it is never deployed.
val mkdocsPreview by tasks.registering(Exec::class) {
    group = "documentation"
    description = "Build the preview site into subprojects/mkdocs/site-preview/ (strict; never deployed)."
    workingDir = projectDir
    useVenv()
    commandLine("$venvDir/bin/mkdocs", "build", "--strict", "-f", "mkdocs.preview.yml")
    dependsOn(poetryInstall, scenarioAssets)

    inputs.dir("docs")
    inputs.file("mkdocs.yml")
    inputs.file("mkdocs.preview.yml")
    inputs.file("hooks/site_checks.py")
    inputs.file("publication-allowlist.txt")
    outputs.dir(layout.projectDirectory.dir("site-preview"))
}

// `gradle clean` also removes the generated sites and the staged scenario
// files; the `base` plugin only knows about build/, which holds the vintage
// cache. Never docs/assets/ or docs/includes/ as a whole: both can hold
// committed files.
tasks.named<Delete>("clean") {
    delete(
        layout.projectDirectory.dir("site"),
        layout.projectDirectory.dir("site-preview"),
        layout.projectDirectory.dir("docs/assets/scenario"),
        layout.projectDirectory.file("docs/includes/scenario-head.html"),
        layout.projectDirectory.dir("docs/includes/media"),
    )
}

// Wire into the standard lifecycle so `./gradlew build` catches a broken
// site (dead internal links, bad config) the same way it catches test
// failures. Deployment stays manual — see DEPLOY.md.
tasks.named("assemble") {
    dependsOn(mkdocsBuild, mkdocsPreview)
}
