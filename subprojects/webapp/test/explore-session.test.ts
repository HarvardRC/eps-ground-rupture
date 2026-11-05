// Same-tab continuity records (guided DDD §9.2): the pure serialization
// and classification. Restores in a real page are §9.5's to verify.
import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';

import type { Manifest } from '../src/decode/fields';
import { cloneDraft, freshDraft, sampleDraft } from '../src/explore/state';
import {
  classifySession,
  clearSession,
  loadSession,
  saveSession,
  SESSION_KEY,
  type DisplayChoices,
  type SessionRecord,
} from '../src/explore/session';
import { buildFixture, decodeFixture, vocabularySpec } from './fixtures';

let manifest: Manifest;

before(async () => {
  manifest = (await decodeFixture(await buildFixture(vocabularySpec()))).manifest;
});

/** A Storage held in memory; `failSet`/`failGet` make it throw like a refusing browser storage. */
class MemoryStorage implements Storage {
  readonly items = new Map<string, string>();
  failSet = false;
  failGet = false;
  get length(): number { return this.items.size; }
  clear(): void { this.items.clear(); }
  getItem(key: string): string | null {
    if (this.failGet) throw new DOMException('denied', 'SecurityError');
    return this.items.get(key) ?? null;
  }
  key(index: number): string | null { return [...this.items.keys()][index] ?? null; }
  removeItem(key: string): void { this.items.delete(key); }
  setItem(key: string, value: string): void {
    if (this.failSet) throw new DOMException('full', 'QuotaExceededError');
    this.items.set(key, value);
  }
}

function display(): DisplayChoices {
  return {
    measurement: 'dzw',
    view: { scarp_height: 'histogram', dzw: 'cumulative', scarp_dip: 'histogram' },
    readoff: { scarp_height: null, dzw: 90, scarp_dip: null },
    logScale: true,
    chartDataOpen: { scarp_height: false, dzw: true, scarp_dip: false },
    exampleOpen: true,
    refineOpen: false,
    sample: { id: 'kern', modified: true },
    confirmedSample: { id: 'illustrative', modified: false, current: false },
  };
}

function record(overrides: Partial<SessionRecord> = {}): SessionRecord {
  const confirmed = sampleDraft(manifest, 'illustrative');
  const draft = cloneDraft(confirmed);
  draft.mode = 'slip'; draft.slipMax = '9x'; draft.faultDip = [];
  // Without a confirmation there is no confirmed scenario's fill.
  const shown = overrides.confirmed === null ? { ...display(), confirmedSample: null } : display();
  return { record: 1, dataVersion: 'data-v1', step: 'results', draft, confirmed, display: shown, ...overrides };
}

function stored(storage: MemoryStorage): Record<string, unknown> {
  return JSON.parse(storage.items.get(SESSION_KEY)!) as Record<string, unknown>;
}

describe('session record round trip', () => {
  test('save and load return the same record under the documented key', () => {
    const storage = new MemoryStorage();
    const original = record();
    assert.equal(saveSession(storage, original), true);
    assert.deepEqual([...storage.items.keys()], ['gre-explore-session']);
    assert.deepEqual(loadSession(storage), original);
    const kept = classifySession(loadSession(storage), 'data-v1', manifest);
    assert.equal(kept.kind, 'restore');
    // The incomplete working draft and its invalid inactive text survive (D-30).
    assert.deepEqual(kept.kind === 'restore' && kept.record.draft, original.draft);
  });

  test('a fresh unconfirmed record before results round-trips too', () => {
    const storage = new MemoryStorage();
    const original = record({ step: 'site', draft: freshDraft(manifest), confirmed: null });
    saveSession(storage, original);
    assert.deepEqual(classifySession(loadSession(storage), 'data-v1', manifest), { kind: 'restore', record: original });
  });

  test('only the record fields are serialized: no result, counts, stamps, or walkthrough', () => {
    const storage = new MemoryStorage();
    saveSession(storage, record());
    const value = stored(storage);
    assert.deepEqual(Object.keys(value).sort(), ['confirmed', 'dataVersion', 'display', 'draft', 'record', 'step']);
    assert.deepEqual(Object.keys(value.display as object).sort(),
      ['chartDataOpen', 'confirmedSample', 'exampleOpen', 'logScale', 'measurement', 'readoff', 'refineOpen', 'sample', 'view']);
    const text = storage.items.get(SESSION_KEY)!;
    for (const forbidden of ['matchingRecords', 'selection', 'perMeasurement', 'histogramLog', 'measurements', 'softwareVersion', 'guide', 'sequence', 'stats']) {
      assert.equal(text.includes(forbidden), false, forbidden);
    }
  });

  test('clearing removes the record', () => {
    const storage = new MemoryStorage();
    saveSession(storage, record());
    clearSession(storage);
    assert.equal(loadSession(storage), 'absent');
  });
});

