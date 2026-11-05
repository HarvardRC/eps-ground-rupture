// The sample stories and value annotations (PDD D-42, D-43, D-44;
// guided DDD §§10.2, 10.4, 10.5): reader-facing scientific prose under
// CR-10. A story is presentation state shown in the sample dialog's card
// preview and behind the closed "Why these sample values?" trigger while
// a fill stands; an annotation stands beside a prefilled control while
// that control still holds the sample's value. Nothing here enters the
// Draft. Images are project images published at
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

/** The sentence both stories share (§10.5, replacing §10.2's anchored-not-modeled sentence; PDD §2.3: values reproduce no event). */
export const SHARED_SENTENCE = 'These examples help you try the tool. They do not reconstruct either earthquake.';

export const STORIES: Record<SampleId, SampleStory> = {
  illustrative: {
    paragraphs: [
      'These values are illustrative. Their scale comes from the 1999 M 7.6 Chi-Chi earthquake in Taiwan, where the Chelungpu fault broke the ground surface. An offset river along the fault brought down a bridge, and the Shih-Kang Dam was broken by roughly 8 m of uplift. At the former Kuangfu Junior High School in Wufeng, now the site of the 921 Earthquake Museum of Taiwan, the fault lifted the school\'s playground about 2.5 m.',
      `The sample's 0–3 m of vertical surface offset is of that scale; its fault angles and sediment values are sample choices. ${SHARED_SENTENCE}`,
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
      `The sample uses the two steepest modeled fault angles, 60° and 70°, and a vertical surface offset of up to 1.3 m, the scale of that elevation change; its sediment values are sample choices, not a description of the site. ${SHARED_SENTENCE}`,
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

/** The controls an annotation can stand beside (§10.4); `slip` is the slip range as a pair. */
export type AnnotatedField = 'faultDip' | 'depth' | 'density' | 'sediment' | 'offsetMax' | 'slip';

export interface Annotation {
  readonly text: string;
  /** The §10.2 sources that apply, if any. */
  readonly sources: readonly StoryLink[];
}

/**
 * A story source for an annotation; `short` relabels a source whose title
 * names the event, since the names stay in the previews and stories (§10.5).
 */
const link = (id: SampleId, label: string, short?: string): StoryLink => {
  const found = STORIES[id].sources.find(source => source.label === label);
  if (!found) throw new Error(`Annotation: no ${label} source in the ${id} story.`);
  return short ? { label: short, href: found.href } : found;
};

const SAMPLE_CHOICE: Annotation = { text: 'A sample choice, not a description of any real site.', sources: [] };

/**
 * One or two sentences beside each prefilled control (§10.4). The event
 * names stay in the previews and stories (§10.5); an annotation speaks of
 * the sample's background and links the sources that apply.
 */
export const ANNOTATIONS: Record<SampleId, Record<AnnotatedField, Annotation>> = {
  illustrative: {
    faultDip: { text: 'A sample choice; the background earthquake does not set these angles.', sources: [] },
    depth: SAMPLE_CHOICE,
    density: SAMPLE_CHOICE,
    sediment: SAMPLE_CHOICE,
    offsetMax: {
      text: 'Of the scale of the surface offsets in the sample\'s background: meters of uplift, including about 2.5 m at a school playground.',
      sources: [link('illustrative', 'Chiama et al. (2025), Figure 1'), link('illustrative', 'Tri-Mountain National Scenic Area, 921 Earthquake Museum of Taiwan', 'Tri-Mountain National Scenic Area')],
    },
    slip: { text: 'An example band within the simulations\' coverage. It is not converted from the surface offset.', sources: [] },
  },
  kern: {
    faultDip: {
      text: 'Geodetic studies put the dip of the fault in the sample\'s background near 75°; the sample uses the two steepest modeled angles.',
      sources: [link('kern', 'Stein and Thatcher (1981)'), link('kern', 'Bawden (2001)')],
    },
    depth: SAMPLE_CHOICE,
    density: SAMPLE_CHOICE,
    sediment: SAMPLE_CHOICE,
    offsetMax: {
      text: 'The scale of the largest surface elevation change in the sample\'s background, about 1.3 m.',
      sources: [link('kern', 'SCEDC, 1952 Kern County earthquake', 'SCEDC')],
    },
    slip: {
      text: 'Bawden (2001)\'s two patch estimates, 1.6 m and 1.9 m, used as an example band, not an uncertainty range.',
      sources: [link('kern', 'Bawden (2001)')],
    },
  },
};
