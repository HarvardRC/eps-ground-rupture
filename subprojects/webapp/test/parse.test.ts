// parse.test.ts (docs/app/ddd.md §7.4, the `parse.test.ts` row; §5.7
// Free-entry validation; §5.3 Window resolution): grammar G with its
// canonical form and both 16-character limits, `storedBoundsFromDecimal`
// by integer arithmetic, the slip-window rows R1, the offset row R2, the
// dip-range grammar of R4, and the read-off validity rule R6. The
// recorded slip maximum comes from the fixture manifest (5.0135 m).

import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';

import type { Manifest } from '../src/decode/fields';
import {
  compareDecimals,
  dipsInRange,
  judgeOffset,
  judgeSlipWindow,
  readDecimal,
  readDipRange,
  readReadoff,
  storedBoundsFromDecimal,
} from '../src/state/parse';
import { buildFixture, decodeFixture, vocabularySpec } from './fixtures';

let manifest: Manifest;

before(async () => {
  manifest = (await decodeFixture(await buildFixture(vocabularySpec()))).manifest;
});

/** `text` alone, with a leading space, and with a trailing space. */
const spaced = (text: string): string[] => [text, ` ${text}`, `${text} `];

describe('grammar G', () => {
  test('canonical forms', () => {
    const cases: readonly (readonly [string, string])[] = [
      ['03.50', '3.5'],
      ['.5', '0.5'],
      ['3.', '3'],
      ['1,5', '1.5'],
      ['0.000', '0'],
      ['007', '7'],
      ['0', '0'],
      ['1234567890.12345', '1234567890.12345'],
    ];
    for (const [text, canonical] of cases) {
      for (const t of spaced(text)) {
        assert.deepEqual(readDecimal(t), { kind: 'decimal', value: canonical }, JSON.stringify(t));
      }
    }
  });

  test('BLANK', () => {
    for (const text of ['', ' ', '   ', '\t', ' \t\n\r\f ']) {
      assert.deepEqual(readDecimal(text), { kind: 'blank' }, JSON.stringify(text));
    }
  });

  test('INVALID, each also with a leading and a trailing space', () => {
    const invalid = [
      '-',
      '-0',
      '+3',
      '1e3',
      '3 m',
      'abc',
      'x1',
      '1 5',
      '1,000.5',
      '1,000,5',
      '.',
      ',',
      '1234567890.123456', // 17 characters
    ];
    for (const text of invalid) {
      for (const t of spaced(text)) {
        assert.deepEqual(readDecimal(t), { kind: 'invalid' }, JSON.stringify(t));
      }
    }
  });

  test('the 16-character limit on the trimmed text', () => {
    assert.equal('1234567890.12345'.length, 16);
    assert.equal(readDecimal('1234567890.12345').kind, 'decimal');
    assert.equal('1234567890.123456'.length, 17);
    assert.equal(readDecimal('1234567890.123456').kind, 'invalid');
  });

  test('the canonical-form limit', () => {
    for (const text of ['.12345678901234', '.123456789012340']) {
      assert.deepEqual(readDecimal(text), { kind: 'decimal', value: '0.12345678901234' }, text);
    }
    assert.equal('0.12345678901234'.length, 16);
    // The trimmed text has 16 characters; the canonical form would have 17.
    for (const text of ['.123456789012345', ',123456789012345']) {
      assert.equal(text.length, 16);
      assert.deepEqual(readDecimal(text), { kind: 'invalid' }, text);
    }
    // 17 characters, although the canonical form would have 16.
    assert.equal('00.12345678901234'.length, 17);
    assert.deepEqual(readDecimal('00.12345678901234'), { kind: 'invalid' });
  });

  test('decimals compare exactly, never through a float', () => {
    assert.equal(compareDecimals('5.0135', '5.01350'), 0);
    assert.equal(compareDecimals('0.1', '0.10000000000001'), -1);
    assert.equal(compareDecimals('1000', '1000.0001'), -1);
    assert.equal(compareDecimals('9007199254740993', '9007199254740992'), 1);
  });
});

describe('storedBoundsFromDecimal(min, max)', () => {
  test('ceil of the minimum and floor of the maximum, in stored units', () => {
    assert.equal(storedBoundsFromDecimal('0.00005', '1')[0], 1);
    assert.equal(storedBoundsFromDecimal('0', '5.01349')[1], 50134);
    assert.equal(storedBoundsFromDecimal('0', '5.0135')[1], 50135);
    assert.deepEqual(storedBoundsFromDecimal('0', '5.0135'), [0, 50135]);
    assert.deepEqual(storedBoundsFromDecimal('0.00005', '5.01349'), [1, 50134]);
  });

  test('12-decimal strings', () => {
    assert.deepEqual(storedBoundsFromDecimal('0.000100000001', '1.234567890123'), [2, 12345]);
    assert.deepEqual(storedBoundsFromDecimal('0.000000000001', '0.000099999999'), [1, 0]);
    assert.deepEqual(storedBoundsFromDecimal('2.500000000001', '2.500099999999'), [25001, 25000]);
    assert.deepEqual(storedBoundsFromDecimal('4.999999999999', '5.000000000001'), [50000, 50000]);
  });
});

