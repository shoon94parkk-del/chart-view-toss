import {guruScreeningData,guruEvidenceData,valuationStocks} from './api.js';
import {GURU_STRATEGIES,guruMetricLabels,guruMetricUnits,guruRowMetrics,validateGuruSnapshot,filterGuruResults,guruViewStatus,greenblattCurrentCheck} from './guruInvestingModel.js';
import {extensionCriteria,extensionEvidence} from './guruInvestingExtensions.js';
import {loadingIndicator} from './loadingView.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,suffix='')=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('ko-KR',{maximumFractionDigits:1})+suffix:'—';
function criteria(strategy){
 if(!['buffett','lynch'].includes(strategy))return extensionCriteria(strategy);
 const rows=strategy==='buffett'?[['이익','최근 3년 각각 흑자'],['ROE','각 연도 10% 이상 · 3년 평균 15% 이상'],['현금','3년 OCF 각각 양수 · 합계가 순이익 이상'],['부채','최근 부채총계 ÷ 자본총계 100% 이하']]:[['EPS','4년 양수 보통주 기본 EPS · 주당 기준 검증'],['성장','3년 연평균 10~30% · 최근 EPS 증가'],['가격','연간 실적 PER ÷ 과거 EPS 성장률 ≤1'],['재무','최근 영업현금흐름 양수 · 부채비율 ≤100%']];
 const source=strategy==='buffett'?'https://www.berkshirehathaway.com/letters/1982.html':'https://research2.fidelity.com/fidelity/screeners/commonstock/strategy.asp?simpleStrategy=%7BF61E8D5C-32C9-499B-8F6D-DD6DAF53EB78%7D';
 return `<details class="guru-guide"><summary>선정 기준 · 투자 원칙 보기</summary><div><p>투자 원칙을 참고해 <b>차트뷰가 정한 수치 기준</b>이에요. 해당 투자자가 선정한 종목이 아니에요.</p><dl>${rows.map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}</dl><p>${strategy==='buffett'?'ROE는 총순이익 ÷ 평균 총자본이에요. 부채총계는 차입금과 다르고, OCF는 영업현금흐름이며 오너이익이 아니에요.':'PER은 기준일 종가 ÷ 최근 연간 EPS예요. PEG는 이 PER ÷ 과거 3년 EPS 성장률(20%는 20)이에요. TTM·예상 지표와 구분해요.'}</p><p>${GURU_STRATEGIES[strategy].limits}</p><button class="guru-text-action" data-external-url="${esc(source)}">투자 원칙 출처 확인 ↗</button></div></details>`;
}
function metric(key,value){return `<span><small>${esc(guruMetricLabels[key])}</small><b>${num(value,guruMetricUnits[key]||'%')}</b></span>`;}
function candidate(row,strategy,expanded,currentCheck=null,currentState='idle'){
 const keys=guruRowMetrics[strategy];
 const ttmLabel=currentCheck?.status==='matched'?'TTM 충족':currentCheck?.status==='failed'?'TTM 미충족':currentCheck?.status==='unknown'?'TTM 자료 부족':currentState==='loading'?'TTM 확인 중':currentState==='error'?'TTM 확인 실패':'TTM 확인 전';
 const reason=strategy==='greenblatt'?`${row.annualReportYear} 연간 · ${ttmLabel} · 근거 ${expanded?'⌃':'⌄'}`:`${row.checks.length}개 조건 충족 · 선정 근거 ${expanded?'⌃':'⌄'}`;
 return `<article class="guru-candidate" data-guru-symbol="${esc(row.symbol)}"><div class="guru-row"><button class="guru-stock" data-stock-detail="${esc(row.symbol)}" data-stock-name="${esc(row.name)}" aria-label="${esc(row.name)} 종목 상세"><strong>${esc(row.name)}</strong><small>${esc(row.market)} · ${esc(row.symbol.split('.')[0])}</small></button><button class="guru-expand" data-guru-expand="${esc(row.symbol)}" aria-expanded="${expanded}" aria-label="${esc(row.name)} 선정 근거"><span class="guru-metrics">${keys.map(k=>metric(k,row.metrics[k])).join('')}</span><span class="guru-reason-label">${esc(reason)}</span></button></div>${expanded?'<section class="guru-evidence" aria-live="polite">'+loadingIndicator('공시 근거를 확인하고 있어요')+'</section>':''}</article>`;
}
function evidenceMarkup(evidence,strategy,row,currentCheck=null){
 if(!['buffett','lynch'].includes(strategy))return extensionEvidence(evidence,strategy,row,currentCheck);
 const selected=evidence.strategies?.[strategy];
 if(!selected||selected.status!=='matched')throw new Error('같은 선정 기준의 근거를 확인하지 못했어요.');
 const keys=strategy==='buffett'?['netIncome','operatingCashFlow','equity']:['basicEps','operatingCashFlow','equity'];
 const labels={netIncome:'순이익',operatingCashFlow:'영업현금',equity:'자본',basicEps:'기본 EPS'};
 const money=(v,k)=>num(k==='basicEps'?v:typeof v==='number'?v/1e8:null);
 const sources=new Map();
 for(const accounts of Object.values(evidence.sources||{}))for(const source of Object.values(accounts||{}))if(/^https:\/\/dart\.fss\.or\.kr\/dsaf001\/main\.do\?rcpNo=\d{14}$/.test(source.sourceUrl||''))sources.set(source.receiptNo,source);
 const checkValue=c=>c.id==='profit'||(c.id==='cash'&&strategy==='lynch')?num(c.value/1e8,'억원'):num(c.value,c.id==='valuation'?'배':'%');
 return `<p class="guru-evidence-basis">${evidence.basis==='CFS'?'연결':'별도'}재무제표 · ${strategy==='lynch'?'EPS 원 / 기타 금액 억원':'금액 억원'} · ${esc(row.annualReportYear)}년까지</p>${strategy==='lynch'?`<p>연간 실적 PER ${num(selected.metrics.annualPE,'배')} · 최근 연간 EPS ${num(selected.metrics.basicEps,'원')}</p>`:''}<ul class="guru-checks">${selected.checks.map(c=>`<li><b>${esc(c.label)}</b><span>${esc(c.threshold)} <em>확인 ${checkValue(c)}</em></span></li>`).join('')}</ul><div class="guru-table-wrap"><table><thead><tr><th>연도</th>${keys.map(k=>`<th>${labels[k]}</th>`).join('')}</tr></thead><tbody>${(evidence.annual||[]).map(r=>`<tr><th>${esc(r.year)}</th>${keys.map(k=>`<td>${money(r[k],k)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="guru-source-links">${[...sources.values()].sort((a,b)=>b.receiptNo.localeCompare(a.receiptNo)).map(s=>`<button data-external-url="${esc(s.sourceUrl)}">${s.reportYear}년 보고서 · ${esc(s.filingDate)} ↗</button>`).join('')}</div><details class="guru-next"><summary>추가로 생각해볼 질문</summary><ul>${GURU_STRATEGIES[strategy].questions.map(q=>`<li>${esc(q)}</li>`).join('')}</ul><p>${GURU_STRATEGIES[strategy].limits}</p></details><div class="guru-evidence-actions"><button data-stock-detail="${esc(row.symbol)}" data-stock-name="${esc(row.name)}">종목 상세</button><button data-tab="discover">기술적 조건 검색</button></div><p class="guru-footnote">기술 검색으로 이동하면 별도 조건과 기준일로 조회해요. 이 재무 조건이 함께 적용되지는 않아요.</p>`;
}

export function renderGuruInvesting({state,shell,bindNav,navigate,isCurrent}){
 let disposed=false,sequence=0,data=state.guruSnapshot||null;
 let saved={};try{saved=JSON.parse(sessionStorage.getItem('cv-guru-session-v1')||'{}')||{};}catch{}
 const session=state.gurus ||= {query:typeof saved.query==='string'?saved.query:'',market:['KOSPI','KOSDAQ'].includes(saved.market)?saved.market:'',count:Number.isInteger(saved.count)&&saved.count>=30?saved.count:30,expandedSymbol:/^\d{6}\.(KS|KQ)$/.test(saved.expandedSymbol||'')?saved.expandedSymbol:null};
 const save=()=>{try{sessionStorage.setItem('cv-guru-session-v1',JSON.stringify(session));}catch{}};
 const strategy=state.guruStrategy||'buffett';
 const current=()=>!disposed&&isCurrent();
 document.querySelector('#app').innerHTML=shell(`<section class="guru-page"><nav class="guru-strategies" aria-label="투자 원칙 선택">${Object.entries(GURU_STRATEGIES).map(([id,s])=>`<button data-guru-strategy="${id}" aria-pressed="${id===strategy}"><b>${s.name}</b><span>${s.label}</span></button>`).join('')}</nav><p class="guru-intro">${GURU_STRATEGIES[strategy].intro}</p>${criteria(strategy)}<div id="guru-data">${loadingIndicator('재무 조건 결과를 확인하고 있어요')}</div></section>`,'거장 투자법');
 document.querySelectorAll('[data-guru-strategy]').forEach(b=>b.onclick=()=>navigate('gurus',b.dataset.guruStrategy));
 document.querySelector('[data-guru-strategy][aria-pressed=true]')?.scrollIntoView({block:'nearest',inline:'center'});
 const host=document.querySelector('#guru-data');
 bindNav();
 const detailsCache=state.guruEvidenceCache ||= new Map();
 let currentChecks=new Map(),currentState='idle',currentVersion=null,currentSequence=0;
 const currentCheckFor=row=>{
  if(strategy!=='greenblatt')return null;
  if(currentChecks.has(row.symbol))return currentChecks.get(row.symbol);
  return currentState==='loading'?{status:'loading'}:currentState==='error'?{status:'error'}:currentState==='ready'?{status:'unknown'}:null;
 };
 function paintCurrentSummary(){
  const target=host.querySelector('.guru-current-summary');if(!target||strategy!=='greenblatt'||!data)return;
  const rows=data.strategies.greenblatt?.results||[];
  if(currentState==='loading'){target.textContent='연간 후보의 현재 TTM ROA·PER를 재확인하고 있어요.';return;}
  if(currentState==='error'){target.textContent='TTM 재확인 실패 · 연간 선정값은 유지해요.';return;}
  if(currentState!=='ready'){target.textContent='TTM 재확인은 연간 선정과 분리해 표시해요.';return;}
  let matched=0,failed=0,unknown=0;
  for(const row of rows){const status=currentChecks.get(row.symbol)?.status;if(status==='matched')matched++;else if(status==='failed')failed++;else unknown++;}
  target.textContent=`연간 후보 ${rows.length}개 TTM 재확인 · 충족 ${matched} · 미충족 ${failed} · 자료 부족 ${unknown}`;
 }
 async function loadGreenblattCurrent(){
  if(strategy!=='greenblatt'||!data?.strategies?.greenblatt)return;
  if(currentVersion===data.snapshotVersion&&['loading','ready'].includes(currentState))return;
  currentVersion=data.snapshotVersion;currentState='loading';currentChecks=new Map();const seq=++currentSequence;
  paintCurrentSummary();if(host.querySelector('.guru-list'))paintRows();
  const symbols=(data.strategies.greenblatt.results||[]).map(r=>r.symbol).slice(0,30);
  if(!symbols.length){currentState='ready';paintCurrentSummary();return;}
  try{
   const response=await valuationStocks(symbols);if(!current()||seq!==currentSequence)return;
   const rows=Array.isArray(response?.stocks)?response.stocks:[];
   for(const value of rows){const symbol=value?.ticker||value?.symbol;if(symbols.includes(symbol))currentChecks.set(symbol,greenblattCurrentCheck(value));}
   currentState='ready';paintCurrentSummary();paintRows();
  }catch{if(!current()||seq!==currentSequence)return;currentState='error';paintCurrentSummary();paintRows();}
 }
 async function showEvidence(row){
  const target=host.querySelector(`[data-guru-symbol="${row.symbol}"] .guru-evidence`);
  if(!target||!data)return;
  const version=data.snapshotVersion,key=version+':'+row.symbol;
  try{
   let evidence=detailsCache.get(key);
   if(!evidence){evidence=await guruEvidenceData(row.symbol,version);if(evidence.snapshotVersion!==version||evidence.symbol!==row.symbol)throw new Error('선정 근거의 버전이 달라요.');detailsCache.set(key,evidence);while(detailsCache.size>30)detailsCache.delete(detailsCache.keys().next().value);}
   if(!current()||!target.isConnected||data.snapshotVersion!==version)return;
   target.innerHTML=evidenceMarkup(evidence,strategy,row,currentCheckFor(row));bindNav();window.__chartviewRestoreScroll?.();
  }catch(error){if(!current()||!target.isConnected)return;target.innerHTML=`<p>${error.status===409?'결과가 갱신되어 같은 버전의 근거를 확인할 수 없어요.':esc(error.message||'근거를 불러오지 못했어요.')}</p><button class="guru-retry-evidence">${error.status===409?'최신 결과 확인':'근거 다시 확인'}</button>`;target.querySelector('button').onclick=()=>error.status===409?load(true):showEvidence(row);}
 }
 function rowsMarkup(){
  const s=data.strategies[strategy],rows=filterGuruResults(s.results,session,strategy),status=guruViewStatus(s);
  return {rows,html:rows.length?rows.slice(0,session.count).map(r=>candidate(r,strategy,session.expandedSymbol===r.symbol,currentCheckFor(r),currentState)).join('')+(rows.length>session.count?'<button class="guru-more">더 보기</button>':''):`<div class="guru-empty"><strong>${status.status==='ready'?'검색 조건에 맞는 선정 기업이 없어요.':esc(status.title)}</strong><p>${status.status==='ready'?'선정된 결과 안에서 검색해요. 검색어나 시장 조건을 바꿔보세요.':esc(status.text)}</p></div>`};
 }
 function paintRows(){
  save();
  const output=rowsMarkup(),list=host.querySelector('.guru-list');list.innerHTML=output.html;
  host.querySelector('.guru-search-count').textContent=`선정 결과 안에서 검색 · ${output.rows.length}개`;
  list.querySelectorAll('[data-guru-expand]').forEach(b=>b.onclick=()=>{session.expandedSymbol=session.expandedSymbol===b.dataset.guruExpand?null:b.dataset.guruExpand;paintRows();});
  const more=list.querySelector('.guru-more');if(more)more.onclick=()=>{session.count+=30;paintRows();};
  bindNav();
  const row=output.rows.find(r=>r.symbol===session.expandedSymbol);if(row)showEvidence(row);
  window.__chartviewRestoreScroll?.();
 }
 function paint(){
  const s=data.strategies[strategy];
  if(!s){host.innerHTML='<div class="guru-empty"><strong>새 기준의 결과가 아직 게시되지 않았어요.</strong><p>기존 버핏·린치 결과는 계속 확인할 수 있어요.</p><button class="guru-retry">최신 결과 확인</button></div>';host.querySelector('button').onclick=()=>load(true);return;}
  const basis=strategy==='minervini'?'253거래일 일봉 추세':strategy==='oneil'?'단일 분기·연간 공시와 일봉':strategy==='greenblatt'?'확정 연간 ROA·PER + 기준일 종가':'기업별 최근 연간 공시';
  const matchedLabel=strategy==='greenblatt'?'연간 조건 충족':'조건 충족';
  host.innerHTML=`<div class="guru-coverage"><strong>${matchedLabel} ${s.matchedCount}개 <span>검증 ${s.evaluatedCount.toLocaleString()} / 대상 ${s.universeCount.toLocaleString()}</span></strong><small>${esc(data.tradeDate)} 종가 · ${basis}</small>${strategy==='greenblatt'?'<small class="guru-current-summary">TTM 재확인은 연간 선정과 분리해 표시해요.</small>':''}<small>수집 대기 ${s.pendingCount} · 자료 부족 ${s.insufficientCount} · 지원 제외 ${s.unsupportedCount}</small></div><form class="guru-filters"><input type="search" aria-label="선정 기업 이름 또는 코드" placeholder="선정 기업 이름·코드" value="${esc(session.query)}"><select aria-label="선정 기업 시장"><option value="">전체 시장</option><option ${session.market==='KOSPI'?'selected':''}>KOSPI</option><option ${session.market==='KOSDAQ'?'selected':''}>KOSDAQ</option></select></form><small class="guru-search-count"></small><div class="guru-list"></div><p class="guru-footnote">출처: ${strategy==='minervini'?'KIND · Yahoo Finance':'OpenDART · KIND · Yahoo Finance'}<br>${strategy==='minervini'?'일봉 기준 '+esc(data.tradeDate):'재무 확인 '+esc(String(data.financialAsOf).slice(0,10))} · 결과 생성 ${esc(String(data.generatedAt).slice(0,10))}<br>차트뷰의 조건 조회이며 투자 권유가 아니에요.</p>`;
  const form=host.querySelector('form');form.onsubmit=e=>e.preventDefault();
  form.querySelector('input').oninput=e=>{session.query=e.target.value;session.count=30;paintRows();};
  form.querySelector('select').onchange=e=>{session.market=e.target.value;session.count=30;paintRows();};
  paintRows();paintCurrentSummary();loadGreenblattCurrent();
 }
 async function load(force=false){
  const seq=++sequence;
  try{const fresh=validateGuruSnapshot(await guruScreeningData({force}));if(!current()||seq!==sequence)return;data=fresh;state.guruSnapshot=fresh;paint();}
  catch(error){if(!current()||seq!==sequence)return;if(data){let notice=host.querySelector('.guru-refresh-error');if(!notice){notice=document.createElement('p');notice.className='guru-refresh-error';host.prepend(notice);}notice.innerHTML='결과 갱신을 확인하지 못했어요. 표시된 기준일의 자료를 유지해요. <button>다시 확인</button>';notice.querySelector('button').onclick=()=>load(true);}else{host.innerHTML=`<div class="guru-empty"><strong>재무 조건 결과를 불러오지 못했어요.</strong><p>${esc(error.message)}</p><button class="guru-retry">다시 확인</button></div>`;host.querySelector('button').onclick=()=>load(true);}}
 }
 if(data){try{validateGuruSnapshot(data);paint();}catch{data=null;}}
 load();
 return ()=>{disposed=true;sequence++;currentSequence++;};
}

