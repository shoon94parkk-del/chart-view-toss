import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {homeChanges} from '../src/insightModel.js';

test('Home keeps the third observation optional and preserves expansion on repaint',async()=>{
 const nodes=Object.fromEntries(['data-home-changes','data-home-change-status','data-home-change-retry','data-home-change-toggle'].map(key=>[key,{innerHTML:'',textContent:'',hidden:true,setAttribute(k,v){this[k]=v;}}]));
 const host={isConnected:true,querySelector:key=>nodes[key.slice(1,-1)]};
 const context=vm.createContext({homeChanges,window:{},loadExportMomentumSnapshot:async()=>({period:'2026-09',summary:{exportYoY:4},itemPeriod:'2026-08',items:[{key:'semiconductor',exportWeightYoY:3,unitValueYoY:2}]}),screenerData:async()=>({tradeDate:'2026-10-02',stocks:[{volumeRatio:2.3}]})});
 vm.runInContext(readFileSync(new URL('../src/homeGesturePaint.js',import.meta.url),'utf8').replaceAll('export ','')+'\n'+readFileSync(new URL('../src/homeChangesView.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),context);
 await context.mountHomeChanges(host);
 assert.equal(nodes['data-home-change-toggle'].hidden,false);
 assert.match(nodes['data-home-changes'].innerHTML,/home-change-more[^>]*hidden/);
 nodes['data-home-change-toggle'].onclick();
 assert.equal(nodes['data-home-change-toggle']['aria-expanded'],'true');
 assert.doesNotMatch(nodes['data-home-changes'].innerHTML,/home-change-more[^>]*hidden/);
});

test('Home observations render independent sources and retain ready cards during failed-source retry',async()=>{
 const nodes=Object.fromEntries(['data-home-changes','data-home-change-status','data-home-change-retry'].map(key=>[key,{innerHTML:'',textContent:'',hidden:true}]));
 const host={isConnected:true,querySelector:key=>nodes[key.slice(1,-1)]};
 const pending=[];let stockCalls=0;
 const context=vm.createContext({homeChanges,window:{},loadExportMomentumSnapshot:options=>new Promise((resolve,reject)=>pending.push({resolve,reject,options})),screenerData:async()=>{stockCalls++;return {tradeDate:'2026-10-02',stocks:[{volumeRatio:2.3}]};}});
 vm.runInContext(readFileSync(new URL('../src/homeGesturePaint.js',import.meta.url),'utf8').replaceAll('export ','')+'\n'+readFileSync(new URL('../src/homeChangesView.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),context);
 const mounted=context.mountHomeChanges(host);
 await new Promise(resolve=>setImmediate(resolve));
 assert.match(nodes['data-home-changes'].innerHTML,/거래량 2배 이상/,'ready screener never waits for Customs');
 pending[0].reject(Error('Customs timeout'));await mounted;
 assert.equal(nodes['data-home-change-retry'].hidden,false);
 const cards=nodes['data-home-changes'].innerHTML;
 nodes['data-home-change-retry'].onclick();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(stockCalls,1,'only the failed source is requested again');
 assert.equal(nodes['data-home-changes'].innerHTML,cards,'ready observations stay while another provider retries');
 assert.equal(pending[1].options.force,true);
 pending[1].resolve({period:'2026-09',summary:{exportYoY:4},items:[]});await new Promise(resolve=>setImmediate(resolve));
 assert.match(nodes['data-home-changes'].innerHTML,/전체 수출.*거래량 2배 이상/s);
 assert.equal(nodes['data-home-change-retry'].hidden,true);
});

test('late screener completion preserves a focused export action and scroll position',async()=>{
 let resolveStocks,focusedCalls=0,scrolled=0;
 const nodes=Object.fromEntries(['data-home-changes','data-home-change-status','data-home-change-retry','data-home-change-toggle'].map(key=>[key,{innerHTML:'',textContent:'',hidden:true,setAttribute(){}}]));
 const button={dataset:{featureRoute:'exports',featureTarget:'items'},matches:()=>true,getBoundingClientRect:()=>({top:40}),focus:()=>focusedCalls++};
 const doc={activeElement:null};
 const host={isConnected:true,contains:()=>true,querySelector:key=>nodes[key.slice(1,-1)],querySelectorAll:()=>[button]};
 const context=vm.createContext({document:doc,homeChanges,window:{scrollBy:()=>scrolled++},loadExportMomentumSnapshot:async()=>({period:'2026-09',summary:{exportYoY:4}}),screenerData:()=>new Promise(resolve=>{resolveStocks=resolve;})});
 vm.runInContext(readFileSync(new URL('../src/homeGesturePaint.js',import.meta.url),'utf8').replaceAll('export ','')+'\n'+readFileSync(new URL('../src/homeChangesView.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),context);
 const mounted=context.mountHomeChanges(host);await new Promise(resolve=>setImmediate(resolve));doc.activeElement=button;
 resolveStocks({tradeDate:'2026-10-02',stocks:[{volumeRatio:3}]});await mounted;
 assert.equal(focusedCalls,1);assert.equal(scrolled,0);
});

function pointerHarness({loadView=true}={}){
 const listeners=new Map(),timers=[],requests={exports:[],stocks:[]};
 const feed={};
 const doc={activeElement:null,addEventListener(type,listener){
  const registered=listeners.get(type)||[];registered.push(listener);listeners.set(type,registered);
 },querySelector:selector=>selector==='#home-discovery-feed'?feed:null};
 feed.ownerDocument=doc;
 const target={closest:selector=>selector==='#home-discovery-feed'?feed:null};
 feed.contains=node=>node===target;
 const makeHost=()=>{
  const nodes=Object.fromEntries(['data-home-changes','data-home-change-status','data-home-change-retry','data-home-change-toggle'].map(key=>[key,{innerHTML:'',textContent:'',hidden:true,setAttribute(k,v){this[k]=v;}}]));
  return {nodes,host:{isConnected:true,ownerDocument:doc,contains:()=>false,closest:selector=>selector==='#home-discovery-feed'?feed:null,querySelector:key=>nodes[key.slice(1,-1)],querySelectorAll:()=>[]}};
 };
 const schedule=(callback,delay)=>{timers.push({callback,delay});return timers.length;};
 const win={setTimeout:schedule,addEventListener(type,listener){const key=`window:${type}`,registered=listeners.get(key)||[];registered.push(listener);listeners.set(key,registered);}};doc.defaultView=win;
 const context=vm.createContext({document:doc,window:win,setTimeout:schedule,homeChanges,
  loadExportMomentumSnapshot:()=>new Promise((resolve,reject)=>requests.exports.push({resolve,reject})),
  screenerData:()=>new Promise((resolve,reject)=>requests.stocks.push({resolve,reject})),
 });
 vm.runInContext(readFileSync(new URL('../src/homeGesturePaint.js',import.meta.url),'utf8').replaceAll('export ',''),context);
 const evaluateView=()=>vm.runInContext(readFileSync(new URL('../src/homeChangesView.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),context);
 if(loadView)evaluateView();
 const dispatch=(type,{inside=true,pointerId=1}={})=>{
  const event={type,pointerId,target:inside?target:{closest:()=>null}};
  for(const listener of listeners.get(type)||[])listener(event);
 };
 const flush=()=>{for(const timer of timers.splice(0)){assert.equal(timer.delay,0,'DOM publication waits only for the click event turn');timer.callback();}};
 const snapshot=nodes=>JSON.stringify(Object.fromEntries(Object.entries(nodes).map(([key,node])=>[key,{html:node.innerHTML,text:node.textContent,hidden:node.hidden}])));
 return {context,requests,listeners,timers,makeHost,dispatch,flush,snapshot,feed,loadView:evaluateView};
}
const exportObservation={period:'2026-09',summary:{exportYoY:4},itemPeriod:'2026-08',items:[{key:'semiconductor',exportWeightYoY:3,unitValueYoY:2}]};
const stockObservation={tradeDate:'2026-10-02',stocks:[{volumeRatio:3}]};
const drain=()=>new Promise(resolve=>setImmediate(resolve));

for(const end of ['pointerup','pointercancel'])test(`Home change data settles independently while ${end} publishes after the held PICK gesture`,async()=>{
 const h=pointerHarness(),{host,nodes}=h.makeHost();
 const mounted=h.context.mountHomeChanges(host);
 assert.equal(h.requests.exports.length,1);assert.equal(h.requests.stocks.length,1,'both sources start without waiting for interaction');
 const before=h.snapshot(nodes);h.dispatch('pointerdown');
 h.requests.exports[0].resolve(exportObservation);await drain();
 assert.equal(h.snapshot(nodes),before,'a held PICK pointer must keep cards, status and toggle geometry stable');
 h.dispatch(end);
 h.requests.stocks[0].resolve(stockObservation);await mounted;
 assert.equal(h.snapshot(nodes),before,'even a response between pointer release and click completion cannot reflow the target');
 assert.ok(h.timers.length>0,'release schedules publication after this input turn');
 h.flush();
 assert.match(nodes['data-home-changes'].innerHTML,/전체 수출.*반도체 물량.*거래량 2배 이상/s);
 assert.equal(nodes['data-home-change-status'].textContent,'');
 assert.equal(nodes['data-home-change-toggle'].hidden,false);
});

test('queued Home change publication never paints a host disconnected during the PICK gesture',async()=>{
 const h=pointerHarness(),{host,nodes}=h.makeHost(),mounted=h.context.mountHomeChanges(host);
 const before=h.snapshot(nodes);h.dispatch('pointerdown');
 h.requests.exports[0].resolve(exportObservation);h.requests.stocks[0].resolve(stockObservation);await mounted;
 host.isConnected=false;h.dispatch('pointerup');h.flush();
 assert.equal(h.snapshot(nodes),before,'a queued callback cannot paint into a departed Home host');
});

test('an unrelated pointer does not postpone independent Home source presentation',async()=>{
 const h=pointerHarness(),{host,nodes}=h.makeHost(),mounted=h.context.mountHomeChanges(host);
 h.dispatch('pointerdown',{inside:false});
 h.requests.stocks[0].resolve(stockObservation);await drain();
 assert.match(nodes['data-home-changes'].innerHTML,/거래량 2배 이상/,'a ready source outside the protected gesture remains progressive');
 h.requests.exports[0].resolve(exportObservation);await mounted;
 assert.match(nodes['data-home-changes'].innerHTML,/전체 수출/);
});

test('Home remounts share one document pointer lifecycle and release every queued connected host',async()=>{
 const h=pointerHarness(),first=h.makeHost(),second=h.makeHost();
 const firstMount=h.context.mountHomeChanges(first.host),secondMount=h.context.mountHomeChanges(second.host);
 for(const type of ['pointerdown','pointerup','pointercancel'])assert.equal(h.listeners.get(type)?.length,1,`${type} capture is installed once for this document`);
 const firstBefore=h.snapshot(first.nodes),secondBefore=h.snapshot(second.nodes);h.dispatch('pointerdown');
 for(const request of h.requests.exports)request.resolve(exportObservation);
 for(const request of h.requests.stocks)request.resolve(stockObservation);
 await Promise.all([firstMount,secondMount]);
 assert.equal(h.snapshot(first.nodes),firstBefore);assert.equal(h.snapshot(second.nodes),secondBefore);
 h.dispatch('pointerup');h.flush();
 for(const {nodes} of [first,second])assert.match(nodes['data-home-changes'].innerHTML,/전체 수출.*거래량 2배 이상/s);
});

test('early Home gesture tracking protects a pointer already held when the lazy observation module first loads',async()=>{
 const h=pointerHarness({loadView:false}),{host,nodes}=h.makeHost();
 const before=h.snapshot(nodes);
 assert.equal(h.context.mountHomeChanges,undefined,'only the lightweight tracker is loaded initially');
 h.context.watchHomeGestures(h.feed);
 assert.equal(h.requests.exports.length,0);assert.equal(h.requests.stocks.length,0,'early tracking does not start either data source');
 h.dispatch('pointerdown');
 h.loadView();
 const mounted=h.context.mountHomeChanges(host);
 assert.equal(h.requests.exports.length,1);assert.equal(h.requests.stocks.length,1);
 h.requests.exports[0].resolve(exportObservation);h.requests.stocks[0].resolve(stockObservation);await mounted;
 assert.equal(h.snapshot(nodes),before,'first mount and settled data cannot move the held PICK target');
 for(const type of ['pointerdown','pointerup','pointercancel'])assert.equal(h.listeners.get(type)?.length,1,'the lazy view reuses the early document owner');
 h.dispatch('pointerup');
 assert.equal(h.snapshot(nodes),before,'publication stays behind the release and click events');
 h.flush();
 assert.match(nodes['data-home-changes'].innerHTML,/전체 수출.*거래량 2배 이상/s);
});

test('explicit Home observation toggle stays synchronous after release while unsolicited source paint stays deferred',async()=>{
 const h=pointerHarness(),{host,nodes}=h.makeHost(),mounted=h.context.mountHomeChanges(host);
 h.requests.exports[0].resolve(exportObservation);await drain();
 const before=h.snapshot(nodes);h.dispatch('pointerdown');
 h.requests.stocks[0].resolve(stockObservation);await mounted;
 h.dispatch('pointerup');
 assert.equal(h.snapshot(nodes),before,'the actual late source remains blocked through pointer release');
 h.flush();
 const toggle=nodes['data-home-change-toggle'];
 assert.equal(toggle.hidden,false);
 assert.match(nodes['data-home-changes'].innerHTML,/home-change-more[^>]*hidden/,'the third observation starts collapsed');
 h.dispatch('pointerdown');h.dispatch('pointerup');
 toggle.onclick();
 assert.equal(toggle['aria-expanded'],'true','the already-dispatched explicit click takes effect synchronously');
 assert.doesNotMatch(nodes['data-home-changes'].innerHTML,/home-change-more[^>]*hidden/);
 assert.equal((nodes['data-home-changes'].innerHTML.match(/<article class="home-change-card/g)||[]).length,3);
 h.flush();
 assert.equal(toggle['aria-expanded'],'true','later queued work keeps the user selection');
 assert.doesNotMatch(nodes['data-home-changes'].innerHTML,/home-change-more[^>]*hidden/);
 assert.equal(h.requests.exports.length,1);assert.equal(h.requests.stocks.length,1,'toggle never starts a new provider request');
 for(const type of ['pointerdown','pointerup','pointercancel'])assert.equal(h.listeners.get(type)?.length,1);
});

test('an explicit observation toggle cannot reflow another PICK pointer that remains held',async()=>{
 const h=pointerHarness(),{host,nodes}=h.makeHost(),mounted=h.context.mountHomeChanges(host);
 h.requests.exports[0].resolve(exportObservation);h.requests.stocks[0].resolve(stockObservation);await mounted;
 const before=h.snapshot(nodes),toggle=nodes['data-home-change-toggle'];
 h.dispatch('pointerdown',{pointerId:1});h.dispatch('pointerdown',{pointerId:2});
 h.dispatch('pointerup',{pointerId:2});toggle.onclick();
 assert.equal(h.snapshot(nodes),before,'the second pointer click cannot move the first pointer target');
 assert.equal(h.timers.length,0,'one pointer release cannot flush while the other remains active');
 h.dispatch('pointerup',{pointerId:1});
 assert.equal(h.snapshot(nodes),before,'the final release still preserves its pending click target');
 h.flush();
 assert.equal(toggle['aria-expanded'],'true','the explicit choice is published after all held pointers release');
 assert.doesNotMatch(nodes['data-home-changes'].innerHTML,/home-change-more[^>]*hidden/);
 assert.equal(h.requests.exports.length,1);assert.equal(h.requests.stocks.length,1);
});
