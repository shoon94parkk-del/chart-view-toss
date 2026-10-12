import test from 'node:test';
import assert from 'node:assert/strict';

import * as journey from '../src/homeJourney.js';
const symbol = '005930.KS';
const oldQuote = { ticker: symbol, price: 100000, currency: 'KRW', asOf: '2026-10-02T06:30:00Z' };
const nextQuote = { ...oldQuote, price: 103700, asOf: '2026-10-07T06:30:00Z' };
const snapshot = quote => JSON.stringify({ version: 1, quotes: [{ symbol: quote.ticker, price: quote.price, currency: quote.currency, asOf: quote.asOf }] });
function makeSession(raw = null, write = () => {}) {
  assert.equal(typeof journey.createHomeJourney, 'function', 'Home journey comparison must be implemented');
  return journey.createHomeJourney({ read: () => raw, write });
}

test('first actual dated quote establishes a baseline without fabricated revisit changes', async () => {
  const writes = [];
  const session = makeSession(null, value => writes.push(value));
  const view = session.observe([oldQuote], [symbol]);
  assert.equal(view.status, 'initial');
  assert.deepEqual(view.changes, []);
  await session.settled();
  assert.deepEqual(writes, [JSON.parse(snapshot(oldQuote))]);
  assert.equal(session.current().saveStatus, 'ready');
});

test('return visit compares actual observed prices and preserves both observation dates', async () => {
  const session = makeSession(snapshot(oldQuote));
  const view = session.observe([nextQuote], [symbol]);
  assert.equal(view.status, 'changes');
  assert.equal(view.changes.length, 1);
  assert.equal(view.changes[0].symbol, symbol);
  assert.ok(Math.abs(view.changes[0].deltaPct - 3.7) < 1e-10);
  assert.equal(view.changes[0].previous.asOf, oldQuote.asOf);
  assert.equal(view.changes[0].current.asOf, nextQuote.asOf);
  await session.settled();
});

test('same-session Home reentry freezes the baseline and the next visit acknowledges the observed price', async () => {
  let raw = snapshot(oldQuote);
  const session = journey.createHomeJourney({ read: () => raw, write: value => { raw = JSON.stringify(value); } });
  session.observe([nextQuote], [symbol]);
  await session.settled();
  assert.equal(session.observe([nextQuote], [symbol]).changes.length, 1, 'repaint uses the frozen arrival baseline');
  const nextVisit = makeSession(raw);
  assert.equal(nextVisit.observe([nextQuote], [symbol]).status, 'unchanged');
  assert.deepEqual(nextVisit.current().changes, [], 'the same change is not new on a future visit');
});

test('older and equal-time corrections never create a since-last-visit change or roll the baseline backward', async () => {
  const writes = [];
  const session = makeSession(snapshot(nextQuote), value => writes.push(value));
  for (const quote of [oldQuote, { ...nextQuote, price: 1 }, { ...nextQuote, price: 999999 }]) {
    const view = session.observe([quote], [symbol]);
    assert.deepEqual(view.changes, []);
  }
  await session.settled();
  assert.equal(writes.length, 0);
});

test('cached, failed, missing and mismatched-currency prices never establish or invent a new baseline', async () => {
  const writes = [];
  const session = makeSession(snapshot(oldQuote), value => writes.push(value));
  assert.equal(session.observe([nextQuote], [symbol], { pending: true }).status, 'loading');
  assert.equal(session.observe([nextQuote], [symbol], { failed: true }).status, 'unavailable');
  assert.equal(session.observe([], [symbol]).status, 'unavailable');
  assert.deepEqual(session.observe([{ ...nextQuote, currency: 'USD' }], [symbol]).changes, []);
  await session.settled();
  assert.equal(writes.length, 0);
});

test('snapshot sanitization rejects invalid JSON shapes, unknown symbols, missing values and undated quotes', async () => {
  for (const raw of ['null', '7', '[]', '{}', '{broken', JSON.stringify({ version: 2, quotes: [] })]) {
    const session = makeSession(raw);
    assert.deepEqual(session.observe([oldQuote], [symbol]).changes, []);
    await session.settled();
  }
  const writes = [];
  const session = makeSession(null, value => writes.push(value));
  const bad = [null, {}, { ...oldQuote, ticker: '<script>' }, { ...oldQuote, price: null }, { ...oldQuote, price: '' }, { ...oldQuote, price: 0 }, { ...oldQuote, price: Infinity }, { ...oldQuote, currency: '' }, { ...oldQuote, asOf: '2026-10-07' }, { ...oldQuote, asOf: '2026-10-07T06:30:00' }, { ...oldQuote, asOf: '2026-02-30T06:30:00Z' }, { ...oldQuote, asOf: null }];
  assert.equal(session.observe(bad, [symbol]).status, 'unavailable');
  await session.settled();
  assert.equal(writes.length, 0);
});

test('tracking is bounded to twenty actual watched symbols and preserves unrelated observed baselines', async () => {
  let saved;
  const rows = Array.from({ length: 25 }, (_, index) => ({ ...oldQuote, ticker: `QA${index}` }));
  const session = makeSession(null, value => { saved = value; });
  session.observe(rows, rows.map(row => row.ticker));
  await session.settled();
  assert.equal(saved.quotes.length, 20);
  session.observe([{ ...rows[0], asOf: nextQuote.asOf }], rows.map(row => row.ticker));
  await session.settled();
  assert.equal(saved.quotes.length, 20, 'partial quote paints do not erase prior baselines');
  assert.equal(saved.quotes[1].symbol, rows[1].ticker);
});

