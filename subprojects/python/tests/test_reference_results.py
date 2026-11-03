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

Its fixture lane checks the §3.6 generator definitions on inputs from
`eps_ground_rupture/reference_cases.py`, each against an independent
recomputation: `quantile_linear` against NumPy's linear percentiles, the
null rules, the integer-sum mean, `histogram()` and `histogram_log()`
against `numpy.histogram` with the offer-threshold pair, `display_round` on
the §7.3 vectors, the stored-bounds probes, the four synthetic ensembles
against a pandas recomputation grouped by trial identity, the conversion
range flags, the 10,000-record selection threshold with class code 255, a
GS-4-style diagnosed set, GS-1's `inputs` against the golden bytes of §5.6,
and a non-finite value. It reads no research data.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
from decimal import Decimal
from fractions import Fraction

import duckdb
import numpy as np
import pandas as pd
import pytest

from eps_ground_rupture import config, reference_cases, views
from eps_ground_rupture import product_export as pe
from eps_ground_rupture.config import SCARP_CLASSES

# --------------------------------------------------------------------------
# Fixture lane: the §3.6 definitions on reference_cases.py inputs
# --------------------------------------------------------------------------

#: The measurements of a scenario entry, in panel order (§3.6).
MEASUREMENTS = ("scarp_height", "dzw", "scarp_dip")

#: The restore divisor of a recording step per `decimals` (§3.1).
STEP_DIVISORS = {3: 1000, 4: 10000}

#: One display step in recording steps per display decimals (§5.12).
DISPLAY_STEP_UNITS = {2: 10, 1: 100, 0: 1000}

#: The logarithmic axis is offered above 100 times the smallest positive
#: step — "more than two decades" — and its lowest edge is 100 steps.
LOG_OFFER_RATIO = 100
LOG_FIRST_EDGE = 100

#: The diagnosed-condition groups of §5.3 in their fixed order, each with
#: the DD-11 keys it resets.
CONDITION_GROUPS = (
    ("fault_dip", ("fault_dip",)),
    ("sediment", ("sediment",)),
    ("depth", ("depth",)),
    ("density", ("density",)),
    ("window", ("entry_mode", "slip_window", "offset_max")),
    ("scarp_class", ("scarp_class",)),
)

#: The display-rounding vectors of §7.3, held identically by
#: test/views-text.test.ts: (value, decimals, expected string).
DISPLAY_ROUNDING = (
    (3.635, 2, "3.64"),
    (1.005, 2, "1.01"),
    (2.675, 2, "2.68"),
    (2.175, 2, "2.18"),
    (4.315, 2, "4.32"),
    (3.6350000000000002, 2, "3.64"),
    (3.6349999999999993, 2, "3.63"),
    (-0.055, 2, "-0.06"),
    (-0.004, 2, "0.00"),
    (-0.0, 2, "0.00"),
    (0.005, 2, "0.01"),
    (-0.005, 2, "-0.01"),
    (1e-7, 2, "0.00"),
    (0.30000000000000004, 2, "0.30"),
    (45.85, 1, "45.9"),
    (89.5, 0, "90"),
    (-12.5, 0, "-13"),
    (2.5, 0, "3"),
    (5.0135, 3, "5.014"),
)

#: GS-1's canonical scenario object, the golden bytes of §5.6.
GS1_GOLDEN = (
    '{"density":["Dense","Loose","Medium"],"depth":[3,5,10],"entry_mode":"offset",'
    '"fault_dip":[30,40],"offset_max":"3","population":"all_stages","scarp_class":'
    '["Monoclinal","Monoclinal Collapse","Pressure Ridge","Pressure Ridge Collapse",'
    '"Simple","Simple Collapse"],"sediment":[{"sediment_strength":"Strong","set":'
    '"Heterogeneous"},{"sediment_strength":"Strong","set":"Homogeneous"}],"slip_window":null}'
)


@pytest.fixture(scope="module")
def synthetic():
    """The `synthetic` record the generator writes from reference_cases.py."""
    return pe.synthetic_cases()


def _ensemble(ensembles, n: int) -> dict:
    [ensemble] = [e for e in ensembles if e["stages_per_trial"] == n]
    return ensemble


