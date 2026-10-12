import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {questionPlan,resolveComparisonTarget,compareReports,reportObservations,growthComparison,number} from '../src/researchAnalysis.js';
import {qualitySlice,qualityLabels,qualityObservations,qualityValue} from '../src/financialQuality.js';

function setup({ fail = false, report = {available:true,basis:'연결재무제표',currency:'KRW',annual:[{year:2024,revenue:100,operatingProfit:10},{year:2025,revenue:120,operatingProfit:6}]} } = {}) {
  const nodes = new Map(), events = [], offers = [], writes = [], deletes = [], notices = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const node = () => ({ value: 'private question', dataset: {}, disabled: false, hidden: false, textContent: '', innerHTML: '', isConnected: true, addEventListener() {}, setAttribute() {}, querySelector: () => node(), querySelectorAll: () => [], appendChild() {}, remove() {}, focus() {} });
  const host = { ...node(), querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, node()); return nodes.get(selector); }, querySelectorAll: () => [] };
  const context = vm.createContext({
    document: {createElement: node},
    readResearchNote: () => null,
    deleteResearchNote: async (_, options) => {deletes.push(options);await gate;if(fail)throw Error('storage full');},
    saveResearchNote: async (_, note, options) => { writes.push(options); await gate; if (fail) throw Error('storage full'); return note; },
    financialHistoryData: async () => report, questionPlan,resolveComparisonTarget,compareReports,reportObservations,growthComparison,number,qualitySlice,qualityLabels,qualityObservations,qualityValue, qualityCell: () => '확인 불가', qualityReviewHtml: () => '', conditionChoices: () => [], loadingIndicator: () => 'loading',
    screenerData: async () => ({ stocks: [] }), comparisonExample: () => null, comparisonGroup: () => null,
    newUsageOperation: () => `operation-${events.length}`,
    trackUsage: async (name, options) => { events.push({ name, options }); },
    offerReviewOpportunity: async (target, options) => { offers.push({ target, options }); },
  });
  const source = readFileSync('src/researchCard.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replaceAll('export ', '');
  vm.runInContext(source + '\nthis.mount=mountResearchCard;', context);
  context.mount(host, { symbol: '005930.KS', name: '삼성전자', onNotice: message => notices.push(message) });
  return { host, events, offers, writes, deletes, notices, release, remove: host.querySelector('[data-research-delete]'), button: host.querySelector('[data-research-save]'), status: host.querySelector('#research-save-state') };
}

test('research save waits for confirmed persistence before success feedback, metric and optional review', async () => {
  const s = setup();
  const pending = s.button.onclick();
  assert.equal(s.writes[0]?.confirmed, true, 'UI save must request confirmed native persistence');
  assert.equal(s.events.some(event => event.name === 'research_save_success'), false);
  assert.equal(s.offers.length, 0);
  assert.equal(s.notices.length, 0);
  assert.equal(s.button.disabled, true);
  assert.match(s.status.textContent, /저장하고 있어요/);
  s.release();
  await pending;
  assert.deepEqual(s.events.map(event => event.name), ['research_save_attempt', 'research_save_success']);
  assert.equal(s.offers.length, 1);
  assert.match(s.status.textContent, /저장했어요/);
  assert.equal(s.button.disabled, false);
  assert.equal(JSON.stringify(s.events).includes('private question'), false);
});

test('failed research save preserves entered question and emits no success or review request', async () => {
  const s = setup({ fail: true });
  const pending = s.button.onclick();
  s.release();
  await pending;
  assert.deepEqual(s.events.map(event => event.name), ['research_save_attempt', 'research_save_failure']);
  assert.equal(s.offers.length, 0);
  assert.equal(s.host.querySelector('textarea').value, 'private question');
  assert.match(s.status.textContent, /저장하지 못했어요/);
  assert.equal(s.button.disabled, false);
});


test('DART analysis success requires a matched report and a displayed numeric metric', async () => {
  const s = setup();
  s.host.querySelector('form').onsubmit({ preventDefault() {} });
  await new Promise(setImmediate);
  assert.match(s.host.querySelector('#research-result').innerHTML, /120/);
  assert.deepEqual(s.events.map(event => event.name), ['analysis_view_attempt', 'analysis_view_success']);
});

test('DART unavailable or all-missing report values never count as completed analysis', async () => {
  for (const report of [{available:false}, {available:true,basis:'연결재무제표',currency:'KRW',annual:[{year:2025,revenue:null,operatingProfit:null}]}]) {
    const s = setup({ report });
    s.host.querySelector('form').onsubmit({ preventDefault() {} });
    await new Promise(setImmediate);
    assert.deepEqual(s.events.map(event => event.name), ['analysis_view_attempt', 'analysis_view_failure']);
  }
});


test('pending save disables deleting the same research question until confirmed settlement', async () => {
  const s = setup();
  const pending=s.button.onclick();
  assert.equal(s.remove.disabled,true);
  s.release();await pending;
  assert.equal(s.remove.disabled,false);
});

test('research delete feedback waits for confirmed native persistence and suppresses other writes', async () => {
  const s = setup();s.remove.dataset.confirm='true';
  const pending=s.remove.onclick();
  assert.equal(s.deletes[0]?.confirmed,true);
  assert.equal(s.button.disabled,true);
  assert.doesNotMatch(s.status.textContent,/삭제했어요/);
  assert.match(s.status.textContent,/삭제하고 있어요/);
  s.release();await pending;
  assert.match(s.status.textContent,/삭제했어요/);
  assert.equal(s.remove.hidden,true);
  assert.equal(s.button.disabled,false);
  assert.equal(s.offers.length,0);
});

test('failed confirmed research delete preserves visible saved controls and the input', async () => {
  const s=setup({fail:true});s.remove.dataset.confirm='true';
  const pending=s.remove.onclick();s.release();await pending;
  assert.match(s.status.textContent,/삭제하지 못했어요/);
  assert.equal(s.remove.hidden,false);
  assert.equal(s.remove.disabled,false);
  assert.equal(s.host.querySelector('textarea').value,'private question');
});
