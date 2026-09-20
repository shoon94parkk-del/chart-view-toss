import './styles.css';
import { API_BASE, compareStocks, marketNow } from './api.js';

const WATCHLIST_KEY = 'chartview-toss-watchlist-v1';
const DEFAULTS = [
  { symbol: '005930.KS', name: '삼성전자' },
  { symbol: 'NVDA', name: '엔비디아' },
  { symbol: 'AAPL', name: '애플' },
];

const state = {
  tab: 'home',
  watchlist: loadWatchlist(),
  selected: ['005930.KS', 'NVDA', 'AAPL'],
  period: '1mo',
};

function loadWatchlist() {
  try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY)) || DEFAULTS; }
  catch { return DEFAULTS; }
}

function saveWatchlist() {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(state.watchlist));
}

function shell(content) {
  return `
    <main class="app-shell">
      <header class="topbar"><div><p class="eyebrow">CHART VIEW</p><h1>차트뷰</h1></div><span class="live-dot">LIVE</span></header>
      <section id="content">${content}</section>
      <nav class="bottom-nav" aria-label="주요 메뉴">
        ${[['home','홈'],['chart','차트'],['watch','관심종목'],['more','더보기']].map(([id,label]) =>
          `<button data-tab="${id}" class="${state.tab===id?'active':''}"><span>${id==='home'?'⌂':id==='chart'?'⌁':id==='watch'?'★':'•••'}</span>${label}</button>`
        ).join('')}
      </nav>
    </main>`;
}

function card(title, body, extra='') {
  return `<article class="card"><div class="card-head"><h2>${title}</h2>${extra}</div>${body}</article>`;
}

async function renderHome() {
  document.querySelector('#app').innerHTML = shell(`
    <section class="hero"><p>오늘 시장을 빠르게 확인하세요</p><h2>관심종목과 시장 흐름을<br>한눈에 비교해요</h2></section>
    <div id="market-card">${card('시장 현황','<div class="skeleton tall"></div>')}</div>
    ${card('빠른 비교', `<div class="chips">${state.selected.map(x=>`<span>${x}</span>`).join('')}</div><button class="primary" data-go-chart>차트 비교하기</button>`)}
    ${card('관심종목', state.watchlist.map(x=>`<div class="stock-row"><div><strong>${x.name}</strong><small>${x.symbol}</small></div><button data-add="${x.symbol}">비교</button></div>`).join(''))}
  `);
  bindNav();
  document.querySelector('[data-go-chart]')?.addEventListener('click',()=>{state.tab='chart';render();});
  try {
    const data = await marketNow();
    const summary = data?.markets || data?.data || data;
    document.querySelector('#market-card').innerHTML = card('시장 현황',
      `<pre class="market-json">${escapeHtml(JSON.stringify(summary, null, 2).slice(0,1200))}</pre>`,
      `<small class="muted">API 연결됨</small>`);
  } catch (e) {
    document.querySelector('#market-card').innerHTML = card('시장 현황', `<div class="error">데이터를 불러오지 못했어요.<small>${escapeHtml(e.message)}</small></div>`);
  }
}

async function renderChart() {
  document.querySelector('#app').innerHTML = shell(`
    <section class="section-title"><h2>차트 비교</h2><p>최대 6개 종목의 기간 수익률을 비교해요.</p></section>
    ${card('비교 종목', `<div class="chips">${state.selected.map(x=>`<span>${x}</span>`).join('')}</div>
      <div class="periods">${['1mo','3mo','6mo','ytd','1y'].map(p=>`<button data-period="${p}" class="${state.period===p?'active':''}">${p.toUpperCase()}</button>`).join('')}</div>`)}
    <div id="chart-data">${card('수익률 데이터','<div class="skeleton chart"></div>')}</div>
  `);
  bindNav();
  document.querySelectorAll('[data-period]').forEach(btn=>btn.onclick=()=>{state.period=btn.dataset.period;renderChart();});
  try {
    const data = await compareStocks(state.selected, state.period);
    document.querySelector('#chart-data').innerHTML = card('수익률 데이터',
      `<pre class="market-json">${escapeHtml(JSON.stringify(data, null, 2).slice(0,4000))}</pre>`,
      '<small class="muted">MVP API 검증 화면</small>');
  } catch(e) {
    document.querySelector('#chart-data').innerHTML = card('수익률 데이터', `<div class="error">차트 데이터를 불러오지 못했어요.<small>${escapeHtml(e.message)}</small></div>`);
  }
}

function renderWatch() {
  document.querySelector('#app').innerHTML = shell(`
    <section class="section-title"><h2>관심종목</h2><p>이 기기에 저장돼요.</p></section>
    ${card('내 종목', state.watchlist.map(x=>`<div class="stock-row"><div><strong>${x.name}</strong><small>${x.symbol}</small></div><button class="danger" data-remove="${x.symbol}">삭제</button></div>`).join('') || '<div class="empty">관심종목이 없어요.</div>')}
  `);
  bindNav();
  document.querySelectorAll('[data-remove]').forEach(btn=>btn.onclick=()=>{
    state.watchlist=state.watchlist.filter(x=>x.symbol!==btn.dataset.remove); saveWatchlist(); renderWatch();
  });
}

function renderMore() {
  document.querySelector('#app').innerHTML = shell(`
    <section class="section-title"><h2>더보기</h2><p>앱인토스 전용 Chart View</p></section>
    ${card('서비스 정보', `<div class="info-row"><span>API</span><strong>${API_BASE}</strong></div><div class="info-row"><span>버전</span><strong>0.1.0 MVP</strong></div>`)}
  `);
  bindNav();
}

function bindNav() {
  document.querySelectorAll('[data-tab]').forEach(btn=>btn.onclick=()=>{state.tab=btn.dataset.tab;render();});
}

function escapeHtml(v='') { return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function render() {
  if(state.tab==='chart') return renderChart();
  if(state.tab==='watch') return renderWatch();
  if(state.tab==='more') return renderMore();
  return renderHome();
}

render();
