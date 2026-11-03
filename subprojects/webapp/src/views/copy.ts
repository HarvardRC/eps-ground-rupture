// The copy registry (docs/app/ddd.md §5.8, Copy registry): every
// reader-facing text the bundle carries, read from copy.json and nowhere
// else. Each entry cites its source anchor — a docs/app/pdd.md fragment,
// or, for a fixed-here entry, the docs/app/ddd.md section that states the
// text verbatim — and keeps the source's placeholder spelling and its
// `**` emphasis markers. check_pdd_agreement.py (.github/scripts/)
// compares every entry with the section it cites (§5.13).
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import copyJson from './copy.json';

/** One registry entry (§5.8). */
export interface CopyEntry {
  /** `{doc}{section}.{name}`, unique, as in `pdd5.6.perDipLine`. */
  readonly key: string;
  /** `docs/app/pdd.md#<fragment>` or, fixed here, `docs/app/ddd.md#<fragment>`. */
  readonly source: string;
  /** The 0-based order of this text within its source. */
  readonly part: number;
  /** The text verbatim, its `{…}` slots and `**` markers as the source writes them. */
  readonly text: string;
  /**
   * The names of the placeholders the views fill — each `{…}` name without its
   * braces, and the bare `X` of PDD §4.3 — in order of first occurrence; a
   * bracketed `[…]` text is not a slot.
   */
  readonly slots: readonly string[];
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const member of Object.values(value as object)) {
      deepFreeze(member);
    }
  }
  return value;
}

const entries: readonly CopyEntry[] = deepFreeze(copyJson satisfies readonly CopyEntry[]);

const byKey: ReadonlyMap<string, CopyEntry> = new Map(entries.map((entry) => [entry.key, entry]));
if (byKey.size !== entries.length) {
  throw new Error('copy: duplicate key in copy.json');
}

/** The entry `key` names; throws for a key the registry does not hold. */
export function copyEntry(key: string): CopyEntry {
  const entry = byKey.get(key);
  if (entry === undefined) {
    throw new Error(`copy: no entry ${key}`);
  }
  return entry;
}

/** The text of the entry `key` names, verbatim; throws for an unknown key. */
export function copyText(key: string): string {
  return copyEntry(key).text;
}

/** Whether the registry holds an entry for `key` (e.g. `ddd5.8.prototypeNotice`, §5.8). */
export function hasCopy(key: string): boolean {
  return byKey.has(key);
}
