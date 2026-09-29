import { screenerData, companyContextData } from './api.js';
import { buildInvestmentIdeas, ideaCoverage } from './ideaEngine.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>Number.isFinite(Number(v))?`${Number(v)>0?'+':''}${Number(v).toFixed(2)}%`:'—';
const price=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('ko-KR',{maximumFractionDigits:2}):'—';
const ratio=v=>Number.isFinite(Number(v))?`${Math.round(Number(v)*100)}%`:'—';
const clip=(value,max=118)=>{const text=String(value||'').trim();return text.length>max?`${text.slice(0,max)}…`:text;};

function peerButton(row,meta=''){
  const change=Number(row.change1d);
  return `<button class="idea-peer" data-stock-detail="${esc(row.symbol)}" data-stock-name="${esc(row.name)}">
    <span><strong>${esc(row.name)}</strong><small>${esc(meta)}</small></span>
    <em class="${change>0?'up':change<0?'down':'flat'}">${pct(row.change1d)}</em>
  </button>`;
}

function companyContextBlock(row){
  const context=row.context||{};
  const sector=context.sector;
  const supply=context.supply||{};
  const product=context.mainProducts;
  const industry=context.industry;
  if(!product&&!industry&&!sector&&!supply?.peers?.length){
    return `<details class="idea-context"><summary>회사·섹터·공급망 보기 <span>데이터 갱신 중</span></summary>
      <div class="idea-context-empty">KRX 업종·주요제품 데이터가 새 스크리너에 반영되면 자동으로 채워져요.</div>
    </details>`;
  }
  const sectorBlock=sector?`<section class="idea-context-section">
    <div class="idea-context-title"><b>섹터 체온</b><span class="sector-badge ${esc(sector.tone)}">${esc(sector.label)}</span></div>
    <p><strong>${esc(sector.industry)}</strong> · 동일 업종 ${sector.peerCount.toLocaleString()}개</p>
    <div class="sector-metrics"><span>상승 종목 <b>${ratio(sector.upRatio)}</b></span><span>평균 등락 <b>${pct(sector.avgChange)}</b></span><span>상승추세 <b>${ratio(sector.trendRatio)}</b></span><span>거래량 2배+ <b>${ratio(sector.volumeSurgeRatio)}</b></span></div>
    ${sector.leaders?.length?`<div class="idea-peer-list"><small>같은 업종 당일 강세 종목</small>${sector.leaders.map(peer=>peerButton(peer,'동일 업종')).join('')}</div>`:''}
  </section>`:'';

  const supplyPeers=Array.isArray(supply.peers)?supply.peers:[];
  const supplyTitle=supply.chainLabel?`${supply.chainLabel} · ${supply.stage||'관련기업'}`:(industry?'동일 업종 연결':'산업 연결 데이터 준비 중');
  const supplyBlock=`<section class="idea-context-section">
    <div class="idea-context-title"><b>공급망 연관</b><span>${esc(supplyTitle)}</span></div>
    ${supplyPeers.length?`<div class="idea-peer-list">${supplyPeers.map(peer=>peerButton(peer,`${peer.stage||peer.relation||''} · ${peer.relation||''}`)).join('')}</div>`:'<p class="idea-context-muted">현재 분류에서 함께 볼 상장 종목을 찾지 못했어요.</p>'}
    <small class="idea-context-note">직접 고객·납품 관계를 뜻하지 않아요. KRX 업종·주요제품을 바탕으로 산업 단계가 가까운 종목을 연결해요.</small>
  </section>`;

  return `<details class="idea-context">
    <summary>회사·섹터·공급망 보기 <span>${sector?esc(sector.label):'확인'}</span></summary>
    <section class="idea-context-section company-focus">
      <div class="idea-context-title"><b>이 회사는 뭘 하나</b><span>${esc(industry||'업종 미제공')}</span></div>
      <p>${esc(clip(product)||'KRX 주요제품 정보가 없어요.')}</p>
      <small class="idea-context-note">현재는 KRX의 ‘주요제품’ 기준이에요. 실제 매출 1위 품목·매출 비중은 공시 연동 전까지 임의로 추정하지 않아요.</small>
    </section>
    ${sectorBlock}
    ${supplyBlock}
  </details>`;
}

function candidateRow(row){
  const change=Number(row.change1d);
  return `<article class="idea-candidate-wrap">
    <button class="idea-candidate" data-stock-detail="${esc(row.symbol)}" data-stock-name="${esc(row.name)}">
      <span class="idea-candidate-main"><strong>${esc(row.name)}</strong><small>${esc(row.symbol)}${row.market?' · '+esc(row.market):''}${row.context?.industry?' · '+esc(row.context.industry):''}</small></span>
      <span class="idea-candidate-price"><strong>${price(row.price)}</strong><em class="${change>0?'up':change<0?'down':'flat'}">${pct(row.change1d)}</em></span>
      <span class="idea-reasons">${row.reasons.map(reason=>`<i>${esc(reason)}</i>`).join('')}</span>
    </button>
    ${companyContextBlock(row)}
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