def _ensemble_frame(ensemble) -> pd.DataFrame:
    """An ensemble's declarative spec as rows in the `dem` view's columns:
    slip restored from its 1e-4 m steps, the measurements from 1e-3 steps."""
    n, stages = ensemble["stages_per_trial"], ensemble["stages"]
    rows = []
    for t, (trial, dip, strength, cohesion, arm, depth, density) in enumerate(ensemble["trials"]):
        for k in range(n):
            i = t * n + k
            row = {
                "Trial": trial,
                "Fault_Dip": dip,
                "Sediment_Strength": strength,
                "Cohesion": cohesion,
                "Set": arm,
                "Depth": depth,
                "Density": density,
                "Slip": stages["slip"][i] / 10000,
                "Scarp_Class": stages["scarp_class"][i],
            }
            for m, column in pe.MEASUREMENT_SOURCE_COLUMNS.items():
                step = stages[m][i]
                row[column] = math.nan if step is None else step / 1000
            rows.append(row)
    return pd.DataFrame(rows)


@pytest.fixture(scope="module")
def ensemble_vintage():
    """What the generator reads of a vintage, built from the `stages-101`
    ensemble as the export builds it from the views (§4.1 step 2), with a
    regression row of slope 0.5 and intercept -0.01 m per dip."""
    frame = _ensemble_frame(_ensemble(reference_cases.ensembles(), 101))
    pack = pe.pack_scenario(frame)
    return pe.ReferenceVintage(
        table=pe.build_record_table(frame),
        trial_columns=pack.trial_columns,
        arm_strength_states=pack.arm_strength_states,
        slip_window_bounds=pack.slip_window_bounds,
        coefficients=[
            {"fault_dip": dip, "n": 101, "slope": 0.5, "intercept": -0.01}
            for dip in pack.trial_columns["fault_dip"]
        ],
    )


def _hexed(value):
    """A JSON value with every float as its `float.hex()`, so equality is
    bit for bit."""
    if isinstance(value, float):
        return value.hex()
    if isinstance(value, dict):
        return {key: _hexed(item) for key, item in value.items()}
    if isinstance(value, list | tuple):
        return [_hexed(item) for item in value]
    return value


@pytest.fixture(scope="module")
def quantile_vectors():
    """Vectors of n = 1, 2, 3, 10, and 1000 values on the 0.001 grid from
    reference_cases.py: its duplicates-and-negatives statistics case first,
    then its other 0.001-grid statistics cases, then the ensembles'
    measurement steps."""
    cases = sorted(
        reference_cases.STATISTICS_CASES,
        key=lambda case: case["id"] != "stats-duplicates-negatives",
    )
    pool = [step for case in cases if case["decimals"] == 3 for step in case["steps"]]
    for ensemble in reference_cases.ensembles():
        for m in MEASUREMENTS:
            pool += [step for step in ensemble["stages"][m] if step is not None]
    return {n: sorted(step / 1000 for step in pool[:n]) for n in (1, 2, 3, 10, 1000)}


def test_quantile_linear_is_numpy_linear_bit_for_bit(quantile_vectors):
    """`quantile_linear(v, q/100)` has the `float.hex()` of NumPy's
    `percentile(v, q, method='linear')` for q = 0 to 100, on n = 1, 2, 3,
    10, and 1000, duplicates and negatives included."""
    for n, v in quantile_vectors.items():
        assert len(v) == n
        for q in range(101):
            ours = pe.quantile_linear(v, q / 100)
            assert ours.hex() == float(np.percentile(v, q, method="linear")).hex(), (n, q)
    for n in (3, 10, 1000):
        v = quantile_vectors[n]
        assert min(v) < 0 and len(set(v)) < n, n


def _sample_sd(x: list[float], mean: float) -> float:
    """The §5.4 standard deviation: an explicit loop over the ascending
    values, then one division and one square root."""
    acc = 0.0
    for value in x:
        acc += (value - mean) * (value - mean)
    return math.sqrt(acc / (len(x) - 1))


