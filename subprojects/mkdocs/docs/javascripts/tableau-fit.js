/* Scale each Tableau embed to fill the column it sits in.
 *
 * Published dashboards have a fixed pixel size. The narrow "(web)" variants
 * are ~800 wide, so on a wide screen they used to sit in a pool of
 * whitespace; on a narrow one an unscaled viz would scroll or crop. Either
 * way we CSS-transform the viz by (available width / native width) and
 * collapse the wrapper to the scaled height.
 *
 * Scaling UP is allowed — that is what makes the 800-wide variants fill a
 * wide column. The cost is that the viz renders in an iframe, so an upscale
 * resamples its output and text softens a little. Cap it per embed with
 * `data-max-scale="1.25"` if a particular dashboard looks fuzzy; the default
 * cap below is generous enough to fill a 1400px column from 800px.
 *
 * Each wrapper carries the dashboard's true fixed size as data-width /
 * data-height — read from <dashboard>/<size> in the committed .twb, not
 * guessed. If a dashboard is re-published at a different size, update the
 * data attributes or it will scale wrongly.
 */
const DEFAULT_MAX_SCALE = 1.6;

function fitTableauVizzes() {
  document.querySelectorAll(".tableau-fit").forEach((wrap) => {
    const viz = wrap.querySelector("tableau-viz");
    if (!viz) return;
    const w = +wrap.dataset.width;
    const h = +wrap.dataset.height;
    if (!w || !h) return;
    const cap = +wrap.dataset.maxScale || DEFAULT_MAX_SCALE;
    const scale = Math.min(cap, wrap.clientWidth / w);
    viz.style.transform = `scale(${scale})`;
    viz.style.transformOrigin = "top left";
    wrap.style.height = `${h * scale}px`;
    wrap.style.overflow = "hidden";
  });
}

window.addEventListener("load", fitTableauVizzes);
window.addEventListener("resize", fitTableauVizzes);

// Material's instant navigation swaps page content without a reload, so the
// load event never fires again — re-fit on each navigation.
if (typeof document$ !== "undefined") document$.subscribe(fitTableauVizzes);

// The viz renders asynchronously; re-fit once it reports ready so the
// wrapper height matches what actually got drawn.
document.addEventListener("firstinteractive", fitTableauVizzes, true);
