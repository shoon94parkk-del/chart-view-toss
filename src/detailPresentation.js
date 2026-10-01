const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function detailCachedQuote(symbol,snapshot,market){
 const rows=[...(market?.results||[]),...(snapshot?.heatmap?.results||[])];
 return rows.find(row=>String(row?.ticker||'').toUpperCase()===String(symbol||'').toUpperCase()&&row.price!=null)||null;
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