def _statistics(steps: list[int], divisor: int) -> dict | None:
    """The FR-O2 statistics of one measurement's valid steps, recomputed:
    NumPy's linear percentiles, the integer-sum mean, the §5.4 deviation."""
    if not steps:
        return None
    x = sorted(step / divisor for step in steps)
    mean = float(Fraction(sum(steps), len(steps) * divisor))
    return {
        "median": float(np.percentile(x, 50, method="linear")),
        "p16": float(np.percentile(x, 16, method="linear")),
        "p84": float(np.percentile(x, 84, method="linear")),
        "min": x[0],
        "max": x[-1],
        "mean": mean,
        "sd": _sample_sd(x, mean) if len(x) >= 2 else None,
    }


def test_statistics_cases_match_an_independent_recomputation(synthetic):
    """Each `synthetic.statistics` case: the mean equals
    `float(Fraction(sum(s), n * 10**d))` over its integer steps, the other
    statistics and the 101 percentiles their independent recomputation; with
    no value, statistics and percentiles are null; with one, `sd` is null and
    the median, `p16`, and `p84` equal `min` and `max`."""
    for case in synthetic["statistics"]:
        steps, decimals = case["steps"], case["decimals"]
        stats, percentiles = case["expected"]["statistics"], case["expected"]["percentiles"]
        if not steps:
            assert stats is None and percentiles is None, case["id"]
            continue
        assert stats["mean"] == float(Fraction(sum(steps), len(steps) * 10**decimals)), case["id"]
        assert _hexed(stats) == _hexed(_statistics(steps, STEP_DIVISORS[decimals])), case["id"]
        x = sorted(step / STEP_DIVISORS[decimals] for step in steps)
        numpy_percentiles = [float(np.percentile(x, q, method="linear")) for q in range(101)]
        assert _hexed(percentiles) == _hexed(numpy_percentiles), case["id"]
        if len(steps) == 1:
            assert stats["sd"] is None
            assert stats["median"] == stats["p16"] == stats["p84"] == stats["min"] == stats["max"]


def test_null_rules_on_a_gs6_shaped_and_a_single_valid_fixture(ensemble_vintage):
    """A GS-6-shaped selection — only unclassified slip-0 records, valid 0 in
    every panel — gives null statistics, percentiles, histograms, and
    display; a single valid value gives `sd` null and the median, `p16`, and
    `p84` equal to `min` and `max`."""
    empty = pe.scenario_entry(ensemble_vintage, "GS-6", {"slip_window": {"min": "0", "max": "0"}})
    counts = empty["counts"]
    assert counts["matching_records"] == counts["unclassified"] == 4
    for m in MEASUREMENTS:
        assert counts["per_measurement"][m] == {"valid": 0, "excluded_null": 4}
        for key in ("statistics", "percentiles", "histogram", "display"):
            assert empty[key][m] is None, (key, m)
    assert empty["histogram_log"]["dzw"] is None

    window = {"min": "0.0005", "max": "0.0005"}
    single = pe.scenario_entry(ensemble_vintage, "GS-6", {"slip_window": window})
    assert single["counts"]["matching_records"] == 1
    for m in MEASUREMENTS:
        assert single["counts"]["per_measurement"][m] == {"valid": 1, "excluded_null": 0}
        stats = single["statistics"][m]
        assert stats["sd"] is None and single["display"][m]["sd"] is None
        assert stats["median"] == stats["p16"] == stats["p84"] == stats["min"] == stats["max"]


def test_histograms_against_numpy(synthetic):
    """Per class, each `synthetic.histograms` case's `histogram()` counts
    equal `numpy.histogram` over its steps with the edges the record
    defines."""
    for case in synthetic["histograms"]:
        steps, codes = case["steps"], case["class_codes"]
        table = case["expected"]["histogram"]
        width = table["width_units"] * DISPLAY_STEP_UNITS[case["display_decimals"]]
        edges = [table["first_edge"] + i * width for i in range(table["bins"] + 1)]
        assert edges[0] <= min(steps) and max(steps) < edges[-1], case["id"]
        for c in range(len(SCARP_CLASSES)):
            in_class = [s for s, code in zip(steps, codes, strict=True) if code == c]
            numpy_counts = np.histogram(in_class, bins=edges)[0].tolist()
            assert numpy_counts == [row[c] for row in table["counts"]], (case["id"], c)


