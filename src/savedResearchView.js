import {savedResearch} from './savedResearch.js';
import {reviewRevisit} from './revisitStatus.js';
import {readResearchTasks,researchTaskState,completeResearchTask,undoResearchTask,postponeResearchTask} from './researchTasks.js';
import {getStorageContext,isStorageContextCurrent} from './storage.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const filters=[['all','전체'],['overdue','기한 지남'],['today','오늘'],['future','예정'],['completed','완료']];
function taskControls(row,state,disabled){
 const label=esc(row.symbol),unavailable=disabled?' disabled':'';
 return `<div class="research-task-state" data-research-task-state="${state.kind}"><b>${esc(state.label)}</b>${state.reviewOn?`<small>다시 볼 날짜 ${esc(state.reviewOn)} · 한국 날짜 기준</small>`:'<small>날짜가 없는 내용은 전체에서 볼 수 있어요.</small>'}${state.dateError?'<small role="status">저장된 날짜를 확인해주세요.</small>':''}${state.completedAt?`<small>직접 확인 ${esc(new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'numeric',day:'numeric'}).format(new Date(state.completedAt)))}</small>`:''}</div><details class="research-task-actions" data-research-task-details="${label}"><summary>확인 기록 관리</summary><div class="research-task-inline"><button type="button" data-research-task-action="${state.kind==='completed'?'undo':'complete'}"${unavailable}>${state.kind==='completed'?'완료 취소':'확인 완료'}</button><form data-research-task-postpone><label>다시 볼 날짜<input type="date" name="reviewOn" value="${esc(state.reviewOn)}" required${unavailable}></label><button type="submit"${unavailable}>날짜 미루기</button></form><p role="status" data-research-task-notice></p></div></details>`;
}
export function savedResearchHtml(nameFor,{compact=false}={}){
 const {rows,error}=savedResearch();
 const taskStore=readResearchTasks(),taskStates=new Map(rows.map(row=>[row.symbol,researchTaskState(row,{tasks:taskStore.tasks})]));
 if(compact&&!rows.length&&!error)return '';
 const priority=row=>['new','corrected','conditionChanged'].includes(reviewRevisit(row).kind)?0:1;
 const ordered=[...rows].sort((a,b)=>priority(a)-priority(b));
 const eligible=rows.filter(row=>/^[A-Z0-9]{6}\.(KS|KQ)$/.test(row.symbol)&&(row.filing||row.conditions.length)).length;
 if(compact)return `<section class="saved-research section" data-revisit-compact="true"><div class="section-head"><h2>다시 확인할 내용</h2><button type="button" class="text-button" data-tab="watch">모두 보기 · ${rows.length}</button></div>${eligible?'<button type="button" class="text-button" data-refresh-saved-research>최신 공시 확인</button>':''}<p class="revisit-refresh-status" role="status"></p>${error?'<p role="status">일부 저장 내용을 읽지 못했어요. 저장한 자료를 지우지 않았어요.</p>':''}${ordered.slice(0,1).map(row=>{
  const review=reviewRevisit(row),hasReview=Boolean(row.filing||row.conditions.length);
  const jump=hasReview?'detail-report-review':'detail-research-card';
  const checked=review.checkedAt?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric'}).format(new Date(review.checkedAt)):'';
  return `<article class="saved-research-row"><button type="button" data-saved-research="${esc(row.symbol)}" data-saved-jump="${jump}"><span class="saved-research-heading"><strong>${esc(nameFor(row.symbol))}</strong><b>${hasReview?'공시 비교':'저장 질문'} →</b></span>${hasReview?`<span class="revisit-observation" data-revisit-kind="${review.kind}"><b>${esc(review.label)}</b><small>${checked?'조회 '+esc(checked)+' · ':''}${esc(review.period||'현재 보고서 미확인')}</small></span>`:`<span class="saved-question-preview">${esc(row.question)}</span>`}</button><small>저장 ${esc(row.updatedAt.slice(0,10)||'날짜 미제공')}${row.reviewOn?' · 다시 볼 날짜 '+esc(row.reviewOn):''}${row.filing?' · 기준 '+esc(row.filing.label):''}</small></article>`;
 }).join('')}</section>`;
 return `<section class="saved-research section" data-revisit-compact="${compact}"><div class="section-head"><h2>다시 확인할 내용</h2>${compact?'<button type="button" class="text-button" data-tab="watch">모두 보기</button>':''}</div><p>저장한 근거와 마지막 확인 이후의 공시를 비교해요. 최신 공시는 버튼을 눌러 확인하세요.</p><p class="research-task-help">완료는 직접 확인했다는 기록이에요. 최신 공시를 자동으로 조회하지 않아요.</p>${eligible?`<button type="button" class="text-button" data-refresh-saved-research>최신 공시 확인 · 최근 저장 ${Math.min(eligible,3)}종목</button><p class="revisit-refresh-status" role="status"></p>`:''}${error?'<p role="status">일부 저장 내용을 읽지 못했어요. 저장한 자료를 지우지 않았어요.</p>':''}${taskStore.error?'<p role="status">확인 기록을 읽지 못했어요. 기존 자료를 지우지 않았어요.</p>':''}<div class="research-task-filters" role="group" aria-label="다시 볼 날짜 필터">${filters.map(([value,label])=>`<button type="button" data-research-task-filter="${value}" aria-pressed="${value==='all'}">${label} · ${value==='all'?rows.length:rows.filter(row=>taskStates.get(row.symbol).kind===value).length}</button>`).join('')}</div><p class="research-task-empty" data-research-task-empty role="status" hidden>이 분류에 저장한 내용이 없어요.</p>${(compact?ordered.slice(0,1):ordered).map(row=>{
 const review=reviewRevisit(row);
 const checked=review.checkedAt?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(review.checkedAt)):'';
 return `<article class="saved-research-row" data-research-task-symbol="${esc(row.symbol)}" data-research-task-kind="${taskStates.get(row.symbol).kind}" data-research-task-revision="${esc(taskStates.get(row.symbol).revision)}"><strong>${esc(nameFor(row.symbol))}</strong><small>저장 ${esc(row.updatedAt.slice(0,10)||'날짜 미제공')}${row.reviewOn?' · 다시 볼 날짜 '+esc(row.reviewOn):''}</small>${row.filing||row.conditions.length?`<div class="revisit-observation" data-revisit-kind="${review.kind}"><b>${esc(review.label)}</b><small>${checked?'마지막 조회 '+esc(checked)+' KST · ':''}${esc(review.period||'현재 보고서 미확인')}</small>${row.filing?`<small>확인 기준 · ${esc(row.filing.label)}</small>`:''}</div>`:''}${row.question?`<button type="button" data-saved-research="${esc(row.symbol)}" data-saved-jump="detail-research-card"><span>저장 질문 · ${esc(row.question)}</span><b>공시 비교 열기 →</b></button>`:''}${row.filing||row.conditions.length?`<button type="button" data-saved-research="${esc(row.symbol)}" data-saved-jump="detail-report-review"><span>${row.conditions.length?'저장 근거 '+row.conditions.length+'개 · '+row.conditions.map(c=>esc(c.label)).join(' · '):'확인한 공시와 비교'}</span><b>이전 근거와 현재 공시 비교 →</b></button>`:''}${taskControls(row,taskStates.get(row.symbol),taskStore.error||error)}</article>`;
 }).join('')||(!error?'<p>아직 저장한 질문·근거가 없어요. 기업 상세의 공시 비교에서 저장하면 여기에 모여요.</p><button type="button" class="retry" data-open-stock-search>종목 찾아 조사 시작 →</button>':'')}</section>`;
}

