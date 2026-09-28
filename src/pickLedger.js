import { homeBootstrap, pickMonitor } from './api.js';

const STATUS={
  SELL_REVIEW:{label:'매도검토',icon:'🔴',cls:'sell',order:0},
  WATCH:{label:'경계',icon:'🟡',cls:'watch',order:1},
  PENDING_REVIEW:{label:'검토 대기',icon:'⚪',cls:'pending',order:2},
  KEEP:{label:'유지',icon:'🟢',cls:'keep',order:3},
  EXIT:{label:'종료',icon:'✓',cls:'exit',order:4},
};
const esc=(value)=>String(value??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite=(value)=>{if(value==null||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;};
const pct=(value)=>{const n=finite(value);return n===null?'—':`${n>0?'+':''}${n.toFixed(2)}%`;};
const tone=(value)=>{const n=finite(value);return n===null||n===0?'flat':n>0?'up':'down';};
const dateValue=(value)=>{const t=Date.parse(`${String(value||'')}T00:00:00+09:00`);return Number.isFinite(t)?t:0;};

function symbolOf(row){return String(row?.symbol||row?.ticker||'').toUpperCase();}
function codeOf(row){return String(row?.code||symbolOf(row).split('.')[0]||'');}
function stockName(row,displayName){const symbol=symbolOf(row);return row?.name||displayName(symbol)||symbol||'종목';}
function statusMeta(status){return STATUS[status]||STATUS.PENDING_REVIEW;}
function price(value,row){
  const n=finite(value);if(n===null)return '—';
  const symbol=symbolOf(row),currency=String(row?.currency||'').toUpperCase();
  const isKrw=currency==='KRW'||/\.(KS|KQ)$/.test(symbol);
  if(isKrw)return `${Math.round(n).toLocaleString('ko-KR')}원`;
  if(currency==='USD'||(!currency&&symbol&&!/\.(KS|KQ)$/.test(symbol)))return `$${n.toLocaleString('en-US',{maximumFractionDigits:2})}`;
  return n.toLocaleString('ko-KR',{maximumFractionDigits:2});
}
function monitorKey(date,code,symbol){return `${String(date||'')}:${String(code||String(symbol||'').split('.')[0]||'')}`;}
function monitorFor(row,picks){
  const key=monitorKey(row?.recommendedDate,row?.code,row?.symbol);
  return picks.find((pick)=>String(pick?.pickId||monitorKey(pick?.pickDate,pick?.code,pick?.symbol))===key)||null;
}
function evidenceMarkup(pick){
  const evidence=Array.isArray(pick?.monitor?.evidence)?pick.monitor.evidence:[];
  if(!evidence.length)return '<p class="pick-ledger-muted">추천 이후 검증 가능한 신규 근거를 아직 확보하지 못했어요.</p>';
  return `<div class="pick-ledger-evidence">${evidence.slice(0,4).map((item)=>`
    <button type="button" data-external-url="${esc(item?.sourceUrl||'')}" class="pick-ledger-evidence-row">
      <span>${esc(item?.publishedAt||'')}</span>
      <strong>${esc(item?.sourceTitle||'검증 근거')}</strong>
      <small>${esc(item?.fact||'')}</small>
    </button>`).join('')}</div>`;
}

function rowMarkup(row,index,displayName){
  const pick=row?.monitor;
  const meta=statusMeta(pick?.status);
  const symbol=symbolOf(row);
  const name=stockName(row,displayName);
  const id=`pick-${String(row?.recommendedDate||'date')}-${String(row?.rank||index)}-${symbol||index}`.replace(/[^a-zA-Z0-9_-]/g,'-');
  const thesis=pick?.originalThesis?.summary
    ||(Array.isArray(pick?.originalThesis?.pillars)?pick.originalThesis.pillars.join(' · '):'')
    ||row?.reason
    ||'추천 당시 투자논리 기록이 없어요.';
  const review=pick?.monitor?.reason||'최신 점검 대기';
  const reviewed=pick?.monitor?.lastReviewedTradeDate||String(pick?.monitor?.lastReviewedAt||'').slice(0,10)||'—';
  return `<article class="pick-ledger-item ${meta.cls}">
    <button type="button" class="pick-ledger-row" data-pick-expand="${esc(id)}" aria-expanded="false">
      <span class="pick-ledger-rank">${Number(row?.rank)||index+1}</span>
      <span class="pick-ledger-stock"><strong>${esc(name)}</strong><small>${esc(symbol||row?.code||'')} · ${esc(row?.recommendedDate||'추천일 미제공')}</small></span>
      <span class="pick-ledger-status ${meta.cls}">${meta.icon} ${meta.label}</span>
      <span class="pick-ledger-return ${tone(row?.returnPct)}">${pct(row?.returnPct)}</span>
      <span class="pick-ledger-prices"><small>추천 ${esc(price(row?.recommendedPrice,row))}</small><b>→</b><small>현재 ${esc(price(row?.currentPrice,row))}</small></span>
      <span class="pick-ledger-secondary"><em class="${tone(row?.bestReturnPct)}">최고 ${pct(row?.bestReturnPct)}</em><em>점수 ${finite(row?.score)===null?'—':Math.round(Number(row.score))+'점'}</em></span>
      <span class="pick-ledger-chevron">⌄</span>
    </button>
    <div class="pick-ledger-detail" data-pick-detail="${esc(id)}" hidden>
      <div class="pick-ledger-detail-grid">
        <section><strong>추천 당시 이유</strong><p>${esc(row?.reason||'추천 사유가 기록되지 않았어요.')}</p></section>
        <section><strong>투자논리 기준선</strong><p>${esc(thesis)}</p></section>
        <section><strong>최근 점검</strong><p>${esc(review)}</p></section>
        <section><strong>검증 근거</strong>${evidenceMarkup(pick)}</section>
      </div>
      <div class="pick-ledger-detail-foot"><span>마지막 점검 ${esc(reviewed)} · 시세기준 ${esc(row?.lastUpdatedTradeDate||'—')}</span>${pick?.needsUserReview?'<strong>사용자 확인 필요</strong>':''}</div>
      ${symbol?`<button type="button" class="pick-ledger-detail-link" data-stock-detail="${esc(symbol)}">종목 상세 보기</button>`:''}
    </div>
  </article>`;
}

export async function renderPickLedger({shell,bindNav,displayName}){
  document.querySelector('#app').innerHTML=shell(`
    <section class="task-head pick-ledger-head"><div><span class="page-kicker">CHARTVIEW PICK</span><h2>PICK 관리</h2><p>누적 추천 성과와 추천 이후 투자논리 점검을 한 화면에서 관리해요.</p></div></section>
    <section class="pick-ledger-summary" id="pick-ledger-summary"><div class="skeleton quote"></div></section>
    <section class="pick-ledger-status-strip" id="pick-ledger-status-strip"><div class="skeleton quote"></div></section>
    <p class="pick-ledger-policy" id="pick-ledger-policy">매도검토는 자동 매도 확정이 아니며 가격·차트만으로 판정하지 않아요.</p>
    <section class="pick-ledger-toolbar" id="pick-ledger-toolbar" hidden>
      <label class="pick-ledger-search"><span>종목 검색</span><input id="pick-ledger-search" type="search" placeholder="종목명 · 코드" autocomplete="off"></label>
      <div class="pick-ledger-filters">
        <select id="pick-ledger-period" aria-label="기간 필터"><option value="all">기간 전체</option><option value="7">최근 7일</option><option value="30">최근 30일</option></select>
        <select id="pick-ledger-performance" aria-label="성과 필터"><option value="all">성과 전체</option><option value="win">수익 종목</option><option value="loss">손실 종목</option></select>
        <select id="pick-ledger-status" aria-label="점검 상태 필터"><option value="all">상태 전체</option><option value="SELL_REVIEW">🔴 매도검토</option><option value="WATCH">🟡 경계</option><option value="KEEP">🟢 유지</option><option value="PENDING_REVIEW">⚪ 검토 대기</option><option value="EXIT">종료</option></select>
        <select id="pick-ledger-sort" aria-label="정렬"><option value="latest">최신 추천순</option><option value="status">점검 우선순</option><option value="return">수익률 높은순</option><option value="best">최고수익률 높은순</option><option value="score">점수 높은순</option></select>
      </div>
    </section>
    <p class="pick-ledger-count" id="pick-ledger-count"></p>
    <section class="pick-ledger-list" id="pick-ledger-list"><div class="skeleton watch"></div><div class="skeleton watch"></div></section>
  `,'PICK 관리');
  bindNav();

  const summary=document.querySelector('#pick-ledger-summary');
  const statusStrip=document.querySelector('#pick-ledger-status-strip');
  const toolbar=document.querySelector('#pick-ledger-toolbar');
  const list=document.querySelector('#pick-ledger-list');
  const count=document.querySelector('#pick-ledger-count');

  try{
    const [payload,monitorResult]=await Promise.all([
      homeBootstrap(),
      pickMonitor().then((value)=>({ok:true,value})).catch(()=>({ok:false,value:null})),
    ]);
    const picks=Array.isArray(monitorResult.value?.picks)?monitorResult.value.picks:[];
    const rows=(Array.isArray(payload?.recommendations)?payload.recommendations:[]).map((row)=>({...row,monitor:monitorFor(row,picks)}));
    const evaluated=rows.filter((row)=>finite(row?.returnPct)!==null);
    const avg=evaluated.length?evaluated.reduce((sum,row)=>sum+Number(row.returnPct),0)/evaluated.length:null;
    const wins=evaluated.filter((row)=>Number(row.returnPct)>0).length;
    const winRate=evaluated.length?Math.round(wins/evaluated.length*100):null;
    const dayCount=new Set(rows.map((row)=>row?.recommendedDate).filter(Boolean)).size;
    const latest=evaluated.reduce((max,row)=>String(row?.lastUpdatedTradeDate||'')>max?String(row.lastUpdatedTradeDate):max,'');
    const latestPickDate=rows.reduce((max,row)=>String(row?.recommendedDate||'')>max?String(row.recommendedDate):max,'');
    const counts={KEEP:0,WATCH:0,SELL_REVIEW:0,PENDING_REVIEW:0,EXIT:0};
    rows.forEach((row)=>{const status=row.monitor?.status||'PENDING_REVIEW';counts[status]=(counts[status]||0)+1;});
    const reviewed=rows.filter((row)=>row.monitor?.monitor?.lastReviewedTradeDate).length;

    summary.innerHTML=`<div class="pick-ledger-kpis">
      <div><span>누적 추천일</span><b>${dayCount.toLocaleString('ko-KR')}</b></div>
      <div><span>누적 추천</span><b>${rows.length.toLocaleString('ko-KR')}건</b></div>
      <div><span>플러스 비율</span><b>${winRate===null?'—':winRate+'%'}</b><small>평가 ${evaluated.length}/${rows.length}건</small></div>
      <div><span>평균 수익률</span><b class="${tone(avg)}">${pct(avg)}</b><small>미평가 제외</small></div>
    </div><p class="pick-ledger-basis">${esc(latest||payload?.day?.tradeDate||'기준일 미확인')} 종가 기준 · 추천가 대비 현재가 단순 수익률</p>`;

    statusStrip.innerHTML=`<div class="pick-ledger-status-kpis">
      <div class="keep"><span>🟢 유지</span><b>${counts.KEEP}</b></div>
      <div class="watch"><span>🟡 경계</span><b>${counts.WATCH}</b></div>
      <div class="sell"><span>🔴 매도검토</span><b>${counts.SELL_REVIEW}</b></div>
      <div><span>⚪ 검토 대기</span><b>${counts.PENDING_REVIEW}</b></div>
    </div><p class="pick-ledger-basis">${monitorResult.ok?esc(`사후점검 ${String(monitorResult.value?.generatedAt||'').slice(0,10)||'기준일 미확인'} 기준 · 검토 완료 ${reviewed}/${rows.length}건`):'사후점검 데이터를 불러오지 못해 성과 기록만 표시 중이에요.'}</p>`;
    toolbar.hidden=false;

    const search=document.querySelector('#pick-ledger-search');
    const period=document.querySelector('#pick-ledger-period');
    const perf=document.querySelector('#pick-ledger-performance');
    const status=document.querySelector('#pick-ledger-status');
    const sort=document.querySelector('#pick-ledger-sort');

    function paint(){
      const q=search.value.trim().toLowerCase();
      let filtered=rows.filter((row)=>!q||`${row?.name||''} ${row?.code||''} ${symbolOf(row)}`.toLowerCase().includes(q));
      if(period.value!=='all'&&latestPickDate){
        const days=Number(period.value);
        const cutoff=dateValue(latestPickDate)-Math.max(0,days-1)*86400000;
        filtered=filtered.filter((row)=>dateValue(row?.recommendedDate)>=cutoff);
      }
      if(perf.value==='win')filtered=filtered.filter((row)=>(finite(row?.returnPct)||0)>0);
      if(perf.value==='loss')filtered=filtered.filter((row)=>(finite(row?.returnPct)||0)<0);
      if(status.value!=='all')filtered=filtered.filter((row)=>(row.monitor?.status||'PENDING_REVIEW')===status.value);
      const latestSort=(a,b)=>dateValue(b?.recommendedDate)-dateValue(a?.recommendedDate)||(Number(a?.rank)||99)-(Number(b?.rank)||99);
      if(sort.value==='status')filtered.sort((a,b)=>statusMeta(a.monitor?.status).order-statusMeta(b.monitor?.status).order||latestSort(a,b));
      else if(sort.value==='return')filtered.sort((a,b)=>(finite(b?.returnPct)??-Infinity)-(finite(a?.returnPct)??-Infinity)||latestSort(a,b));
      else if(sort.value==='best')filtered.sort((a,b)=>(finite(b?.bestReturnPct)??-Infinity)-(finite(a?.bestReturnPct)??-Infinity)||latestSort(a,b));
      else if(sort.value==='score')filtered.sort((a,b)=>(finite(b?.score)??-Infinity)-(finite(a?.score)??-Infinity)||latestSort(a,b));
      else filtered.sort(latestSort);

      count.textContent=`${filtered.length.toLocaleString('ko-KR')}개 PICK 기록`;
      list.innerHTML=filtered.length?filtered.map((row,index)=>rowMarkup(row,index,displayName)).join(''):'<div class="empty compact"><strong>조건에 맞는 PICK 기록이 없어요.</strong></div>';
      list.querySelectorAll('[data-pick-expand]').forEach((button)=>button.addEventListener('click',(event)=>{
        if(event.target.closest('[data-stock-detail],[data-external-url]'))return;
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
    period.addEventListener('change',paint);
    perf.addEventListener('change',paint);
    status.addEventListener('change',paint);
    sort.addEventListener('change',paint);
    paint();
  }catch(error){
    summary.innerHTML='<div class="empty compact"><strong>PICK 성과를 불러오지 못했어요.</strong><span>잠시 후 다시 확인해주세요.</span></div>';
    statusStrip.innerHTML='';
    list.innerHTML='';
    count.textContent='';
  }
}
