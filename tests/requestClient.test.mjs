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

const preloadEntry = (promise, { base='https://data.example', path='/home', startedAt=0, settledAt=null, status='pending' }={}) => {
 promise.catch(()=>{});
 return {base,path,startedAt,settledAt,status,promise,rebudget:()=>true};
};

test('adopted early transport shares ordinary and in-flight force consumers, then enters the existing TTL cache',async()=>{
 let resolve, calls=0, now=20;
 const entry=preloadEntry(new Promise(done=>{resolve=done;}));
 const request=createRequestClient({base:entry.base,now:()=>now,fetchImpl:async()=>{calls++;return Response.json({value:'normal'});}});
 assert.equal(request.adopt('/home',entry,{ttlMs:100,timeoutMs:12000}),true);
 const a=request('/home',{ttlMs:100}),b=request('/home',{ttlMs:100,force:true});
 entry.settledAt=20;entry.status='fulfilled';resolve({value:'early'});
 const values=await Promise.all([a,b]);assert.deepEqual(values,[{value:'early'},{value:'early'}]);assert.equal(calls,0);
 values[0].value='changed';now=100;assert.deepEqual(await request('/home',{ttlMs:100}),{value:'early'});
 now=121;assert.deepEqual(await request('/home',{ttlMs:100}),{value:'normal'});assert.equal(calls,1);
});

test('an already completed adoption uses its actual settlement clock rather than extending TTL at module startup',async()=>{
 let calls=0,now=80;
 const entry=preloadEntry(Promise.resolve({value:'early'}),{status:'fulfilled',settledAt:20});
 const request=createRequestClient({base:entry.base,now:()=>now,fetchImpl:async()=>{calls++;return Response.json({value:'normal'});}});
 assert.equal(request.adopt('/home',entry,{ttlMs:100}),true);
 assert.deepEqual(await request('/home',{ttlMs:100}),{value:'early'});now=121;
 assert.deepEqual(await request('/home',{ttlMs:100}),{value:'normal'});assert.equal(calls,1);
});

test('initial failed lifecycle is shared during startup without fallback, explicit force retries after settlement',async()=>{
 let calls=0,now=10;
 const entry=preloadEntry(Promise.reject(Object.assign(new Error('timeout'),{code:'timeout'})),{status:'rejected',settledAt:10});
 const request=createRequestClient({base:entry.base,now:()=>now,fetchImpl:async()=>{calls++;return Response.json({value:'recovered'});}});
 assert.equal(request.adopt('/home',entry,{ttlMs:100}),true);
 await assert.rejects(request('/home',{ttlMs:100}),error=>error.code==='timeout');
 await assert.rejects(request('/home',{ttlMs:100}),error=>error.code==='timeout');assert.equal(calls,0);
 assert.deepEqual(await request('/home',{ttlMs:100,force:true}),{value:'recovered'});assert.equal(calls,1);
});

test('failed warm ownership expires at the original 15-second window and ordinary later entry recovers',async()=>{
 let calls=0,now=12000;
 const entry=preloadEntry(Promise.reject(Object.assign(new Error('network'),{code:'network'})),{status:'rejected',settledAt:12000});
 const request=createRequestClient({base:entry.base,now:()=>now,fetchImpl:async()=>{calls++;return Response.json({value:'later'});}});
 request.adopt('/home',entry,{ttlMs:60000});
 await assert.rejects(request('/home',{ttlMs:60000}));assert.equal(calls,0);
 now=15000;assert.deepEqual(await request('/home',{ttlMs:60000}),{value:'later'});assert.equal(calls,1);
});

test('cache clear removes settled initial failure without canceling another in-flight request',async()=>{
 let calls=0, resolve;
 const entry=preloadEntry(Promise.reject(Object.assign(new Error('HTTP 429'),{code:'rate_limited',status:429})),{status:'rejected',settledAt:0});
 const request=createRequestClient({base:entry.base,now:()=>0,fetchImpl:async url=>{calls++;return url.endsWith('/other')?new Promise(done=>{resolve=()=>done(Response.json({value:'other'}));}):Response.json({value:'retry'});}});
 request.adopt('/home',entry,{ttlMs:100});await assert.rejects(request('/home',{ttlMs:100}),error=>error.status===429);
 const other=request('/other');request.clear();const same=request('/other');resolve();
 assert.deepEqual(await Promise.all([other,same]),[{value:'other'},{value:'other'}]);
 assert.deepEqual(await request('/home',{ttlMs:100}),{value:'retry'});assert.equal(calls,2);
});

