import {uiIcon} from './uiIdentity.js';
import { recentSelections, selectionCardMarkup } from './valueDiscovery.js';
import { homeBootstrap, homeSnapshot, homeHeatmap } from './api.js';
import { HOME_LOGOS } from './homeLogos.js';
import { HOME_STOCK_META, renderSharedHeatmap } from './heatmapView.js';
import { readHomeFast, writeHomeFast } from './homeFastCache.js';
import { mergeLiveRows } from './liveHomeSync.js';
import { rememberLiveQuotes, getLiveQuote, mergeRowsWithLive } from './liveQuoteStore.js';
import { SHOW_SPOTLIGHT } from './releaseScope.js';
import { loadingIndicator } from './loadingView.js';

const STOCK_META = HOME_STOCK_META;

const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const finite = (value) => {
  if (value == null || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const signedPct = (value) => {
  const number = finite(value);
  if (number === null) return '-';
  return (number > 0 ? '+' : '') + number.toFixed(2) + '%';
};

const returnTone = (value) => {
  const number = finite(value);
  if (number === null || number === 0) return 'flat';
  return number > 0 ? 'up' : 'down';
};

function kstDateKey(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((part) => [part.type, part.value]));
  return parts.year + '-' + parts.month + '-' + parts.day;
}

function formatKst(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function toneClass(value) {
  const number = finite(value) || 0;
  const magnitude = Math.abs(number);
  const level = magnitude >= 3 ? 3 : magnitude >= 1 ? 2 : magnitude >= 0.25 ? 1 : 0;
  if (!level) return 'home-hm-flat';
  return (number > 0 ? 'home-hm-up-' : 'home-hm-down-') + level;
}

function layoutTreemap(items, x, y, width, height, output) {
  if (!items.length) return;
  if (items.length === 1) {
    output.push({ row: items[0].row, x, y, width, height });
    return;
  }

  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let partial = 0;
  let split = 1;
  let best = Infinity;

  for (let index = 1; index < items.length; index += 1) {
    partial += items[index - 1].weight;
    const diff = Math.abs(total / 2 - partial);
    if (diff < best) {
      best = diff;
      split = index;
    }
  }

  const first = items.slice(0, split);
  const second = items.slice(split);
  const firstWeight = first.reduce((sum, item) => sum + item.weight, 0);
  const ratio = total > 0 ? firstWeight / total : 0.5;

  if (width >= height) {
    const firstWidth = width * ratio;
    layoutTreemap(first, x, y, firstWidth, height, output);
    layoutTreemap(second, x + firstWidth, y, width - firstWidth, height, output);
  } else {
    const firstHeight = height * ratio;
    layoutTreemap(first, x, y, width, firstHeight, output);
    layoutTreemap(second, x, y + firstHeight, width, height - firstHeight, output);
  }
}

function marketRows(payload, market) {
  return (Array.isArray(payload && payload.results) ? payload.results : [])
    .map((raw) => {
      const ticker = String(raw && (raw.ticker || raw.symbol) || '').toUpperCase();
      const meta = STOCK_META[ticker] || {};
      const inferredMarket = /\.(KS|KQ)$/.test(ticker) ? 'KR' : 'US';
      return {
        ticker,
        name: meta.name || raw && raw.name || ticker,
        short: meta.short || meta.name || raw && raw.name || ticker,
        market: meta.market || inferredMarket,
        logo: meta.logo || '',
        fallback: meta.fallback || ticker.replace(/\.(KS|KQ)$/, '').slice(0, 3),
        marketCap: finite(raw && raw.marketCap),
        change: finite(raw && (raw.change != null ? raw.change : raw.dayChange))
      };
    })
    .filter((row) => row.ticker && row.market === market && row.marketCap !== null && row.marketCap > 0)
    .sort((a, b) => b.marketCap - a.marketCap);
}

function heatmapMarketMarkup(payload, market) {
  const rows = marketRows(payload, market);
  if (!rows.length) {
    return '<div class="home-hm-empty">표시할 종목 데이터를 준비 중이에요.</div>';
  }

  const items = rows.map((row) => ({
    row,
    weight: market === 'KR' ? Math.pow(Math.max(1, row.marketCap), 0.58) : Math.max(1, row.marketCap)
  }));
  const rects = [];
  layoutTreemap(items, 0, 0, 1, 1, rects);

  return rects.map((rect) => {
    const area = rect.width * rect.height;
    const sizeClass = area >= 0.12 ? 'is-large' : area >= 0.055 ? 'is-medium' : 'is-small';
    const veryTight = rect.width < 0.145 || rect.height < 0.18 || area < 0.028;
    const compact = veryTight || rect.width < 0.21 || rect.height < 0.24 || area < 0.058;
    const label = veryTight ? rect.row.fallback : compact ? rect.row.short : rect.row.name;
    const logoSvg = rect.row.logo ? HOME_LOGOS[rect.row.logo] : '';
    const showLogo = Boolean(logoSvg) && !veryTight && area >= 0.05 && rect.width >= 0.17 && rect.height >= 0.18;
    const mark = showLogo
      ? '<i class="home-heatmap-logo" aria-hidden="true">' + logoSvg + '</i>'
      : '';
    return '<div class="home-heatmap-cell ' + toneClass(rect.row.change) + ' ' + sizeClass + '"' +
      ' style="left:' + (rect.x * 100).toFixed(3) + '%;top:' + (rect.y * 100).toFixed(3) + '%;width:' + (rect.width * 100).toFixed(3) + '%;height:' + (rect.height * 100).toFixed(3) + '%"' +
      ' role="img" aria-label="' + esc(rect.row.name + ' ' + signedPct(rect.row.change)) + '">' +
      '<span class="home-heatmap-name">' + mark + '<strong>' + esc(label) + '</strong></span><span class="home-heatmap-change">' + esc(signedPct(rect.row.change)) + '</span></div>';
  }).join('');
}

function createSections(marketSection) {
  let picks = null;
  if (SHOW_SPOTLIGHT) {
    picks = document.createElement('section');
    picks.className = 'section home-extra-section home-pick-section home-primary';
    picks.id = 'home-top-picks-section';
    picks.innerHTML =
      '<div class="section-head"><h2><i class="section-symbol" aria-hidden="true">' + uiIcon('ledger',16) + '</i>선정 기록·성과</h2><div class="home-pick-head-actions"><button type="button" class="text-button" data-home-extra-route="picks">전체 기록 →</button></div></div>' +
      '<p class="home-records-caption">선정 당시 이유와 이후 결과를 기록해요. 종목을 누르면 근거·점검 내용을 열어요.</p>' +
      `<div id="home-top-picks" class="home-pick-list">${loadingIndicator('최근 선정 종목을 불러오고 있어요')}<div class="skeleton home-extra-skeleton"></div></div>`;
  }

  const heatmap = document.createElement('section');
  heatmap.className = 'section home-extra-section home-heatmap-section home-primary';
  heatmap.id = 'home-daily-heatmap-section';
  heatmap.innerHTML =
    '<div class="section-head"><h2><i class="section-symbol" aria-hidden="true">' + uiIcon('market',16) + '</i>오늘 등락 히트맵</h2><button type="button" class="text-button" data-home-extra-route="heatmap">히트맵 보기</button></div>' +
    '<p class="home-extra-caption">대표 종목의 당일 등락률을 시가총액 비중으로 보여줘요.</p>' +
    `<div id="home-daily-heatmap">${loadingIndicator('오늘 등락 히트맵을 불러오고 있어요')}<div class="skeleton home-heatmap-skeleton"></div></div>`;

  if (picks) document.querySelector('#home-discovery-feed').append(picks);
  const revisit=document.querySelector('.saved-research')||document.querySelector('.watch-section');
  revisit.insertAdjacentElement('afterend',heatmap);
  const discovery=document.querySelector('#home-discovery-feed');
  const exportPreview=document.createElement('section');exportPreview.className='home-export-preview home-changes';
  exportPreview.innerHTML='<div class="home-changes-title"><h2><i class="section-symbol" aria-hidden="true">' + uiIcon('evidence',16) + '</i>이번 자료에서 확인할 변화</h2><p>관찰한 변화에서 다음 확인으로 · 자료마다 기준일이 달라요.</p></div><div class="home-change-grid" data-home-changes></div><button type="button" class="text-button" data-home-change-toggle aria-expanded="false" hidden>변화 모두 보기</button><p role="status" data-home-change-status></p><button type="button" class="text-button" data-home-change-retry hidden>변화 자료 다시 확인</button>';
  discovery.prepend(exportPreview);
  const loadPreview=()=>void import('./homeChangesView.js').then(module=>{if(exportPreview.isConnected)void module.mountHomeChanges(exportPreview);}).catch(()=>{if(exportPreview.isConnected)exportPreview.querySelector('[data-home-changes]').textContent='수출·조건 검색 화면에서 자료를 확인해주세요.';});
  const previewObserver=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){previewObserver.disconnect();loadPreview();}else if(!exportPreview.isConnected)previewObserver.disconnect();},{rootMargin:'120px'});
  previewObserver.observe(exportPreview);
  heatmap.querySelector('.home-extra-caption').textContent='한 시장의 대표 6종목 미리보기예요. 전체 화면에서 더 많은 종목과 섹터를 탐색해요.';
  const marketTabs=document.createElement('div');marketTabs.className='market-tabs home-preview-markets';
  marketTabs.innerHTML='<button type="button" data-preview-market="KR" aria-pressed="true">한국</button><button type="button" data-preview-market="US" aria-pressed="false">미국</button>';
  heatmap.querySelector('#home-daily-heatmap').before(marketTabs);
  heatmap.dataset.previewMarket='KR';
  marketTabs.addEventListener('click',event=>{
    const button=event.target.closest('[data-preview-market]');if(!button)return;
    heatmap.dataset.previewMarket=button.dataset.previewMarket;
    marketTabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    const target=heatmap.querySelector('#home-daily-heatmap');if(target._payload)paintHeatmap(target,target._payload,{cached:target._cached});
  });
  return { picks, heatmap };

}

