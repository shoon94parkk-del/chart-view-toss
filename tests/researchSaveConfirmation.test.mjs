import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function setup({ reject = false } = {}) {
  let disk = JSON.stringify({ AAPL: { question: 'existing', createdAt: '2026-10-01T00:00:00Z' } });
  let release;
  const calls = [], pending = new Promise(resolve => { release = resolve; });
  const context = vm.createContext({ getStorageContext:()=>0, isStorageContextCurrent:()=>true, RESEARCH_KEY: 'research', readStored: () => disk, writeStored: (_, value, options) => { calls.push(options); return pending.then(() => { if (reject) throw Error('full'); disk = value; }); } });
  const source = readFileSync('src/researchNotes.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replaceAll('export ', '');
  vm.runInContext(source + '\nthis.api={saveResearchNote,readResearchNote};', context);
  return { ...context.api, calls, release };
}

test('confirmed research saving returns a pending result until native storage commits', async () => {
  const s = setup();
  const pending = s.saveResearchNote('AAPL', { question: 'updated' }, { confirmed: true });
  assert.equal(typeof pending?.then, 'function', 'confirmed save must expose native write completion');
  assert.equal(s.readResearchNote('AAPL').question, 'existing');
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(s.calls[0]?.confirmed, true);
  s.release();
  assert.equal((await pending).question, 'updated');
  assert.equal(s.readResearchNote('AAPL').question, 'updated');
});

test('confirmed storage rejection rejects the save and leaves the previous note intact', async () => {
  const s = setup({ reject: true });
  const pending = s.saveResearchNote('AAPL', { question: 'failed' }, { confirmed: true });
  assert.equal(typeof pending?.then, 'function', 'save result must not claim optimistic success');
  s.release();
  await assert.rejects(pending, /full/);
  assert.equal(s.readResearchNote('AAPL').question, 'existing');
});

test('concurrent confirmed card saves preserve both companies after delayed native writes', async () => {
  const s = setup();
  const first = s.saveResearchNote('AAPL', { question: 'updated' }, { confirmed: true });
  const second = s.saveResearchNote('NVDA', { question: 'another company' }, { confirmed: true });
  s.release();
  await Promise.all([first, second]);
  assert.equal(s.readResearchNote('AAPL')?.question, 'updated');
  assert.equal(s.readResearchNote('NVDA')?.question, 'another company');
});
