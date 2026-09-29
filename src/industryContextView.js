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
const evidenceDate=value=>{
  if(!value)return '';
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return '';
  return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
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
    <div class="industry-report-top"><span>${report.basis==='사업부문별 매출'?'매출 1위 사업부문':'실제 매출 1위'}</span><strong>${esc(top?.name||'')}</strong><em>${Number.isFinite(Number(top?.share))?Number(top.share).toFixed(1)+'%':'—'}</em></div>
    ${top?.detail?`<p class="industry-report-detail">${esc(clip(top.detail,150))}</p>`:''}
    <div class="industry-revenue-list">${items.map(item=>`
      <div class="industry-revenue-row">
        <div><span>${esc(item.name||'')}</span><strong>${Number.isFinite(Number(item.share))?Number(item.share).toFixed(1)+'%':'—'}</strong></div>
        <div class="industry-revenue-bar"><i style="width:${Math.max(3,Math.min(100,(Number(item.share)||0)/maxShare*100))}%"></i></div>
        ${Number.isFinite(Number(item.revenue))?`<small>${esc(revenueAmount(item.revenue,report.unit||''))}</small>`:''}
      </div>`).join('')}</div>
    <p class="industry-caption">${esc(sourceLabel||'DART 사업보고서')} · 공시 표에서 직접 확인한 값만 표시해요.${report.hasConsolidationAdjustment?' 연결조정을 반영한 매출을 기준으로 계산해 부문 비중의 합은 100%를 넘을 수 있어요.':''}</p>
  </section>`;
}

function directRelationsHtml(relations){
  const rows=(Array.isArray(relations)?relations:[]).slice(0,4);
  if(!rows.length)return '';
  return `<div class="industry-direct-relations">
    <div class="industry-direct-head">
      <span><b>확인된 직접 관계</b><em>근거 있음</em></span>
      <small>뉴스·수주·고객사 근거</small>
    </div>
    <div class="industry-direct-list">${rows.map(row=>`
      <article class="industry-direct-row">
        <button class="industry-direct-company" data-stock-detail="${esc(row.counterpartySymbol||'')}" data-stock-name="${esc(row.counterpartyName||'')}">
          <strong>${esc(row.counterpartyName||row.counterpartySymbol||'')}</strong>
          <span>${esc(row.relationLabel||'직접 관계')}</span>
        </button>
        <p>${esc(clip(row.headline||row.evidencePreview||'',100))}</p>
        <div><small>${esc([row.source,evidenceDate(row.publishedAt)].filter(Boolean).join(' · '))}</small>
        ${row.url?`<button type="button" class="industry-source-link" data-external-url="${esc(row.url)}">근거 보기</button>`:''}</div>
      </article>`).join('')}</div>
    <p class="industry-caption">상장사명과 수주·납품·고객사 등 직접 거래 키워드가 같은 뉴스 근거에서 확인될 때만 표시해요.</p>
  </div>`;
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

const enrichmentMessage=(state,kind)=>{
  const messages=kind==='report'?{
    loading:'DART 사업보고서 매출 구조 확인 중 · 첫 조회는 공시 확인에 시간이 걸릴 수 있어요.',
    unavailable:'DART 공시에서 확인 가능한 매출 구조가 없어요.',
    error:'DART 공시를 불러오지 못했어요. 잠시 후 다시 확인해주세요.',
  }:{
    loading:'직접 관계 근거 확인 중',
    error:'직접 관계 근거를 확인하지 못했어요.',
  };
  return messages[state]||'';
};
const enrichmentStatus=(state,kind)=>{
  const message=enrichmentMessage(state,kind);
  return message?`<p class="industry-enrichment-status ${state}" role="status" aria-live="polite">${message}</p>`:'';
};

export function industryContextHtml(context,{collapsible=false,open=false,businessReport=null,directRelations=[],reportState='idle',relationsState='idle'}={}){
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
    <p class="industry-caption">${businessReport?.available?'KRX 주요제품 + DART 사업보고서 매출표를 함께 봐요.':'KRX ‘주요제품’ 기준 · 실제 매출 1위는 DART 공시가 확인될 때만 표시해요.'}</p>
    ${enrichmentStatus(reportState,'report')}
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
  const directHtml=directRelationsHtml(directRelations);
  const supplyHtml=`<section class="industry-section supply">
    <div class="industry-section-head">
      <span class="industry-kicker purple">CHAIN</span>
      <strong>산업 · 공급망 연결</strong>
      <small>${esc(chainLabel)}</small>
    </div>
    ${directHtml}
    ${enrichmentStatus(relationsState,'relations')}
    <div class="industry-adjacent-head"><b>산업상 연관 후보</b><span>분류 기반</span></div>
    ${peers.length?`<div class="industry-peer-group">${peers.map(x=>peer(x,`${x.stage||x.relation||''}${x.relation?' · '+x.relation:''}`)).join('')}</div>`:'<p class="industry-empty">현재 분류에서 함께 볼 상장 종목을 찾지 못했어요.</p>'}
    <p class="industry-caption">이 목록은 KRX 업종·주요제품 기반의 산업상 인접 후보예요. 직접 고객·납품 관계로 해석하지 않아요.</p>
  </section>`;

  const body=`<div class="industry-context-body">${company}${sectorHtml}${supplyHtml}</div>`;
  if(!collapsible)return `<div class="industry-context-card expanded">${body}</div>`;
  return `<details class="industry-context-card" data-industry-context${open?' open':''}>
    <summary><span>회사 · 섹터 · 공급망 보기</span><strong>${sector?esc(sector.label):'확인'}</strong></summary>
    ${body}
  </details>`;
}
