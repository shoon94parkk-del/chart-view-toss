import {test} from 'node:test';
import assert from 'node:assert/strict';
import {indexSeries,quoteHtml,detailCachedQuote} from '../src/detailPresentation.js';
test('index detail reuses the dated Home market quote without waiting on a fresh provider',()=>{
 const row={ticker:'^KS11',price:3000,change:1,asOf:'2026-10-01T07:00:00Z'};
 assert.deepEqual(detailCachedQuote('^KS11',{heatmap:{results:[]}}, {results:[row]}),row);
 assert.equal(detailCachedQuote('^KS11',null,{results:[{ticker:'^KS11',price:null}]}),null);
});
test('index uses observed point prices, never reconstructs from a current quote',()=>{
 assert.deepEqual(indexSeries({price:9999,data:[{time:1,value:0,price:2500},{time:2,value:10,price:2750}]}),[{time:1,value:2500},{time:2,value:2750}]);
 assert.equal(indexSeries({data:[{time:1,value:0}]}),null);
});
test('quote has a compact main row and expandable distinct observation sources',()=>{
 const html=quoteHtml({price:100,change:2,asOf:'2026-10-01'}, {price:95,date:'2026-09-30'}, {price:'100원',change:'+2%',asOf:'10.01',basis:'제공처 최신 시세',queriedAt:'10.02'});
 assert.match(html,/quote-main/);assert.match(html,/<details/);assert.match(html,/95/);assert.match(html,/스크리너/);assert.match(html,/전 거래일 대비/);
});
