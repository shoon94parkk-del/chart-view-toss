import test from 'node:test';
import assert from 'node:assert/strict';
import { clearApiCache } from '../src/api.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const article=symbol=>({symbol,title:`${symbol} 기사`,url:`https://news.test/${symbol}`,score:1});
const group=(symbol,status='success')=>({symbol,name:`이름 ${symbol}`,status,items:status==='success'?[article(symbol)]:[]});
const partial={groups:[group('A'),group('B','pending'),group('C','error')],items:[article('A')],errors:[{symbol:'C',code:'provider'}],complete:false,pendingSymbols:['B']};
const reply=value=>({ok:true,json:async()=>value});

// These tests exercise the real API request client, including its shared cache owner.
test('first articles publish while a later group is held, with original order/names and authoritative final ranking',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');
 const original=globalThis.fetch; t.after(()=>{globalThis.fetch=original;clearApiCache();}); clearApiCache();
 const slow=deferred(),calls=[],updates=[]; const final={groups:[group('A'),group('B'),group('C','error')],items:[article('B'),article('A')],errors:partial.errors,marker:'balanced'};
 globalThis.fetch=async url=>{calls.push(new URL(url));return reply(calls.length===1?partial:calls.length===2?await slow.promise:final);};
 const work=loadProgressiveNews(['A','B','C'],['알파','베타','감마'],{onUpdate:value=>updates.push(value)});
 await tick();assert.equal(updates.length,1);assert.equal(updates[0].items[0].symbol,'A');assert.equal(updates[0].complete,false);assert.equal(calls.length,2);
 assert.equal(calls[0].searchParams.get('delivery'),'first_available');assert.equal(calls[1].searchParams.get('tickers'),'B');assert.equal(calls[1].searchParams.get('names'),'베타');assert.equal(calls[1].searchParams.has('force'),false);
 slow.resolve({groups:[group('B')],items:[article('B')],errors:[],complete:true,pendingSymbols:[]});
 const value=await work;assert.equal(calls.length,3);assert.equal(calls[2].searchParams.has('delivery'),false);assert.equal(value.marker,'balanced');assert.deepEqual(value.groups.map(x=>x.symbol),['A','B','C']);assert.deepEqual(value.items.map(x=>x.symbol),['B','A']);assert.deepEqual(value.errors,partial.errors);
});

test('old backend complete response uses one request and ready result uses the shared cache',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;clearApiCache();});clearApiCache();let calls=0;
 globalThis.fetch=async()=>{calls++;return reply({items:[article('A')],groups:[group('A')],errors:[]});};
 await Promise.all([loadProgressiveNews(['A'],['알파']),loadProgressiveNews(['A'],['알파'])]);assert.equal(calls,1);
 await loadProgressiveNews(['A'],['알파']);assert.equal(calls,1);
});

test('pending/partial responses are not success cached and later failure retains acquired rows and per-group errors',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;clearApiCache();});clearApiCache();let calls=0;
 globalThis.fetch=async()=>{calls++;if(calls%2===1)return reply(partial);throw Error('offline');};
 for(let i=0;i<2;i++){const value=await loadProgressiveNews(['A','B','C'],['알파','베타','감마']);assert.equal(value.items[0].symbol,'A');assert.equal(value.complete,true);assert.deepEqual(value.pendingSymbols,[]);assert.equal(value.groups[1].status,'error');assert.ok(value.errors.some(x=>x.symbol==='C'));assert.ok(value.errors.some(x=>x.symbol==='B'));}assert.equal(calls,4);
});

test('navigation and abort stop updates and additional requests without cancelling another shared consumer',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;clearApiCache();});clearApiCache();let current=true,calls=0;const held=deferred(),updates=[],abort=new AbortController();
 globalThis.fetch=async()=>{calls++;return reply(await held.promise);};
 const stale=loadProgressiveNews(['A','B','C'],[],{isCurrent:()=>current,onUpdate:v=>updates.push(v)});const aborted=loadProgressiveNews(['A','B','C'],[],{signal:abort.signal,onUpdate:v=>updates.push(v)});const rejection=assert.rejects(aborted,{name:'AbortError'});abort.abort();await rejection;current=false;held.resolve(partial);await assert.rejects(stale,{name:'AbortError'});assert.equal(calls,1);assert.equal(updates.length,0);
});

