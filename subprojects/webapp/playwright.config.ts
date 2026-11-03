// The browser test lane (docs/app/ddd.md §7.5; DD-3): Playwright driving
// its pinned Chromium against the strict preview build
// subprojects/mkdocs/site-preview/, served by playwright/serve.mjs under
// the site's published path. `webappBrowserTest` runs the functional
// projects `desktop` and `mobile`; the `measure` project is the §7.6
// suite (T-61), which never runs in the lane.

import { defineConfig } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The `site_url` line of subprojects/mkdocs/mkdocs.yml. */
function siteUrl(): string {
  const text = readFileSync(join(__dirname, '..', 'mkdocs', 'mkdocs.yml'), 'utf8');
  const line = /^site_url:\s*(\S+)\s*$/m.exec(text);
  if (line === null) throw new Error('playwright.config.ts: mkdocs.yml has no site_url line');
  return line[1];
}

export const SITE_URL = siteUrl();
export const BASE_PATH = new URL(SITE_URL).pathname;
export const BASE_URL = 'http://127.0.0.1:4173' + BASE_PATH;

/** The Node.js running Playwright, never whichever `node` is first on PATH. */
const node = JSON.stringify(process.execPath);
const serve = `${node} playwright/serve.mjs --root ../mkdocs/site-preview --site-url ${SITE_URL}`;

export default defineConfig({
  webServer: [
    { command: `${serve} --port 4173`, url: BASE_URL, reuseExistingServer: false },
    { command: `${serve} --port 4174 --max-age 0`, url: 'http://127.0.0.1:4174' + BASE_PATH, reuseExistingServer: false },
  ],
  use: { baseURL: BASE_URL },
  globalSetup: './playwright/global-setup.ts',
  reporter: [['list'], ['json', { outputFile: 'build/playwright/report.json' }]],
  outputDir: 'build/playwright/test-results/',
  projects: [
    {
      name: 'desktop',
      testDir: 'playwright/specs',
      testMatch: '*.spec.ts',
      use: { trace: 'on' },
    },
    {
      name: 'mobile',
      testDir: 'playwright/specs',
      testMatch: /(render|interactions|golden-scenario|keyboard-responsive)\.spec\.ts$/,
      use: { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, trace: 'on' },
    },
    {
      name: 'measure',
      testDir: 'playwright/measure',
      testMatch: '*.measure.ts',
      fullyParallel: false,
      retries: 0,
      use: { headless: false, viewport: { width: 1280, height: 1080 }, trace: 'off', video: 'off', screenshot: 'off' },
    },
  ],
});
