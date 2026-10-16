// Deterministic QA examples, not a substitute for a live official-data audit.
export const releaseNow = '2026-10-16T02:00:00Z';
export const checkedAt = '2026-10-16T01:00:00Z';
export const legacyMacro = {
  summary: { text: 'QA 기존 16개 경제 지표', level: 'yellow', latestBasisDate: '2026-10-15' },
  results: Array.from({ length: 16 }, (_, i) => ({
    symbol: `QA${i + 1}`, name: `기존 경제 지표 ${i + 1}`, value: i + 1, delta: .1,
    asOf: '2026-10-15', source: 'QA legacy contract',
    chart_data: [{ time: '2026-10-14', value: i }, { time: '2026-10-15', value: i + 1 }],
  })),
};
const definitions = [
  ['cpi', 'CPI', '전체 소비자물가지수', 'CPIAUCSL', 'CPIAUCNS', 3.74, .65],
  ['core_cpi', '근원 CPI', '식품·에너지 제외 소비자물가지수', 'CPILFESL', 'CPILFENS', 2.56, .33],
  ['ppi', 'PPI', '최종수요 생산자물가지수', 'PPIFIS', 'PPIFID', 6.34, 1.34],
  ['core_ppi', '근원 PPI', '식품·에너지 제외 최종수요 생산자물가지수', 'PPIFES', 'PPICOR', 4.97, .68],
];
export const inflationMacro = {
  ...legacyMacro,
  inflation: {
    schemaVersion: 1, status: 'partial', generatedAt: checkedAt,
    series: definitions.map(([id, name, definition, saSeriesId, nsaSeriesId, yoy, mom]) => ({
      id, name, definition, unit: '%', basis: { yoy: 'NSA', mom: 'SA' }, asOf: '2026-09',
      publishedAt: '2026-10-14T12:30:00Z', collectedAt: checkedAt, checkedAt, revisionStatus: 'unknown',
      source: { name: 'FRED · BLS', url: `https://fred.stlouisfed.org/series/${nsaSeriesId}`,
        saSeriesId, nsaSeriesId, saUrl: `https://fred.stlouisfed.org/series/${saSeriesId}`,
        nsaUrl: `https://fred.stlouisfed.org/series/${nsaSeriesId}` },
      points: [
        { month: '2026-05', yoy: yoy - .5, mom: mom - .2 },
        { month: '2026-06', yoy: yoy - .3, mom: mom - .1 },
        { month: '2026-07', yoy: null, mom: null },
        { month: '2026-08', yoy: yoy - .1, mom: mom - .05 },
        { month: '2026-09', yoy, mom, publishedAt: '2026-10-14T12:30:00Z' },
      ],
    })),
  },
  releaseCalendar: {
    status: 'ok', checkedAt, sourceUrl: 'https://www.bls.gov/schedule/news_release/cpi.htm',
    events: [
      { id: 'cpi:2026-10', indicator: 'cpi', name: 'CPI · 근원 CPI', observationMonth: '2026-10',
        scheduledAt: '2026-11-10T13:30:00Z', localDate: '2026-11-10', localTime: '08:30',
        timeZone: 'America/New_York', status: 'confirmed', checkedAt,
        sourceUrl: 'https://www.bls.gov/schedule/news_release/cpi.htm' },
      { id: 'ppi:2026-10', indicator: 'ppi', name: 'PPI · 근원 PPI', observationMonth: '2026-10',
        scheduledAt: '2026-11-13T13:30:00Z', localDate: '2026-11-13', localTime: '08:30',
        timeZone: 'America/New_York', status: 'confirmed', checkedAt,
        sourceUrl: 'https://www.bls.gov/schedule/news_release/ppi.htm' },
    ],
  },
};
// PCE uses the same SA index for both rates. These are deterministic QA values.
export const pceInflationMacro = structuredClone(inflationMacro);
pceInflationMacro.inflation.series.push(...[
  ['pce', '미국 PCE', '개인소비지출 물가지수', 'DPCERG', 3.419032, .310280],
  ['core_pce', '미국 근원 PCE', '식품·에너지 제외 개인소비지출 물가지수', 'DPCCRG', 3.007596, .247439],
].map(([id, name, definition, saSeriesId, yoy, mom]) => ({
  id, name, definition, unit: '%', basis: { yoy: 'SA', mom: 'SA' }, asOf: '2026-08',
  publishedAt: '2026-09-30T12:30:00Z', collectedAt: checkedAt, checkedAt, revisionStatus: 'unknown',
  source: { name: 'U.S. Bureau of Economic Analysis', url: 'https://www.bea.gov/data/personal-consumption-expenditures-price-index',
    saSeriesId, saUrl: 'https://apps.bea.gov/national/Release/XLS/Underlying/Section2All_xls.xlsx' },
  points: [
    { month: '2026-06', yoy: yoy - .2, mom: mom - .1 },
    { month: '2026-07', yoy: yoy - .1, mom: mom - .05 },
    { month: '2026-08', yoy, mom, publishedAt: '2026-09-30T12:30:00Z' },
  ],
})));
pceInflationMacro.releaseCalendar.events.unshift({
  id: 'pce:2026-10-29T12:30:00Z', indicator: 'pce', name: '미국 PCE·근원 PCE', observationMonth: null,
  scheduledAt: '2026-10-29T12:30:00Z', localDate: '2026-10-29', localTime: '08:30',
  timeZone: 'America/New_York', status: 'confirmed', checkedAt,
  sourceUrl: 'https://apps.bea.gov/API/signup/release_dates.json',
});
// Synthetic pre-release receipts exercise colors only; never used by production.
export const comparisonInflationMacro = structuredClone(pceInflationMacro);
for (const [id, expected, actual] of [['cpi', 3.8, 3.7], ['core_cpi', 2.61, 2.64], ['ppi', 6.2, 6.3]]) {
  const row = comparisonInflationMacro.inflation.series.find(row => row.id === id);
  row.comparisons = [{ month: '2026-09', rate: 'yoy', basis: 'NSA', unit: '%', expected, actual,
    actualVintage: 'first_release', publishedAt: '2026-10-14T12:30:00Z',
    forecastPublishedAt: '2026-10-14T10:00:00Z', forecastCapturedAt: '2026-10-14T12:00:00Z',
    source: { forecastName: 'QA 시장 예상', forecastUrl: 'https://example.com/forecast', actualUrl: 'https://example.com/actual' },
  }];
}
export const earningsCalls = {
  schemaVersion: 'earnings-events-v1', generatedAt: checkedAt, checkedAt, status: 'partial', cacheMode: 'static',
  events: [
    { id: 'samsung:2026-q3', symbol: '005930.KS', name: '삼성전자', eventType: 'earnings_call',
      timingRole: 'conference_call', timezone: 'Asia/Seoul', scheduledAt: '2026-10-29T01:00:00Z',
      source: { name: 'Samsung Investor Relations', url: 'https://www.samsung.com/global/ir/ir-events-presentations/events/',
        publishedAt: null, checkedAt } },
    { id: 'apple:2026-q4', symbol: 'AAPL', name: 'Apple', eventType: 'earnings_call',
      timingRole: 'conference_call', timezone: 'America/New_York', scheduledAt: '2026-11-02T22:00:00Z',
      source: { name: 'Apple Investor Relations', url: 'https://investor.apple.com/investor-relations/default.aspx',
        publishedAt: '2026-10-06T21:09:00Z', checkedAt } },
  ],
  coverage: { trackedSymbols: ['005930.KS', 'AAPL', 'NVDA'], missing: [{ symbol: 'NVDA', reason: 'no_upcoming_verified_call' }] },
  comparison: { status: 'unavailable', reason: 'pre_event_estimate_snapshot_not_available' },
};
export const consensus = ticker => ({
  ticker, currency: ticker.endsWith('.KS') ? 'KRW' : 'USD', source: 'Yahoo Finance', asOf: checkedAt,
  periods: { '0y': { endDate: '2026-12-31', earnings: { avg: 7.25, low: 6, high: 8, analysts: 20 },
    revenue: { avg: 400e9 }, epsTrend: { current: 7.25, '30daysAgo': 7 }, revisions: { up30: 2, down30: 1 } } },
});

// Exact audited DRAM amounts: the previous-month denominator must agree with
// the immediately preceding graph month, rather than overlapping query sums.
export const dramAmounts = { august: 15.7331, september: 16.777 };
export const dramMoM = (dramAmounts.september / dramAmounts.august - 1) * 100;
export function withCorrectedDram(snapshot, trends) {
  const nextSnapshot = structuredClone(snapshot), nextTrends = structuredClone(trends);
  const overview = nextSnapshot.semiconductorBreakdown.find(row => row.key === 'dram');
  Object.assign(overview, { exportsUsdBillion: dramAmounts.september, exportMoM: dramMoM });
  const row = nextTrends.segments.find(row => row.key === 'dram');
  row.exportsUsdBillion = dramAmounts.september;
  row.history = [
    { period: '2026-08', exportsUsdBillion: dramAmounts.august },
    { period: '2026-09', exportsUsdBillion: dramAmounts.september },
  ];
  return { snapshot: nextSnapshot, trends: nextTrends };
}
