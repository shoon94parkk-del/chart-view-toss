const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function rangeError(values){
 const valid=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 return !valid(values.start)||!valid(values.end)||values.start>values.end?'시작일이 종료일보다 늦지 않게 선택해주세요.':'';
}
export function requestedRangeNote(range){
 return range?`<p class="requested-range" role="status">요청 기간 ${esc(range.start)} → ${esc(range.end)} · 실제 관측 기간은 종목별로 표시해요. 휴장일은 포함하지 않아요.</p>`:'';
}
export function financialNavigationHtml(){
 return `<nav class="financial-subnav" aria-label="공시 실적 안에서 이동">${[['detail-financial-history','최근 실적'],['detail-financial-quarters','8분기·TTM'],['detail-quality','실적의 질'],['detail-report-review','공시 변화'],['detail-tracked-conditions','저장한 근거']].map(([id,label])=>`<button type="button" data-detail-jump="${id}">${label}</button>`).join('')}</nav>`;
}
// Visit-local presentation only. No new local-storage key, provider or cache.
export function ideaDisclosureKey(pattern,symbol,kind){return JSON.stringify([pattern,symbol||'',kind]);}
export function retainIdeaDisclosures(host,visits){
 const key=details=>ideaDisclosureKey(details.closest('.idea-card')?.querySelector('h3')?.textContent||'guide',details.closest('[data-idea-symbol]')?.dataset.ideaSymbol,details.hasAttribute('data-industry-context')?'industry':details.className);
 host.addEventListener('toggle',event=>{if(event.target.tagName==='DETAILS')visits.set(key(event.target),event.target.open);},true);
 for(const details of host.querySelectorAll('details'))if(visits.has(key(details)))details.open=visits.get(key(details));
}
