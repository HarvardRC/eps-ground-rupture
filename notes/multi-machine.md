# Working across two machines (laptop + Mac Pro)

The root hazard: Tableau workbooks, `.tds` files, and DuckDB view
definitions store **absolute paths**. The canonical repo path is the
Mac Pro's:

    /Users/misha/harvard/projects/github/eps-ground-rapture

## One-time setup (laptop)

```bash
mkdir -p ~/harvard/projects          # parent ONLY — do not create .../github
ln -s ~/harvard/github ~/harvard/projects/github
```

This aliases the whole `github` folder (every repo in it) at the
canonical location. Precondition: `~/harvard/projects/github` must not
already exist as a real directory — if it does, link just this repo
instead:

```bash
ln -s ~/harvard/github/eps-ground-rapture \
      ~/harvard/projects/github/eps-ground-rapture
```

Both machines then resolve the canonical path (same `misha` username);
workbooks and the DuckDB file open unmodified on either. All NEW
Tableau connections must be made through the canonical path — if the
laptop's Finder/dialog defaults to `~/harvard/github/...`, navigate via
`~/harvard/projects/github/...` instead.

## Leaving a machine

1. Save + close Tableau.
2. Commit and **push** (the 097d9e3 two-machine merge is the scar this
   rule comes from).

## Arriving on a machine

1. `git pull`.
2. Regenerate the gitignored artifacts:
   `./gradlew :subprojects:python:egrBuild` then the `egr-csv` exports
   (dist/csv does not travel via git). Alternative when the toolchain
   is inconvenient: download the CSV set from the GitHub Release
   (see notes on data hosting), same files.
3. First Tableau open per workbook: **File → Open** (never the app
   start-page recents), then **Data → each source → Refresh** —
   extracts are per-machine caches (temp/Documents hyper paths never
   sync) and rebuild from the local CSVs. Dangling extract paths are
   normal before the refresh.

## Tableau's private directories (the three categories)

1. **Caches — never sync, regenerate.** Shadow/temp extracts
   (`/var/folders/...`, `Shadow Extracts/`) are derived per-machine
   state; the arrive-ritual's Data → Refresh rebuilds them. Syncing
   them causes staleness bugs, it doesn't prevent them.
2. **Saved datasources — don't use them.** Never save connections into
   `My Tableau Repository/Datasources`; the 2026-08-03 breakage traced
   to a workbook referencing a laptop-private `.hyper` there. Standard:
   connections live INSIDE each workbook, pointing at the canonical
   repo path (the D3-era pattern).
3. **Preferences — repo + symlink.** Custom palettes live in
   `Preferences.tps`; custom marker shapes in `Shapes/`. Canonical copy
   in the repo, symlinked from each machine's repository folder
   (Tableau Desktop and the Public app each keep their own
   `My Tableau Repository*` under `~/Documents`):

   ```bash
   # one-time, per machine, per app repository folder:
   cp ~/Documents/"My Tableau Repository"/Preferences.tps \
      <repo>/dashboards/tableau/Preferences.tps   # first machine only
   ln -sf <repo>/dashboards/tableau/Preferences.tps \
      ~/Documents/"My Tableau Repository"/Preferences.tps
   ```

   (Adjust the folder name for the Public app's repository. If no
   custom palettes exist yet, skip until the first one is created.)

## If a workbook still complains about paths

A pre-symlink workbook may carry `…/harvard/github/…` (laptop-era)
references — 2026-08-03: both `-public` twins were repointed to the
canonical path already. For any straggler, the fix is a plain string
replacement in the .twb (Tableau closed):
`/Users/misha/harvard/github/eps-ground-rapture` →
`/Users/misha/harvard/projects/github/eps-ground-rapture`,
then reopen + refresh sources. If after a schema change (new column in
a CSV) an extract refresh fails with SQLSTATE 42703, re-pick the same
file via Data Source tab → Connections → Edit Connection to bust the
workbook's cached schema.

A harder variant (2026-08-16): a workbook can embed the *shadow-extract*
temp path of the machine that last saved it
(`/var/folders/<hash>/T/tableau-temp/#TableauTemp_….hyper`). On the
other machine that hash does not exist, and Tableau refuses to open the
workbook at all — SQLSTATE 58S01, "unable to resolve the database path:
Directory does not exist", before any refresh can run. Diagnosis:
`grep -o '/var/folders/[a-z0-9_/]*' <file>.twb | sort -u` and compare
with `getconf DARWIN_USER_TEMP_DIR` on the machine at hand. Fix: open
and republish on the machine it was last saved on (paths re-bind on
save), or strip the stale hyper reference in the closed XML. Rebooting
the refusing machine does nothing — the dead path belongs to the other
Mac.

## Repo renamed to `eps-ground-rupture` (2026-08-05)

The GitHub repo was renamed to fix the rapture/rupture typo. The **local
directory keeps the old name** on both machines — the canonical path
`~/harvard/projects/github/eps-ground-rapture` is baked into the Tableau
workbooks' CSV connections, and renaming it would force a four-workbook
repair. Consequences:

- Remote update, once per machine:
  `git remote set-url origin git@github.com:HarvardRC/eps-ground-rupture.git`
  (done on the Mac Pro 2026-08-05; **laptop still pending**).
- Fresh clones must pin the directory name:
  `git clone git@github.com:HarvardRC/eps-ground-rupture.git eps-ground-rapture`
- Old `github.com` URLs redirect; a future local-dir rename should ride a
  planned breaking-change moment (e.g. the snake_case column migration).
