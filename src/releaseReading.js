import {formatKst} from './dataPresentation.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const instant=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value));
const stamp=value=>instant(value)?formatKst(value):typeof value==='string'&&/^\d{4}-\d{2}(?:-\d{2})?$/.test(value)?value.replaceAll('-','.'):'미제공';
export function sourceTimingHtml(data={}){
 const sourceSummary=typeof data.sourceSummary==='string'&&data.sourceSummary.trim();
 const summary=sourceSummary?`<span class="analysis-meta">${esc(sourceSummary)}</span><span class="release-timing-label">자료 기준 <span aria-hidden="true">⌄</span></span>`:'기간·발표·확인 기준';
 return `<details class="release-timing${sourceSummary?' release-timing--source':''}"><summary>${summary}</summary><dl><div><dt>${esc(data.observedLabel||'관측 기준')}</dt><dd>${esc(stamp(data.observedAt))}</dd></div><div><dt>공식 발표</dt><dd>${esc(stamp(data.publishedAt))}</dd></div><div><dt>자료 수집</dt><dd>${esc(stamp(data.collectedAt))}</dd></div>${data.builtAt?`<div><dt>자료 생성</dt><dd>${esc(stamp(data.builtAt))}</dd></div>`:''}<div><dt>마지막 확인</dt><dd>${esc(stamp(data.checkedAt))}</dd></div><div><dt>수정 여부</dt><dd>${data.revisionStatus==='revised'?'기존 값 수정 확인':'미확인'}</dd></div></dl><p>자료 수집·화면 조회 시각은 공식 발표 시각과 달라요. 시각이 없으면 임의로 채우지 않아요.</p></details>`;
}
export function researchContinuationHtml(data){
 if(!data?.available)return '';
 return `<aside class="research-return-strip"><p>확인한 실적을 기존 질문이나 비교 회사와 이어서 살펴보세요.</p><button type="button" data-return-research>공시 비교 이어가기 →</button></aside>`;
}

const hosts={'AAPL':'investor.apple.com','NVDA':'investor.nvidia.com','005930.KS':'www.samsung.com'};
const sourceUrl=(value,symbol)=>{
 try{const u=new URL(value);return u.protocol==='https:'&&u.hostname===hosts[symbol]&&!u.username&&!u.password&&(!u.port||u.port==='443')?u.href:null;}catch{return null;}
};
export function earningsCallsHtml(payload={},symbols=[],{now=Date.now(),nameFor=symbol=>symbol}={}){
 const selected=[...new Set(symbols)].slice(0,6);
 const events=(Array.isArray(payload.events)?payload.events:[]).filter(row=>row&&selected.includes(row.symbol)
  &&row.eventType==='earnings_call'&&row.timingRole==='conference_call'&&sourceUrl(row.source?.url,row.symbol)
  &&instant(row.scheduledAt)&&Date.parse(row.scheduledAt)>now&&instant(row.source?.checkedAt)
  &&Date.parse(row.source.checkedAt)<=now+300000&&now-Date.parse(row.source.checkedAt)<=7*86400000)
  .sort((a,b)=>Date.parse(a.scheduledAt)-Date.parse(b.scheduledAt));
 const unique=events.filter((row,i)=>events.findIndex(other=>other.symbol===row.symbol&&other.scheduledAt===row.scheduledAt)===i);
 const missing=selected.filter(symbol=>!unique.some(row=>row.symbol===symbol));
 return `<div class="earnings-call-head"><h2>공식 콘퍼런스콜 일정</h2><small>선택 ${selected.length}종목 중 ${new Set(unique.map(row=>row.symbol)).size}종목 확인</small></div><p class="earnings-call-note">한국 시각으로 표시해요. 콘퍼런스콜 시작은 실적 발표 시각과 다를 수 있어요.</p><div class="earnings-call-list">${unique.map(row=>`<article data-earnings-call="${esc(row.symbol)}"><div><strong>${esc(nameFor(row.symbol)||row.name||row.symbol)}</strong><small>${esc(row.symbol)} · 공식 확인된 콜 일정</small></div><b>${esc(formatKst(row.scheduledAt))}</b><small>콜 시각 · 원래 시간대 ${esc(row.timezone||'원문 참조')}</small><button type="button" data-external-url="${esc(sourceUrl(row.source.url,row.symbol))}">공식 일정 원문 ↗</button><details><summary>발표·확인 시각</summary><p>콜 일정 ${esc(formatKst(row.scheduledAt))}</p><p>실적 발표 시각 미제공</p><p>일정 공지 ${esc(stamp(row.source.publishedAt))}</p><p>마지막 확인 ${esc(stamp(row.source.checkedAt))}${row.source.retainedAfterCheckFailure?' · 재확인 실패로 이전 확인 자료 표시':''}</p></details></article>`).join('')}</div>${missing.length?`<p class="earnings-call-empty">${missing.map(symbol=>`${esc(nameFor(symbol)||symbol)} (${esc(symbol)})`).join(' · ')} · 확인된 공식 일정 없음</p>`:''}<details class="earnings-comparison-limits"><summary>예상 대비 결과·주가 반응 안내</summary><p>발표 전 예상치의 저장 시점, 같은 회계기간·회계 기준, 실제 발표 시각과 거래일별 가격이 확인되어야 비교할 수 있어요. 현재 이 비교 통계는 제공하지 않아요.</p></details>`;
}
