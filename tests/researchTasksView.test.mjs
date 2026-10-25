import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {reviewConditionEvidence} from '../src/reviewRevisit.js';
const item=(symbol,date)=>({symbol,question:`질문 ${symbol}`,reviewOn:date,conditions:[],updatedAt:'2026-10-20'});
function setup(rows,taskRaw=null,imports={}){
 const context=vm.createContext({Date,Intl,JSON,Error,reviewConditionEvidence,readStored:()=>taskRaw,savedResearch:()=>({rows,error:false}),reviewRevisit:()=>({kind:'unchecked',label:'최신 공시 미확인'}),getStorageContext:()=>0,isStorageContextCurrent:()=>true,RESEARCH_TASKS_KEY:'tasks'});
 for(const file of ['researchTasks','savedResearchView'])vm.runInContext('{'+readFileSync(`src/${file}.js`,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','')+`\nthis.${file==='researchTasks'?'taskApi={researchTaskState,readResearchTasks,completeResearchTask,undoResearchTask,postponeResearchTask}':'viewApi={savedResearchHtml,bindSavedResearchActions,refreshSavedResearchView:typeof refreshSavedResearchView===\'function\'?refreshSavedResearchView:undefined}'};}`,context);
 Object.assign(context,context.taskApi,imports);return context.viewApi;
}
test('full queue exposes dated filters and explicit inline complete/undo/date controls while escaping personal text',()=>{
 const s=setup([item('AAPL','2026-10-25'),{...item('NVDA',''),question:'<img src=x onerror=alert(1)>'}]),html=s.savedResearchHtml(symbol=>symbol);
 for(const filter of ['all','overdue','today','future','completed'])assert.match(html,new RegExp(`data-research-task-filter="${filter}"`));
 assert.match(html,/data-research-task-action="complete"/);assert.match(html,/data-research-task-postpone/);assert.match(html,/type="date"/);assert.match(html,/확인 기록 관리/);assert.match(html,/직접 확인/);assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img/);
});
test('compact home preserves max one row and original navigation/refresh controls without full queue controls',()=>{
 const html=setup([item('005930.KS','2026-10-25'),item('AAPL','')]).savedResearchHtml(symbol=>symbol,{compact:true});
 assert.equal((html.match(/class="saved-research-row"/g)||[]).length,1);assert.match(html,/data-saved-research="005930.KS"/);assert.match(html,/data-saved-jump="detail-research-card"/);assert.doesNotMatch(html,/data-research-task-filter|data-research-task-action/);
});
test('original source refresh and filing evidence remain separate from task completion',()=>{
 const html=setup([{...item('005930.KS',''),filing:{label:'2026 반기'}}]).savedResearchHtml(symbol=>symbol);
 assert.match(html,/data-refresh-saved-research/);assert.match(html,/최신 공시 확인 · 최근 저장 1종목/);assert.match(html,/revisit-refresh-status/);assert.match(html,/확인 기준 · 2026 반기/);assert.match(html,/data-saved-jump="detail-report-review"/);
});
test('repeated bindings handle one filter action once and cleanup removes delegated listeners',()=>{
 const s=setup([]),listeners=new Map();let changes=0;
 const button={dataset:{researchTaskFilter:'all'},setAttribute:()=>{changes++;},closest:()=>section};
 const section={querySelectorAll:selector=>selector==='[data-research-task-filter]'?[button]:[],querySelector:()=>null};
 const host={querySelectorAll:()=>[],contains:()=>true,addEventListener:(type,fn)=>{if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},removeEventListener:(type,fn)=>listeners.get(type)?.delete(fn)};
 s.bindSavedResearchActions(host);const cleanup=s.bindSavedResearchActions(host);
 const event={target:{closest:selector=>selector==='[data-research-task-filter]'?button:null}};
 for(const listener of listeners.get('click'))listener(event);assert.equal(changes,1);cleanup();for(const listener of listeners.get('click'))listener(event);assert.equal(changes,1);
});
test('binding the queue section itself reports failed saves and re-enables its controls for retry',async()=>{
 const s=setup([item('AAPL','2026-10-25')],null,{completeResearchTask:async()=>{throw Error('storage failed');}}),listeners=new Map();
 const notice={textContent:''},input={value:'2026-10-25',disabled:false},button={disabled:false,dataset:{researchTaskAction:'complete'},closest:selector=>selector==='[data-research-task-symbol]'?article:null};
 const article={dataset:{researchTaskSymbol:'AAPL',researchTaskKind:'today'},closest:()=>host,querySelector:selector=>selector==='[data-research-task-notice]'?notice:selector==='input[name="reviewOn"]'?input:null,querySelectorAll:()=>[button,input]};
 const host={isConnected:true,matches:()=>true,contains:()=>true,querySelector:()=>null,querySelectorAll:selector=>selector==='[data-research-task-symbol]'?[article]:[],addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:()=>{}};
 article.dataset.researchTaskRevision=s.savedResearchHtml(symbol=>symbol).match(/data-research-task-revision="([^"]+)"/)[1];
 s.bindSavedResearchActions(host);listeners.get('click')({target:{closest:selector=>selector==='[data-research-task-action]'?button:null}});
 assert.equal(button.disabled,true);await new Promise(setImmediate);assert.equal(notice.textContent,'storage failed');assert.equal(button.disabled,false);assert.equal(input.disabled,false);
});
test('an action on a stale rendered source does not complete an unseen changed filing',async()=>{
 let writes=0;const fakeDocument={activeElement:null,createElement:()=>({content:{firstElementChild:{innerHTML:'updated source'}}})};
 const s=setup([item('AAPL','2026-10-25')],null,{document:fakeDocument,completeResearchTask:async()=>{writes++;}}),listeners=new Map();
 const notice={textContent:''},input={value:'2026-10-25',disabled:false},button={disabled:false,dataset:{researchTaskAction:'complete'},closest:selector=>selector==='[data-research-task-symbol]'?article:null,focus:()=>{}};
 const article={hidden:false,dataset:{researchTaskSymbol:'AAPL',researchTaskKind:'today',researchTaskRevision:'previous rendered source'},closest:()=>host,querySelector:selector=>selector==='[data-research-task-notice]'?notice:selector==='input[name="reviewOn"]'?input:selector==='[data-research-task-action]'?button:null,querySelectorAll:()=>[button,input]};
 const host={isConnected:true,matches:()=>true,contains:()=>true,querySelector:()=>null,querySelectorAll:selector=>selector==='[data-research-task-symbol]'?[article]:[],addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:()=>{}};
 s.bindSavedResearchActions(host);listeners.get('click')({target:{closest:selector=>selector==='[data-research-task-action]'?button:null}});await new Promise(setImmediate);
 assert.equal(writes,0);assert.match(notice.textContent,/변경/);assert.equal(button.disabled,false);
});
test('a deferred save survives explicit filing refresh and restores the date input the user moved to',async()=>{
 let release;const listeners=new Map(),body={},fakeDocument={body,activeElement:body,createElement:()=>({content:{firstElementChild:{innerHTML:'updated source'}}})};
 const records=[item('AAPL','2026-10-25'),item('MSFT','2026-10-26')],s=setup(records,null,{document:fakeDocument,completeResearchTask:()=>new Promise(resolve=>{release=resolve;})});
 const articles=records.map(record=>{
  const notice={textContent:''};let article;
  const input={value:record.reviewOn,disabled:false,matches:selector=>selector==='input[name="reviewOn"]',closest:()=>article,focus:()=>{fakeDocument.activeElement=input;}};
  const button={disabled:false,dataset:{researchTaskAction:'complete'},closest:selector=>selector==='[data-research-task-symbol]'?article:null,focus:()=>{fakeDocument.activeElement=button;}};
  article={hidden:false,dataset:{researchTaskSymbol:record.symbol,researchTaskKind:'today'},closest:()=>host,querySelector:selector=>selector==='[data-research-task-notice]'?notice:selector==='input[name="reviewOn"]'?input:selector==='[data-research-task-action]'?button:null,querySelectorAll:()=>[button,input]};
  return article;
 });
 const host={isConnected:true,matches:()=>true,contains:value=>articles.some(article=>article.querySelectorAll().includes(value)),querySelector:()=>null,querySelectorAll:selector=>selector==='[data-research-task-symbol]'?articles:[],addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:()=>{},set innerHTML(value){fakeDocument.activeElement=body;}};
 const html=s.savedResearchHtml(symbol=>symbol);for(const article of articles)article.dataset.researchTaskRevision=html.match(new RegExp(`data-research-task-symbol="${article.dataset.researchTaskSymbol}"[^>]*data-research-task-revision="([^"]+)"`))[1];
 s.bindSavedResearchActions(host);const button=articles[0].querySelector('[data-research-task-action]');listeners.get('click')({target:{closest:selector=>selector==='[data-research-task-action]'?button:null}});
 const otherDate=articles[1].querySelector('input[name="reviewOn"]');otherDate.focus();
 s.refreshSavedResearchView(host);assert.equal(fakeDocument.activeElement,otherDate);assert.equal(button.disabled,true);assert.equal(otherDate.value,'2026-10-26');
 release();await new Promise(setImmediate);assert.equal(fakeDocument.activeElement,otherDate);assert.equal(button.disabled,false);
});
