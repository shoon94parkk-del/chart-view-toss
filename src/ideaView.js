import { screenerData, companyContextData, businessReportData, relationshipEvidenceData, pickMonitor } from './api.js';
import { buildInvestmentIdeas, ideaCoverage } from './ideaEngine.js';
import { industryContextHtml } from './industryContextView.js';
import { loadingIndicator } from './loadingView.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>Number.isFinite(Number(v))?`${Number(v)>0?'+':''}${Number(v).toFixed(2)}%`:'—';
const price=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('ko-KR',{maximumFractionDigits:2}):'—';

const monitorSeverity=(pick)=>{
  const technical=String(pick?.technical?.signal||'');
  const fundamental=String(pick?.status||'');
  if(fundamental==='SELL_REVIEW'||technical==='TECH_SELL_REVIEW')return 3;
  if(fundamental==='WATCH'||technical==='TECH_CAUTION')return 2;
  if(fundamental==='KEEP')return 1;
  return 0;
};
const monitorSummary=(pick)=>{
  if(!pick)return null;
  const severity=monitorSeverity(pick);
  if(severity===3)return {label:pick?.technical?.signal==='TECH_SELL_REVIEW'?'사후점검 · 단기 매도 검토':'사후점검 · 매도 검토',cls:'sell',note:(pick?.technical?.reasons||[]).slice(0,2).join(' · ')||pick?.monitor?.reason||'사후점검에서 주의 신호가 확인됐어요.'};
  if(severity===2)return {label:'사후점검 · 경계',cls:'watch',note:(pick?.technical?.reasons||[]).slice(0,2).join(' · ')||pick?.monitor?.reason||'사후점검에서 경계 신호가 확인됐어요.'};
  if(severity===1)return {label:'사후점검 · 유지',cls:'keep',note:pick?.monitor?.reason||''};
  return {label:'사후점검 · 검토 대기',cls:'pending',note:pick?.monitor?.reason||''};
};
const latestMonitorBySymbol=(payload)=>{
  const result=new Map();
  for(const pick of Array.isArray(payload?.picks)?payload.picks:[]){
    const symbol=String(pick?.symbol||'').toUpperCase();
    if(!symbol)continue;
    const current=result.get(symbol);
    const pickDate=String(pick?.technical?.tradeDate||pick?.monitor?.lastReviewedTradeDate||pick?.pickDate||'');
    const currentDate=String(current?.technical?.tradeDate||current?.monitor?.lastReviewedTradeDate||current?.pickDate||'');
    const severity=monitorSeverity(pick),currentSeverity=monitorSeverity(current);
    if(!current||severity>currentSeverity||(severity===currentSeverity&&pickDate>currentDate))result.set(symbol,pick);
  }
  return result;
};
function candidateRow(row){
  const change=Number(row.change1d);
  return `<article class="idea-candidate-wrap" data-idea-symbol="${esc(row.symbol)}" data-idea-name="${esc(row.name)}">
    <button class="idea-candidate" data-stock-detail="${esc(row.symbol)}" data-stock-name="${esc(row.name)}">
      <span class="idea-candidate-main"><strong>${esc(row.name)}</strong><small>${esc(row.symbol)}${row.market?' · '+esc(row.market):''}${row.context?.industry?' · '+esc(row.context.industry):''}</small></span>
      <span class="idea-candidate-price"><strong>${price(row.price)}</strong><em class="${change>0?'up':change<0?'down':'flat'}">${pct(row.change1d)}</em></span>
      <span class="idea-reasons">${row.reasons.map(reason=>`<i>${esc(reason)}</i>`).join('')}</span>
      ${row.monitorStatus?`<span class="idea-monitor-status ${esc(row.monitorStatus.cls)}"><b>${esc(row.monitorStatus.label)}</b>${row.monitorStatus.note?`<small>${esc(row.monitorStatus.note)}</small>`:''}</span>`:''}
    </button>
    ${industryContextHtml(row.context,{collapsible:true,open:false})}
  </article>`;
}

