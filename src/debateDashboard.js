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
function renderPhase(p){
  return '<details class="debate-phase"><summary><span class="debate-actor">'+
    escapeHtml(roleLabel[p.role])+'</span><span>'+escapeHtml(stageLabel[p.stage])+' · '+escapeHtml(p.title)+
    '</span><span class="debate-arrow">⌄</span></summary>'+
    '<pre class="debate-phase-body">'+escapeHtml(p.text)+'</pre>'+
    '<div class="debate-source">원본 문서: '+escapeHtml(p.source_path)+'</div></details>';
}
export function debateDetailMarkup(d){
  const sortOrder={context:0,phase1:1,attack:2,rebuttal:3,final:4,audit:5};
  const phases=[...d.phases].sort((a,b)=>sortOrder[a.stage]-sortOrder[b.stage]);
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
    debateDetailMarkup(d)+'</details>').join('');
}
export async function mountDebateDashboard(host){
  if(!host || !debateDashboardEnabled())return;
  host.innerHTML='<div class="debate-panel"><div class="debate-panel-head"><div><span class="debate-kicker">RESEARCH ARCHIVE</span>'+
    '<h3>메르 · 농구천재 · 멍이 토론</h3><p>초안부터 상호 공격·답변·최종평가까지 기록 그대로 확인합니다.</p></div>'+
    '</div><p class="debate-warning">승인된 과거 토론 문서만 표시해요. 실시간 매매 신호나 감사된 PICK과 별개예요.</p>'+
    '<div class="debate-controls"><input type="search" placeholder="종목명·종목코드 검색" aria-label="토론 검색" data-debate-search>'+
    '<select aria-label="토론 단계" data-debate-stage><option value="all">모든 단계</option>'+
    '<option value="phase1">1차 독립 분석</option><option value="attack">공격</option>'+
    '<option value="rebuttal">반론</option><option value="final">최종 평가</option><option value="audit">감사</option></select></div>'+
    '<div class="debate-list" aria-live="polite">승인된 토론 기록을 확인하고 있어요.</div></div>';
  const list=host.querySelector('.debate-list');
  const outcome=await loadDebateArchive();
  if(!host.isConnected)return;
  if(outcome.status!=='ready'){
    list.innerHTML='<p class="debate-empty">'+(outcome.status==='unavailable'?
      '토론 기록 API가 아직 연결되지 않았어요. 공개 승인된 자료를 게시하면 이곳에서 볼 수 있어요.':
      '승인된 토론 자료가 아직 없거나 계약이 맞지 않아요.')+'</p>';
    return;
  }
  const docs=outcome.document.debates;
  const search=host.querySelector('[data-debate-search]');
  const select=host.querySelector('[data-debate-stage]');
  const paint=()=>{list.innerHTML=debateListMarkup(docs,search.value,select.value);};
  search.addEventListener('input',paint);
  select.addEventListener('change',paint);
  paint();
}
