# ADR-0006: CSV exports feed the published workbooks

- **Status**: Accepted
- **Date**: 2026-06-24 (`egr-csv` shipped with the first Public publish); recorded 2026-08-05
- **Deciders**: Michael Bouzinier (project owner)

## Context

This is the forced consequence of
[ADR-0005](0005-tableau-public-as-the-publication-channel.md): Tableau
Public builds extracts from **local files or Google Sheets, and nothing
else**. The engines the architecture originally planned around — DuckDB,
Athena, Spark Thrift — are not connectable from Public, and Parquet is
not an accepted local-file source either. Within Public the menu is
effectively two items: local CSV, or Google Sheets.

(Old ADR-0006 had deleted CSV from the pipeline as dead weight three
weeks earlier. See
[Dead ends](dead-ends.md#the-premise-breaks-june) for the irony,
gracefully absorbed.)

## Decision

**`egr-csv` exports every published table and view from DuckDB to
`dist/csv/<view>.csv`**, and the `-public` workbooks connect to those
files (text-scan connections + extracts):

- Exports are **build artifacts, not committed** — regenerated per
  machine with `poetry run egr-csv`; the canonical repo path convention
  (`notes/multi-machine.md`) keeps the workbooks' absolute file paths
  valid on every machine.
- What gets exported is exactly "a DuckDB view, written out"
  ([ADR-0003](0003-duckdb-as-the-analytical-engine.md)) — currently 11
  files, from `dem.csv` to `kern_inferred_slip.csv`.
- Workbook extracts are rebuilt from these files on refresh; dangling
  extract paths in a fresh clone are normal and heal on first refresh.

## Alternatives considered

- **Google Sheets** — the only *refreshable* Public source, and a full
  push lane was built (2026-06-19, `egr-push-sheets`) before CSV won.
  **Rejected because it failed on size**: a spreadsheet caps at 10M
  cells, and the full `dem` view (~346,834 × 26 ≈ 9.0M cells) trips the
  tool's own 9M-cell guard — the central table could never ship this
  way, and the documented "Drive-CSV fallback" for it is just CSV with a
  Google account in the middle. Views that did fit still ran chunked
  (50k rows) against rate limits. Kept dormant for sub-cap views should
  scheduled refresh ever matter; the Google-identity and key-custody
  objections stand recorded but were moot once the data didn't fit.
- **Parquet as the handoff file** — not a Public-accepted source.
- **Pre-built `.hyper` extracts via the Hyper API** — an extra
  toolchain to maintain to produce what Tableau rebuilds from CSV in
  seconds at this data size.
- **Live DuckDB/Athena connections** — Desktop-only; the published twins
  can't carry them.

## Consequences

- CSV's type-lossiness moves schema discipline into the workbooks: the
  relation-embedded column schema inside each `.twb` is authoritative
  for the text-scan, and **must be updated when the export schema
  changes** (a hard-won lesson; see the session traps list).
- Data updates are a manual chain — `egr-build` → `egr-csv` → extract
  refresh → re-save to Public — acceptable at the project's publication
  cadence.
- The published dashboards are fully reproducible from the repo: raw
  inputs → Parquet → views → CSV, every step pinned by tests.
- Case-variant column names across unioned CSVs are merged by Tableau at
  the field layer (one more reason the exports, not the workbooks, own
  naming).

## References

- `subprojects/python/src/eps_ground_rupture/csvexport.py` (`egr-csv`)
- `dist/csv/` — the export target (gitignored)
- `dashboards/sheets/README.md` — the dormant alternative
