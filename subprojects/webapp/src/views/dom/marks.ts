// The paint marks of docs/app/ddd.md §7.6 (Instrumentation):
// `markAfterPaint(name, seq, check, live)` records the User Timing mark
// `name` with `detail: { seq, visible: check() }` in the first task after
// the rendering update of the frame that contains the commit — an upper
// bound on main-thread paint, never earlier. Inside the §5.3 scheduler's
// frame callback it posts a `MessageChannel` message right away; for the
// first result, which `main.ts` commits outside the scheduler as sequence
// number 0 (`egr:first-result`), it first requests one animation frame
// and posts from there. In that message's task the mark is recorded only
// if `live()` — §5.3 item 2's `isLatest(seq)` — is true. In a browser
// without `MessageChannel` or the User Timing Level 3 options object it
// records nothing and never throws: the marks are measurement aids and
// never change what a reader sees.
//
// `resultVisible(root, measurement, inViewport)` is the `check` of §7.6.
//
// A browser-only file (§5.1).

import type { MeasurementName } from '../../state/state';

/** The mark that `main.ts` records after the mount's first result commit (§7.6). */
const FIRST_RESULT = 'egr:first-result';

/** Records `performance.mark(name, { detail: { seq, visible: check() } })` if `live()`; never throws. */
function record(name: string, seq: number, check: () => boolean, live: () => boolean): void {
  try {
    if (!live()) return;
    performance.mark(name, { detail: { seq, visible: check() } });
  } catch {
    // A browser without the User Timing Level 3 options object: no mark (§7.6).
  }
}

/** Posts one `MessageChannel` message and records the mark in its task. */
function post(name: string, seq: number, check: () => boolean, live: () => boolean): void {
  const channel = new MessageChannel();
  channel.port1.onmessage = () => {
    channel.port1.close();
    record(name, seq, check, live);
  };
  channel.port2.postMessage(null);
}

/**
 * Records the mark `name` for the commit of sequence number `seq` after
 * the rendering update that paints it (§7.6, Instrumentation): from the
 * scheduler's frame callback, a `MessageChannel` message posted at once;
 * for `egr:first-result`, committed outside any frame callback, one
 * animation frame first. In the message's task the mark is recorded only
 * if `live()` holds, with `detail.visible` from `check()`.
 */
export function markAfterPaint(name: string, seq: number, check: () => boolean, live: () => boolean): void {
  try {
    if (typeof MessageChannel !== 'function') return;
    if (name === FIRST_RESULT) {
      requestAnimationFrame(() => {
        try {
          post(name, seq, check, live);
        } catch {
          // No mark (§7.6).
        }
      });
    } else {
      post(name, seq, check, live);
    }
  } catch {
    // No mark (§7.6).
  }
}

/** True when `element` is connected with a non-zero box area, and, with `inViewport`, intersects the viewport. */
function shown(element: Element | null, inViewport: boolean): boolean {
  if (element === null || !element.isConnected) return false;
  const box = element.getBoundingClientRect();
  if (box.width * box.height <= 0) return false;
  if (!inViewport) return true;
  return box.bottom > 0 && box.right > 0 && box.top < window.innerHeight && box.left < window.innerWidth;
}

/**
 * The `check` of §7.6: true when `#gre-state` is shown while no record
 * matches (`#gre-panels` hidden), and otherwise when the panel of
 * `measurement` shows its statistics `<table>` and its chart `<svg>` or
 * the notice standing in for the chart; with `inViewport` — the
 * `egr:first-result` case — each must also intersect the viewport.
 */
export function resultVisible(root: HTMLElement, measurement: MeasurementName, inViewport: boolean): boolean {
  const panels = root.querySelector<HTMLElement>('#gre-panels');
  if (panels === null) return false;
  if (panels.hidden) return shown(root.querySelector('#gre-state'), inViewport);
  const section = panels.querySelector(`#gre-${measurement}`);
  if (section === null) return false;
  const table = section.querySelector('.gre-table table');
  const chart = section.querySelector('.gre-chart svg') ?? section.querySelector('.gre-chart .gre-chart-notice');
  return shown(table, inViewport) && shown(chart, inViewport);
}
