import { selectionKey } from './valueDiscovery.js';
import {technicalWarning} from './insightModel.js';
import { homeBootstrap, pickMonitor } from './api.js';
import { loadingIndicator } from './loadingView.js';

const STATUS={
  SELL_REVIEW:{label:'기업 근거 재점검',icon:'🔴',cls:'sell',order:0},
  WATCH:{label:'경계',icon:'🟡',cls:'watch',order:1},
  PENDING_REVIEW:{label:'검토 대기',icon:'⚪',cls:'pending',order:2},
  KEEP:{label:'유지',icon:'🟢',cls:'keep',order:3},
  EXIT:{label:'종료',icon:'✓',cls:'exit',order:4},
};
const TECH_STATUS={
  TECH_SELL_REVIEW:{label:'강한 기술 경고',icon:'🔴',cls:'tech-sell',order:0},
  TECH_CAUTION:{label:'기술 경고',icon:'🟠',cls:'tech-caution',order:1},
  TECH_IMPROVING:{label:'기술 개선',icon:'🟢',cls:'tech-improving',order:2},
  TECH_NORMAL:{label:'기술 중립',icon:'',cls:'tech-normal',order:3},
};
const esc=(value)=>String(value??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite=(value)=>{if(value==null||String(value).trim()==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;};
const pct=(value)=>{const n=finite(value);return n===null?'—':`${n>0?'+':''}${n.toFixed(2)}%`;};
const tone=(value)=>{const n=finite(value);return n===null||n===0?'flat':n>0?'up':'down';};
const dateValue=(value)=>{const t=Date.parse(`${String(value||'')}T00:00:00+09:00`);return Number.isFinite(t)?t:0;};

function symbolOf(row){return String(row?.symbol||row?.ticker||'').toUpperCase();}
function codeOf(row){return String(row?.code||symbolOf(row).split('.')[0]||'');}
function stockName(row,displayName){const symbol=symbolOf(row);return row?.name||displayName(symbol)||symbol||'종목';}
export function statusMeta(status){return STATUS[status]||STATUS.PENDING_REVIEW;}
function technicalMeta(signal){return TECH_STATUS[signal]||TECH_STATUS.TECH_NORMAL;}
function technicalOrder(row){return technicalMeta(row?.monitor?.technical?.signal).order;}
export function actionStatus(row){
  const fundamental=row?.monitor?.status||'PENDING_REVIEW';
  const technical=row?.monitor?.technical?.signal||'TECH_NORMAL';
  if(fundamental==='SELL_REVIEW'||technical==='TECH_SELL_REVIEW')return 'SELL_REVIEW';
  if(fundamental==='WATCH'||technical==='TECH_CAUTION')return 'WATCH';
  if(fundamental==='EXIT')return 'EXIT';
  if(fundamental==='KEEP')return 'KEEP';
  return 'PENDING_REVIEW';
}
function price(value,row){
  const n=finite(value);if(n===null)return '—';
  const symbol=symbolOf(row),currency=String(row?.currency||'').toUpperCase();
  const isKrw=currency==='KRW'||/\.(KS|KQ)$/.test(symbol);
  if(isKrw)return `${Math.round(n).toLocaleString('ko-KR')}원`;
  if(currency==='USD'||(!currency&&symbol&&!/\.(KS|KQ)$/.test(symbol)))return `$${n.toLocaleString('en-US',{maximumFractionDigits:2})}`;
  return n.toLocaleString('ko-KR',{maximumFractionDigits:2});
}
function monitorKey(date,code,symbol){return `${String(date||'')}:${String(code||String(symbol||'').split('.')[0]||'')}`;}
export function monitorFor(row,picks){
  const key=monitorKey(row?.recommendedDate,row?.code,row?.symbol);
  return picks.find((pick)=>String(pick?.pickId||monitorKey(pick?.pickDate,pick?.code,pick?.symbol))===key)||null;
}
export function technicalMarkup(pick){
  const tech=pick?.technical;
  if(!tech||finite(tech?.score)===null)return '<p class="pick-ledger-muted">기술점수 비교 데이터가 아직 없어요.</p>';
  const meta=technicalMeta(tech?.signal);
  const current=Math.round(Number(tech.score));
  const previous=finite(tech?.previousScore);
  const delta=finite(tech?.dayDelta);
  const reasons=Array.isArray(tech?.reasons)?tech.reasons.filter(Boolean):[];
  return `<div class="pick-ledger-tech-detail ${meta.cls}">
    <div class="pick-ledger-tech-line"><strong>${meta.icon} ${esc(meta.label)}</strong><span>${previous===null?'전일 비교 없음':Math.round(previous)+' → '+current+'점'}${delta===null?'':` (${delta>0?'+':''}${delta.toFixed(0)})`}</span></div>
    <div class="pick-ledger-tech-metrics"><span>RSI ${finite(tech?.rsi14)===null?'—':Number(tech.rsi14).toFixed(1)}</span><span>5일 ${pct(tech?.ret5)}</span><span>20일 ${pct(tech?.ret20)}</span><span>당일 ${pct(tech?.change1d)}</span></div>
    ${reasons.length?`<p>${esc(reasons.join(' · '))}</p>`:''}
    <small>펀더멘털 점검 상태와 별도인 단기 기술 신호예요.</small>
  </div>`;
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

export function selectionScorePresentation(row){
  const score=finite(row?.score);
  return {label:score===null?'선정 점수 미제공':`선정 점수 ${Math.round(score)}점`,
    source:row?.analysisSource||'선정 점수 출처 미제공',
    note:score===null?'이 선정 기록에는 점수가 제공되지 않았어요.':(score===0?'0점은 원자료에 기록된 값이에요. ':'선정 당시 기록된 값이에요. ')+'계산 산식과 척도가 제공되지 않아 현재 기술점수·점검 상태와 직접 비교하지 않아요.'};
}

function technicalAlertRows(rows,displayName){
 return rows.map(row=>`<button type="button" class="pick-alert-record" data-pick-alert-key="${esc(selectionKey(row))}"><b>${esc(stockName(row,displayName))} · ${esc(row.recommendedDate)}</b><small>${esc(technicalWarning([row]))}</small><span>해당 기록 확인 →</span></button>`).join('');
}

function rowMarkup(row,index,displayName){
  const score=selectionScorePresentation(row);
  const pick=row?.monitor;
  const meta=statusMeta(pick?.status||pick?.monitor?.status||'PENDING_REVIEW');
  const technical=technicalMeta(pick?.technical?.signal);
  const symbol=symbolOf(row);
  const name=stockName(row,displayName);
  const id=`pick-${String(row?.recommendedDate||'date')}-${String(row?.rank||index)}-${symbol||index}`.replace(/[^a-zA-Z0-9_-]/g,'-');
  const thesis=pick?.originalThesis?.summary
    ||(Array.isArray(pick?.originalThesis?.pillars)?pick.originalThesis.pillars.join(' · '):'')
    ||row?.reason
    ||'추천 당시 투자논리 기록이 없어요.';
  const review=pick?.monitor?.reason||'새 기업 근거 확인 전 · 근거 검토 대기';
  const reviewed=pick?.monitor?.lastReviewedTradeDate||String(pick?.monitor?.lastReviewedAt||'').slice(0,10)||'—';
  return `<article class="pick-ledger-item ${meta.cls}" data-pick-key="${esc(selectionKey(row))}">
    <button type="button" class="pick-ledger-row" data-pick-expand="${esc(id)}" aria-expanded="false">
      <span class="pick-ledger-stock"><strong>${esc(name)}</strong><small>${esc(symbol||row?.code||'')} · ${esc(row?.recommendedDate||'추천일 미제공')}</small></span>
      <span class="pick-ledger-status-stack"><span class="pick-ledger-status ${meta.cls}" aria-label="기업 근거 상태 · ${esc(meta.label)}">${meta.icon} ${meta.label}</span>${pick?.technical?.signal&&technical.order<2?`<span class="pick-ledger-tech-status ${technical.cls}" aria-label="가격·거래 기술 신호 · ${esc(technical.label)}">기술 · ${technical.label}</span>`:''}</span>
      <span class="pick-ledger-prices"><small>추천 ${esc(price(row?.recommendedPrice,row))}</small><b>→</b><small>점검가 ${esc(price(row?.currentPrice,row))}</small></span>
      <span class="pick-ledger-performance"><span class="pick-ledger-return ${tone(row?.returnPct)}">${pct(row?.returnPct)}</span><span class="pick-ledger-secondary"><em class="${tone(row?.bestReturnPct)}">최고 ${pct(row?.bestReturnPct)}</em></span><span class="pick-ledger-chevron">⌄</span></span>
    </button>
    <div class="pick-ledger-detail" data-pick-detail="${esc(id)}" hidden>
      <div class="pick-ledger-detail-grid">
        <section><strong>추천 당시 이유</strong><p>${esc(row?.reason||'추천 사유가 기록되지 않았어요.')}</p></section>
        ${thesis.trim()!==String(row?.reason||'').trim()?`<section><strong>투자논리 기준선</strong><p>${esc(thesis)}</p></section>`:''}
        <section><strong>기업 근거 점검</strong><p>원자료 상태 · ${esc(pick?.status||pick?.monitor?.status||'PENDING_REVIEW')} ${(pick?.status||pick?.monitor?.status)==='SELL_REVIEW'?'· 매도검토':''}</p></section><section><strong>최근 점검</strong><p>${esc(review)}</p></section>
        <section data-pick-score-basis><strong>선정 점수 · 출처</strong><p>${esc(score.label)} · ${esc(score.source)}</p><p>${esc(score.note)}</p></section>
        <section><strong>단기 기술 신호</strong><p>원자료 신호 · ${esc(pick?.technical?.signal||'TECH_NORMAL')} ${pick?.technical?.signal==='TECH_SELL_REVIEW'?'· 단기 매도 검토':''}</p>${technicalMarkup(pick)}</section>
        <section><strong>검증 근거</strong>${evidenceMarkup(pick)}</section>
      </div>
      <div class="pick-ledger-detail-foot"><span>마지막 점검 ${esc(reviewed)} · 시세기준 ${esc(row?.lastUpdatedTradeDate||'—')}</span>${pick?.needsUserReview?'<strong>사용자 확인 필요</strong>':''}</div>
      ${symbol?`<button type="button" class="pick-ledger-detail-link" data-stock-detail="${esc(symbol)}">종목 상세 보기</button>`:''}
    </div>
  </article>`;
}

export async function renderPickLedger({shell,bindNav,displayName,focusKey=null}){
  document.querySelector('#app').innerHTML=shell(`
    <section class="task-head pick-ledger-head"><div><span class="page-kicker">CHARTVIEW</span><h2>선정 기록·성과</h2><p>과거에 선정한 이유와 이후 성과·점검 내용을 확인해요. 실시간 인기 순위가 아니에요.</p></div></section>
    <section class="pick-ledger-overview" aria-label="성과·상태 요약">
      <section class="pick-ledger-summary" id="pick-ledger-summary">${loadingIndicator('선정 기록을 불러오고 있어요')}<div class="skeleton quote"></div></section>
      <section class="pick-ledger-status-strip" id="pick-ledger-status-strip">${loadingIndicator('점검 상태를 확인하고 있어요')}<div class="skeleton quote"></div></section>
    </section>
    <div class="pick-ledger-notices">
      <details class="pick-ledger-tech-alert" id="pick-ledger-tech-alert" hidden><summary data-pick-tech-alert-summary>가격·거래 경고</summary><div data-pick-tech-alert-body></div></details>
      <details class="pick-ledger-policy" id="pick-ledger-policy"><summary>신호 안내 · 자동 매도 아님</summary><p>매도검토는 자동 매도 확정이 아니며 가격·차트만으로 판정하지 않아요. 단기 기술 경고는 펀더멘털 매도검토와 별도이며 기술 경고만으로 자동 매도 확정하지 않아요.</p></details>
    </div>
    <p class="pick-ledger-focus-note" role="status"></p>
    <div class="pick-ledger-list-tools">
      <p class="pick-ledger-count" id="pick-ledger-count"></p>
      <details class="pick-ledger-calculation"><summary>집계 기준</summary><div data-pick-calculation></div></details>
      <details class="pick-ledger-search-options"><summary>검색·필터</summary><section class="pick-ledger-toolbar" id="pick-ledger-toolbar" hidden>
        <label class="pick-ledger-search"><span>종목 검색</span><input id="pick-ledger-search" type="search" placeholder="종목명 · 코드" autocomplete="off"></label>
        <div class="pick-ledger-filters">
          <select id="pick-ledger-period" aria-label="기간 필터"><option value="all">기간 전체</option><option value="7">최근 7일</option><option value="30">최근 30일</option></select>
          <select id="pick-ledger-performance" aria-label="성과 필터"><option value="all">성과 전체</option><option value="win">수익 종목</option><option value="loss">손실 종목</option></select>
          <select id="pick-ledger-status" aria-label="점검 우선순위 필터"><option value="all">기업·기술 신호 전체</option><option value="SELL_REVIEW">기업 근거 재점검 / 강한 기술 경고</option><option value="WATCH">🟡 경계</option><option value="KEEP">🟢 유지</option><option value="PENDING_REVIEW">⚪ 검토 대기</option><option value="EXIT">종료</option></select>
          <select id="pick-ledger-sort" aria-label="정렬"><option value="latest">최신 추천순</option><option value="technical">단기 경고 우선</option><option value="status">기업·기술 점검 우선순</option><option value="return">수익률 높은순</option><option value="best">최고수익률 높은순</option><option value="score">과거 선정 점수순</option></select>
        </div>
      </section></details>
    </div>
    <section class="pick-ledger-list" id="pick-ledger-list">${loadingIndicator('종목 목록을 불러오고 있어요')}<div class="skeleton watch"></div><div class="skeleton watch"></div></section>
  `,'선정 기록·성과');
  bindNav();

  const summary=document.querySelector('#pick-ledger-summary');
  const statusStrip=document.querySelector('#pick-ledger-status-strip');
  const techAlert=document.querySelector('#pick-ledger-tech-alert');
  const toolbar=document.querySelector('#pick-ledger-toolbar');
  const list=document.querySelector('#pick-ledger-list');
  const count=document.querySelector('#pick-ledger-count');

  try{
    const [payload,monitorResult]=await Promise.all([
      homeBootstrap(),
      pickMonitor().then((value)=>({ok:true,value})).catch(()=>({ok:false,value:null})),
    ]);
    if(!list.isConnected)return;
    let focusApplied=false;
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
    rows.forEach((row)=>{const status=actionStatus(row);counts[status]=(counts[status]||0)+1;});
    const reviewed=rows.filter((row)=>row.monitor?.monitor?.lastReviewedTradeDate).length;
    const techSell=rows.filter((row)=>row.monitor?.technical?.signal==='TECH_SELL_REVIEW');
    const techCaution=rows.filter((row)=>row.monitor?.technical?.signal==='TECH_CAUTION');

    summary.innerHTML=`<div class="pick-ledger-kpis">
      <div><span>누적 추천일</span><b>${dayCount.toLocaleString('ko-KR')}</b></div>
      <div><span>누적 추천</span><b>${rows.length.toLocaleString('ko-KR')}건</b></div>
      <div><span>플러스 비율</span><b>${winRate===null?'—':winRate+'%'}</b><small>평가 ${evaluated.length}/${rows.length}건</small></div>
      <div><span>평균 수익률</span><b class="${tone(avg)}">${pct(avg)}</b><small>미평가 제외</small></div>
    </div><p class="pick-ledger-basis">${esc(latest||payload?.day?.tradeDate||'기준일 미확인')} 종가 기준 · 추천가 대비 현재가 단순 수익률</p>`;

    statusStrip.innerHTML=`<div class="pick-ledger-status-kpis">
      <div class="keep"><span>🟢 유지</span><b>${counts.KEEP}</b></div>
      <div class="watch"><span>🟡 경계</span><b>${counts.WATCH}</b></div>
      <div class="sell"><span>🔴 재점검 우선</span><b>${counts.SELL_REVIEW}</b></div>
      <div><span>⚪ 검토 대기</span><b>${counts.PENDING_REVIEW}</b></div>
    </div><p class="pick-ledger-basis">${monitorResult.ok?esc(`사후점검 ${String(monitorResult.value?.generatedAt||'').slice(0,10)||'기준일 미확인'} 기준 · 신호등은 펀더멘털과 단기 기술신호 중 더 높은 위험도를 반영 · 자동 점검 실행 ${reviewed}/${rows.length}건 · 근거 검토 대기는 별도 표시`):'사후점검 데이터를 불러오지 못해 성과 기록만 표시 중이에요.'}</p>`;
    document.querySelector('[data-pick-calculation]').innerHTML=[summary,statusStrip].map(node=>`<p>${esc(node.querySelector('.pick-ledger-basis').textContent)}</p>`).join('');
    const warningRows=rows.filter(row=>['TECH_SELL_REVIEW','TECH_CAUTION'].includes(row.monitor?.technical?.signal));
    techAlert.hidden=!warningRows.length;
    techAlert.classList.toggle('caution',!techSell.length);
    const techAlertSummary=techAlert.querySelector('[data-pick-tech-alert-summary]');
    const techAlertBody=techAlert.querySelector('[data-pick-tech-alert-body]');
    if(techAlertSummary)techAlertSummary.innerHTML=warningRows.length?`<strong>가격·거래 경고</strong><span>강한 경고 ${techSell.length} · 기술 경고 ${techCaution.length}</span>`:'가격·거래 경고';
    if(techAlertBody)techAlertBody.innerHTML=warningRows.length?technicalAlertRows(warningRows,displayName):'';
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
      if(status.value!=='all')filtered=filtered.filter((row)=>actionStatus(row)===status.value);
      const latestSort=(a,b)=>dateValue(b?.recommendedDate)-dateValue(a?.recommendedDate)||(Number(a?.rank)||99)-(Number(b?.rank)||99);
      if(sort.value==='technical')filtered.sort((a,b)=>technicalOrder(a)-technicalOrder(b)||latestSort(a,b));
      else if(sort.value==='status')filtered.sort((a,b)=>statusMeta(actionStatus(a)).order-statusMeta(actionStatus(b)).order||latestSort(a,b));
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
      if(focusKey&&!focusApplied){
        focusApplied=true;
        const article=[...list.querySelectorAll('[data-pick-key]')].find(el=>el.dataset.pickKey===focusKey);
        if(article){
          const button=article.querySelector('[data-pick-expand]');button.click();
          requestAnimationFrame(()=>{if(article.isConnected){article.scrollIntoView({block:'start'});button.focus({preventScroll:true});}});
        }else document.querySelector('.pick-ledger-focus-note').textContent='요청한 날짜의 선정 기록을 찾지 못했어요. 다른 기록을 대신 열지 않았어요.';
      }
    }
    search.addEventListener('input',paint);
    period.addEventListener('change',paint);
    perf.addEventListener('change',paint);
    status.addEventListener('change',paint);
    sort.addEventListener('change',paint);
    paint();
    techAlert.querySelectorAll('[data-pick-alert-key]').forEach(button=>button.onclick=()=>{
      search.value='';period.value='all';perf.value='all';status.value='all';paint();
      const article=[...list.querySelectorAll('[data-pick-key]')].find(el=>el.dataset.pickKey===button.dataset.pickAlertKey);
      const expand=article?.querySelector('[data-pick-expand]');
      if(!expand)return;
      if(expand.getAttribute('aria-expanded')!=='true')expand.click();
      article.scrollIntoView({block:'start'});expand.focus({preventScroll:true});
    });
  }catch(error){
    if(!list.isConnected)return;
    summary.innerHTML='<div class="empty compact"><strong>PICK 성과를 불러오지 못했어요.</strong><span>잠시 후 다시 확인해주세요.</span></div>';
    statusStrip.innerHTML='';
    techAlert.hidden=true;
    techAlert.innerHTML='';
    list.innerHTML='';
    count.textContent='';
  }
}
