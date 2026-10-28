import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

function setup(initial){
 let raw=initial,writes=0;
 const context=vm.createContext({REVIEW_KEY:'reviews',readStored:()=>raw,writeStored:(_,value)=>{raw=value;writes++;}});
 const source=readFileSync('src/reviewStorage.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
 vm.runInContext(source+'\nthis.api={updateReview,readReview};',context);
 return {...context.api,raw:()=>raw,writes:()=>writes};
}

test('review updates preserve malformed storage rather than replacing it with an empty map',()=>{
 for(const raw of ['{"AAPL":', 'null', '[]', '42', 'false', '"review"', '']){
  const s=setup(raw);
  assert.throws(()=>s.updateReview('NVDA',{reviewedAt:'2026-10-28'}));
  assert.equal(s.raw(),raw);assert.equal(s.writes(),0);
 }
});

test('missing and valid legacy review stores support updates without losing other companies',()=>{
 const empty=setup(null);empty.updateReview('AAPL',{reviewedAt:'2026-10-28'});
 assert.equal(empty.readReview('AAPL').reviewedAt,'2026-10-28');
 const original={AAPL:{reviewedAt:'2026-10-01',conditions:[]},NVDA:{reviewedAt:'2026-10-02',conditions:[]}};
 const s=setup(JSON.stringify(original));s.updateReview('AAPL',{reviewedAt:'2026-10-28'});
 assert.deepEqual(JSON.parse(s.raw()).NVDA,original.NVDA);
});
