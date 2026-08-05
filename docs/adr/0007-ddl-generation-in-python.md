# ADR-0007: DDL generation strategy — Python-emitted scripts

- **Status**: Proposed — implemented by Claude; not explicitly ratified by the project owner.
- **Date**: 2026-05-24
- **Deciders**: Claude (proposed)

## Context

Tables must be registered against two engines: Athena (which requires
explicit column lists — it does not infer Parquet schema at DDL time) and
Spark Thrift (which infers schema from the Parquet footer when using
`USING parquet`). The schemas must stay consistent with whatever the
pipeline actually writes — otherwise queries fail mysteriously or silently
return wrong types.

## Decision

A Python module (`eps_ground_rapture.register`) reads each Parquet file's
schema with pyarrow, maps Arrow types to Athena/Hive types, and emits two
SQL scripts as a side effect of every `egr-build` run:

- `dashboards/sql/athena.sql` — `CREATE EXTERNAL TABLE` with explicit
  column lists and `s3://` locations.
- `dashboards/sql/spark-thrift.sql` — `CREATE TABLE ... USING parquet
  LOCATION 'file:///...'`.

## Alternatives considered

- **AWS Glue Crawler** — production-only, asynchronous, no dev equivalent;
  would diverge dev from prod.
- **Hand-maintained SQL files** — drifts from the actual Parquet schema as
  soon as anyone adds a column.
- **Terraform with `aws_glue_catalog_table`** — heavy for current scope;
  duplicates the column-list problem at IaC level.
- **Iceberg / Delta tables** — schema lives in table metadata, no DDL
  needed; deferred (ADR-0006).

## Consequences

- DDL is always consistent with the Parquet it describes — single source
  of truth.
- Adding a new table is a one-line change in `cli.py`, not a separate
  Glue/Terraform change.
- Generated SQL is gitignored — regenerable, and the Spark Thrift script
  contains machine-specific absolute paths.
- Applying the DDL in AWS remains a manual step (paste into Athena
  console, or wire `boto3` later). Acceptable at current frequency.

## References

- `eps_ground_rapture.register` module
- ADR-0003, ADR-0004 — the target engines
