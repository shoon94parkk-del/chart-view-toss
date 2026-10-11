import { test, expect, noOverflow, touchable } from './fixtures.mjs';
import {snapshot} from './guru-data.mjs';
import { asOf, quotes } from './data.mjs';
test.beforeEach(async ({qa,page})=>{
  qa.overrides.set('/static/data/guru_screening.json',route=>route.fulfill({json:snapshot()}));
  qa.overrides.set('/api/consensus',(route,url)=>route.fulfill({json:{
    ticker:url.searchParams.get('ticker'),name:quotes[0].name,currency:'KRW',asOf,source:'QA earningsTrend',
    periods:{'0y':{endDate:'2026-12-31',earnings:{avg:4,low:3,high:5,analysts:10},epsTrend:{current:4,'30daysAgo':3},revisions:{up30:1,down30:0},revenue:{avg:1000000}}},
  }}));
  qa.overrides.set('/api/valuation-band',(route,url)=>route.fulfill({json:{
    ticker:url.searchParams.get('ticker'),years:Number(url.searchParams.get('years')),source:'QA historical filings',generatedAt:asOf,method:'공시 재무자료 시차 적용',
    per:{points:[{time:'2025-10-07',value:10},{time:'2026-10-07',value:20}],stats:{current:20,median:15,p20:12,p80:18,observations:2,start:'2025-10-07',end:'2026-10-07'}},pbr:{points:[],stats:null},
  }}));
  await page.route('**/s2/favicons?*',route=>route.abort('failed'));
});

const cases = [
  { tab: 'gurus', hash: '#gurus/buffett', chunk: 'guruInvestingView', ready: '.guru-coverage', marker: '.guru-page', active: '[data-guru-strategy="buffett"]' },
  { tab: 'exports', hash: '#exports/items', chunk: 'exportMomentumView', ready: '.export-topic-nav', marker: '.export-topic-nav', active: '[data-export-topic="products"]' },
  { tab: 'memory', hash: '#memory/nand-chip', chunk: 'memoryPriceView', ready: '.dram-spot-price', marker: '.memory-price-page', active: '[data-memory-price-group="nand-chip"]' },
  { tab: 'ideas', hash: '#ideas', chunk: 'ideaView', ready: '.idea-candidate', marker: '.idea-hero' },
  { tab: 'picks', hash: '#picks', chunk: 'pickLedger', ready: '[data-testid="pick-performance"]', marker: '#pick-ledger-summary' },
  { tab: 'discover', hash: '#discover/volume-surge', chunk: 'analysisViews', ready: '.analysis-stock', marker: '#analysis-controls', active: '[data-screener-preset="volume-surge"]', activeAttribute: 'aria-pressed' },
  { tab: 'heatmap', hash: '#heatmap', chunk: 'analysisViews', ready: '.market-map-stock', marker: '#analysis-controls' },
  { tab: 'consensus', hash: '#consensus', chunk: 'analysisViews', ready: '.analysis-metrics', marker: '#analysis-controls' },
  { tab: 'bands', hash: '#bands', chunk: 'analysisViews', ready: '#band-chart canvas', marker: '#analysis-controls' },
  { tab: 'tools', hash: '#tools', chunk: 'analysisViews', ready: '.investment-tool-card', marker: '#analysis-controls' },
];
const chunkPattern = (name, extension = 'js') => new RegExp(`/assets/${name}-[^/]+\\.${extension}(?:\\?.*)?$`);

async function expectSharedAnalysisData(page, tab) {
  if (tab === 'discover') await expect(page.locator(`.analysis-stock[data-stock-detail="${quotes[0].ticker}"]`)).toContainText('기준 종가 103,700원');
  if (tab === 'heatmap') await expect(page.locator(`.market-map-stock[data-stock-detail="${quotes[0].ticker}"]`)).toHaveAttribute('aria-label', '삼성전자 +2.37%');
  if (tab === 'consensus') await expect(page.locator('.analysis-metrics div').filter({ has: page.locator('dt', { hasText: '연간 EPS 평균 추정' }) }).locator('dd')).toHaveText('4');
  if (tab === 'bands') {
    await expect(page.locator('.analysis-metrics div').filter({ has: page.locator('dt', { hasText: '최근값' }) }).locator('dd')).toHaveText('20배');
    await expect(page.locator('[data-band-basis]')).toContainText('3년 요청 · PER');
  }
  if (tab === 'tools') await expect(page.getByRole('button', { name: 'DART 외부 사이트 열기' })).toHaveAttribute('data-external-url', 'https://dart.fss.or.kr/');
}

