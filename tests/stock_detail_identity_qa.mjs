import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const symbol = '066570.KS';
const json = body => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
await page.route('https://chart-view-pkv8.onrender.com/**', route => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/api/search') return route.fulfill(json({ results: [{ symbol, name: 'LG전자', market: 'KR' }] }));
  if (path === '/static/data/screener.json') return route.fulfill(json({ stocks: [{ symbol, name: 'LG전자', industry: '전자제품 제조업', mainProducts: '가전제품' }] }));
  if (path === '/api/quotes') return route.fulfill(json({ results: [{ ticker: symbol, price: 200000, change: 1, currency: 'KRW', asOf: new Date().toISOString() }] }));
  if (path === '/api/compare') return route.fulfill(json({ stocks: [{ ticker: symbol, data: [{ time: '2026-09-28', value: 200000 }, { time: '2026-09-29', value: 201000 }], return: 0.5 }] }));
  if (path === '/api/valuation') return route.fulfill(json({ stocks: [] }));
  if (path === '/api/business-report' || path === '/api/relationship-evidence') return route.fulfill(json({ available: false }));
  if (path === '/api/personalized-news') return route.fulfill(json({ items: [] }));
  return route.fulfill(json({}));
});

try {
  await page.goto(`${base}/#detail/${symbol}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#detail-name').getByText('LG전자', { exact: true }).waitFor({ timeout: 20000 });
  assert.equal(await page.locator('#detail-top-title').innerText(), 'LG전자');
  assert.equal(await page.locator('.detail-brand span').nth(1).innerText(), symbol);

  await page.locator('#detail-watch').click();
  assert.equal(await page.locator('#detail-watch').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#detail-watch-quick').getAttribute('aria-pressed'), 'true');
  assert.match(await page.locator('#detail-watch').innerText(), /관심 등록됨/);
  assert.equal(await page.locator('#detail-watch').evaluate(el => getComputedStyle(el).color), 'rgb(240, 68, 82)');
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('chartview-toss-watchlist-v1'))), [{ symbol, name: 'LG전자' }]);
  if (process.env.QA_SCREENSHOT) await page.screenshot({ path: process.env.QA_SCREENSHOT });

  await page.locator('#detail-watch-quick').click();
  assert.equal(await page.locator('#detail-watch').getAttribute('aria-pressed'), 'false');
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('chartview-toss-watchlist-v1'))), []);
  await page.locator('.app-toast button').click();
  assert.equal(await page.locator('#detail-watch').getAttribute('aria-pressed'), 'true');
  await page.locator('#detail-watch-quick').click();

  await page.goto(`${base}/#home`, { waitUntil: 'domcontentloaded' });
  await page.locator('#home-search-open').click();
  assert.match(page.url(), /#home$/);
  await page.locator('#selector-search-input').fill('066570');
  await page.locator(`[data-selector-symbol="${symbol}"]`).click({ timeout: 20000 });
  assert.match(page.url(), /#detail\/066570\.KS$/);
  await page.locator('#detail-name').getByText('LG전자', { exact: true }).waitFor();
  await page.locator('#detail-watch-quick').click();
  assert.equal(await page.locator('#detail-watch-quick').getAttribute('aria-pressed'), 'true');

  await page.evaluate(symbol => localStorage.setItem('chartview-toss-watchlist-v1', JSON.stringify([{ symbol, name: symbol }])), symbol);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#detail-name').getByText('LG전자', { exact: true }).waitFor({ timeout: 20000 });
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('chartview-toss-watchlist-v1'))), [{ symbol, name: 'LG전자' }]);
  assert.equal(await page.locator('#detail-watch-quick').getAttribute('aria-pressed'), 'true');

  console.log('PASS direct ticker name, red watch hearts, stale-name repair, and Home search to detail');
} finally {
  await browser.close();
}
