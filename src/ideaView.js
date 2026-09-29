import { screenerData } from './api.js';
import { buildInvestmentIdeas, ideaCoverage } from './ideaEngine.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>Number.isFinite(Number(v))?`${Number(v)>0?'+':''}${Number(v).toFixed(2)}%`:'—';
const price=v=>Number.isFinite(Number(v))?Number(v).toLocaleString('ko-KR',{maximumFractionDigits:2}):'—';

function candidateRow(row){
  const change=Number(row.change1d);
  return `<button class="idea-candidate" data-stock-detail="${esc(row.symbol)}" data-stock-name="${esc(row.name)}">
    <span class="idea-candidate-main"><strong>${esc(row.name)}</strong><small>${esc(row.symbol)}${row.market?' · '+esc(row.market):''}</small></span>
    <span class="idea-candidate-price"><strong>${price(row.price)}</strong><em class="${change>0?'up':change<0?'down':'flat'}">${pct(row.change1d)}</em></span>
    <span class="idea-reasons">${row.reasons.map(reason=>`<i>${esc(reason)}</i>`).join('')}</span>
  </button>`;
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
      <h2>숫자에서<br><em>다음 조사거리</em>를 찾아요</h2>
      <p>최신 장마감 스크리너의 기술적 패턴을 조합해 투자 아이디어의 출발점을 보여줘요.</p>
    </section>
    <section class="idea-guide">
      <div><strong>현재 버전</strong><span>거래량 · RSI · 이동평균 · MACD · 52주 고점 기반</span></div>
      <small>뉴스 원인이나 산업 연쇄효과는 아직 자동으로 붙이지 않아요. 확인 가능한 숫자만 사용해요.</small>
    </section>
    <div id="idea-body" class="idea-grid"><div class="skeleton idea-skeleton"></div><div class="skeleton idea-skeleton"></div></div>
  `,'투자 아이디어');
  bindNav();
  const host=document.querySelector('#idea-body');
  try{
    const data=await screenerData();
    const ideas=buildInvestmentIdeas(data,{limit:4,perIdea:4});
    const coverage=ideaCoverage(data);
    if(!host?.isConnected)return;
    if(!ideas.length){
      host.innerHTML='<div class="empty"><strong>지금 조건에서 포착된 아이디어가 없어요</strong><span>다음 스크리너 갱신 뒤 다시 확인해주세요.</span></div>';
      return;
    }
    host.innerHTML=`
      <p class="idea-meta">기준 거래일 <strong>${esc(coverage.tradeDate||'미제공')}</strong> · 수집 ${coverage.total.toLocaleString()}개 · 지표 사용 가능 ${coverage.usable.toLocaleString()}개</p>
      <div class="idea-card-list">${ideas.map(ideaCard).join('')}</div>
      <section class="idea-next"><strong>다음 버전에서 붙일 것</strong><span>섹터 동반 강세 → 관련 뉴스 → 공급망/연관 종목 → 기존 PICK 변화까지 연결</span></section>
    `;
    bindNav();
  }catch(error){
    if(!host?.isConnected)return;
    host.innerHTML=`<div class="empty"><strong>투자 아이디어 데이터를 불러오지 못했어요</strong><span>${esc(error?.message||'잠시 후 다시 시도해주세요.')}</span><button class="retry" id="retry-ideas">다시 시도</button></div>`;
    document.querySelector('#retry-ideas')?.addEventListener('click',()=>renderIdeaView({shell,bindNav}));
  }
}
