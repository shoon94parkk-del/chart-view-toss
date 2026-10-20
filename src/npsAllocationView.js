import {npsSummaryData,npsHoldingsData} from './npsAllocationData.js';
import {calculateNpsScenario,npsFreshness} from './npsAllocationModel.js';
import {loadingIndicator} from './loadingView.js';
import {openExternal} from './tossBridge.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const number=(value,digits=1)=>typeof value==='number'&&Number.isFinite(value)?value.toLocaleString('ko-KR',{minimumFractionDigits:digits,maximumFractionDigits:digits}):'—';
const signed=(value,digits=2)=>typeof value==='number'&&Number.isFinite(value)?`${value>0?'+':''}${number(value,digits)}`:'—';
const safeUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:null;}catch{return null;}};
const sourceButton=(url,label)=>safeUrl(url)?`<button type="button" data-nps-source="${esc(safeUrl(url))}">${esc(label)} ↗</button>`:'';
const PAGE_SIZE=10;

export function renderNpsAllocation({state,shell,bindNav,isCurrent=()=>true}) {
 const session=state.pension ||= {};
 const detailCache=session.holdingsCache instanceof Map?session.holdingsCache:(session.holdingsCache=new Map());
 let data=session.snapshot||null,disposed=false,summarySequence=0,detailSequence=0,summaryController=null,detailController=null,refreshing=false,checkingFailed=false;
 let holdingsVersion=null,holdings=null,holdingsLoading=false,holdingsError=false,pageIndex=0;
 let scenario={...(session.scenario||{})};
 const current=()=>!disposed&&isCurrent();
 document.querySelector('#app').innerHTML=shell(`<section class="nps-page" aria-label="국민연금 국내주식 추정"><p class="nps-intro">국민연금의 국내주식 비중을 공시와 시장 종가로 추정해요.</p><div class="nps-summary" data-nps-summary>${loadingIndicator('국민연금 게시 자료를 확인하고 있어요')}</div><div class="nps-refresh-row"><p data-nps-status role="status" aria-live="polite">게시 자료 확인 중</p><button type="button" data-nps-refresh>게시 자료 새로 확인</button></div><div class="nps-evidence" data-nps-evidence hidden><details class="nps-detail" data-nps-detail="assets"><summary>자산별 평가 근거</summary><div class="nps-detail-body" data-nps-assets></div></details><details class="nps-detail" data-nps-detail="holdings"><summary>13F 보유 내역</summary><div class="nps-detail-body" data-nps-holdings><div data-nps-holdings-intro></div><label class="nps-search-label" for="nps-holding-search">보고된 보유 항목 검색</label><input id="nps-holding-search" type="search" aria-label="13F 종목 검색" placeholder="티커 또는 영문 회사명" autocomplete="off"><div data-nps-holdings-list></div><div class="nps-pagination" data-nps-pagination hidden><button type="button" data-nps-prev>이전 10개</button><span data-nps-page></span><button type="button" data-nps-next>다음 10개</button></div></div></details><details class="nps-detail" data-nps-detail="method"><summary>추정 전제와 출처</summary><div class="nps-detail-body" data-nps-method></div></details><details class="nps-detail" data-nps-detail="scenario"><summary>시장 가정 바꾸기</summary><div class="nps-detail-body"><p>내 가정을 적용해 비교해요. 위의 게시 요약은 그대로 유지돼요.</p><form class="nps-scenario-form"><label for="nps-kospi">시나리오 코스피</label><input id="nps-kospi" name="kospi" inputmode="decimal" type="number" min="1" max="100000" step="any"><label for="nps-fx">시나리오 환율 변화율 <span>(공시 기준 대비 %)</span></label><input id="nps-fx" name="fxReturn" inputmode="decimal" type="number" min="-99.99" step="any"><label for="nps-equity">시나리오 해외주식 수익률 <span>(외화 기준 %)</span></label><input id="nps-equity" name="equityReturn" inputmode="decimal" type="number" min="-99.99" step="any"><button type="button" data-nps-scenario-reset>게시 가정으로 초기화</button></form><div class="nps-scenario-result" data-nps-scenario-result aria-live="polite"></div></div></details></div></section>`,'국민연금 국내주식');
 const host=document.querySelector('.nps-page');
 const find=selector=>host.querySelector(selector);
 const refreshButton=find('[data-nps-refresh]');
 const scenarioForm=find('.nps-scenario-form');
 const search=find('#nps-holding-search');
 bindNav();

 function paintStatus() {
  if(!current())return;
  refreshButton.disabled=refreshing;
  const status=find('[data-nps-status]');
  const filingStatus=data?.market?.latestFilingCheck?.status;
  const filingNote=filingStatus==='review-required'?' · 새 13F 보유 명세 검증 대기':filingStatus==='unavailable'?' · 새 13F 확인 지연':'';
  status.classList.toggle('nps-status-warning',checkingFailed||!!data&&npsFreshness(data).stale||!!filingNote);
  if(refreshing){status.textContent=data?'게시 자료 확인 중 · 표시된 기준일을 유지해요':'게시 자료 확인 중';return;}
  if(!data){status.textContent='자료를 불러오지 못했어요. 새로 확인해 주세요.';return;}
  const checked=session.checkedAt?new Date(session.checkedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}):null;
  status.textContent=checkingFailed?'새 게시 확인 실패 · 이전 유효 자료를 유지해요':`게시 확인${checked?' '+checked:''}${npsFreshness(data).stale?' · 시장 데이터 갱신 지연':''}${filingNote}`;
 }
 function paintSummary() {
  const result=calculateNpsScenario(data),direction=result.adjustment<0?'축소':result.adjustment>0?'확대':'조정 없음';
  const low=calculateNpsScenario(data,{target:data.inputs.target-.5}).targetKospi;
  const high=calculateNpsScenario(data,{target:data.inputs.target+.5}).targetKospi;
  const targetChange=result.targetKospi/data.inputs.kospi*100-100;
  find('[data-nps-summary]').innerHTML=`<div class="nps-weight-row"><div><span class="nps-eyebrow">추정 국내주식 비중</span><strong data-nps-weight>${number(result.weight,2)}<small>%</small></strong></div><span class="nps-estimate-tag">모형 추정</span></div><dl class="nps-metrics"><div><dt>목표 비중</dt><dd>${number(data.inputs.target,1)}%</dd></div><div><dt>목표 대비</dt><dd data-nps-gap>${signed(result.gap,2)}%p</dd></div><div><dt>목표까지 내부 조정</dt><dd data-nps-adjustment>${number(Math.abs(result.adjustment),1)}조 원 <span>${direction}</span></dd></div></dl><div class="nps-target-band"><span>목표 ${number(data.inputs.target,1)}% 도달 예상 코스피</span><strong data-nps-target-kospi>${number(result.targetKospi,0)}<small>pt</small></strong><p>현재 ${number(data.inputs.kospi,0)}pt 대비 ${signed(targetChange,1)}% · 근접 범위(±0.5%p): <b data-nps-target-range>${number(low,0)}~${number(high,0)}pt</b></p></div><p class="nps-summary-note">총자산을 유지한 자산 간 조정액이에요. 실제 매매 예상액과 달라요. 목표선은 다른 자산을 고정한 조건부 추정이에요.</p><p class="nps-price-date">가격 기준 <b data-nps-price-date>${esc(data.marketDate)}</b> 종가</p>`;
  find('[data-nps-evidence]').hidden=false;
 }
 function paintAssets() {
  const result=calculateNpsScenario(data);
  find('[data-nps-assets]').innerHTML=`<p>${esc(data.baseline.date)} 공시 평가액에서 시장 수익과 환율 변화를 반영해요. 금액 단위는 조 원이에요.</p><ul class="nps-asset-list">${result.assets.map(asset=>`<li><div class="nps-asset-heading"><strong>${esc(asset.name)}</strong><b>${number(asset.projected,1)}조</b></div><p>${esc(asset.method)}</p><dl class="nps-asset-bridge"><div><dt>공시</dt><dd>${number(asset.base,1)}</dd></div><div><dt>시장·이자</dt><dd>${signed(asset.marketGain,1)}</dd></div><div><dt>환율</dt><dd>${signed(asset.fxGain,1)}</dd></div></dl></li>`).join('')}</ul><p>외화자산의 환노출 부분에 환율 변화 ${signed(data.inputs.fxReturn,2)}%를 한 번 적용해요. 환헤지 ${number(data.inputs.hedgeRatio,0)}%는 공통 가정이에요.</p><p>국내주식 ${number(result.domestic,1)}조 + 기타자산 ${number(result.other,1)}조 = 총 ${number(result.total,1)}조 원으로 추정해요.</p>`;
 }
 function paintMethod() {
  const f=data.filing,result=calculateNpsScenario(data);
  find('[data-nps-method]').innerHTML=`<dl class="nps-method-dates"><div><dt>공식 기금 기준</dt><dd>${esc(data.baseline.date)}<small>${esc(data.baseline.publishedAt)} 발표</small></dd></div><div><dt>13F 수량 기준</dt><dd>${esc(f.reportDate)}<small>${esc(f.filedDate)} 제출</small></dd></div><div><dt>시장 가격 기준</dt><dd>${esc(data.marketDate)}</dd></div><div><dt>게시물 생성</dt><dd>${esc(data.generatedAt?.slice(0,10))}</dd></div></dl><p>13F의 보고 수량을 유지하고 주식분할·배당을 반영한 이론적 평가예요. 이후 실제 매매는 확인할 수 없어요. 13F는 미국 상장 보고대상 증권이며 해외주식 전체가 아니에요.</p><p>직접 평가액은 해외주식 공시 잔액 안에 넣고, 나머지는 ACWI 수익률로 추정해요. ETF는 펀드 단위로 계산하며 구성 종목을 다시 더하지 않아요. 달러 기준 수익률에 환율은 한 번만 적용해요.</p><p>목표 ${number(data.inputs.target,1)}%에 대응하는 코스피는 약 ${number(result.targetKospi,0)}예요. 다른 자산의 현재 추정액과 가정을 유지할 때의 조건부 계산이며 매수 시점을 뜻하지 않아요.</p><p>SAA ${number(data.inputs.saa,0)}%p · TAA ${number(data.inputs.taa,0)}%p는 보도에 따른 가정이에요. 합산 한도를 실제 매수 여력으로 해석하지 않아요.</p>${data.warnings?.length?`<ul class="nps-warnings">${data.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>`:''}<p>시장 종가 게시물을 화면을 열 때와 5분마다 확인해요. 새 공식 기금 공시와 13F 보유 명세는 검증 후 반영돼요. 확인 시각이 새 가격이나 새 보유수량을 뜻하지는 않아요.</p><div class="nps-source-list">${(data.sources||[]).map(source=>`<article><strong>${esc(source.title)}</strong><p>${esc(source.detail)}</p><p>${esc(source.note)}</p><div>${sourceButton(source.url,'출처 보기')}${sourceButton(source.secondUrl,source.secondLabel||'관련 자료')}${sourceButton(source.download,'공시 원문')}${(source.extraLinks||[]).map(link=>sourceButton(link.url,link.label)).join('')}</div></article>`).join('')}</div><p data-nps-source-status role="status"></p>`;
 }
 function fillScenario() {
  for(const key of ['kospi','fxReturn','equityReturn']){
   const input=scenarioForm.elements.namedItem(key);
   const value=String(Object.hasOwn(scenario,key)?scenario[key]:Number(data.inputs[key].toFixed(4)));
   if(input.value!==value)input.value=value;
  }
  paintScenario();
 }
 function paintScenario() {
  if(!data)return;
  const modified=Object.keys(scenario).length>0;
  session.scenario={...scenario};
  try {
   if(Object.values(scenario).some(value=>value===''||!Number.isFinite(Number(value))))throw new Error();
   const patch=Object.fromEntries(Object.entries(scenario).map(([key,value])=>[key,Number(value)]));
   const result=calculateNpsScenario(data,patch);
   find('[data-nps-scenario-result]').innerHTML=`<span class="nps-scenario-tag">${modified?'사용자 가정':'게시 가정'}</span><p>국내주식 비중 <strong>${number(result.weight,2)}%</strong><br>목표 대비 ${signed(result.gap,2)}%p · 내부 조정 ${number(Math.abs(result.adjustment),1)}조 원 ${result.adjustment<0?'축소':'확대'}<br>목표 비중 도달 코스피 <strong>${number(result.targetKospi,0)}pt</strong></p><small>환율·수익률은 ${esc(data.baseline.date)} 대비예요. 다른 입력은 게시 가정을 유지해요.</small>`;
  }catch{find('[data-nps-scenario-result]').textContent='입력 범위를 확인해 주세요. 코스피는 0보다 커야 하고 변화율은 −100%보다 커야 해요.';}
 }
 function paintHoldingsIntro() {
  const f=data.filing;
  find('[data-nps-holdings-intro]').innerHTML=`<p>${esc(f.reportDate)} 보고 수량 · ${esc(data.marketDate)} 가격 추정</p><p>직접 평가 <b>${f.directCount}/${f.totalCount}개</b> · 13F 보고금액의 <b>${number(f.reportCoveragePct,2)}%</b>를 확인했어요.</p><p>직접 평가한 부분은 전체 해외주식 공시 잔액의 <b>${number(f.overseasCoveragePct,1)}%</b>예요. 나머지 해외주식은 지수로 추정해요.</p><p>보고금액 비중 순 · 평가액은 배당 재투자를 가정한 백만 달러 단위예요. 평가하지 못한 값은 ‘—’로 표시해요.</p>`;
 }
 function paintHoldingRows() {
  const target=find('[data-nps-holdings-list]'),pagination=find('[data-nps-pagination]');
  if(holdingsLoading){target.innerHTML=loadingIndicator('같은 게시 버전의 13F 내역을 확인하고 있어요');pagination.hidden=true;return;}
  if(holdingsError){target.innerHTML='<p>같은 게시 버전의 내역을 불러오지 못했어요. 다시 확인해 주세요.</p><button type="button" data-nps-holdings-retry>13F 내역 다시 시도</button>';pagination.hidden=true;return;}
  if(!holdings){target.innerHTML='';pagination.hidden=true;return;}
  const query=search.value.trim().toLocaleLowerCase(),rows=holdings.rows.filter(row=>!query||`${row.ticker} ${row.issuer}`.toLocaleLowerCase().includes(query)).sort((a,b)=>b.reportValueUSD-a.reportValueUSD);
  const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));pageIndex=Math.min(pageIndex,pages-1);
  const page=rows.slice(pageIndex*PAGE_SIZE,(pageIndex+1)*PAGE_SIZE);
  target.innerHTML=page.length?`<ul class="nps-holding-list">${page.map(row=>`<li data-nps-holding-row><div class="nps-holding-heading"><strong>${esc(row.ticker)}</strong><span>13F 비중 ${number(row.weightPct,2)}%</span></div><p class="nps-issuer">${esc(row.issuer)}</p><dl class="nps-holding-values"><div><dt>보고 수량</dt><dd>${number(row.shares,0)}주</dd></div><div><dt>기간 수익률</dt><dd>${row.method==='direct'?signed(row.totalReturnPct,2)+'%':'—'}</dd></div><div><dt>추정 평가액</dt><dd>${row.method==='direct'?number(row.currentValueUSD/1e6,1):'—'}</dd></div></dl>${row.method==='residual'?'<small>직접 평가 제외 · 잔여 해외주식 지수 추정에 포함</small>':''}</li>`).join('')}</ul>`:'<p class="nps-no-results">검색 결과가 없어요</p>';
  pagination.hidden=!rows.length;
  find('[data-nps-page]').textContent=`${pageIndex+1} / ${pages} · ${rows.length}개`;
  find('[data-nps-prev]').disabled=pageIndex===0;
  find('[data-nps-next]').disabled=pageIndex>=pages-1;
 }
 async function loadHoldings(force=false) {
  if(!data||!current())return;
  const version=data.snapshotVersion;
  if(holdingsLoading&&holdingsVersion===version)return;
  if(!force&&holdings&&holdingsVersion===version)return;
  detailController?.abort();detailController=new AbortController();
  const seq=++detailSequence,controller=detailController,summary=data;
  holdingsVersion=version;holdingsLoading=true;holdingsError=false;paintHoldingsIntro();paintHoldingRows();
  try {
   const next=!force&&detailCache.has(version)?detailCache.get(version):await npsHoldingsData(summary,{force,signal:controller.signal});
   if(!current()||seq!==detailSequence||data.snapshotVersion!==version)return;
   if(next.snapshotVersion!==version)throw new Error('게시 버전 불일치');
   holdings=next;detailCache.set(version,next);while(detailCache.size>2)detailCache.delete(detailCache.keys().next().value);
  }catch(error){if(!current()||seq!==detailSequence||data.snapshotVersion!==version||error?.name==='AbortError')return;holdings=null;holdingsError=true;}
  finally{if(current()&&seq===detailSequence&&data.snapshotVersion===version){holdingsLoading=false;paintHoldingRows();}}
 }
 function paintPublication(previousVersion=null) {
  const focusedSource=host.contains(document.activeElement)?document.activeElement?.dataset?.npsSource:null;
  paintSummary();paintAssets();paintMethod();fillScenario();paintHoldingsIntro();
  if(previousVersion!==data.snapshotVersion){
   detailController?.abort();detailSequence++;holdings=null;holdingsVersion=null;holdingsLoading=false;holdingsError=false;pageIndex=0;paintHoldingRows();
   if(find('[data-nps-detail="holdings"]').open)loadHoldings();
  }
  if(focusedSource)[...host.querySelectorAll('[data-nps-source]')].find(button=>button.dataset.npsSource===focusedSource)?.focus({preventScroll:true});
 }
 async function loadSummary(force=false) {
  if(refreshing||!current())return;
  refreshing=true;checkingFailed=false;paintStatus();
  summaryController?.abort();summaryController=new AbortController();const seq=++summarySequence;
  try {
   const next=await npsSummaryData({force,signal:summaryController.signal});
   if(!current()||seq!==summarySequence)return;
   if(data&&(next.marketDate<data.marketDate||next.marketDate===data.marketDate&&Date.parse(next.generatedAt)<Date.parse(data.generatedAt)))throw new Error('이전 게시 자료');
   const previousVersion=data?.snapshotVersion;
   data=next;session.snapshot=next;session.checkedAt=new Date().toISOString();
   paintPublication(previousVersion);
  }catch(error){
   if(!current()||seq!==summarySequence||error?.name==='AbortError')return;
   checkingFailed=true;
   if(!data)find('[data-nps-summary]').innerHTML='<div class="nps-initial-error"><strong>국민연금 자료를 불러오지 못했어요</strong><p>연결을 확인한 뒤 아래에서 게시 자료를 새로 확인해 주세요.</p></div>';
  }finally{if(current()&&seq===summarySequence){refreshing=false;paintStatus();}}
 }
 refreshButton.onclick=()=>loadSummary(true);
 find('[data-nps-detail="holdings"]').addEventListener('toggle',event=>{if(event.target.open)loadHoldings();});
 search.addEventListener('input',()=>{pageIndex=0;paintHoldingRows();});
 find('[data-nps-prev]').onclick=()=>{pageIndex--;paintHoldingRows();};
 find('[data-nps-next]').onclick=()=>{pageIndex++;paintHoldingRows();};
 scenarioForm.onsubmit=event=>event.preventDefault();
 scenarioForm.addEventListener('input',event=>{if(['kospi','fxReturn','equityReturn'].includes(event.target.name)){scenario[event.target.name]=event.target.value;paintScenario();}});
 find('[data-nps-scenario-reset]').onclick=()=>{scenario={};fillScenario();};
 const handleClick=async event=>{
  const retry=event.target.closest('[data-nps-holdings-retry]');if(retry){loadHoldings(true);return;}
  const button=event.target.closest('[data-nps-source]');if(!button)return;
  const url=safeUrl(button.dataset.npsSource);if(!url)return;
  try{if(!await openExternal(url)&&current())find('[data-nps-source-status]').textContent='출처를 열지 못했어요. 다시 눌러 주세요.';}catch{if(current())find('[data-nps-source-status]').textContent='출처를 열지 못했어요. 다시 눌러 주세요.';}
 };
 host.addEventListener('click',handleClick);
 const visibleRefresh=()=>{if(document.visibilityState==='visible')loadSummary(true);};
 document.addEventListener('visibilitychange',visibleRefresh);
 const timer=setInterval(visibleRefresh,5*60*1000);
 if(data){try{paintPublication();}catch{data=null;session.snapshot=null;}}
 loadSummary();
 return ()=>{disposed=true;summarySequence++;detailSequence++;summaryController?.abort();detailController?.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visibleRefresh);host.removeEventListener('click',handleClick);};
}