function paintPicks(host, payload) {
  if (!host || !host.isConnected) return;
  const day = payload && payload.day;
  const rows = Array.isArray(day && day.top3) ? day.top3.slice(0, 3) : [];
  if (!rows.length) {
    host.innerHTML =
      '<div class="home-extra-empty"><strong>선정 종목을 준비 중이에요.</strong><span>최근 스크리닝이 완료되면 선정 종목이 표시돼요.</span></div>';
    return;
  }

  const tradeDate = day && day.tradeDate || '';
  const dateLabel = tradeDate ? (tradeDate === kstDateKey() ? '오늘 선정 · ' : '최근 선정 · ') + tradeDate : '선정일 확인 중';

  host.innerHTML =
    '<div class="home-pick-meta">' + esc(dateLabel) + ' · 종목을 눌러 기록 확인</div>' +
    recentSelections(payload).map(row=>selectionCardMarkup(row)).join('');
  window.__chartviewBindNav?.();
  const paintToken=host._pickPaintToken=(host._pickPaintToken||0)+1;
  const refreshStatuses=async()=>{
    try{
      const [{pickMonitor},{monitorFor,actionStatus,statusMeta}]=await Promise.all([import('./api.js'),import('./pickLedger.js')]);
      const monitor=await pickMonitor();if(!host.isConnected||host._pickPaintToken!==paintToken)return;
      for(const row of recentSelections(payload)){
        const pick=monitorFor(row,monitor.picks||[]);
        const status=pick?statusMeta(actionStatus({monitor:pick})).label:'점검 기록 미제공';
        const node=[...host.querySelectorAll('[data-selection-status]')].find(el=>el.dataset.selectionStatus===row.key);
        if(node)node.textContent=status;
      }
    }catch{if(host.isConnected&&host._pickPaintToken===paintToken)host.querySelectorAll('[data-selection-status]').forEach(el=>el.textContent='점검 상태 조회 실패');}
  };
  void refreshStatuses();
}

