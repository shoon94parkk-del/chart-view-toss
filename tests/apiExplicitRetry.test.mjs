import test from 'node:test';
import assert from 'node:assert/strict';
import {homeBootstrap,pickMonitor,clearApiCache} from '../src/api.js';

for(const [name,load] of [['bootstrap',homeBootstrap]]) {
  test(`${name}: explicit retry replaces a cached malformed successful response`,async()=>{
    const original=globalThis.fetch;let calls=0;
    globalThis.fetch=async()=>Response.json(++calls===1?{invalid:true}:{recommendations:[],stocks:[]});
    clearApiCache();
    try {
      assert.deepEqual(await load(),{invalid:true});
      assert.deepEqual(await load(),{invalid:true});assert.equal(calls,1);
      assert.deepEqual(await load({force:true}),{recommendations:[],stocks:[]});assert.equal(calls,2);
    }finally{globalThis.fetch=original;clearApiCache();}
  });
}

test('monitor: malformed published response falls back to validated dated snapshot',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async url=>{
  calls++;
  const path=new URL(String(url)).pathname;
  return Response.json(path.startsWith('/api/published-data/')?{invalid:true}:{picks:[],generatedAt:'2026-10-19T16:41:35+09:00'});
 };
 clearApiCache();
 try {
  const first=await pickMonitor();
  assert.deepEqual(first,{picks:[],generatedAt:'2026-10-19T16:41:35+09:00'});
  assert.deepEqual(await pickMonitor(),first);
  assert.equal(calls,2);
  assert.deepEqual(await pickMonitor({force:true}),first);
  assert.equal(calls,4);
 }finally{globalThis.fetch=original;clearApiCache();}
});

test('news explicit retry reaches the provider-error retry route without retaining a failed body',async()=>{
 const {personalizedNews}=await import('../src/api.js');
 const original=globalThis.fetch;let calls=0;const urls=[];
 globalThis.fetch=async url=>{urls.push(String(url));return Response.json(++calls===1?{items:[],errors:[{code:'provider_error'}]}:{items:[{title:'restored'}],errors:[]});};
 clearApiCache();
 try{
  assert.equal((await personalizedNews(['AAPL'])).errors.length,1);
  assert.equal((await personalizedNews(['AAPL'],[],{force:true})).items[0].title,'restored');assert.equal(calls,2);
  assert.equal(new URL(urls[1]).searchParams.get('force'),'true');
  assert.equal((await personalizedNews(['AAPL'])).items[0].title,'restored');assert.equal(calls,3,'failed initial response must not remain cached');
  await personalizedNews(['AAPL']);assert.equal(calls,3,'successful normal responses keep existing cache');
 }finally{globalThis.fetch=original;clearApiCache();}
});
