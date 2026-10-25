import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const main=readFileSync('src/main.js','utf8');
const selectedKey='chartview-toss-selected-v1';
const persistSource=main.slice(main.indexOf('function persistList('),main.indexOf('\nfunction showToast('));
function transactions(){
 const disk=new Map(),events=[],state={tab:'chart',selected:['005930.KS'],watchlist:[]};let held=null,identity='A';
 const context=vm.createContext({state,viewEpoch:1,listSaveQueue:Promise.resolve(),WATCHLIST_LIMIT:20,Promise,Map,Set,Event,Error,JSON,setTimeout,clearTimeout,
  isAppsInTossRuntime:()=>true,User:{getAnonymousKey:async()=>({type:'HASH',hash:identity})},document:{dispatchEvent:()=>{}},
  Storage:{getItem:async k=>disk.get(k)??null,setItem:async(k,v)=>{if(held)await held;disk.set(k,v);},removeItem:async k=>disk.delete(k)},
  watchLimitNotice:()=>{},refreshListSurface:()=>events.push('refresh'),showToast:()=>events.push('toast'),newUsageOperation:()=> 'operation',trackUsage:name=>events.push(name),
 });
 const storage=readFileSync('src/storage.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
 vm.runInContext(storage+'\n'+persistSource+'\nthis.api={persistList,clearStored,initializeStorage};',context);
 return {...context.api,disk,state,events,navigate:()=>context.viewEpoch++,identity:value=>{identity=value;},hold:()=>{let release;held=new Promise(resolve=>{release=resolve;});return()=>{held=null;release();};}};
}
test('a comparison queued behind a held list save cannot restore selected symbols after reset',async()=>{
 const s=transactions();await s.initializeStorage();const release=s.hold();
 const first=s.persistList('watchlist',()=>[{symbol:'AAPL'}]);await new Promise(resolve=>setImmediate(resolve));
 const selected=s.persistList('selected',()=>['NVDA']);s.navigate();const clearing=s.clearStored();release();await clearing;
 s.state.selected=[];s.state.watchlist=[];
 assert.deepEqual(await Promise.all([first,selected]),[false,false]);
 assert.equal(s.disk.has(selectedKey+':A'),false);assert.deepEqual(s.state.selected,[]);assert.deepEqual(s.state.watchlist,[]);
 assert.equal(s.events.includes('watchlist_add_success'),false);assert.equal(s.events.includes('refresh'),false);
});
test('an old-account queued selection cannot write into a newly initialized native account',async()=>{
 const s=transactions();await s.initializeStorage();const release=s.hold();
 const first=s.persistList('watchlist',()=>[{symbol:'AAPL'}]);await new Promise(resolve=>setImmediate(resolve));
 const selected=s.persistList('selected',()=>['NVDA']);s.identity('B');const switching=s.initializeStorage();release();await switching;
 s.state.selected=['MSFT'];s.state.watchlist=[];
 assert.deepEqual(await Promise.all([first,selected]),[false,false]);assert.equal(s.disk.has(selectedKey+':B'),false);assert.equal(s.disk.has(selectedKey+':A'),false);assert.deepEqual(s.state.selected,['MSFT']);
});
test('navigation alone still allows a confirmed list save and existing surface refresh',async()=>{
 const s=transactions();await s.initializeStorage();const release=s.hold();
 const saving=s.persistList('selected',()=>['NVDA']);await new Promise(resolve=>setImmediate(resolve));s.navigate();release();
 assert.equal(await saving,true);assert.deepEqual(JSON.parse(s.disk.get(selectedKey+':A')),['NVDA']);assert.equal(s.events.includes('refresh'),true);
});

function chartFailure({changedSymbols=true}={}){
 const elements=new Map();let removed=0;
 function element(selector,html=''){
  const el={innerHTML:html,textContent:'',isConnected:true,clientWidth:320,classList:{toggle(){},remove(){}},querySelector:()=>({}),querySelectorAll:()=>[],appendChild(child){elements.set('#'+child.id,child);},after(child){elements.set('#'+child.id,child);},addEventListener(){},remove(){elements.delete(selector);},setAttribute(){},removeAttribute(){}};
  elements.set(selector,el);return el;
 }
 for(const selector of ['.chart-plot-wrap','.chart-heading','#chart-canvas','#chart-status','#chart-legend','#chart-table-wrap','#calculation-guide-body'])element(selector,selector==='#chart-table-wrap'?'005930.KS old result':'');
 const state={selected:changedSymbols?['NVDA']:['005930.KS'],period:'1mo',customRange:null};
 const context=vm.createContext({state,chartLoadSeq:0,chartInstance:{remove:()=>{removed++;}},chartResizeObserver:null,chartDisplayedSelection:{selected:['005930.KS'],period:'1mo',range:null},performance:{now:()=>0},Promise,Error,JSON,
  document:{querySelector:selector=>elements.get(selector)||null,querySelectorAll:()=>[],createElement:()=>element('temporary')},
  getStorageContext:()=>1,isStorageContextCurrent:()=>true,syncChartPeriodControls:()=>{},chartLoadingPreview:()=> 'loading',loadingIndicator:()=> 'loading',newUsageOperation:()=> 'operation',compareStocks:async()=>{throw Error('quote failed');},loadChartRuntime:async()=>({}),reportAppError:()=>{},esc:String,
 });
 vm.runInContext(main.slice(main.indexOf('function refreshChart('),main.indexOf('\nfunction bindChartControls('))+'\n'+main.slice(main.indexOf('async function loadChart('),main.indexOf('\nasync function renderWatch('))+'\nthis.refreshChart=refreshChart;',context);
 return {context,elements,state,removed:()=>removed,refresh:context.refreshChart};
}
test('changed-symbol refresh removes the old graph and stock table, and reports failed application',async()=>{
 const s=chartFailure();const result=await s.refresh({period:'3mo',range:null});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(s.removed(),1);assert.equal(s.elements.get('#chart-table-wrap').innerHTML,'');
 assert.match(s.elements.get('#chart-canvas').innerHTML,/차트를 불러오지 못/);assert.equal(s.elements.has('#chart-refresh-error'),false);
 assert.equal(s.state.period,'3mo');assert.equal(result,false);
});
test('same-symbol failed period refresh retains the previous graph and restores its actual period',async()=>{
 const s=chartFailure({changedSymbols:false});const result=await s.refresh({period:'3mo',range:null});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(s.removed(),0);assert.equal(s.elements.get('#chart-table-wrap').innerHTML,'005930.KS old result');assert.equal(s.state.period,'1mo');
 assert.match(s.elements.get('#chart-refresh-error').innerHTML,/이전 차트/);assert.equal(result,false);
});