function paintHeatmap(host, payload, {cached = false} = {}) {
  if (!host || !host.isConnected) return;
  rememberLiveQuotes(payload?.results || [], { priority: 20 });
  host._payload=payload;host._cached=cached;
  host.innerHTML = renderSharedHeatmap({ ...payload, results: mergeRowsWithLive(payload?.results || []) }, {cached,market:host.closest('[data-preview-market]')?.dataset.previewMarket||host.closest('.home-heatmap-section')?.dataset.previewMarket||'KR',limit:6});
  host.querySelectorAll('[data-stock-detail]').forEach((cell) => {
    const openDetail = () => navigate('detail', cell.dataset.stockDetail, cell.dataset.stockName || '');
    cell.addEventListener('click', openDetail);
    cell.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openDetail();
      }
    });
  });
}
let generation = 0;

async function mount() {
  const marketSection = document.querySelector('.market-section.home-primary');
  if (!marketSection || marketSection.dataset.homeExtrasMounted === '1') return;
  marketSection.dataset.homeExtrasMounted = '1';

  const token = ++generation;
  const sections = createSections(marketSection);
  window.__chartviewBindNav?.();

  if (SHOW_SPOTLIGHT) {
    const cachedPicks = readHomeFast('bootstrap', 36 * 60 * 60 * 1000);
    if (cachedPicks) paintPicks(sections.picks.querySelector('#home-top-picks'), cachedPicks);
  }
  const cachedSnapshot = readHomeFast('snapshot', 6 * 60 * 60 * 1000);
  if (cachedSnapshot?.heatmap?.results?.length) {
    paintHeatmap(sections.heatmap.querySelector('#home-daily-heatmap'), {
      results: cachedSnapshot.heatmap.results,
      generatedAt: cachedSnapshot.generatedAt || cachedSnapshot.heatmap.generatedAt || ''
    }, {cached: true});
  }

  const picksTask = SHOW_SPOTLIGHT ? homeBootstrap()
    .then((payload) => {
      if (token !== generation || !sections.picks.isConnected) return;
      writeHomeFast('bootstrap', payload);
      paintPicks(sections.picks.querySelector('#home-top-picks'), payload);
    })
    .catch(() => {
      if (token !== generation || !sections.picks.isConnected) return;
      sections.picks.querySelector('#home-top-picks').innerHTML =
        '<div class="home-extra-empty"><strong>종목발굴을 불러오지 못했어요.</strong><span>스크리너 화면은 계속 사용할 수 있어요.</span></div>';
    }) : Promise.resolve();

  const heatmapTask = homeSnapshot()
    .then((snapshot) => {
      if (snapshot?.heatmap?.results?.length) {
        rememberLiveQuotes(snapshot.heatmap.results, { priority: 20 });
        writeHomeFast('snapshot', { ...snapshot, heatmap: { ...snapshot.heatmap, results: mergeRowsWithLive(snapshot.heatmap.results) } });
      }
      if (snapshot && snapshot.heatmap && Array.isArray(snapshot.heatmap.results) && snapshot.heatmap.results.length) {
        return { results: snapshot.heatmap.results, generatedAt: snapshot.generatedAt || snapshot.heatmap.generatedAt || '' };
      }
      return homeHeatmap();
    })
    .then((payload) => {
      if (token !== generation || !sections.heatmap.isConnected) return;
      paintHeatmap(sections.heatmap.querySelector('#home-daily-heatmap'), payload);
    })
    .catch(() => {
      if (token !== generation || !sections.heatmap.isConnected) return;
      const host = sections.heatmap.querySelector('#home-daily-heatmap');
      if (host.querySelector('.home-heatmap-cell')) {
        host.querySelector('.home-heatmap-meta').textContent = '새 시세 조회에 실패했어요. 이전 저장 시세의 기준시각은 종목 상세에서 확인해주세요.';
        return;
      }
      host.innerHTML =
        '<div class="home-extra-empty"><strong>히트맵을 불러오지 못했어요.</strong><span>시장 화면에서 다시 확인할 수 있어요.</span></div>';
    });

  await Promise.allSettled([picksTask, heatmapTask]);
}

