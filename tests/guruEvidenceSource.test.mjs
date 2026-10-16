import test from 'node:test';
import assert from 'node:assert/strict';
import {readGuruEvidence} from '../src/guruEvidenceSource.js';
const version='a'.repeat(20),ticker='005930.KS';
const proof={snapshotVersion:version,symbol:ticker,strategies:{buffett:{status:'matched'}}};
const conflict=Object.assign(new Error('snapshot changed'),{status:409});
test('same version proof bridges publication without changing the displayed list',async()=>{
 let calls=0;
 const actual=await readGuruEvidence(ticker,version,{readApi:async()=>{throw conflict;},readPublished:async()=>{calls++;return proof;}});
 assert.deepEqual(actual,proof);assert.equal(calls,1);
});
for(const value of [{...proof,snapshotVersion:'older'},{...proof,symbol:'000660.KS'},{...proof,strategies:null}])test('mismatched published proof retains the original conflict',async()=>{
 await assert.rejects(readGuruEvidence(ticker,version,{readApi:async()=>{throw conflict;},readPublished:async()=>value}),error=>error===conflict);
});
test('healthy API and ordinary API failures never add a publication request',async()=>{
 let calls=0;const readPublished=async()=>{calls++;return proof;};
 assert.equal(await readGuruEvidence(ticker,version,{readApi:async()=>proof,readPublished}),proof);
 const unavailable=Object.assign(new Error('unavailable'),{status:503});
 await assert.rejects(readGuruEvidence(ticker,version,{readApi:async()=>{throw unavailable;},readPublished}),error=>error===unavailable);
 assert.equal(calls,0);
});
test('invalid path identities never issue requests',async()=>{
 let calls=0;const reader=async()=>{calls++;return proof;};
 await assert.rejects(readGuruEvidence(ticker,'../escape',{readApi:reader,readPublished:reader}));assert.equal(calls,0);
});
