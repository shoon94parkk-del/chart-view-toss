import {test,expect,noOverflow} from './fixtures.mjs';

test('Analysis menu opens AI debate archive without backend availability',async({page,qa})=>{
  await page.clock.setFixedTime(new Date('2026-10-20T07:00:00Z'));
  await page.goto('/#more');
  const menu=page.locator('button[data-tab="debates"]');
  await expect(menu).toBeVisible();
  await menu.click();
  await expect(page.locator('[data-surface="debates"]')).toBeVisible();
  await expect(page.locator('.debate-card')).toHaveCount(3);
  await expect(page.locator('.debate-shadow')).toContainText('스모크 실증');
  await expect(page.locator('[data-debate-feed-meta]')).toContainText('게시된 정적 스냅샷');
  expect(qa.calls.filter(row=>row.path==='/api/intelligence/debates')).toHaveLength(0);
  await page.locator('[data-debate-search]').fill('272210');
  await expect(page.locator('.debate-card')).toHaveCount(1);
  await expect(page.locator('.debate-card')).toContainText('한화시스템');
  await page.locator('.debate-card summary').click();
  await expect(page.locator('.debate-phase').first()).toBeVisible();
  await expect(page.locator('.debate-panel > .debate-warning')).toContainText('비공개 원문');
  await noOverflow(page);
});

test('Direct /debates path and refresh survive denied live APIs',async({page,qa})=>{
  await page.clock.setFixedTime(new Date('2026-10-20T07:00:00Z'));
  qa.overrides.set('/api/intelligence/debates',route=>route.fulfill({status:503,json:{detail:'not configured'}}));
  qa.overrides.set('/api/intelligence/shadow/status',route=>route.fulfill({status:503,json:{detail:'not configured'}}));
  await page.goto('/debates/');
  await expect(page.locator('.debate-card')).toHaveCount(3);
  await page.locator('[data-debate-refresh]').click();
  await expect(page.locator('.debate-card')).toHaveCount(3);
  await expect(page.locator('[data-shadow-status]')).toContainText('스모크 실증');
});