async function enterAnalysis(page, nav, item) {
  // The retained Tools screen is a direct route; the other analysis screens
  // have existing menu entries. Exercise their actual entry contracts.
  if (item.tab === 'tools') return page.evaluate(hash => { location.hash = hash; }, item.hash);
  await nav.getByRole('button', { name: '분석', exact: true }).click();
  await page.locator(`.feature-menu button[data-tab="${item.tab}"]`).click();
}

for (const item of cases) {
  test(`lazy ${item.tab} chunk failure: deep link → explicit retry → working screen`, async ({ page, storedLists }, info) => {
    let requests = 0;
    await page.route(chunkPattern(item.chunk), async route => {
      requests++;
      if (requests === 1) return route.abort('failed');
      return route.continue();
    });
    await page.goto('/' + item.hash);
    const error = page.getByRole('alert');
    await expect(error).toBeVisible();
    await expect(page.locator(`[data-surface="${item.tab}"]`)).toBeVisible();
    await expect(page.locator('.startup-loading')).toHaveCount(0);
    const nav = page.getByRole('navigation', { name: '주요 메뉴' });
    await touchable(nav.getByRole('button', { name: '분석', exact: true }));
    await touchable(error.getByRole('button', { name: '분석 메뉴로', exact: true }));
    const retry = page.locator('[data-retry-analysis-view]');
    await touchable(retry);
    await noOverflow(page);
    // The fixture reseeds lists on reload. Capture actual bytes immediately
    // before leaving the failed document, with custom metadata not in fixtures.
    const savedBytes = {
      watchlist: JSON.stringify(storedLists.watchlist.map((row, i) => i ? row : { ...row, metadata: 'user retained metadata' })),
      selected: JSON.stringify(storedLists.selected),
    };
    let beforeReload;
    await page.exposeFunction('__qaCaptureLazyStoredLists', value => { beforeReload = value; });
    await page.evaluate(bytes => {
      localStorage.setItem('chartview-toss-watchlist-v1', bytes.watchlist);
      localStorage.setItem('chartview-toss-selected-v1', bytes.selected);
      localStorage.setItem('chartview-toss-lazy-recovery-probe', 'existing local data');
      addEventListener('beforeunload', () => {
        void window.__qaCaptureLazyStoredLists({
          watchlist: localStorage.getItem('chartview-toss-watchlist-v1'),
          selected: localStorage.getItem('chartview-toss-selected-v1'),
        });
      }, { once: true });
    }, savedBytes);
    await info.attach('lazy-chunk-failure', { body: await page.screenshot(), contentType: 'image/png' });
    const reload = page.waitForEvent('domcontentloaded');
    await retry.click();
    await reload;
    await expect(page).toHaveURL(new RegExp(item.hash.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
    await expect(page.locator(item.ready).first()).toBeVisible();
    await expectSharedAnalysisData(page, item.tab);
    if (item.active) await expect(page.locator(item.active)).toHaveAttribute(item.activeAttribute || (item.tab==='gurus'?'aria-pressed':'aria-selected'), 'true');
    await expect(page.getByRole('alert')).toHaveCount(0);
    // WebKit's failed modulepreload also needs an explicit asset GET before the
    // new document refetches it. Count both, keeping the retry bounded.
    expect(requests).toBeGreaterThanOrEqual(2);
    expect(requests).toBeLessThanOrEqual(3);
    await expect.poll(() => beforeReload).toEqual(savedBytes);
    expect(await page.evaluate(() => localStorage.getItem('chartview-toss-lazy-recovery-probe'))).toBe('existing local data');
    expect(await page.evaluate(() => ({
      watchlist: JSON.parse(localStorage.getItem('chartview-toss-watchlist-v1')),
      selected: JSON.parse(localStorage.getItem('chartview-toss-selected-v1')),
    }))).toEqual(storedLists);
    await noOverflow(page);
  });

  test(`lazy ${item.tab} pending import: leave and reenter mounts only the latest view`, async ({ page }) => {
    let releaseChunk, startedChunk;
    const held = new Promise(resolve => { releaseChunk = resolve; });
    const started = new Promise(resolve => { startedChunk = resolve; });
    await page.route(chunkPattern(item.chunk), async route => { startedChunk(); await held; return route.continue(); });
    await page.addInitScript(({ tab, marker }) => {
      window.__qaLazyMountCount = 0;
      new MutationObserver(records => {
        for (const record of records) {
          if (record.target.id !== 'app') continue;
          for (const node of record.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && node.matches(`[data-surface="${tab}"]`) && node.querySelector(marker)) window.__qaLazyMountCount++;
          }
        }
      }).observe(document, { childList: true, subtree: true });
    }, { tab: item.tab, marker: item.marker });
    try {
      // Finish the document load before holding a runtime import. WebKit can
      // defer animation frames while its initial load is incomplete; this
      // scenario checks route reentry, with deep links covered above.
      await page.goto('/#home');
      await expect(page.locator('#market-card [data-stock-detail="^KS11"]')).toBeVisible();
      const nav = page.getByRole('navigation', { name: '주요 메뉴' });
      await enterAnalysis(page, nav, item);
      await started;
      const pending = page.locator(`[data-surface="${item.tab}"]`).getByRole('status');
      await expect(pending).toBeVisible();
      await nav.getByRole('button', { name: '홈', exact: true }).click();
      await expect(page.locator('#market-card [data-stock-detail="^KS11"]')).toBeVisible();
      await enterAnalysis(page, nav, item);
      await expect(pending).toBeVisible();
      expect(await page.evaluate(() => window.__qaLazyMountCount)).toBe(0);
      releaseChunk();
      await expect(page.locator(item.ready).first()).toBeVisible();
      await expectSharedAnalysisData(page, item.tab);
      await expect.poll(() => page.evaluate(() => window.__qaLazyMountCount)).toBe(1);
      await nav.getByRole('button', { name: '홈', exact: true }).click();
      await expect(page.locator('#market-card [data-stock-detail="^KS11"]')).toBeVisible();
      expect(await page.evaluate(() => window.__qaLazyMountCount)).toBe(1);
    } finally {
      releaseChunk();
    }
  });
}

test('Home and Watch skip the shared analysis chunk until a user opens an analysis screen', async ({ page }) => {
  let requests = 0;
  await page.route(chunkPattern('analysisViews'), async route => { requests++; return route.continue(); });
  await page.goto('/#home');
  await expect(page.locator('#market-card [data-stock-detail="^KS11"]')).toBeVisible();
  const nav = page.getByRole('navigation', { name: '주요 메뉴' });
  await nav.getByRole('button', { name: '관심', exact: true }).click();
  await expect(page.locator('.watch-detail-card')).toHaveCount(quotes.length);
  expect(requests).toBe(0);
  await nav.getByRole('button', { name: '분석', exact: true }).click();
  expect(requests).toBe(0);
  await page.locator('.feature-menu button[data-tab="discover"]').click();
  await expect(page.locator('.analysis-stock')).toHaveCount(quotes.length);
  expect(requests).toBe(1);
  await page.goBack();
  await expect(page.locator('#analysis-find .feature-menu')).toBeVisible();
  await page.evaluate(() => { location.hash = '#tools'; });
  await expect(page.locator('.investment-tool-card')).toHaveCount(12);
  expect(requests).toBe(1);
  await noOverflow(page);
});

test('lazy analysis stylesheet failure recovers its deep-link filter and readable condition summary', async ({ page }) => {
  let requests = 0;
  await page.route(chunkPattern('analysisViews', 'css'), async route => {
    requests++;
    return requests === 1 ? route.abort('failed') : route.continue();
  });
  await page.goto('/#discover/volume-surge');
  await expect(page.getByRole('alert')).toBeVisible();
  const reload = page.waitForEvent('domcontentloaded');
  await page.locator('[data-retry-analysis-view]').click();
  await reload;
  await expect(page.locator('[data-screener-preset="volume-surge"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.screener-advanced > summary .screener-condition-values')).toHaveCSS('font-size', '12px');
  await expectSharedAnalysisData(page, 'discover');
  await expect(page).toHaveURL(/#discover\/volume-surge$/);
  expect(requests).toBe(2);
  await noOverflow(page);
});

test('lazy shared stylesheet failure exposes recovery and retains the current export deep link', async ({ page }) => {
  let requests = 0;
  await page.route(chunkPattern('exportMomentum', 'css'), async route => {
    requests++;
    return requests === 1 ? route.abort('failed') : route.continue();
  });
  await page.goto('/#exports/items');
  await expect(page.getByRole('alert')).toBeVisible();
  const reload = page.waitForEvent('domcontentloaded');
  await page.locator('[data-retry-analysis-view]').click();
  await reload;
  await expect(page.locator('[data-export-topic="products"]')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-export-panel="products"]')).toBeVisible();
  await expect(page).toHaveURL(/#exports\/items$/);
  expect(requests).toBe(2);
});
