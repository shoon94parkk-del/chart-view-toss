import { HOME_LOGOS } from './homeLogos.js';

export const HOME_STOCK_META = {
  '005930.KS': { name: '삼성전자', short: '삼성전자', market: 'KR', logo: 'samsung', fallback: '삼성' },
  '000660.KS': { name: 'SK하이닉스', short: 'SK하이닉스', market: 'KR', logo: 'skhynix', fallback: 'SK' },
  '207940.KS': { name: '삼성바이오로직스', short: '삼성바이오', market: 'KR', logo: 'samsungbio', fallback: '삼바' },
  '005380.KS': { name: '현대차', short: '현대차', market: 'KR', logo: 'hyundai', fallback: '현대' },
  '000270.KS': { name: '기아', short: '기아', market: 'KR', logo: 'kia', fallback: '기아' },
  '373220.KS': { name: 'LG에너지솔루션', short: 'LG엔솔', market: 'KR', logo: 'lgenergy', fallback: 'LG' },
  '035420.KS': { name: 'NAVER', short: 'NAVER', market: 'KR', logo: 'naver', fallback: 'N' },
  '068270.KS': { name: '셀트리온', short: '셀트리온', market: 'KR', logo: 'celltrion', fallback: '셀트' },
  '051910.KS': { name: 'LG화학', short: 'LG화학', market: 'KR', fallback: 'LG' },
  '006400.KS': { name: '삼성SDI', short: '삼성SDI', market: 'KR', fallback: 'SDI' },
  '055550.KS': { name: '신한지주', short: '신한지주', market: 'KR', fallback: '신한' },
  '105560.KS': { name: 'KB금융', short: 'KB금융', market: 'KR', fallback: 'KB' },
  '035720.KS': { name: '카카오', short: '카카오', market: 'KR', fallback: '카카오' },
  '086790.KS': { name: '하나금융지주', short: '하나금융', market: 'KR', fallback: '하나' },
  '066570.KS': { name: 'LG전자', short: 'LG전자', market: 'KR', fallback: 'LG' },
  '003550.KS': { name: 'LG', short: 'LG', market: 'KR', fallback: 'LG' },
  '003670.KS': { name: '포스코퓨처엠', short: '포스코퓨처엠', market: 'KR', fallback: '포스코' },
  '009150.KS': { name: '삼성전기', short: '삼성전기', market: 'KR', fallback: '삼전기' },
  '018260.KS': { name: '삼성SDS', short: '삼성SDS', market: 'KR', fallback: 'SDS' },
  '028260.KS': { name: '삼성물산', short: '삼성물산', market: 'KR', fallback: '물산' },
  NVDA: { name: '엔비디아', short: '엔비디아', market: 'US', logo: 'nvidia', fallback: 'NV' },
  AAPL: { name: '애플', short: '애플', market: 'US', logo: 'apple', fallback: 'A' },
  MSFT: { name: '마이크로소프트', short: 'MS', market: 'US', logo: 'microsoft', fallback: 'MS' },
  GOOGL: { name: '알파벳', short: '알파벳', market: 'US', logo: 'google', fallback: 'G' },
  AMZN: { name: '아마존', short: '아마존', market: 'US', logo: 'amazon', fallback: 'AM' },
  TSM: { name: 'TSMC', short: 'TSMC', market: 'US', logo: 'tsmc', fallback: 'TSM' },
  META: { name: '메타', short: '메타', market: 'US', logo: 'meta', fallback: 'M' },
  AVGO: { name: '브로드컴', short: '브로드컴', market: 'US', logo: 'broadcom', fallback: 'AV' },
  TSLA: { name: '테슬라', short: '테슬라', market: 'US', logo: 'tesla', fallback: 'T' },
  AMD: { name: 'AMD', short: 'AMD', market: 'US', logo: 'amd', fallback: 'AMD' },
};

const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}[char]));

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

const signedPct = (value) => {
  const numeric = finite(value);
  return `${numeric > 0 ? '+' : ''}${numeric.toFixed(2)}%`;
};

const formatKst = (value) => {
  if (!value) return '업데이트 시각 확인 중';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '업데이트 시각 확인 중';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date).replace(/\.$/, '');
};

const toneClass = (value) => {
  const numeric = finite(value);
  const magnitude = Math.abs(numeric);
  const level = magnitude >= 3 ? 3 : magnitude >= 1 ? 2 : magnitude >= 0.25 ? 1 : 0;
  if (!level) return 'home-hm-flat';
  return (numeric > 0 ? 'home-hm-up-' : 'home-hm-down-') + level;
};

