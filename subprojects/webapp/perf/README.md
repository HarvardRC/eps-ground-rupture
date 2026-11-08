# Performance reference environment (`perf/`)

The owner's instructions for the reference measurement environment of
[DDD §7.6](../../../docs/app/ddd.md#76-performance-and-compatibility-measurements)
(DD-12; [ADR-0016](../../../docs/adr/0016-performance-reference-environment.md)):
one on-demand AWS EC2 VM — `c6i.xlarge` in `us-east-1`, Ubuntu Server
24.04 LTS from the pinned AMI in `variables.tf`, a 30 GiB gp3 root
volume — created for a measurement run and destroyed once the run has
completed and its report is downloaded. It is the project's agreed
acceptance baseline, not a calibrated stand-in for any reader's laptop,
and its timings vary from run to run.

No agent task and no CI job runs anything here. Every AWS action is the
owner's, or Claude's at the owner's request with the owner's profile.

## Before the first run

1. **AWS profile.** Name, in `~/.gradle/gradle.properties` (never
   committed):

   ```properties
   egr.perf.awsProfile=<profile>
   ```

   The profile is allowed, in `us-east-1`, exactly the §7.6 permissions
   and no others (the owner's policy `egr-perf-reference`):

   - `ec2:RunInstances` for an instance tagged `Purpose=perf-reference`
     in its launch request, into the reference subnet, with security
     groups of the reference VPC and any key pair, volume, and snapshot,
     from a public image owned by `amazon` (Amazon or a verified
     provider, Canonical among them) or by Canonical's account
     `099720109477`;
   - `ec2:TerminateInstances`, `ec2:ModifyInstanceAttribute`,
     `ec2:ModifyInstanceMetadataOptions`, `ec2:CreateTags`, and
     `ec2:DeleteTags` on the tagged instance;
   - `ec2:CreateSecurityGroup` in the reference VPC, and
     `ec2:DeleteSecurityGroup`, the ingress and egress authorize, revoke,
     modify, and description-update actions, `ec2:CreateTags`,
     `ec2:DeleteTags`, and `ec2:ModifyInstanceAttribute` on the security
     groups of that VPC;
   - `ec2:ImportKeyPair` for a key pair tagged `Purpose=perf-reference`,
     and `ec2:DeleteKeyPair`, `ec2:CreateTags`, and `ec2:DeleteTags` on
     the tagged key pair;
   - `ec2:CreateTags` on anything else only in the request that creates
     it (`ec2:CreateAction`);
   - the read-only `ec2:Describe*` actions;
   - `ssm:GetParameter` under `/aws/service/canonical/`.

   It may create no VPC, subnet, gateway, or route table, and this root
   creates none. A commit that changes a kept VM's type, root volume,
   volume tags, or security groups is applied only after
   `webappMeasureDestroy` has removed that VM.

2. **Reference network.** Create once, outside Terraform, and keep: a
   VPC (never the account's default VPC) with one public subnet —
   public IPv4 on launch, in a zone that offers `c6i.xlarge` — an
   internet gateway, and a route table sending `0.0.0.0/0` to it. Tag
   every part with the four required tags, and the subnet must be the
   only subnet tagged `Purpose=perf-reference`:

   | Tag | Value |
   | --- | --- |
   | `Purpose` | `perf-reference` |
   | `School` | `EPS` |
   | `Project` | `eps-ground-rupture` |
   | `Stakeholder` | `John Shaw` |

   Not `ManagedBy=terraform`: no Terraform root manages the network.
   Every resource this root creates carries those four tags and
   `ManagedBy=terraform`. Nothing in the network costs anything while no
   VM runs.

3. **Terraform** `~> 1.7` on `PATH`, your own installation: Gradle never
   downloads it, and the run refuses a version outside the constraint.
   The committed `.terraform.lock.hcl` pins the provider versions; every
   report records the Terraform CLI version.

## Running

From the repository root:

```sh
./gradlew :subprojects:webapp:webappMeasureReference
```

It builds the preview site, then `perf/run.mjs run`:

1. refuses unless the working tree is clean
   (`git status --porcelain=v1 --untracked-files=all` prints nothing),
   Terraform is within `~> 1.7`, the profile is set, and the preview
   site exists;
2. creates the VM, or reconciles what an earlier run left;
3. waits for SSH and cloud-init;
4. uploads the preview site and the `measure` project's files;
5. runs `xvfb-run -a npx playwright test --project=measure --workers=1`
   on the VM;
6. downloads the report to
   `subprojects/webapp/build/perf/<run_id>/report.json`, where
   `<run_id>` is the start time (`YYYYMMDDTHHMMSSZ`) and the 12-digit
   short commit;
7. destroys the VM once the run has completed and the report is
   downloaded, whether or not the budgets are met. After any failure
   it keeps the VM for diagnosis, prints how to reach and remove it,
   and exits non-zero.

The published-site variant measures the live site instead of the
uploaded preview:

```sh
./gradlew :subprojects:webapp:webappMeasureReference -Pegr.perf.target=published
```

`published` is the only value `egr.perf.target` accepts.

To remove everything the Terraform state records, at any time:

```sh
./gradlew :subprojects:webapp:webappMeasureDestroy
```

## A kept VM, and leftovers

`ssh` and `status` have no Gradle task. Run them in
`subprojects/webapp` on the pinned Node.js runtime, after
`./gradlew :subprojects:webapp:npmCi` from the repository root:

```sh
cd subprojects/webapp
export PATH="$(ls -d "$PWD"/.gradle/nodejs/node-v22.12.0-*)/bin:$PATH"
node perf/run.mjs ssh
```

opens a session on a kept VM; and

```sh
cd subprojects/webapp
export PATH="$(ls -d "$PWD"/.gradle/nodejs/node-v22.12.0-*)/bin:$PATH"
TF_VAR_aws_profile=<profile> node perf/run.mjs status
```

lists what the state records, with the instance's EC2 state, and
changes nothing. Any subcommand takes `--dry-run`, which prints the
commands it would run and runs none.

**Self-termination.** Every VM shuts itself down — terminating, not
stopping — 24 hours after first boot. That is a best-effort bound on
its running time, not a cleanup: the key pair, the security group, and
the local Terraform state remain until `webappMeasureDestroy` runs (or
the next run's reconcile step removes them).

## Sensitive files

The VM's private key lives only in the local Terraform state. The
state (`perf/terraform.tfstate`), its backup
(`terraform.tfstate.backup`), any saved plan, and the temporary key
files are sensitive: keep them out of commits, logs, and uploaded
evidence. Being gitignored is not what protects them. `run.mjs` never
prints key or state content, writes the key only to a mode-0600 file
in a fresh temporary directory that it deletes afterwards, never
touches your SSH configuration directory or its `known_hosts`, and
deletes the state backup after every successful destroy. The report
directory holds none of them.
