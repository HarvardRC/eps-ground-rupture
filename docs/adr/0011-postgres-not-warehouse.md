# ADR-0011: PostgreSQL not used as warehouse layer

- **Status**: Accepted
- **Date**: 2026-05-24
- **Deciders**: Claude (proposed); Michael Bouzinier (accepted)

## Context

The project owner has PostgreSQL installed and prefers it over MariaDB.
Postgres was a natural candidate for the development query engine. We
considered loading Parquet into native Postgres tables, or exposing
Parquet via the `parquet_fdw` foreign data wrapper.

The problem: production uses a column-store, Trino-family engine
(ADR-0003). Postgres is a row-store transactional engine. Even with
`parquet_fdw`, query plans, predicate pushdown, vectorized scans, and SQL
semantics diverge significantly. Dev queries would pass against Postgres
and then behave differently against Athena.

## Decision

PostgreSQL is **not** used as the warehouse layer for analytical SQL over
Parquet. It remains available — and useful — for unrelated needs:
Superset's own metadata store, pipeline state tracking, or any other
relational/transactional workload that may appear.

## Alternatives considered

- **Postgres with `parquet_fdw`** — engine-class mismatch with prod
  (column-store Trino).
- **Postgres as primary warehouse, both dev and prod** — abandons the
  serverless Athena story; requires running Postgres in production with
  enough headroom for analytic queries; loses the Parquet-on-S3 model.
- **Postgres in dev, Athena in prod** (mixed) — the worst of both:
  developers debug against the wrong engine.

## Consequences

- Dev and prod engines are both Trino-family (Spark SQL ≈ Athena Trino),
  so query plans align and SQL ports cleanly.
- Postgres expertise on the team is not wasted — it just lives at a
  different layer (Superset metadata, etc.).
- If someone later wants Postgres tables of the warehouse data (e.g. for
  a downstream app), they can populate them from the Parquet — but those
  are derived assets, not the source of truth.

## References

- ADR-0003 — Athena (production)
- ADR-0004 — Spark Thrift (development)
