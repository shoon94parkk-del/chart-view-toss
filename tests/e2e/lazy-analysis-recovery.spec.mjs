import { test, expect, noOverflow, touchable } from './fixtures.mjs';

const cases = [
  { tab: 'exports', hash: '#exports/items', chunk: 'exportMomentumView', ready: '.export-topic-nav', marker: '.export-topic-nav', active: '[data-export-topic="products"]' },
  { tab: 'memory', hash: '#memory/nand-chip', chunk: 'memoryPriceView', ready: '.dram-spot-price', marker: '.memory-price-page', active: '[data-memory-price-group="nand-chip"]' },
  { tab: 'ideas', hash: '#ideas', chunk: 'ideaView', ready: '.idea-candidate', marker: '.idea-hero' },
  { tab: 'picks', hash: '#picks', chunk: 'pickLedger', ready: '[data-testid="pick-performance"]', marker: '#pick-ledger-summary' },
];
const chunkPattern = (name, extension = 'js') => new RegExp(`/assets/${name}-[^/]+\\.${extension}(?:\\?.*)?$`);

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
    if (item.active) await expect(page.locator(item.active)).toHaveAttribute('aria-selected', 'true');
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
      await nav.getByRole('button', { name: '분석', exact: true }).click();
      await page.locator(`.feature-menu button[data-tab="${item.tab}"]`).click();
      await started;
      const pending = page.locator(`[data-surface="${item.tab}"]`).getByRole('status');
      await expect(pending).toBeVisible();
      await nav.getByRole('button', { name: '홈', exact: true }).click();
      await expect(page.locator('#market-card [data-stock-detail="^KS11"]')).toBeVisible();
      await nav.getByRole('button', { name: '분석', exact: true }).click();
      await page.locator(`.feature-menu button[data-tab="${item.tab}"]`).click();
      await expect(pending).toBeVisible();
      expect(await page.evaluate(() => window.__qaLazyMountCount)).toBe(0);
      releaseChunk();
      await expect(page.locator(item.ready).first()).toBeVisible();
      await expect.poll(() => page.evaluate(() => window.__qaLazyMountCount)).toBe(1);
      await nav.getByRole('button', { name: '홈', exact: true }).click();
      await expect(page.locator('#market-card [data-stock-detail="^KS11"]')).toBeVisible();
      expect(await page.evaluate(() => window.__qaLazyMountCount)).toBe(1);
    } finally {
      releaseChunk();
    }
  });
}

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
