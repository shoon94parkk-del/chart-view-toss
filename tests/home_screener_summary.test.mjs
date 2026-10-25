import test from 'node:test';
import assert from 'node:assert/strict';
import {homeChanges} from '../src/insightModel.js';
import {clearApiCache} from '../src/api.js';

const summary={schemaVersion:1,tradeDate:'2026-10-02',updated:'2026-10-03T01:00:00Z',counts:{volumeSurge:4}};

test('Home summary preserves the full-universe volume condition and exact public card',()=>{
 const raw={tradeDate:summary.tradeDate,updated:summary.updated,stocks:[null,'',1.99,2,' 2.4 ',3,'0x2',Infinity,'not available'].map(volumeRatio=>({volumeRatio}))};
 assert.deepEqual(homeChanges({},summary),homeChanges({},raw));
 assert.equal(homeChanges({},summary)[0]?.value,'4개');
 assert.equal(homeChanges({},summary)[0]?.target,'volume-surge');
 assert.deepEqual(homeChanges({},{...summary,counts:{volumeSurge:0}}),[]);
});

test('Home summary keeps actual source dates and never substitutes an update clock for a missing period',()=>{
 const rows=homeChanges({period:'2026-09',summary:{exportYoY:4},itemPeriod:'2026-08',items:[{key:'semiconductor',exportWeightYoY:3,unitValueYoY:2}]},summary);
 assert.deepEqual(rows.map(row=>row.basisDate),['2026-09','2026-08','2026-10-02']);
 assert.equal(homeChanges({},{...summary,tradeDate:undefined})[0]?.basisDate,summary.updated);
 assert.deepEqual(homeChanges({},{...summary,tradeDate:undefined,updated:undefined}),[]);
 for(const count of [-1,1.5,'4',null,undefined,NaN,Infinity])assert.deepEqual(homeChanges({},{...summary,counts:{volumeSurge:count}}),[]);
});

const source=await import('../src/homeScreenerSource.js').catch(()=>({}));
const load=options=>{
 assert.equal(typeof source.homeScreenerSummary,'function','the small Home source is available');
 return source.homeScreenerSummary(options);
};
function transport(payloads){
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options)=>{
  calls.push({url,options});
  const payload=payloads.shift();
  return {ok:true,json:async()=>structuredClone(payload)};
 };
 return {calls,restore(){globalThis.fetch=original;clearApiCache();}};
}

test('Home summary shares a 30-second API cache and explicit retry bypasses it without a full screener request',async()=>{
 clearApiCache();
 const wire=transport([summary,{...summary,counts:{volumeSurge:5}}]);
 try{
  assert.equal((await load()).counts.volumeSurge,4);
  assert.equal((await load()).counts.volumeSurge,4);
  assert.equal(wire.calls.length,1);
  assert.equal((await load({force:true})).counts.volumeSurge,5);
  assert.equal(wire.calls.length,2);
  assert.ok(wire.calls.every(call=>new URL(call.url).pathname==='/api/home-screener-summary'));
 }finally{wire.restore();}
});

test('malformed summaries fail visibly and never poison the next Home request',async()=>{
 for(const bad of [{}, {...summary,schemaVersion:2}, {...summary,counts:{volumeSurge:'4'}}, {...summary,counts:{volumeSurge:-1}}, {...summary,counts:{volumeSurge:1.5}}]){
  clearApiCache();const wire=transport([bad,summary]);
  try{
   await assert.rejects(()=>load(),/summary|schema|count/i);
   assert.equal((await load()).counts.volumeSurge,4);
   assert.equal(wire.calls.length,2);
  }finally{wire.restore();}
 }
});

test('pending and unavailable summaries never become completed cache entries',async()=>{
 for(const flags of [{pending:true},{refreshing:true},{refreshScheduled:true},{error:'unavailable'},{available:false},{status:'pending'},{status:'loading'},{status:'error'}]){
  clearApiCache();const wire=transport([{...summary,...flags},summary]);
  try{
   await load().catch(()=>{});
   assert.equal((await load()).counts.volumeSurge,4);
   assert.equal(wire.calls.length,2,JSON.stringify(flags));
  }finally{wire.restore();}
 }
});

test('returning Home revalidates when the existing 30-second freshness window expires',async()=>{
 clearApiCache();const wire=transport([summary,{...summary,counts:{volumeSurge:5}}]);
 const originalNow=Date.now;let now=originalNow();Date.now=()=>now;
 try{
  assert.equal((await load()).counts.volumeSurge,4);
  now+=29999;
  assert.equal((await load()).counts.volumeSurge,4);
  assert.equal(wire.calls.length,1);
  now++;
  assert.equal((await load()).counts.volumeSurge,5);
  assert.equal(wire.calls.length,2);
 }finally{Date.now=originalNow;wire.restore();}
});

test('an unavailable summary remains retryable without downloading the full screener as fallback',async()=>{
 clearApiCache();const originalFetch=globalThis.fetch,calls=[];
 globalThis.fetch=async url=>{calls.push(new URL(url).pathname);return {ok:false,status:503};};
 try{
  await assert.rejects(()=>load(),error=>error.status===503);
  assert.deepEqual(calls,['/api/home-screener-summary']);
 }finally{globalThis.fetch=originalFetch;clearApiCache();}
});
