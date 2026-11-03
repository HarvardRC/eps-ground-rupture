// The browser materialization of an `SvgNode` (docs/app/ddd.md §5.12,
// Charts): `toSvgElement`, through `createElementNS`, setting the
// attributes in array order and each string child as a text node.
//
// A browser-only file (§5.1).

import type { SvgNode } from '../svg';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** The DOM element `node` describes (§5.12). */
export function toSvgElement(node: SvgNode): SVGElement {
  const element = document.createElementNS(SVG_NS, node.tag);
  for (const [name, value] of node.attrs) {
    element.setAttribute(name, value);
  }
  for (const child of node.children) {
    element.appendChild(typeof child === 'string' ? document.createTextNode(child) : toSvgElement(child));
  }
  return element;
}
