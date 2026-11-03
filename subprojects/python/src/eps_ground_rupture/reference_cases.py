"""The synthetic reference cases: vintage-independent inputs of the
reference-results file's `synthetic` record (docs/app/ddd.md §3.6,
Synthetic cases).

This module builds the cases' declarative inputs only, deterministically
and without reading any data; the reference generator in
`product_export.py` computes every `expected` value from them, and the
fixture lane of `test_reference_results.py` (§7.3) shares the same inputs
for its independent recomputation.

- :func:`ensembles` — the four ensembles `stages-2`, `stages-100`,
  `stages-101`, and `stages-102`, each a declarative vintage spec of 2 to
  8 trials with exactly its `stages_per_trial` (N) stages per trial, and
  its selection cases;
- :data:`STATISTICS_CASES`, :data:`HISTOGRAM_CASES`,
  :data:`DISPLAY_ROUNDING_VECTORS`, and :data:`CONVERSION_CASES` — the
  algorithm cases of `synthetic.statistics`, `synthetic.histograms`,
  `synthetic.display_rounding`, and `synthetic.conversion`.

Scenario inputs are plain records with the DD-11 keys (§5.6); the
generator writes each through `canonical_scenario()`.
"""

from __future__ import annotations

from .config import SCARP_CLASSES

# --------------------------------------------------------------------------
# Ensembles (§3.6, Synthetic cases: `ensembles`)
# --------------------------------------------------------------------------

#: The four ensembles' stage counts N, in `synthetic.ensembles` order.
ENSEMBLE_STAGE_COUNTS: tuple[int, ...] = (2, 100, 101, 102)

#: What each ensemble's N exercises.
ENSEMBLE_PURPOSES: dict[int, str] = {
    2: "N = 2, the smallest stage count the Count contract allows",
    100: "N = 100, one stage fewer than the shipped vintage's 101",
    101: "N = 101, the shipped vintage's stage count",
    102: "N = 102, one stage more than the shipped vintage's 101",
}

#: The trial rows shared by every ensemble, in ascending code-point order
#: of `trial`: [trial, fault_dip, sediment_strength, cohesion, set, depth,
#: density] (the §3.1 trial-table columns without `model_family`). Every
#: (set, sediment_strength) pair occurs on one trial only, so the pairs
#: (Homogeneous, Strong), (Heterogeneous, Strong), and (Homogeneous, Weak)
#: are three distinct trials and a selection of (Homogeneous, Strong)
#: alone matches only the first trial.
ENSEMBLE_TRIALS: tuple[tuple[str, int, str, str, str, int, str], ...] = (
    ("T0", 30, "Strong", "A", "Homogeneous", 3, "Dense"),
    ("T1", 30, "Strong", "B", "Heterogeneous", 5, "Loose"),
    ("T2", 40, "Weak", "A", "Homogeneous", 3, "Medium"),
    ("T3", 40, "Moderate", "B", "Homogeneous", 5, "Dense"),
    ("T4", 60, "Weak", "A", "Heterogeneous", 3, "Loose"),
    ("T5", 60, "Moderate", "B", "Heterogeneous", 10, "Medium"),
)

#: Each trial's first slip, in 1e-4 m steps: a slip-0 initial state
#: (unclassified, every measurement null) or a classified first stage.
_TRIAL_BASE_SLIP: tuple[int, ...] = (0, 5, 0, 20000, 0, 0)

#: Each trial's slip extent in 1e-4 m steps; the stage spacing is
#: ``extent // (N - 1)``, so spacings differ between trials.
_TRIAL_SLIP_EXTENT: tuple[int, ...] = (30000, 26000, 34000, 24000, 28000, 32000)

#: The class deselected by the partial scarp-type filter case.
_PARTIAL_FILTER_DROPS = SCARP_CLASSES[-1]

#: The offset entry of the offset-mode ensemble cases. Their per-dip
#: windows are given explicitly, so this canonical decimal enters no
#: computation; the parity harness round-trips it through `parseScenario`.
_ENSEMBLE_OFFSET_MAX = "1"


def ensemble_id(n: int) -> str:
    return f"stages-{n}"


