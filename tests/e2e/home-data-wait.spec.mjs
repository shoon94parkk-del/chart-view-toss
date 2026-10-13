import { test, expect, noOverflow, touchable } from './fixtures.mjs';
import { quotes, payloadFor, asOf, top10History, recommendations } from './data.mjs';
import { formatKst } from '../../src/dataPresentation.js';

const marketPath = '/api/market-now';
const marketCalls = qa => qa.calls.filter(row => row.path === marketPath);
const marketPayload = () => payloadFor(new URL(`https://data.example${marketPath}`));
const marketPrice = (page, ticker = '^KS11') => page.locator(`#market-card [data-stock-detail="${ticker}"] strong`);

test('preserved deployed TOP10 history remains lazy and returns to verified Home prices', async ({ page, qa }) => {
  const historyPath = '/static/data/top10_history.json';
  await page.goto('/#home');
  await expect(marketPrice(page)).toHaveText('3,500');
  expect(qa.calls.filter(row => row.path === historyPath)).toHaveLength(0);
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '분석', exact: true }).click();
  const entry = page.locator('button[data-tab="history"]');
  await touchable(entry);
  await entry.click();
  await expect(page.locator('.top10h-kpis')).toBeVisible();
  await expect(page.locator('.top10h-day')).toHaveCount(top10History.days.length);
  const complete = page.locator('.top10h-day').filter({ hasText: top10History.days[0].tradeDate });
  await expect(complete.locator('.top10h-coverage')).toHaveText('TOP10 전체');
  await expect(complete.locator('.top10h-row.is-selected')).toContainText('삼성전자');
  await expect(complete.locator('.top10h-row.is-selected')).toContainText('PICK');
  const partial = page.locator('.top10h-day').filter({ hasText: top10History.days[1].tradeDate });
  await expect(partial.locator('.top10h-coverage')).toHaveText('부분 기록');
  await page.getByRole('combobox', { name: '기록 필터' }).selectOption('partial');
  await expect(page.locator('.top10h-day')).toHaveCount(1);
  await expect(page.locator('.top10h-day')).toContainText(top10History.days[1].tradeDate);
  expect(qa.calls.filter(row => row.path === historyPath)).toHaveLength(1);
  await noOverflow(page);
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '홈', exact: true }).click();
  await expect(marketPrice(page)).toHaveText('3,500');
  await expect(page.locator(`#home-watchlist [data-stock-detail="${quotes[0].ticker}"] .watch-price`)).toContainText('103,700원');
  await noOverflow(page);
});

test('one held Home market request leaves actual watch prices and snapshot usable', async ({ page, qa }) => {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  qa.overrides.set(marketPath, async route => {
    await held;
    await route.fulfill({ json: marketPayload() });
  });
  try {
    await page.goto('/#home');
    const watch = page.locator(`#home-watchlist [data-stock-detail="${quotes[0].ticker}"]`);
    await expect(watch.locator('.watch-price')).toContainText('103,700원');
    await expect(watch).toContainText(formatKst(asOf));
    await expect(page.locator('#home-daily-heatmap .home-heatmap-cell').first()).toBeVisible();
    await expect(page.locator('#market-card')).toContainText('주요 시장을 확인하고 있어요');
    await expect(page.locator('#market-card .skeleton.quote')).toHaveCount(4);
    expect(marketCalls(qa)).toHaveLength(1);
    release();
    await expect(marketPrice(page)).toHaveText('3,500');
    await expect(page.locator('#market-card .market-card-loading')).toHaveCount(0);
    await expect(page.locator('#market-card [data-stock-detail="^KS11"] .quote-asof')).toHaveText(formatKst(asOf));
    expect(marketCalls(qa)).toHaveLength(1);
    await noOverflow(page);
  } finally {
    release();
  }
});

