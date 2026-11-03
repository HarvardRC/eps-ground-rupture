// The application entry (docs/app/ddd.md §5.10, §5.11). This file holds
// step 1 of the §5.10 startup sequence, the capability probe
// `missingCapabilities()`, which `onPageReady` calls before it claims the
// mount slot — the slot's `AbortController` is itself a probed API — and
// which shows `showCapabilityNotice(root, missing)` of
// `views/dom/notices.ts` on a miss. The navigation lifecycle and
// `start(a, tag)` join this file with T-46.
//
// A browser-only file (§5.1).

/**
 * The names `typeof` must give `'function'` for, each with the
 * expression it reads, in the §5.10 test order (fixed there).
 */
const FUNCTION_TESTS: readonly (readonly [string, () => unknown])[] = [
  ['fetch', () => fetch],
  ['ReadableStream', () => ReadableStream],
  ['ReadableStream.prototype.pipeThrough', () => ReadableStream.prototype.pipeThrough],
  ['TextDecoder', () => TextDecoder],
  ['TextEncoder', () => TextEncoder],
  ['Uint8Array', () => Uint8Array],
  ['Uint16Array', () => Uint16Array],
  ['Uint32Array', () => Uint32Array],
  ['Int32Array', () => Int32Array],
  ['Float64Array', () => Float64Array],
  ['DataView', () => DataView],
  ['Blob', () => Blob],
  ['URL', () => URL],
  ['URL.createObjectURL', () => URL.createObjectURL],
  ['URL.revokeObjectURL', () => URL.revokeObjectURL],
  ['ResizeObserver', () => ResizeObserver],
  ['AbortController', () => AbortController],
  ['requestAnimationFrame', () => requestAnimationFrame],
  ['cancelAnimationFrame', () => cancelAnimationFrame],
  ['Element.prototype.replaceChildren', () => Element.prototype.replaceChildren],
  ['performance.mark', () => performance.mark],
];

/** Whether `test` returns without throwing and its result passes `check`; a throwing test fails. */
function passes<T>(test: () => T, check: (value: T) => boolean): boolean {
  try {
    return check(test());
  } catch {
    return false;
  }
}

/**
 * The capability probe (§5.10, Unavailable browser capabilities): the
 * names of the failing tests, in test order — empty when every test
 * passes. The tests: `typeof` gives `'function'` for each name of
 * `FUNCTION_TESTS`; `new DecompressionStream('gzip')` returns without
 * throwing (reported as `DecompressionStream`); and
 * `'download' in HTMLAnchorElement.prototype` holds (reported as
 * `HTMLAnchorElement.download`). A test that throws fails. Only these
 * features are tested, never the browser's name or version: the rest of
 * the §7.6 inventory — `MessageChannel`, the User Timing Level 3 options
 * object of `performance.mark`, and the `signal` option of
 * `addEventListener` — is documented availability, never probed.
 */
export function missingCapabilities(): string[] {
  const missing: string[] = [];
  for (const [name, read] of FUNCTION_TESTS) {
    if (!passes(read, (value) => typeof value === 'function')) missing.push(name);
  }
  if (!passes(() => new DecompressionStream('gzip'), () => true)) {
    missing.push('DecompressionStream');
  }
  if (!passes(() => 'download' in HTMLAnchorElement.prototype, (held) => held)) {
    missing.push('HTMLAnchorElement.download');
  }
  return missing;
}
