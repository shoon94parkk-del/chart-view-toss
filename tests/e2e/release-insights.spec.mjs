import AxeBuilder from '@axe-core/playwright';
import { test, expect, noOverflow, touchable } from './fixtures.mjs';
import { exportSnapshot, trends } from './data.mjs';
import { releaseNow, legacyMacro, inflationMacro, pceInflationMacro, comparisonInflationMacro, earningsCalls, consensus, dramAmounts, dramMoM, withCorrectedDram } from '../fixtures/release-insights.mjs';

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date(releaseNow));
});

test('inflation response renders four series, honest chart gaps, bases and confirmed KST schedules', async ({ page, qa }, info) => {
  // This one journey exercises four series, axes, table, axe and three widths.
  // Individual readiness assertions keep the standard 8s timeout.
  test.setTimeout(60_000);
  qa.overrides.set('/api/macro', route => route.fulfill({ json: inflationMacro }));
  const response = page.waitForResponse(response => new URL(response.url()).pathname === '/api/macro');
  await page.goto('/#macro');
  const raw = await (await response).json();
  expect(raw.inflation.series).toHaveLength(4);
  await expect(page.locator('.macro-tile')).toHaveCount(16);
  await expect(page.locator('[data-inflation-series]')).toHaveCount(6);
  await expect(page.locator('[data-inflation-series="pce"]')).toBeDisabled();
  await expect(page.locator('[data-inflation-series="core_pce"]')).toBeDisabled();
  const reading = page.locator('.inflation-reading');
  for (const row of raw.inflation.series) {
    const button = page.locator(`[data-inflation-series="${row.id}"]`);
    await touchable(button);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(reading.locator('h3')).toHaveText(row.name);
    await expect(reading.locator('[data-inflation-value]')).toHaveText(`${row.points.at(-1).yoy}%`);
    await expect(reading.locator('.inflation-chart-basis')).toContainText('비계절조정 (NSA)');
    // Null July splits the actual DOM plot into two independent paths.
    await expect(reading.locator('.inflation-line')).toHaveCount(2);
    await expect(reading.locator('.inflation-chart-note')).toContainText('실제 관측 4/5개월');
    await expect(reading.locator('.inflation-chart-note')).toContainText('2026.07');
    await page.locator('[data-inflation-rate="mom"]').click();
    await expect(reading.locator('[data-inflation-value]')).toHaveText(`${row.points.at(-1).mom}%`);
    await expect(reading.locator('.inflation-chart-basis')).toContainText('계절조정 (SA)');
    await expect(reading.locator('.inflation-source [data-external-url]')).toHaveAttribute('data-external-url', row.source.saUrl);
    await page.locator('[data-inflation-rate="yoy"]').click();
  }
  await page.locator('[data-inflation-years="5"]').click();
  await expect(page.locator('[data-inflation-years="5"]')).toHaveAttribute('aria-pressed', 'true');
  await reading.locator('.inflation-provenance > summary').click();
  await expect(reading.locator('.inflation-provenance')).toContainText('수정 여부 미확인');
  await expect(reading.locator('.inflation-provenance')).toContainText('2026.10.14 21:30 KST');
  await reading.locator('.inflation-table-details > summary').click();
  const july = reading.getByRole('row').filter({ has: page.getByRole('rowheader', { name: '2026.07', exact: true }) });
  await expect(july.getByRole('cell')).toHaveText(['미제공', '미제공']);
  const agenda = page.getByRole('region', { name: '공식 발표 예정' });
  await expect(agenda).toContainText('2026.11.10 22:30 KST');
  await expect(agenda).toContainText('08:30 ET (EST)');
  await expect(agenda).toContainText('대상 관측월 2026.10');
  await expect(agenda.locator('[aria-label="CPI · 근원 CPI 공식 일정 원문"]')).toHaveAttribute('data-external-url', inflationMacro.releaseCalendar.events[0].sourceUrl);
  expect(qa.calls.filter(row => row.path === '/api/macro')).toHaveLength(1);
  expect(qa.calls.filter(row => row.path === '/api/earnings-events')).toHaveLength(0);
  const audit = await new AxeBuilder({ page }).include('#macro-inflation')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  await info.attach('inflation-accessibility', { body: JSON.stringify(audit), contentType: 'application/json' });
  expect(audit.violations).toEqual([]);
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await noOverflow(page);
    for (const control of [
      page.locator('[data-inflation-series="cpi"]'),
      page.locator('[data-inflation-rate="mom"]'),
      page.locator('[data-inflation-years="5"]'),
      reading.locator('.inflation-source [data-external-url]'),
      reading.locator('.inflation-provenance > summary'),
      agenda.locator('[aria-label="CPI · 근원 CPI 공식 일정 원문"]'),
    ]) await touchable(control);
    await reading.scrollIntoViewIfNeeded();
    await info.attach(`inflation-${width}px`, { body: await page.screenshot(), contentType: 'image/png' });
  }
});

