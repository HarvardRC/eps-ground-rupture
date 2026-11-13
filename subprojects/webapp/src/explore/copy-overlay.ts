// The guided page's copy overlay (PDD D-45; guided DDD §11.1; ruling (A)
// of 2026-11-05 under the owner's overnight delegation). The adopted
// wording reaches every string a guided reader sees, while the shared
// registry (`views/copy.json`, the PDD copy deck) and the `/scenario/`
// bundles stay unchanged.
//
// Each entry is keyed by its copy.json key and holds the adopted text
// with the same slots. Should the owner later adopt the wording for the
// shared registry as well, the texts move into copy.json and the calls
// to `guided()` go; nothing else depends on this module.

import { copyEntry } from '../views/copy';
import type { SvgNode } from '../views/svg';

export const GUIDED_COPY: Readonly<Record<string, string>> = {
  // D-5: the correction is reported ready; the served release's column still needs verification
  // (guided DDD §15.12, assembled under D-51; PDD §5.4, correction of 2026-11-12).
  'pdd5.4.scarpDipNotice': 'Scarp-dip results remain provisional while we confirm that this data release contains the approved corrections.',
  'pdd4.1.cumulativeAccuracy': 'The curve may be simplified for display. Simplification changes cumulative percentages by less than 0.2 percentage points. Statistics and percentile read-offs rely on all measurements used for this scenario.',
  // The small-count reframe (guided DDD §15.5; PDD D-51), assembled from the research group's review.
  'pdd5.8.smallResultWarning': 'Only {N} measurements can be used for this scenario. They are not less trustworthy — a very specific set of site conditions matches few simulations, so the distribution is coarse. Try adding more options to include a range of results.',
  'pdd5.8.suppressionNotice': 'Fewer than 10 measurements can be used — too few to draw a distribution. They are not less trustworthy; the selection is very specific. Showing the statistics table only; try adding more options to include a range of results.',
  'pdd5.8.noValidMeasurement': '{X} simulation stages match this scenario, but none has a {measurement} value — no distribution can be computed. The stages appear in the Missing values (excluded) count of the statistics table.',
  // PDD §5.9's decided replacement (D-4, 2026-11-06; task G-25), the research group's own text.
  'pdd5.9.lowSlipCaveat': 'Low-slip measurements may be less reliable. Below 0.5 m of fault slip, surface deformation can be difficult to distinguish from model roughness. These values are shown, but interpret them with caution.',
  // The research group's spelling (§15.7; PRD CR-3 as amended).
  'pdd5.11.dzwLabel': 'Deformation zone width (m)',
  'pdd5.7.widthScopeNote': 'Deformation zone width measures the main modeled rupture zone. Real earthquakes can also produce separate deformation away from the main trace, which the model does not represent.',
  'ddd5.8.rowValidCount': 'Measurements used',
  'ddd5.8.rowExcludedNullCount': 'Missing values (excluded)',
  'ddd5.11.histogramLabel': '{label}: histogram of {N} measurements used',
  'ddd5.11.cumulativeLabel': '{label}: cumulative distribution of {N} measurements used',
  'ddd5.11.binTableCaption': '{label}: measurements used per bin, by scarp type',
  'ddd5.12.countAxisTitle': 'Measurements used',
  'ddd5.11.binTableCaptionFamily': '{label}: measurements used per bin, by scarp family',
};

const regexEscape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SLOT = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

interface Rewrite {
  /** The template's longest literal part; a text without it cannot match, so the pattern is skipped. */
  readonly literal: string;
  readonly pattern: RegExp;
  readonly replace: (match: string, ...groups: string[]) => string;
}

/**
 * One rewrite per entry: the registry's template, its slots captured,
 * becomes the overlay's template with the same values. The slots of both
 * templates must agree, so a later registry edit that changes them fails
 * loudly here rather than silently showing the old wording.
 */
function rewriteFor(key: string, text: string): Rewrite {
  const entry = copyEntry(key);
  const oldSlots = [...entry.text.matchAll(SLOT)].map(m => m[1]);
  const newSlots = [...text.matchAll(SLOT)].map(m => m[1]);
  if ([...oldSlots].sort().join() !== [...newSlots].sort().join()) throw new Error(`copy overlay: ${key} changes its slots`);
  const parts = entry.text.split(SLOT);
  // A slot may be empty or span lines; one at the very end takes the rest of the text.
  const pattern = new RegExp(parts.map((part, i) => i % 2 ? (i === parts.length - 2 && parts[i + 1] === '' ? '([\\s\\S]*)' : '([\\s\\S]*?)') : regexEscape(part)).join(''), 'g');
  const literal = parts.filter((_, i) => i % 2 === 0).reduce((a, b) => (b.length > a.length ? b : a), '');
  return {
    literal,
    pattern,
    replace: (_match, ...groups) => {
      const values = new Map(oldSlots.map((name, i) => [name, groups[i]]));
      return text.replace(SLOT, (_m, name: string) => values.get(name) ?? '');
    },
  };
}

// Longer templates first, so a sentence is rewritten before any shorter label inside it.
const REWRITES: readonly Rewrite[] = Object.entries(GUIDED_COPY)
  .sort(([a], [b]) => copyEntry(b).text.length - copyEntry(a).text.length)
  .map(([key, text]) => rewriteFor(key, text));

/**
 * Spellings the guided page adopts inside filled slots, where no template
 * rewrite reaches: the research group's unhyphenated width term (guided DDD
 * §§15.7, 15.11), as the no-valid notice's `{measurement}` value carries it.
 */
const SPELLINGS: readonly (readonly [string, string])[] = [['deformation-zone width', 'deformation zone width']];

/** The adopted wording for text a shared builder produced from the registry. */
export function guided(text: string): string {
  const rewritten = REWRITES.reduce((value, rewrite) => (value.includes(rewrite.literal) ? value.replace(rewrite.pattern, rewrite.replace) : value), text);
  return SPELLINGS.reduce((value, [from, to]) => value.split(from).join(to), rewritten);
}

/** The chart attributes that carry words; geometry (points, paths, coordinates) is never scanned. */
const WORDED = new Set(['aria-label', 'aria-description', 'title']);

/** A shared chart, its accessible name, title, and axis text in the adopted wording. */
export function guidedSvg(node: SvgNode): SvgNode {
  return {
    tag: node.tag,
    attrs: node.attrs.map(([name, value]) => [name, WORDED.has(name) ? guided(value) : value] as const),
    children: node.children.map(child => typeof child === 'string' ? guided(child) : guidedSvg(child)),
  };
}