document.addEventListener('chartview:home-live', (event) => {
  const host = document.querySelector('#home-daily-heatmap');
  const liveRows = Array.isArray(event.detail?.results) ? event.detail.results : [];
  if (!host || !liveRows.length) return;
  rememberLiveQuotes(liveRows, { priority: 30 });
  const canonicalRows = liveRows.map((row) => getLiveQuote(row?.ticker) || row);
  const cached = readHomeFast('snapshot', 6 * 60 * 60 * 1000);
  const baseRows = cached?.heatmap?.results;
  if (!Array.isArray(baseRows) || !baseRows.length) return;
  const rows = mergeLiveRows(baseRows, canonicalRows);
  const generatedAt = event.detail?.updatedAt || cached.generatedAt || cached.heatmap?.generatedAt || '';
  const next = {
    ...cached,
    generatedAt,
    heatmap: { ...(cached.heatmap || {}), results: rows, generatedAt }
  };
  writeHomeFast('snapshot', next);
  paintHeatmap(host, { results: rows, generatedAt });
});

function navigate(tab, symbol, name = '') {
  if (typeof window.__chartviewNavigate === 'function') {
    window.__chartviewNavigate(tab, symbol || null, name);
    return;
  }
  const hash = symbol ? '#' + tab + '/' + encodeURIComponent(symbol) : '#' + tab;
  window.location.assign('/' + hash);
}

document.addEventListener('click', (event) => {
  const routeButton = event.target.closest('[data-home-extra-route]');
  if (routeButton) {
    navigate(routeButton.dataset.homeExtraRoute);
    return;
  }
  const stockButton = event.target.closest('[data-home-extra-stock]');
  if (stockButton) navigate('detail', stockButton.dataset.homeExtraStock);
});

const observer = new MutationObserver(() => {
  void mount();
});

function start() {
  observer.observe(document.body, { childList: true, subtree: true });
  void mount();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
