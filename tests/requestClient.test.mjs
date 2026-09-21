import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestClient } from '../src/requestClient.js';

test('simultaneous GETs share a request, fresh result is reused, expiry revalidates', async()=>{
 let calls=0, now=0;
 const request=createRequestClient({base:'https://data.example',now:()=>now,fetchImpl:async()=>{calls++;return Response.json({value:calls})}});
 const [a,b]=await Promise.all([request('/prices',{ttlMs:100}),request('/prices',{ttlMs:100})]);
 assert.equal(calls,1);assert.deepEqual(a,b);
 a.value=99;assert.equal((await request('/prices',{ttlMs:100})).value,1);
 now=101;assert.equal((await request('/prices',{ttlMs:100})).value,2);
});
test('failed requests are not cached and do not add CORS-preflight headers', async()=>{
 let calls=0;
 const request=createRequestClient({base:'https://data.example',fetchImpl:async(url,opts)=>{calls++;assert.equal(opts.headers['Cache-Control'],undefined);return calls===1?new Response('',{status:503}):Response.json({ok:true})}});
 await assert.rejects(request('/test',{retries:0}));
 assert.deepEqual(await request('/test',{retries:0}),{ok:true});assert.equal(calls,2);
});
test('caller cancellation is immediate and never retried or cached',async()=>{
 let calls=0;
 const request=createRequestClient({base:'https://data.example',fetchImpl:async(_,opts)=>{calls++;return new Promise((resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(opts.signal.reason),{once:true}))}});
 const controller=new AbortController();const pending=request('/slow',{signal:controller.signal});controller.abort();
 await assert.rejects(pending,e=>e.name==='AbortError');assert.equal(calls,1);
});
test('timeout has one overall budget instead of resetting on retries',async()=>{
 let calls=0;
 const request=createRequestClient({base:'https://data.example',fetchImpl:async(_,opts)=>{calls++;return new Promise((resolve,reject)=>opts.signal.addEventListener('abort',()=>reject(opts.signal.reason),{once:true}))}});
 await assert.rejects(request('/slow',{timeoutMs:30,retries:1}),e=>e.code==='timeout');assert.equal(calls,1);
});
test('POST and requests with distinct query strings are never merged',async()=>{
 let calls=0;const request=createRequestClient({base:'https://data.example',fetchImpl:async()=>{calls++;return Response.json({calls})}});
 await Promise.all([request('/x?a=1'),request('/x?a=2'),request('/x',{method:'POST'}),request('/x',{method:'POST'})]);assert.equal(calls,4);
});
