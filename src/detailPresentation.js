import {formatMarketCap,formatDataSource,formatKst,formatMetricPeriod} from './dataPresentation.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 운영자 수정 2026-10-03: 존재하지 않는 티커로 상세 진입 시 보여줄 안내 화면.
// '종목명 확인 불가' 껍데기 + 관심등록 버튼 대신 이 화면으로 전환한다.
export function invalidSymbolHtml(symbol){
 return `<section class="not-found-card">
   <span class="page-kicker">종목 확인</span>
   <h2>종목을 확인할 수 없어요</h2>
   <p>'${esc(symbol)}'에 해당하는 종목을 찾지 못했어요. 종목명·6자리 코드·영문 티커를 다시 확인해주세요.</p>
   <div><button type="button" class="retry" data-invalid-search>종목 검색</button><button type="button" class="neutral-action" data-tab="home">홈으로</button></div>
 </section>`;
}
export function metricBasis(meta){
 return `${formatMetricPeriod(meta?.period)} · ${formatDataSource(meta?.source)} · ${meta?.asOf?formatKst(meta.asOf)+' 기준':'자료 기준시각 미제공'}`;
}
export function marketCapHtml(valuation){
 const value=valuation?.marketCap;
 const currency=valuation?.currency;
 const valid=value!=null&&Number.isFinite(Number(value))&&Number(value)>0;
 const amount=['KRW','USD'].includes(currency)?formatMarketCap(value,currency):`${Number(value).toLocaleString('ko-KR')} · ${currency||'통화 미제공'}`;
 return `<div class="detail-cap"><span>시가총액</span><strong>${valid?esc(amount):'확인 불가'}</strong><small>${esc(metricBasis(valuation?.fieldMeta?.marketCap))}</small></div>`;
}
export function detailCachedQuote(symbol,snapshot,market){
 const rows=[...(market?.results||[]),...(snapshot?.heatmap?.results||[])];
 const row=rows.find(row=>String(row?.ticker||'').toUpperCase()===String(symbol||'').toUpperCase()&&row.price!=null)||null;
 return row&&!row.currency&&/\.(KS|KQ)$/i.test(symbol)?{...row,currency:'KRW'}:row;
}
export function indexSeries(stock){
 const points=stock?.data;
 if(!Array.isArray(points)||!points.length||points.some(p=>typeof p.price!=='number'||!Number.isFinite(p.price)||p.price<=0))return null;
 return points.map(p=>({time:p.time,value:p.price}));
}
export function quoteHtml(current,closing,labels){
 const tone=current?.change>0?'up':current?.change<0?'down':'flat';
 return `<div class="quote-main"><div><span>${esc(labels.basis)}</span><strong>${esc(labels.price)}</strong></div><div class="quote-change ${tone}"><span>전 거래일 대비</span><strong>${esc(labels.change)}</strong></div></div><div class="quote-time">${labels.asOf?esc(labels.asOf)+' 기준':'기준시각 미제공'}</div><details class="quote-provenance"><summary>시세 기준 · 출처 확인</summary><p>${esc(current?.source||'시세 출처 확인 필요')} · 조회 ${esc(labels.queriedAt)}</p><p>제공처 최신 시세는 정규장 종가와 다를 수 있어요.</p>${closing?`<div class="detail-closing-reference">스크리너 장마감 수집 종가 · ${esc(closing.date)} · ${esc(closing.priceLabel||closing.price)}<small>가격을 비교할 때 각 기준 시점을 확인해주세요.</small></div>`:''}</details>`;
}
