# PRD follow-ups — parked until the v2 rewrite is finished

Recorded 2026-10-15, from the adversarial review of FR-G2 (the
scarp-class palette definition). To be revisited after the owner
completes the prd-v2 rewrite.

**Standing decision (owner, 2026-10-15):** the PRD does not refer to
Python modules or other code artifacts. Code-level pointers (module
names, constants, file paths) belong in the high-level design or the
detailed design document, not in requirements.

## 1. FR-G2 provenance pointer is thinner than it looks

FR-G2 cites only ADR-0007 as the record of the canonical scarp-class
colors. ADR-0007 itself records just the three parent hexes and defers
the rest to "canonical values in `config.py` and the workbooks". The
complete six-hex record lives in `docs/dashboards/visual-identity.md`
(codified 2026-08-16) and in the Python package's `SCARP_CLASS_PALETTE`
constant.

The PRD's own palette table now records all six values, so nothing is
lost functionally. If the chain should be visible in the PRD, cite the
visual-identity note (a design document); per the standing decision
above, the `SCARP_CLASS_PALETTE` / `config.py` pointer belongs in the
HLDD or detailed design instead.

## 2. ADR-0007 carries a stale "Kern County is red" clause

ADR-0007 decision 1 says field-event overlays are "black/white fills,
star/shape marks; **Kern County is red** and drawn in front". The later
visual-identity note (2026-08-16, which explicitly extends and codifies
ADR-0007) says field data is always black on the model's color, and the
PRD's FR-O5 requires black. The Dashboard 4 build also draws Kern
County black. Black is current; the red clause is the stale part (it
contradicts its own sentence, since Simple is red `#ed2024`).

ADR-0007's status line says a reversed convention needs a new ADR, so
the cleanup is either a short superseding ADR or an errata note inside
ADR-0007. Repo-docs housekeeping, outside the PRD.

## 3. Terminology: "scarp type" vs "scarp class"

The PRD says "scarp type(s)" about 25 times and "scarp class(es)" about
7 times, sometimes both within one section (FR-G2's title vs its
prose). The paper, the dashboards, and the code uniformly say "scarp
class". Options: a one-line synonym note near first use ("scarp type —
called 'scarp class' in the research code and dashboards"), or
normalizing the PRD to one term.

Related label alignment: FR-G2 coins a "scarp-family" view while the
existing Tableau calculated field is named `Scarp_Class Family`
(defined for Dashboard 5, unused so far). The PDD fixes the label;
keep the two aligned when it does.
