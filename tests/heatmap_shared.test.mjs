import test from 'node:test';
import assert from 'node:assert/strict';

import { renderSharedHeatmap } from '../src/heatmapView.js';

const payload = {
  generatedAt: '2026-09-26T10:00:00Z',
  results: [
    { ticker: '005930.KS', name: 'Samsung Electronics', marketCap: 520e12, change: 3.62 },
    { ticker: '000660.KS', name: 'SK hynix', marketCap: 210e12, change: 1.25 },
    { ticker: '207940.KS', name: 'Samsung Biologics', marketCap: 78e12, change: -1.29 },
    { ticker: '005380.KS', name: 'Hyundai Motor', marketCap: 63e12, change: -0.97 },
    { ticker: '000270.KS', name: 'Kia', marketCap: 52e12, change: -1.94 },
    { ticker: '373220.KS', name: 'LG Energy Solution', marketCap: 47e12, change: 0.43 },
    { ticker: '035420.KS', name: 'NAVER', marketCap: 39e12, change: -2.49 },
    { ticker: '068270.KS', name: 'Celltrion', marketCap: 36e12, change: -0.22 },
    { ticker: 'NVDA', name: 'NVIDIA', marketCap: 4.5e12, change: 0.22 },
    { ticker: 'AAPL', name: 'Apple', marketCap: 3.8e12, change: 1.53 },
    { ticker: 'MSFT', name: 'Microsoft', marketCap: 3.7e12, change: 3.66 },
    { ticker: 'GOOGL', name: 'Alphabet', marketCap: 3.0e12, change: 0.46 },
    { ticker: 'AMZN', name: 'Amazon', marketCap: 2.6e12, change: 0.12 },
    { ticker: 'TSM', name: 'TSMC', marketCap: 1.7e12, change: -0.12 },
    { ticker: 'META', name: 'Meta', marketCap: 1.6e12, change: -3.33 },
    { ticker: 'AVGO', name: 'Broadcom', marketCap: 1.5e12, change: 0.71 },
    { ticker: 'TSLA', name: 'Tesla', marketCap: 1.4e12, change: -1.50 },
    { ticker: 'AMD', name: 'AMD', marketCap: 0.45e12, change: 1.08 },
    { ticker: 'UNKNOWN', name: 'Should not render', market: 'US', marketCap: 99e12, change: 9.99 },
  ],
};

function geometry(html) {
  const pattern = /class="home-heatmap-cell [^"]+" style="left:([\d.]+)%;top:([\d.]+)%;width:([\d.]+)%;height:([\d.]+)%"/g;
  return [...html.matchAll(pattern)].map((match) => ({
    left: Number(match[1]),
    top: Number(match[2]),
    width: Number(match[3]),
    height: Number(match[4]),
  }));
}

test('shared heatmap fills both boards with two-dimensional market-cap geometry', () => {
  const html = renderSharedHeatmap(payload);
  const cells = geometry(html);

  assert.match(html, /home-heatmap-board/);
  assert.match(html, /한국 대표/);
  assert.match(html, /미국 대표/);
  assert.equal(cells.length, 18);
  assert.ok(cells.every((cell) => cell.width > 0 && cell.height > 0));
  assert.ok(new Set(cells.map((cell) => cell.top.toFixed(3))).size > 2, 'treemap must use multiple vertical bands');
  assert.ok(new Set(cells.map((cell) => cell.left.toFixed(3))).size > 2, 'treemap must use multiple horizontal bands');

  const area = cells.reduce((sum, cell) => sum + cell.width * cell.height, 0);
  assert.ok(Math.abs(area - 20000) < 10, `two market boards must stay filled; area=${area}`);
  assert.ok(Math.max(...cells.map((cell) => cell.top + cell.height)) >= 99.9);
  assert.ok(Math.max(...cells.map((cell) => cell.left + cell.width)) >= 99.9);
});

test('shared heatmap keeps curated labels, navigation hooks, logos and tone classes', () => {
  const html = renderSharedHeatmap(payload);

  assert.match(html, /data-stock-detail="005930\.KS"/);
  assert.match(html, /data-stock-detail="NVDA"/);
  assert.match(html, /삼성전자/);
  assert.match(html, /엔비디아/);
  assert.match(html, /home-heatmap-logo/);
  assert.match(html, /home-hm-up-[123]/);
  assert.match(html, /home-hm-down-[123]/);
  assert.match(html, /home-heatmap-legend/);
  assert.doesNotMatch(html, /Should not render/);
  assert.doesNotMatch(html, /data-stock-detail="UNKNOWN"/);
});

test('shared heatmap does not fall back to the legacy sector/static payload', () => {
  const html = renderSharedHeatmap({ results: [] });

  assert.match(html, /히트맵 데이터를 준비 중/);
  assert.doesNotMatch(html, /Technology/);
});


test('full heatmap scope accepts the expanded market set while Home stays curated', () => {
  const expanded = {
    ...payload,
    results: [
      ...payload.results,
      { ticker: 'NFLX', name: 'Netflix', market: 'US', marketCap: 0.39e12, change: -1.23 },
      { ticker: '055550.KS', name: '신한지주', market: 'KR', marketCap: 34e12, change: 0.74 },
    ],
  };
  const homeHtml = renderSharedHeatmap(expanded);
  const fullHtml = renderSharedHeatmap(expanded, { scope: 'full' });

  assert.doesNotMatch(homeHtml, /data-stock-detail="NFLX"/);
  assert.doesNotMatch(homeHtml, /data-stock-detail="055550\.KS"/);
  assert.match(fullHtml, /data-stock-detail="NFLX"/);
  assert.match(fullHtml, /data-stock-detail="055550\.KS"/);
  assert.match(fullHtml, /한국 주요 9종목/);
  assert.match(fullHtml, /미국 시총 상위 11종목/);
  assert.ok(geometry(fullHtml).length > geometry(homeHtml).length);
});
