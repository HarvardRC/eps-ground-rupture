// Live announcements (docs/app/ddd.md §5.11, Live announcements):
// `announce(region, text, live?)` empties the region now and writes the
// text in a later task, so a just-inserted region is registered before
// its first text and a text repeated by two consecutive updates is
// announced both times. Given `live`, the write happens only if `live()`
// is true in that task — the binding of a settled update to its sequence
// number (§5.3 item 2) and of a transient announcement to the element
// that shows its text.
//
// A browser-only file (§5.1).

/** Empties `region`, then writes `text` in a later task (`setTimeout(…, 0)`), only if `live()` then holds. */
export function announce(region: HTMLElement, text: string, live?: () => boolean): void {
  region.textContent = '';
  setTimeout(() => {
    if (live !== undefined && !live()) return;
    region.textContent = text;
  }, 0);
}
