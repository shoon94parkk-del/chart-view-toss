import { test, expect, noOverflow, touchable } from './fixtures.mjs';
import { trends, industryDetails, exportSnapshot } from './data.mjs';
import { normalizeSemiconductorTrends, normalizeExportItemDetail, normalizeExportSnapshot } from '../../src/exportMomentumModel.js';

const amount = value => `${(value * 10).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억달러`;
async function semiconductor(page) {
  await page.goto('/#exports');
  await page.getByRole('tab', { name: '반도체', exact: true }).click();
  await expect(page.locator('[data-export-semi-segment="dram"]')).toBeVisible();
}
async function months(chart, history) {
  await expect(chart.getByTestId('semiconductor-month')).toHaveCount(history.length);
  for (const [i, row] of history.entries()) {
    const label = await chart.getByTestId('semiconductor-month').nth(i).getAttribute('aria-label');
    expect(label).toMatch(new RegExp(`^${row.period} [\\d,.]+억달러$`));
    const displayed = Number(label.slice(row.period.length + 1).replace('억달러', '').replaceAll(',', ''));
    expect(displayed).toBeCloseTo(row.exportsUsdBillion * 10, 1);
  }
}

test('06 반도체: DRAM ↔ Flash 실제 12개월 그래프·모바일 근접 제어', async ({ page, qa }, info) => {
  await semiconductor(page);
  // Explicitly change to Flash before selecting DRAM; DRAM is already the app default.
  await page.locator('[data-export-semi-segment="flash"]').click();
  const flashChart = page.getByRole('img', { name: 'Flash memory 최근 12개월 수출액 추이', exact: true });
  await months(flashChart, trends.segments.find(row => row.key === 'flash').history);
  const flashGeometry = await flashChart.locator('i').evaluateAll(nodes => nodes.map(node => node.style.height));
  await page.locator('[data-export-semi-segment="dram"]').click();
  const dramChart = page.getByRole('img', { name: 'DRAM 최근 12개월 수출액 추이', exact: true });
  await months(dramChart, trends.segments.find(row => row.key === 'dram').history);
  expect(await dramChart.locator('i').evaluateAll(nodes => nodes.map(node => node.style.height))).not.toEqual(flashGeometry);
  if (info.project.name !== 'desktop-chromium') {
    const picker = page.getByTestId('semiconductor-picker');
    // Read all geometry in one browser frame: ranked-row navigation scrolls
    // asynchronously, so separate boundingBox calls can compare different scroll positions.
    await expect.poll(() => page.evaluate(() => {
      const p = document.querySelector('[data-testid="semiconductor-picker"]').getBoundingClientRect();
      const g = document.querySelector('[aria-label="DRAM 최근 12개월 수출액 추이"]').getBoundingClientRect();
      const nav = document.querySelector('nav[aria-label="주요 메뉴"]').getBoundingClientRect();
      return p.top >= 0 && p.bottom <= nav.top && g.top >= p.top && g.bottom <= nav.top && g.top - p.bottom < 50;
    })).toBe(true);
    const flash = picker.getByRole('button', { name: 'Flash memory', exact: true });
    await touchable(flash);
    await flash.click();
    await expect(flashChart).toBeVisible();
  }
  expect(qa.calls.filter(call => call.path.endsWith('/semiconductor-trends'))).toHaveLength(1);
  await noOverflow(page);
  await info.attach('semiconductor', { body: await page.screenshot(), contentType: 'image/png' });
});

test('07 모든 산업 탭: 서로 다른 내용·금액·12개월 그래프', async ({ page, qa }, info) => {
  await semiconductor(page);
  if (info.project.name !== 'desktop-chromium') {
    for (const tab of await page.getByRole('tab').all()) await touchable(tab);
  }
  let previous = null;
  for (const [name, key] of [['화장품', 'cosmetics'], ['철강', 'steel'], ['석유제품', 'petroleum'], ['자동차', 'passenger-car'], ['선박', 'ships']]) {
    const tab = page.getByRole('tab', { name, exact: true });
    await touchable(tab, { min: info.project.name === 'desktop-chromium' ? 0 : 44 });
    const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/item-detail') && new URL(response.url()).searchParams.get('key') === key);
    await tab.click();
    const raw = await (await responsePromise).json();
    const normalized = normalizeExportItemDetail(raw);
    const shell = page.locator(`[data-export-industry-shell="${key}"]`);
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(shell.getByRole('heading', { name: `${name} 수출 흐름`, exact: true })).toBeVisible();
    const chart = shell.getByRole('img', { name: '12개월 수출액 최근 12개월 추이', exact: true });
    await expect(chart.getByTestId('export-month')).toHaveCount(12);
    expect(normalized.history.at(-1).exportsUsdBillion).toBe(raw.history.at(-1).exportsUsdBillion);
    await expect(shell.getByTestId('industry-metrics')).toContainText(amount(normalized.history.at(-1).exportsUsdBillion));
    const labels = await chart.getByTestId('export-month').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
    expect(labels).not.toEqual(previous);
    previous = labels;
    await noOverflow(page);
  }
  // Re-entry uses the existing cache and preserves the selected route focus.
  await page.getByRole('tab', { name: '화장품', exact: true }).click();
  await expect(page.locator('[data-export-industry-shell="cosmetics"]')).toBeVisible();
  expect(qa.calls.filter(call => call.path.endsWith('/item-detail') && new URLSearchParams(call.query).get('key') === 'cosmetics')).toHaveLength(1);
});

