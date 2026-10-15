import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
function setup(){
 const disk=new Map();let identity='A',fail=false,gate=null;
 const context=vm.createContext({setTimeout,clearTimeout,Event,isAppsInTossRuntime:()=>true,User:{getAnonymousKey:async()=>({type:'HASH',hash:identity})},document:{dispatchEvent(){}},Storage:{getItem:async k=>disk.get(k)??null,removeItem:async k=>disk.delete(k),setItem:async(k,v)=>{if(gate)await gate;if(fail)throw Error('full');disk.set(k,v);}}});
 for(const file of ['storage','revisitPreferences'])vm.runInContext(readFileSync('src/'+file+'.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ',''),context);
 vm.runInContext('this.api={initializeStorage,readStored,writeStored,clearStored,readRecentStocks,rememberRecentStock,clearRecentStocks,readWatchSort,saveWatchSort,RECENT_STOCKS_KEY,WATCH_SORT_KEY};',context);
 return {...context.api,disk,setIdentity:v=>{identity=v;},fail:()=>{fail=true;},hold:()=>{let release;gate=new Promise(r=>{release=r;});return()=>{gate=null;release();};}};
}
test('recent stocks are bounded, deduplicated and contain only verified names and symbols',async()=>{
 const s=setup();await s.initializeStorage();
 for(let i=0;i<7;i++)await s.rememberRecentStock({symbol:String(i).padStart(6,'0')+'.KS',name:'기업'+i,privateQuery:'never store this'});
 assert.equal(s.readRecentStocks().length,5);assert.equal(s.readRecentStocks()[0].symbol,'000006.KS');
 await s.rememberRecentStock({symbol:'000004.KS',name:'기업4'});
 assert.equal(s.readRecentStocks()[0].symbol,'000004.KS');assert.equal(new Set(s.readRecentStocks().map(r=>r.symbol)).size,5);
 await s.rememberRecentStock({symbol:'NOT VERIFIED',name:'bad'});
 assert.equal(s.readStored(s.RECENT_STOCKS_KEY).includes('privateQuery'),false);
});
test('sort and recent lists are separated by account and removed by device reset',async()=>{
 const s=setup();await s.initializeStorage();await s.rememberRecentStock({symbol:'AAPL',name:'애플'});await s.saveWatchSort('name');
 s.setIdentity('B');await s.initializeStorage();assert.equal(s.readRecentStocks().length,0);assert.equal(s.readWatchSort(),'manual');
 await s.saveWatchSort('change');await s.clearStored();assert.equal(s.readWatchSort(),'manual');
 s.setIdentity('A');await s.initializeStorage();assert.equal(s.readRecentStocks()[0].symbol,'AAPL');assert.equal(s.readWatchSort(),'name');
 await s.clearStored();assert.equal(s.readRecentStocks().length,0);assert.equal(s.readWatchSort(),'manual');
});
test('clearing a recent list waits for pending confirmed saves and cannot revive it',async()=>{
 const s=setup();await s.initializeStorage();const release=s.hold();
 const saved=s.rememberRecentStock({symbol:'AAPL',name:'애플'});const cleared=s.clearRecentStocks();release();await Promise.all([saved,cleared]);assert.equal(s.readRecentStocks().length,0);
});
test('failed sort saves retain the committed preference',async()=>{
 const s=setup();await s.initializeStorage();await s.saveWatchSort('name');s.fail();await assert.rejects(s.saveWatchSort('change'));assert.equal(s.readWatchSort(),'name');
});
