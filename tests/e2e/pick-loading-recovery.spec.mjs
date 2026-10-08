import { test, expect, noOverflow, touchable } from './fixtures.mjs';
import { recommendations, monitor, payloadFor } from './data.mjs';

const monitoringPath = '/static/data/pick_monitor.json';
const rowFor = (page, name) => page.locator('.pick-ledger-item').filter({ has: page.locator('.pick-ledger-stock strong', { hasText: name }) }).first();

test('PICK independent loading: real performance and usable rows precede held optional monitor', async ({ page, qa }, info) => {
  let release, requested;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { requested = resolve; });
  qa.overrides.set(monitoringPath, async route => { requested(); await gate; return route.fulfill({ json: monitor }); });
  try {
    await page.goto('/#picks');
    await started;
    // This must succeed before releasing the optional response: the old
    // Promise.all path cannot display already available bootstrap data here.
    const performance = page.getByTestId('pick-performance');
    await expect(performance).toBeVisible({ timeout: 1500 });
    await expect(performance).toContainText('평가 3/4건');
    await expect(page.locator('[data-pick-expand]')).toHaveCount(recommendations.length);
    await expect(page.locator('#pick-ledger-status-strip')).toContainText('확인하고 있어요');
    await expect(page.getByTestId('pick-status')).toHaveCount(0);
    await expect(rowFor(page, '삼성전자')).toContainText('점검 확인 중');
    await expect(page.locator('#pick-ledger-status')).toBeDisabled();
    await touchable(rowFor(page, '삼성전자').locator('[data-pick-expand]'));
    await noOverflow(page);
    await info.attach('pick-before-monitor', { body: await page.screenshot(), contentType: 'image/png' });
    release();
    await expect(page.getByTestId('pick-status')).toBeVisible();
    await expect(rowFor(page, '삼성전자')).toContainText('유지');
    await expect(page.locator('#pick-ledger-status')).toBeEnabled();
  } finally { release(); }
});

test('PICK monitoring retry preserves filters, expanded dated row, focused control and detail-back position', async ({ page, qa }, info) => {
  let requests = 0, release, requested;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { requested = resolve; });
  qa.overrides.set(monitoringPath, async route => {
    requests++;
    // Successful HTTP with an invalid body is cached by the request client.
    // Explicit retry must reach the endpoint again, rather than reuse it.
    if (requests === 1) return route.fulfill({ json: { generatedAt: monitor.generatedAt } });
    requested(); await gate;
    return route.fulfill({ json: monitor });
  });
  try {
    await page.goto('/#picks');
    const performance = page.getByTestId('pick-performance');
    await expect(performance).toContainText('평가 3/4건');
    const before = await performance.innerText();
    const strip = page.locator('#pick-ledger-status-strip');
    await expect(strip).toHaveAttribute('data-load-state', 'error');
    await expect(page.getByTestId('pick-status')).toHaveCount(0);
    await expect(rowFor(page, '삼성전자')).toContainText('점검 미확인');
    const stored = await page.evaluate(() => ({ watch: localStorage.getItem('chartview-toss-watchlist-v1'), selected: localStorage.getItem('chartview-toss-selected-v1') }));
    const options = page.locator('.pick-ledger-search-options');
    await options.locator('summary').click();
    await page.locator('#pick-ledger-search').fill('삼성전자');
    await page.locator('#pick-ledger-period').selectOption('7');
    await page.locator('#pick-ledger-performance').selectOption('win');
    await page.locator('#pick-ledger-sort').selectOption('return');
    await options.locator('summary').click();
    await expect(page.locator('[data-pick-expand]')).toHaveCount(1);
    const row = rowFor(page, '삼성전자');
    const key = await row.getAttribute('data-pick-key');
    await row.locator('[data-pick-expand]').click();
    const bootstrapCalls = qa.calls.filter(call => call.path === '/api/home-bootstrap').length;
    const retry = page.locator('[data-pick-monitor-retry]');
    await touchable(retry);
    await retry.click();
    await started;
    await expect(strip).toHaveAttribute('data-load-state', 'loading');
    const detail = row.locator('.pick-ledger-detail-link');
    await touchable(detail);
    await detail.focus();
    const top = await detail.evaluate(el => el.getBoundingClientRect().top);
    release();
    await expect(strip).toHaveAttribute('data-load-state', 'ready');
    await expect(row.locator('[data-pick-expand]')).toHaveAttribute('aria-expanded', 'true');
    await expect(row.locator('.pick-ledger-status')).toHaveText('🟢 유지');
    await expect(detail).toBeFocused();
    await expect.poll(() => detail.evaluate((el, top) => Math.abs(el.getBoundingClientRect().top - top), top)).toBeLessThanOrEqual(1);
    expect(await performance.innerText()).toBe(before);
    expect(qa.calls.filter(call => call.path === '/api/home-bootstrap')).toHaveLength(bootstrapCalls);
    expect(requests).toBe(2);
    const scroll = await page.evaluate(() => scrollY);
    await info.attach('pick-monitor-retry-preserved-state', { body: await page.screenshot(), contentType: 'image/png' });
    await detail.click();
    await expect(page.locator('#detail-name')).toHaveText('삼성전자');
    await page.getByRole('button', { name: '뒤로가기', exact: true }).click();
    await expect(page.locator('#pick-ledger-search')).toHaveValue('삼성전자');
    await expect(page.locator('#pick-ledger-period')).toHaveValue('7');
    await expect(page.locator('#pick-ledger-performance')).toHaveValue('win');
    await expect(page.locator('#pick-ledger-sort')).toHaveValue('return');
    await expect(page.locator(`[data-pick-key="${key}"] [data-pick-expand]`)).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-pick-expand]')).toHaveCount(1);
    await expect.poll(() => page.evaluate(expected => Math.abs(scrollY - expected), scroll)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => ({ watch: localStorage.getItem('chartview-toss-watchlist-v1'), selected: localStorage.getItem('chartview-toss-selected-v1') }))).toEqual(stored);
    await noOverflow(page);
  } finally { release(); }
});

