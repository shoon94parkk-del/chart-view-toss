import { screenerData, fullHeatmap, homeSnapshot, consensusData, valuationBandData } from './api.js';
import { SCREENER_PRESETS, screenerPreset, screenerMatchReasons, screenerDataWarnings, screenerEmptyState, filterScreener, finiteNumber, estimateRevision } from './analysisData.js';
import { formatKst,formatFinancialAmount,formatDataSource } from './dataPresentation.js';
import { renderSharedHeatmap } from './heatmapView.js';
import { loadChartRuntime } from './chartRuntime.js';
import { readHomeFast, writeHomeFast } from './homeFastCache.js';
import { seedWatchQuoteCache } from './watchQuoteCache.js';
import { loadingIndicator } from './loadingView.js';
import { investmentToolsMarkup, bindInvestmentToolLogos } from './investmentTools.js';
import {alignHeatmapQuotes} from './heatmapAlignment.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=(v,suffix='')=>finiteNumber(v)===null?'—':Number(v).toLocaleString('ko-KR',{maximumFractionDigits:2})+suffix;
const pct=v=>finiteNumber(v)===null?'—':`${Number(v)>0?'+':''}${number(v,'%')}`;
const empty=text=>`<div class="empty"><strong>${esc(text)}</strong></div>`;
const alignFullHeatmapWithHome=alignHeatmapQuotes;
export const ANALYSIS_ROUTES=new Set(['discover','heatmap','consensus','bands','tools']);
export function renderAnalysis({tab,state,shell,bindNav,displayName,openCompareSheet}){
 let disposed=false,chart,observer;
 const titles={discover:'시장 스크리너',heatmap:'시장 히트맵',consensus:'실적 전망 조회',bands:'역사적 밸류에이션',tools:'투자 도구'};
 const descriptions={discover:'장마감 조건 검색 · 추천 순위가 아니에요.',heatmap:'홈보다 넓은 한국·미국 주요 종목의 당일 등락을 시가총액 비중으로 비교해요.',consensus:'선택한 종목의 애널리스트 추정치와 변경 내역을 확인해요.',bands:'과거 가격과 재무자료로 재구성한 PER·PBR을 확인해요.',tools:'차트·공시·거시 데이터를 확인할 수 있는 12개 외부 사이트예요.'};
 const selection=['consensus','bands'].includes(tab);
 document.querySelector('#app').innerHTML=shell(`<section class="task-head ${tab==='discover'?'discovery-task-head':''}"><div><h2>${titles[tab]}</h2><p>${descriptions[tab]}</p></div>${selection?'<button id="analysis-select" class="primary-subtle">종목 변경</button>':''}</section><div id="analysis-controls"></div><div id="analysis-body" class="analysis-body ${tab==='discover'?'discovery-results':''}">${loadingIndicator(`${titles[tab]} 데이터를 불러오고 있어요`)}<div class="skeleton quote"></div></div>`,titles[tab]);
 const host=document.querySelector('#analysis-body'),controls=document.querySelector('#analysis-controls');
 const alive=()=>!disposed&&host.isConnected;
 bindNav();document.querySelector('#analysis-select')?.addEventListener('click',()=>openCompareSheet(()=>load()));
 const fail=(error,retry)=>{if(!alive())return;host.innerHTML=`${empty(error.message||'데이터를 불러오지 못했어요.')}<button class="retry" id="analysis-retry">다시 시도</button>`;host.querySelector('#analysis-retry').onclick=retry;};
 let generation=0;
 async function load(){
  const gen=++generation;
  const current=()=>alive()&&gen===generation;
  chart?.remove();chart=null;observer?.disconnect();
  host.innerHTML=loadingIndicator(`${titles[tab]} 데이터를 불러오고 있어요`)+'<div class="skeleton quote"></div>';
  try{
   if(tab==='discover'){
    const data=await screenerData();if(!current())return;
    const rows=Array.isArray(data.stocks)?data.stocks:[];
    let activePreset=state.screener?.activePreset||'';
    controls.innerHTML=`<section class="screener-preset-panel"><div class="screener-preset-head"><div><strong>인기 필터</strong><small>많이 쓰는 기술적 조건을 한 번에 적용해요.</small></div><button type="button" class="screener-preset-clear" data-clear-preset hidden>프리셋 해제</button></div><div class="screener-preset-strip">${SCREENER_PRESETS.map(item=>`<button type="button" class="screener-preset" data-screener-preset="${esc(item.id)}" aria-pressed="false"><span>${esc(item.icon)}</span><b>${esc(item.label)}</b><small>${esc(item.description)}</small></button>`).join('')}</div></section><details class="screener-advanced"><summary>조건 직접 설정 · 검색</summary><form class="analysis-filters" id="screener-filters"><p class="screener-basis-copy">시세는 장마감 수집값이에요. 지표는 종목별 동일 기준일의 일봉으로 계산해요. 검색어·시장·기술 조건은 함께 적용돼요.</p><label>종목명·코드<input name="query" type="search" placeholder="삼성전자 또는 005930" autocomplete="off"></label><label>시장<select name="market"><option value="">전체</option><option>KOSPI</option><option>KOSDAQ</option></select></label><label>RSI 하한<input name="rsiMin" type="number" min="0" max="100" placeholder="제한 없음"></label><label>RSI 상한<input name="rsiMax" type="number" min="0" max="100" placeholder="제한 없음"></label><label>거래량 배수 하한<input name="volumeMin" type="number" min="0" step="0.1" placeholder="제한 없음"></label><label>20일 수익률 하한(%)<input name="ret20Min" type="number" step="any" placeholder="제한 없음"></label><label>평균 거래대금 하한(억원)<input name="valueMin" type="number" min="0" step="any" placeholder="제한 없음"></label><label>추세 조건<select name="trend"><option value="">전체</option><option value="above20">20일선 위</option><option value="cross20">20일선 돌파</option><option value="trend2060">20일선 > 60일선</option><option value="aligned">20·60·120 정배열</option></select></label><label>기술 신호<select name="signal"><option value="">전체</option><option value="macdBullish">MACD 강세</option><option value="macdCrossUp">MACD 상향돌파</option><option value="goldenCross2060">20·60 골든크로스</option><option value="near52High">52주 신고가 근접</option><option value="bbBreakout">볼린저 상단 돌파</option></select></label><label>정렬<select name="sort"><option value="name">이름순</option><option value="change1d">등락률순</option><option value="volumeRatio">거래량 배수순</option><option value="avgValue20">평균 거래대금순</option><option value="ret20">20일 수익률순</option><option value="rsiAsc">RSI 낮은순</option><option value="rsiDesc">RSI 높은순</option><option value="distance52HighPct">52주 고점 근접순</option></select></label><button type="reset" class="neutral-action">초기화</button></form></details>`;
    const form=controls.querySelector('form');let count=Math.max(30,state.screener?.count||30);let applyingPreset=false;
    for(const [name,value] of Object.entries(state.screener?.filters||{})){const field=form.elements.namedItem(name);if(field)field.value=String(value);}
    const presetButtons=[...controls.querySelectorAll('[data-screener-preset]')];
    const clearPreset=controls.querySelector('[data-clear-preset]');
    const technicalNames=['rsiMin','rsiMax','volumeMin','ret20Min','valueMin','trend','signal','sort'];
    function syncPresetUi(){
     presetButtons.forEach(button=>{const on=button.dataset.screenerPreset===activePreset;button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));});
     if(clearPreset){clearPreset.textContent='기술 조건 해제';clearPreset.hidden=!technicalNames.some(name=>name!=='sort'&&form.elements.namedItem(name)?.value);}
    }
    function clearTechnical(){
     activePreset='';
     for(const name of technicalNames){const field=form.elements.namedItem(name);if(field)field.value=name==='sort'?'name':'';}
     count=30;syncPresetUi();paint();
    }
    function setPreset(id){
     const preset=screenerPreset(id);if(!preset)return;
     applyingPreset=true;
     for(const name of technicalNames){const field=form.elements.namedItem(name);if(field)field.value=name==='sort'?'name':'';}
     for(const [name,value] of Object.entries(preset.filters)){const field=form.elements.namedItem(name);if(field)field.value=String(value);}
     activePreset=id;count=30;syncPresetUi();paint();applyingPreset=false;
    }
    function paint(){
     if(!current())return;
     const filters=Object.fromEntries(new FormData(form));
     state.screener={...state.screener,filters,count,activePreset};
     if(!form.checkValidity()||(filters.rsiMin!==''&&filters.rsiMax!==''&&Number(filters.rsiMin)>Number(filters.rsiMax))){host.innerHTML=empty('조건의 범위와 RSI 상·하한을 확인해주세요.');return;}
     const filtered=filterScreener(rows,filters);
     const active=screenerPreset(activePreset);
     const presetLine=active?`<p class="screener-active-preset"><span>${esc(active.icon)} ${esc(active.label)}</span><small>${esc(active.description)}</small></p>`:'';
     const noResults=!filtered.length?screenerEmptyState(rows,filters):null;
     host.innerHTML=`${presetLine}<p class="analysis-meta">기준 거래일 ${esc(data.tradeDate||data.updated||'미제공')} · 수집 ${rows.length.toLocaleString()}개 · 조건 일치 <strong>${filtered.length.toLocaleString()}개</strong></p><p class="muted-copy">장마감 데이터 · 검색어·시장·기술 조건을 함께 적용해요.</p><div class="analysis-list">${filtered.slice(0,count).map(row=>{const reasons=screenerMatchReasons(row,filters),warnings=screenerDataWarnings(row);return `<button class="analysis-stock" data-stock-detail="${esc(row.symbol)}"><span><strong>${esc(row.name||row.symbol)}</strong></span><span><b>기준 종가 ${number(row.price,'원')}</b><em class="${Number(row.change1d)>0?'up':'down'}">${pct(row.change1d)}</em></span><span class="analysis-stock-basis">${esc(row.symbol)} · ${esc(row.market)} · ${esc(row.date||'기준일 미제공')}</span><span class="analysis-row-metrics">RSI ${number(row.rsi14)} · 거래량 ${number(row.volumeRatio,'배')} · 20일 ${pct(row.ret20)}</span>${reasons.length?`<span class="analysis-match-reasons">${reasons.map(reason=>`<i>${esc(reason)}</i>`).join('')}</span>`:''}${warnings.length?`<span class="data-quality-warning"><b>변동 기준 확인</b>${warnings.map(esc).join(' ')}</span>`:''}</button>`}).join('')||`<div class="empty"><strong>${esc(noResults.message)}</strong>${noResults.canClearTechnical?'<button type="button" class="retry" data-clear-technical>기술 조건 해제</button>':''}</div>`}</div>${count<filtered.length?'<button class="retry" id="screener-more">30개 더 보기</button>':''}`;
     bindNav();
     host.querySelector('[data-clear-technical]')?.addEventListener('click',clearTechnical);
     if(state.returnFocusSymbol){const target=[...host.querySelectorAll('[data-stock-detail]')].find(el=>el.dataset.stockDetail===state.returnFocusSymbol);if(target){target.focus({preventScroll:true});state.returnFocusSymbol=null;}}
     host.querySelector('#screener-more')?.addEventListener('click',()=>{count+=30;paint();});
    }
    presetButtons.forEach(button=>button.addEventListener('click',()=>setPreset(button.dataset.screenerPreset)));
    clearPreset?.addEventListener('click',clearTechnical);
    form.onsubmit=e=>e.preventDefault();
    const manualChange=()=>{const filters=Object.fromEntries(new FormData(form));if(JSON.stringify(filters)===JSON.stringify(state.screener?.filters))return;if(!applyingPreset&&activePreset)activePreset='';syncPresetUi();count=30;paint();};
    form.oninput=manualChange;form.onchange=manualChange;
    form.onreset=e=>{e.preventDefault();activePreset='';for(const input of form.querySelectorAll('input,select'))input.value=input.name==='sort'?'name':'';count=30;syncPresetUi();paint();};
    const advanced=controls.querySelector('.screener-advanced');
    advanced.open=Boolean(state.screener?.advancedOpen);
    advanced.addEventListener('toggle',()=>{state.screener.advancedOpen=advanced.open;});
    if(state.screenerPreset&&state.screener.appliedRoutePreset!==state.screenerPreset){
      for(const field of form.querySelectorAll('input,select'))field.value=field.name==='sort'?'name':'';
      state.screener.appliedRoutePreset=state.screenerPreset;setPreset(state.screenerPreset);
    }else{syncPresetUi();paint();}
   }else if(tab==='heatmap'){
    const {mountSectorHeatmap}=await import('./sectorHeatmapView.js');if(!current())return;
    seedWatchQuoteCache(state.watchlist.map(x=>x.symbol));
    let latestHome=readHomeFast('snapshot',6*60*60*1000);
    let shownFull=readHomeFast('full-heatmap',6*60*60*1000);
    let fullCached=Boolean(shownFull);
    let fullError=false;
    host.innerHTML=`<div class="shared-heatmap-analysis">${loadingIndicator('전체 히트맵 데이터를 불러오고 있어요')}</div><section class="section sector-heatmap-section"><div class="section-head"><h2>섹터별 등락 히트맵</h2></div><div data-full-sectors></div></section>`;
    const sectorView=mountSectorHeatmap(host.querySelector('[data-full-sectors]'),{onStock:symbol=>window.__chartviewNavigate?.('detail',symbol),retry:()=>void refreshFull(true)});
    sectorView.loading();
    state.heatmap ||= {view:'stocks',market:'KR'};
    controls.innerHTML='<div class="heatmap-explore-controls"><div role="group" aria-label="히트맵 보기"><button type="button" data-heatmap-view="stocks">종목</button><button type="button" data-heatmap-view="sectors">섹터</button></div><div role="group" aria-label="종목 히트맵 시장"><button type="button" data-full-market="KR">한국</button><button type="button" data-full-market="US">미국</button></div><small>종목은 개별 등락, 섹터는 업종과 구성 종목을 보여줘요.</small></div>';
    function syncView(){
      const sector=state.heatmap.view==='sectors';
      host.querySelector('.shared-heatmap-analysis').hidden=sector;
      host.querySelector('.sector-heatmap-section').hidden=!sector;
      controls.querySelectorAll('[data-full-market]').forEach(b=>{b.hidden=sector;b.setAttribute('aria-pressed',String(b.dataset.fullMarket===state.heatmap.market));});
      controls.querySelectorAll('[data-heatmap-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.heatmapView===state.heatmap.view)));
    }
    controls.querySelectorAll('[data-heatmap-view]').forEach(b=>b.onclick=()=>{state.heatmap.view=b.dataset.heatmapView;syncView();});syncView();
    controls.querySelectorAll('[data-full-market]').forEach(b=>b.onclick=()=>{state.heatmap.market=b.dataset.fullMarket;syncView();if(shownFull)paintFull(shownFull);});
    const paintFull=(full,{save=false}={})=>{
      if(!current()||!full?.results?.length)return;
      shownFull=full;
      const payload=alignFullHeatmapWithHome(full,latestHome);
      host.querySelector('.shared-heatmap-analysis').innerHTML=(fullError?'<p class="muted-copy" role="status">새 시세 조회에 실패해 이전 수집 시세를 표시해요.</p>':'')+renderSharedHeatmap(payload,{scope:'full',cached:fullCached,market:state.heatmap.market});
      sectorView.update({...payload,error:fullError});
      if(save)writeHomeFast('full-heatmap',payload);
      bindNav();
    };
    if(shownFull)paintFull(shownFull);
    void homeSnapshot().then(home=>{
      if(!current()||!home)return;
      latestHome=home;
      if(shownFull)paintFull(shownFull,{save:true});
    }).catch(()=>{});
    async function refreshFull(force=false){
      fullError=false;
      sectorView?.loading();
      try{
        let full=await fullHeatmap({force});if(!current())return;
          if(!full?.results?.length)throw new Error('전체 히트맵 데이터를 아직 확인하지 못했어요.');
          fullCached=false;
        paintFull(full,{save:true});
        for(let i=0;full?.refreshing&&i<20&&current();i++){
          await new Promise(resolve=>setTimeout(resolve,3000));if(!current())return;
          full=await fullHeatmap({force:true});
          if(!full?.results?.length){
            if(full?.refreshing)continue;
            throw new Error('집계 시세를 확인하지 못했어요.');
          }
          if(current())paintFull(full,{save:true});
        }
        if(full?.refreshing&&current())sectorView?.error();
      }catch(error){
        if(!current())return;
        fullError=true;
        if(shownFull)paintFull(shownFull);
        sectorView.error();
        if(!shownFull){
          const fullHost=host.querySelector('.shared-heatmap-analysis');
          if(fullHost){
            fullHost.innerHTML=`${empty(error.message||'전체 히트맵 데이터를 불러오지 못했어요.')}<button class="retry" data-full-heatmap-retry>다시 시도</button>`;
            fullHost.querySelector('[data-full-heatmap-retry]')?.addEventListener('click',()=>void refreshFull(true));
          }
        }
      }
    }
    await refreshFull();
   }else if(tab==='consensus'){
    const symbols=[...state.selected];
    if(!symbols.length){host.innerHTML=empty('종목 변경에서 조회할 종목을 선택해주세요.');return;}
    controls.innerHTML='<label class="analysis-period">추정 기간<select id="consensus-period"><option value="0y">현재 회계연도 · 연간</option><option value="+1y">다음 회계연도 · 연간</option><option value="0q">현재 분기</option><option value="+1q">다음 분기</option></select></label>';
    host.innerHTML=symbols.map((symbol,i)=>`<section id="estimate-${i}" class="analysis-card"><h3>${esc(displayName(symbol))}</h3>${loadingIndicator('추정치를 불러오고 있어요')}</section>`).join('');
    const loaded=new Map();
    function paint(i,result){
     if(!current())return;
     const box=host.querySelector(`#estimate-${i}`),symbol=symbols[i],d=result.value;
     if(result.status!=='fulfilled'){box.innerHTML=`<h3>${esc(displayName(symbol))}</h3><p>추정치를 불러오지 못했어요.</p><button class="retry" data-estimate-retry="${i}">다시 시도</button>`;box.querySelector('button').onclick=()=>fetchOne(symbol,i);return;}
     const period=controls.querySelector('select').value,row=d.periods?.[period];state.consensusPeriod=period;
     const annual=period.endsWith('y');
     const periodKind=annual?'회계연도 전체':'분기';
     box.innerHTML=`<button class="text-button" data-stock-detail="${esc(symbol)}">${esc(displayName(symbol,d.name))} · ${esc(symbol)}</button><p class="analysis-meta">${esc(formatDataSource(d.source||'출처 미제공'))} · ${esc(formatKst(d.asOf))}</p>${row?`<p><strong>${esc(periodKind)} 추정치</strong> · 회계기간 종료 ${esc(row.endDate)} · ${esc(d.currency||'통화 미제공')}</p><dl class="analysis-metrics"><div><dt>${annual?'연간 ':''}EPS 평균 추정</dt><dd>${number(row.earnings?.avg)}</dd></div><div><dt>EPS 범위</dt><dd>${number(row.earnings?.low)} ~ ${number(row.earnings?.high)}</dd></div><div><dt>참여 애널리스트</dt><dd>${number(row.earnings?.analysts,'명')}</dd></div><div><dt>${annual?'연간 ':''}매출 평균 추정</dt><dd>${esc(formatFinancialAmount(row.revenue?.avg,d.currency))}<small>원값 ${esc(number(row.revenue?.avg))} ${esc(d.currency||'')}</small></dd></div><div><dt>EPS 30일 변경</dt><dd>${pct(estimateRevision(row.epsTrend?.current??row.earnings?.avg,row.epsTrend?.['30daysAgo']))}</dd></div><div><dt>30일 상향 / 하향 건수</dt><dd>${number(row.revisions?.up30)} / ${number(row.revisions?.down30)}</dd></div></dl><p class="muted-copy">Yahoo earningsTrend의 ${annual?'회계연도 전체':'해당 분기'} 컨센서스예요. 연간 수치를 분기 실적과 직접 비교하지 마세요. 추정치는 확정 실적이 아니며 EPS가 0을 넘나드는 변경률은 표시하지 않아요.</p>`:empty('이 기간의 추정치가 제공되지 않아요.')}`;bindNav();
    }
    async function fetchOne(symbol,i){const result=await consensusData(symbol).then(value=>({status:'fulfilled',value}),reason=>({status:'rejected',reason}));loaded.set(i,result);paint(i,result);}
    controls.querySelector('select').value=state.consensusPeriod||'0y';
    controls.querySelector('select').onchange=()=>loaded.forEach((result,i)=>paint(i,result));
    await Promise.all(symbols.map(fetchOne));
   }else if(tab==='bands'){
    const symbols=[...state.selected];if(!symbols.length){host.innerHTML=empty('종목 변경에서 조회할 종목을 선택해주세요.');return;}
    controls.innerHTML=`<div class="analysis-filters"><label>종목<select id="band-symbol">${symbols.map(x=>`<option value="${esc(x)}">${esc(displayName(x))}</option>`).join('')}</select></label><label>기간<select id="band-years"><option value="3">3년</option><option value="5">5년</option><option value="10">10년</option></select></label><label>지표<select id="band-metric"><option value="per">PER</option><option value="pbr">PBR</option></select></label></div>`;
    let bandSeq=0,data=null,chartRuntime=null;
    if(state.band){if(symbols.includes(state.band.symbol))controls.querySelector('#band-symbol').value=state.band.symbol;controls.querySelector('#band-years').value=String(state.band.years);controls.querySelector('#band-metric').value=state.band.metric;}
    const saveBand=()=>state.band={symbol:controls.querySelector('#band-symbol').value,years:Number(controls.querySelector('#band-years').value),metric:controls.querySelector('#band-metric').value};
    function paint(){
     if(!current())return;chart?.remove();chart=null;observer?.disconnect();
     saveBand();const metric=controls.querySelector('#band-metric').value,series=data?.[metric],stats=series?.stats;
     host.innerHTML=`<p class="analysis-meta">${esc(formatDataSource(data?.source||''))} · 조회 ${esc(formatKst(data?.generatedAt))}</p><p class="muted-copy">${esc(data?.method||'')}</p><p class="muted-copy">과거 공시일을 완전히 복원한 지표가 아니며 재무자료에 보수적 시차를 적용한 재구성이에요.</p><div id="band-chart" class="detail-chart"></div>${stats?`<dl class="analysis-metrics"><div><dt>최근값</dt><dd>${number(stats.current,'배')}</dd></div><div><dt>중앙값</dt><dd>${number(stats.median,'배')}</dd></div><div><dt>하위 20% 경계</dt><dd>${number(stats.p20,'배')}</dd></div><div><dt>상위 20% 경계</dt><dd>${number(stats.p80,'배')}</dd></div></dl><p class="analysis-meta">${esc(stats.start)} ~ ${esc(stats.end)} · ${number(stats.observations)}개 관측</p>`:empty('이 종목의 해당 지표 이력이 제공되지 않아요.')}`;
     const canvas=host.querySelector('#band-chart');if(!series?.points?.length)return;
     chart=chartRuntime.createChart(canvas,{localization:{locale:'ko-KR',dateFormat:'yyyy.MM.dd'},width:canvas.clientWidth,height:230,handleScale:{pinch:false},layout:{background:{type:chartRuntime.ColorType.Solid,color:'#fff'},textColor:'#6b7684'},timeScale:{borderVisible:false},rightPriceScale:{borderVisible:false}});
     const line=chart.addLineSeries({color:'#3182f6',lineWidth:2,priceLineVisible:false});line.setData(series.points);if(stats)for(const value of [stats.p20,stats.median,stats.p80])if(finiteNumber(value)!==null)line.createPriceLine({price:Number(value),color:'#9ca3af',lineWidth:1,lineStyle:2,axisLabelVisible:true});chart.timeScale().fitContent();
     observer=new ResizeObserver(()=>{if(chart&&canvas.isConnected)chart.applyOptions({width:canvas.clientWidth});});observer.observe(canvas);
    }
    async function fetchBand(){saveBand();const seq=++bandSeq;data=null;chart?.remove();chart=null;observer?.disconnect();host.innerHTML=loadingIndicator('과거 가격·재무자료를 조회하고 있어요');try{const [next,runtime]=await Promise.all([valuationBandData(controls.querySelector('#band-symbol').value,Number(controls.querySelector('#band-years').value)),loadChartRuntime()]);if(seq!==bandSeq||!current())return;data=next;chartRuntime=runtime;paint();}catch(error){if(seq===bandSeq&&current())fail(error,fetchBand);}}
    controls.querySelector('#band-symbol').onchange=fetchBand;controls.querySelector('#band-years').onchange=fetchBand;controls.querySelector('#band-metric').onchange=()=>{if(data)paint();};await fetchBand();
   }else{
    host.innerHTML=investmentToolsMarkup();bindInvestmentToolLogos(host);bindNav();
   }
  }catch(error){if(current())fail(error,load);}
 }
 void load();return()=>{disposed=true;generation++;chart?.remove();observer?.disconnect();};
}
