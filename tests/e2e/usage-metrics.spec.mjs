import { test as base, expect, fromMenu, noOverflow, touchable } from './fixtures.mjs';
import { payloadFor, quotes, symbol, industryDetails } from './data.mjs';

const identity = 'metrics-qa';
const watchKey = 'chartview-toss-watchlist-v1';
const researchKey = 'chartview-toss-research-v1';
const promptKey = 'chartview-toss-review-prompt-v1';
const scoped = key => `${key}:${identity}`;
const privateQuestion = '최근 매출과 영업이익은 이전보다 어떻게 달라졌어? metrics-private-question';
const allowedNames = new Set([
  'app_open', 'screen_view', 'screen_load',
  'stock_search_attempt', 'stock_search_success', 'stock_search_failure',
  'stock_detail_attempt', 'stock_detail_view', 'stock_detail_failure',
  'analysis_view_attempt', 'analysis_view_success', 'analysis_view_failure',
  'watchlist_add_attempt', 'watchlist_add_success', 'watchlist_add_failure',
  'research_save_attempt', 'research_save_success', 'research_save_failure',
  'export_detail_view', 'app_error', 'review_prompt_shown',
  'review_request_attempt', 'review_request_failure', 'review_prompt_dismissed',
]);
const allowedParams = new Set(['screen', 'source', 'duration_ms', 'outcome', 'code', 'result_count']);

function assertPrivateDataExcluded(events) {
  for (const event of events) {
    expect(Object.keys(event).sort()).toEqual(['log_name', 'log_type', 'params']);
    expect(allowedNames.has(event.log_name), `Fixed analytics event: ${event.log_name}`).toBe(true);
    expect(event.log_type).toBe('event');
    expect(event.params && typeof event.params === 'object').toBeTruthy();
    for (const key of Object.keys(event.params)) {
      expect(allowedParams.has(key), `Allowlisted analytics parameter: ${key}`).toBe(true);
    }
    if ('duration_ms' in event.params) {
      expect(Number.isFinite(event.params.duration_ms)).toBe(true);
      expect(event.params.duration_ms).toBeGreaterThanOrEqual(0);
    }
    if ('result_count' in event.params) {
      expect(Number.isInteger(event.params.result_count)).toBe(true);
      expect(event.params.result_count).toBeGreaterThanOrEqual(0);
    }
    if ('code' in event.params) {
      expect(['network', 'timeout', 'offline', 'storage', 'module', 'unsupported', 'unknown']).toContain(event.params.code);
    }
  }
  // Check both keys and values: a fixed field must not carry a private value.
  expect(JSON.stringify(events)).not.toMatch(/metrics-private|metrics-qa|005930|000660|NVDA|삼성전자|SK하이닉스|https?:\/\/|raw-native-error|raw-api-error/i);
}

async function nativeStorage(context, storedLists, options) {
  await context.addInitScript(({ storedLists, options, identity, watchKey, researchKey, promptKey }) => {
    if (!['http:', 'https:'].includes(location.protocol)) return;
    window.__nativeMetricsQA = { events: [], reviewRequests: 0, holdKey: null, failKey: null, pending: [] };
    // One case visits the same built app as a plain browser after the native case.
    if (new URLSearchParams(location.search).has('metrics-web')) return;
    window.__appsInTossConstants = {
      operationalEnvironment: 'sandbox', platformOS: 'android', tossAppVersion: options.version,
      isRequestReviewSupported: options.reviewSupported,
    };
    window.__bridgeMethods__ = [
      'getAnonymousKey', 'getStorageItem', 'setStorageItem', 'removeStorageItem',
      '__subscribeAppEvent', '__unsubscribeAppEvent', 'eventLog', 'requestMiniAppReview',
    ];
    if (!sessionStorage.getItem('metrics-qa-seeded')) {
      localStorage.setItem('chartview-toss-identity-v1', identity);
      localStorage.setItem(`${watchKey}:${identity}`, JSON.stringify(storedLists.watchlist));
      localStorage.setItem(`chartview-toss-selected-v1:${identity}`, JSON.stringify(storedLists.selected));
      localStorage.setItem(`${researchKey}:${identity}`, '{}');
      localStorage.setItem(`${promptKey}:${identity}`, '{}');
      sessionStorage.setItem('metrics-qa-seeded', '1');
    }
    window.__nativeMetricsRelease = () => {
      const qa = window.__nativeMetricsQA;
      qa.holdKey = null;
      qa.pending.splice(0).forEach(complete => complete());
    };
    window.ReactNativeWebView = { postMessage(raw) {
      const request = JSON.parse(raw);
      if (request.type !== 'bridge') return;
      const { method, eventId, args } = request.body, params = args[0] || {};
      const qa = window.__nativeMetricsQA;
      const complete = () => {
        let result = null;
        if (method === 'getAnonymousKey') result = { type: 'HASH', hash: identity };
        if (method === 'getStorageItem') result = localStorage.getItem(params.key);
        if (method === 'removeStorageItem') localStorage.removeItem(params.key);
        if (method === 'setStorageItem') {
          if (params.key === qa.failKey) result = { __instanceof: 'Error', name: 'Error', message: 'raw-native-error metrics-private-storage' };
          else localStorage.setItem(params.key, params.value);
        }
        if (method === 'eventLog') qa.events.push(structuredClone(params));
        // This is the bridge method behind the official Review.request API.
        if (method === 'requestMiniAppReview') qa.reviewRequests += 1;
        window.nativeEmitterMap[request.bridgeId].emit(`${method}-${eventId}`, result, false);
      };
      if (method === 'setStorageItem' && params.key === qa.holdKey) qa.pending.push(complete);
      else queueMicrotask(complete);
    } };
  }, { storedLists, options, identity, watchKey, researchKey, promptKey });
}

