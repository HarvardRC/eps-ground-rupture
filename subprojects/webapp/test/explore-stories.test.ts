// The sample stories (guided DDD §10.2): every sample has one, each
// image is a committed project image with one allowlist line, alt text,
// a caption, a visible credit, and dimensions matching the file. The
// suite runs from subprojects/webapp/ (npm test), so the site tree is
// at ../mkdocs/.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { ANNOTATIONS, SHARED_SENTENCE, STORIES } from '../src/explore/stories';
import { isSampleId, type SampleId } from '../src/explore/state';

const SAMPLE_IDS: readonly SampleId[] = ['illustrative', 'kern'];
const IMAGES = '../mkdocs/docs/images/';
const ALLOWLIST = '../mkdocs/publication-allowlist.txt';

/** Width and height from a baseline or progressive JPEG's first SOF marker. */
function jpegSize(bytes: Buffer): { width: number; height: number } {
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'not a JPEG');
  let at = 2;
  while (at < bytes.length) {
    const marker = bytes.readUInt16BE(at);
    const length = bytes.readUInt16BE(at + 2);
    if (marker >= 0xffc0 && marker <= 0xffcf && marker !== 0xffc4 && marker !== 0xffc8 && marker !== 0xffcc) {
      return { height: bytes.readUInt16BE(at + 5), width: bytes.readUInt16BE(at + 7) };
    }
    at += 2 + length;
  }
  throw new Error('no SOF marker');
}

