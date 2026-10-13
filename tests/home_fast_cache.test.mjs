import test from 'node:test';
import assert from 'node:assert/strict';

import { readHomeFast, writeHomeFast, adoptEarlyHome } from '../src/homeFastCache.js';
import { createRequestClient } from '../src/requestClient.js';

function makeStorage(){
  const data=new Map();
  return {
    getItem:key=>data.has(key)?data.get(key):null,
    setItem:(key,value)=>data.set(key,String(value)),
    removeItem:key=>data.delete(key),
    clear:()=>data.clear(),
  };
}

test('Home fast cache returns recently persisted data synchronously',()=>{
  globalThis.localStorage=makeStorage();
  const payload={results:[{ticker:'NVDA',price:123}]};
  writeHomeFast('market',payload);
  assert.deepEqual(readHomeFast('market',60_000),payload);
  delete globalThis.localStorage;
});

test('Home fast cache ignores expired data',()=>{
  globalThis.localStorage=makeStorage();
  localStorage.setItem('chartview-home-fast-v1:market',JSON.stringify({
    savedAt:Date.now()-120_000,
    value:{results:[{ticker:'OLD'}]},
  }));
  assert.equal(readHomeFast('market',60_000),null);
  delete globalThis.localStorage;
});

test('early Home preload is consumed before fallback network work',async()=>{
  let fallbackCalls=0;const base='https://data.example';
  globalThis.__chartviewHomeWarm={
    market:{base,path:'/api/market-now',startedAt:Date.now(),settledAt:Date.now(),status:'fulfilled',promise:Promise.resolve({results:[{ticker:'FAST'}]})},
  };
  const request=createRequestClient({base,fetchImpl:async()=>{fallbackCalls+=1;return Response.json({results:[]});}});
  adoptEarlyHome(request,base);
  const value=await request('/api/market-now',{ttlMs:15000});
  assert.equal(value.results[0].ticker,'FAST');
  assert.equal(fallbackCalls,0);
  assert.equal(globalThis.__chartviewHomeWarm.market,undefined);
  delete globalThis.__chartviewHomeWarm;
});