test('one ten-second budget includes held response bodies and never starts a retry',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;clearApiCache();});clearApiCache();t.mock.timers.enable({apis:['setTimeout','Date']});let calls=0;const held=deferred();
 globalThis.fetch=async()=>{calls++;return {ok:true,json:()=>held.promise};};
 const work=loadProgressiveNews(['A'],['알파']);const rejection=assert.rejects(work,error=>error.code==='timeout');await tick();t.mock.timers.tick(10000);await rejection;held.resolve({items:[]});await tick();assert.equal(calls,1);
});

test('non-progressing pending protocol terminates without polling in a loop',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;clearApiCache();});clearApiCache();let calls=0;
 globalThis.fetch=async()=>{calls++;return reply({groups:[group('A','pending')],items:[],errors:[],complete:false,pendingSymbols:['A']});};
 const value=await loadProgressiveNews(['A'],['알파']);assert.ok(calls<=2);assert.equal(value.complete,true);assert.equal(value.groups[0].status,'error');assert.equal(value.items.length,0);
});

test('overall deadline after first articles preserves those rows and records only unfinished groups as failed',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;clearApiCache();});clearApiCache();t.mock.timers.enable({apis:['setTimeout','Date']});let calls=0;const held=deferred(),updates=[];
 globalThis.fetch=async()=>{calls++;return reply(calls===1?partial:await held.promise);};
 const work=loadProgressiveNews(['A','B','C'],['알파','베타','감마'],{onUpdate:value=>updates.push(value)});await tick();assert.equal(updates[0].complete,false);t.mock.timers.tick(10000);const final=await work;assert.equal(final.items[0].symbol,'A');assert.equal(final.groups[0].status,'success');assert.equal(final.groups[1].status,'error');assert.equal(final.complete,true);assert.equal(calls,2);held.resolve({items:[]});await tick();assert.equal(updates.length,2);
});

test('a later provider failure in the authoritative read retains articles already acquired for that symbol',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;clearApiCache();});clearApiCache();let calls=0;
 globalThis.fetch=async()=>reply(++calls===1?partial:calls===2?{groups:[group('B')],items:[article('B')],errors:[],complete:true,pendingSymbols:[]}:{groups:[group('A','error'),group('B'),group('C','error')],items:[article('B')],errors:[{symbol:'A',code:'provider'},...partial.errors]});
 const final=await loadProgressiveNews(['A','B','C'],['알파','베타','감마']);assert.ok(final.items.some(row=>row.symbol==='A'));assert.equal(final.groups[0].status,'error');assert.ok(final.groups[0].items.some(row=>row.symbol==='A'));assert.ok(final.errors.some(row=>row.symbol==='A'));
});

test('explicit retry bypasses a seeded normal cache and reconciles without a backend force refresh',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const {personalizedNews}=await import('../src/api.js');const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;clearApiCache();});clearApiCache();const calls=[];
 const old={...article('A'),title:'이전 기사',url:'https://news.test/old'};const fresh={...article('A'),title:'새 기사',url:'https://news.test/new'};
 const oldPayload={groups:[{...group('A'),items:[old]},group('B','no_news')],items:[old],errors:[]};const freshPayload={groups:[{...group('A'),items:[fresh]},group('B')],items:[article('B'),fresh],errors:[],marker:'fresh-balanced'};
 globalThis.fetch=async url=>{const parsed=new URL(url);calls.push(parsed);if(calls.length===1)return reply(oldPayload);if(parsed.searchParams.get('tickers')==='B')return reply({groups:[group('B')],items:[article('B')],errors:[],complete:true,pendingSymbols:[]});if(parsed.searchParams.has('delivery'))return reply({...freshPayload,groups:[freshPayload.groups[0],group('B','pending')],items:[fresh],complete:false,pendingSymbols:['B']});return reply(freshPayload);};
 await personalizedNews(['A','B'],['알파','베타']);const value=await loadProgressiveNews(['A','B'],['알파','베타'],{force:true});assert.equal(value.marker,'fresh-balanced');assert.deepEqual(value.items.map(row=>row.title),['B 기사','새 기사']);assert.equal(calls.length,4);assert.equal(calls.at(-1).searchParams.has('force'),false);assert.equal(calls.at(-1).searchParams.has('delivery'),false);
});

