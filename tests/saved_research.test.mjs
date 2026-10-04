import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync,existsSync} from 'node:fs';
const setup=(notes,reviews,fail=false)=>{
 const context=vm.createContext({Date,Error,JSON,RESEARCH_KEY:'notes',REVIEW_KEY:'reviews',readStored:key=>{if(fail)throw Error('blocked');return key==='notes'?notes:reviews;},writeStored:()=>{throw Error('read-only listing must never write');}});
 for(const file of ['researchNotes','reviewStorage','savedResearch'])if(existsSync(`src/${file}.js`))vm.runInContext(readFileSync(`src/${file}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),context);
 return vm.runInContext('typeof savedResearch===\'function\'?savedResearch():null',context);
};
test('saved research merges existing questions and evidence without requiring a watchlist',()=>{
 const result=setup(JSON.stringify({'005930.KS':{question:'현금흐름 비교',updatedAt:'2026-10-02'},invalid:{question:'bad'}}),JSON.stringify({'005930.KS':{conditions:[{key:'margin',label:'영업이익률 비교',baseline:{value:20},savedAt:'2026-10-03'}]},'000660.KS':{conditions:[{key:'revenueGrowth',label:'매출 증가',baseline:{value:30},savedAt:'2026-10-01'}]}}));
 assert.equal(result?.rows?.length,2);assert.equal(result?.rows?.[0]?.symbol,'005930.KS');assert.equal(result?.rows?.[0]?.question,'현금흐름 비교');assert.equal(result?.rows?.[0]?.conditions?.length,1);
});
test('malformed or blocked saved storage is disclosed without overwriting it',()=>{
 assert.equal(setup('{broken','{}')?.error,true);assert.equal(setup('{}','{}',true)?.error,true);
 assert.equal(setup('{}','{}')?.rows?.length,0);
});
