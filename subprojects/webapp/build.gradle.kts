// The Ground Rupture Explorer web application (docs/app/ddd.md §2;
// docs/adr/0011-webapp-toolchain.md). The node-gradle plugin downloads
// the pinned Node.js runtime into .gradle/nodejs/ and runs the npm that
// ships with it, so every build, local and CI, runs the same runtime.
// Every task of this module is a plugin task type, never Gradle Exec,
// which would run whatever `node` the machine provides.

import com.github.gradle.node.npm.task.NpmTask

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