const actionBindings=new WeakMap();
export function bindSavedResearchActions(host,{nameFor=symbol=>symbol,onNotice=()=>{},onUpdated=()=>{}}={}){
 const context=getStorageContext(),previous=actionBindings.get(host);
 if(previous?.context===context)return previous.cleanup;
 previous?.cleanup();
 let active=true;const pending=new Set();
 const current=section=>active&&section.isConnected&&isStorageContextCurrent(context);
 const sections=()=>host.matches?.('.saved-research[data-revisit-compact="false"]')?[host]:[...host.querySelectorAll('.saved-research[data-revisit-compact="false"]')];
 const currentSection=()=>[...sections()].find(section=>current(section));
 const findRow=(section,symbol)=>[...section.querySelectorAll('[data-research-task-symbol]')].find(item=>item.dataset.researchTaskSymbol===symbol);
 const busy=(article,value)=>{article?.querySelectorAll('.research-task-actions button,.research-task-actions input').forEach(input=>{input.disabled=value;});};
 function applyFilter(section,value){
  let visible=0;
  section.querySelectorAll('[data-research-task-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.researchTaskFilter===value)));
  section.querySelectorAll('[data-research-task-symbol]').forEach(row=>{row.hidden=value!=='all'&&row.dataset.researchTaskKind!==value;if(!row.hidden)visible++;});
  const empty=section.querySelector('[data-research-task-empty]');if(empty)empty.hidden=visible>0;
 }
 function repaint(section,symbol,action){
  const focused=document.activeElement,focusedRow=focused?.closest?.('[data-research-task-symbol]');
  const focusInside=Boolean(focused&&section.contains(focused));
  const focusSelector=focused?.matches?.('input[name="reviewOn"]')?'input[name="reviewOn"]':focused?.matches?.('[data-research-task-action]')?'[data-research-task-action]':focused?.matches?.('summary')?'summary':null;
  const focusSymbol=focusInside?focusedRow?.dataset.researchTaskSymbol:null,focusFilter=focusInside?focused?.dataset?.researchTaskFilter:null;
  const keepOutside=focused&&!focusInside&&focused!==document.body&&focused!==document.documentElement;
  const filter=section.querySelector('[data-research-task-filter][aria-pressed="true"]')?.dataset.researchTaskFilter||'all';
  const open=new Set([...section.querySelectorAll('[data-research-task-details][open]')].map(details=>details.dataset.researchTaskDetails));
  const drafts=new Map([...section.querySelectorAll('[data-research-task-symbol]')].map(row=>[row.dataset.researchTaskSymbol,row.querySelector('input[name="reviewOn"]')?.value]));
  const refreshStatus=section.querySelector('.revisit-refresh-status')?.textContent||'';
  const refreshDisabled=Boolean(section.querySelector('[data-refresh-saved-research]')?.disabled);
  const template=document.createElement('template');template.innerHTML=savedResearchHtml(nameFor);
  // Keep the bound owner connected so concurrent saves share their pending set.
  section.innerHTML=template.content.firstElementChild.innerHTML;const next=section;
  next.querySelectorAll('[data-research-task-details]').forEach(details=>{details.open=open.has(details.dataset.researchTaskDetails);});
  next.querySelectorAll('[data-research-task-symbol]').forEach(row=>{
   const input=row.querySelector('input[name="reviewOn"]');if(input&&drafts.has(row.dataset.researchTaskSymbol))input.value=drafts.get(row.dataset.researchTaskSymbol);
   if(pending.has(row.dataset.researchTaskSymbol)){busy(row,true);row.querySelector('[data-research-task-notice]').textContent='저장 중…';}
  });
  const refresh=next.querySelector('.revisit-refresh-status');if(refresh)refresh.textContent=refreshStatus;
  const refreshButton=next.querySelector('[data-refresh-saved-research]');if(refreshButton)refreshButton.disabled=refreshDisabled;
  applyFilter(next,filter);onUpdated();
  const row=findRow(next,symbol);
  const priorRow=focusSymbol&&findRow(next,focusSymbol);
  const target=keepOutside?null:focusFilter?next.querySelector(`[data-research-task-filter="${focusFilter}"]`):priorRow&&!priorRow.hidden&&focusSelector?priorRow.querySelector(focusSelector):action==='refresh'?refreshButton:row&&!row.hidden?(action==='postpone'?row.querySelector('input[name="reviewOn"]'):row.querySelector('[data-research-task-action]')):next.querySelector(`[data-research-task-filter="${filter}"]`);
  target?.focus({preventScroll:true});
 }
 async function run(control,action){
  const article=control.closest('[data-research-task-symbol]'),section=article?.closest('.saved-research[data-revisit-compact="false"]');
  if(!section||!current(section)||pending.has(article.dataset.researchTaskSymbol))return;
  const symbol=article.dataset.researchTaskSymbol,row=savedResearch().rows.find(item=>item.symbol===symbol);if(!row)return;
  if(article.dataset.researchTaskRevision!==researchTaskState(row).revision){
   repaint(section,symbol,'changed');
   const notice=findRow(section,symbol)?.querySelector('[data-research-task-notice]');
   if(notice)notice.textContent='저장한 질문이나 공시가 변경됐어요. 바뀐 내용을 확인한 뒤 다시 눌러주세요.';
   return;
  }
  const notice=article.querySelector('[data-research-task-notice]');
  const date=article.querySelector('input[name="reviewOn"]')?.value;
  pending.add(symbol);busy(article,true);if(notice)notice.textContent='저장 중…';
  try{
   await (action==='complete'?completeResearchTask(row):action==='undo'?undoResearchTask(row):postponeResearchTask(row,date));
   pending.delete(symbol);const latest=currentSection();if(!latest)return;
   repaint(latest,symbol,action);onNotice(action==='complete'?'직접 확인한 기록을 저장했어요.':action==='undo'?'완료를 취소했어요.':'다시 볼 날짜를 저장했어요.');
  }catch(error){const latest=currentSection(),message=latest&&findRow(latest,symbol)?.querySelector('[data-research-task-notice]');if(message)message.textContent=error?.message||'저장하지 못했어요. 다시 시도해주세요.';}
  finally{pending.delete(symbol);const latest=currentSection();if(latest)busy(findRow(latest,symbol),false);}
 }
 const click=event=>{
  const filter=event.target.closest?.('[data-research-task-filter]');if(filter&&host.contains(filter)){applyFilter(filter.closest('.saved-research'),filter.dataset.researchTaskFilter);return;}
  const control=event.target.closest?.('[data-research-task-action]');if(control&&host.contains(control))void run(control,control.dataset.researchTaskAction);
 };
 const submit=event=>{const form=event.target.closest?.('[data-research-task-postpone]');if(form&&host.contains(form)){event.preventDefault();void run(form,'postpone');}};
 host.addEventListener('click',click);host.addEventListener('submit',submit);
 const cleanup=()=>{active=false;host.removeEventListener('click',click);host.removeEventListener('submit',submit);if(actionBindings.get(host)?.cleanup===cleanup)actionBindings.delete(host);};
 actionBindings.set(host,{context,cleanup,refresh:()=>{const section=currentSection();if(section)repaint(section,null,'refresh');}});sections().forEach(section=>applyFilter(section,section.querySelector('[data-research-task-filter][aria-pressed="true"]')?.dataset.researchTaskFilter||'all'));
 return cleanup;
}

// Explicit latest-filing checks reuse the action owner so delayed task writes,
// expanded controls and unfinished date edits survive that same-source paint.
export function refreshSavedResearchView(host,{nameFor=symbol=>symbol,onUpdated=()=>{}}={}){
 const binding=actionBindings.get(host);
 if(binding?.context===getStorageContext()&&host.dataset?.revisitCompact!=='true'){binding.refresh();return;}
 if(!host.isConnected)return;
 const compact=host.dataset?.revisitCompact==='true',focused=document.activeElement;
 const keepOutside=focused&&!host.contains(focused)&&focused!==document.body&&focused!==document.documentElement;
 const template=document.createElement('template');template.innerHTML=savedResearchHtml(nameFor,{compact});
 host.innerHTML=template.content.firstElementChild.innerHTML;onUpdated();
 if(!keepOutside)host.querySelector('[data-refresh-saved-research]')?.focus({preventScroll:true});
}
