import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function setup(){
  let saved=null,fail=false;
  const context=vm.createContext({Date,Error,JSON,RESEARCH_KEY:'research',readStored:()=>saved,writeStored:(_,value)=>{if(fail)throw new Error('storage full');saved=value;}});
  const source=readFileSync('src/researchNotes.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
  vm.runInContext(source+'\nthis.api={readResearchNote,saveResearchNote,deleteResearchNote};',context);
  return {...context.api,failWrites:()=>{fail=true;},raw:()=>saved};
}
test('research cards persist by normalized ticker and retain creation time on edit',()=>{
  const s=setup();
  s.saveResearchNote('005930.ks',{question:'  매출이 늘었나?  ',support:'보고서 메모',reviewOn:'2026-10-15'},{now:new Date('2026-09-30T00:00:00Z')});
  s.saveResearchNote('000660.KS',{question:'다음에 확인할 점'});
  const edited=s.saveResearchNote('005930.KS',{question:'영업이익도 늘었나?',challenge:'일회성 요인 확인'},{now:new Date('2026-10-01T00:00:00Z')});
  assert.equal(edited.createdAt,'2026-09-30T00:00:00.000Z');
  assert.equal(edited.updatedAt,'2026-10-01T00:00:00.000Z');
  assert.equal(s.readResearchNote('005930.ks').challenge,'일회성 요인 확인');
  s.deleteResearchNote('005930.KS');
  assert.equal(s.readResearchNote('005930.KS'),null);
  assert.equal(s.readResearchNote('000660.KS').question,'다음에 확인할 점');
});
test('invalid questions or dates never overwrite a saved card',()=>{
  const s=setup();s.saveResearchNote('AAPL',{question:'유효한 질문'});const original=s.raw();
  for(const input of [{question:'  '},{question:'질문',reviewOn:'2026-02-30'},{question:'질문',reviewOn:'tomorrow'}])assert.throws(()=>s.saveResearchNote('AAPL',input));
  assert.equal(s.raw(),original);
});
test('storage failure leaves previous persisted content intact and is surfaced',()=>{
  const s=setup();s.saveResearchNote('AAPL',{question:'기존 질문'});s.failWrites();
  assert.throws(()=>s.saveResearchNote('AAPL',{question:'수정 질문'}),/storage full/);
  assert.equal(s.readResearchNote('AAPL').question,'기존 질문');
});
test('selected domestic comparison company survives save and can be cleared',()=>{
 const s=setup();s.saveResearchNote('005930.KS',{question:'현금흐름 비교',peer:{symbol:'000660.KS',name:'SK하이닉스'}});
 assert.equal(s.readResearchNote('005930.KS').peer.symbol,'000660.KS');
 s.saveResearchNote('005930.KS',{question:'현금흐름 비교',peer:null});assert.equal(s.readResearchNote('005930.KS').peer,undefined);
 for(const peer of [{symbol:'005930.KS',name:'삼성전자'},{symbol:'AAPL',name:'애플'}]){
  s.saveResearchNote('005930.KS',{question:'질문',peer});assert.equal(s.readResearchNote('005930.KS').peer,undefined);
 }
});
