import test from 'node:test';
import assert from 'node:assert/strict';

import { renderSharedHeatmap } from '../src/heatmapView.js';

const payload = {
  generatedAt: '2026-09-26T10:00:00Z',
  results: [
    { ticker: '005930.KS', name: 'Samsung Electronics', marketCap: 100, change: 3.62 },
    { ticker: 'NVDA', name: 'NVIDIA', marketCap: 200, change: 0.22 },
    { ticker: 'AAPL', name: 'Apple', marketCap: 150, change: -1.53 },
  ],
};

test('shared heatmap renders the Home Korean/US board and stock navigation hooks', () => {
  const html = renderSharedHeatmap(payload);

  assert.match(html, /home-heatmap-board/);
  assert.match(html, /한국 대표/);
  assert.match(html, /미국 대표/);
  assert.match(html, /data-stock-detail="005930\.KS"/);
  assert.match(html, /data-stock-detail="NVDA"/);
  assert.match(html, /삼성전자/);
  assert.match(html, /엔비디아/);
  assert.match(html, /home-heatmap-legend/);\n  assert.match(html, /style="[^"]*top:[^"]+;[^"]*height:[^"]+%/);
  assert.match(html, /style="[^"]*top:0(?:\\.0+)?%;[^"]*height:[^"]+%/);
});

test('shared heatmap does not fall back to the legacy sector/static payload', () => {
  const html = renderSharedHeatmap({ results: [] });

  assert.match(html, /히트맵 데이터를 준비 중/);
  assert.doesNotMatch(html, /Technology/);
});
