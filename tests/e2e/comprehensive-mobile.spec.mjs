import AxeBuilder from '@axe-core/playwright';
import { test, expect, noOverflow, contained, touchable } from './fixtures.mjs';
import { symbol } from './data.mjs';

async function audit(page, info, name) {
  // Browser action scrolling can leave a fragment of a large control behind
  // a sticky header. Audit from a stable origin; exercise its full reachable
  // hit box separately below. This still audits the complete document.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  const result = await new AxeBuilder({ page }).options({
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    // Preserve the existing, documented Apps in Toss pinch restriction.
    rules: { 'meta-viewport': { enabled: false } },
  }).analyze();
  await info.attach(`axe-${name}`, { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  expect(result.violations, `${name}: expanded task controls and evidence remain readable`).toEqual([]);
  await noOverflow(page);
}

// Existing mobile_continuity_qa contract, including a long source name and
// actual chart_data shape. Keep observations separate from provider summary.
const macro = {
  generatedAt: '2026-10-07T06:00:00Z',
  summary: { level: 'red', text: '물가 압력 확인 | 정책 금리 확인 | 신용스프레드 확인 | 변동성 확인', notice: '시장 환경 설명용 요약이며 투자 행동을 권유하지 않습니다.' },
  results: [{ symbol: 'T10Y2Y', name: '장단기 금리차 (10Y-2Y)', value: .45, delta: -.01, unit: '%', asOf: '2026-10-07', source: 'Federal Reserve / FRED mirror · 긴 제공처 이름', sourceUrl: 'https://fred.stlouisfed.org/series/T10Y2Y', desc: '10년-2년 미국 국채 금리차입니다.', chart_data: [{ time: '2026-09-01', value: .5 }, { time: '2026-10-07', value: .45 }] }],
};

for (const view of ['news', 'macro', 'info']) {
  test(`comprehensive accessibility ${view}: previously uncovered controls and provenance`, async ({ page, qa }, info) => {
    if (view === 'macro') qa.overrides.set('/api/macro', route => route.fulfill({ json: macro }));
    await page.goto(`/#${view}`);
    const ready = { news: '#news-list .news-card', macro: '.macro-observations', info: '.local-data-card' }[view];
    await expect(page.locator(ready).first()).toBeVisible();
    if (view === 'macro') {
      await expect(page.locator('.macro-mini-chart')).toHaveAttribute('role', 'img');
      await expect(page.locator('.macro-mini-chart')).toHaveAccessibleName('장단기 금리차 (10Y-2Y) 추세');
    }
    await audit(page, info, view);
    if (view === 'news') {
      await page.locator('[data-news-sort="latest"]').click();
      await expect(page.locator('[data-news-sort="major"]')).toHaveAttribute('aria-pressed', 'false');
      await expect(page.locator('#news-list .news-card')).toBeVisible();
      await audit(page, info, 'news-latest');
    }
  });
}

test('comprehensive accessibility research answer → saved question → Watch evidence', async ({ page }, info) => {
  await page.goto(`/#detail/${symbol}`);
  await expect(page.locator('#detail-financial-history .financial-history')).toBeVisible();
  await expect(page.locator('[data-research-example="0"]')).toBeVisible();
  const input = page.locator('#research-question');
  const usableControl = async control => {
    await touchable(control);
    await expect.poll(() => control.evaluate(el => {
      const rect = el.getBoundingClientRect();
      const header = document.querySelector('.detail-jump-nav').getBoundingClientRect();
      const footer = document.querySelector('nav[aria-label="주요 메뉴"]').getBoundingClientRect();
      return rect.top >= Math.max(0, header.bottom) && rect.bottom <= footer.top;
    }), { message: 'The complete control stays between sticky navigation and the bottom menu' }).toBe(true);
  };
  // Validate every real example, including its focus/input result. Merely
  // moving the audit would not prove the controls are actually usable.
  await expect(page.locator('[data-research-example="2"]')).toContainText('SK하이닉스');
  const examples = [
    '최근 매출과 영업이익은 이전보다 어떻게 달라졌어?',
    '매출과 영업이익의 전년 대비 증가율을 비교해줘',
    'SK하이닉스와 매출 및 영업이익 증가율을 비교해줘',
    '영업현금흐름과 순이익을 비교해줘',
    '실적의 질과 함께 확인할 위험 변화를 비교해줘',
    '부채비율과 재고, 매출채권은 어떻게 달라졌어?',
  ];
  for (const [index, question] of examples.entries()) {
    const example = page.locator(`[data-research-example="${index}"]`);
    await usableControl(example);
    await example.click();
    await expect(input).toHaveValue(question);
    await expect(input).toBeFocused();
    await usableControl(input);
  }
  await usableControl(page.locator('[data-research-example="0"]'));
  await page.locator('[data-research-example="0"]').click();
  await usableControl(page.locator('.research-analyze'));
  await page.locator('.research-analyze').click();
  await expect(page.locator('.research-table').first()).toBeVisible();
  await expect(page.locator('[data-track-condition]').first()).toBeVisible();
  // Prove that a top-of-document audit still finds poor contrast in the
  // below-fold result. Restore the original attribute before the real gate.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  const condition = page.locator('[data-track-condition="0"]');
  const before = await condition.getAttribute('style');
  const bounds = await condition.boundingBox();
  expect(bounds.y).toBeGreaterThan(page.viewportSize().height);
  try {
    await condition.evaluate(el => el.style.setProperty('color', '#aaa', 'important'));
    const oracle = await new AxeBuilder({ page }).options({ runOnly: { type: 'rule', values: ['color-contrast'] } }).analyze();
    const nodes = oracle.violations.flatMap(violation => violation.nodes);
    await info.attach('axe-offscreen-contrast-oracle', { body: JSON.stringify({ bounds, viewport: page.viewportSize(), violations: oracle.violations }, null, 2), contentType: 'application/json' });
    expect(nodes.some(node => node.html.includes('data-track-condition="0"')), 'Below-fold contrast remains checked when the audit starts at scrollY 0').toBe(true);
  } finally {
    await condition.evaluate((el, value) => value === null ? el.removeAttribute('style') : el.setAttribute('style', value), before);
  }
  await audit(page, info, 'research-answer');
  await usableControl(page.locator('[data-research-save]'));
  await page.locator('[data-research-save]').click();
  await expect(page.locator('#research-save-state')).toContainText('저장');
  await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: '관심', exact: true }).click();
  const saved = page.locator('.saved-research-row').filter({ has: page.locator(`[data-saved-research="${symbol}"]`) });
  await expect(saved).toContainText('최근 매출과 영업이익');
  await expect(saved.locator('small').first()).toBeVisible();
  await audit(page, info, 'saved-question');
  await saved.locator(`[data-saved-research="${symbol}"]`).first().click();
  await expect(page.locator('#research-question')).toHaveValue('최근 매출과 영업이익은 이전보다 어떻게 달라졌어?');
});