const test = base.extend({
  nativeOptions: [{ version: '5.270.0', reviewSupported: true }, { option: true }],
  nativeMetrics: [async ({ context, page, qa, storedLists, nativeOptions }, use, testInfo) => {
    // Depend on qa so its deterministic routes and clock are installed first.
    await nativeStorage(context, storedLists, nativeOptions);
    await use();
    if (!page.isClosed()) {
      const events = await logged(page);
      assertPrivateDataExcluded(events);
      await testInfo.attach('sdk-usage-events', { body: JSON.stringify(events, null, 2), contentType: 'application/json' });
    }
  }, { auto: true }],
});
test.use({ storedLists: { watchlist: [{ symbol: quotes[1].ticker, name: quotes[1].name }], selected: [symbol] } });

const logged = page => page.evaluate(() => window.__nativeMetricsQA.events);
const count = async (page, name) => (await logged(page)).filter(event => event.log_name === name).length;
async function emitted(page, name, expected = 1) {
  await expect.poll(() => count(page, name)).toBe(expected);
  assertPrivateDataExcluded(await logged(page));
}
const reviewRequests = page => page.evaluate(() => window.__nativeMetricsQA.reviewRequests);
const stored = (page, key) => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), scoped(key));
const releaseNative = page => page.evaluate(() => window.__nativeMetricsRelease());
const pendingNative = page => expect.poll(() => page.evaluate(() => window.__nativeMetricsQA.pending.length)).toBe(1);
const prompt = page => page.locator('.review-opportunity');
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
async function click(page, selector) {
  const target = page.locator(selector);
  await touchable(target);
  await target.click();
}
async function question(page, value = privateQuestion, { analyze = false } = {}) {
  await expect(page.locator('#research-question')).toBeVisible();
  await page.locator('#research-question').fill(value);
  if (analyze) {
    await click(page, '.research-analyze');
    await expect(page.locator('.research-table').first()).toBeVisible();
  }
}
async function saveQuestion(page, value = privateQuestion) {
  await question(page, value);
  await click(page, '[data-research-save]');
  await expect(page.locator('#research-save-state')).toContainText('저장했어요');
  await expect(page.locator('[data-research-save]')).toBeEnabled();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

test('usage metrics follow real detail, confirmed watch save and loaded analysis/export content', async ({ page, qa }) => {
  const gate = deferred(), searchGate = deferred(), searchArrived = deferred(), searchFinished = deferred();
  for (const path of ['/api/quotes', '/api/compare', '/static/data/screener.json']) {
    qa.overrides.set(path, async (route, url) => {
      await gate.promise;
      return route.fulfill({ json: payloadFor(url) });
    });
  }
  qa.overrides.set('/api/search', async (route, url) => {
    if (url.searchParams.get('q') !== 'metrics-private-closed-query') return route.fulfill({ json: payloadFor(url) });
    searchArrived.resolve();
    await searchGate.promise;
    try { return await route.fulfill({ json: { results: [{ symbol, name: quotes[0].name, market: 'KR', type: 'EQUITY' }] } }); }
    finally { searchFinished.resolve(); }
  });
  try {
    await page.goto(`/?private_search=metrics-private-search#detail/${symbol}`);
    await expect(page.locator('#detail-price')).toHaveClass(/skeleton/);
    await expect.poll(() => qa.calls.some(call => call.path === '/api/quotes')).toBe(true);
    await emitted(page, 'app_open');
    expect(await count(page, 'stock_detail_view')).toBe(0);
    gate.resolve();
    await expect(page.locator('#detail-price')).toContainText('103,700원');
    await emitted(page, 'stock_detail_view');

    await page.evaluate(key => { window.__nativeMetricsQA.holdKey = key; }, scoped(watchKey));
    await click(page, '#detail-watch');
    await pendingNative(page);
    expect(await count(page, 'watchlist_add_success')).toBe(0);
    expect((await stored(page, watchKey)).some(row => row.symbol === symbol)).toBe(false);
    await expect(prompt(page)).toHaveCount(0);
    await releaseNative(page);
    await expect(page.locator('#detail-watch')).toHaveAttribute('aria-pressed', 'true');
    await emitted(page, 'watchlist_add_success');
    expect((await stored(page, watchKey)).some(row => row.symbol === symbol)).toBe(true);
    await expect(prompt(page)).toBeVisible();
    expect(await reviewRequests(page)).toBe(0);
    await click(page, '[data-review-dismiss]');

    await click(page, '#detail-change');
    const search = page.getByRole('textbox', { name: '종목명, 코드 또는 티커 검색' });
    await search.fill('삼성전자');
    await emitted(page, 'stock_search_attempt');
    await expect(page.getByRole('dialog').locator(`[data-selector-symbol="${symbol}"]`)).toBeVisible();
    await emitted(page, 'stock_search_success');
    await search.fill('metrics-private-search-empty');
    await emitted(page, 'stock_search_failure');
    expect((await logged(page)).find(event => event.log_name === 'stock_search_failure').params.outcome).toBe('empty');
    await expect(page.getByRole('dialog').locator('[data-selector-symbol]')).toHaveCount(0);

    await search.fill('metrics-private-closed-query');
    await searchArrived.promise;
    const canceled = page.waitForEvent('requestfailed', { predicate: request => new URL(request.url()).searchParams.get('q') === 'metrics-private-closed-query' });
    await click(page, '.selector-close');
    await canceled;
    searchGate.resolve();
    await searchFinished.promise;
    await click(page, '#detail-change');
    await search.fill('005930.KS');
    await emitted(page, 'stock_search_success', 2);
    expect(await count(page, 'stock_search_attempt')).toBe(4);
    await click(page, `[data-selector-symbol="${symbol}"]`);
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await question(page, privateQuestion, { analyze: true });
    await emitted(page, 'analysis_view_success');
    expect((await logged(page)).find(event => event.log_name === 'analysis_view_success').params.source).toBe('research');
    await fromMenu(page, 'exports');
    await expect(page.locator('[data-export-panel="overview"]')).toHaveAttribute('data-load-state', 'ready');
    await page.locator('[data-export-topic="cosmetics"]').click();
    await expect(page.locator('[data-export-panel="cosmetics"]')).toHaveAttribute('data-load-state', 'ready');
    await emitted(page, 'export_detail_view');
    expect(await count(page, 'app_open')).toBe(1);
    expect(await reviewRequests(page)).toBe(0);
    await noOverflow(page);
  } finally { gate.resolve(); searchGate.resolve(); }
});

test('failed and pending native research saves cannot emit success or offer review; retry needs an explicit review tap', async ({ page }) => {
  await page.goto(`/#detail/${symbol}`);
  await question(page, privateQuestion, { analyze: true });
  await page.evaluate(key => {
    window.__nativeMetricsQA.holdKey = key;
    window.__nativeMetricsQA.failKey = key;
  }, scoped(researchKey));
  await click(page, '[data-research-save]');
  await pendingNative(page);
  await emitted(page, 'research_save_attempt');
  expect(await count(page, 'research_save_success')).toBe(0);
  expect(await stored(page, researchKey)).toEqual({});
  await expect(prompt(page)).toHaveCount(0);
  await releaseNative(page);
  await expect(page.locator('#research-save-state')).toContainText('저장하지 못');
  await emitted(page, 'research_save_failure');
  await expect(page.locator('#research-question')).toHaveValue(privateQuestion);
  expect(await stored(page, researchKey)).toEqual({});
  expect(await count(page, 'research_save_success')).toBe(0);
  await expect(prompt(page)).toHaveCount(0);

  await page.evaluate(key => {
    window.__nativeMetricsQA.failKey = null;
    window.__nativeMetricsQA.holdKey = key;
  }, scoped(researchKey));
  await click(page, '[data-research-save]');
  await pendingNative(page);
  await emitted(page, 'research_save_attempt', 2);
  expect(await count(page, 'research_save_success')).toBe(0);
  await expect(prompt(page)).toHaveCount(0);
  await releaseNative(page);
  await expect(page.locator('#research-save-state')).toContainText('저장했어요');
  await emitted(page, 'research_save_success');
  expect((await stored(page, researchKey))[symbol].question).toBe(privateQuestion);
  await expect(prompt(page)).toBeVisible();
  await emitted(page, 'review_prompt_shown');
  expect(await reviewRequests(page)).toBe(0);
  await click(page, '[data-review-request]');
  await expect.poll(() => reviewRequests(page)).toBe(1);
  await emitted(page, 'review_request_attempt');
  await expect(prompt(page)).toHaveCount(0);
  expect(await count(page, 'research_save_failure')).toBe(1);
  // Review.request resolves void; bridge completion cannot establish a submitted review.
  expect((await logged(page)).some(event => /review.*(?:success|complete|submit)/i.test(event.log_name))).toBe(false);
  await noOverflow(page);
});

test('review dismissal is once per session, cooldown survives reload and permanent opt-out survives later visits', async ({ page }) => {
  await page.goto(`/#detail/${symbol}`);
  await saveQuestion(page);
  await expect(prompt(page)).toBeVisible();
  await emitted(page, 'review_prompt_shown');
  const firstOffer = await stored(page, promptKey);
  expect(firstOffer.lastOfferedAt).toBe(Date.parse('2026-10-07T06:35:00Z'));
  await click(page, '[data-review-dismiss]');
  await emitted(page, 'review_prompt_dismissed');
  await saveQuestion(page, `${privateQuestion} 2`);
  await expect(prompt(page)).toHaveCount(0);
  expect(await count(page, 'review_prompt_shown')).toBe(1);
  expect(await reviewRequests(page)).toBe(0);

  await page.reload();
  await saveQuestion(page, `${privateQuestion} 3`);
  await expect(prompt(page)).toHaveCount(0);
  expect(await count(page, 'review_prompt_shown')).toBe(0);
  expect((await stored(page, promptKey)).lastOfferedAt).toBe(firstOffer.lastOfferedAt);

  await page.clock.setFixedTime(new Date('2026-11-08T06:35:00Z'));
  await page.reload();
  await saveQuestion(page, `${privateQuestion} 4`);
  await expect(prompt(page)).toBeVisible();
  await click(page, '[data-review-opt-out]');
  await expect.poll(async () => (await stored(page, promptKey)).optOut).toBe(true);
  await expect(prompt(page)).toHaveCount(0);
  await page.clock.setFixedTime(new Date('2026-12-10T06:35:00Z'));
  await page.reload();
  await saveQuestion(page, `${privateQuestion} 5`);
  await expect(prompt(page)).toHaveCount(0);
  expect(await count(page, 'review_prompt_shown')).toBe(0);
  expect(await reviewRequests(page)).toBe(0);
  await noOverflow(page);
});

test.describe('unsupported review environments', () => {
  test.use({ nativeOptions: { version: '5.252.0', reviewSupported: false } });
  test('older native SDK and plain browser save normally without offering or requesting native review', async ({ page }) => {
    await page.goto(`/#detail/${symbol}`);
    await saveQuestion(page);
    await emitted(page, 'research_save_success');
    await expect(prompt(page)).toHaveCount(0);
    expect(await reviewRequests(page)).toBe(0);
    expect(await count(page, 'review_prompt_shown')).toBe(0);

    await page.goto(`/?metrics-web=1#detail/${symbol}`);
    await expect(page.locator('html')).toHaveAttribute('data-ait-runtime', 'false');
    await saveQuestion(page, `${privateQuestion} web`);
    await expect(prompt(page)).toHaveCount(0);
    expect(await reviewRequests(page)).toBe(0);
    expect(await logged(page)).toEqual([]);
    const browserNote = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), researchKey);
    expect(browserNote[symbol].question).toBe(`${privateQuestion} web`);
    await noOverflow(page);
  });
});

