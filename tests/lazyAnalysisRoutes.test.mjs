import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
// Execute the actual lazy-route coordinator and render branches. Only imports
// and unrelated route dependencies are controlled, not the guards under test.
const renderSource = main.slice(main.indexOf('function renderLazyAnalysis('), main.indexOf('function syncFromLocation(')).replaceAll('import(', 'loadModule(');
const settle = () => new Promise(resolve => setImmediate(resolve));
const routes = ['exports', 'memory', 'ideas', 'picks'];

function harness(tab, loadModule) {
  const app = { innerHTML: 'startup-loading' }, retry = {}, mounts = [], cleanups = [], reloads = [], preloads = [], fetched = [];
  const context = {
    state: { tab, exportFocus: 'items', memoryPriceGroup: 'nand-chip', memoryTabFocus: true, pickFocusKey: 'dated-record' },
    viewEpoch: 0, analysisCleanup: null, lazyAnalysisRetryAssets: new Map(), performance, URL, AbortController,
    setTimeout, clearTimeout,
    fetch: async (href, options) => { fetched.push({ href, options }); return { ok: true, headers: { get: () => 'text/javascript' }, arrayBuffer: async () => new ArrayBuffer(0) }; },
    requestAnimationFrame() {}, recordMetric() {}, setLiveSurface() {}, syncNativeBackHandler() {}, goBack() {}, bindNav() {}, navigate() {},
    shell: (content, title) => `<h1>${title}</h1>${content}<nav data-tab="more">분석</nav>`,
    loadingIndicator: text => `<div role="status">${text}</div>`,
    SHOW_SPOTLIGHT: true, ANALYSIS_ROUTES: new Set(), displayName: name => name,
    document: { querySelector: selector => selector === '#app' ? app : retry, querySelectorAll: () => preloads },
    location: { origin: 'https://app.test', hash: `#${tab}`, reload: () => reloads.push(context.location.hash) },
    loadModule: path => loadModule(path),
  };
  context.cleanupChart = () => { context.analysisCleanup?.(); context.analysisCleanup = null; context.viewEpoch++; };
  context.renderHome = () => { context.cleanupChart(); app.innerHTML = 'home'; };
  const mount = (route, args) => {
    const id = mounts.length + 1;
    mounts.push({ id, route, args }); app.innerHTML = `${route}-${id}`;
    return () => cleanups.push(id);
  };
  const modules = {
    './exportMomentumView.js': { renderExportMomentumView: args => mount('exports', args) },
    './memoryPriceView.js': { renderMemoryPriceView: args => mount('memory', args) },
    './ideaView.js': { renderIdeaView: args => mount('ideas', args) },
    './pickLedger.js': { renderPickLedger: args => mount('picks', args) },
    './guruInvestingView.js': { renderGuruInvesting: args => mount('gurus', args) },
  };
  vm.createContext(context); vm.runInContext(renderSource, context);
  return { context, app, retry, mounts, cleanups, reloads, modules, preloads, fetched };
}

for (const route of routes) {
  test(`${route}: failed lazy chunk replaces startup loading with navigable retry`, async () => {
    const h = harness(route, () => Promise.reject(new Error('chunk unavailable')));
    h.context.render();
    assert.match(h.app.innerHTML, /role="status"/);
    assert.match(h.app.innerHTML, /data-tab="more"/);
    await settle();
    assert.match(h.app.innerHTML, /role="alert"/);
    assert.match(h.app.innerHTML, /data-retry-analysis-view/);
    assert.match(h.app.innerHTML, /분석 메뉴로/);
    assert.doesNotMatch(h.app.innerHTML, /startup-loading/);
    assert.equal(h.mounts.length, 0);
    await h.retry.onclick();
    assert.deepEqual(h.reloads, [`#${route}`]);
  });

  test(`${route}: a late first import cannot remount after same-route reentry`, async () => {
    const pending = [];
    const h = harness(route, path => new Promise((resolve, reject) => pending.push({ path, resolve, reject })));
    h.context.render(); await settle(); const first = pending.splice(0);
    h.context.state.tab = 'home'; h.context.render();
    h.context.state.tab = route; h.context.render(); await settle(); const latest = pending.splice(0);
    latest.forEach(({ path, resolve }) => resolve(h.modules[path] || {})); await settle();
    first.forEach(({ path, resolve }) => resolve(h.modules[path] || {})); await settle();
    assert.equal(h.mounts.length, 1);
    assert.equal(h.mounts[0].route, route);
    h.context.state.tab = 'home'; h.context.render();
    assert.deepEqual(h.cleanups, [1]);
    assert.equal(h.context.analysisCleanup, null);
  });

  test(`${route}: a late rejection cannot replace a newer route`, async () => {
    const pending = [];
    const h = harness(route, path => new Promise((resolve, reject) => pending.push({ path, resolve, reject })));
    h.context.render(); await settle();
    h.context.state.tab = 'home'; h.context.render();
    pending.forEach(({ reject }) => reject(new Error('old import failed'))); await settle();
    assert.equal(h.app.innerHTML, 'home');
  });
}

