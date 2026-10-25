import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {newsArticleUrl} from '../src/newsReaderModel.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const article={url:'https://news.test/one',title:'<기사 제목>',stocks:[{symbol:'AAPL',name:'<애플>'},{symbol:'005930.KS',name:'삼성전자'}],sources:['<매체>'],publishedAt:'2026-10-25'};
const record={id:'first',symbol:'AAPL',title:'<기사 제목>',url:article.url,sources:['<매체>'],publishedAt:'2026-10-25',savedAt:'2026-10-25T03:00:00Z',memo:'<내 메모>'};
function setup({rows=[record],save=async()=>({row:record,duplicate:false}),update,remove,error=null}={}){
 let html='',writes=0,current=true,generation=0;const listeners=new Map(),fields=new Map();
 const host={get innerHTML(){return html;},set innerHTML(v){html=v;writes++;},contains:x=>x.inside===true,addEventListener:(t,f)=>listeners.set(t,f),removeEventListener:(t,f)=>{if(listeners.get(t)===f)listeners.delete(t);},querySelector:selector=>fields.get(selector)||null,querySelectorAll:()=>[]};
 const context=vm.createContext({newsArticleUrl,getStorageContext:()=>generation,isStorageContextCurrent:c=>c===generation,readResearchEvidence:symbol=>({rows:rows.filter(row=>!symbol||row.symbol===symbol),error}),saveResearchEvidence:save,updateResearchEvidenceMemo:update|| (async(id,memo)=>{rows=rows.map(row=>row.id===id?{...row,memo}:row);}),deleteResearchEvidence:remove|| (async id=>{rows=rows.filter(row=>row.id!==id);})});
 const source=existsSync('src/researchEvidenceView.js')?readFileSync('src/researchEvidenceView.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''):'';
 vm.runInContext(source+'\nthis.api=typeof openNewsEvidenceEditor===\'function\'?{openNewsEvidenceEditor,mountResearchEvidence}:{};',context);
 assert.equal(typeof context.api.openNewsEvidenceEditor,'function','evidence editor must exist');
 return {...context.api,host,get writes(){return writes;},isCurrent:()=>current,leave:()=>{current=false;},reset:()=>generation++,click(dataset){return listeners.get('click')?.({target:{closest:()=>({inside:true,dataset})},preventDefault(){}});},submit(dataset,values){const form={inside:true,dataset,querySelector:selector=>({value:values[selector.match(/name="(.*?)"/)?.[1]]??''})};return listeners.get('submit')?.({target:form,preventDefault(){}});}};
}
test('editor requires explicit article stock selection, escapes metadata and blocks repeated pending submits',async()=>{
 const d=deferred(),saved=[],notices=[],callbacks=[];const s=setup({save:(row,options)=>{saved.push(options);return d.promise;}});
 const cleanup=s.openNewsEvidenceEditor(s.host,article,{onNotice:m=>notices.push(m),onSaved:value=>callbacks.push(value)});
 assert.match(s.host.innerHTML,/선택해주세요/);assert.match(s.host.innerHTML,/&lt;기사 제목&gt;/);assert.doesNotMatch(s.host.innerHTML,/<애플>/);
 s.submit({evidenceEditor:''},{symbol:'',memo:'메모'});assert.equal(saved.length,0);assert.match(s.host.innerHTML,/관련 종목/);
 s.submit({evidenceEditor:''},{symbol:'AAPL',memo:'사용자 메모'});s.submit({evidenceEditor:''},{symbol:'005930.KS',memo:'중복 클릭'});assert.equal(saved.length,1);assert.match(s.host.innerHTML,/저장 중/);assert.equal(callbacks.length,0);
 d.resolve({row:record,duplicate:false});await tick();assert.equal(callbacks.length,1);assert.match(s.host.innerHTML,/저장했어요/);cleanup();
});
test('editor rejects invented stocks before persistence and keeps draft input after write failure for retry',async()=>{
 let calls=0;const s=setup({save:async()=>{calls++;if(calls===1)throw Error('저장 공간 부족');return {row:record,duplicate:true};}});
 const cleanup=s.openNewsEvidenceEditor(s.host,article,{});
 s.submit({evidenceEditor:''},{symbol:'MSFT',memo:''});assert.equal(calls,0);
 s.submit({evidenceEditor:''},{symbol:'AAPL',memo:'지켜야 할 메모'});await tick();assert.match(s.host.innerHTML,/저장 공간 부족/);assert.match(s.host.innerHTML,/지켜야 할 메모/);
 s.submit({evidenceEditor:''},{symbol:'AAPL',memo:'지켜야 할 메모'});await tick();assert.match(s.host.innerHTML,/이미 저장/);cleanup();
});
test('late editor settlement and obsolete same-host mounts cannot render or announce on a replaced route',async()=>{
 const d=deferred(),notices=[];const s=setup({save:()=>d.promise});
 const old=s.openNewsEvidenceEditor(s.host,article,{onNotice:m=>notices.push(m)});s.submit({evidenceEditor:''},{symbol:'AAPL',memo:''});
 const cleanup=s.openNewsEvidenceEditor(s.host,{...article,title:'새 기사'},{});const writes=s.writes;old();d.resolve({row:record});await tick();assert.equal(s.writes,writes);assert.equal(notices.length,0);assert.match(s.host.innerHTML,/새 기사/);cleanup();
});
test('account/reset invalidates editor interaction before a new mutation can target a new account',()=>{
 const saved=[];const s=setup({save:(...args)=>saved.push(args)});const cleanup=s.openNewsEvidenceEditor(s.host,article,{});s.reset();s.submit({evidenceEditor:''},{symbol:'AAPL',memo:'이전 계정'});assert.equal(saved.length,0);cleanup();
});
test('US detail renders safe original metadata and supports confirmed memo save and delete',async()=>{
 const opened=[];const s=setup();const cleanup=s.mountResearchEvidence(s.host,{symbol:'AAPL',onExternal:url=>opened.push(url)});
 assert.match(s.host.innerHTML,/2026-10-25/);assert.match(s.host.innerHTML,/&lt;내 메모&gt;/);assert.doesNotMatch(s.host.innerHTML,/<기사/);
 s.click({evidenceOriginal:'first'});assert.deepEqual(opened,[article.url]);s.click({evidenceEdit:'first'});assert.match(s.host.innerHTML,/textarea/);
 s.submit({evidenceMemoForm:'first'},{memo:'수정한 메모'});await tick();assert.match(s.host.innerHTML,/수정한 메모/);assert.doesNotMatch(s.host.innerHTML,/textarea/);
 s.click({evidenceDelete:'first'});await tick();assert.match(s.host.innerHTML,/아직 저장한 조사 근거가 없어요/);cleanup();
});
test('list failures keep original rows and editor available for retry; corrupted data renders a visible alert',async()=>{
 const s=setup({remove:async()=>{throw Error('삭제 저장 실패');}});const cleanup=s.mountResearchEvidence(s.host,{symbol:'AAPL'});s.click({evidenceDelete:'first'});await tick();assert.match(s.host.innerHTML,/삭제 저장 실패/);assert.match(s.host.innerHTML,/data-evidence-row/);cleanup();
 const broken=setup({rows:[],error:'저장된 조사 근거가 손상됐어요'});const close=broken.mountResearchEvidence(broken.host,{});assert.match(broken.host.innerHTML,/role="alert"/);assert.match(broken.host.innerHTML,/손상/);close();
});
test('compact Watch groups evidence into one stock entry and hides the empty list',()=>{
 const selected=[],s=setup({rows:[record,{...record,id:'second',url:'https://news.test/two',title:'다음 기사',savedAt:'2026-10-26T00:00:00Z'}]});
 const cleanup=s.mountResearchEvidence(s.host,{compact:true,onStock:(...args)=>selected.push(args)});
 assert.equal((s.host.innerHTML.match(/data-evidence-stock=/g)||[]).length,1);assert.match(s.host.innerHTML,/2개/);assert.match(s.host.innerHTML,/다음 기사/);assert.doesNotMatch(s.host.innerHTML,/data-evidence-row/);assert.doesNotMatch(s.host.innerHTML,/내 메모/);
 s.click({evidenceStock:'second'});assert.deepEqual(selected,[['AAPL','AAPL']]);cleanup();
 const empty=setup({rows:[]});const close=empty.mountResearchEvidence(empty.host,{compact:true});assert.equal(empty.host.innerHTML,'');close();
});
test('late list mutations cannot render or announce after account reset or route replacement',async()=>{
 for(const change of ['reset','route']){
  const d=deferred(),notices=[];const s=setup({remove:()=>d.promise});const cleanup=s.mountResearchEvidence(s.host,{symbol:'AAPL',onNotice:m=>notices.push(m),isCurrent:s.isCurrent});
  s.click({evidenceDelete:'first'});if(change==='reset')s.reset();else s.leave();s.host.innerHTML='새 화면';const writes=s.writes;d.resolve();await tick();assert.equal(s.writes,writes);assert.equal(notices.length,0);cleanup();
 }
});
test('closing the inline evidence editor returns keyboard focus to its opening article action',()=>{
 const s=setup();let focused=false;const trigger={focus(){focused=true;}};s.host.ownerDocument={activeElement:trigger};
 const cleanup=s.openNewsEvidenceEditor(s.host,article,{});s.click({evidenceCancel:''});assert.equal(focused,true);assert.equal(s.host.innerHTML,'');cleanup();
});
test('deleting the final evidence record focuses its empty result status after the action disappears',async()=>{
 const s=setup();let focused=false;s.host.querySelector=selector=>selector==='[data-evidence-list-status]'?{focus(){focused=true;}}:null;
 const cleanup=s.mountResearchEvidence(s.host,{symbol:'AAPL'});s.click({evidenceDelete:'first'});await tick();assert.equal(focused,true);assert.match(s.host.innerHTML,/아직 저장한 조사 근거가 없어요/);cleanup();
});
test('a delayed editor save preserves focus deliberately moved to an outside control',async()=>{
 const d=deferred(),s=setup({save:()=>d.promise}),body={},outside={};let restores=0;
 const document={body,activeElement:{inside:true}};s.host.ownerDocument=document;
 s.host.querySelector=selector=>selector==='[data-evidence-save]'?{focus(){restores++;document.activeElement={inside:true};}}:null;
 const cleanup=s.openNewsEvidenceEditor(s.host,article,{});s.submit({evidenceEditor:''},{symbol:'AAPL',memo:'보존'});document.activeElement=outside;
 d.resolve({row:record});await tick();assert.equal(document.activeElement,outside);assert.equal(restores,0);assert.match(s.host.innerHTML,/저장했어요/);cleanup();
});
test('a delayed detail mutation preserves focus deliberately moved outside its list',async()=>{
 const d=deferred(),s=setup({remove:()=>d.promise}),body={},outside={};let restores=0;
 const document={body,activeElement:{inside:true}};s.host.ownerDocument=document;
 s.host.querySelector=selector=>selector==='summary'?{focus(){restores++;document.activeElement={inside:true};}}:null;
 const cleanup=s.mountResearchEvidence(s.host,{symbol:'AAPL'});s.click({evidenceDelete:'first'});document.activeElement=outside;
 d.resolve();await tick();assert.equal(document.activeElement,outside);assert.equal(restores,0);cleanup();
});
