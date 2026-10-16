import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createPublicationJournal} from '../src/publicationJournal.js';

const row=(target='items')=>({kind:'exports',route:'exports',target,basisDate:'2026-09',value:'+4.0%',observation:'YoY +4.0%'});
const drain=()=>new Promise(resolve=>setImmediate(resolve));
function setup({native=true}={}){
 const disk=new Map(),events=[];
 let identity='user-A',held=null;
 const context=vm.createContext({Map,Promise,Error,Event,setTimeout,clearTimeout,
  document:{dispatchEvent:event=>events.push(event.type)},
  isAppsInTossRuntime:()=>native,User:{getAnonymousKey:async()=>({type:'HASH',hash:identity})},
  localStorage:{getItem:key=>disk.get(key)??null,setItem:(key,value)=>disk.set(key,value),removeItem:key=>disk.delete(key)},
  Storage:{getItem:async key=>disk.get(key)??null,setItem:async(key,value)=>{if(key.startsWith('chartview-toss-briefing-v1')&&held)await held;disk.set(key,value);},removeItem:async key=>disk.delete(key)},
 });
 vm.runInContext(readFileSync(new URL('../src/storage.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','')+'\nthis.api={BRIEFING_KEY,WATCHLIST_KEY,RESEARCH_KEY,initializeStorage,readStored,writeStored,clearStored,getStorageContext,isStorageContextCurrent};',context);
 const storage=context.api;
 const journal=createPublicationJournal({read:()=>storage.readStored(storage.BRIEFING_KEY),write:(value,options)=>storage.writeStored(storage.BRIEFING_KEY,value,options),getContext:storage.getStorageContext,isCurrent:storage.isStorageContextCurrent});
 return {...storage,journal,disk,events,setIdentity:value=>{identity=value;},holdBriefing:()=>{let release;held=new Promise(resolve=>{release=resolve;});return ()=>{held=null;release();};}};
}

test('native publication journals isolate accounts, join reset and preserve existing private stores during writes',async()=>{
 const s=setup();await s.initializeStorage();
 assert.equal(s.BRIEFING_KEY,'chartview-toss-briefing-v1');
 await s.writeStored(s.WATCHLIST_KEY,'[{"symbol":"005930.KS"}]',{confirmed:true});
 await s.writeStored(s.RESEARCH_KEY,'{"005930.KS":{"question":"private"}}',{confirmed:true});
 await s.journal.start().remember([row()]);
 assert.equal(s.readStored(s.WATCHLIST_KEY),'[{"symbol":"005930.KS"}]');
 assert.equal(s.readStored(s.RESEARCH_KEY),'{"005930.KS":{"question":"private"}}');
 assert.doesNotMatch(s.readStored(s.BRIEFING_KEY),/question|private|005930/);
 s.setIdentity('user-B');await s.initializeStorage();
 assert.equal(s.readStored(s.BRIEFING_KEY),null);
 await s.journal.start().remember([row('quadrant')]);await s.clearStored();
 assert.equal(s.disk.has(s.BRIEFING_KEY+':user-B'),false);
 s.setIdentity('user-A');await s.initializeStorage();
 assert.equal(JSON.parse(s.readStored(s.BRIEFING_KEY))[0].target,'items');
 await s.clearStored();assert.equal(s.readStored(s.BRIEFING_KEY),null);
});

test('a native reset drains actual bridge writes and prevents a queued old Home session from reviving the journal',async()=>{
 const s=setup();await s.initializeStorage();
 const release=s.holdBriefing(),session=s.journal.start();
 const first=session.remember([row()]);await drain();
 const queued=session.remember([row('quadrant')]);
 const clearing=s.clearStored();release();
 await Promise.all([first,queued,clearing]);
 assert.equal(s.readStored(s.BRIEFING_KEY),null);
 assert.equal(s.disk.has(s.BRIEFING_KEY+':user-A'),false);
 assert.equal(await session.remember([row()]),false);
 assert.equal(s.readStored(s.BRIEFING_KEY),null);
});

test('a native account transition prevents pending old observations from entering the next account',async()=>{
 const s=setup();await s.initializeStorage();
 const release=s.holdBriefing(),session=s.journal.start();
 const first=session.remember([row()]);await drain();
 const queued=session.remember([row('quadrant')]);
 s.setIdentity('user-B');const changing=s.initializeStorage();release();
 await Promise.all([first,queued,changing]);
 assert.equal(s.readStored(s.BRIEFING_KEY),null);
 assert.equal(await session.remember([row()]),false);
 await s.journal.start().remember([row('new-account')]);
 assert.equal(JSON.parse(s.readStored(s.BRIEFING_KEY))[0].target,'new-account');
 assert.equal(JSON.parse(s.disk.get(s.BRIEFING_KEY+':user-A')).length,1);
});

test('browser reset removes publication baselines and invalidates the mounted session',async()=>{
 const s=setup({native:false}),session=s.journal.start();
 await session.remember([row()]);assert.ok(s.readStored(s.BRIEFING_KEY));
 await s.clearStored();assert.equal(s.readStored(s.BRIEFING_KEY),null);
 assert.equal(await session.remember([row('quadrant')]),false);
 assert.equal(s.readStored(s.BRIEFING_KEY),null);
});
