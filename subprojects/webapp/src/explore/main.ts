// Isolated entry for the guided /explore/ candidate. The legacy entry is
// deliberately not imported: it owns a different navigation lifecycle.
import { loadRegression, loadVintage } from '../decode/decode';
import { LoadError } from '../decode/load-error';
import type { Regression } from '../decode/fields';
import { mountExplorer } from './app';
import { SESSION_KEY } from './session';

const SELF = import.meta.url;
const SLOT = Symbol.for('gre.explore.mount');
interface Mount { root: HTMLElement; build: string; abort: AbortController }
const owner = window as unknown as { [SLOT]?: Mount };

function missingFeatures(): string[] {
  const checks: readonly [string, () => boolean][] = [
    ['fetch', () => typeof fetch === 'function'],
    ['DecompressionStream (gzip)', () => { new DecompressionStream('gzip'); return true; }],
    ['ReadableStream', () => typeof ReadableStream === 'function'],
    ['TextDecoder', () => typeof TextDecoder === 'function'],
    ['TextEncoder', () => typeof TextEncoder === 'function'],
    ['BigInt', () => typeof BigInt === 'function'],
    ['AbortController', () => typeof AbortController === 'function'],
    ['ResizeObserver', () => typeof ResizeObserver === 'function'],
    ['requestAnimationFrame', () => typeof requestAnimationFrame === 'function'],
    ['Element.replaceChildren', () => typeof Element.prototype.replaceChildren === 'function'],
    ['download links', () => 'download' in HTMLAnchorElement.prototype],
    ['object URLs', () => typeof URL.createObjectURL === 'function' && typeof URL.revokeObjectURL === 'function'],
  ];
  return checks.filter(([, check]) => { try { return !check(); } catch { return true; } }).map(([name]) => name);
}

/**
 * The tab's session storage, or null when it is unavailable or throws on
 * access; continuity is then off for the mount (guided DDD §9.2).
 */
function tabStorage(): Storage | null {
  try {
    const storage = window.sessionStorage;
    storage.getItem(SESSION_KEY);
    return storage;
  } catch {
    return null;
  }
}

/** A startup message; its control, when present, does what its label says (guided DDD §11.3). */
function message(root: HTMLElement, title: string, detail: string, control?: { label: string; run: () => void }): void {
  const box = document.createElement('section'); box.className = 'gx-loading';
  const h = document.createElement('h2'); h.textContent = title;
  const p = document.createElement('p'); p.textContent = detail; p.setAttribute('role', control ? 'alert' : 'status');
  box.append(h, p);
  if (control) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = control.label;
    b.addEventListener('click', control.run, { once: true }); box.append(b);
  }
  const links = document.createElement('p');
  for (const [href, label] of [['../scenario/', 'Existing explorer'], ['../data/', 'Data and citation'], ['../glossary/', 'Glossary']]) {
    if (links.childNodes.length) links.append(' · ');
    const a = document.createElement('a'); a.href = href; a.textContent = label; a.target = '_blank'; a.rel = 'noopener'; links.append(a);
  }
  box.append(links);
  while (root.firstChild) root.removeChild(root.firstChild);
  root.appendChild(box);
}

async function start(mount: Mount, tag: HTMLScriptElement): Promise<void> {
  const { root, abort } = mount;
  const alive = () => !abort.signal.aborted && root.isConnected && owner[SLOT] === mount;
  try {
    message(root, 'Preparing the scenario explorer', 'Loading the published simulation data.');
    const { manifest, dataVersion, softwareVersion } = tag.dataset;
    if (!manifest || !dataVersion || !softwareVersion) throw new Error('The page is missing its data or software version information.');
    const manifestUrl = new URL(manifest, tag.src);
    const vintage = await loadVintage(manifestUrl, { exportVersion: dataVersion, schemaVersions: [1] });
    if (!alive()) return;
    let regression: Promise<Regression> | null = null;
    const regressionUrl = new URL(vintage.manifest.files.regressionExport, manifestUrl);
    const getRegression = (): Promise<Regression> => {
      if (regression === null) {
        const pending = loadRegression(regressionUrl, vintage.manifest.exportVersion);
        regression = pending;
        pending.catch(() => { if (regression === pending) regression = null; });
      }
      return regression;
    };
    mountExplorer(root, { vintage, stamps: { softwareVersion, dataVersion }, loadRegression: getRegression, signal: abort.signal, storage: tabStorage() });
  } catch (error) {
    if (!alive()) return;
    console.error('Guided explorer startup:', error);
    // A version mismatch needs a fresh page, so its control reloads it; a
    // loading failure may be transient, so its control loads again (§11.3).
    if (error instanceof LoadError && (error.kind === 'data-version' || error.kind === 'schema-version')) {
      message(root, 'The explorer could not start', 'This page and its simulation data use incompatible versions. Reload the page to try again. No results have been calculated.',
        { label: 'Reload page', run: () => window.location.reload() });
    } else {
      message(root, 'The explorer could not start', 'The simulation data could not be loaded or read. Check your connection and try again. This is a loading failure, not an empty scientific result.',
        { label: 'Try loading again', run: () => { if (alive()) void start(mount, tag); } });
    }
  }
}

function release(mount: Mount): void {
  mount.abort.abort();
  if (owner[SLOT] === mount) delete owner[SLOT];
}
function ready(): void {
  try {
    const root = document.getElementById('gre-explore');
    const tag = document.getElementById('gre-explore-app') as HTMLScriptElement | null;
    const previous = owner[SLOT];
    if (!root || !tag || new URL(tag.src).href !== SELF) {
      if (previous?.build === SELF) release(previous);
      return;
    }
    if (previous?.root === root) return;
    if (previous) release(previous);
    const missing = missingFeatures();
    if (missing.length) {
      message(root, 'Please update your browser', `This browser is missing features needed by the explorer: ${missing.join(', ')}. Update Chrome, Edge, Firefox, or Safari to the latest stable version and reload. On iPhone or iPad, update iOS or iPadOS.`);
      return;
    }
    const mount: Mount = { root, build: SELF, abort: new AbortController() };
    owner[SLOT] = mount;
    void start(mount, tag);
  } catch (error) { console.error('Guided explorer mount:', error); }
}
const pages = (window as unknown as { document$?: { subscribe(fn: () => void): unknown } }).document$;
if (pages && typeof pages.subscribe === 'function') pages.subscribe(ready);
else if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
else ready();

// A browser-history restoration can retain the old DOM and JavaScript
// heap without a MkDocs or DOMContentLoaded notification. Release the
// retained mount and mount afresh, so the same-tab restore of guided DDD
// §9.2 applies exactly as after a reload (§7).
window.addEventListener('pageshow', event => {
  if (!event.persisted) return;
  const previous = owner[SLOT];
  if (previous?.build === SELF) release(previous);
  ready();
});