test('failed confirmed persistence leaves the previous baseline and communicates an unsaved comparison', async () => {
  let raw = snapshot(oldQuote);
  const session = journey.createHomeJourney({ read: () => raw, write: async () => { throw new Error('native storage failure'); } });
  session.observe([nextQuote], [symbol]);
  await session.settled();
  assert.equal(session.current().saveStatus, 'failed');
  assert.equal(raw, snapshot(oldQuote));
  assert.match(journey.homeJourneyMarkup(session.current()), /저장하지 못/);
  assert.doesNotMatch(journey.homeJourneyMarkup(session.current()), /저장했/);
});

test('a second newer observation waits for native confirmation and never overtakes an in-flight save', async () => {
  const pending = [], writes = [];
  const session = makeSession(snapshot(oldQuote), value => { writes.push(value); return new Promise(resolve => pending.push(resolve)); });
  session.observe([nextQuote], [symbol]);
  await new Promise(resolve => setImmediate(resolve));
  session.observe([{ ...nextQuote, price: 104000, asOf: '2026-10-08T06:30:00Z' }], [symbol]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(writes.length, 1);
  pending[0]();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(writes.length, 2);
  pending[1]();
  await session.settled();
  assert.equal(session.current().saveStatus, 'ready');
  assert.equal(writes.at(-1).quotes[0].price, 104000);
});

test('strict observation parsing rejects coerced prices, impossible times and invalid timezone offsets', async () => {
  const writes = [];
  const session = makeSession(null, value => writes.push(value));
  const bad = [true, [100000], { price: 100000 }, ' 100000 ', '0x186a0'].map(price => ({ ...oldQuote, price }));
  bad.push(...['2026-10-07T24:00:00Z', '2026-10-07T06:60:00Z', '2026-10-07T06:30:60Z', '2026-10-07T06:30:00+23:59'].map(asOf => ({ ...oldQuote, asOf })));
  assert.equal(session.observe(bad, [symbol]).status, 'unavailable');
  await session.settled();
  assert.equal(writes.length, 0);
});

test('only whitelisted fields persist and equivalent timezone observations do not invent later changes', async () => {
  const writes = [];
  const session = makeSession(snapshot(oldQuote), value => writes.push(value));
  const equivalent = { ...oldQuote, asOf: '2026-10-02T15:30:00+09:00', price: 999999, notes: 'private', name: 'arbitrary', change: 4 };
  assert.deepEqual(session.observe([equivalent], [symbol]).changes, []);
  session.observe([{ ...nextQuote, notes: 'private', name: 'arbitrary', change: 4 }], [symbol]);
  await session.settled();
  assert.deepEqual(Object.keys(writes.at(-1).quotes[0]), ['symbol', 'price', 'currency', 'asOf']);
});

test('disposing during confirmation cancels queued later observations and cannot repopulate a cleared account', async () => {
  let release;
  const writes = [];
  const session = makeSession(snapshot(oldQuote), value => { writes.push(value); return new Promise(resolve => { release = resolve; }); });
  session.observe([nextQuote], [symbol]);
  await new Promise(resolve => setImmediate(resolve));
  session.observe([{ ...nextQuote, price: 104000, asOf: '2026-10-08T06:30:00Z' }], [symbol]);
  session.dispose();
  release();
  await session.settled();
  session.observe([{ ...nextQuote, price: 105000, asOf: '2026-10-09T06:30:00Z' }], [symbol]);
  await session.settled();
  assert.equal(writes.length, 1, 'only the already-started native save reaches storage');
});

test('a later empty optional source preserves already confirmed actual observations in this visit', async () => {
  const session = makeSession(snapshot(oldQuote));
  assert.equal(session.observe([nextQuote], [symbol]).changes.length, 1);
  await session.settled();
  assert.equal(session.observe([], [symbol]).changes.length, 1, 'empty heatmap does not erase actual batch quote evidence');
});

test('remove and re-add cannot backdate an observation already confirmed within this session', async () => {
  const writes = [];
  const session = makeSession(snapshot(oldQuote), value => writes.push(value));
  session.observe([nextQuote], [symbol]);
  await session.settled();
  session.observe([{ ...nextQuote, ticker: 'NVDA', price: 180, currency: 'USD' }], ['NVDA']);
  await session.settled();
  session.observe([{ ...oldQuote, price: 101000, asOf: '2026-10-03T06:30:00Z' }], [symbol]);
  await session.settled();
  assert.equal(writes.length, 2, 'older re-added response cannot replace a confirmed later observation');
  assert.equal(session.current().changes[0].current.asOf, nextQuote.asOf);
});

test('timezone-qualified provider microsecond timestamps retain their actual observation string', async () => {
  let saved;
  const session = makeSession(null, value => { saved = value; });
  const quote = { ...oldQuote, asOf: '2026-10-02T06:30:00.123456Z' };
  session.observe([quote], [symbol]);
  await session.settled();
  assert.equal(saved?.quotes[0].asOf, quote.asOf);
});

test('late pending or failed source retains earlier actual confirmation without persisting its fallback', async () => {
  const writes = [];
  const session = makeSession(snapshot(oldQuote), value => writes.push(value));
  session.observe([nextQuote], [symbol]);
  await session.settled();
  for (const options of [{ pending: true }, { failed: true }]) {
    const view = session.observe([{ ...nextQuote, price: 104000, asOf: '2026-10-08T06:30:00Z' }], [symbol], options);
    assert.equal(view.status, 'changes');
    assert.equal(view.changes[0].current.price, nextQuote.price);
    assert.equal(view.changes[0].current.asOf, nextQuote.asOf);
  }
  await session.settled();
  assert.equal(writes.length, 1, 'pending/failed rows never become confirmed observations');
});
