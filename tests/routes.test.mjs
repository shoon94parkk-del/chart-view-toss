import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveRoute} from '../src/routes.js';
test('feature paths and hash re-entry resolve to the same page',()=>{
  for(const tab of ['home','chart','watch','valuation','macro','exports','discover','ideas','picks','news','info','more','heatmap','consensus','bands','tools']) {
    for(const location of [{pathname:`/${tab}`},{pathname:`/chartview/${tab}`},{hash:`#${tab}`}]) assert.equal(resolveRoute(location).tab,tab);
  }
  assert.equal(resolveRoute({pathname:'/chartviewHome'}).tab,'chart');
  assert.deepEqual(resolveRoute({pathname:'/stock/005930.KS'}),{tab:'detail',detailSymbol:'005930.KS'});
});
test('malformed escapes, unknown routes and empty detail show an explicit not-found view',()=>{
  for(const location of [{pathname:'/%ZZ'},{hash:'#detail/%E0%A4'},{pathname:'/unknown'},{hash:'#detail'},{pathname:'/stock/<script>'}]) assert.equal(resolveRoute(location).tab,'notfound');
  assert.equal(resolveRoute({pathname:'/'}).tab,'home');
  assert.equal(resolveRoute({hash:'#home'}).tab,'home');
});
test('stock news direct links retain the stock and plain news clears it',()=>{
 assert.deepEqual(resolveRoute({hash:'#news/005930.KS'}),{tab:'news',detailSymbol:null,newsSymbol:'005930.KS'});
 assert.equal(resolveRoute({hash:'#news'}).newsSymbol,null);
 assert.equal(resolveRoute({hash:'#news/<script>'}).tab,'notfound');
});

test('export tab and price-family routes survive reload while rejecting unknown families',()=>{
 for(const focus of ['items','countries','memory','quadrant','breadth','history','provisional'])assert.equal(resolveRoute({hash:'#exports/'+focus}).exportFocus,focus);
 for(const family of ['dram-chip','nand-chip','nand-wafer','dram-module','gddr']){
  const hash='#exports/memory/'+family;
  assert.equal(resolveRoute({hash}).memoryPriceGroup,family);
  assert.deepEqual(resolveRoute({pathname:hash.slice(1)}),resolveRoute({hash}));
 }
 assert.equal(resolveRoute({hash:'#exports/memory/unknown'}).memoryPriceGroup,null);
 assert.equal(resolveRoute({hash:'#exports/countries/nand-chip'}).memoryPriceGroup,null);
 assert.equal(resolveRoute({hash:'#exports'}).exportFocus,null);
 assert.equal(resolveRoute({hash:'#exports'}).memoryPriceGroup,null);
});
