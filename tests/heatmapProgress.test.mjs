import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeHeatmapProgress} from '../src/heatmapAlignment.js';
import {clearLiveQuotes,rememberLiveQuotes} from '../src/liveQuoteStore.js';
import {renderMarketMap} from '../src/marketMapView.js';
import {aggregateSectors} from '../src/sectorHeatmap.js';

const rows=Array.from({length:40},(_,i)=>({ticker:'US'+i,market:'US',name:'기업'+i,sector:'Technology',marketCap:1000-i,price:100+i,change:i/10,asOf:'2026-10-07T06:00:00Z',sessionDate:'2026-10-07',source:'canonical-provider-full-heatmap'}));
test('partial 17→21→40 preserves forty dated tiles, source values and true response counts',()=>{
 clearLiveQuotes();
 let shown={results:rows,complete:true};
 for(const count of [17,21]){
  shown=mergeHeatmapProgress(shown,{complete:false,refreshing:true,results:rows.slice(0,count).map(row=>({...row,price:row.price+1,change:row.change+1,asOf:'2026-10-07T06:30:00Z'}))});
  assert.equal(shown.results.length,40);assert.deepEqual(shown.partialCoverage.US,{received:count,retained:40-count});
  assert.equal(shown.results[0].price,101);assert.equal(shown.results.at(-1).price,139);
  const html=renderMarketMap(shown,{market:'US'});assert.match(html,new RegExp(`${count} / 40종목 응답`));assert.match(html,new RegExp(`이전 시세 ${40-count}종목 유지`));
  assert.equal(aggregateSectors(shown,'US').used,count);
 }
 const full={results:rows,complete:true};assert.equal(mergeHeatmapProgress(shown,full),full);
 clearLiveQuotes();
});
test('cold partial response creates no prices; invalid saved rows never fill the map',()=>{
 clearLiveQuotes();
 const shown=mergeHeatmapProgress({results:[...rows.slice(20,22),{...rows[22],price:null},{...rows[23],change:null},{...rows[24],asOf:null}]},{complete:false,results:rows.slice(0,17)});
 assert.equal(shown.results.length,19);assert.equal(shown.partialCoverage.US.retained,2);
 assert.equal(mergeHeatmapProgress(null,{complete:false,results:rows.slice(0,17)}).results.length,17);
 clearLiveQuotes();
});
test('newer Home quote wins over partial server quote and previous device observations',()=>{
 clearLiveQuotes();rememberLiveQuotes([{...rows[0],price:999,change:-2,asOf:'2026-10-07T07:00:00Z'}],{priority:20});
 const shown=mergeHeatmapProgress({results:rows},{complete:false,results:rows.slice(0,17)});
 assert.equal(shown.results[0].price,999);assert.equal(shown.results[0].change,-2);assert.equal(shown.results[0].marketCap,1000);
 clearLiveQuotes();
});
test('complete newer universe removes former members rather than retaining them indefinitely',()=>{
 const full={results:rows.slice(0,3),complete:true};assert.equal(mergeHeatmapProgress({results:rows},full),full);
});