test('PCE and core PCE show both SA rates, the real observation/publication months and a missing forecast', async ({ page, qa }, info) => {
  qa.overrides.set('/api/macro', route => route.fulfill({ json: pceInflationMacro }));
  await page.goto('/#macro');
  await expect(page.locator('[data-inflation-series]')).toHaveCount(6);
  await expect(page.locator('.macro-tile')).toHaveCount(16);
  const reading = page.locator('.inflation-reading');
  for (const id of ['pce', 'core_pce']) {
    const row = pceInflationMacro.inflation.series.find(row => row.id === id);
    await page.locator(`[data-inflation-series="${id}"]`).click();
    await expect(reading).toContainText('2026.08');
    await expect(reading).toContainText('09.30');
    for (const rate of ['yoy', 'mom']) {
      await page.locator(`[data-inflation-rate="${rate}"]`).click();
      await expect(reading.locator('.inflation-chart-basis')).toContainText('단위 % · 계절조정 (SA)');
      await expect(reading.locator('.inflation-source [data-external-url]')).toHaveAttribute('data-external-url', row.source.saUrl);
      await expect(reading.locator('[data-inflation-comparison]')).toHaveAttribute('data-inflation-comparison', 'missing');
      await expect(reading.locator('[data-inflation-comparison]')).toContainText('지수 계산값');
      await expect(reading.locator('[data-inflation-comparison]')).toContainText('미제공');
    }
  }
  await expect(page.getByRole('region', { name: '공식 발표 예정' })).toContainText('2026.10.29 21:30 KST');
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await noOverflow(page);
    await touchable(page.locator('[data-inflation-series="pce"]'));
    await touchable(page.locator('[data-inflation-series="core_pce"]'));
    await reading.scrollIntoViewIfNeeded();
    await info.attach(`pce-${width}px`, { body: await page.screenshot(), contentType: 'image/png' });
  }
  const audit = await new AxeBuilder({ page }).include('#macro-inflation')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(audit.violations).toEqual([]);
  expect(qa.calls.filter(row => row.path === '/api/macro')).toHaveLength(1);
});

test('forecast traffic lights use text, match the rate and reject an after-release forecast receipt', async ({ page, qa }) => {
  const data = structuredClone(comparisonInflationMacro);
  const invalid = data.inflation.series.find(row => row.id === 'core_ppi');
  invalid.comparisons = [{ ...data.inflation.series[0].comparisons[0], forecastCapturedAt: '2026-10-14T12:31:00Z' }];
  qa.overrides.set('/api/macro', route => route.fulfill({ json: data }));
  await page.goto('/#macro');
  const comparison = page.locator('[data-inflation-comparison]');
  for (const [id, status, label] of [['cpi', 'lower', '예상보다 낮음'], ['core_cpi', 'equal', '예상과 같음'], ['ppi', 'higher', '예상보다 높음'], ['core_ppi', 'missing', '비교 미제공']]) {
    await page.locator(`[data-inflation-series="${id}"]`).click();
    await expect(comparison).toHaveAttribute('data-inflation-comparison', status);
    await expect(comparison).toContainText(label);
  }
  await page.locator('[data-inflation-series="cpi"]').click();
  await expect(comparison).toContainText('최초 발표값');
  await page.locator('[data-inflation-rate="mom"]').click();
  await expect(comparison).toHaveAttribute('data-inflation-comparison', 'missing');
  await noOverflow(page);
});

