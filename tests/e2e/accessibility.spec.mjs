import AxeBuilder from '@axe-core/playwright';
import { test, expect, openHome, fromMenu, noOverflow } from './fixtures.mjs';
import { memoryPrices, symbol } from './data.mjs';

async function audit(page, info) {
  const result = await new AxeBuilder({ page })
    // 4.13's visible-name rule is experimental/disabled and treats adjacent
    // Korean inline fragments differently. The name relationships below are
    // asserted directly rather than enabling that experimental heuristic.
    // Existing Toss rejection requires pinch disabled. This single exception
    // is documented in docs/REVIEW_FIXES_20260921.md and OSS_REVIEW_2026-10-07.md.
    // Never exclude text contrast, labels, controls, or a region of the app.
    .options({
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      rules: { 'meta-viewport': { enabled: false } },
    })
    .analyze();
  await info.attach('axe-audit', {
    body: JSON.stringify(result, null, 2), contentType: 'application/json',
  });
  expect(result.violations, 'axe violations (see attached node targets and fixes)').toEqual([]);
  await noOverflow(page);
}

const views = [
  ['home', '#home', '#home-daily-heatmap [data-stock-detail]'],
  ['search-dialog', '#home', '#market-card [data-stock-detail="^KS11"]'],
  ['watch', '#watch', '#watch-rich-list [data-stock-detail]'],
  ['detail', `#detail/${symbol}`, '#detail-financial-history .financial-history'],
  ['chart', '#chart', '.return-table'],
  ['valuation', '#valuation', '.valuation-compare-row'],
  ['heatmap', '#heatmap', '.market-map-stock'],
  ['picks', '#picks', '[data-testid="pick-performance"]'],
  ['discover', '#discover', '.analysis-stock'],
  ['ideas', '#ideas', '.idea-candidate'],
  ['more', '#more', '.feature-menu'],
  ['memory', '#memory', '.memory-price-tabs'],
  ['exports-overview', '#exports', '#export-momentum-map .export-momentum-list button'],
  ['exports-semiconductor', '#exports', '.export-semi-trend-bars'],
  ...['cosmetics', 'steel', 'petroleum'].map(key => [
    `exports-${key}`, `#exports/${key}`, `[data-export-panel="${key}"] [data-testid="export-month"]`,
  ]),
];
for (const [name, hash, ready] of views) {
  test(`accessibility ${name}: text contrast, visible names, controls`, async ({ page }, info) => {
    await page.goto(`/${hash}`);
    if (name === 'exports-semiconductor') await page.getByRole('tab', { name: '반도체', exact: true }).click();
    await expect(page.locator(ready).first()).toBeVisible();
    if (name === 'detail') await expect(page.locator('#detail-news')).toContainText('삼성전자');
    if (name === 'home') await expect(page.locator('.home-selection-link').first()).toBeVisible();
    if (name === 'search-dialog') {
      await page.locator('#home-search-open').click();
      await expect(page.getByRole('dialog')).toBeVisible();
    }
    await audit(page, info);
  });
}

async function controlledPanel(page, tab) {
  const id = await tab.getAttribute('aria-controls');
  expect(id).toBeTruthy();
  const panel = page.locator(`[id="${id}"]`);
  await expect(panel).toHaveAttribute('role', 'tabpanel');
  await expect(panel).toHaveAttribute('aria-labelledby', await tab.getAttribute('id'));
  await expect(panel).toBeVisible();
  return panel;
}

for (const view of ['exports', 'memory', 'valuation']) {
  test(`accessibility keyboard ${view}: arrow navigation, activation, focus after render`, async ({ page, qa }) => {
    await page.goto(`/#${view}`);
    const group = page.getByRole('tablist');
    const active = group.getByRole('tab', { selected: true });
    await expect(active).toBeEnabled();
    if (view === 'exports') await expect(page.locator('#export-momentum-map .export-momentum-list button').first()).toBeVisible();
    if (view === 'memory') await expect(page.locator('.dram-spot-price')).toContainText('$58.00');
    if (view === 'valuation') await expect(page.locator('.valuation-row-value')).toContainText('12.3배');
    await expect(group.locator('[tabindex="0"]')).toHaveCount(1);
    const initialId = await active.getAttribute('id');
    const panelCalls = () => qa.calls.filter(call => view === 'exports'
      ? /\/(semiconductor-trends|semiconductor-countries|item-detail)$/.test(call.path)
      : call.path === (view === 'memory' ? '/api/memory-prices' : '/api/valuation')).length;
    const callsBefore = panelCalls();
    await active.focus();
    await page.keyboard.press('ArrowRight');
    const second = group.getByRole('tab').nth(1);
    await expect(second).toBeFocused();
    await expect(second).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator(`[id="${initialId}"]`)).toHaveAttribute('aria-selected', 'true');
    expect(panelCalls(), 'Focus navigation must not fetch lazy panels').toBe(callsBefore);
    await page.keyboard.press('Enter');
    await expect(second).toHaveAttribute('aria-selected', 'true');
    await expect(second).toBeFocused();
    await controlledPanel(page, second);
    await page.keyboard.press('End');
    const last = group.getByRole('tab').last();
    await expect(last).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(group.getByRole('tab').first()).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(last).toBeFocused();
    await page.keyboard.press('Home');
    await expect(group.getByRole('tab').first()).toBeFocused();
    await page.keyboard.press('Space');
    await expect(group.getByRole('tab').first()).toHaveAttribute('aria-selected', 'true');
    await expect(group.getByRole('tab').first()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(group.getByRole('tab').first()).not.toBeFocused();
    await expect(group.locator('[tabindex="0"]')).toHaveCount(1);
    await expect(group.getByRole('tab').first()).toHaveAttribute('tabindex', '0');
    if (view !== 'valuation') {
      // Activating an already-selected hash must not leave a focus request
      // that steals focus on the next ordinary menu visit.
      await group.getByRole('tab', { selected: true }).focus();
      await page.keyboard.press('Enter');
      await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '관심', exact: true }).click();
      await fromMenu(page, view);
      await expect(group.getByRole('tab', { selected: true })).toBeEnabled();
      await expect(group.getByRole('tab', { selected: true })).not.toBeFocused();
    }
    await noOverflow(page);
  });
}

