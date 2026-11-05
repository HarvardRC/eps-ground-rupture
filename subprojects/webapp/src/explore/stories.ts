// The sample stories (PDD D-42; guided DDD §10.2): reader-facing
// scientific prose under CR-10. Each story is presentation state shown
// behind a closed "About this sample" disclosure after a sample fill;
// nothing here enters the Draft. Images are project images published at
// `images/` (never application assets), referenced relatively from
// `/explore/`, each with alt text and a visible credit naming its author
// and license. Licenses were verified per file at the source; the G-15
// evidence in docs/app/guided-journey-ip.md records them.

import type { SampleId } from './state';

export interface StoryLink {
  readonly label: string;
  readonly href: string;
}

export interface StoryImage {
  /** Site-relative from `/explore/`. */
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  readonly caption: string;
  /** The visible credit: author and license, each linked to its source. */
  readonly credit: { readonly text: string; readonly source: StoryLink; readonly license: StoryLink | null };
}

export interface SampleStory {
  readonly paragraphs: readonly string[];
  readonly sources: readonly StoryLink[];
  /** One or two images (§10.2). */
  readonly images: readonly StoryImage[];
}

/** The anchored-not-modeled sentence both stories share (§10.2; PDD §2.3: values reproduce no event). */
export const ANCHORED_NOT_MODELED = 'These are sample values anchored to that earthquake\'s scale; they reproduce no event and model no particular site.';

export const STORIES: Record<SampleId, SampleStory> = {
  illustrative: {
    paragraphs: [
      'These values are illustrative. Their scale comes from the 1999 M 7.6 Chi-Chi earthquake in Taiwan, where the Chelungpu fault broke the ground surface. An offset river along the fault brought down a bridge, and the Shih-Kang Dam was broken by roughly 8 m of uplift. At the former Kuangfu Junior High School in Wufeng, now the site of the 921 Earthquake Museum of Taiwan, the fault lifted the school\'s playground about 2.5 m.',
      `The sample's 0–3 m of vertical surface offset is of that scale; its fault angles and sediment values are sample choices. ${ANCHORED_NOT_MODELED}`,
    ],
    sources: [
      { label: 'Chiama et al. (2025), Figure 1', href: '../figures/#fig-1' },
      { label: 'Tri-Mountain National Scenic Area, 921 Earthquake Museum of Taiwan', href: 'https://www.trimt-nsa.gov.tw/en/attraction/857/' },
    ],
    images: [{
      src: '../images/sample-chichi-kuangfu-track.jpg',
      width: 960,
      height: 640,
      alt: 'A section of running track buckled and pushed up into a ramp, its white lane lines broken, preserved under a canopy at the 921 Earthquake Museum of Taiwan; an intact red track runs in the foreground.',
      caption: 'The fault scarp across the former Kuangfu Junior High School running track, preserved at the museum (photographed 2024).',
      credit: {
        text: 'Photo: Liu Shu fu / Office of the President, Taiwan, via Wikimedia Commons.',
        source: { label: 'Ruin of the destructed running tracks at the 921 Earthquake Museum of Taiwan', href: 'https://commons.wikimedia.org/wiki/File:Ruin_of_the_destructed_running_tracks_at_the_921_Earthquake_Museum_of_Taiwan_2024-09-21.jpg' },
        license: { label: 'CC BY 2.0', href: 'https://creativecommons.org/licenses/by/2.0/' },
      },
    }],
  },
  kern: {
    paragraphs: [
      'This sample is anchored to the 1952 M 7.36 Kern County earthquake in California, which ruptured the White Wolf fault. Geodetic studies point to a steep fault, dipping near 75°, and the earthquake raised the ground surface by up to about 1.3 m.',
      `The sample uses the two steepest modeled fault angles, 60° and 70°, and a vertical surface offset of up to 1.3 m, the scale of that elevation change; its sediment values are sample choices, not a description of the site. ${ANCHORED_NOT_MODELED}`,
      'This release\'s field measurements include part of Buwalda and St. Amand\'s 1955 survey of the rupture, digitised by the study\'s lead author. A later version of this page may compare your results with those measurements.',
    ],
    sources: [
      { label: 'Stein and Thatcher (1981)', href: 'https://ui.adsabs.harvard.edu/abs/1981JGR....86.4913S/abstract' },
      { label: 'Bawden (2001)', href: 'https://zenodo.org/records/1231281' },
      { label: 'SCEDC, 1952 Kern County earthquake', href: 'https://scedc.caltech.edu/earthquake/kern1952.html' },
    ],
    images: [{
      src: '../images/sample-kern-bealville-tracks.jpg',
      width: 960,
      height: 634,
      alt: 'Black-and-white photograph of railroad tracks near Bealville, California, bent into an S-curve below a tunnel portal after the 1952 earthquake shortened the ground.',
      caption: 'Southern Pacific Railroad tracks near Bealville, bent where the 1952 earthquake shortened the ground.',
      credit: {
        text: 'Photo: D. H. Kupfer, U.S. Geological Survey, 1952. Public domain.',
        source: { label: 'Arvin-Tehachapi earthquake damage near Bealville', href: 'https://www.sciencebase.gov/catalog/item/51dd6f2be4b0f72b4471a1d7' },
        license: null,
      },
    }],
  },
};
