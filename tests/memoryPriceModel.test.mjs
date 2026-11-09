import test from 'node:test';
import assert from 'node:assert/strict';

import { memoryPriceSeries, memoryPriceSummary } from '../src/memoryPriceModel.js';

test('missing memory price history produces an empty series and an explicit empty summary', () => {
  for (const history of [undefined, null, [], {}, 'unavailable']) {
    assert.deepEqual(memoryPriceSeries(history, 'dram'), []);
  }
  assert.deepEqual(memoryPriceSummary([]), {
    count: 0, first: null, last: null, low: null, high: null,
    average: null, change: null, changePct: null,
  });
});

const observation = (date, value) => ({ date, values: { dram: value } });

test('chronological observations calculate dollar changes, percent changes and the starting index', () => {
  const points = memoryPriceSeries([
    observation('2026-11-09', 3), observation('2026-11-06', 4), observation('2026-11-08', 5),
  ], 'dram');
  assert.deepEqual(points, [
    { date: '2026-11-06', value: 4, change: null, changePct: null, index: 100 },
    { date: '2026-11-08', value: 5, change: 1, changePct: 25, index: 125 },
    { date: '2026-11-09', value: 3, change: -2, changePct: -40, index: 75 },
  ]);
});

test('summary reports observed extrema and arithmetic mean rather than a price sum', () => {
  const points = memoryPriceSeries([
    observation('2026-11-06', 4), observation('2026-11-08', 5), observation('2026-11-09', 3),
  ], 'dram');
  assert.deepEqual(memoryPriceSummary(points), {
    count: 3, first: points[0], last: points[2], low: points[2], high: points[1],
    average: 4, change: -1, changePct: -25,
  });
});

test('blank, nonfinite, negative and nonscalar prices cannot become observations', () => {
  const invalid = [null, undefined, '', ' \t\n', NaN, Infinity, -Infinity, -1, '-2',
    false, true, [], [3], {}, { valueOf: () => 4 }, () => 5, Symbol('price'), 3n, 'unavailable'];
  const history = invalid.map((value, index) => observation(`2026-10-${String(index + 1).padStart(2, '0')}`, value));
  history.push(null, { date: '2026-11-01' }, observation('2026-11-02', '0'), observation('2026-11-03', ' 2.5 '));
  assert.deepEqual(memoryPriceSeries(history, 'dram'), [
    { date: '2026-11-02', value: 0, change: null, changePct: null, index: null },
    { date: '2026-11-03', value: 2.5, change: 2.5, changePct: null, index: null },
  ]);
});

test('only exact real YYYY-MM-DD calendar dates enter the series', () => {
  const invalid = ['2026-02-29', '2026-02-30', '1900-02-29', '2026-04-31', '2026-00-10',
    '2026-13-01', '2026-11-00', '2026-11-32', '2026-1-01', '2026-01-1', ' 2026-11-01',
    '2026-11-01 ', '2026-11-01T00:00:00Z', 'not a date', '', null, undefined, 20261101];
  for (const date of invalid) {
    assert.deepEqual(memoryPriceSeries([observation(date, 4)], 'dram'), [], String(date));
  }
  assert.deepEqual(memoryPriceSeries([
    observation('2024-02-29', 4), observation('2000-02-29', 3), observation('2026-11-01', 5),
  ], 'dram').map(point => point.date), ['2000-02-29', '2024-02-29', '2026-11-01']);
});

test('duplicate dates use the latest finite product price and retain valid values after missing duplicates', () => {
  const points = memoryPriceSeries([
    observation('2026-11-02', 6), observation('2026-11-01', 4), observation('2026-11-01', '5'),
    observation('2026-11-02', 0), observation('2026-11-01', null), observation('2026-11-02', -3),
  ], 'dram');
  assert.deepEqual(points, [
    { date: '2026-11-01', value: 5, change: null, changePct: null, index: 100 },
    { date: '2026-11-02', value: 0, change: -5, changePct: -100, index: 0 },
  ]);
});

test('a product source date excludes later global-history observations', () => {
  const points = memoryPriceSeries([
    observation('2026-11-01', 4), observation('2026-11-03', 5), observation('2026-11-07', 8),
  ], 'dram', { sourceDate: '2026-11-05' });
  assert.deepEqual(points.map(point => [point.date, point.value]), [['2026-11-01', 4], ['2026-11-03', 5]]);
  assert.deepEqual(memoryPriceSeries([observation('2026-11-07', 8)], 'dram', { sourceDate: '2026-11-05' }), []);
});

