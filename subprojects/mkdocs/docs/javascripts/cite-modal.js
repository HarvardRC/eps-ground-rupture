/* The "How to cite" modal.
 *
 * A page carries the citation text once, as the `.cite-source` block from
 * `includes/cite.md`, plus any number of buttons:
 *
 *     <button class="cite-open" type="button">How to cite</button>
 *
 * This script moves that block into a <dialog> appended to <body> and points
 * every button at it. One copy of the text, many places to open it.
 *
 * Why a native <dialog>: focus trapping, Escape-to-close and the backdrop
 * come from the browser rather than from code we would have to maintain.
 *
 * Progressive enhancement: extra.css hides `.cite-open` until this script
 * adds `cite-js` to <html>, and a <noscript> rule in the snippet reveals the
 * citation in place. If the script never runs, the reader sees the citation
 * inline and no buttons — never a button that does nothing.
 */
const CITE_DIALOG = "cite-dialog";

/* The page's own copy — i.e. one that has not already been moved into the
   dialog. After a Material instant navigation the previous page's dialog is
   still in <body> (it sits outside the swapped content), so "is it inside a
   dialog?" is what separates a fresh block from an already-wired one. */
function looseCiteSource() {
  return (
    [...document.querySelectorAll(".cite-source")].find(
      (el) => !el.closest("dialog"),
    ) || null
  );
}

function buildCiteDialog(source) {
  const dialog = document.createElement("dialog");
  dialog.className = CITE_DIALOG;
  dialog.setAttribute("aria-label", "How to cite");

  /* `md-typeset` so the blockquote, links and emphasis inside pick up
     Material's typography — the dialog lives outside the content column,
     where those styles would not otherwise reach. */
  const body = document.createElement("div");
  body.className = "cite-dialog__body md-typeset";
  body.appendChild(source); // moved, not copied: one instance, no drift

  const close = document.createElement("button");
  close.type = "button";
  close.className = "cite-dialog__close";
  close.textContent = "Close";
  close.addEventListener("click", () => dialog.close());

  dialog.append(body, close);
  // A click landing on the dialog itself is a click on the backdrop.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  document.body.appendChild(dialog);
  return dialog;
}

function setupCiteModal() {
  document.documentElement.classList.add("cite-js");

  const buttons = document.querySelectorAll(".cite-open");
  const existing = document.querySelector(`dialog.${CITE_DIALOG}`);

  if (!buttons.length) {
    // Navigated to a page with no buttons — drop the stale dialog.
    if (existing) existing.remove();
    return;
  }

  const source = looseCiteSource();
  if (source) {
    if (existing) existing.remove();
    buildCiteDialog(source);
  } else if (!existing) {
    return; // buttons but no citation text on this page
  }

  buttons.forEach((button) => {
    if (button.dataset.citeBound) return;
    button.dataset.citeBound = "1";
    // Looked up at click time, so a rebuilt dialog is never a stale reference.
    button.addEventListener("click", () => {
      document.querySelector(`dialog.${CITE_DIALOG}`)?.showModal();
    });
  });
}

window.addEventListener("load", setupCiteModal);

// Material's instant navigation swaps page content without a reload, so the
// load event never fires again — re-wire on each navigation.
if (typeof document$ !== "undefined") document$.subscribe(setupCiteModal);
