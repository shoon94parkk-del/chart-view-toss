import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMacroInflation, mountMacroInflation } from '../src/macroInflationView.js';

const NOW = Date.parse('2026-10-16T12:00:00Z');
const row = (id, name) => ({ id, name, definition: '식품·에너지 제외 <검증>', unit: '%', status: 'ok', asOf: '2026-09', basis: { yoy: 'NSA', mom: 'SA' }, revisionStatus: 'unknown', collectedAt: '2026-10-16T01:00:00Z', checkedAt: '2026-10-16T02:00:00Z', source: { name: 'BLS via FRED', nsaUrl: 'https://fred.stlouisfed.org/series/TEST_NSA', saUrl: 'https://fred.stlouisfed.org/series/TEST_SA' }, points: [{ month: '2026-08', yoy: 2.5, mom: .1 }, { month: '2026-09', yoy: 2.6, mom: 0 }] });
const fixture = () => ({ inflation: { schemaVersion: 1, status: 'ok', series: [row('cpi', 'CPI'), row('core_cpi', '근원 CPI'), row('ppi', 'PPI'), row('core_ppi', '근원 PPI')] }, releaseCalendar: { status: 'ok', checkedAt: '2026-10-16T02:00:00Z', sourceUrl: 'https://www.bls.gov/schedule/', events: [{ id: 'cpi:2026-10', name: '미국 CPI', observationMonth: '2026-10', scheduledAt: '2026-11-10T13:30:00Z', status: 'confirmed', sourceUrl: 'https://www.bls.gov/schedule/' }] } });

test('inflation screen reads four actual series, accessible chart and raw table with separate metadata', () => {
  const html = renderMacroInflation(fixture(), { now: NOW });
  for (const id of ['cpi', 'core_cpi', 'ppi', 'core_ppi']) assert.match(html, new RegExp(`data-inflation-series="${id}"`));
  assert.match(html, /전년 동월 대비/);
  assert.match(html, /전월 대비/);
  assert.match(html, /비계절조정 \(NSA\)/);
  assert.match(html, /계절조정 \(SA\)/);
  assert.match(html, /공식 발표[\s\S]*미제공/);
  assert.match(html, /수집[\s\S]*마지막 확인/);
  assert.match(html, /2026\.10\.16 10:00 KST/);
  assert.match(html, /수정 여부 미확인/);
  assert.match(html, /<svg[^>]+role="img"[^>]+aria-labelledby=/);
  assert.match(html, /<table[\s\S]*<caption>[\s\S]*월별 변화율/);
  assert.match(html, /0\.0%/);
  assert.match(html, /2026\.11\.10 22:30 KST/);
  assert.match(html, /08:30 ET \(EST\)/);
  assert.doesNotMatch(html, /식품·에너지 제외 <검증>/);
  assert.match(html, /식품·에너지 제외 &lt;검증&gt;/);
});

test('rate toggle changes value, basis and original source together without recalculation', () => {
  const html = renderMacroInflation(fixture(), { now: NOW, selectedId: 'core_ppi', rate: 'mom', years: 5 });
  assert.match(html, /data-inflation-rate="mom" aria-pressed="true"/);
  assert.match(html, /data-inflation-years="5" aria-pressed="true"/);
  assert.match(html, /data-inflation-series="core_ppi" aria-pressed="true"/);
  assert.match(html, /data-inflation-value>0\.0%/);
  assert.match(html, /data-external-url="https:\/\/fred.stlouisfed.org\/series\/TEST_SA"/);
  assert.match(html, /단위 % · 계절조정 \(SA\)/);
});

test('missing inflation and missing calendar render independently without invented values', () => {
  const data = fixture(); data.inflation.series = [data.inflation.series[0]]; data.releaseCalendar = { status: 'unavailable', events: [] };
  const html = renderMacroInflation(data, { now: NOW, canRetry: true });
  assert.match(html, /1\/4종/);
  assert.match(html, /일부 물가 자료가 없거나/);
  assert.match(html, /발표 일정을 확인하지 못했어요/);
  assert.match(html, /data-inflation-value>2\.6%/);
  assert.match(html, /data-inflation-series="ppi"[^>]+disabled/);
  const empty = renderMacroInflation({}, { now: NOW });
  assert.match(empty, /물가 자료를 확인하지 못했어요/);
  assert.doesNotMatch(empty, /data-inflation-value>0/);
  assert.doesNotMatch(empty, /<svg/);
});

test('stale and date-only states stay explicit while usable data remains readable', () => {
  const data = fixture(); data.inflation.series[0].status = 'stale'; data.releaseCalendar.events[0] = { name: '미국 CPI', localDate: '2026-10-20', status: 'confirmed', sourceUrl: 'https://www.bls.gov/schedule/' };
  const html = renderMacroInflation(data, { now: NOW });
  assert.match(html, /관측일 확인 필요/);
  assert.match(html, /한국 날짜·시각 미정/);
  assert.match(html, /일자 확정 · 시간 미정/);
  assert.doesNotMatch(html, /2026\.10\.20 09:00 KST/);
});

test('selected-rate coverage names missing months and a long agenda starts compact', () => {
  const data = fixture();
  data.inflation.series[0].points = [{ month: '2025-10', yoy: null, mom: null }, { month: '2025-11', yoy: 2.6, mom: null }, { month: '2025-12', yoy: 2.7, mom: .2 }];
  data.inflation.series[0].asOf = '2025-12';
  data.releaseCalendar.events = Array.from({ length: 10 }, (_, index) => ({ id: `event-${index}`, name: `공식 발표 ${index + 1}`, localDate: `2026-11-${String(index + 1).padStart(2, '0')}`, status: 'confirmed', sourceUrl: 'https://www.bls.gov/schedule/' }));
  const html = renderMacroInflation(data, { now: NOW, rate: 'mom' });
  assert.match(html, /실제 관측 1\/3개월/);
  assert.match(html, /미제공 관측월 2025\.10, 2025\.11/);
  assert.match(html, /<details class="inflation-agenda-more"><summary>다음 일정 8개 더 보기/);
  assert.match(html, /공식 발표 10/);
});

test('mount scopes controls to its host, uses callbacks and removes its listener on cleanup', async () => {
  const listeners = new Map();
  const host = { innerHTML: '', addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name); }, contains: node => node.inside === true, querySelector: () => null };
  const opened = [], retries = [];
  const cleanup = mountMacroInflation(host, fixture(), { now: NOW, onExternal: url => opened.push(url), onRetry: () => retries.push(true) });
  const click = attrs => { const button = { inside: true, dataset: attrs, disabled: false, getAttribute: name => name === 'data-external-url' ? attrs.externalUrl : null }; return listeners.get('click')?.({ target: { closest: () => button }, preventDefault() {} }); };
  click({ inflationRate: 'mom' });
  assert.match(host.innerHTML, /data-inflation-rate="mom" aria-pressed="true"/);
  click({ inflationSeries: 'ppi' });
  assert.match(host.innerHTML, /data-inflation-series="ppi" aria-pressed="true"/);
  await click({ externalUrl: 'https://www.bls.gov/schedule/' });
  assert.deepEqual(opened, ['https://www.bls.gov/schedule/']);
  await click({ inflationRetry: '' });
  assert.equal(retries.length, 1);
  cleanup();
  assert.equal(listeners.has('click'), false);
});
