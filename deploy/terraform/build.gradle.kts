// Gradle wrapper around the Terraform deployment and the data sync.
// Gradle owns task orchestration; Terraform owns the infrastructure and
// the aws CLI owns the data upload. Tasks are registered per environment
// (dev, prod) so the dangerous ones are explicit: `applyProd`, not
// `apply -Penv=prod`.
//
// None of these tasks are wired into the build lifecycle — deployment
// must never happen as a side effect of `./gradlew build`.

import java.io.File

plugins {
    base
}

/**
 * Resolve an absolute path to a binary. Gradle launched from a GUI app
 * (IDEA) inherits a stripped-down PATH on macOS, so bare command names
 * fail — same issue we solved for poetry in subprojects/python.
 *
 * Resolution order: env var → gradle property → common locations → bare name.
 */
fun resolveBin(envVar: String, property: String, candidates: List<String>, bare: String): String {
    val fromEnv = System.getenv(envVar)
    val fromProp = findProperty(property)?.toString()
    return sequenceOf(fromEnv, fromProp)
        .filterNotNull()
        .plus(candidates)
        .firstOrNull { File(it).canExecute() } ?: bare
}

val terraformBin: String = resolveBin(
    "TERRAFORM_BIN", "terraform.bin",
    listOf("/opt/homebrew/bin/terraform", "/usr/local/bin/terraform"),
    "terraform",
)

val awsBin: String = resolveBin(
    "AWS_BIN", "aws.bin",
    listOf("/usr/local/bin/aws", "/opt/homebrew/bin/aws"),
    "aws",
)

val awsProfile: String = findProperty("aws.profile")?.toString() ?: "urc"

val environments = listOf("dev", "prod")

environments.forEach { env ->
    val envDir = file("envs/$env")
    val cap = env.replaceFirstChar { it.uppercase() }
    val bucket = "eps-ground-rapture-$env"

    val init = tasks.register<Exec>("init$cap") {
        group = "deployment"
        description = "terraform init for $env (skipped when .terraform/ already exists)."
        workingDir = envDir
        commandLine(terraformBin, "init", "-input=false")
        onlyIf { !envDir.resolve(".terraform").isDirectory }
    }

    tasks.register<Exec>("plan$cap") {
        group = "deployment"
        description = "terraform plan for $env (read-only)."
        workingDir = envDir
        commandLine(terraformBin, "plan", "-input=false")
        dependsOn(init)
    }

    tasks.register<Exec>("apply$cap") {
        group = "deployment"
        description = "terraform apply for $env" +
            if (env == "prod") " (interactive approval — run from a terminal)." else " (auto-approved)."
        workingDir = envDir
        if (env == "prod") {
            // Keep Terraform's own yes/no confirmation for prod. Requires a
            // real terminal; IDEA's Gradle pane does not forward stdin.
            commandLine(terraformBin, "apply", "-input=false")
            standardInput = System.`in`
        } else {
            commandLine(terraformBin, "apply", "-input=false", "-auto-approve")
        }
        dependsOn(init)
    }

    tasks.register<Exec>("output$cap") {
        group = "deployment"
        description = "terraform output for $env (bucket, database, workgroup, sync command)."
        workingDir = envDir
        commandLine(terraformBin, "output")
    }

    tasks.register<Exec>("syncData$cap") {
        group = "deployment"
        description = "aws s3 sync data/processed/ to the $env bucket (profile $awsProfile)."
        workingDir = rootProject.projectDir
        commandLine(
            awsBin, "--profile", awsProfile, "s3", "sync",
            "data/processed/", "s3://$bucket/processed/",
            "--exclude", "*.gitkeep",
        )
        doFirst {
            val probe = rootProject.projectDir.resolve("data/processed/dem/data.parquet")
            if (!probe.isFile) {
                throw GradleException(
                    "data/processed/ looks empty ($probe missing). " +
                        "Run `./gradlew :subprojects:python:egrBuild` first."
                )
            }
        }
    }
}
