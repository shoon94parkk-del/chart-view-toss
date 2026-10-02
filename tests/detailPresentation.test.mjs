import {test} from 'node:test';
import assert from 'node:assert/strict';
import {indexSeries,quoteHtml,detailCachedQuote,invalidSymbolHtml} from '../src/detailPresentation.js';
test('index detail reuses the dated Home market quote without waiting on a fresh provider',()=>{
 const row={ticker:'^KS11',price:3000,change:1,asOf:'2026-10-01T07:00:00Z'};
 assert.deepEqual(detailCachedQuote('^KS11',{heatmap:{results:[]}}, {results:[row]}),row);
 assert.equal(detailCachedQuote('^KS11',null,{results:[{ticker:'^KS11',price:null}]}),null);
});
test('index uses observed point prices, never reconstructs from a current quote',()=>{
 assert.deepEqual(indexSeries({price:9999,data:[{time:1,value:0,price:2500},{time:2,value:10,price:2750}]}),[{time:1,value:2500},{time:2,value:2750}]);
 assert.equal(indexSeries({data:[{time:1,value:0}]}),null);
});

test('cached Korean exchange prices retain a won unit before the live quote arrives',()=>{
 const row={ticker:'005930.KS',price:274500,asOf:'2026-10-01T07:00:00Z'};
 assert.equal(detailCachedQuote('005930.KS',{heatmap:{results:[row]}},null).currency,'KRW');
 assert.equal(detailCachedQuote('NVDA',{heatmap:{results:[{ticker:'NVDA',price:230,currency:'USD'}]}},null).currency,'USD');
 assert.equal(row.currency,undefined);
});
test('quote has a compact main row and expandable distinct observation sources',()=>{
 const html=quoteHtml({price:100,change:2,asOf:'2026-10-01'}, {price:95,date:'2026-09-30'}, {price:'100원',change:'+2%',asOf:'10.01',basis:'제공처 최신 시세',queriedAt:'10.02'});
 assert.match(html,/quote-main/);assert.match(html,/<details/);assert.match(html,/95/);assert.match(html,/스크리너/);assert.match(html,/전 거래일 대비/);
});
test('invalid ticker shows a not-found notice instead of an empty detail shell',()=>{
 const html=invalidSymbolHtml('ZZZZZZ');
 assert.match(html,/존재하지 않는 종목/);
 assert.match(html,/ZZZZZZ/);
 assert.match(html,/data-invalid-search/);
 assert.match(html,/data-tab="home"/);
 // 관심 등록 버튼이 노출되지 않아야 한다
 assert.doesNotMatch(html,/관심 등록/);
});
test('invalid symbol notice escapes the ticker',()=>{
 const html=invalidSymbolHtml('<img src=x>');
 assert.doesNotMatch(html,/<img src=x>/);
 assert.match(html,/&lt;img/);
});
