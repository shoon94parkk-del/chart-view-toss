import './styles.css';
import { createChart, ColorType } from 'lightweight-charts';
import { API_BASE, compareStocks, marketNow, searchStocks, valuationStocks, macroData } from './api.js';

const WATCHLIST_KEY='chartview-toss-watchlist-v1';
const SELECTED_KEY='chartview-toss-selected-v1';
const DEFAULTS=[{symbol:'005930.KS',name:'삼성전자'},{symbol:'NVDA',name:'엔비디아'},{symbol:'AAPL',name:'애플'}];
const COLORS=['#3182f6','#f04452','#00a86b','#8b5cf6','#f59f00','#00a8cc'];
const DISPLAY_NAMES={'005930.KS':'삼성전자','000660.KS':'SK하이닉스','NVDA':'엔비디아','AAPL':'애플','MSFT':'마이크로소프트','META':'메타','TSLA':'테슬라','GOOGL':'알파벳','^KS11':'코스피','^KQ11':'코스닥','^GSPC':'S&P 500','^IXIC':'나스닥','^TNX':'미국 10년물','^VIX':'VIX','CL=F':'WTI','KRW=X':'원/달러'};
const displayName=(symbol,fallback='')=>DISPLAY_NAMES[symbol]||fallback||symbol;
const fmtPrice=(value)=>{const n=Number(value);if(!Number.isFinite(n))return '-';if(Math.abs(n)>=1000)return n.toLocaleString('ko-KR',{maximumFractionDigits:2});if(Math.abs(n)>=100)return n.toLocaleString('ko-KR',{maximumFractionDigits:2});return n.toLocaleString('ko-KR',{maximumFractionDigits:3})};
const fmtChange=(value)=>{const n=Number(value);if(!Number.isFinite(n))return '-';return `${n>0?'+':''}${n.toFixed(2)}%`};
const state={tab:'home',watchlist:load(WATCHLIST_KEY,DEFAULTS),selected:load(SELECTED_KEY,DEFAULTS.map(x=>x.symbol)),period:'1mo'};
let chartInstance=null;
let searchSeq=0;

function load(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}}
function persist(){localStorage.setItem(WATCHLIST_KEY,JSON.stringify(state.watchlist));localStorage.setItem(SELECTED_KEY,JSON.stringify(state.selected))}
const icons={home:'⌂',chart:'⌁',watch:'☆',more:'•••'};
function shell(content,title='차트뷰'){return `<main class="app-shell"><header class="topbar"><h1>${title}</h1><button class="icon-button" aria-label="관심종목" data-tab="watch">♡</button></header><section class="content">${content}</section><nav class="bottom-nav" aria-label="주요 메뉴">${[['home','홈'],['chart','차트'],['watch','관심'],['more','전체']].map(([id,label])=>`<button data-tab="${id}" class="${state.tab===id?'active':''}"><i>${icons[id]}</i><span>${label}</span></button>`).join('')}</nav></main>`}
function sectionTitle(title,action=''){return `<div class="section-head"><h2>${title}</h2>${action}</div>`}
function stockRow(x){const name=displayName(x.symbol,x.name);return `<button class="stock-row" data-select-stock="${x.symbol}"><span class="stock-logo">${esc(name.slice(0,1))}</span><span class="stock-copy"><strong>${esc(name)}</strong><small>${esc(x.symbol)}</small></span><span class="chevron">›</span></button>`}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function bindNav(){document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;render()});document.querySelectorAll('[data-go-chart]').forEach(b=>b.onclick=()=>{state.tab='chart';render()});document.querySelectorAll('[data-select-stock]').forEach(b=>b.onclick=()=>{const s=b.dataset.selectStock;if(!state.selected.includes(s)){state.selected=[s,...state.selected].slice(0,6);persist()}state.tab='chart';render()})}
function cleanupChart(){if(chartInstance){try{chartInstance.remove()}catch{}chartInstance=null}}

async function renderHome(){
 cleanupChart();
 document.querySelector('#app').innerHTML=shell(`
 <section class="hero"><p class="hero-kicker">내 투자 한눈에 보기</p><h2>오늘 시장을<br>빠르게 확인해요</h2><button class="search-box" data-go-chart>⌕ <span>종목명이나 티커를 검색해보세요</span></button></section>
 <section class="market-section"><div class="section-head market-head"><h2>시장</h2><span id="market-time">업데이트 중</span></div><div id="market-card"><div class="market-grid"><div class="skeleton quote"></div><div class="skeleton quote"></div><div class="skeleton quote"></div><div class="skeleton quote"></div></div></div></section>
 <section class="section">${sectionTitle('빠른 비교','<button class="text-button" data-go-chart>비교하기</button>')}<div class="ticker-strip">${state.selected.map(x=>`<button data-go-chart><strong>${esc(displayName(x))}</strong><small>${esc(x)}</small></button>`).join('')}</div></section>
 <section class="section">${sectionTitle('내 관심종목','<button class="text-button" data-tab="watch">전체보기</button>')}<div class="list">${state.watchlist.slice(0,4).map(stockRow).join('')}</div></section>`);
 bindNav();
 try{
   const data=await marketNow();
   const rows=Array.isArray(data?.results)?data.results:[];
   const preferred=['^KS11','^KQ11','^GSPC','^IXIC'];
   const primary=preferred.map(t=>rows.find(r=>r.ticker===t)).filter(Boolean);
   const shown=(primary.length?primary:rows).slice(0,4);
   const card=document.querySelector('#market-card');
   const time=document.querySelector('#market-time');
   if(time)time.textContent=data?.timestamp?`${String(data.timestamp).slice(11,16)} 기준`:'조회 완료';
   if(!shown.length)throw new Error('표시할 시장 데이터가 없어요');
   card.innerHTML=`<div class="market-grid">${shown.map(row=>{const ch=Number(row.change);return `<button class="quote-card" data-go-chart><span>${esc(displayName(row.ticker,row.name))}</span><strong>${esc(fmtPrice(row.price))}</strong><em class="${ch>0?'up':ch<0?'down':'flat'}">${esc(fmtChange(row.change))}</em></button>`}).join('')}</div>`;
   bindNav();
 }catch(e){
   const time=document.querySelector('#market-time');if(time)time.textContent='연결 확인 필요';
   document.querySelector('#market-card').innerHTML=`<div class="market-error"><div><strong>시장 정보를 불러오지 못했어요</strong><span>${esc(e.message)}</span></div><button id="retry-market">다시 시도</button></div>`;
   document.querySelector('#retry-market')?.addEventListener('click',renderHome);
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

function renderMore(){cleanupChart();document.querySelector('#app').innerHTML=shell(`<section class="page-intro"><h2>전체</h2><p>차트뷰의 모든 기능</p></section><div class="menu surface"><button data-tab="chart"><span>차트 비교</span><b>›</b></button><button data-tab="watch"><span>관심종목</span><b>›</b></button><button data-tab="valuation"><span>밸류에이션</span><b>›</b></button><button data-tab="macro"><span>경제 지표</span><b>›</b></button><button><span>종목 발굴</span><em>준비 중</em></button><button><span>맞춤 뉴스</span><em>준비 중</em></button></div><p class="service-note">Chart View for Toss · v0.3</p>`,'전체');bindNav()}
function render(){if(state.tab==='chart')return renderChart();if(state.tab==='watch')return renderWatch();if(state.tab==='valuation')return renderValuation();if(state.tab==='macro')return renderMacro();if(state.tab==='more')return renderMore();return renderHome()}
render();
