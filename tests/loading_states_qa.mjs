import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const json = body => ({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4173';
let failBusiness = false;
let companyCalls = 0;
await page.route('https://chart-view-pkv8.onrender.com/**', async route => {
  const path = new URL(route.request().url()).pathname;
  if (path === '/static/data/screener.json') return route.fulfill(json({ tradeDate: '2026-09-29', stocks: [
    { symbol: '005930.KS', name: '삼성전자', industry: '반도체 제조업', mainProducts: '메모리', market: 'KOSPI', price: 110, change1d: 4, volumeRatio: 3.2, rsi14: 61, ret20: 14, ma20: 100, ma60: 90, macd: 3, macdSignal: 2, distance52HighPct: -1, near52High: true },
    { symbol: '000660.KS', name: 'SK하이닉스', industry: '반도체 제조업', mainProducts: '메모리', market: 'KOSPI', price: 102, change1d: 1, volumeRatio: 1.3, rsi14: 48, ret20: 5, ma20: 100, ma60: 95, trend2060: true, macd: 1, macdSignal: .5, distance52HighPct: -8 },
    { symbol: '005380.KS', name: '현대차', industry: '자동차 제조업', mainProducts: '완성차', market: 'KOSPI', price: 80, change1d: -2, volumeRatio: 1.1, rsi14: 27, ret20: -12, ma20: 90, ma60: 95, macd: -2, macdSignal: -1, distance52HighPct: -30 },
    { symbol: '006400.KS', name: '삼성SDI', industry: '배터리 제조업', mainProducts: '배터리', market: 'KOSPI', price: 120, change1d: 2.2, volumeRatio: 2.4, rsi14: 64, ret20: 9, ma20: 110, ma60: 100, macd: 2, macdSignal: 1, distance52HighPct: -2, near52High: true },
  ] }));
  if (path === '/static/data/company_context.json') { companyCalls++; return route.fulfill(json({ companies: [
    { symbol: '005930.KS', name: '삼성전자', industry: '반도체 제조업', mainProducts: '메모리' },
    { symbol: '000660.KS', name: 'SK하이닉스', industry: '반도체 제조업', mainProducts: '메모리' },
    { symbol: '123456.KS', name: '추가 종목', industry: '반도체 제조업', mainProducts: '반도체 장비' },
  ] })); }
  if (path === '/api/business-report') {
    if (failBusiness) return route.fulfill({ status: 503, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' });
    await wait(1600);
    return route.fulfill(json({ available: true, source: 'DART', reportYear: 2025, basis: '사업부문별 매출', sourceUrl: 'https://dart.fss.or.kr/', items: [{ name: 'DX 부문', share: 56.3, revenue: 1000 }], topItem: { name: 'DX 부문', share: 56.3 } }));
  }
  if (path === '/api/relationship-evidence') { await wait(3500); return route.fulfill(json({ available: false, relations: [] })); }
  if (path === '/api/quotes') { await wait(800); return route.fulfill(json({ results: [{ ticker: '005930.KS', price: 100000, change: 1, currency: 'KRW', asOf: new Date().toISOString() }] })); }
  if (path === '/api/compare') return route.fulfill(json({ stocks: [{ ticker: '005930.KS', data: [{ time: '2026-09-28', value: 100000 }, { time: '2026-09-29', value: 101000 }], return: 1 }] }));
  if (path === '/api/valuation') return route.fulfill(json({ stocks: [] }));
  if (path === '/api/personalized-news') return route.fulfill(json({ items: [] }));
  return route.fulfill(json({}));
});
await page.goto(`${base}/#detail/005930.KS`, { waitUntil: 'domcontentloaded' });
await page.locator('#detail-price').waitFor();
assert.equal(await page.locator('#detail-price .loading-indicator .loading-spinner').count(), 1);
await page.locator('#detail-industry-context .industry-context-card').waitFor();
assert.equal(companyCalls, 0, 'covered detail must not download company_context.json');
assert.match(await page.locator('#detail-industry-context').innerText(), /DART 사업보고서 매출 구조 확인 중/);
await page.locator('.industry-report').waitFor();
assert.match(await page.locator('#detail-industry-context').innerText(), /직접 관계 근거 확인 중/);
assert.match(await page.locator('#detail-industry-context').innerText(), /DX 부문/);
await page.locator('.industry-enrichment-status.loading').waitFor({ state: 'detached', timeout: 6000 });
console.log('PASS detail: visible initial loading, DART paints before slow relationship, final loading clears');
await page.goto(`${base}/#detail/123456.KS`, { waitUntil: 'domcontentloaded' });
await page.reload({ waitUntil: 'domcontentloaded' });
await page.locator('#detail-industry-context .industry-context-card').waitFor();
assert.ok(companyCalls > 0, 'missing screener symbol must use company context fallback');
console.log('PASS detail data: covered symbol skips company file, missing symbol uses fallback');
await page.goto(`${base}/#ideas`, { waitUntil: 'domcontentloaded' });
await page.reload({ waitUntil: 'domcontentloaded' });
const idea=page.locator('.idea-candidate-wrap').first();
await idea.waitFor();
await idea.locator('details summary').click();
await idea.locator('.industry-enrichment-status.loading').first().waitFor();
await idea.locator('.industry-report').waitFor();
assert.match(await idea.innerText(), /직접 관계 근거 확인 중/);
await idea.locator('.industry-enrichment-status.loading').waitFor({ state: 'detached', timeout: 6000 });
console.log('PASS IDEA LAB: DART paints while relationship evidence is still pending');
failBusiness = true;
await page.goto(`${base}/#detail/005930.KS`, { waitUntil: 'domcontentloaded' });
await page.reload({ waitUntil: 'domcontentloaded' });
await page.locator('#detail-industry-context .industry-context-card').waitFor();
await page.locator('.industry-enrichment-status.error').first().waitFor();
assert.match(await page.locator('#detail-industry-context').innerText(), /이 회사는 뭘 하나/);
assert.equal(await page.locator('.industry-report').count(), 0);
console.log('PASS detail failure: KRX context remains visible and DART error clears loading');
await browser.close();
