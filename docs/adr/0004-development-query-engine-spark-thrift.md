# ADR-0004: Development query engine — Spark Thrift Server

- **Status**: Accepted
- **Date**: 2026-05-24
- **Deciders**: Michael Bouzinier (project owner)

## Context

Local development needs a SQL engine that can read the same Parquet files
we ship to production (ADR-0003) and that the dashboards can connect to
via JDBC. The project owner already runs Spark Thrift Server for other
projects on the same machine.

## Decision

Use **Apache Spark Thrift Server** as the development query engine. It
exposes Spark SQL over HiveServer2 protocol on `jdbc:hive2://localhost:10000`.
Tables are registered with `CREATE TABLE ... USING parquet LOCATION
'file:///...'`; Spark infers schema from the Parquet footer.

## Alternatives considered

- **PostgreSQL** with `parquet_fdw` — wrong engine class for prod parity
  (see ADR-0011).
- **Trino self-hosted in dev** — closer to prod dialect, but more infra to
  run locally than what the user already has.
- **Athena from dev machine** — works, but per-query latency and cost,
  requires AWS credentials, and is online-only.
- **DuckDB-only in dev** — chosen for embedded use (ADR-0005) but doesn't
  cover the BI-tool-via-JDBC path.

## Consequences

- Dev and prod query engines are both Trino-family (Spark SQL is close
  enough); most SQL ports unchanged.
- Reuses existing infrastructure on the developer machine — zero new ops.
- Tableau Desktop connects via the Spark SQL connector; Superset connects
  via the `hive://` dialect.
- Generated `spark-thrift.sql` embeds absolute `file://` paths — it is
  machine-specific and gitignored. Regenerate per machine with
  `poetry run egr-build`.

## References

- Dev DDL: `dashboards/sql/spark-thrift.sql` (generated, gitignored)
- `eps_ground_rapture.register.spark_ddl`
