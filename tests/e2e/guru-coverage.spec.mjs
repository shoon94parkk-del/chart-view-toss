import { test, expect, noOverflow } from './fixtures.mjs';

const strategies = ['buffett', 'lynch', 'oneil', 'minervini', 'greenblatt'];
const ticker = '005930.KS';
function snapshot({ version = 'cdn-current', tradeDate = '2026-10-07', generatedAt = '2026-10-07T23:15:19+09:00', matched = 81 } = {}) {
  const results = Array.from({ length: matched }, (_, i) => ({
    symbol: i === 0 ? ticker : `${String(i).padStart(6, '0')}.KS`, name: `검증기업${String(i).padStart(3, '0')}`, market: 'KOSPI',
    metrics: { relativeStrengthPercentile: 91.2, distance52HighPct: -5 }, checks: [],
  }));
  const empty = { universeCount: 100, unsupportedCount: 2, pendingCount: 0, insufficientCount: 98, evaluatedCount: 0, failedCount: 0, matchedCount: 0, results: [], missingReasons: { '자료 비교 기준 확인 부족': 98, '일반기업 조건 비교 지원 제외': 2 } };
  return {
    schemaVersion: 1, criteriaVersion: 'cv-gurus-v2', snapshotVersion: version, tradeDate, generatedAt, financialAsOf: '2026-10-05T18:01:38+09:00',
    strategies: Object.fromEntries(strategies.map(name => [name, name === 'minervini' && matched ? {
      ...empty, insufficientCount: 10, evaluatedCount: 88, failedCount: 88 - matched, matchedCount: matched, results,
      missingReasons: { '동일 기준일 253거래일 OHLCV 확인 부족': 10, '일반기업 조건 비교 지원 제외': 2 },
    } : structuredClone(empty)])),
  };
}
function evidence(data, symbol) {
  return {
    snapshotVersion: data.snapshotVersion, symbol, tradeDate: data.tradeDate,
    strategies: { minervini: { status: 'matched', checks: [], metrics: {} } },
    technical: { tradeDate: data.tradeDate, barCount: 253, price: 123456, relativeStrengthPercentile: 91.2, rsObservedCount: 90, rsUniverseCount: 100 },
  };
}

test('Guru API coverage partitions and optional collapsed exclusion reasons retain source values across all strategies', async ({ page, qa }) => {
  const source = snapshot();
  qa.overrides.set('/static/data/guru_screening.json', route => route.fulfill({ json: source }));
  await page.goto('/#gurus/minervini');
  for (const name of ['minervini', ...strategies.filter(name => name !== 'minervini')]) {
    await page.locator(`[data-guru-strategy="${name}"]`).click();
    const s = source.strategies[name], coverage = page.locator('.guru-coverage');
    await expect(coverage).toContainText(`${s.matchedCount}개`);
    await expect(coverage).toContainText(`검증 ${s.evaluatedCount} / 대상 ${s.universeCount}`);
    await expect(coverage).toContainText(`수집 대기 ${s.pendingCount} · 자료 부족 ${s.insufficientCount} · 지원 제외 ${s.unsupportedCount}`);
    const reasons = page.locator('.guru-missing-reasons');
    await expect(reasons).not.toHaveAttribute('open', '');
    await reasons.getByText('검증 제외 사유 보기', { exact: true }).click();
    await expect(reasons).toHaveAttribute('open', '');
    await expect(reasons).toContainText('자료 부족과 지원 제외를 포함');
    const items = reasons.getByRole('listitem');
    await expect(items).toHaveCount(Object.keys(s.missingReasons).length);
    for (const [reason, count] of Object.entries(s.missingReasons)) await expect(items.filter({ hasText: reason })).toHaveText(`${reason} · ${count}개`);
    expect(Object.values(s.missingReasons).reduce((sum, count) => sum + count, 0)).toBe(s.insufficientCount + s.unsupportedCount);
    await noOverflow(page);
  }
});

