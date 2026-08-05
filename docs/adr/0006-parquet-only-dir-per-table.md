# ADR-0006: Output format — Parquet only, dir-per-table layout

- **Status**: Proposed — Parquet-only is accepted (covered implicitly by ADR-0003 and ADR-0004); the **dir-per-table layout** was Claude's call and has not been explicitly ratified.
- **Date**: 2026-05-24
- **Deciders**: Claude (proposed); Michael Bouzinier (Parquet-only)

## Context

The initial scaffold emitted both CSV and Parquet on the assumption that
Tableau would consume CSV directly. With the SQL-engine-first strategy
(ADR-0003, ADR-0004), Tableau and Superset both query via JDBC against
Athena or Spark Thrift — they never touch the raw files. CSV is dead
weight in that flow: ~7× larger on disk than Parquet, lossy on types, and
not what the engines want.

## Decision

Pipeline emits **Parquet only**, written as
`data/processed/<table>/data.parquet`. The directory — not the file — is
the logical table location referenced by all DDL. Both Athena and Spark
treat a directory of Parquet files as a single table.

## Alternatives considered

- **CSV + Parquet** (previous state) — dual maintenance, no consumer for
  CSV.
- **Single Parquet file at `data/processed/<table>.parquet`** — breaks
  Athena's directory-as-table convention; would need rework before adding
  partitioning.
- **Iceberg or Delta Lake table formats** — strong metadata story
  (versioning, schema evolution, time travel), but over-engineered at
  current scale and requires a runtime that understands the manifest
  (Spark or Trino-with-connector). Defer until justified.

## Consequences

- ~7× smaller on disk than CSV (10.6 MB vs 73 MB for the DEM table).
- Future partitioning (e.g. by `Set`, `Fault_Dip`) is a non-breaking
  addition: write `data/processed/dem/Set=Homogeneous/...` and both engines
  pick it up.
- Anyone needing CSV produces it ad-hoc:
  `duckdb -c "COPY (SELECT * FROM 'data/processed/dem') TO 'dem.csv' (FORMAT csv, HEADER)"`.
- Mixed `object` + `NaN` columns must be coerced to nullable `string`
  before Parquet write (implemented in `export._coerce_object_columns`).

## References

- `eps_ground_rapture.export.export_tidy`
- ADR-0003, ADR-0004 — the consumers
