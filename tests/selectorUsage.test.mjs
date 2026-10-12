import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function setup({ results = [{ symbol: '005930.KS', name: '삼성전자', type: 'KRX' }], partialFailure = false, fail = false } = {}) {
  const controls = new Map(), events = [], timers = new Map();
  let release, timerId = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const node = () => ({ value: '', hidden: false, disabled: false, innerHTML: '', textContent: '', scrollTop: 0, isConnected: true, classList: { toggle() {}, add() {}, remove() {} }, listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; }, querySelector: () => node(), querySelectorAll: () => [], contains: () => false, focus() {}, insertAdjacentHTML(_, html) { this.innerHTML += html; } });
  const overlay = { ...node(), remove() { this.isConnected = false; }, querySelector(selector) { if (!controls.has(selector)) controls.set(selector, node()); return controls.get(selector); } };
  const context = vm.createContext({
    AbortController, document: { activeElement: null, querySelector: () => ({ inert: false }), createElement: () => overlay, body: { appendChild() {}, classList: { add() {}, remove() {} } }, addEventListener() {}, removeEventListener() {} },
    searchStocks: async () => { await gate; if (fail) throw Error('network private query'); return { results, partialFailure }; },
    loadingIndicator: () => '<span>loading</span>', haptic: () => {}, syncNativeBackHandler: () => {}, requestAnimationFrame: callback => callback(),
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; }, clearTimeout: id => timers.delete(id),
    newUsageOperation: () => 'search-operation', trackUsage: async (name, options) => { events.push({ name, options }); },
  });
  const source = readFileSync('src/stockSelector.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replaceAll('export ', '');
  vm.runInContext(source + '\nthis.api={openStockSelector,closeStockSelector};', context);
  context.api.openStockSelector({ onPick() {} });
  const input = overlay.querySelector('#selector-search-input');
  input.value = 'private search'; input.listeners.input();
  const callback = [...timers.values()].at(-1);
  const pending = callback();
  return { ...context.api, pending, release, events, result: overlay.querySelector('#selector-results') };
}

test('search success requires verified results rendered after the actual lookup', async () => {
  const s = setup();
  assert.deepEqual(s.events.map(event => event.name), ['stock_search_attempt']);
  assert.equal(s.events.some(event => event.name === 'stock_search_success'), false);
  s.release(); await s.pending;
  assert.match(s.result.innerHTML, /삼성전자/);
  assert.deepEqual(s.events.map(event => event.name), ['stock_search_attempt', 'stock_search_success']);
  assert.equal(JSON.stringify(s.events).includes('private search'), false);
  assert.equal(JSON.stringify(s.events).includes('005930.KS'), false);
});

test('empty, unverified guesses and transport failures never count as successful search', async () => {
  for (const options of [{ results: [] }, { results: [{ symbol: 'FAKE', name: 'FAKE', type: 'DIRECT' }] }, { fail: true }]) {
    const s = setup(options); s.release(); await s.pending;
    assert.deepEqual(s.events.map(event => event.name), ['stock_search_attempt', 'stock_search_failure']);
    assert.equal(s.events.at(-1).options.params.outcome, options.fail ? 'error' : 'empty');
  }
});

test('a closed selector ignores a late successful response', async () => {
  const s = setup(); s.closeStockSelector(); s.release(); await s.pending;
  assert.deepEqual(s.events.map(event => event.name), ['stock_search_attempt']);
});
