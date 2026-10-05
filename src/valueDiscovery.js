import {uiIcon} from './uiIdentity.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const selectionKey = row => `${row?.recommendedDate || row?.pickDate || ''}:${row?.code || String(row?.symbol || row?.ticker || '').split('.')[0]}`;
export function recentSelections(payload) {
  const date = payload?.day?.tradeDate || '';
  const records = Array.isArray(payload?.recommendations) ? payload.recommendations : [];
  return (payload?.day?.top3 || []).slice(0, 3).map(row => {
    const symbol = String(row?.symbol || row?.ticker || '').toUpperCase();
    const key = selectionKey({...row, symbol, recommendedDate: date});
    const record = records.find(item => selectionKey(item) === key);
    return {...row, ...record, symbol, recommendedDate: date, key,
      reason: record?.reason || row?.reason || '선정 사유가 아직 제공되지 않았어요.'};
  });
}
export function valueEntriesMarkup(showPicks = true) {
  return `<nav class="home-value-entries" aria-label="차트뷰 핵심 분석">
    <button type="button" class="tool-exports" data-feature-route="exports"><i class="tool-symbol" aria-hidden="true">${uiIcon('exports',20)}</i><strong>수출 데이터</strong><small>품목·국가</small><span class="tool-open" aria-hidden="true">↗</span></button>
    <button type="button" class="tool-find" data-feature-route="discover" data-feature-target="volume-surge"><i class="tool-symbol" aria-hidden="true">${uiIcon('filter',20)}</i><strong>조건별 종목 찾기</strong><small>거래량·추세</small><span class="tool-open" aria-hidden="true">↗</span></button>
    ${showPicks ? '<button type="button" class="tool-records" data-feature-route="picks"><i class="tool-symbol" aria-hidden="true">' + uiIcon('ledger',20) + '</i><strong>선정 기록·성과</strong><small>선정 이유</small><span class="tool-open" aria-hidden="true">↗</span></button>' : ''}
  </nav>`;
}
export function selectionCardMarkup(row, status = '점검 상태 확인 중') {
  const value=Number(row?.returnPct);
  const returnText=Number.isFinite(value)?`${value>0?'+':''}${value.toFixed(2)}%`:'—';
  const returnTone=Number.isFinite(value)?(value>0?'up':value<0?'down':'flat'):'flat';
  return `<article class="home-pick-row"><button type="button" class="home-selection-link" data-feature-route="picks" data-feature-target="${esc(row.key)}" aria-label="${esc((row.name || row.symbol) + ' ' + row.recommendedDate + ' 선정 근거·점검 보기')}"><span class="home-selection-heading"><strong>${esc(row.name || row.symbol)}</strong><em class="home-selection-return ${returnTone}">${esc(returnText)}</em></span><span class="home-selection-sub"><span data-selection-status="${esc(row.key)}">${esc(status)}</span><small>${esc(row.reason||'선정 이유 확인하기')}</small><i aria-hidden="true">›</i></span></button></article>`;
}
