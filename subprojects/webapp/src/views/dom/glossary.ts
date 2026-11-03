// The first-use glossary linker of docs/app/ddd.md §5.8 (Glossary links):
// `linkGlossary(root, replaced?)` wraps the first DOM-order occurrence of
// each term of the PDD §5.11 anchor map — case-insensitive, whole words —
// in a link to its site-glossary anchor,
// `<a href="../glossary/#{anchor}" data-focus-key="glossary:{anchor}">`,
// and leaves later occurrences plain. It links the stable skeleton once at
// mount and, on each render pass, only the terms whose first occurrence
// lies in a replaced slot. Text inside a `<label>`, `<summary>`,
// `<button>`, or `<svg>` is never linked; neither is text already inside
// a link, which a glossary link would nest in interactive content.
//
// The anchor map is carried as registry entries (copy.json, `pdd5.11.glossary*`),
// each one item of the PDD §5.11 map verbatim: the term, then its
// backticked anchor — or, for "sediment strength and cohesion", the two
// terms joined by " and ", then their two anchors in the same order.
//
// An applier (§5.1): it wraps existing text nodes and writes no text of its own.
//
// A browser-only file (§5.1).

import { copyText } from '../copy';

/** The registry keys of the PDD §5.11 anchor map, in its order. */
const GLOSSARY_KEYS: readonly string[] = [
  'pdd5.11.glossaryScarpHeight',
  'pdd5.11.glossaryDzw',
  'pdd5.11.glossaryScarpDip',
  'pdd5.11.glossaryFaultDip',
  'pdd5.11.glossarySlip',
  'pdd5.11.glossarySedimentStrengthCohesion',
  'pdd5.11.glossaryScarpClasses',
  'pdd5.11.glossaryBackProjection',
  'pdd5.11.glossaryDem',
  'pdd5.11.glossaryMagnitude',
  'pdd5.11.glossaryVerticalSeparation',
  'pdd5.11.glossaryFzw',
  'pdd5.11.glossaryFnc',
  'pdd5.11.glossarySure',
  'pdd5.11.glossaryKernCounty',
];

/** One mapped term: its anchor and the pattern of its whole-word, case-insensitive occurrences. */
interface GlossaryTerm {
  readonly anchor: string;
  readonly pattern: RegExp;
}

/** One map item as the PDD writes it: the term(s), a space, then the backticked anchor(s). */
const MAP_ITEM = /^(.+?) (`#[^`]+`(?:, `#[^`]+`)*)$/;

/** The characters that continue a word: a term never matches inside one. */
const WORD_CHAR = '[\\p{L}\\p{N}_]';

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The terms of one registry entry, each paired with its anchor. */
function termsOf(key: string): GlossaryTerm[] {
  const text = copyText(key);
  const item = MAP_ITEM.exec(text);
  if (item === null) {
    throw new Error(`glossary: ${key} is not a term and anchor`);
  }
  const anchors = Array.from(item[2].matchAll(/`#([^`]+)`/g), (m) => m[1]);
  const phrases = anchors.length === 1 ? [item[1]] : item[1].split(' and ');
  if (phrases.length !== anchors.length) {
    throw new Error(`glossary: ${key} pairs ${phrases.length} terms with ${anchors.length} anchors`);
  }
  return phrases.map((phrase, k) => ({
    anchor: anchors[k],
    pattern: new RegExp(`(?<!${WORD_CHAR})${escapeRegExp(phrase).replace(/ /g, '\\s+')}(?!${WORD_CHAR})`, 'iu'),
  }));
}

let termCache: readonly GlossaryTerm[] | null = null;

/** The PDD §5.11 terms in map order, read from the registry once. */
function glossaryTerms(): readonly GlossaryTerm[] {
  if (termCache === null) termCache = GLOSSARY_KEYS.flatMap(termsOf);
  return termCache;
}

/** The elements whose text is never linked (§5.8). */
const UNLINKED = new Set(['label', 'summary', 'button', 'svg']);

/** The glossary anchor a `data-focus-key` names, or null. */
function linkedAnchor(element: Element): string | null {
  const key = element.getAttribute('data-focus-key');
  return key !== null && key.startsWith('glossary:') ? key.slice('glossary:'.length) : null;
}

/** One position of the walk, in DOM order: a linkable text node or an existing glossary link. */
type Item = { readonly kind: 'text'; readonly node: Text } | { readonly kind: 'link'; readonly anchor: string };

/**
 * The linkable text of `root` in DOM order, with the glossary links already
 * there: the subtrees of `<label>`, `<summary>`, `<button>`, `<svg>`, and
 * `<a>` contribute no text.
 */
function walk(root: Element): Item[] {
  const items: Item[] = [];
  const visit = (node: Node): void => {
    for (let child = node.firstChild; child !== null; child = child.nextSibling) {
      if (child.nodeType === Node.TEXT_NODE) {
        items.push({ kind: 'text', node: child as Text });
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element;
        const name = element.localName;
        if (name === 'a') {
          const anchor = linkedAnchor(element);
          if (anchor !== null) items.push({ kind: 'link', anchor });
        } else if (!UNLINKED.has(name)) {
          visit(element);
        }
      }
    }
  };
  visit(root);
  return items;
}

/**
 * Links the first DOM-order occurrence of each PDD §5.11 term inside
 * `root` (§5.8, Glossary links). Without `replaced` — at mount, on the
 * stable skeleton — every term's first occurrence is linked. With
 * `replaced`, the slots a render pass replaced, only the terms whose first
 * occurrence lies inside one of them are linked. A term whose first
 * occurrence is already its glossary link is left as it is.
 */
export function linkGlossary(root: Element, replaced?: readonly Element[]): void {
  const doc = root.ownerDocument;
  const items = walk(root);
  for (const term of glossaryTerms()) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'link') {
        if (item.anchor === term.anchor) break;
        continue;
      }
      const text = item.node.data;
      const match = term.pattern.exec(text);
      if (match === null) continue;
      if (replaced === undefined || replaced.some((slot) => slot.contains(item.node))) {
        const matched = match.index === 0 ? item.node : item.node.splitText(match.index);
        const after = matched.length > match[0].length ? matched.splitText(match[0].length) : null;
        const link = doc.createElement('a');
        link.setAttribute('href', `../glossary/#${term.anchor}`);
        link.setAttribute('data-focus-key', `glossary:${term.anchor}`);
        matched.replaceWith(link);
        link.append(matched);
        const rest: Item[] = [];
        if (matched !== item.node) rest.push({ kind: 'text', node: item.node });
        rest.push({ kind: 'link', anchor: term.anchor });
        if (after !== null) rest.push({ kind: 'text', node: after });
        items.splice(i, 1, ...rest);
      }
      break;
    }
  }
}
