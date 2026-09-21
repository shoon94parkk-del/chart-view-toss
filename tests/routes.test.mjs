import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveRoute} from '../src/routes.js';
test('feature paths and hash re-entry resolve to the same page',()=>{
  for(const tab of ['home','chart','watch','valuation','macro','discover','news','info','more','heatmap','consensus','bands','tools']) {
    for(const location of [{pathname:`/${tab}`},{pathname:`/chartview/${tab}`},{hash:`#${tab}`}]) assert.equal(resolveRoute(location).tab,tab);
  }
  assert.equal(resolveRoute({pathname:'/chartviewHome'}).tab,'chart');
  assert.deepEqual(resolveRoute({pathname:'/stock/005930.KS'}),{tab:'detail',detailSymbol:'005930.KS'});
});
test('malformed escapes, unknown routes and empty detail never crash startup',()=>{
  for(const location of [{pathname:'/%ZZ'},{hash:'#detail/%E0%A4'},{pathname:'/unknown'},{hash:'#detail'},{pathname:'/stock/<script>'}]) assert.equal(resolveRoute(location).tab,'home');
});