test('early adoption rejects a different base/path and does not reuse old successful entries',async()=>{
 let calls=0,now=200;
 const request=createRequestClient({base:'https://data.example',now:()=>now,fetchImpl:async()=>{calls++;return Response.json({value:'actual-base'});}});
 assert.equal(request.adopt('/home',preloadEntry(Promise.resolve({value:'foreign'}),{base:'https://foreign.example',status:'fulfilled',settledAt:20}),{ttlMs:100}),false);
 assert.equal(request.adopt('/other',preloadEntry(Promise.resolve({value:'wrong-path'}),{status:'fulfilled',settledAt:20}),{ttlMs:100}),false);
 assert.equal(request.adopt('/home',preloadEntry(Promise.resolve({value:'old'}),{status:'fulfilled',settledAt:20}),{ttlMs:100}),false);
 assert.deepEqual(await request('/home',{ttlMs:100}),{value:'actual-base'});assert.equal(calls,1);
});

test('market progress is delivered without entering the completed-success TTL cache',async()=>{
 let calls=0;
 const request=createRequestClient({base:'https://data.example',fetchImpl:async(_,options)=>{
  assert.equal('cacheIf' in options,false);calls++;
  return Response.json({results:Array.from({length:calls===1?0:calls===2?3:4},(_,i)=>({ticker:String(i),price:100+i})),refreshing:calls<3});
 }});
 const options={ttlMs:15000,cacheIf:value=>!value.refreshing};
 assert.equal((await request('/market',options)).results.length,0);
 assert.equal((await request('/market',options)).results.length,3);
 assert.equal((await request('/market',options)).results.length,4);
 assert.equal((await request('/market',options)).results.length,4);assert.equal(calls,3);
});

test('adopted partial market uses the same completed-cache predicate as ordinary market data',async()=>{
 let calls=0;
 const progress={results:[{ticker:'^KS11',price:3500}],refreshing:true};
 const entry=preloadEntry(Promise.resolve(progress),{status:'fulfilled',settledAt:0});
 const request=createRequestClient({base:entry.base,now:()=>0,fetchImpl:async()=>{calls++;return Response.json({results:[{ticker:'^KS11',price:3600}],refreshing:false});}});
 const options={ttlMs:15000,cacheIf:value=>!value.refreshing};request.adopt('/home',entry,options);
 assert.deepEqual(await request('/home',options),progress);
 assert.equal((await request('/home',options)).results[0].price,3600);assert.equal(calls,1);
});

test('ordinary held JSON body times out even if transport ignores abort, and late data cannot overwrite recovery',async()=>{
 let calls=0,finishBody,signal;
 const request=createRequestClient({base:'https://data.example',fetchImpl:async(_,options)=>{
  calls++;signal=options.signal;
  return calls===1?{ok:true,json:()=>new Promise(done=>{finishBody=done;})}:Response.json({price:200});
 }});
 await assert.rejects(request('/market',{ttlMs:15000,timeoutMs:10}),error=>error.code==='timeout');assert.equal(signal.aborted,true);
 assert.deepEqual(await request('/market',{ttlMs:15000,timeoutMs:100}),{price:200});
 finishBody({price:100});await new Promise(done=>setImmediate(done));
 assert.deepEqual(await request('/market',{ttlMs:15000}),{price:200});assert.equal(calls,2);
});

test('caller cancellation settles a held transport promptly without waiting for the timeout or retry',async()=>{
 let calls=0,finishBody;
 const request=createRequestClient({base:'https://data.example',fetchImpl:async()=>{calls++;return {ok:true,json:()=>new Promise(done=>{finishBody=done;})};}});
 const controller=new AbortController(),waiting=request('/market',{timeoutMs:12000,signal:controller.signal});
 await new Promise(done=>setImmediate(done));controller.abort();
 await assert.rejects(waiting,error=>error.name==='AbortError');assert.equal(calls,1);
 finishBody({price:100});await new Promise(done=>setImmediate(done));
});
