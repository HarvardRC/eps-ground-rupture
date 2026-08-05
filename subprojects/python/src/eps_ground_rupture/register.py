"""DDL generation for the two target query engines.

- **Athena** (production): `CREATE EXTERNAL TABLE` with an explicit Hive
  column list, pointing at an S3 prefix. Athena does not infer Parquet
  schema at DDL time, so we read it here.
- **Spark Thrift Server** (development): `CREATE TABLE ... USING parquet
  LOCATION ...`. Spark *does* infer the schema from the Parquet files, so
  no column list is required.

The same logical table can therefore be registered against either engine
from the same Parquet files — only the location and the column list differ.

Athena column-name caveat: our raw Parquet carries names Athena cannot
query (spaces, `^`, `+`, `-` — e.g. the DEM dataset's "Us - Ud" or SURE's
"SS_uc+"). We therefore expose **sanitized** snake_case column names and
tell the Parquet SerDe to map columns **by ordinal position**
(`parquet.column.index.access = true`) instead of by name. The Parquet
files themselves keep their original names, so DuckDB / Spark / Tableau
paths are unaffected. The trade-off: column order in the Parquet is
load-bearing for Athena — which is fine, because both the files and this
DDL are regenerated together from the same pipeline run. (Rationale for
generating DDL here rather than by hand: `docs/adr/dead-ends.md`, AWS lane.)

The same sanitized schema is exported as JSON (`glue_tables_payload` /
`write_tables_json`) for the Terraform deployment under
`deploy/terraform/`, which creates the Glue tables in AWS.
"""

from __future__ import annotations

import json
import re
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


def sanitize_column(name: str) -> str:
    """Make a Parquet column name legal for Athena / Glue.

    Athena only supports lowercase letters, digits, and underscores in
    column names. Mapping rules, applied in order:

    - `+` → `_plus`, `-` → `_minus` *when adjacent to a word character*
      (preserves the distinction between SURE's "SS_uc+" and "SS_uc-",
      which would otherwise both collapse to "ss_uc")
    - any remaining run of non-alphanumerics → single `_`
    - lowercase; trim leading/trailing `_`; collapse repeats
    - prefix `c_` if the result starts with a digit; `col` if empty
    """
    s = name.strip()
    s = re.sub(r"(?<=\w)\+", "_plus", s)
    s = re.sub(r"(?<=\w)-(?!\w)", "_minus", s)  # trailing "-" as in "FNC_uc-"
    s = re.sub(r"[^0-9a-zA-Z]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_").lower()
    if not s:
        return "col"
    if s[0].isdigit():
        s = f"c_{s}"
    return s


def _sanitized_schema(table_dir: Path) -> list[dict[str, str]]:
    """Read a table's Parquet schema and return Glue-ready column dicts.

    Each entry: {"name": <sanitized>, "type": <glue type, lowercase>,
    "comment": "Parquet field: <original>"}. Names are deduplicated with
    numeric suffixes so the list is always a valid Glue column set.
    """
    used: set[str] = set()
    out: list[dict[str, str]] = []
    for original, arrow_type in _read_schema(table_dir):
        base = sanitize_column(original)
        # Probe suffixes until the candidate is genuinely unused — a plain
        # per-base counter can collide with another column whose *direct*
        # sanitization already is "base_N" (e.g. "Comments", "Comments",
        # "Comments.2" → comments, comments_2, comments_2).
        name, n = base, 1
        while name in used:
            n += 1
            name = f"{base}_{n}"
        used.add(name)
        out.append(
            {
                "name": name,
                "type": _athena_type(arrow_type).lower(),
                "comment": f"Parquet field: {original}",
            }
        )
    return out


def glue_tables_payload(tables: list[Table]) -> dict[str, list[dict[str, str]]]:
    """Build the {table_name: [column, ...]} payload consumed by Terraform."""
    return {t.name: _sanitized_schema(t.location) for t in tables}


def write_tables_json(tables: list[Table], path: Path) -> Path:
    """Write the Glue schema payload as JSON for `deploy/terraform/`."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(glue_tables_payload(tables), indent=2) + "\n")
    return path


def athena_ddl(table: Table, *, database: str, s3_location: str) -> str:
    """Emit Athena `CREATE EXTERNAL TABLE` DDL for `table`.

    `s3_location` should be an `s3://bucket/prefix/` URI — the directory
    containing the Parquet files, not an individual file.

    Column names are sanitized (see `sanitize_column`) and mapped to the
    Parquet fields by ordinal position via
    `parquet.column.index.access = true`, because the raw names are not
    legal Athena identifiers.
    """
    cols = _sanitized_schema(table.location)

    def esc(s: str) -> str:
        # HiveQL string literal: backslash is the escape character.
        return s.replace("\\", "\\\\").replace("'", "\\'")

    col_lines = ",\n  ".join(
        f"`{c['name']}` {c['type']} COMMENT '{esc(c['comment'])}'" for c in cols
    )
    if not s3_location.endswith("/"):
        s3_location = s3_location + "/"
    return (
        f"CREATE EXTERNAL TABLE IF NOT EXISTS `{database}`.`{table.name}` (\n"
        f"  {col_lines}\n"
        f")\n"
        f"ROW FORMAT SERDE 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe'\n"
        f"WITH SERDEPROPERTIES ('parquet.column.index.access'='true')\n"
        f"STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat'\n"
        f"OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'\n"
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