test('failed early Home market lifecycle has one request and explicit retry recovers independently', async ({ page, qa }) => {
  let failed = true;
  qa.overrides.set(marketPath, route => failed
    ? route.fulfill({ status: 503, json: { detail: 'market temporarily unavailable' } })
    : route.fulfill({ json: marketPayload() }));
  await page.goto('/#home');
  await expect(page.locator('#retry-market')).toBeVisible();
  await expect(page.locator(`#home-watchlist [data-stock-detail="${quotes[0].ticker}"] .watch-price`)).toContainText('103,700원');
  await expect(page.locator('#home-daily-heatmap .home-heatmap-cell').first()).toBeVisible();
  expect(marketCalls(qa)).toHaveLength(1);
  failed = false;
  await page.locator('#retry-market').click();
  await expect(marketPrice(page)).toHaveText('3,500');
  await expect(page.locator('#retry-market')).toHaveCount(0);
  expect(marketCalls(qa)).toHaveLength(2);
  expect(new URLSearchParams(marketCalls(qa)[1].query).get('fresh')).toBe('true');
  await noOverflow(page);
});

test('partial primary progress keeps dated saved values and separates confirmed failure from pending', async ({ context, page, qa }) => {
  const saved = marketPayload();
  saved.results = saved.results.map(row => ({ ...row, price: row.price - 100, asOf: '2026-10-07T06:20:00Z' }));
  await context.addInitScript(value => localStorage.setItem('chartview-home-fast-v1:market', JSON.stringify({ savedAt: Date.now(), value })), saved);
  qa.overrides.set(marketPath, route => route.fulfill({ json: {
    results: marketPayload().results.slice(0, 2), refreshing: true,
    errors: [{ ticker: '^GSPC', message: 'provider unavailable' }], cacheAgeSec: null,
  } }));
  await page.goto('/#home');
  await expect(marketPrice(page)).toHaveText('3,500');
  await expect(marketPrice(page, '^IXIC')).toHaveText('3,403');
  await expect(page.locator('#market-card [data-stock-detail="^IXIC"] .quote-asof')).toHaveText(formatKst('2026-10-07T06:20:00Z'));
  await expect(page.locator('.market-partial-note')).toContainText('지수 응답이 지연되고 있어요');
  await expect(page.locator('[data-retry-market-missing]')).toBeEnabled();
  const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('chartview-home-fast-v1:market')).value);
  expect(retained.results.find(row => row.ticker === '^IXIC').asOf).toBe('2026-10-07T06:20:00Z');
  expect(retained.results.find(row => row.ticker === '^IXIC').price).toBe(3403);
  await noOverflow(page);
});

test('empty progress is pending with retry and cannot be saved as a successful market observation', async ({ page, qa }) => {
  let complete = false;
  qa.overrides.set(marketPath, route => route.fulfill({ json: complete ? marketPayload() : {
    results: [], refreshing: true, errors: [{ ticker: '^GSPC', message: 'provider unavailable' }], cacheAgeSec: null,
  } }));
  await page.goto('/#home');
  await expect(page.locator('#market-card .market-card-loading')).toHaveCount(3);
  await expect(page.locator('#market-card [data-stock-detail="^GSPC"] em')).toHaveText('자료 없음');
  await expect(page.locator('.market-partial-note')).toContainText('지수 응답이 지연되고 있어요');
  await expect(page.locator(`#home-watchlist [data-stock-detail="${quotes[0].ticker}"] .watch-price`)).toContainText('103,700원');
  expect(await page.evaluate(() => localStorage.getItem('chartview-home-fast-v1:market'))).toBeNull();
  expect(marketCalls(qa)).toHaveLength(1);
  complete = true;
  await page.locator('[data-retry-market-missing]').click();
  await expect(marketPrice(page)).toHaveText('3,500');
  await expect(page.locator('#market-card .market-card-loading')).toHaveCount(0);
  expect(marketCalls(qa)).toHaveLength(2);
  expect(new URLSearchParams(marketCalls(qa)[1].query).get('fresh')).toBe('true');
  await noOverflow(page);
});