describe('the sample notice in the record (owner decision R, 2026-11-05)', () => {
  test('a fill still current round-trips with its Modified state', () => {
    const storage = new MemoryStorage();
    const original = record({ display: { ...display(), sample: { id: 'kern', modified: false }, confirmedSample: { id: 'kern', modified: false, current: true } } });
    saveSession(storage, original);
    assert.deepEqual(classifySession(loadSession(storage), 'data-v1', manifest), { kind: 'restore', record: original });
  });

  test('no fill at all round-trips as nulls', () => {
    const storage = new MemoryStorage();
    const original = record({ display: { ...display(), sample: null, confirmedSample: null } });
    saveSession(storage, original);
    assert.deepEqual(loadSession(storage), original);
  });

  test('a record from before the sample keys restores without a notice', () => {
    const storage = new MemoryStorage();
    const value = JSON.parse(JSON.stringify(record())) as Record<string, any>;
    delete value.display.sample; delete value.display.confirmedSample;
    storage.items.set(SESSION_KEY, JSON.stringify(value));
    const loaded = loadSession(storage);
    assert.notEqual(loaded, 'invalid');
    assert.equal(loaded !== 'invalid' && loaded !== 'absent' && loaded.display.sample, null);
    assert.equal(loaded !== 'invalid' && loaded !== 'absent' && loaded.display.confirmedSample, null);
  });

  test('a confirmed fill without a confirmed scenario is unreadable', () => {
    const storage = new MemoryStorage();
    storage.items.set(SESSION_KEY, JSON.stringify(record({ step: 'site', confirmed: null, display: display() })));
    assert.equal(loadSession(storage), 'invalid');
  });
});

describe('unrestorable records', () => {
  test('tampered JSON is invalid and classified unreadable', () => {
    const storage = new MemoryStorage();
    storage.items.set(SESSION_KEY, '{"record":1,');
    assert.equal(loadSession(storage), 'invalid');
    assert.deepEqual(classifySession(loadSession(storage), 'data-v1', manifest), { kind: 'unreadable' });
  });

  test('a wrong record version is unreadable', () => {
    for (const version of [2, 0, '1', null]) {
      const storage = new MemoryStorage();
      storage.items.set(SESSION_KEY, JSON.stringify({ ...record(), record: version }));
      assert.equal(loadSession(storage), 'invalid', String(version));
    }
  });

  test('structural tampering is unreadable', () => {
    const cases: ((value: Record<string, any>) => void)[] = [
      v => { v.extra = true; },
      v => { delete v.display; },
      v => { v.step = 'summary'; },
      v => { v.draft.faultDip = ['30']; },
      v => { v.draft.mode = 'both'; },
      v => { v.draft.sediment = [{ set: 'Homogeneous' }]; },
      v => { v.display.readoff.dzw = 101; },
      v => { v.display.view.dzw = 'log'; },
      v => { v.display.result = {}; },
      v => { v.confirmed.offsetMax = 3; },
      // The sample notice's state (owner decision R, 2026-11-05).
      v => { delete v.display.confirmedSample; },
      v => { v.display.sample = { id: 'loma-prieta', modified: false }; },
      v => { v.display.sample = { id: 'kern', modified: 'yes' }; },
      v => { v.display.sample = { id: 'kern' }; },
      v => { v.display.sample = { id: 'kern', modified: false, values: {} }; },
      v => { v.display.sample = 'kern'; },
      v => { v.display.confirmedSample = { id: 'kern', modified: false }; },
      v => { v.display.confirmedSample.current = true; },
      v => { v.display.sample = null; },
    ];
    for (const tamper of cases) {
      const storage = new MemoryStorage();
      const value = JSON.parse(JSON.stringify(record())) as Record<string, any>;
      tamper(value);
      storage.items.set(SESSION_KEY, JSON.stringify(value));
      assert.equal(loadSession(storage), 'invalid', tamper.toString());
    }
  });

  test('a data-version mismatch is classified separately', () => {
    const storage = new MemoryStorage();
    saveSession(storage, record());
    assert.deepEqual(classifySession(loadSession(storage), 'data-v2', manifest), { kind: 'data-changed' });
  });

  test('a confirmed draft that no longer validates is unreadable', () => {
    const storage = new MemoryStorage();
    const confirmed = sampleDraft(manifest, 'illustrative');
    confirmed.faultDip = [25];
    saveSession(storage, record({ confirmed }));
    assert.deepEqual(classifySession(loadSession(storage), 'data-v1', manifest), { kind: 'unreadable' });
  });

  test('a results step without a confirmation is unreadable', () => {
    const storage = new MemoryStorage();
    saveSession(storage, record({ confirmed: null }));
    assert.deepEqual(classifySession(loadSession(storage), 'data-v1', manifest), { kind: 'unreadable' });
  });

  test('no record is absent', () => {
    assert.deepEqual(classifySession(loadSession(new MemoryStorage()), 'data-v1', manifest), { kind: 'absent' });
  });
});

describe('storage failures', () => {
  test('a refusing save reports false and stores nothing', () => {
    const storage = new MemoryStorage();
    storage.failSet = true;
    assert.equal(saveSession(storage, record()), false);
    assert.equal(storage.items.size, 0);
  });

  test('a throwing read is invalid rather than an exception', () => {
    const storage = new MemoryStorage();
    storage.failGet = true;
    assert.equal(loadSession(storage), 'invalid');
  });
});
