import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {questionPlan,resolveComparisonTarget,compareReports,reportObservations,growthComparison,number} from '../src/researchAnalysis.js';
import {researchCheckpointsHtml} from '../src/researchCheckpoints.js';
import {qualitySlice,qualityLabels,qualityObservations,qualityValue} from '../src/financialQuality.js';

function setup({ fail = false, savedNote = null, quote = null, quoteError = false, draft = null, noteStore = null, report = {available:true,basis:'연결재무제표',currency:'KRW',annual:[{year:2024,revenue:100,operatingProfit:10},{year:2025,revenue:120,operatingProfit:6}]} } = {}) {
  const nodes = new Map(), events = [], offers = [], writes = [], deletes = [], notices = [], writeInputs = [], draftChanges = [], quoteCalls = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const node = () => ({ listeners:{}, value: 'private question', dataset: {}, disabled: false, hidden: false, textContent: '', innerHTML: '', isConnected: true, addEventListener(name,handler) {this.listeners[name]=handler;}, setAttribute() {}, querySelector: () => node(), querySelectorAll: () => [], appendChild() {}, remove() {}, focus() {} });
  const host = { ...node(), querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, node()); return nodes.get(selector); }, querySelectorAll: () => [] };
  // Every setup is a fresh browser/module session; only noteStore survives a
  // reload. Exercise the actual storage model rather than echoing UI inputs.
  const notesContext=vm.createContext({RESEARCH_KEY:'research',getStorageContext:()=>0,isStorageContextCurrent:()=>true,readStored:()=>noteStore?.value??null,writeStored:(_,value)=>{if(noteStore)noteStore.value=value;}});
  const notesSource=readFileSync('src/researchNotes.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
  vm.runInContext(notesSource+'\nthis.model={readResearchNote,saveResearchNote,newResearchCheckpointOperation};',notesContext);
  const model=notesContext.model;
  const context = vm.createContext({
    newResearchCheckpointOperation:model.newResearchCheckpointOperation,
    document: {createElement: node},researchCheckpointsHtml,
    readResearchNote: symbol => noteStore?model.readResearchNote(symbol):savedNote,
    deleteResearchNote: async (_, options) => {deletes.push(options);await gate;if(fail)throw Error('storage full');},
    saveResearchNote: async (_, note, options) => { writes.push(options); writeInputs.push(note); await gate; if (fail) throw Error('storage full'); return noteStore?model.saveResearchNote('005930.KS',note,options):note; },
    financialHistoryData: async () => report, questionPlan,resolveComparisonTarget,compareReports,reportObservations,growthComparison,number,qualitySlice,qualityLabels,qualityObservations,qualityValue, qualityCell: () => '확인 불가', qualityReviewHtml: () => '', conditionChoices: () => [], loadingIndicator: () => 'loading',
    screenerData: async () => ({ stocks: [] }), comparisonExample: () => null, comparisonGroup: () => null,
    newUsageOperation: () => `operation-${events.length}`,
    trackUsage: async (name, options) => { events.push({ name, options }); },
    offerReviewOpportunity: async (target, options) => { offers.push({ target, options }); },
  });
  const source = readFileSync('src/researchCard.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replaceAll('export ', '');
  vm.runInContext(source + '\nthis.mount=mountResearchCard;', context);
  context.mount(host, { draft,onDraftChange:value=>draftChanges.push(value),getQuoteSnapshot:()=>{quoteCalls.push(true);if(quoteError)throw Error('no quote');return quote;},symbol: '005930.KS', name: '삼성전자', onNotice: message => notices.push(message) });
  return { host, events, offers, writes, writeInputs, draftChanges, quoteCalls, deletes, notices, release, remove: host.querySelector('[data-research-delete]'), button: host.querySelector('[data-research-save]'), status: host.querySelector('#research-save-state') };
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


test('save captures an existing quote once and double click cannot duplicate the confirmed operation',async()=>{
 const quote={ticker:'005930.KS',price:83000,currency:'KRW',asOf:'2026-10-16T01:00:00Z',source:'canonical',stale:true},s=setup({quote});
 const pending=s.button.onclick();await s.button.onclick();assert.equal(s.writes.length,1);assert.equal(s.quoteCalls.length,1);assert.equal(s.writes[0].quoteSnapshot.price,83000);assert.equal(typeof s.writes[0].operationId,'string');
 s.release();await pending;assert.equal(s.offers.length,1);
});
test('failed-save retry preserves the checkpoint operation, original quote and save time',async()=>{
 const s=setup({fail:true,quote:{price:83000,currency:'KRW',asOf:'2026-10-16T01:00:00Z'}});
 const first=s.button.onclick();s.release();await first;await s.button.onclick();
 assert.equal(s.writes.length,2);assert.equal(s.writes[0].operationId,s.writes[1].operationId);assert.equal(s.writes[0].now,s.writes[1].now);assert.equal(s.quoteCalls.length,1);
});
test('local review date edits remain visit-local drafts and save without enabling alerts',async()=>{
 const s=setup({savedNote:{question:'saved',support:'legacy support',challenge:'legacy challenge',reviewOn:'2026-11-01'},draft:{question:'saved',peer:null,reviewOn:'2026-11-02'}});
 const date=s.host.querySelector('#research-review-on');assert.equal(date.value,'2026-11-02');date.value='2026-11-03';date.listeners.input();
 assert.equal(s.draftChanges.at(-1).reviewOn,'2026-11-03');assert.match(s.status.textContent,/작성 중/);
 const pending=s.button.onclick();s.release();await pending;assert.equal(s.writeInputs[0].reviewOn,'2026-11-03');assert.equal(s.writeInputs[0].support,'legacy support');assert.equal(s.writeInputs[0].challenge,'legacy challenge');assert.match(s.host.innerHTML,/알림을 보내지 않아요/);
 assert.equal(JSON.stringify(s.events).includes('2026-11-03'),false);
});

test('the second click of a fast double click cannot create a second checkpoint after browser storage settles',async()=>{
 const s=setup();const pending=s.button.onclick({detail:1});s.release();await pending;await s.button.onclick({detail:2});assert.equal(s.writes.length,1);
 await s.button.onclick({detail:1});assert.equal(s.writes.length,2,'a later explicit save still creates a new operation');assert.notEqual(s.writes[0].operationId,s.writes[1].operationId);
});
test('a broken optional quote callback does not block saving the question or invent a snapshot',async()=>{
 const s=setup({quoteError:true});const pending=s.button.onclick();s.release();await pending;assert.equal(s.writes[0].quoteSnapshot,null);assert.equal(s.offers.length,1);
});


test('a saved question survives reload and a new save appends despite the analytics session counter restarting',async()=>{
 const noteStore={value:null},first=setup({noteStore});
 first.host.querySelector('textarea').value='first session question';
 const firstSave=first.button.onclick({detail:1});first.release();await firstSave;
 assert.equal(JSON.parse(noteStore.value)['005930.KS'].checkpoints.length,1);
 const second=setup({noteStore});second.host.querySelector('textarea').value='after reload question';
 const nextSave=second.button.onclick({detail:1});second.release();await nextSave;
 assert.equal(first.events[0].options.operationId,second.events[0].options.operationId,'analytics counters intentionally restart across sessions');
 const saved=JSON.parse(noteStore.value)['005930.KS'];
 assert.equal(saved.question,'after reload question');assert.equal(saved.checkpoints.length,2);
 assert.notEqual(saved.checkpoints[0].id,saved.checkpoints[1].id,'durable checkpoint IDs must remain distinct across reload');
 assert.equal(saved.checkpoints[0].question,'first session question');assert.equal(saved.checkpoints[1].question,'after reload question');
});
