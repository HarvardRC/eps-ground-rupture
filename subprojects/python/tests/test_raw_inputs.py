"""Tests for the fail-fast raw-input check.

`data/raw/` is gitignored, so a fresh clone has none of these files. The
build must say so up front rather than crash partway through — and must
never rewrite the tracked `deploy/terraform/tables.json` from an
incomplete input set.
"""

from __future__ import annotations

import pytest

from eps_ground_rupture import cli, io


def _populate(raw_dir, *names):
    raw_dir.mkdir(parents=True, exist_ok=True)
    for name in names:
        (raw_dir / name).write_text("a,b\n1,2\n")


ALL_REQUIRED = (
    "DEM_dataset.csv",
    "02_FDHI_FLATFILE_MEASUREMENTS_20220719.csv",
    "SURE.csv",
    "Combine_BuwaldaFDHI_KernSDC.csv",
)


def test_missing_raw_inputs_lists_everything_absent(tmp_path):
    raw = tmp_path / "raw"
    raw.mkdir()
    missing = dict(io.missing_raw_inputs(raw))
    assert set(missing) == set(io.REQUIRED_RAW_INPUTS)


def test_missing_raw_inputs_empty_when_all_present(tmp_path):
    raw = tmp_path / "raw"
    _populate(raw, *ALL_REQUIRED)
    assert io.missing_raw_inputs(raw) == []


def test_flatfile_glob_matches_any_vintage(tmp_path):
    raw = tmp_path / "raw"
    _populate(raw, "DEM_dataset.csv", "SURE.csv", "Combine_BuwaldaFDHI_KernSDC.csv",
              "02_FDHI_FLATFILE_MEASUREMENTS_20301231.csv")
    assert io.missing_raw_inputs(raw) == []


def test_the_precleaned_csv_does_not_satisfy_the_flatfile_requirement(tmp_path):
    """There is deliberately no fallback: building `fdhi_cleaned` from the
    pre-cleaned CSV yields a different schema and no `fdhi_measurements`,
    which would leave the generated artifacts disagreeing with each other."""
    raw = tmp_path / "raw"
    _populate(raw, "DEM_dataset.csv", "SURE.csv", "Combine_BuwaldaFDHI_KernSDC.csv",
              io.FDHI_PRECLEANED_NAME)
    assert dict(io.missing_raw_inputs(raw)) == {
        io.FDHI_FLATFILE_GLOB: io.REQUIRED_RAW_INPUTS[io.FDHI_FLATFILE_GLOB]
    }


@pytest.mark.parametrize("dropped", ALL_REQUIRED)
def test_every_required_input_is_actually_checked(tmp_path, dropped):
    """Each entry in REQUIRED_RAW_INPUTS must be load-bearing — dropping any
    single file has to be reported."""
    raw = tmp_path / "raw"
    _populate(raw, *[n for n in ALL_REQUIRED if n != dropped])
    assert len(io.missing_raw_inputs(raw)) == 1


def test_a_directory_named_like_an_input_does_not_count(tmp_path):
    """A stray directory matching the glob must not satisfy the check, and
    must not be picked as the flatfile either."""
    raw = tmp_path / "raw"
    _populate(raw, *[n for n in ALL_REQUIRED if not n.startswith("02_FDHI")])
    (raw / "02_FDHI_FLATFILE_MEASUREMENTS_29991231.csv").mkdir()
    assert dict(io.missing_raw_inputs(raw)) == {
        io.FDHI_FLATFILE_GLOB: io.REQUIRED_RAW_INPUTS[io.FDHI_FLATFILE_GLOB]
    }
    assert io.find_fdhi_flatfile(raw) is None

    # with a real file alongside it, the file wins over the directory
    _populate(raw, "02_FDHI_FLATFILE_MEASUREMENTS_20220719.csv")
    assert io.missing_raw_inputs(raw) == []
    assert io.find_fdhi_flatfile(raw).is_file()


def test_newest_flatfile_vintage_wins(tmp_path):
    raw = tmp_path / "raw"
    _populate(raw, "02_FDHI_FLATFILE_MEASUREMENTS_20220719.csv",
              "02_FDHI_FLATFILE_MEASUREMENTS_20240101.csv")
    assert io.find_fdhi_flatfile(raw).name == "02_FDHI_FLATFILE_MEASUREMENTS_20240101.csv"


def test_require_raw_inputs_message_names_files_and_provenance(tmp_path):
    raw = tmp_path / "raw"
    raw.mkdir()
    with pytest.raises(FileNotFoundError) as exc:
        io.require_raw_inputs(raw)
    msg = str(exc.value)
    for name in ALL_REQUIRED[:1] + (io.FDHI_FLATFILE_GLOB, "SURE.csv"):
        assert name in msg
    assert "10.25346/S6/Y4F9LJ" in msg  # where to get the flatfile
    assert "data/README.md" in msg      # where the rest are documented


def test_require_raw_inputs_silent_when_satisfied(tmp_path):
    raw = tmp_path / "raw"
    _populate(raw, *ALL_REQUIRED)
    io.require_raw_inputs(raw)  # must not raise


def test_warn_stale_tables_names_what_was_not_rebuilt(tmp_path, monkeypatch, capsys):
    """A table that drops out of the build keeps its Parquet and still backs
    a view — the run must say so rather than leave it silently stale."""
    processed = tmp_path / "processed"
    for name in ("dem", "fdhi_measurements"):
        (processed / name).mkdir(parents=True)
        (processed / name / "data.parquet").write_bytes(b"stub")
    (processed / "no_parquet_here").mkdir()
    monkeypatch.setattr(cli, "PROCESSED_DIR", processed)

    cli._warn_stale_tables({"dem"})
    err = capsys.readouterr().err
    assert "1 processed table(s) not rebuilt by this run: fdhi_measurements" in err
    assert "no_parquet_here" not in err  # a dir without data.parquet isn't a table
    assert err.rstrip().endswith("processed/fdhi_measurements")  # only the stale one


def test_warn_stale_tables_silent_when_all_rebuilt(tmp_path, monkeypatch, capsys):
    processed = tmp_path / "processed"
    (processed / "dem").mkdir(parents=True)
    (processed / "dem" / "data.parquet").write_bytes(b"stub")
    monkeypatch.setattr(cli, "PROCESSED_DIR", processed)

    cli._warn_stale_tables({"dem"})
    assert capsys.readouterr().err == ""


def test_egr_build_fails_fast_without_writing_anything(tmp_path, monkeypatch, capsys):
    """The whole point: exit 2 with a message, and no generated artifact
    touched — above all not the tracked Terraform schema."""
    raw = tmp_path / "raw"
    raw.mkdir()
    monkeypatch.setattr(io, "RAW_DIR", raw)

    tables_json = tmp_path / "tables.json"
    tables_json.write_text('{"committed": "unchanged"}')
    monkeypatch.setattr(cli, "TERRAFORM_TABLES_JSON", tables_json)
    monkeypatch.setattr(cli, "SQL_OUT_DIR", tmp_path / "sql")

    assert cli.main([]) == 2
    assert "Missing required raw input" in capsys.readouterr().err
    assert tables_json.read_text() == '{"committed": "unchanged"}'
    assert not (tmp_path / "sql").exists()
