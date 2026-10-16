import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInflationPayload, inflationChart, releaseTimeLabel, formatInflationRate } from '../src/macroInflationModel.js';

const NOW = Date.parse('2026-10-16T12:00:00Z');
const series = (id = 'cpi', extra = {}) => ({
  id, name: 'CPI', definition: '전체 소비자물가', unit: '%', status: 'ok', asOf: '2026-09',
  basis: { yoy: 'NSA', mom: 'SA' }, publishedAt: null,
  collectedAt: '2026-10-16T01:00:00Z', checkedAt: '2026-10-16T02:00:00Z', revisionStatus: 'unknown',
  source: { name: 'BLS via FRED', nsaUrl: 'https://fred.stlouisfed.org/series/CPIAUCNS', saUrl: 'https://fred.stlouisfed.org/series/CPIAUCSL' },
  points: [{ month: '2026-08', yoy: 2.9, mom: .2 }, { month: '2026-09', yoy: 3, mom: 0 }], ...extra,
});
const payload = rows => ({ inflation: { schemaVersion: 1, status: 'ok', series: rows } });

test('optional inflation data keeps four explicit slots without changing existing macro rows', () => {
  const raw = { results: [{ symbol: 'PCEPI', value: 2.5 }], ...payload([series()]) };
  const before = JSON.stringify(raw);
  const model = normalizeInflationPayload(raw, { now: NOW });
  assert.deepEqual(model.series.map(row => row.id), ['cpi', 'core_cpi', 'ppi', 'core_ppi']);
  assert.equal(model.status, 'partial');
  assert.equal(model.availableCount, 1);
  assert.equal(model.series[1].status, 'unavailable');
  assert.equal(model.series[0].points.at(-1).mom, 0);
  assert.equal(JSON.stringify(raw), before);
  assert.equal(normalizeInflationPayload({ results: raw.results }, { now: NOW }).status, 'unavailable');
});

test('blank and nonfinite rates remain missing while actual and numeric-string zero survive', () => {
  const points = [null, undefined, '', ' ', 'N/A', Infinity, false, [], {}].map((value, index) => ({ month: `2026-${String(index + 1).padStart(2, '0')}`, yoy: value, mom: value }));
  points.push({ month: '2026-10', yoy: '0', mom: 0 });
  const model = normalizeInflationPayload(payload([series('cpi', { points })]), { now: NOW });
  assert.ok(model.series[0].points.slice(0, -1).every(point => point.yoy === null && point.mom === null));
  assert.equal(model.series[0].points.at(-1).yoy, 0);
  assert.equal(formatInflationRate(null), '미제공');
  assert.equal(formatInflationRate(0), '0.0%');
});

test('rate basis, source URLs and timestamp meanings stay separate', () => {
  const row = normalizeInflationPayload(payload([series('core_ppi', {
    name: '근원 PPI', definition: '최종수요 · 식품·에너지 제외', source: { name: '<BLS>', nsaUrl: 'javascript:alert(1)', saUrl: 'https://fred.stlouisfed.org/series/WPSFD4131' },
  })]), { now: NOW }).series[3];
  assert.equal(row.basis.yoy, 'NSA');
  assert.equal(row.basis.mom, 'SA');
  assert.equal(row.source.nsaUrl, '');
  assert.equal(row.source.saUrl, 'https://fred.stlouisfed.org/series/WPSFD4131');
  assert.equal(row.publishedAt, null);
  assert.equal(row.collectedAt, '2026-10-16T01:00:00Z');
  assert.equal(row.checkedAt, '2026-10-16T02:00:00Z');
  assert.equal(row.revisionStatus, 'unknown');
});

test('duplicate series and duplicate month observations fail closed, stale observations remain visible', () => {
  assert.equal(normalizeInflationPayload(payload([series(), series()]), { now: NOW }).series[0].status, 'unavailable');
  const row = normalizeInflationPayload(payload([series('cpi', { asOf: '2026-04', points: [
    { month: '2026-03', yoy: 2, mom: .1 }, { month: '2026-03', yoy: 5, mom: .8 }, { month: '2026-04', yoy: 3, mom: .2 },
  ] })]), { now: NOW }).series[0];
  assert.equal(row.status, 'stale');
  assert.equal(row.points[0].yoy, null);
  assert.equal(row.points.at(-1).yoy, 3);
});

