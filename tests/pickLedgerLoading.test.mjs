import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { selectionKey } from '../src/valueDiscovery.js';
import { loadingIndicator } from '../src/loadingView.js';
import { recommendations, monitor } from './e2e/data.mjs';
import { PICK_METHOD, pickPriceBasis } from '../src/pickPerformanceBasis.js';

const source = readFileSync(new URL('../src/pickLedger.js', import.meta.url), 'utf8');
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test('PICK discloses whole-record average and mixed close dates without changing its denominator', async () => {
  const rows = recommendations.map((row, i) => ({ ...row, lastUpdatedTradeDate: i === 0 ? '2026-10-06' : '2026-10-07' }));
  const app = harness({ bootstrap: async () => ({ recommendations: rows }) });
  await app.render();
  const summary = app.node('#pick-ledger-summary').innerHTML;
  assert.match(summary, /2026-10-06.*2026-10-07/);
  const explanation = app.node('[data-pick-calculation]').innerHTML;
  for (const term of ['산술평균', '선정일', '보유기간', '같은 기업', '배당', '비용', '포트폴리오', '목록 필터']) assert.ok(explanation.includes(term), term);
  assert.match(summary, /평가 3\/4건/);
});

// Execute the real renderer with controlled API promises. This small DOM stub
// records rendered content/events; browser geometry and navigation are covered
// by pick-loading-recovery.spec.mjs instead of invented here.
function harness({ bootstrap = async () => ({ recommendations }), monitoring = async () => monitor } = {}) {
  const nodes = new Map();
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, {
      isConnected: true, innerHTML: '', textContent: '', hidden: false,
      value: selector === '#pick-ledger-search' ? '' : selector === '#pick-ledger-sort' ? 'latest' : 'all',
      dataset: {}, listeners: {},
      addEventListener(type, callback) { this.listeners[type] = callback; },
      querySelectorAll() { return []; },
      querySelector(selector) {
        if (selector === '.pick-ledger-basis') return { textContent: (this.innerHTML.match(/<p class="pick-ledger-basis">([\s\S]*?)<\/p>/) || [,''])[1] };
        return node(selector);
      },
      setAttribute() {}, removeAttribute() {},
    });
    return nodes.get(selector);
  };
  const listeners=new Map();
  const document = { querySelector: node, activeElement: null, addEventListener(type,callback){listeners.set(type,callback);},removeEventListener(type,callback){if(listeners.get(type)===callback)listeners.delete(type);} };
  const window = { scrollY: 0,restoreRequests:[], scrollTo(value) { this.scrollY = typeof value === 'object' ? value.top : value; }, __chartviewRestoreScroll(options={}) {this.restoreRequests.push(options);if(Number.isFinite(options.top)&&!options.cancel)this.scrollTo(options.top);} };
  // Only resolve module imports to the controlled dependencies. All renderer
  // branches/calculations below are the current repository implementation.
  const render = new Function('document', 'window', 'homeBootstrap', 'pickMonitor', 'selectionKey', 'loadingIndicator', 'requestAnimationFrame', 'PICK_METHOD', 'pickPriceBasis', 'threeAgentEnabled', 'loadThreeAgentFeed', 'auditedSectionMarkup', 'dedupAuditedPicks', 'debateDashboardEnabled',
    source.replace(/^import .*;\n/gm, '').replace(/^export /gm, '') + '\nreturn renderPickLedger;'
  )(document, window, bootstrap, monitoring, selectionKey, loadingIndicator, callback => queueMicrotask(callback), PICK_METHOD, pickPriceBasis,
    () => false, async () => ({status: 'disabled'}), () => '', () => ({unique: [], duplicates: []}), () => false);
  return { node, nodes, window, listeners,render: options => render({ shell: html => html, bindNav() {}, displayName: symbol => symbol, ...options }) };
}

test('PICK Back retains its scroll intent until initial monitoring settles',async()=>{
 const held=deferred();const app=harness({monitoring:()=>held.promise});
 const viewState={routeFocusKey:null,returnScroll:300};
 await app.render({restoreView:true,viewState});await nextTurn();
 assert.equal(app.window.scrollY,0);
 assert.equal(viewState.returnScroll,300);
 held.resolve(monitor);await nextTurn();
 assert.equal(app.window.scrollY,300);
 assert.equal(viewState.returnScroll,undefined);
});

test('PICK user interaction cancels pending Back restoration before a late monitor paints',async()=>{
 for(const event of ['wheel','touchstart','pointerdown','keydown']){
  const held=deferred();const app=harness({monitoring:()=>held.promise});
  const viewState={routeFocusKey:null,returnScroll:300};
  await app.render({restoreView:true,viewState});await nextTurn();
  assert.equal(typeof app.listeners.get(event),'function',event);
  app.listeners.get(event)();app.window.scrollY=75;
  held.resolve(monitor);await nextTurn();
  assert.equal(app.window.scrollY,75,event);
  assert.ok(app.window.restoreRequests.some(request=>request.cancel===true),event);
  assert.equal(viewState.returnScroll,undefined,event);
 }
});

