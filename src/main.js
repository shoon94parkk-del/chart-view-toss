import './styles.css';
import { createChart, ColorType } from 'lightweight-charts';
import { API_BASE, compareStocks, marketNow, homeSnapshot, searchStocks, valuationStocks, macroData, homeInsights, personalizedNews } from './api.js';
import { applyRuntimeClass, haptic, openExternal, syncNativeBackHandler } from './tossBridge.js';

const WATCHLIST_KEY='chartview-toss-watchlist-v1';
const SELECTED_KEY='chartview-toss-selected-v1';
const DEFAULTS=[{symbol:'005930.KS',name:'삼성전자'},{symbol:'NVDA',name:'엔비디아'},{symbol:'AAPL',name:'애플'}];
const COLORS=['#3182f6','#f04452','#00a86b','#8b5cf6','#f59f00','#00a8cc'];
const DISPLAY_NAMES={'005930.KS':'삼성전자','000660.KS':'SK하이닉스','NVDA':'엔비디아','AAPL':'애플','MSFT':'마이크로소프트','META':'메타','TSLA':'테슬라','GOOGL':'알파벳','^KS11':'코스피','^KQ11':'코스닥','^GSPC':'S&P 500','^IXIC':'나스닥','^TNX':'미국 10년물','^VIX':'VIX','CL=F':'WTI','KRW=X':'원/달러'};
const displayName=(symbol,fallback='')=>DISPLAY_NAMES[symbol]||fallback||symbol;
const fmtPrice=(value)=>{const n=Number(value);if(!Number.isFinite(n))return '-';if(Math.abs(n)>=1000)return n.toLocaleString('ko-KR',{maximumFractionDigits:2});if(Math.abs(n)>=100)return n.toLocaleString('ko-KR',{maximumFractionDigits:2});return n.toLocaleString('ko-KR',{maximumFractionDigits:3})};
const fmtChange=(value)=>{const n=Number(value);if(!Number.isFinite(n))return '-';return `${n>0?'+':''}${n.toFixed(2)}%`};
const state={tab:'home',watchlist:load(WATCHLIST_KEY,DEFAULTS),selected:load(SELECTED_KEY,DEFAULTS.map(x=>x.symbol)),period:'1mo',detailSymbol:null};
let chartInstance=null;
let searchSeq=0;

function load(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}}
function persist(){localStorage.setItem(WATCHLIST_KEY,JSON.stringify(state.watchlist));localStorage.setItem(SELECTED_KEY,JSON.stringify(state.selected))}
function iconSvg(name,size=24){
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
  discover:'<path d="M4 18 9 12l4 3 7-9"/><path d="M16 6h4v4"/>'
 };
 return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths[name]||paths.more}</svg>`;
}
function shell(content,title='차트뷰'){
 const secondary=['valuation','macro','discover','news','detail'].includes(state.tab);
 const navTab=secondary?'more':state.tab;
 const leading=secondary?`<button class="icon-button back-button" aria-label="뒤로가기" data-back>${iconSvg('back',22)}</button>`:`<span class="brand-mark">${iconSvg('spark',18)}</span>`;
 return `<main class="app-shell"><header class="topbar"><div class="brand-lockup">${leading}<h1>${title}</h1></div><button class="icon-button" aria-label="관심종목" data-tab="watch">${iconSvg('heart',22)}</button></header><section class="content">${content}</section><nav class="bottom-nav" aria-label="주요 메뉴">${[['home','홈'],['chart','차트'],['watch','관심'],['more','전체']].map(([id,label])=>`<button data-tab="${id}" class="${navTab===id?'active':''}"><i>${iconSvg(id,22)}</i><span>${label}</span></button>`).join('')}</nav></main>`}
function sectionTitle(title,action=''){return `<div class="section-head"><h2>${title}</h2>${action}</div>`}
function stockRow(x){const name=displayName(x.symbol,x.name);return `<button class="stock-row" data-stock-detail="${x.symbol}"><span class="stock-logo">${esc(name.slice(0,1))}</span><span class="stock-copy"><strong>${esc(name)}</strong><small>${esc(x.symbol)}</small></span><span class="chevron">${iconSvg('arrow',18)}</span></button>`}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function navigate(tab,detailSymbol=null){
 state.tab=tab;
 if(detailSymbol)state.detailSymbol=detailSymbol;
 const hash=detailSymbol?`#${tab}/${encodeURIComponent(detailSymbol)}`:`#${tab}`;
 history.pushState({tab,detailSymbol:state.detailSymbol},'',hash);
 haptic('tickWeak');
 render();
}
function bindNav(){
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>navigate(b.dataset.tab));
 document.querySelectorAll('[data-go-chart]').forEach(b=>b.onclick=()=>navigate('chart'));
 document.querySelectorAll('[data-stock-detail]').forEach(b=>b.onclick=()=>navigate('detail',b.dataset.stockDetail));
 document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>{if(state.tab!=='home')history.back()});
 document.querySelectorAll('[data-external-url]').forEach(b=>b.onclick=()=>{haptic('tickWeak');openExternal(b.dataset.externalUrl)});
}
function cleanupChart(){if(chartInstance){try{chartInstance.remove()}catch{}chartInstance=null}}