test('accessibility visible names stay in sync with live pick status and watch state', async ({ page }) => {
  const response = page.waitForResponse(response => new URL(response.url()).pathname === '/api/home-bootstrap');
  await openHome(page);
  const raw = await (await response).json();
  const pick = page.locator('.home-selection-link').first();
  const status = pick.locator('[data-selection-status]');
  await expect(status).not.toHaveText('점검 상태 확인 중');
  await expect(pick).toHaveAccessibleName(new RegExp(escapeRegex((await status.textContent()).trim())));
  await expect(pick).toHaveAccessibleName(/삼성전자.*\+3\.70%/);
  await expect(pick).toHaveAccessibleDescription(new RegExp(`${raw.day.tradeDate} 선정 근거·점검 보기`));
  for (const button of await page.locator('.home-change-open:visible').all()) {
    const fragments = await button.locator('.home-change-top strong, .home-change-top em, .home-change-copy small').allTextContents();
    await expect(button).toHaveAccessibleName(new RegExp(fragments.map(text => escapeRegex(text.trim())).join('.*')));
  }
  const tile = page.locator('.home-heatmap-cell[data-stock-detail="000660.KS"]').first();
  await expect(tile).toHaveAccessibleName(/SK.*SK하이닉스|SK.*-1\.28%.*SK하이닉스/);
  await page.goto(`/#detail/${symbol}`);
  const watch = page.locator('#detail-watch');
  await expect(watch).toHaveAccessibleName(/삼성전자 관심 등록됨/);
  await watch.click();
  await expect(watch).toHaveAccessibleName(/삼성전자 관심 등록 · 관심종목에 등록/);
  await watch.click();
  await expect(watch).toHaveAccessibleName(/삼성전자 관심 등록됨/);
  await page.goto('/#exports');
  await expect(page.locator('#export-momentum-map .export-momentum-list button').first()).toBeVisible();
  for (const button of await page.locator('#export-momentum-map .export-momentum-list button').all()) {
    const fragments = await button.locator('strong, small, b, em').allTextContents();
    await expect(button).toHaveAccessibleName(new RegExp(fragments.map(text => escapeRegex(text.trim())).join('.*')));
  }
});

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('integration memory public response → active family → price, change and history', async ({ page }) => {
  const response = page.waitForResponse(response => new URL(response.url()).pathname === '/api/memory-prices');
  await page.goto('/#memory');
  const raw = await (await response).json();
  for (const group of raw.groups) {
    const tab = page.locator(`[data-memory-price-group="${group.key}"]`);
    await tab.click();
    const panel = await controlledPanel(page, tab);
    const item = group.items[0];
    const money = value => '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
    await expect(panel.locator('.dram-spot-price')).toHaveText(money(item.average));
    await expect(panel.locator('.dram-spot-card-head em')).toHaveText(`${item.changePct > 0 ? '+' : ''}${item.changePct.toFixed(2)}%`);
    await expect(panel.locator('.dram-spot-range strong')).toHaveText(`${money(item.dailyLow)} ~ ${money(item.dailyHigh)}`);
    const history = raw.history.filter(row => Number.isFinite(row.values[item.key]));
    await expect(panel.getByRole('img', { name: `${item.name} 가격 추이`, exact: true })).toContainText(`${history.length}회 누적`);
  }
  await expect(page.locator('.memory-price-unavailable')).toContainText('HBM');
  await noOverflow(page);
});

test('accessibility memory 503: keyboard reachable retry restores isolated price data', async ({ page, qa }, info) => {
  qa.overrides.set('/api/memory-prices', route => route.fulfill({ status: 503, json: {} }));
  await page.goto('/#memory');
  const retry = page.getByRole('button', { name: '가격 다시 시도', exact: true });
  await expect(retry).toBeVisible();
  await audit(page, info);
  await retry.focus();
  qa.overrides.set('/api/memory-prices', route => route.fulfill({ json: memoryPrices }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tab', { name: 'DRAM 칩', exact: true })).toBeVisible();
  await expect(page.locator('.dram-spot-price')).toHaveText('$58.00');
  expect(qa.calls.filter(call => call.path === '/api/memory-prices')).toHaveLength(2);
});
