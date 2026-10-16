import AxeBuilder from '@axe-core/playwright';
import { test, expect, noOverflow, touchable } from './fixtures.mjs';
import { now, newsPayload, commonArticle, summary, archivedForecastMacro } from '../fixtures/moneytoring-ux.mjs';

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date(now)); });

test('news reader merges verified stock relations and requests summaries only on expansion', async ({ page, qa }) => {
  qa.overrides.set('/api/personalized-news', route => route.fulfill({ json: newsPayload }));
  qa.overrides.set('/api/news-summary', route => route.fulfill({ json: summary }));
  await page.goto('/#news');
  const cards = page.locator('[data-news-reader-card]');
  await expect(cards).toHaveCount(2);
  const shared = cards.filter({ hasText: commonArticle.title });
  await expect(shared.locator('[data-news-reader-stock]')).toHaveCount(2);
  expect(qa.calls.filter(row => row.path === '/api/news-summary')).toHaveLength(0);
  const toggle = shared.locator('[data-news-summary-toggle]');
  await touchable(toggle); await toggle.click();
  await expect(shared).toContainText(summary.summary);
  await expect(shared).toContainText('기사 요약문 기반');
  await toggle.click(); await toggle.click();
  expect(qa.calls.filter(row => row.path === '/api/news-summary')).toHaveLength(1);
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 }); await noOverflow(page);
    await touchable(shared.locator('[data-news-reader-stock]').first());
  }
});

test('explicit research saves append local checkpoints with the quote observation and review date', async ({ page, qa }) => {
  await page.goto('/#detail/005930.KS');
  await expect(page.locator('#detail-price .quote-main')).toBeVisible();
  await page.locator('#research-question').fill('공시 매출과 수출 자료를 다시 확인');
  await page.locator('.research-review-editor > summary').click();
  await page.locator('#research-review-on').fill('2026-10-29');
  await page.locator('[data-research-save]').click();
  await expect(page.locator('#research-save-state')).toContainText('저장');
  const history = page.locator('[data-research-checkpoints]');
  await history.locator('summary').click();
  await expect(history.locator('[data-research-checkpoint]')).toHaveCount(1);
  await expect(history).toContainText('공시 매출과 수출 자료를 다시 확인');
  await expect(history).toContainText('관측');
  await expect(history).toContainText('103,700');
  await page.reload();
  await expect(page.locator('#research-review-on')).toHaveValue('2026-10-29');
  await page.locator('[data-research-checkpoints] > summary').click();
  await expect(page.locator('[data-research-checkpoint]')).toHaveCount(1);
  await page.locator('#research-question').fill('다음 분기 원문과 비교');
  await page.locator('[data-research-save]').click();
  await expect(page.locator('[data-research-checkpoint]')).toHaveCount(2);
  expect(qa.calls.filter(row => row.path.includes('checkpoint'))).toHaveLength(0);
  await noOverflow(page);
});

test('a provider archive forecast is readable without fabricating a first-release comparison', async ({ page, qa }, info) => {
  qa.overrides.set('/api/macro', route => route.fulfill({ json: archivedForecastMacro() }));
  await page.goto('/#macro');
  await expect(page.locator('[data-comparison-expected]')).toHaveText('3.6%');
  await expect(page.getByTestId('inflation-forecast-evidence')).toContainText('사후');
  await expect(page.locator('[data-inflation-comparison]')).toHaveAttribute('data-comparison-level', 'gray');
  await expect(page.locator('[data-comparison-actual]')).toHaveAttribute('data-comparison-actual-kind', 'index_calculated');
  await expect(page.getByTestId('inflation-recent-publications')).toBeVisible();
  await expect(page.getByTestId('inflation-upcoming-event').first()).toHaveAttribute('data-release-state', 'pending');
  expect(qa.calls.filter(row => row.path === '/api/macro')).toHaveLength(1);
  const audit = await new AxeBuilder({ page }).include('#macro-inflation').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  await info.attach('archive-macro-axe', { body: JSON.stringify(audit), contentType: 'application/json' });
  expect(audit.violations).toEqual([]);
  for (const width of [320,390,430]) { await page.setViewportSize({width,height:844}); await noOverflow(page); }
});

