// Reload recovery, the storage and navigation part (docs/app/ddd.md §5.6,
// Reload recovery (MVP); §5.10, Reload recovery presentation and
// startup): the guarded `sessionStorage` operations behind the explicit
// recovery actions. The key is `'gre.reload-recovery.v1:' +
// location.pathname`; `sessionStorage` gives the origin and tab scope, and
// there is no expiry clock. Every storage access is guarded: a throwing
// getter, read, write, or removal is a reported failure, never a
// fictitious "no record". Nothing here reloads automatically or retries
// on a timer; `location.reload()` runs only inside an explicit action.
//
// The pure envelope (`serializeRecovery`, `readRecovery`,
// `restoreRecovery`) is `state/recovery.ts`'s; no pure `state/` file
// imports this one.
//
// A browser-only file (§5.1).

/** The document-global one-shot claim of the initial read (§5.6). */
const CLAIM = Symbol.for('gre.recoveryClaimed');

/** The key prefix (§5.6). */
const KEY_PREFIX = 'gre.reload-recovery.v1:';

/** This page's key. */
function recoveryKey(): string {
  return KEY_PREFIX + location.pathname;
}

/** `window.sessionStorage`, whose getter can throw. */
function storage(): Storage {
  return window.sessionStorage;
}

/** What the mount's initial claim found (§5.6). */
export type IncomingRecovery =
  /** No record, or the claim already taken in this document. */
  | { readonly kind: 'none' }
  /** The storage getter or the initial read threw: the §5.10 storage-read warning. */
  | { readonly kind: 'unreadable' }
  /** A record was read, removed, and its absence verified: the raw text, held in mount memory. */
  | { readonly kind: 'consumed'; readonly text: string }
  /**
   * A record was read, but its removal threw, its verification read threw,
   * or the key is still present: the blocked-storage decision, with the
   * text retained for an explicit retry.
   */
  | { readonly kind: 'blocked'; readonly text: string };

/**
 * Removes this page's key and verifies its absence; false when the
 * removal or the verification read throws, or the key is still present.
 */
export function clearRecovery(): boolean {
  try {
    const store = storage();
    const key = recoveryKey();
    store.removeItem(key);
    return store.getItem(key) === null;
  } catch {
    return false;
  }
}

/**
 * The initial claim and consumption (§5.6), synchronous and run once per
 * document before the first await of the claiming mount's startup: the
 * first call claims the document-global `Symbol.for('gre.recoveryClaimed')`
 * before its first storage read, and every later call in the document —
 * another mount, or another bundle instance after instant navigation —
 * returns none. A read key is removed and its absence verified before
 * anything is applied.
 */
export function claimRecovery(): IncomingRecovery {
  const holder = window as unknown as { [CLAIM]?: true };
  if (holder[CLAIM] === true) return { kind: 'none' };
  holder[CLAIM] = true;
  let text: string | null;
  try {
    text = storage().getItem(recoveryKey());
  } catch {
    return { kind: 'unreadable' };
  }
  if (text === null) return { kind: 'none' };
  return clearRecovery() ? { kind: 'consumed', text } : { kind: 'blocked', text };
}

/** The result of an explicit reload action. */
export type ReloadOutcome =
  /** `location.reload()` returned: navigation has started. */
  | 'reloading'
  /** The save or its exact read-back failed (or, for a non-restoring reload, clearing failed); no reload. */
  | 'save-failed'
  /** `location.reload()` threw. */
  | 'reload-failed';

/** Attempts to remove this page's key, ignoring any failure. */
function tryRemove(): void {
  try {
    storage().removeItem(recoveryKey());
  } catch {
    // The failure is reported by the caller's outcome.
  }
}

/**
 * **Reload and restore settings** (§5.6): clears only this key and
 * verifies its absence, writes `text`, requires an exact read-back, then
 * calls `location.reload()` with no argument. A clear, write, or
 * read-back failure attempts to remove the new key and returns
 * `'save-failed'` without reloading; a throwing reload also attempts the
 * removal and returns `'reload-failed'`.
 */
export function saveAndReload(text: string): ReloadOutcome {
  let saved = false;
  try {
    if (clearRecovery()) {
      const store = storage();
      const key = recoveryKey();
      store.setItem(key, text);
      saved = store.getItem(key) === text;
    }
  } catch {
    saved = false;
  }
  if (!saved) {
    tryRemove();
    return 'save-failed';
  }
  try {
    location.reload();
  } catch {
    tryRemove();
    return 'reload-failed';
  }
  return 'reloading';
}

/**
 * **Reload without restoring settings** (§5.6): clears this key and
 * verifies its absence before calling `location.reload()`. A failure to
 * clear keeps the page and returns `'save-failed'` — the discard failure
 * of §5.10; a throwing reload returns `'reload-failed'`.
 */
export function discardAndReload(): ReloadOutcome {
  if (!clearRecovery()) return 'save-failed';
  try {
    location.reload();
  } catch {
    return 'reload-failed';
  }
  return 'reloading';
}
