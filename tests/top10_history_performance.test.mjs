import test from 'node:test';
import assert from 'node:assert/strict';
import {positivePrice, evaluateHistoryRow, averageTop10} from '../src/top10HistoryPerformance.js';

const stock=(priceBasis='close', count=7, first='2026-10-13')=>({
  ticker:'031980.KQ',startDate:first,endDate:'2026-10-22',priceBasis,
  data:Array.from({length:count},(_,i)=>({time:1791800000+i*86400,price:100+i*5})),
});

test('valid recommendation date returns prices and 5th trading day return',()=>{
  const perf=evaluateHistoryRow({recommendedPrice:100},stock(),'2026-10-13');
  assert.deepEqual([perf.base,perf.latest,perf.current,perf.d5,perf.d20],[100,130,30,25,null]);
});

test('missing and null prices never become 0% returns',()=>{
  assert.equal(positivePrice(null),null);
  const perf=evaluateHistoryRow({}, {startDate:'2026-10-14',priceBasis:'close',data:[]},'2026-10-13');
  assert.equal(perf.current,null);
  assert.equal(perf.latest,null);
  assert.equal(perf.base,null);
});

test('do not substitute next trading date for missing recommendation-date quote',()=>{
  const perf=evaluateHistoryRow({},stock('close',7,'2026-10-14'),'2026-10-13');
  assert.equal(perf.current,null);
  assert.equal(perf.d5,null);
});

test('archived close can anchor series with missing first observation only on raw-close basis',()=>{
  const raw=evaluateHistoryRow({recommendedPrice:90},stock('close',7,'2026-10-14'),'2026-10-13');
  const adjusted=evaluateHistoryRow({recommendedPrice:90},stock('adjusted_close',7,'2026-10-14'),'2026-10-13');
  assert.equal(raw.current,44.44);
  assert.equal(raw.d5,null);
  assert.equal(adjusted.current,null);
});

test('adjusted prices use adjusted baseline rather than archived unadjusted close',()=>{
  const perf=evaluateHistoryRow({recommendedPrice:200},stock('adjusted_close'),'2026-10-13');
  assert.equal(perf.base,100);
  assert.equal(perf.current,30);
  assert.equal(perf.adjusted,true);
});

test('date average excludes out-of-TOP10 selections and missing prices but includes real zero',()=>{
  const day={top10:[{symbol:'A'},{symbol:'B'},{symbol:'C'}],selectedPicks:[{symbol:'TES'}]};
  const results=new Map([['A',{current:10}],['B',{current:0}],['C',{current:null}],['TES',{current:100}]]);
  assert.deepEqual(averageTop10(day,results),{average:5,evaluated:2,total:3});
});
