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
