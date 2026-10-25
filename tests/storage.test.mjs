import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function setup({ native = true, failRead = false, manualTimers = false } = {}) {
  const disk = new Map([['chartview-toss-watchlist-v1', '[{"symbol":"NVDA"}]']]);
  const events = [];
  let identity = {type:'HASH',hash:'user-A'};
  let writeFails = false, nextWriteFailures = 0, pendingWrite = null, pendingRemoval = null;
  const timers = new Map();
  let timerId = 0;
  const context = vm.createContext({
    Map, Promise, Error, Event,
    setTimeout: manualTimers ? callback => { timers.set(++timerId, callback); return timerId; } : setTimeout,
    clearTimeout: manualTimers ? id => timers.delete(id) : clearTimeout,
    User: { getAnonymousKey: async () => identity },
    document: { dispatchEvent: event => events.push(event.type) },
    isAppsInTossRuntime: () => native,
    localStorage: { getItem: k => disk.get(k) ?? null, setItem: (k,v) => disk.set(k,v), removeItem: k => disk.delete(k) },
    Storage: {
      getItem: async k => { if (failRead) throw new Error('offline bridge'); return disk.get(k) ?? null; },
      setItem: async (k,v) => { if (pendingWrite) await pendingWrite; if (writeFails) throw new Error('full'); if (nextWriteFailures > 0) { nextWriteFailures--; throw new Error('full'); } disk.set(k,v); },
      removeItem: async k => { if(pendingRemoval)await pendingRemoval; disk.delete(k); },
    },
  });
  const source = readFileSync('src/storage.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ', '');
  vm.runInContext(source + '\nthis.api={initializeStorage,readStored,writeStored,clearStored,getStorageContext,isStorageContextCurrent,WATCHLIST_KEY,SELECTED_KEY,RESEARCH_KEY,REVIEW_KEY,flushWrites:()=>queue};',context);
  for (const [file, api] of [['researchNotes', 'saveResearchNote,readResearchNote'], ['reviewStorage', 'updateReview,readReview']]) {
    const module = readFileSync(`src/${file}.js`, 'utf8').replace(/^import .*;\r?\n/gm, '').replaceAll('export ', '');
    vm.runInContext(`{${module}\nObject.assign(this.api,{${api}});}`, context);
  }
  return { ...context.api, disk, events, setIdentity: value => {identity=value;}, failWrites: (value=true) => {writeFails=value;}, rejectNextWrites: (count=1) => {nextWriteFailures=count;}, expireTimers: () => { const pending=[...timers.values()]; timers.clear(); pending.forEach(callback=>callback()); }, allowFollowingWrites: () => {pendingWrite=null;}, holdRemovals: () => { let release; pendingRemoval=new Promise(resolve=>{release=resolve;}); return () => {pendingRemoval=null;release();}; }, holdWrites: () => { let release; pendingWrite=new Promise(resolve=>{release=resolve;}); return () => {pendingWrite=null;release();}; } };
}
test('native storage restores and serializes writes before clear',async()=>{
  const s=setup(); await s.initializeStorage();
  assert.equal(s.readStored(s.WATCHLIST_KEY),'[{"symbol":"NVDA"}]');
  await s.writeStored(s.WATCHLIST_KEY,'[]');
  assert.equal(s.readStored(s.WATCHLIST_KEY),'[]');
  await s.clearStored();
  assert.deepEqual([...s.disk.keys()],['chartview-toss-identity-v1']);
  assert.equal(s.readStored(s.WATCHLIST_KEY),null);
});
test('home return baselines and review cooldowns follow account isolation and reset',async()=>{
 const s=setup(); await s.initializeStorage();
 const keys=['chartview-toss-home-journey-v1','chartview-toss-review-prompt-v1','chartview-toss-recent-stocks-v1','chartview-toss-watch-sort-v1'];
 for(const key of keys)await s.writeStored(key,'{"checkedAt":"2026-10-12"}',{confirmed:true});
 s.setIdentity({type:'HASH',hash:'user-B'});await s.initializeStorage();
 for(const key of keys)assert.equal(s.readStored(key),null);
 for(const key of keys)await s.writeStored(key,'{"checkedAt":"other"}',{confirmed:true});
 await s.clearStored();
 for(const key of keys)assert.equal(s.disk.has(key+':user-B'),false);
 s.setIdentity({type:'HASH',hash:'user-A'});await s.initializeStorage();
 for(const key of keys)assert.match(s.readStored(key),/2026-10-12/);
 await s.clearStored();
 for(const key of keys)assert.equal(s.readStored(key),null);
});
test('browser reset also removes return baselines and review cooldowns',async()=>{
 const s=setup({native:false});
 const keys=['chartview-toss-home-journey-v1','chartview-toss-review-prompt-v1','chartview-toss-recent-stocks-v1','chartview-toss-watch-sort-v1'];
 for(const key of keys)s.writeStored(key,'{}');
 await s.clearStored();
 for(const key of keys)assert.equal(s.readStored(key),null);
});
const workflowKeys=['chartview-toss-research-tasks-v1','chartview-toss-saved-sets-v1','chartview-toss-research-evidence-v1'];
test('research workflow records restore independently for each native account and clear only the current account',async()=>{
 const s=setup();await s.initializeStorage();
 for(const key of workflowKeys)await s.writeStored(key,'{"owner":"A"}',{confirmed:true});
 s.setIdentity({type:'HASH',hash:'user-B'});await s.initializeStorage();
 for(const key of workflowKeys)assert.equal(s.readStored(key),null,key);
 for(const key of workflowKeys)await s.writeStored(key,'{"owner":"B"}',{confirmed:true});
 await s.clearStored();
 for(const key of workflowKeys)assert.equal(s.disk.has(key+':user-B'),false,key);
 s.setIdentity({type:'HASH',hash:'user-A'});await s.initializeStorage();
 for(const key of workflowKeys)assert.equal(s.readStored(key),'{"owner":"A"}',key);
 await s.clearStored();
 for(const key of workflowKeys)assert.equal(s.readStored(key),null,key);
});
test('browser reset removes saved sets, review completion and article evidence',async()=>{
 const s=setup({native:false});
 for(const key of workflowKeys)s.writeStored(key,'{"private":"record"}');
 await s.clearStored();
 for(const key of workflowKeys)assert.equal(s.readStored(key),null,key);
});
test('a deferred local write context expires as soon as reset or identity reload starts',async()=>{
 const s=setup();await s.initializeStorage();
 const previous=s.getStorageContext();assert.equal(s.isStorageContextCurrent(previous),true);
 const release=s.holdRemovals();const clearing=s.clearStored();
 assert.equal(s.isStorageContextCurrent(previous),false);
 release();await clearing;
 const next=s.getStorageContext();assert.equal(s.isStorageContextCurrent(next),true);
 s.setIdentity({type:'HASH',hash:'user-B'});await s.initializeStorage();
 assert.equal(s.isStorageContextCurrent(next),false);
 assert.equal(s.isStorageContextCurrent(s.getStorageContext()),true);
});
test('reviewed filings and investment conditions are isolated by native account and reset',async()=>{
 const s=setup();await s.initializeStorage();
 s.writeStored(s.REVIEW_KEY,'{"005930.KS":{"conditions":[{"key":"margin"}]}}');
 s.setIdentity({type:'HASH',hash:'user-B'});await s.initializeStorage();
 assert.equal(s.readStored(s.REVIEW_KEY),null);
 s.writeStored(s.REVIEW_KEY,'{}');await s.clearStored();
 s.setIdentity({type:'HASH',hash:'user-A'});await s.initializeStorage();
 assert.match(s.readStored(s.REVIEW_KEY),/margin/);await s.clearStored();
 assert.equal(s.readStored(s.REVIEW_KEY),null);
});
test('failed native read cannot overwrite existing watchlist',async()=>{
  const s=setup({failRead:true});
  await assert.rejects(s.initializeStorage());
  assert.throws(()=>s.writeStored(s.WATCHLIST_KEY,'[]'),/not ready/);
  assert.equal(s.disk.get(s.WATCHLIST_KEY),'[{"symbol":"NVDA"}]');
});
test('native write failures reject and preserve the last committed cache and saved bytes',async()=>{
  const s=setup(); await s.initializeStorage();
  const before=s.readStored(s.WATCHLIST_KEY);
  s.failWrites();
  await assert.rejects(Promise.resolve(s.writeStored(s.WATCHLIST_KEY,'[]',{confirmed:true})),/full/);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.deepEqual(s.events,['chartview:storage-error']);
  assert.equal(s.readStored(s.WATCHLIST_KEY),before);
  assert.equal(s.disk.get(`${s.WATCHLIST_KEY}:user-A`),before);
  s.failWrites(false);
  await s.writeStored(s.WATCHLIST_KEY,'[]');
  assert.equal(s.readStored(s.WATCHLIST_KEY),'[]');
});