test('PICK disposal preserves a newly captured return position and never cancels another route restore',async()=>{
 const held=deferred();const app=harness({monitoring:()=>held.promise});
 const viewState={routeFocusKey:null,returnScroll:300};
 const cleanup=await app.render({restoreView:true,viewState});await nextTurn();
 viewState.returnScroll=425;
 cleanup();held.resolve(monitor);await nextTurn();
 assert.equal(viewState.returnScroll,425);
 assert.equal(app.window.restoreRequests.some(request=>request.cancel===true),false);
 assert.equal(app.window.scrollY,0);
});

test('PICK bootstrap renders performance and rows while optional monitoring is held', async () => {
  const held = deferred();
  const app = harness({ monitoring: () => held.promise });
  const rendering = app.render();
  try {
    await nextTurn();
    assert.match(app.node('#pick-ledger-summary').innerHTML, /data-testid="pick-performance"/);
    assert.match(app.node('#pick-ledger-list').innerHTML, /삼성전자/);
    assert.match(app.node('#pick-ledger-status-strip').innerHTML, /확인하고 있어요/);
    assert.doesNotMatch(app.node('#pick-ledger-status-strip').innerHTML, /data-testid="pick-status"/);
  } finally {
    held.resolve(monitor);
    await rendering;
    await nextTurn();
  }
});

test('PICK monitor failure and retry change only monitoring, never the performance denominator', async () => {
  let monitoringCalls = 0, bootstrapCalls = 0;
  const app = harness({
    bootstrap: async () => { bootstrapCalls++; return { recommendations }; },
    monitoring: async () => { if (++monitoringCalls === 1) throw new Error('monitor unavailable'); return monitor; },
  });
  await app.render();
  await nextTurn();
  const performance = app.node('#pick-ledger-summary').innerHTML;
  assert.match(performance, /평가 3\/4건/);
  assert.match(app.node('#pick-ledger-status-strip').innerHTML, /data-pick-monitor-retry/);
  assert.doesNotMatch(app.node('#pick-ledger-status-strip').innerHTML, /data-testid="pick-status"/);
  await app.node('[data-pick-monitor-retry]').onclick();
  await nextTurn();
  assert.equal(app.node('#pick-ledger-summary').innerHTML, performance);
  assert.match(app.node('#pick-ledger-status-strip').innerHTML, /data-testid="pick-status"/);
  assert.equal(bootstrapCalls, 1);
  assert.equal(monitoringCalls, 2);
});

test('PICK primary retry restores actual records without repeating completed monitoring', async () => {
  let bootstrapCalls = 0, monitoringCalls = 0;
  const app = harness({
    bootstrap: async () => { if (++bootstrapCalls === 1) throw new Error('bootstrap unavailable'); return { recommendations }; },
    monitoring: async () => { monitoringCalls++; return monitor; },
  });
  await app.render();
  await nextTurn();
  assert.match(app.node('#pick-ledger-summary').innerHTML, /data-pick-primary-retry/);
  assert.doesNotMatch(app.node('#pick-ledger-summary').innerHTML, /data-testid="pick-performance"/);
  await app.node('[data-pick-primary-retry]').onclick();
  await nextTurn();
  assert.match(app.node('#pick-ledger-summary').innerHTML, /평가 3\/4건/);
  assert.equal(bootstrapCalls, 2);
  assert.equal(monitoringCalls, 1);
});

test('PICK monitoring failure cannot certify malformed or missing monitoring as real status counts', async () => {
  const app = harness({ monitoring: async () => ({ generatedAt: monitor.generatedAt }) });
  await app.render();
  await nextTurn();
  assert.match(app.node('#pick-ledger-summary').innerHTML, /data-testid="pick-performance"/);
  assert.doesNotMatch(app.node('#pick-ledger-status-strip').innerHTML, /data-testid="pick-status"/);
  assert.match(app.node('#pick-ledger-status-strip').innerHTML, /data-pick-monitor-retry/);
});

test('PICK late monitoring is ignored after the mounted ledger leaves the document', async () => {
  const held = deferred();
  const app = harness({ monitoring: () => held.promise });
  const rendering = app.render();
  await nextTurn();
  const summary = app.node('#pick-ledger-summary').innerHTML;
  const status = app.node('#pick-ledger-status-strip').innerHTML;
  app.node('#pick-ledger-list').isConnected = false;
  held.resolve(monitor);
  await rendering;
  await nextTurn();
  assert.equal(app.node('#pick-ledger-summary').innerHTML, summary);
  assert.equal(app.node('#pick-ledger-status-strip').innerHTML, status);
});

