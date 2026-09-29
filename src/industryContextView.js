import './industryContextView.css';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>Number.isFinite(Number(v))?`${Number(v)>0?'+':''}${Number(v).toFixed(2)}%`:'—';
const ratio=v=>Number.isFinite(Number(v))?`${Math.round(Number(v)*100)}%`:'—';
const clip=(value,max=120)=>{const text=String(value||'').trim();return text.length>max?`${text.slice(0,max)}…`:text;};
const revenueAmount=(value,unit='')=>{
  const n=Number(value);
  if(!Number.isFinite(n))return '';
  const formatted=Math.abs(n)>=1_000_000?n.toLocaleString('ko-KR',{maximumFractionDigits:0}):n.toLocaleString('ko-KR',{maximumFractionDigits:1});
  return `${formatted}${unit?' '+unit:''}`;
};
function reportRevenueHtml(report){
  if(!report?.available||!Array.isArray(report.items)||!report.items.length)return '';
  const items=report.items.slice(0,4);
  const top=report.topItem||items[0];
  const maxShare=Math.max(...items.map(x=>Number(x?.share)||0),1);
  const sourceLabel=[report.source,report.reportYear?String(report.reportYear):'',report.basis].filter(Boolean).join(' · ');
  return `<section class="industry-report">
    <div class="industry-report-head">
      <div><span class="industry-kicker amber">DART</span><strong>사업보고서 매출 구조</strong></div>
      <button type="button" class="industry-source-link" data-external-url="${esc(report.sourceUrl||'')}" ${report.sourceUrl?'':'disabled'}>원문 보기</button>
    </div>
    <div class="industry-report-top"><span>매출 1위</span><strong>${esc(top?.name||'')}</strong><em>${Number.isFinite(Number(top?.share))?Number(top.share).toFixed(1)+'%':'—'}</em></div>
    <div class="industry-revenue-list">${items.map(item=>`
      <div class="industry-revenue-row">
        <div><span>${esc(item.name||'')}</span><strong>${Number.isFinite(Number(item.share))?Number(item.share).toFixed(1)+'%':'—'}</strong></div>
        <div class="industry-revenue-bar"><i style="width:${Math.max(3,Math.min(100,(Number(item.share)||0)/maxShare*100))}%"></i></div>
        ${Number.isFinite(Number(item.revenue))?`<small>${esc(revenueAmount(item.revenue,report.unit||''))}</small>`:''}
      </div>`).join('')}</div>
    <p class="industry-caption">${esc(sourceLabel||'DART 사업보고서')} · 공시 표에서 직접 계산/추출한 값만 표시해요.</p>
  </section>`;
}

function peer(row,meta=''){
  const change=Number(row?.change1d);
  return `<button class="industry-peer" data-stock-detail="${esc(row?.symbol)}" data-stock-name="${esc(row?.name)}">
    <span class="industry-peer-copy"><strong>${esc(row?.name||row?.symbol)}</strong><small>${esc(meta)}</small></span>
    ${Number.isFinite(change)?`<em class="${change>0?'up':change<0?'down':'flat'}">${pct(change)}</em>`:''}
  </button>`;
}

export function industryContextSkeleton(){
  return `<div class="industry-context-card is-loading">
    <div class="industry-skeleton-line wide"></div>
    <div class="industry-skeleton-line"></div>
    <div class="industry-skeleton-grid"><i></i><i></i><i></i><i></i></div>
  </div>`;
}

export function industryContextHtml(context,{collapsible=false,businessReport=null}={}){
  const sector=context?.sector||null;
  const supply=context?.supply||{};
  const industry=String(context?.industry||'').trim();
  const products=String(context?.mainProducts||'').trim();
  if(!industry&&!products&&!sector&&!supply?.peers?.length)return '';

  const reportHtml=reportRevenueHtml(businessReport);
  const company=`<section class="industry-section company">
    <div class="industry-section-head">
      <span class="industry-kicker blue">COMPANY</span>
      <strong>이 회사는 뭘 하나</strong>
      <small>${esc(industry||'업종 미제공')}</small>
    </div>
    <p class="industry-product">${esc(clip(products)||'KRX 주요제품 정보가 없어요.')}</p>
    <p class="industry-caption">${businessReport?.available?'KRX 주요제품 + DART 사업보고서 매출표를 함께 봐요.':'KRX ‘주요제품’ 기준 · 매출 1위는 DART 공시 표가 확인될 때만 표시해요.'}</p>
    ${reportHtml}
  </section>`;

  const sectorHtml=sector?`<section class="industry-section sector">
    <div class="industry-section-head">
      <span class="industry-kicker green">SECTOR</span>
      <strong>섹터 체온</strong>
      <span class="industry-status ${esc(sector.tone)}">${esc(sector.label)}</span>
    </div>
    <p class="industry-name">${esc(sector.industry)} <span>· 동일 업종 ${Number(sector.peerCount||0).toLocaleString()}개</span></p>
    <div class="industry-meter"><span style="width:${Math.max(0,Math.min(100,Math.round(Number(sector.upRatio||0)*100)))}%"></span></div>
    <div class="industry-metrics">
      <div><span>상승 종목</span><strong>${ratio(sector.upRatio)}</strong></div>
      <div><span>평균 등락</span><strong class="${Number(sector.avgChange)>0?'up':Number(sector.avgChange)<0?'down':'flat'}">${pct(sector.avgChange)}</strong></div>
      <div><span>상승추세</span><strong>${ratio(sector.trendRatio)}</strong></div>
      <div><span>거래량 2배+</span><strong>${ratio(sector.volumeSurgeRatio)}</strong></div>
    </div>
    ${sector.leaders?.length?`<div class="industry-peer-group"><small>같은 업종 당일 강세</small>${sector.leaders.map(x=>peer(x,'동일 업종')).join('')}</div>`:''}
  </section>`:'';

  const chainLabel=supply?.chainLabel?`${supply.chainLabel} · ${supply.stage||'관련기업'}`:(industry?'동일 업종 연결':'산업 연결 데이터 준비 중');
  const peers=Array.isArray(supply?.peers)?supply.peers:[];
  const supplyHtml=`<section class="industry-section supply">
    <div class="industry-section-head">
      <span class="industry-kicker purple">CHAIN</span>
      <strong>공급망 연관</strong>
      <small>${esc(chainLabel)}</small>
    </div>
    ${peers.length?`<div class="industry-peer-group">${peers.map(x=>peer(x,`${x.stage||x.relation||''}${x.relation?' · '+x.relation:''}`)).join('')}</div>`:'<p class="industry-empty">현재 분류에서 함께 볼 상장 종목을 찾지 못했어요.</p>'}
    <p class="industry-caption">직접 고객·납품 관계가 아니라 KRX 업종·주요제품을 기반으로 산업 단계가 가까운 종목을 연결해요.</p>
  </section>`;

  const body=`<div class="industry-context-body">${company}${sectorHtml}${supplyHtml}</div>`;
  if(!collapsible)return `<div class="industry-context-card expanded">${body}</div>`;
  return `<details class="industry-context-card" open>
    <summary><span>회사 · 섹터 · 공급망</span><strong>${sector?esc(sector.label):'확인'}</strong></summary>
    ${body}
  </details>`;
}