test('settled primary failures are retryable even while optional indicators still refresh', async ({ page, qa }) => {
  qa.overrides.set(marketPath, route => route.fulfill({ json: {
    results: [], refreshing: true, errors: marketPayload().results.map(row => ({ ticker: row.ticker, message: 'provider unavailable' })),
  } }));
  await page.goto('/#home');
  await expect(page.locator('#retry-market')).toBeEnabled();
  await expect(page.locator('#market-card .market-card-loading')).toHaveCount(0);
  await expect(page.locator('#home-daily-heatmap .home-heatmap-cell').first()).toBeVisible();
  expect(marketCalls(qa)).toHaveLength(1);
});

test('ordinary scheduled market polling turns empty pending into confirmed failure and a usable retry', async ({ page, qa }) => {
  let terminal = false;
  qa.overrides.set(marketPath, route => route.fulfill({ json: {
    results: [], refreshing: !terminal,
    errors: terminal ? marketPayload().results.map(row => ({ ticker: row.ticker, message: 'provider unavailable' })) : [],
  } }));
  await page.clock.install({ time: new Date('2026-10-07T06:35:00Z') });
  await page.clock.pauseAt(new Date('2026-10-07T06:35:01Z'));
  await page.goto('/#home');
  await expect(page.locator('#market-card .market-card-loading')).toHaveCount(4);
  await expect(page.locator(`#home-watchlist [data-stock-detail="${quotes[0].ticker}"] .watch-price`)).toContainText('103,700원');
  // Let the normal startup heartbeat prove storage/live-sync initialization.
  await page.clock.runFor(1);
  await expect.poll(() => qa.calls.filter(row => row.path === '/api/activity').length).toBeGreaterThan(0);
  terminal = true;
  await page.clock.runFor(6_000);
  await expect(page.locator('#retry-market')).toBeEnabled();
  await expect(page.locator('#market-card .market-card-loading')).toHaveCount(0);
  expect(marketCalls(qa)).toHaveLength(2);
  expect(marketCalls(qa)[1].query).toBe('');
  expect(await page.evaluate(() => localStorage.getItem('chartview-home-fast-v1:market'))).toBeNull();
  await noOverflow(page);
});

test('integration newer detail index quote survives an older market response and device persistence on Home return', async ({ page, qa }) => {
  const newest = { ...marketPayload().results[0], price: 3550, change: 3, asOf: '2026-10-07T06:31:00Z' };
  qa.overrides.set('/api/quotes', (route, url) => url.searchParams.get('tickers') === '^KS11'
    ? route.fulfill({ json: { results: [newest] } })
    : route.fulfill({ json: payloadFor(url) }));
  await page.goto('/#home');
  await expect(marketPrice(page)).toHaveText('3,500');
  await page.locator('#market-card [data-stock-detail="^KS11"]').click();
  await expect(page.locator('#detail-price')).toContainText('3,550');
  await expect(page.locator('#detail-price')).toContainText(formatKst(newest.asOf));
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '홈', exact: true }).click();
  await expect(marketPrice(page)).toHaveText('3,550');
  await expect(page.locator('#market-card [data-stock-detail="^KS11"] .quote-asof')).toHaveText(formatKst(newest.asOf));
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('chartview-home-fast-v1:market')).value.results.find(row => row.ticker === '^KS11'))).toMatchObject({ price: newest.price, asOf: newest.asOf, currency: newest.currency, source: newest.source });
  await noOverflow(page);
});

