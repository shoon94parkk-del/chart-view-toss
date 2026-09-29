import { screenerData, companyContextData, businessReportData, relationshipEvidenceData } from './api.js';
import { buildInvestmentIdeas, ideaCoverage } from './ideaEngine.js';
import { industryContextHtml } from './industryContextView.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>Number.isFinite(Number(v))?`${Number(v)>0?'+':''}${Number(v).toFixed(2)}%`:'—';
const price=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('ko-KR',{maximumFractionDigits:2}):'—';

function candidateRow(row){
  const change=Number(row.change1d);
  return `<article class="idea-candidate-wrap" data-idea-symbol="${esc(row.symbol)}" data-idea-name="${esc(row.name)}">
    <button class="idea-candidate" data-stock-detail="${esc(row.symbol)}" data-stock-name="${esc(row.name)}">
      <span class="idea-candidate-main"><strong>${esc(row.name)}</strong><small>${esc(row.symbol)}${row.market?' · '+esc(row.market):''}${row.context?.industry?' · '+esc(row.context.industry):''}</small></span>
      <span class="idea-candidate-price"><strong>${price(row.price)}</strong><em class="${change>0?'up':change<0?'down':'flat'}">${pct(row.change1d)}</em></span>
      <span class="idea-reasons">${row.reasons.map(reason=>`<i>${esc(reason)}</i>`).join('')}</span>
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
          result.relationsState='ready';
        },()=>{result.relationsState='error';}).then(repaint),
      ]);
    });
  }
}

export async function renderIdeaView({shell,bindNav}){
  document.querySelector('#app').innerHTML=shell(`
    <section class="idea-hero">
      <span class="page-kicker">IDEA LAB · BETA</span>
      <h2>종목 하나가 아니라<br><em>산업 흐름</em>까지 봐요</h2>
      <p>기술적 신호를 시작점으로 회사의 실제 매출 구조, 같은 업종의 동반 강도, 근거가 확인된 직접 관계까지 이어서 확인해요.</p>
    </section>
    <section class="idea-guide">
      <div><strong>분석 흐름</strong><span>기술 신호 → 실제 매출구조 → 섹터 체온 → 공급망/직접관계</span></div>
      <small>종목별 상세 정보는 필요한 종목만 펼쳐서 불러와요. 직접 관계는 뉴스·수주·고객사 근거가 있을 때만 별도 표시해요.</small>
    </section>
    <div id="idea-body" class="idea-grid"><div class="skeleton idea-skeleton"></div><div class="skeleton idea-skeleton"></div></div>
  `,'투자 아이디어');
  bindNav();
  const host=document.querySelector('#idea-body');
  try{
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
    if(!ideas.length){
      host.innerHTML='<div class="empty"><strong>지금 조건에서 포착된 아이디어가 없어요</strong><span>다음 스크리너 갱신 뒤 다시 확인해주세요.</span></div>';
      return;
    }
    host.innerHTML=`
      <p class="idea-meta">기준 거래일 <strong>${esc(coverage.tradeDate||'미제공')}</strong> · 수집 ${coverage.total.toLocaleString()}개 · 회사정보 ${companyCoverage.toLocaleString()}개</p>
      <div class="idea-card-list">${ideas.map(ideaCard).join('')}</div>
      <section class="idea-next"><strong>현재 분석 방식</strong><span>DART 사업보고서로 실제 매출 1위 제품·매출 비중을 확인하고, 직접 공급망 관계는 최근 뉴스에서 상장사명과 수주·납품·고객사 근거가 함께 확인될 때만 표시해요.</span></section>
    `;
    bindNav();
    bindLazyIdeaContext(host,ideas,bindNav);
  }catch(error){
    if(!host?.isConnected)return;
    host.innerHTML=`<div class="empty"><strong>투자 아이디어 데이터를 불러오지 못했어요</strong><span>${esc(error?.message||'잠시 후 다시 시도해주세요.')}</span><button class="retry" id="retry-ideas">다시 시도</button></div>`;
    document.querySelector('#retry-ideas')?.addEventListener('click',()=>renderIdeaView({shell,bindNav}));
  }
}
