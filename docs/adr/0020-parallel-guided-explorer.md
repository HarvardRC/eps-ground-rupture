# ADR-0020: Build the guided explorer beside the existing scenario page

- **Status:** Decided for the implementation candidate, 2026-11-04.
- **Decider:** Implementation agent under the owner's explicit
  delegation to implement autonomously; owner review remains pending.
- **Authority:** The owner requested a different page path and
  preservation of `/scenario/` after approving the guided prototypes.

## Context

The reviewed journey helps a reader build and review a scenario before
seeing results. The existing page applies individual edits immediately.
Replacing it now would remove the working comparison page and entangle
two different interaction contracts.

## Decision

Add `/explore/` to the same MkDocs site as an unadvertised
implementation candidate. Retain `/scenario/`, its assets, and
its current behavior.
Give the new page a separate entry point, stylesheet, and browser state.
Reuse the existing data decoder, conversion, query, statistics, charts,
notices, and download package code. Both pages use the same pinned data
release. Do not copy or approximate scientific calculations.

The guided page owns a draft and a separately confirmed result. The
draft includes both movement modes and result refinements. Only review
followed by confirmation computes a replacement result.

The first candidate deliberately has no URL restore, imported scenarios,
sample replacement, persistent drafts, or field overlay. It links to
the existing page and relevant dashboards for complementary exploration.
These are candidate limits, not removals from the wider product scope.

## Alternatives and consequences

Reworking the existing page in place would share more presentation code
but would remove the comparison surface. A separate application stack
would duplicate calculations and add dependencies. A separate interface
over shared calculation modules gives a bounded implementation and
keeps the existing numerical tests authoritative.

The new state and interface need their own verification. Success in
the old page's tests does not prove that the guided journey works.
Publishing this candidate as the primary product remains a later step.

## References

- [Product definition](../app/pdd.md).
- [Prototype review record](../app/scenario-journey-prototype.md).
- [Native application](0010-native-client-side-scenario-app.md).
- [Unadvertised prototype](0017-unadvertised-prototype-before-public-release.md).
- [Guided detailed design](../app/guided-journey-ddd.md).
