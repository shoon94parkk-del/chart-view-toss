import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function setup(initial=null){
  let saved=initial,fail=false,writes=0;
  const context=vm.createContext({Date,Error,JSON,RESEARCH_KEY:'research',readStored:()=>saved,getStorageContext:()=>0,isStorageContextCurrent:()=>true,writeStored:(_,value)=>{writes++;if(fail)throw new Error('storage full');saved=value;}});
  const source=readFileSync('src/researchNotes.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
  vm.runInContext(source+'\nthis.api={readResearchNote,saveResearchNote,deleteResearchNote};',context);
  return {...context.api,failWrites:()=>{fail=true;},allowWrites:()=>{fail=false;},writes:()=>writes,raw:()=>saved};
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
test('saving or deleting rejects corrupt research roots without replacing recoverable bytes',async()=>{
  for(const raw of ['{"AAPL":{"question":"old"}', 'null', '[]', '"notes"', '42', 'false', '']){
    for(const confirmed of [false,true]){
      const s=setup(raw);
      assert.equal(s.readResearchNote('AAPL'),null);
      await assert.rejects(async()=>s.saveResearchNote('NVDA',{question:'replacement'},{confirmed}),/저장.*손상/);
      assert.equal(s.raw(),raw);assert.equal(s.writes(),0);
      await assert.rejects(async()=>s.deleteResearchNote('AAPL',{confirmed}),/저장.*손상/);
      assert.equal(s.raw(),raw);assert.equal(s.writes(),0);
    }
  }
});
test('editing a valid legacy research map retains unrelated records',async()=>{
  const raw=JSON.stringify({AAPL:{question:'legacy',createdAt:'2020-01-01'},NVDA:{question:'keep',support:'evidence'}}),s=setup(raw);
  await s.saveResearchNote('AAPL',{question:'edited'},{confirmed:true});
  assert.equal(s.readResearchNote('AAPL').createdAt,'2020-01-01');
  assert.deepEqual(JSON.parse(s.raw()).NVDA,{question:'keep',support:'evidence'});
});
test('selected domestic comparison company survives save and can be cleared',()=>{
 const s=setup();s.saveResearchNote('005930.KS',{question:'현금흐름 비교',peer:{symbol:'000660.KS',name:'SK하이닉스'}});
 assert.equal(s.readResearchNote('005930.KS').peer.symbol,'000660.KS');
 s.saveResearchNote('005930.KS',{question:'현금흐름 비교',peer:null});assert.equal(s.readResearchNote('005930.KS').peer,undefined);
 for(const peer of [{symbol:'005930.KS',name:'삼성전자'},{symbol:'AAPL',name:'애플'}]){
  s.saveResearchNote('005930.KS',{question:'질문',peer});assert.equal(s.readResearchNote('005930.KS').peer,undefined);
 }
});


test('reading legacy notes invents no checkpoints and never rewrites old records',()=>{
 const raw=JSON.stringify({AAPL:{question:'legacy',support:'old support',challenge:'old challenge',reviewOn:'2026-11-01',createdAt:'2020-01-01'}}),s=setup(raw);
 const note=s.readResearchNote('AAPL');
 assert.equal(note.checkpoints?.length||0,0);assert.equal(s.raw(),raw);assert.equal(s.writes(),0);
 assert.equal(note.reviewOn,'2026-11-01');assert.equal(note.support,'old support');
});
test('each explicit save atomically appends only its actual question, peer and observed quote',async()=>{
 const s=setup(),quote={ticker:'005930.KS',price:83000,currency:'KRW',asOf:'2026-10-16T01:00:00+09:00',source:'canonical provider',priceBasis:'regular_close',quoteBasis:'exchange',stale:true};
 const note=await s.saveResearchNote('005930.KS',{question:'new question',support:'kept support',challenge:'kept challenge',reviewOn:'2026-11-01',peer:{symbol:'000660.KS',name:'peer'}},{confirmed:true,operationId:'save-1',quoteSnapshot:quote,now:new Date('2026-10-16T02:00:00Z')});
 assert.equal(s.writes(),1);assert.equal(note.checkpoints.length,1);
 const event=note.checkpoints[0];assert.equal(event.id,'save-1');assert.equal(event.savedAt,'2026-10-16T02:00:00.000Z');assert.equal(event.question,'new question');assert.equal(event.peer.symbol,'000660.KS');assert.equal(event.reviewOn,'2026-11-01');
 assert.equal(event.quote.price,83000);assert.equal(event.quote.currency,'KRW');assert.equal(event.quote.asOf,quote.asOf);assert.equal(event.quote.source,quote.source);assert.equal(event.quote.priceBasis,'regular_close');assert.equal(event.quote.quoteBasis,'exchange');assert.equal(event.quote.stale,true);
 quote.price=1;assert.equal(s.readResearchNote('005930.KS').checkpoints[0].quote.price,83000);
 assert.equal(note.support,'kept support');assert.equal(note.challenge,'kept challenge');assert.equal(JSON.parse(s.raw())['005930.KS'].checkpoints.length,1);
});
test('absent or invalid quote is an explicit missing snapshot and save time never supplies quote time',()=>{
 const s=setup();
 for(const quoteSnapshot of [null,{}, {price:null,currency:'KRW'}, {price:'83000',currency:'KRW'}, {price:0,currency:'KRW'}, {price:NaN,currency:'KRW'}, {ticker:'MSFT',price:1,currency:'USD'}, {price:1,currency:''}]){
  const note=s.saveResearchNote('AAPL',{question:'missing'},{quoteSnapshot});assert.equal(note.checkpoints.at(-1).quote,null);
 }
 for(const asOf of [undefined,'invalid','2026-10-16','2026-10-16T12:30:00']){
  const note=s.saveResearchNote('AAPL',{question:'untimed'},{quoteSnapshot:{price:1,currency:'USD',asOf,source:'observed',stale:false},now:new Date('2026-10-17T00:00:00Z')});
  assert.notEqual(note.checkpoints.at(-1).quote.asOf,note.updatedAt);
  assert.equal(note.checkpoints.at(-1).quote.timed,false);
 }
});
test('duplicate operation IDs do not append or overwrite a later note',async()=>{
 const s=setup();const first=s.saveResearchNote('AAPL',{question:'first'},{confirmed:true,operationId:'same'}),duplicate=s.saveResearchNote('AAPL',{question:'first'},{confirmed:true,operationId:'same'});
 await Promise.all([first,duplicate]);assert.equal(s.readResearchNote('AAPL').checkpoints.length,1);assert.equal(s.writes(),1);
 await s.saveResearchNote('AAPL',{question:'later'},{confirmed:true,operationId:'later'});
 await s.saveResearchNote('AAPL',{question:'first'},{confirmed:true,operationId:'same'});
 assert.equal(s.readResearchNote('AAPL').question,'later');assert.equal(s.readResearchNote('AAPL').checkpoints.length,2);
});
test('failed confirmed writes leave no checkpoint and retry of the same operation creates one',async()=>{
 const s=setup();await s.saveResearchNote('AAPL',{question:'old'},{confirmed:true,operationId:'old'});const before=s.raw();s.failWrites();
 await assert.rejects(s.saveResearchNote('AAPL',{question:'next'},{confirmed:true,operationId:'retry'}),/full/);assert.equal(s.raw(),before);
 s.allowWrites();await s.saveResearchNote('AAPL',{question:'next'},{confirmed:true,operationId:'retry'});await s.saveResearchNote('AAPL',{question:'next'},{confirmed:true,operationId:'retry'});
 assert.equal(s.readResearchNote('AAPL').checkpoints.length,2);
});
test('checkpoint retention keeps the latest twenty explicit saves without mutating earlier evidence',()=>{
 const s=setup();let original;
 for(let i=0;i<22;i++){
  s.saveResearchNote('AAPL',{question:`question ${i}`},{operationId:`op-${i}`,quoteSnapshot:{price:i+1,currency:'USD',asOf:'2026-10-16T01:00:00Z'}});
  if(i===0)original=s.readResearchNote('AAPL');
 }
 const note=s.readResearchNote('AAPL');assert.equal(note.checkpoints.length,20);assert.equal(note.checkpoints[0].id,'op-2');assert.equal(note.checkpoints.at(-1).id,'op-21');assert.equal(original.checkpoints.length,1);assert.equal(original.checkpoints[0].quote.price,1);
 s.deleteResearchNote('AAPL');assert.equal(s.readResearchNote('AAPL'),null);
});

test('impossible source calendar dates never become timed quote evidence',()=>{
 const s=setup();
 for(const asOf of ['2026-02-30T03:00:00Z','2025-02-29T03:00:00+09:00','2026-04-31T23:00:00-04:00','2026-02-30']){
  const note=s.saveResearchNote('AAPL',{question:'calendar evidence'},{quoteSnapshot:{price:1,currency:'USD',asOf,source:'observed',stale:false}});
  const quote=note.checkpoints.at(-1).quote;
  assert.equal(quote.timed,false,asOf);assert.equal(quote.asOf,null,asOf);assert.equal(quote.price,1);
 }
 for(const asOf of ['2024-02-29T03:00:00+09:00','2026-03-01T00:30:00+09:00','2026-04-30T23:00:00-04:00']){
  const note=s.saveResearchNote('AAPL',{question:'valid calendar evidence'},{quoteSnapshot:{price:1,currency:'USD',asOf}});
  assert.equal(note.checkpoints.at(-1).quote.timed,true,asOf);assert.equal(note.checkpoints.at(-1).quote.asOf,asOf);
 }
});
