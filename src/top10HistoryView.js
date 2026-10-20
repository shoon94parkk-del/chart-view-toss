import { api, top10HistoryData } from './api.js';
import { evaluateHistoryRow, averageTop10, finiteReturn, positivePrice } from './top10HistoryPerformance.js';

const esc=(value='')=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const dateValue=value=>Date.parse(`${value}T00:00:00+09:00`)||0;
const formatPrice=value=>positivePrice(value)===null?'—':Math.round(Number(value)).toLocaleString('ko-KR')+'원';
const formatReturn=value=>finiteReturn(value)===null?'—':`${Number(value)>0?'+':''}${Number(value).toFixed(2)}%`;
const tone=value=>finiteReturn(value)===null?'missing':Number(value)>0?'up':Number(value)<0?'down':'flat';
const selectedKeys=day=>new Set((day.selectedPicks||[]).flatMap(p=>[p.code,p.name,p.symbol].filter(Boolean)).map(String));
const selected=(day,row)=>{const keys=selectedKeys(day);return keys.has(String(row.code||''))||keys.has(String(row.name||''))||keys.has(String(row.symbol||''));};
const latestDate=()=>{
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const value=Object.fromEntries(parts.map(item=>[item.type,item.value]));
 return `${value.year}-${value.month}-${value.day}`;
};
const pickExtras=day=>(day.selectedPicks||[])
 .filter(p=>p.status==='user_confirmed'&&!((day.top10||[]).some(row=>String(row.code)===String(p.code))))
 .map(p=>({...p,rank:'별도',score:null,recommendedPrice:p.recommendationClose??null,extraPick:true}));
const allRows=day=>[...(day.top10||[]),...pickExtras(day)];
const groupBy=(items,size)=>Array.from({length:Math.ceil(items.length/size)},(_,i)=>items.slice(i*size,(i+1)*size));

function stats(days){
 const rows=days.flatMap(day=>day.top10||[]);
 return {
  days:days.length,full:days.filter(day=>day.coverage==='complete').length,rows:rows.length,
  unique:new Set(rows.map(row=>row.code||row.name).filter(Boolean)).size,
  picks:days.reduce((sum,day)=>sum+(day.selectedPicks||[]).filter(p=>p.status==='user_confirmed').length,0),
 };
}
const metric=(name,value,{isPrice=false,waiting=false}={})=>{
 const display=isPrice?formatPrice(value):formatReturn(value);
 const shown=display==='—'&&waiting?'조회 중':display;
 return `<span class="top10h-metric ${isPrice?'price':tone(value)}"><small>${esc(name)}</small><b>${esc(shown)}</b></span>`;
};
function rowMarkup(day,row,record){
 const result=record?.rows?.get(row.symbol)||null;
 const loading=record?.status==='loading'||!record;
 const base=result?.base??row.recommendedPrice??row.recommendationClose??null;
 return `<div class="top10h-entry${selected(day,row)?' is-selected':''}">
   <div class="top10h-grid top10h-row">
     <span class="top10h-rank">${esc(row.rank||'-')}</span>
     <span class="top10h-stock"><strong>${esc(row.name||'-')}</strong><small>${esc(row.code||'코드 미확인')}${row.extraPick?' · TOP10 외 PICK':''}</small></span>
     <span class="top10h-score">${row.score==null?'—':esc(row.score)+'점'}</span>
     <span class="top10h-selected">${selected(day,row)?'PICK':''}</span>
   </div>
   <div class="top10h-perf-grid" aria-label="추천일 대비 수익률">
     ${metric(result?.adjusted?'추천가(조정)':'추천가',base,{isPrice:true,waiting:loading})}
     ${metric('평가 종가',result?.latest,{isPrice:true,waiting:loading})}
     ${metric('현재 수익률',result?.current,{waiting:loading})}
     ${metric('5거래일',result?.d5,{waiting:loading})}
     ${metric('20거래일',result?.d20,{waiting:loading})}
     ${metric('60거래일',result?.d60,{waiting:loading})}
   </div>
   ${result?.asOf?`<p class="top10h-asof">평가 기준 ${esc(result.asOf)} · ${result.adjusted?'조정종가 기준':'종가 기준'}</p>`:''}
 </div>`;
}
function dayMarkup(day,record){
 const isPartial=day.coverage!=='complete';
 const picks=day.selectedPicks||[];
 const rows=day.top10||[];
 const extras=pickExtras(day);
 const {average,evaluated,total}=averageTop10(day,record?.rows);
 const loading=!record||record.status==='loading';
 const averageText=average!==null?formatReturn(average):record?.status==='error'?'수익률 조회 실패':loading?'수익률 조회 중':'평가 가능한 수익률 없음';
 return `<article class="top10h-day${isPartial?' is-partial':''}" data-top10h-day="${esc(day.tradeDate)}">
   <header class="top10h-day-head">
    <div>
      <div class="top10h-date-line"><strong>${esc(day.tradeDate)}</strong><span class="top10h-coverage ${isPartial?'partial':'complete'}">${isPartial?'부분 기록':'TOP10 전체'}</span></div>
      <div class="top10h-picks">${picks.length?picks.map(p=>`<span class="top10h-pick ${p.status==='legacy_saved'?'legacy':''}">${p.status==='legacy_saved'?'저장':'선택'} · ${esc(p.name||p.code)}</span>`).join(''):'<span class="top10h-no-pick">최종 PICK 미확정</span>'}</div>
    </div>
    <span class="top10h-count">${rows.length}개</span>
   </header>
   <div class="top10h-day-performance" aria-live="polite">
     <div><span>${isPartial?'기록 평균':'TOP10 평균'} 수익률</span><strong class="${tone(average)}">${averageText}</strong><small>평가 ${evaluated}/${total}개 · 동일 가중 단순평균</small></div>
     ${record?.status==='error'||record?.status==='partial'?`<button type="button" class="top10h-retry" data-top10h-retry-day="${esc(day.tradeDate)}">${record.status==='error'?'재조회':'누락 재조회'}</button>`:''}
   </div>
   <div class="top10h-grid top10h-grid-head"><span>순위</span><span>종목</span><span>당시 점수</span><span>선택</span></div>
   <div class="top10h-rows">${rows.map(row=>rowMarkup(day,row,record)).join('')}</div>
   ${extras.length?`<div class="top10h-extra-head">TOP10 외 사용자 확정 PICK · 평균 수익률에 제외</div><div class="top10h-rows">${extras.map(row=>rowMarkup(day,row,record)).join('')}</div>`:''}
   ${day.note?`<p class="top10h-note">${esc(day.note)}</p>`:''}
 </article>`;
}