test('bounded chart uses calendar months and preserves gaps without interpolation', () => {
  const points = Array.from({ length: 60 }, (_, index) => ({ month: `${2021 + Math.floor((10 + index) / 12)}-${String((10 + index) % 12 + 1).padStart(2, '0')}`, yoy: index, mom: index / 10 }));
  const one = inflationChart(points, { rate: 'yoy', years: 1 });
  assert.equal(one.rows.length, 12);
  assert.equal(inflationChart(points, { rate: 'mom', years: 3 }).rows.length, 36);
  assert.equal(inflationChart(points, { rate: 'mom', years: 5 }).rows.length, 60);
  const gap = inflationChart([{ month: '2026-01', yoy: 0 }, { month: '2026-02', yoy: null }, { month: '2026-03', yoy: 2 }, { month: '2026-05', yoy: 3 }], { rate: 'yoy', years: 1 });
  assert.equal(gap.segments.length, 3);
  assert.equal(gap.rows[0].value, 0);
  assert.equal(gap.rows[1].value, null);
  assert.equal(gap.segments[2][0].month, '2026-05');
  assert.deepEqual(gap.missingMonths, ['2026-02', '2026-04']);
  assert.equal(gap.months, 5);
});

test('official agenda converts DST-aware UTC timestamps and never invents a KST time for date-only events', () => {
  assert.deepEqual(releaseTimeLabel({ scheduledAt: '2026-10-20T12:30:00Z', localDate: '2026-10-20', localTime: '08:30', timeZone: 'America/New_York', status: 'confirmed' }), {
    kst: '2026.10.20 21:30 KST', original: '2026.10.20 08:30 ET (EDT)', certainty: '일정 확정', timed: true,
  });
  assert.equal(releaseTimeLabel({ scheduledAt: '2026-11-10T13:30:00Z', timeZone: 'America/New_York', status: 'confirmed' }).kst, '2026.11.10 22:30 KST');
  const dateOnly = releaseTimeLabel({ localDate: '2026-10-20', status: 'confirmed' });
  assert.equal(dateOnly.kst, '한국 날짜·시각 미정');
  assert.equal(dateOnly.original, '2026.10.20 ET · 시간 미정');
  assert.equal(dateOnly.timed, false);
  assert.equal(releaseTimeLabel({ scheduledAt: '2026-10-20T08:30:00', localDate: '2026-10-20' }).timed, false);
});

test('agenda keeps only upcoming sourced events and exposes an independent failure', () => {
  const model = normalizeInflationPayload({ ...payload([series()]), releaseCalendar: { status: 'partial', checkedAt: '2026-10-16T02:00:00Z', events: [
    { id: 'past', name: '지난 발표', scheduledAt: '2026-10-15T12:30:00Z', sourceUrl: 'https://www.bls.gov/schedule/' },
    { id: 'future', name: '물가 발표', scheduledAt: '2026-11-10T13:30:00Z', observationMonth: '2026-10', status: 'confirmed', sourceUrl: 'https://www.bls.gov/schedule/' },
    { id: 'unsourced', name: '출처 없음', localDate: '2026-11-01' },
    { id: 'date', name: '날짜만 확정', localDate: '2026-10-20', status: 'confirmed', sourceUrl: 'https://www.bls.gov/schedule/' },
  ] } }, { now: NOW });
  assert.deepEqual(model.calendar.events.map(event => event.id), ['date', 'future']);
  assert.equal(model.calendar.status, 'partial');
  assert.equal(normalizeInflationPayload({ ...payload([series()]), releaseCalendar: { status: 'unavailable', events: [] } }, { now: NOW }).series[0].status, 'ok');
});