test('legacy macro data stays usable while missing optional inflation is retried', async ({ page, qa }) => {
  let available = false;
  qa.overrides.set('/api/macro', route => route.fulfill({ json: available ? inflationMacro : legacyMacro }));
  await page.goto('/#macro');
  await expect(page.locator('.macro-tile')).toHaveCount(16);
  await expect(page.locator('#macro-inflation')).toContainText('물가 자료를 확인하지 못했어요');
  await expect(page.locator('#macro-inflation')).toContainText('기존 경제 지표는 아래에서 계속 확인');
  available = true;
  await page.locator('[data-inflation-retry]').filter({ hasText: '물가·일정 다시 확인' }).click();
  await expect(page.locator('[data-inflation-value]')).toHaveText('3.74%');
  await expect(page.locator('.macro-tile')).toHaveCount(16);
  expect(qa.calls.filter(row => row.path === '/api/macro')).toHaveLength(2);
  await noOverflow(page);
});

test.describe('official calls alongside estimates', () => {
  test.use({ storedLists: { watchlist: [], selected: ['005930.KS', 'AAPL', 'NVDA'] } });
  test.beforeEach(async ({ qa }) => {
    qa.overrides.set('/api/consensus', (route, url) => route.fulfill({ json: consensus(url.searchParams.get('ticker')) }));
  });

  test('verified calls use KST and unknown result comparisons stay explicit', async ({ page, qa }, info) => {
    qa.overrides.set('/api/earnings-events', route => route.fulfill({ json: earningsCalls }));
    await page.goto('/#consensus');
    await expect(page.locator('[data-earnings-call]')).toHaveCount(2);
    await expect(page.locator('[data-earnings-call="005930.KS"]')).toContainText('10. 29');
    await expect(page.locator('[data-earnings-call="005930.KS"]')).toContainText('10:00 KST');
    await expect(page.locator('[data-earnings-call="AAPL"]')).toContainText('11. 03');
    await expect(page.locator('[data-earnings-call="AAPL"]')).toContainText('07:00 KST');
    await expect(page.locator('.earnings-call-note')).toContainText('실적 발표 시각과 다를 수');
    await expect(page.locator('.earnings-call-empty')).toContainText('NVDA');
    await expect(page.locator('.earnings-call-empty')).toContainText('확인된 공식 일정 없음');
    await page.locator('.earnings-comparison-limits > summary').click();
    await expect(page.locator('.earnings-comparison-limits')).toContainText('현재 이 비교 통계는 제공하지 않아요');
    await expect(page.locator('#estimate-0 .analysis-metrics')).toContainText('7.25');
    await expect(page.locator('#estimate-1 .analysis-metrics')).toContainText('7.25');
    await expect(page.locator('#estimate-2 .analysis-metrics')).toContainText('7.25');
    await expect(page.locator('#estimate-0')).toContainText('회계기간 종료 2026-12-31');
    await page.locator('[data-earnings-call="AAPL"] details > summary').click();
    await expect(page.locator('[data-earnings-call="AAPL"] details')).toContainText('실적 발표 시각 미제공');
    const calls = qa.calls.filter(row => row.path === '/api/earnings-events');
    expect(calls).toHaveLength(1);
    expect(calls[0].query).toBe('');
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await noOverflow(page);
      await touchable(page.locator('[data-earnings-call="AAPL"] [data-external-url]'));
      await touchable(page.locator('[data-earnings-call="AAPL"] details > summary'));
      await touchable(page.locator('.earnings-comparison-limits > summary'));
      await page.locator('.earnings-events').scrollIntoViewIfNeeded();
      await info.attach(`calls-${width}px`, { body: await page.screenshot(), contentType: 'image/png' });
    }
  });

  test('a failed optional call lookup retries alone and never replaces valid estimates', async ({ page, qa }) => {
    let restored = false;
    qa.overrides.set('/api/earnings-events', route => route.fulfill({ status: restored ? 200 : 503, json: restored ? earningsCalls : { detail: 'QA temporary call cache failure' } }));
    await page.goto('/#consensus');
    await expect(page.locator('[data-retry-earnings]')).toBeVisible();
    await expect(page.locator('#estimate-0 .analysis-metrics')).toContainText('7.25');
    const estimatesBefore = qa.calls.filter(row => row.path === '/api/consensus').length;
    restored = true;
    await touchable(page.locator('[data-retry-earnings]'));
    await page.locator('[data-retry-earnings]').click();
    await expect(page.locator('[data-earnings-call]')).toHaveCount(2);
    await expect(page.locator('[data-retry-earnings]')).toHaveCount(0);
    await expect(page.locator('#estimate-0 .analysis-metrics')).toContainText('7.25');
    expect(qa.calls.filter(row => row.path === '/api/earnings-events')).toHaveLength(2);
    expect(qa.calls.filter(row => row.path === '/api/consensus')).toHaveLength(estimatesBefore);
    await noOverflow(page);
  });

  test('a delayed call lookup cannot paint into Home after leaving consensus', async ({ page, qa }) => {
    let release;
    const held = new Promise(resolve => { release = resolve; });
    qa.overrides.set('/api/earnings-events', async route => {
      await held;
      return route.fulfill({ json: earningsCalls });
    });
    try {
      await page.goto('/#consensus');
      await expect.poll(() => qa.calls.filter(row => row.path === '/api/earnings-events').length).toBe(1);
      await expect(page.locator('#estimate-0 .analysis-metrics')).toContainText('7.25');
      await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '홈', exact: true }).click();
      await expect(page.locator('#home-search-open')).toBeVisible();
      const response = page.waitForResponse(response => new URL(response.url()).pathname === '/api/earnings-events');
      release();
      await (await response).body();
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await expect(page.locator('[data-surface="home"]')).toBeVisible();
      await expect(page.locator('[data-earnings-call]')).toHaveCount(0);
      await noOverflow(page);
    } finally { release(); }
  });
});

