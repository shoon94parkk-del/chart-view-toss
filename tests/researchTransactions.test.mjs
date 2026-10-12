import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function setup({native=true}={}){
 const key='chartview-toss-research-v1',disk=new Map(),events=[];
 let identity={type:'HASH',hash:'research-A'},gate=null,enteredResolve,failWrites=false;
 const source=file=>readFileSync(`src/${file}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
 const context=vm.createContext({
  setTimeout,clearTimeout,Event,
  isAppsInTossRuntime:()=>native,
  User:{getAnonymousKey:async()=>identity},
  document:{dispatchEvent:event=>events.push(event.type)},
  localStorage:{getItem:key=>disk.get(key)??null,setItem:(key,value)=>disk.set(key,value),removeItem:key=>disk.delete(key)},
  Storage:{getItem:async key=>disk.get(key)??null,removeItem:async key=>disk.delete(key),setItem:async(target,value)=>{
   if(target.startsWith(key)&&gate){enteredResolve();await gate;}
   if(target.startsWith(key)&&failWrites)throw Error('native full');
   disk.set(target,value);
  }},
 });
 vm.runInContext(source('storage')+'\n{'+source('researchNotes')+'\nthis.api={initializeStorage,clearStored,saveResearchNote,deleteResearchNote,readResearchNote,readStored,RESEARCH_KEY};}',context);
 return {...context.api,disk,events,setIdentity:()=>{identity={type:'HASH',hash:'research-B'};},failWrites:()=>{failWrites=true;},holdWrites:()=>{
  let release;const entered=new Promise(resolve=>{enteredResolve=resolve;});gate=new Promise(resolve=>{release=resolve;});
  return {entered,release:()=>{gate=null;release();}};
 }};
}
const seed=async s=>{await s.initializeStorage();await s.saveResearchNote('AAPL',{question:'old'},{confirmed:true});};

test('legacy synchronous delete queued during a native confirmed save preserves the newly saved other company',async()=>{
 const s=setup();await seed(s);const hold=s.holdWrites();
 const save=s.saveResearchNote('NVDA',{question:'new'},{confirmed:true});
 await hold.entered;
 s.deleteResearchNote('AAPL');
 hold.release();await save;
 // A following confirmed operation is also a fence for the queued legacy delete.
 await s.saveResearchNote('MSFT',{question:'third'},{confirmed:true});
 assert.equal(s.readResearchNote('AAPL'),null);
 assert.equal(s.readResearchNote('NVDA')?.question,'new');
 assert.equal(JSON.parse(s.disk.get(`${s.RESEARCH_KEY}:research-A`)).NVDA.question,'new');
});

test('legacy synchronous save interleaved with a confirmed save preserves both native cards',async()=>{
 const s=setup();await seed(s);const hold=s.holdWrites();
 const save=s.saveResearchNote('NVDA',{question:'new'},{confirmed:true});await hold.entered;
 const legacy=s.saveResearchNote('MSFT',{question:'third'});assert.equal(legacy.question,'third');
 hold.release();await save;await s.saveResearchNote('AAPL',{question:'updated'},{confirmed:true});
 assert.equal(s.readResearchNote('NVDA')?.question,'new');assert.equal(s.readResearchNote('MSFT')?.question,'third');
});

test('confirmed native delete rejects failed persistence and keeps the saved question',async()=>{
 const s=setup();await seed(s);s.failWrites();
 await assert.rejects(Promise.resolve(s.deleteResearchNote('AAPL',{confirmed:true})),/full/);
 assert.equal(s.readResearchNote('AAPL')?.question,'old');
});

test('reset invalidates deferred research writes so queued cards cannot be recreated after a successful clear',async()=>{
 const s=setup();await seed(s);const hold=s.holdWrites();
 const first=s.saveResearchNote('AAPL',{question:'updated'},{confirmed:true});await hold.entered;
 const second=s.saveResearchNote('NVDA',{question:'new'},{confirmed:true});
 const settled=Promise.allSettled([first,second]);
 const clear=s.clearStored();hold.release();await clear;
 const results=await settled;assert.deepEqual(results.map(r=>r.status),['rejected','rejected']);
 assert.equal(s.readStored(s.RESEARCH_KEY),null);assert.equal(s.disk.has(`${s.RESEARCH_KEY}:research-A`),false);
});

test('account reinitialization rejects old deferred research edits before they can reach the new account',async()=>{
 const s=setup();await seed(s);const hold=s.holdWrites();
 const first=s.saveResearchNote('AAPL',{question:'updated'},{confirmed:true});await hold.entered;
 const second=s.saveResearchNote('NVDA',{question:'new'},{confirmed:true}),settled=Promise.allSettled([first,second]);
 s.setIdentity();const initialize=s.initializeStorage();hold.release();await initialize;
 assert.deepEqual((await settled).map(r=>r.status),['rejected','rejected']);
 assert.equal(s.readResearchNote('NVDA'),null);assert.equal(s.disk.has(`${s.RESEARCH_KEY}:research-B`),false);
});

test('browser reset invalidates a research save deferred before its first write',async()=>{
 const s=setup({native:false});
 const save=s.saveResearchNote('AAPL',{question:'new'},{confirmed:true}),settled=Promise.allSettled([save]);
 await s.clearStored();assert.equal((await settled)[0].status,'rejected');assert.equal(s.disk.has(s.RESEARCH_KEY),false);
});
