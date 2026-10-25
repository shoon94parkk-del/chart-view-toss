import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {reviewConditionEvidence} from '../src/reviewRevisit.js';

const key='chartview-toss-research-tasks-v1';
const row=(symbol='AAPL',extra={})=>({symbol,question:'현금흐름 확인',reviewOn:'2026-10-25',updatedAt:'2026-10-20T00:00:00Z',conditions:[],...extra});
function setup({native=false}={}){
 const disk=new Map();let rows=[row()],identity='task-A',fail=false,gate=null,enteredResolve;
 const source=file=>readFileSync(`src/${file}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
 const context=vm.createContext({Date,Intl,JSON,Error,setTimeout,clearTimeout,Event,reviewConditionEvidence,
  isAppsInTossRuntime:()=>native,User:{getAnonymousKey:async()=>({type:'HASH',hash:identity})},
  document:{dispatchEvent:()=>{}},savedResearch:()=>({rows,error:false}),
  localStorage:{getItem:k=>disk.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('disk full');disk.set(k,v);},removeItem:k=>disk.delete(k)},
  Storage:{getItem:async k=>disk.get(k)??null,removeItem:async k=>disk.delete(k),setItem:async(k,v)=>{
   if(k.startsWith(key)&&gate){enteredResolve();await gate;}
   if(k.startsWith(key)&&fail){if(typeof fail==='number')fail--;throw Error('disk full');}disk.set(k,v);
  }},
 });
 vm.runInContext(source('storage')+'\n{'+source('researchTasks')+'\nthis.api={initializeStorage,clearStored,readStored,readResearchTasks,researchTaskState,completeResearchTask,undoResearchTask,postponeResearchTask};}',context);
 return {...context.api,disk,setRows:value=>{rows=value;},fail:value=>{fail=value;},switchAccount:()=>{identity='task-B';},hold:()=>{
  let release;const entered=new Promise(resolve=>{enteredResolve=resolve;});gate=new Promise(resolve=>{release=resolve;});return {entered,release:()=>{gate=null;release();}};
 }};
}
test('research queue uses KST calendar midnight and keeps undated or invalid dates in all only',()=>{
 const s=setup(),item=row();
 assert.equal(s.researchTaskState(item,{now:new Date('2026-10-24T14:59:59Z')}).kind,'future');
 assert.equal(s.researchTaskState(item,{now:new Date('2026-10-24T15:00:00Z')}).kind,'today');
 assert.equal(s.researchTaskState(item,{now:new Date('2026-10-25T15:00:00Z')}).kind,'overdue');
 assert.equal(s.researchTaskState(row('AAPL',{reviewOn:''})).kind,'undated');
 const invalid=s.researchTaskState(row('AAPL',{reviewOn:'2026-02-30'}));assert.equal(invalid.kind,'undated');assert.equal(invalid.dateError,true);
});
test('complete, postpone and undo persist separately and never change original research evidence',async()=>{
 const s=setup(),item=row(),original=JSON.stringify(item);
 await s.completeResearchTask(item,{now:new Date('2026-10-25T01:00:00Z')});
 assert.equal(s.researchTaskState(item).kind,'completed');
 assert.equal(s.researchTaskState(item).completedAt,'2026-10-25T01:00:00.000Z');
 await s.undoResearchTask(item);assert.notEqual(s.researchTaskState(item).kind,'completed');
 await s.postponeResearchTask(item,'2026-11-02');
 assert.equal(s.researchTaskState(item,{now:new Date('2026-10-25T01:00:00Z')}).kind,'future');
 assert.equal(s.researchTaskState(item).reviewOn,'2026-11-02');assert.equal(JSON.stringify(item),original);
 assert.deepEqual([...s.disk.keys()],[key]);
});
test('completion reopens after a changed question, source date, saved evidence or latest filing, but not a repeated same-source API check',async()=>{
 const s=setup(),item=row('AAPL',{observation:{checkedAt:'2026-10-21T00:00:00Z',filing:{label:'2026년 반기',receipt:'1'}}});s.setRows([item]);await s.completeResearchTask(item);
 for(const changed of [{question:'다른 질문'},{reviewOn:'2026-11-01'},{updatedAt:'2026-10-25T00:00:00Z'},{conditions:[{key:'margin',baseline:{value:0}}]},{observation:{...item.observation,filing:{label:'2026년 3분기',receipt:'2'}}}]){
  assert.notEqual(s.researchTaskState({...item,...changed}).kind,'completed');
 }
 assert.equal(s.researchTaskState({...item,observation:{...item.observation,checkedAt:'2026-10-25T01:00:00Z'}}).kind,'completed');
});
test('an unavailable filing refresh does not reopen a completion or discard its postponed date',async()=>{
 const s=setup(),item=row('AAPL',{observation:{checkedAt:'2026-10-21T00:00:00Z',filing:{label:'2026년 반기',receipt:'1'},conditions:[{id:'margin:self',matched:true}]}});s.setRows([item]);
 await s.postponeResearchTask(item,'2026-11-02');await s.completeResearchTask(item);
 const failed={...item,observation:{checkedAt:'2026-10-25T01:00:00Z',filing:null,lastKnownFiling:item.observation.filing,lastKnownConditions:item.observation.conditions,conditions:[{id:'margin:self',matched:null,reason:'조회 실패'}]}};
 assert.equal(s.researchTaskState(failed).kind,'completed');assert.equal(s.researchTaskState(failed).reviewOn,'2026-11-02');
 const changed={...item,observation:{...item.observation,filing:{label:'2026년 3분기',receipt:'2'}}};assert.notEqual(s.researchTaskState(changed).kind,'completed');
});
test('an identical first filing observation keeps completion while a newer known filing cannot be erased by a failed refresh',async()=>{
 const s=setup(),filing={label:'2026년 반기',receipt:'1'},item=row('AAPL',{filing});s.setRows([item]);await s.completeResearchTask(item);
 const same={...item,observation:{checkedAt:'2026-10-21T00:00:00Z',filing}};assert.equal(s.researchTaskState(same).kind,'completed');
 const newer={...item,observation:{filing:{label:'2026년 3분기',receipt:'2'}}};assert.notEqual(s.researchTaskState(newer).kind,'completed');
 const failed={...item,observation:{filing:null,lastKnownFiling:newer.observation.filing,conditions:[]}};assert.notEqual(s.researchTaskState(failed).kind,'completed');
});
test('meaningful peer condition changes reopen completion and unavailable condition results keep that newer revision',async()=>{
 const s=setup(),condition={id:'margin:NVDA',key:'margin',label:'peer margin',baseline:{matched:true,sourceUrls:['own-A','peer-A'],value:20,reference:10}},item=row('AAPL',{filing:{label:'same filing'},conditions:[condition]});s.setRows([item]);await s.completeResearchTask(item);
 const same={...item,observation:{filing:item.filing,conditions:[{id:condition.id,...condition.baseline}]}};assert.equal(s.researchTaskState(same).kind,'completed');
 const newCondition={id:condition.id,matched:false,sourceUrls:['own-A','peer-B'],value:20,reference:30},newer={...item,observation:{filing:item.filing,conditions:[newCondition]}};assert.notEqual(s.researchTaskState(newer).kind,'completed');
 const failed={...item,observation:{filing:null,lastKnownFiling:item.filing,conditions:[{id:condition.id,matched:null,reason:'peer unavailable'}],lastKnownConditions:[newCondition]}};assert.notEqual(s.researchTaskState(failed).kind,'completed');
});
test('future dates validate without normalizing impossible calendars; stale source cannot be completed',async()=>{
 const s=setup(),item=row();
 for(const date of ['2026-02-30','2026-13-01','26-1-1','',null])await assert.rejects(Promise.resolve().then(()=>s.postponeResearchTask(item,date)),/날짜/);
 assert.equal(s.disk.has(key),false);
 s.setRows([row('AAPL',{question:'changed'})]);await assert.rejects(s.completeResearchTask(item),/변경/);assert.equal(s.disk.has(key),false);
});
test('corrupt or unknown-version task stores remain intact and reject edits',async()=>{
 const s=setup();
 for(const raw of ['{broken','[]','{"version":2,"tasks":{}}','{"version":1,"tasks":{"AAPL":{"revision":"x","completedAt":"invalid","reviewOn":""}}}']){
  s.disk.set(key,raw);assert.equal(s.readResearchTasks().error,true);await assert.rejects(s.completeResearchTask(row()),/읽/);assert.equal(s.disk.get(key),raw);
 }
});
test('impossible completed calendar timestamps are corrupt instead of hiding research as completed',async()=>{
 const s=setup();await s.completeResearchTask(row());const saved=JSON.parse(s.disk.get(key));saved.tasks.AAPL.completedAt='2026-02-30T01:00:00Z';const raw=JSON.stringify(saved);s.disk.set(key,raw);
 assert.equal(s.readResearchTasks().error,true);assert.notEqual(s.researchTaskState(row()).kind,'completed');await assert.rejects(s.undoResearchTask(row()),/읽/);assert.equal(s.disk.get(key),raw);
});
test('one failed concurrent native write does not cancel or overwrite the following company',async()=>{
 const s=setup({native:true});await s.initializeStorage();s.setRows([row(),row('NVDA')]);s.fail(1);
 const result=await Promise.allSettled([s.completeResearchTask(row()),s.completeResearchTask(row('NVDA'))]);assert.deepEqual(result.map(item=>item.status),['rejected','fulfilled']);
 assert.notEqual(s.researchTaskState(row()).kind,'completed');assert.equal(s.researchTaskState(row('NVDA')).kind,'completed');assert.equal(JSON.parse(s.disk.get(`${key}:task-A`)).tasks.AAPL,undefined);
});
test('failed writes remain retryable and concurrent writes preserve both companies',async()=>{
 const s=setup();s.setRows([row(),row('NVDA')]);s.fail(true);await assert.rejects(s.completeResearchTask(row()),/full/);assert.notEqual(s.researchTaskState(row()).kind,'completed');
 s.fail(false);await Promise.all([s.completeResearchTask(row()),s.postponeResearchTask(row('NVDA'),'2026-11-02')]);
 assert.equal(s.researchTaskState(row()).kind,'completed');assert.equal(s.researchTaskState(row('NVDA')).reviewOn,'2026-11-02');
});
test('reset invalidates browser writes before the first persistence',async()=>{
 const s=setup();const save=s.completeResearchTask(row()),settled=Promise.allSettled([save]);await s.clearStored();assert.equal((await settled)[0].status,'rejected');assert.equal(s.disk.has(key),false);
});
for(const action of ['reset','account'])test(`deferred native ${action} rejects old edits and queued actions without restoring personal data`,async()=>{
 const s=setup({native:true});await s.initializeStorage();s.setRows([row(),row('NVDA')]);const hold=s.hold();
 const first=s.completeResearchTask(row());await hold.entered;
 const second=s.postponeResearchTask(row('NVDA'),'2026-11-02'),settled=Promise.allSettled([first,second]);
 if(action==='account')s.switchAccount();const change=action==='reset'?s.clearStored():s.initializeStorage();hold.release();await change;
 assert.deepEqual((await settled).map(r=>r.status),['rejected','rejected']);assert.equal(s.readStored(key),null);assert.equal(s.disk.has(`${key}:task-B`),false);
 if(action==='reset')assert.equal(s.disk.has(`${key}:task-A`),false);
});
