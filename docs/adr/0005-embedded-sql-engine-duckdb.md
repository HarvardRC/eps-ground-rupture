# ADR-0005: Embedded SQL engine — DuckDB

- **Status**: Accepted
- **Date**: 2026-05-24
- **Deciders**: Claude (proposed); Michael Bouzinier (accepted)

## Context

We need to read Parquet output back from inside Python — for tests, ad-hoc
CLI inspection, and CI — without standing up Spark Thrift or hitting AWS.
The pipeline-side `pyarrow` can read Parquet, but it has no SQL surface.

## Decision

Add **DuckDB** as a runtime dependency. DuckDB is an embedded column-store
that reads Parquet natively from filesystem and from S3 (via `httpfs`), and
both Tableau and Superset have DuckDB connectors as a third optional path.

## Alternatives considered

- **pyarrow.compute / pyarrow.dataset** — lower-level; no SQL.
- **In-process Spark via PySpark** — heavyweight; pulls JVM into the pipeline.
- **No embedded engine** — would force tests to either skip SQL coverage
  or require a running Spark Thrift Server in CI.

## Consequences

- Zero-server, zero-config in CI and offline development.
- Small wheel; negligible dependency footprint.
- Provides an emergency third query path if Athena or Spark Thrift are
  unavailable for some reason.
- Not currently exercised by `egr-build` itself — only by tests and by
  hand. That's fine; the value is the option, not the usage.

## References

- `pyproject.toml` — `duckdb = "^1.1"` in base dependencies
- DuckDB docs: https://duckdb.org/docs/data/parquet
