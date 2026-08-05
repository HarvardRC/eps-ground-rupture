# Dead ends — how the architecture actually happened

- **Status**: Retrospective (not an ADR; nothing here is a live decision)
- **Date**: 2026-08-05, covering decisions from 2026-05-23 onward
- **Author**: Michael Bouzinier, with Claude

The first fourteen ADRs (0001–0014, written 2026-05-23…06-11) described a
coherent architecture that mostly did not survive contact with the
project's real publication channel. Rather than leave fourteen files where
eleven are obsolete, the decisions that still hold were rewritten as the
active set ([README](README.md)), and the rest were condensed into this
story. The original files are preserved in git history (last intact at
commit `4855af1`, 2026-06-11). The [scorecard](#scorecard) at the bottom
maps every old number to its fate.

## The plan as designed (May 23–24)

The starting point was two Jupyter notebooks and a paper. The design that
came out of the initial scoping was **SQL-engine-first**: dashboards would
be thin clients querying engines, never touching files.

- **Two BI platforms** (old ADR-0001): Tableau for polish, Apache
  Superset for open-source self-hosting. Both first-class.
- **A three-tier engine stack**: AWS Athena over S3 Parquet in production
  (0003); Spark Thrift Server over local Parquet in development (0004) —
  chosen partly because it already ran on the development machine; DuckDB
  embedded in Python for tests and ad-hoc checks (0005), explicitly "the
  value is the option, not the usage."
- **Parquet only** (0006): the scaffold's CSV outputs were deleted as
  dead weight — ~7× larger, lossy on types, "no consumer in that flow."
- **Pipeline-generated DDL** (0007): a `register` module emitting
  `athena.sql` and `spark-thrift.sql` from the pyarrow schemas, so table
  definitions could never drift from the data.
- **PostgreSQL explicitly benched** (0011): a row-store in dev would
  diverge from the column-store Trino family in prod; engine parity was
  the argument that mattered.

Within the premise — dashboards connect via JDBC — every one of these was
defensible, and the reasoning still reads well. The premise is what broke.

## The premise breaks (June)

The dashboards' actual audience turned out to be **readers of a public
paper**: no logins, no licenses, no lab infrastructure. That pointed at
Tableau **Public** — the free tier — rather than Tableau Cloud or Server
(see active [ADR-0005](0005-tableau-public-as-the-publication-channel.md)
for that decision in its own right).

Tableau Public cannot hold a live connection to anything. It accepts
extracts of local files, plus Google Sheets. No JDBC, no DuckDB connector,
no Athena. In one stroke, everything below the dashboards in the original
architecture became unreachable from the one surface that ships:

- **Spark Thrift** (0004) was a development mirror of a production path
  that no longer led anywhere. Retired outright; `spark-thrift.sql` is
  still emitted but nothing consumes it.
- **Generated DDL** (0007) lost both consumers. The `register` module
  remains in the tree, working, for the parked AWS lane below.
- **The Postgres exclusion** (0011) became moot — there is no warehouse
  layer left to exclude it from. (Engine-parity reasoning was correct;
  it just no longer has an application.)
- **Parquet-only** (0006) was half-undone in the most ironic way
  available: on 2026-06-24, three weeks after CSV was deleted as "dead
  weight," the first Tableau Public publish shipped alongside a new
  `egr-csv` command — CSV reborn as the *publication* format. Parquet
  survives as the internal tidy layer (`data/processed/<table>/`), which
  the views read. See active
  [ADR-0006](0006-csv-extracts-for-tableau-public.md).
- **DuckDB** (0005) is the inversion that worked in our favor: the
  "emergency third path" became the analytical core. Every derived
  number now flows through its SQL views, pinned by tests, exported to
  CSV. See active [ADR-0003](0003-duckdb-as-the-analytical-engine.md).

## The AWS lane: a second act, then parked

The Athena decision (0003) did not die quietly at the pivot — it briefly
shipped. On 2026-06-11 a full Terraform deployment was built (0014): S3 +
Glue + Athena per env, a committed `tables.json` schema lockfile, and a
genuinely clever fix for Athena's identifier rules (sanitized column names
mapped to the Parquet by ordinal position, original names preserved in
column comments). The two June desktop workbooks
(`dem-model-vs-reality.twb`, `dem-response-curve.twb`) still carry Athena
connections from that period — the lane's only consumers ever — though
they run off local `.hyper` extracts and keep working if the AWS side
lapses.

