import { chromium } from 'playwright';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4173';
const symbol = '000660.KS';
const t0 = '2026-09-28T09:00:00+09:00';
const t1 = '2026-09-28T09:01:00+09:00';
const t2 = '2026-09-28T09:02:00+09:00';
const t3 = '2026-09-28T09:03:00+09:00';
const stock = (price, change, asOf, source = 'Naver Finance KRX/Koscom') => ({ ticker: symbol, name: 'SK하이닉스', market: 'KR', marketCap: 250e12, price, change, currency: 'KRW', asOf, source });
const cached = stock(1750000, -6, t1);
const delayed = stock(1761000, -5.42, t2);
const fresh = stock(1762000, -5.37, t3);
const stale = stock(1700000, -7, t0);
const home = { generatedAt: t1, macro: { summary: { level: 'yellow', text: '시장 확인 중', latestBasisDate: '2026-09-28' }, results: [] }, heatmap: { results: [cached], generatedAt: t1 } };
const reply = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.addInitScript(({ cachedQuote, snapshot, ticker }) => {
    const save = (key, value) => localStorage.setItem(`chartview-home-fast-v1:${key}`, JSON.stringify({ savedAt: Date.now(), value }));
    localStorage.setItem('chartview-toss-watchlist-v1', JSON.stringify([{ symbol: ticker, name: 'SK하이닉스' }]));
    localStorage.setItem('chartview-toss-selected-v1', JSON.stringify([ticker]));
    save(`watch-quotes:${ticker}`, { results: [cachedQuote] });
    save('snapshot', snapshot);
  }, { cachedQuote: cached, snapshot: home, ticker: symbol });
  let normalQuoteCalls = 0;
  await page.route('https://chart-view-pkv8.onrender.com/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === '/api/quotes') {
      if (url.searchParams.get('fresh') === 'true') return reply(route, { results: [fresh] });
      normalQuoteCalls += 1;
      await new Promise(resolve => setTimeout(resolve, 1600));
      return reply(route, { results: [delayed] });
    }
    if (path === '/api/home-snapshot') return reply(route, home);
    if (path === '/api/heatmap/full') return reply(route, { generatedAt: t0, results: [stale], complete: true, refreshing: false, counts: { KR: 1, US: 0 } });
    if (path === '/api/home-live') return reply(route, { updatedAt: t1, results: [cached], refreshing: false });
    if (path === '/api/market-now') return reply(route, { results: [] });
    if (path === '/api/home-bootstrap') return reply(route, { recommendations: [], day: {} });
    if (path === '/api/personalized-news') return reply(route, { items: [] });
    if (path === '/api/compare') return reply(route, { stocks: [] });
    if (path === '/api/valuation') return reply(route, { stocks: [{ ...stale, generatedAt: t0, dataSource: 'historical snapshot', fieldMeta: {} }] });
    return reply(route, {});
  });

  const start = Date.now();
  await page.goto(`${base}/#watch`, { waitUntil: 'domcontentloaded' });
  await page.getByText('1,750,000원').waitFor({ timeout: 1200 });
  const firstPaintMs = Date.now() - start;
  if (firstPaintMs >= 1600) throw new Error(`Cached watch price waited for the delayed API: ${firstPaintMs}ms`);
  if (!normalQuoteCalls) throw new Error('Watchlist did not revalidate its cached quote');
  await page.getByText('1,761,000원').waitFor({ timeout: 3500 });

  await page.evaluate(() => { location.hash = '#home'; });
  await page.locator('#home-watchlist').getByText('1,761,000원').waitFor();
  await page.locator('#home-daily-heatmap').getByText('-5.42%').waitFor();

  await page.evaluate(() => { location.hash = '#valuation'; });
  await page.locator('.all-metrics-details summary').click();
  await page.locator('[data-valuation-price="000660.KS"]').getByText('1,761,000원').waitFor();
  if ((await page.locator('[data-valuation-price="000660.KS"]').innerText()).includes('1,700,000원')) throw new Error('Valuation current-price card showed its old metric snapshot as a live quote');

  await page.evaluate(() => { location.hash = '#heatmap'; });
  await page.locator('.shared-heatmap-analysis').getByText('-5.42%').waitFor();
  await page.evaluate(() => { location.hash = '#detail/000660.KS'; });
  await page.locator('#detail-price').getByText('1,762,000원').waitFor();

  await page.evaluate(() => { location.hash = '#watch'; });
  await page.getByText('1,762,000원').waitFor({ timeout: 1000 });
  await page.waitForTimeout(1750);
  if (!(await page.locator('#watch-rich-list').innerText()).includes('1,762,000원')) throw new Error('Older quote request rolled back the fresh detail price');
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log(JSON.stringify({ firstPaintMs, delayedApiMs: 1600, normalQuoteCalls, parity: 'watch/home/valuation/heatmap/detail', newestPrice: fresh.price }));
  await context.close();
} finally {
  await browser.close();
}
