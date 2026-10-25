import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {newsArticleUrl} from '../src/newsReaderModel.js';
const key='chartview-toss-research-evidence-v1';
const article=(id='one')=>({title:'애플 실적 원문',url:`https://news.test/${id}`,sources:['매체','공시뉴스'],publishedAt:'2026-10-25',stocks:[{symbol:'AAPL',name:'애플'},{symbol:'005930.KS',name:'삼성전자'}]});
function setup({native=false}={}){
 const disk=new Map();let identity={type:'HASH',hash:'evidence-A'},gate=null,enteredResolve,fail=false;
 const source=file=>existsSync(`src/${file}.js`)?readFileSync(`src/${file}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''):'';
 const context=vm.createContext({URL,newsArticleUrl,setTimeout,clearTimeout,Event,isAppsInTossRuntime:()=>native,User:{getAnonymousKey:async()=>identity},document:{dispatchEvent(){}},localStorage:{getItem:k=>disk.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('full');disk.set(k,v);},removeItem:k=>disk.delete(k)},Storage:{getItem:async k=>disk.get(k)??null,removeItem:async k=>disk.delete(k),setItem:async(k,v)=>{if(k.startsWith(key)&&gate){enteredResolve();await gate;}if(k.startsWith(key)&&fail)throw Error('full');disk.set(k,v);}}});
 vm.runInContext(source('storage')+'\n{'+source('researchEvidence')+'\nthis.api={initializeStorage,clearStored,readStored,...(typeof readResearchEvidence===\'function\'?{readResearchEvidence,saveResearchEvidence,updateResearchEvidenceMemo,deleteResearchEvidence}:{})};}',context);
 assert.equal(typeof context.api.saveResearchEvidence,'function','evidence persistence API must exist');
 return {...context.api,disk,fail:()=>{fail=true;},recover:()=>{fail=false;},switchIdentity:()=>{identity={type:'HASH',hash:'evidence-B'};},hold:()=>{let release;const entered=new Promise(resolve=>{enteredResolve=resolve;});gate=new Promise(resolve=>{release=resolve;});return {entered,release:()=>{gate=null;release();}};}};
}
test('explicit stock selection saves only article metadata and preserves the original date-only publication',async()=>{
 const s=setup();const result=await s.saveResearchEvidence({...article(),body:'private body',summary:'not evidence'},{symbol:'AAPL',memo:'다음 공시와 비교',now:new Date('2026-10-25T03:00:00Z')});
 assert.equal(result.duplicate,false);assert.equal(result.row.publishedAt,'2026-10-25');assert.equal(result.row.savedAt,'2026-10-25T03:00:00.000Z');assert.equal(result.row.memo,'다음 공시와 비교');
 const stored=JSON.parse(s.disk.get(key));assert.equal(stored.version,1);assert.equal(stored.rows.length,1);assert.equal(stored.rows[0].body,undefined);assert.equal(stored.rows[0].summary,undefined);assert.deepEqual(Array.from(s.readResearchEvidence('AAPL').rows[0].sources),['매체','공시뉴스']);
});
test('deduplication preserves first memo and metadata while explicit second article-stock selection is independent',async()=>{
 const s=setup();const first=await s.saveResearchEvidence(article(),{symbol:'AAPL',memo:'처음 메모'});
 const duplicate=await s.saveResearchEvidence({...article(),title:'변경 제목'},{symbol:'AAPL',memo:'다른 메모'});
 assert.equal(duplicate.duplicate,true);assert.equal(duplicate.row.id,first.row.id);assert.equal(duplicate.row.memo,'처음 메모');assert.equal(duplicate.row.title,'애플 실적 원문');
 await s.saveResearchEvidence(article(),{symbol:'005930.KS',memo:''});assert.equal(s.readResearchEvidence().rows.length,2);
});
test('unsafe URLs, credentials, invented stock selection and excessive memo cannot write evidence',async()=>{
 const s=setup();for(const url of ['http://news.test/a','javascript:alert(1)','https://user:secret@news.test/a','https://news.test/a\n'])await assert.rejects(async()=>s.saveResearchEvidence({...article(),url},{symbol:'AAPL'}),/HTTPS|원문/);
 for(const symbol of ['',undefined,'MSFT'])await assert.rejects(async()=>s.saveResearchEvidence(article(),{symbol}),/종목/);
 await assert.rejects(async()=>s.saveResearchEvidence(article(),{symbol:'AAPL',memo:'가'.repeat(301)}),/300/);assert.equal(s.disk.has(key),false);
});
test('per-stock and total capacity reject additional records without silently deleting existing rows',async()=>{
 const s=setup();for(let group=0;group<5;group++)for(let i=0;i<20;i++)await s.saveResearchEvidence({...article(`${group}-${i}`),stocks:[{symbol:`STOCK${group}`}]},{symbol:`STOCK${group}`});
 await assert.rejects(s.saveResearchEvidence({...article('stock-full'),stocks:[{symbol:'STOCK0'}]},{symbol:'STOCK0'}),/20/);
 await assert.rejects(s.saveResearchEvidence({...article('total-full'),stocks:[{symbol:'NEW'}]},{symbol:'NEW'}),/100/);assert.equal(s.readResearchEvidence().rows.length,100);
});
test('memo editing and delete affect only their own record and failed writes allow a retry',async()=>{
 const s=setup();const a=await s.saveResearchEvidence(article(),{symbol:'AAPL',memo:'원래'});await s.saveResearchEvidence(article('other'),{symbol:'005930.KS'});
 s.fail();await assert.rejects(s.updateResearchEvidenceMemo(a.row.id,'실패'),/full/);assert.equal(s.readResearchEvidence('AAPL').rows[0].memo,'원래');
 s.recover();await s.updateResearchEvidenceMemo(a.row.id,'수정');assert.equal(s.readResearchEvidence('AAPL').rows[0].memo,'수정');await s.deleteResearchEvidence(a.row.id);assert.equal(s.readResearchEvidence('AAPL').rows.length,0);assert.equal(s.readResearchEvidence().rows.length,1);
});
test('corrupt or malicious persisted values surface an error and every mutation preserves the damaged raw value',async()=>{
 const s=setup();const a=await s.saveResearchEvidence(article(),{symbol:'AAPL'});const valid=JSON.parse(s.disk.get(key));
 for(const raw of ['{','{}',JSON.stringify({version:2,rows:[]}),JSON.stringify({...valid,rows:[{...valid.rows[0],url:'https://u:p@news.test/a'}]}),JSON.stringify({...valid,rows:[{...valid.rows[0],memo:'x'.repeat(301)}]})]){
  s.disk.set(key,raw);assert.ok(s.readResearchEvidence().error);await assert.rejects(s.saveResearchEvidence(article('new'),{symbol:'AAPL'}),/저장|손상/);await assert.rejects(s.updateResearchEvidenceMemo(a.row.id,'수정'),/저장|손상/);await assert.rejects(s.deleteResearchEvidence(a.row.id),/저장|손상/);assert.equal(s.disk.get(key),raw);
 }
});
test('confirmed serialized native writes remain invisible until completion and merge concurrent symbols',async()=>{
 const s=setup({native:true});await s.initializeStorage();const hold=s.hold();
 const a=s.saveResearchEvidence(article(),{symbol:'AAPL'});await hold.entered;const b=s.saveResearchEvidence(article('two'),{symbol:'005930.KS'});assert.equal(s.readResearchEvidence().rows.length,0);
 hold.release();await Promise.all([a,b]);assert.equal(s.readResearchEvidence().rows.length,2);
});
for(const change of ['reset','account'])test(`${change} invalidates queued native evidence writes and prevents personal data entering the new context`,async()=>{
 const s=setup({native:true});await s.initializeStorage();const hold=s.hold();
 const first=s.saveResearchEvidence(article(),{symbol:'AAPL'});await hold.entered;const second=s.saveResearchEvidence(article('two'),{symbol:'005930.KS'});const settled=Promise.allSettled([first,second]);
 if(change==='account')s.switchIdentity();const changePromise=change==='account'?s.initializeStorage():s.clearStored();hold.release();await changePromise;
 assert.deepEqual((await settled).map(x=>x.status),['rejected','rejected']);assert.equal(s.readResearchEvidence().rows.length,0);assert.equal(s.disk.has(`${key}:evidence-B`),false);if(change==='reset')assert.equal(s.disk.has(`${key}:evidence-A`),false);
});
test('browser reset rejects deferred writes before the first write',async()=>{
 const s=setup();const save=s.saveResearchEvidence(article(),{symbol:'AAPL'});const settled=Promise.allSettled([save]);await s.clearStored();assert.equal((await settled)[0].status,'rejected');assert.equal(s.disk.has(key),false);
});