test('comprehensive mobile independent source/watch/disclosure touch targets preserve stock rows', async ({ page }, info) => {
  const mobile = info.project.name !== 'desktop-chromium';
  await page.goto('/#watch');
  const remove = page.locator(`[data-unwatch="${symbol}"]`);
  await expect(remove).toBeVisible();
  const row = remove.locator('..');
  const original = await row.boundingBox();
  if (mobile) {
    await touchable(remove);
    const layout = await row.evaluate(el => {
      const price = el.querySelector('.watch-card-price').getBoundingClientRect();
      const target = el.querySelector('.watch-remove').getBoundingClientRect();
      return { priceRight: price.right, targetLeft: target.left };
    });
    expect(layout.targetLeft, 'The expanded hit box must not cover the price column').toBeGreaterThanOrEqual(layout.priceRight - 1);
  }
  await contained(row);
  await remove.click();
  await expect(page.locator(`[data-unwatch="${symbol}"]`)).toHaveCount(0);
  const remaining = page.locator('.watch-detail-card').first();
  expect((await remaining.boundingBox()).height).toBeCloseTo(original.height, 0);
  await page.goto(`/#detail/${symbol}`);
  await expect(page.locator('#detail-financial-history .financial-history')).toBeVisible();
  for (const selector of ['.financial-source[data-external-url]', '.financial-source[data-review-source]', '.quote-provenance > summary', '#detail-review > summary']) {
    const control = page.locator(selector).first();
    await expect(control).toBeVisible();
    if (mobile) await touchable(control);
    else { await contained(control); await control.click({ trial: true }); }
  }
  await page.locator('#detail-review > summary').click();
  await expect(page.locator('#detail-review-body')).toContainText('장마감 기술 지표');
  await noOverflow(page);
  await page.goto('/#memory');
  await expect(page.locator('.dram-spot-price')).toBeVisible();
  for (const selector of ['.memory-price-source', '.memory-price-unavailable > summary']) {
    const control = page.locator(selector);
    if (mobile) await touchable(control);
    else { await contained(control); await control.click({ trial: true }); }
  }
  await page.locator('.memory-price-unavailable > summary').click();
  await expect(page.locator('.memory-price-unavailable')).toContainText('HBM');
  await noOverflow(page);
});