async function renderHome(){
 cleanupChart();
 document.querySelector('#app').innerHTML=shell(`
 <section class="hero">
   <div class="hero-copy"><span class="hero-badge"><i></i>오늘의 투자 브리핑</span><h2>복잡한 시장도<br><em>한눈에</em> 보면 쉬워져요</h2><p>국내·미국 시장과 내 관심종목을 빠르게 확인해요.</p></div>
   <button class="search-box elevated" data-go-chart>${iconSvg('search',20)} <span>종목명이나 티커를 검색해보세요</span><b>${iconSvg('arrow',18)}</b></button>
 </section>
 <section id="brief-card" class="brief-card skeleton brief"></section>
 <section class="tool-section">
   ${sectionTitle('바로가기','<span class="section-caption">자주 쓰는 분석</span>')}
   <div class="tool-grid">
     <button class="tool-card blue" data-tab="chart"><span class="tool-icon">${iconSvg('chart',22)}</span><strong>차트 비교</strong><small>수익률 한눈에</small></button>
     <button class="tool-card purple" data-tab="valuation"><span class="tool-icon">${iconSvg('value',22)}</span><strong>밸류에이션</strong><small>PER · PBR · ROE</small></button>
     <button class="tool-card green" data-tab="macro"><span class="tool-icon">${iconSvg('macro',22)}</span><strong>경제 지표</strong><small>금리 · 유동성</small></button>
     <button class="tool-card yellow" data-tab="watch"><span class="tool-icon">${iconSvg('star',22)}</span><strong>관심종목</strong><small>내 종목 모아보기</small></button>
   </div>
 </section>
 <section class="market-section"><div class="section-head market-head"><h2>주요 시장</h2><span id="market-time">업데이트 중</span></div><div id="market-card"><div class="market-grid"><div class="skeleton quote"></div><div class="skeleton quote"></div><div class="skeleton quote"></div><div class="skeleton quote"></div></div></div></section>
 <section class="section quick-section">${sectionTitle('빠른 비교','<button class="text-button" data-go-chart>직접 비교</button>')}<div class="ticker-strip">${state.selected.map((x,i)=>`<button data-go-chart><span class="ticker-orb tone-${i%4}">${esc(displayName(x).slice(0,1))}</span><span><strong>${esc(displayName(x))}</strong><small>${esc(x)}</small></span><b>${iconSvg('arrow',16)}</b></button>`).join('')}</div></section>
 <section class="section watch-section">${sectionTitle('내 관심종목','<button class="text-button" data-tab="watch">전체보기</button>')}<div id="home-watchlist" class="watch-card"><div class="skeleton watch"></div><div class="skeleton watch"></div><div class="skeleton watch"></div></div></section>`);
 bindNav();
 try{
   const [market,home]=await Promise.all([marketNow(),homeSnapshot()]);
   const rows=Array.isArray(market?.results)?market.results:[];
   const preferred=['^KS11','^KQ11','^GSPC','^IXIC'];
   const primary=preferred.map(t=>rows.find(r=>r.ticker===t)).filter(Boolean);
   const shown=(primary.length?primary:rows).slice(0,4);
   const time=document.querySelector('#market-time');
   if(time)time.textContent=market?.timestamp?`${String(market.timestamp).slice(11,16)} 기준`:'조회 완료';
   if(!shown.length)throw new Error('표시할 시장 데이터가 없어요');
   document.querySelector('#market-card').innerHTML=`<div class="market-grid">${shown.map((row,i)=>{const ch=Number(row.change);const region=i<2?'KR':'US';return `<button class="quote-card market-${i}" data-go-chart><div class="quote-top"><span class="market-pill">${region}</span><small>${esc(displayName(row.ticker,row.name))}</small></div><strong>${esc(fmtPrice(row.price))}</strong><em class="${ch>0?'up':ch<0?'down':'flat'}">${esc(fmtChange(row.change))}</em><span class="quote-wave"></span></button>`}).join('')}</div>`;

   const macro=home?.macro?.summary||{};
   const level=macro.level||'yellow';
   const levelText=level==='green'?'우호적':level==='red'?'주의':'혼조';
   const brief=document.querySelector('#brief-card');
   brief.classList.remove('skeleton','brief');
   brief.innerHTML=`<div class="brief-icon ${esc(level)}">${iconSvg('spark',24)}</div><div class="brief-copy"><span>오늘의 시장 분위기 <b class="status-badge ${esc(level)}">${levelText}</b></span><strong>${esc((macro.text||'시장 주요 지표를 확인하고 있어요.').split('→')[0].trim().slice(0,72))}</strong><small>${esc(macro.latestBasisDate||home?.generatedAt?.slice?.(0,10)||'')} 기준 · 자세한 내용은 경제 지표에서 확인</small></div><button data-tab="macro" aria-label="경제 지표 보기">${iconSvg('arrow',20)}</button>`;

   const quotes=home?.heatmap?.results||[];
   const watch=state.watchlist.slice(0,4);
   document.querySelector('#home-watchlist').innerHTML=watch.map((x,i)=>{const q=quotes.find(r=>r.ticker===x.symbol);const ch=Number(q?.change);const name=displayName(x.symbol,x.name);return `<button class="watch-rich-row" data-stock-detail="${esc(x.symbol)}"><span class="stock-logo tone-${i%4}">${esc(name.slice(0,1))}</span><span class="stock-copy"><strong>${esc(name)}</strong><small>${esc(x.symbol)}</small></span><span class="watch-price">${q?.price!=null?`<strong>${esc(fmtPrice(q.price))}</strong><em class="${ch>0?'up':ch<0?'down':'flat'}">${esc(fmtChange(q.change))}</em>`:'<small>차트 보기</small>'}</span><span class="chevron">${iconSvg('arrow',18)}</span></button>`}).join('');
   bindNav();
 }catch(e){
   const time=document.querySelector('#market-time');if(time)time.textContent='연결 확인 필요';
   document.querySelector('#market-card').innerHTML=`<div class="market-error"><div><strong>시장 정보를 불러오지 못했어요</strong><span>${esc(e.message)}</span></div><button id="retry-market">다시 시도</button></div>`;
   const brief=document.querySelector('#brief-card');if(brief){brief.classList.remove('skeleton','brief');brief.innerHTML=`<div class="brief-icon yellow">${iconSvg('spark',24)}</div><div class="brief-copy"><span>데이터 연결 확인 중</span><strong>잠시 후 다시 확인해주세요</strong><small>차트와 관심종목 기능은 계속 사용할 수 있어요.</small></div>`;}
   document.querySelector('#home-watchlist').innerHTML=state.watchlist.slice(0,4).map(stockRow).join('');
   bindNav();document.querySelector('#retry-market')?.addEventListener('click',renderHome);
 }
}