test('analysis failures and mismatched export responses never count as successful content views', async ({ page, qa }) => {
  let failAnalysis = true;
  const analysisGate = deferred(), analysisArrived = deferred();
  qa.overrides.set('/api/financial-history', async (route, url) => {
    if (failAnalysis) return route.fulfill({ status: 503, json: { detail: 'raw-api-error metrics-private-provider' } });
    analysisArrived.resolve();
    await analysisGate.promise;
    return route.fulfill({ json: payloadFor(url) });
  });
  qa.overrides.set('/api/quotes', route => route.fulfill({ status: 503, json: { detail: 'raw-api-error metrics-private-provider' } }));
  const exportGate = deferred(), exportArrived = deferred(), lateGate = deferred(), lateArrived = deferred();
  let matchingExport = false;
  qa.overrides.set('/api/export-momentum/item-detail', async (route, url) => {
    if (url.searchParams.get('key') === 'steel') {
      lateArrived.resolve();
      await lateGate.promise;
      return route.fulfill({ json: industryDetails.steel });
    }
    exportArrived.resolve();
    await exportGate.promise;
    return route.fulfill({ json: industryDetails[matchingExport ? 'cosmetics' : 'steel'] });
  });
  try {
    await page.goto(`/?private_search=metrics-private-search#detail/${symbol}`);
    await expect.poll(() => qa.calls.some(call => call.path === '/api/quotes')).toBe(true);
    await expect.poll(() => count(page, 'app_error')).toBeGreaterThan(0);
    expect((await logged(page)).find(event => event.log_name === 'app_error').params.screen).toBe('detail');
    await question(page);
    await click(page, '.research-analyze');
    await expect(page.locator('#research-result [data-research-retry]')).toBeVisible();
    await emitted(page, 'analysis_view_failure');
    await expect(page.locator('#research-result .research-table')).toHaveCount(0);
    expect(await count(page, 'analysis_view_success')).toBe(0);
    failAnalysis = false;
    await click(page, '#research-result [data-research-retry]');
    await analysisArrived.promise;
    await expect(page.locator('#research-result')).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('#research-result .research-table')).toHaveCount(0);
    expect(await count(page, 'analysis_view_success')).toBe(0);
    analysisGate.resolve();
    await expect(page.locator('#research-result .research-table')).toBeVisible();
    await emitted(page, 'analysis_view_success');
    expect((await logged(page)).find(event => event.log_name === 'analysis_view_success').params.source).toBe('research');

    await fromMenu(page, 'exports');
    await page.locator('[data-export-topic="cosmetics"]').click();
    await exportArrived.promise;
    await expect(page.locator('[data-export-panel="cosmetics"]')).toHaveAttribute('data-load-state', 'loading');
    expect(await count(page, 'export_detail_view')).toBe(0);
    exportGate.resolve();
    await expect(page.locator('[data-export-panel="cosmetics"]')).toHaveAttribute('data-load-state', 'error');
    expect(await count(page, 'export_detail_view')).toBe(0);
    matchingExport = true;
    await click(page, '[data-export-industry-retry="cosmetics"]');
    await expect(page.locator('[data-export-panel="cosmetics"]')).toHaveAttribute('data-load-state', 'ready');
    await emitted(page, 'export_detail_view');

    const lateResponse = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/item-detail') && new URL(response.url()).searchParams.get('key') === 'steel');
    await page.locator('[data-export-topic="steel"]').click();
    await lateArrived.promise;
    expect(await count(page, 'export_detail_view')).toBe(1);
    await page.locator('[data-export-topic="cosmetics"]').click();
    await expect(page.locator('[data-export-panel="cosmetics"]')).toHaveAttribute('data-load-state', 'ready');
    await emitted(page, 'export_detail_view', 2);
    lateGate.resolve();
    await (await lateResponse).finished();
    // Let the delivered response settle through the rendering task queue.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await count(page, 'export_detail_view')).toBe(2);
    await expect(page.locator('[data-export-panel="cosmetics"]')).toBeVisible();
    await page.locator('[data-export-topic="cosmetics"]').click();
    expect(await count(page, 'export_detail_view')).toBe(2);
    expect(await count(page, 'app_open')).toBe(1);
    expect(await reviewRequests(page)).toBe(0);
    await noOverflow(page);
  } finally {
    analysisGate.resolve();
    exportGate.resolve();
    lateGate.resolve();
  }
});
