import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRequestClient} from '../src/requestClient.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const base='https://chart-view-pkv8.onrender.com';
function runWarm(fetchImpl){
 let clock=0,id=0;const timers=new Map(),requests=[];
 const context={Date:{now:()=>clock},performance:{now:()=>clock},AbortController,location:{hash:'#home',pathname:'/'},
  fetch:(url,options)=>{requests.push({url,options});return fetchImpl(url,options);},
  setTimeout:(fn,ms)=>{timers.set(++id,{fn,at:clock+ms});return id;},clearTimeout:id=>timers.delete(id)};
 context.window=context;vm.runInNewContext(script,context);
 const advance=ms=>{clock+=ms;for(const [key,timer] of [...timers])if(timer.at<=clock){timers.delete(key);timer.fn();}};
 return {entries:context.__chartviewHomeWarm,requests,timers,advance,elapseWithoutTimers:ms=>{clock+=ms;},now:()=>clock};
}

test('actual inline Home fetch aborts a held response body within its one budget and never caches late data',async()=>{
 let finishBody;
 const h=runWarm(url=>url.endsWith('/api/market-now')?Promise.resolve({ok:true,json:()=>new Promise(resolve=>{finishBody=resolve;})}):Promise.resolve(Response.json({results:[]})));
 await settle();const entry=h.entries.market;
 assert.equal(typeof entry.rebudget,'function');entry.rebudget(30);
 let normalCalls=0;
 const request=createRequestClient({base,now:h.now,fetchImpl:async()=>{normalCalls++;return Response.json({results:[{ticker:'^KS11',price:200}]});}});
 assert.equal(request.adopt('/api/market-now',entry,{ttlMs:15000,timeoutMs:30}),true);
 const waiting=request('/api/market-now',{ttlMs:15000});h.advance(30);
 await assert.rejects(waiting,error=>error.code==='timeout');assert.equal(h.requests[0].options.signal.aborted,true);assert.equal(normalCalls,0);
 assert.deepEqual(await request('/api/market-now',{ttlMs:15000,force:true}),{results:[{ticker:'^KS11',price:200}]});
 finishBody({results:[{ticker:'^KS11',price:100}]});await settle();
 assert.deepEqual(await request('/api/market-now',{ttlMs:15000}),{results:[{ticker:'^KS11',price:200}]});assert.equal(normalCalls,1);
 assert.equal(h.timers.size,0);
});

test('HTML rejected response is handled before module handoff and startup consumers do not refetch it',async()=>{
 const h=runWarm(()=>Promise.resolve(new Response('',{status:429})));
 await settle();let calls=0;
 const request=createRequestClient({base,now:h.now,fetchImpl:async()=>{calls++;return Response.json({results:[]});}});
 assert.equal(request.adopt('/api/market-now',h.entries.market,{ttlMs:15000}),true);
 await assert.rejects(request('/api/market-now',{ttlMs:15000}),error=>error.code==='rate_limited'&&error.status===429);
 await assert.rejects(request('/api/market-now',{ttlMs:15000}),error=>error.status===429);
 assert.equal(calls,0);assert.equal(h.timers.size,0);
});

test('configured handoff budget is measured from HTML start, not reset when app module arrives',async()=>{
 const h=runWarm(()=>new Promise(()=>{}));h.advance(80);
 const entry=h.entries.market;assert.equal(typeof entry.rebudget,'function');
 const request=createRequestClient({base,now:h.now,fetchImpl:async()=>{throw new Error('unexpected fallback');}});
 request.adopt('/api/market-now',entry,{ttlMs:15000,timeoutMs:100});
 const waiting=request('/api/market-now',{ttlMs:15000,timeoutMs:100});h.advance(20);
 await assert.rejects(waiting,error=>error.code==='timeout');assert.equal(h.now(),100);assert.equal(h.requests.length,3);
 h.advance(12000);await settle();assert.equal(h.timers.size,0);
});

test('HTML Home default is five seconds and a larger module budget cannot extend that original deadline',async()=>{
 const h=runWarm(()=>new Promise(()=>{}));h.advance(4900);let calls=0;
 const request=createRequestClient({base,now:h.now,fetchImpl:async()=>{calls++;return Response.json({results:[]});}});
 request.adopt('/api/market-now',h.entries.market,{ttlMs:15000,timeoutMs:12000});
 const waiting=request('/api/market-now',{ttlMs:15000});h.advance(100);
 await assert.rejects(waiting,error=>error.code==='timeout');assert.equal(h.now(),5000);assert.equal(calls,0);
 await settle();assert.equal(h.timers.size,0);
});

test('invalid JSON completes the same initial lifecycle as a typed error, with no ordinary retry layer',async()=>{
 const h=runWarm(()=>Promise.resolve(new Response('{invalid',{headers:{'Content-Type':'application/json'}})));
 await settle();let calls=0;
 const request=createRequestClient({base,now:h.now,fetchImpl:async()=>{calls++;return Response.json({ok:true});}});
 request.adopt('/api/home-snapshot',h.entries.snapshot,{ttlMs:60000});
 await assert.rejects(request('/api/home-snapshot',{ttlMs:60000}),error=>error.code==='invalid_json');
 assert.equal(calls,0);assert.equal(h.requests.length,3);assert.equal(h.timers.size,0);
});