async function renderChart(){
 cleanupChart();
 document.querySelector('#app').innerHTML=shell(`
 <section class="page-intro"><h2>차트 비교</h2><p>최대 6개 종목의 수익률 흐름을 비교해요</p></section>
 <div class="search-wrap"><label class="search-box input-box">⌕ <input id="stock-search" placeholder="종목명 · 코드 · 티커 검색" autocomplete="off"></label><div id="search-results" class="search-results"></div></div>
 <div class="selected-list">${state.selected.map((x,i)=>`<span><i style="background:${COLORS[i%COLORS.length]}"></i>${esc(x)}<button data-remove="${esc(x)}" aria-label="${esc(x)} 제거">×</button></span>`).join('')}</div>
 <div class="segmented">${[['1mo','1개월'],['3mo','3개월'],['6mo','6개월'],['1y','1년']].map(([p,l])=>`<button data-period="${p}" class="${state.period===p?'active':''}">${l}</button>`).join('')}</div>
 <section class="surface chart-surface"><div class="chart-heading"><div><strong>수익률 비교</strong><small>기간 시작 = 0%</small></div><span id="chart-status">불러오는 중</span></div><div id="chart-canvas" class="chart-canvas"></div><div id="chart-legend" class="chart-legend"></div></section>`,'차트');
 bindNav();bindChartControls();await loadChart();
}

function bindChartControls(){
 document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{state.period=b.dataset.period;renderChart()});
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

