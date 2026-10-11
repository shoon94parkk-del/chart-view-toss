import { test, expect, openHome, noOverflow } from './fixtures.mjs';
import { payloadFor, symbol } from './data.mjs';

test('PICK home and filtered ledger explain the unchanged whole-record average', async ({ page, qa }) => {
  qa.overrides.set('/api/home-bootstrap', (route, url) => {
    const data = payloadFor(url);
    data.recommendations[0].lastUpdatedTradeDate = '2026-10-06';
    return route.fulfill({ json: data });
  });
  await openHome(page);
  const home = page.locator('.home-pick-calculation');
  await home.locator('summary').click();
  await expect(home).toContainText('산술평균');
  await expect(home).toContainText('2026-10-06');
  await page.goto('/#picks');
  const kpi = page.getByTestId('pick-performance');
  const initial = await kpi.textContent();
  await page.getByText('집계 기준', { exact: true }).click();
  const explanation = page.locator('[data-pick-calculation]');
  for (const term of ['산술평균', '포트폴리오', '목록 필터', '배당', '비용']) await expect(explanation).toContainText(term);
  await page.locator('#pick-ledger-search').evaluate(input => { input.closest('details').open = true; });
  await page.locator('#pick-ledger-search').fill('삼성전자');
  await expect(kpi).toHaveText(initial);
  await noOverflow(page);
});

test('quarter source opening failure is visible and retryable without blanking the data', async ({ page, qa }) => {
  qa.overrides.set('/api/financial-quarters', route => route.fulfill({ json: {
    available: true, basis: '별도재무제표', quarters: [{ year: 2026, quarter: 2, available: true, revenue: 1e12, operatingProfit: 1e11, currency: 'KRW', sourceUrls: ['https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260801000001'] }], ttm: null,
  } }));
  await page.addInitScript(() => { window.open = () => { throw new Error('Browser dispatch failed'); }; });
  await page.goto(`/#detail/${symbol}`);
  const host = page.locator('#detail-financial-quarters');
  await host.locator('.quarter-table-details summary').click();
  const source = host.getByRole('button', { name: '공시 원문', exact: true });
  await source.click();
  await expect(host.getByRole('status')).toContainText('원문을 열지 못했어요');
  await expect(host.locator('.quarter-chart')).toBeVisible();
  await page.evaluate(() => { window.open = () => null; });
  await source.click();
  await expect(host.locator('[data-source-open-status]')).toBeEmpty();
});

test('research source failure has feedback while the computed comparison remains usable', async ({ page }) => {
  await page.addInitScript(() => { window.open = () => { throw new Error('External browser unavailable'); }; });
  await page.goto(`/#detail/${symbol}`);
  const research = page.locator('#research-card-body');
  await research.locator('[data-research-example="0"]').click();
  await research.getByRole('button', { name: '비교 분석하기', exact: true }).click();
  const result = research.locator('#research-result');
  const source = result.locator('[data-research-source]').first();
  await expect(source).toBeVisible();
  await source.click();
  await expect(page.getByText('원문을 열지 못했어요. 연결 상태를 확인한 뒤 원문 버튼을 다시 눌러주세요.', { exact: true })).toBeVisible();
  await expect(result).toContainText('매출');
});
