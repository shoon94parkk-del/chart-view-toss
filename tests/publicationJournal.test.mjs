import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {homeChanges} from '../src/insightModel.js';

const source=()=>readFileSync(new URL('../src/publicationJournal.js',import.meta.url),'utf8').replaceAll('export ','');
function api(){
 const context=vm.createContext({});
 vm.runInContext(source()+'\nthis.api={publicationFingerprint,publicationStatus,mergePublications,createPublicationJournal};',context);
 return context.api;
}
const row=(changes={})=>({kind:'exports',route:'exports',target:'items',basisDate:'2026-09',value:'+4.0%',observation:'YoY +4.0%',...changes});
const plain=value=>JSON.parse(JSON.stringify(value));
const drain=()=>new Promise(resolve=>setImmediate(resolve));

test('publication comparison uses the public period and content, including unchanged returns',()=>{
 const {publicationStatus}=api(),baseline=[row()];
 assert.equal(publicationStatus(row(),[]).label,'기준 자료');
 assert.equal(publicationStatus(row(),baseline).label,'지난 조회와 같음');
 assert.equal(publicationStatus(row({basisDate:'2026-10'}),baseline).label,'기준기간 갱신');
 assert.equal(publicationStatus(row({value:'+5.0%'}),baseline).label,'표시값 변경');
 assert.equal(publicationStatus(row({basisDate:'2026-08'}),baseline).label,'이전 기준 자료');
 assert.equal(publicationStatus(row({fetchedAt:'2099-01-01',buildTimestamp:'2099-01-01'}),baseline).label,'지난 조회와 같음');
});

test('snapshots contain only public fingerprint fields and reject collection timestamps as periods',()=>{
 const {publicationFingerprint}=api();
 assert.deepEqual(plain(publicationFingerprint(row({question:'private',search:'private',watchlist:['private'],fetchedAt:'now'}))),row());
 for(const basisDate of ['2026-09-31','2026-13','2026-10-16T01:00:00Z','기준일 미제공',''])assert.equal(publicationFingerprint(row({basisDate})),null);
});

test('merges retain the newest public period, preserve sibling topics and bound the journal',()=>{
 const {mergePublications}=api();
 const original=[row(),row({target:'quadrant',value:'+3.0%'})];
 assert.deepEqual(plain(mergePublications(original,[row({basisDate:'2026-08',value:'+9.0%'})])),original);
 const merged=mergePublications(original,[row({value:'+5.0%'})]);
 assert.equal(merged.find(value=>value.target==='quadrant').value,'+3.0%');
 assert.equal(merged.find(value=>value.target==='items').value,'+5.0%');
 const bounded=mergePublications([],Array.from({length:20},(_,index)=>row({target:'topic-'+index})));
 assert.equal(bounded.length,12);
 assert.equal(new Set(bounded.map(value=>value.target)).size,12);
});

test('each mount freezes one baseline while confirmed writes merge after preceding writes settle',async()=>{
 const {createPublicationJournal}=api();
 let stored='[]',reads=0,release;
 const writes=[];
 const journal=createPublicationJournal({read:()=>{reads++;return stored;},write:async(value,options)=>{writes.push(options);if(writes.length===1)await new Promise(resolve=>{release=resolve;});stored=value;},getContext:()=>1,isCurrent:context=>context===1});
 const first=journal.start();
 assert.equal(reads,1);
 const a=first.remember([row()]);await drain();
 const b=first.remember([row({target:'quadrant'})]);await drain();
 assert.equal(writes.length,1);
 assert.equal(first.classify(row()).label,'기준 자료','a sibling completion cannot turn the frozen baseline into an unchanged return');
 release();await Promise.all([a,b]);
 assert.deepEqual(JSON.parse(stored).map(value=>value.target).sort(),['items','quadrant']);
 assert.deepEqual(plain(writes),[{confirmed:true},{confirmed:true}]);
 const next=journal.start();
 assert.equal(next.classify(row()).label,'지난 조회와 같음');
 const before=writes.length;
 await next.remember([row()]);
 await next.remember([row({value:'+9.0%'})],{status:'pending'});
 await next.remember([row({value:'+9.0%'})],{status:'error'});
 assert.equal(writes.length,before,'same, pending and failed observations never create a write or change');
});

test('a departed storage generation cannot revive old observations after reset or account change',async()=>{
 const {createPublicationJournal}=api();
 let generation=1,stored='[]',release;
 const writes=[];
 const journal=createPublicationJournal({read:()=>stored,write:async value=>{writes.push(value);await new Promise(resolve=>{release=resolve;});stored=value;},getContext:()=>generation,isCurrent:context=>context===generation});
 const session=journal.start();
 const first=session.remember([row()]);await drain();
 const queued=session.remember([row({target:'quadrant'})]);
 generation++;release();await first;
 stored='[]';
 assert.equal(await queued,false);
 assert.equal(await session.remember([row({basisDate:'2026-10'})]),false);
 assert.equal(writes.length,1);
 assert.equal(stored,'[]');
});

test('a failed confirmed write leaves the saved baseline intact and allows a later successful retry',async()=>{
 const {createPublicationJournal}=api();
 let stored=JSON.stringify([row()]),fail=true;
 const journal=createPublicationJournal({read:()=>stored,write:async value=>{if(fail)throw Error('bridge offline');stored=value;},getContext:()=>1,isCurrent:()=>true});
 const session=journal.start();
 assert.equal(await session.remember([row({value:'+5.0%'})]),false);
 assert.equal(JSON.parse(stored)[0].value,'+4.0%');
 fail=false;assert.equal(await session.remember([row({value:'+5.0%'})]),true);
 assert.equal(JSON.parse(stored)[0].value,'+5.0%');
});

