import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHomeJourney, homeJourneyMarkup } from '../src/homeJourney.js';
import { finiteNumber } from '../src/analysisData.js';

const symbol = '005930.KS';
const prior = { symbol, price: 100000, currency: 'KRW', asOf: '2026-10-02T06:30:00Z' };
const actual = { ticker: symbol, price: 103700, currency: 'KRW', asOf: '2026-10-07T06:30:00Z' };

function harness() {
  let displayed = actual;
  const writes = [], host = { innerHTML: '', isConnected: true }, delta = { hidden: true, innerHTML: '' };
  const session = createHomeJourney({ read: () => JSON.stringify({ version: 1, quotes: [prior] }), write: value => writes.push(value) });
  const row = { dataset: { stockDetail: symbol }, querySelector: () => delta };
  const context = vm.createContext({
    state: { watchlist: [{ symbol }] }, homeJourneyStorageReady: true, HOME_JOURNEY_KEY: 'journey-test',
    document: { querySelector: () => host, querySelectorAll: () => [row] },
    getHomeJourneySession: () => session, readStored: () => null, writeStored: () => {},
    getLiveQuote: () => displayed, homeJourneyMarkup, finiteNumber, esc: String,
    formatCurrencyPrice: String, formatKst: String,
  });
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  vm.runInContext(source.slice(source.indexOf('function updateHomeWatchJourney('), source.indexOf('\nfunction paintHomeWatch(')), context);
  return { context, session, writes, host, delta, setDisplayed: value => { displayed = value; } };
}

test('empty actual response never turns visible device cache into new observation or persisted baseline', async () => {
  const h = harness();
  h.context.updateHomeWatchJourney([], { failed: true });
  h.context.updateHomeWatchJourney([]);
  await h.session.settled();
  assert.equal(h.writes.length, 0);
  assert.equal(h.delta.hidden, true);
  assert.match(h.host.innerHTML, /data-home-revisit-status="unavailable"/);
});

test('confirmed price comparison hides when displayed canonical price advances without confirmation', async () => {
  const h = harness();
  h.context.updateHomeWatchJourney([actual]);
  await h.session.settled();
  assert.equal(h.delta.hidden, false);
  h.setDisplayed({ ...actual, price: 104000, asOf: '2026-10-08T06:30:00Z' });
  h.context.updateHomeWatchJourney([actual]);
  await h.session.settled();
  assert.equal(h.delta.hidden, true, 'a retained older comparison cannot describe the newer displayed price');
  assert.match(h.host.innerHTML, /data-home-revisit-status="unavailable"/);
  assert.equal(h.writes.length, 1, 'unconfirmed newer display is never persisted');
});

test('storage initialization and reset gate prevents any comparison read or queued write', async () => {
  const h = harness();
  h.context.homeJourneyStorageReady = false;
  assert.equal(h.context.updateHomeWatchJourney([actual]), null);
  await h.session.settled();
  assert.equal(h.writes.length, 0);
  assert.equal(h.host.innerHTML, '');
});
