import {uiIcon, surfaceIdentity,featureLabel} from './uiIdentity.js';
import { valueEntriesMarkup } from './valueDiscovery.js';
import {marketBrief} from './insightModel.js';
import {investigationHtml} from './insightView.js';
import {savedResearchHtml} from './savedResearchView.js';
import './insight.css';
import { resolveRoute } from './routes.js';
import {indexSeries,quoteHtml,detailCachedQuote,marketCapHtml,metricBasis,invalidSymbolHtml} from './detailPresentation.js';
import {encodeSharedView,decodeSharedView,homeBriefState,quoteBasisLabel} from './experienceState.js';
import { recordMetric, diagnosticSummary, clearDiagnostics } from './diagnostics.js';
import './styles.css';
import './homeExtras.css';
import './homeExtras.js';
import './experience.css';
import './valueDiscovery.css';
import './visualIdentity.css';
import './uiExperience.css';
import './emphasis.css';
import './mobileContinuity.css';
import { SHOW_SPOTLIGHT } from './releaseScope.js';
import { ANALYSIS_ROUTES, renderAnalysis } from './analysisViews.js';
import packageInfo from '../package.json';
import { finiteNumber } from './analysisData.js';
import { marketNowLive } from './api.js';
import { loadChartRuntime } from './chartRuntime.js';
import { API_BASE, quoteSnapshots, quoteSnapshotsLive, compareStocks, marketNow, homeSnapshot, searchStocks, valuationStocks, macroData, homeInsights, personalizedNews, screenerData, companyContextData, businessReportData, financialHistoryData, relationshipEvidenceData } from './api.js';
import { applyRuntimeClass, haptic, openExternal, syncNativeBackHandler, closeMiniApp, isAppsInTossRuntime } from './tossBridge.js';
import { openStockSelector, closeStockSelector, formatSelectedStockLabel } from './stockSelector.js';
import { initializeStorage, readStored, writeStored, clearStored, getActivityVisitorId } from './storage.js';
import { startHomeLiveSync, setLiveSurface } from './liveHomeSync.js';
import { readHomeFast, writeHomeFast } from './homeFastCache.js';
import { rememberLiveQuotes, getLiveQuote, mergeRowsWithLive, resolveLiveQuote } from './liveQuoteStore.js';
import { seedWatchQuoteCache, saveWatchQuoteCache } from './watchQuoteCache.js';
import { loadingIndicator, chartLoadingPreview } from './loadingView.js';
import { formatKst, formatDataSource, formatFinancialAmount, formatChartDate, formatMetricPeriod, formatCurrencyPrice, formatMacroValue, formatMacroChange, macroFreshness, observationLabel, macroCategory, macroPublicationLabel, macroSourceUrl, changeBasisLabel, relationBasisLabel, newsRelation, translatedTag, titleLanguage, formatMarketCap } from './dataPresentation.js';

const WATCHLIST_KEY='chartview-toss-watchlist-v1';
const SELECTED_KEY='chartview-toss-selected-v1';
const DEFAULTS=[{symbol:'005930.KS',name:'삼성전자'},{symbol:'NVDA',name:'엔비디아'},{symbol:'AAPL',name:'애플'}];
const PUBLIC_SITE_BASE='https://chart-view-toss.onrender.com';
const SHARE_PREVIEW_VERSION='promo-20260930-v2';
const COLORS=['#3182f6','#f04452','#00a86b','#8b5cf6','#f59f00','#00a8cc'];
const DISPLAY_NAMES={'005930.KS':'삼성전자','000660.KS':'SK하이닉스','NVDA':'엔비디아','MU':'마이크론','AAPL':'애플','MSFT':'마이크로소프트','META':'메타','TSLA':'테슬라','GOOGL':'알파벳','^KS11':'코스피','^KQ11':'코스닥','^GSPC':'S&P 500','^IXIC':'나스닥','^TNX':'미국 10년물','^VIX':'VIX','CL=F':'WTI','KRW=X':'원/달러'};
const HOME_MARKET_PRIMARY=[
 {symbol:'^KS11',label:'KOSPI',pill:'KR',kind:'index'},
 {symbol:'^KQ11',label:'KOSDAQ',pill:'KR',kind:'index'},
 {symbol:'^GSPC',label:'S&P 500',pill:'US',kind:'index'},
 {symbol:'^IXIC',label:'NASDAQ',pill:'US',kind:'index'},
];
const HOME_MARKET_EXTRA=[
 {symbol:'^TNX',label:'미 10년물',pill:'금리',kind:'yield'},
 {symbol:'^VIX',label:'VIX',pill:'변동성',kind:'vix'},
 {symbol:'CL=F',label:'WTI 유가',pill:'원유',kind:'oil'},
 {symbol:'KRW=X',label:'원/달러',pill:'환율',kind:'fx'},
];
const displayName=(symbol,fallback='')=>DISPLAY_NAMES[symbol]||fallback||symbol;
const usableStockName=(name,symbol)=>{
 const value=String(name||'').trim();
 return value&&value.toUpperCase()!==String(symbol).toUpperCase()&&value!==String(symbol).split('.')[0]?value:'';
};
const fmtPrice=(value)=>{const n=finiteNumber(value);if(n===null)return '-';if(Math.abs(n)>=1000)return n.toLocaleString('ko-KR',{maximumFractionDigits:2});if(Math.abs(n)>=100)return n.toLocaleString('ko-KR',{maximumFractionDigits:2});return n.toLocaleString('ko-KR',{maximumFractionDigits:3})};
const fmtChange=(value)=>{const n=finiteNumber(value);if(n===null)return '-';return `${n>0?'+':''}${n.toFixed(2)}%`};
const state={tab:'home',watchlist:load(WATCHLIST_KEY,[]),selected:load(SELECTED_KEY,DEFAULTS.map(x=>x.symbol)),period:'1mo',customRange:null,detailSymbol:null,detailName:'',detailOrigin:'home',valuationMetric:'forwardPE',watchSort:'manual',newsSort:'major',detailPeriod:'3mo'};
const resolvedNames=new Map();
const researchDrafts=new Map();
state.screener={filters:{},count:30,activePreset:''};state.newsSymbol=null;state.researchPeer=null;
function comparisonStockName(symbol){
 const saved=state.watchlist.find(row=>row.symbol===symbol)?.name;
 return usableStockName(DISPLAY_NAMES[symbol],symbol)||usableStockName(resolvedNames.get(symbol),symbol)
  ||usableStockName(saved,symbol)
  ||usableStockName(DISPLAY_NAMES[symbol],symbol)
  ||'';
}
function chartSelectionSummaryText(){
 if(!state.selected.length)return '비교할 종목을 선택해주세요.';
 return `${state.selected.length}개 종목 · ${state.selected.map(symbol=>formatSelectedStockLabel(comparisonStockName(symbol),symbol)).join(' · ')}`;
}
function updateChartSelectionSummary(stocks=[]){
 (stocks||[]).forEach(stock=>{
  const symbol=String(stock?.ticker||'').trim();
  const name=usableStockName(stock?.name,symbol);
  if(symbol&&name)resolvedNames.set(symbol,name);
 });
 const summary=document.querySelector('#chart-selected-summary');
 if(summary)summary.textContent=chartSelectionSummaryText();
}
let chartInstance=null;
let chartResizeObserver=null;
let detailLiveTimer=null;
let viewEpoch=0;
let detailJumpCleanup=null;
let analysisCleanup=null;
let searchSeq=0;
let chartLoadSeq=0;
let detailChartLoadSeq=0;
let chartDisplayedSelection=null;
let detailDisplayedPeriod=null;
let toastTimer=null;
let homeMarketExpanded=false;
let homeMarketPayload=null;
let homeMarketCached=false;
let homeMarketExtraPromise=null;
let homeMarketExtrasPending=false;
let homeMarketRetryPending=false;
const scrollPositions=new Map();
// A feature deep link has no app-owned history entry to return to.
let navigationDepth=0;
const navigationSession=`${Date.now()}-${Math.random().toString(36).slice(2)}`;
function goBack(){
 if(navigationDepth>0) history.back();
 else if(isAppsInTossRuntime()) closeMiniApp();
 else navigate('home');
}

function load(key,fallback){
 try{
   const value=JSON.parse(readStored(key));
   return Array.isArray(value)?value:fallback;
 }catch{return fallback}
}
function persist(){
 try{
   writeStored(WATCHLIST_KEY,JSON.stringify(state.watchlist));
   writeStored(SELECTED_KEY,JSON.stringify(state.selected));
   return true;
 }catch{
   showToast('기기 저장공간에 저장하지 못했어요. 브라우저·앱 저장 권한을 확인해주세요.');
   return false;
 }
}
function showToast(message,actionLabel='',action=null){
 document.querySelector('.app-toast')?.remove();
 clearTimeout(toastTimer);
 const toast=document.createElement('div');
 toast.className='app-toast';
 toast.innerHTML=`<span>${esc(message)}</span>${actionLabel?'<button type="button">'+esc(actionLabel)+'</button>':''}`;
 document.body.appendChild(toast);
 if(actionLabel&&action)toast.querySelector('button').onclick=()=>{action();toast.remove()};
 toastTimer=setTimeout(()=>toast.remove(),4200);
}
function restoreNativeBack(){
 syncNativeBackHandler({isRoot:state.tab==='home',onBack:goBack});
}
function openCompareSheet(onApplied){
 openStockSelector({
   title:'비교할 종목',
   description:'검색해서 최대 6개까지 선택하세요. 적용 전에는 기존 선택이 바뀌지 않아요.',
   initial:[...state.selected],
   limit:6,
   favorites:state.watchlist,
   nameFor:(symbol)=>comparisonStockName(symbol)||symbol,
   restoreBack:restoreNativeBack,
   onApply:(symbols,names={})=>{
     symbols.forEach(symbol=>{
       const name=usableStockName(names[symbol],symbol);
       if(name)resolvedNames.set(symbol,name);
     });
     state.selected=symbols;
     persist();
     onApplied?.();
   },
 });
}
function currencyLabel(currency){
 if(currency==='KRW')return '원';
 if(currency==='USD')return '달러';
 return currency||'통화 미제공';
}
function iconSvg(name,size=24){
 const purposeIcons={more:"analysis",discover:"filter",picks:"ledger",exports:"exports"};
 if(purposeIcons[name])return uiIcon(purposeIcons[name],size);
 const paths={
  home:'<path d="M3.5 10.7 12 3.7l8.5 7v9.1a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7v-9.1Z"/><path d="M9.2 21.5v-7h5.6v7"/>',
  chart:'<path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19V3"/>',
  watch:'<path d="m12 3 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.03l-5.5 2.89 1.05-6.12L3.1 9.47l6.15-.9L12 3Z"/>',
  more:'<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  heart:'<path d="M20.8 4.9a5.4 5.4 0 0 0-7.6 0L12 6.1l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.5a5.4 5.4 0 0 0 0-7.6Z"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.2 4.2"/>',
  spark:'<path d="M3 17 8.5 11l4 3.5L21 5"/><path d="M16 5h5v5"/>',
  value:'<circle cx="12" cy="12" r="9"/><path d="M8 9.5h8M8 14.5h8M10 7v10M14 7v10"/>',
  macro:'<path d="M4 19h16"/><path d="M6 16V9m6 7V5m6 11v-4"/>',
  star:'<path d="m12 3 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.03l-5.5 2.89 1.05-6.12L3.1 9.47l6.15-.9L12 3Z"/>',
  arrow:'<path d="m9 6 6 6-6 6"/>',
  back:'<path d="m15 18-6-6 6-6"/>',
  news:'<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  discover:'<path d="M4 18 9 12l4 3 7-9"/><path d="M16 6h4v4"/>',
  heatmap:'<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="5" rx="1"/><rect x="13" y="10" width="8" height="11" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/>',
  consensus:'<path d="M4 19V5h16v14H4Z"/><path d="M7 15l3-3 2 1.5 4-5 2 2"/><path d="M7 8h3"/>',
  bands:'<path d="M3 7h18M3 17h18"/><path d="M4 13c3-3 5 2 8-1s5 0 8-2"/><circle cx="18" cy="10" r="1"/>',
  tools:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5M8 14h3m-3 3h7"/>',
  ideas:'<path d="M9 18h6m-5 3h4M8 14c-2-1.3-3-3.1-3-5a7 7 0 1 1 14 0c0 1.9-1 3.7-3 5l-1 2H9l-1-2Z"/>',
  picks:'<path d="M5 20V4m0 1h13l-2 4 2 4H5"/><path d="m8 16 3 2 5-4"/>',
  share:'<path d="M12 16V3m0 0L7.5 7.5M12 3l4.5 4.5"/><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>'
 };
 return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.more}</svg>`;
}
function dataDisclosure(){
 return `<aside class="data-disclosure" role="note" aria-label="투자 정보 및 데이터 이용 안내"><div><strong>참고용 정보 · 투자 권유 아님</strong><span>차트뷰의 모든 종목·시세·재무·뉴스·스크리너·아이디어 정보는 일반적인 정보 제공을 위한 참고 자료이며 특정 종목의 매수·매도 또는 투자 판단을 권유하지 않아요. 데이터는 제공처 상황에 따라 지연·누락·오류가 있을 수 있어요.</span></div><button data-tab="info">데이터 기준 안내</button></aside>`;
}
function shell(content,title='차트뷰'){
 document.title=title==='차트뷰'?'차트뷰':`${title} | 차트뷰`;
 const identity=surfaceIdentity(state.tab);
 const secondary=ANALYSIS_ROUTES.has(state.tab)||['valuation','macro','exports','memory','discover','ideas','picks','news','detail','info'].includes(state.tab);
 const navTab=state.tab==='detail'?state.detailOrigin:(secondary?'more':state.tab);
 const leading=secondary?`<button class="icon-button back-button" aria-label="뒤로가기" data-back>${iconSvg('back',22)}</button>`:`<span class="brand-mark">${(state.tab==='home'?iconSvg('spark',18):uiIcon(identity.icon,18))}</span>`;
 const offline=typeof navigator!=='undefined'&&navigator.onLine===false;
 const topAction=state.tab==='detail'?'':`<button class="icon-button" aria-label="관심종목" data-tab="watch">${iconSvg('heart',22)}</button>`;
 return `<main class="app-shell" data-surface="${esc(state.tab)}" data-ui-tone="${identity.tone}">${offline?'<div class="network-banner" role="status">인터넷 연결이 끊어졌어요. 연결되면 다시 시도해주세요.</div>':''}<header class="topbar"><div class="brand-lockup">${leading}<div class="brand-title">${state.tab==='home'?'':`<span class="surface-label">${identity.label}</span>`}<h1${state.tab==='detail'?' id="detail-top-title"':''}>${esc(title)}</h1></div></div><div class="topbar-actions"><button class="icon-button" data-share-current type="button" aria-label="현재 화면 공유">${iconSvg('share',21)}</button>${topAction}</div></header><section class="content"><div class="ait-share-row"><div class="ait-review-disclaimer" role="note" aria-label="투자 정보 이용 안내"><strong>참고용</strong><span>투자 정보는 투자 권유가 아닙니다</span></div><button type="button" data-share-current>${iconSvg('share',17)} 현재 화면 공유</button></div>${content}${state.tab==='info'?'':dataDisclosure()}</section><nav class="bottom-nav" aria-label="주요 메뉴">${[['home','홈'],['chart','수익률'],['watch','관심'],['more','분석']].map(([id,label])=>`<button data-tab="${id}" class="${navTab===id?'active':''}" ${navTab===id?'aria-current="page"':''}><i>${iconSvg(id,22)}</i><span>${label}</span></button>`).join('')}</nav></main>`;
}
function shareDetails(){
 const tab=state.tab;
 const symbol=tab==='detail'?String(state.detailSymbol||'').toUpperCase():'';
 const name=tab==='detail'?(usableStockName(state.detailName,symbol)||resolvedNames.get(symbol)||symbol):'';
 const url=new URL(PUBLIC_SITE_BASE);
 url.searchParams.set('v',SHARE_PREVIEW_VERSION);
 const shared=encodeSharedView({...state,researchPeer:researchDrafts.get(symbol)?.resultPeer||researchDrafts.get(symbol)?.peer||state.researchPeer});
 if(shared)url.searchParams.set('cv',shared);
 if(tab==='detail'&&symbol)url.hash=`detail/${encodeURIComponent(symbol)}`;
 else if(tab==='news'&&state.newsSymbol)url.hash=`news/${encodeURIComponent(state.newsSymbol)}`;
 else if(tab==='memory'&&state.memoryPriceGroup)url.hash=`memory/${state.memoryPriceGroup}`;
 else if(tab==='gurus')url.hash=`gurus/${state.guruStrategy||'buffett'}`;
 else if(tab!=='home')url.hash=tab;
 const titleByTab={gurus:'거장 투자법 | 차트뷰',home:'차트뷰',chart:'수익률 비교 | 차트뷰',watch:'관심종목 | 차트뷰',valuation:'밸류에이션 | 차트뷰',macro:'경제 지표 | 차트뷰',exports:'수출 데이터 | 차트뷰',memory:'반도체 가격 추적 | 차트뷰',discover:'조건별 종목 찾기 | 차트뷰',heatmap:'시장 히트맵 | 차트뷰',consensus:'실적 전망 | 차트뷰',bands:'역사적 밸류에이션 | 차트뷰',ideas:'투자 아이디어 LAB | 차트뷰',picks:'선정 기록·성과 | 차트뷰',news:'관심종목 뉴스 | 차트뷰',more:'차트뷰',info:'데이터 안내 | 차트뷰',tools:'투자 도구 | 차트뷰'};
 return {url:url.toString(),title:tab==='detail'?`${name} (${symbol}) | 차트뷰`:titleByTab[tab]||'차트뷰',text:tab==='detail'?`${name} 종목의 차트와 기업 정보를 확인해보세요.`:'차트뷰에서 시장 데이터와 종목 정보를 확인해보세요.'};
}
async function shareCurrent(){
 const details=shareDetails();
 try{
   if(navigator.share){await navigator.share(details);return;}
   await navigator.clipboard.writeText(details.url);
   showToast('현재 화면 링크를 복사했어요.');
 }catch(error){
   if(error?.name==='AbortError')return;
   try{
     const input=document.createElement('textarea');input.value=details.url;input.style.position='fixed';input.style.opacity='0';document.body.appendChild(input);input.select();const copied=document.execCommand('copy');input.remove();if(!copied)throw new Error('copy failed');showToast('현재 화면 링크를 복사했어요.');
   }catch{showToast('링크를 복사하지 못했어요. 다시 시도해주세요.');}
 }
}
function sectionTitle(title,action=''){return `<div class="section-head"><h2>${title}</h2>${action}</div>`}
function stockRow(x){const name=displayName(x.symbol,x.name);return `<button class="stock-row" data-stock-detail="${x.symbol}"><span class="stock-logo">${esc(name.slice(0,1))}</span><span class="stock-copy"><strong>${esc(name)}</strong><small>${esc(x.symbol)}</small></span><span class="chevron">${iconSvg('arrow',18)}</span></button>`}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function navigate(tab,detailSymbol=null,detailName='',investigation=null){
 if(tab==='picks'&&!SHOW_SPOTLIGHT)tab='home';
 const hash=detailSymbol?`#${tab}/${tab==='exports'?String(detailSymbol).split('/').map(encodeURIComponent).join('/'):encodeURIComponent(detailSymbol)}`:`#${tab}`;
 const featureTab=['discover','picks','exports','memory','gurus'].includes(tab);
 if(tab===state.tab&&(!featureTab||location.hash===hash)&&(tab==='detail'?(!detailSymbol||detailSymbol===state.detailSymbol):tab==='news'?(detailSymbol||null)===state.newsSymbol:true)){
   if(detailSymbol&&detailName)state.detailName=detailName;
   window.scrollTo(0,0);
   return;
 }
 scrollPositions.set(location.hash||'#home',window.scrollY);
 closeStockSelector();
 state.sharedDetailSymbol=null;
 state.restoreScroll=null;
 state.detailInvestigation=tab==='detail'&&investigation?.symbol===detailSymbol?investigation:null;
 if(tab==='detail')state.detailOrigin=state.tab==='detail'?state.detailOrigin:['home','chart','watch'].includes(state.tab)?state.tab:'more';
 if(tab==='detail'&&state.tab==='discover')state.returnFocusSymbol=detailSymbol;
 state.tab=tab;
 if(featureTab)Object.assign(state,resolveRoute({hash}));
 else if(detailSymbol){state.detailSymbol=detailSymbol;state.detailName=detailName||'';}
 const nextUrl=new URL(location.href);nextUrl.searchParams.delete('cv');nextUrl.hash=hash;
 navigationDepth+=1;
 history.pushState({tab,detailSymbol:state.detailSymbol,detailName:state.detailName,detailOrigin:state.detailOrigin,investigation:state.detailInvestigation,cvNavigation:{session:navigationSession,depth:navigationDepth}},'',nextUrl);
 if(tab==='news')state.newsSymbol=detailSymbol||null;
 haptic('tickWeak');
 render();
 window.scrollTo(0,0);
}
window.__chartviewNavigate=(tab,detailSymbol=null,detailName='')=>navigate(tab,detailSymbol,detailName);
window.__chartviewInvestigate=(symbol,name,context)=>navigate('detail',symbol,name,context);
window.__chartviewRestoreScroll=()=>requestAnimationFrame(()=>{const y=state.restoreScroll;if(y==null)return;if(document.documentElement.scrollHeight>=y+innerHeight){window.scrollTo(0,y);state.restoreScroll=null;}});
function bindNav(){
 document.querySelectorAll('[data-feature-route]').forEach(b=>b.onclick=()=>{
   if(b.dataset.featureRoute==='discover')state.screener.appliedRoutePreset=null;
   navigate(b.dataset.featureRoute,b.dataset.featureTarget||null);
 });
 document.querySelectorAll('[data-share-current]').forEach(button=>button.onclick=shareCurrent);
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>navigate(b.dataset.tab));
 document.querySelectorAll('[data-stock-news]').forEach(b=>b.onclick=()=>navigate('news',b.dataset.stockNews,b.dataset.stockName||''));
 document.querySelectorAll('[data-go-chart]').forEach(b=>b.onclick=()=>navigate('chart'));
 document.querySelectorAll('[data-stock-detail]').forEach(b=>b.onclick=()=>navigate('detail',b.dataset.stockDetail,b.dataset.stockName||''));
 document.querySelectorAll('[data-open-stock-search]').forEach(button=>button.onclick=openHomeSearch);
 document.querySelectorAll('[data-saved-research]').forEach(button=>button.onclick=()=>navigate('detail',button.dataset.savedResearch,'',{kind:'saved',symbol:button.dataset.savedResearch,jump:button.dataset.savedJump}));
 document.querySelectorAll('[data-refresh-saved-research]').forEach(button=>button.onclick=async()=>{
  const host=button.closest('.saved-research'),status=host.querySelector('.revisit-refresh-status');
  button.disabled=true;status.textContent='저장한 기업의 최신 공시를 확인하고 있어요…';
  try{
   const {refreshSavedReviews}=await import('./revisitRefresh.js');
   await refreshSavedReviews(()=>host.isConnected);
   if(!host.isConnected)return;
   const compact=host.dataset.revisitCompact==='true';
   const holder=document.createElement('div');holder.innerHTML=savedResearchHtml(symbol=>displayName(symbol),{compact});
   const replacement=holder.firstElementChild;host.replaceWith(replacement);bindNav();
   replacement.querySelector('.revisit-refresh-status').textContent='확인한 보고서 기준으로 표시했어요. 미제공 자료는 확인 불가로 남겨요.';
   replacement.querySelector('[data-refresh-saved-research]')?.focus({preventScroll:true});
  }catch{if(host.isConnected){status.textContent='일부 근거를 확인하지 못했어요. 저장 기준은 유지했어요. 다시 시도해주세요.';button.disabled=false;}}
 });
 document.querySelectorAll('[data-retry-detail]').forEach(b=>b.onclick=renderDetail);
 document.querySelectorAll('[data-back]').forEach(b=>b.onclick=goBack);
 document.querySelectorAll('[data-external-url]').forEach(b=>b.onclick=async()=>{
   haptic('tickWeak');
   const opened=await openExternal(b.dataset.externalUrl);
   if(!opened)showToast('외부 링크를 열지 못했어요. 잠시 후 다시 시도해주세요.');
 });
}
window.__chartviewBindNav=bindNav;
function openHomeSearch(){
 openStockSelector({
   title:'종목 검색',
   description:'종목명이나 티커를 검색해 상세 정보를 확인하세요.',
   initial:[],
   favorites:state.watchlist,
   nameFor:(symbol)=>displayName(symbol),
   onPick:(symbol,name)=>navigate('detail',symbol,name),
   restoreBack:restoreNativeBack,
 });
}
function cleanupChart(){detailJumpCleanup?.();detailJumpCleanup=null;analysisCleanup?.();analysisCleanup=null;viewEpoch++;chartLoadSeq++;chartResizeObserver?.disconnect();chartResizeObserver=null;if(detailLiveTimer){clearTimeout(detailLiveTimer);detailLiveTimer=null;}if(chartInstance){try{chartInstance.remove()}catch{}chartInstance=null}}

