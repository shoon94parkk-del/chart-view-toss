import test from 'node:test';
import assert from 'node:assert/strict';

const view = await import('../src/chartEvidence.js').catch(() => ({}));
const row = (extra = {}) => ({ symbol: 'AAPL', title: '관련 기사', source: '공식 뉴스', url: 'https://example.com/article', publishedAt: '2026-10-15T21:30:00Z', relationType: 'direct', ...extra });
const points = (...dates) => dates.map(time => ({ time, value: 100 }));
const build = (rows, chartPoints = points('2026-10-15'), symbol = 'AAPL') => {
  assert.equal(typeof view.buildChartEvidence, 'function', 'evidence model is available');
  return view.buildChartEvidence({ rows, points: chartPoints, symbol });
};

test('publication date uses the issuer market while timestamps display in KST', () => {
  assert.equal(typeof view.normalizeChartPublication, 'function');
  const us = view.normalizeChartPublication(row(), 'AAPL');
  assert.equal(us.date, '2026-10-15');
  assert.equal(us.timeZone, 'America/New_York');
  assert.match(us.display, /2026\.10\.16 06:30 KST/);
  const kr = view.normalizeChartPublication(row(), '005930.KS');
  assert.equal(kr.date, '2026-10-16');
  assert.equal(kr.timeZone, 'Asia/Seoul');
});

test('US DST boundary follows New York calendar instead of a fixed offset', () => {
  assert.equal(typeof view.normalizeChartPublication, 'function');
  assert.equal(view.normalizeChartPublication({ publishedAt: '2026-03-09T04:30:00Z' }, 'AAPL').date, '2026-03-09');
  assert.equal(view.normalizeChartPublication({ publishedAt: '2026-03-08T04:30:00Z' }, 'AAPL').date, '2026-03-07');
  assert.equal(view.normalizeChartPublication({ publishedAt: '2026-11-02T04:30:00Z' }, 'AAPL').date, '2026-11-01');
});

test('date-only publication keeps date precision without inventing a KST instant', () => {
  const event = build([row({ publishedAt: '2026-10-15' })]).events[0];
  assert.equal(event.publication.date, '2026-10-15');
  assert.equal(event.publication.precision, 'day');
  assert.equal(event.publication.timestamp, null);
  assert.match(event.publication.display, /시각 미제공/);
  assert.doesNotMatch(event.publication.display, /00:00|KST/);
});

test('publishedTs seconds and milliseconds are observed publication fallbacks only', () => {
  for (const publishedTs of [1792099800, 1792099800000]) {
    assert.equal(build([row({ publishedAt: null, publishedTs })]).events[0].publication.date, '2026-10-15');
  }
  const event = build([row({ publishedAt: null, collectedAt: '2026-10-15T01:00:00Z', generatedAt: '2026-10-15T01:00:00Z', checkedAt: '2026-10-15T01:00:00Z' })]).events[0];
  assert.equal(event.publication, null);
  assert.ok(event.reasons.includes('missing-publication'));
});

test('invalid dates and ambiguous wall clock strings never become marker dates', () => {
  for (const publishedAt of ['2026-02-30', '2026-02-30T12:00:00Z', '2026-10-15T12:00:00', 'yesterday', '2026-10-15T25:00:00Z']) {
    const result = build([row({ publishedAt })]);
    assert.equal(result.events[0].publication, null, publishedAt);
    assert.equal(result.markers.length, 0);
  }
});

test('weekend articles stay unplotted and after-hours publication stays on its actual date', () => {
  const result = build([
    row({ url: 'https://example.com/weekend', publishedAt: '2026-10-17T16:00:00Z' }),
    row({ url: 'https://example.com/after', publishedAt: '2026-10-16T01:00:00Z' }),
  ], points('2026-10-15', '2026-10-16', '2026-10-19'));
  assert.equal(result.markers.length, 1);
  assert.equal(result.markers[0].time, '2026-10-15');
  assert.equal(result.events.find(event => event.url.endsWith('/weekend')).publication.date, '2026-10-17');
  assert.ok(result.events.find(event => event.url.endsWith('/weekend')).reasons.includes('missing-chart-point'));
});