async function loadChart(){
 const canvas=document.querySelector('#chart-canvas'),status=document.querySelector('#chart-status'),legend=document.querySelector('#chart-legend');
 if(!state.selected.length){status.textContent='종목을 추가해주세요';canvas.innerHTML='<div class="empty"><strong>비교할 종목이 없어요</strong><span>위 검색창에서 종목을 추가해보세요</span></div>';return}
 try{
   const data=await compareStocks(state.selected,state.period);
   const stocks=Array.isArray(data?.stocks)?data.stocks.filter(s=>Array.isArray(s.data)&&s.data.length):[];
   if(!stocks.length)throw new Error('표시할 시세 데이터가 없어요');
   chartInstance=createChart(canvas,{width:canvas.clientWidth||320,height:278,layout:{background:{type:ColorType.Solid,color:'#ffffff'},textColor:'#8b95a1',fontFamily:'Pretendard, -apple-system, sans-serif'},grid:{vertLines:{color:'#f2f4f6'},horzLines:{color:'#f2f4f6'}},rightPriceScale:{borderVisible:false},timeScale:{borderVisible:false,timeVisible:false},crosshair:{vertLine:{color:'#d1d6db'},horzLine:{color:'#d1d6db'}}});
   stocks.forEach((s,i)=>{const line=chartInstance.addLineSeries({color:COLORS[i%COLORS.length],lineWidth:2,priceLineVisible:false,lastValueVisible:false});line.setData(s.data)});
   chartInstance.timeScale().fitContent();
   const ro=new ResizeObserver(()=>{if(chartInstance&&canvas.clientWidth)chartInstance.applyOptions({width:canvas.clientWidth})});ro.observe(canvas);
   legend.innerHTML=stocks.map((s,i)=>`<div><i style="background:${COLORS[i%COLORS.length]}"></i><span>${esc(s.name||s.ticker)}</span><strong class="${Number(s.return)>=0?'up':'down'}">${Number(s.return)>=0?'+':''}${esc(s.return)}%</strong></div>`).join('');
   status.textContent=data?.timestamp?'최신 데이터':'조회 완료';
 }catch(e){status.textContent='오류';canvas.innerHTML=`<div class="empty"><strong>차트를 불러오지 못했어요</strong><span>${esc(e.message)}</span><button class="retry" id="retry-chart">다시 시도</button></div>`;document.querySelector('#retry-chart')?.addEventListener('click',loadChart)}
}

function renderWatch(){
 cleanupChart();document.querySelector('#app').innerHTML=shell(`<section class="page-intro"><h2>관심종목</h2><p>자주 보는 종목을 모아두세요</p></section><div class="list surface watch-list">${state.watchlist.map(x=>`<div class="watch-row">${stockRow(x)}<button class="heart active" data-unwatch="${esc(x.symbol)}">♥</button></div>`).join('')||'<div class="empty">아직 관심종목이 없어요</div>'}</div>`,'관심종목');bindNav();document.querySelectorAll('[data-unwatch]').forEach(b=>b.onclick=e=>{e.stopPropagation();state.watchlist=state.watchlist.filter(x=>x.symbol!==b.dataset.unwatch);persist();renderWatch()})
}
async function renderValuation(){
 cleanupChart();
 document.querySelector('#app').innerHTML=shell(`<section class="page-intro"><h2>밸류에이션</h2><p>선택한 종목의 핵심 지표를 비교해요</p></section><div class="selected-list">${state.selected.map(x=>`<span>${esc(displayName(x))}<small>${esc(x)}</small></span>`).join('')}</div><div id="valuation-list" class="valuation-list"><div class="skeleton valuation"></div><div class="skeleton valuation"></div></div>`,'밸류에이션');
 bindNav();
 try{
   const d=await valuationStocks(state.selected);
   const rows=Array.isArray(d?.stocks)?d.stocks:[];
   document.querySelector('#valuation-list').innerHTML=rows.map(s=>`<section class="valuation-card"><div class="valuation-title"><div><strong>${esc(displayName(s.ticker,s.name))}</strong><small>${esc(s.ticker)} · ${esc(s.sector||'섹터 정보 없음')}</small></div><div><b>${esc(fmtPrice(s.price))}</b><small>${esc(s.currency||'')}</small></div></div><div class="metric-grid">${[['FWD PER',s.forwardPE,'배'],['PER',s.trailingPE,'배'],['PBR',s.pbr,'배'],['ROE',s.roe,'%'],['영업이익률',s.operatingMargin,'%'],['배당수익률',s.dividendYield,'%']].map(([label,v,suffix])=>`<div><span>${label}</span><strong>${v===null||v===undefined?'-':esc(Number(v).toLocaleString('ko-KR',{maximumFractionDigits:2})+suffix)}</strong></div>`).join('')}</div></section>`).join('')||'<div class="empty"><strong>밸류에이션 데이터가 없어요</strong><span>차트에서 종목을 추가해보세요</span></div>';
 }catch(e){document.querySelector('#valuation-list').innerHTML=`<div class="empty"><strong>밸류에이션을 불러오지 못했어요</strong><span>${esc(e.message)}</span><button class="retry" id="retry-valuation">다시 시도</button></div>`;document.querySelector('#retry-valuation')?.addEventListener('click',renderValuation)}
}

