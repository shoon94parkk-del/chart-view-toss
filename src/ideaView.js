import { screenerData, companyContextData } from './api.js';
import { buildInvestmentIdeas, ideaCoverage } from './ideaEngine.js';
import { industryContextHtml } from './industryContextView.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>Number.isFinite(Number(v))?`${Number(v)>0?'+':''}${Number(v).toFixed(2)}%`:'—';
const price=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('ko-KR',{maximumFractionDigits:2}):'—';
function candidateRow(row){
  const change=Number(row.change1d);
  return `<article class="idea-candidate-wrap">
    <button class="idea-candidate" data-stock-detail="${esc(row.symbol)}" data-stock-name="${esc(row.name)}">
      <span class="idea-candidate-main"><strong>${esc(row.name)}</strong><small>${esc(row.symbol)}${row.market?' · '+esc(row.market):''}${row.context?.industry?' · '+esc(row.context.industry):''}</small></span>
      <span class="idea-candidate-price"><strong>${price(row.price)}</strong><em class="${change>0?'up':change<0?'down':'flat'}">${pct(row.change1d)}</em></span>
      <span class="idea-reasons">${row.reasons.map(reason=>`<i>${esc(reason)}</i>`).join('')}</span>
    </button>
    ${industryContextHtml(row.context,{collapsible:true})}
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

export async function renderIdeaView({shell,bindNav}){
  document.querySelector('#app').innerHTML=shell(`
    <section class="idea-hero">
      <span class="page-kicker">IDEA LAB · BETA</span>
      <h2>종목 하나가 아니라<br><em>산업 흐름</em>까지 봐요</h2>
      <p>기술적 신호를 시작점으로 회사의 주요제품, 같은 업종의 동반 강도, 공급망 인접 종목까지 이어서 확인해요.</p>
    </section>
    <section class="idea-guide">
      <div><strong>분석 흐름</strong><span>기술 신호 → 회사 주요제품 → 섹터 체온 → 공급망 인접군</span></div>
      <small>업종·주요제품은 KRX KIND 기준이고, 공급망은 직접 거래관계가 아니라 산업 단계 연결이에요.</small>
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
      <section class="idea-next"><strong>다음 고도화</strong><span>사업보고서 매출 비중을 연결해 ‘실제 매출 1위 제품’까지 확인하고, 뉴스/수주/고객사 근거가 있을 때만 직접 공급망 관계를 별도로 표시할 예정이에요.</span></section>
    `;
    bindNav();
  }catch(error){
    if(!host?.isConnected)return;
    host.innerHTML=`<div class="empty"><strong>투자 아이디어 데이터를 불러오지 못했어요</strong><span>${esc(error?.message||'잠시 후 다시 시도해주세요.')}</span><button class="retry" id="retry-ideas">다시 시도</button></div>`;
    document.querySelector('#retry-ideas')?.addEventListener('click',()=>renderIdeaView({shell,bindNav}));
  }
}
