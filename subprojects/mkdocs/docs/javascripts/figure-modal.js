/* Paper figures, opened in place.
 *
 * A page links to a figure like any other link:
 *
 *     [Figure 2](../figures.md#fig-2){ .figure-pop
 *       data-img="../../images/fig-05-ml-model-measurements.jpg"
 *       data-title="Figure 2 — the six scarp classes" }
 *
 * With JavaScript, clicking opens the image in a <dialog> so a reader
 * checking what a legend entry means does not lose their place on the
 * dashboard. Without it, the link simply navigates to the figure's section
 * on the Figures page — which is why the href is a real destination and not
 * a "#". Nothing here is required for the site to work.
 *
 * WHY THE LISTENER LOOKS LIKE THIS. Material's `navigation.instant` listens
 * for clicks on `document` and routes any same-site link itself. A handler
 * bound to the link runs later, in the bubble phase, so by the time it calls
 * preventDefault() the router has already started moving — preventDefault
 * cancels the browser's default navigation, not somebody else's programmatic
 * one, and the reader lands on the Figures page with no dialog. (The "How to
 * cite" modal never hit this because its triggers are <button>s, which the
 * router ignores.)
 *
 * So this is a single delegated listener on `window` in the CAPTURE phase.
 * Capture runs window → document → …, so it sees the click first, and
 * stopPropagation() keeps the event from ever reaching the router. Delegation
 * also means there is nothing to re-bind after an instant navigation.
 *
 * `data-img` is resolved by the browser against the current page, exactly
 * like the href, so both are written page-relative — note that a dashboard
 * page publishes to /dashboards/<name>/, two levels deep.
 */
const FIGURE_DIALOG = "figure-dialog";

function figureDialog() {
  let dialog = document.querySelector(`dialog.${FIGURE_DIALOG}`);
  if (dialog) return dialog;

  dialog = document.createElement("dialog");
  dialog.className = FIGURE_DIALOG;

  const title = document.createElement("p");
  title.className = "figure-dialog__title";

  const img = document.createElement("img");
  img.className = "figure-dialog__img";
  img.alt = "";

  const actions = document.createElement("p");
  actions.className = "figure-dialog__actions";

  const full = document.createElement("a");
  full.className = "figure-dialog__full";
  full.textContent = "Open the full figure, with its caption ↗";
  /* A *named* target rather than _blank: the reader keeps the page they
     were reading, and a second figure replaces the contents of the same
     "figures" tab instead of stacking up new ones.
     Deliberately no rel="noopener" — it severs the named context, so every
     click would open yet another tab and the reuse would never happen. The
     target is a page of this same site, so there is nothing to protect
     against. */
  full.target = "figures";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "figure-dialog__close";
  close.textContent = "Close";
  close.addEventListener("click", () => dialog.close());

  actions.append(full, close);
  dialog.append(title, img, actions);
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  document.body.appendChild(dialog);
  return dialog;
}

function openFigure(link) {
  const dialog = figureDialog();
  dialog.querySelector(".figure-dialog__title").textContent =
    link.dataset.title || link.textContent;
  const img = dialog.querySelector(".figure-dialog__img");
  img.src = link.dataset.img;
  img.alt = link.dataset.title || "";
  dialog.querySelector(".figure-dialog__full").href = link.href;
  dialog.showModal();
}

window.addEventListener(
  "click",
  (e) => {
    const link = e.target.closest && e.target.closest("a.figure-pop");
    if (!link || !link.dataset.img) return;

    // Honour the ways a reader asks for a new tab rather than a dialog.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation(); // keep the instant-navigation router out of it
    openFigure(link);
  },
  true,
);

/* The class only drives styling — it tells the stylesheet the enhancement is
 * available, so the ⤢ marker appears on links that will really open a
 * dialog. Re-applied after each instant navigation, which replaces <html>'s
 * attributes. */
function markFigureJs() {
  document.documentElement.classList.add("figure-js");
}

window.addEventListener("load", markFigureJs);
if (typeof document$ !== "undefined") document$.subscribe(markFigureJs);
