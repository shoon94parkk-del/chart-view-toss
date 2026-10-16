import { pceInflationMacro } from './release-insights.mjs';

export const now = '2026-10-16T06:30:00Z';
export const commonArticle = {
  symbol: '005930.KS', name: '삼성전자', title: '반도체 공시와 수출 근거 확인',
  url: 'https://example.com/shared-semiconductor', source: '공시뉴스',
  publishedAt: '2026-10-07T04:00:00Z', publishedTs: Date.parse('2026-10-07T04:00:00Z') / 1000,
  relationType: 'direct', relationBasis: 'name_match', score: 85,
  snippet: '기업이 공개한 실적과 수출 자료를 확인하는 테스트 기사입니다.', investmentTags: ['earnings'],
};
export const newsPayload = {
  items: [commonArticle, {
    ...commonArticle, title: '반도체 산업의 공급망 점검', url: 'https://example.com/industry',
    source: '산업자료', relationType: 'industry', score: 60,
  }],
  groups: [
    { symbol: '005930.KS', name: '삼성전자', items: [commonArticle] },
    { symbol: '000660.KS', name: 'SK하이닉스', items: [{ ...commonArticle, symbol: '000660.KS', name: 'SK하이닉스', relationType: 'industry', relationBasis: 'industry_keyword' }] },
  ],
};
export const summary = {
  summary: '공개된 실적과 수출 자료를 원문과 함께 확인하는 요약입니다.',
  basis: 'provider_snippet', basisLabel: '기사 요약문 기반', qualityStatus: 'ok',
  translated: false, notice: '원문과 요약 근거를 함께 확인하세요.',
};
export function archivedForecastMacro() {
  const raw = structuredClone(pceInflationMacro);
  const row = raw.inflation.series.find(row => row.id === 'cpi');
  row.forecasts = [{
    month: row.asOf, rate: 'yoy', basis: 'NSA', unit: '%', expected: 3.6,
    evidenceKind: 'provider_archive', retrievedAt: '2026-10-16T06:20:00Z',
    archive: { url: 'https://example.com/archive/cpi-2026-09', eventId: 'cpi-september-2026-yoy', contentSha256: 'a'.repeat(64) },
    source: { forecastName: '고정 QA 공급자', forecastUrl: 'https://example.com/calendar/cpi' },
  }];
  return raw;
}
