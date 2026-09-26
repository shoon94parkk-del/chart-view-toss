import test from 'node:test';
import assert from 'node:assert/strict';

import { readHomeFast, writeHomeFast, earlyHome } from '../src/homeFastCache.js';

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
  let fallbackCalls=0;
  globalThis.__chartviewHomeWarm={
    market:{startedAt:Date.now(),promise:Promise.resolve({results:[{ticker:'FAST'}]})},
  };
  const value=await earlyHome('market',async()=>{fallbackCalls+=1;return {results:[]};});
  assert.equal(value.results[0].ticker,'FAST');
  assert.equal(fallbackCalls,0);
  delete globalThis.__chartviewHomeWarm;
});
