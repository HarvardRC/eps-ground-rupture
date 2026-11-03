"""Tests of the reference results (`references-<h12>.json.gz`, docs/app/ddd.md §3.6).

The §7.3 contract file for the reference-results generator. Its full-data
lane (tests named `test_full_*`) regenerates the references from the
processed views and asserts what PDD §10.2 — Golden scenarios states for
GS-0–GS-7 (GS-3 joins once D-6 is decided), that the boundary battery stays
discriminating, that DuckDB `quantile_cont` agrees with `quantile_linear`
within one ulp, and the two evidence tests of §7.3 behind the DD-2
tolerance (§7.1). The lane skips only through the module-scoped fixtures
below — without the processed tables — and may not skip under
`EGR_REQUIRE_FULL_DATA=1` (tests/conftest.py).
"""

from __future__ import annotations

import math
import re
from decimal import Decimal

import duckdb
import numpy as np
import pytest

from eps_ground_rupture import config, views
from eps_ground_rupture import product_export as pe

# --------------------------------------------------------------------------
# Full-data lane: references regenerated from the processed views
# --------------------------------------------------------------------------

#: The shipped columns, each with the view column it is read from.
SHIPPED_COLUMNS = {"slip": "Slip", **pe.MEASUREMENT_SOURCE_COLUMNS}

#: The FR-O2 quantiles of §3.6 compared with DuckDB's `quantile_cont`.
FR_O2_QUANTILES = (16, 50, 84)

#: The largest relative change of evaluation order the DD-2 tolerance allows
#: for (§7.1).
EVALUATION_ORDER_BOUND = 1e-11

#: An offset-path boundary case id (§3.6, Boundary cases).
OFFSET_CASE = re.compile(r"B-GS1-(?P<population>[a-z]+)-d(?P<dip>[0-9]+)-(?P<side>lo|hi)-(?P<p>.+)")


@pytest.fixture(scope="module")
def con(tmp_path_factory):
    processed = config.PROCESSED_DIR
    missing = [t for t in views.REQUIRED_TABLES if not (processed / t / "data.parquet").is_file()]
    if missing:
        pytest.skip(f"processed Parquet missing {missing}; run egr-build")
    db = views.build_duckdb_views(
        processed_dir=processed,
        duckdb_path=tmp_path_factory.mktemp("references_full") / "eps.duckdb",
    )
    c = duckdb.connect(str(db), read_only=True)
    yield c
    c.close()


@pytest.fixture(scope="module")
def dem(con):
    """The `dem` view's rows with the columns the export reads."""
    columns = [pe.TRIAL_SOURCE_COLUMN, *pe.TRIAL_SOURCE_COLUMNS.values()]
    columns += list(pe.STAGE_SOURCE_COLUMNS.values())
    quoted = ", ".join(f'"{c}"' for c in columns)
    return con.execute(f"SELECT {quoted} FROM dem").df()


@pytest.fixture(scope="module")
def vintage(con, dem):
    """What the generator reads of the vintage, as the export run builds it
    from the views (§4.1 step 2)."""
    pack = pe.pack_scenario(dem)
    return pe.ReferenceVintage(
        table=pe.build_record_table(dem),
        trial_columns=pack.trial_columns,
        arm_strength_states=pack.arm_strength_states,
        slip_window_bounds=pack.slip_window_bounds,
        coefficients=pe.regression_coefficients(con),
    )


@pytest.fixture(scope="module")
def scenarios(vintage):
    """The regenerated golden-scenario entries, by id."""
    return {
        gs_id: pe.scenario_entry(vintage, gs_id, changes) for gs_id, changes in pe.GOLDEN_SCENARIOS
    }


def _valid(entry) -> dict[str, int]:
    return {m: c["valid"] for m, c in entry["counts"]["per_measurement"].items()}


def test_full_gs0_full_ensemble_counts(scenarios):
    """GS-0: 346,834 matching records, 3,434 of them unclassified."""
    counts = scenarios["GS-0"]["counts"]
    assert (counts["matching_records"], counts["unclassified"]) == (346_834, 3_434)


def test_full_gs1_per_dip_range_flags(scenarios):
    """GS-1: 30° flagged beyond the modeled range (`partly_out`, §5.5), 40°
    in range."""
    flags = {w["fault_dip"]: w["range_flag"] for w in scenarios["GS-1"]["converted_windows"]}
    assert flags == {30: "partly_out", 40: "in_range"}


def test_full_gs2_warning_tier(scenarios):
    """GS-2: 18 valid scarp-height measurements, the panel shown on load —
    and 18 in all three panels, the drafting measurement."""
    assert _valid(scenarios["GS-2"]) == {"scarp_height": 18, "dzw": 18, "scarp_dip": 18}


def test_full_gs4_empty_result_diagnostic(scenarios):
    """GS-4: no match; relaxing sediment strength or depth alone yields
    matches."""
    entry = scenarios["GS-4"]
    assert entry["counts"]["matching_records"] == 0
    assert entry["diagnosed_conditions"] == ["sediment", "depth"]