test('joining an older normal flight cannot evict acquired articles or undo a corrected title and summary seed',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const {personalizedNews}=await import('../src/api.js');const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;clearApiCache();});clearApiCache();const held=deferred(),calls=[],updates=[];
 const corrected={...article('A'),title:'수정된 제목',summarySeed:'수정된 요약문'};const added={...article('A'),url:'https://news.test/newer',title:'새 수집 기사'};
 const acquiredA={...group('A'),items:[corrected,added]};const canonical={groups:[acquiredA,group('B')],items:[article('B'),corrected,added],errors:[],marker:'new-canonical'};let normalCalls=0;
 globalThis.fetch=async url=>{const parsed=new URL(url);calls.push(parsed);if(!parsed.searchParams.has('delivery'))return reply(++normalCalls===1?await held.promise:canonical);if(parsed.searchParams.get('tickers')==='B')return reply({groups:[group('B')],items:[article('B')],errors:[],complete:true,pendingSymbols:[]});return reply({groups:[acquiredA,group('B','pending')],items:acquiredA.items,errors:[],complete:false,pendingSymbols:['B']});};
 const older=personalizedNews(['A','B'],['알파','베타']);const work=loadProgressiveNews(['A','B'],['알파','베타'],{onUpdate:value=>updates.push(value)});await tick();assert.equal(updates.length,2);assert.equal(calls.length,3);
 held.resolve({groups:[{...group('A'),items:[{...article('A'),summarySeed:'이전 요약문'}]},group('B','no_news')],items:[{...article('A'),summarySeed:'이전 요약문'}],errors:[]});await older;const final=await work;
 assert.equal(calls.length,4);assert.equal(normalCalls,2);assert.equal(final.marker,'new-canonical');assert.deepEqual(final.items,canonical.items);assert.deepEqual(final.groups[0].items,acquiredA.items);assert.equal(final.groups[1].status,'success');assert.ok(final.items.some(row=>row.url===added.url));assert.ok(final.items.some(row=>row.title===corrected.title && row.summarySeed===corrected.summarySeed));assert.ok(final.items.some(row=>row.symbol==='B'));assert.equal(final.items.some(row=>row.summarySeed==='이전 요약문'),false);assert.equal(calls.some(url=>url.searchParams.has('force')),false);
});

const sixArticles=symbol=>Array.from({length:6},(_,index)=>({...article(symbol),url:`https://news.test/${symbol}/${index}`,title:`${symbol} 기사 ${index}`,score:100-index}));
test('an older joined no-news result triggers one bounded canonical read and returns exact twelve balanced highlights',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const {personalizedNews}=await import('../src/api.js');const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;clearApiCache();});clearApiCache();const held=deferred(),calls=[],updates=[];let normalCalls=0;
 const a={...group('A'),items:sixArticles('A')},b={...group('B'),items:sixArticles('B')},c=group('C');const canonical={groups:[a,b,c],items:[...c.items,...b.items.slice(0,5),...a.items],errors:[],marker:'balanced-twelve'};
 globalThis.fetch=async url=>{const parsed=new URL(url);calls.push(parsed);if(!parsed.searchParams.has('delivery'))return reply(++normalCalls===1?await held.promise:canonical);const symbols=parsed.searchParams.get('tickers');if(symbols==='C')return reply({groups:[c],items:c.items,errors:[],complete:true,pendingSymbols:[]});if(symbols==='B,C')return reply({groups:[b,group('C','pending')],items:b.items,errors:[],complete:false,pendingSymbols:['C']});return reply({groups:[a,group('B','pending'),group('C','pending')],items:a.items,errors:[],complete:false,pendingSymbols:['B','C']});};
 const older=personalizedNews(['A','B','C'],['알파','베타','감마']);const work=loadProgressiveNews(['A','B','C'],['알파','베타','감마'],{onUpdate:value=>updates.push(value)});await tick();assert.equal(updates.length,3);assert.equal(calls.length,4);
 held.resolve({groups:[a,b,group('C','no_news')],items:[...a.items,...b.items],errors:[]});await older;const final=await work;
 assert.equal(final.items.length,12);assert.equal(normalCalls,2);assert.equal(calls.length,5);assert.equal(final.marker,'balanced-twelve');assert.deepEqual(final.items,canonical.items);assert.equal(final.groups.flatMap(group=>group.items).length,13);assert.equal(calls.some(url=>url.searchParams.has('force')),false);
});

