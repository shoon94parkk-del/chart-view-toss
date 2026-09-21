import test from 'node:test';
import assert from 'node:assert/strict';
import { filterScreener, finiteNumber, estimateRevision } from '../src/analysisData.js';
test('missing data stays missing, zero remains an actual zero',()=>{
 for(const x of [null,undefined,'',NaN,Infinity])assert.equal(finiteNumber(x),null);
 assert.equal(finiteNumber(0),0);assert.equal(finiteNumber('0'),0);
});
test('all matching screener rows remain pageable and reset restores full count',()=>{
 const rows=Array.from({length:125},(_,i)=>({symbol:`${i}.KS`,name:`종목${i}`,market:i%2?'KOSDAQ':'KOSPI',rsi14:i%2?null:40,change1d:i===0?0:i}));
 assert.equal(filterScreener(rows,{}).length,125);
 assert.equal(filterScreener(rows,{market:'KOSPI',rsiMax:50}).length,63);
 assert.equal(filterScreener(rows,{query:'종목124'})[0].symbol,'124.KS');
 assert.equal(filterScreener(rows,{rsiMax:50}).some(x=>x.rsi14===null),false);
 assert.equal(filterScreener(rows,{sort:'name'})[0].name,'종목0');
 assert.equal(rows.length,125);
});
test('EPS revisions do not compute misleading ratios across zero',()=>{
 assert.equal(estimateRevision(2,1),100);assert.equal(estimateRevision(1,-1),null);assert.equal(estimateRevision(null,1),null);
});