test('exact-date clusters use existing chart point time and keep events outside short coverage listed', () => {
  const result = build([
    row(), row({ url: 'https://example.com/two', publishedAt: '2026-10-15T22:00:00Z' }),
    row({ url: 'https://example.com/old', publishedAt: '2026-09-01' }),
  ], [{ time: { year: 2026, month: 10, day: 15 }, value: 100 }]);
  assert.equal(result.events.length, 3);
  assert.equal(result.markers.length, 1);
  assert.deepEqual(result.markers[0].time, { year: 2026, month: 10, day: 15 });
  assert.match(result.markers[0].text, /관련 기사 2/);
  assert.ok(result.events.find(event => event.url.endsWith('/old')).reasons.includes('outside-chart-range'));
});

test('wrong-symbol rows are excluded before exact URL deduplication', () => {
  const result = build([row({ symbol: 'NVDA', relationType: 'related' }), row(), row(), row({ url: 'https://example.com/article?edition=2' }), row({ symbol: undefined, url: 'https://example.com/unknown' })]);
  assert.equal(result.events.length, 2);
  assert.ok(result.events.every(event => event.symbol === 'AAPL'));
  assert.equal(result.events[0].relation.label, '직접 관련');
});

test('only strict credential-free HTTPS article URLs can be opened or marked', () => {
  for (const url of [null, '', 'http://example.com/a', 'javascript:alert(1)', '//example.com/a', 'https:///example.com/a', 'https://user:pass@example.com/a', 'https://example.com/a\n', 'https://example.com/\\evil']) {
    const result = build([row({ url })]);
    assert.equal(result.events.length, 1, String(url));
    assert.equal(result.events[0].url, null, String(url));
    assert.equal(result.markers.length, 0, String(url));
    assert.ok(result.events[0].reasons.includes('missing-source-url'));
  }
});

test('missing chart points remain explicit and model construction never mutates input', () => {
  const rows = [row(), row({ url: 'https://example.com/b', publishedAt: null })];
  const chartPoints = points('2026-10-14', '2026-10-16');
  const before = structuredClone({ rows, chartPoints });
  const result = build(rows, chartPoints);
  assert.ok(result.events[0].reasons.includes('missing-chart-point'));
  assert.equal(result.markers.length, 0);
  assert.deepEqual({ rows, chartPoints }, before);
  assert.ok(build([row()], []).events[0].reasons.includes('chart-unavailable'));
});