test('PICK duplicate monitor retries share the one active lifecycle and cleanup ignores late completion', async () => {
  let calls = 0;
  const held = deferred();
  const app = harness({ monitoring: async options => {
    calls++;
    if (calls === 1) throw new Error('unavailable');
    assert.deepEqual(options, { force: true });
    return held.promise;
  } });
  const cleanup = await app.render();
  await nextTurn();
  const retry = app.node('[data-pick-monitor-retry]').onclick;
  const first = retry();
  const second = retry();
  assert.equal(calls, 2);
  const before = app.node('#pick-ledger-status-strip').innerHTML;
  cleanup();
  held.resolve(monitor);
  await Promise.all([first, second]);
  await nextTurn();
  assert.equal(app.node('#pick-ledger-status-strip').innerHTML, before);
});

test('PICK real zero remains evaluated, while missing returns remain outside the denominator', async () => {
  const values = [{ ...recommendations[0], returnPct: 0 }, { ...recommendations[1], returnPct: null }];
  const app = harness({ bootstrap: async () => ({ recommendations: values }) });
  await app.render();
  await nextTurn();
  const summary = app.node('#pick-ledger-summary').innerHTML;
  assert.match(summary, /평가 1\/2건/);
  assert.match(summary, />0\.00%<\/b>/);
  assert.match(summary, />0%<\/b>/);
});

test('PICK session criteria are restored without changing the summary scope or persisted device data', async () => {
  const viewState = { search: '삼성전자', period: '7', performance: 'win', status: 'all', sort: 'return', searchOpen: false, expandedKeys: ['2026-10-02:005930'] };
  const app = harness();
  await app.render({ viewState });
  await nextTurn();
  assert.equal(app.node('#pick-ledger-count').textContent, '1개 PICK 기록');
  assert.match(app.node('#pick-ledger-summary').innerHTML, /평가 3\/4건/);
  assert.equal(app.node('#pick-ledger-search').value, '삼성전자');
  assert.equal(app.node('#pick-ledger-period').value, '7');
  assert.equal(app.node('#pick-ledger-sort').value, 'return');
  assert.deepEqual(viewState.expandedKeys, ['2026-10-02:005930']);
});

test('PICK explicit dated forward entry clears stale detail-return filters while an actual Back restores them', async () => {
  const filtered = { search: '엔비디아', period: '7', performance: 'win', status: 'SELL_REVIEW', sort: 'return', expandedKeys: [], returnScroll: 300 };
  const forward = harness();
  const forwardState = structuredClone(filtered);
  await forward.render({ viewState: forwardState, focusKey: selectionKey(recommendations[0]), restoreView: false });
  await nextTurn();
  assert.equal(forwardState.search, '');
  assert.equal(forwardState.period, 'all');
  assert.equal(forwardState.performance, 'all');
  assert.equal(forwardState.status, 'all');
  assert.equal(forwardState.returnScroll, undefined);
  assert.equal(forward.window.scrollY, 0);
  const backward = harness();
  const backwardState = structuredClone(filtered);
  backwardState.routeFocusKey=selectionKey(recommendations[0]);
  await backward.render({ viewState: backwardState, focusKey: selectionKey(recommendations[0]), restoreView: true });
  await nextTurn();
  assert.equal(backwardState.search, '엔비디아');
  assert.equal(backwardState.period, '7');
  assert.equal(backwardState.status, 'SELL_REVIEW');
  assert.equal(backward.node('#pick-ledger-count').textContent, '1개 PICK 기록');
  assert.equal(backward.window.scrollY, 300);
});

test('PICK popstate to a different dated key is not mistaken for detail Back',async()=>{
 const app=harness();
 const viewState={routeFocusKey:selectionKey(recommendations[0]),expandedKeys:[selectionKey(recommendations[0])],returnScroll:300};
 await app.render({viewState,focusKey:'1900-01-01:005930',restoreView:true});
 await nextTurn();
 assert.match(app.node('.pick-ledger-focus-note').textContent,/찾지 못/);
 assert.deepEqual(viewState.expandedKeys,[]);
 assert.equal(viewState.returnScroll,undefined);
});

test('3인 감사 v2 section stays inert when the flag is off', async () => {
  const app = harness({});
  await app.render();
  await nextTurn();
  assert.equal(app.node('#pick-ledger-three-agent').innerHTML, '');
  assert.match(app.node('#pick-ledger-list').innerHTML, /삼성전자/);
  assert.match(app.node('#pick-ledger-count').textContent, /PICK 기록/);
});