def test_log_histograms_against_numpy(synthetic):
    """For the width-panel cases, `histogram_log()` is null exactly when the
    axis is not offered — on the threshold case `maxpos_s = 100 · minpos_s`,
    offered on `100 · minpos_s + 1` — and otherwise, per class, its counts
    equal `numpy.histogram` over the steps of at least 100 with the octave
    edges `first_edge · 2^j`, and `below_counts` the steps below 100."""
    cases = {case["id"]: case for case in synthetic["histograms"]}
    for case_id, extra in (("log-threshold-not-offered", 0), ("log-threshold-offered", 1)):
        positive = [s for s in cases[case_id]["steps"] if s > 0]
        assert max(positive) == LOG_OFFER_RATIO * min(positive) + extra
    assert cases["log-threshold-not-offered"]["expected"]["histogram_log"] is None
    assert cases["log-threshold-offered"]["expected"]["histogram_log"] is not None
    for case in cases.values():
        log = case["expected"]["histogram_log"]
        if case["display_decimals"] != 1:
            assert log is None, case["id"]
            continue
        steps, codes = case["steps"], case["class_codes"]
        positive = [s for s in steps if s > 0]
        offered = bool(positive) and max(positive) > LOG_OFFER_RATIO * min(positive)
        assert (log is not None) == offered, case["id"]
        if log is None:
            continue
        edges = [log["first_edge"] * 2**j for j in range(log["bins"] + 1)]
        for c in range(len(SCARP_CLASSES)):
            in_class = [s for s, code in zip(steps, codes, strict=True) if code == c]
            above = [s for s in in_class if s >= LOG_FIRST_EDGE]
            numpy_counts = np.histogram(above, bins=edges)[0].tolist()
            assert numpy_counts == [row[c] for row in log["counts"]], (case["id"], c)
            below = sum(s < LOG_FIRST_EDGE for s in in_class)
            assert log["below_counts"][c] == below, (case["id"], c)


def test_display_round_on_the_section_7_3_vectors(synthetic):
    """`display_round` on the §7.3 vectors, which reference_cases.py and the
    generator's `synthetic.display_rounding` carry in the same order."""
    vectors = [(repr(v), d) for v, d, _ in DISPLAY_ROUNDING]
    assert vectors == [(repr(v), d) for v, d in reference_cases.DISPLAY_ROUNDING_VECTORS]
    for value, decimals, text in DISPLAY_ROUNDING:
        assert pe.display_round(value, decimals) == text, (value, decimals)
    assert [r["expected"] for r in synthetic["display_rounding"]] == [
        text for _, _, text in DISPLAY_ROUNDING
    ]


@pytest.mark.parametrize("bound", ["0.3", "1.0049", "4.6633", "5.0135"])
def test_stored_bounds_probes(bound):
    """`_stored_bounds` at a recorded slip is exact; a shift of ±1e-14 leaves
    the bound unchanged; of ±1e-12 only the inward shift — up on a lower
    bound, down on an upper one — moves it, by one stored unit."""
    r, k = float(bound), int(Decimal(bound) * 10000)
    assert pe._stored_bounds(r, r) == (k, k)
    for shift in (1e-14, -1e-14):
        assert pe._stored_bounds(r + shift, r + shift) == (k, k), shift
    assert pe._stored_bounds(r + 1e-12, r)[0] == k + 1
    assert pe._stored_bounds(r - 1e-12, r)[0] == k
    assert pe._stored_bounds(r, r - 1e-12)[1] == k - 1
    assert pe._stored_bounds(r, r + 1e-12)[1] == k


def test_stored_bounds_from_decimal():
    """Slip-mode stored bounds from the canonical decimals, exactly: lower
    "0.00005" gives 1, upper "5.01349" 50134 and "5.0135" 50135."""
    assert pe.stored_bounds_from_decimal("0.00005", "5.01349") == (1, 50134)
    assert pe.stored_bounds_from_decimal("0.00005", "5.0135") == (1, 50135)


