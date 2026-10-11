import {test} from 'node:test';
import assert from 'node:assert/strict';
import {valuationStocks,clearApiCache} from '../src/api.js';

test('explicit TTM retry bypasses a cached HTTP200 error without clearing other valuation requests',async t=>{
 const original=globalThis.fetch;const calls=[];
 globalThis.fetch=async url=>{calls.push(url);return Response.json(calls.filter(value=>value===url).length===1?{error:'provider unavailable'}:{stocks:[{ticker:'171090.KQ',roa:2.48,trailingPE:40.98}]});};
 clearApiCache();t.after(()=>{globalThis.fetch=original;clearApiCache();});
 assert.equal((await valuationStocks(['171090.KQ'])).error,'provider unavailable');
 await valuationStocks(['005930.KS']);
 assert.equal((await valuationStocks(['171090.KQ'])).error,'provider unavailable');
 const fresh=await valuationStocks(['171090.KQ'],{force:true});
 assert.equal(fresh.stocks?.[0].trailingPE,40.98);
 await valuationStocks(['005930.KS']);
 assert.equal(calls.length,3);
});