async function renderMacro(){
 cleanupChart();
 document.querySelector('#app').innerHTML=shell(`<section class="page-intro"><h2>경제 지표</h2><p>시장 환경을 움직이는 핵심 지표를 확인해요</p></section><div id="macro-summary" class="macro-summary skeleton"></div><div id="macro-list" class="macro-list"><div class="skeleton macro"></div><div class="skeleton macro"></div><div class="skeleton macro"></div></div>`,'경제 지표');
 bindNav();
 try{
   const d=await macroData();
   const s=d?.summary||{};
   document.querySelector('#macro-summary').classList.remove('skeleton');
   document.querySelector('#macro-summary').innerHTML=`<span class="signal ${esc(s.level||'yellow')}"></span><div><strong>시장 환경 요약</strong><p>${esc(s.text||'최신 경제 지표를 확인했어요.')}</p><small>${esc(s.latestBasisDate||d?.basis?.latest||'')} 기준</small></div>`;
   const rows=(d?.results||[]).slice(0,8);
   document.querySelector('#macro-list').innerHTML=rows.map(r=>`<article class="macro-card"><div><strong>${esc(r.name||r.symbol)}</strong><small>${esc(r.asOf||'')}</small></div><div><b>${esc(fmtPrice(r.value))}</b><em class="${Number(r.change)>0?'up':Number(r.change)<0?'down':'flat'}">${esc(fmtChange(r.change))}</em></div></article>`).join('');
 }catch(e){document.querySelector('#macro-list').innerHTML=`<div class="empty"><strong>경제 지표를 불러오지 못했어요</strong><span>${esc(e.message)}</span><button class="retry" id="retry-macro">다시 시도</button></div>`;document.querySelector('#retry-macro')?.addEventListener('click',renderMacro)}
}

function timeAgo(value){
 const ms=Date.now()-new Date(value||0).getTime();if(!Number.isFinite(ms)||ms<0)return '';
 const min=Math.floor(ms/60000);if(min<60)return min<1?'방금 전':`${min}분 전`;
 const hour=Math.floor(min/60);if(hour<24)return `${hour}시간 전`;
 const day=Math.floor(hour/24);return day<7?`${day}일 전`:String(value||'').slice(0,10);
}

