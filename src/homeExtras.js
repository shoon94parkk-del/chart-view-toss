import { homeBootstrap, homeSnapshot, homeHeatmap } from './api.js';

const STOCK_META = {
  '005930.KS': { name: '삼성전자', market: 'KR' },
  '000660.KS': { name: 'SK하이닉스', market: 'KR' },
  '207940.KS': { name: '삼성바이오로직스', market: 'KR' },
  '005380.KS': { name: '현대차', market: 'KR' },
  '000270.KS': { name: '기아', market: 'KR' },
  '373220.KS': { name: 'LG에너지솔루션', market: 'KR' },
  '035420.KS': { name: 'NAVER', market: 'KR' },
  '068270.KS': { name: '셀트리온', market: 'KR' },
  'NVDA': { name: '엔비디아', market: 'US' },
  'AAPL': { name: '애플', market: 'US' },
  'MSFT': { name: '마이크로소프트', market: 'US' },
  'GOOGL': { name: '알파벳', market: 'US' },
  'AMZN': { name: '아마존', market: 'US' },
  'TSM': { name: 'TSMC', market: 'US' },
  'META': { name: '메타', market: 'US' },
  'AVGO': { name: '브로드컴', market: 'US' },
  'TSLA': { name: '테슬라', market: 'US' },
  'AMD': { name: 'AMD', market: 'US' }
};

const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const finite = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const signedPct = (value) => {
  const number = finite(value);
  if (number === null) return '-';
  return (number > 0 ? '+' : '') + number.toFixed(2) + '%';
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
        name: raw && raw.name || meta.name || ticker,
        market: meta.market || inferredMarket,
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
    const label = area < 0.045 ? rect.row.ticker.replace(/\.(KS|KQ)$/, '') : rect.row.name;
    return '<div class="home-heatmap-cell ' + toneClass(rect.row.change) + ' ' + sizeClass + '"' +
      ' style="left:' + (rect.x * 100).toFixed(3) + '%;top:' + (rect.y * 100).toFixed(3) + '%;width:' + (rect.width * 100).toFixed(3) + '%;height:' + (rect.height * 100).toFixed(3) + '%"' +
      ' role="img" aria-label="' + esc(rect.row.name + ' ' + signedPct(rect.row.change)) + '">' +
      '<strong>' + esc(label) + '</strong><span>' + esc(signedPct(rect.row.change)) + '</span></div>';
  }).join('');
}

function createSections(marketSection) {
  const picks = document.createElement('section');
  picks.className = 'section home-extra-section home-pick-section home-primary';
  picks.id = 'home-top-picks-section';
  picks.innerHTML =
    '<div class="section-head"><h2>오늘의 종목발굴 TOP3</h2><button type="button" class="text-button" data-home-extra-route="discover">스크리너</button></div>' +
    '<div id="home-top-picks" class="home-pick-list"><div class="skeleton home-extra-skeleton"></div></div>';

  const heatmap = document.createElement('section');
  heatmap.className = 'section home-extra-section home-heatmap-section home-primary';
  heatmap.id = 'home-daily-heatmap-section';
  heatmap.innerHTML =
    '<div class="section-head"><h2>오늘 등락 히트맵</h2><button type="button" class="text-button" data-home-extra-route="heatmap">전체보기</button></div>' +
    '<p class="home-extra-caption">대표 종목의 당일 등락률을 시가총액 비중으로 보여줘요.</p>' +
    '<div id="home-daily-heatmap"><div class="skeleton home-heatmap-skeleton"></div></div>';

  marketSection.insertAdjacentElement('afterend', picks);
  picks.insertAdjacentElement('afterend', heatmap);
  return { picks, heatmap };
}