def _stage_slip(t: int, k: int, n: int) -> int:
    return _TRIAL_BASE_SLIP[t] + k * (_TRIAL_SLIP_EXTENT[t] // (n - 1))


def _stage_record(t: int, k: int, n: int) -> dict[str, object]:
    """Stage k of trial t: slip in 1e-4 m steps, measurements in 1e-3 m (or
    1e-3 degree) steps or None, and the class name or None. A slip-0 stage
    is unclassified with every measurement null; elsewhere some
    measurements are null, so the two-count model has nulls to count."""
    slip = _stage_slip(t, k, n)
    if slip == 0:
        return {
            "slip": 0,
            "scarp_height": None,
            "dzw": None,
            "scarp_dip": None,
            "scarp_class": None,
        }
    return {
        "slip": slip,
        "scarp_height": None if (k + t) % 9 == 4 else 50 + 7 * k + 311 * t,
        "dzw": None if (k + 2 * t) % 7 == 3 else 20 + 13 * k * (t + 1),
        "scarp_dip": None if (k + t) % 5 == 2 else 30000 + 450 * k + 1777 * t,
        "scarp_class": SCARP_CLASSES[(k + 2 * t) % len(SCARP_CLASSES)],
    }


def _check_trial_boundaries(records: list[list[dict[str, object]]]) -> None:
    """The last stage of each trial and the first stage of the next differ
    in slip and in every measurement non-null in both (§3.6)."""
    for before, after in zip(records, records[1:], strict=False):
        last, first = before[-1], after[0]
        if last["slip"] == first["slip"]:
            raise AssertionError("adjacent trials share a boundary slip")
        for name in ("scarp_height", "dzw", "scarp_dip"):
            if last[name] is not None and first[name] is not None and last[name] == first[name]:
                raise AssertionError(f"adjacent trials share a boundary {name}")


def _decimal(steps: int) -> str:
    """The canonical decimal (grammar G, §5.7) of a slip in 1e-4 m steps."""
    whole, frac = divmod(steps, 10000)
    digits = f"{frac:04d}".rstrip("0")
    return f"{whole}.{digits}" if digits else str(whole)


def _default_inputs() -> dict[str, object]:
    """The ensemble's default scenario (§5.6): every dip, pair, depth,
    density, and class; the inactive window; all stages."""
    return {
        "fault_dip": sorted({row[1] for row in ENSEMBLE_TRIALS}),
        "sediment": sorted({(row[4], row[2]) for row in ENSEMBLE_TRIALS}),
        "depth": sorted({row[5] for row in ENSEMBLE_TRIALS}),
        "density": sorted({row[6] for row in ENSEMBLE_TRIALS}),
        "entry_mode": "slip",
        "slip_window": None,
        "offset_max": None,
        "population": "all_stages",
        "scarp_class": list(SCARP_CLASSES),
    }


def _with(base: dict[str, object], **changes: object) -> dict[str, object]:
    out = dict(base)
    out.update(changes)
    return out


def build_ensemble(n: int) -> dict[str, object]:
    """One ensemble record {`id`, `purpose`, `stages_per_trial`,
    `scarp_classes`, `trials`, `stages`, `cases`}, each case
    {`id`, `inputs`, `windows`} — the generator adds `expected`."""
    eid = ensemble_id(n)
    records = [[_stage_record(t, k, n) for k in range(n)] for t in range(len(ENSEMBLE_TRIALS))]
    _check_trial_boundaries(records)
    flat = [record for trial in records for record in trial]
    stages = {
        name: [record[name] for record in flat]
        for name in ("slip", "scarp_height", "dzw", "scarp_dip", "scarp_class")
    }
    max_slip = max(stages["slip"])  # type: ignore[type-var]

    default = _default_inputs()
    one_state = _with(default, population="one_state_per_trial")

    # A slip window whose endpoints are recorded slips: T1's second stage and
    # T0's final stage, so both inclusive endpoints match a record.
    window_lo = _stage_slip(1, 1, n)
    window_hi = _stage_slip(0, n - 1, n)
    slip_window = {"min": _decimal(window_lo), "max": _decimal(window_hi)}
    # Per-dip windows on recorded slips; dip 60's lies above every recorded
    # slip, an `out_of_range` window whose dip contributes nothing.
    above = max_slip + 100
    windows = {
        "30": {"lo": window_lo / 10000, "hi": window_hi / 10000},
        "40": {"lo": _stage_slip(3, 0, n) / 10000, "hi": _stage_slip(2, n - 1, n) / 10000},
        "60": {"lo": above / 10000, "hi": (above + 5000) / 10000},
    }
    offset = {
        "entry_mode": "offset",
        "slip_window": None,
        "offset_max": _ENSEMBLE_OFFSET_MAX,
    }
    # No recorded slip lies in 0.0001-0.0004 m (first stages are at 0 or
    # 0.0005 m): a no-match window.
    no_match = {"min": "0.0001", "max": "0.0004"}
    # A window empty in stored units: lo_s = 2 > hi_s = 1.
    stored_empty = {"min": "0.00011", "max": "0.00019"}

    # One state per trial under a scarp-type filter that deselects the class
    # of T0's highest in-window stage, so T0 contributes nothing.
    t0_in_window = [r for r in records[0] if window_lo <= r["slip"] <= window_hi]  # type: ignore[operator]
    dropped = t0_in_window[-1]["scarp_class"]
    contributing = [
        trial[-1]
        for trial in (
            [r for r in rs if window_lo <= r["slip"] <= window_hi]  # type: ignore[operator]
            for rs in records[1:]
        )
        if trial and trial[-1]["scarp_class"] != dropped
    ]
    if dropped is None or not contributing:
        raise AssertionError("the class-filter case does not discriminate")

    cases: list[tuple[str, dict[str, object], dict[str, object] | None]] = [
        ("allstages-nowindow", default, None),
        ("onestate-nowindow", one_state, None),
        ("allstages-slip", _with(default, slip_window=slip_window), None),
        ("onestate-slip", _with(one_state, slip_window=slip_window), None),
        ("allstages-offset", _with(default, **offset), windows),
        ("onestate-offset", _with(one_state, **offset), windows),
        ("allstages-nomatch", _with(default, slip_window=no_match), None),
        ("onestate-nomatch", _with(one_state, slip_window=no_match), None),
        ("firsttrial", _with(default, sediment=[("Homogeneous", "Strong")]), None),
        ("lasttrial", _with(default, depth=[10]), None),
        (
            "onestate-classfilter",
            _with(
                one_state,
                slip_window=slip_window,
                scarp_class=[c for c in SCARP_CLASSES if c != dropped],
            ),
            None,
        ),
        (
            "allstages-classpartial",
            _with(default, scarp_class=[c for c in SCARP_CLASSES if c != _PARTIAL_FILTER_DROPS]),
            None,
        ),
        ("allstages-storedempty", _with(default, slip_window=stored_empty), None),
        ("allstages-emptygroup", _with(default, depth=[]), None),
    ]
    return {
        "id": eid,
        "purpose": ENSEMBLE_PURPOSES[n],
        "stages_per_trial": n,
        "scarp_classes": list(SCARP_CLASSES),
        "trials": [list(row) for row in ENSEMBLE_TRIALS],
        "stages": stages,
        "cases": [
            {"id": f"{eid}-{name}", "inputs": inputs, "windows": case_windows}
            for name, inputs, case_windows in cases
        ],
    }


def ensembles() -> list[dict[str, object]]:
    """The four ensembles in `synthetic.ensembles` order."""
    return [build_ensemble(n) for n in ENSEMBLE_STAGE_COUNTS]


# --------------------------------------------------------------------------
# Statistics (§3.6, Synthetic cases: `statistics`)
# --------------------------------------------------------------------------

#: Records {`id`, `decimals`, `steps`}: n = 0 (both expected members null),
#: n = 1, and n = 2, with duplicate and negative values.
STATISTICS_CASES: tuple[dict[str, object], ...] = (
    {"id": "stats-n0", "decimals": 3, "steps": []},
    {"id": "stats-n1", "decimals": 3, "steps": [1234]},
    {"id": "stats-n1-negative", "decimals": 3, "steps": [-182]},
    {"id": "stats-n2", "decimals": 3, "steps": [700, -45]},
    {"id": "stats-n2-duplicate", "decimals": 3, "steps": [512, 512]},
    {"id": "stats-duplicates-negatives", "decimals": 3, "steps": [5, -3, 5, 0, -3, 12, 5, -182]},
    {"id": "stats-slip-n1", "decimals": 4, "steps": [50135]},
    {"id": "stats-slip-n2", "decimals": 4, "steps": [50135, 1]},
    {"id": "stats-slip-duplicates", "decimals": 4, "steps": [468, 0, 468, 1001, 0, 50135]},
)


# --------------------------------------------------------------------------
# Histograms (§3.6, Synthetic cases: `histograms`)
# --------------------------------------------------------------------------


def _histogram_case(
    case_id: str, display_decimals: int, steps: list[int], class_codes: list[int] | None = None
) -> dict[str, object]:
    codes = (
        class_codes
        if class_codes is not None
        else [i % len(SCARP_CLASSES) for i in range(len(steps))]
    )
    return {
        "id": case_id,
        "display_decimals": display_decimals,
        "steps": steps,
        "class_codes": codes,
    }


#: Records {`id`, `display_decimals`, `steps`, `class_codes`}: the linear
#: cases — constant data, a zero interquartile range with distinct values,
#: a width forced up by the 60-bin cap, values on internal edges, a negative
#: minimum, n = 1, and n = 2 — and the logarithmic cases, each with
#: `display_decimals` 1. Cases with `display_decimals` 1 have no negative
#: step.
HISTOGRAM_CASES: tuple[dict[str, object], ...] = (
    _histogram_case("hist-constant", 2, [1530, 1530, 1530, 1530]),
    _histogram_case("hist-zero-iqr-distinct", 2, [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1240]),
    _histogram_case("hist-bin-cap", 2, [*range(0, 100, 2), 400000]),
    _histogram_case("hist-internal-edges", 1, [0, 100, 200, 300, 400, 500, 600, 700, 800, 900]),
    _histogram_case("hist-negative-minimum", 2, [-182, -150, -40, 0, 35, 120, 310, 455, 900]),
    _histogram_case("hist-dip-n1", 0, [45123]),
    _histogram_case("hist-n1", 2, [777]),
    _histogram_case("hist-n2", 1, [130, 2410]),
    _histogram_case("log-below-and-zeros", 1, [0, 0, 7, 55, 99, 100, 350, 1600, 25000]),
    _histogram_case("log-first-edge-between", 1, [300, 450, 700, 2600, 31000, 64000]),
    _histogram_case("log-threshold-not-offered", 1, [0, 120, 500, 3000, 12000]),
    _histogram_case("log-threshold-offered", 1, [0, 120, 500, 3000, 12001]),
    _histogram_case("log-on-edges", 1, [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600, 51200]),
    _histogram_case("log-all-zero", 1, [0, 0, 0, 0]),
)


# --------------------------------------------------------------------------
# Display rounding (§3.6, Synthetic cases: `display_rounding`; §7.3)
# --------------------------------------------------------------------------

#: The display-rounding vectors of docs/app/ddd.md §7.3, in that order, as
#: (value, decimals); the generator writes each `expected` by
#: `display_round` and each `id` as `round-<decimals>-<repr(value)>`.
DISPLAY_ROUNDING_VECTORS: tuple[tuple[float, int], ...] = (
    (3.635, 2),
    (1.005, 2),
    (2.675, 2),
    (2.175, 2),
    (4.315, 2),
    (3.6350000000000002, 2),
    (3.6349999999999993, 2),
    (-0.055, 2),
    (-0.004, 2),
    (-0.0, 2),
    (0.005, 2),
    (-0.005, 2),
    (1e-7, 2),
    (0.30000000000000004, 2),
    (45.85, 1),
    (89.5, 0),
    (-12.5, 0),
    (2.5, 0),
    (5.0135, 3),
)


# --------------------------------------------------------------------------
# Conversion (§3.6, Synthetic cases: `conversion`)
# --------------------------------------------------------------------------

#: The shipped vintage's `slip_window_bounds` shape: max_s = 50,135.
_CONVERSION_BOUNDS: dict[str, float] = {"max": 5.0135, "recording_step": 0.0001}

#: Records {`id`, `slip_window_bounds`, `coefficients`, `offset_max`}: rows
#: producing all three range flags, among them an `out_of_range` row with
#: intercept -6 m; `hi_s = max_s` (`in_range`) against `hi_s = max_s + 1`
#: (`partly_out`); `offset_max` "0"; and `offset_max` "1000" on a row of
#: slope 0.3 and intercept -0.02.
CONVERSION_CASES: tuple[dict[str, object], ...] = (
    {
        "id": "conv-three-flags",
        "slip_window_bounds": _CONVERSION_BOUNDS,
        "coefficients": [
            {"fault_dip": 30, "slope": 0.5, "intercept": -0.01},
            {"fault_dip": 40, "slope": 0.7, "intercept": -0.01},
            {"fault_dip": 50, "slope": 1.0, "intercept": -6.0},
        ],
        "offset_max": "3",
    },
    {
        "id": "conv-hi-at-max",
        "slip_window_bounds": _CONVERSION_BOUNDS,
        "coefficients": [{"fault_dip": 45, "slope": 1.0, "intercept": 0.0}],
        "offset_max": "5.0135",
    },
    {
        "id": "conv-hi-above-max",
        "slip_window_bounds": _CONVERSION_BOUNDS,
        "coefficients": [{"fault_dip": 45, "slope": 1.0, "intercept": 0.0}],
        "offset_max": "5.0136",
    },
    {
        "id": "conv-offset-zero",
        "slip_window_bounds": _CONVERSION_BOUNDS,
        "coefficients": [{"fault_dip": 30, "slope": 0.5, "intercept": -0.01}],
        "offset_max": "0",
    },
    {
        "id": "conv-offset-1000",
        "slip_window_bounds": _CONVERSION_BOUNDS,
        "coefficients": [{"fault_dip": 20, "slope": 0.3, "intercept": -0.02}],
        "offset_max": "1000",
    },
)
