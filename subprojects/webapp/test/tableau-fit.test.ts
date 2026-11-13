// Regression contracts for the companion site's shared Tableau sizing
// script. Run its actual event handlers with native-size embeds and
// changing columns; live browser review verifies the rendered iframe.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../../../mkdocs/docs/javascripts/tableau-fit.js', import.meta.url), 'utf8');

class Embed {
  style: Record<string, string> = {};
  attributes = new Map<string, string>();
  constructor(readonly wrapper: Wrapper) {}
  getAttribute(name: string): string | null { return this.attributes.get(name) ?? null; }
  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  closest(selector: string): Embed | Wrapper | null {
    return selector === 'tableau-viz' ? this : selector === '.tableau-fit' ? this.wrapper : null;
  }
}

class Wrapper {
  style: Record<string, string> = {};
  dataset: Record<string, string>;
  // A 1px border on each edge, as in extra.css.
  clientHeight = 240;
  offsetHeight = 242;
  readonly viz = new Embed(this);
  constructor(public clientWidth: number, width = 800, height = 1400, cap?: number) {
    this.dataset = { width: String(width), height: String(height) };
    if (cap !== undefined) this.dataset.maxScale = String(cap);
    this.viz.attributes.set('width', String(width));
    this.viz.attributes.set('height', String(height));
  }
  querySelector(selector: string): Embed | null { return selector === 'tableau-viz' ? this.viz : null; }
}

function mount(initial: Wrapper[]) {
  let wrappers = initial;
  let navigate = () => {};
  const windowEvents = new Map<string, () => void>();
  const documentEvents = new Map<string, (event: { target: unknown }) => void>();
  runInNewContext(script, {
    window: { addEventListener: (name: string, callback: () => void) => windowEvents.set(name, callback) },
    document: {
      querySelectorAll: () => wrappers,
      addEventListener: (name: string, callback: (event: { target: unknown }) => void) => documentEvents.set(name, callback),
    },
    document$: { subscribe: (callback: () => void) => { navigate = callback; callback(); } },
  });
  return {
    resize: () => windowEvents.get('resize')!(),
    navigate: (next: Wrapper[]) => { wrappers = next; navigate(); },
    interactive: (target: unknown) => documentEvents.get('firstinteractive')!({ target }),
  };
}

function renderedWidth(viz: Embed): number {
  // A block custom element with no CSS width fills its containing column.
  const layoutWidth = viz.style.width ? Number.parseFloat(viz.style.width) : viz.wrapper.clientWidth;
  return layoutWidth * Number(viz.style.transform.match(/^scale\((.*)\)$/)![1]);
}

test('a narrow and a wide column each receive one scaling of a native-size embed', () => {
  const wrapper = new Wrapper(356);
  const page = mount([wrapper]);
  assert.equal(wrapper.viz.style.width, '800px');
  assert.equal(wrapper.viz.style.height, '1400px');
  assert.equal(renderedWidth(wrapper.viz), 356);
  assert.equal(wrapper.style.height, '625px');
  assert.equal(wrapper.dataset.tableauReady, undefined);

  wrapper.clientWidth = 996;
  page.resize();
  assert.ok(Math.abs(renderedWidth(wrapper.viz) - 996) < 1e-10);
  assert.equal(Number.parseFloat(wrapper.style.height), 1400 * (996 / 800) + 2);
});

test('instant navigation sizes new embeds and keeps component dimensions consistent with the host', () => {
  const page = mount([new Wrapper(356)]);
  const next = new Wrapper(1200, 1000, 800, 1.1);
  next.viz.attributes.set('width', '800');
  page.navigate([next]);
  assert.equal(next.viz.getAttribute('width'), '1000');
  assert.equal(next.viz.getAttribute('height'), '800');
  assert.equal(next.viz.style.width, '1000px');
  assert.equal(next.viz.style.height, '800px');
  assert.equal(renderedWidth(next.viz), 1100);
  assert.ok(Math.abs(Number.parseFloat(next.style.height) - 882) < 1e-10);
  assert.equal(next.dataset.tableauReady, undefined);
});

test('firstinteractive dismisses only the ready embed’s skeleton, including after navigation', () => {
  const first = new Wrapper(356), second = new Wrapper(356);
  const page = mount([first, second]);
  page.interactive(first.viz);
  assert.equal(first.dataset.tableauReady, 'true');
  assert.equal(second.dataset.tableauReady, undefined);
  page.resize();
  assert.equal(first.dataset.tableauReady, 'true');

  const next = new Wrapper(600);
  page.navigate([next]);
  assert.equal(next.dataset.tableauReady, undefined);
  page.interactive(next.viz);
  assert.equal(next.dataset.tableauReady, 'true');
  page.interactive({}); // An unrelated event must not dismiss any loader.
});