function paintPicks(host, payload) {
  if (!host || !host.isConnected) return;
  const day = payload && payload.day;
  const rows = Array.isArray(day && day.top3) ? day.top3.slice(0, 3) : [];
  if (!rows.length) {
    host.innerHTML = '<div class="home-extra-empty"><strong>선정 종목을 준비 중이에요.</strong><span>최근 스크리닝이 완료되면 TOP3가 표시돼요.</span></div>';
    return;
  }

  const tradeDate = day && day.tradeDate || '';
  const dateLabel = tradeDate ? (tradeDate === kstDateKey() ? '오늘 선정 · ' : '최근 선정 · ') + tradeDate : '선정일 확인 중';

  host.innerHTML =
    '<div class="home-pick-meta">' + esc(dateLabel) + '</div>' +
    rows.map((row, index) => {
      const symbol = String(row && (row.symbol || row.ticker) || '').toUpperCase();
      const name = row && row.name || (STOCK_META[symbol] && STOCK_META[symbol].name) || symbol || '종목';
      const attrs = symbol ? ' data-home-extra-stock="' + esc(symbol) + '"' : ' disabled';
      return '<button type="button" class="home-pick-row"' + attrs + '>' +
        '<span class="home-pick-rank">' + (index + 1) + '</span>' +
        '<span class="home-pick-copy"><strong>' + esc(name) + '</strong><small>' + esc(symbol || '종목코드 미제공') + '</small></span>' +
        '<span class="home-pick-arrow" aria-hidden="true">›</span></button>';
    }).join('');
}

function paintHeatmap(host, payload) {
  if (!host || !host.isConnected) return;
  const kr = marketRows(payload, 'KR');
  const us = marketRows(payload, 'US');
  if (!kr.length && !us.length) {
    host.innerHTML = '<div class="home-extra-empty"><strong>히트맵 데이터를 준비 중이에요.</strong><span>시장 데이터가 갱신되면 자동으로 표시돼요.</span></div>';
    return;
  }

  const stamp = formatKst(payload && (payload.generatedAt || payload.updatedAt));
  host.innerHTML =
    '<div class="home-heatmap-meta">' + esc(stamp ? '업데이트 ' + stamp : '최신 가용 시세 기준') + '</div>' +
    '<div class="home-heatmap-board">' +
      '<div class="home-heatmap-market"><div class="home-heatmap-market-head"><strong>한국 대표</strong><span>시총 영향 완화</span></div><div class="home-heatmap-treemap">' + heatmapMarketMarkup(payload, 'KR') + '</div></div>' +
      '<div class="home-heatmap-market"><div class="home-heatmap-market-head"><strong>미국 대표</strong><span>시총 비중</span></div><div class="home-heatmap-treemap">' + heatmapMarketMarkup(payload, 'US') + '</div></div>' +
    '</div>' +
    '<div class="home-heatmap-legend"><span><i class="up"></i>상승</span><span><i class="flat"></i>보합</span><span><i class="down"></i>하락</span></div>';
}

let generation = 0;

async function mount() {
  const marketSection = document.querySelector('.market-section.home-primary');
  if (!marketSection || marketSection.dataset.homeExtrasMounted === '1') return;
  marketSection.dataset.homeExtrasMounted = '1';

  const token = ++generation;
  const sections = createSections(marketSection);

  const picksTask = homeBootstrap()
    .then((payload) => {
      if (token !== generation || !sections.picks.isConnected) return;
      paintPicks(sections.picks.querySelector('#home-top-picks'), payload);
    })
    .catch(() => {
      if (token !== generation || !sections.picks.isConnected) return;
      sections.picks.querySelector('#home-top-picks').innerHTML =
        '<div class="home-extra-empty"><strong>TOP3를 불러오지 못했어요.</strong><span>스크리너 화면은 계속 사용할 수 있어요.</span></div>';
    });

  const heatmapTask = homeSnapshot()
    .then((snapshot) => {
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
      sections.heatmap.querySelector('#home-daily-heatmap').innerHTML =
        '<div class="home-extra-empty"><strong>히트맵을 불러오지 못했어요.</strong><span>시장 화면에서 다시 확인할 수 있어요.</span></div>';
    });

  await Promise.allSettled([picksTask, heatmapTask]);
}

function navigate(tab, symbol) {
  if (typeof window.__chartviewNavigate === 'function') {
    window.__chartviewNavigate(tab, symbol || null);
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