test('Guru legacy publications without optional reasons remain usable and Minervini empty copy describes daily-bar coverage', async ({ page, qa }) => {
  const source = snapshot({ matched: 0 });
  for (const s of Object.values(source.strategies)) delete s.missingReasons;
  qa.overrides.set('/static/data/guru_screening.json', route => route.fulfill({ json: source }));
  await page.goto('/#gurus/minervini');
  await expect(page.locator('.guru-empty')).toContainText('253거래일');
  await expect(page.locator('.guru-empty')).toContainText('90% 미만');
  await expect(page.locator('.guru-empty')).not.toContainText('EPS');
  await expect(page.locator('.guru-missing-reasons')).toHaveCount(0);
  await page.locator('[data-guru-strategy="lynch"]').click();
  await expect(page.locator('.guru-empty')).toContainText('EPS');
  await noOverflow(page);
});

for (const mode of ['same trade date, older generation', 'older trade date, newer generation']) {
  test(`Guru 409 refresh preserves current publication against ${mode}, then accepts newer fewer matches with exact evidence version`, async ({ page, qa }) => {
    const current = snapshot(), older = snapshot({ version: 'backend-older', matched: 0,
      ...(mode.startsWith('same') ? { generatedAt: '2026-10-07T16:09:14+09:00' } : { tradeDate: '2026-10-06', generatedAt: '2026-10-08T01:00:00+09:00' }),
    });
    const newer = snapshot({ version: 'backend-newer', generatedAt: '2026-10-08T00:15:19+09:00', matched: 1 });
    let published = current, proofAvailable = false;
    qa.overrides.set('/static/data/guru_screening.json', route => route.fulfill({ json: published }));
    qa.overrides.set(`/api/guru-investing/${ticker}`, (route, url) => {
      if (!proofAvailable) return route.fulfill({ status: 409, json: { detail: 'Published evidence version differs' } });
      return route.fulfill({ json: evidence(newer, ticker) });
    });
    await page.goto('/#gurus/minervini');
    await expect(page.locator('.guru-candidate')).toHaveCount(30);
    await expect(page.locator('.guru-coverage')).toContainText(`조건 충족 ${current.strategies.minervini.matchedCount}개`);
    await page.locator(`[data-guru-expand="${ticker}"]`).click();
    await expect(page.locator('.guru-evidence')).toContainText('같은 버전의 근거');
    published = older;
    await page.locator('.guru-retry-evidence').click();
    await expect(page.locator('.guru-refresh-error')).toContainText('현재 결과를 유지');
    await expect(page.locator('.guru-candidate')).toHaveCount(30);
    await expect(page.locator('.guru-coverage')).toContainText('검증 88 / 대상 100');
    await expect(page.locator('.guru-coverage')).toContainText(`조건 충족 ${current.strategies.minervini.matchedCount}개`);
    await expect(page.locator('.guru-evidence')).toContainText('같은 버전의 근거');
    expect(qa.calls.filter(call => call.path.startsWith('/api/guru-investing/')).map(call => new URLSearchParams(call.query).get('version'))).toEqual([current.snapshotVersion]);
    published = newer; proofAvailable = true;
    await page.locator('.guru-refresh-error').getByRole('button', { name: '다시 확인', exact: true }).click();
    await expect(page.locator('.guru-refresh-error')).toHaveCount(0);
    await expect(page.locator('.guru-coverage')).toContainText('조건 충족 1개');
    await expect(page.locator('.guru-candidate')).toHaveCount(1);
    await expect(page.locator('.guru-evidence-basis')).toContainText(`${newer.tradeDate} 종가`);
    await expect(page.locator('.guru-evidence-basis')).toContainText('253거래일');
    await expect(page.locator('.guru-table-wrap')).toContainText('123,456원');
    expect(qa.calls.filter(call => call.path.startsWith('/api/guru-investing/')).map(call => new URLSearchParams(call.query).get('version'))).toEqual([current.snapshotVersion, newer.snapshotVersion]);
    await noOverflow(page);
  });
}
