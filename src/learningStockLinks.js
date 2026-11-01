// Independent learning doorway: existing quote/screener/PICK rows keep their owners.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const states={not_started:'미학습',in_progress:'학습 중',completed:'학습 완료',evaluated:'평가 완료'};
const controllers=new WeakMap();
export function learningSourceContext(value={}){
 const out={};
 for(const key of ['kind','symbol','name','date','key','reason'])if(typeof value[key]==='string'&&value[key].trim())out[key]=value[key].trim().slice(0,key==='reason'?1000:120);
 return out;
}
export function companyLearningSummary(workspace,symbol){
 const sessions=(workspace?.sessions||[]).filter(s=>(s.symbols||[s.company?.symbol]).includes(symbol)).sort((a,b)=>String(b.lessonDate).localeCompare(String(a.lessonDate))||String(b.updatedAt).localeCompare(String(a.updatedAt)));
 const latest=sessions[0];
 if(!latest)return {count:0,status:'not_started',lastDate:null,understanding:null,quizScore:null};
 const attempt=(workspace?.attempts||[]).filter(a=>a.sessionId===latest.id&&a.sessionRevision===latest.revision&&a.provenance!=='imported').sort((a,b)=>String(b.submittedAt).localeCompare(String(a.submittedAt)))[0];
 return {count:sessions.length,status:latest.status,lastDate:latest.lessonDate,understanding:Number.isFinite(latest.understanding)?latest.understanding:null,quizScore:Number.isFinite(attempt?.score)?attempt.score:null};
}
function collect(root,{surface,symbol,name}){
 if(surface==='detail')return [{symbol,name:name||symbol}];
 const found=new Map();
 root.querySelectorAll('[data-stock-detail]').forEach(button=>{
  const s=button.dataset.stockDetail;
  if(!/^[A-Z0-9][A-Z0-9.\-]{0,29}$/.test(s||''))return;
  const pick=button.closest('[data-pick-key]'),screener=button.closest('.analysis-stock-wrap');
  const text=button.dataset.stockName||button.querySelector('strong')?.textContent||pick?.querySelector('.pick-ledger-stock strong')?.textContent||s;
  const key=pick?.dataset.pickKey||'',date=key.match(/^\d{4}-\d{2}-\d{2}/)?.[0]||screener?.querySelector('.analysis-stock-basis')?.textContent?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  const reason=pick?.querySelector('.pick-ledger-detail-grid section p')?.textContent||screener?.querySelector('.analysis-match-reasons')?.textContent;
  if(!found.has(s))found.set(s,{symbol:s,name:text.slice(0,80),...(key?{key}:{}),...(date?{date}:{}),...(reason?{reason}:{} )});
 });
 return [...found.values()].slice(0,50);
}
export function syncLearningStockLinks({root,surface,symbol,name,isCurrent=()=>root.isConnected,onOpen}){
 if(!root?.isConnected||!isCurrent())return;
 let controller=controllers.get(root);
 const rows=collect(root,{surface,symbol,name});
 if(!rows.length){controller?.update([]);return;}
 if(controller){controller.update(rows);return;}
 const host=document.createElement('details');host.className='learning-stock-links';host.dataset.learningStockLinks='';
 host.innerHTML='<summary>기업 공부 · 학습 이력과 후보</summary><div data-learning-stock-body></div>';
 const disclosure=root.querySelector('.data-disclosure');
 if(surface==='detail')root.querySelector('.detail-chart-card')?.after(host);
 else if(disclosure)disclosure.before(host);else root.append(host);
 const body=host.querySelector('[data-learning-stock-body]');
 let currentRows=rows,workspace=null,error='',loaded=false,pending=false,disposed=false;
 const abort=new AbortController();
 const alive=()=>!disposed&&host.isConnected&&isCurrent();
 const paint=()=>{
  if(!alive())return;
  body.innerHTML=`<p class="muted-copy">현재 ${surface==='detail'?'기업':'목록'}의 학습 상태예요. 학습 후보는 투자 추천 점수와 별개예요.</p>${pending?'<p role="status">저장한 학습 이력을 확인하고 있어요.</p>':''}${error?`<p role="status">${esc(error)}</p>`:''}<div class="learning-stock-rows">${currentRows.map(row=>{
   const s=workspace?companyLearningSummary(workspace,row.symbol):null;
   const description=s?`${states[s.status]||'학습 중'}${s.lastDate?' · '+s.lastDate:''}${s.understanding!==null?' · 자기 이해도 '+s.understanding+'점':''}${s.quizScore!==null?' · 퀴즈 '+s.quizScore+'점':''}${s.count===0?' · 학습 후보':''}`:'학습 노트와 이력 열기';
   return `<button type="button" data-learning-stock="${esc(row.symbol)}"><span><strong>${esc(row.name)}</strong><small>${esc(description)}</small></span><span aria-hidden="true">›</span></button>`;
  }).join('')}</div>${error?'<button type="button" class="text-button" data-learning-stock-retry>학습 이력 다시 확인</button>':''}<button type="button" class="text-button" data-learning-dashboard>기업 공부 대시보드</button>`;
  body.querySelectorAll('[data-learning-stock]').forEach(button=>button.onclick=()=>{
   const row=currentRows.find(r=>r.symbol===button.dataset.learningStock);
   if(row)onOpen?.(learningSourceContext({kind:surface,...row}));
  });
  body.querySelector('[data-learning-dashboard]').onclick=()=>onOpen?.(null);
  body.querySelector('[data-learning-stock-retry]')?.addEventListener('click',load);
 };
 async function load(){
  if(!alive()||pending)return;
  pending=true;error='';paint();
  try{
   const client=await import('./learningClient.js');
   const session=await client.getLearningSession();
   if(!alive())return;
   if(!session){error='기업 공부에서 학습 계정을 연결하면 이력을 함께 볼 수 있어요.';loaded=true;return;}
   const next=await client.learningRequest('/workspace',{signal:abort.signal,expectedAccountId:session.accountId,expectedToken:session.token});
   const after=await client.getLearningSession();
   if(alive()&&after?.token===session.token){workspace=next;loaded=true;}
  }catch(e){if(alive()&&e?.name!=='AbortError')error='학습 이력을 확인하지 못했어요. 기존 종목 분석은 계속 이용할 수 있어요.';}
  finally{pending=false;paint();}
 }
 host.addEventListener('toggle',()=>{if(host.open){paint();if(!loaded)void load();}});
 controller={update(next){host.hidden=next.length===0;if(JSON.stringify(next)===JSON.stringify(currentRows))return;currentRows=next;if(host.open)paint();},dispose(){disposed=true;abort.abort();}};
 controllers.set(root,controller);
 // No authentication lookup or learning network work before explicit expansion.
 return controller.dispose;
}