def _records(ensemble) -> pd.DataFrame:
    """An ensemble's records in artifact order — trials by code point, each
    trial's stages by ascending slip — with each record's stage index taken
    within its trial, grouped by trial identity."""
    n, stages = ensemble["stages_per_trial"], ensemble["stages"]
    rows = []
    for t, (trial, dip, strength, _, arm, depth, density) in enumerate(ensemble["trials"]):
        for k in range(n):
            i = t * n + k
            row = {
                "trial": trial,
                "fault_dip": dip,
                "set": arm,
                "sediment_strength": strength,
                "depth": depth,
                "density": density,
                "slip": stages["slip"][i],
                "scarp_class": stages["scarp_class"][i],
            }
            row.update({m: stages[m][i] for m in MEASUREMENTS})
            rows.append(row)
    frame = pd.DataFrame(rows).astype({m: "object" for m in MEASUREMENTS})
    frame = frame.sort_values(["trial", "slip"], kind="stable").reset_index(drop=True)
    frame["stage_index"] = frame.groupby("trial").cumcount()
    return frame


def _select(records: pd.DataFrame, inputs: dict, windows: dict | None) -> pd.DataFrame:
    """The §5.3 selection recomputed with pandas: the trial conditions; the
    window over stored slip steps — slip mode from the canonical decimals,
    offset mode from each dip's window with the 1e-9 guard; the one-state
    rule per trial identity; then the scarp-type filter."""
    pairs = {(s["set"], s["sediment_strength"]) for s in inputs["sediment"]}
    keep = (
        records["fault_dip"].isin(inputs["fault_dip"])
        & records["depth"].isin(inputs["depth"])
        & records["density"].isin(inputs["density"])
        & pd.Series(
            [
                (a, s) in pairs
                for a, s in zip(records["set"], records["sediment_strength"], strict=True)
            ],
            index=records.index,
        )
    )
    if inputs["entry_mode"] == "offset":
        bounds = {
            int(dip): (
                math.ceil(w["lo"] / 0.0001 - 1e-9),
                math.floor(w["hi"] / 0.0001 + 1e-9),
            )
            for dip, w in windows.items()
        }
        lo = records["fault_dip"].map(lambda dip: bounds[dip][0])
        hi = records["fault_dip"].map(lambda dip: bounds[dip][1])
        keep &= (records["slip"] >= lo) & (records["slip"] <= hi)
    elif inputs["slip_window"] is not None:
        lo = math.ceil(Fraction(inputs["slip_window"]["min"]) * 10000)
        hi = math.floor(Fraction(inputs["slip_window"]["max"]) * 10000)
        keep &= (records["slip"] >= lo) & (records["slip"] <= hi)
    chosen = records[keep]
    if inputs["population"] == "one_state_per_trial" and not chosen.empty:
        chosen = chosen.loc[chosen.groupby("trial")["slip"].idxmax()]
    if set(inputs["scarp_class"]) != set(SCARP_CLASSES):
        chosen = chosen[chosen["scarp_class"].isin(inputs["scarp_class"])]
    return chosen.sort_values(["trial", "stage_index"])


def _class_code(name) -> int:
    """A class name's code, 255 for an unclassified record (§3.1)."""
    if name is None or (isinstance(name, float) and math.isnan(name)):
        return 255
    return SCARP_CLASSES.index(name)


def _expected_of(chosen: pd.DataFrame) -> dict:
    """`counts`, `selection`, and `statistics` of a recomputed selection."""
    matching = len(chosen)
    per_measurement, statistics = {}, {}
    for m in MEASUREMENTS:
        steps = [int(s) for s in chosen[m] if s is not None and not pd.isna(s)]
        per_measurement[m] = {"valid": len(steps), "excluded_null": matching - len(steps)}
        statistics[m] = _statistics(steps, 1000)
    return {
        "counts": {
            "matching_records": matching,
            "unclassified": sum(_class_code(c) == 255 for c in chosen["scarp_class"]),
            "per_measurement": per_measurement,
        },
        "selection": {
            "identities": [
                [trial, int(stage), _class_code(name)]
                for trial, stage, name in zip(
                    chosen["trial"], chosen["stage_index"], chosen["scarp_class"], strict=True
                )
            ]
        },
        "statistics": statistics,
    }


def _default(ensemble) -> dict:
    """The ensemble's default scenario (§5.6): every dip, pair, depth,
    density, and class; the inactive slip-mode window; all stages."""
    trials = ensemble["trials"]
    return {
        "fault_dip": sorted({row[1] for row in trials}),
        "sediment": [
            {"set": arm, "sediment_strength": strength}
            for arm, strength in sorted({(row[4], row[2]) for row in trials})
        ],
        "depth": sorted({row[5] for row in trials}),
        "density": sorted({row[6] for row in trials}),
        "entry_mode": "slip",
        "slip_window": None,
        "offset_max": None,
        "population": "all_stages",
        "scarp_class": list(SCARP_CLASSES),
    }