test('one month uses an inclusive trailing 30 calendar days and rebases changes to the selected window', () => {
  const points = memoryPriceSeries([
    observation('2026-10-09', 1), observation('2026-10-10', 4), observation('2026-10-20', 5),
    observation('2026-11-08', 3), observation('2026-11-10', 10),
  ], 'dram', { period: '1m', sourceDate: '2026-11-09' });
  assert.deepEqual(points, [
    { date: '2026-10-10', value: 4, change: null, changePct: null, index: 100 },
    { date: '2026-10-20', value: 5, change: 1, changePct: 25, index: 125 },
    { date: '2026-11-08', value: 3, change: -2, changePct: -40, index: 75 },
  ]);
});

test('three months uses an inclusive trailing 90 calendar days across unequal month lengths', () => {
  const history = [
    observation('2026-08-10', 1), observation('2026-08-11', 4), observation('2026-11-09', 5),
  ];
  assert.deepEqual(memoryPriceSeries(history, 'dram', { period: '3m' }).map(point => point.date), ['2026-08-11', '2026-11-09']);
  assert.equal(memoryPriceSeries(history, 'dram', { period: 'all' }).length, 3);
});

test('without a valid source date the window anchors to the latest valid observation for that product', () => {
  const history = [
    observation('2026-08-31', 1), observation('2026-09-20', 2), observation('2026-10-01', 4),
    { date: '2026-11-01', values: { nand: 99 } }, observation('2026-11-02', null),
  ];
  for (const sourceDate of [undefined, '2026-02-30', '2026-11-01T00:00:00Z']) {
    assert.deepEqual(memoryPriceSeries(history, 'dram', { period: '1m', sourceDate }).map(point => point.date), ['2026-09-20', '2026-10-01']);
  }
});

test('a later valid source date can leave the trailing window empty without inventing recent prices', () => {
  const history = [observation('2026-10-20', 4)];
  assert.deepEqual(memoryPriceSeries(history, 'dram', { period: '1m', sourceDate: '2026-11-30' }), []);
  assert.equal(memoryPriceSeries(history, 'dram', { period: 'all', sourceDate: '2026-11-30' }).length, 1);
});

test('a lone positive observation has no previous change and a zero period change', () => {
  const points = memoryPriceSeries([observation('2026-11-09', 4)], 'dram');
  assert.deepEqual(points, [{ date: '2026-11-09', value: 4, change: null, changePct: null, index: 100 }]);
  assert.deepEqual(memoryPriceSummary(points), {
    count: 1, first: points[0], last: points[0], low: points[0], high: points[0],
    average: 4, change: 0, changePct: 0,
  });
});

test('actual zero prices survive while every ratio with a zero denominator stays null', () => {
  const points = memoryPriceSeries([
    observation('2026-11-01', 0), observation('2026-11-03', 4), observation('2026-11-09', 0),
  ], 'dram');
  assert.deepEqual(points, [
    { date: '2026-11-01', value: 0, change: null, changePct: null, index: null },
    { date: '2026-11-03', value: 4, change: 4, changePct: null, index: null },
    { date: '2026-11-09', value: 0, change: -4, changePct: -100, index: null },
  ]);
  assert.deepEqual(memoryPriceSummary(points), {
    count: 3, first: points[0], last: points[2], low: points[0], high: points[1],
    average: 4 / 3, change: 0, changePct: null,
  });
  const zero = memoryPriceSeries([observation('2026-11-01', 0)], 'dram');
  assert.equal(memoryPriceSummary(zero).average, 0);
  assert.equal(memoryPriceSummary(zero).changePct, null);
});

test('calendar windows preserve sparse observations without interpolating missing days or weighting gaps', () => {
  const points = memoryPriceSeries([
    observation('2024-02-29', 4), observation('2024-03-01', null), observation('2024-03-15', 8),
    observation('2024-03-30', 0),
  ], 'dram', { period: '1m', sourceDate: '2024-03-30' });
  assert.deepEqual(points.map(point => point.date), ['2024-02-29', '2024-03-15', '2024-03-30']);
  assert.equal(memoryPriceSummary(points).count, 3);
  assert.equal(memoryPriceSummary(points).average, 4);
});

test('normalization, filtering and summary leave frozen input observations unchanged', () => {
  const history = Object.freeze([
    Object.freeze({ date: '2026-11-09', values: Object.freeze({ dram: '5', nand: 99 }) }),
    Object.freeze({ date: '2026-11-01', values: Object.freeze({ dram: 4 }) }),
  ]);
  const before = JSON.stringify(history);
  const points = memoryPriceSeries(history, 'dram', { period: '1m', sourceDate: '2026-11-09' });
  assert.equal(points.length, 2);
  points.forEach(Object.freeze);
  Object.freeze(points);
  assert.equal(memoryPriceSummary(points).change, 1);
  assert.equal(JSON.stringify(history), before);
});
