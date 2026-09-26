import { HOME_LOGOS } from './homeLogos.js';

export const HOME_STOCK_META = {
  '005930.KS': { name: '삼성전자', short: '삼성전자', market: 'KR', logo: 'samsung' },
  '000660.KS': { name: 'SK하이닉스', short: 'SK하이닉스', market: 'KR', logo: 'skhynix' },
  '207940.KS': { name: '삼성바이오로직스', short: '삼성바이오', market: 'KR', logo: 'samsungbio' },
  '005380.KS': { name: '현대차', short: '현대차', market: 'KR', logo: 'hyundai' },
  '000270.KS': { name: '기아', short: '기아', market: 'KR', logo: 'kia' },
  '373220.KS': { name: 'LG에너지솔루션', short: 'LG엔솔', market: 'KR', logo: 'lgenergy' },
  '035420.KS': { name: 'NAVER', short: 'NAVER', market: 'KR', logo: 'naver' },
  '068270.KS': { name: '셀트리온', short: '셀트리온', market: 'KR', logo: 'celltrion' },
  NVDA: { name: '엔비디아', short: '엔비디아', market: 'US', logo: 'nvidia' },
  AAPL: { name: '애플', short: '애플', market: 'US', logo: 'apple' },
  MSFT: { name: '마이크로소프트', short: '마이크로소프트', market: 'US', logo: 'microsoft' },
  GOOGL: { name: '알파벳', short: '알파벳', market: 'US', logo: 'google' },
  AMZN: { name: '아마존', short: '아마존', market: 'US', logo: 'amazon' },
  TSM: { name: 'TSMC', short: 'TSMC', market: 'US', logo: 'tsmc' },
  META: { name: '메타', short: '메타', market: 'US', logo: 'meta' },
  AVGO: { name: '브로드컴', short: '브로드컴', market: 'US', logo: 'broadcom' },
  TSLA: { name: '테슬라', short: '테슬라', market: 'US', logo: 'tesla' },
  AMD: { name: 'AMD', short: 'AMD', market: 'US', logo: 'amd' },
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

const marketRows = (payload, market) => {
  const rows = Array.isArray(payload?.results) ? payload.results : [];
  return rows
    .map((row) => {
      const ticker = String(row?.ticker || row?.symbol || '').trim();
      const meta = HOME_STOCK_META[ticker];
      return {
        ...row,
        ticker,
        market: meta?.market || row?.market,
        name: meta?.name || row?.name || ticker,
        short: meta?.short || row?.name || ticker,
        logo: meta?.logo || '',
        marketCap: finite(row?.marketCap ?? row?.market_cap),
        change: finite(row?.change ?? row?.changePercent ?? row?.change_pct),
      };
    })
    .filter((row) => row.market === market && row.marketCap > 0)
    .sort((left, right) => right.marketCap - left.marketCap);
};

const heatmapMarketMarkup = (payload, market) => {
  const rows = marketRows(payload, market);
  const items = rows.map((item) => ({
    item,
    weight: market === 'KR' ? Math.pow(Math.max(1, item.marketCap), 0.58) : Math.max(1, item.marketCap),
  }));
  const rects = layoutTreemap(items);

  return rects.map(({ item, x, y, width, height }) => {
    const area = width * height;
    const size = area >= 0.12 ? 'is-large' : area >= 0.055 ? 'is-medium' : 'is-small';
    const veryTight = width < 0.145 || height < 0.18 || area < 0.028;
    const compact = veryTight || width < 0.21 || height < 0.24 || area < 0.058;
    const label = veryTight ? item.ticker.replace('.KS', '') : compact ? item.short : item.name;
    const logo = item.logo && HOME_LOGOS[item.logo]
      ? `<span class="home-heatmap-logo" aria-hidden="true">${HOME_LOGOS[item.logo]}</span>`
      : '';
    const showLogo = Boolean(logo) && !veryTight && area >= 0.05 && width >= 0.17 && height >= 0.18;
    const labelMarkup = showLogo || !veryTight
      ? `<span class="home-heatmap-name">${showLogo ? logo : ''}<strong>${esc(label)}</strong></span>`
      : `<strong class="home-heatmap-ticker">${esc(label)}</strong>`;
    const change = signedPct(item.change);
    return `<div class="home-heatmap-cell ${toneClass(item.change)} ${size}" style="left:${(x * 100).toFixed(3)}%;top:${(y * 100).toFixed(3)}%;width:${(width * 100).toFixed(3)}%;height:${(height * 100).toFixed(3)}%" role="button" tabindex="0" data-stock-detail="${esc(item.ticker)}" aria-label="${esc(item.name)} ${esc(change)}">${labelMarkup}<span class="home-heatmap-change">${esc(change)}</span></div>`;
  }).join('');
};

export function renderSharedHeatmap(payload = {}) {
  const kr = marketRows(payload, 'KR');
  const us = marketRows(payload, 'US');
  if (!kr.length && !us.length) {
    return '<div class="home-extra-empty">히트맵 데이터를 준비 중이에요.</div>';
  }

  const stamp = formatKst(payload.generatedAt || payload.updatedAt);
  return `<div class="home-heatmap-meta">업데이트 ${esc(stamp)} KST</div>
    <div class="home-heatmap-board">
      <div class="home-heatmap-market">
        <div class="home-heatmap-market-head"><strong>한국 대표</strong><span>시총 영향 완화</span></div>
        <div class="home-heatmap-treemap">${heatmapMarketMarkup(payload, 'KR')}</div>
      </div>
      <div class="home-heatmap-market">
        <div class="home-heatmap-market-head"><strong>미국 대표</strong><span>시총 비중</span></div>
        <div class="home-heatmap-treemap">${heatmapMarketMarkup(payload, 'US')}</div>
      </div>
    </div>
    <div class="home-heatmap-legend"><span><i class="home-legend-dot up"></i>상승</span><span><i class="home-legend-dot flat"></i>보합</span><span><i class="home-legend-dot down"></i>하락</span></div>`;
}