// Same snapshot/evidence fields as guru_investing_qa.mjs, reduced to one
// matched candidate per method. Fixtures are not observations of live picks.
const version = '0123456789abcdef0123';
const strategies = ['buffett', 'lynch', 'oneil', 'minervini', 'greenblatt'];
const guruRow = { symbol, name: '삼성전자', market: 'KOSPI', tradeDate: '2026-10-02', annualReportYear: 2025, metrics: { roeAvg3: 18, debtRatio: 35, epsCagr3: 20, historicalPEG: .8, annualPE: 16, basicEps: 100, quarterEpsGrowth: 30, breakoutVolumeRatio: 1.8, relativeStrengthPercentile: 90, distance52HighPct: -5, annualROA: 30, valueRank: 1 }, checks: [{ id: 'roe', label: '꾸준한 자본수익성', value: 18, threshold: '평균 ≥15%', passed: true }] };
const guruSnapshot = { schemaVersion: 1, criteriaVersion: 'cv-gurus-v2', snapshotVersion: version, tradeDate: '2026-10-02', generatedAt: '2026-10-05T06:00:00+09:00', financialAsOf: '2026-10-05T05:00:00+09:00', strategies: Object.fromEntries(strategies.map(key => [key, { universeCount: 1, unsupportedCount: 0, pendingCount: 0, insufficientCount: 0, evaluatedCount: 1, failedCount: 0, matchedCount: 1, results: [guruRow] }])) };
const guruProof = { symbol, snapshotVersion: version, tradeDate: '2026-10-02', basis: 'CFS', annual: [2022, 2023, 2024, 2025].map(year => ({ year, netIncome: 1e9, assets: 3e9, operatingCashFlow: 2e9, equity: 5e9, basicEps: 100 })), sources: { 2025: { equity: { receiptNo: '20260312000123', reportYear: 2025, filingDate: '2026-03-12', sourceUrl: 'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260312000123' } } }, quarter: { year: 2026, quarter: 2, basicEps: 130, priorBasicEps: 100, revenue: 2e9, priorRevenue: 1e9, receiptNo: '20260814000123', filingDate: '2026-08-14', sourceUrl: 'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260814000123' }, technical: { tradeDate: '2026-10-02', barCount: 273, price: 1600, sma50: 1500, sma150: 1400, sma200: 1300, sma200Prior20: 1200, high52: 1650, low52: 900, return252: 60, relativeStrengthPercentile: 90, rsObservedCount: 2400, rsUniverseCount: 2600, breakoutDate: '2026-10-01', breakoutLevel: 1580, breakoutExtensionPct: 1.3 }, strategies: Object.fromEntries(strategies.map(key => [key, { status: 'matched', checks: guruRow.checks, metrics: guruRow.metrics }])) };

for (const strategy of strategies) {
  test(`comprehensive accessibility guru ${strategy}: expanded annual/technical evidence`, async ({ page, qa }, info) => {
    qa.overrides.set('/static/data/guru_screening.json', route => route.fulfill({ json: guruSnapshot }));
    qa.overrides.set(`/api/guru-investing/${symbol}`, route => route.fulfill({ json: guruProof }));
    await page.goto(`/#gurus/${strategy}`);
    await expect(page.locator('.guru-candidate')).toHaveCount(1);
    await page.locator('.guru-expand').click();
    await expect(page.locator('.guru-table-wrap').first()).toBeVisible();
    if (strategy === 'minervini') {
      const source = page.getByRole('button', { name: '일봉 원자료 확인 ↗', exact: true });
      await expect(source).toBeVisible();
      await expect(source).toHaveAttribute('data-external-url', `https://finance.yahoo.com/quote/${symbol}/history/`);
      await expect(page.locator('.guru-evidence-basis')).toContainText(`${guruProof.technical.tradeDate} 종가 · ${guruProof.technical.barCount}거래일 · Yahoo 종가`);
      await expect(page.locator('.guru-source-links button')).toHaveCount(0);
    } else {
      await expect(page.locator('.guru-source-links button').first()).toBeVisible();
    }
    await audit(page, info, `guru-${strategy}-evidence`);
    await page.locator('.guru-next > summary').click();
    await expect(page.locator('.guru-next > p')).toBeVisible();
    await audit(page, info, `guru-${strategy}-questions`);
  });
}