test('the report continuation returns to the existing research form without changing its draft or peer', async ({ page, qa }) => {
  await page.goto('/#detail/005930.KS');
  await page.locator('#research-question').fill('공시 확인 뒤 비교할 연구 질문');
  await page.locator('.research-peer-picker > summary').click();
  await page.locator('[data-peer-symbol="000660.KS"]').click();
  await expect(page.locator('#research-peer-selection')).toContainText('000660.KS');
  const before = qa.calls.filter(row => row.path === '/api/financial-history').length;
  const saveStateBefore = await page.locator('#research-save-state').textContent();
  const continuation = page.locator('[data-return-research]');
  await touchable(continuation);
  await continuation.click();
  await expect(page).toHaveURL(/#detail\/005930.KS/);
  await expect(page.locator('#detail-research-card')).toBeFocused();
  await expect(page.locator('#research-question')).toHaveValue('공시 확인 뒤 비교할 연구 질문');
  await expect(page.locator('#research-peer-selection')).toContainText('000660.KS');
  await expect(page.locator('#research-save-state')).toHaveText(saveStateBefore);
  expect(qa.calls.filter(row => row.path === '/api/financial-history')).toHaveLength(before);
  await noOverflow(page);
});

test('corrected DRAM MoM agrees with the August-to-September graph amounts', async ({ page, qa }) => {
  const corrected = withCorrectedDram(exportSnapshot, trends);
  qa.overrides.set('/api/export-momentum', route => route.fulfill({ json: corrected.snapshot }));
  qa.overrides.set('/api/export-momentum/semiconductor-trends', route => route.fulfill({ json: corrected.trends }));
  const response = page.waitForResponse(response => new URL(response.url()).pathname === '/api/export-momentum');
  await page.goto('/#exports');
  const raw = await (await response).json();
  const dram = raw.semiconductorBreakdown.find(row => row.key === 'dram');
  expect(dram.exportMoM).toBeCloseTo(dramMoM, 8);
  expect(dram.exportMoM.toFixed(1)).toBe('6.6');
  await page.getByRole('tab', { name: '반도체', exact: true }).click();
  const report = page.locator('[data-export-panel="semiconductor"] .export-semi-report-card').filter({ has: page.locator('strong', { hasText: /^DRAM$/ }) });
  await expect(report).toContainText('MoM +6.6%');
  await expect(report).not.toContainText('-46.7%');
  const chart = page.getByRole('img', { name: 'DRAM 최근 12개월 수출액 추이', exact: true });
  const bars = chart.getByTestId('semiconductor-month');
  await expect(bars).toHaveCount(2);
  const amounts = await bars.evaluateAll(nodes => nodes.map(node => Number(node.getAttribute('aria-label').split(' ')[1].replace('억달러', '').replaceAll(',', '')) / 10));
  expect(amounts[0]).toBeCloseTo(dramAmounts.august, 2);
  expect(amounts[1]).toBeCloseTo(dramAmounts.september, 2);
  const heights = await bars.locator('i').evaluateAll(nodes => nodes.map(node => parseFloat(node.style.height)));
  expect(heights[1]).toBeGreaterThan(heights[0]);
  await noOverflow(page);
});
