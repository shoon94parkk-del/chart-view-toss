import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

function setup({ native = true, unavailable = false, reject = false } = {}) {
  assert.ok(existsSync('src/usageMetrics.js'), 'official SDK event adapter must exist');
  const calls = [];
  let loads = 0;
  const context = vm.createContext({
    isAppsInTossRuntime: () => native,
    loadSDK: async () => { loads++; if (unavailable) throw Error('unavailable'); return { Analytics: { log: async payload => { calls.push(payload); if (reject) throw Error('raw https://private/?symbol=AAPL'); } } }; },
  });
  const source = readFileSync('src/usageMetrics.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replaceAll("import('@apps-in-toss/web-framework')", 'loadSDK()').replaceAll('export ', '');
  vm.runInContext(source + '\nthis.api={trackUsage,newUsageOperation};', context);
  return { ...context.api, calls, loads: () => loads };
}

test('official event payload excludes symbols, searches, URLs, identifiers and raw errors', async () => {
  const s = setup();
  await s.trackUsage('stock_detail_view', { operationId: 'private-company', params: { screen: 'detail', source: 'detail', symbol: 'AAPL', query: 'private search', question: 'my thesis', user_id: 'private', url: 'https://private', message: 'raw exception' } });
  assert.deepEqual(JSON.parse(JSON.stringify(s.calls)), [{ log_name: 'stock_detail_view', log_type: 'event', params: { screen: 'detail', source: 'detail' } }]);
});

test('invalid event names and enum values are excluded and durations are bounded', async () => {
  const s = setup();
  assert.equal(await s.trackUsage('AAPL_private_event'), false);
  await s.trackUsage('screen_load', { params: { screen: 'https://private', outcome: 'arbitrary', duration_ms: 999999, result_count: -1, code: 'raw Error' } });
  assert.deepEqual(JSON.parse(JSON.stringify(s.calls)), [{ log_name: 'screen_load', log_type: 'event', params: { duration_ms: 120000 } }]);
  await s.trackUsage('screen_load', { params: { screen: 'analysis', outcome: 'success', duration_ms: 127, result_count: 250 } });
  assert.deepEqual(JSON.parse(JSON.stringify(s.calls[1].params)), { screen: 'analysis', outcome: 'success', duration_ms: 130, result_count: 100 });
});

test('operation rerender deduplicates the event while attempts and terminal success stay distinct', async () => {
  const s = setup(), operationId = s.newUsageOperation();
  await Promise.all([s.trackUsage('watchlist_add_attempt', { operationId }), s.trackUsage('watchlist_add_success', { operationId }), s.trackUsage('watchlist_add_success', { operationId })]);
  assert.deepEqual(s.calls.map(row => row.log_name), ['watchlist_add_attempt', 'watchlist_add_success']);
  await s.trackUsage('watchlist_add_success', { operationId: s.newUsageOperation() });
  await s.trackUsage('app_open', { operationId: 'first' });
  await s.trackUsage('app_open', { operationId: 'second' });
  assert.equal(s.calls.filter(row => row.log_name === 'app_open').length, 1);
});

test('preview emits no analytics and native SDK failures never reject application work', async () => {
  const preview = setup({ native: false });
  assert.equal(await preview.trackUsage('app_open'), false);
  assert.equal(preview.loads(), 0);
  const missing = setup({ unavailable: true });
  assert.equal(await missing.trackUsage('app_open'), false);
  const broken = setup({ reject: true });
  assert.equal(await broken.trackUsage('app_error', { params: { code: 'storage', screen: 'detail' } }), false);
});

test('deduplication memory is bounded for long sessions', async () => {
  const s = setup();
  for (let index = 0; index < 600; index++) await s.trackUsage('screen_view', { operationId: String(index) });
  assert.equal(await s.trackUsage('screen_view', { operationId: '599' }), false);
  assert.equal(await s.trackUsage('screen_view', { operationId: '0' }), true);
});
