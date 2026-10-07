import { test, expect, openHome, noOverflow } from './fixtures.mjs';
import { payloadFor, quotes, symbol } from './data.mjs';

const known = { symbol, name: '삼성전자', type: 'KRX' };
const domestic = { symbol: '067310.KQ', name: '하나마이크론', type: 'KRX' };
const micron = { symbol: 'MU', name: 'Micron Technology', type: 'EQUITY' };
const direct = { symbol: 'ZZZZZZ', name: 'ZZZZZZ', type: 'DIRECT' };

test.describe('comprehensive stored lists recovery', () => {
  const storedLists = {
    watchlist: [null, { symbol, name: '삼성전자', metadata: '유지' }, 123, { symbol: 'NVDA', name: 123 }, { symbol: 'invalid/code' }],
    selected: [null, 123, {}, symbol, 'NVDA', 'invalid/code'],
  };
  test.use({ storedLists });
  test('malformed elements preserve valid Home/watch/detail/compare and original device data', async ({ page, qa }) => {
    await openHome(page);
    await expect(page.locator('#home-watchlist [data-stock-detail]')).toHaveCount(2);
    await expect(page.locator(`#home-watchlist [data-stock-detail="${symbol}"]`)).toContainText('103,700원');
    await expect(page.locator('#home-watchlist [data-stock-detail="NVDA"]')).toContainText('엔비디아');
    const nav = page.getByRole('navigation', { name: '주요 메뉴' });
    await nav.getByRole('button', { name: '관심', exact: true }).click();
    await expect(page.locator('#watch-rich-list [data-stock-detail]')).toHaveCount(2);
    await page.locator(`#watch-rich-list [data-stock-detail="${symbol}"]`).click();
    await expect(page.locator('#detail-name')).toHaveText('삼성전자');
    await expect(page.locator('#detail-price')).toContainText('103,700원');
    await nav.getByRole('button', { name: '수익률', exact: true }).click();
    await expect(page.locator('#chart-canvas canvas').first()).toBeVisible();
    await expect(page.locator('#chart-legend button')).toHaveCount(2);
    await expect(page.locator('#chart-selected-summary')).toContainText('2개 종목');
    expect(await page.evaluate(() => ({
      watchlist: localStorage.getItem('chartview-toss-watchlist-v1'),
      selected: localStorage.getItem('chartview-toss-selected-v1'),
    }))).toEqual({ watchlist: JSON.stringify(storedLists.watchlist), selected: JSON.stringify(storedLists.selected) });
    for (const call of qa.calls) {
      const tickers = new URLSearchParams(call.query).get('tickers');
      if (tickers) expect(tickers.split(',').every(ticker => [symbol, 'NVDA'].includes(ticker))).toBe(true);
    }
    await noOverflow(page);
  });
});

test.describe('comprehensive wholly invalid lists remain empty', () => {
  test.use({ storedLists: { watchlist: [null, 123, {}], selected: [null, 123, {}] } });
  test('invalid stored rows do not become default or malformed stock selections', async ({ page, qa }) => {
    await openHome(page);
    await expect(page.locator('#home-watchlist [data-stock-detail]')).toHaveCount(0);
    await expect(page.locator('.ticker-strip')).toContainText('비교 종목을 선택해주세요');
    await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '수익률', exact: true }).click();
    await expect(page.locator('#chart-canvas')).toContainText('비교할 종목이 없어요');
    expect(qa.calls.some(call => call.path === '/api/compare')).toBe(false);
    await noOverflow(page);
  });
});