def test_full_gs5_suppression_tier(scenarios):
    """GS-5: 9 valid scarp-height measurements, the panel shown on load —
    and 9 in all three panels, the drafting measurement."""
    assert _valid(scenarios["GS-5"]) == {"scarp_height": 9, "dzw": 9, "scarp_dip": 9}


def test_full_gs6_count_validity_split(scenarios):
    """GS-6: 3,434 matching records, with valid 0 and excluded-null 3,434 in
    every panel."""
    counts = scenarios["GS-6"]["counts"]
    assert counts["matching_records"] == 3_434
    for m in pe.MEASUREMENTS:
        assert counts["per_measurement"][m] == {"valid": 0, "excluded_null": 3_434}, m


def test_full_gs7_one_state_per_trial(scenarios):
    """GS-7: 3,434 matching records, one per trial."""
    assert scenarios["GS-7"]["counts"]["matching_records"] == 3_434


def test_full_boundary_cases_discriminate(vintage):
    """For each dip, at least one `out±` or `step±` offset-path case changes
    the selection relative to its `exact` case."""
    cases = pe.boundary_cases(vintage)
    exact = {}
    perturbed = []
    for case in cases:
        match = OFFSET_CASE.fullmatch(case["id"])
        if match is None:
            continue
        key = (match["population"], int(match["dip"]), match["side"])
        if match["p"] == "exact":
            exact[key] = case["expected"]["selection"]
        elif match["p"] in ("out-", "out+", "step-", "step+"):
            perturbed.append((key, case["expected"]["selection"]))
    dips = {key[1] for key in exact}
    assert dips == {30, 40}
    changing = {key[1] for key, selection in perturbed if selection != exact[key]}
    assert changing == dips


def test_full_quantile_cont_agrees_within_one_ulp(con, dem):
    """DuckDB `quantile_cont` and `quantile_linear` agree within one ulp at
    p16, p50, and p84 on every shipped column."""
    for name, source in SHIPPED_COLUMNS.items():
        values = dem[source].dropna().to_numpy(dtype=np.float64)
        ascending = sorted(float(v) for v in values)
        for q in FR_O2_QUANTILES:
            [(duck,)] = con.execute(
                f'SELECT quantile_cont("{source}", {q / 100}) FROM dem WHERE "{source}" IS NOT NULL'
            ).fetchall()
            ours = pe.quantile_linear(ascending, q / 100)
            assert duck in (
                ours,
                math.nextafter(ours, -math.inf),
                math.nextafter(ours, math.inf),
            ), f"{name} p{q}: quantile_cont {duck!r}, quantile_linear {ours!r}"


def test_full_display_tie_census(dem):
    """For each of slip, scarp height, DZW, and scarp dip: the valid values
    whose shortest round-trip decimal has exactly one fraction digit more
    than the column's display decimals and ends in 5 — exact ties at the
    display step. Prints their share; `display_round` rounds every one of
    them away from zero."""
    for name, source in SHIPPED_COLUMNS.items():
        decimals = pe.DISPLAY_DECIMALS[name]
        values = [float(v) for v in dem[source].dropna().tolist()]
        ties = []
        for v in values:
            text = repr(v)
            if "e" in text or "." not in text:
                continue
            fraction = text.split(".")[1]
            if len(fraction) == decimals + 1 and fraction.endswith("5"):
                ties.append(v)
        print(f"tie_share {name} {len(ties) / len(values)}")
        toward_zero = [
            v
            for v in ties
            if not abs(Decimal(pe.display_round(v, decimals))) > abs(Decimal(repr(v)))
        ]
        assert toward_zero == [], f"{name}: {toward_zero[:5]}"


def test_full_evaluation_order_effect(vintage, scenarios):
    """For every golden scenario and measurement with valid ≥ 2: the mean
    and the sample standard deviation by the generator's operation-identical
    algorithms against NumPy's `np.mean` and `np.std(ddof=1)`. Prints the
    largest relative difference, at most 1e-11."""
    largest = 0.0
    for gs_id, entry in scenarios.items():
        inputs = entry["inputs"]
        chosen = pe.select(vintage.table, inputs, vintage.windows_for(inputs))
        for m in pe.MEASUREMENTS:
            steps, _ = pe.measurement_values(vintage.table, chosen, m)
            if len(steps) < 2:
                continue
            x = np.array(steps, dtype=np.int64) / pe.MEASUREMENT_DIVISOR
            stats = entry["statistics"][m]
            for ours, numpy_value in (
                (stats["mean"], float(np.mean(x))),
                (stats["sd"], float(np.std(x, ddof=1))),
            ):
                difference = abs(ours - numpy_value)
                if difference:
                    largest = max(largest, difference / abs(numpy_value))
            assert len(steps) == entry["counts"]["per_measurement"][m]["valid"], (gs_id, m)
    print(f"evaluation_order_effect {largest}")
    assert largest <= EVALUATION_ORDER_BOUND
