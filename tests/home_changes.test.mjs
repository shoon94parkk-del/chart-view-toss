import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {homeChanges} from '../src/insightModel.js';

test('Home keeps the third observation optional and preserves expansion on repaint',async()=>{
 const nodes=Object.fromEntries(['data-home-changes','data-home-change-status','data-home-change-retry','data-home-change-toggle'].map(key=>[key,{innerHTML:'',textContent:'',hidden:true,setAttribute(k,v){this[k]=v;}}]));
 const host={isConnected:true,querySelector:key=>nodes[key.slice(1,-1)]};
 const context=vm.createContext({homeChanges,window:{},loadExportMomentumSnapshot:async()=>({period:'2026-09',summary:{exportYoY:4},itemPeriod:'2026-08',items:[{key:'semiconductor',exportWeightYoY:3,unitValueYoY:2}]}),screenerData:async()=>({tradeDate:'2026-10-02',stocks:[{volumeRatio:2.3}]})});
 vm.runInContext(readFileSync(new URL('../src/homeChangesView.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),context);
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
 vm.runInContext(readFileSync(new URL('../src/homeChangesView.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),context);
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
 vm.runInContext(readFileSync(new URL('../src/homeChangesView.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),context);
 const mounted=context.mountHomeChanges(host);await new Promise(resolve=>setImmediate(resolve));doc.activeElement=button;
 resolveStocks({tradeDate:'2026-10-02',stocks:[{volumeRatio:3}]});await mounted;
 assert.equal(focusedCalls,1);assert.equal(scrolled,0);
});
