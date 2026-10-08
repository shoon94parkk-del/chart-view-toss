// Shared validated financial snapshot fixture; no live provider calls.
const strategies = ['buffett', 'lynch', 'oneil', 'minervini', 'greenblatt'];
const ticker = '005930.KS';
export function snapshot({ version = 'cdn-current', tradeDate = '2026-10-07', generatedAt = '2026-10-07T23:15:19+09:00', matched = 81 } = {}) {
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
