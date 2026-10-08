import test from 'node:test';
import assert from 'node:assert/strict';
import {homeBootstrap,pickMonitor,clearApiCache} from '../src/api.js';

for(const [name,load] of [['bootstrap',homeBootstrap],['monitor',pickMonitor]]) {
  test(`${name}: explicit retry replaces a cached malformed successful response`,async()=>{
    const original=globalThis.fetch;let calls=0;
    globalThis.fetch=async()=>Response.json(++calls===1?{invalid:true}:{recommendations:[],stocks:[]});
    clearApiCache();
    try {
      assert.deepEqual(await load(),{invalid:true});
      assert.deepEqual(await load(),{invalid:true});assert.equal(calls,1);
      assert.deepEqual(await load({force:true}),{recommendations:[],stocks:[]});assert.equal(calls,2);
    }finally{globalThis.fetch=original;clearApiCache();}
  });
}
