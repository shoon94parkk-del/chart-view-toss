import test from 'node:test';import assert from 'node:assert/strict';import {loadWatchQuotes} from '../src/watchQuoteLoader.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const quote=ticker=>({ticker,price:100,currency:'USD',asOf:'2026-10-25T00:00:00Z'});
test('a fast quote is delivered while a slow sibling remains pending; final order follows the saved list',async()=>{
 const slow=deferred(),seen=[];const done=loadWatchQuotes(['SLOW','FAST'],{load:async([symbol])=>symbol==='SLOW'?slow.promise:{results:[quote(symbol)]},onBatch:x=>seen.push(x)});await new Promise(setImmediate);assert.equal(seen.length,1,'fast quote must be delivered before the slow response');assert.deepEqual(seen[0].results,[quote('FAST')]);assert.deepEqual(seen[0].pendingSymbols,['SLOW']);slow.resolve({results:[quote('SLOW')]});const result=await done;assert.deepEqual(result.results.map(q=>q.ticker),['SLOW','FAST']);assert.equal(result.complete,true);
});
test('20 symbols use at most four simultaneous existing ordinary requests without duplicates',async()=>{
 let active=0,max=0;const calls=[];const symbols=Array.from({length:20},(_,i)=>'S'+i);const result=await loadWatchQuotes([...symbols,symbols[0]],{load:async tickers=>{calls.push(tickers);max=Math.max(max,++active);await new Promise(setImmediate);active--;return {results:[quote(tickers[0])]};}});assert.equal(max,4);assert.deepEqual(calls,symbols.map(s=>[s]));assert.equal(result.results.length,20);
});
test('a failed symbol does not erase successful prices or stop the remaining queue',async()=>{
 const result=await loadWatchQuotes(['GOOD','FAIL','EMPTY'],{load:async([s])=>{if(s==='FAIL')throw Error('private provider URL');return {results:s==='EMPTY'?[]:[quote(s)]};}});assert.deepEqual(result.results,[quote('GOOD')]);assert.deepEqual(result.errors.map(e=>e.ticker),['FAIL','EMPTY']);assert.equal(JSON.stringify(result).includes('private provider'),false);assert.equal(result.complete,true);
});
test('route or account departure stops scheduling and suppresses late batches',async()=>{
 const gates=Array.from({length:4},deferred);let current=true,calls=0,paints=0;const done=loadWatchQuotes(['A','B','C','D','E'],{isCurrent:()=>current,load:()=>gates[calls++].promise,onBatch:()=>paints++});current=false;for(const g of gates)g.resolve({results:[quote('A')]});const result=await done;assert.equal(calls,4);assert.equal(paints,0);assert.equal(result.complete,false);
});
test('out-of-scope response rows cannot be added to the watch list and overlimit makes no requests',async()=>{
 const result=await loadWatchQuotes(['A'],{load:async()=>({results:[quote('B')]})});assert.deepEqual(result.results,[]);assert.equal(result.errors[0].ticker,'A');let called=false;await assert.rejects(loadWatchQuotes(Array.from({length:21},(_,i)=>''+i),{load:()=>{called=true;}}),/20/);assert.equal(called,false);
});
test('one overall quote deadline stops queued requests and marks unresolved symbols as errors',{timeout:500},async()=>{
 let calls=0;const result=await loadWatchQuotes(['A','B','C','D','E'],{timeoutMs:15,load:()=>{calls++;return new Promise(()=>{});}});assert.equal(calls,4);assert.equal(result.complete,true);assert.equal(result.errors.length,5);assert.deepEqual(result.pendingSymbols,[]);
});
