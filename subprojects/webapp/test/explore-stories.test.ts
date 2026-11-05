// The sample stories (guided DDD §10.2): every sample has one, each
// image is a committed project image with one allowlist line, alt text,
// a caption, a visible credit, and dimensions matching the file. The
// suite runs from subprojects/webapp/ (npm test), so the site tree is
// at ../mkdocs/.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

import { STORIES } from '../src/explore/stories';
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

  test('each story says its values are anchored, not modeled', () => {
    assert.match(STORIES.illustrative.paragraphs.join(' '), /do not model the Chi-Chi earthquake/);
    assert.match(STORIES.kern.paragraphs.join(' '), /M 7\.36 Kern County earthquake/);
    assert.match(STORIES.kern.paragraphs.join(' '), /they do not model it/);
    assert.match(STORIES.kern.paragraphs.join(' '), /Buwalda and St\. Amand/);
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