test('rejected async mount is caught rather than becoming an unhandled rejection', async () => {
  let h;
  h = harness('ideas', path => Promise.resolve(h.modules[path] || {}));
  h.modules['./ideaView.js'].renderIdeaView = async () => { throw new Error('view mount failed'); };
  h.context.render(); await settle();
  assert.match(h.app.innerHTML, /role="alert"/);
});

test('cleanup resolving after navigation is disposed without replacing the current cleanup', async () => {
  let resolveCleanup, h;
  h = harness('exports', path => Promise.resolve(h.modules[path] || {}));
  h.modules['./exportMomentumView.js'].renderExportMomentumView = () => new Promise(resolve => { resolveCleanup = resolve; });
  h.context.render(); await settle();
  h.context.state.tab = 'memory'; h.context.render(); await settle();
  const currentCleanup = h.context.analysisCleanup;
  let staleDisposed = 0;
  resolveCleanup(() => staleDisposed++); await settle();
  assert.equal(staleDisposed, 1);
  assert.equal(h.context.analysisCleanup, currentCleanup);
  h.context.state.tab = 'home'; h.context.render();
  assert.deepEqual(h.cleanups, [1]);
});

test('normal lazy mounts preserve route focus/state and memory restoration is consumed once', async () => {
  for (const route of routes) {
    let h;
    h = harness(route, path => Promise.resolve(h.modules[path] || {}));
    h.context.render(); await settle();
    assert.equal(h.fetched.length, 0);
    const args = h.mounts[0].args;
    assert.equal(args.shell, h.context.shell);
    assert.equal(args.bindNav, h.context.bindNav);
    if (route === 'exports') { assert.equal(args.focus, 'items'); assert.equal(args.state, h.context.state.exports); }
    if (route === 'memory') { assert.equal(args.activeGroup, 'nand-chip'); assert.equal(args.restoreTabFocus, true); assert.equal(h.context.state.memoryTabFocus, false); }
    if (route === 'picks') { assert.equal(args.focusKey, 'dated-record'); assert.equal(args.displayName, h.context.displayName); }
  }
});

test('hidden PICK scope and the existing Guru epoch/catch behavior remain intact', async () => {
  let h;
  h = harness('picks', path => Promise.resolve(h.modules[path] || {})); h.context.SHOW_SPOTLIGHT = false;
  h.context.render(); await settle(); assert.equal(h.mounts.length, 0); assert.equal(h.app.innerHTML, 'home');
  const guru = harness('gurus', () => Promise.reject(new Error('guru chunk unavailable')));
  guru.context.render(); await settle(); assert.match(guru.app.innerHTML, /화면을 불러오지 못했어요/);
});

test('explicit retry revalidates only load-added own scripts, consumes bodies, and makes normal entry no requests', async () => {
  let h, consumed = 0;
  h = harness('exports', () => {
    h.preloads.push(...[
      'https://app.test/assets/view-hash.js', 'https://app.test/assets/view-hash.js',
      'https://app.test/api/quotes', 'https://provider.test/assets/provider.js',
      'https://app.test/assets/view.css', 'https://app.test/not-assets/file.js',
    ].map(href => ({ href })));
    return Promise.reject(new Error('chunk failed'));
  });
  h.preloads.push({ href: 'https://app.test/assets/already-existing.js' });
  h.context.fetch = async (href, options) => {
    h.fetched.push({ href, options });
    return { ok: true, headers: { get: () => 'text/javascript' }, arrayBuffer: async () => { consumed++; } };
  };
  h.context.render(); await settle();
  assert.equal(h.fetched.length, 0);
  await h.retry.onclick();
  assert.deepEqual(h.fetched.map(row => row.href), ['https://app.test/assets/view-hash.js']);
  assert.equal(h.fetched[0].options.cache, 'reload');
  assert.equal(consumed, 1);
  assert.deepEqual(h.reloads, ['#exports']);
  assert.equal(h.context.analysisCleanup, null);
});