function ideaCard(idea,index){
  return `<article class="idea-card tone-${index%4}">
    <div class="idea-card-head"><span class="idea-icon">${esc(idea.icon)}</span><div><small>${esc(idea.strength)}</small><h3>${esc(idea.title)}</h3></div></div>
    <p class="idea-summary">${esc(idea.summary)}</p>
    <div class="idea-candidates">${idea.candidates.map(candidateRow).join('')}</div>
    <div class="idea-checks"><div><b>다음 확인</b><span>${esc(idea.confirm)}</span></div><div><b>반대 신호</b><span>${esc(idea.invalidate)}</span></div></div>
  </article>`;
}

function applyMonitorStatuses(host,ideas,monitorPayload){
  if(!host?.isConnected)return;
  const monitorBySymbol=latestMonitorBySymbol(monitorPayload);
  for(const idea of ideas){
    for(const row of idea.candidates||[]){
      const status=monitorSummary(monitorBySymbol.get(String(row.symbol||'').toUpperCase()));
      if(!status)continue;
      const wrap=host.querySelector(`[data-idea-symbol="${CSS.escape(String(row.symbol||''))}"]`);
      const button=wrap?.querySelector('.idea-candidate');
      const reasons=button?.querySelector('.idea-reasons');
      if(!button||!reasons)continue;
      let badge=button.querySelector('.idea-monitor-status');
      if(!badge){
        badge=document.createElement('span');
        badge.className='idea-monitor-status';
        reasons.insertAdjacentElement('afterend',badge);
      }
      badge.className=`idea-monitor-status ${status.cls}`;
      badge.innerHTML=`<b>${esc(status.label)}</b>${status.note?`<small>${esc(status.note)}</small>`:''}`;
    }
  }
}

function bindLazyIdeaContext(host,ideas,bindNav){
  const bySymbol=new Map();
  for(const idea of ideas){
    for(const row of idea.candidates||[])bySymbol.set(String(row.symbol||'').toUpperCase(),row);
  }

  for(const details of host.querySelectorAll('details[data-industry-context]')){
    details.addEventListener('toggle',async()=>{
      if(!details.open||details.dataset.enrichmentState)return;
      const wrap=details.closest('.idea-candidate-wrap');
      const symbol=String(wrap?.dataset?.ideaSymbol||'').toUpperCase();
      const name=String(wrap?.dataset?.ideaName||'');
      const row=bySymbol.get(symbol);
      if(!wrap||!row)return;

      let current=details;
      const result={report:null,reportState:'loading',directRelations:[],relationsState:'loading'};
      const repaint=()=>{
        if(!wrap.isConnected)return;
        const html=industryContextHtml(row.context,{
          collapsible:true,
          open:current.open,
          businessReport:result.report,
          directRelations:result.directRelations,
          reportState:result.reportState,
          relationsState:result.relationsState,
        });
        current.outerHTML=html;
        current=wrap.querySelector('details[data-industry-context]');
        if(!current)return;
        const loading=result.reportState==='loading'||result.relationsState==='loading';
        current.dataset.enrichmentState=loading?'loading':'loaded';
        current.classList.toggle('is-enriching',loading);
        bindNav();
      };
      repaint();
      await Promise.all([
        businessReportData(symbol,name).then(report=>{
          result.report=report?.available?report:null;
          result.reportState=report?.available?'ready':'unavailable';
        },()=>{result.reportState='error';}).then(repaint),
        relationshipEvidenceData(symbol,name).then(evidence=>{
          result.directRelations=evidence?.available?evidence.relations||[]:[];
          result.relationsState=['provider_timeout','news_provider_unavailable'].includes(evidence?.reason)?'unavailable':'ready';
        },()=>{result.relationsState='error';}).then(repaint),
      ]);
    });
  }
}

