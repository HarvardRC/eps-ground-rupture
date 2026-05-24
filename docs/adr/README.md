# Architecture Decision Records

Each ADR captures one architecturally significant decision: what we chose,
what we rejected, and why. ADRs are immutable — superseded ones get a
`Superseded by ADR-NNNN` note in the status line and a new ADR takes their
place.

Format: lightweight MADR (Context → Decision → Alternatives → Consequences).

## Index

| #    | Title                                                         | Status   |
|------|---------------------------------------------------------------|----------|
| [0001](0001-bi-platforms-tableau-and-superset.md) | BI platforms — Tableau and Apache Superset | Accepted |
| [0002](0002-no-notebooks-no-python-ui.md)         | No notebooks, no Python UI — modules + CLI only | Accepted |
| [0003](0003-production-query-engine-athena.md)    | Production query engine — AWS Athena over S3 Parquet | Accepted |
| [0004](0004-development-query-engine-spark-thrift.md) | Development query engine — Spark Thrift Server | Accepted |
| [0005](0005-embedded-sql-engine-duckdb.md)        | Embedded SQL engine — DuckDB                | Accepted |
| [0006](0006-parquet-only-dir-per-table.md)        | Output format — Parquet only, dir-per-table | Proposed |
| [0007](0007-ddl-generation-in-python.md)          | DDL generation strategy — Python-emitted scripts | Proposed |
| [0008](0008-python-toolchain-poetry.md)           | Python toolchain — Poetry                   | Accepted |
| [0009](0009-repository-layout-src-python.md)      | Repository layout — `src/python/` under language-agnostic `src/` | Superseded by [0013](0013-gradle-multi-project-subprojects-layout.md) |
| [0010](0010-python-version-range.md)              | Python version range — `>=3.11,<3.14`       | Proposed |
| [0011](0011-postgres-not-warehouse.md)            | PostgreSQL not used as warehouse layer      | Accepted |
| [0012](0012-plotting-libs-dev-only.md)            | Plotting libraries as dev-only optional deps | Accepted |
| [0013](0013-gradle-multi-project-subprojects-layout.md) | Gradle multi-project layout, code modules under `subprojects/` | Accepted |

## Adding a new ADR

1. Pick the next number.
2. Filename: `NNNN-short-kebab-title.md`.
3. Copy the structure of an existing ADR (or use MADR's template).
4. Add a row to this index.
5. If the new decision supersedes an older one, update the older ADR's
   status to `Superseded by ADR-NNNN`.
