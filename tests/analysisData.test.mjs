import test from 'node:test';
import assert from 'node:assert/strict';
import { SCREENER_PRESETS, screenerPreset, screenerMatchReasons, filterScreener, finiteNumber, estimateRevision } from '../src/analysisData.js';
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


test('popular screener presets map to real technical conditions',()=>{
 const rows=[
  {symbol:'A.KS',name:'A',market:'KOSPI',rsi14:28,volumeRatio:2.6,ret20:4,price:103,ma20:100,ma60:95,macd:3,macdSignal:2,goldenCross2060:true,near52High:true,distance52HighPct:-1.2},
  {symbol:'B.KS',name:'B',market:'KOSPI',rsi14:62,volumeRatio:1.2,ret20:9,price:120,ma20:110,ma60:100,macd:2,macdSignal:1,goldenCross2060:false,near52High:false,distance52HighPct:-8},
  {symbol:'C.KS',name:'C',market:'KOSPI',rsi14:48,volumeRatio:2.2,ret20:3,price:108,ma20:105,ma60:100,macd:1,macdSignal:2,goldenCross2060:false,near52High:false,distance52HighPct:-5},
 ];
 const volume=screenerPreset('volume-surge');
 assert.deepEqual(filterScreener(rows,volume.filters).map(x=>x.symbol),['A.KS','C.KS']);
 assert.deepEqual(filterScreener(rows,screenerPreset('rsi-oversold').filters).map(x=>x.symbol),['A.KS']);
 assert.deepEqual(filterScreener(rows,screenerPreset('golden-cross').filters).map(x=>x.symbol),['A.KS']);
 assert.deepEqual(filterScreener(rows,screenerPreset('near-high').filters).map(x=>x.symbol),['A.KS']);
 assert.deepEqual(filterScreener(rows,screenerPreset('pullback').filters).map(x=>x.symbol),['C.KS']);
 assert.ok(SCREENER_PRESETS.length>=8);
 assert.deepEqual(screenerMatchReasons(rows[0],volume.filters),['거래량 2.6배']);
});

test('MACD and trend filters remain usable before boolean helper fields are regenerated',()=>{
 const row={symbol:'A.KS',name:'A',market:'KOSPI',price:110,ma20:105,ma60:100,macd:2,macdSignal:1,rsi14:60};
 assert.equal(filterScreener([row],{trend:'trend2060'}).length,1);
 assert.equal(filterScreener([row],{signal:'macdBullish'}).length,1);
});