test('late or unrelated imports cannot join the route-owned retry assets, and failure/reentry remembers its own URLs', async () => {
  let h;
  h = harness('exports', () => {
    if (!h.preloads.length) h.preloads.push({ href: 'https://app.test/assets/owned.js' });
    return Promise.reject(new Error('load failed'));
  });
  h.context.render(); await settle();
  h.preloads.push({ href: 'https://app.test/assets/other-later-route.js' });
  h.context.state.tab = 'home'; h.context.render();
  h.context.state.tab = 'exports'; h.context.render(); await settle();
  await h.retry.onclick();
  assert.deepEqual(h.fetched.map(row => row.href), ['https://app.test/assets/owned.js']);
});

test('retry aborts on navigation and cannot reload over the newer route or duplicate a pending request', async () => {
  let h;
  h = harness('memory', () => {
    h.preloads.push({ href: 'https://app.test/assets/memory.js' });
    return Promise.reject(new Error('chunk failed'));
  });
  h.context.fetch = (href, { signal }) => {
    h.fetched.push(href);
    return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
  };
  h.context.render(); await settle();
  const pending = h.retry.onclick();
  await h.retry.onclick();
  assert.equal(h.fetched.length, 1);
  h.context.state.tab = 'home'; h.context.render(); await pending;
  assert.deepEqual(h.reloads, []);
  assert.equal(h.app.innerHTML, 'home');
});

test('an old route failure cannot record the scripts added by a newer pending route', async () => {
  let failOld, h;
  h = harness('exports', path => {
    if (path.endsWith('.css')) return Promise.resolve({});
    const name = path.includes('exportMomentum') ? 'exports' : 'memory';
    h.preloads.push({ href: `https://app.test/assets/${name}.js` });
    return new Promise((resolve, reject) => { if (name === 'exports') failOld = reject; });
  });
  h.context.render(); await settle();
  h.context.state.tab = 'memory'; h.context.render(); await settle();
  failOld(new Error('late exports rejection')); await settle();
  assert.deepEqual([...h.context.lazyAnalysisRetryAssets.get('exports')], ['https://app.test/assets/exports.js']);
  assert.doesNotMatch(h.app.innerHTML, /role="alert"/);
});

test('scripts appearing between render and its load microtask are unrelated to retry', async () => {
  let h;
  h = harness('exports', path => {
    if (path.endsWith('.css')) return Promise.resolve({});
    h.preloads.push({ href: 'https://app.test/assets/actual-own.js' });
    return Promise.reject(new Error('chunk failed'));
  });
  h.context.render();
  h.preloads.push({ href: 'https://app.test/assets/between-render-and-load.js' });
  await settle(); await h.retry.onclick();
  assert.deepEqual(h.fetched.map(row => row.href), ['https://app.test/assets/actual-own.js']);
});

test('asset retry has a four-second deadline, clears its timer, and does not treat 404/HTML as a valid script', async () => {
  let h, deadline, milliseconds, cleared = 0, consumed = 0;
  h = harness('exports', () => {
    h.preloads.push({ href: 'https://app.test/assets/view.js' });
    return Promise.reject(new Error('chunk failed'));
  });
  h.context.setTimeout = (callback, ms) => { deadline = callback; milliseconds = ms; return 42; };
  h.context.clearTimeout = id => { assert.equal(id, 42); cleared++; };
  h.context.fetch = (href, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true }));
  h.context.render(); await settle(); const pending = h.retry.onclick(); deadline(); await pending;
  assert.equal(milliseconds, 4000); assert.equal(cleared, 1); assert.deepEqual(h.reloads, ['#exports']);
  for (const response of [{ ok: false, headers: { get: () => 'text/javascript' } }, { ok: true, headers: { get: () => 'text/html' } }]) {
    h.retry.disabled = false;
    h.context.fetch = async () => ({ ...response, arrayBuffer: async () => { consumed++; } });
    await h.retry.onclick();
  }
  assert.equal(consumed, 0);
});

test('route-owned retry asset requests remain bounded at six unique bundled scripts', async () => {
  let h;
  h = harness('exports', () => {
    h.preloads.push(...Array.from({ length: 10 }, (_, i) => ({ href: `https://app.test/assets/own-${i}.js` })));
    return Promise.reject(new Error('load failed'));
  });
  h.context.render(); await settle(); await h.retry.onclick();
  assert.equal(h.fetched.length, 6);
});
