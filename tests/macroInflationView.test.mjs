import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMacroInflation, mountMacroInflation } from '../src/macroInflationView.js';

const NOW = Date.parse('2026-10-16T12:00:00Z');
const row = (id, name) => ({ id, name, definition: '식품·에너지 제외 <검증>', unit: '%', status: 'ok', asOf: '2026-09', basis: { yoy: 'NSA', mom: 'SA' }, revisionStatus: 'unknown', collectedAt: '2026-10-16T01:00:00Z', checkedAt: '2026-10-16T02:00:00Z', source: { name: 'BLS via FRED', nsaUrl: 'https://fred.stlouisfed.org/series/TEST_NSA', saUrl: 'https://fred.stlouisfed.org/series/TEST_SA' }, points: [{ month: '2026-08', yoy: 2.5, mom: .1 }, { month: '2026-09', yoy: 2.6, mom: 0 }] });
const fixture = () => ({ inflation: { schemaVersion: 1, status: 'ok', series: [row('cpi', 'CPI'), row('core_cpi', '근원 CPI'), row('ppi', 'PPI'), row('core_ppi', '근원 PPI'), ...['pce', 'core_pce'].map(id => ({ ...row(id, id === 'pce' ? 'PCE' : '근원 PCE'), basis: { yoy: 'SA', mom: 'SA' } }))] }, releaseCalendar: { status: 'ok', checkedAt: '2026-10-16T02:00:00Z', sourceUrl: 'https://www.bls.gov/schedule/', events: [{ id: 'cpi:2026-10', name: '미국 CPI', observationMonth: '2026-10', scheduledAt: '2026-11-10T13:30:00Z', status: 'confirmed', sourceUrl: 'https://www.bls.gov/schedule/' }] } });

test('inflation screen reads six actual series, accessible chart and raw table with separate metadata', () => {
  const html = renderMacroInflation(fixture(), { now: NOW });
  for (const id of ['cpi', 'core_cpi', 'ppi', 'core_ppi', 'pce', 'core_pce']) assert.match(html, new RegExp(`data-inflation-series="${id}"`));
  assert.match(html, /6\/6종/);
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
  assert.match(html, /1\/6종/);
  assert.match(html, /일부 물가 자료가 없거나/);
  assert.match(html, /발표 일정을 확인하지 못했어요/);
  assert.match(html, /data-inflation-value>2\.6%/);
  assert.match(html, /data-inflation-series="ppi"[^>]+disabled/);
  const empty = renderMacroInflation({}, { now: NOW });
  assert.match(empty, /물가 자료를 확인하지 못했어요/);
  assert.doesNotMatch(empty, /data-inflation-value>0/);
  assert.doesNotMatch(empty, /<svg/);
});

test('observation month and publication KST date remain visible outside disclosure details', () => {
  const data = fixture();
  data.inflation.series[0].points.at(-1).publishedAt = '2026-10-14T23:30:00Z';
  const html = renderMacroInflation(data, { now: NOW });
  const visible = html.split('<details class="inflation-provenance">')[0];
  assert.match(visible, /2026\.09 지표 · 10\.15 발표/);
  assert.match(visible, /발표 시각은 한국 시각 기준/);
});

test('PCE selection uses the SA source for YoY as well as MoM', () => {
  for (const rate of ['yoy', 'mom']) {
    const html = renderMacroInflation(fixture(), { now: NOW, selectedId: 'pce', rate });
    assert.match(html, /data-inflation-series="pce" aria-pressed="true"/);
    assert.match(html, /data-external-url="https:\/\/fred.stlouisfed.org\/series\/TEST_SA"/);
    assert.match(html, /단위 % · 계절조정 \(SA\)/);
  }
});

test('comparison defaults to gray missing forecast and clearly identified calculated actual', () => {
  const data = fixture(); data.inflation.series[0].points.at(-1).yoy = 3.737685;
  const html = renderMacroInflation(data, { now: NOW });
  assert.match(html, /data-inflation-comparison="missing"/);
  assert.match(html, /data-comparison-level="gray"/);
  assert.match(html, /data-comparison-expected/);
  assert.match(html, /data-comparison-actual[^>]*data-comparison-actual-kind="index_calculated"/);
  assert.match(html, /data-comparison-label/);
  assert.match(html, /시장 예상[\s\S]*미제공[\s\S]*발표 결과[\s\S]*3\.7%[\s\S]*지수 계산값/);
  assert.match(html, /예상 대비[\s\S]*비교 미제공/);
  for (const label of ['초록 낮음', '노랑 같음', '빨강 높음', '회색 미제공']) assert.ok(html.includes(label));
  assert.match(html, /시장 예상 자료 연동을 준비/);
  assert.doesNotMatch(html, /API 키|투자 판단|매수|매도|FOMC 예측/);
});

test('verified forecast receipts render text and source links for every comparison color', () => {
  for (const [expected, actual, status, label, color] of [[3.8, 3.7, 'lower', '예상보다 낮음', 'green'], [3.71, 3.74, 'equal', '예상과 같음', 'yellow'], [3.6, 3.7, 'higher', '예상보다 높음', 'red']]) {
    const data = fixture();
    data.inflation.series[0].comparisons = [{ month: '2026-09', rate: 'yoy', basis: 'NSA', unit: '%', expected, actual,
      actualVintage: 'first_release', publishedAt: '2026-10-14T12:30:00Z', forecastPublishedAt: '2026-10-14T10:00:00Z', forecastCapturedAt: '2026-10-14T12:00:00Z',
      source: { forecastName: '<시장 예상>', forecastUrl: 'https://example.com/forecast', actualUrl: 'https://example.com/actual' } }];
    const html = renderMacroInflation(data, { now: NOW });
    assert.ok(html.includes(`data-inflation-comparison="${status}"`));
    assert.ok(html.includes(`data-comparison-level="${color}"`));
    assert.ok(html.includes(label));
    assert.match(html, /최초 발표값/);
    assert.match(html, /data-external-url="https:\/\/example.com\/forecast"/);
    assert.match(html, /data-external-url="https:\/\/example.com\/actual"/);
    assert.match(html, /&lt;시장 예상&gt;/);
    assert.doesNotMatch(html, /자료 연동을 준비/);
    assert.match(renderMacroInflation(data, { now: NOW, rate: 'mom' }), /data-inflation-comparison="missing"/);
  }
});

test('date-only publication stays an original source date without a guessed KST time', () => {
  const data = fixture(), selected = data.inflation.series.find(row => row.id === 'pce');
  selected.publishedAt = '2026-09-30'; selected.publicationPrecision = 'day';
  const html = renderMacroInflation(data, { now: NOW, selectedId: 'pce' });
  assert.match(html, /2026\.09 지표 · 09\.30 발표 \(원문 날짜\)/);
  assert.match(html, /2026\.09\.30 · 원문 날짜 · 시각 미제공/);
  assert.doesNotMatch(html, /2026\.09\.30 \d{2}:\d{2} KST/);
});

test('official calendar introduction includes PCE alongside CPI and PPI', () => {
  const html = renderMacroInflation(fixture(), { now: NOW });
  assert.match(html, /미국 CPI·PPI·PCE 공식 일정이에요/);
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
