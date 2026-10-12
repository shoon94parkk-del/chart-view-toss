import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Execute the real list transaction, with the native persistence boundary held.
function transaction({fail=false}={}){
 const source=readFileSync('src/main.js','utf8');
 const body=source.slice(source.indexOf('function persistList('),source.indexOf('\nfunction showToast('));
 const events=[],state={watchlist:[],selected:[]};
 let release;const held=new Promise(resolve=>release=resolve);
 const context=vm.createContext({state,viewEpoch:1,listSaveQueue:Promise.resolve(),WATCHLIST_LIMIT:20,
  WATCHLIST_KEY:'watch',SELECTED_KEY:'selected',JSON,Promise,watchLimitNotice(){},refreshListSurface(){},showToast(){},
  newUsageOperation:()=> 'operation',trackUsage:(name,options)=>events.push({name,options}),
  writeStored:async()=>{await held;if(fail)throw Error('full');},
 });
 vm.runInContext(body+'\nthis.persistList=persistList;',context);
 return {save:context.persistList,state,events,release};
}
test('watch conversion waits for confirmed storage; a batch is one conversion',async()=>{
 const t=transaction();const task=t.save('watchlist',()=>[{symbol:'AAPL'},{symbol:'NVDA'}]);
 await Promise.resolve();await Promise.resolve();
 assert.equal(t.events.filter(e=>e.name==='watchlist_add_attempt').length,1);
 assert.equal(t.events.filter(e=>e.name==='watchlist_add_success').length,0);
 assert.equal(t.state.watchlist.length,0);
 t.release();assert.equal(await task,true);
 assert.equal(t.events.filter(e=>e.name==='watchlist_add_success').length,1);
 assert.equal(t.state.watchlist.length,2);
 const payload=JSON.stringify(t.events);
 assert.doesNotMatch(payload,/AAPL|NVDA/,'symbols are not analytics parameters');
});
test('failed native addition is never a successful conversion',async()=>{
 const t=transaction({fail:true});const task=t.save('watchlist',()=>[{symbol:'AAPL'}]);
 t.release();assert.equal(await task,false);
 assert.equal(t.events.filter(e=>e.name==='watchlist_add_success').length,0);
 assert.equal(t.events.filter(e=>e.name==='watchlist_add_failure').length,1);
 assert.equal(t.state.watchlist.length,0);
});
test('no-op, metadata update, removal and undo do not inflate watch additions',async()=>{
 const t=transaction();t.release();t.state.watchlist=[{symbol:'AAPL',name:'Apple'}];
 await t.save('watchlist',rows=>rows);
 await t.save('watchlist',rows=>rows.map(row=>({...row,name:'애플'})));
 await t.save('watchlist',()=>[]);
 await t.save('watchlist',()=>[{symbol:'AAPL'}],{restoreLimit:1});
 assert.equal(t.events.filter(e=>e.name.startsWith('watchlist_add_')).length,0);
});