test('summary failure retries explicitly and reader filters and expansion survive a detail round trip', async ({ page, qa }) => {
  qa.overrides.set('/api/personalized-news', route => route.fulfill({ json: newsPayload }));
  let attempts = 0;
  qa.overrides.set('/api/news-summary', route => ++attempts === 1
    ? route.fulfill({ status: 503, json: { detail: 'temporary summary failure' } })
    : route.fulfill({ json: summary }));
  await page.goto('/#news');
  await page.locator('[data-news-source="공시뉴스"]').click();
  const card = page.locator('[data-news-reader-card]').filter({ hasText: commonArticle.title });
  await card.locator('[data-news-summary-toggle]').click();
  const retry = card.locator('[data-news-summary-retry]');
  await expect(retry).toBeVisible(); await retry.click();
  await expect(card).toContainText(summary.summary);
  await card.locator('[data-news-reader-stock="005930.KS"]').click();
  await expect(page.locator('#detail-price .quote-main')).toBeVisible();
  await page.goBack();
  await expect(page.locator('[data-news-source="공시뉴스"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(card.locator('[data-news-summary-toggle]')).toHaveAttribute('aria-expanded', 'true');
  await expect(card).toContainText(summary.summary);
  await page.locator('[data-news-sort="latest"]').click();
  await expect(card.locator('[data-news-summary-toggle]')).toHaveAttribute('aria-expanded', 'true');
  expect(attempts).toBe(2);
});

test('chart publication dates reuse loaded news and remain optional through period and route changes', async ({ page, qa }, info) => {
  qa.overrides.set('/api/personalized-news', route => route.fulfill({ json: newsPayload }));
  await page.goto('/#detail/005930.KS');
  const evidence = page.getByRole('region', { name: '차트 관련 기사 근거' });
  const toggle = evidence.getByRole('button', { name: '차트에 날짜 표시' });
  await expect(toggle).toBeEnabled();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(evidence).toContainText('주가 변동의 원인을 뜻하지 않아요');
  await touchable(toggle); await toggle.click();
  await expect(evidence).toContainText('날짜 표시 켜짐');
  await expect(evidence).toContainText('게시일과 같은 날짜의 차트 관측점 확인');
  await page.locator('[data-detail-period="3mo"]').click();
  await expect(page.locator('#detail-period-label')).toHaveText('3개월 수익률');
  await expect(toggle).toHaveAttribute('aria-pressed','true');
  expect(qa.calls.some(row=>row.path==='/api/compare'&&new URLSearchParams(row.query).get('period')==='3mo')).toBe(true);
  expect(qa.calls.filter(row => row.path === '/api/personalized-news')).toHaveLength(1);
  expect(qa.calls.filter(row => row.path === '/api/news-summary')).toHaveLength(0);
  for (const width of [320,390,430]) { await page.setViewportSize({width,height:844}); await noOverflow(page); }
  const audit = await new AxeBuilder({ page }).include('#detail-chart-evidence').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  await info.attach('chart-evidence-axe', { body: JSON.stringify(audit), contentType: 'application/json' });
  expect(audit.violations).toEqual([]);
  await page.getByRole('navigation', {name:'주요 메뉴'}).getByRole('button', {name:'홈', exact:true}).click();
  await page.goBack();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('HTTP-200 provider failure is retryable and grouped detail evidence is preserved',async({page,qa})=>{
 let calls=0;
 qa.overrides.set('/api/personalized-news',route=>route.fulfill({json:++calls===1
  ?{items:[],groups:[{symbol:'005930.KS',status:'error',items:[]}],errors:[{code:'provider_timeout'}]}
  :{items:[],groups:[newsPayload.groups[0]],errors:[]}}));
 await page.goto('/#detail/005930.KS');
 const evidence=page.getByRole('region',{name:'차트 관련 기사 근거'});
 await expect(evidence).toContainText('관련 기사를 불러오지 못했어요');
 await expect(evidence).not.toContainText('확인된 관련 기사가 없어요');
 await page.locator('#retry-detail-news').click();
 await expect(evidence.getByRole('button',{name:'차트에 날짜 표시'})).toBeEnabled();
 await expect(page.locator('#detail-news')).toContainText(commonArticle.title);
 expect(calls).toBe(2);
 expect(qa.calls.some(row=>row.path==='/api/personalized-news'&&new URLSearchParams(row.query).get('force')==='true')).toBe(true);
});

test('reader retries a provider error body without waiting for cache expiry',async({page,qa})=>{
 let calls=0;
 qa.overrides.set('/api/personalized-news',route=>route.fulfill({json:++calls===1
  ?{items:[],groups:[{status:'error',items:[]}],errors:[{code:'provider_timeout'}]}
  :newsPayload}));
 await page.goto('/#news');
 await page.locator('[data-news-retry]').click();
 await expect(page.locator('[data-news-reader-card]')).toHaveCount(2);
 expect(calls).toBe(2);
 expect(qa.calls.some(row=>row.path==='/api/personalized-news'&&new URLSearchParams(row.query).get('force')==='true')).toBe(true);
 await expect(page.locator('[data-news-us-coverage]')).toContainText('4일');
});
