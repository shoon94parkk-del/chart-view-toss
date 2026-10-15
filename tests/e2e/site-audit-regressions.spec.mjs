import { test, expect, noOverflow } from './fixtures.mjs';
import { top10History } from './data.mjs';

const home = page => page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '홈', exact: true });

for (const status of [200, 503]) test(`late TOP10 ${status} preserves the destination Home route`, async ({ page, qa }) => {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  let delivered = false;
  qa.overrides.set('/static/data/top10_history.json', async route => {
    await held;
    await route.fulfill({ status, json: status === 200 ? top10History : { detail: 'temporary failure' } });
    delivered = true;
  });
  try {
    await page.goto('/#history');
    await expect.poll(() => qa.calls.filter(c => c.path === '/static/data/top10_history.json').length).toBe(1);
    await home(page).click();
    await expect(page.locator('#home-search-open')).toBeVisible();
    const settled = page.waitForResponse(r => r.url().includes('/static/data/top10_history.json'));
    release();
    await (await settled).body();
    await expect.poll(() => delivered).toBe(true);
    // Flush the consumer's promise and rendering work without a fixed sleep.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(page.locator('#home-search-open')).toBeVisible();
    await expect(page.locator('[data-surface="home"]')).toBeVisible();
    await expect(page).toHaveTitle('차트뷰');
    await noOverflow(page);
  } finally { release(); }
});

test('returning to a research draft does not label unsaved edits as saved', async ({ page }) => {
  await page.goto('/#detail/005930.KS');
  await page.locator('#research-question').fill('최근 매출과 영업이익은 이전보다 어떻게 달라졌어?');
  await page.locator('[data-research-save]').click();
  await expect(page.locator('#research-save-state')).toContainText('기기에 저장했어요');
  await page.locator('#research-question').fill('영업현금흐름과 순이익을 비교해줘');
  await home(page).click();
  await page.goBack();
  await expect(page.locator('#research-question')).toHaveValue('영업현금흐름과 순이익을 비교해줘');
  await expect(page.locator('#research-save-state')).toContainText('작성 중');
  await page.reload();
  await expect(page.locator('#research-question')).toHaveValue('최근 매출과 영업이익은 이전보다 어떻게 달라졌어?');
  await expect(page.locator('#research-save-state')).toContainText('저장한 질문');
});

test('custom range remains the sole active period after browser Back', async ({ page }) => {
  await page.goto('/#chart');
  await page.getByText('기간 직접 지정', { exact: true }).click();
  await page.locator('#custom-range [name="start"]').fill('2026-08-01');
  await page.locator('#custom-range [name="end"]').fill('2026-09-30');
  await page.getByRole('button', { name: '기간 적용', exact: true }).click();
  await expect(page.locator('[data-period][aria-pressed="true"]')).toHaveCount(0);
  await home(page).click();
  await page.goBack();
  await expect(page.getByText('기간 직접 지정 · 적용 중', { exact: true })).toBeVisible();
  await expect(page.locator('[data-period][aria-pressed="true"]')).toHaveCount(0);
  await expect(page.locator('#custom-range [name="start"]')).toHaveValue('2026-08-01');
});

test('history direct entry loads the production shell and intended route', async ({ page }) => {
  const response = await page.goto('/history/');
  expect(response.status()).toBe(200);
  await expect(page.locator('[data-surface="history"]')).toBeVisible();
  await expect(page.locator('.top10h-day')).toHaveCount(top10History.days.length);
});

test('watch timing waits for actual prices rather than placeholder cards',async({page,qa})=>{
 let release;const held=new Promise(resolve=>{release=resolve;});
 qa.overrides.set('/api/quotes',async(route,url)=>{await held;const {payloadFor}=await import('./data.mjs');await route.fulfill({json:payloadFor(url)});});
 try{
  await page.goto('/#watch');
  await expect(page.locator('#watch-rich-list .watch-main')).toHaveCount(3);
  const {performanceOutcome}=await import('../../scripts/performance-outcome.mjs');
  expect(await page.evaluate(performanceOutcome,'watch')).toBe('pending');
  release();
  await expect.poll(()=>page.evaluate(performanceOutcome,'watch')).toBe('ready');
 }finally{release();}
});