test('native pending writes do not expose uncommitted values and awaitable writes retain order',async()=>{
  const s=setup(); await s.initializeStorage();
  const before=s.readStored(s.WATCHLIST_KEY),release=s.holdWrites();
  const first=s.writeStored(s.WATCHLIST_KEY,'[{"symbol":"AAPL"}]',{confirmed:true});
  const second=s.writeStored(s.WATCHLIST_KEY,'[]',{confirmed:true});
  assert.equal(s.readStored(s.WATCHLIST_KEY),before);
  assert.equal(typeof first?.then,'function');
  release();await Promise.all([first,second]);
  assert.equal(s.readStored(s.WATCHLIST_KEY),'[]');
  assert.equal(s.disk.get(`${s.WATCHLIST_KEY}:user-A`),'[]');
});

test('native research and review saves remain immediately readable while bridge writes are pending',async()=>{
  const s=setup(); await s.initializeStorage();
  const release=s.holdWrites();
  try {
    s.saveResearchNote('AAPL',{question:'First company'});
    assert.equal(s.readResearchNote('AAPL')?.question,'First company');
    s.saveResearchNote('NVDA',{question:'Second company'});
    assert.deepEqual(Object.keys(JSON.parse(s.readStored(s.RESEARCH_KEY))),['AAPL','NVDA']);
    s.updateReview('AAPL',{reviewedAt:'2026-10-11'});
    assert.equal(s.readReview('AAPL').reviewedAt,'2026-10-11');
    s.updateReview('NVDA',{reviewedAt:'2026-10-12'});
    assert.deepEqual(Object.keys(JSON.parse(s.readStored(s.REVIEW_KEY))),['AAPL','NVDA']);
  } finally { release(); await s.flushWrites(); }
  assert.deepEqual(Object.keys(JSON.parse(s.disk.get(`${s.RESEARCH_KEY}:user-A`))),['AAPL','NVDA']);
  assert.deepEqual(Object.keys(JSON.parse(s.disk.get(`${s.REVIEW_KEY}:user-A`))),['AAPL','NVDA']);
});