test('integration 수출 응답 → 가공 → 단위·그래프 높이·기여도', async ({ page }) => {
  const monthlyResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/export-momentum');
  await page.goto('/#exports');
  const monthly = await (await monthlyResponse).json();
  const summary = normalizeExportSnapshot(monthly).summary;
  expect(summary.exportsUsdBillion).toBe(monthly.summary.exportsUsdBillion);
  await expect(page.locator('#export-momentum-root')).toContainText(amount(summary.exportsUsdBillion));
  const trendResponse = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/semiconductor-trends'));
  await page.getByRole('tab', { name: '반도체', exact: true }).click();
  const raw = await (await trendResponse).json();
  const model = normalizeSemiconductorTrends(raw);
  const dram = model.segments.find(row => row.key === 'dram');
  expect(dram.exportsUsdBillion).toBe(raw.segments.find(row => row.key === 'dram').exportsUsdBillion);
  expect(dram.deltaUsdBillion).toBeCloseTo(dram.exportsUsdBillion - dram.priorExportsUsdBillion);
  expect(dram.memoryContributionPct).toBeCloseTo(dram.deltaUsdBillion / model.memoryTotalDeltaUsdBillion * 100);
  await expect(page.locator('#export-semi-chart-focus')).toContainText(`${dram.memoryContributionPct.toFixed(1)}%`);
  const chart = page.getByRole('img', { name: 'DRAM 최근 12개월 수출액 추이', exact: true });
  await months(chart, dram.history);
  const max = Math.max(...dram.history.map(row => row.exportsUsdBillion), 1);
  for (const [i, row] of dram.history.entries()) {
    const height = await chart.getByTestId('semiconductor-month').nth(i).locator('i').evaluate(node => parseFloat(node.style.height));
    expect(height).toBeCloseTo(Math.max(4, row.exportsUsdBillion / max * 100), 1);
  }
});

test('10 수출 일부 누락·503: 월간 그래프 유지, 해당 품목만 재시도', async ({ page, qa }) => {
  let recover = false;
  qa.overrides.set('/api/export-momentum/item-detail', (route, url) => recover ? route.fulfill({ json: industryDetails[url.searchParams.get('key')] }) : route.fulfill({ status: 503, json: {} }));
  qa.overrides.set('/api/export-momentum/semiconductor-trends', (route) => recover ? route.fulfill({ json: trends }) : route.fulfill({ json: { segments: [] } }));
  await page.goto('/#exports');
  await expect(page.locator('#export-momentum-root')).toContainText(amount(exportSnapshot.summary.exportsUsdBillion));
  await page.getByRole('tab', { name: '반도체', exact: true }).click();
  await expect(page.locator('[data-export-semi-retry]')).toBeVisible();
  recover = true;
  await page.locator('[data-export-semi-retry]').click();
  await expect(page.getByRole('img', { name: 'DRAM 최근 12개월 수출액 추이', exact: true })).toBeVisible();
  recover = false;
  await page.getByRole('tab', { name: '화장품', exact: true }).click();
  await expect(page.locator('[data-export-industry-retry="cosmetics"]')).toBeVisible();
  recover = true;
  await page.locator('[data-export-industry-retry="cosmetics"]').click();
  await expect(page.locator('[data-export-industry-shell="cosmetics"]').getByTestId('export-month')).toHaveCount(36);
  await page.getByRole('tab', { name: '전체 요약', exact: true }).click();
  await expect(page.locator('#export-momentum-root')).toContainText(amount(exportSnapshot.summary.exportsUsdBillion));
  expect(qa.calls.filter(call => call.path === '/api/export-momentum')).toHaveLength(1);
  await noOverflow(page);
});