export async function renderIdeaView({shell,bindNav}){
  document.querySelector('#app').innerHTML=shell(`
    <section class="idea-hero">
      <span class="page-kicker">IDEA LAB · BETA</span>
      <h2>조건에 맞는 종목을 찾고<br><em>근거를 확인해요</em></h2>
      <p>거래가 활발한 종목의 기술 신호와 공시·산업 자료를 이어서 살펴봐요.</p>
    </section>
    <details class="idea-guide"><summary>선정 기준과 분석 흐름 보기</summary><div><strong>분석 흐름</strong><span>기술 신호 → 실제 매출 구조 → 최근 5거래일 비교군 → 거래 단서</span></div><p>20일 평균 거래대금 10억원 이상을 대상으로 해요. 상세 자료는 종목을 펼칠 때 불러와요.</p></details>
    <div id="idea-body" class="idea-grid" aria-busy="true">${loadingIndicator('조건에 맞는 종목을 찾고 있어요')}<div class="idea-loading-preview" aria-hidden="true"><div class="skeleton idea-skeleton-title"></div><div class="skeleton idea-skeleton-row"></div><div class="skeleton idea-skeleton-row"></div></div></div>
  `,'투자 아이디어');
  bindNav();
  const host=document.querySelector('#idea-body');
  try{
    const monitorPromise=pickMonitor().catch(()=>null);
    const [data,companyMeta]=await Promise.all([
      screenerData(),
      companyContextData().catch(()=>null),
    ]);
    const metaBySymbol=new Map((companyMeta?.companies||[]).map(row=>[String(row.symbol||'').toUpperCase(),row]));
    const enrichedData={
      ...data,
      stocks:(data?.stocks||[]).map(row=>{
        const meta=metaBySymbol.get(String(row.symbol||'').toUpperCase());
        if(!meta)return row;
        return {...row,industry:meta.industry||row.industry||'',mainProducts:meta.mainProducts||row.mainProducts||''};
      }),
    };
    const ideas=buildInvestmentIdeas(enrichedData,{limit:4,perIdea:4});
    const coverage=ideaCoverage(enrichedData);
    const companyCoverage=(enrichedData?.stocks||[]).filter(row=>row?.industry||row?.mainProducts).length;
    if(!host?.isConnected)return;
    host.setAttribute('aria-busy','false');
    if(!ideas.length){
      host.innerHTML='<div class="empty"><strong>지금 조건에서 포착된 아이디어가 없어요</strong><span>다음 스크리너 갱신 뒤 다시 확인해주세요.</span></div>';
      return;
    }
    const candidateCount=new Set(ideas.flatMap(idea=>idea.candidates.map(row=>row.symbol))).size;
    host.innerHTML=`
      <div class="idea-results-head"><strong>확인할 종목 ${candidateCount}개</strong><span>${esc(coverage.tradeDate||'거래일 확인 중')} 종가 기준</span></div>
      <p class="idea-meta">${ideas.length}개 관찰 패턴 · 20일 평균 거래대금 10억원 이상 · 수집 ${coverage.total.toLocaleString()}개 · 회사정보 ${companyCoverage.toLocaleString()}개</p>
      <div class="idea-card-list">${ideas.map(ideaCard).join('')}</div>
      <section class="idea-next"><strong>현재 분석 방식</strong><span>아이디어 패턴과 추천 사후점검은 다른 차원의 정보예요. 과거 선정 이력이 있는 종목은 사후점검 상태를 같은 카드에 함께 표시해 모순처럼 보이지 않게 했어요. DART 사업보고서·원문 근거도 함께 확인해주세요.</span></section>
    `;
    bindNav();
    bindLazyIdeaContext(host,ideas,bindNav);
    void monitorPromise.then(payload=>applyMonitorStatuses(host,ideas,payload));
  }catch(error){
    if(!host?.isConnected)return;
    host.setAttribute('aria-busy','false');
    host.innerHTML=`<div class="empty"><strong>투자 아이디어 데이터를 불러오지 못했어요</strong><span>${esc(error?.message||'잠시 후 다시 시도해주세요.')}</span><button class="retry" id="retry-ideas">다시 시도</button></div>`;
    document.querySelector('#retry-ideas')?.addEventListener('click',()=>renderIdeaView({shell,bindNav}));
  }
}
