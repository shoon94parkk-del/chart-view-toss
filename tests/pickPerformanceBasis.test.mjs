import test from 'node:test';
import assert from 'node:assert/strict';
import { pickPriceBasis } from '../src/pickPerformanceBasis.js';

test('PICK price basis excludes unevaluated records but includes actual zero and discloses missing dates', () => {
  const rows = [
    { returnPct: 0, lastUpdatedTradeDate: '2026-10-02' },
    { returnPct: -3, lastUpdatedTradeDate: '2026-10-06' },
    { returnPct: 8, lastUpdatedTradeDate: null },
    { returnPct: null, lastUpdatedTradeDate: '2026-11-01' },
    { returnPct: '', lastUpdatedTradeDate: '2026-11-02' },
  ];
  const label = pickPriceBasis(rows);
  assert.match(label, /2026-10-02 ~ 2026-10-06/);
  assert.match(label, /미제공 1건/);
  assert.doesNotMatch(label, /2026-11/);
  assert.match(pickPriceBasis([{ returnPct: 0, lastUpdatedTradeDate: '2026-02-30' }]), /기준일 미제공/);
  assert.match(pickPriceBasis([]), /기준일 미제공/);
});