function previousFromPct(price,changePct){
 const p=finiteNumber(price),c=finiteNumber(changePct);
 if(p===null||c===null||Math.abs(100+c)<0.0001)return null;
 return p/(1+c/100);
}
function formatHomeMarketValue(item,row){
 const price=finiteNumber(row?.price);
 if(price===null)return '-';
 if(item.kind==='yield')return `${price.toFixed(2)}%`;
 if(item.kind==='oil')return `${price.toFixed(2)}`;
 if(item.kind==='fx')return `₩${Math.round(price).toLocaleString('ko-KR')}`;
 if(item.kind==='vix')return price.toFixed(1);
 return fmtPrice(price);
}
function formatHomeMarketChange(item,row){
 const price=finiteNumber(row?.price),change=finiteNumber(row?.change);
 if(change===null)return {text:'-',cls:'flat'};
 if(item.kind==='yield'&&price!==null){
   const prev=previousFromPct(price,change);
   if(prev!==null){const bp=(price-prev)*100;return {text:`${bp>0?'+':''}${bp.toFixed(Math.abs(bp)<1?1:0)}bp`,cls:bp>0?'up':bp<0?'down':'flat'};}
 }
 if(item.kind==='vix'&&price!==null){
   const prev=previousFromPct(price,change);
   if(prev!==null){const pt=price-prev;return {text:`${pt>0?'+':''}${pt.toFixed(1)}pt`,cls:pt>0?'up':pt<0?'down':'flat'};}
 }
 return {text:fmtChange(change),cls:change>0?'up':change<0?'down':'flat'};
}
function marketCard(item,row,index,{extra=false,pending=false}={}){
 const change=formatHomeMarketChange(item,row);
 const cardTag=extra?'div':'button';
 const action=extra?'':` data-stock-detail="${esc(item.symbol)}" data-stock-name="${esc(DISPLAY_NAMES[item.symbol]||item.label)}"`;
 const missing=finiteNumber(row?.price)===null;
 const loading=missing&&pending;
 return `<${cardTag} class="quote-card market-${index}${extra?' market-extra-card':''}${missing?' market-missing':''}${loading?' market-card-loading':''}"${action}>
   <div class="quote-top"><span class="market-pill">${esc(item.pill)}</span><small>${esc(item.label)}</small></div>
   <strong>${loading?'—':esc(formatHomeMarketValue(item,row))}</strong>
   <em class="${missing?'flat':change.cls}">${missing?(loading?'확인 중':'자료 없음'):esc(change.text)}</em>
   <span class="quote-asof">${missing?'':esc(formatKst(row?.asOf))}</span>
 </${cardTag}>`;
}
function paintHomeMarket(market,{allowError=true,cached=homeMarketCached}={}){
 const host=document.querySelector('#market-card');
 if(!host)return false;
 if(market){
   homeMarketCached=cached;
   // Primary live refreshes omit optional indicators; retain their dated observations.
   const incoming=Array.isArray(market.results)?market.results:[];
   rememberLiveQuotes(incoming,{priority:20});
   const included=new Set(incoming.map(row=>String(row.ticker||'').toUpperCase()));
   const extras=(homeMarketPayload?.results||[]).filter(row=>HOME_MARKET_EXTRA.some(item=>item.symbol===String(row.ticker||'').toUpperCase())&&!included.has(String(row.ticker||'').toUpperCase()));
   homeMarketPayload={...market,results:[...incoming,...extras]};
 }
 const rows=Array.isArray(homeMarketPayload?.results)?homeMarketPayload.results:[];
 const byTicker=new Map(rows.map(row=>[String(row.ticker||'').toUpperCase(),row]));
 const primary=HOME_MARKET_PRIMARY.map(item=>({item,row:byTicker.get(item.symbol)})).filter(x=>finiteNumber(x.row?.price)!==null);
 const time=document.querySelector('#market-time');
 const toggle=document.querySelector('#market-expand');
 if(primary.length){
   if(time)time.textContent=homeMarketCached?'이전 저장 시세 · 새 시세 확인 중':'각 지표의 실제 기준 시각';
   const primaryGrid=`<div class="market-grid">${HOME_MARKET_PRIMARY.map((item,i)=>marketCard(item,byTicker.get(item.symbol),i,{pending:homeMarketRetryPending})).join('')}</div>`;
   const partialNote=primary.length<HOME_MARKET_PRIMARY.length?`<div class="market-partial-note" role="status">${homeMarketRetryPending?loadingIndicator('누락된 시장 지표를 다시 확인하고 있어요'):'일부 시장 지표가 제공되지 않았어요.'}<button type="button" data-retry-market-missing ${homeMarketRetryPending?'disabled':''}>시장 지표 다시 확인</button></div>`:'';
   const extraMissing=HOME_MARKET_EXTRA.some(item=>finiteNumber(byTicker.get(item.symbol)?.price)===null);
   const extraGrid=homeMarketExpanded?`<div class="market-extra-wrap"><div class="market-extra-grid">${HOME_MARKET_EXTRA.map((item,i)=>marketCard(item,byTicker.get(item.symbol),i+4,{extra:true,pending:homeMarketExtrasPending})).join('')}</div><p class="market-extra-note">미 10년물·VIX·WTI·원/달러 · 직전 종가 대비</p>${homeMarketExtrasPending?loadingIndicator('보조 시장 지표를 확인하고 있어요'):extraMissing?'<div class="market-partial-note" role="status">일부 보조 지표를 확인하지 못했어요.<button type="button" data-retry-market-extra>보조 지표 다시 확인</button></div>':''}</div>`:'';
   host.innerHTML=primaryGrid+partialNote+extraGrid;
   host.querySelector('[data-retry-market-missing]')?.addEventListener('click',retryHomeMarket);
   host.querySelector('[data-retry-market-extra]')?.addEventListener('click',()=>ensureHomeMarketExtras({force:true}));
   if(toggle){
     toggle.hidden=false;
     toggle.setAttribute('aria-expanded',String(homeMarketExpanded));
     toggle.innerHTML=homeMarketExpanded?`지표 접기 <span>⌃</span>`:`지표 더 보기 <span>⌄</span>`;
   }
   bindNav();
   return true;
 }
 if(toggle)toggle.hidden=true;
 if(!allowError)return false;
 if(time)time.textContent='연결 확인 필요';
 host.innerHTML='<div class="market-error"><div><strong>시장 정보를 불러오지 못했어요</strong><span>다른 기능은 계속 사용할 수 있어요.</span></div><button id="retry-market">다시 시도</button></div>';
 document.querySelector('#retry-market')?.addEventListener('click',retryHomeMarket);
 return false;
}
function mergeHomeMarketRows(extraRows){
 const base=Array.isArray(homeMarketPayload?.results)?homeMarketPayload.results:[];
 const map=new Map(base.map(row=>[String(row.ticker||'').toUpperCase(),row]));
 (extraRows||[]).forEach(row=>{if(row?.ticker)map.set(String(row.ticker).toUpperCase(),row);});
 homeMarketPayload={...(homeMarketPayload||{}),results:[...map.values()]};
 return homeMarketPayload;
}
async function retryHomeMarket(){
 if(homeMarketRetryPending)return;
 homeMarketRetryPending=true;
 const epoch=viewEpoch;
 const host=document.querySelector('#market-card');
 if(!paintHomeMarket(homeMarketPayload,{allowError:false})&&host)host.innerHTML=loadingIndicator('시장 지표를 다시 확인하고 있어요');
 try{
   const payload=await marketNowLive();
   if(epoch!==viewEpoch)return;
   if(payload?.results?.length){homeMarketCached=false;mergeHomeMarketRows(payload.results);writeHomeFast('market',homeMarketPayload);}
 }catch{/* Retain available observations and a retry action. */}
 finally{homeMarketRetryPending=false;if(state.tab==='home')paintHomeMarket(homeMarketPayload,{allowError:true});}
}
async function ensureHomeMarketExtras({force=false}={}){
 const missing=HOME_MARKET_EXTRA.map(x=>x.symbol).filter(symbol=>!homeMarketPayload?.results?.some(row=>String(row?.ticker||'').toUpperCase()===symbol&&finiteNumber(row.price)!==null));
 if(!missing.length){paintHomeMarket(homeMarketPayload,{allowError:false});return;}
 const cached=force?null:readHomeFast('market-extra',30*60*1000);
 if(cached?.results?.length){
   mergeHomeMarketRows(cached.results);
   paintHomeMarket(homeMarketPayload,{allowError:false});
 }
 if(homeMarketExtraPromise)return homeMarketExtraPromise;
 homeMarketExtrasPending=true;
 paintHomeMarket(homeMarketPayload,{allowError:false});
 homeMarketExtraPromise=quoteSnapshots(HOME_MARKET_EXTRA.map(x=>x.symbol),{force})
   .then(payload=>{
     if(payload?.results?.length){writeHomeFast('market-extra',payload);mergeHomeMarketRows(payload.results);}
   })
   .catch(()=>{})
   .finally(()=>{homeMarketExtraPromise=null;homeMarketExtrasPending=false;paintHomeMarket(homeMarketPayload,{allowError:false});});
 return homeMarketExtraPromise;
}
function bindHomeMarketToggle(){
 const button=document.querySelector('#market-expand');
 if(!button)return;
 button.onclick=()=>{
   homeMarketExpanded=!homeMarketExpanded;
   haptic('tickWeak');
   paintHomeMarket(homeMarketPayload,{allowError:false});
   if(homeMarketExpanded)ensureHomeMarketExtras();
 };
}

function patchHomeWatchLive(quotes){
 if(state.tab!=='home'||!Array.isArray(quotes)||!quotes.length)return;
 const byTicker=new Map(quotes.filter(row=>row?.ticker).map(row=>[String(row.ticker).toUpperCase(),row]));
 document.querySelectorAll('#home-watchlist .watch-rich-row[data-stock-detail]').forEach(row=>{
   const quote=byTicker.get(String(row.dataset.stockDetail||'').toUpperCase());
   if(!quote)return;
   const price=row.querySelector('.watch-price');
   const meta=row.querySelector('.stock-copy small');
   const ch=finiteNumber(quote.change);
   if(price&&quote.price!=null)price.innerHTML=`<strong>${esc(formatCurrencyPrice(quote.price,quote.currency))}</strong><em class="${ch>0?'up':ch<0?'down':'flat'}">${esc(fmtChange(quote.change))}</em>`;
   if(meta)meta.textContent=`${row.dataset.stockDetail}${quote.asOf?' · '+formatKst(quote.asOf):''}`;
 });
}

function paintHomeWatch(quotes,hasWatch,{pending=false,failed=false}={}){
 if(!hasWatch)return;
 const host=document.querySelector('#home-watchlist');
 if(!host)return;
 host.innerHTML=state.watchlist.slice(0,3).map((x,i)=>{
   const q=(quotes||[]).find(r=>String(r.ticker).toUpperCase()===String(x.symbol).toUpperCase());const ch=finiteNumber(q?.change);const name=displayName(x.symbol,x.name);
   const status=pending?' · 새 시세 확인 중':failed?' · 갱신 실패':'';
   return `<button class="watch-rich-row" data-stock-detail="${esc(x.symbol)}"><span class="stock-logo tone-${i%4}">${esc(name.slice(0,1))}</span><span class="stock-copy"><strong>${esc(name)}</strong><small>${esc(x.symbol)}${q?.asOf?' · '+esc(formatKst(q.asOf)):''}${status}</small></span><span class="watch-price">${q?.price!=null?`<strong>${esc(formatCurrencyPrice(q.price,q.currency))}</strong><em class="${ch>0?'up':ch<0?'down':'flat'}">${esc(fmtChange(q.change))}</em>`:`<small>${pending?'가격 확인 중':'가격 확인 필요'}</small>`}</span><span class="chevron">${iconSvg('arrow',18)}</span></button>`;
 }).join('');
}

