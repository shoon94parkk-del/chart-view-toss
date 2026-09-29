import { screenerData, fullHeatmap, homeSnapshot, consensusData, valuationBandData } from './api.js';
import { SCREENER_PRESETS, screenerPreset, screenerMatchReasons, filterScreener, finiteNumber, estimateRevision } from './analysisData.js';
import { formatKst } from './dataPresentation.js';
import { renderSharedHeatmap } from './heatmapView.js';
import { loadChartRuntime } from './chartRuntime.js';
import { rememberLiveQuotes, mergeRowsWithLive } from './liveQuoteStore.js';
import { readHomeFast, writeHomeFast } from './homeFastCache.js';
import { seedWatchQuoteCache } from './watchQuoteCache.js';
import { loadingIndicator } from './loadingView.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=(v,suffix='')=>finiteNumber(v)===null?'—':Number(v).toLocaleString('ko-KR',{maximumFractionDigits:2})+suffix;
const pct=v=>finiteNumber(v)===null?'—':`${Number(v)>0?'+':''}${number(v,'%')}`;
const empty=text=>`<div class="empty"><strong>${esc(text)}</strong></div>`;
const alignFullHeatmapWithHome=(full,home)=>{
 rememberLiveQuotes(full?.results||[],{priority:10});
 rememberLiveQuotes(home?.heatmap?.results||[],{priority:20});
 return {
  ...full,
  results:mergeRowsWithLive(full?.results||[]),
 };
};
export const ANALYSIS_ROUTES=new Set(['discover','heatmap','consensus','bands','tools']);
export function renderAnalysis({tab,state,shell,bindNav,displayName,openCompareSheet}){
 let disposed=false,chart,observer;
 const titles={discover:'시장 스크리너',heatmap:'시장 히트맵',consensus:'실적 전망 조회',bands:'역사적 밸류에이션',tools:'자료 출처'};
 const descriptions={discover:'전체 수집 종목을 직접 검색·필터링해요. 장마감 데이터이며 추천 순위가 아니에요.',heatmap:'홈보다 넓은 한국·미국 주요 종목의 당일 등락을 시가총액 비중으로 비교해요.',consensus:'선택한 종목의 애널리스트 추정치와 변경 내역을 확인해요.',bands:'과거 가격과 재무자료로 재구성한 PER·PBR을 확인해요.',tools:'자료 확인에 필요한 외부 공식 사이트예요.'};
 const selection=['consensus','bands'].includes(tab);
 document.querySelector('#app').innerHTML=shell(`<section class="task-head"><div><h2>${titles[tab]}</h2><p>${descriptions[tab]}</p></div>${selection?'<button id="analysis-select" class="primary-subtle">종목 변경</button>':''}</section><div id="analysis-controls"></div><div id="analysis-body" class="analysis-body">${loadingIndicator(`${titles[tab]} 데이터를 불러오고 있어요`)}<div class="skeleton quote"></div></div>`,titles[tab]);
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
    let activePreset='';
    controls.innerHTML=`<section class="screener-preset-panel"><div class="screener-preset-head"><div><strong>인기 필터</strong><small>많이 쓰는 기술적 조건을 한 번에 적용해요.</small></div><button type="button" class="screener-preset-clear" data-clear-preset hidden>프리셋 해제</button></div><div class="screener-preset-strip">${SCREENER_PRESETS.map(item=>`<button type="button" class="screener-preset" data-screener-preset="${esc(item.id)}" aria-pressed="false"><span>${esc(item.icon)}</span><b>${esc(item.label)}</b><small>${esc(item.description)}</small></button>`).join('')}</div></section><form class="analysis-filters" id="screener-filters"><label>종목명·코드<input name="query" type="search" placeholder="삼성전자 또는 005930" autocomplete="off"></label><label>시장<select name="market"><option value="">전체</option><option>KOSPI</option><option>KOSDAQ</option></select></label><label>RSI 하한<input name="rsiMin" type="number" min="0" max="100" placeholder="제한 없음"></label><label>RSI 상한<input name="rsiMax" type="number" min="0" max="100" placeholder="제한 없음"></label><label>거래량 배수 하한<input name="volumeMin" type="number" min="0" step="0.1" placeholder="제한 없음"></label><label>20일 수익률 하한(%)<input name="ret20Min" type="number" step="any" placeholder="제한 없음"></label><label>평균 거래대금 하한(억원)<input name="valueMin" type="number" min="0" step="any" placeholder="제한 없음"></label><label>추세 조건<select name="trend"><option value="">전체</option><option value="above20">20일선 위</option><option value="cross20">20일선 돌파</option><option value="trend2060">20일선 > 60일선</option><option value="aligned">20·60·120 정배열</option></select></label><label>기술 신호<select name="signal"><option value="">전체</option><option value="macdBullish">MACD 강세</option><option value="macdCrossUp">MACD 상향돌파</option><option value="goldenCross2060">20·60 골든크로스</option><option value="near52High">52주 신고가 근접</option><option value="bbBreakout">볼린저 상단 돌파</option></select></label><label>정렬<select name="sort"><option value="name">이름순</option><option value="change1d">등락률순</option><option value="volumeRatio">거래량 배수순</option><option value="avgValue20">평균 거래대금순</option><option value="ret20">20일 수익률순</option><option value="rsiAsc">RSI 낮은순</option><option value="rsiDesc">RSI 높은순</option><option value="distance52HighPct">52주 고점 근접순</option></select></label><button type="reset" class="neutral-action">초기화</button></form>`;
    const form=controls.querySelector('form');let count=30;let applyingPreset=false;
    const presetButtons=[...controls.querySelectorAll('[data-screener-preset]')];
    const clearPreset=controls.querySelector('[data-clear-preset]');
    const technicalNames=['rsiMin','rsiMax','volumeMin','ret20Min','valueMin','trend','signal','sort'];
    function syncPresetUi(){
     presetButtons.forEach(button=>{const on=button.dataset.screenerPreset===activePreset;button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));});
     if(clearPreset)clearPreset.hidden=!activePreset;
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
     if(!form.checkValidity()||(filters.rsiMin!==''&&filters.rsiMax!==''&&Number(filters.rsiMin)>Number(filters.rsiMax))){host.innerHTML=empty('조건의 범위와 RSI 상·하한을 확인해주세요.');return;}
     const filtered=filterScreener(rows,filters);
     const active=screenerPreset(activePreset);
     const presetLine=active?`<p class="screener-active-preset"><span>${esc(active.icon)} ${esc(active.label)}</span><small>${esc(active.description)}</small></p>`:'';
     host.innerHTML=`${presetLine}<p class="analysis-meta">기준 거래일 ${esc(data.tradeDate||data.updated||'미제공')} · 수집 ${rows.length.toLocaleString()}개 · 조건 일치 <strong>${filtered.length.toLocaleString()}개</strong></p><p class="muted-copy">시세는 장마감 수집값이에요. 지표는 종목별 동일 기준일의 일봉으로 계산해요.</p><div class="analysis-list">${filtered.slice(0,count).map(row=>{const reasons=screenerMatchReasons(row,filters);return `<button class="analysis-stock" data-stock-detail="${esc(row.symbol)}"><span><strong>${esc(row.name||row.symbol)}</strong><small>${esc(row.symbol)} · ${esc(row.market)} · ${esc(row.date||'기준일 미제공')}</small></span><span><b>${number(row.price,'원')}</b><em class="${Number(row.change1d)>0?'up':'down'}">${pct(row.change1d)}</em></span><span class="analysis-row-metrics">RSI ${number(row.rsi14)} · 거래량 ${number(row.volumeRatio,'배')} · 20일 ${pct(row.ret20)}</span>${reasons.length?`<span class="analysis-match-reasons">${reasons.map(reason=>`<i>${esc(reason)}</i>`).join('')}</span>`:''}</button>`}).join('')||empty('조건에 맞는 종목이 없어요.')}</div>${count<filtered.length?'<button class="retry" id="screener-more">30개 더 보기</button>':''}`;
     bindNav();host.querySelector('#screener-more')?.addEventListener('click',()=>{count+=30;paint();});
    }
    presetButtons.forEach(button=>button.addEventListener('click',()=>setPreset(button.dataset.screenerPreset)));
    clearPreset?.addEventListener('click',()=>{activePreset='';syncPresetUi();});
    form.onsubmit=e=>e.preventDefault();
    const manualChange=()=>{if(!applyingPreset&&activePreset){activePreset='';syncPresetUi();}count=30;paint();};
    form.oninput=manualChange;form.onchange=manualChange;
    form.onreset=e=>{e.preventDefault();activePreset='';for(const input of form.querySelectorAll('input,select'))input.value=input.name==='sort'?'name':'';count=30;syncPresetUi();paint();};
    syncPresetUi();paint();
   }else if(tab==='heatmap'){
    seedWatchQuoteCache(state.watchlist.map(x=>x.symbol));
    let latestHome=readHomeFast('snapshot',6*60*60*1000);
    let shownFull=readHomeFast('full-heatmap',6*60*60*1000);
    const paintFull=(full,{save=false}={})=>{
      if(!current()||!full?.results?.length)return;
      shownFull=full;
      const payload=alignFullHeatmapWithHome(full,latestHome);
      host.innerHTML=`<div class="shared-heatmap-analysis">${renderSharedHeatmap(payload,{scope:'full'})}</div>`;
      if(save)writeHomeFast('full-heatmap',payload);
      bindNav();
    };
    if(shownFull)paintFull(shownFull);
    void homeSnapshot().then(home=>{
      if(!current()||!home)return;
      latestHome=home;
      if(shownFull)paintFull(shownFull,{save:true});
    }).catch(()=>{});
    let full;
    try{full=await fullHeatmap({force:true});}
    catch(error){if(!shownFull)throw error;host.insertAdjacentHTML('beforeend','<p class="muted-copy">새 히트맵을 확인하지 못했어요. 표시된 업데이트 시각을 확인해주세요.</p>');return;}
    if(!current())return;
    if(!full?.results?.length){if(!shownFull)host.innerHTML=empty('전체 히트맵 데이터가 아직 준비되지 않았어요.');return;}
    paintFull(full,{save:true});
    if(full?.complete===false||full?.refreshing){
      setTimeout(async()=>{
        if(!current())return;
        try{
          const nextFull=await fullHeatmap({force:true});
          if(current())paintFull(nextFull,{save:true});
        }catch{}
      },1800);
    }
   }else if(tab==='consensus'){
    const symbols=[...state.selected];
    if(!symbols.length){host.innerHTML=empty('종목 변경에서 조회할 종목을 선택해주세요.');return;}
    controls.innerHTML='<label class="analysis-period">추정 기간<select id="consensus-period"><option value="0y">올해</option><option value="+1y">내년</option><option value="0q">이번 분기</option><option value="+1q">다음 분기</option></select></label>';
    host.innerHTML=symbols.map((symbol,i)=>`<section id="estimate-${i}" class="analysis-card"><h3>${esc(displayName(symbol))}</h3>${loadingIndicator('추정치를 불러오고 있어요')}</section>`).join('');
    const loaded=new Map();
    function paint(i,result){
     if(!current())return;
     const box=host.querySelector(`#estimate-${i}`),symbol=symbols[i],d=result.value;
     if(result.status!=='fulfilled'){box.innerHTML=`<h3>${esc(displayName(symbol))}</h3><p>추정치를 불러오지 못했어요.</p><button class="retry" data-estimate-retry="${i}">다시 시도</button>`;box.querySelector('button').onclick=()=>fetchOne(symbol,i);return;}
     const period=controls.querySelector('select').value,row=d.periods?.[period];
     box.innerHTML=`<button class="text-button" data-stock-detail="${esc(symbol)}">${esc(displayName(symbol,d.name))} · ${esc(symbol)}</button><p class="analysis-meta">${esc(d.source||'출처 미제공')} · ${esc(formatKst(d.asOf))}</p>${row?`<p>회계기간 종료 ${esc(row.endDate)} · ${esc(d.currency||'통화 미제공')}</p><dl class="analysis-metrics"><div><dt>EPS 평균 추정</dt><dd>${number(row.earnings?.avg)}</dd></div><div><dt>EPS 범위</dt><dd>${number(row.earnings?.low)} ~ ${number(row.earnings?.high)}</dd></div><div><dt>참여 애널리스트</dt><dd>${number(row.earnings?.analysts,'명')}</dd></div><div><dt>매출 평균 추정</dt><dd>${number(row.revenue?.avg)}</dd></div><div><dt>EPS 30일 변경</dt><dd>${pct(estimateRevision(row.epsTrend?.current??row.earnings?.avg,row.epsTrend?.['30daysAgo']))}</dd></div><div><dt>30일 상향 / 하향 건수</dt><dd>${number(row.revisions?.up30)} / ${number(row.revisions?.down30)}</dd></div></dl><p class="muted-copy">추정치는 확정 실적이 아니에요. EPS가 0을 넘나드는 변경률은 표시하지 않아요.</p>`:empty('이 기간의 추정치가 제공되지 않아요.')}`;bindNav();
    }
    async function fetchOne(symbol,i){const result=await consensusData(symbol).then(value=>({status:'fulfilled',value}),reason=>({status:'rejected',reason}));loaded.set(i,result);paint(i,result);}
    controls.querySelector('select').onchange=()=>loaded.forEach((result,i)=>paint(i,result));
    await Promise.all(symbols.map(fetchOne));
   }else if(tab==='bands'){
    const symbols=[...state.selected];if(!symbols.length){host.innerHTML=empty('종목 변경에서 조회할 종목을 선택해주세요.');return;}
    controls.innerHTML=`<div class="analysis-filters"><label>종목<select id="band-symbol">${symbols.map(x=>`<option value="${esc(x)}">${esc(displayName(x))}</option>`).join('')}</select></label><label>기간<select id="band-years"><option value="3">3년</option><option value="5">5년</option><option value="10">10년</option></select></label><label>지표<select id="band-metric"><option value="per">PER</option><option value="pbr">PBR</option></select></label></div>`;
    let bandSeq=0,data=null,chartRuntime=null;
    function paint(){
     if(!current())return;chart?.remove();chart=null;observer?.disconnect();
     const metric=controls.querySelector('#band-metric').value,series=data?.[metric],stats=series?.stats;
     host.innerHTML=`<p class="analysis-meta">${esc(data?.source||'')} · 조회 ${esc(formatKst(data?.generatedAt))}</p><p class="muted-copy">${esc(data?.method||'')}</p><p class="muted-copy">과거 공시일을 완전히 복원한 지표가 아니며 재무자료에 보수적 시차를 적용한 재구성이에요.</p><div id="band-chart" class="detail-chart"></div>${stats?`<dl class="analysis-metrics"><div><dt>최근값</dt><dd>${number(stats.current,'배')}</dd></div><div><dt>중앙값</dt><dd>${number(stats.median,'배')}</dd></div><div><dt>하위 20% 경계</dt><dd>${number(stats.p20,'배')}</dd></div><div><dt>상위 20% 경계</dt><dd>${number(stats.p80,'배')}</dd></div></dl><p class="analysis-meta">${esc(stats.start)} ~ ${esc(stats.end)} · ${number(stats.observations)}개 관측</p>`:empty('이 종목의 해당 지표 이력이 제공되지 않아요.')}`;
     const canvas=host.querySelector('#band-chart');if(!series?.points?.length)return;
     chart=chartRuntime.createChart(canvas,{localization:{locale:'ko-KR'},width:canvas.clientWidth,height:230,handleScale:{pinch:false},layout:{background:{type:chartRuntime.ColorType.Solid,color:'#fff'},textColor:'#6b7684'},timeScale:{borderVisible:false},rightPriceScale:{borderVisible:false}});
     const line=chart.addLineSeries({color:'#3182f6',lineWidth:2,priceLineVisible:false});line.setData(series.points);if(stats)for(const value of [stats.p20,stats.median,stats.p80])if(finiteNumber(value)!==null)line.createPriceLine({price:Number(value),color:'#9ca3af',lineWidth:1,lineStyle:2,axisLabelVisible:true});chart.timeScale().fitContent();
     observer=new ResizeObserver(()=>{if(chart&&canvas.isConnected)chart.applyOptions({width:canvas.clientWidth});});observer.observe(canvas);
    }
    async function fetchBand(){const seq=++bandSeq;data=null;chart?.remove();chart=null;observer?.disconnect();host.innerHTML=loadingIndicator('과거 가격·재무자료를 조회하고 있어요');try{const [next,runtime]=await Promise.all([valuationBandData(controls.querySelector('#band-symbol').value,Number(controls.querySelector('#band-years').value)),loadChartRuntime()]);if(seq!==bandSeq||!current())return;data=next;chartRuntime=runtime;paint();}catch(error){if(seq===bandSeq&&current())fail(error,fetchBand);}}
    controls.querySelector('#band-symbol').onchange=fetchBand;controls.querySelector('#band-years').onchange=fetchBand;controls.querySelector('#band-metric').onchange=()=>{if(data)paint();};await fetchBand();
   }else{
    const sources=[['DART','기업 공시','https://dart.fss.or.kr/'],['KRX','한국거래소 데이터','https://data.krx.co.kr/'],['FRED','경제지표 원자료','https://fred.stlouisfed.org/'],['Yahoo Finance','해외 시세·재무 원자료','https://finance.yahoo.com/'],['네이버 금융','국내 시세·뉴스 원자료','https://finance.naver.com/']];
    host.innerHTML=sources.map(([name,desc,url])=>`<button class="feature-row" data-external-url="${url}"><span><strong>${name}</strong><small>${desc} · 외부 사이트</small></span><b>↗</b></button>`).join('');bindNav();
   }
  }catch(error){if(current())fail(error,load);}
 }
 void load();return()=>{disposed=true;generation++;chart?.remove();observer?.disconnect();};
}
