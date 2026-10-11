// Explain the existing record mean; do not calculate a portfolio return here.
export const PICK_METHOD = '전체 평가 기록의 수익률을 같은 비중으로 더한 산술평균이에요. 선정일과 보유기간이 서로 다르고, 같은 기업의 다른 선정일 기록도 각각 포함해요. 배당·거래 비용을 반영하지 않으며 실제 포트폴리오 수익률이 아니에요. 미평가 기록은 제외하고 실제 0%는 포함해요.';
export function pickPriceBasis(rows = []) {
  const evaluated = rows.filter(row => row?.returnPct != null && String(row.returnPct).trim() !== '' && Number.isFinite(Number(row.returnPct)));
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  const dates = [...new Set(evaluated.map(row => row.lastUpdatedTradeDate).filter(validDate))].sort();
  const missing = evaluated.filter(row => !validDate(row.lastUpdatedTradeDate)).length;
  const dateLabel = !dates.length ? '가격 기준일 미제공' : dates.length === 1 ? `${dates[0]} 종가 기준` : `${dates[0]} ~ ${dates.at(-1)} · 기록별 종가 기준일이 달라요`;
  return `${dateLabel}${dates.length && missing ? ` · 기준일 미제공 ${missing}건` : ''} · 추천가 대비 현재가 단순 수익률`;
}
