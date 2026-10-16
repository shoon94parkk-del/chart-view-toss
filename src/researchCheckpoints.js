const checkpointEscape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const checkpointBasis=value=>({regular_close:'정규장 장마감',regular:'정규장',intraday:'장중',live:'실시간 기준',delayed:'지연 시세',extended:'시간외',previous_close:'이전 장마감'}[value]||value);

// Keep the provider's original timestamp/offset visible. Date-only and untimed
// observations cannot acquire a timezone from the device or the save operation.
export function researchCheckpointsHtml(checkpoints=[]){
 const rows=Array.isArray(checkpoints)?checkpoints.slice(-20).reverse():[];
 const quoteHtml=quote=>{
  if(!quote)return '<p class="research-checkpoint-missing">시세 스냅샷 없음 · 저장 당시 확인 가능한 시세가 없었어요.</p>';
  const price=quote.currency==='KRW'?`${quote.price.toLocaleString('ko-KR')}원`:`${quote.price.toLocaleString('ko-KR')} ${checkpointEscape(quote.currency)}`;
  const basis=[quote.priceBasis,quote.quoteBasis].filter(Boolean).filter((value,index,all)=>all.indexOf(value)===index).map(checkpointBasis);
  return `<p><strong>${price}</strong> · 저장 당시 확인한 시세 · 현재 시세 아님</p><small>${quote.timed?'시세 관측 시각':'시세 시각 미제공'}${quote.asOf?` · ${checkpointEscape(quote.asOf)}`:''}</small><small>${checkpointEscape(quote.source||'출처 미제공')}${basis.length?` · ${basis.map(checkpointEscape).join(' · ')}`:' · 가격 기준 미제공'}</small><small>${quote.stale===true?'오래된 시세로 제공됨':quote.stale===false?'저장 당시 오래됨 표시 없음 · 현재 신선도 보장 아님':'신선도 미확인'}${quote.delayTime!=null?` · 제공처 지연 ${checkpointEscape(quote.delayTime)}`:''}${quote.sessionDate?` · 거래일 ${checkpointEscape(quote.sessionDate)}`:''}${quote.sessionType?` · ${checkpointEscape(quote.sessionType)}`:''}</small>`;
 };
 return `<details class="research-checkpoints" data-research-checkpoints><summary>리서치 체크포인트 · ${rows.length}개</summary><p class="research-checkpoint-help">질문을 저장할 때만 기록해요. 최근 20개를 이 기기에 보관해요.</p>${rows.length?`<ol>${rows.map(event=>`<li data-research-checkpoint><small>저장 시각 · <time datetime="${checkpointEscape(event.savedAt)}">${checkpointEscape(event.savedAt)}</time></small><p class="research-checkpoint-question">${checkpointEscape(event.question)}</p>${event.peer?`<p>비교 회사 · ${checkpointEscape(event.peer.name)} (${checkpointEscape(event.peer.symbol)})</p>`:''}${event.reviewOn?`<p>다시 볼 날짜 · ${checkpointEscape(event.reviewOn)}</p>`:''}${quoteHtml(event.quote)}</li>`).join('')}</ol>`:'<p>아직 저장한 체크포인트가 없어요. 이전 메모의 과거 시세는 만들지 않아요.</p>'}</details>`;
}