export async function renderTop10History({shell,bindNav,isCurrent=()=>true}){
 if(!isCurrent())return;
 const app=document.querySelector('#app');
 app.innerHTML=shell('<section class="top10h-intro"><span class="page-kicker">DAILY TOP10 ARCHIVE</span><h2>TOP10 히스토리</h2><p>그날 제시한 추천과 추천일 대비 수익률을 불러오고 있어요.</p></section><div class="top10h-loading">기록을 불러오고 있어요.</div>','TOP10 히스토리');
 bindNav();
 try{
  const data=await top10HistoryData();
  if(!isCurrent())return;
  const days=Array.isArray(data?.days)?data.days:[];
  const s=stats(days);
  app.innerHTML=shell(`
   <section class="top10h-intro"><span class="page-kicker">DAILY TOP10 ARCHIVE</span><h2>TOP10 히스토리</h2><p>추천일 종가 대비 현재·5·20·60거래일 수익률을 비교해요. 확인할 수 없는 날짜·가격은 추정하지 않아요.</p></section>
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
   <div class="top10h-meta"><span>파란 행 = 최종 PICK · 수익률은 배당·거래비용 제외, 동일 가중 평균</span><span>종가는 제공처 조정종가를 우선 사용해 같은 기준으로 계산해요. 5·20·60거래일이 지나지 않았다면 — 표시됩니다.</span></div>
   <div data-top10h-list></div>
  `,'TOP10 히스토리');
  bindNav();

  const search=app.querySelector('[data-top10h-search]');
  const coverage=app.querySelector('[data-top10h-coverage]');
  const sort=app.querySelector('[data-top10h-sort]');
  const list=app.querySelector('[data-top10h-list]');
  const perfByDate=new Map();
  let observer=null;

  const refreshDay=day=>{
    if(!list.isConnected)return;
    const el=[...list.querySelectorAll('[data-top10h-day]')].find(node=>node.dataset.top10hDay===day.tradeDate);
    if(el)el.outerHTML=dayMarkup(day,perfByDate.get(day.tradeDate));
  };

  const loadDay=async(day,force=false)=>{
    if(!list.isConnected)return;
    const prior=perfByDate.get(day.tradeDate);
    if(!force&&prior&&['loading','done','partial'].includes(prior.status))return;
    const rows=allRows(day).filter(row=>/^[0-9]{6}\.(KS|KQ)$/.test(String(row.symbol||'')));
    const unique=[...new Map(rows.map(row=>[row.symbol,row])).values()];
    const result={status:'loading',rows:new Map()};
    perfByDate.set(day.tradeDate,result);
    refreshDay(day);
    if(!unique.length){result.status='error';refreshDay(day);return;}
    const end=latestDate();
    const jobs=groupBy(unique,6).map(async group=>{
      const query=new URLSearchParams({tickers:group.map(row=>row.symbol).join(','),start:day.tradeDate,end});
      const payload=await api('/api/compare?'+query.toString(),{ttlMs:60000,timeoutMs:20000,retries:0,force});
      const lookup=new Map(group.map(row=>[row.symbol,row]));
      for(const stock of payload?.stocks||[]){
        const row=lookup.get(stock.ticker);
        if(row)result.rows.set(row.symbol,evaluateHistoryRow(row,stock,day.tradeDate));
      }
      return (payload?.errors||[]).length===0;
    });
    const settled=await Promise.allSettled(jobs);
    const failed=settled.some(state=>state.status==='rejected'||state.value===false);
    const evaluated=[...result.rows.values()].some(row=>row.current!==null);
    result.status=failed||result.rows.size<unique.length||!evaluated?(evaluated?'partial':'error'):'done';
    refreshDay(day);
  };

  const paint=()=>{
    const q=String(search?.value||'').trim().toLowerCase();
    let visible=days.filter(day=>coverage?.value==='all'||day.coverage===coverage?.value);
    if(q)visible=visible.filter(day=>[day.tradeDate,...allRows(day).flatMap(row=>[row.name,row.code])].filter(Boolean).join(' ').toLowerCase().includes(q));
    visible.sort((a,b)=>(sort?.value==='oldest'?1:-1)*(dateValue(a.tradeDate)-dateValue(b.tradeDate)));
    if(observer){observer.disconnect();observer=null;}
    list.innerHTML=visible.length?visible.map(day=>dayMarkup(day,perfByDate.get(day.tradeDate))).join(''):'<div class="top10h-empty">조건에 맞는 기록이 없어요.</div>';
    if(!visible.length)return;
    if(typeof IntersectionObserver==='undefined'){visible.slice(0,2).forEach(day=>void loadDay(day));return;}
    observer=new IntersectionObserver(entries=>{
      for(const entry of entries){
        if(!entry.isIntersecting)continue;
        observer?.unobserve(entry.target);
        const day=visible.find(value=>value.tradeDate===entry.target.dataset.top10hDay);
        if(day)void loadDay(day);
      }
    },{rootMargin:'450px 0px'});
    list.querySelectorAll('[data-top10h-day]').forEach(node=>observer.observe(node));
  };
  list.addEventListener('click',event=>{
    const btn=event.target.closest('[data-top10h-retry-day]');
    if(!btn)return;
    const day=days.find(value=>value.tradeDate===btn.dataset.top10hRetryDay);
    if(day)void loadDay(day,true);
  });
  search?.addEventListener('input',paint);
  coverage?.addEventListener('change',paint);
  sort?.addEventListener('change',paint);
  paint();
  return ()=>observer?.disconnect();
 }catch(error){
  if(!isCurrent())return;
  app.innerHTML=shell('<div class="empty" role="alert"><strong>TOP10 히스토리를 불러오지 못했어요.</strong><span>잠시 후 다시 확인해주세요.</span><button type="button" class="retry" data-top10h-retry>다시 시도</button></div>','TOP10 히스토리');
  bindNav();
  let retryCleanup=null,disposed=false;
  app.querySelector('[data-top10h-retry]')?.addEventListener('click',async()=>{
   const cleanup=await renderTop10History({shell,bindNav,isCurrent});
   if(disposed)cleanup?.();else retryCleanup=cleanup;
  },{once:true});
  return ()=>{disposed=true;retryCleanup?.();};
 }
}
