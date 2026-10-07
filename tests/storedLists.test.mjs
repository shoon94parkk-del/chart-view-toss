import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStoredList } from '../src/storedLists.js';

test('stored selections keep valid symbols and recover malformed elements without changing the saved bytes', () => {
  const raw = JSON.stringify(['005930.KS', null, 123, {}, ['AAPL'], ' nvda ', '', '<invalid>', 'NVDA', '^KS11', 'KRW=X', '204620.KQ']);
  const original = raw;
  assert.deepEqual(parseStoredList(raw), ['005930.KS', 'NVDA', '^KS11', 'KRW=X', '204620.KQ']);
  assert.equal(raw, original);
});

test('stored watchlist preserves valid names, metadata and order while excluding invalid rows', () => {
  const rows = [null, { symbol: '005930.KS', name: '삼성전자', custom: '보존' }, 123, [], { symbol: 'NVDA', name: 123 },
    { symbol: ' nvda ', name: 'duplicate' }, { symbol: '<invalid>', name: 'bad' }, { name: 'no code' },
    { symbol: '204620.KQ', name: '제이앤티씨', note: { original: true } }];
  const raw = JSON.stringify(rows);
  assert.deepEqual(parseStoredList(raw, { kind: 'watch' }), [
    { symbol: '005930.KS', name: '삼성전자', custom: '보존' },
    { symbol: 'NVDA', name: 'NVDA' }, { symbol: '204620.KQ', name: '제이앤티씨', note: { original: true } },
  ]);
  assert.equal(JSON.stringify(rows), raw);
});

test('empty and wholly invalid arrays remain empty rather than restoring default selections', () => {
  for (const raw of ['[]', '[null,123,{}]']) assert.deepEqual(parseStoredList(raw, { fallback: ['AAPL'] }), []);
  assert.deepEqual(parseStoredList('[null,123,{}]', { kind: 'watch', fallback: [{ symbol: 'AAPL' }] }), []);
});

test('missing, malformed and non-array storage uses a copied fallback without writing', () => {
  const fallback = ['AAPL'];
  for (const raw of [null, undefined, '', '{bad', '{}', 'null', '123', '"AAPL"']) {
    const result = parseStoredList(raw, { fallback });
    assert.deepEqual(result, fallback);
    assert.notEqual(result, fallback);
  }
});

test('storage recovery accepts the existing route symbol grammar and never trims a valid watchlist', () => {
  const selected = ['BRK-B', '^GSPC', 'KRW=X', 'A.B', '005930.KS'];
  assert.deepEqual(parseStoredList(JSON.stringify(selected)), selected);
  const rows = Array.from({ length: 40 }, (_, i) => ({ symbol: `STOCK${i}`, name: `Company ${i}` }));
  assert.deepEqual(parseStoredList(JSON.stringify(rows), { kind: 'watch' }), rows);
  for (const invalid of ['a'.repeat(31), 'ABC/DEF', 'ABC:DEF', 'ABC DEF', '=ABC', '-ABC']) {
    assert.deepEqual(parseStoredList(JSON.stringify([invalid])), []);
  }
});
