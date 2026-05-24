# Tableau workbooks

Workbooks connect to Parquet tables via SQL — **not** to CSV files. The
SQL engine is:

- **Production**: AWS Athena (Parquet on S3, Glue catalog). Tableau Cloud
  has a native Athena connector.
- **Development**: Apache Spark Thrift Server reading local Parquet.
  Tableau Desktop has a Spark SQL connector (JDBC port `10000` by default).

Run `poetry run egr-build` to (re-)generate the DDL under
`../sql/{athena,spark-thrift}.sql`, then execute the appropriate script in
your environment before opening a workbook.

Check in `.twb` (XML, diffable) when feasible; use `.twbx` (packaged) only
when bundling extracts.

## Workbooks (planned)

- `dem-overview.twb` — DZW vs scarp height, faceted by scarp class / fault dip
- `dem-vs-fdhi.twb` — DEM model results overlaid with historic earthquakes
  (Wenchuan, Kashmir, Kern County)
- `homogeneous-vs-heterogeneous.twb` — material-property comparisons
