import * as existing from '../fixtures/export-recovery.mjs';

export const asOf = '2026-10-07T06:30:00Z';
export const symbol = '005930.KS';
export const quotes = [
  { ticker: symbol, name: '삼성전자', price: 103700, change: 2.37, currency: 'KRW' },
  { ticker: '000660.KS', name: 'SK하이닉스', price: 276500, change: -1.28, currency: 'KRW' },
  { ticker: 'NVDA', name: '엔비디아', price: 183.42, change: 0, currency: 'USD' },
].map(row => ({ ...row, asOf, sessionDate: '2026-10-07', marketStatus: 'CLOSE', priceBasis: 'regular_close', source: 'QA captured contract', marketCap: 1e12, market: row.currency === 'KRW' ? 'KR' : 'US' }));
export const recommendations = quotes.map((row, i) => ({
  ...row, symbol: row.ticker, code: row.ticker.split('.')[0], rank: i + 1,
  recommendedDate: '2026-10-02', recommendedPrice: [100000, 280000, 180][i], currentPrice: row.price,
  returnPct: (row.price / [100000, 280000, 180][i] - 1) * 100,
  bestReturnPct: 8 + i, reason: '기준일의 거래량·추세 조건을 충족한 선정 기록', lastUpdatedTradeDate: '2026-10-07',
}));
recommendations.push({ ...recommendations[0], recommendedDate: '2026-09-01', currentPrice: null, returnPct: null });
export const monitor = { generatedAt: asOf, picks: recommendations.map((row, i) => ({
  pickId: `${row.recommendedDate}:${row.code}`, pickDate: row.recommendedDate, code: row.code, symbol: row.symbol,
  status: ['KEEP', 'WATCH', 'KEEP', 'EXIT'][i],
  monitor: { lastReviewedTradeDate: '2026-10-07', reason: '기준일 원자료 점검' },
  technical: { signal: i === 2 ? 'TECH_SELL_REVIEW' : 'TECH_NORMAL', score: 60, ret5: 2, ret20: 4 },
})) };
export const screener = { tradeDate: '2026-10-07', stocks: quotes.map(row => ({
  ...row, symbol: row.ticker, date: '2026-10-07', industry: '반도체 제조업', mainProducts: 'DRAM, NAND',
  change1d: row.change, avgValue20: 5e10, volumeRatio: 3, ret5: 5, ret20: 12, rsi14: 55,
  above20: true, trend2060: true, high52wRatio: .95, ma20: row.price * .9, ma60: row.price * .8,
})) };
export const financial = {
  available: true, basis: '연결재무제표', currency: 'KRW',
  annual: [{ year: 2024, revenue: 1e12, operatingProfit: 1e11 }, { year: 2025, revenue: 2e12, operatingProfit: 3e11 }],
  interim: { year: 2026, quarter: 2, revenue: 1.5e12, operatingProfit: 2e11, priorRevenue: 1e12, priorOperatingProfit: 1e11 },
  interimSourceUrl: 'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260801000001',
};
// Reuse the old QA contracts, extending their two-month series to twelve real month keys.
const history12 = rows => Array.from({ length: 12 }, (_, i) => ({
  ...rows[0], period: `${i < 3 ? 2025 : 2026}-${String((i + 9) % 12 + 1).padStart(2, '0')}`,
  exportsUsdBillion: rows[0].exportsUsdBillion * (.6 + i / 30),
  exportYoY: i - 4,
})).map((row, i) => i === 11 ? { ...rows.at(-1), period: row.period } : row);
export const exportSnapshot = { ...existing.snapshot, history: history12(existing.snapshot.history),
  items: [existing.snapshot.items[0], ...Object.values(existing.industryDetails).map(row => ({
    key: row.key, name: row.name, ...row.history.at(-1),
  }))], semiconductorBreakdown: existing.semiconductorTrends.segments.map(row => ({ ...row, period: '2026-09' })),
};
export const trends = { ...existing.semiconductorTrends, segments: existing.semiconductorTrends.segments.map(row => ({ ...row, history: history12(row.history) })) };
export const industryDetails = Object.fromEntries(Object.entries(existing.industryDetails).map(([key, row], i) => [key, {
  ...row, history: history12(row.history).map(point => ({ ...point, exportsUsdBillion: point.exportsUsdBillion + i })),
}]));
export const exportDetail = { ...existing.detail, history: history12(existing.detail.history) };
export { existing };

export function payloadFor(url) {
  const path = url.pathname.replace(/^\/backend/, '');
  const tickers = (url.searchParams.get('tickers') || symbol).split(',');
  const selected = quotes.filter(row => tickers.includes(row.ticker));
  const macro = { summary: { text: '기준일 시장 환경 확인', level: 'yellow', latestBasisDate: '2026-10-07' }, results: [] };
  const map = {
    '/api/activity': { ok: true, heartbeatSec: 20 },
    '/api/market-now': { results: ['^KS11', '^KQ11', '^GSPC', '^IXIC'].map((ticker, i) => ({ ...quotes[0], ticker, price: 3500 + i, name: ['코스피', '코스닥', 'S&P 500', '나스닥'][i] })) },
    '/api/home-bootstrap': { day: { tradeDate: '2026-10-07', top3: recommendations.slice(0, 3) }, recommendations },
    '/api/home-snapshot': { generatedAt: asOf, macro, heatmap: { results: quotes } },
    '/api/home-live': { updatedAt: asOf, results: quotes, refreshing: false },
    '/api/home-insights': { items: [] },
    '/api/heatmap': { results: quotes },
    '/api/heatmap/full': { generatedAt: asOf, results: quotes, complete: true },
    '/api/quotes': { results: selected },
    '/api/search': { results: quotes.filter(row => `${row.name} ${row.ticker}`.includes(url.searchParams.get('q') || '')).map(row => ({ symbol: row.ticker, name: row.name, market: row.market, type: 'EQUITY' })) },
    '/api/compare': { stocks: selected.map(row => ({ ...row, return: 10, startDate: '2026-09-01', endDate: '2026-10-07', data: [{ time: '2026-09-01', value: 0, price: row.price / 1.1 }, { time: '2026-10-07', value: 10, price: row.price }] })) },
    '/api/valuation': { stocks: selected.map(row => ({ ...row, trailingPE: 15.2, forwardPE: 12.3, pbr: 1.2, roe: 11.3, operatingMargin: 14, dividendYield: 2.1, fieldMeta: {}, generatedAt: asOf })) },
    '/api/personalized-news': { items: [{ symbol, name: '삼성전자', title: '삼성전자 실적 공시 확인', url: 'https://example.com/news', source: 'QA News', publishedAt: asOf, relationType: 'direct' }] },
    '/api/financial-history': financial,
    '/api/financial-quarters': { available: false },
    '/api/business-report': { available: false },
    '/api/relationship-evidence': { available: false, relations: [] },
    '/api/macro': macro,
    '/api/export-momentum': exportSnapshot,
    '/api/export-momentum/provisional': existing.radar,
    '/api/export-momentum/momentum-map': existing.momentumMap,
    '/api/export-momentum/semiconductor-trends': trends,
    '/api/export-momentum/semiconductor-countries': existing.matrix,
    '/api/export-momentum/item-detail': industryDetails[url.searchParams.get('key')] || exportDetail,
    '/static/data/pick_monitor.json': monitor,
    '/static/data/screener.json': screener,
    '/static/data/company_context.json': existing.companyContext,
  };
  if (!(path in map)) throw new Error(`Unmocked data endpoint: ${path}`);
  return structuredClone(map[path]);
}
