/* The Tableau Embedding API, loaded only where an embed exists.
 *
 * The API module defines the <tableau-viz> element the dashboard pages use
 * (EMBEDS.md). It used to be a site-wide `extra_javascript` entry, which
 * made every page — the scenario page included — download it. This loader
 * takes that entry's place (docs/app/ddd.md §6.1, Tableau exclusion): on
 * each page it checks for a <tableau-viz> element or a .tableau-fit
 * container and, on the first page that has one, appends the module's
 * <script type="module"> to <head>. A module script evaluates once per
 * document, so it never appends a second one.
 *
 * WHY IT LISTENS TO document$. Material emits `extra_javascript` after its
 * own bundle and outside the content container, so this file evaluates once
 * per document. Under `navigation.instant` a page visit swaps the content
 * without reloading the document, and scripts in a swapped-in <head> do not
 * run. Material's `document$` observable emits on every page-ready event,
 * and replays the current page to a late subscriber, so a reader who lands
 * on any page and then navigates into a dashboard gets the module injected
 * at that moment — the same as a direct load of the dashboard. Without
 * `document$`, the check runs once the document is parsed.
 *
 * The site checks hook (hooks/site_checks.py, arm (e)) fails any build whose
 * pages carry the API's own <script> tag, or lack this loader's.
 */
(() => {
  const EMBEDDING_API =
    "https://public.tableau.com/javascripts/api/tableau.embedding.3.latest.min.js";

  let injected = false;

  function injectWhereEmbedded() {
    if (injected) return;
    if (!document.querySelector("tableau-viz, .tableau-fit")) return;
    injected = true;
    const script = document.createElement("script");
    script.type = "module";
    script.src = EMBEDDING_API;
    document.head.appendChild(script);
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(injectWhereEmbedded);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectWhereEmbedded);
  } else {
    injectWhereEmbedded();
  }
})();
