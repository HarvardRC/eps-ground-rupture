// The offset-to-slip conversion assist panel's builder (docs/app/ddd.md
// §5.5, Use): `assistLines(input)`, the paragraphs of `#gre-assist-body`
// (§5.8), computed from the `RenderInput` alone — its Scenario snapshot
// and its `windows`, `flags`, and `regression` members. The render pass
// (`views/dom/render.ts`, T-46) commits each string as one `<p>` of the
// slot; in slip mode the slot holds nothing.
//
// A browser-and-Node file (§5.1): no DOM global, no DOM type.

import { displayDecimals } from '../config';
import type { RangeFlag } from '../convert/convert';
import { fillCopy } from './chart-text';
import { copyText } from './copy';
import { displayRound } from './format';
import type { RenderInput } from './render-input';

/** What `assistLines` reads of a `RenderInput` (§5.5, Use). */
export type AssistInput = Pick<RenderInput, 'scenario' | 'windows' | 'flags' | 'regression'>;

/** The reading precision of the §3.5 coefficient table: six decimals (§5.5, fixed here). */
const COEFFICIENT_DECIMALS = 6;

/** The registry keys of the PDD §3.5 range-flag terms. */
const FLAG_KEYS: { readonly [f in RangeFlag]: string } = {
  in_range: 'pdd3.5.flagInRange',
  partly_out: 'pdd3.5.flagPartlyOutOfRange',
  out_of_range: 'pdd3.5.flagOutOfRange',
};

/** The PDD §3.5 term for a range flag: `in-range`, `partly-out-of-range`, or `out-of-range`. */
export function rangeFlagTerm(flag: RangeFlag): string {
  return copyText(FLAG_KEYS[flag]);
}

/**
 * The assist panel's paragraphs (§5.5, Use), or null in slip mode: the
 * first text of PDD §5.6 with `{X}` the canonical `offsetMax`, then, for
 * each selected dip in ascending order, the window line — `{lo}` and
 * `{hi}` the dip's `windows` ends by `displayRound(v, 2)`, 2 being
 * `displayDecimals('slip')`, and `{flag}` the PDD §3.5 term for its
 * `flags` entry — and the provenance line — `{form}` and
 * `{back_projection}` the `regression`'s `relationship` strings verbatim,
 * `{slope}` and `{intercept}` the dip's coefficients by
 * `displayRound(v, 6)`. Throws when an offset-mode input lacks a
 * selected dip's window, flag, or coefficient row — an internal failure
 * (§5.10).
 */
export function assistLines(input: AssistInput): readonly string[] | null {
  const window = input.scenario.window;
  if (window.mode === 'slip') return null;
  const { windows, flags, regression } = input;
  if (windows === null || flags === null || regression === null) {
    throw new Error('assistLines: an offset-mode RenderInput without windows, flags, or regression');
  }
  const slipDecimals = displayDecimals('slip');
  const lines: string[] = [fillCopy('pdd5.6.assistText', { X: window.offsetMax })];
  for (const dip of [...input.scenario.faultDip].sort((a, b) => a - b)) {
    const w = windows.find((e) => e.faultDip === dip);
    const flag = flags.find((e) => e.faultDip === dip);
    const row = regression.coefficients.find((e) => e.faultDip === dip);
    if (w === undefined || flag === undefined || row === undefined) {
      throw new Error(`assistLines: no window, flag, or coefficient row for the selected dip ${dip}`);
    }
    const Dip = String(dip);
    lines.push(
      fillCopy('ddd5.5.windowLine', {
        Dip,
        lo: displayRound(w.lo, slipDecimals),
        hi: displayRound(w.hi, slipDecimals),
        flag: rangeFlagTerm(flag.rangeFlag),
      }),
      fillCopy('ddd5.5.provenanceLine', {
        Dip,
        back_projection: regression.relationship.backProjection,
        form: regression.relationship.form,
        slope: displayRound(row.slope, COEFFICIENT_DECIMALS),
        intercept: displayRound(row.intercept, COEFFICIENT_DECIMALS),
      }),
    );
  }
  return lines;
}
