// The chart node type and its string materialization (docs/app/ddd.md
// §5.12, Charts; §5.1, Builders and appliers): `SvgNode`, the plain value
// every chart builder returns, and `serializeSvg`, which writes it as
// markup for the determinism tests of §7.4 and the P2 chart export. The
// browser materialization is `toSvgElement` of `views/dom/svg.ts`.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

/** One SVG element (§5.12): its tag, its attributes in order, and its children; a string child is text. */
export type SvgNode = {
  tag: string;
  attrs: readonly (readonly [string, string])[];
  children: readonly (SvgNode | string)[];
};

/** `&`, `<`, `>`, and `"` escaped, for an attribute value. */
function escapeValue(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** `&`, `<`, and `>` escaped, for text. */
function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * The markup of `node` (§5.12): `<{tag}`, ` {name}="{value}"` per
 * attribute in array order, `>`, the children in order, `</{tag}>` — no
 * self-closing form, no whitespace or line break between nodes.
 */
export function serializeSvg(node: SvgNode): string {
  let out = `<${node.tag}`;
  for (const [name, value] of node.attrs) {
    out += ` ${name}="${escapeValue(value)}"`;
  }
  out += '>';
  for (const child of node.children) {
    out += typeof child === 'string' ? escapeText(child) : serializeSvg(child);
  }
  return `${out}</${node.tag}>`;
}