function paintHomeBrief(home,options={}){
 const macro=home?.macro?.summary||{};
 const explanation=marketBrief(home?.macro);
 const staleVix=(Array.isArray(home?.macro?.results)?home.macro.results:[]).find(row=>row&&(row.original_symbol||row.symbol)==='^VIX'&&macroFreshness(row).stale);
 const brief=document.querySelector('#brief-card');
 if(!brief)return false;
 brief.classList.remove('skeleton','brief');
 if(macro.text){
   brief.dataset.state='ready';
   const level=macro.level||'yellow';
   const label=level==='red'?'위험 신호 많음':level==='green'?'안정 신호 많음':'신호 혼재';
   brief.innerHTML=`<div class="brief-icon ${esc(level)}">${iconSvg('spark',22)}</div><div class="brief-copy"><span>시장 지표 요약 <b class="status-badge ${esc(level)}">${label}</b></span><strong>${esc(explanation.text)}</strong><small>${staleVix?'VIX 관측일이 오래되어 시장 요약 해석에 주의가 필요해요. ':''}${esc(explanation.basis)} · 투자 행동을 권유하는 신호가 아니에요.</small></div><button data-tab="macro" aria-label="경제 지표 보기">${iconSvg('arrow',20)}</button>`;
   if(options.failed)brief.querySelector('.brief-copy small').insertAdjacentText('afterbegin','새 요약 조회에 실패했어요. 이전 요약을 표시해요. ');
   return true;
 }
 const summary=homeBriefState(home,options);
 brief.dataset.state=summary.status;
 brief.innerHTML=summary.status==='loading'?loadingIndicator(summary.text):`<div class="brief-copy"><span>시장 지표 요약</span><strong>${esc(summary.text)}</strong><small>경제지표 화면에서 개별 관측일을 확인할 수 있어요.</small><button type="button" data-retry-brief>요약 다시 확인</button><button type="button" data-tab="macro">경제지표 보기</button></div>`;
 brief.querySelector('[data-retry-brief]')?.addEventListener('click',async()=>{const epoch=viewEpoch;paintHomeBrief(null,{pending:true});try{const home=await homeSnapshot({force:true});if(epoch!==viewEpoch)return;writeHomeFast('snapshot',home);paintHomeBrief(home);}catch{if(epoch===viewEpoch)paintHomeBrief(null,{failed:true});}bindNav();});
 return false;
}

async function renderHome(){
 cleanupChart();
 const epoch=viewEpoch;
 const hasWatch=state.watchlist.length>0;
 document.querySelector('#app').innerHTML=shell(`
   <section class="home-compact-head"><p class="home-value-copy">시장 흐름부터 내 종목의 근거까지</p>
     <button class="search-box elevated home-search" id="home-search-open" type="button">${iconSvg('search',20)}<span>종목 검색</span><b>${iconSvg('arrow',18)}</b></button>
   </section>
   <section class="market-section home-primary"><div class="section-head market-head"><h2><i class="section-symbol" aria-hidden="true">${uiIcon('market',16)}</i>주요 시장</h2><div class="market-head-actions"><span id="market-time">기준 시각 확인 중</span><button type="button" id="market-expand" class="market-expand" aria-expanded="false" hidden>지표 더 보기 <span>⌄</span></button></div></div><div id="market-card">${loadingIndicator('주요 시장을 확인하고 있어요')}<div class="market-grid"><div class="skeleton quote"></div><div class="skeleton quote"></div><div class="skeleton quote"></div><div class="skeleton quote"></div></div></div></section>
   <div class="home-analysis-heading"><h2><i class="section-symbol" aria-hidden="true">${uiIcon('analysis',16)}</i>근거를 찾는 분석</h2><span>목적에 맞게 바로 열어요</span></div>
   ${valueEntriesMarkup(SHOW_SPOTLIGHT)}
   <div id="home-discovery-feed"></div>
   <section class="section watch-section home-primary">${sectionTitle('<i class="section-symbol" aria-hidden="true">'+uiIcon('watch',16)+'</i>내 관심종목',hasWatch?'<button class="text-button" data-tab="watch">전체 보기</button>':'')}<div id="home-watchlist" class="watch-card">${hasWatch?loadingIndicator('관심종목 시세를 확인하고 있어요')+'<div class="skeleton watch"></div><div class="skeleton watch"></div>':'<div class="home-empty-watch"><button type="button" data-tab="watch">자주 볼 관심종목 추가 →</button></div>'}</div></section>
   ${savedResearchHtml(symbol=>displayName(symbol),{compact:true})}
   <section id="brief-card" class="brief-card compact-brief skeleton brief">${loadingIndicator('시장 요약을 확인하고 있어요')}</section>
   <section class="section quick-section">${sectionTitle('<i class="section-symbol" aria-hidden="true">'+uiIcon('compare',16)+'</i>빠른 비교','<button class="text-button" data-go-chart>종목 변경</button>')}<div class="ticker-strip">${state.selected.map((x,i)=>`<button data-go-chart><span class="ticker-orb tone-${i%4}">${esc(displayName(x).slice(0,1))}</span><span><strong>${esc(displayName(x))}</strong><small>${esc(x)}</small></span><b>${iconSvg('arrow',16)}</b></button>`).join('')||'<span class="muted-copy">비교 종목을 선택해주세요.</span>'}</div></section>
   <section class="section home-news-section" id="home-news-section">${sectionTitle('관심종목 뉴스','<button class="text-button" data-tab="news">뉴스 모두 보기</button>')}<div id="home-news">${loadingIndicator('관련 뉴스를 확인하고 있어요')}<div class="skeleton news"></div></div></section>
 `);
 bindNav();
 document.querySelector('#home-search-open').onclick=openHomeSearch;
 bindHomeMarketToggle();

 const watchSymbols=state.watchlist.slice(0,3).map(x=>x.symbol);
 const watchNames=state.watchlist.slice(0,3).map(x=>displayName(x.symbol,x.name));
 const cachedMarket=readHomeFast('market',6*60*60*1000);
 homeMarketCached=false;
 if(cachedMarket)paintHomeMarket(cachedMarket,{allowError:false,cached:true});
 const cachedSnapshot=readHomeFast('snapshot',6*60*60*1000);
 if(cachedSnapshot){
   rememberLiveQuotes(cachedSnapshot?.heatmap?.results||[],{priority:20});
   paintHomeBrief(cachedSnapshot);
 }
 seedWatchQuoteCache(state.watchlist.map(x=>x.symbol));
 const watchCacheKey=watchSymbols.length?'quotes:'+watchSymbols.join('|'):'';
 const cachedWatch=watchCacheKey?readHomeFast(watchCacheKey,30*60*1000):null;
 if(cachedWatch?.results){
   rememberLiveQuotes(cachedWatch.results,{priority:40});
 }
 let watchLoaded=false;
 paintHomeWatch(watchSymbols.map(symbol=>getLiveQuote(symbol)).filter(Boolean),hasWatch,{pending:true});
 const settle=(task,paint)=>task.then(value=>({status:'fulfilled',value}),reason=>({status:'rejected',reason})).then(result=>{if(epoch===viewEpoch){paint(result);bindNav();bindHomeMarketToggle();}});
 const jobs=[];
 jobs.push(settle(marketNow(),marketRes=>{
 const market=marketRes.status==='fulfilled'?marketRes.value:null;
 if(market){
   writeHomeFast('market',market);
   paintHomeMarket(market,{allowError:true,cached:false});
 }else if(!cachedMarket)paintHomeMarket(null,{allowError:true});
 else {const time=document.querySelector('#market-time');if(time)time.textContent='시세 갱신 실패 · 이전 저장 시세';}
 }));
 jobs.push(settle(watchSymbols.length?quoteSnapshots(watchSymbols):Promise.resolve({results:[]}),watchRes=>{
 const payload=watchRes.status==='fulfilled'?watchRes.value:null;
 const fetchedQuotes=payload?.results||[];
 rememberLiveQuotes(fetchedQuotes,{priority:40});
 const fetchedByTicker=new Map(fetchedQuotes.filter(row=>row?.ticker).map(row=>[String(row.ticker).toUpperCase(),row]));
 const quotes=watchSymbols.map(symbol=>getLiveQuote(symbol)||fetchedByTicker.get(String(symbol).toUpperCase())).filter(Boolean);
 if(payload&&watchCacheKey)writeHomeFast(watchCacheKey,{...payload,results:quotes});
 if(payload)saveWatchQuoteCache(state.watchlist.map(x=>x.symbol));
 watchLoaded=true;
 paintHomeWatch(quotes,hasWatch,{failed:!payload});
 }));
 jobs.push(settle(homeSnapshot(),homeRes=>{
 const home=homeRes.status==='fulfilled'?homeRes.value:null;
 if(home){
   rememberLiveQuotes(home?.heatmap?.results||[],{priority:20});
   writeHomeFast('snapshot',{...home,heatmap:{...(home.heatmap||{}),results:mergeRowsWithLive(home?.heatmap?.results||[])}});
   paintHomeBrief(home);
   paintHomeWatch(watchSymbols.map(symbol=>getLiveQuote(symbol)).filter(Boolean),hasWatch,{pending:!watchLoaded});
 }else paintHomeBrief(cachedSnapshot,{failed:true});
 }));
 if(watchSymbols.length){
  jobs.push(settle(personalizedNews(watchSymbols,watchNames),result=>{
   const newsBox=document.querySelector('#home-news');
   const items=result.status==='fulfilled'?(result.value?.items||[]).slice(0,3):[];
   newsBox.innerHTML=items.length?items.map(newsCard).join(''):`<div class="empty compact"><strong>${result.status==='fulfilled'?'새 주요 뉴스가 없어요':'뉴스를 불러오지 못했어요'}</strong><span>전체 뉴스 화면에서 다시 확인할 수 있어요.</span></div>`;
  }));
 }else document.querySelector('#home-news-section').hidden=true;
 await Promise.all(jobs);
}

async function renderChart(){
 cleanupChart();
 chartDisplayedSelection=null;
 const epoch=viewEpoch;
 document.querySelector('#app').innerHTML=shell(`
   <section class="task-head"><div><h2>수익률 비교</h2><p>선택한 종목의 기간 수익률을 같은 화면에서 확인해요.</p></div><button class="primary-subtle" id="open-compare-selector">종목 변경</button></section>
   <div class="selected-summary" id="chart-selected-summary">${esc(chartSelectionSummaryText())}</div>
   <div class="segmented period-tabs">${[['1mo','1개월'],['3mo','3개월'],['6mo','6개월'],['1y','1년'],['5y','5년'],['max','전체']].map(([p,l])=>`<button data-period="${p}" aria-pressed="${state.period===p}" class="${state.period===p?'active':''}">${l}</button>`).join('')}</div>
   <details class="calculation-guide"><summary>기간 직접 지정${state.customRange?' · 적용 중':''}</summary><form id="custom-range" class="analysis-filters"><label>시작일<input type="date" name="start" required value="${esc(state.customRange?.start||'')}"></label><label>종료일<input type="date" name="end" required value="${esc(state.customRange?.end||'')}" max="${new Date().toISOString().slice(0,10)}"></label><button class="primary-subtle" type="submit">기간 적용</button><span id="range-error" role="alert"></span></form></details>
   <section class="surface chart-surface elevated-panel"><div class="chart-heading"><div><strong>기간 수익률</strong><small>각 종목의 첫 가용 관측값을 0%로 표시해요</small></div><span id="chart-status" role="status">불러오는 중</span></div><div class="chart-plot-wrap"><div id="chart-canvas" class="chart-canvas"></div><div id="chart-loading" class="chart-loading">${chartLoadingPreview('수익률 차트를 불러오고 있어요')}</div><div id="chart-tooltip" class="chart-tooltip" hidden></div></div><div id="chart-legend" class="chart-legend interactive-legend chart-legend-loading" aria-hidden="true"><span></span><span></span><span></span></div></section>
   <section id="chart-table-wrap" class="chart-table-wrap"></section>
   <details class="calculation-guide" id="calculation-guide"><summary>계산 기준</summary><div id="calculation-guide-body">${loadingIndicator('차트 계산 기준을 확인하고 있어요')}</div></details>
 `,'수익률 비교');
 bindNav();
 document.querySelector('#open-compare-selector')?.addEventListener('click',()=>openCompareSheet(()=>renderChart()));
 document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{haptic('tickWeak');refreshChart({period:b.dataset.period,range:null})});
 document.querySelector('#custom-range').onsubmit=e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.currentTarget));if(!values.start||!values.end||values.start>values.end){document.querySelector('#range-error').textContent='시작일이 종료일보다 늦지 않게 선택해주세요.';return;}refreshChart({period:state.period,range:values});};
 await loadChart();
}

function syncChartPeriodControls(){
 document.querySelectorAll('[data-period]').forEach(button=>{
   const active=!state.customRange&&button.dataset.period===state.period;
   button.classList.toggle('active',active);
   button.setAttribute('aria-pressed',String(active));
 });
 const custom=document.querySelector('#custom-range');
 if(custom){custom.elements.start.value=state.customRange?.start||'';custom.elements.end.value=state.customRange?.end||'';}
 const rangeGuide=document.querySelector('.calculation-guide');
 if(rangeGuide)rangeGuide.querySelector('summary').textContent=`기간 직접 지정${state.customRange?' · 적용 중':''}`;
}

function refreshChart({period,range,force=false}){
 state.period=period;
 state.customRange=range;
 syncChartPeriodControls();
 const rangeGuide=document.querySelector('.calculation-guide');if(rangeGuide)rangeGuide.open=false;
 document.querySelector('#chart-refresh-error')?.remove();
 const plot=document.querySelector('.chart-plot-wrap');
 if(!plot)return;
 let loading=document.querySelector('#chart-loading');
 if(!loading){loading=document.createElement('div');loading.id='chart-loading';loading.className='chart-loading';plot.appendChild(loading);}
 loading.classList.toggle('is-refresh',Boolean(chartInstance));
 loading.innerHTML=chartLoadingPreview('선택한 기간의 차트를 갱신하고 있어요');
 const status=document.querySelector('#chart-status');if(status)status.textContent='갱신 중';
 void loadChart({retainPrevious:Boolean(chartInstance),force});
}

function bindChartControls(){
 document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{state.period=b.dataset.period;state.customRange=null;renderChart()});
 document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{state.selected=state.selected.filter(x=>x!==b.dataset.remove);persist();renderChart()});
 const input=document.querySelector('#stock-search'),results=document.querySelector('#search-results');
 let timer;
 input?.addEventListener('input',()=>{clearTimeout(timer);const q=input.value.trim();if(!q){results.innerHTML='';return}timer=setTimeout(()=>runSearch(q,results),220)});
}

async function runSearch(q,container){
 const seq=++searchSeq;
 try{const d=await searchStocks(q);if(seq!==searchSeq)return;const rows=(d?.results||[]).slice(0,6);container.innerHTML=rows.map(r=>`<button data-result="${esc(r.symbol)}" data-name="${esc(r.name||r.symbol)}"><span><strong>${esc(r.name||r.symbol)}</strong><small>${esc(r.symbol)}</small></span><b>추가</b></button>`).join('')||'<div class="search-empty">검색 결과가 없어요</div>';container.querySelectorAll('[data-result]').forEach(b=>b.onclick=()=>addSelected(b.dataset.result,b.dataset.name))}
 catch{container.innerHTML='<div class="search-empty">검색을 완료하지 못했어요</div>'}
}

function addSelected(symbol,name){
 if(state.selected.includes(symbol)){document.querySelector('#search-results').innerHTML='';document.querySelector('#stock-search').value='';return}
 if(state.selected.length>=6){document.querySelector('#search-results').innerHTML='<div class="search-empty">최대 6개까지 비교할 수 있어요</div>';return}
 state.selected.push(symbol);
 if(!state.watchlist.some(x=>x.symbol===symbol))state.watchlist.unshift({symbol,name:displayName(symbol,name||symbol)});
 persist();renderChart();
}