test('a rapid remount captures its frozen baseline after preceding confirmed saves settle',async()=>{
 const {createPublicationJournal}=api();
 let stored=JSON.stringify([row({basisDate:'2026-08'})]),release,reads=0;
 const journal=createPublicationJournal({read:()=>{reads++;return stored;},write:async value=>{await new Promise(resolve=>{release=resolve;});stored=value;},getContext:()=>1,isCurrent:()=>true});
 const first=journal.start(),saving=first.remember([row()]);await drain();
 const before=reads,returning=journal.start();
 assert.equal(reads,before,'return baseline must not read the uncommitted old store');
 assert.equal(returning.classify(row()).label,'기준 자료','a pending baseline makes no new-period claim');
 release();await saving;await returning.ready;
 assert.equal(returning.classify(row()).label,'지난 조회와 같음');
 const after=reads;returning.classify(row());returning.classify(row());
 assert.equal(reads,after,'the mount baseline remains a single read after it is ready');
});

function homeHarness(journal){
 const requests={exports:[],stocks:[]};
 const context=vm.createContext({homeChanges,window:{},loadExportMomentumSnapshot:()=>new Promise((resolve,reject)=>requests.exports.push({resolve,reject})),homeScreenerSummary:()=>new Promise((resolve,reject)=>requests.stocks.push({resolve,reject}))});
 vm.runInContext(readFileSync(new URL('../src/homeGesturePaint.js',import.meta.url),'utf8').replaceAll('export ','')+'\n'+readFileSync(new URL('../src/homeChangesView.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),context);
 const nodes=Object.fromEntries(['data-home-changes','data-home-change-status','data-home-change-retry','data-home-change-toggle'].map(key=>[key,{innerHTML:'',textContent:'',hidden:true,setAttribute(k,v){this[k]=v;}}]));
 const subtitle={textContent:''};
 const host={isConnected:true,querySelector:key=>key==='.home-changes-title p'?subtitle:nodes[key.slice(1,-1)]};
 return {requests,nodes,subtitle,mount:()=>context.mountHomeChanges(host,{journal})};
}

test('Home shows a stable period change through sibling loading, then identifies an unchanged return',async()=>{
 const {createPublicationJournal}=api();
 const exports={period:'2026-09',summary:{exportYoY:4},itemPeriod:'2026-08',items:[{key:'semiconductor',exportWeightYoY:3,unitValueYoY:2}]};
 const stocks={schemaVersion:1,tradeDate:'2026-10-02',counts:{volumeSurge:1}};
 let stored=JSON.stringify(homeChanges({...exports,period:'2026-08'},{})),reads=0;
 const journal=createPublicationJournal({read:()=>{reads++;return stored;},write:async value=>{stored=value;},getContext:()=>1,isCurrent:()=>true});
 const first=homeHarness(journal),mount=first.mount();
 assert.equal(reads,1,'mount captures the baseline before either provider completes');
 first.requests.exports[0].resolve(exports);await drain();
 assert.match(first.nodes['data-home-changes'].innerHTML,/기준기간 갱신/);
 first.requests.stocks[0].resolve(stocks);await mount;await drain();
 const html=first.nodes['data-home-changes'].innerHTML;
 assert.match(html,/기준기간 갱신/);
 assert.match(html,/기준 자료/);
 assert.equal((html.match(/<article class="home-change-card/g)||[]).length,3);
 assert.match(html,/home-change-more[^>]*hidden/);
 assert.match(first.subtitle.textContent,/관세청.*2026-09.*2026-08.*조건 검색.*2026-10-02/);
 const second=homeHarness(journal),returning=second.mount();
 second.requests.exports[0].resolve(exports);second.requests.stocks[0].resolve(stocks);await returning;
 assert.equal((second.nodes['data-home-changes'].innerHTML.match(/data-publication-state="same"/g)||[]).length,3);
});

test('Home journals actual dated source observations and ignores failed, pending and update-clock-only payloads',async()=>{
 const {createPublicationJournal}=api();
 let stored=JSON.stringify([row({basisDate:'2026-08'})]),writes=0;
 const journal=createPublicationJournal({read:()=>stored,write:async value=>{stored=value;writes++;},getContext:()=>1,isCurrent:()=>true});
 const pending=homeHarness(journal),mount=pending.mount();
 pending.requests.exports[0].resolve({pending:true,period:'2026-09',summary:{exportYoY:4}});
 pending.requests.stocks[0].resolve({schemaVersion:1,updated:'2026-10-02',counts:{volumeSurge:1}});await mount;await drain();
 assert.equal(writes,0);
 assert.doesNotMatch(pending.nodes['data-home-changes'].innerHTML,/기준기간 갱신|표시값 변경/);
 for(const flags of [{pending:true},{refreshing:true},{refreshScheduled:true},{error:'unavailable'},{available:false},{status:'pending'}]){
  const loading=homeHarness(journal),settled=loading.mount();
  loading.requests.exports[0].resolve({});
  loading.requests.stocks[0].resolve({schemaVersion:1,tradeDate:'2026-10-02',counts:{volumeSurge:3},...flags});
  await settled;await drain();
  assert.equal(writes,0,'an unconfirmed summary cannot become the next comparison baseline');
  assert.match(loading.nodes['data-home-changes'].innerHTML,/거래량 2배 이상.*3개/s,'the dated aggregate remains visible while revalidation is scheduled');
  assert.doesNotMatch(loading.nodes['data-home-changes'].innerHTML,/기준기간 갱신|표시값 변경/);
 }
 const failed=homeHarness(journal),retry=failed.mount();
 failed.requests.exports[0].reject(Error('offline'));failed.requests.stocks[0].reject(Error('offline'));await retry;await drain();
 assert.equal(writes,0);
});