const layoutTreemap = (items, x = 0, y = 0, width = 1, height = 1, output = []) => {
  if (!items.length) return output;
  if (items.length === 1) {
    output.push({ item: items[0].item, x, y, width, height });
    return output;
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
  return output;
};

const inferMarket = (ticker) => /\.(KS|KQ)$/.test(ticker) ? 'KR' : 'US';
const compactLabel = (ticker, name) => {
  const clean = String(name || '').replace(/\s+(Corporation|Corp\.?|Inc\.?|Co\.?|Ltd\.?|Holdings?)$/i, '').trim();
  if (!clean || clean.length > 10) return ticker.replace(/\.(KS|KQ)$/, '');
  return clean;
};

const marketRows = (payload, market, scope = 'home') => {
  const rows = Array.isArray(payload?.results) ? payload.results : [];
  return rows
    .map((row) => {
      const ticker = String(row?.ticker || row?.symbol || '').trim().toUpperCase();
      const meta = HOME_STOCK_META[ticker];
      if (scope === 'home' && !meta) return null;
      const resolvedMarket = meta?.market || row?.market || inferMarket(ticker);
      const resolvedName = meta?.name || row?.name || ticker;
      return {
        ...row,
        ticker,
        market: resolvedMarket,
        name: resolvedName,
        short: meta?.short || compactLabel(ticker, resolvedName),
        logo: meta?.logo || '',
        fallback: meta?.fallback || ticker.replace(/\.(KS|KQ)$/, '').slice(0, 3),
        marketCap: finite(row?.marketCap ?? row?.market_cap),
        change: finite(row?.change ?? row?.changePercent ?? row?.change_pct),
      };
    })
    .filter((row) => row && row.market === market && row.marketCap > 0)
    .sort((left, right) => right.marketCap - left.marketCap);
};

const heatmapMarketMarkup = (payload, market, scope = 'home') => {
  const rows = marketRows(payload, market, scope);
  const items = rows.map((item) => ({
    item,
    weight: market === 'KR' ? Math.pow(Math.max(1, item.marketCap), 0.58) : Math.max(1, item.marketCap),
  }));
  const rects = layoutTreemap(items);

  const full = scope === 'full';
  return rects.map(({ item, x, y, width, height }) => {
    const area = width * height;
    const size = area >= 0.12 ? 'is-large' : area >= 0.055 ? 'is-medium' : 'is-small';
    const hideLabel = full && (area < 0.006 || width < 0.048 || height < 0.075);
    const micro = full && !hideLabel && (area < 0.014 || width < 0.082 || height < 0.115);
    const tickerOnly = full && !hideLabel && (micro || area < 0.024 || width < 0.125 || height < 0.16);
    const veryTight = !full && (width < 0.145 || height < 0.18 || area < 0.028);
    const compact = tickerOnly || veryTight || width < 0.21 || height < 0.24 || area < 0.058;
    const tickerLabel = item.ticker.replace(/\.(KS|KQ)$/, '');
    const tinyLabel = market === 'KR' ? item.short : tickerLabel;
    const label = tickerOnly || veryTight ? tinyLabel : compact ? item.short : item.name;
    const logoSvg = item.logo && HOME_LOGOS[item.logo] ? HOME_LOGOS[item.logo] : '';
    const showLogo = Boolean(logoSvg) && !tickerOnly && !veryTight && area >= 0.05 && width >= 0.17 && height >= 0.18;
    const showFallback = !logoSvg && !compact && area >= 0.09 && width >= 0.22 && height >= 0.25;
    const mark = showLogo
      ? `<span class="home-heatmap-logo" aria-hidden="true">${logoSvg}</span>`
      : showFallback
        ? `<span class="home-heatmap-logo home-heatmap-logo-fallback" aria-hidden="true"><b>${esc(item.fallback)}</b></span>`
        : '';
    const labelMarkup = hideLabel
      ? ''
      : tickerOnly || veryTight
        ? `<strong class="home-heatmap-ticker">${esc(label)}</strong>`
        : `<span class="home-heatmap-name">${mark}<strong>${esc(label)}</strong></span>`;
    const change = signedPct(item.change);
    const showChange = !hideLabel && (
      full && market === 'US'
        ? width >= 0.045 && height >= 0.075
        : !micro && (!tickerOnly || height >= 0.14)
    );
    const classes = [toneClass(item.change), size, market === 'KR' ? 'market-kr-cell' : 'market-us-cell', hideLabel ? 'is-label-hidden' : '', micro ? 'is-micro' : '', tickerOnly ? 'is-ticker-only' : ''].filter(Boolean).join(' ');
    return `<div class="home-heatmap-cell ${classes}" style="left:${(x * 100).toFixed(3)}%;top:${(y * 100).toFixed(3)}%;width:${(width * 100).toFixed(3)}%;height:${(height * 100).toFixed(3)}%" role="button" tabindex="0" data-stock-detail="${esc(item.ticker)}" aria-label="${esc(item.name)} ${esc(change)}">${labelMarkup}${showChange ? `<span class="home-heatmap-change">${esc(change)}</span>` : ''}</div>`;
  }).join('');
};

export function renderSharedHeatmap(payload = {}, { scope = 'home' } = {}) {
  const kr = marketRows(payload, 'KR', scope);
  const us = marketRows(payload, 'US', scope);
  if (!kr.length && !us.length) {
    return '<div class="home-extra-empty">히트맵 데이터를 준비 중이에요.</div>';
  }

  const stamp = formatKst(payload.generatedAt || payload.updatedAt);
  const full = scope === 'full';
  return `<div class="home-heatmap-meta">업데이트 ${esc(stamp)} KST</div>
    <div class="home-heatmap-board ${full ? 'full-heatmap-board' : ''}">
      <div class="home-heatmap-market market-kr">
        <div class="home-heatmap-market-head"><strong>${full ? `한국 주요 ${kr.length}종목` : '한국 대표'}</strong><span>시총 영향 완화</span></div>
        <div class="home-heatmap-treemap">${heatmapMarketMarkup(payload, 'KR', scope)}</div>
      </div>
      <div class="home-heatmap-market market-us">
        <div class="home-heatmap-market-head"><strong>${full ? `미국 시총 상위 ${us.length}종목` : '미국 대표'}</strong><span>시총 비중</span></div>
        <div class="home-heatmap-treemap">${heatmapMarketMarkup(payload, 'US', scope)}</div>
      </div>
    </div>
    <div class="home-heatmap-legend"><span><i class="home-legend-dot up"></i>상승</span><span><i class="home-legend-dot flat"></i>보합</span><span><i class="home-legend-dot down"></i>하락</span></div>`;
}
