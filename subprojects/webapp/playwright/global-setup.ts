// The lane's globalSetup module (docs/app/ddd.md §7.5, Configuration):
// fails the run unless the first <loc> of the sitemap.xml served on port
// 4173 starts with BASE_URL — the rewrite that lets Material's instant
// navigation intercept clicks on the locally served pages.

import { BASE_URL } from '../playwright.config';

export default async function globalSetup(): Promise<void> {
  const response = await fetch(BASE_URL + 'sitemap.xml');
  if (!response.ok) throw new Error(`global-setup: sitemap.xml returned ${response.status}`);
  const text = await response.text();
  const first = /<loc>\s*([^<\s]+)\s*<\/loc>/.exec(text);
  if (first === null) throw new Error('global-setup: sitemap.xml has no <loc>');
  if (!first[1].startsWith(BASE_URL)) {
    throw new Error(`global-setup: the first sitemap <loc> ${first[1]} does not start with ${BASE_URL}`);
  }
}