Parked 2026-07-25, not deleted: `deploy/terraform/`, `register.py`, the
Athena view twins in `views.py`, and `dashboards/sql/` all remain, and
`TODO.md` records the revival conditions (a shared live SQL endpoint,
collaborators querying without cloning, or data outgrowing file handoffs).
Until one materializes, an unapplied Terraform module costs nothing.

## Superset: the platform that never was

Half of old ADR-0001. Superset never grew past a README of connection
strings — no dashboard was ever exported to `dashboards/superset/`. Every
dashboard built for two platforms costs roughly double; nobody asked for
the second platform; and the free-sharing requirement that actually
mattered was met by Tableau Public. Retired. (A local Superset over DuckDB
remains *possible* — the README survives as a pointer — but it is nobody's
plan.)

## The Google Sheets almost

A dead end with no ADR of its own, built 2026-06-19: `egr-push-sheets`
pushes any DuckDB view into a Google Sheet as an idempotent full replace —
because Google Sheets is the **only** data source Tableau Public can
refresh from on a schedule. It was rejected because **it did not survive
contact with the data**. A Google spreadsheet caps at 10,000,000 cells,
and the project's central table blows through it: the full `dem` view
(~346,834 rows × 26 cols ≈ 9.0M cells) trips the tool's own 9M-cell
guard (`CELL_LIMIT` in `sheets.py`, headroom included) — so the one table
every dashboard draws over could never ride the Sheets lane at all. The
lane's own README prescribed a "Drive-CSV fallback" for `dem` — publish a
CSV to Google Drive and point Tableau at the file — at which point the
construction is just the CSV path with a Google account in the middle.
Even the views that did fit needed 50k-row chunked writes under a byte
budget with rate-limit retries, and only `unified_observations` (≈3.3M
cells) was ever configured in `targets.yaml`. When `egr-csv` shipped with
the first publish on 06-24, plain local CSV replaced the whole apparatus.
(The secondary objections — Google identity and service-key custody in
the pipeline, shipped data no longer local and diffable — were real, but
moot once the data didn't fit.) The lane remains in the tree, dormant and
viable only for sub-cap views, should scheduled refresh of a small table
ever matter.

## A pre-pivot flip-flop, for the record

The repository layout managed to be superseded within 24 hours, before any
pivot: `src/python/` under a language-agnostic `src/` (0009, May 23) fell
to the Gradle multi-project layout with modules under `subprojects/`
(0013, May 24) — the root needed an owner for project-level files, and the
`src/java/` symmetry was speculative future-proofing. That was the one
orthodox supersession the old set ever recorded. The surviving layout is
now active [ADR-0001](0001-gradle-multi-project-build.md).

## Scorecard

| Old ADR | Was | Fate |
|---------|-----|------|
| 0001 | Tableau **and** Superset | Split — Tableau lives ([0004](0004-tableau-as-the-dashboard-platform.md)); Superset retired (above) |
| 0002 | No notebooks, no Python UI | Survived → [0002](0002-python-pipeline-shape-and-toolchain.md) |
| 0003 | Athena in production | Parked (AWS lane, above) |
| 0004 | Spark Thrift in development | Retired (premise, above) |
| 0005 | DuckDB as embedded utility | Transformed → [0003](0003-duckdb-as-the-analytical-engine.md) |
| 0006 | Parquet only, dir-per-table | Halved — Parquet internal ([0003](0003-duckdb-as-the-analytical-engine.md)); CSV returned ([0006](0006-csv-extracts-for-tableau-public.md)) |
| 0007 | Pipeline-generated DDL | Parked with the AWS lane |
| 0008 | Poetry | Survived → [0002](0002-python-pipeline-shape-and-toolchain.md) |
| 0009 | `src/python/` layout | Superseded pre-pivot (flip-flop, above) |
| 0010 | Python `>=3.11,<3.14` | Survived → [0002](0002-python-pipeline-shape-and-toolchain.md) |
| 0011 | Postgres not the warehouse | Moot — no warehouse layer exists |
| 0012 | Plotting libs dev-only | Survived → [0002](0002-python-pipeline-shape-and-toolchain.md) |
| 0013 | Gradle `subprojects/` layout | Survived → [0001](0001-gradle-multi-project-build.md) |
| 0014 | Terraform AWS data layer | Parked (AWS lane, above) |

## The moral

The publication channel — who sees the dashboards, and what it costs them
to look — turned out to be the **root** decision, from which platform,
data format and engine all follow. We designed the engine room first and
picked the harbor last; the harbor then dictated a different engine room.
The active set is now ordered accordingly. And: **parked is not deleted** —
working code for the losing branches stays in the tree with its revival
conditions written down, while the decisions themselves get one honest
obituary instead of fourteen quiet ones.
