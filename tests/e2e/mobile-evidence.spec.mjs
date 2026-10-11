import { test, expect, noOverflow, contained, touchable } from './fixtures.mjs';
import { asOf, financial, monitor, quotes, screener, symbol } from './data.mjs';

const explanation = '실제 공시와 최근 거래 자료를 다시 확인했고 기업 근거를 유지해요. 다음 공시의 매출과 영업이익을 함께 확인하세요.';
const usRows = [
  { ticker: 'GS', name: 'The Goldman Sachs Group, Inc.', sector: 'Financial', price: 735, change: 1.1 },
  { ticker: 'CRM', name: 'Salesforce, Inc.', sector: 'Technology', price: 259, change: -1.2 },
].map(row => ({ ...row, market: 'US', marketCap: 1e12, currency: 'USD', sessionDate: '2026-10-07', asOf }));

async function readable(locator) {
  await expect(locator).toBeVisible();
  expect(await locator.evaluate(el => Number.parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(12);
  await contained(locator);
}

async function capture(page, info, name) {
  await info.attach(name, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
}

async function enlargeEvidence(locator) {
  await locator.evaluate(root => {
    const nodes = [root, ...root.querySelectorAll('*')];
    const sizes = nodes.map(el => Number.parseFloat(getComputedStyle(el).fontSize));
    nodes.forEach((el, i) => el.style.setProperty('font-size', `${sizes[i] * 2}px`, 'important'));
  });
}

test('mobile evidence: screener keeps full conditions and source date readable behind a compact disclosure', async ({ page, qa }, info) => {
  qa.overrides.set('/static/data/screener.json', route => route.fulfill({ json: { ...screener, stocks: [{ ...screener.stocks[0], change1d: 40 }] } }));
  await page.goto('/#discover');
  const row = page.locator('.analysis-stock-wrap').first();
  const details = row.locator('.analysis-stock-evidence');
  await expect(row.locator('.analysis-stock')).toContainText('변동 기준 확인');
  await touchable(details.locator('summary'));
  await details.locator('summary').click();
  await expect(details).toContainText('2026-10-07');
  await expect(details).toContainText('일간 변동 ±35% 이상');
  for (const selector of ['.analysis-stock-basis', '.analysis-match-reasons i', '.data-quality-warning']) await readable(details.locator(selector).first());
  await readable(page.locator('.analysis-meta'));
  await noOverflow(page);
  await capture(page, info, 'screener-expanded-evidence');
  await details.locator('summary').click();
  expect((await row.locator('.analysis-stock').boundingBox()).height).toBeLessThanOrEqual(118);
  if (page.viewportSize().width <= 600) expect((await row.boundingBox()).height).toBeLessThanOrEqual(118);
  await row.locator('.analysis-stock').click();
  await expect(page.locator('#detail-name')).toHaveText('삼성전자');
  await page.goBack();
  const restored = page.locator('.analysis-stock-wrap').first();
  await expect(restored).toBeVisible();
  await enlargeEvidence(restored);
  await touchable(restored.locator('summary'));
  await restored.locator('summary').click();
  await readable(restored.locator('.data-quality-warning'));
  await noOverflow(page);
});

test('mobile evidence: IDEA status has readable complete explanation and supplied review date', async ({ page, qa }, info) => {
  qa.overrides.set('/static/data/pick_monitor.json', route => route.fulfill({ json: { ...monitor, picks: [{ ...monitor.picks[0], monitor: { lastReviewedTradeDate: '2026-10-06', reason: explanation } }] } }));
  await page.goto('/#ideas');
  const appearances = page.locator(`[data-idea-symbol="${symbol}"]`);
  await expect.poll(() => appearances.count(), {message:'The same stock appears in multiple observation patterns'}).toBeGreaterThan(1);
  for (const appearance of await appearances.all()) {
    await expect(appearance.locator('.idea-monitor-status')).toHaveText('기업 근거 · 유지');
    await expect(appearance.locator('.idea-monitor-details > p')).toHaveText(explanation);
    await expect(appearance.locator('.idea-monitor-date')).toContainText('기업 근거 검토 2026-10-06');
  }
  const row = appearances.first();
  const details = row.locator('.idea-monitor-details');
  await expect(row.locator('.idea-monitor-status')).toHaveText('기업 근거 · 유지');
  await touchable(details.locator('summary'));
  const companyEvidence = row.locator('[data-industry-context] > summary');
  await touchable(companyEvidence);
  if (page.viewportSize().width <= 600) {
    const monitorBounds = await details.locator('summary').boundingBox();
    const companyBounds = await companyEvidence.boundingBox();
    expect(Math.abs(monitorBounds.y - companyBounds.y)).toBeLessThanOrEqual(2);
    expect(monitorBounds.x + monitorBounds.width).toBeLessThanOrEqual(companyBounds.x + 1);
  }
  await details.locator('summary').click();
  await expect(details.locator('p')).toHaveText(explanation);
  await expect(details).toContainText('기업 근거 검토 2026-10-06');
  await readable(details.locator('p'));
  await readable(details.locator('.idea-monitor-date'));
  await readable(page.locator('.idea-results-head > span'));
  await readable(page.locator('.idea-meta'));
  await capture(page, info, 'idea-expanded-evidence');
  await row.locator('.idea-candidate').click();
  await expect(page.locator('#detail-name')).toHaveText('삼성전자');
  await page.goBack();
  const restored = page.locator(`[data-idea-symbol="${symbol}"]`).first();
  await expect(restored.locator('.idea-monitor-details')).toHaveAttribute('open', '');
  await enlargeEvidence(restored);
  await touchable(restored.locator('.idea-monitor-details > summary'));
  await readable(restored.locator('.idea-monitor-details > p'));
  await noOverflow(page);
});

test('mobile evidence: IDEA does not present selection date as a missing review date', async ({ page, qa }) => {
  qa.overrides.set('/static/data/pick_monitor.json', route => route.fulfill({ json: { picks: [{ ...monitor.picks[0], pickDate: '2026-01-02', monitor: { reason: explanation }, technical: {} }] } }));
  await page.goto('/#ideas');
  const details = page.locator(`[data-idea-symbol="${symbol}"]`).first().locator('.idea-monitor-details');
  await details.locator('summary').click();
  await expect(details).toContainText('검토일 미제공');
  await expect(details).not.toContainText('2026-01-02');
});

test('mobile evidence: US sector alternatives expose ticker and complete name with exact navigation', async ({ page, qa }, info) => {
  qa.overrides.set('/api/heatmap/full', route => route.fulfill({ json: { generatedAt: asOf, complete: true, results: [...quotes, ...usRows] } }));
  qa.overrides.set('/api/quotes', (route, url) => {
    const tickers = (url.searchParams.get('tickers') || '').split(',');
    return route.fulfill({ json: { results: [...quotes, ...usRows].filter(row => tickers.includes(row.ticker)) } });
  });
  await page.goto('/#heatmap');
  await page.locator('[data-full-market="US"]').click();
  for (const [ticker, sector, name] of [['GS', '금융', usRows[0].name], ['CRM', '기술', usRows[1].name]]) {
    await page.getByRole('button', { name: `${sector} 종목 목록`, exact: true }).click();
    const row = page.locator(`.market-map-members [data-stock-detail="${ticker}"]`);
    await expect(row).toContainText(ticker);
    await expect(row).toContainText(name);
    await expect(row).toHaveAccessibleName(new RegExp(`${ticker}.*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
    await touchable(row);
    await noOverflow(page);
    await capture(page, info, `us-sector-${ticker}`);
    await row.click();
    await expect(page).toHaveURL(new RegExp(`#detail/${ticker}$`));
    await expect(page.locator('#detail-name')).toHaveText(name);
    await page.goBack();
    await expect(page.locator('[data-full-market="US"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator(`.market-map-members [data-stock-detail="${ticker}"]`)).toBeVisible();
  }
});

test('mobile evidence: financial statement basis wraps as a whole and explains comparison limits', async ({ page, qa }, info) => {
  qa.overrides.set('/api/financial-history', route => route.fulfill({ json: financial }));
  qa.overrides.set('/api/financial-quarters', route => route.fulfill({ json: { available: true, basis: '별도재무제표', quarters: [{ available: true, year: 2026, quarter: 2, revenue: 1e12, operatingProfit: 1e11, margin: 10, currency: 'KRW', sourceUrls: [] }] } }));
  await page.goto(`/#detail/${symbol}`);
  const block = page.locator('#detail-financial-quarters');
  const basis = block.locator('.investment-subhead > span');
  await expect(basis).toHaveText('별도재무제표');
  await readable(basis);
  const lines = await basis.evaluate(el => { const r = document.createRange(); r.selectNodeContents(el); return [...r.getClientRects()].length; });
  expect(lines, 'Statement basis remains one complete label').toBe(1);
  await touchable(block.locator('.quarter-basis-help > summary'));
  await block.locator('.quarter-basis-help > summary').click();
  await expect(block.locator('.quarter-basis-help')).toContainText('연결재무제표는 종속기업을 포함');
  await expect(block.locator('.quarter-basis-help')).toContainText('서로 다르면 수치를 직접 비교하지 마세요');
  await readable(block.locator('.quarter-basis-help > p'));
  await capture(page, info, 'financial-basis');
  await enlargeEvidence(block.locator('.investment-subhead'));
  await enlargeEvidence(block.locator('.quarter-basis-help'));
  await touchable(block.locator('.quarter-basis-help > summary'));
  await contained(basis);
  await noOverflow(page);
});