test('a failed optimistic native write rolls back an unchanged cache to the saved value',async()=>{
  const s=setup(); await s.initializeStorage();
  const before=s.readStored(s.WATCHLIST_KEY),release=s.holdWrites();
  s.rejectNextWrites();
  const failed=s.writeStored(s.WATCHLIST_KEY,'[]');
  try { assert.equal(s.readStored(s.WATCHLIST_KEY),'[]'); } finally { release(); }
  await assert.rejects(failed,/full/);
  assert.equal(s.readStored(s.WATCHLIST_KEY),before);
  assert.equal(s.disk.get(`${s.WATCHLIST_KEY}:user-A`),before);
});

test('failed queued optimistic writes restore committed bytes without reviving an earlier failed value',async()=>{
  const s=setup(); await s.initializeStorage();
  const before=s.readStored(s.WATCHLIST_KEY),release=s.holdWrites();
  s.rejectNextWrites(2);
  const first=s.writeStored(s.WATCHLIST_KEY,'[{"symbol":"AAPL"}]');
  const second=s.writeStored(s.WATCHLIST_KEY,'[]');
  try { assert.equal(s.readStored(s.WATCHLIST_KEY),'[]'); } finally { release(); }
  await assert.rejects(first,/full/);await assert.rejects(second,/full/);
  assert.equal(s.readStored(s.WATCHLIST_KEY),before);
  assert.equal(s.disk.get(`${s.WATCHLIST_KEY}:user-A`),before);
});