def _diagnosed(records, inputs: dict, windows: dict | None, default: dict) -> list[str]:
    """The §5.3 empty-result diagnostic recomputed: each group that differs
    from its default, reset alone, in the fixed order; the population never
    relaxed; the window relaxed to the inactive slip-mode window."""
    found = []
    for key, members in CONDITION_GROUPS:
        if all(inputs[m] == default[m] for m in members):
            continue
        relaxed = {**inputs, **{m: default[m] for m in members}}
        if not _select(records, relaxed, None if key == "window" else windows).empty:
            found.append(key)
    return found


@pytest.mark.parametrize("n", reference_cases.ENSEMBLE_STAGE_COUNTS, ids=lambda n: f"ensemble-{n}")
def test_synthetic_ensembles_match_an_independent_recomputation(synthetic, n):
    """Every case of each `synthetic.ensembles` record (N = 2, 100, 101, 102)
    — each population under an inactive window, a slip window, and
    offset-mode per-dip windows, the first- and last-trial masks, inclusive
    endpoints, empty matches, and the one-state rule under a scarp-type
    filter — equals an independent pandas recomputation grouped by trial
    identity, never by flat-stride arithmetic: `counts`, `selection`,
    `statistics`, and, on an empty result, `diagnosed_conditions`."""
    ensemble = _ensemble(synthetic["ensembles"], n)
    records = _records(ensemble)
    default = _default(ensemble)
    cases = {}
    for case in ensemble["cases"]:
        inputs, windows = case["inputs"], case["windows"]
        chosen = _select(records, inputs, windows)
        expected = case["expected"]
        recomputed = _expected_of(chosen)
        name = case["id"].removeprefix(f"{ensemble['id']}-")
        assert expected["counts"] == recomputed["counts"], name
        assert expected["selection"] == recomputed["selection"], name
        assert _hexed(expected["statistics"]) == _hexed(recomputed["statistics"]), name
        diagnosed = _diagnosed(records, inputs, windows, default) if chosen.empty else None
        assert expected["diagnosed_conditions"] == diagnosed, name
        cases[name] = (case, chosen)

    for population in ("allstages", "onestate"):
        for window in ("nowindow", "slip", "offset", "nomatch"):
            assert f"{population}-{window}" in cases
    trials = [row[0] for row in ensemble["trials"]]
    assert set(cases["firsttrial"][1]["trial"]) == {trials[0]}
    assert set(cases["lasttrial"][1]["trial"]) == {trials[-1]}
    case, chosen = cases["allstages-slip"]
    window = case["inputs"]["slip_window"]
    for end in (window["min"], window["max"]):
        assert int(Fraction(end) * 10000) in set(chosen["slip"]), end
    for name in ("allstages-nomatch", "onestate-nomatch", "allstages-storedempty"):
        assert cases[name][1].empty, name
    assert not cases["onestate-classfilter"][1].empty


def test_conversion_range_flags(synthetic):
    """Each `synthetic.conversion` row's converted window and range flag
    equal their recomputation (§5.5): the back-projection in float64, the
    stored bounds with the 1e-9 guard, and `max_s` by JavaScript rounding;
    the cases produce all three flags, `hi_s = max_s` in range and
    `max_s + 1` partly out."""
    flags = {}
    for case in synthetic["conversion"]:
        bounds = case["slip_window_bounds"]
        step = bounds["recording_step"]
        max_s = math.floor(bounds["max"] / step + 0.5)
        o_max = float(case["offset_max"])
        windows = {w["fault_dip"]: w for w in case["expected"]["converted_windows"]}
        assert set(windows) == {row["fault_dip"] for row in case["coefficients"]}
        for row in case["coefficients"]:
            lo = (0.0 - row["intercept"]) / row["slope"]
            hi = (o_max - row["intercept"]) / row["slope"]
            lo_s = math.ceil(lo / step - 1e-9)
            hi_s = math.floor(hi / step + 1e-9)
            if lo_s >= 0 and hi_s <= max_s:
                flag = "in_range"
            elif hi_s < 0 or lo_s > max_s:
                flag = "out_of_range"
            else:
                flag = "partly_out"
            window = windows[row["fault_dip"]]
            assert (window["window_lo"].hex(), window["window_hi"].hex()) == (lo.hex(), hi.hex())
            assert window["range_flag"] == flag, (case["id"], row["fault_dip"])
            flags.setdefault(case["id"], []).append(flag)
    assert set(flags["conv-three-flags"]) == {"in_range", "partly_out", "out_of_range"}
    assert flags["conv-hi-at-max"] == ["in_range"]
    assert flags["conv-hi-above-max"] == ["partly_out"]


