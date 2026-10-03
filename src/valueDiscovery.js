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
    <button type="button" data-feature-route="exports"><strong>수출 데이터</strong><small>품목·국가별 흐름</small><span aria-hidden="true">↗</span></button>
    <button type="button" data-feature-route="discover" data-feature-target="volume-surge"><strong>조건별 종목 찾기</strong><small>거래량·추세 스크리닝</small><span aria-hidden="true">↗</span></button>
    ${showPicks ? '<button type="button" data-feature-route="picks"><strong>선정 기록·성과</strong><small>이유·이후 결과 확인</small><span aria-hidden="true">↗</span></button>' : ''}
  </nav>`;
}
export function selectionCardMarkup(row, status = '점검 상태 확인 중') {
  return `<article class="home-pick-row"><button type="button" class="home-selection-link" data-feature-route="picks" data-feature-target="${esc(row.key)}" aria-label="${esc((row.name || row.symbol) + ' ' + row.recommendedDate + ' 선정 근거·점검 보기')}"><span class="home-selection-heading"><strong>${esc(row.name || row.symbol)}</strong><small>${esc(row.recommendedDate || '선정일 미제공')} 선정</small></span><span class="home-selection-actions"><span data-selection-status="${esc(row.key)}">${esc(status)}</span><span class="home-selection-open">근거·점검 →</span></span></button></article>`;
}
