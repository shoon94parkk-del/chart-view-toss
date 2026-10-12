import { test, expect, openHome, noOverflow, touchable } from './fixtures.mjs';
import { quotes, asOf, symbol } from './data.mjs';
import { formatKst } from '../../src/dataPresentation.js';

const key = 'chartview-toss-home-journey-v1';
const prior = { version: 1, quotes: [{ symbol, price: 100000, currency: 'KRW', asOf: '2026-10-02T06:30:00Z' }] };

test.describe('Home first action', () => {
  test.use({ storedLists: { watchlist: [], selected: [symbol] } });
  test('search and actual interest-save guide are readable while established first-screen entries remain', async ({ page }) => {
    await openHome(page);
    await expect(page.locator('.home-start-guide')).toHaveText('종목 검색 → 상세에서 하트로 관심 저장');
    await touchable(page.locator('#home-search-open'));
    await page.evaluate(() => scrollTo(0, 0));
    const geometry = await page.evaluate(() => ({
      market: document.querySelector('.market-section').getBoundingClientRect(),
      entries: document.querySelector('.home-value-entries').getBoundingClientRect(),
      nav: document.querySelector('.bottom-nav').getBoundingClientRect(),
      height: innerHeight,
    }));
    expect(geometry.market.bottom).toBeLessThan(geometry.nav.top);
    if (geometry.height >= 693) expect(geometry.entries.bottom).toBeLessThan(geometry.nav.top);
    else for (const button of await page.locator('.home-value-entries button').all()) await touchable(button);
    await page.evaluate(() => scrollTo(0, 0));
    await page.locator('#home-search-open').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await touchable(page.locator('.selector-close'));
    await noOverflow(page);
  });
});

test('return Home prioritizes saved interests and compares actual observations once across visits', async ({ page }) => {
  await page.addInitScript(({ key, prior }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(prior)); }, { key, prior });
  await openHome(page);
  const row = page.locator(`#home-watchlist [data-stock-detail="${symbol}"]`);
  await expect(row.locator('.home-watch-delta')).toContainText('이전 확인 100,000원 대비 +3.70%');
  await expect(row.locator('.home-watch-delta')).toContainText(formatKst(prior.quotes[0].asOf));
  await expect(row.locator('.home-watch-delta')).toContainText(formatKst(asOf));
  await expect(row.locator('.watch-price')).toContainText('103,700원');
  await expect(row.locator('.watch-price')).toContainText('+2.37%');
  await expect(page.locator('[data-home-revisit-status="changes"]')).toContainText('전일 등락률과 달라요');
  await expect(page.locator('#home-daily-heatmap-section')).toBeAttached();
  expect(await page.evaluate(()=>Boolean(document.querySelector('.market-section').compareDocumentPosition(document.querySelector('#home-daily-heatmap-section'))&Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  expect(await page.locator('.watch-section').evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(await page.locator('.market-section').evaluate(el => el.getBoundingClientRect().top));
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)).quotes.find(row => row.symbol === '005930.KS')?.asOf, key)).toBe(asOf);
  await noOverflow(page);
  await page.reload();
  await expect(page.locator('[data-home-revisit-status="unchanged"]')).toBeVisible();
  await expect(row.locator('.home-watch-delta')).toBeHidden();
  await expect(row.locator('.watch-price')).toContainText('103,700원');
});

for (const scenario of ['empty', 'failed']) test(`device-cached prices remain visible without claiming changes when current sources are ${scenario}`, async ({ page, qa }) => {
  await page.addInitScript(({ key, prior, quotes }) => {
    localStorage.setItem(key, JSON.stringify(prior));
    localStorage.setItem('chartview-home-fast-v1:quotes:005930.KS|000660.KS|NVDA', JSON.stringify({ savedAt: Date.now(), value: { results: quotes } }));
  }, { key, prior, quotes });
  qa.overrides.set('/api/quotes', route => scenario === 'failed' ? route.fulfill({ status: 503, json: { detail: 'Current quote unavailable' } }) : route.fulfill({ json: { results: [] } }));
  qa.overrides.set('/api/home-snapshot', route => route.fulfill({ json: { macro: null, heatmap: { results: [] } } }));
  qa.overrides.set('/api/home-live', route => route.fulfill({ json: { results: [] } }));
  await openHome(page);
  const row = page.locator(`#home-watchlist [data-stock-detail="${symbol}"]`);
  await expect(row.locator('.watch-price')).toContainText('103,700원');
  await expect(page.locator('[data-home-revisit-status="unavailable"]')).toBeVisible();
  await expect(row.locator('.home-watch-delta')).toBeHidden();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key)).toEqual(prior);
  await noOverflow(page);
});

test('held native reset cannot recreate a private comparison after Home navigation', async ({ context, page }) => {
  await context.addInitScript(() => {
    window.__appsInTossConstants = { operationalEnvironment: 'sandbox', platformOS: 'android', tossAppVersion: '5.270.0' };
    window.__bridgeMethods__ = ['getAnonymousKey', 'getStorageItem', 'setStorageItem', 'removeStorageItem', '__subscribeAppEvent', '__unsubscribeAppEvent'];
    window.__journeyNativeQA = { hold: false, pending: [] };
    window.ReactNativeWebView = { postMessage(raw) {
      const request = JSON.parse(raw);
      if (request.type !== 'bridge') return;
      const { method, eventId, args } = request.body, params = args[0] || {};
      const complete = () => {
        let result = null;
        if (method === 'getAnonymousKey') result = { type: 'HASH', hash: 'journey-qa' };
        if (method === 'getStorageItem') result = localStorage.getItem(params.key);
        if (method === 'setStorageItem') localStorage.setItem(params.key, params.value);
        if (method === 'removeStorageItem') localStorage.removeItem(params.key);
        window.nativeEmitterMap[request.bridgeId].emit(`${method}-${eventId}`, result, false);
      };
      if (method === 'removeStorageItem' && window.__journeyNativeQA.hold) window.__journeyNativeQA.pending.push(complete);
      else queueMicrotask(complete);
    } };
  });
  await openHome(page);
  const scoped = `${key}:journey-qa`;
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), scoped)).not.toBeNull();
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '분석', exact: true }).click();
  await page.locator('.feature-row[data-tab="info"]').click();
  await page.locator('#clear-local-data').click();
  await page.evaluate(() => { window.__journeyNativeQA.hold = true; });
  await page.locator('#clear-local-data').click();
  await expect.poll(() => page.evaluate(() => window.__journeyNativeQA.pending.length)).toBeGreaterThan(0);
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '홈', exact: true }).click();
  await expect(page.locator('#home-watchlist [data-stock-detail]')).toHaveCount(3);
  await page.evaluate(() => document.dispatchEvent(new CustomEvent('chartview:home-live', { detail: { results: [{ ticker: '005930.KS', price: 104000, currency: 'KRW', asOf: '2026-10-08T06:30:00Z' }] } })));
  await expect(page.locator('#home-watch-revisit')).toBeEmpty();
  await page.evaluate(() => { window.__journeyNativeQA.hold = false; window.__journeyNativeQA.pending.splice(0).forEach(complete => complete()); });
  await expect(page.locator('.app-toast')).toContainText('초기화했어요');
  await expect(page.locator('#home-watchlist [data-stock-detail]')).toHaveCount(0);
  await expect(page.locator('#home-watchlist')).not.toContainText('삼성전자');
  expect(await page.evaluate(key => localStorage.getItem(key), scoped)).toBeNull();
});