describe('sample stories (guided DDD §10.2)', () => {
  test('every sample has exactly one story, and every story belongs to a sample', () => {
    assert.deepEqual(Object.keys(STORIES).sort(), [...SAMPLE_IDS].sort());
    for (const id of Object.keys(STORIES)) assert.ok(isSampleId(id));
  });

  test('both stories carry the §10.5 shared sentence, and the old one is gone', () => {
    assert.equal(SHARED_SENTENCE, 'These examples help you try the tool. They do not reconstruct either earthquake.');
    for (const id of SAMPLE_IDS) {
      const text = STORIES[id].paragraphs.join(' ');
      assert.equal(text.split(SHARED_SENTENCE).length - 1, 1, id);
      assert.equal(text.includes('reproduce no event'), false, id);
    }
  });

  test('the illustrative story keeps its §10.2 anchors', () => {
    const text = STORIES.illustrative.paragraphs.join(' ');
    for (const anchor of ['illustrative', '1999 M 7.6 Chi-Chi earthquake', 'Chelungpu fault', 'bridge', 'Shih-Kang Dam', 'about 2.5 m', '0–3 m']) {
      assert.ok(text.includes(anchor), anchor);
    }
    assert.ok(STORIES.illustrative.sources.some(source => source.href === 'https://www.trimt-nsa.gov.tw/en/attraction/857/'));
  });

  test('the Kern story keeps its §10.2 anchors', () => {
    const text = STORIES.kern.paragraphs.join(' ');
    for (const anchor of ['1952 M 7.36 Kern County earthquake', 'White Wolf fault', 'near 75°', 'about 1.3 m', '60° and 70°', 'Buwalda and St. Amand', 'compare your results with those measurements']) {
      assert.ok(text.includes(anchor), anchor);
    }
  });

  test('the figures citation points at an anchor the figures page still has', () => {
    const figures = readFileSync('../mkdocs/docs/figures.md', 'utf8');
    for (const source of STORIES.illustrative.sources.filter(item => item.href.startsWith('../figures/#'))) {
      assert.ok(figures.includes(`{ #${source.href.split('#')[1]} }`), source.href);
    }
  });

  test('sources are site-relative pages or https links', () => {
    for (const id of SAMPLE_IDS) {
      assert.ok(STORIES[id].sources.length > 0);
      for (const source of STORIES[id].sources) assert.match(source.href, /^(https:\/\/|\.\.\/[a-z-]+\/)/);
    }
  });

  test('each image is a committed, allowlisted project image with alt text, caption, credit, and true dimensions', () => {
    const allowlist = readFileSync(ALLOWLIST, 'utf8').split('\n').map(line => line.trim());
    for (const id of SAMPLE_IDS) {
      const { images } = STORIES[id];
      assert.ok(images.length >= 1 && images.length <= 2, `${id}: one or two images`);
      for (const image of images) {
        const name = /^\.\.\/images\/([a-z0-9-]+\.jpg)$/.exec(image.src)?.[1];
        assert.ok(name, `${image.src} is a project image under images/`);
        assert.ok(allowlist.includes(`images/${name}`), `${name} has its allowlist line`);
        assert.deepEqual(jpegSize(readFileSync(IMAGES + name)), { width: image.width, height: image.height });
        assert.ok(image.alt.length > 20 && image.caption.length > 0);
        assert.match(image.credit.text, /^Photo: /);
        assert.match(image.credit.source.href, /^https:\/\//);
        // Either a linked open license or a stated public-domain credit.
        assert.ok(image.credit.license ? /^CC BY(-SA)? \d\.\d$/.test(image.credit.license.label) : /Public domain\.$/.test(image.credit.text));
      }
    }
  });
});

describe('value annotations (guided DDD §§10.4, 10.5)', () => {
  const FIELDS = ['faultDip', 'depth', 'density', 'sediment', 'offsetMax', 'slip'] as const;

  test('every sample annotates every prefilled control in one or two sentences', () => {
    assert.deepEqual(Object.keys(ANNOTATIONS).sort(), [...SAMPLE_IDS].sort());
    for (const id of SAMPLE_IDS) {
      assert.deepEqual(Object.keys(ANNOTATIONS[id]).sort(), [...FIELDS].sort(), id);
      for (const field of FIELDS) {
        const { text } = ANNOTATIONS[id][field];
        const sentences = text.split(/(?<=[.;])\s+(?=[A-Z])/).length;
        assert.ok(text.length > 0 && sentences <= 2, `${id} ${field}: ${text}`);
      }
    }
  });

  test('annotations link only their own story\'s sources, under the stories\' labels', () => {
    for (const id of SAMPLE_IDS) {
      for (const field of FIELDS) {
        for (const source of ANNOTATIONS[id][field].sources) assert.ok(STORIES[id].sources.includes(source), `${id} ${field}: ${source.label}`);
      }
    }
  });

  test('annotations name the events and the fault as the stories do (owner ruling, 2026-11-05)', () => {
    assert.match(ANNOTATIONS.illustrative.offsetMax.text, /in the 1999 Chi-Chi earthquake\.$/);
    assert.match(ANNOTATIONS.illustrative.faultDip.text, /1999 Chi-Chi earthquake/);
    assert.match(ANNOTATIONS.kern.faultDip.text, /^Geodetic studies put the White Wolf fault's dip near 75°/);
    assert.match(ANNOTATIONS.kern.offsetMax.text, /1952 Kern County earthquake/);
    // Every named event is the sample's own.
    for (const field of FIELDS) {
      assert.equal(/Kern|White Wolf|1952/.test(ANNOTATIONS.illustrative[field].text), false, field);
      assert.equal(/Chi-Chi|Chelungpu|1999/.test(ANNOTATIONS.kern[field].text), false, field);
    }
  });

  test('the Kern annotations keep their anchors', () => {
    assert.match(ANNOTATIONS.kern.faultDip.text, /near 75°/);
    assert.match(ANNOTATIONS.kern.offsetMax.text, /about 1\.3 m/);
    assert.match(ANNOTATIONS.kern.slip.text, /1\.6 m and 1\.9 m, used as an example band, not an uncertainty range/);
    assert.deepEqual(ANNOTATIONS.kern.slip.sources.map(s => s.label), ['Bawden (2001)']);
  });
});
