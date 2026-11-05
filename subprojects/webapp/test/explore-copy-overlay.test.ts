// The guided copy overlay (guided DDD §11.1; ruling (A), 2026-11-05):
// every adopted text keeps its registry entry's slots, the shared
// registry is untouched, and the rewrite turns each registry text, slots
// filled, into the adopted one.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { copyEntry, copyText } from '../src/views/copy';
import { fillCopy } from '../src/views/chart-text';
import { GUIDED_COPY, guided, guidedSvg } from '../src/explore/copy-overlay';

describe('guided copy overlay (§11.1)', () => {
  test('every overlaid key exists in the registry and the registry still holds its own text', () => {
    for (const key of Object.keys(GUIDED_COPY)) {
      assert.ok(copyEntry(key), key);
      assert.notEqual(copyText(key), GUIDED_COPY[key], key);
    }
    assert.match(copyText('ddd5.8.rowExcludedNullCount'), /Excluded null count/);
  });

  test('filled registry texts become the adopted texts, slots kept', () => {
    assert.equal(guided(copyText('ddd5.8.rowValidCount')), 'Measurements used');
    assert.equal(guided(copyText('ddd5.8.rowExcludedNullCount')), 'Missing values (excluded)');
    assert.equal(guided(fillCopy('pdd5.8.smallResultWarning', { N: '7' })), 'Only 7 measurements can be used for this scenario — too few for a reliable distribution. Interpret with caution.');
    assert.equal(guided(fillCopy('ddd5.11.histogramLabel', { label: 'Scarp height (m)', N: '1,011' })), 'Scarp height (m): histogram of 1,011 measurements used');
    assert.match(guided(copyText('pdd5.9.lowSlipCaveat')), /^Your selected range includes very small slip values/);
    // Inside larger markup too, and text it does not know passes unchanged.
    assert.equal(guided(`<svg aria-label="${fillCopy('ddd5.11.cumulativeLabel', { label: 'Scarp dip (°)', N: '12' })}">`), '<svg aria-label="Scarp dip (°): cumulative distribution of 12 measurements used">');
    assert.equal(guided('Nothing to change here.'), 'Nothing to change here.');
    assert.equal(guided(copyText('ddd5.12.countAxisTitle')), 'Measurements used');
    assert.equal(guided(fillCopy('pdd5.8.noValidMeasurement', { X: '12', measurement: 'scarp dip' })), '12 simulation stages match this scenario, but none has a scarp dip value — no distribution can be computed. The stages appear in the Missing values (excluded) count of the statistics table.');
  });

  test('a chart tree is rewritten in its attributes and text, its shape kept', () => {
    const tree = { tag: 'svg', attrs: [['aria-label', fillCopy('ddd5.11.histogramLabel', { label: 'Scarp height (m)', N: '3' })], ['width', '300']] as const, children: [{ tag: 'text', attrs: [], children: [copyText('ddd5.8.rowValidCount')] }, 'plain'] };
    const out = guidedSvg(tree);
    assert.deepEqual(out.attrs, [['aria-label', 'Scarp height (m): histogram of 3 measurements used'], ['width', '300']]);
    assert.deepEqual(out.children, [{ tag: 'text', attrs: [], children: ['Measurements used'] }, 'plain']);
  });

  test('edge cases: an empty slot, a slot spanning lines, and geometry left alone and cheap', () => {
    assert.equal(guided(fillCopy('pdd5.8.smallResultWarning', { N: '' })), 'Only  measurements can be used for this scenario — too few for a reliable distribution. Interpret with caution.');
    assert.equal(guided(fillCopy('ddd5.11.histogramLabel', { label: 'Two\nlines', N: '4' })), 'Two\nlines: histogram of 4 measurements used');
    const points = Array.from({ length: 512 }, (_, i) => `${i}.123,${(i * 7) % 300}.456`).join(' ');
    const tree = { tag: 'polyline', attrs: [['points', points], ['aria-label', 'Scarp height (m): histogram of 2 valid measurements']] as const, children: [] };
    const started = performance.now();
    for (let i = 0; i < 50; i++) guidedSvg(tree);
    const out = guidedSvg(tree);
    assert.equal(out.attrs[0][1], points);
    assert.equal(out.attrs[1][1], 'Scarp height (m): histogram of 2 measurements used');
    assert.ok(performance.now() - started < 500, 'fifty rewrites of a full chart stay cheap');
  });

  test('no adopted text keeps the replaced wording', () => {
    for (const text of Object.values(GUIDED_COPY)) {
      assert.equal(/valid measurement|null count|Your window/.test(text), false, text);
    }
  });
});