async function loadChart({retainPrevious=false,force=false}={}){
 const started=performance.now();
 const seq=++chartLoadSeq;
 const requested=[...state.selected];
 const requestedPeriod=state.period;
 const requestedRange=state.customRange;
 const canvas=document.querySelector('#chart-canvas'),status=document.querySelector('#chart-status'),legend=document.querySelector('#chart-legend');
 const table=document.querySelector('#chart-table-wrap'),guide=document.querySelector('#calculation-guide-body');
 if(!requested.length){document.querySelector('#chart-loading')?.remove();legend.innerHTML='';status.textContent='종목 선택 필요';canvas.innerHTML='<div class="empty"><strong>비교할 종목이 없어요</strong><span>종목 변경에서 최대 6개까지 선택할 수 있어요.</span></div>';table.innerHTML='';guide.innerHTML='<p>종목을 선택하면 계산 기준을 확인할 수 있어요.</p>';return}
 try{
   const [data,{createChart,ColorType,LineStyle}]=await Promise.all([compareStocks(requested,requestedPeriod,requestedRange||{},{force}),loadChartRuntime()]);
   if(!canvas.isConnected||seq!==chartLoadSeq||requestedPeriod!==state.period||requested.join('|')!==state.selected.join('|'))return;
   const stocks=Array.isArray(data?.stocks)?data.stocks.filter(s=>Array.isArray(s.data)&&s.data.length):[];
   if(!stocks.length)throw new Error('표시할 시세 데이터가 없어요');
   updateChartSelectionSummary(stocks);
   chartResizeObserver?.disconnect();chartResizeObserver=null;
   if(chartInstance){chartInstance.remove();chartInstance=null;}
   canvas.innerHTML='';
   chartInstance=createChart(canvas,{localization:{locale:'ko-KR',dateFormat:'yyyy.MM.dd'},handleScale:{pinch:false},width:canvas.clientWidth||320,height:278,layout:{background:{type:ColorType.Solid,color:'#ffffff'},textColor:'#8b95a1',fontFamily:'Pretendard, -apple-system, sans-serif'},grid:{vertLines:{color:'#f2f4f6'},horzLines:{color:'#f2f4f6'}},rightPriceScale:{borderVisible:false},timeScale:{borderVisible:false,timeVisible:false},crosshair:{vertLine:{color:'#d1d6db'},horzLine:{color:'#d1d6db'}}});
   const lineStyles=[LineStyle.Solid,LineStyle.Solid,LineStyle.Solid,LineStyle.Dashed,LineStyle.Dotted,LineStyle.LargeDashed];
   const seriesRows=stocks.map((s,i)=>{
     const line=chartInstance.addLineSeries({color:COLORS[i%COLORS.length],lineWidth:i<3?2:2,lineStyle:lineStyles[i%lineStyles.length],priceLineVisible:false,lastValueVisible:false});
     line.setData(s.data);
     return {stock:s,series:line,index:i,visible:true};
   });
   chartInstance.timeScale().fitContent();
   chartDisplayedSelection={period:requestedPeriod,range:requestedRange};
   document.querySelector('#chart-coverage-notice')?.remove();
   const missing=requested.filter(ticker=>!stocks.some(stock=>stock.ticker===ticker));
   if(missing.length){
     const notice=document.createElement('div');notice.id='chart-coverage-notice';notice.className='chart-refresh-error';notice.setAttribute('role','status');
     notice.innerHTML=`<span>선택한 ${requested.length}개 중 ${requested.length-missing.length}개 종목을 표시해요. ${missing.map(ticker=>esc(displayName(ticker,comparisonStockName(ticker)||ticker))).join(', ')} 자료를 불러오지 못했어요.</span><button type="button" data-retry-chart-coverage>다시 시도</button>`;
     document.querySelector('.chart-heading')?.after(notice);
     notice.querySelector('button').onclick=()=>refreshChart({period:requestedPeriod,range:requestedRange,force:true});
   }
   document.querySelector('#chart-loading')?.remove();
   requestAnimationFrame(()=>{if(canvas.isConnected&&seq===chartLoadSeq)recordMetric('chart.ready',started);});
   chartResizeObserver=new ResizeObserver(()=>{if(chartInstance&&canvas.clientWidth)chartInstance.applyOptions({width:canvas.clientWidth})});chartResizeObserver.observe(canvas);
   const styleName=(i)=>i<3?'실선':i===3?'파선':i===4?'점선':'긴 파선';
   legend.classList.remove('chart-legend-loading');legend.removeAttribute('aria-hidden');
   legend.innerHTML=seriesRows.map(({stock:s,index:i})=>`<button type="button" data-legend-index="${i}" aria-pressed="true"><i class="legend-line legend-line-${i}" style="--legend-color:${COLORS[i%COLORS.length]}"></i><span>${esc(displayName(s.ticker,s.name||s.ticker))}<small>${styleName(i)}</small></span><strong class="${Number(s.return)>=0?'up':'down'}">${Number(s.return)>=0?'+':''}${esc(s.return)}%</strong></button>`).join('');
   legend.querySelectorAll('[data-legend-index]').forEach((button)=>{
     button.onclick=()=>{
       const row=seriesRows[Number(button.dataset.legendIndex)];
       row.visible=!row.visible;
       row.series.applyOptions({visible:row.visible});
       button.classList.toggle('muted',!row.visible);
       button.setAttribute('aria-pressed',String(row.visible));
       haptic('tickWeak');
     };
   });
   const tooltip=document.querySelector('#chart-tooltip');
   chartInstance.subscribeCrosshairMove((param)=>{
     if(!tooltip)return;
     if(!param.time||!param.point||param.point.x<0||param.point.y<0||param.point.x>(canvas.clientWidth||0)||param.point.y>278){
       tooltip.hidden=true;return;
     }
     const values=seriesRows.filter(row=>row.visible).map((row)=>{
       const item=param.seriesData.get(row.series);
       const value=item&&typeof item==='object'&&'value' in item?Number(item.value):Number(item);
       if(!Number.isFinite(value))return '';
       return `<span><i style="background:${COLORS[row.index%COLORS.length]}"></i>${esc(displayName(row.stock.ticker,row.stock.name))}<b>${value>=0?'+':''}${value.toFixed(2)}%</b></span>`;
     }).filter(Boolean).join('');
     if(!values){tooltip.hidden=true;return}
     tooltip.innerHTML=`<strong>${esc(formatChartDate(param.time))}</strong>${values}`;
     tooltip.hidden=false;
     const desiredX=Math.min(Math.max(param.point.x+12,8),(canvas.clientWidth||320)-158);
     const desiredY=Math.max(param.point.y-16,8);
     tooltip.style.left=`${desiredX}px`;
     tooltip.style.top=`${desiredY}px`;
   });
   table.innerHTML=`<div class="section-head"><h2>종목별 결과</h2><small>${esc(formatKst(data.fetchedAt))} 조회</small></div><div class="return-table">${stocks.map((s,i)=>`<button data-stock-detail="${esc(s.ticker)}"><span><i style="background:${COLORS[i%COLORS.length]}"></i><strong>${esc(displayName(s.ticker,s.name))}</strong><small>${esc(s.startDate||'-')} → ${esc(s.endDate||'-')} · ${esc(currencyLabel(s.currency))}</small></span><b class="${Number(s.return)>=0?'up':'down'}">${Number(s.return)>=0?'+':''}${esc(s.return)}%</b></button>`).join('')}</div>`;
   const basis=data?.comparisonBasis||{};
   const currencies=[...new Set(stocks.map(s=>s.currency).filter(Boolean))];
   guide.innerHTML=`<p><strong>통화:</strong> ${currencies.length>1?'종목별 현지통화 기준이며 환율 변환을 하지 않아요.':'표시 종목의 현지통화 기준이에요.'}</p><p><strong>가격:</strong> 제공처의 조정종가가 있으면 사용하고 없으면 종가를 사용해요. 총수익률로 별도 검증된 값은 아니에요.</p><p><strong>시작일:</strong> 각 종목이 선택 기간 안에서 처음 가진 실제 관측값을 사용해요. 서로 다른 휴장일 때문에 시작일이 다를 수 있어요.</p><p><strong>결측:</strong> 없는 거래일을 보간하지 않고 관측값만 연결해요.</p>${data.errors?.length?`<p class="warning-copy">일부 종목 오류: ${data.errors.map(e=>esc(e.ticker)).join(', ')}</p>`:''}`;
   status.textContent=data?.fetchedAt?formatKst(data.fetchedAt):'조회 완료';
   bindNav();
 }catch(e){
   if(seq!==chartLoadSeq)return;
   document.querySelector('#chart-loading')?.remove();
   if(retainPrevious&&chartInstance&&chartDisplayedSelection){
     const failedSelection={period:requestedPeriod,range:requestedRange};
     state.period=chartDisplayedSelection.period;state.customRange=chartDisplayedSelection.range;
     syncChartPeriodControls();
     status.textContent='이전 결과 표시 중';
     const note=document.createElement('div');note.id='chart-refresh-error';note.className='chart-refresh-error';note.innerHTML='<span>새 기간을 불러오지 못해 이전 차트를 보여줘요.</span><button type="button">다시 시도</button>';
     document.querySelector('.chart-heading')?.after(note);
     note.querySelector('button').onclick=()=>refreshChart({...failedSelection,force:true});
     return;
   }
   status.textContent='오류';
   canvas.innerHTML=`<div class="empty"><strong>차트를 불러오지 못했어요</strong><span>${esc(e.message)}</span><button class="retry" id="retry-chart">다시 시도</button></div>`;
   legend.innerHTML='';legend.classList.remove('chart-legend-loading');legend.removeAttribute('aria-hidden');
   table.innerHTML='';
   guide.innerHTML='<p>데이터를 불러온 뒤 계산 기준을 확인할 수 있어요.</p>';
   document.querySelector('#retry-chart')?.addEventListener('click',()=>loadChart({force:true}));
 }
}

async function renderWatch(){
 cleanupChart();
 const epoch=viewEpoch;
 document.querySelector('#app').innerHTML=shell(`
   <section class="task-head watch-task-head"><div><h2>관심종목 <span>${state.watchlist.length}</span></h2><p>이 목록은 현재 기기에 저장돼요.</p></div>${state.watchlist.length?'<div class="task-actions"><button class="primary-subtle" id="watch-add">종목 추가</button><button class="neutral-action" id="watch-edit">편집</button></div>':''}</section>
   <div class="watch-sort" ${state.watchlist.length?'':'hidden'} role="group" aria-label="관심종목 정렬">${[['manual','직접'],['name','이름'],['change','등락률']].map(([k,l])=>`<button data-watch-sort="${k}" class="${state.watchSort===k?'active':''}" aria-pressed="${state.watchSort===k}">${l}</button>`).join('')}</div>
   <div id="watch-rich-list" class="watch-rich-list">${state.watchlist.length?loadingIndicator('관심종목 시세를 불러오고 있어요')+'<div class="skeleton watch-large"></div><div class="skeleton watch-large"></div>':'<div class="empty watch-empty"><strong>아직 관심종목이 없어요</strong><span>자주 확인할 종목을 검색해 이 기기에 저장하세요.</span><button class="retry" id="watch-empty-add">종목 추가</button></div>'}</div>
   ${savedResearchHtml(symbol=>displayName(symbol))}
 `,'관심종목');
 bindNav();

 const openEditor=()=>openStockSelector({
   title:'관심종목 관리',
   description:'현재 기기에 저장할 종목을 선택하세요. 최대 20개까지 저장할 수 있어요.',
   initial:state.watchlist.map(x=>x.symbol),
   limit:20,
   favorites:state.watchlist,
   nameFor:(symbol)=>displayName(symbol,state.watchlist.find(x=>x.symbol===symbol)?.name),
   restoreBack:restoreNativeBack,
   onApply:(symbols,names)=>{state.watchlist=symbols.map(symbol=>({symbol,name:names[symbol]||displayName(symbol)}));persist();renderWatch()},
 });
 document.querySelector('#watch-add')?.addEventListener('click',openEditor);
 document.querySelector('#watch-edit')?.addEventListener('click',openEditor);
 document.querySelector('#watch-empty-add')?.addEventListener('click',openEditor);
 document.querySelectorAll('[data-watch-sort]').forEach(b=>b.onclick=()=>{state.watchSort=b.dataset.watchSort;renderWatch()});
 if(!state.watchlist.length)return;
 const tickers=state.watchlist.slice(0,20).map(x=>x.symbol);
 rememberLiveQuotes(readHomeFast('snapshot',6*60*60*1000)?.heatmap?.results||[],{priority:20});
 seedWatchQuoteCache(tickers);
 const paint=({pending=false,failed=false}={})=>{
   if(epoch!==viewEpoch)return;
   const quotes=tickers.map(symbol=>getLiveQuote(symbol)).filter(Boolean);
   let items=state.watchlist.map((x,index)=>({x,index,q:quotes.find(r=>r.ticker===String(x.symbol).toUpperCase())||{}}));
   if(state.watchSort==='name')items.sort((a,b)=>displayName(a.x.symbol,a.x.name).localeCompare(displayName(b.x.symbol,b.x.name),'ko'));
   if(state.watchSort==='change')items.sort((a,b)=>(finiteNumber(b.q.change)??-Infinity)-(finiteNumber(a.q.change)??-Infinity));
   const notice=failed?'<div class="watch-refresh-note" role="status">새 시세를 확인하지 못했어요. 표시된 기준시각을 확인해주세요. <button class="retry" id="retry-watch">다시 시도</button></div>':'';
   document.querySelector('#watch-rich-list').innerHTML=notice+items.map(({x,q},i)=>{
     const name=displayName(x.symbol,x.name);const ch=finiteNumber(q.change);
     return `<article class="watch-detail-card"><button class="watch-main" data-stock-detail="${esc(x.symbol)}"><span class="stock-logo tone-${i%4}">${esc(name.slice(0,1))}</span><span class="watch-main-copy"><strong>${esc(name)}</strong><small>${esc(x.symbol)} · ${q.asOf?esc(formatKst(q.asOf)):pending?'기준시각 확인 중':'기준시각 미제공'}${pending?' · 새 시세 확인 중':''}</small></span><span class="watch-card-price"><strong>${q.price==null?(pending?'확인 중':'-'):esc(formatCurrencyPrice(q.price,q.currency))}</strong><em class="${ch>0?'up':ch<0?'down':'flat'}">${Number.isFinite(ch)?esc(fmtChange(ch)):'등락률 -'}</em><i>${iconSvg('arrow',18)}</i></span></button><button class="watch-remove" data-unwatch="${esc(x.symbol)}" aria-label="${esc(name)} 관심 해제">${iconSvg('heart',18)}</button></article>`;
   }).join('');
   bindNav();
   document.querySelector('#retry-watch')?.addEventListener('click',renderWatch);
   document.querySelectorAll('[data-unwatch]').forEach(b=>b.onclick=e=>{
     e.stopPropagation();
     const symbol=b.dataset.unwatch;
     const index=state.watchlist.findIndex(x=>x.symbol===symbol);
     const removed=state.watchlist[index];
     if(index<0)return;
     state.watchlist.splice(index,1);
     if(persist()){
       haptic('tickWeak');renderWatch();
       showToast(`${displayName(removed.symbol,removed.name)} 관심종목에서 삭제했어요.`,'실행 취소',()=>{state.watchlist.splice(index,0,removed);persist();renderWatch()});
     }
   });
 };
 paint({pending:true});
 try{
   const payload=await quoteSnapshots(tickers);
   if(epoch!==viewEpoch)return;
   rememberLiveQuotes(payload?.results||[],{priority:40});
   saveWatchQuoteCache(tickers);
   paint();
 }catch(e){
   if(epoch!==viewEpoch)return;
   paint({failed:true});
 }
}

async function renderValuation(){
 cleanupChart();
 const epoch=viewEpoch;
 const metricDefs={
   forwardPE:{label:'예상 PER',suffix:'배',desc:'제공처의 향후 이익 추정 기간 기준',key:'forwardPE'},
   trailingPE:{label:'실적 PER',suffix:'배',desc:'최근 12개월(TTM) 이익 기준',key:'trailingPE'},
   pbr:{label:'PBR',suffix:'배',desc:'최근 가용 순자산 기준',key:'pbr'},
   roe:{label:'ROE',suffix:'%',desc:'최근 가용 자기자본이익률',key:'roe'},
   dividendYield:{label:'배당수익률',suffix:'%',desc:'최근 제공처 표시값 기준',key:'dividendYield'},
 };
 if(!metricDefs[state.valuationMetric])state.valuationMetric='forwardPE';
 document.querySelector('#app').innerHTML=shell(`
   <section class="task-head"><div><h2>밸류에이션 비교</h2><p>같은 지표를 종목별로 나란히 비교해요.</p></div><button class="primary-subtle" id="valuation-select">종목 변경</button></section>
   <div class="selected-summary">${state.selected.length?`${state.selected.length}개 종목 · ${state.selected.map(x=>esc(displayName(x))).join(' · ')}`:'비교할 종목을 선택해주세요.'}</div>
   <div class="metric-tabs" role="tablist">${Object.entries(metricDefs).map(([key,m])=>`<button role="tab" data-valuation-metric="${key}" aria-selected="${state.valuationMetric===key}" class="${state.valuationMetric===key?'active':''}">${m.label}</button>`).join('')}</div>
   <section class="metric-explain" id="metric-explain"></section>
   <div id="valuation-list" class="valuation-compare-list">${loadingIndicator('재무 지표를 불러오고 있어요')}<div class="skeleton valuation"></div><div class="skeleton valuation"></div></div>
   <details class="all-metrics-details"><summary>종목별 전체 지표 보기</summary><div id="all-metrics-list"></div></details>
 `,'밸류에이션');
 bindNav();
 document.querySelector('#valuation-select')?.addEventListener('click',()=>{
   const y=window.scrollY;
   openCompareSheet(()=>{renderValuation();requestAnimationFrame(()=>window.scrollTo(0,y))});
 });
 if(!state.selected.length){
   document.querySelector('#valuation-list').innerHTML='<div class="empty"><strong>비교할 종목이 없어요</strong><span>종목 변경에서 선택해주세요.</span></div>';
   return;
 }
 rememberLiveQuotes(readHomeFast('snapshot',6*60*60*1000)?.heatmap?.results||[],{priority:20});
 seedWatchQuoteCache(state.watchlist.map(x=>x.symbol));
 void quoteSnapshots(state.selected).then(payload=>{
   if(epoch!==viewEpoch)return;
   rememberLiveQuotes(payload?.results||[],{priority:40});
   document.querySelectorAll('[data-valuation-price]').forEach(node=>{
     const quote=getLiveQuote(node.dataset.valuationPrice);
     if(!quote?.price)return;
     node.querySelector('strong').textContent=formatCurrencyPrice(quote.price,quote.currency);
     node.querySelector('small').textContent=quote.asOf?`시세 ${formatKst(quote.asOf)}`:'시세 기준시각 미제공';
   });
 }).catch(()=>{});
 try{
   const d=await valuationStocks(state.selected);
   if(epoch!==viewEpoch)return;
   const rows=Array.isArray(d?.stocks)?d.stocks:[];
   if(!rows.length)throw new Error('표시할 밸류에이션 데이터가 없어요');

   const paint=()=>{
     const def=metricDefs[state.valuationMetric];
     document.querySelectorAll('[data-valuation-metric]').forEach(b=>{b.classList.toggle('active',b.dataset.valuationMetric===state.valuationMetric);b.setAttribute('aria-selected',String(b.dataset.valuationMetric===state.valuationMetric))});
     document.querySelector('#metric-explain').innerHTML=`<div><strong>${def.label}</strong><span>${def.desc}</span></div><small>값의 높고 낮음은 투자 판단이나 종목 우열을 뜻하지 않아요.</small>`;
     const valid=rows.map(r=>Number(r[def.key])).filter(Number.isFinite);
     const maxAbs=Math.max(...valid.map(Math.abs),1);
     document.querySelector('#valuation-list').innerHTML=rows.map((s,i)=>{
       const value=Number(s[def.key]);const meta=s.fieldMeta?.[def.key]||{};const pct=Number.isFinite(value)?Math.min(100,Math.max(4,Math.abs(value)/maxAbs*100)):0;
       return `<button class="valuation-compare-row" data-stock-detail="${esc(s.ticker)}"><span class="stock-logo tone-${i%4}">${esc(displayName(s.ticker,s.name).slice(0,1))}</span><span class="valuation-row-copy"><strong>${esc(displayName(s.ticker,s.name))}</strong><small>${esc(s.ticker)} · ${esc(formatMetricPeriod(meta.period))}</small><span class="metric-bar"><i style="width:${pct}%"></i></span><em>${esc(formatDataSource(meta.source||s.dataSource||'출처 확인 필요'))}</em></span><span class="valuation-row-value"><strong>${Number.isFinite(value)?esc(value.toLocaleString('ko-KR',{maximumFractionDigits:2})+def.suffix):'-'}</strong><small>${s.generatedAt?esc(formatKst(s.generatedAt)):'조회시각 -'}</small>${iconSvg('arrow',17)}</span></button>`;
     }).join('');
     bindNav();
   };
   document.querySelectorAll('[data-valuation-metric]').forEach(b=>b.onclick=()=>{state.valuationMetric=b.dataset.valuationMetric;haptic('tickWeak');paint()});
   paint();

   document.querySelector('#all-metrics-list').innerHTML=rows.map((s,i)=>{const quote=getLiveQuote(s.ticker);return `<section class="valuation-card rich-valuation-card"><button class="valuation-top" data-stock-detail="${esc(s.ticker)}"><span class="stock-logo tone-${i%4}">${esc(displayName(s.ticker,s.name).slice(0,1))}</span><span class="valuation-title-copy"><strong>${esc(displayName(s.ticker,s.name))}</strong><small>${esc(s.ticker)}${s.sector?' · '+esc(s.sector):''}</small></span><span class="valuation-price" data-valuation-price="${esc(s.ticker)}"><strong>${esc(formatCurrencyPrice(quote?.price??s.price,quote?.currency??s.currency))}</strong><small>${quote?.asOf?`시세 ${esc(formatKst(quote.asOf))}`:'지표 조회 시점 가격'}</small><i>${iconSvg('arrow',18)}</i></span></button><div class="metric-grid rich-metrics">${Object.values(metricDefs).map((m,j)=>`<div class="metric-cell tone-bg-${j%3}"><span>${m.label}</span><strong>${s[m.key]==null?'-':esc(Number(s[m.key]).toLocaleString('ko-KR',{maximumFractionDigits:2})+m.suffix)}</strong><small>${esc(formatMetricPeriod(s.fieldMeta?.[m.key]?.period||m.desc))}</small></div>`).join('')}</div></section>`}).join('');
   bindNav();
 }catch(e){
   if(epoch!==viewEpoch)return;
   document.querySelector('#valuation-list').innerHTML=`<div class="empty"><strong>밸류에이션을 불러오지 못했어요</strong><span>${esc(e.message)}</span><button class="retry" id="retry-valuation">다시 시도</button></div>`;
   document.querySelector('#retry-valuation')?.addEventListener('click',renderValuation);
 }
}

