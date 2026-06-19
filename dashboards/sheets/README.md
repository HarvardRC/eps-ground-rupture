# Google Sheets push (for Tableau Public)

Tableau **Public** can't connect to DuckDB or Athena — but it *can* connect
to a Google Sheet and refresh from it on a schedule. `egr-push-sheets`
writes a DuckDB view (from `dashboards/duckdb/eps.duckdb`) into a Google
Sheet worksheet as an **idempotent full replace**, so a workbook published
to Tableau Public stays in sync with the pipeline.

```
DuckDB view ──egr-push-sheets──► Google Sheet ──Tableau Public refresh──► dashboard
```

By default it pushes `unified_observations` (329,124 rows × 10 cols ≈ 3.3M
cells — comfortably under the per-Sheet cell limit).

## One-time Google setup

1. **Create / pick a Google Cloud project** at <https://console.cloud.google.com>.
2. **Enable the Google Sheets API** (and Google Drive API):
   *APIs & Services → Library →* search "Google Sheets API" → **Enable**
   (repeat for "Google Drive API").
3. **Create a service account**: *IAM & Admin → Service Accounts → Create*.
   Note its email — it looks like
   `eps-sheets@<project>.iam.gserviceaccount.com`.
4. **Create a JSON key** for it: *(the service account) → Keys → Add Key →
   Create new key → JSON*. A `.json` file downloads. **Treat it as a
   secret.** Save it to **`resources/local/eps-sheets-sa.json`** (that whole
   directory is gitignored), or keep it anywhere and point
   `GOOGLE_SHEETS_SA_KEYFILE` at it (see below). Never commit the key file.
5. **Create the destination spreadsheet** in Google Sheets (or reuse one).
   Copy its **ID** — the path segment after `/d/`:
   `https://docs.google.com/spreadsheets/d/`**`<SPREADSHEET_ID>`**`/edit`.
6. **Share the spreadsheet with the service-account email as an Editor**
   (the *Share* button → paste the SA email → Editor). This is the step
   people forget — without it the push fails with a permissions error.

## Configure

- Put the spreadsheet ID in `targets.yaml` (it's configuration, not a
  secret):

  ```yaml
  targets:
    unified_observations:
      spreadsheet_id: 1AbC...your-id...XyZ
      worksheet: unified_observations
  ```

- Provide the service-account key **file path** via the
  **`GOOGLE_SHEETS_SA_KEYFILE`** environment variable (a path, never the
  secret). If unset, it defaults to **`resources/local/eps-sheets-sa.json`**
  (resolved under the repo root; a relative value of the env var is also
  resolved against the repo root):

  ```bash
  # only needed if the key is somewhere other than the default path:
  export GOOGLE_SHEETS_SA_KEYFILE=/path/to/your-key.json
  ```

  See `../../.env.example`. The command reads credentials **only** from this
  key file — there is no fallback to any other credential source. If the
  file is missing it stops with a clear error naming the expected path.

## Run

```bash
cd subprojects/python
poetry run egr-push-sheets                 # push every target in targets.yaml
poetry run egr-push-sheets --view unified_observations   # just one
poetry run egr-push-sheets --duckdb /path/to/eps.duckdb  # non-default DB
```

It prints, per target, the rows × cols pushed and the Sheet URL:

```
pushed unified_observations: 329,124 rows x 10 cols -> https://docs.google.com/spreadsheets/d/.../edit#gid=0
```

Re-running is safe: each push **clears and rewrites** the worksheet (full
replace, not append), writing in ~50,000-row chunks and retrying on
rate-limit (HTTP 429).

### Verify

The Sheet's data-row count should equal the view's row count:

```bash
# in the Sheet: total rows minus the 1 header row
duckdb dashboards/duckdb/eps.duckdb -c "SELECT COUNT(*) FROM unified_observations"
# -> 329124  (Sheet shows 329125 rows including the header)
```

## The 10-million-cell caveat (and the `dem` fallback)

A single Google spreadsheet caps at **10,000,000 cells**. `egr-push-sheets`
guards at **9,000,000** (rows × cols) and refuses to push a larger view,
naming the view and its size. The full **`dem`** view is ~**346,834 × 26 =
9.0M cells** — over the guard — so it cannot go to Sheets directly.

For `dem`, use the **Drive-CSV fallback**: publish the CSV to Google Drive
and point Tableau Public at the file URL instead of a Sheet.

```bash
# 1. Export the view to CSV from DuckDB:
duckdb dashboards/duckdb/eps.duckdb \
  -c "COPY (SELECT * FROM dem) TO 'dem.csv' (HEADER, FORMAT csv)"

# 2. Upload dem.csv to Drive (folder shared with the service account, or
#    your own Drive), then set link-sharing to 'Anyone with the link'.
# 3. In Tableau Public, connect to the published CSV's direct-download URL.
```

(A CSV on Drive has no cell-count limit; only Sheets do. If you later want
this automated, a `push_csv_to_drive` companion using the Drive API is the
natural follow-on — not built yet.)

## Notes

- **Credentials never touch the repo.** Only the key-file *path* is
  referenced (`GOOGLE_SHEETS_SA_KEYFILE`); the key itself lives under the
  gitignored `resources/local/`, and `.gitignore` additionally blocks common
  key filenames as a backstop.
- **Idempotent.** Safe to wire into a cron / CI step after `egr-build`.
- **Tableau Public refresh.** Once a Public workbook is connected to the
  Sheet, Tableau Public refreshes Google Sheets connections automatically
  (≈ daily); re-run `egr-push-sheets` whenever the pipeline data changes so
  the next refresh picks it up.
