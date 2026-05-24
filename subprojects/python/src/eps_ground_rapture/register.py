"""DDL generation for the two target query engines.

- **Athena** (production): `CREATE EXTERNAL TABLE` with an explicit Hive
  column list, pointing at an S3 prefix. Athena does not infer Parquet
  schema at DDL time, so we read it here.
- **Spark Thrift Server** (development): `CREATE TABLE ... USING parquet
  LOCATION ...`. Spark *does* infer the schema from the Parquet files, so
  no column list is required.

The same logical table can therefore be registered against either engine
from the same Parquet files — only the location and the column list differ.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pyarrow.parquet as pq

# Mapping from pyarrow type strings to Athena/Hive type strings.
# Athena uses Hive-style names: https://docs.aws.amazon.com/athena/latest/ug/data-types.html
_ATHENA_TYPE_MAP: dict[str, str] = {
    "bool": "BOOLEAN",
    "int8": "TINYINT",
    "int16": "SMALLINT",
    "int32": "INT",
    "int64": "BIGINT",
    "uint8": "SMALLINT",
    "uint16": "INT",
    "uint32": "BIGINT",
    "uint64": "BIGINT",
    "float": "FLOAT",
    "double": "DOUBLE",
    "halffloat": "FLOAT",
    "string": "STRING",
    "large_string": "STRING",
    "binary": "BINARY",
    "large_binary": "BINARY",
    "date32[day]": "DATE",
    "date64[ms]": "DATE",
}


@dataclass(frozen=True)
class Table:
    """A single registerable table: a name and the directory holding its Parquet files."""

    name: str
    location: Path  # local directory holding data.parquet (and possibly partitions)


def _athena_type(arrow_type_str: str) -> str:
    if arrow_type_str in _ATHENA_TYPE_MAP:
        return _ATHENA_TYPE_MAP[arrow_type_str]
    if arrow_type_str.startswith("timestamp"):
        return "TIMESTAMP"
    if arrow_type_str.startswith("decimal"):
        # arrow form: decimal128(precision, scale)
        inside = arrow_type_str[arrow_type_str.index("(") + 1 : arrow_type_str.index(")")]
        return f"DECIMAL({inside})"
    raise ValueError(f"No Athena type mapping for Arrow type {arrow_type_str!r}")


def _read_schema(table_dir: Path) -> list[tuple[str, str]]:
    """Read column (name, arrow-type-string) pairs from any Parquet file under `table_dir`."""
    parquet_files = sorted(table_dir.glob("*.parquet"))
    if not parquet_files:
        raise FileNotFoundError(f"No parquet files under {table_dir}")
    schema = pq.read_schema(parquet_files[0])
    return [(field.name, str(field.type)) for field in schema]


def athena_ddl(table: Table, *, database: str, s3_location: str) -> str:
    """Emit Athena `CREATE EXTERNAL TABLE` DDL for `table`.

    `s3_location` should be an `s3://bucket/prefix/` URI — the directory
    containing the Parquet files, not an individual file.
    """
    cols = _read_schema(table.location)
    col_lines = ",\n  ".join(f"`{name}` {_athena_type(t)}" for name, t in cols)
    if not s3_location.endswith("/"):
        s3_location = s3_location + "/"
    return (
        f"CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table.name}` (\n"
        f"  {col_lines}\n"
        f")\n"
        f"STORED AS PARQUET\n"
        f"LOCATION '{s3_location}'\n"
        f"TBLPROPERTIES ('parquet.compression'='SNAPPY');"
    )


def spark_ddl(table: Table, *, database: str | None = None) -> str:
    """Emit Spark SQL DDL that registers `table` against a local Parquet dir.

    Spark Thrift infers the column list from the Parquet footer, so the DDL
    is just `USING parquet LOCATION ...`.
    """
    qualified = f"`{database}`.`{table.name}`" if database else f"`{table.name}`"
    location = table.location.resolve().as_uri()  # file:///abs/path/...
    return (
        f"CREATE TABLE IF NOT EXISTS {qualified}\n"
        f"USING parquet\n"
        f"LOCATION '{location}';"
    )


def athena_script(
    tables: list[Table],
    *,
    database: str,
    s3_prefix: str,
) -> str:
    """Build a full Athena `.sql` script: CREATE DATABASE + one CREATE EXTERNAL TABLE per `table`.

    `s3_prefix` is the *parent* prefix; each table's location becomes
    `<s3_prefix>/<table.name>/`.
    """
    if not s3_prefix.endswith("/"):
        s3_prefix = s3_prefix + "/"
    header = f"CREATE DATABASE IF NOT EXISTS `{database}`;"
    parts = [header]
    for t in tables:
        parts.append(athena_ddl(t, database=database, s3_location=f"{s3_prefix}{t.name}/"))
    return "\n\n".join(parts) + "\n"


def spark_script(tables: list[Table], *, database: str | None = None) -> str:
    """Build a full Spark Thrift `.sql` script for local dev."""
    parts: list[str] = []
    if database:
        parts.append(f"CREATE DATABASE IF NOT EXISTS `{database}`;")
        parts.append(f"USE `{database}`;")
    parts.extend(spark_ddl(t) for t in tables)
    return "\n\n".join(parts) + "\n"
