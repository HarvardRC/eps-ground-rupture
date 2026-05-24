// Root build: orchestrator only. No application code lives at the root.
//
// Each language module under subprojects/ owns its own build.gradle.kts.
// This file defines cross-cutting tasks that fan out to the modules
// (e.g. `./gradlew check` runs every module's checks).

plugins {
    base
}

// `./gradlew check` and `./gradlew build` already cascade to subprojects
// via the `base` plugin's task graph — nothing more needed for now.
//
// Add aggregating tasks here when there's something genuinely cross-module
// (e.g. a docs build that depends on artifacts from multiple modules).