async function renderDetail(){
 cleanupChart();
 const symbol=state.detailSymbol||state.selected[0]||'005930.KS';
 const saved=state.watchlist.find(x=>x.symbol===symbol);
 const knownName=displayName(symbol,saved?.name||symbol);
 document.querySelector('#app').innerHTML=shell(`
   <section class="detail-hero">
     <div class="detail-brand"><span class="detail-logo">${esc(knownName.slice(0,1))}</span><div><span>${esc(symbol)}</span><h2>${esc(knownName)}</h2></div></div>
     <div class="detail-actions"><button id="detail-watch">${iconSvg('heart',18)} <span>${saved?'관심 해제':'관심 추가'}</span></button><button id="detail-compare">${iconSvg('chart',18)} <span>비교하기</span></button></div>
   </section>
   <section class="detail-price skeleton detail-price-skeleton" id="detail-price"></section>
   <section class="detail-chart-card"><div class="detail-section-head"><div><span>3개월 흐름</span><strong>수익률 추이</strong></div><small id="detail-chart-status">불러오는 중</small></div><div id="detail-chart" class="detail-chart"></div></section>
   <section class="detail-block"><div class="section-head"><h2>핵심 지표</h2><button class="text-button" data-tab="valuation">비교 보기</button></div><div id="detail-metrics" class="detail-metrics"><div class="skeleton metric"></div><div class="skeleton metric"></div><div class="skeleton metric"></div><div class="skeleton metric"></div></div></section>
   <section class="detail-block"><div class="section-head"><h2>관련 뉴스</h2><button class="text-button" data-tab="news">전체 뉴스</button></div><div id="detail-news" class="detail-news"><div class="skeleton news"></div><div class="skeleton news"></div></div></section>
 `,knownName);
 bindNav();
 document.querySelector('#detail-watch')?.addEventListener('click',()=>{
   const idx=state.watchlist.findIndex(x=>x.symbol===symbol);
   if(idx>=0)state.watchlist.splice(idx,1);else state.watchlist.unshift({symbol,name:knownName});
   persist();renderDetail();
 });
 document.querySelector('#detail-compare')?.addEventListener('click',()=>{
   if(!state.selected.includes(symbol))state.selected=[symbol,...state.selected].slice(0,6);
   persist();navigate('chart');
 });
 const [compareRes,valRes,newsRes]=await Promise.allSettled([
   compareStocks([symbol],'3mo'),valuationStocks([symbol]),personalizedNews([symbol],[knownName])
 ]);
 const compare=compareRes.status==='fulfilled'?compareRes.value:null;
 const stock=compare?.stocks?.[0];
 const valuation=valRes.status==='fulfilled'?valRes.value?.stocks?.[0]:null;
 const latest=stock?.data?.at?.(-1)?.value;
 const ret=Number(stock?.return);
 const price=valuation?.price;
 const priceBox=document.querySelector('#detail-price');
 priceBox.classList.remove('skeleton','detail-price-skeleton');
 priceBox.innerHTML=`<div><span>현재가</span><strong>${price!=null?esc(fmtPrice(price)):'-'}</strong><small>${esc(valuation?.currency||'')}</small></div><div class="detail-return ${ret>0?'up':ret<0?'down':'flat'}"><span>3개월</span><strong>${Number.isFinite(ret)?esc(fmtChange(ret)):'-'}</strong></div>`;

 const canvas=document.querySelector('#detail-chart'),status=document.querySelector('#detail-chart-status');
 if(stock?.data?.length){
   chartInstance=createChart(canvas,{width:canvas.clientWidth||320,height:220,layout:{background:{type:ColorType.Solid,color:'#ffffff'},textColor:'#8b95a1',fontFamily:'Pretendard, -apple-system, sans-serif'},grid:{vertLines:{color:'#f7f8fa'},horzLines:{color:'#f2f4f6'}},rightPriceScale:{borderVisible:false},timeScale:{borderVisible:false},crosshair:{vertLine:{color:'#d1d6db'},horzLine:{color:'#d1d6db'}}});
   const line=chartInstance.addAreaSeries({lineColor:'#3182f6',topColor:'rgba(49,130,246,.18)',bottomColor:'rgba(49,130,246,.01)',lineWidth:2,priceLineVisible:false,lastValueVisible:false});
   line.setData(stock.data);chartInstance.timeScale().fitContent();
   new ResizeObserver(()=>{if(chartInstance&&canvas.clientWidth)chartInstance.applyOptions({width:canvas.clientWidth})}).observe(canvas);
   status.textContent=compare?.timestamp?String(compare.timestamp).slice(5,16):'조회 완료';
 }else{canvas.innerHTML='<div class="empty compact"><strong>차트 데이터가 없어요</strong><span>잠시 후 다시 확인해주세요</span></div>';status.textContent='데이터 없음'}

 const metrics=[['FWD PER',valuation?.forwardPE,'배'],['PER',valuation?.trailingPE,'배'],['PBR',valuation?.pbr,'배'],['ROE',valuation?.roe,'%'],['영업이익률',valuation?.operatingMargin,'%'],['배당수익률',valuation?.dividendYield,'%']];
 document.querySelector('#detail-metrics').innerHTML=metrics.map(([label,v,suffix],i)=>`<div class="detail-metric tone-bg-${i%3}"><span>${label}</span><strong>${v==null?'-':esc(Number(v).toLocaleString('ko-KR',{maximumFractionDigits:2})+suffix)}</strong></div>`).join('');

 const news=newsRes.status==='fulfilled'?(newsRes.value?.items||[]).slice(0,4):[];
 document.querySelector('#detail-news').innerHTML=news.length?news.map(row=>newsCard(row)).join(''):'<div class="empty compact"><strong>표시할 주요 뉴스가 없어요</strong><span>새 소식이 들어오면 여기에 보여드려요</span></div>';
}

