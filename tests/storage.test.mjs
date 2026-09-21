import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function setup({ native = true, failRead = false, failWrite = false } = {}) {
  const disk = new Map([['chartview-toss-watchlist-v1', '[{"symbol":"NVDA"}]']]);
  const events = [];
  let identity = {type:'HASH',hash:'user-A'};
  let writeFails = false;
  const context = vm.createContext({
    Map, Promise, Error, Event, setTimeout, clearTimeout,
    User: { getAnonymousKey: async () => identity },
    document: { dispatchEvent: event => events.push(event.type) },
    isAppsInTossRuntime: () => native,
    localStorage: { getItem: k => disk.get(k) ?? null, setItem: (k,v) => disk.set(k,v), removeItem: k => disk.delete(k) },
    Storage: {
      getItem: async k => { if (failRead) throw new Error('offline bridge'); return disk.get(k) ?? null; },
      setItem: async (k,v) => { if (writeFails) throw new Error('full'); disk.set(k,v); },
      removeItem: async k => disk.delete(k),
    },
  });
  const source = readFileSync('src/storage.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ', '');
  vm.runInContext(source + '\nthis.api={initializeStorage,readStored,writeStored,clearStored,WATCHLIST_KEY,SELECTED_KEY};',context);
  return { ...context.api, disk, events, setIdentity: value => {identity=value;}, failWrites: () => {writeFails=true;} };
}
test('native storage restores and serializes writes before clear',async()=>{
  const s=setup(); await s.initializeStorage();
  assert.equal(s.readStored(s.WATCHLIST_KEY),'[{"symbol":"NVDA"}]');
  s.writeStored(s.WATCHLIST_KEY,'[]');
  assert.equal(s.readStored(s.WATCHLIST_KEY),'[]');
  await s.clearStored();
  assert.deepEqual([...s.disk.keys()],['chartview-toss-identity-v1']);
  assert.equal(s.readStored(s.WATCHLIST_KEY),null);
});
test('failed native read cannot overwrite existing watchlist',async()=>{
  const s=setup({failRead:true});
  await assert.rejects(s.initializeStorage());
  assert.throws(()=>s.writeStored(s.WATCHLIST_KEY,'[]'),/not ready/);
  assert.equal(s.disk.get(s.WATCHLIST_KEY),'[{"symbol":"NVDA"}]');
});
test('native write failures are surfaced to the UI',async()=>{
  const s=setup({failWrite:true}); await s.initializeStorage();
  s.failWrites();
  s.writeStored(s.WATCHLIST_KEY,'[]');
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual(s.events,['chartview:storage-error']);
});

test('anonymous identity separates accounts, restores returning users and preserves usage',async()=>{
  const s=setup(); await s.initializeStorage();
  assert.equal(s.disk.has(s.WATCHLIST_KEY),false);
  s.setIdentity({type:'HASH',hash:'user-B'}); await s.initializeStorage();
  assert.equal(s.readStored(s.WATCHLIST_KEY),null);
  s.writeStored(s.WATCHLIST_KEY,'[{"symbol":"AAPL"}]');
  s.setIdentity({type:'HASH',hash:'user-A'}); await s.initializeStorage();
  assert.equal(s.readStored(s.WATCHLIST_KEY),'[{"symbol":"NVDA"}]');
  assert.equal(JSON.parse(s.disk.get('chartview-toss-usage-v1:user-A')).visits,2);
});

test('missing anonymous identity cannot expose saved lists or overwrite them',async()=>{
  const s=setup(); s.setIdentity({type:'ERROR'});
  await assert.rejects(s.initializeStorage(),/Identity unavailable/);
  assert.throws(()=>s.writeStored(s.WATCHLIST_KEY,'[]'),/not ready/);
  assert.equal(s.disk.get(s.WATCHLIST_KEY),'[{"symbol":"NVDA"}]');
});
test('web preview keeps browser-local storage without requiring a bridge',async()=>{
  const s=setup({native:false}); await s.initializeStorage();
  s.writeStored(s.SELECTED_KEY,'["AAPL"]');
  assert.equal(s.readStored(s.SELECTED_KEY),'["AAPL"]');
  await s.clearStored(); assert.equal(s.disk.size,0);
});
