// Opt-in archive reader. Never accesses private GitHub or executes LLM calls.
import { api } from './api.js';
const SAFE_STAGES = new Set(['phase1','attack','rebuttal','final','audit','context']);
const ROLES = new Set(['mer','nonggu','meng','other']);
const STATUSES = new Set(['COMPLETED','PARTIAL','BLOCKED']);
const TICKER = /^[A-Z0-9.\-^]{1,18}$/;
const escapeHtml = x => String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp = x => typeof x==='string' && /(?:Z|[+-]\d\d:\d\d)$/.test(x) && Number.isFinite(Date.parse(x));
const filename = x => typeof x==='string' && x.startsWith('records/debates/') && x.endsWith('.md') && !x.includes('..') && x.length<260;
const stageLabel = {phase1:'1차 독립 분석',attack:'공격',rebuttal:'반론·답변',final:'최종 평가',audit:'검증 기록',context:'배경'};
const roleLabel = {mer:'메르',nonggu:'농구천재',meng:'멍이',other:'기록'};
export const debateDashboardEnabled=()=>import.meta.env?.VITE_DEBATE_DASHBOARD_ENABLED==='1';
export function validateDebateArchive(doc, now=Date.now()) {
  if(!doc || doc.schema_version!==1 || doc.kind!=='debate_archive' ||
     doc.publication_status!=='EXPLICITLY_APPROVED' || !stamp(doc.generated_at) ||
     Date.parse(doc.generated_at)>now+60000 || !Array.isArray(doc.debates) ||
     doc.debates.length<1 || doc.debates.length>30) return {status:'invalid'};
  const seen=new Set();
  for(const d of doc.debates){
    if(!d || typeof d.id!=='string' || !/^[A-Za-z0-9_-]{3,80}$/.test(d.id) ||
       seen.has(d.id) || typeof d.company!=='string'||d.company.length>100 ||
       !TICKER.test(d.ticker||'') || !/^\d{4}-\d{2}-\d{2}$/.test(d.date||'') ||
       !STATUSES.has(d.status) || !['BUY','WAIT','SELL','UNKNOWN'].includes(d.verdict) ||
       d.audit_verified!==false || !Array.isArray(d.phases) || d.phases.length<1 || d.phases.length>24)
       return {status:'invalid'};
    seen.add(d.id);
    for(const p of d.phases){
      if(!p || !ROLES.has(p.role) || !SAFE_STAGES.has(p.stage) ||
        typeof p.title!=='string' || p.title.length>160 ||
        typeof p.text!=='string' || !p.text.trim() || p.text.length>16000 ||
        !filename(p.source_path)) return {status:'invalid'};
    }
  }
  return {status:'ready',document:doc};
}
export async function loadDebateArchive(){
  if(!debateDashboardEnabled())return {status:'disabled'};
  try{
    const doc=await api('/api/intelligence/debates',{ttlMs:60000,timeoutMs:6000,retries:0});
    return validateDebateArchive(doc);
  }catch{return {status:'unavailable'};}
}
// Restrained Markdown formatter: escape user-authored text BEFORE applying
// minimal formatting. No raw HTML, links, images or embedded scripts.
export function formatDebateMarkdown(source) {
  const escaped = escapeHtml(source).replace(/\r\n?/g,'\n');
  const inline = line => line.replace(/\*\*([^*\n]{1,320})\*\*/g,'<strong>$1</strong>');
  return escaped.split('\n').map(line=>{
    if(!line.trim()) return '<div class="debate-line-space"></div>';
    const h=line.match(/^(#{1,5})\s+(.+)$/);
    if(h)return '<h5 class="debate-md-heading">'+inline(h[2])+'</h5>';
    if(/^[-*]\s+/.test(line))return '<p class="debate-md-list">• '+inline(line.replace(/^[-*]\s+/,''))+'</p>';
    if(/^\d+[.)]\s+/.test(line))return '<p class="debate-md-list">'+inline(line)+'</p>';
    if(/^>\s?/.test(line))return '<blockquote class="debate-md-quote">'+inline(line.replace(/^>\s?/,''))+'</blockquote>';
    if(/^---+\s*$/.test(line))return '<hr class="debate-md-hr">';
    return '<p class="debate-md-p">'+inline(line)+'</p>';
  }).join('');
}
// Public, aggregate-only monitoring status. Never displays private holdings.
export function validateShadowStatus(doc, now=Date.now()) {
  const ints=['runs_total','screenings_total','debates_total','audits_approved','audits_blocked','failures_total','smoke_runs_total','smoke_audits_approved'];
  if(!doc || doc.schema_version!==1 || doc.kind!=='shadow_status' ||
    doc.publication_status!=='EXPLICITLY_APPROVED' || !stamp(doc.generated_at) ||
    Date.parse(doc.generated_at)>now+60000 ||
    !['RUNNING','PAUSED','STOPPED','NOT_STARTED'].includes(doc.state) ||
    (doc.period_started_at!==null && !stamp(doc.period_started_at)) ||
    (doc.last_execution_at!==null && !stamp(doc.last_execution_at)) ||
    (doc.state==='RUNNING' && (!doc.period_started_at || !doc.last_execution_at)) ||
    ints.some(k=>!Number.isInteger(doc[k])||doc[k]<0||doc[k]>1e7) ||
    doc.audits_approved+doc.audits_blocked>doc.debates_total ||
    doc.smoke_audits_approved>doc.smoke_runs_total)
    return {status:'invalid'};
  const stale=now-Date.parse(doc.generated_at)>36*60*60*1000;
  return {status:'ready',stale,document:doc};
}
export function shadowStatusMarkup(result, now=Date.now()) {
  if(result.status!=='ready')return '<p class="debate-empty">운영 보고가 연결되지 않았어요. 뮤즈의 실제 14일 Shadow 실행 기록이 게시되면 집계가 표시돼요.</p>';
  const d=result.document;
  const state=d.state==='NOT_STARTED'?'시작 전':d.state==='RUNNING'?'관찰 진행 중':
    d.state==='PAUSED'?'일시 중단':'종료';
  const effective=result.stale?'최근 보고 지연':state;
  const elapsed=d.period_started_at?
    Math.max(0,Math.min(14,Math.floor((now-Date.parse(d.period_started_at))/(24*60*60*1000)))):0;
  const cells=[
    ['실행',d.runs_total],['스크리닝',d.screenings_total],['토론',d.debates_total],
    ['감사 통과',d.audits_approved],['감사 차단',d.audits_blocked],['실패',d.failures_total],
    ['스모크 실증',d.smoke_runs_total],['스모크 승인',d.smoke_audits_approved]
  ];
  return '<div class="debate-shadow-head"><strong>14일 Shadow · '+escapeHtml(effective)+'</strong><span>'+
     elapsed+'/14일 경과</span></div>'+
    '<div class="debate-shadow-stats">'+cells.map(([k,v])=>'<span>'+escapeHtml(k)+
     ' <b>'+String(v)+'</b></span>').join('')+'</div>'+
    (d.smoke_runs_total>0&&d.state==='NOT_STARTED'?'<p class="debate-shadow-notice">스모크 테스트 성공 기록은 있지만 정기 실행 로그가 없어 14일 카운트는 시작 전으로 표시돼요.</p>':'')+
    '<p class="debate-shadow-freshness">마지막 실행: '+escapeHtml(d.last_execution_at||'아직 없음')+
      ' · 보고 갱신: '+escapeHtml(d.generated_at)+(result.stale?' · 최신 실행 확인 필요':'')+'</p>';
}
export async function loadShadowStatus(){
  if(!debateDashboardEnabled())return {status:'disabled'};
  try{
    const doc=await api('/api/intelligence/shadow/status',{ttlMs:60000,timeoutMs:6000,retries:0});
    return validateShadowStatus(doc);
  }catch{return {status:'unavailable'};}
}
function renderPhase(p){
  return '<details class="debate-phase"><summary><span class="debate-actor">'+
    escapeHtml(roleLabel[p.role])+'</span><span>'+escapeHtml(stageLabel[p.stage])+' · '+escapeHtml(p.title)+
    '</span><span class="debate-arrow">⌄</span></summary>'+
    '<div class="debate-phase-body">'+formatDebateMarkdown(p.text)+'</div>'+
    '<div class="debate-source">원본 문서: '+escapeHtml(p.source_path)+'</div></details>';
}
export function debateDetailMarkup(d, stage='all'){
  const sortOrder={context:0,phase1:1,attack:2,rebuttal:3,final:4,audit:5};
  const phases=d.phases.filter(p=>stage==='all'||p.stage===stage).sort((a,b)=>sortOrder[a.stage]-sortOrder[b.stage]);
  const count=new Set(d.phases.filter(p=>p.role!=='other').map(p=>p.role)).size;
  return '<article class="debate-detail">'+
    '<div class="debate-detail-head"><strong>'+escapeHtml(d.company)+'</strong><span>'+escapeHtml(d.ticker)+' · '+escapeHtml(d.date)+'</span></div>'+
    '<p class="debate-topic">'+escapeHtml(d.topic||'기존 토론 기록')+'</p>'+
    '<div class="debate-metrics"><span>기록상 판단 <b>'+escapeHtml(d.verdict)+'</b></span><span>참여 '+count+'/3</span><span>기록 상태 '+escapeHtml(d.status)+'</span></div>'+
    '<p class="debate-warning">과거 연구·토론 기록입니다. 현재 추천이나 V4.7 감사 승인 결과가 아닙니다.</p>'+
    '<div class="debate-phases">'+phases.map(renderPhase).join('')+'</div></article>';
}
export function debateListMarkup(debates, query='',stage='all'){
  const q=query.trim().toLowerCase();
  const filtered=[...debates].filter(d=>(d.company+' '+d.ticker+' '+(d.topic||'')).toLowerCase().includes(q) &&
    (stage==='all'||d.phases.some(p=>p.stage===stage))).sort((a,b)=>b.date.localeCompare(a.date));
  if(!filtered.length)return '<p class="debate-empty">조건에 맞는 토론 기록이 없어요.</p>';
  return filtered.map(d=>'<details class="debate-card" data-debate-id="'+escapeHtml(d.id)+'">'+
    '<summary><span class="debate-company"><strong>'+escapeHtml(d.company)+'</strong><small>'+
      escapeHtml(d.ticker)+' · '+escapeHtml(d.date)+'</small></span>'+
    '<span class="debate-verdict">'+escapeHtml(d.verdict==='UNKNOWN'?'판단 미확인':d.verdict)+'</span><span>⌄</span></summary>'+
    '<div class="debate-lazy" data-debate-body></div></details>').join('');
}
export async function mountDebateDashboard(host){
  if(!host || !debateDashboardEnabled())return;
  host.innerHTML='<div class="debate-panel"><div class="debate-panel-head"><div><span class="debate-kicker">RESEARCH ARCHIVE</span>'+
    '<h3>메르 · 농구천재 · 멍이 토론</h3><p>초안부터 상호 공격·답변·최종평가까지 기록 그대로 확인합니다.</p></div>'+
    '</div><section class="debate-shadow" aria-label="14일 무인 관찰 현황"><div data-shadow-status>관찰 현황을 불러오고 있어요.</div></section>'+    '<p class="debate-warning">승인된 과거 토론 문서만 표시해요. 실시간 매매 신호나 감사된 PICK과 별개예요.</p>'+
    '<div class="debate-controls"><input type="search" placeholder="종목명·종목코드 검색" aria-label="토론 검색" data-debate-search>'+
    '<select aria-label="토론 단계" data-debate-stage><option value="all">모든 단계</option>'+
    '<option value="phase1">1차 독립 분석</option><option value="attack">공격</option>'+
    '<option value="rebuttal">반론</option><option value="final">최종 평가</option><option value="audit">감사</option></select></div>'+
    '<div class="debate-controls-footer"><small>화면이 열려 있는 동안 5분마다 갱신</small><button type="button" data-debate-refresh>새로고침</button></div>'+    '<div class="debate-list" aria-live="polite">승인된 토론 기록을 확인하고 있어요.</div></div>';
  const list=host.querySelector('.debate-list');
  const shadow=host.querySelector('[data-shadow-status]');
  const refreshButton=host.querySelector('[data-debate-refresh]');
  const search=host.querySelector('[data-debate-search]');
  const select=host.querySelector('[data-debate-stage]');
  let docs=[];
  const paint=()=>{
    const openIds=new Set([...list.querySelectorAll('[data-debate-id]')]
      .filter(card=>card.open).map(card=>card.dataset.debateId));
    const byId=new Map(docs.map(d=>[d.id,d]));
    list.innerHTML=debateListMarkup(docs,search.value,select.value);
    // Load full transcript only on expansion, preserving expanded cards
    // across refreshes. Avoid multi-MB HTML on mobile.
    list.querySelectorAll('[data-debate-id]').forEach(card=>{
      const loadCard=()=>{
        if(!card.open)return;
        const body=card.querySelector('[data-debate-body]');
        if(body&&!body.dataset.loaded){
          const item=byId.get(card.dataset.debateId);
          if(item){body.innerHTML=debateDetailMarkup(item,select.value);body.dataset.loaded='1';}
        }
      };
      card.addEventListener('toggle',loadCard);
      if(openIds.has(card.dataset.debateId)){
        card.open=true;
        loadCard();
      }
    });
  };
  let loading=false;
  const refresh=async()=>{
    if(loading || !host.isConnected)return;
    loading=true;
    refreshButton.disabled=true;
    try{
      const [archive,shadowStatus]=await Promise.all([loadDebateArchive(),loadShadowStatus()]);
      if(!host.isConnected)return;
      shadow.innerHTML=shadowStatusMarkup(shadowStatus);
      if(archive.status==='ready'){
        docs=archive.document.debates;
        paint();
      }else if(!docs.length){
        list.innerHTML='<p class="debate-empty">'+(archive.status==='unavailable'?
          '승인된 토론 기록 API가 아직 연결되지 않았어요.':
          '승인된 토론 자료가 아직 없거나 계약이 맞지 않아요.')+'</p>';
      } // transient fetch errors do not erase the previously displayed archive
    }finally{
      refreshButton.disabled=false;
      loading=false;
    }
  };
  search.addEventListener('input',paint);
  select.addEventListener('change',paint);
  refreshButton.addEventListener('click',refresh);
  await refresh();
  // Poll only while mounted/open; no backend analysis runs on dashboard visits.
  const pollId=setInterval(()=>{
    if(!host.isConnected){clearInterval(pollId);return;}
    if(!host.hidden)void refresh();
  },300000);
}