describe('R1 — slip minimum and maximum', () => {
  const judge = (min: string, max: string) => judgeSlipWindow(min, max, manifest.slipWindowBounds);
  const rejected = (reason: string) => ({ kind: 'rejected', reason });

  test('the recorded maximum is the canonical decimal of slip_window_bounds.max', () => {
    assert.equal(String(manifest.slipWindowBounds.max), '5.0135');
  });

  test('accepted windows', () => {
    assert.deepEqual(judge('', ''), { kind: 'accepted', window: { mode: 'slip', min: null, max: null } });
    assert.deepEqual(judge('', '3'), { kind: 'accepted', window: { mode: 'slip', min: '0', max: '3' } });
    assert.deepEqual(judge('1', ''), { kind: 'accepted', window: { mode: 'slip', min: '1', max: '5.0135' } });
    assert.deepEqual(judge('2', '2'), { kind: 'accepted', window: { mode: 'slip', min: '2', max: '2' } });
    assert.deepEqual(judge('0', '5.0135'), { kind: 'accepted', window: { mode: 'slip', min: '0', max: '5.0135' } });
    assert.deepEqual(judge(' 03.50 ', '5.01350'), {
      kind: 'accepted',
      window: { mode: 'slip', min: '3.5', max: '5.0135' },
    });
  });

  test('a maximum above slip_window_bounds.max, compared as exact decimals', () => {
    assert.deepEqual(judge('', '5.0136'), rejected('above-recorded-max'));
    assert.deepEqual(judge('0', '5.01350000000001'), rejected('above-recorded-max'));
    assert.deepEqual(judge('1', '6'), rejected('above-recorded-max'));
  });

  test('a lone minimum above the recorded maximum', () => {
    assert.deepEqual(judge('5.01350000000001', ''), rejected('min-above-max'));
    assert.deepEqual(judge('6', ''), rejected('min-above-max'));
  });

  test('a minimum above the maximum', () => {
    assert.deepEqual(judge('3', '2'), rejected('min-above-max'));
    assert.deepEqual(judge('2.00001', '2'), rejected('min-above-max'));
  });

  test('a negative or unreadable entry', () => {
    for (const [min, max] of [
      ['-1', '2'],
      ['0', '-0'],
      ['abc', ''],
      ['', '3 m'],
      ['1e0', '2'],
    ]) {
      assert.deepEqual(judge(min, max), rejected('invalid'), `${min} / ${max}`);
    }
  });
});

describe('R2 — offset maximum', () => {
  test('0 and 1000 accepted; the canonical decimal becomes the offset maximum', () => {
    assert.deepEqual(judgeOffset('0'), { kind: 'accepted', window: { mode: 'offset', offsetMax: '0' } });
    assert.deepEqual(judgeOffset('1000'), { kind: 'accepted', window: { mode: 'offset', offsetMax: '1000' } });
    assert.deepEqual(judgeOffset('1000.0000'), { kind: 'accepted', window: { mode: 'offset', offsetMax: '1000' } });
    assert.deepEqual(judgeOffset(' 3,25 '), { kind: 'accepted', window: { mode: 'offset', offsetMax: '3.25' } });
  });

  test('1000.0001 rejected: above the R2 bound, compared as exact decimals', () => {
    assert.deepEqual(judgeOffset('1000.0001'), { kind: 'rejected', reason: 'above-bound' });
    assert.deepEqual(judgeOffset('1000.00000000001'), { kind: 'rejected', reason: 'above-bound' });
  });

  test('INVALID and BLANK at a commit are rejected', () => {
    for (const text of ['-1', 'abc', '1e3', '.', '0.123456789012345']) {
      assert.deepEqual(judgeOffset(text), { kind: 'rejected', reason: 'invalid' }, text);
    }
    for (const text of ['', '  ']) {
      assert.deepEqual(judgeOffset(text), { kind: 'rejected', reason: 'blank' }, JSON.stringify(text));
    }
  });
});

describe('R4 — the dip-range assist grammar', () => {
  test('16 characters readable, 17 unreadable', () => {
    assert.equal('20.25° – 45.125°'.length, 16);
    assert.deepEqual(readDipRange('20.25° – 45.125°'), { kind: 'range', lo: '20.25', hi: '45.125' });
    assert.equal('20.125° – 45.125°'.length, 17);
    assert.deepEqual(readDipRange('20.125° – 45.125°'), { kind: 'unreadable' });
  });

  test('one value, two values in either order, hyphen-minus or en dash; BLANK; unreadable', () => {
    assert.deepEqual(readDipRange('40'), { kind: 'range', lo: '40', hi: '40' });
    assert.deepEqual(readDipRange('30–40'), { kind: 'range', lo: '30', hi: '40' });
    assert.deepEqual(readDipRange(' 40 - 30° '), { kind: 'range', lo: '30', hi: '40' });
    assert.deepEqual(readDipRange(''), { kind: 'blank' });
    assert.deepEqual(readDipRange('   '), { kind: 'blank' });
    for (const text of ['abc', '30 to 40', '-30', '30–', '30,5']) {
      assert.deepEqual(readDipRange(text), { kind: 'unreadable' }, text);
    }
  });

  test('the endpoints compare with the modeled dips exactly, both inclusive', () => {
    const dips = manifest.trialColumns.fault_dip;
    assert.deepEqual(dipsInRange({ lo: '30', hi: '40' }, dips), [30, 40]);
    assert.deepEqual(dipsInRange({ lo: '30.000000001', hi: '44.99999' }, dips), [40]);
    assert.deepEqual(dipsInRange({ lo: '71', hi: '89' }, dips), []);
  });
});

describe('R6 — the read-off validity rule', () => {
  test('BLANK, invalid, or the percentile q', () => {
    assert.deepEqual(readReadoff('', false), { kind: 'blank' });
    assert.deepEqual(readReadoff('', true), { kind: 'invalid' });
    assert.deepEqual(readReadoff('50', true), { kind: 'invalid' });
    for (const q of [0, 16, 50, 84, 100]) {
      assert.deepEqual(readReadoff(String(q), false), { kind: 'percentile', q });
    }
    for (const value of ['101', '-1', '2.5', '100.5']) {
      assert.deepEqual(readReadoff(value, false), { kind: 'invalid' }, value);
    }
  });
});
