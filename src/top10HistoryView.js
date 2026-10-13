import { api } from './api.js';

const esc=(value='')=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const dateValue=value=>Date.parse(`${value}T00:00:00+09:00`)||0;
const selectedKeys=day=>new Set((day.selectedPicks||[]).flatMap(p=>[p.code,p.name].filter(Boolean).map(String)));
const selected=(day,row)=>{const keys=selectedKeys(day);return keys.has(String(row.code||''))||keys.has(String(row.name||''));};

function stats(days){
 const rows=days.flatMap(day=>day.top10||[]);
 return {
  days:days.length,
  full:days.filter(day=>day.coverage==='complete').length,
  rows:rows.length,
  unique:new Set(rows.map(row=>row.code||row.name).filter(Boolean)).size,
  picks:days.reduce((sum,day)=>sum+(day.selectedPicks||[]).filter(p=>p.status==='user_confirmed').length,0),
 };
}

function dayMarkup(day){
 const isPartial=day.coverage!=='complete';
 const picks=day.selectedPicks||[];
 return `<article class="top10h-day${isPartial?' is-partial':''}">
   <header class="top10h-day-head">
    <div>
      <div class="top10h-date-line"><strong>${esc(day.tradeDate)}</strong><span class="top10h-coverage ${isPartial?'partial':'complete'}">${isPartial?'부분 기록':'TOP10 전체'}</span></div>
      <div class="top10h-picks">${picks.length?picks.map(p=>`<span class="top10h-pick ${p.status==='legacy_saved'?'legacy':''}">${p.status==='legacy_saved'?'저장':'선택'} · ${esc(p.name||p.code)}</span>`).join(''):'<span class="top10h-no-pick">최종 PICK 미확정</span>'}</div>
    </div>
    <span class="top10h-count">${(day.top10||[]).length}개</span>
   </header>
   <div class="top10h-grid top10h-grid-head"><span>순위</span><span>종목</span><span>당시 점수</span><span>선택</span></div>
   <div class="top10h-rows">${(day.top10||[]).map(row=>`<div class="top10h-grid top10h-row${selected(day,row)?' is-selected':''}">
      <span class="top10h-rank">${esc(row.rank||'-')}</span>
      <span class="top10h-stock"><strong>${esc(row.name||'-')}</strong><small>${esc(row.code||'코드 미확인')}</small></span>
      <span class="top10h-score">${row.score==null?'-':esc(row.score)+'점'}</span>
      <span class="top10h-selected">${selected(day,row)?'PICK':''}</span>
    </div>`).join('')}</div>
   ${day.note?`<p class="top10h-note">${esc(day.note)}</p>`:''}
 </article>`;
}

export async function renderTop10History({shell,bindNav}){
 const app=document.querySelector('#app');
 app.innerHTML=shell(`<section class="top10h-intro"><span class="page-kicker">DAILY TOP10 ARCHIVE</span><h2>TOP10 히스토리</h2><p>그날 실제로 제시한 TOP10과 최종 선택 PICK을 날짜별로 확인해요.</p></section><div class="top10h-loading">기록을 불러오고 있어요.</div>`,'TOP10 히스토리');
 bindNav();
 try{
  const data=await api('/static/data/top10_history.json',{ttlMs:60000,timeoutMs:6000,retries:1});
  const days=Array.isArray(data?.days)?data.days:[];
  const s=stats(days);
  app.innerHTML=shell(`
   <section class="top10h-intro"><span class="page-kicker">DAILY TOP10 ARCHIVE</span><h2>TOP10 히스토리</h2><p>그날 실제로 제시한 TOP10과 최종 선택 PICK을 날짜별로 확인해요. 초기 기록이 불완전한 날은 추정하지 않고 부분 기록으로 표시해요.</p></section>
   <section class="top10h-kpis">
    <div><span>기록일</span><strong>${s.days}</strong></div>
    <div><span>TOP10 전체</span><strong>${s.full}</strong></div>
    <div><span>누적 추천</span><strong>${s.rows}</strong><small>고유 종목 ${s.unique}개</small></div>
    <div class="accent"><span>최종 PICK</span><strong>${s.picks}</strong></div>
   </section>
   <section class="top10h-controls">
    <label><span class="sr-only">종목 검색</span><input type="search" data-top10h-search placeholder="종목명 · 코드 검색" autocomplete="off"></label>
    <select data-top10h-coverage aria-label="기록 필터"><option value="all">전체 기록</option><option value="complete">TOP10 전체</option><option value="partial">부분 기록</option></select>
    <select data-top10h-sort aria-label="날짜 정렬"><option value="latest">최신순</option><option value="oldest">과거순</option></select>
   </section>
   <div class="top10h-meta"><span>파란 행 = 사용자 최종 PICK</span><span>점수는 당시 기록값이며 날짜 간 절대 비교용이 아니에요.</span></div>
   <div data-top10h-list></div>
  `,'TOP10 히스토리');
  bindNav();

  const search=app.querySelector('[data-top10h-search]');
  const coverage=app.querySelector('[data-top10h-coverage]');
  const sort=app.querySelector('[data-top10h-sort]');
  const list=app.querySelector('[data-top10h-list]');
  const paint=()=>{
    const q=String(search?.value||'').trim().toLowerCase();
    let visible=days.filter(day=>coverage?.value==='all'||day.coverage===coverage?.value);
    if(q)visible=visible.filter(day=>[day.tradeDate,...(day.top10||[]).flatMap(x=>[x.name,x.code]),...(day.selectedPicks||[]).flatMap(x=>[x.name,x.code])].filter(Boolean).join(' ').toLowerCase().includes(q));
    visible.sort((a,b)=>(sort?.value==='oldest'?1:-1)*(dateValue(a.tradeDate)-dateValue(b.tradeDate)));
    list.innerHTML=visible.length?visible.map(dayMarkup).join(''):'<div class="top10h-empty">조건에 맞는 기록이 없어요.</div>';
  };
  search?.addEventListener('input',paint);
  coverage?.addEventListener('change',paint);
  sort?.addEventListener('change',paint);
  paint();
 }catch{
  app.innerHTML=shell('<div class="empty" role="alert"><strong>TOP10 히스토리를 불러오지 못했어요.</strong><span>잠시 후 다시 시도해주세요.</span><button type="button" class="retry" data-top10h-retry>다시 시도</button></div>','TOP10 히스토리');
  bindNav();
  app.querySelector('[data-top10h-retry]')?.addEventListener('click',()=>renderTop10History({shell,bindNav}),{once:true});
 }
}
