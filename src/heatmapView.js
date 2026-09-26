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
  if (numeric > 0.05) return 'up';
  if (numeric < -0.05) return 'down';
  return 'flat';
};

const layoutTreemap = (items, weightPower = 1) => {
  const weights = items.map((item) => Math.max(1, Math.pow(finite(item.marketCap, 1), weightPower)));
  const total = weights.reduce((sum, value) => sum + value, 0) || 1;
  const cells = [];
  let cursor = 0;
  items.forEach((item, index) => {
    const width = index === items.length - 1 ? 100 - cursor : (weights[index] / total) * 100;
    cells.push({ item, left: cursor, width });
    cursor += width;
  });
  return cells;
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
  const cells = layoutTreemap(rows, market === 'KR' ? 0.58 : 1);
  return cells.map(({ item, left, width }, index) => {
    const size = width >= 25 ? 'is-large' : width >= 12 ? 'is-medium' : 'is-small';
    const logo = item.logo && HOME_LOGOS[item.logo]
      ? `<span class="home-heatmap-logo" aria-hidden="true">${HOME_LOGOS[item.logo]}</span>`
      : '';
    const label = width >= 12 ? item.short : item.ticker.replace('.KS', '');
    const change = signedPct(item.change);
    const labelMarkup = width >= 10
      ? `<span class="home-heatmap-name">${logo}<strong>${esc(label)}</strong></span>`
      : `<strong class="home-heatmap-ticker">${esc(item.ticker.replace('.KS', ''))}</strong>`;
    return `<div class="home-heatmap-cell home-hm-${toneClass(item.change)} ${size}" style="left:${left}%;width:${width}%" role="button" tabindex="0" data-stock-detail="${esc(item.ticker)}" aria-label="${esc(item.name)} ${esc(change)}">${labelMarkup}<span class="home-heatmap-change">${esc(change)}</span></div>`;
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
