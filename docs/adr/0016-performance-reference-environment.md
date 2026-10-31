# ADR-0016: Performance reference environment — an on-demand AWS VM defined by Terraform

- **Status**: Proposed
- **Date**: 2026-10-30 (drafted with the DDD correction pass; the
  owner chose the AWS VM, its lifecycle, and the 95th-percentile
  judging rule the same day; clarified the same day after an external
  review of this ADR)
- **Deciders**: Michael Bouzinier (project owner)

## Context

[PDD §9.1 — Performance budgets](../app/pdd.md#91-performance-budgets-d-9-proposed)
sets the scenario page's time budgets (first meaningful render ≤ 2.0 s
cold, ≤ 1.0 s warm, scenario change ≤ 200 ms) under stated reference
conditions, and
[HLDD §2 — Performance budgets](../app/hldd.md#performance-budgets)
requires measurements to establish compliance under them, and
[HLDD §7.1](../app/hldd.md#71-performance-estimates-and-verification)
leaves the procedure to the DDD. Until
2026-10-30 the reference was "a mid-range laptop (2020 or later)": a
device class, not a device. No such laptop is part of the project, the
owner's workstation (a 2019 Xeon desktop) is not of that class, and a
personal laptop ages and cannot be reproduced by anyone else, so a
budget result could not be repeated or audited.

A local virtual machine does not solve this: a VM limits core count
and memory, not per-core speed, and the application's work is almost
entirely single-threaded (decompression, a typed-array scan of 346,834
records, sorting, SVG construction), so a VM on the workstation
measures the workstation. Throttling the workstation's CPU through the
browser cannot be calibrated without a reference machine either.

NFR-8 ([PRD](../app/prd.md#nfr-8-architecture-decision-record)) and
[ADR-0011](0011-webapp-toolchain.md) require any new toolchain to be
recorded in an ADR; the environment below adds Terraform and AWS to
the measurement lane.

The repository already holds a parked Terraform configuration,
`deploy/terraform/` (an S3, Glue, and Athena data layer; see
[Dead ends](dead-ends.md)). It is unrelated to this decision and stays
parked.

## Decision

The performance measurements of the DDD
([§7.6](../app/ddd.md#76-performance-and-compatibility-measurements))
run on **an AWS EC2 virtual machine of fixed specification, defined by
a Terraform configuration in the repository and created for
measurement runs**. PDD §9.1 and HLDD §2 (Performance budgets) were
amended on 2026-10-30 to name this "fixed reference environment
standing in for a mid-range laptop (2020 or later)", and to judge each
time budget at the 95th percentile of 30 measured runs.

**What the environment is, and is not.** It is the project's agreed
acceptance baseline: a configuration anyone with the AWS account can
recreate from the repository, so measurements taken in it are
comparable from release to release. It has not been calibrated against
laptops of the class it stands in for, and its timings do not predict
performance on any particular reader's machine. Recreating the
configuration does not make timings identical: measurements still vary
from run to run, which is why each budget is judged over 30 runs.

**The judging rule.** "The 95th percentile of 30 measured runs" is the
nearest-rank percentile — the 29th of the 30 ascending samples — so a
budget passes when at least 29 of the 30 observed runs are within it,
which is HLDD §2's "at least 95% of measured interactions". It is a
sample-based acceptance rule: it says the observed runs met the budget,
not that 95% of all future runs will, and it does not presume that an
isolated slow run is measurement noise.

- **Separate root.** The configuration lives in
  `subprojects/webapp/perf/`, with its own local state and its own
  Gradle tasks. It shares no module, state, backend, provider
  configuration, or task with `deploy/terraform/`, which it never
  references.
- **Fixed specification.** An instance type without CPU burst
  credits in one region, a pinned operating-system image, and the
  browser and Node.js versions the webapp already pins; the exact
  values are the DDD's. A type without burst credits makes runs more
  repeatable; it does not guarantee identical processor time. Every
  report records the environment, and only runs in this environment
  count as evidence for the budgets.
- **Lifecycle: create if absent, run, destroy on completion.** One
  owner-invoked task creates the VM if it does not exist (or reuses
  one kept from a failed attempt), uploads the locally built site, runs
  the measurement suite, downloads the report, and destroys the VM
  when the measurement run completed and its report was downloaded —
  whether the report records a budget pass or a budget miss. An
  infrastructure, execution, or report-retrieval failure keeps the VM
  for investigation. Whether the budgets are met is a separate release
  decision, taken on the report.
- **Best-effort runtime safeguard, not a cleanup.** The instance
  schedules its own shutdown 24 hours after boot, with its shutdown
  behavior configured explicitly to terminate (EC2's default for an
  EBS-backed instance is to stop) and its root volume configured to
  delete on termination. That bounds a forgotten instance's running
  time on a best-effort basis; it does not remove the security group,
  the key pair, or the Terraform state, which remain until the destroy
  task runs, and the DDD documents how a leftover run is discovered and
  cleaned up.
- **Credentials.** Terraform generates the SSH key pair. No persistent
  SSH credential is intentionally stored outside the Terraform-managed
  state; each connection writes the private key to a temporary file
  with owner-only permissions and removes it afterwards. The local
  state, its backups, any saved plan, and the temporary key files are
  sensitive: they are kept out of commits, logs, and uploaded evidence
  by handling and permissions, not merely by being gitignored. AWS
  access comes from a named local AWS profile.
- **Network conditions are emulated.** The browser applies a fixed
  10 Mbps throughput (PDD §9.1) and a fixed 40 ms latency. The 40 ms is
  the project's choice, taken from the round-trip time of the Chrome
  DevTools/Lighthouse desktop "broadband" profile, whose own
  request-latency and throughput-emulation fields are zero; passing
  these two values to the browser's network emulation does not
  reproduce that whole profile. The VM may sit close to the content
  delivery network, so a measured round trip could flatter the result;
  fixed emulation standardizes the condition, though it does not remove
  all real network variation.
- **Outside CI.** No workflow runs it. The functional browser lane of
  [ADR-0015](0015-golden-scenario-parity.md) (amendment 2) stays
  locally invoked and is unchanged; the measurement suite is HLDD
  §7.1's feasibility measurement, not part of that lane.

New toolchain: the Terraform CLI, constrained to `~> 1.7` (the version
actually used is recorded with every measurement), and the
`hashicorp/aws` and `hashicorp/tls` providers, whose exact versions the
committed dependency lock file pins — the lock file pins providers, not
the CLI. The pinned image fixes the base system; what the instance
installs at boot (Node.js at its pinned version, a virtual display, the
browser's system dependencies) is pinned only as far as each installer
allows. The reproducibility boundary is the recorded configuration, not
every byte of the system.

## Alternatives considered

- **A named physical laptop.** Closest to the old wording and to real
  readers (consumer CPU, GPU rasterization), but irreproducible by
  anyone without that laptop, and it ages between releases. Rejected.
- **A local VMware VM on the workstation.** Free and isolated, but it
  runs at the host's per-core speed and cannot be recreated elsewhere.
  Kept as a diagnostic option only; its runs are not evidence.
- **CPU throttling on the workstation.** The slowdown factor cannot be
  calibrated without a reference device. Rejected.
- **CI runners.** Hosted-runner hardware changes without notice and
  is shared, and ADR-0015 keeps browser checks out of CI. Rejected.
- **A hosted browser-testing service.** Adds an account, a recurring
  cost, and a configuration outside the repository. Rejected.

## Consequences

- The environment's configuration can be recreated from the
  repository by anyone with the AWS account, so measurements are
  comparable across releases; timings still vary between runs.
- Each release measurement incurs a small, per-second EC2 charge; this
  ADR does not model costs. A forgotten instance's running time is
  bounded on a best-effort basis by the 24-hour shutdown; the remaining
  resources (security group, key pair, state) cost nothing while idle
  and are removed by the destroy task.
- The owner needs an AWS profile allowed to create, describe, and
  delete EC2 instances, key pairs, and security groups in the chosen
  region, and to read the public SSM parameter that names the pinned
  operating-system image (`ssm:GetParameter`).
- The private SSH key sits unencrypted in the local Terraform state
  until the next destroy, and briefly in a temporary file during each
  connection; it grants access only to a VM that holds public data.
- The VM has no GPU, so the browser rasterizes in software. That is a
  limitation of the reference environment, not a proven safety margin:
  the measurements establish what the environment does.
- Cloud CPUs vary between runs; the 29-of-30 rule tolerates one slow
  run among the 30 observed, and two slow runs fail the budget.

## References

- [PDD §9.1 — Performance budgets](../app/pdd.md#91-performance-budgets-d-9-proposed)
  (amended 2026-10-30).
- [HLDD §2 — Performance budgets](../app/hldd.md#performance-budgets)
  (amended 2026-10-30) and
  [§7.1 — Performance estimates and verification](../app/hldd.md#71-performance-estimates-and-verification).
- [DDD §7.6 — Performance and compatibility measurements](../app/ddd.md#76-performance-and-compatibility-measurements)
  and [§2 — Repository structure, naming, and toolchain](../app/ddd.md#2-repository-structure-naming-and-toolchain).
- [ADR-0011](0011-webapp-toolchain.md);
  [ADR-0015](0015-golden-scenario-parity.md); [Dead ends](dead-ends.md).
- Chrome DevTools Lantern throttling constants, profile
  `desktopDense4G` (`rttMs: 40`, `throughputKbps: 10 * 1024`;
  request-latency and throughput-emulation fields 0):
  ChromeDevTools/devtools-frontend,
  `front_end/models/trace/lantern/simulation/Constants.ts`.
- Amazon EC2 documentation: instance-initiated shutdown behavior
  (stop by default for EBS-backed instances; terminate when set).
- HashiCorp Terraform documentation: state and saved plans may contain
  sensitive data; the dependency lock file records provider
  selections only.