test('an earlier confirmed native write cannot replace a newer optimistic cache value',async()=>{
  const s=setup(); await s.initializeStorage();
  const release=s.holdWrites();
  const first=s.writeStored(s.WATCHLIST_KEY,'[{"symbol":"AAPL"}]',{confirmed:true});
  const second=s.writeStored(s.WATCHLIST_KEY,'[]');
  try { assert.equal(s.readStored(s.WATCHLIST_KEY),'[]'); } finally { release(); }
  await first;
  assert.equal(s.readStored(s.WATCHLIST_KEY),'[]');
  await second;
  assert.equal(s.disk.get(`${s.WATCHLIST_KEY}:user-A`),'[]');
});

test('timed-out confirmed native writes are repaired before a newer retry can reach disk',async()=>{
  const s=setup({manualTimers:true}); await s.initializeStorage();
  const before=s.readStored(s.WATCHLIST_KEY),release=s.holdWrites();
  const first=s.writeStored(s.WATCHLIST_KEY,'[]',{confirmed:true});
  await new Promise(resolve=>setTimeout(resolve,0));
  s.expireTimers();
  await assert.rejects(first,/timeout/);
  s.allowFollowingWrites();
  let secondSettled=false;
  const second=s.writeStored(s.WATCHLIST_KEY,'[{"symbol":"AAPL"}]',{confirmed:true}).then(()=>{secondSettled=true;});
  try {
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(secondSettled,false,'A retry must wait for the timed-out bridge operation');
    assert.equal(s.disk.get(`${s.WATCHLIST_KEY}:user-A`),before);
    assert.equal(s.readStored(s.WATCHLIST_KEY),before);
  } finally { release(); await second; }
  assert.equal(s.disk.get(`${s.WATCHLIST_KEY}:user-A`),'[{"symbol":"AAPL"}]');
  assert.equal(s.readStored(s.WATCHLIST_KEY),'[{"symbol":"AAPL"}]');
});

test('a timed-out native write that settles late restores the committed bytes',async()=>{
  const s=setup({manualTimers:true}); await s.initializeStorage();
  const before=s.readStored(s.WATCHLIST_KEY),release=s.holdWrites();
  const write=s.writeStored(s.WATCHLIST_KEY,'[]',{confirmed:true});
  await new Promise(resolve=>setTimeout(resolve,0));
  s.expireTimers();
  await assert.rejects(write,/timeout/);
  release();await s.flushWrites().catch(()=>{});
  assert.equal(s.disk.get(`${s.WATCHLIST_KEY}:user-A`),before);
  assert.equal(s.readStored(s.WATCHLIST_KEY),before);
});

test('native initialization times out while an earlier write is still unsettled and later restores safely',async()=>{
  const s=setup({manualTimers:true}); await s.initializeStorage();
  const before=s.readStored(s.WATCHLIST_KEY),release=s.holdWrites();
  const write=s.writeStored(s.WATCHLIST_KEY,'[]',{confirmed:true});
  await new Promise(resolve=>setTimeout(resolve,0));
  s.expireTimers();await assert.rejects(write,/timeout/);
  const initialize=s.initializeStorage();
  await new Promise(resolve=>setTimeout(resolve,0));
  s.expireTimers();await assert.rejects(initialize,/timeout/);
  assert.equal(s.readStored(s.WATCHLIST_KEY),null);
  release();await s.flushWrites();
  await s.initializeStorage();
  assert.equal(s.readStored(s.WATCHLIST_KEY),before);
});

