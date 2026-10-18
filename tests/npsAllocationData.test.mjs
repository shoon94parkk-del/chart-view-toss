import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const module=await import('../src/npsAllocationData.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const summary=JSON.parse(readFileSync(new URL('./fixtures/nps/summary.json',import.meta.url)));
const details=JSON.parse(readFileSync(new URL('./fixtures/nps/holdings.json',import.meta.url)));
const make=read=>{assert.equal(typeof module.createNpsDataClient,'function');return module.createNpsDataClient({read});};
test('summary read does not fetch holdings and only validates same-version detail on demand',async()=>{
 const calls=[];const client=make(async filename=>{calls.push(filename);return filename.endsWith('summary.json')?summary:details;});
 const s=await client.summary();assert.deepEqual(calls,['nps/summary.json']);await client.holdings(s);await client.holdings(s);assert.equal(calls.length,2);assert.equal(calls[1],'nps/'+summary.filing.detailsFile);
});
test('slow older summary cannot replace a newer successful publication',async()=>{
 const pending=[];const client=make(()=>new Promise(resolve=>pending.push(resolve)));const first=client.summary(),second=client.summary();
 const newer=structuredClone(summary);newer.generatedAt='2026-10-18T23:30:00Z';newer.snapshotVersion='b'.repeat(16);pending[1](newer);assert.equal((await second).snapshotVersion,newer.snapshotVersion);pending[0](summary);assert.equal((await first).snapshotVersion,newer.snapshotVersion);
});
test('HTTP200 invalid summary and mismatched detail are not cached as success',async()=>{
 let valid=false;const client=make(async filename=>filename.endsWith('summary.json')?(valid?summary:{...summary,result:{weight:0}}):(valid?details:{...details,snapshotVersion:'mismatch'}));
 await assert.rejects(client.summary());await assert.rejects(client.holdings(summary));valid=true;assert.equal((await client.summary()).snapshotVersion,summary.snapshotVersion);assert.equal((await client.holdings(summary)).rows.length,552);
});
