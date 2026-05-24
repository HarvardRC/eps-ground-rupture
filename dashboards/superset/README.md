# Apache Superset

Superset itself runs as a separate service (Docker compose is the easiest
path locally). Dashboards connect to the same SQL engines as Tableau:

- **Production**: AWS Athena. Superset connector:
  `awsathena+rest://...@athena.<region>.amazonaws.com/<database>`.
- **Development**: Spark Thrift Server. Superset connector:
  `hive://<user>@localhost:10000/<database>` (the `hive` dialect speaks
  HiveServer2/Spark Thrift protocol).

This directory holds the **exported definitions** — datasets, charts, and
dashboards — so they can be version-controlled and re-imported.

## Workflow

1. Build tidy datasets: `cd subprojects/python && poetry run egr-build`.
2. Register tables in your query engine using the generated DDL:
   - Dev: `beeline -u jdbc:hive2://localhost:10000 -f dashboards/sql/spark-thrift.sql`
   - Prod: paste `dashboards/sql/athena.sql` into the Athena console (or use
     `boto3` / a Glue Crawler).
3. Build dashboards in the Superset UI against the registered database.
4. Export and commit the YAML here:

   ```bash
   superset export-dashboards -f dashboards/superset/export.zip
   unzip -o dashboards/superset/export.zip -d dashboards/superset/
   rm dashboards/superset/export.zip
   ```

## Layout (once populated)

```
databases/    *.yaml — database connection definitions (no secrets!)
datasets/     *.yaml — table/virtual dataset definitions
charts/       *.yaml
dashboards/   *.yaml
```

Never commit credentials. Database YAMLs reference a `SQLALCHEMY_URI` that
should be expanded from an environment variable at import time.
