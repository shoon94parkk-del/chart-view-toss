import { test, expect, noOverflow, touchable } from './fixtures.mjs';

for (const industry of ['cosmetics', 'steel', 'petroleum']) {
  test(`share preserves the public ${industry} industry in a fresh page`, async ({ page, context }) => {
    await page.addInitScript(() => { navigator.share = async details => { window.capturedShare = details; }; });
    await page.goto(`/#exports/${industry}`);
    await expect(page.locator(`[data-export-panel="${industry}"][data-load-state="ready"]`)).toBeVisible();
    await page.getByRole('button', { name: '현재 화면 공유', exact: true }).first().click();
    const details = await page.evaluate(() => window.capturedShare);
    const shared = new URL(details.url);
    expect(shared.hash).toBe(`#exports/${industry}`);
    expect(shared.search).not.toContain('watchlist');
    const receiver = await context.newPage();
    await receiver.goto(`/${shared.search}${shared.hash}`);
    await expect(receiver.locator(`[data-export-panel="${industry}"][data-load-state="ready"]`)).toBeVisible();
    await expect(receiver.locator(`[data-export-panel="${industry}"]`)).toBeVisible();
    await noOverflow(receiver);
  });
}

test('semiconductor share restores the public graph metric and segment', async ({ page, context }) => {
  await page.addInitScript(() => { navigator.share = async details => { window.capturedShare = details; }; });
  await page.goto('/#exports/memory');
  await page.locator('[data-export-semi-segment="mcp-memory"]').click();
  await page.locator('[data-export-semi-metric="yoy"]').click();
  await page.getByRole('button', { name: '현재 화면 공유', exact: true }).first().click();
  const url = new URL((await page.evaluate(() => window.capturedShare)).url);
  const receiver = await context.newPage();
  await receiver.goto(`/${url.search}${url.hash}`);
  await expect(receiver.getByRole('img', { name: 'MCP 최근 12개월 수출액 추이', exact: true })).toBeVisible();
  await expect(receiver.locator('[data-export-semi-metric="yoy"]')).toHaveClass(/is-active/);
  await expect(receiver.locator('#export-semi-chart-focus')).toBeVisible();
});

test('news stock chips open the exact existing symbol news route', async ({ page, qa }) => {
  await page.goto('/#news');
  const chip = page.locator('[data-news-symbol="005930.KS"]');
  await touchable(chip);
  await chip.click();
  await expect(page).toHaveURL(/#news\/005930\.KS$/);
  await expect(page.locator('.task-head')).toContainText('삼성전자 뉴스');
  await expect.poll(() => qa.calls.filter(call => call.path === '/api/personalized-news').at(-1)?.query).toContain('005930');
  await noOverflow(page);
});
