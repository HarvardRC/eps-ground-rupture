# Acceptance try-outs for the Ground Rupture Explorer

Three try-outs a person runs on the deployed explorer before the
v0.4.0 release. They follow the first three user stories of the
requirements ([PRD §4](../app/prd.md#us-1-dam-foundation-scenario))
and give the evidence for the first success criterion
([PDD §10.1](../app/pdd.md#101-success-criteria)): a practicing
engineer new to the product completes the dam-foundation story end
to end, without assistance or documentation.

Written 2026-11-09 at the owner's request. The owner finds the
tester and observes.

## When to run

- After the site is deployed with the version to be released, or
  one close to it. A tester is new to the product only once.
- On the live site, in the tester's own browser.
- One task at a time, in order. Task 3 would give away Task 1.

## Part 1 — what the tester receives

Send the text below and nothing else about the explorer. Give each
task only when the one before it is finished.

> Thank you for helping test a research website. We are testing the
> site, not you. If something is confusing, that is exactly what we
> need to learn. Please say out loud what you are looking for and
> what you expect as you go. I will watch but will not help.
>
> Start here: https://harvardrc.github.io/eps-ground-rupture/

### Task 1 — dam foundation

> An engineer is evaluating a dam whose foundation crosses a thrust
> or reverse fault. Site investigation suggests a fault dip of
> approximately 30–40°, strong sediment conditions, and a possible
> vertical surface offset of up to 3 m.
>
> The engineer needs to define those conditions as a scenario,
> including both uniform and layered strong-sediment cases. The
> engineer has an anticipated surface offset rather than fault slip
> at depth.
>
> Nothing else about the site is known.
>
> Use the site to find what the simulations show for this
> situation, and save the results for a design report.

### Task 2 — pipeline crossing

> An engineer is designing a pipeline crossing where the pipeline
> cannot avoid a thrust or reverse fault. The site has relatively
> loose, shallow sediment and a steeply dipping fault.
>
> The engineer needs to understand the plausible width of the main
> disturbed ground zone in order to determine the length of
> pipeline that may require special crossing design.
>
> Use the site to find that width.

### Task 3 — design review

> You are reviewing a consultant's report. It describes the same
> situation as Task 1 and states an "expected" scarp height of
> 2.5 m.
>
> Use the site to decide how 2.5 m compares with the simulation
> results: typical, on the high side, or outside what the
> simulations show?

The situation and need paragraphs of Tasks 1 and 2 are the user
stories' own words. Task 3 gives the story's "stated scenario" a
concrete form: the Task 1 scenario and a reported value.

## Part 2 — what the observer checks

Do not answer questions during Task 1: it is the formal criterion.
Note where the tester hesitates. In Tasks 2 and 3 a hint is
allowed if the tester is stuck; record that it was given.

### Task 1 passes if the tester, unaided

- finds the explorer from the site's home page;
- selects fault dips 30° and 40°, strong sediment in both its
  uniform and layered forms, and enters 3 m as a surface offset,
  not as fault slip;
- sees the offset converted to a slip range for each dip, with a
  warning that 30° goes beyond the modelled range;
- reaches the results and can point to the number of matching
  simulations, and the median and 84th percentile of scarp height,
  deformation zone width, and scarp dip;
- downloads the ZIP.

Keep the tester's ZIP. Its `scenario.json` records the scenario
they built, and is the evidence that it was the intended one.

### Task 2 passes if the tester

- selects steep fault dips (60° and 70°), the shallowest sediment
  depth (3 m), and loose sediment, leaving the other conditions
  open;
- finds deformation zone width and can read its sample size,
  median, 84th percentile, and range;
- notices the statement that the width covers the main modelled
  rupture zone, not every separate deformation strand.

The settings are the planning session's reading of "steep",
"shallow", and "loose". A different but defensible reading passes;
record what the tester chose.

### Task 3 passes if the tester

- rebuilds the Task 1 scenario;
- concludes that 2.5 m is on the high side, near the 84th
  percentile. With the data of 2026-11-09 the scarp-height median
  is about 1.6 m and the 84th percentile about 2.6 m; re-read both
  against the release data before the try-out.

### Record for every task

- the date, the site version shown on the page, and the browser;
- whether the task passed, and any hint given;
- where the tester got stuck;
- any word they did not understand;
- anything they expected and did not find;
- how long the task took.