for (const mode of ['DIRECT verification', 'Micron alias', 'Micron original']) {
  test(`comprehensive search partial ${mode}: verified result → isolated retry → detail`, async ({ page, qa }) => {
    let recover = false;
    const query = mode === 'DIRECT verification' ? '삼성' : '마이크론';
    const target = mode === 'DIRECT verification' ? known : mode === 'Micron alias' ? domestic : micron;
    qa.overrides.set('/api/search', (route, url) => {
      const q = url.searchParams.get('q');
      if (mode === 'DIRECT verification') return route.fulfill({ json: { results: [known, direct] } });
      if (!recover && q === (mode === 'Micron alias' ? 'MU' : '마이크론')) return route.fulfill({ status: 503, json: { detail: 'One search source unavailable' } });
      return route.fulfill({ json: { results: [q === 'MU' ? micron : domestic] } });
    });
    qa.overrides.set('/api/quotes', (route, url) => {
      const tickers = (url.searchParams.get('tickers') || '').split(',');
      if (tickers.includes('ZZZZZZ')) return route.fulfill(recover ? { json: { results: [] } } : { status: 503, json: { detail: 'DIRECT verification unavailable' } });
      if (tickers.includes(domestic.symbol) || tickers.includes(micron.symbol)) return route.fulfill({ json: { results: [
        { ...quotes[0], ticker: target.symbol, name: target.name, price: 100, currency: target === micron ? 'USD' : 'KRW' },
      ] } });
      return route.fulfill({ json: payloadFor(url) });
    });
    await openHome(page);
    await page.locator('#home-search-open').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: '종목명, 코드 또는 티커 검색' }).fill(query);
    const partial = dialog.getByRole('status').filter({ hasText: '일부 검색 자료' });
    await expect(partial).toBeVisible();
    await expect(dialog.locator(`[data-selector-symbol="${target.symbol}"]`)).toContainText(target.name);
    await expect(dialog.locator('[data-selector-symbol="ZZZZZZ"]')).toHaveCount(0);
    const searchCalls = qa.calls.filter(call => call.path === '/api/search').length;
    const quoteCalls = qa.calls.filter(call => call.path === '/api/quotes').length;
    recover = true;
    const recovered = page.waitForResponse(response => {
      const url = new URL(response.url());
      return response.status() === 200 && (mode === 'DIRECT verification'
        ? url.pathname.endsWith('/api/quotes') && url.searchParams.get('tickers') === 'ZZZZZZ'
        : url.pathname.endsWith('/api/search') && url.searchParams.get('q') === (mode === 'Micron alias' ? 'MU' : '마이크론'));
    });
    await partial.locator('[data-selector-retry]').click();
    await recovered;
    await expect(dialog.getByRole('status')).toHaveCount(0);
    await expect(partial).toHaveCount(0);
    expect(qa.calls.filter(call => call.path === '/api/search').length).toBeGreaterThan(searchCalls);
    if (mode === 'DIRECT verification') expect(qa.calls.filter(call => call.path === '/api/quotes').length).toBeGreaterThan(quoteCalls);
    await dialog.locator(`[data-selector-symbol="${target.symbol}"]`).click();
    await expect(page.locator('#detail-name')).toHaveText(target.name);
    await expect(page.locator('#detail-price')).toContainText(mode === 'DIRECT verification' ? '103,700원' : target === micron ? '$100' : '100원');
    await noOverflow(page);
  });
}

for (const mode of ['all search sources', 'DIRECT-only verification']) {
  test(`comprehensive search ${mode} failure: explicit error and force retry`, async ({ page, qa }) => {
    let recover = false;
    qa.overrides.set('/api/search', (route, url) => mode === 'all search sources' && !recover
      ? route.fulfill({ status: 503, json: { detail: 'Search source unavailable' } })
      : route.fulfill({ json: { results: mode === 'DIRECT-only verification' ? [direct] : [url.searchParams.get('q') === 'MU' ? micron : domestic] } }));
    qa.overrides.set('/api/quotes', (route, url) => url.searchParams.get('tickers') === 'ZZZZZZ'
      ? route.fulfill(recover ? { json: { results: [] } } : { status: 503, json: { detail: 'Quote verification unavailable' } })
      : route.fulfill({ json: payloadFor(url) }));
    await openHome(page);
    await page.locator('#home-search-open').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('textbox', { name: '종목명, 코드 또는 티커 검색' }).fill(mode === 'all search sources' ? '마이크론' : 'ZZZZZZ');
    await expect(dialog.getByRole('status')).toContainText('검색을 완료하지 못했어요');
    await expect(dialog.locator('[data-selector-symbol]')).toHaveCount(0);
    recover = true;
    await dialog.locator('[data-selector-retry]').click();
    await expect(dialog.getByRole('status')).toHaveCount(0);
    if (mode === 'all search sources') await expect(dialog.locator('[data-selector-symbol="MU"]')).toBeVisible();
    else {
      await expect(dialog.locator('[data-selector-symbol="ZZZZZZ"]')).toHaveCount(0);
      await expect(dialog.locator('#selector-results')).toContainText('검색 결과가 없어요');
    }
    await noOverflow(page);
  });
}

test('comprehensive search canceled old request never replaces the newest result', async ({ page, qa }) => {
  let startSlow, releaseSlow, finishSlow;
  const started = new Promise(resolve => { startSlow = resolve; });
  const held = new Promise(resolve => { releaseSlow = resolve; });
  const finished = new Promise(resolve => { finishSlow = resolve; });
  qa.overrides.set('/api/search', async (route, url) => {
    if (url.searchParams.get('q') !== 'slow') return route.fulfill({ json: { results: [known] } });
    startSlow(); await held;
    try { await route.fulfill({ json: { results: [{ symbol: 'SLOW', name: '늦은 결과', type: 'EQUITY' }] } }); }
    finally { finishSlow(); }
  });
  try {
    await openHome(page);
    await page.locator('#home-search-open').click();
    const dialog = page.getByRole('dialog'), input = dialog.getByRole('textbox', { name: '종목명, 코드 또는 티커 검색' });
    await input.fill('slow'); await started;
    const canceled = page.waitForEvent('requestfailed', { predicate: request => {
      const url = new URL(request.url()); return url.pathname.endsWith('/api/search') && url.searchParams.get('q') === 'slow';
    } });
    await input.fill('삼성전자');
    await canceled;
    await expect(dialog.getByRole('status')).toHaveCount(0);
    await expect(dialog.locator(`[data-selector-symbol="${symbol}"]`)).toBeVisible();
    releaseSlow(); await finished;
    await expect(dialog.locator('[data-selector-symbol="SLOW"]')).toHaveCount(0);
    await expect(dialog.locator(`[data-selector-symbol="${symbol}"]`)).toBeVisible();
  } finally { releaseSlow(); }
});
