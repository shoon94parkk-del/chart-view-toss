import {test,expect,noOverflow} from './fixtures.mjs';
import {performanceOutcome} from '../../scripts/performance-outcome.mjs';

test('discover closed controls disclose active filters and technical clear preserves search',async({page})=>{
  await page.goto('/#discover');
  await expect(page.locator('.analysis-stock').first()).toBeVisible();
  const advanced=page.locator('.screener-advanced');await advanced.locator(':scope > summary').click();
  await page.locator('#screener-filters [name="query"]').fill('삼성전자');
  await page.locator('.screener-extra > summary').click();
  await page.locator('[name="rsiMin"]').fill('99');
  await expect(page.locator('[data-clear-technical]')).toBeVisible();
  await advanced.locator(':scope > summary').click();
  await expect(advanced.locator(':scope > summary')).toContainText('2개 적용');
  await page.locator('[data-clear-technical]').click();
  await expect(advanced.locator(':scope > summary')).toContainText('1개 적용');
  await expect(page.locator('.analysis-stock')).toContainText('삼성전자');
  await expect(page.locator('[name="query"]')).toHaveValue('삼성전자');await noOverflow(page);
});

test('performance outcome keeps usable detail separate from optional empty/error sections',async({page,qa})=>{
  qa.overrides.set('/api/news',route=>route.fulfill({status:503,json:{detail:'unavailable'}}));
  await page.goto('/#detail/005930.KS');
  await expect(page.locator('#detail-price .quote-main strong').first()).toContainText(/[0-9]/);
  // Exercise the diagnostic against a real mounted primary and visible fallback.
  await page.locator('#detail-news').evaluate(el=>{el.innerHTML='<div class="empty">관련 뉴스를 불러오지 못했어요</div>';el.scrollIntoView();});
  expect(await page.evaluate(performanceOutcome,'detail/005930.KS')).toBe('ready');

});

test('performance outcome reports PICK primary failure as error rather than fast data readiness',async({page,qa})=>{
  qa.overrides.set('/api/home-bootstrap',route=>route.fulfill({status:503,json:{detail:'unavailable'}}));
  await page.goto('/#picks');
  await expect(page.locator('[data-pick-primary-retry]')).toBeVisible();
  expect(await page.evaluate(performanceOutcome,'picks')).toBe('error');
});


test('performance outcome classifies actual unavailable quote markup instead of skeleton removal',async({page,qa})=>{
  qa.overrides.set('/api/quotes',route=>route.fulfill({status:503,json:{detail:'unavailable'}}));
  qa.overrides.set('/api/valuation',route=>route.fulfill({json:{stocks:[]}}));
  qa.overrides.set('/api/compare',route=>route.fulfill({json:{stocks:[]}}));
  qa.overrides.set('/api/home-snapshot',route=>route.fulfill({json:{heatmap:{results:[]}}}));
  qa.overrides.set('/api/market-now',route=>route.fulfill({json:{results:[]}}));
  qa.overrides.set('/static/data/screener.json',route=>route.fulfill({json:{stocks:[]}}));
  await page.goto('/#detail/005930.KS');
  await expect(page.locator('#detail-price [data-retry-detail]')).toBeVisible();
  await expect(page.locator('#detail-price .quote-main strong').first()).toContainText('확인 불가');
  expect(await page.evaluate(performanceOutcome,'detail/005930.KS')).toBe('error');
});
