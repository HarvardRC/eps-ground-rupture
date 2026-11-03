// The delivery of the download package (docs/app/ddd.md §5.9): the
// "Download this result" button of the §5.8 results header,
// `<button type="button" id="gre-download">`, and its handler. A click
// reads the clock once (`generatedAt = new Date()`), takes the
// `RenderInput` of the last committed frame from
// `wiring.scheduler.lastRenderInput()` (§5.3; §5.8), calls `buildPackage`
// with it, the page's version stamps, and that instant, and hands the
// archive to the browser: a `Blob` of type `application/zip`, its object
// URL as the `href` of an `<a download="{fileName}">` appended to
// `#gre-root`, clicked, and removed in the same task. Creating an object
// URL revokes the previous download's; the mount's abort revokes the last
// (§5.10, rules binding `start`).
//
// The click listener takes `{ signal: wiring.signal }` of the `Wiring`
// this module receives (§5.1, Wiring); the module keeps no other
// reference to the mount. Handing over the `Wiring` is `start`'s (§5.11),
// and the button's `disabled` in the unavailable state is the notices
// applier's (§5.10).
//
// A browser-only file (§5.1).

import { copyText } from '../views/copy';
import type { Wiring } from '../views/dom/wiring';
import { buildPackage, type VersionStamps } from './package';

/** The archive's media type (§5.9). */
const ZIP_TYPE = 'application/zip';

/**
 * Builds the "Download this result" button `#gre-download` (§5.8; PDD
 * §6.1) and adds its click handler with the mount's signal; on the
 * signal's `abort` event the last object URL is revoked. Before the first
 * committed frame (`lastRenderInput()` null) a click delivers nothing.
 */
export function buildDownloadButton(wiring: Wiring, stamps: VersionStamps, doc: Document = document): HTMLButtonElement {
  const button = doc.createElement('button');
  button.type = 'button';
  button.id = 'gre-download';
  button.textContent = copyText('pdd6.1.downloadButton');

  let objectUrl: string | null = null;
  const revoke = (): void => {
    if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  };

  button.addEventListener(
    'click',
    () => {
      const generatedAt = new Date();
      const input = wiring.scheduler.lastRenderInput();
      if (input === null) return;
      const { fileName, bytes } = buildPackage(input, stamps, generatedAt);
      const root = button.closest('#gre-root');
      if (root === null) {
        throw new Error('deliver: #gre-download is not inside #gre-root');
      }
      revoke();
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: ZIP_TYPE }));
      const link = doc.createElement('a');
      link.download = fileName;
      link.href = objectUrl;
      root.append(link);
      link.click();
      link.remove();
    },
    { signal: wiring.signal },
  );
  wiring.signal.addEventListener('abort', revoke, { once: true });

  return button;
}