test('a retry that times out while queued is never written after the earlier operation settles',async()=>{
  const s=setup({manualTimers:true}); await s.initializeStorage();
  const before=s.readStored(s.WATCHLIST_KEY),release=s.holdWrites();
  const first=s.writeStored(s.WATCHLIST_KEY,'[]',{confirmed:true});
  await new Promise(resolve=>setTimeout(resolve,0));
  s.expireTimers();await assert.rejects(first,/timeout/);
  const retry=s.writeStored(s.WATCHLIST_KEY,'[{"symbol":"AAPL"}]',{confirmed:true});
  s.expireTimers();await assert.rejects(retry,/timeout/);
  release();await s.flushWrites();
  assert.equal(s.disk.get(`${s.WATCHLIST_KEY}:user-A`),before);
  assert.equal(s.readStored(s.WATCHLIST_KEY),before);
});

test('clear times out behind an unsettled native write and cannot delete data later',async()=>{
  const s=setup({manualTimers:true}); await s.initializeStorage();
  const before=s.readStored(s.WATCHLIST_KEY),release=s.holdWrites();
  const write=s.writeStored(s.WATCHLIST_KEY,'[]',{confirmed:true});
  await new Promise(resolve=>setTimeout(resolve,0));
  s.expireTimers();await assert.rejects(write,/timeout/);
  let settled=false,error=null;
  const clear=s.clearStored().then(()=>{settled=true;},reason=>{settled=true;error=reason;});
  await new Promise(resolve=>setTimeout(resolve,0));
  s.expireTimers();
  try {
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(settled,true,'Clear must report a timeout while the bridge remains unsettled');
    assert.match(error?.message||'',/timeout/);
  } finally { release();await clear; }
  await s.flushWrites();
  assert.equal(s.disk.get(`${s.WATCHLIST_KEY}:user-A`),before);
  assert.equal(s.readStored(s.WATCHLIST_KEY),before);
});

test('a started native clear cannot delete a newer saved list after timing out',async()=>{
  const s=setup({manualTimers:true}); await s.initializeStorage();
  const release=s.holdRemovals();
  const clear=s.clearStored();
  await new Promise(resolve=>setTimeout(resolve,0));
  s.expireTimers();await assert.rejects(clear,/timeout/);
  let saved=false;
  const retry=s.writeStored(s.WATCHLIST_KEY,'[{"symbol":"AAPL"}]',{confirmed:true}).then(()=>{saved=true;});
  try {
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(saved,false,'A write must wait for every started native removal to settle');
  } finally {release();await retry;}
  assert.equal(s.disk.get(`${s.WATCHLIST_KEY}:user-A`),'[{"symbol":"AAPL"}]');
  assert.equal(s.readStored(s.WATCHLIST_KEY),'[{"symbol":"AAPL"}]');
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
  s.writeStored(s.RESEARCH_KEY,'{"AAPL":{"question":"질문"}}');
  s.writeStored(s.REVIEW_KEY,'{"005930.KS":{"conditions":[]}}');
  assert.equal(s.readStored(s.SELECTED_KEY),'["AAPL"]');
  await s.clearStored(); assert.equal(s.disk.size,0);
});
test('research notes are separated by native account and cleared only for the active user',async()=>{
  const s=setup();await s.initializeStorage();
  const card='{"005930.KS":{"question":"내 질문"}}';
  s.writeStored(s.RESEARCH_KEY,card);
  s.setIdentity({type:'HASH',hash:'user-B'});await s.initializeStorage();
  assert.equal(s.readStored(s.RESEARCH_KEY),null);
  s.writeStored(s.RESEARCH_KEY,'{}');await s.clearStored();
  s.setIdentity({type:'HASH',hash:'user-A'});await s.initializeStorage();
  assert.equal(s.readStored(s.RESEARCH_KEY),card);
  await s.clearStored();assert.equal(s.readStored(s.RESEARCH_KEY),null);
});
