import './styles.css';
import { API_BASE, compareStocks, marketNow } from './api.js';

const WATCHLIST_KEY='chartview-toss-watchlist-v1';
const DEFAULTS=[{symbol:'005930.KS',name:'삼성전자'},{symbol:'NVDA',name:'엔비디아'},{symbol:'AAPL',name:'애플'}];
const state={tab:'home',watchlist:loadWatchlist(),selected:['005930.KS','NVDA','AAPL'],period:'1mo'};
function loadWatchlist(){try{return JSON.parse(localStorage.getItem(WATCHLIST_KEY))||DEFAULTS}catch{return DEFAULTS}}
function saveWatchlist(){localStorage.setItem(WATCHLIST_KEY,JSON.stringify(state.watchlist))}
const icon={home:'⌂',chart:'⌁',watch:'☆',more:'•••'};
function shell(content,title='차트뷰'){
 return `<main class="app-shell"><header class="topbar"><h1>${title}</h1><button class="icon-button" aria-label="알림">♡</button></header>
 <section class="content">${content}</section>
 <nav class="bottom-nav" aria-label="주요 메뉴">${[['home','홈'],['chart','차트'],['watch','관심'],['more','전체']].map(([id,label])=>`<button data-tab="${id}" class="${state.tab===id?'active':''}"><i>${icon[id]}</i><span>${label}</span></button>`).join('')}</nav></main>`}
function sectionTitle(title,action=''){return `<div class="section-head"><h2>${title}</h2>${action}</div>`}
function stockRow(x){return `<button class="stock-row" data-symbol="${x.symbol}"><span class="stock-logo">${x.name.slice(0,1)}</span><span class="stock-copy"><strong>${x.name}</strong><small>${x.symbol}</small></span><span class="chevron">›</span></button>`}
async function renderHome(){
 document.querySelector('#app').innerHTML=shell(`
 <section class="hero"><p class="hero-kicker">내 투자 한눈에 보기</p><h2>오늘 시장,<br>빠르게 확인해요</h2><button class="search-box" data-go-chart>⌕ <span>종목명이나 티커를 검색해보세요</span></button></section>
 <section class="surface market-surface" id="market-card"><div class="skeleton market"></div></section>
 <section class="section">${sectionTitle('빠른 비교','<button class="text-button" data-go-chart>비교하기</button>')}<div class="ticker-strip">${state.selected.map(x=>`<button data-go-chart>${x}</button>`).join('')}</div></section>
 <section class="section">${sectionTitle('내 관심종목','<button class="text-button" data-tab="watch">전체보기</button>')}<div class="list">${state.watchlist.slice(0,4).map(stockRow).join('')}</div></section>`);
 bind();
 try{const d=await marketNow();const m=d?.markets||d?.data||d;document.querySelector('#market-card').innerHTML=`<div class="market-title"><span>시장 현황</span><small>실시간 데이터</small></div><div class="market-summary"><strong>주요 시장 지표</strong><p>차트뷰 서버와 연결됐어요</p></div><details><summary>데이터 자세히</summary><pre>${esc(JSON.stringify(m,null,2).slice(0,1400))}</pre></details>`}
 catch(e){document.querySelector('#market-card').innerHTML=`<div class="empty"><strong>시장 정보를 불러오지 못했어요</strong><span>${esc(e.message)}</span></div>`}
}
async function renderChart(){
 document.querySelector('#app').innerHTML=shell(`
 <section class="page-intro"><h2>차트 비교</h2><p>관심 있는 종목의 흐름을 한 번에 비교해요</p></section>
 <button class="search-box">⌕ <span>비교할 종목 추가</span></button>
 <div class="selected-list">${state.selected.map(x=>`<span>${x}</span>`).join('')}</div>
 <div class="segmented">${[['1mo','1개월'],['3mo','3개월'],['6mo','6개월'],['ytd','올해'],['1y','1년']].map(([p,l])=>`<button data-period="${p}" class="${state.period===p?'active':''}">${l}</button>`).join('')}</div>
 <section class="surface chart-surface" id="chart-data"><div class="skeleton chart"></div></section>`,'차트');
 bind();document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{state.period=b.dataset.period;renderChart()});
 try{const d=await compareStocks(state.selected,state.period);document.querySelector('#chart-data').innerHTML=`<div class="market-title"><span>수익률 비교</span><small>${state.period.toUpperCase()}</small></div><div class="chart-placeholder"><strong>데이터 연결 완료</strong><span>다음 단계에서 실차트 렌더러가 연결돼요</span></div><details><summary>원본 데이터</summary><pre>${esc(JSON.stringify(d,null,2).slice(0,3000))}</pre></details>`}
 catch(e){document.querySelector('#chart-data').innerHTML=`<div class="empty"><strong>차트를 불러오지 못했어요</strong><span>${esc(e.message)}</span></div>`}
}
function renderWatch(){document.querySelector('#app').innerHTML=shell(`<section class="page-intro"><h2>관심종목</h2><p>자주 보는 종목을 모아두세요</p></section><div class="list surface">${state.watchlist.map(stockRow).join('')||'<div class="empty">아직 관심종목이 없어요</div>'}</div>`,'관심종목');bind()}
function renderMore(){document.querySelector('#app').innerHTML=shell(`<section class="page-intro"><h2>전체</h2><p>차트뷰의 모든 기능</p></section><div class="menu surface"><button data-tab="chart"><span>차트 비교</span><b>›</b></button><button data-tab="watch"><span>관심종목</span><b>›</b></button><button><span>밸류에이션</span><em>준비 중</em></button><button><span>경제 지표</span><em>준비 중</em></button><button><span>종목 발굴</span><em>준비 중</em></button></div><p class="service-note">Chart View · API ${esc(API_BASE)}</p>`,'전체');bind()}
function bind(){document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.tab;render()});document.querySelectorAll('[data-go-chart]').forEach(b=>b.onclick=()=>{state.tab='chart';render()})}
function esc(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function render(){if(state.tab==='chart')return renderChart();if(state.tab==='watch')return renderWatch();if(state.tab==='more')return renderMore();return renderHome()}
render();
