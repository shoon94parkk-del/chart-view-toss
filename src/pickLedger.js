import { homeBootstrap } from './api.js';

const esc=(value)=>String(value??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite=(value)=>{if(value==null||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;};
const pct=(value)=>{const n=finite(value);return n===null?'—':`${n>0?'+':''}${n.toFixed(2)}%`;};
const tone=(value)=>{const n=finite(value);return n===null||n===0?'flat':n>0?'up':'down';};
const dateValue=(value)=>{const t=Date.parse(`${String(value||'')}T00:00:00+09:00`);return Number.isFinite(t)?t:0;};

function symbolOf(row){return String(row?.symbol||row?.ticker||'').toUpperCase();}
function stockName(row,displayName){const symbol=symbolOf(row);return row?.name||displayName(symbol)||symbol||'종목';}
function price(value,row){
  const n=finite(value);if(n===null)return '—';
  const symbol=symbolOf(row),currency=String(row?.currency||'').toUpperCase();
  const isKrw=currency==='KRW'||/\.(KS|KQ)$/.test(symbol);
  if(isKrw)return `${Math.round(n).toLocaleString('ko-KR')}원`;
  if(currency==='USD'||(!currency&&symbol&&!/\.(KS|KQ)$/.test(symbol)))return `$${n.toLocaleString('en-US',{maximumFractionDigits:2})}`;
  return n.toLocaleString('ko-KR',{maximumFractionDigits:2});
}

function rowMarkup(row,index,displayName){
  const symbol=symbolOf(row);
  const name=stockName(row,displayName);
  const id=`pick-${String(row?.recommendedDate||'date')}-${String(row?.rank||index)}-${symbol||index}`.replace(/[^a-zA-Z0-9_-]/g,'-');
  return `<article class="pick-ledger-item">
    <button type="button" class="pick-ledger-row" data-pick-expand="${esc(id)}" aria-expanded="false">
      <span class="pick-ledger-rank">${Number(row?.rank)||index+1}</span>
      <span class="pick-ledger-stock"><strong>${esc(name)}</strong><small>${esc(symbol||row?.code||'')} · ${esc(row?.recommendedDate||'추천일 미제공')}</small></span>
      <span class="pick-ledger-return ${tone(row?.returnPct)}">${pct(row?.returnPct)}</span>
      <span class="pick-ledger-prices"><small>추천 ${esc(price(row?.recommendedPrice,row))}</small><b>→</b><small>현재 ${esc(price(row?.currentPrice,row))}</small></span>
      <span class="pick-ledger-secondary"><em class="${tone(row?.bestReturnPct)}">최고 ${pct(row?.bestReturnPct)}</em><em>점수 ${finite(row?.score)===null?'—':Math.round(Number(row.score))+'점'}</em></span>
      <span class="pick-ledger-chevron">⌄</span>
    </button>
    <div class="pick-ledger-detail" data-pick-detail="${esc(id)}" hidden>
      <div class="pick-ledger-detail-tags">${row?.grade?`<span>${esc(row.grade)}</span>`:''}${row?.statusLabel?`<span>${esc(row.statusLabel)}</span>`:''}</div>
      <p>${esc(row?.reason||'추천 사유가 기록되지 않았어요.')}</p>
      ${symbol?`<button type="button" class="pick-ledger-detail-link" data-stock-detail="${esc(symbol)}">종목 상세 보기</button>`:''}
    </div>
  </article>`;
}

export async function renderPickLedger({shell,bindNav,displayName}){
  document.querySelector('#app').innerHTML=shell(`
    <section class="task-head pick-ledger-head"><div><span class="page-kicker">CHARTVIEW PICK</span><h2>추천 기록</h2><p>선정 당시 가격부터 현재 수익률까지 추천 건별로 확인해요.</p></div></section>
    <section class="pick-ledger-summary" id="pick-ledger-summary"><div class="skeleton quote"></div></section>
    <section class="pick-ledger-toolbar" id="pick-ledger-toolbar" hidden>
      <label class="pick-ledger-search"><span>종목 검색</span><input id="pick-ledger-search" type="search" placeholder="종목명 · 코드" autocomplete="off"></label>
      <div class="pick-ledger-filters">
        <select id="pick-ledger-performance" aria-label="성과 필터"><option value="all">전체 성과</option><option value="win">수익 종목</option><option value="loss">손실 종목</option></select>
        <select id="pick-ledger-sort" aria-label="정렬"><option value="latest">최신 추천순</option><option value="return">수익률 높은순</option><option value="best">최고수익률 높은순</option><option value="score">점수 높은순</option></select>
      </div>
    </section>
    <p class="pick-ledger-count" id="pick-ledger-count"></p>
    <section class="pick-ledger-list" id="pick-ledger-list"><div class="skeleton watch"></div><div class="skeleton watch"></div></section>
  `,'추천 기록');
  bindNav();

  const summary=document.querySelector('#pick-ledger-summary');
  const toolbar=document.querySelector('#pick-ledger-toolbar');
  const list=document.querySelector('#pick-ledger-list');
  const count=document.querySelector('#pick-ledger-count');
  try{
    const payload=await homeBootstrap();
    const rows=Array.isArray(payload?.recommendations)?payload.recommendations:[];
    const evaluated=rows.filter((row)=>finite(row?.returnPct)!==null);
    const avg=evaluated.length?evaluated.reduce((sum,row)=>sum+Number(row.returnPct),0)/evaluated.length:null;
    const wins=evaluated.filter((row)=>Number(row.returnPct)>0).length;
    const winRate=evaluated.length?Math.round(wins/evaluated.length*100):null;
    const dayCount=new Set(rows.map((row)=>row?.recommendedDate).filter(Boolean)).size;
    const latest=evaluated.reduce((max,row)=>String(row?.lastUpdatedTradeDate||'')>max?String(row.lastUpdatedTradeDate):max,'');

    summary.innerHTML=`<div class="pick-ledger-kpis">
      <div><span>누적 추천</span><b>${rows.length.toLocaleString('ko-KR')}건</b><small>${dayCount?dayCount.toLocaleString('ko-KR')+'개 추천일':'추천일 집계 중'}</small></div>
      <div><span>평균 수익률</span><b class="${tone(avg)}">${pct(avg)}</b><small>미평가 제외</small></div>
      <div><span>플러스 비율</span><b>${winRate===null?'—':winRate+'%'}</b><small>평가 ${evaluated.length}/${rows.length}건</small></div>
    </div><p class="pick-ledger-basis">${esc(latest||payload?.day?.tradeDate||'기준일 미확인')} 종가 기준 · 추천가 대비 현재가 단순 수익률</p>`;
    toolbar.hidden=false;

    const search=document.querySelector('#pick-ledger-search');
    const perf=document.querySelector('#pick-ledger-performance');
    const sort=document.querySelector('#pick-ledger-sort');

    function paint(){
      const q=search.value.trim().toLowerCase();
      let filtered=rows.filter((row)=>!q||`${row?.name||''} ${row?.code||''} ${symbolOf(row)}`.toLowerCase().includes(q));
      if(perf.value==='win')filtered=filtered.filter((row)=>(finite(row?.returnPct)||0)>0);
      if(perf.value==='loss')filtered=filtered.filter((row)=>(finite(row?.returnPct)||0)<0);
      const latestSort=(a,b)=>dateValue(b?.recommendedDate)-dateValue(a?.recommendedDate)||(Number(a?.rank)||99)-(Number(b?.rank)||99);
      if(sort.value==='return')filtered.sort((a,b)=>(finite(b?.returnPct)??-Infinity)-(finite(a?.returnPct)??-Infinity)||latestSort(a,b));
      else if(sort.value==='best')filtered.sort((a,b)=>(finite(b?.bestReturnPct)??-Infinity)-(finite(a?.bestReturnPct)??-Infinity)||latestSort(a,b));
      else if(sort.value==='score')filtered.sort((a,b)=>(finite(b?.score)??-Infinity)-(finite(a?.score)??-Infinity)||latestSort(a,b));
      else filtered.sort(latestSort);

      count.textContent=`${filtered.length.toLocaleString('ko-KR')}개 추천 기록`;
      list.innerHTML=filtered.length?filtered.map((row,index)=>rowMarkup(row,index,displayName)).join(''):'<div class="empty compact"><strong>조건에 맞는 추천 기록이 없어요.</strong></div>';
      list.querySelectorAll('[data-pick-expand]').forEach((button)=>button.addEventListener('click',(event)=>{
        if(event.target.closest('[data-stock-detail]'))return;
        const id=button.dataset.pickExpand;
        const detail=list.querySelector(`[data-pick-detail="${CSS.escape(id)}"]`);
        if(!detail)return;
        const open=detail.hidden;
        detail.hidden=!open;
        button.setAttribute('aria-expanded',String(open));
      }));
      bindNav();
    }
    search.addEventListener('input',paint);
    perf.addEventListener('change',paint);
    sort.addEventListener('change',paint);
    paint();
  }catch(error){
    summary.innerHTML='<div class="empty compact"><strong>추천 성과를 불러오지 못했어요.</strong><span>잠시 후 다시 확인해주세요.</span></div>';
    list.innerHTML='';
    count.textContent='';
  }
}
