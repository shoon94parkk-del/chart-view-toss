import { test, expect } from '@playwright/test';
const symbol = '005930.KS';
const fmtPrice = row => `${Math.round(row.price).toLocaleString('ko-KR')}원`;
const fatal = [];
test.beforeEach(async ({ page }) => {
  fatal.length = 0;
  page.on('pageerror', e => fatal.push(e.message));
  if (process.env.E2E_PROXY_SERVER) {
    // Relay the real response through Node's configured CA trust in Codex.
    // No fixtures or synthetic values; TLS verification stays enabled.
    await page.route(/\/(?:api|static\/data)\//, async route => {
      const response = await route.fetch({ timeout: 60_000 });
      await route.fulfill({ response });
    });
  }
  await page.addInitScript(() => {
    localStorage.setItem('chartview-toss-watchlist-v1', JSON.stringify([{ symbol: '005930.KS', name: '삼성전자' }]));
    localStorage.setItem('chartview-toss-selected-v1', JSON.stringify(['005930.KS']));
  });
});
test.afterEach(async ({ page }, info) => {
  // A completed core check need not wait for unrelated optional provider calls.
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await info.attach('fatal-errors', { body: JSON.stringify(fatal), contentType: 'application/json' });
  expect(fatal).toEqual([]);
});

test('live 실제 삼성전자 검색·시세 응답과 상세 표시', async ({ page }, info) => {
  await page.goto('/#home');
  await page.locator('#home-search-open').click();
  const searchResponse = page.waitForResponse(r => new URL(r.url()).pathname === '/api/search' && new URL(r.url()).searchParams.get('q') === '삼성전자');
  await page.getByRole('textbox', { name: '종목명, 코드 또는 티커 검색' }).fill('삼성전자');
  const search = await (await searchResponse).json();
  expect(search.results.some(row => row.symbol === symbol)).toBe(true);
  const quotesResponse = page.waitForResponse(r => new URL(r.url()).pathname === '/api/quotes' && new URL(r.url()).searchParams.get('fresh') === 'true');
  await page.locator(`[data-selector-symbol="${symbol}"]`).click();
  const observed = [];
  page.on('response', async r => {
    if (new URL(r.url()).pathname !== '/api/quotes' || !r.ok()) return;
    try { const row = (await r.json()).results?.find(row => row.ticker === symbol); if (row?.price > 0) observed.push(row); } catch {}
  });
  const quote = (await (await quotesResponse).json()).results.find(row => row.ticker === symbol);
  expect(quote.price).toBeGreaterThan(0);
  observed.push(quote);
  await expect(page.locator('#detail-name')).toHaveText('삼성전자');
  await expect.poll(async () => {
    const text = await page.locator('#detail-price').innerText();
    return observed.some(row => text.includes(fmtPrice(row)) && text.includes(`${row.change > 0 ? '+' : ''}${Number(row.change).toFixed(2)}%`));
  }).toBe(true);
  await info.attach('real-quote-response', { body: JSON.stringify(quote), contentType: 'application/json' });
});

test('live 관세청 반도체 응답·12개월 DRAM 표시', async ({ page }, info) => {
  await page.goto('/#exports');
  const response = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/semiconductor-trends'));
  await page.getByRole('tab', { name: '반도체', exact: true }).click();
  const payload = await (await response).json();
  const dram = payload.segments.find(row => row.key === 'dram');
  expect(dram.history).toHaveLength(12);
  await page.locator('[data-export-semi-segment="dram"]').click();
  const chart = page.getByRole('img', { name: 'DRAM 최근 12개월 수출액 추이', exact: true });
  await expect(chart.getByTestId('semiconductor-month')).toHaveCount(12);
  for (const [i, row] of dram.history.entries()) {
    const label = await chart.getByTestId('semiconductor-month').nth(i).getAttribute('aria-label');
    expect(label).toContain(row.period);
    expect(Number(label.slice(row.period.length + 1).replace('억달러', '').replaceAll(',', ''))).toBeCloseTo(row.exportsUsdBillion * 10, 1);
  }
  await info.attach('real-semiconductor-response', { body: JSON.stringify(payload), contentType: 'application/json' });
});

test('live 선정 기록: 실제 응답 분모·성과 집계', async ({ page }, info) => {
  const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/home-bootstrap');
  await page.goto('/#picks');
  const payload = await (await response).json();
  const rows = payload.recommendations;
  expect(rows.length).toBeGreaterThan(0);
  const evaluated = rows.filter(row => row.returnPct != null && String(row.returnPct).trim() !== '' && Number.isFinite(Number(row.returnPct)));
  const average = evaluated.reduce((sum, row) => sum + Number(row.returnPct), 0) / evaluated.length;
  const winRate = Math.round(evaluated.filter(row => Number(row.returnPct) > 0).length / evaluated.length * 100);
  const summary = page.getByTestId('pick-performance');
  await expect(summary).toContainText(`평가 ${evaluated.length}/${rows.length}건`);
  await expect(summary).toContainText(`${average > 0 ? '+' : ''}${average.toFixed(2)}%`);
  await expect(summary).toContainText(`${winRate}%`);
  await info.attach('real-pick-aggregate', { body: JSON.stringify({ rows: rows.length, evaluated: evaluated.length, average, winRate }), contentType: 'application/json' });
});
