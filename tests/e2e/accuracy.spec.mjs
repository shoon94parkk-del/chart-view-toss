import { test, expect, openHome } from './fixtures.mjs';
import { quotes, symbol, payloadFor } from './data.mjs';
import { rememberLiveQuotes, resolveLiveQuote, clearLiveQuotes } from '../../src/liveQuoteStore.js';

for (const [price, change] of [[103700, 2.37], [87600, -3.14], [100000, 0]]) {
  test(`integration 삼성전자 응답·canonical 가공·홈/관심/상세: ${change}%`, async ({ page, qa }) => {
    qa.overrides.set('/api/quotes', (route, url) => {
      const payload = payloadFor(url);
      payload.results = payload.results.map(row => row.ticker === symbol ? { ...row, price, change } : row);
      return route.fulfill({ json: payload });
    });
    const response = page.waitForResponse(response => new URL(response.url()).pathname === '/api/quotes');
    await openHome(page);
    const raw = (await (await response).json()).results.find(row => row.ticker === symbol);
    clearLiveQuotes();
    rememberLiveQuotes([raw], { priority: 50 });
    const canonical = resolveLiveQuote(symbol, { ...raw, price: 1, asOf: '2020-01-01T00:00:00Z' });
    expect(canonical.price).toBe(raw.price);
    expect(canonical.change).toBe(raw.change);
    const displayedPrice = `${Math.round(raw.price).toLocaleString('ko-KR')}원`;
    const displayedChange = `${raw.change > 0 ? '+' : ''}${raw.change.toFixed(2)}%`;
    const home = page.locator(`#home-watchlist [data-stock-detail="${symbol}"]`);
    await expect(home).toContainText(displayedPrice);
    await expect(home).toContainText(displayedChange);
    await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '관심', exact: true }).click();
    const watch = page.locator(`#watch-rich-list [data-stock-detail="${symbol}"]`);
    await expect(watch).toContainText(displayedPrice);
    await expect(watch).toContainText(displayedChange);
    await watch.click();
    await expect(page.locator('#detail-price')).toContainText(displayedPrice);
    await expect(page.locator('#detail-price')).toContainText(displayedChange);
  });
}

test('integration 선정 성과: 개별 수익률·평균·분모·우선 상태', async ({ page }) => {
  const response = page.waitForResponse(response => new URL(response.url()).pathname === '/api/home-bootstrap');
  await page.goto('/#picks');
  const rows = (await (await response).json()).recommendations;
  const evaluated = rows.filter(row => Number.isFinite(row.returnPct));
  const returns = evaluated.map(row => (row.currentPrice / row.recommendedPrice - 1) * 100);
  evaluated.forEach((row, i) => expect(row.returnPct).toBeCloseTo(returns[i]));
  const average = returns.reduce((sum, n) => sum + n, 0) / returns.length;
  const winRate = Math.round(returns.filter(n => n > 0).length / returns.length * 100);
  const summary = page.getByTestId('pick-performance');
  await expect(summary).toContainText(`${average > 0 ? '+' : ''}${average.toFixed(2)}%`);
  await expect(summary).toContainText(`${winRate}%`);
  await expect(summary).toContainText(`평가 ${evaluated.length}/${rows.length}건`);
  for (const row of rows) {
    const record = page.locator(`[data-pick-key="${row.recommendedDate}:${row.code}"]`);
    await expect(record).toContainText(Number.isFinite(row.returnPct) ? `${row.returnPct > 0 ? '+' : ''}${row.returnPct.toFixed(2)}%` : '—');
  }
  const nvda = page.locator('[data-pick-key="2026-10-02:NVDA"]');
  await expect(nvda.getByLabel('종합 점검 상태 · 재점검')).toBeVisible();
  await nvda.locator('[data-pick-expand]').click();
  await expect(nvda.locator('[data-pick-detail]')).toContainText('기업 근거 상태 · 유지');
  await expect(nvda.locator('[data-pick-detail]')).toContainText('단기 매도 검토');
});

for (const value of [null, '', 0]) {
  test(`integration 결측과 실제 0 구분: 선정 성과·PER ${JSON.stringify(value)}`, async ({ page, qa }) => {
    qa.overrides.set('/api/home-bootstrap', (route, url) => {
      const payload = payloadFor(url);
      payload.day.top3 = payload.day.top3.map(row => ({ ...row, returnPct: value }));
      payload.recommendations = payload.recommendations.map(row => ({ ...row, returnPct: value }));
      return route.fulfill({ json: payload });
    });
    qa.overrides.set('/api/valuation', (route, url) => {
      const payload = payloadFor(url);
      payload.stocks = payload.stocks.map(row => ({ ...row, forwardPE: value, trailingPE: value }));
      return route.fulfill({ json: payload });
    });
    const homeResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/home-bootstrap');
    await openHome(page);
    const rawPick = (await (await homeResponse).json()).day.top3[0];
    const pickValue = rawPick.returnPct;
    expect(pickValue).toBe(value);
    await expect(page.locator('.home-selection-return').first()).toHaveText(pickValue === 0 ? '0.00%' : '—');
    const valuationResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/valuation');
    await page.goto('/#valuation');
    const rawMetric = (await (await valuationResponse).json()).stocks[0].forwardPE;
    expect(rawMetric).toBe(value);
    const row = page.locator(`.valuation-compare-row[data-stock-detail="${symbol}"]`);
    await expect(row.locator('.valuation-row-value > strong')).toHaveText(rawMetric === 0 ? '0배' : '-');
    await expect(row.locator('.metric-bar > i')).toHaveAttribute('style', rawMetric === 0 ? 'width:4%' : 'width:0%');
    await page.getByRole('tab', { name: '실적 PER', exact: true }).click();
    await expect(row.locator('.valuation-row-value > strong')).toHaveText(value === 0 ? '0배' : '-');
    await page.getByText('종목별 전체 지표 보기', { exact: true }).click();
    await expect(page.locator('.metric-cell strong').first()).toHaveText(value === 0 ? '0배' : '-');
  });
}