function macroSparklineSvg(rows,isUp){
 const clean=(Array.isArray(rows)?rows:[]).map((row,index)=>({index,value:Number(row?.value)})).filter((row)=>Number.isFinite(row.value));
 if(clean.length<2)return '';
 const values=clean.map((row)=>row.value);
 let min=Math.min(...values),max=Math.max(...values);
 if(max===min){max+=0.5;min-=0.5}
 const pad=(max-min)*0.08;max+=pad;min-=pad;
 const width=100,height=38,yTop=3,yBottom=35;
 const line=clean.map((row,index)=>{
   const x=(index/(clean.length-1))*width;
   const y=yBottom-((row.value-min)/(max-min))*(yBottom-yTop);
   return `${index?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`;
 }).join(' ');
 const tone=isUp?'var(--macro-up,#e54855)':'var(--macro-down,#3182f6)';
 return `<svg class="macro-sparkline" viewBox="0 0 100 38" preserveAspectRatio="none" aria-hidden="true"><path d="${line}" fill="none" stroke="${tone}" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

async function renderMacro({force=false}={}){
 cleanupChart();
 const epoch=viewEpoch;
 document.querySelector('#app').innerHTML=shell(`
   <section class="task-head"><div><h2>경제 지표</h2><p>지표마다 단위와 관측 시점이 달라요. 같은 ‘최신일’로 묶지 않고 각각 표시해요.</p></div></section>
   <div id="macro-freshness" class="freshness-card skeleton">${loadingIndicator('갱신 시각을 확인하고 있어요')}</div>
   <div id="macro-summary" class="macro-summary rich-macro-summary skeleton">${loadingIndicator('경제 지표를 불러오고 있어요')}</div>
   <div id="macro-groups" class="macro-groups">${loadingIndicator('지표별 추이를 확인하고 있어요')}<div class="skeleton macro-tile"></div><div class="skeleton macro-tile"></div></div>
 `,'경제 지표');
 bindNav();
 try{
   const d=await macroData({force});
   if(epoch!==viewEpoch)return;
   if(!Array.isArray(d?.results)||!d.results.length)throw new Error('경제 지표 자료가 없어요.');
   const s=d?.summary||{};
   const freshness=document.querySelector('#macro-freshness');
   freshness.classList.remove('skeleton');
   const rows=d?.results||[];const freshnessRows=rows.map(row=>({row,status:macroFreshness(row)}));const staleCount=freshnessRows.filter(item=>item.status.stale).length;const freshCount=rows.length-staleCount;
   freshness.innerHTML=`<div><strong>${staleCount?'관측일이 오래된 지표가 있어요':'지표 관측일을 확인했어요'}</strong><span>수집 ${esc(formatKst(d?.generatedAt))} · 최신 기준 ${freshCount}개 · 확인 필요 ${staleCount}개</span></div><button data-tab="info">데이터 기준</button>`;

   const summary=document.querySelector('#macro-summary');summary.classList.remove('skeleton');
   const level=s.level||'yellow';const label=level==='red'?'위험 신호 많음':level==='green'?'안정 신호 많음':'신호 혼재';
   summary.innerHTML=`<div class="macro-signal-orb ${esc(level)}"><span></span></div><div class="macro-summary-copy"><span>규칙 기반 지표 요약 <b class="status-badge ${esc(level)}">${label}</b></span>${String(s.text||'').includes('|')?`<ul class="macro-observations">${String(s.text).split('|').map(part=>`<li>${esc(part.trim())}</li>`).join('')}</ul>`:`<details class="macro-summary-details"><summary>지표 요약 원문 보기</summary><p>${esc(s.text||'개별 지표를 확인해주세요.')}</p></details>`}<small>${staleCount?'일부 값은 최근 관측이 아닐 수 있어요. 관측일과 출처를 함께 확인해주세요. ':''}${esc(s.notice||'시장 환경 설명용 요약이며 투자 행동을 권유하지 않아요.')}</small></div>`;

   const groups=new Map();
   (d?.results||[]).forEach(row=>{const category=macroCategory(row);if(!groups.has(category))groups.set(category,[]);groups.get(category).push(row)});
   const order=['금리','물가','유동성','위험','고용','경기','기타'];
   document.querySelector('#macro-groups').innerHTML=order.filter(k=>groups.has(k)).map(category=>`<section class="macro-group"><div class="section-head"><h2>${category}</h2><small>${groups.get(category).length}개 지표</small></div><div class="macro-grid">${groups.get(category).map((r)=>{const change=formatMacroChange(r);const chart=Array.isArray(r.chart_data)?r.chart_data:[];const isUp=Number(r.delta??r.change)>=0;const spark=macroSparklineSvg(chart,isUp);const status=macroFreshness(r);return `<article class="macro-tile neutral-macro"><div class="macro-tile-top"><span class="macro-symbol">${esc(r.symbol||r.original_symbol||'')}</span><small class="${status.stale?'stale-text':''}">${status.stale?'관측일 확인 필요':'최근 관측'}</small></div><strong>${esc(r.name||r.symbol)}</strong><div class="macro-value"><b>${esc(formatMacroValue(r))}</b><em>${esc(change)}</em></div><div class="macro-mini-chart" aria-label="${esc(r.name||r.symbol)} 추세">${spark||'<span>시계열 없음</span>'}</div>${spark?`<div class="macro-mini-dates"><span>${esc(formatChartDate(chart[0]?.time||''))}</span><span>${esc(formatChartDate(chart.at(-1)?.time||r.asOf||''))}</span></div>`:''}<p>${esc(r.desc||'')}</p><div class="macro-meta-line"><span>${esc(observationLabel(r))}</span><span>${esc(changeBasisLabel(r.changeBasis))}</span>${macroPublicationLabel(r)?`<span>${esc(macroPublicationLabel(r))}</span>`:''}</div><div class="source-row"><small class="source-line">${esc(r.source||'출처 미제공')}</small>${macroSourceUrl(r)?`<button type="button" data-external-url="${esc(macroSourceUrl(r))}">원본 시리즈</button>`:''}</div></article>`}).join('')}</div></section>`).join('');
   bindNav();
 }catch(e){
   if(epoch!==viewEpoch)return;
   document.querySelector('#macro-freshness').classList.remove('skeleton');document.querySelector('#macro-freshness').innerHTML='<div><strong>갱신 정보를 확인하지 못했어요</strong><span>개별 데이터 로딩 상태를 확인해주세요.</span></div>';
   document.querySelector('#macro-summary').classList.remove('skeleton');document.querySelector('#macro-summary').innerHTML='<div class="macro-summary-copy"><strong>경제 지표 연결에 실패했어요.</strong><small>잠시 후 다시 시도해주세요.</small></div>';
   document.querySelector('#macro-groups').innerHTML=`<div class="empty"><strong>경제 지표를 불러오지 못했어요</strong><span>${esc(e.message)}</span><button class="retry" id="retry-macro">다시 시도</button></div>`;
   document.querySelector('#retry-macro')?.addEventListener('click',()=>renderMacro({force:true}));
 }
}

function timeAgo(value){
 const ms=Date.now()-new Date(value||0).getTime();if(!Number.isFinite(ms)||ms<0)return '';
 const min=Math.floor(ms/60000);if(min<60)return min<1?'방금 전':`${min}분 전`;
 const hour=Math.floor(min/60);if(hour<24)return `${hour}시간 전`;
 const day=Math.floor(hour/24);return day<7?`${day}일 전`:String(value||'').slice(0,10);
}

function homeCachedQuote(symbol){
 return detailCachedQuote(symbol,readHomeFast('snapshot',6*60*60*1000),readHomeFast('market',6*60*60*1000));
}

function persistLiveQuoteToHomeSnapshot(quote){
 if(!quote?.ticker)return;
 const canonical=getLiveQuote(quote.ticker)||quote;
 const cached=readHomeFast('snapshot',6*60*60*1000);
 const rows=cached?.heatmap?.results;
 if(!cached||!Array.isArray(rows))return;
 let changed=false;
 const ticker=String(quote.ticker).toUpperCase();
 const nextRows=rows.map(row=>{
   if(String(row?.ticker||'').toUpperCase()!==ticker)return row;
   changed=true;
   return mergeRowsWithLive([row])[0];
 });
 if(changed)writeHomeFast('snapshot',{...cached,heatmap:{...(cached.heatmap||{}),results:nextRows,generatedAt:canonical.asOf||cached?.heatmap?.generatedAt}});
}

async function refreshDetailChart({symbol,epoch,period,force=false}){
 state.detailPeriod=period;
 const seq=++detailChartLoadSeq;
 document.querySelectorAll('[data-detail-period]').forEach(button=>{
   const active=button.dataset.detailPeriod===period;
   button.classList.toggle('active',active);
   button.setAttribute('aria-pressed',String(active));
 });
 document.querySelector('#detail-chart-refresh-error')?.remove();
 const wrap=document.querySelector('.detail-chart-wrap');
 if(!wrap)return;
 let loading=document.querySelector('#detail-chart-loading');
 if(!loading){loading=document.createElement('div');loading.id='detail-chart-loading';loading.className='chart-loading';wrap.appendChild(loading);}
 loading.classList.toggle('is-refresh',Boolean(chartInstance));
 loading.innerHTML=chartLoadingPreview(chartInstance?'선택한 기간의 종목 차트를 갱신하고 있어요':'종목 차트를 불러오고 있어요');
 const status=document.querySelector('#detail-chart-status');
 if(status)status.textContent=chartInstance?'갱신 중':'불러오는 중';
 try{
   const [data,{createChart,ColorType}]=await Promise.all([compareStocks([symbol],period,{},{force}),loadChartRuntime()]);
   if(seq!==detailChartLoadSeq||epoch!==viewEpoch||state.tab!=='detail'||state.detailSymbol!==symbol)return;
   const stock=data?.stocks?.[0];
   if(!stock?.data?.length)throw new Error('표시할 차트 데이터가 없어요');
   const points=symbol.startsWith('^')?indexSeries(stock):stock.data;
   if(!points)throw new Error('지수 값 자료가 없어 차트를 표시할 수 없어요');
   const canvas=document.querySelector('#detail-chart');
   if(!canvas)return;
   chartResizeObserver?.disconnect();chartResizeObserver=null;
   if(chartInstance){chartInstance.remove();chartInstance=null;}
   canvas.innerHTML='';
   chartInstance=createChart(canvas,{localization:{locale:'ko-KR',dateFormat:'yyyy.MM.dd'},handleScale:{pinch:false},width:canvas.clientWidth||320,height:220,layout:{background:{type:ColorType.Solid,color:'#ffffff'},textColor:'#8b95a1',fontFamily:'Pretendard, -apple-system, sans-serif'},grid:{vertLines:{color:'#f7f8fa'},horzLines:{color:'#f2f4f6'}},rightPriceScale:{borderVisible:false},timeScale:{borderVisible:false},crosshair:{vertLine:{color:'#d1d6db'},horzLine:{color:'#d1d6db'}}});
   const line=chartInstance.addAreaSeries({lineColor:'#3182f6',topColor:'rgba(49,130,246,.18)',bottomColor:'rgba(49,130,246,.01)',lineWidth:2,priceLineVisible:false,lastValueVisible:false});
   line.setData(points);chartInstance.timeScale().fitContent();
   if(symbol.startsWith('^'))chartInstance.applyOptions({localization:{priceFormatter:value=>value.toLocaleString('ko-KR',{maximumFractionDigits:2})+' pt'}});
   chartResizeObserver=new ResizeObserver(()=>{if(chartInstance&&canvas.clientWidth)chartInstance.applyOptions({width:canvas.clientWidth})});chartResizeObserver.observe(canvas);
   detailDisplayedPeriod=period;
   document.querySelector('#detail-chart-loading')?.remove();
   document.querySelector('#detail-period-label').textContent=({'1mo':'1개월','3mo':'3개월','6mo':'6개월','1y':'1년'}[period]||period)+(symbol.startsWith('^')?' 지수 흐름 · pt':' 수익률');
   const periodReturn=finiteNumber(stock.return);
   status.textContent=periodReturn===null?'조회 완료':`${periodReturn>=0?'+':''}${periodReturn.toFixed(2)}%`;
   document.querySelector('#detail-return-note').innerHTML=`<span>${esc(stock.startDate||'-')} → ${esc(stock.endDate||'-')}</span><span>${symbol.startsWith('^')?'지수 pt · Yahoo Chart':esc(currencyLabel(stock.currency))+' 기준 · '+(stock.priceBasis==='adjusted_close'?'조정종가 우선':'종가 기준')}</span>`;
   return stock;
 }catch(error){
   if(seq!==detailChartLoadSeq||epoch!==viewEpoch||state.tab!=='detail'||state.detailSymbol!==symbol)return;
   document.querySelector('#detail-chart-loading')?.remove();
   if(chartInstance&&detailDisplayedPeriod){
     state.detailPeriod=detailDisplayedPeriod;
     document.querySelectorAll('[data-detail-period]').forEach(button=>{const active=button.dataset.detailPeriod===detailDisplayedPeriod;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
     status.textContent='이전 결과 표시 중';
     const note=document.createElement('div');note.id='detail-chart-refresh-error';note.className='chart-refresh-error';note.innerHTML='<span>새 기간을 불러오지 못해 이전 차트를 보여줘요.</span><button type="button">다시 시도</button>';
     document.querySelector('#detail-chart-section')?.appendChild(note);
     note.querySelector('button').onclick=()=>refreshDetailChart({symbol,epoch,period,force:true});
     return;
   }
   status.textContent='오류';
   const canvas=document.querySelector('#detail-chart');
   if(canvas)canvas.innerHTML=`<div class="empty compact"><strong>차트를 불러오지 못했어요</strong><span>${esc(error?.message||'잠시 후 다시 시도해주세요.')}</span><button class="retry" id="retry-detail-chart">다시 시도</button></div>`;
   document.querySelector('#retry-detail-chart')?.addEventListener('click',()=>refreshDetailChart({symbol,epoch,period,force:true}));
 }
}

async function renderDetail(){
 cleanupChart();
 detailDisplayedPeriod=null;
 const epoch=viewEpoch;
 const symbol=state.detailSymbol||state.selected[0]||'005930.KS';
 const isIndex=symbol.startsWith('^');
 const koreanDetail=/\.(KS|KQ)$/i.test(symbol);
 const saved=state.watchlist.find(x=>x.symbol===symbol);
 let closingQuote=null;
 let knownName=usableStockName(state.detailName,symbol)||usableStockName(saved?.name,symbol)||usableStockName(DISPLAY_NAMES[symbol],symbol);
 const headingName=knownName||'종목명 확인 중';
 document.querySelector('#app').innerHTML=shell(`
   <section class="detail-compact-head">
     <div class="detail-brand"><span class="detail-logo" id="detail-logo">${knownName?esc(knownName.slice(0,1)):'?'}</span><div><span>${esc(symbol)}</span><h2 id="detail-name" class="${knownName?'':'identity-loading'}">${esc(headingName)}</h2></div></div>
     <div class="detail-actions"><button id="detail-change" type="button">${iconSvg('search',18)} <span>다른 종목</span></button><button id="detail-watch" class="detail-watch-button" type="button">${iconSvg('heart',18)} <span>${saved?'관심 등록됨':'관심 등록'}</span></button><button id="detail-compare">${iconSvg('chart',18)} <span>${state.selected.includes(symbol)?'비교 열기':'비교 추가'}</span></button></div>
   </section>
   <section class="detail-price skeleton detail-price-skeleton" id="detail-price">${loadingIndicator('현재가를 확인하고 있어요')}</section>
   <nav class="detail-jump-nav" aria-label="종목 정보 바로가기"><button type="button" data-detail-jump="detail-price">가격</button><button type="button" data-detail-jump="${koreanDetail?'detail-financial-block':'detail-metrics-section'}">${koreanDetail?'공시 실적':'핵심 지표'}</button>${koreanDetail?'<button type="button" data-detail-jump="detail-industry-block">산업</button>':''}<button type="button" data-detail-jump="detail-news-section">뉴스</button>${koreanDetail?'<button type="button" data-detail-jump="detail-research-card">공시 비교</button>':''}</nav>
   ${state.detailInvestigation?.symbol===symbol&&state.detailInvestigation.kind!=='saved'?investigationHtml(state.detailInvestigation):''}
   ${!isIndex?'<p id="detail-identity-note" class="detail-identity-note" role="status"></p><div id="detail-cap">시가총액 확인 중</div>':''}
   <div class="segmented detail-period-tabs">${[['1mo','1개월'],['3mo','3개월'],['6mo','6개월'],['1y','1년']].map(([p,l])=>`<button data-detail-period="${p}" aria-pressed="${state.detailPeriod===p}" class="${state.detailPeriod===p?'active':''}">${l}</button>`).join('')}</div>
   <section class="detail-chart-card" id="detail-chart-section"><div class="detail-section-head"><div><span>기간 수익률</span><strong id="detail-period-label">선택 기간 흐름</strong></div><small id="detail-chart-status" role="status">불러오는 중</small></div><div class="detail-chart-wrap"><div id="detail-chart" class="detail-chart"></div><div id="detail-chart-loading" class="chart-loading">${chartLoadingPreview('종목 차트를 불러오고 있어요')}</div></div><div id="detail-return-note" class="detail-return-note"></div></section>
   ${!isIndex?'<details class="detail-block detail-review" id="detail-review"><summary>선정 기록 · 기술 지표 확인</summary><div id="detail-review-body">펼치면 기존 선정 기록의 신호등·성과와 수집된 기술 지표를 확인해요.</div></details>':''}
   ${!isIndex&&!koreanDetail?'<p class="detail-support-note">DART 공시 비교와 KRX 산업 맥락은 국내 종목에서 제공해요. 미국 종목은 시세·차트·핵심 지표·관련 뉴스를 제공해요.</p>':''}

   ${/\.(KS|KQ)$/i.test(symbol)?`<section class="detail-block" id="detail-financial-block"><div class="section-head"><div><h2>공시 재무 흐름</h2><p>DART 보고서의 실적·현금흐름·재무상태</p></div><span class="detail-context-badge">DART</span></div><div id="detail-financial-history">${loadingIndicator('최근 재무제표를 확인하고 있어요')}</div></section>`:''}
   ${koreanDetail?`<section class="detail-block detail-industry-block" id="detail-industry-block"><div class="section-head"><div><h2>회사 · 산업 맥락</h2><p>사업, 관련 기업, 산업 연결을 살펴봐요</p></div><span class="detail-context-badge">KRX</span></div><div id="detail-industry-context" class="detail-industry-context">${loadingIndicator('회사·산업 정보를 불러오고 있어요')}<div class="skeleton detail-context-skeleton"></div></div></section>
   <section class="research-card" id="detail-research-card" aria-labelledby="research-card-title"><div class="research-card-head"><span>공시로 확인하기</span><h2 id="research-card-title">DART 공시 비교</h2><p>보고서에 나온 실적을 이전 기간이나 다른 회사와 비교해보세요.</p></div><div id="research-card-body">${loadingIndicator('공시 비교를 열고 있어요')}</div></section>`:''}
   <section class="detail-block" id="detail-metrics-section"><div class="section-head"><h2>핵심 지표</h2><button class="text-button" data-tab="valuation">같은 지표 비교</button></div><div id="detail-metrics" class="detail-metrics">${loadingIndicator('핵심 지표를 불러오고 있어요')}<div class="skeleton metric"></div><div class="skeleton metric"></div><div class="skeleton metric"></div><div class="skeleton metric"></div></div><div id="detail-metric-meta" class="detail-metric-meta"></div></section>
   <section class="detail-block" id="detail-news-section"><div class="section-head"><h2>관련 뉴스</h2><button class="text-button" data-stock-news="${esc(symbol)}" data-stock-name="${esc(knownName)}">이 종목 뉴스 더 보기</button></div><div id="detail-news" class="detail-news">${loadingIndicator('관련 뉴스를 불러오고 있어요')}<div class="skeleton news"></div><div class="skeleton news"></div></div></section>
 `,headingName);
 bindNav();
 const review=document.querySelector('#detail-review');
 let reviewLoaded=false;
 review?.addEventListener('toggle',()=>{
   if(!review.open||reviewLoaded)return;
   reviewLoaded=true;
   const host=document.querySelector('#detail-review-body');
   import('./detailReviewSummary.js').then(({mountDetailReview})=>{if(epoch===viewEpoch)mountDetailReview(host,symbol,{alive:()=>epoch===viewEpoch,bindNav});}).catch(()=>{if(epoch===viewEpoch){reviewLoaded=false;host.textContent='화면을 불러오지 못했어요. 접었다 다시 펼쳐주세요.';}});
 });
 const jumpToDetail=id=>{
   const target=document.getElementById(id);
   if(!target)return false;
   target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
   target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
   return true;
 };
 const restoreInvestigationJump=()=>{const context=state.detailInvestigation;if(epoch===viewEpoch&&context?.symbol===symbol&&context.jump&&jumpToDetail(context.jump)){context.jump=null;}};
 document.querySelectorAll('[data-detail-jump]').forEach(button=>button.addEventListener('click',()=>jumpToDetail(button.dataset.detailJump)));
 const sectionNav=document.querySelector('.detail-jump-nav');
 const updateSection=()=>{
  if(epoch!==viewEpoch||!sectionNav?.isConnected)return;
  const buttons=[...sectionNav.querySelectorAll('[data-detail-jump]')];
  let active=buttons[0],nearest=-Infinity;
  const atEnd=window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-2;
  const threshold=atEnd?window.innerHeight-90:sectionNav.getBoundingClientRect().bottom+24;
  for(const button of buttons){const target=document.getElementById(button.dataset.detailJump);const top=target?.getBoundingClientRect().top;if(top<=threshold&&top>nearest){active=button;nearest=top;}}
  buttons.forEach(button=>{if(button===active)button.setAttribute('aria-current','location');else button.removeAttribute('aria-current');});
 };
 window.addEventListener('scroll',updateSection,{passive:true});detailJumpCleanup=()=>window.removeEventListener('scroll',updateSection);updateSection();

 if(koreanDetail)import('./researchCard.js').then(({mountResearchCard})=>{
   if(epoch!==viewEpoch)return;
   mountResearchCard(document.querySelector('#research-card-body'),{symbol,name:knownName||symbol,onJump:jumpToDetail,onNotice:showToast,candidates:[...state.watchlist,...Object.entries(DISPLAY_NAMES).map(([symbol,name])=>({symbol,name}))],favorites:state.watchlist,draft:researchDrafts.get(symbol),initialPeer:state.sharedDetailSymbol===symbol?state.researchPeer:null,onDraftChange:draft=>{researchDrafts.set(symbol,draft);state.researchPeer=draft.resultPeer||draft.peer||null;},onCompare:companies=>{state.selected=companies.map(row=>row.symbol);companies.forEach(row=>resolvedNames.set(row.symbol,row.name));persist();navigate('chart');},onChoosePeer:callback=>openStockSelector({title:'공시를 비교할 회사',description:'현재 종목과 다른 국내 회사 하나를 선택하세요.',favorites:state.watchlist,nameFor:comparisonStockName,pickLabel:'비교 선택',restoreBack:restoreNativeBack,onPick:(symbol,name)=>callback({symbol,name})})});
   restoreInvestigationJump();
 }).catch(()=>{
   if(epoch!==viewEpoch)return;
   const host=document.querySelector('#research-card-body');
   if(host)host.innerHTML='<p>조사 카드를 열지 못했어요. 화면을 다시 열어주세요.</p>';
 });
 const paintWatchState=()=>{
   const watched=state.watchlist.some(row=>row.symbol===symbol);
   const verified=isIndex||Boolean(knownName)||Number(getLiveQuote(symbol)?.price)>0;
   const label=knownName||symbol;
   for(const button of [document.querySelector('#detail-watch')]){
     if(!button)continue;
     button.classList.toggle('is-watched',watched);
     button.disabled=!watched&&!verified;
     button.setAttribute('aria-pressed',String(watched));
     button.setAttribute('aria-label',`${label} ${watched?'관심종목에서 해제':'관심종목에 등록'}`);
   }
   const text=document.querySelector('#detail-watch span');
   if(text)text.textContent=watched?'관심 등록됨':'관심 등록';
   const compare=document.querySelector('#detail-compare');
   if(compare)compare.disabled=!state.selected.includes(symbol)&&!verified;
   const note=document.querySelector('#detail-identity-note');
   if(note)note.textContent=verified?'':'종목을 확인해야 관심 등록·비교 추가를 할 수 있어요. 종목명이나 티커를 다시 확인해주세요.';
 };
 const applyDetailName=name=>{
   const resolved=usableStockName(name,symbol);
   if(!resolved||epoch!==viewEpoch||state.tab!=='detail'||state.detailSymbol!==symbol)return;
   knownName=resolved;
   state.detailName=resolved;
   resolvedNames.set(symbol,resolved);
   const title=document.querySelector('#detail-top-title');if(title)title.textContent=resolved;document.title=`${resolved} | 차트뷰`;
   const hero=document.querySelector('#detail-name');if(hero){hero.textContent=resolved;hero.classList.remove('identity-loading');}
   const logo=document.querySelector('#detail-logo');if(logo)logo.textContent=resolved.slice(0,1);
   const entry=state.watchlist.find(row=>row.symbol===symbol);
   if(entry&&!usableStockName(entry.name,symbol)){entry.name=resolved;persist();}
   paintWatchState();
 };
 const markNameUnavailable=()=>{if(epoch!==viewEpoch||knownName)return;const hero=document.querySelector('#detail-name');if(hero){hero.textContent='종목명 확인 불가';hero.classList.remove('identity-loading');}const title=document.querySelector('#detail-top-title');if(title)title.textContent=symbol;paintWatchState();};
 // 운영자 수정 2026-10-03: 무효 티커(ZZZZZZ 등) 진입 시 '종목명 확인 불가' 껍데기+관심등록 대신 안내 화면으로 전환
 const showInvalidSymbol=invalid=>{
   if(epoch!==viewEpoch||state.tab!=='detail'||state.detailSymbol!==invalid)return;
   viewEpoch++;
   cleanupChart();
   document.querySelector('#app').innerHTML=shell(invalidSymbolHtml(invalid),'종목 상세');
   bindNav();
   document.querySelector('[data-invalid-search]')?.addEventListener('click',()=>openStockSelector({
     title:'종목 검색',
     description:'종목명이나 티커를 검색해 상세 정보를 확인하세요.',
     initial:[],
     favorites:state.watchlist,
     nameFor:(nextSymbol)=>displayName(nextSymbol),
     onPick:(nextSymbol,nextName)=>navigate('detail',nextSymbol,nextName),
     restoreBack:restoreNativeBack,
   }));
 };
 const resolvedName=knownName?Promise.resolve(knownName):searchStocks(symbol).then(data=>{
   const exact=(data?.results||[]).find(row=>String(row.symbol).toUpperCase()===symbol.toUpperCase());
   if(exact?.name)applyDetailName(exact.name);
   if(!knownName){
     // 검색은 성공했으나 검증된 종목 정보가 없는 티커(DIRECT 에코 등) → 무효 티커 안내
     if(data.unverifiedDirect?.includes(symbol)&&!saved&&!(Number(getLiveQuote(symbol)?.price)>0))showInvalidSymbol(symbol);
     else markNameUnavailable();
   }
   return knownName||symbol;
 }).catch(()=>{markNameUnavailable();return knownName||symbol;});
 if(knownName)applyDetailName(knownName);
 paintWatchState();
 const toggleDetailWatch=()=>{
   if(!state.watchlist.some(row=>row.symbol===symbol)&&!knownName&&!(Number(getLiveQuote(symbol)?.price)>0))return;
   const idx=state.watchlist.findIndex(x=>x.symbol===symbol);
   if(idx>=0){
     const removed=state.watchlist[idx];state.watchlist.splice(idx,1);
     if(!persist()){state.watchlist.splice(idx,0,removed);return;}
     paintWatchState();
     showToast(`${knownName||symbol} 관심종목에서 삭제했어요.`,'실행 취소',()=>{
       if(state.watchlist.some(row=>row.symbol===symbol))return;
       state.watchlist.splice(idx,0,removed);
       if(!persist()){state.watchlist.splice(idx,1);return;}
       paintWatchState();
     });
   }else{
     state.watchlist.unshift({symbol,name:knownName||symbol});
     if(!persist()){state.watchlist.shift();return;}
     haptic('tickWeak');paintWatchState();showToast(`${knownName||symbol} 관심종목에 저장했어요.`);
   }
 };
 document.querySelector('#detail-change')?.addEventListener('click',()=>openStockSelector({
   title:'다른 종목 보기',
   description:'종목명이나 티커를 검색하면 바로 상세 화면으로 이동해요.',
   initial:[],
   favorites:state.watchlist,
   nameFor:(nextSymbol)=>comparisonStockName(nextSymbol)||displayName(nextSymbol),
   restoreBack:restoreNativeBack,
   onPick:(nextSymbol,nextName)=>navigate('detail',nextSymbol,nextName),
 }));
 document.querySelector('#detail-watch')?.addEventListener('click',toggleDetailWatch);
 document.querySelector('#detail-compare')?.addEventListener('click',()=>{
   if(!state.selected.includes(symbol)&&!knownName&&!(Number(getLiveQuote(symbol)?.price)>0))return;
   if(state.selected.includes(symbol)){showToast('이미 비교 종목에 포함돼 있어요.');navigate('chart');return}
   if(state.selected.length>=6){showToast('비교는 최대 6개까지 가능해요. 차트에서 종목을 변경해주세요.','차트 열기',()=>navigate('chart'));return}
   state.selected=[...state.selected,symbol];persist();showToast(`${knownName||symbol}을 비교에 추가했어요.`);navigate('chart');
 });
 document.querySelectorAll('[data-detail-period]').forEach(b=>b.onclick=()=>{haptic('tickWeak');refreshDetailChart({symbol,epoch,period:b.dataset.detailPeriod})});

 const settle=(task,paint)=>task.then(value=>({status:'fulfilled',value}),reason=>({status:'rejected',reason})).then(result=>{if(epoch===viewEpoch){paint(result);bindNav();}});
 const jobs=[];
 const paintDetailQuote=(quote,{failed=false,priority=50}={})=>{
   if(epoch!==viewEpoch||state.tab!=='detail'||state.detailSymbol!==symbol)return;
   if(quote)rememberLiveQuotes([quote],{priority});
   paintWatchState();
   const current=getLiveQuote(symbol)||quote;
   const dayChange=finiteNumber(current?.change);
   const priceBox=document.querySelector('#detail-price');
   if(!priceBox)return;
   const provenanceOpen=priceBox.querySelector('.quote-provenance')?.open;
   const provenanceFocused=priceBox.querySelector('.quote-provenance summary')===document.activeElement;
   priceBox.classList.remove('skeleton','detail-price-skeleton');
   priceBox.classList.add('quote-compact');
   priceBox.innerHTML=quoteHtml(current,closingQuote?{...closingQuote,priceLabel:formatCurrencyPrice(closingQuote.price,'KRW')}:null,{basis:quoteBasisLabel(current),price:current?.price!=null?(isIndex?Number(current.price).toLocaleString('ko-KR',{maximumFractionDigits:2})+' pt':formatCurrencyPrice(current.price,current.currency)):'확인 불가',change:dayChange===null?'확인 불가':fmtChange(dayChange),asOf:current?.asOf?formatKst(current.asOf):'',queriedAt:formatKst(new Date().toISOString())})+(failed?'<button class="retry" data-retry-detail>시세 다시 시도</button>':'');
   priceBox.querySelector('.quote-provenance').open=Boolean(provenanceOpen);
   if(provenanceFocused)priceBox.querySelector('.quote-provenance summary').focus({preventScroll:true});
 };
 if(!isIndex&&/\.(KS|KQ)$/i.test(symbol))void screenerData().then(data=>{if(epoch!==viewEpoch)return;const row=(data.stocks||[]).find(row=>row.symbol===symbol);if(row?.price!=null){closingQuote={price:row.price,date:row.date||data.tradeDate||data.updated||'기준일 미제공'};const quote=getLiveQuote(symbol);if(quote)paintDetailQuote(quote);else paintDetailQuote({ticker:symbol,name:row.name||knownName||symbol,price:row.price,change:row.change1d,currency:'KRW',priceBasis:'regular_close',source:'장마감 스크리너'},{priority:20});}}).catch(()=>{});
 if(saved)seedWatchQuoteCache(state.watchlist.map(x=>x.symbol));
 const cachedQuote=resolveLiveQuote(symbol,homeCachedQuote(symbol));
 if(cachedQuote){
   rememberLiveQuotes([cachedQuote],{priority:40});
   paintDetailQuote(cachedQuote,{priority:40});
 }else if(isIndex){
   void marketNow().then(payload=>{
     if(epoch!==viewEpoch||state.tab!=='detail'||state.detailSymbol!==symbol)return;
     const row=(payload?.results||[]).find(item=>String(item?.ticker||'').toUpperCase()===String(symbol).toUpperCase());
     if(row?.price!=null){writeHomeFast('market',payload);paintDetailQuote(row,{priority:30});}
   }).catch(()=>{});
 }else if(!koreanDetail){
   void homeSnapshot().then(snapshot=>{
     if(epoch!==viewEpoch||state.tab!=='detail'||state.detailSymbol!==symbol)return;
     const row=(snapshot?.heatmap?.results||[]).find(item=>String(item?.ticker||'').toUpperCase()===String(symbol).toUpperCase());
     if(row?.price!=null){writeHomeFast('snapshot',snapshot);paintDetailQuote(row,{priority:30});}
   }).catch(()=>{});
 }
 const pullDetailLive=async()=>{
   if(epoch!==viewEpoch||state.tab!=='detail'||state.detailSymbol!==symbol)return;
   try{
     const payload=await quoteSnapshotsLive([symbol]);
     const quote=payload?.results?.[0];
     if(quote){
       if(!knownName&&quote.name)applyDetailName(quote.name);
       rememberLiveQuotes([quote],{priority:50});
       const canonical=getLiveQuote(symbol)||quote;
       persistLiveQuoteToHomeSnapshot(canonical);
       paintDetailQuote(canonical);
     }
     else if(!getLiveQuote(symbol))paintDetailQuote(null,{failed:true});
   }catch{
     if(!getLiveQuote(symbol))paintDetailQuote(null,{failed:true});
   }finally{
     const canonical=getLiveQuote(symbol);
     const koreanClosed=koreanDetail&&String(canonical?.marketStatus||'').toUpperCase()==='CLOSE';
     if(epoch===viewEpoch&&state.tab==='detail'&&state.detailSymbol===symbol&&!koreanClosed){
       detailLiveTimer=setTimeout(pullDetailLive,5_000);
     }
   }
 };
 jobs.push(pullDetailLive());
 const detailChartTask=refreshDetailChart({symbol,epoch,period:state.detailPeriod}).then(stock=>{
   if(!stock?.price||getLiveQuote(symbol)||epoch!==viewEpoch||state.tab!=='detail'||state.detailSymbol!==symbol)return stock;
   if(!knownName&&stock.name)applyDetailName(stock.name);
   paintDetailQuote({ticker:symbol,name:stock.name||knownName||symbol,price:stock.price,change:null,currency:stock.currency,asOf:stock.quoteAsOf,source:stock.quoteSource||stock.source||'Yahoo Chart'},{priority:30});
   return stock;
 });
 jobs.push(detailChartTask);
 if(isIndex){
   document.querySelector('.detail-jump-nav')?.remove();
   for(const id of ['detail-industry-block','detail-research-card','detail-metrics-section','detail-news-section'])document.getElementById(id)?.remove();
   document.querySelector('#detail-chart-section .detail-section-head span').textContent='실제 지수 · 기간 등락률';
   await Promise.all(jobs);return;
 }
 const industryBasePromise=koreanDetail?Promise.all([
   screenerData().catch(()=>null),
   import('./industryContext.js'),
   import('./industryContextView.js'),
 ]).then(async([screener,industryModule,viewModule])=>{
   const screenerRows=Array.isArray(screener?.stocks)?screener.stocks:[];
   const screenerCurrent=screenerRows.find(row=>String(row?.symbol||'').toUpperCase()===String(symbol).toUpperCase());
   let current=screenerCurrent;
   let rows=screenerRows;
   if(!current||!current.industry||!current.mainProducts){
     const companyMeta=await companyContextData().catch(()=>null);
     const metaRows=Array.isArray(companyMeta?.companies)?companyMeta.companies:[];
     const metaBySymbol=new Map(metaRows.map(row=>[String(row?.symbol||'').toUpperCase(),row]));
     rows=screenerRows.length?screenerRows.map(row=>{
       const meta=metaBySymbol.get(String(row?.symbol||'').toUpperCase());
       return meta?{...row,industry:meta.industry||row.industry||'',mainProducts:meta.mainProducts||row.mainProducts||''}:row;
     }):metaRows;
     current=rows.find(row=>String(row?.symbol||'').toUpperCase()===String(symbol).toUpperCase())||metaBySymbol.get(String(symbol).toUpperCase());
   }
   if(!current)return null;
   if(!knownName&&current.name)applyDetailName(current.name);
   return {
     context:industryModule.companyContext(current,rows),
     viewModule,
   };
 }):Promise.resolve(null);
 if(koreanDetail){
   const reviewHost=document.createElement('div');reviewHost.id='detail-report-review';reviewHost.className='report-review-host';
   document.querySelector('#detail-financial-history').after(reviewHost);
   const reviewReady=import('./reportReviewView.js').then(view=>{
     if(epoch===viewEpoch){view.mountReportReview(reviewHost,{symbol,data:{available:false,pending:true},onNotice:showToast,onJump:jumpToDetail});restoreInvestigationJump();}
     return view;
   }).catch(()=>{
     if(epoch===viewEpoch){reviewHost.innerHTML='<div class="financial-empty">저장한 투자 근거 화면을 불러오지 못했어요. 저장한 내용은 이 기기에 보관되어 있어요. <button type="button" class="retry" data-reload-review>화면 새로고침</button></div>';reviewHost.querySelector('button').onclick=()=>location.reload();}
     return null;
   });
   const loadFinancial=()=>{
     const host=document.querySelector('#detail-financial-history');
     if(host)host.innerHTML=loadingIndicator('최근 재무제표를 확인하고 있어요');
     return settle(Promise.all([financialHistoryData(symbol).catch(()=>({loadError:true})),import('./financialHistoryView.js'),reviewReady]),result=>{
       const target=document.querySelector('#detail-financial-history');
       if(!target)return;
       if(result.status!=='fulfilled'){target.innerHTML='<div class="financial-empty">DART 재무제표를 불러오지 못했어요. <button type="button" class="retry" data-retry-financial>다시 시도</button></div>';}
       else{const [data,view,review]=result.value;target.innerHTML=view.financialHistoryHtml(data);review?.mountReportReview(reviewHost,{symbol,data,onNotice:showToast,onJump:jumpToDetail});}
       target.querySelector('[data-retry-financial]')?.addEventListener('click',loadFinancial);
     });
   };
   jobs.push(loadFinancial());
   const quarters=document.createElement('div');quarters.id='detail-financial-quarters';quarters.className='financial-quarters';
   document.querySelector('#detail-financial-history').before(quarters);
   quarters.innerHTML=loadingIndicator('분기 실적 화면을 준비하고 있어요');
   import('./quarterView.js').then(({mountQuarters})=>{if(epoch===viewEpoch)mountQuarters(quarters,symbol);}).catch(()=>{if(epoch===viewEpoch)quarters.textContent='분기 실적 화면을 불러오지 못했어요. 화면을 다시 열어주세요.';});
 }
 const enrichment={report:null,reportState:koreanDetail?'loading':'idle',directRelations:[],relationsState:koreanDetail?'loading':'idle'};
 jobs.push(settle(industryBasePromise,industryRes=>{
   const host=document.querySelector('#detail-industry-context');
   const block=document.querySelector('#detail-industry-block');
   if(!host||!block)return;
   if(industryRes.status!=='fulfilled'||!industryRes.value){
     block.remove();
     document.querySelector('[data-detail-jump="detail-industry-block"]')?.remove();
     return;
   }
   const html=industryRes.value.viewModule.industryContextHtml(industryRes.value.context,{collapsible:false,...enrichment});
   if(!html){block.remove();document.querySelector('[data-detail-jump="detail-industry-block"]')?.remove();return;}
   host.innerHTML=html;
 }));
 if(koreanDetail){
   const renderEnrichment=base=>{
     const host=document.querySelector('#detail-industry-context');
     if(!host||!base)return;
     host.innerHTML=base.viewModule.industryContextHtml(base.context,{
       collapsible:false,
       businessReport:enrichment.report?.available?enrichment.report:null,
       directRelations:enrichment.directRelations,
       reportState:enrichment.reportState,
       relationsState:enrichment.relationsState,
     });
     const badge=document.querySelector('#detail-industry-block .detail-context-badge');
     if(badge)badge.textContent=enrichment.report?.available&&enrichment.directRelations.length?'KRX + DART + 근거':enrichment.report?.available?'KRX + DART':'KRX + 근거';
     bindNav();
     host.querySelectorAll('[data-industry-retry]').forEach(button=>button.onclick=()=>void loadEnrichment(button.dataset.industryRetry,true));
   };
   const enrichmentRuns={report:0,relations:0};
   async function loadEnrichment(kind,force=false){
     const run=++enrichmentRuns[kind];
     const [base,name]=await Promise.all([industryBasePromise.catch(()=>null),resolvedName]);
     if(!base||epoch!==viewEpoch)return;
     enrichment[kind+'State']='loading';renderEnrichment(base);
     const data=await (kind==='report'?businessReportData(symbol,name,{force}):relationshipEvidenceData(symbol,name,{force})).catch(()=>({loadError:true}));
     if(epoch!==viewEpoch||enrichmentRuns[kind]!==run)return;
     if(kind==='report'){
       if(data?.available)enrichment.report=data;
       enrichment.reportState=data?.loadError?'error':data?.available?'ready':'unavailable';
     }else{
       if(data?.available)enrichment.directRelations=data.relations||[];
       enrichment.relationsState=data?.loadError?'error':['provider_timeout','news_provider_unavailable'].includes(data?.reason)?'unavailable':'ready';
     }
     renderEnrichment(base);
   }
   jobs.push(loadEnrichment('report'),loadEnrichment('relations'));
 }
 jobs.push(settle(valuationStocks([symbol]),valRes=>{
 const valuation=valRes.status==='fulfilled'?valRes.value?.stocks?.[0]:null;
 document.querySelector('#detail-cap').innerHTML=marketCapHtml(valuation);
 const metricDefs=[['예상 PER','forwardPE','배'],['실적 PER','trailingPE','배'],['PBR','pbr','배'],['ROE','roe','%'],['영업이익률','operatingMargin','%'],['배당수익률','dividendYield','%']];
   document.querySelector('#detail-metrics').innerHTML=metricDefs.map(([label,key,suffix],i)=>{const v=valuation?.[key];return `<div class="detail-metric tone-bg-${i%3}"><span>${label}</span><strong>${v==null?'-':esc(Number(v).toLocaleString('ko-KR',{maximumFractionDigits:2})+suffix)}</strong><small>${esc(metricBasis(valuation?.fieldMeta?.[key]))}</small></div>`}).join('');
 document.querySelector('#detail-metric-meta').innerHTML=valuation?`재무 데이터 조회 ${esc(formatKst(valuation.generatedAt))}<p>예상 PER은 제공처의 예상 이익, 실적 PER은 최근 12개월 이익을 사용해요. ROE는 제공처의 기간·회계 기준이며 DART 누적 실적·현금 비율과 직접 같은 값으로 비교하지 않아요. 배당수익률은 제공처 표시·보고 기준으로 미래 배당을 보장하지 않아요.</p>`:'재무 데이터를 불러오지 못했어요. <button class="retry" data-retry-detail>다시 시도</button>';

 }));
 const loadDetailNews=()=>{
   const host=document.querySelector('#detail-news');
   if(!host||epoch!==viewEpoch)return Promise.resolve();
   host.innerHTML=loadingIndicator('관련 뉴스를 불러오고 있어요');
   return settle(resolvedName.catch(()=>knownName||symbol).then(name=>personalizedNews([symbol],[name])),newsRes=>{
     if(newsRes.status!=='fulfilled'){
       host.innerHTML='<div class="empty compact"><strong>관련 뉴스를 불러오지 못했어요</strong><span>연결을 확인한 뒤 다시 시도해주세요.</span><button class="retry" type="button" id="retry-detail-news">다시 시도</button></div>';
       host.querySelector('button').onclick=()=>loadDetailNews();
       return;
     }
     const news=(newsRes.value?.items||[]).slice(0,4);
     host.innerHTML=news.length?news.map(row=>newsCard(row)).join(''):'<div class="empty compact"><strong>표시할 관련 뉴스가 없어요</strong><span>직접 또는 업종 관련 근거가 확인된 기사를 표시해요.</span></div>';
   });
 };
 jobs.push(loadDetailNews());
 await Promise.all(jobs);
}

function newsCard(row){
 const relation=newsRelation(row);
 const tags=(row.investmentTags||[]).slice(0,2).map(translatedTag);
 const language=titleLanguage(row.title);
 return `<button class="news-card" data-external-url="${esc(row.url||'')}"><div class="news-meta"><span class="relation-badge ${relation.className}">${relation.label}</span><span>${esc(displayName(row.symbol,row.name))}</span><small>${esc(row.source||'뉴스')} · ${esc(timeAgo(row.publishedAt))}</small></div><strong>${esc(row.title||'')}</strong><div class="news-context"><span>${esc(language)}</span>${row.relationBasis?`<span>${esc(relationBasisLabel(row.relationBasis))}</span>`:''}</div>${tags.length?`<div class="news-tags">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}<span class="news-arrow">${iconSvg('arrow',18)}</span></button>`;
}

async function renderNews(){
 cleanupChart();
 const epoch=viewEpoch;
 const tickers=state.newsSymbol?[state.newsSymbol]:state.watchlist.slice(0,20).map(x=>x.symbol);
 const names=state.newsSymbol?[displayName(state.newsSymbol,resolvedNames.get(state.newsSymbol))]:state.watchlist.slice(0,20).map(x=>displayName(x.symbol,x.name));
 document.querySelector('#app').innerHTML=shell(`
   <section class="task-head"><div><h2>${state.newsSymbol?esc(names[0])+' 뉴스':'관심종목 뉴스'}</h2><p>기사의 관련 근거와 정렬 기준을 함께 표시해요.</p></div>${state.newsSymbol?'<button class="text-button" data-tab="news">관심종목 뉴스</button>':''}</section>
   <div class="news-toolbar"><div class="news-filter-strip">${(state.newsSymbol?[{symbol:state.newsSymbol,name:names[0]}]:state.watchlist.slice(0,8)).map((x,i)=>`<span class="tone-bg-${i%3}">${esc(displayName(x.symbol,x.name))}</span>`).join('')}</div><div class="sort-toggle">${[['major','주요순'],['latest','최신순']].map(([k,l])=>`<button data-news-sort="${k}" class="${state.newsSort===k?'active':''}" aria-pressed="${state.newsSort===k}">${l}</button>`).join('')}</div></div>
   <p class="sort-explain" id="news-sort-explain">${state.newsSort==='major'?'주요순은 제공된 관련성·최신성 점수를 함께 사용해요.':'최신순은 기사 게시시각 기준이에요.'}</p>
   <div id="news-list" class="news-list">${loadingIndicator('관심종목 뉴스를 불러오고 있어요')}<div class="skeleton news-large"></div><div class="skeleton news-large"></div></div>
 `,state.newsSymbol?names[0]+' 뉴스':'관심종목 뉴스');
 bindNav();
 document.querySelectorAll('[data-news-sort]').forEach(b=>b.onclick=()=>{state.newsSort=b.dataset.newsSort;renderNews()});
 if(!tickers.length){document.querySelector('#news-list').innerHTML='<div class="empty"><strong>관심종목을 먼저 추가해주세요</strong><span>관심종목 관리에서 종목을 저장하면 여기에 관련 뉴스가 표시돼요.</span><button class="retry" data-tab="watch">관심종목 추가</button></div>';bindNav();return}
 try{
   const d=await personalizedNews(tickers,names);
   if(epoch!==viewEpoch)return;
   let rows=[...(d?.items||[])];
   if(state.newsSort==='latest')rows.sort((a,b)=>Number(b.publishedTs||0)-Number(a.publishedTs||0));
   else rows.sort((a,b)=>Number(b.score||0)-Number(a.score||0));
   rows=rows.slice(0,12);
   document.querySelector('#news-list').innerHTML=rows.length?rows.map(newsCard).join(''):`<div class="empty"><strong>현재 표시할 관련 뉴스가 없어요</strong><span>직접 관련 또는 업종 관련 근거가 확인된 기사만 표시해요.</span></div>`;
   bindNav();
 }catch(e){if(epoch!==viewEpoch)return;document.querySelector('#news-list').innerHTML=`<div class="empty"><strong>뉴스를 불러오지 못했어요</strong><span>${esc(e.message)}</span><button class="retry" id="retry-news">다시 시도</button></div>`;document.querySelector('#retry-news')?.addEventListener('click',renderNews)}
}

function renderInfo(){
 cleanupChart();
 const epoch=viewEpoch;
 document.querySelector('#app').innerHTML=shell(`
   <section class="page-intro rich-intro subpage-hero info-hero"><span class="page-kicker">DATA & SERVICE</span><h2>숫자를 보기 전에<br><em>기준부터</em> 확인하세요</h2><p>Chart View가 데이터를 보여주는 방식과 이용 시 알아둘 내용을 정리했어요.</p></section>
   <section class="independence-note"><strong>독립 서비스 안내</strong><p>Chart View는 토스·토스증권의 공식 서비스가 아닌 개인 프로젝트입니다. 화면 구성과 데이터 해석은 Chart View가 독립적으로 제공합니다.</p></section>
   <section class="info-stack">
     <article class="info-card"><span class="info-icon blue">${iconSvg('chart',21)}</span><div><strong>시세·차트 데이터</strong><p>시장 데이터는 외부 데이터 제공처와 Chart View 백엔드를 통해 표시돼요. 거래소 실시간 체결값과 차이가 있거나 갱신이 지연될 수 있어요.</p></div></article>
     <article class="info-card"><span class="info-icon purple">${iconSvg('value',21)}</span><div><strong>재무·밸류에이션</strong><p>종목 상세의 매출액·영업이익 흐름은 DART 공시 재무제표를 사용해요. PER, PBR, ROE 등 비교 지표는 제공처의 최신 가용 데이터를 사용하므로 기준 시점과 회계 기준이 다를 수 있어요.</p></div></article>
     <article class="info-card"><span class="info-icon green">${iconSvg('macro',21)}</span><div><strong>경제 지표</strong><p>각 지표의 발표 주기가 달라 동일 시점 데이터가 아닐 수 있어요. 화면에 표시된 기준일을 함께 확인해주세요.</p></div></article>
     <article class="info-card"><span class="info-icon coral">${iconSvg('news',21)}</span><div><strong>뉴스</strong><p>뉴스는 외부 매체의 기사 제목·링크를 모아 보여주며 기사 내용과 정확성에 대한 책임은 해당 제공처에 있어요.</p></div></article>
     <article class="info-card"><span class="info-icon green">${uiIcon('exports',21)}</span><div><strong>수출·반도체 가격</strong><p>수출은 관세청 무역통계, 반도체 가격은 별도 분석 화면의 TrendForce · DRAMeXchange 공개 시장가격이에요. 기준 기간이 다르며 가격 그래프는 차트뷰 수집 시작일부터 누적한 자료예요.</p></div></article>
   </section>
   <section class="release-notice"><strong>투자 판단 안내</strong><p>Chart View의 모든 정보는 일반적인 정보 제공을 위한 참고 자료이며 투자 권유가 아닙니다. 특정 종목의 매수·매도 또는 투자 성과를 보장하거나 권유하지 않으며, 최종 투자 판단과 책임은 이용자에게 있습니다.</p></section>
   <div class="policy-links"><button data-external-url="${esc(PUBLIC_SITE_BASE+'/privacy.html')}"><span>개인정보 처리 안내</span>${iconSvg('arrow',18)}</button><button data-external-url="${esc(PUBLIC_SITE_BASE+'/terms.html')}"><span>서비스 이용 안내</span>${iconSvg('arrow',18)}</button><button data-external-url="${esc(PUBLIC_SITE_BASE+'/data-guide.html')}"><span>데이터 기준 전체 보기</span>${iconSvg('arrow',18)}</button></div>
   <div class="analysis-card"><strong>고객문의 · 박상훈</strong><p>kimtang89@naver.com</p></div>
   <section class="local-data-card"><div><strong>기기 저장 데이터</strong><p>관심종목, 비교 종목과 조사 카드는 현재 이 기기에 저장돼요. 토스 익명 식별키로 사용자별 목록을 구분하며, 초기화하면 현재 사용자의 목록, 조사 카드와 이용 기록을 삭제합니다.</p></div><button id="clear-local-data" type="button">기기 데이터 초기화</button></section>
 `,'데이터 안내');
 bindNav();
 const clearButton=document.querySelector('#clear-local-data');
 clearButton?.addEventListener('click',async()=>{
   if(clearButton.dataset.confirmed!=='true'){
     clearButton.dataset.confirmed='true';
     clearButton.textContent='한 번 더 누르면 초기화';
     clearButton.classList.add('danger');
     setTimeout(()=>{if(clearButton?.isConnected){clearButton.dataset.confirmed='false';clearButton.textContent='기기 데이터 초기화';clearButton.classList.remove('danger')}},4500);
     return;
   }
   try{
     await clearStored();
     clearDiagnostics();
     state.watchlist=[];researchDrafts.clear();state.screener={filters:{},count:30,activePreset:''};state.researchPeer=null;
     state.selected=DEFAULTS.map(x=>x.symbol);
     clearButton.dataset.confirmed='false';
     clearButton.textContent='초기화 완료';
     clearButton.classList.remove('danger');
     haptic('tickWeak');
     showToast('이 기기의 관심종목·비교종목·조사 카드를 초기화했어요.');
   }catch{
     showToast('기기 저장 데이터를 초기화하지 못했어요.');
   }
 });
}

function renderNotFound(){
 cleanupChart();
 document.querySelector('#app').innerHTML=shell(`
   <section class="not-found-card">
     <span class="page-kicker">PAGE NOT FOUND</span>
     <h2>이 주소의 화면을 찾을 수 없어요.</h2>
     <p>링크가 잘못되었거나 더 이상 사용하지 않는 화면일 수 있어요.</p>
     <div><button type="button" class="retry" data-tab="home">홈으로</button><button type="button" class="neutral-action" data-tab="more">전체 메뉴</button></div>
   </section>
 `,'페이지 없음');
 bindNav();
}

function renderMore(){
 cleanupChart();
 const epoch=viewEpoch;
 document.querySelector('#app').innerHTML=shell(`
   <section class="page-intro more-intro"><h2>분석과 도구</h2><p>종목 찾기부터 기록·비교·시장 근거까지</p></section>
   <nav class="analysis-category-nav" aria-label="분석 목적 바로가기"><a href="#analysis-find" data-menu-jump="analysis-find">${uiIcon('filter',15)}종목 찾기</a>${SHOW_SPOTLIGHT?'<a href="#analysis-records" data-menu-jump="analysis-records">'+uiIcon('ledger',15)+'선정 기록</a>':''}<a href="#analysis-compare" data-menu-jump="analysis-compare">${uiIcon('compare',15)}종목 비교</a><a href="#analysis-evidence" data-menu-jump="analysis-evidence">${uiIcon('evidence',15)}시장 근거</a></nav>
   <details class="calculation-guide tab-usage-guide"><summary>각 탭에서는 무엇을 볼 수 있나요?</summary><dl><div><dt>홈</dt><dd>주요 시장과 내 관심종목, 분석 요약</dd></div><div><dt>수익률</dt><dd>최대 6개 종목의 기간 수익률 비교</dd></div><div><dt>관심</dt><dd>기기에 저장한 내 종목 관리</dd></div><div><dt>분석</dt><dd>조건 검색, 선정 기록, 재무·수출·경제 데이터</dd></div></dl></details>
   <section class="menu-group" id="analysis-find"><h3><i class="section-symbol" aria-hidden="true">${uiIcon('filter',18)}</i>종목 찾기</h3><div class="feature-menu">
     <button class="feature-row" data-tab="discover" data-tool-tone="${surfaceIdentity('discover').tone}"><span class="feature-icon yellow">${iconSvg('discover',22)}</span><span><strong>${featureLabel('discover')}</strong><small>조건으로 종목 찾기</small></span><b>${iconSvg('arrow',19)}</b></button>
     <button class="feature-row" data-tab="gurus" data-tool-tone="${surfaceIdentity('gurus').tone}"><span class="feature-icon blue">${uiIcon('guide',22)}</span><span><strong>거장 투자법</strong><small>5가지 원칙으로 수익성·성장·추세 확인</small></span><b>${iconSvg('arrow',19)}</b></button>
     <button class="feature-row" data-tab="ideas" data-tool-tone="${surfaceIdentity('ideas').tone}"><span class="feature-icon yellow">${iconSvg('ideas',22)}</span><span><strong>투자 아이디어 LAB</strong><small>관찰 패턴과 다음 확인 질문 보기</small></span><b>${iconSvg('arrow',19)}</b></button>
     <button class="feature-row" data-tab="heatmap" data-tool-tone="${surfaceIdentity('heatmap').tone}"><span class="feature-icon coral">${iconSvg('heatmap',22)}</span><span><strong>시장 히트맵</strong><small>업종별 종목 등락 지도</small></span><b>${iconSvg('arrow',19)}</b></button>
   </div></section>
   ${SHOW_SPOTLIGHT?'<section class="menu-group" id="analysis-records"><h3><i class="section-symbol" aria-hidden="true">'+uiIcon('ledger',18)+'</i>선정 기록 점검</h3><p class="menu-group-copy">과거에 선정한 이유와 이후 결과를 확인해요. 실시간 인기 순위가 아니에요.</p><div class="feature-menu">':''}
     ${SHOW_SPOTLIGHT?`<button class="feature-row" data-tab="picks" data-tool-tone="${surfaceIdentity('picks').tone}"><span class="feature-icon coral">${iconSvg('picks',22)}</span><span><strong>선정 기록·성과</strong><small>선정 이유·이후 성과·현재 점검 상태</small></span><b>${iconSvg('arrow',19)}</b></button>`:''}
   ${SHOW_SPOTLIGHT?'</div></section>':''}
   <section class="menu-group" id="analysis-compare"><h3><i class="section-symbol" aria-hidden="true">${uiIcon('compare',18)}</i>종목 비교하기</h3><div class="feature-menu">
     <button class="feature-row" data-tab="chart" data-tool-tone="${surfaceIdentity('chart').tone}"><span class="feature-icon blue">${iconSvg('chart',22)}</span><span><strong>수익률 비교</strong><small>최대 6개 종목의 기간 흐름 비교</small></span><b>${iconSvg('arrow',19)}</b></button>
     <button class="feature-row" data-tab="valuation" data-tool-tone="${surfaceIdentity('valuation').tone}"><span class="feature-icon purple">${iconSvg('value',22)}</span><span><strong>밸류에이션</strong><small>같은 재무지표를 종목별로 비교</small></span><b>${iconSvg('arrow',19)}</b></button>
     <button class="feature-row" data-tab="consensus" data-tool-tone="${surfaceIdentity('consensus').tone}"><span class="feature-icon green">${iconSvg('consensus',22)}</span><span><strong>실적 전망 조회</strong><small>EPS·매출 추정치와 변경 내역 비교</small></span><b>${iconSvg('arrow',19)}</b></button>
     <button class="feature-row" data-tab="bands" data-tool-tone="${surfaceIdentity('bands').tone}"><span class="feature-icon purple">${iconSvg('bands',22)}</span><span><strong>역사적 밸류에이션</strong><small>과거 PER·PBR 분포와 추이 확인</small></span><b>${iconSvg('arrow',19)}</b></button>
   </div></section>
   <section class="menu-group" id="analysis-evidence"><h3><i class="section-symbol" aria-hidden="true">${uiIcon('evidence',18)}</i>근거와 시장 환경 확인</h3><div class="feature-menu">
     <button class="feature-row" data-tab="news" data-tool-tone="${surfaceIdentity('news').tone}"><span class="feature-icon coral">${iconSvg('news',22)}</span><span><strong>관심종목 뉴스</strong><small>직접 관련 기사와 업종 기사 구분</small></span><b>${iconSvg('arrow',19)}</b></button>
     <button class="feature-row" data-tab="macro" data-tool-tone="${surfaceIdentity('macro').tone}"><span class="feature-icon green">${iconSvg('macro',22)}</span><span><strong>경제 지표</strong><small>관측일·단위·변화 기준 확인</small></span><b>${iconSvg('arrow',19)}</b></button>
     <button class="feature-row" data-tab="exports" data-tool-tone="${surfaceIdentity('exports').tone}"><span class="feature-icon blue">${iconSvg('exports',22)}</span><span><strong>${featureLabel('exports')}</strong><small>수출 실적·품목·지역 흐름을 그래프로 확인</small></span><b>${iconSvg('arrow',19)}</b></button>
     <button class="feature-row" data-tab="memory" data-tool-tone="${surfaceIdentity('memory').tone}"><span class="feature-icon green">${uiIcon('evidence',22)}</span><span><strong>반도체 가격 추적</strong><small>TrendForce · DRAM·NAND 시장가격 추이</small></span><b>${iconSvg('arrow',19)}</b></button>
   </div></section>
   <section class="menu-group"><h3>이용 및 지원</h3><div class="feature-menu">
     <button class="feature-row" data-tab="watch" data-tool-tone="${surfaceIdentity('watch').tone}"><span class="feature-icon slate">${iconSvg('star',22)}</span><span><strong>관심종목 관리</strong><small>현재 기기에 저장된 종목 관리</small></span><b>${iconSvg('arrow',19)}</b></button>
     <button class="feature-row" data-tab="info" data-tool-tone="${surfaceIdentity('info').tone}"><span class="feature-icon blue">${iconSvg('spark',22)}</span><span><strong>데이터 및 이용 안내</strong><small>기준·지연·개인정보·지원 안내</small></span><b>${iconSvg('arrow',19)}</b></button>
     <div class="feature-row"><span><strong>고객문의</strong><small>박상훈 · kimtang89@naver.com</small></span></div>
   </div></section>
   <div class="version-card"><span class="brand-mark">${iconSvg('spark',16)}</span><div><strong>Chart View</strong><small>개인 프로젝트 · 토스/토스증권 공식 서비스 아님 · 버전 ${esc(packageInfo.version)}</small></div></div>
 `,'분석');
 bindNav();
 document.querySelectorAll('[data-menu-jump]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();const target=document.getElementById(link.dataset.menuJump);if(target){target.scrollIntoView({block:'start'});target.querySelector('button')?.focus({preventScroll:true});}}));
}

function render(){
 setLiveSurface(state.tab);
 const started=performance.now();
 const route=state.tab;
 requestAnimationFrame(()=>{if(state.tab===route)recordMetric(`view.${route}`,started);});
 syncNativeBackHandler({
   isRoot: state.tab==='home',
   onBack: () => {
     goBack();
   },
 });
 if(state.tab==='chart')return renderChart();
 if(state.tab==='watch')return renderWatch();
 if(state.tab==='valuation')return renderValuation();
 if(state.tab==='macro')return renderMacro();
 if(state.tab==='exports'){
   cleanupChart();
   void Promise.all([import('./exportMomentumView.js'),import('./exportMomentum.css')]).then(([exportsView])=>{
     if(state.tab==='exports'){state.exports ||= {};analysisCleanup=exportsView.renderExportMomentumView({shell,bindNav,focus:state.exportFocus,state:state.exports,onSelectionChange:(panel)=>{
       const focus={overview:null,products:'items',countries:'countries',semiconductor:'memory','passenger-car':'passenger-car',petroleum:'petroleum',cosmetics:'cosmetics',ships:'ships',steel:'steel'}[panel];
       navigate('exports',focus);
     }});}
   });
   return;
 }
 if(state.tab==='memory'){
   cleanupChart();
   void import('./memoryPriceView.js').then(view=>{
     if(state.tab==='memory')analysisCleanup=view.renderMemoryPriceView({shell,bindNav,activeGroup:state.memoryPriceGroup,onGroupChange:group=>navigate('memory',group)});
   });
   return;
 }
 if(state.tab==='gurus'){
   cleanupChart();
   const epoch=viewEpoch;
   document.querySelector('#app').innerHTML=shell(loadingIndicator('거장 투자법을 불러오고 있어요'),'거장 투자법');bindNav();
   void Promise.all([import('./guruInvestingView.js'),import('./guruInvestingView.css')]).then(([view])=>{
     if(epoch===viewEpoch&&state.tab==='gurus')analysisCleanup=view.renderGuruInvesting({state,shell,bindNav,navigate,isCurrent:()=>epoch===viewEpoch&&state.tab==='gurus'});
   }).catch(()=>{if(epoch===viewEpoch&&state.tab==='gurus'){document.querySelector('#app').innerHTML=shell('<div class="empty"><strong>화면을 불러오지 못했어요.</strong><button data-tab="more">분석 메뉴로</button></div>','거장 투자법');bindNav();}});
   return;
 }
 if(state.tab==='ideas'){
   cleanupChart();
   void Promise.all([import('./ideaView.js'),import('./ideaView.css')]).then(([ideas])=>{
     if(state.tab==='ideas')ideas.renderIdeaView({shell,bindNav});
   });
   return;
 }
 if(state.tab==='picks'&&SHOW_SPOTLIGHT){
   cleanupChart();
   void Promise.all([import('./pickLedger.js'),import('./pickLedger.css')]).then(([ledger])=>{
     if(state.tab==='picks')ledger.renderPickLedger({shell,bindNav,displayName,focusKey:state.pickFocusKey});
   });
   return;
 }
 if(ANALYSIS_ROUTES.has(state.tab)){cleanupChart();analysisCleanup=renderAnalysis({tab:state.tab,state,shell,bindNav,displayName,openCompareSheet});return;}
 if(state.tab==='news')return renderNews();
 if(state.tab==='detail')return renderDetail();
 if(state.tab==='info')return renderInfo();
 if(state.tab==='more')return renderMore();
 if(state.tab==='notfound')return renderNotFound();
 return renderHome();
}

function syncFromLocation(){
 const route=resolveRoute(location);
 Object.assign(state,route);
 const shared=decodeSharedView(new URLSearchParams(location.search).get('cv'));
 if(shared?.tab===route.tab&&(!shared.detailSymbol||shared.detailSymbol===route.detailSymbol)){const sessionScreener=state.screener;Object.assign(state,shared);state.sharedDetailSymbol=shared.detailSymbol||null;if(route.tab==='discover'&&state.screener){state.screener={...sessionScreener,...state.screener,appliedRoutePreset:state.screenerPreset};}}
 state.detailInvestigation=route.tab==='detail'&&history.state?.investigation?.symbol===route.detailSymbol?history.state.investigation:null;
 if(route.tab!=='detail')state.researchPeer=null;
 state.detailName=route.tab==='detail'?(history.state?.detailName||''):'';
 state.detailOrigin=route.tab==='detail'&&['home','chart','watch','more'].includes(history.state?.detailOrigin)?history.state.detailOrigin:'home';
 if(route.tab==='detail'&&!state.detailName)state.detailName=resolvedNames.get(route.detailSymbol)||'';
}

applyRuntimeClass();
window.addEventListener('popstate',event=>{navigationDepth=event.state?.cvNavigation?.session===navigationSession?event.state.cvNavigation.depth:0;closeStockSelector();syncFromLocation();state.restoreScroll=scrollPositions.get(location.hash||'#home')||0;render();window.__chartviewRestoreScroll();});
window.addEventListener('online',()=>render());
window.addEventListener('offline',()=>render());
document.addEventListener('chartview:storage-error',()=>showToast('데이터를 기기에 저장하지 못했어요. 다시 시도해주세요.'));
document.addEventListener('chartview:home-live',(event)=>{
 const rows=Array.isArray(event.detail?.results)?event.detail.results:[];
 rememberLiveQuotes(rows,{priority:30});
 if(state.tab!=='home')return;
 const canonical=rows.map(row=>getLiveQuote(row?.ticker)||row);
 patchHomeWatchLive(canonical);
});
document.addEventListener('chartview:market-now-live',(event)=>{
 if(state.tab!=='home')return;
 const payload=event.detail;
 if(!Array.isArray(payload?.results)||!payload.results.length)return;
 writeHomeFast('market',payload);
 paintHomeMarket(payload,{allowError:false,cached:false});
 bindHomeMarketToggle();
});
async function startApp(){
 const started=performance.now();
 syncFromLocation();
 const fastHome=state.tab==='home';
 if(fastHome)render();
 else document.querySelector('#app').innerHTML=`<div class="startup-loading">${loadingIndicator('저장된 목록을 불러오고 있어요')}</div>`;
 try {
   await initializeStorage();
   state.watchlist=load(WATCHLIST_KEY,[]);
   state.selected=load(SELECTED_KEY,DEFAULTS.map(x=>x.symbol));
   const activityId=getActivityVisitorId();
   if(activityId)startHomeLiveSync(activityId);
   syncFromLocation();
   render();
   recordMetric('startup',started);
 } catch {
   document.querySelector('#app').innerHTML='<div class="empty"><strong>사용자 정보와 저장 목록을 확인하지 못했어요</strong><span>토스 앱을 최신 버전으로 업데이트하고 다시 시도해주세요. 기존 목록은 그대로 보관돼요.</span><button id="retry-start" class="retry">다시 시도</button></div>';
   document.querySelector('#retry-start').onclick=startApp;
 }
}
startApp();
// Opt-in support diagnostics: aggregate timings only, local to this app session.
if(new URLSearchParams(location.search).get('diagnostics')==='1') {
 Object.defineProperty(window,'chartviewDiagnostics',{value:()=>({version:packageInfo.version,metrics:diagnosticSummary()}),configurable:true});
}