// A minimal document supports native button semantics without browser or DOM dependencies.
class Element {
  constructor(tag, document) { this.tagName = tag; this.ownerDocument = document; this.children = []; this.attributes = {}; this.listeners = {}; this._text = ''; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(' '); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  append(...children) { for (const child of children) { this.children.push(child); child.parentNode = this; } }
  appendChild(child) { this.append(child); return child; }
  replaceChildren(...children) { this.children.forEach(child => { child.parentNode = null; }); this.children = []; this._text = ''; this.append(...children); }
  addEventListener(type, listener) { (this.listeners[type] ||= new Set()).add(listener); }
  removeEventListener(type, listener) { this.listeners[type]?.delete(listener); }
  click() { if (!this.disabled) for (const listener of this.listeners.click || []) listener({ currentTarget: this }); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(child => child !== this); this.parentNode = null; }
}
function host() { const document = { createElement: tag => new Element(tag, document) }; return document.createElement('div'); }
function find(element, predicate) { if (predicate(element)) return element; for (const child of element.children) { const match = find(child, predicate); if (match) return match; } }
function fakeSeries() { return { calls: [], current: [], setMarkers(markers) { this.calls.push(markers); this.current = markers; }, markers() { return this.current; } }; }
const toggle = element => find(element, child => child.getAttribute('aria-pressed') !== null);

test('marker toggle starts off, uses native buttons, exposes source/time/relation and cleanup removes only its markers', () => {
  assert.equal(typeof view.mountChartEvidence, 'function');
  const element = host(), series = fakeSeries(), opened = [];
  const cleanup = view.mountChartEvidence(element, { series, points: points('2026-10-15'), rows: [row({ title: '<img src=x>' })], symbol: 'AAPL', onExternal: url => opened.push(url) });
  assert.equal(series.calls.length, 0);
  assert.equal(toggle(element).tagName, 'button');
  assert.equal(toggle(element).getAttribute('aria-pressed'), 'false');
  assert.match(element.textContent, /공식 뉴스.*KST.*직접 관련/s);
  assert.match(element.textContent, /현재 조회된 기사 범위/);
  assert.match(element.textContent, /주가 변동의 원인/);
  const article = find(element, child => child.tagName === 'button' && child.textContent.includes('<img src=x>'));
  article.click();
  assert.deepEqual(opened, ['https://example.com/article']);
  toggle(element).click();
  assert.equal(toggle(element).getAttribute('aria-pressed'), 'true');
  assert.equal(series.current.length, 1);
  toggle(element).click();
  assert.deepEqual(series.current, []);
  toggle(element).click();
  cleanup(); cleanup(); article.click();
  assert.deepEqual(series.current, []);
  assert.equal(element.children.length, 0);
  assert.equal(opened.length, 1);
});

test('pending news, ready empty and failed news have distinct visible states', () => {
  assert.equal(typeof view.mountChartEvidence, 'function');
  const element = host();
  const cleanup = view.mountChartEvidence(element, { symbol: 'AAPL' });
  assert.match(element.textContent, /기사를 불러오는 중/);
  cleanup.update({ rows: [] });
  assert.match(element.textContent, /확인된 관련 기사가 없어요/);
  cleanup.update({ newsState: 'error' });
  assert.match(element.textContent, /기사를 불러오지 못/);
  cleanup();
});

test('US article coverage explicitly limits recent news rather than implying full chart history', () => {
  const element = host();
  const cleanup = view.mountChartEvidence(element, { symbol: 'AAPL', rows: [row()] });
  assert.match(element.textContent, /미국 기사.*최근 4일/);
  assert.match(element.textContent, /전체 차트 기간의 기사 이력이 아니/);
  cleanup.update({ symbol: '005930.KS', rows: [] });
  assert.doesNotMatch(element.textContent, /미국 기사.*최근 4일/);
  assert.match(element.textContent, /현재 조회된 기사 범위/);
  cleanup();
});

test('partial news exposes verified articles and markers with an explicit partial warning', () => {
  const element = host(), series = fakeSeries(), opened = [];
  const cleanup = view.mountChartEvidence(element, { series, symbol: 'AAPL', points: points('2026-10-15'), rows: [row({ title: 'Verified partial receipt' })], newsState: 'partial', onExternal: url => opened.push(url) });
  assert.match(element.textContent, /일부 관련 기사를 불러오지 못/);
  assert.match(element.textContent, /확인된 기사만 표시/);
  assert.match(element.textContent, /Verified partial receipt/);
  assert.equal(toggle(element).disabled, false);
  find(element, child => child.tagName === 'button' && child.textContent.includes('Verified partial receipt')).click();
  assert.deepEqual(opened, ['https://example.com/article']);
  toggle(element).click();
  assert.equal(series.current.length, 1);
  cleanup.update({ newsState: 'error' });
  assert.match(element.textContent, /관련 기사를 불러오지 못/);
  assert.doesNotMatch(element.textContent, /확인된 관련 기사가 없어요|Verified partial receipt/);
  assert.equal(toggle(element).disabled, true);
  assert.deepEqual(series.current, []);
  cleanup.update({ newsState: 'partial' });
  assert.equal(toggle(element).disabled, false);
  assert.equal(series.current.length, 1, 'verified rows restore the retained marker preference');
  cleanup.update({ rows: [] });
  assert.match(element.textContent, /일부 관련 기사를 불러오지 못/);
  assert.doesNotMatch(element.textContent, /확인된 관련 기사가 없어요/);
  cleanup();
});

test('series replacement retains toggle choice and stale cleanup never changes a newer mount', () => {
  assert.equal(typeof view.mountChartEvidence, 'function');
  const element = host(), first = fakeSeries(), second = fakeSeries();
  const cleanup = view.mountChartEvidence(element, { series: first, rows: [row()], points: points('2026-10-15'), symbol: 'AAPL' });
  toggle(element).click();
  cleanup.update({ series: second });
  assert.deepEqual(first.current, []);
  assert.equal(second.current.length, 1);
  const newerHost = host();
  const newer = view.mountChartEvidence(newerHost, { series: second, rows: [row({ url: 'https://example.com/newer' })], points: points('2026-10-15'), symbol: 'AAPL' });
  toggle(newerHost).click();
  const calls = second.calls.length;
  cleanup();
  assert.equal(second.calls.length, calls);
  assert.equal(second.current.length, 1);
  newer();
});

test('an OFF replacement mount removes inherited evidence and both cleanup orders preserve unrelated markers', () => {
  for (const order of ['old-first', 'replacement-first']) {
    const oldHost = host(), replacementHost = host(), series = fakeSeries();
    const unrelated = { time: '2026-10-15', id: 'other-feature', text: '기존 표시', position: 'aboveBar', color: 'black', shape: 'circle' };
    series.current = [unrelated];
    const old = view.mountChartEvidence(oldHost, { series, rows: [row()], points: points('2026-10-15'), symbol: 'AAPL' });
    assert.equal(series.calls.length, 0, 'fresh OFF mount must preserve original chart paint');
    toggle(oldHost).click();
    assert.equal(series.current.length, 2);
    const replacement = view.mountChartEvidence(replacementHost, { series, rows: [row({ symbol: 'NVDA' })], points: points('2026-10-15'), symbol: 'NVDA' });
    assert.equal(toggle(replacementHost).getAttribute('aria-pressed'), 'false');
    assert.deepEqual(series.current, [unrelated], 'OFF replacement must remove previous issuer evidence immediately');
    const cleanups = order === 'old-first' ? [old, replacement] : [replacement, old];
    for (const cleanup of cleanups) {
      cleanup();
      assert.deepEqual(series.current, [unrelated], order);
    }
  }
});

test('disposed series errors do not interrupt toggles or cleanup, and unrelated markers survive', () => {
  assert.equal(typeof view.mountChartEvidence, 'function');
  const element = host(), series = fakeSeries();
  const unrelated = { time: '2026-10-15', id: 'other-feature', text: '기존 표시', position: 'aboveBar', color: 'black', shape: 'circle' };
  series.current = [unrelated];
  const cleanup = view.mountChartEvidence(element, { series, rows: [row()], points: points('2026-10-15'), symbol: 'AAPL' });
  toggle(element).click();
  assert.ok(series.current.includes(unrelated));
  toggle(element).click();
  assert.deepEqual(series.current, [unrelated]);
  series.setMarkers = () => { throw new Error('Object is disposed'); };
  assert.doesNotThrow(() => toggle(element).click());
  assert.doesNotThrow(cleanup);
});

test('only real finite chart observations permit a marker, including genuine zero', () => {
  for (const value of [null, undefined, '', NaN, Infinity]) {
    const result = build([row()], [{ time: '2026-10-15', value }]);
    assert.equal(result.markers.length, 0);
    assert.ok(result.events[0].reasons.includes('chart-unavailable'));
  }
  assert.equal(build([row()], [{ time: '2026-10-15', value: 0 }]).markers.length, 1);
  assert.equal(build([row()], [{ time: 1792022400, value: 100 }]).markers[0].time, 1792022400);
});

test('symbol updates clear old markers and pending rows without carrying previous article identity', () => {
  const element = host(), series = fakeSeries();
  const cleanup = view.mountChartEvidence(element, { series, rows: [row({ title: 'Apple old receipt' })], points: points('2026-10-15'), symbol: 'AAPL' });
  toggle(element).click();
  cleanup.update({ symbol: 'NVDA' });
  assert.deepEqual(series.current, []);
  assert.match(element.textContent, /기사를 불러오는 중/);
  assert.doesNotMatch(element.textContent, /Apple old receipt/);
  assert.equal(toggle(element).getAttribute('aria-pressed'), 'false');
  cleanup.update({ series, points: points('2026-10-15'), rows: [row({ symbol: 'NVDA', title: 'Nvidia new receipt', relationType: 'related' })] });
  assert.match(element.textContent, /Nvidia new receipt.*업종 관련/s);
  assert.equal(series.current.length, 0);
  cleanup();
  const count = series.calls.length;
  cleanup.update({ series, rows: [row()] });
  assert.equal(series.calls.length, count);
  assert.equal(element.children.length, 0);
});

test('a removed chart whose marker reader throws still allows safe cleanup and series replacement', () => {
  const element = host(), first = fakeSeries(), second = fakeSeries();
  const cleanup = view.mountChartEvidence(element, { series: first, rows: [row()], points: points('2026-10-15'), symbol: 'AAPL' });
  toggle(element).click();
  first.markers = () => { throw new Error('Object is disposed'); };
  assert.doesNotThrow(() => cleanup.update({ series: second }));
  assert.equal(second.current.length, 1);
  assert.doesNotThrow(cleanup);
  assert.deepEqual(second.current, []);
});
