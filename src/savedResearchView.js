import {savedResearch} from './savedResearch.js';
import {reviewRevisit} from './revisitStatus.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function savedResearchHtml(nameFor,{compact=false}={}){
 const {rows,error}=savedResearch();
 if(compact&&!rows.length&&!error)return '';
 const priority=row=>['new','corrected','conditionChanged'].includes(reviewRevisit(row).kind)?0:1;
 const ordered=[...rows].sort((a,b)=>priority(a)-priority(b));
 const eligible=rows.filter(row=>/^[A-Z0-9]{6}\.(KS|KQ)$/.test(row.symbol)&&(row.filing||row.conditions.length)).length;
 if(compact)return `<section class="saved-research section" data-revisit-compact="true"><div class="section-head"><h2>다시 확인할 내용</h2>${eligible?'<button type="button" class="text-button" data-refresh-saved-research>최신 공시 확인</button>':'<button type="button" class="text-button" data-tab="watch">모두 보기</button>'}</div><p class="revisit-refresh-status" role="status"></p>${error?'<p role="status">일부 저장 내용을 읽지 못했어요. 저장한 자료를 지우지 않았어요.</p>':''}${ordered.slice(0,1).map(row=>{
  const review=reviewRevisit(row),hasReview=Boolean(row.filing||row.conditions.length);
  const jump=hasReview?'detail-report-review':'detail-research-card';
  const checked=review.checkedAt?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric'}).format(new Date(review.checkedAt)):'';
  return `<article class="saved-research-row"><button type="button" data-saved-research="${esc(row.symbol)}" data-saved-jump="${jump}"><span class="saved-research-heading"><strong>${esc(nameFor(row.symbol))}</strong><b>${hasReview?'공시 비교':'저장 질문'} →</b></span>${hasReview?`<span class="revisit-observation" data-revisit-kind="${review.kind}"><b>${esc(review.label)}</b><small>${checked?'조회 '+esc(checked)+' · ':''}${esc(review.period||'현재 보고서 미확인')}</small></span>`:`<span class="saved-question-preview">${esc(row.question)}</span>`}</button><small>저장 ${esc(row.updatedAt.slice(0,10)||'날짜 미제공')}${row.reviewOn?' · 다시 볼 날짜 '+esc(row.reviewOn):''}${row.filing?' · 기준 '+esc(row.filing.label):''}</small></article>`;
 }).join('')}</section>`;
 return `<section class="saved-research section" data-revisit-compact="${compact}"><div class="section-head"><h2>다시 확인할 내용</h2>${compact?'<button type="button" class="text-button" data-tab="watch">모두 보기</button>':''}</div><p>저장한 근거와 마지막 확인 이후의 공시를 비교해요. 최신 공시는 버튼을 눌러 확인하세요.</p>${eligible?`<button type="button" class="text-button" data-refresh-saved-research>최신 공시 확인 · 최근 저장 ${Math.min(eligible,3)}종목</button><p class="revisit-refresh-status" role="status"></p>`:''}${error?'<p role="status">일부 저장 내용을 읽지 못했어요. 저장한 자료를 지우지 않았어요.</p>':''}${(compact?ordered.slice(0,1):ordered).map(row=>{
 const review=reviewRevisit(row);
 const checked=review.checkedAt?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(review.checkedAt)):'';
 return `<article class="saved-research-row"><strong>${esc(nameFor(row.symbol))}</strong><small>저장 ${esc(row.updatedAt.slice(0,10)||'날짜 미제공')}${row.reviewOn?' · 다시 볼 날짜 '+esc(row.reviewOn):''}</small>${row.filing||row.conditions.length?`<div class="revisit-observation" data-revisit-kind="${review.kind}"><b>${esc(review.label)}</b><small>${checked?'마지막 조회 '+esc(checked)+' KST · ':''}${esc(review.period||'현재 보고서 미확인')}</small>${row.filing?`<small>확인 기준 · ${esc(row.filing.label)}</small>`:''}</div>`:''}${row.question?`<button type="button" data-saved-research="${esc(row.symbol)}" data-saved-jump="detail-research-card"><span>저장 질문 · ${esc(row.question)}</span><b>공시 비교 열기 →</b></button>`:''}${row.filing||row.conditions.length?`<button type="button" data-saved-research="${esc(row.symbol)}" data-saved-jump="detail-report-review"><span>${row.conditions.length?'저장 근거 '+row.conditions.length+'개 · '+row.conditions.map(c=>esc(c.label)).join(' · '):'확인한 공시와 비교'}</span><b>이전 근거와 현재 공시 비교 →</b></button>`:''}</article>`;
 }).join('')||(!error?'<p>아직 저장한 질문·근거가 없어요. 기업 상세의 공시 비교에서 저장하면 여기에 모여요.</p><button type="button" class="retry" data-open-stock-search>종목 찾아 조사 시작 →</button>':'')}</section>`;
}
