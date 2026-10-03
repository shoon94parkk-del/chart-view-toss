import test from 'node:test';
import assert from 'node:assert/strict';
import * as analysis from '../src/analysisData.js';
const { SCREENER_PRESETS, screenerPreset, screenerMatchReasons, filterScreener, finiteNumber, estimateRevision } = analysis;
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

test('unusual daily moves carry a factual warning without changing screener matches',()=>{
 const row={symbol:'005110.KS',name:'한창',price:112,change1d:-91.07,rsi14:0,volumeRatio:20};
 const warnings=analysis.screenerDataWarnings?.(row);
 assert.ok(warnings?.length,'large daily moves need a visible data warning');
 assert.match(warnings.join(' '),/일간 변동.*35%.*원자료/);
 assert.doesNotMatch(warnings.join(' '),/감자|상장폐지|오류 확정/);
 assert.deepEqual(filterScreener([row],{rsiMax:30}),[row]);
 assert.ok(analysis.screenerDataWarnings({change1d:35}).length);
 assert.deepEqual(analysis.screenerDataWarnings({change1d:-30,rsi14:0}),[]);
 for(const change1d of [0,null,undefined,'',NaN,Infinity])assert.deepEqual(analysis.screenerDataWarnings({change1d}),[]);
 assert.deepEqual(analysis.screenerDataWarnings({symbol:'0004V0.KQ',change1d:0.32,rsi14:53.7}),[]);
});

test('empty screener explains a name match excluded by technical conditions within the selected market',()=>{
 const rows=[{symbol:'A.KS',name:'삼성전자',market:'KOSPI',rsi14:60},{symbol:'B.KQ',name:'삼성부품',market:'KOSDAQ',rsi14:20}];
 assert.deepEqual(analysis.screenerEmptyState?.(rows,{query:'삼성',market:'KOSPI',rsiMax:30}),{
  message:'검색어·시장에 맞는 종목 1개가 기술 조건에서 제외됐어요. 검색어·시장·기술 조건은 함께 적용돼요.',canClearTechnical:true,
 });
 assert.deepEqual(analysis.screenerEmptyState(rows,{query:'없는종목',rsiMax:30}),{message:'검색어와 시장에 맞는 종목이 없어요. 종목명·코드와 시장을 확인해주세요.',canClearTechnical:false});
 assert.deepEqual(analysis.screenerEmptyState(rows,{query:'삼성전자',market:'KOSDAQ',rsiMax:30}),{message:'검색어와 시장에 맞는 종목이 없어요. 종목명·코드와 시장을 확인해주세요.',canClearTechnical:false});
 assert.equal(analysis.screenerEmptyState(rows,{market:'KONEX',rsiMax:30}).canClearTechnical,false,'technical clear cannot recover a market with no collected rows');
 assert.deepEqual(analysis.screenerEmptyState(rows,{rsiMax:10}),{message:'조건에 맞는 종목이 없어요. 기술 조건을 해제하거나 범위를 넓혀보세요.',canClearTechnical:true});
});