test('reconciliation detects extra stale rows as a conflict and does only one additional canonical read',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;clearApiCache();});clearApiCache();let calls=0,normalCalls=0;const extra={...article('A'),url:'https://news.test/stale-extra'};const canonical={groups:[group('A'),group('B')],items:[article('B'),article('A')],errors:[]};
 globalThis.fetch=async url=>{calls++;const parsed=new URL(url);if(!parsed.searchParams.has('delivery'))return reply(++normalCalls===1?{...canonical,groups:[{...group('A'),items:[article('A'),extra]},group('B')],items:[extra,...canonical.items]}:canonical);if(parsed.searchParams.get('tickers')==='B')return reply({groups:[group('B')],items:[article('B')],errors:[],complete:true,pendingSymbols:[]});return reply({groups:[group('A'),group('B','pending')],items:[article('A')],errors:[],complete:false,pendingSymbols:['B']});};
 const final=await loadProgressiveNews(['A','B'],[]);assert.equal(normalCalls,2);assert.equal(calls,4);assert.deepEqual(final,canonical);
});

test('a second conflicting canonical result preserves all acquired groups with twelve fallback highlights and an explicit error',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;clearApiCache();});clearApiCache();let calls=0,normalCalls=0;const a={...group('A'),items:sixArticles('A')},b={...group('B'),items:sixArticles('B')},c=group('C');
 globalThis.fetch=async url=>{calls++;const parsed=new URL(url);if(!parsed.searchParams.has('delivery')){normalCalls++;return reply({groups:[a,b,group('C','no_news')],items:[...a.items,...b.items],errors:[]});}const symbols=parsed.searchParams.get('tickers');if(symbols==='C')return reply({groups:[c],items:c.items,errors:[],complete:true,pendingSymbols:[]});if(symbols==='B,C')return reply({groups:[b,group('C','pending')],items:b.items,errors:[],complete:false,pendingSymbols:['C']});return reply({groups:[a,group('B','pending'),group('C','pending')],items:a.items,errors:[],complete:false,pendingSymbols:['B','C']});};
 const final=await loadProgressiveNews(['A','B','C'],[]);assert.equal(calls,5);assert.equal(normalCalls,2);assert.equal(final.items.length,12);assert.equal(final.groups.flatMap(group=>group.items).length,13);assert.equal(final.reconciliationComplete,false);assert.ok(final.errors.some(error=>error.code==='news_reconciliation_stale'));assert.equal(final.complete,true);assert.deepEqual(final.pendingSymbols,[]);
});

test('the additional canonical read shares the original ten-second deadline and keeps acquired groups if its body is held',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;clearApiCache();});clearApiCache();t.mock.timers.enable({apis:['setTimeout','Date']});const held=deferred(),updates=[];let calls=0,normalCalls=0;
 globalThis.fetch=async url=>{calls++;const parsed=new URL(url);if(!parsed.searchParams.has('delivery'))return ++normalCalls===1?reply({groups:[group('A','no_news'),group('B')],items:[article('B')],errors:[]}):{ok:true,json:()=>held.promise};if(parsed.searchParams.get('tickers')==='B')return reply({groups:[group('B')],items:[article('B')],errors:[],complete:true,pendingSymbols:[]});return reply({groups:[group('A'),group('B','pending')],items:[article('A')],errors:[],complete:false,pendingSymbols:['B']});};
 const work=loadProgressiveNews(['A','B'],[],{onUpdate:value=>updates.push(value)});await tick();assert.equal(calls,4);assert.equal(normalCalls,2);t.mock.timers.tick(10000);const final=await work;assert.deepEqual(final.groups.map(group=>group.status),['success','success']);assert.ok(final.errors.some(error=>error.code==='timeout'));assert.equal(final.reconciliationComplete,false);const count=updates.length;held.resolve({items:[]});await tick();assert.equal(updates.length,count);assert.equal(calls,4);
});

const warmCanonical={groups:[group('A'),group('B')],items:[article('B'),article('A')],errors:[],marker:'warm-canonical'};
const warmTransport=calls=>async url=>{
 const parsed=new URL(url);calls.push(parsed);
 if(!parsed.searchParams.has('delivery'))return reply(warmCanonical);
 if(parsed.searchParams.get('tickers')==='B')return reply({groups:[group('B')],items:[article('B')],errors:[],complete:true,pendingSymbols:[]});
 return reply({groups:[group('A'),group('B','pending')],items:[article('A')],errors:[],complete:false,pendingSymbols:['B']});
};

test('a completed partial visit reuses its canonical cache on the next visit without any HTTP requests',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;clearApiCache();});clearApiCache();const calls=[],updates=[];globalThis.fetch=warmTransport(calls);
 const first=await loadProgressiveNews(['A','B'],['알파','베타']);assert.equal(calls.length,3);assert.deepEqual(first,warmCanonical);
 const warm=await loadProgressiveNews(['A','B'],['알파','베타'],{onUpdate:value=>updates.push(value)});assert.equal(calls.length,3);assert.deepEqual(warm,warmCanonical);assert.deepEqual(updates,[warmCanonical]);assert.notEqual(warm,first);
});