function newsCard(row){
 const tags=(row.investmentTags||[]).slice(0,2);
 return `<button class="news-card" data-external-url="${esc(row.url||'')}"><div class="news-meta"><span>${esc(displayName(row.symbol,row.name))}</span><small>${esc(row.source||'뉴스')} · ${esc(timeAgo(row.publishedAt))}</small></div><strong>${esc(row.title||'')}</strong>${tags.length?`<div class="news-tags">${tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}<span class="news-arrow">${iconSvg('arrow',18)}</span></button>`;
}

async function renderDiscover(){
 cleanupChart();
 document.querySelector('#app').innerHTML=shell(`
   <section class="page-intro rich-intro"><span class="page-kicker">DISCOVER</span><h2>지금 눈에 띄는 종목</h2><p>거래량·추세·기술 신호를 기준으로 종목을 탐색해요.</p></section>
   <div class="discover-notice"><span class="discover-icon">${iconSvg('discover',21)}</span><div><strong>데이터 기반 탐색</strong><p>점수는 매수 추천이 아니라 여러 기술 신호를 묶은 탐색 지표예요.</p></div></div>
   <div id="discover-list" class="discover-list"><div class="skeleton discover"></div><div class="skeleton discover"></div><div class="skeleton discover"></div></div>
 `,'종목 발굴');
 bindNav();
 try{
   const d=await homeInsights(state.selected);
   const tradeDate=d?.screener?.tradeDate||'';
   let rows=Array.isArray(d?.screener?.stocks)?d.screener.stocks:[];
   rows=rows.filter(r=>Number.isFinite(Number(r.score))).sort((a,b)=>Number(b.score)-Number(a.score)).slice(0,12);
   document.querySelector('#discover-list').innerHTML=rows.map((r,i)=>{
     const signals=[];if(r.aligned)signals.push('정배열');if(r.cross20)signals.push('20일선 돌파');if(Number(r.volumeRatio)>=1.2)signals.push(`거래량 ${Number(r.volumeRatio).toFixed(1)}x`);if(Number(r.rsi14)<=35)signals.push('RSI 낮음');
     return `<button class="discover-card" data-stock-detail="${esc(r.symbol)}"><div class="rank-badge">${i+1}</div><span class="stock-logo tone-${i%4}">${esc((r.name||r.symbol||'?').slice(0,1))}</span><div class="discover-copy"><strong>${esc(r.name||r.symbol)}</strong><small>${esc(r.symbol||'')} · ${esc(r.market||'')}</small><div class="signal-tags">${signals.slice(0,3).map(x=>`<span>${esc(x)}</span>`).join('')}</div></div><div class="discover-score"><span>탐색 점수</span><strong>${esc(Math.round(Number(r.score)))}</strong></div></button>`;
   }).join('')||'<div class="empty"><strong>현재 표시할 종목이 없어요</strong><span>스크리너 데이터가 갱신되면 다시 확인해주세요</span></div>';
   const intro=document.querySelector('.rich-intro p');if(intro&&tradeDate)intro.textContent=`${tradeDate} 거래 기준 · 거래량·추세·기술 신호로 탐색해요.`;
   bindNav();
 }catch(e){document.querySelector('#discover-list').innerHTML=`<div class="empty"><strong>종목 발굴 데이터를 불러오지 못했어요</strong><span>${esc(e.message)}</span><button class="retry" id="retry-discover">다시 시도</button></div>`;document.querySelector('#retry-discover')?.addEventListener('click',renderDiscover)}
}

async function renderNews(){
 cleanupChart();
 const tickers=state.watchlist.slice(0,20).map(x=>x.symbol);
 const names=state.watchlist.slice(0,20).map(x=>displayName(x.symbol,x.name));
 document.querySelector('#app').innerHTML=shell(`
   <section class="page-intro rich-intro"><span class="page-kicker">WATCHLIST NEWS</span><h2>내 종목 주요 뉴스</h2><p>관심종목 중 투자에 영향이 큰 소식을 우선 보여줘요.</p></section>
   <div class="news-filter-strip">${state.watchlist.slice(0,8).map((x,i)=>`<span class="tone-bg-${i%3}">${esc(displayName(x.symbol,x.name))}</span>`).join('')}</div>
   <div id="news-list" class="news-list"><div class="skeleton news-large"></div><div class="skeleton news-large"></div><div class="skeleton news-large"></div></div>
 `,'맞춤 뉴스');
 bindNav();
 if(!tickers.length){document.querySelector('#news-list').innerHTML='<div class="empty"><strong>관심종목을 먼저 추가해주세요</strong><span>관심종목 뉴스만 골라서 보여드려요</span></div>';return}
 try{
   const d=await personalizedNews(tickers,names);
   const rows=(d?.items||[]).slice(0,12);
   document.querySelector('#news-list').innerHTML=rows.length?rows.map(newsCard).join(''):`<div class="empty"><strong>현재 표시할 주요 뉴스가 없어요</strong><span>기사 관련성과 투자 중요도를 확인한 뒤 표시해요</span></div>`;
 }catch(e){document.querySelector('#news-list').innerHTML=`<div class="empty"><strong>뉴스를 불러오지 못했어요</strong><span>${esc(e.message)}</span><button class="retry" id="retry-news">다시 시도</button></div>`;document.querySelector('#retry-news')?.addEventListener('click',renderNews)}
}

function renderMore(){
 cleanupChart();
 document.querySelector('#app').innerHTML=shell(`
   <section class="page-intro rich-intro"><span class="page-kicker">ALL FEATURES</span><h2>투자에 필요한 도구</h2><p>보고 싶은 정보로 바로 이동하세요.</p></section>
   <div class="feature-menu">
     <button class="feature-row" data-tab="chart"><span class="feature-icon blue">${iconSvg('chart',22)}</span><span><strong>차트 비교</strong><small>최대 6개 종목 수익률 비교</small></span><b>${iconSvg('arrow',19)}</b></button>
     <button class="feature-row" data-tab="valuation"><span class="feature-icon purple">${iconSvg('value',22)}</span><span><strong>밸류에이션</strong><small>PER · PBR · ROE 비교</small></span><b>${iconSvg('arrow',19)}</b></button>
     <button class="feature-row" data-tab="macro"><span class="feature-icon green">${iconSvg('macro',22)}</span><span><strong>경제 지표</strong><small>금리 · 유동성 · 위험 신호</small></span><b>${iconSvg('arrow',19)}</b></button>
     <button class="feature-row" data-tab="discover"><span class="feature-icon yellow">${iconSvg('discover',22)}</span><span><strong>종목 발굴</strong><small>거래량·추세 신호로 탐색</small></span><b>${iconSvg('arrow',19)}</b></button>
     <button class="feature-row" data-tab="news"><span class="feature-icon coral">${iconSvg('news',22)}</span><span><strong>맞춤 뉴스</strong><small>관심종목의 투자 중요 뉴스</small></span><b>${iconSvg('arrow',19)}</b></button>
     <button class="feature-row" data-tab="watch"><span class="feature-icon slate">${iconSvg('star',22)}</span><span><strong>관심종목</strong><small>내 종목을 한 곳에서 관리</small></span><b>${iconSvg('arrow',19)}</b></button>
   </div>
   <div class="version-card"><span class="brand-mark">${iconSvg('spark',16)}</span><div><strong>Chart View for Toss</strong><small>Preview v0.5 · Apps in Toss SDK 3.x 연동</small></div></div>
 `,'전체');
 bindNav();
}

function render(){
 syncNativeBackHandler({
   isRoot: state.tab==='home',
   onBack: () => {
     if(state.tab!=='home') history.back();
   },
 });
 if(state.tab==='chart')return renderChart();
 if(state.tab==='watch')return renderWatch();
 if(state.tab==='valuation')return renderValuation();
 if(state.tab==='macro')return renderMacro();
 if(state.tab==='discover')return renderDiscover();
 if(state.tab==='news')return renderNews();
 if(state.tab==='detail')return renderDetail();
 if(state.tab==='more')return renderMore();
 return renderHome();
}

function syncFromLocation(){
 const allowed=new Set(['home','chart','watch','valuation','macro','discover','news','detail','more']);
 const hashRaw=location.hash.replace(/^#/,'');
 if(hashRaw){
   const [tabRaw,symbolRaw]=hashRaw.split('/');
   state.tab=allowed.has(tabRaw)?tabRaw:'home';
   if(state.tab==='detail'&&symbolRaw)state.detailSymbol=decodeURIComponent(symbolRaw);
   return;
 }
 const parts=location.pathname.split('/').filter(Boolean).map(decodeURIComponent);
 const pathTab=parts[0]||'home';
 if(pathTab==='stock'&&parts[1]){
   state.tab='detail';
   state.detailSymbol=parts[1].toUpperCase();
   return;
 }
 const routeAliases={search:'chart',compare:'chart',valuation:'valuation',macro:'macro',discover:'discover',news:'news',watch:'watch'};
 state.tab=allowed.has(pathTab)?pathTab:(routeAliases[pathTab]||'home');
}

applyRuntimeClass();
window.addEventListener('popstate',()=>{syncFromLocation();render()});
syncFromLocation();
render();
