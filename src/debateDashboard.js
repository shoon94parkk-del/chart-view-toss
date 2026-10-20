// Opt-in archive reader. Never accesses private GitHub or executes LLM calls.
import { API_BASE } from './api.js';
import { STATIC_DATA_BASE } from './staticData.js';
const SAFE_STAGES = new Set(['phase1','attack','rebuttal','final','audit','context']);
const ROLES = new Set(['mer','nonggu','meng','other']);
const STATUSES = new Set(['COMPLETED','PARTIAL','BLOCKED']);
const TICKER = /^[A-Z0-9.\-^]{1,18}$/;
const escapeHtml = x => String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validDate = x => typeof x==='string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().slice(0,10)===x;
const stamp = x => typeof x==='string' && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(x) && validDate(x.slice(0,10)) && Number.isFinite(Date.parse(x));
const MAX_BYTES=4*1024*1024;
const forbiddenKeys=['api_key','apikey','password','secret','private_key','token','account','db_path','dsn','holdings','positions','portfolio','quantity','avg_cost','cost_basis','user_id','watchlist'];
// One preceding character detects the same email substrings without rescanning
// every suffix of a long non-email token on the main thread.
const privateEmail=/[\w.+-]@[\w-]+\.[\w.-]+/i;
const privateText=[/\b010[-\s]?\d{4}[-\s]?\d{4}\b/i,/\b\d{6}[- ]?[1-4]\d{6}\b/i,/gh[pousr]_[a-z0-9]{20,}/i,/sk-[a-z0-9_-]{20,}/i,/AKIA[A-Z0-9]{16}/i,/(?:내|본인|현재)\s*(?:보유|투자|계좌)\s*(?:금액|잔액|평가액)?/i,/보유\s*(?:수량|금액|비중|평단|평균단가)/i,/(?:api[_-]?key|password|passwd|secret|access[_-]?token|token)\s*[:=]\s*[\w/+.-]{4,}/i,/계좌(?:번호|잔액|평가액)|매입(?:수량|단가)|평균(?:매입|매수)단가|평단가/i,/\b(?:my|personal)\s+(?:portfolio|holdings|account)\b/i];
const publicDocument = doc => {
  try{
    if(new TextEncoder().encode(JSON.stringify(doc)).byteLength>MAX_BYTES)return false;
    const scan=value=>{
      if(typeof value==='string')return !(value.includes('@')&&privateEmail.test(value))&&!privateText.some(pattern=>pattern.test(value));
      if(Array.isArray(value))return value.every(scan);
      if(value&&typeof value==='object')return Object.entries(value).every(([key,entry])=>!forbiddenKeys.some(fragment=>key.toLowerCase().includes(fragment))&&scan(entry));
      return true;
    };
    return scan(doc);
  }catch{return false;}
};
const filename = x => typeof x==='string' && /^records\/(?:debates|shadow)\/[A-Za-z0-9_./-]+\.md$/.test(x) && !x.includes('..') && x.length<260;
const stageLabel = {phase1:'1차 독립 분석',attack:'공격',rebuttal:'반론·답변',final:'최종 평가',audit:'검증 기록',context:'배경'};
const roleLabel = {mer:'메르',nonggu:'농구천재',meng:'멍이',other:'기록'};
const statusLabel={COMPLETED:'분석 완료',PARTIAL:'일부 결과',BLOCKED:'분석 중단'};
export const debateDashboardEnabled=()=>import.meta.env?.VITE_DEBATE_DASHBOARD_ENABLED!=='0';
export function validateDebateArchive(doc, now=Date.now()) {
  if(!doc || !publicDocument(doc) || doc.schema_version!==1 || doc.kind!=='debate_archive' ||
     doc.publication_status!=='EXPLICITLY_APPROVED' || !stamp(doc.generated_at) ||
     Date.parse(doc.generated_at)>now+60000 || !Array.isArray(doc.debates) ||
     doc.debates.length<1 || doc.debates.length>30) return {status:'invalid'};
  const seen=new Set();
  for(const d of doc.debates){
    if(!d || typeof d.id!=='string' || !/^[A-Za-z0-9_-]{3,80}$/.test(d.id) ||
       seen.has(d.id) || typeof d.company!=='string'||!d.company.trim()||d.company.length>100 ||
       (d.topic!=null&&(typeof d.topic!=='string'||d.topic.length>240)) ||
       !TICKER.test(d.ticker||'') || !validDate(d.date) ||
       !STATUSES.has(d.status) || !['BUY','HOLD','WAIT','SELL','UNKNOWN'].includes(d.verdict) ||
       d.audit_verified!==false || !Array.isArray(d.phases) || d.phases.length<1 || d.phases.length>24)
       return {status:'invalid'};
    seen.add(d.id);
    for(const p of d.phases){
      if(!p || !ROLES.has(p.role) || !SAFE_STAGES.has(p.stage) ||
        typeof p.title!=='string' || !p.title.trim() || p.title.length>160 ||
        typeof p.text!=='string' || !p.text.trim() || p.text.length>16000 ||
        !filename(p.source_path)) return {status:'invalid'};
    }
    if('summary' in d || 'updated_at' in d){
      if(typeof d.summary!=='string'||!d.summary.trim()||d.summary.length>600||!stamp(d.updated_at)||Date.parse(d.updated_at)>Date.parse(doc.generated_at))return {status:'invalid'};
      if(d.status==='COMPLETED'){
        const participants=new Set(d.phases.filter(p=>p.stage==='phase1').map(p=>p.role));
        const stages=new Set(d.phases.map(p=>p.stage));
        if(!['mer','nonggu','meng'].every(role=>participants.has(role))||!['attack','rebuttal','final'].every(stage=>stages.has(stage)))return {status:'invalid'};
      }
    }
  }
  return {status:'ready',document:doc};
}
async function readPublicDocument(path,validate,{signal,source}={}){
  const controller=new AbortController();
  const abort=()=>controller.abort();
  if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',abort,{once:true});
  let rejectDeadline;
  const deadline=new Promise((_,reject)=>{rejectDeadline=reject;});
  const timeout=setTimeout(()=>{controller.abort();rejectDeadline(new Error('publication check timed out'));},2600);
  try{
    return await Promise.race([deadline,(async()=>{
      const response=await fetch(path,{cache:'no-store',signal:controller.signal,credentials:'omit',headers:{Accept:'application/json'}});
      if(!response.ok)throw new Error('snapshot is not published');
      if(Number(response.headers.get('content-length'))>MAX_BYTES){controller.abort();throw new Error('publication exceeds size limit');}
      const reader=response.body?.getReader();
      let body='';
      if(reader){
        const decoder=new TextDecoder();let bytes=0;
        try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>MAX_BYTES){controller.abort();void reader.cancel();throw new Error('publication exceeds size limit');}body+=decoder.decode(value,{stream:true});}body+=decoder.decode();}
        finally{reader.releaseLock();}
      }else{body=await response.text();if(new TextEncoder().encode(body).byteLength>MAX_BYTES)throw new Error('publication exceeds size limit');}
      if(controller.signal.aborted)throw new DOMException('Aborted','AbortError');
      const checked=validate(JSON.parse(body));
      if(checked.status!=='ready')throw new Error('snapshot is invalid/unapproved');
      return {...checked,source};
    })()]);
  }finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
}
export function readPublishedJson(filename, validate,options={}){
  const base=import.meta.env?.BASE_URL||'/';
  return readPublicDocument(base.replace(/\/?$/,'/')+'data/'+filename,validate,{...options,source:'published_snapshot'});
}
async function loadPublication(filename,validate,{preferLive=false,dataBase=STATIC_DATA_BASE,signal}={}){
  if(!debateDashboardEnabled())return {status:'disabled'};
  try{
    if(!preferLive)return await readPublishedJson(filename,validate,{signal});
    const path=dataBase?dataBase.replace(/\/$/,'')+'/'+filename+'?publication_check='+Date.now():API_BASE+'/api/published-data/'+filename;
    return await readPublicDocument(path,validate,{signal,source:dataBase?'published_cdn':'published_api'});
  }catch{return {status:'unavailable'};}
}
export const loadDebateArchive=options=>loadPublication('intelligence_debates_public.json',validateDebateArchive,options);
function publicationRevision(doc){
  const normalized={...doc,generated_at:Date.parse(doc.generated_at)};
  // These bootstrap-only envelope labels are omitted by the public API projection.
  delete normalized.read_mode;delete normalized.notice;
  if(doc.kind==='debate_archive')normalized.debates=doc.debates.map(d=>({...d,topic:d.topic||'',...('updated_at' in d?{updated_at:Date.parse(d.updated_at)}:{})}));
  const sorted=value=>Array.isArray(value)?value.map(sorted):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])])):value;
  return JSON.stringify(sorted(normalized));
}
export function choosePublicPublication(current,incoming){
  if(incoming?.status!=='ready')return current;
  if(!current)return incoming;
  const difference=Date.parse(incoming.document.generated_at)-Date.parse(current.document.generated_at);
  return difference>0||(difference===0&&publicationRevision(incoming.document)===publicationRevision(current.document))?incoming:current;
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
  if(!doc || !publicDocument(doc) || doc.schema_version!==1 || doc.kind!=='shadow_status' ||
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
  const state=d.state==='NOT_STARTED'?'정기 로그 미연결':d.state==='RUNNING'?'관찰 진행 중':
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
    (d.smoke_runs_total>0&&d.state==='NOT_STARTED'?'<p class="debate-shadow-notice">스모크 성공 기록은 있지만 정기 실행 로그가 아직 연결되지 않았어요. 14일 경과는 실제 실행 로그를 통해 집계합니다.</p>':'')+
    '<p class="debate-shadow-freshness">마지막 실행: '+escapeHtml(d.last_execution_at||'아직 없음')+
      ' · 보고 갱신: '+escapeHtml(d.generated_at)+(result.stale?' · 최신 실행 확인 필요':'')+'</p>';
}
export const loadShadowStatus=options=>loadPublication('intelligence_shadow_status.json',validateShadowStatus,options);
function renderPhase(p){
  return '<details class="debate-phase" data-phase-key="'+escapeHtml([p.role,p.stage,p.source_path].join('|'))+'"><summary><span class="debate-actor">'+
    escapeHtml(roleLabel[p.role])+'</span><span>'+escapeHtml(stageLabel[p.stage])+' · '+escapeHtml(p.title)+
    '</span><span class="debate-arrow">⌄</span></summary>'+
    '<div class="debate-phase-body">'+formatDebateMarkdown(p.text)+'</div>'+
    '<div class="debate-source">내부 근거 경로: '+escapeHtml(p.source_path)+'</div></details>';
}
export function debateDetailMarkup(d, stage='all'){
  const sortOrder={context:0,phase1:1,attack:2,rebuttal:3,final:4,audit:5};
  const phases=d.phases.filter(p=>stage==='all'||p.stage===stage).sort((a,b)=>sortOrder[a.stage]-sortOrder[b.stage]);
  const count=new Set(d.phases.filter(p=>p.role!=='other').map(p=>p.role)).size;
  return '<article class="debate-detail">'+
    '<div class="debate-detail-head"><strong>'+escapeHtml(d.company)+'</strong><span>'+escapeHtml(d.ticker)+' · '+escapeHtml(d.date)+'</span></div>'+
    '<p class="debate-topic">'+escapeHtml(d.topic||'기존 토론 기록')+'</p>'+
    '<div class="debate-metrics"><span>연구 판단 <b>'+escapeHtml(d.verdict)+'</b></span><span>참여 '+count+'/3</span><span>'+escapeHtml(statusLabel[d.status])+'</span></div>'+
    (d.updated_at?'<p class="debate-result-time">분석 기준 '+escapeHtml(d.date)+' · 결과 갱신 '+escapeHtml(d.updated_at)+'</p>':'')+
    '<p class="debate-warning">공개된 연구·토론 기록입니다. 현재 추천이나 V4.7 감사 승인 결과가 아닙니다.</p>'+
    '<div class="debate-phases">'+phases.map(renderPhase).join('')+'</div></article>';
}
export function debateListMarkup(debates, query='',stage='all',status='all'){
  const q=query.trim().toLowerCase();
  const filtered=[...debates].filter(d=>(d.company+' '+d.ticker+' '+(d.topic||'')+' '+(d.summary||'')).toLowerCase().includes(q) &&
    (stage==='all'||d.phases.some(p=>p.stage===stage))&&(status==='all'||d.status===status)).sort((a,b)=>(Date.parse(b.updated_at||b.date)-Date.parse(a.updated_at||a.date))||a.id.localeCompare(b.id));
  if(!filtered.length)return '<p class="debate-empty">조건에 맞는 토론 기록이 없어요.</p>';
  return filtered.map(d=>'<details class="debate-card" data-debate-id="'+escapeHtml(d.id)+'">'+
    '<summary><span class="debate-company"><strong>'+escapeHtml(d.company)+'</strong><small>'+
      escapeHtml(d.ticker)+' · 분석 기준 '+escapeHtml(d.date)+'</small><span class="debate-card-summary">'+escapeHtml(d.summary?.trim()||d.topic||'공개된 분석 근거를 펼쳐 확인해요.')+'</span></span>'+
    '<span class="debate-card-labels"><span class="debate-state">'+escapeHtml(statusLabel[d.status])+'</span><span class="debate-verdict">'+escapeHtml(d.verdict==='UNKNOWN'?'판단 미확인':d.verdict)+'</span></span><span aria-hidden="true">⌄</span></summary>'+
    '<div class="debate-lazy" data-debate-body></div></details>').join('');
}
let lastGoodArchive=null,lastGoodShadow=null;
export function mountDebateDashboard(host){
  if(!host || !debateDashboardEnabled())return;
  host.innerHTML='<div class="debate-panel"><div class="debate-panel-head"><div><span class="debate-kicker">RESEARCH ARCHIVE</span>'+
    '<h3>메르 · 농구천재 · 멍이 토론</h3><p>종목별 핵심 결과를 먼저 읽고, 독립 분석·상호 반박·최종 판단을 펼쳐 보세요.</p></div>'+
    '</div><p class="debate-warning">공개 가능한 연구 요약입니다. 비공개 원문, 실시간 매매 신호, 추천 PICK이 아닙니다.</p>'+
    '<div class="debate-controls"><input type="search" placeholder="종목명·종목코드 검색" aria-label="토론 검색" data-debate-search>'+
    '<select aria-label="토론 단계" data-debate-stage><option value="all">모든 단계</option>'+
    '<option value="phase1">1차 독립 분석</option><option value="attack">공격</option>'+
    '<option value="rebuttal">반론</option><option value="final">최종 평가</option><option value="audit">감사</option></select>'+
    '<select aria-label="분석 상태" data-debate-status><option value="all">모든 상태</option><option value="COMPLETED">분석 완료</option><option value="PARTIAL">일부 결과</option><option value="BLOCKED">분석 중단</option></select></div>'+
    '<div class="debate-controls-footer"><small>화면이 열려 있을 때 1분마다 게시 확인</small><button type="button" data-debate-refresh>새로고침</button></div>'+    '<p data-debate-feed-meta class="debate-feed-meta" role="status"></p>'+
    '<div class="debate-list" aria-live="polite">승인된 토론 기록을 확인하고 있어요.</div>'+
    '<details class="debate-operations"><summary>Shadow 운영 현황</summary><section class="debate-shadow" aria-label="14일 무인 관찰 현황"><div data-shadow-status>관찰 현황을 불러오고 있어요.</div></section></details></div>';
  const feedMeta=host.querySelector('[data-debate-feed-meta]');
  const list=host.querySelector('.debate-list');
  const shadow=host.querySelector('[data-shadow-status]');
  const refreshButton=host.querySelector('[data-debate-refresh]');
  const search=host.querySelector('[data-debate-search]');
  const select=host.querySelector('[data-debate-stage]');
  const statusSelect=host.querySelector('[data-debate-status]');
  const controller=new AbortController();
  let active=true;
  const current=()=>active&&host.isConnected;
  const visible=()=>current()&&!host.hidden&&document.visibilityState!=='hidden';
  let archiveResult=lastGoodArchive,shadowResult=lastGoodShadow;
  let archiveDelayed=false,shadowDelayed=false,liveChecked=false;
  let rendered='',verifiedAt=archiveResult?.verifiedAt||null;
  let docs=[];
  const paint=()=>{
    const previous=new Map([...list.querySelectorAll('[data-debate-id]')].map(card=>[card.dataset.debateId,{open:card.open,phases:new Set([...card.querySelectorAll('[data-phase-key][open]')].map(phase=>phase.dataset.phaseKey))}]));
    const focused=document.activeElement;
    const focusedCard=list.contains(focused)?focused.closest('[data-debate-id]'):null;
    const focusedPhase=focusedCard?focused.closest('[data-phase-key]'):null;
    const focusKey=focusedCard?{card:focusedCard.dataset.debateId,phase:focusedPhase?.dataset.phaseKey}:null;
    const byId=new Map(docs.map(d=>[d.id,d]));
    list.innerHTML=debateListMarkup(docs,search.value,select.value,statusSelect.value);
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
      if(previous.get(card.dataset.debateId)?.open){
        card.open=true;
        loadCard();
        card.querySelectorAll('[data-phase-key]').forEach(phase=>{phase.open=previous.get(card.dataset.debateId).phases.has(phase.dataset.phaseKey);});
      }
      if(focusKey?.card===card.dataset.debateId){
        const target=focusKey.phase?[...card.querySelectorAll('[data-phase-key]')].find(phase=>phase.dataset.phaseKey===focusKey.phase):card;
        target?.querySelector(':scope > summary')?.focus({preventScroll:true});
      }
    });
  };
  const paintMeta=()=>{
    if(!archiveResult){feedMeta.textContent=archiveDelayed?'게시 확인 지연 · 다시 확인해 주세요.':'공개된 결과를 확인하고 있어요.';return;}
    const source=archiveResult.source==='published_api'?'게시 데이터 API':archiveResult.source==='published_cdn'?'게시 데이터 CDN':'게시된 정적 스냅샷';
    feedMeta.textContent='공개 요약 '+docs.length+'건 · 게시 '+archiveResult.document.generated_at+' · '+source+(verifiedAt?' · 확인 '+verifiedAt:' · 최신 게시 확인 중')+(archiveDelayed?' · 최신 게시 확인 지연 · 마지막 정상 자료를 표시해요.':'');
  };
  const acceptArchive=(result,live=false)=>{
    if(!current())return;
    // A late bootstrap cannot downgrade an equivalent live source or borrow
    // the verification time of a different, older publication.
    if(!live&&result!==archiveResult&&result.status==='ready'&&archiveResult&&Date.parse(result.document.generated_at)<=Date.parse(archiveResult.document.generated_at))return;
    const selected=choosePublicPublication(archiveResult,result);
    if(live){liveChecked=true;archiveDelayed=selected!==result;if(!archiveDelayed)verifiedAt=new Date().toISOString();}
    else if(selected===result&&selected!==archiveResult){verifiedAt=null;archiveDelayed=liveChecked;}
    if(selected){
      archiveResult={...selected,verifiedAt};lastGoodArchive=choosePublicPublication(lastGoodArchive,archiveResult);docs=archiveResult.document.debates;
      const revision=JSON.stringify(docs);
      if(rendered!==revision){rendered=revision;paint();}
    }else if(live){list.innerHTML='<p class="debate-empty">승인된 토론 기록을 불러오지 못했어요. 새로고침으로 다시 확인해 주세요.</p>';}
    paintMeta();
  };
  const acceptShadow=(result,live=false)=>{
    if(!current())return;
    const selected=choosePublicPublication(shadowResult,result);
    if(live)shadowDelayed=selected!==result;
    if(selected){shadowResult=selected;lastGoodShadow=choosePublicPublication(lastGoodShadow,selected);}
    const checked=shadowResult?validateShadowStatus(shadowResult.document):{status:'unavailable'};
    shadow.innerHTML=shadowStatusMarkup(checked)+(shadowDelayed?'<p class="debate-shadow-freshness">운영 현황 게시 확인 지연 · 마지막 정상 보고를 표시해요.</p>':'');
  };
  let archiveLoading=false,shadowLoading=false;
  const refreshArchive=async()=>{
    if(archiveLoading||!visible())return;
    archiveLoading=true;
    refreshButton.disabled=true;
    try{
      acceptArchive(await loadDebateArchive({preferLive:true,signal:controller.signal}),true);
    }finally{
      if(current())refreshButton.disabled=false;
      archiveLoading=false;
    }
  };
  const refreshShadow=async()=>{
    if(shadowLoading||!visible())return;
    shadowLoading=true;
    try{acceptShadow(await loadShadowStatus({preferLive:true,signal:controller.signal}),true);}
    finally{shadowLoading=false;}
  };
  const refresh=()=>{void refreshArchive();void refreshShadow();};
  if(archiveResult)acceptArchive(archiveResult);
  if(shadowResult)acceptShadow(shadowResult);
  search.addEventListener('input',paint);
  select.addEventListener('change',paint);
  statusSelect.addEventListener('change',paint);
  refreshButton.addEventListener('click',refresh);
  // Bootstrap and independently published updates race safely by actual timestamp.
  void loadDebateArchive({signal:controller.signal}).then(result=>acceptArchive(result));
  void loadShadowStatus({signal:controller.signal}).then(result=>acceptShadow(result));
  refresh();
  document.addEventListener('visibilitychange',refresh);
  window.addEventListener('pageshow',refresh);
  const dispose=()=>{
    if(!active)return;
    active=false;controller.abort();clearInterval(pollId);
    document.removeEventListener('visibilitychange',refresh);window.removeEventListener('pageshow',refresh);
    search.removeEventListener('input',paint);select.removeEventListener('change',paint);statusSelect.removeEventListener('change',paint);refreshButton.removeEventListener('click',refresh);
  };
  const pollId=setInterval(()=>{
    if(!current()){dispose();return;}
    refresh();
  },60000);
  return dispose;
}
