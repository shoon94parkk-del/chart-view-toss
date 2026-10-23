// Public research observations only. No PICK, price or verdict calculation.
const object=x=>Boolean(x)&&typeof x==='object'&&!Array.isArray(x);
const stamp=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(x)&&day(x.slice(0,10))&&Number.isFinite(Date.parse(x));
const day=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=2000;
const forbidden=['api_key','apikey','password','secret','token','account','holdings','positions','portfolio','quantity','avg_cost','cost_basis','user_id','watchlist','chat_id','private_key','db_path','dsn','raw_text','raw_body','raw_content','raw_article','raw_prompt','system_prompt','audit_trail','chain_of_thought','private_thesis','personal_thesis','telegram_text'];
const privateProse=[/\b\d{6}[- ]?[1-4]\d{6}\b/,/AKIA[A-Z0-9]{16}/i,/(?:내|본인|현재)\s*(?:보유|투자|계좌)\s*(?:금액|잔액|평가액)?/,/보유\s*(?:수량|금액|비중|평단|평균단가)/,/(?:api[_-]?key|password|passwd|secret|access[_-]?token|token)\s*[:=]\s*[\w/+.-]{4,}/i,/계좌(?:번호|잔액|평가액)|매입(?:수량|단가)|평균(?:매입|매수)단가|평단가/,/\b(?:my|personal)\s+(?:portfolio|holdings|account)\b/i];
function publicOnly(value){
 if(Array.isArray(value))return value.every(publicOnly);
 if(object(value))return Object.entries(value).every(([key,v])=>!forbidden.some(s=>key.toLowerCase().includes(s))&&publicOnly(v));
 if(typeof value==='string')return !privateProse.some(pattern=>pattern.test(value))&&!/(?:gh[pousr]_[a-z0-9]{20,}|\bsk-(?:(?:proj-|svcacct-)[a-z0-9_-]{20,}|[a-z0-9_]{20,}(?![a-z0-9_-]))|\b010[- ]?\d{4}[- ]?\d{4}\b|[\w.+-]+@[\w-]+\.[\w.-]+)/i.test(value);
 return true;
}
export function investmentSourceUrl(value){
 try{const u=new URL(value);return typeof value==='string'&&value===value.trim()&&u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&!/(?:^|\.)(?:t\.me|telegram\.(?:me|org|dog)|telegram-cdn\.org)$/.test(u.hostname.replace(/\.$/,''))&&![...u.searchParams.keys()].some(key=>/api.?key|token|password|secret|signature/i.test(key))?value:'';}catch{return '';}
}
export function validateInvestmentNews(doc,now=Date.now()){
 const invalid=()=>({status:'invalid'});
 const observed=x=>stamp(x)&&Date.parse(x)<=now+60000;
 const texts=x=>Array.isArray(x)&&x.every(text);
 if(!object(doc)||doc.schemaVersion!=='investment-news.v1'||!stamp(doc.generated_at)||!doc.generated_at.endsWith('Z')&& !doc.generated_at.endsWith('+00:00')||Date.parse(doc.generated_at)>now+60000||!day(doc.as_of_date)||!['READY','PARTIAL','NOT_STARTED'].includes(doc.status)||!object(doc.collection)||!object(doc.capabilities)||!Array.isArray(doc.events)||doc.events.length>1000||!Array.isArray(doc.briefings)||!publicOnly(doc))return invalid();
 if(doc.capabilities.telegram_input_enabled===true||doc.capabilities.telegram_input===true||investmentDate(doc.generated_at)!==doc.as_of_date||new TextEncoder().encode(JSON.stringify(doc)).byteLength>4*1024*1024)return invalid();
 for(const key of ['ai_configured','telegram_configured','telegram_input_enabled','telegram_input'])if(doc.capabilities[key]!=null&&typeof doc.capabilities[key]!=='boolean')return invalid();
 if(doc.collection.sources!=null&&(!Array.isArray(doc.collection.sources)||doc.collection.sources.some(s=>!object(s))))return invalid();
 for(const b of doc.briefings){
  if(!object(b)||b.trade_action!=null&&b.trade_action!=='REVIEW_ONLY')return invalid();
  for(const key of ['event_ids','newly_confirmed'])if(b[key]!=null&&!texts(b[key]))return invalid();
  for(const key of ['connections','changed_since_previous'])if(b[key]!=null&&(!Array.isArray(b[key])||b[key].some(x=>!object(x))))return invalid();
 }
 const seen=new Set();
 for(const e of doc.events){
  if(!object(e)||!text(e.event_id)||!Number.isInteger(e.revision)||e.revision<1||!text(e.title)||e.trade_action!=='REVIEW_ONLY')return invalid();
  const id=e.event_id+':'+e.revision;if(seen.has(id))return invalid();seen.add(id);
  for(const key of ['published_at','first_seen_at','updated_at'])if(e[key]!=null&&(!stamp(e[key])||Date.parse(e[key])>now+60000))return invalid();
  for(const key of ['importance','confidence','novelty','market_impact'])if(e[key]!=null&&(typeof e[key]!=='number'||!Number.isFinite(e[key])||e[key]<0||e[key]>100))return invalid();
  for(const key of ['summary','sectors'])if(e[key]!=null&&(!Array.isArray(e[key])||e[key].some(x=>!text(x))))return invalid();
  for(const key of ['sources','facts','inferences','tickers','thesis_reviews','performance'])if(e[key]!=null&&!Array.isArray(e[key]))return invalid();
  if(!e.sources?.length)return invalid();
  const urls=new Set();for(const s of e.sources){if(!object(s)||!text(s.name)||!investmentSourceUrl(s.url))return invalid();for(const key of ['published_at','retrieved_at'])if(s[key]!=null&&!observed(s[key]))return invalid();urls.add(s.url);}
  for(const f of e.facts||[])if(!object(f)||!text(f.text)||!urls.has(f.source_url)||f.numbers!=null&&(!Array.isArray(f.numbers)||f.numbers.some(n=>typeof n!=='string'&&(typeof n!=='number'||!Number.isFinite(n)))))return invalid();
  for(const i of e.inferences||[])if(!object(i)||!text(i.text))return invalid();
  for(const t of e.tickers||[])if(!object(t)||!/^[A-Z0-9^][A-Z0-9.^=\-]{0,29}$/.test(t.symbol||''))return invalid();
  if(e.agents!=null&&!object(e.agents))return invalid();
  for(const [role,a] of Object.entries(e.agents||{})){
   if(!['mer','nonggu','meng'].includes(role)||!object(a)||a.role!=null&&a.role!==role||a.summary!=null&&typeof a.summary!=='string')return invalid();
   for(const key of ['evidence_ids','claims','unknowns','invalidators','next_checks'])if(a[key]!=null&&!texts(a[key]))return invalid();
   if(a.inferences!=null&&(!Array.isArray(a.inferences)||a.inferences.some(i=>!object(i)||i.text!=null&&!text(i.text)||i.evidence_ids!=null&&(!texts(i.evidence_ids)||i.evidence_ids.some(id=>!(a.evidence_ids||[]).includes(id))))))return invalid();
  }
  if(['complete','completed'].includes(e.analysis_status)&&!['mer','nonggu','meng'].every(role=>text(e.agents?.[role]?.summary)&&e.agents[role].evidence_ids?.length))return invalid();
  if((e.thesis_reviews||[]).some(r=>!object(r)||r.evidence_urls!=null&&(!Array.isArray(r.evidence_urls)||r.evidence_urls.some(url=>!investmentSourceUrl(url)))))return invalid();
  for(const p of e.performance||[]){
   if(!object(p))return invalid();
   if(['return_pct','benchmark_return_pct','excess_return_pct','mdd_pct'].some(key=>key in p))return invalid();
   const returnKeys=['stock_return','benchmark_return','excess_return'];
   for(const key of [...returnKeys,'baseline_price','close_price'])if(p[key]!=null&&(typeof p[key]!=='number'||!Number.isFinite(p[key])))return invalid();
   for(const key of ['baseline_at','followup_at','as_of','analysis_at','evaluated_at'])if(p[key]!=null&&!observed(p[key]))return invalid();
   if(p.source_urls!=null&&(!Array.isArray(p.source_urls)||p.source_urls.some(url=>!investmentSourceUrl(url))))return invalid();
   for(const key of ['source_url','benchmark_source_url'])if(p[key]!=null&&!investmentSourceUrl(p[key]))return invalid();
   if(returnKeys.some(key=>p[key]!=null)&&(!observed(p.baseline_at)||!observed(p.followup_at)||Date.parse(p.followup_at)<Date.parse(p.baseline_at)||!p.source_urls?.length))return invalid();
  }
 }
 return {status:'ready',document:doc};
}
export function investmentDate(value){
 if(!stamp(value))return '';
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
}
export const hasThesisReview=e=>(e.thesis_reviews||[]).length>0||/review|changed|weaken|strengthen|invalid|재점검|변경/i.test(e.thesis_status||'');
export function filterInvestmentEvents(events,{sector='',ticker='',date='',thesis='',sort='ranked'}={}){
 return [...events].filter(e=>(!sector||(e.sectors||[]).includes(sector))&&(!ticker||(e.tickers||[]).some(t=>t.symbol===ticker))&&(!date||investmentDate(e.published_at)===date)&&(thesis!=='review'||hasThesisReview(e))).sort((a,b)=>sort==='latest'?Date.parse(b.updated_at||b.published_at||0)-Date.parse(a.updated_at||a.published_at||0):((b.importance??-1)-(a.importance??-1))||((b.novelty??-1)-(a.novelty??-1))||a.event_id.localeCompare(b.event_id));
}
const canonical=value=>JSON.stringify(value,(_,v)=>object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export function chooseInvestmentPublication(current,incoming){
 if(!incoming)return current;
 if(!current)return incoming;
 const delta=Date.parse(incoming.generated_at)-Date.parse(current.generated_at);
 return delta>0||(delta===0&&canonical(current)===canonical(incoming))?incoming:current;
}