test('PICK primary malformed response has its own retry and never publishes fabricated zero performance', async ({ page, qa }) => {
  let recover = false;
  qa.overrides.set('/api/home-bootstrap', (route, url) => route.fulfill({ json: recover ? payloadFor(url) : { day: { tradeDate: '2026-10-07' } } }));
  await page.goto('/#picks');
  const retry = page.locator('[data-pick-primary-retry]');
  await expect(retry).toBeVisible();
  await expect(page.getByTestId('pick-performance')).toHaveCount(0);
  await expect(page.locator('[data-pick-expand]')).toHaveCount(0);
  await expect(page.getByTestId('pick-status')).toHaveCount(0);
  const monitoringCalls = qa.calls.filter(call => call.path === monitoringPath).length;
  const bootstrapCalls = qa.calls.filter(call => call.path === '/api/home-bootstrap').length;
  recover = true;
  await touchable(retry);
  await retry.click();
  await expect(page.getByTestId('pick-performance')).toContainText('평가 3/4건');
  await expect(page.getByTestId('pick-status')).toBeVisible();
  await expect(page.locator('[data-pick-expand]')).toHaveCount(4);
  expect(qa.calls.filter(call => call.path === monitoringPath)).toHaveLength(monitoringCalls);
  expect(qa.calls.filter(call => call.path === '/api/home-bootstrap').length).toBe(bootstrapCalls + 1);
  await noOverflow(page);
});

test('PICK pending monitoring completion cannot mount stale content after navigating home', async ({ page, qa }) => {
  let release, requested;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { requested = resolve; });
  qa.overrides.set(monitoringPath, async route => { requested(); await gate; return route.fulfill({ json: monitor }); });
  try {
    await page.goto('/#picks');
    await started;
    await expect(page.getByTestId('pick-performance')).toBeVisible({ timeout: 1500 });
    await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '홈', exact: true }).click();
    const response = page.waitForResponse(value => new URL(value.url()).pathname.endsWith('/pick_monitor.json'));
    release();
    await response;
    await expect(page.locator('main[data-surface="home"]')).toBeVisible();
    await expect(page.locator('#market-card [data-stock-detail="^KS11"]')).toBeVisible();
    await expect(page.locator('#pick-ledger-status-strip')).toHaveCount(0);
    await noOverflow(page);
  } finally { release(); }
});

test('PICK explicit dated Home record overrides unrelated session filters but an absent key opens no substitute', async ({ page,qa }) => {
  qa.overrides.set('/api/home-bootstrap',route=>route.fulfill({json:{day:{tradeDate:recommendations[0].recommendedDate,top3:recommendations.slice(0,3)},recommendations}}));
  await page.goto('/#picks');
  await expect(page.getByTestId('pick-status')).toBeVisible();
  await page.locator('.pick-ledger-search-options > summary').click();
  await page.locator('#pick-ledger-search').fill('엔비디아');
  await page.locator('#pick-ledger-performance').selectOption('win');
  await page.locator('#pick-ledger-status').selectOption('SELL_REVIEW');
  await page.locator('.pick-ledger-search-options > summary').click();
  await expect(page.locator('[data-pick-expand]')).toHaveCount(1);
  const previous = rowFor(page, '엔비디아');
  await previous.locator('[data-pick-expand]').click();
  await previous.locator('.pick-ledger-detail-link').click();
  await expect(page.locator('#detail-name')).toHaveText('엔비디아');
  // Forward Home navigation is different from Back into the original ledger;
  // its next dated CTA must not consume the old row's saved return scroll.
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '홈', exact: true }).click();
  const key = `${recommendations[0].recommendedDate}:${recommendations[0].code}`;
  await page.locator(`.home-selection-link[data-feature-target="${key}"]`).click();
  await expect(page).toHaveURL(new RegExp('#picks/' + encodeURIComponent(key) + '$'));
  const selected = page.locator(`[data-pick-key="${key}"]`);
  await expect(selected.locator('[data-pick-expand]')).toHaveAttribute('aria-expanded', 'true');
  await expect(selected.locator('.pick-ledger-stock strong')).toHaveText('삼성전자');
  await expect(page.locator('#pick-ledger-search')).toHaveValue('');
  await expect(page.locator('#pick-ledger-performance')).toHaveValue('all');
  await expect(page.locator('#pick-ledger-status')).toHaveValue('all');
  await expect(page.locator('.pick-ledger-focus-note')).toContainText('검색·필터를 해제');
  await expect(page.locator('.pick-ledger-search-options')).not.toHaveAttribute('open', '');
  // Hash-only entry emits popstate too, but a different dated key is not Back.
  await page.goto('/#picks/1900-01-01%3A005930');
  await expect(page.locator('.pick-ledger-focus-note')).toContainText('요청한 날짜의 선정 기록을 찾지 못했어요');
  await expect(page.locator('[data-pick-expand][aria-expanded="true"]')).toHaveCount(0);
  await noOverflow(page);
});
