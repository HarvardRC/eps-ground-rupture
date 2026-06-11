# Tableau workbooks

Workbooks connect to the Parquet tables via SQL — **not** by importing
CSV/Parquet files into Tableau. The SQL engine depends on the environment:

- **First-pass dev**: DuckDB. The `egr-build` pipeline writes
  `../duckdb/eps.duckdb`, a tiny views-only file projecting the Parquet
  outputs. Tableau connects via the DuckDB JDBC driver. See
  `../duckdb/README.md` for the one-time driver install and the JDBC URL.
- **Production**: AWS Athena (Parquet on S3, Glue catalog). The Glue
  tables and Athena workgroup are provisioned by Terraform — run
  `terraform apply` in `deploy/terraform/envs/<env>` and sync the Parquet
  to S3; `../../deploy/terraform/README.md` has the exact Tableau
  connection parameters (server, staging directory, workgroup, database,
  access-key requirement). `../sql/athena.sql` is generated reference DDL,
  not the deployment path.
- **Production-fidelity dev** (optional, later): Apache Spark Thrift
  Server. Apply `../sql/spark-thrift.sql` and connect Tableau Desktop via
  the Spark SQL connector. See ADR-0004.

Run `poetry run egr-build` (or `./gradlew :subprojects:python:egrBuild`)
to regenerate the Parquet outputs, the SQL DDL files, and the DuckDB
views file in one go.

Check in `.twb` (XML, diffable) when feasible; use `.twbx` (packaged) only
when bundling extracts that downstream users need.

## Workbooks (planned)

- `dem-overview.twb` — DZW vs Scarp Height scatter against the
  `unified_observations` view: 2D DEM cloud + FDHI/SURE/Kern reference
  overlays, with `source`, `Scarp_Class`, `Fault_Dip`, and `eq_name`
  filters.
- `homogeneous-vs-heterogeneous.twb` — material-property comparisons
  driven by `dem.Set` and `dem.Cohesion`.
- `distributions.twb` — DZW / scarp-height / slip histograms and
  boxplots faceted by `Scarp_Class`.