def test_selection_switches_to_a_signature_above_10000_records():
    """`selection` holds the identities `[trial, stage_index, class_code]` —
    class code 255 for an unclassified record — up to 10,000 records, and
    above them the SHA-256 signature of their `trial;stage_index;class_code`
    lines with their count."""
    n = 10_001
    classes = [None, *(SCARP_CLASSES[k % len(SCARP_CLASSES)] for k in range(1, n))]
    measured = [math.nan, *(k / 1000 for k in range(1, n))]
    frame = pd.DataFrame(
        {
            "Trial": ["T0"] * n,
            "Fault_Dip": [30] * n,
            "Sediment_Strength": ["Weak"] * n,
            "Cohesion": ["A"] * n,
            "Set": ["Homogeneous"] * n,
            "Depth": [3] * n,
            "Density": ["Dense"] * n,
            "Slip": [k / 10000 for k in range(n)],
            "Scarp_Height": measured,
            "DZW": measured,
            "Scarp_Dip": measured,
            "Scarp_Class": classes,
        }
    )
    table = pe.build_record_table(frame)
    identities = [["T0", k, _class_code(name)] for k, name in enumerate(classes)]
    assert identities[0] == ["T0", 0, 255]
    assert pe.selection_record(table, np.arange(10_000)) == {"identities": identities[:10_000]}
    text = "\n".join(f"{trial};{stage};{code}" for trial, stage, code in identities)
    assert pe.selection_record(table, np.arange(n)) == {
        "signature": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        "count": n,
    }


def test_a_gs4_style_diagnosed_condition_set(ensemble_vintage):
    """A GS-4-style scenario — one sediment pair and one depth that no trial
    shares — matches nothing; relaxing the sediment alone or the depth alone
    yields matches, so it reports `["sediment", "depth"]`, as an independent
    recomputation does."""
    changes = {"sediment": [("Homogeneous", "Strong")], "depth": [5]}
    entry = pe.scenario_entry(ensemble_vintage, "GS-4", changes)
    assert entry["counts"]["matching_records"] == 0
    assert entry["diagnosed_conditions"] == ["sediment", "depth"]
    ensemble = _ensemble(reference_cases.ensembles(), 101)
    assert _diagnosed(_records(ensemble), entry["inputs"], None, _default(ensemble)) == [
        "sediment",
        "depth",
    ]


def test_gs1_inputs_serialize_to_the_golden_bytes(ensemble_vintage):
    """The generator's GS-1 `inputs` serialize to the golden bytes of §5.6."""
    entry = pe.scenario_entry(ensemble_vintage, "GS-1", dict(pe.GOLDEN_SCENARIOS)["GS-1"])
    text = json.dumps(entry["inputs"], sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    assert text == GS1_GOLDEN


@pytest.mark.parametrize("value", [math.nan, math.inf, -math.inf], ids=["nan", "inf", "minus-inf"])
def test_a_non_finite_value_fails_finite_reference_values(value):
    """A non-finite number anywhere in the reference results fails
    `finite-reference-values`, naming where; finite values pass."""
    references = {"scenarios": [{"statistics": {"dzw": {"mean": value}}}]}
    with pytest.raises(pe.ExportFailure) as failure:
        pe.assert_finite_reference_values(references)
    assert failure.value.report() == (
        f"finite-reference-values: FAILED — references.scenarios[0].statistics.dzw.mean "
        f"is {value!r}"
    )
    pe.assert_finite_reference_values({"scenarios": [{"mean": 1.5, "n": 3, "sd": None}]})


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