test('late body settlement cannot win when a busy event loop delayed the deadline timer',async()=>{
 let finishBody;
 const h=runWarm(url=>url.endsWith('/api/market-now')?Promise.resolve({ok:true,json:()=>new Promise(done=>{finishBody=done;})}):Promise.resolve(Response.json({results:[]})));
 h.entries.market.rebudget(30);await settle();h.elapseWithoutTimers(31);
 finishBody({results:[{ticker:'^KS11',price:100}]});
 await assert.rejects(h.entries.market.promise,error=>error.code==='timeout');
 assert.equal(h.requests[0].options.signal.aborted,true);assert.equal(h.entries.market.status,'rejected');assert.equal(h.timers.size,0);
});

let moduleRun=0;
async function withApi(h,fetchImpl,verify){
 const previousFetch=globalThis.fetch,previousNow=Date.now;
 globalThis.fetch=fetchImpl;Date.now=h.now;globalThis.__chartviewHomeWarm=h.entries;
 try{await verify(await import(`../src/api.js?warm-lifecycle=${++moduleRun}`));}
 finally{globalThis.fetch=previousFetch;Date.now=previousNow;delete globalThis.__chartviewHomeWarm;}
}

test('actual API helpers share the HTML owner with Home snapshot consumers and an in-flight market live call',async()=>{
 let releaseMarket,normalCalls=0;
 const payload={results:[{ticker:'^KS11',price:3500,change:0,asOf:'2026-10-13T00:00:00Z',source:'canonical-market'}]};
 const h=runWarm(url=>url.endsWith('/api/market-now')?new Promise(done=>{releaseMarket=()=>done(Response.json(payload));}):Promise.resolve(Response.json({results:[{ticker:url.split('/').at(-1)}]})));
 await withApi(h,async()=>{normalCalls++;throw new Error('unexpected second transport');},async api=>{
  const market=api.marketNow(),live=api.marketNowLive();releaseMarket();
  const values=await Promise.all([market,live]);assert.deepEqual(values,[payload,payload]);
  values[0].results[0].price=1;assert.equal(values[1].results[0].price,3500);
  const snapshots=await Promise.all([api.homeSnapshot(),api.homeSnapshot()]);assert.deepEqual(snapshots[0],snapshots[1]);
  await api.homeBootstrap();assert.equal(normalCalls,0);assert.equal(h.requests.length,3);
  assert.deepEqual(Object.keys(h.entries),[]);
 });
});

test('actual API helpers receive an early typed failure without fallback, then explicit market retry recovers',async()=>{
 let normalCalls=0;
 const h=runWarm(()=>Promise.resolve(new Response('',{status:503})));await settle();
 await withApi(h,async url=>{normalCalls++;assert.equal(url,base+'/api/market-now');return Response.json({results:[{ticker:'^KS11',price:3500}]});},async api=>{
  await assert.rejects(api.marketNow(),error=>error.code==='http'&&error.status===503);
  await assert.rejects(api.homeSnapshot(),error=>error.status===503);
  await assert.rejects(api.homeSnapshot(),error=>error.status===503);
  await assert.rejects(api.homeBootstrap(),error=>error.status===503);assert.equal(normalCalls,0);
  assert.deepEqual(await api.marketNowLive(),{results:[{ticker:'^KS11',price:3500}]});assert.equal(normalCalls,1);
 });
});

test('ordinary API Home budgets are five seconds while non-Home quote/snapshot/bootstrap defaults stay unchanged',async()=>{
 const h={entries:{},now:()=>0},delays=[];
 const originalTimer=globalThis.setTimeout;
 globalThis.setTimeout=(callback,ms,...args)=>{delays.push(ms);return originalTimer(callback,ms,...args);};
 try{
  await withApi(h,async()=>Response.json({results:[]}),async api=>{
   await api.marketNow();await api.quoteSnapshots(['NVDA'],{timeoutMs:api.HOME_DATA_TIMEOUT_MS});
   await api.quoteSnapshots(['AAPL']);await api.homeSnapshot();await api.homeBootstrap();
   assert.deepEqual(delays,[5000,5000,12000,12000,12000]);
  });
 }finally{globalThis.setTimeout=originalTimer;}
});

test('actual market helper does not cache queued progress as a completed success after HTML adoption',async()=>{
 const progress={results:[],refreshing:false,refreshScheduled:true},full={results:[{ticker:'^KS11',price:3500}],refreshing:false,refreshScheduled:false};
 const h=runWarm(()=>Promise.resolve(Response.json(progress)));let calls=0;
 await withApi(h,async()=>{calls++;return Response.json(full);},async api=>{
  assert.deepEqual(await api.marketNow(),progress);assert.equal(calls,0);
  assert.deepEqual(await api.marketNow(),full);assert.equal(calls,1);
  assert.deepEqual(await api.marketNow(),full);assert.equal(calls,1);
 });
});

test('ordinary market polling keeps its URL and explicit fresh retry shares one matching request',async()=>{
 const h={entries:{},now:()=>0},urls=[];let release;
 const payload={results:[{ticker:'^KS11',price:3500}]};
 await withApi(h,async url=>{urls.push(url);return url.endsWith('?fresh=true')?new Promise(done=>{release=()=>done(Response.json(payload));}):Response.json(payload);},async api=>{
  assert.deepEqual(await api.marketNowLive(),payload);
  const a=api.marketNowLive({fresh:true}),b=api.marketNowLive({fresh:true});
  assert.deepEqual(urls,[base+'/api/market-now',base+'/api/market-now?fresh=true']);release();
  const values=await Promise.all([a,b]);assert.deepEqual(values,[payload,payload]);values[0].results[0].price=1;assert.equal(values[1].results[0].price,3500);
  assert.equal(urls.length,2);
 });
});
