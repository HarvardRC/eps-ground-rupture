# Apache Superset

Superset itself runs as a separate service (Docker compose is the easiest
path locally). Dashboards connect to the same SQL engines as Tableau:

- **Production**: AWS Athena. Superset connector (full form — the
  staging dir and workgroup matter because the Terraform-provisioned
  workgroup enforces its result location):
  `awsathena+rest://athena.us-east-1.amazonaws.com:443/eps_ground_rapture_<env>?s3_staging_dir=s3://eps-ground-rapture-<env>/athena-results/&work_group=eps-ground-rapture-<env>`
- **Development**: Spark Thrift Server. Superset connector:
  `hive://<user>@localhost:10000/<database>` (the `hive` dialect speaks
  HiveServer2/Spark Thrift protocol).

This directory holds the **exported definitions** — datasets, charts, and
dashboards — so they can be version-controlled and re-imported.

## Workflow

1. Build tidy datasets: `cd subprojects/python && poetry run egr-build`.
2. Register tables in your query engine:
   - Dev: `beeline -u jdbc:hive2://localhost:10000 -f dashboards/sql/spark-thrift.sql`
   - Prod: provision via Terraform — `deploy/terraform/` (see its README
     and ADR-0014). **Do not use a Glue Crawler**: it registers the raw
     Parquet column names (`Us - Ud`, `SS_uc+`, …), which are illegal in
     Athena — that's exactly why the Terraform path exists.
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
