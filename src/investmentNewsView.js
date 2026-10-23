import {api} from './api.js';
import {STATIC_DATA_BASE} from './staticData.js';
import {createRequestClient} from './requestClient.js';
import {validateInvestmentNews,filterInvestmentEvents,chooseInvestmentPublication,investmentDate,investmentSourceUrl} from './investmentNewsModel.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=x=>Array.isArray(x)?x:[];
const words=x=>typeof x==='string'?x:list(x).filter(v=>typeof v==='string').join(' · ');
const time=x=>x?esc(x):'시각 미제공';
const score=x=>typeof x==='number'&&Number.isFinite(x)?esc(x):'미제공';
const statusLabel={official_source:'공식 원문 확인',primary_source_observed:'공식 원문 확인 · 독립 교차검증 미확인',single_source:'단일 출처',cross_verified:'독립 교차검증',unknown:'미확인',rules_only:'규칙 선별 · AI 미실행',unavailable:'AI 미실행',not_run:'AI 미실행',blocked:'AI 실행 보류',completed:'3인 분석 완료',complete:'3인 분석 완료'};
const label=x=>esc(statusLabel[x]||x||'미확인');
const sourceLink=(url,title)=>investmentSourceUrl(url)?`<a data-investment-source href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)}</a>`:esc(title);
function agentMarkup(agents){
 return ['mer','nonggu','meng'].map(role=>{
  const a=agents?.[role];if(!a||typeof a!=='object')return '';
  const summary=words(a.summary||a.claims||a.claim||a.text);
  const details=[['미확인',a.unknowns],['반증 조건',a.invalidators],['다음 확인',a.next_checks]].map(([title,values])=>list(values).length?`<p>${title}: ${esc(words(values))}</p>`:'').join('');
  const inferences=list(a.inferences).map(i=>`<li>${esc(i.text)} · 조건 ${esc(i.condition||'미제공')} · 기간 ${esc(i.horizon||'미확인')}</li>`).join('');
  return `<div><p><strong>${{mer:'메르',nonggu:'농구천재',meng:'멍이'}[role]}</strong> · ${esc(a.status||'상태 미제공')}${summary?`<br>${esc(summary)}`:''}</p>${inferences?'<ul>'+inferences+'</ul>':''}${details}</div>`;
 }).join('');
}
export function investmentEventMarkup(e,index){
 const reviews=list(e.thesis_reviews).map(r=>`<li>${label(r.status)} · ${esc(words(r.summary||r.text||r.reason))}</li>`).join('');
 const analysis=e.analysis_status||'unavailable';
 const analysisLabel=/^(?:complete|completed)$/.test(analysis)&&!['mer','nonggu','meng'].every(role=>e.agents?.[role]?.summary)?'3인 결과 일부 미연결':label(analysis);
 const performance=list(e.performance).filter(p=>p&&typeof p==='object'&&typeof p.stock_return==='number'&&Number.isFinite(p.stock_return)&&p.baseline_at&&p.followup_at&&list(p.source_urls).some(investmentSourceUrl));
 return `<details class="investment-event" data-investment-event="${esc(e.event_id+':'+e.revision)}"><summary><span class="investment-rank">${index}</span><span class="investment-event-heading"><strong>${esc(e.title)}</strong><span>${esc(list(e.sectors).join(' · '))}${list(e.tickers).length?' · '+esc(e.tickers.map(t=>t.name||t.symbol).join(' · ')):''}</span><span>발행 ${time(e.published_at)} · 개정 ${esc(e.revision)} · 중요도 ${score(e.importance)}</span></span></summary><div class="investment-event-body">
 <p>${esc(words(e.summary)||'요약 미제공')}</p><p class="investment-note">조사 우선도 ${score(e.importance)} · 출처 신뢰도 ${score(e.confidence)} · 새로움 ${score(e.novelty)} · 시장 영향 ${score(e.market_impact)}. 규칙 점수는 투자 성공 확률이 아니에요.</p>${list(e.selection_reasons).length?'<p class="investment-note">선별 근거 · '+esc(words(e.selection_reasons))+'</p>':''}
 <dl class="investment-status"><div><dt>검증</dt><dd>${label(e.verification_status)}</dd></div><div><dt>기대 반영</dt><dd>${e.expectation_status==='unknown'||!e.expectation_status?'시장 기대 미확인':label(e.expectation_status)}</dd></div><div><dt>분석 상태</dt><dd>${analysisLabel}</dd></div><div><dt>가설 상태</dt><dd>${label(e.thesis_status)}</dd></div></dl>
 <h3>확인된 사실</h3><ul>${list(e.facts).map(f=>`<li>${esc(f.text)} · ${sourceLink(f.source_url,'출처 확인')} · ${label(f.verification)}${list(f.numbers).length?' · '+esc(f.numbers.map(n=>typeof n==='string'||typeof n==='number'?n:n?.raw||n?.value||'').filter(value=>value!==''&&value!=null).join(', ')):''}</li>`).join('')||'<li>연결된 사실 자료가 없어요.</li>'}</ul>
 <h3>조건부 해석</h3><ul>${list(e.inferences).map(i=>`<li>${esc(i.text)}<br>조건 ${esc(i.condition||'미제공')} · 기간 ${esc(i.horizon||'미확인')}</li>`).join('')||'<li>검증된 조건부 해석이 없어요.</li>'}</ul>
 <h3>3인 분석</h3>${agentMarkup(e.agents)||'<p>AI 미실행 · 실제 결과가 연결되면 표시해요.</p>'}
 <h3>공개 가설 점검</h3><ul>${reviews||'<li>공개된 가설 변경 기록이 없어요.</li>'}</ul>
 <h3>출처와 변경 이력</h3><ul>${list(e.sources).map(s=>`<li>${sourceLink(s.url,s.name)} · 발행 ${time(s.published_at)} · 확인 ${time(s.retrieved_at)}</li>`).join('')}</ul><p class="investment-note">처음 확인 ${time(e.first_seen_at)} · 수정 ${time(e.updated_at)} · 사건 ${esc(e.event_id)} / 개정 ${esc(e.revision)}</p>
 <h3>분석 이후 성과</h3>${performance.length?performance.map(p=>`<p>${esc(p.ticker||'')} · ${(p.stock_return*100).toFixed(2)}% · ${typeof p.benchmark_return==='number'?`벤치마크 ${(p.benchmark_return*100).toFixed(2)}%`:'벤치마크 미제공'} · ${typeof p.excess_return==='number'?`초과 ${(p.excess_return*100).toFixed(2)}%`:'초과 수익 미제공'}<br>기준 ${time(p.baseline_at)} → 관측 ${time(p.followup_at)}</p>`).join(''):'<p>성과 자료 미연결 · 실제 관측 가격과 비교 자료가 없으면 계산하지 않아요.</p>'}<p class="investment-note">REVIEW_ONLY · 조사·재점검용이며 기존 PICK·매수·관망·매도 판단을 변경하지 않아요.</p>
 </div></details>`;
}
async function loadNews({signal,force=false}={}){
 const options={signal,force,retries:0,timeoutMs:9000,ttlMs:30000,cacheIf:d=>validateInvestmentNews(d).status==='ready'};
 let doc;
 try{doc=await api('/api/intelligence/news',options);}
 catch(error){
  if(signal.aborted||!STATIC_DATA_BASE)throw error;
  const readPublished=createRequestClient({base:STATIC_DATA_BASE,fetchImpl:(...args)=>fetch(...args)});
  doc=await readPublished('/intelligence_investment_news.json?publication_check='+Date.now(),{...options,timeoutMs:2500,ttlMs:0,cache:'no-store',credentials:'omit'});
 }
 const result=validateInvestmentNews(doc);if(result.status!=='ready')throw new Error('invalid publication');return result.document;
}
export function mountInvestmentNews(host,{preferences={},isCurrent=()=>true,load=loadNews,onExternal}={}){
 const controller=new AbortController();let active=true,loading=false,documentData=null,notice='',checkedAt='';
 const current=()=>active&&host.isConnected&&isCurrent();
 host.innerHTML=`<section class="investment-news" aria-label="투자 뉴스"><p class="investment-note">공식 출처의 중요 사건과 조건부 투자 해석을 확인해요. 원문 전문은 출처에서 확인하세요.</p><div class="investment-controls">${[['sector','섹터'],['ticker','종목'],['date','발행일 KST'],['thesis','가설 점검'],['sort','정렬']].map(([key,title])=>`<label>${title}<select data-investment-filter="${key}" aria-label="${title}"></select></label>`).join('')}<button type="button" data-investment-clear>필터 초기화</button><button type="button" data-investment-refresh>게시 다시 확인</button></div><p data-investment-meta class="investment-note" role="status">게시 자료를 확인하고 있어요.</p><div data-investment-collection></div><div data-investment-briefings></div><div data-investment-list><p role="status">투자 뉴스를 불러오고 있어요.</p></div></section>`;
 const root=host.querySelector('.investment-news'),meta=host.querySelector('[data-investment-meta]'),results=host.querySelector('[data-investment-list]'),briefings=host.querySelector('[data-investment-briefings]'),refresh=host.querySelector('[data-investment-refresh]');
 const selects=[...host.querySelectorAll('[data-investment-filter]')];
 const optionsFor=key=>{
  const events=documentData?.events||[];
  if(key==='thesis')return [['','전체'],['review','변경·재점검']];
  if(key==='sort')return [['ranked','중요도순'],['latest','최신 변경순']];
  const values=key==='sector'?events.flatMap(e=>list(e.sectors)):key==='ticker'?events.flatMap(e=>list(e.tickers).map(t=>t.symbol)):events.map(e=>investmentDate(e.published_at)).filter(Boolean);
  return [['','전체'],...[...new Set(values)].sort().reverse().map(v=>[v,v])];
 };
 const paint=()=>{
  if(!current()||!documentData)return;
  const opened=new Set([...results.querySelectorAll('[data-investment-event][open]')].map(el=>el.dataset.investmentEvent));
  const focused=results.contains(document.activeElement)?document.activeElement.closest('[data-investment-event]')?.dataset.investmentEvent:null;
  for(const el of selects){const key=el.dataset.investmentFilter,values=optionsFor(key),value=preferences[key]??(key==='sort'?'ranked':'');if(value&&!values.some(v=>v[0]===value))values.push([value,value+' (0)']);el.innerHTML=values.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join('');el.value=value;}
  const events=filterInvestmentEvents(documentData.events,preferences);
  results.innerHTML=events.map((e,i)=>investmentEventMarkup(e,i+1)).join('')||`<p role="status">${documentData.status==='NOT_STARTED'?'아직 수집을 시작하지 않았어요.':'현재 조건에 맞는 공개 사건이 없어요.'}</p>`;
  results.querySelectorAll('[data-investment-event]').forEach(el=>{if(opened.has(el.dataset.investmentEvent))el.open=true;if(focused===el.dataset.investmentEvent)el.querySelector('summary').focus({preventScroll:true});});
  const titleFor=id=>documentData.events.find(e=>e.event_id===id)?.title||id;
  briefings.innerHTML=list(documentData.briefings).length?`<details class="investment-briefing"><summary>일일 브리핑 · ${documentData.briefings.length}건</summary>${documentData.briefings.map(b=>`<div><p><strong>${esc(b.date||b.as_of_date||'날짜 미제공')}</strong> ${esc(words(b.summary||b.items)||b.coverage_note||'')}</p><ul>${list(b.event_ids).map(id=>'<li>'+esc(titleFor(id))+'</li>').join('')}</ul>${list(b.connections).map(c=>'<p>조건부 연결 · '+esc(c.sector||'')+' · '+esc(c.text||'')+'</p>').join('')}${list(b.changed_since_previous).length?'<p>이전 브리핑 이후 변경 · '+esc(b.changed_since_previous.map(c=>titleFor(c.event_id)+' 개정 '+c.revision).join(' · '))+'</p>':''}</div>`).join('')}</details>`:'';
  const c=documentData.collection,cap=documentData.capabilities;
  host.querySelector('[data-investment-collection]').innerHTML=`<details class="investment-briefing"><summary>수집·분석 연결 상태</summary><p>출처 ${esc(c.successful_sources??'미제공')} / ${esc(c.total_sources??c.source_count??'미제공')} 성공 · 마지막 성공 ${time(c.last_success_at)}</p><p>AI ${cap.ai_configured?'설정됨 · 사건별 실제 실행 상태 확인':'미연결'} · Telegram 알림 ${cap.telegram_configured?'설정됨':'미연결'} · Telegram 입력 비활성</p><ul>${list(c.sources).map(s=>`<li>${esc(s.source_id)} · 확인 ${time(s.last_attempt_at)} · ${esc(s.last_count??s.count??'미제공')}건${s.last_error||s.error?' · 수집 실패':''}</li>`).join('')}</ul></details>`;
  paintMeta();
 };
 const paintMeta=()=>{if(!current())return;meta.textContent=documentData?`공개 사건 ${documentData.events.length}건 · 조건 일치 ${filterInvestmentEvents(documentData.events,preferences).length}건 · ${documentData.status==='PARTIAL'?'일부 출처·분석 미완료 · ':''}기준일 ${documentData.as_of_date} KST · 게시 ${documentData.generated_at}${checkedAt?' · 확인 '+checkedAt:''}${notice?' · '+notice:''}`:notice;};
 const update=async()=>{
  if(loading||!current()||document.visibilityState==='hidden')return;loading=true;refresh.disabled=true;
  try{
   const incoming=await load({signal:controller.signal,force:true});if(!current())return;
   const selected=chooseInvestmentPublication(documentData,incoming);
   if(selected!==incoming){notice='이전 게시 또는 같은 시각의 상충 자료 · 마지막 정상 자료를 표시해요.';paintMeta();return;}
   notice='';checkedAt=new Date().toISOString();const changed=JSON.stringify(documentData)!==JSON.stringify(selected);documentData=selected;if(changed)paint();else paintMeta();
  }catch{if(current()){notice='최신 게시를 불러오지 못했어요.'+(documentData?' 마지막 정상 자료를 표시해요.':' 다시 확인해 주세요.');if(!documentData)results.innerHTML='<p role="status">투자 뉴스를 불러오지 못했어요. 게시 다시 확인을 눌러주세요.</p>';paintMeta();}}
  finally{loading=false;if(current())refresh.disabled=false;}
 };
 const onChange=event=>{const key=event.target.dataset.investmentFilter;if(key){preferences[key]=event.target.value;paint();}};
 const onClick=event=>{const source=event.target.closest('[data-investment-source]');if(source&&onExternal&&investmentSourceUrl(source.href)){event.preventDefault();onExternal(source.href);}if(event.target.closest('[data-investment-refresh]'))void update();if(event.target.closest('[data-investment-clear]')){for(const key of ['sector','ticker','date','thesis','sort'])delete preferences[key];paint();}};
 root.addEventListener('change',onChange);root.addEventListener('click',onClick);document.addEventListener('visibilitychange',update);window.addEventListener('pageshow',update);
 const timer=setInterval(()=>{void update();},60000);void update();
 return ()=>{active=false;controller.abort();clearInterval(timer);root.removeEventListener('change',onChange);root.removeEventListener('click',onClick);document.removeEventListener('visibilitychange',update);window.removeEventListener('pageshow',update);};
}