test('Home preload body timeout cannot start a second budget or replace an explicit retry result', async ({ context, page, qa }) => {
  test.setTimeout(40_000);
  await context.addInitScript(() => {
    const original = window.fetch.bind(window);
    const probe = window.__homeBodyProbe = { calls: 0, waiting: false, released: false };
    window.fetch = async (...args) => {
      const response = await original(...args);
      const url = new URL(typeof args[0] === 'string' ? args[0] : args[0].url, location.href);
      if (url.pathname !== '/api/market-now' || ++probe.calls !== 1) return response;
      return {
        ok: response.ok,
        status: response.status,
        json: async () => {
          const body = await response.json();
          probe.waiting = true;
          // A transport/body adapter that finishes late must not repopulate the
          // cache after the lifecycle's deadline, even if it ignores abort.
          return new Promise(resolve => { probe.release = () => { probe.released = true; resolve(body); }; });
        },
      };
    };
  });
  let retry = false;
  qa.overrides.set(marketPath, route => {
    const body = marketPayload();
    if (retry) body.results = body.results.map(row => ({ ...row, price: row.price + 50, asOf: '2026-10-07T06:31:00Z' }));
    return route.fulfill({ json: body });
  });
  await page.clock.install({ time: new Date('2026-10-07T06:35:00Z') });
  // Pause at a future instant: WebKit advances the installed clock while the
  // protocol command is delivered, so pausing at install time can be in the past.
  await page.clock.pauseAt(new Date('2026-10-07T06:35:01Z'));
  await page.goto('/#home');
  await expect.poll(() => page.evaluate(() => window.__homeBodyProbe.waiting)).toBe(true);
  await expect(page.locator(`#home-watchlist [data-stock-detail="${quotes[0].ticker}"] .watch-price`)).toContainText('103,700원');
  await page.clock.fastForward(5_001);
  await expect(page.locator('#retry-market')).toBeVisible();
  expect(await page.evaluate(() => window.__homeBodyProbe.calls)).toBe(1);
  expect(marketCalls(qa)).toHaveLength(1);
  retry = true;
  await page.locator('#retry-market').click();
  await expect(marketPrice(page)).toHaveText('3,550');
  await page.evaluate(() => window.__homeBodyProbe.release());
  await expect.poll(() => page.evaluate(() => window.__homeBodyProbe.released)).toBe(true);
  await expect(marketPrice(page)).toHaveText('3,550');
  await expect(page.locator('#market-card [data-stock-detail="^KS11"] .quote-asof')).toHaveText(formatKst('2026-10-07T06:31:00Z'));
  expect(marketCalls(qa)).toHaveLength(2);
  await noOverflow(page);
});


test('late optional Home observations cannot move a dated PICK action during its pointer gesture', async ({ page, qa }) => {
  qa.overrides.set('/api/home-bootstrap', route => route.fulfill({ json: { day: { tradeDate: recommendations[0].recommendedDate, top3: recommendations.slice(0, 3) }, recommendations } }));
  let release, requested;
  const held = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { requested = resolve; });
  qa.overrides.set('/static/data/screener.json', async route => {
    requested(); await held;
    await route.fulfill({ json: payloadFor(new URL('https://data.example/static/data/screener.json')) });
  });
  try {
    await page.goto('/#home');
    await page.locator('[data-home-changes]').scrollIntoViewIfNeeded();
    await started;
    await expect(marketPrice(page)).toHaveText('3,500');
    await expect(page.locator('[data-home-changes]')).toContainText('전체 수출');
    const key = `${recommendations[0].recommendedDate}:${recommendations[0].code}`;
    const action = page.locator(`.home-selection-link[data-feature-target="${key}"]`);
    await touchable(action);
    const rect = await action.boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    const responseReady = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/static/data/screener.json'));
    release();
    await (await responseReady).finished();
    // Give the fulfilled response its normal paint opportunity while the user
    // still holds the button. No loading wait is added before the gesture.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(page.locator('[data-home-changes]')).not.toContainText('거래량 2배 이상');
    const heldRect = await action.boundingBox();
    expect(Math.abs(heldRect.y - rect.y)).toBeLessThan(2);
    await page.mouse.up();
    await expect(page).toHaveURL(new RegExp('#picks/' + encodeURIComponent(key) + '$'));
    await expect(page.locator(`[data-pick-key="${key}"] [data-pick-expand]`)).toHaveAttribute('aria-expanded', 'true');
    await noOverflow(page);
  } finally { release(); await page.mouse.up().catch(() => {}); }
});
