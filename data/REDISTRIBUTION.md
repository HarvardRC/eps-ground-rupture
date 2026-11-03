# Terms for the distributed data exports

This file sets out the terms under which the Ground Rupture Explorer's
derived data exports are distributed: the files of each data vintage,
published as assets of this repository's `data-vN` prereleases and
served by the companion site to the scenario page. Every vintage
carries a byte-for-byte copy of this file as its
`data-terms-<hash>.txt`, and the vintage's release notes repeat it.

Assumed 2026-11-03: code Apache-2.0, prose CC BY 4.0, derived data exports CC BY 4.0 with per-source attribution — pending research-group confirmation

These terms are assumed: they are the project's current licensing,
which the project owner applies while the research group reviews the
prototype. The licensing decision is deferred until that review, as
the repository's ADR-0017 records; a later vintage will carry the
confirmed terms. The assumed terms are not evidence that any source
permits redistribution.

## Terms

| Material | Terms |
|---|---|
| Code — the Python pipeline, the scenario application, the site's build configuration, scripts and styling | Apache-2.0 (the repository's `LICENSE`) |
| Prose — the companion site's written content and the repository's documentation | CC BY 4.0 (the repository's `LICENSE-docs`) |
| Derived data exports — the files of each data vintage | CC BY 4.0, with attribution to each source an export draws on (below) |

The raw input datasets are not redistributed here: they stay with their
publishers, under their own terms. `data/README.md` names each one.

Each source's own terms follow, one line per source, as far as they
are established.

Source DEM: Open Data Commons Attribution License (ODC-By) — https://doi.org/10.17603/ds2-xpq0-gw80; attribution: Chiama et al. (2024a, 2024b), Homogeneous and Heterogeneous 2D DEM Experiments, DesignSafe-CI, https://doi.org/10.17603/ds2-xpq0-gw80 and https://doi.org/10.17603/ds2-gfsj-pp60

Source FDHI: CC0 1.0 — https://dataverse.ucla.edu/dataset.xhtml?persistentId=doi:10.25346/S6/Y4F9LJ; attribution: Sarmiento et al. (2021), Flatfiles and Related Digital Products for the Fault Displacement Hazard Initiative Database, Release 3 dated 19 July 2022, UCLA Garrick Institute, https://doi.org/10.25346/S6/Y4F9LJ

Source SURE: CC BY 4.0 — https://doi.org/10.5281/zenodo.7020265; attribution: Nurminen et al. (2022), SURE 2.0, Zenodo, https://doi.org/10.5281/zenodo.7020265, CC BY 4.0, modified

Source Kern County: written permission of its compiler, 2026-09-18: the rows may be redistributed with the code and data — https://github.com/HarvardRC/eps-ground-rupture/blob/main/docs/datasets.md; attribution: Chiama et al. (2025), https://doi.org/10.1177/87552930251346434; Buwalda and St. Amand (1955); the FDHI flatfile

## Attribution

When you reuse an export, credit the sources it draws on and cite the
study the exports serve:

> Chiama, K., Bednarz, W., Moss, R., Plesch, A., and Shaw, J. H.
> (2025). "Quantifying relationships between fault parameters and
> rupture characteristics associated with thrust and reverse fault
> earthquakes." *Earthquake Spectra*, 41(5), 3977–4014.
> DOI: [10.1177/87552930251346434](https://doi.org/10.1177/87552930251346434)

| Export | Draws on |
|---|---|
| `scenario-<hash>.bin.gz` (scenario artifact), `regression-<hash>.json.gz` (regression export), `references-<hash>.json.gz` (reference results) | The DEM experiments |
| `field-<hash>.json.gz` (field-data export) | The FDHI flatfile, the SURE database, and the Kern County compilation |

### DEM experiments

The 2D distinct element method (DEM) experiments, archived open-access
on DesignSafe-CI:

- Chiama, K., W. Bednarz, R. Moss, A. Plesch, and J. Shaw (2024a).
  "Homogeneous 2D DEM Experiments," in *Influence of sediment depth,
  sediment strength, fault dip, and slip on fault scarp morphology*,
  DesignSafe-CI.
  DOI: [10.17603/ds2-xpq0-gw80](https://doi.org/10.17603/ds2-xpq0-gw80)
- Chiama, K., W. Bednarz, R. Moss, A. Plesch, and J. Shaw (2024b).
  "Heterogeneous 2D DEM Experiments," in *Influence of sediment depth,
  sediment strength, fault dip, and slip on fault scarp morphology*,
  DesignSafe-CI.
  DOI: [10.17603/ds2-gfsj-pp60](https://doi.org/10.17603/ds2-gfsj-pp60)

### FDHI flatfile

The Fault Displacement Hazard Initiative (FDHI) measurement flatfile,
UCLA Dataverse, DOI
[10.25346/S6/Y4F9LJ](https://doi.org/10.25346/S6/Y4F9LJ), file `ABRP7B`.

### SURE database

The SURE database of surface ruptures, version 2.0:

- Baize, S., Nurminen, F., Sarmiento, A., *et al.* (2019). "A worldwide
  and unified database of surface ruptures (SURE) for fault
  displacement hazard analyses." *Seismological Research Letters* 91:
  499–520.
- The SURE 2.0 data descriptor: Nurminen et al. (2022), DOI
  [10.1038/s41597-022-01835-z](https://doi.org/10.1038/s41597-022-01835-z).

### Kern County (1952) compilation

Surface-rupture measurements from the 1952 M 7.36 Kern County
earthquake on the White Wolf fault, California, merged from three
sources: the field survey of Buwalda & St. Amand (1955), the Kern
County entries of the FDHI flatfile (above), and the event's surface
deformation characteristics (SDC) — scarp height, deformation zone
width and scarp dip. The compilation is not published elsewhere; cite
the study above for it.
