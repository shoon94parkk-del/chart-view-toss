import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
test('signed balance release isolates old HTTP responses while retaining normal application TTLs',async()=>{
 const calls=[];const context=vm.createContext({api:async(path,options)=>{calls.push({path,options});return path.includes('item-detail')?{key:'semiconductor',history:[{}]}:{period:'2026-08',summary:{exportsUsdBillion:1}};},normalizeExportSnapshot:x=>x,normalizeExportItemDetail:x=>x,normalizeExportProvisionalRadar:x=>x,normalizeSemiconductorCountryMatrix:x=>x});
 vm.runInContext(readFileSync(new URL('../src/exportMomentumData.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),context);
 await context.loadExportMomentumSnapshot();await context.loadExportItemDetail('semiconductor');
 for(const {path} of calls)assert.equal(new URL(path,'https://example.com').searchParams.get('balanceBasis'),'signed-v1','an old cached zero-clamped balance cannot share the new URL');
 assert.equal(calls[0].options.ttlMs,300000);assert.equal(calls[1].options.ttlMs,600000);assert.equal(calls[1].options.force,false);
});