test('offline warm return uses the existing valid canonical cache while an explicit retry bypasses it',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const originalFetch=globalThis.fetch,originalNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');t.after(()=>{globalThis.fetch=originalFetch;Object.defineProperty(globalThis,'navigator',originalNavigator);clearApiCache();});clearApiCache();const calls=[];globalThis.fetch=warmTransport(calls);
 await loadProgressiveNews(['A','B'],['알파','베타']);Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:false}});
 assert.deepEqual(await loadProgressiveNews(['A','B'],['알파','베타']),warmCanonical);assert.equal(calls.length,3);
 await assert.rejects(loadProgressiveNews(['A','B'],['알파','베타'],{force:true}),error=>error.code==='offline');assert.equal(calls.length,3);
});

test('explicit retry bypasses the valid canonical cache and starts first_available with backend retry semantics',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;clearApiCache();});clearApiCache();const calls=[];globalThis.fetch=warmTransport(calls);
 await loadProgressiveNews(['A','B'],['알파','베타']);await loadProgressiveNews(['A','B'],['알파','베타'],{force:true});assert.equal(calls.length,5);assert.equal(calls[3].searchParams.get('delivery'),'first_available');assert.equal(calls[3].searchParams.get('force'),'true');assert.equal(calls[4].searchParams.has('delivery'),false);assert.equal(calls[4].searchParams.has('force'),false);
});

test('an expired canonical cache retains the existing sixty-second TTL and starts a new first_available request',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;clearApiCache();});clearApiCache();t.mock.timers.enable({apis:['Date']});const calls=[];globalThis.fetch=warmTransport(calls);
 await loadProgressiveNews(['A','B'],['알파','베타']);t.mock.timers.tick(60000);await loadProgressiveNews(['A','B'],['알파','베타']);assert.equal(calls.length,6);assert.equal(calls[3].searchParams.get('delivery'),'first_available');assert.equal(calls[3].searchParams.has('force'),false);
});

test('clearApiCache removes the warm canonical result and the next visit requests first_available again',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;clearApiCache();});clearApiCache();const calls=[];globalThis.fetch=warmTransport(calls);
 await loadProgressiveNews(['A','B'],['알파','베타']);clearApiCache();await loadProgressiveNews(['A','B'],['알파','베타']);assert.equal(calls.length,6);assert.equal(calls[3].searchParams.get('delivery'),'first_available');
});

test('pending and partial entries in the normal API cache cannot masquerade as a warm completed news visit',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const {api}=await import('../src/api.js');const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;clearApiCache();});const path='/api/personalized-news?tickers=A%2CB&names='+encodeURIComponent('알파|베타');
 for(const invalid of [{groups:[group('A'),group('B','pending')],items:[article('A')],complete:false,pendingSymbols:['B'],errors:[]},{groups:[group('A'),group('B','error')],items:[article('A')],errors:[{symbol:'B',code:'provider'}]}]) {
  clearApiCache();const calls=[];globalThis.fetch=async url=>calls.length===0?(calls.push(new URL(url)),reply(invalid)):warmTransport(calls)(url);await api(path,{ttlMs:60000,retries:0});
  assert.deepEqual(await loadProgressiveNews(['A','B'],['알파','베타']),warmCanonical);assert.equal(calls.length,4);assert.equal(calls[1].searchParams.get('delivery'),'first_available');
 }
});

test('warm cache delivery respects the current navigation context and an already aborted caller',async t=>{
 const {loadProgressiveNews}=await import('../src/progressiveNews.js');const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;clearApiCache();});clearApiCache();const calls=[],updates=[];globalThis.fetch=warmTransport(calls);await loadProgressiveNews(['A','B'],['알파','베타']);
 await assert.rejects(loadProgressiveNews(['A','B'],['알파','베타'],{isCurrent:()=>false,onUpdate:value=>updates.push(value)}),{name:'AbortError'});const abort=new AbortController();abort.abort();await assert.rejects(loadProgressiveNews(['A','B'],['알파','베타'],{signal:abort.signal,onUpdate:value=>updates.push(value)}),{name:'AbortError'});assert.equal(calls.length,3);assert.equal(updates.length,0);
});
