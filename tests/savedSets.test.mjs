import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {decodeSharedView} from '../src/experienceState.js';
import {SCREENER_PRESETS} from '../src/analysisData.js';

const key='chartview-toss-saved-sets-v1';
const screen=()=>({filters:{query:'삼성',rsiMin:'0',rsiMax:'60',ret20Min:'-10',sort:'name'},activePreset:'',count:60});
const compare=()=>({selected:['005930.KS','AAPL'],period:'3mo',customRange:null});
function setup(raw=null){
 const disk=new Map(raw==null?[]:[[key,raw]]),writes=[];let generation=0,fail=false,hold=null;
 const context=vm.createContext({decodeSharedView,SCREENER_PRESETS,Date,Math,JSON,Promise,Error,Set,Map,Number,String,Object,Array,
  SAVED_SETS_KEY:key,readStored:k=>disk.get(k)??null,getStorageContext:()=>generation,isStorageContextCurrent:g=>g===generation,
  writeStored:async(k,value,options)=>{writes.push({options,value});if(hold)await hold;if(fail)throw Error('disk full');disk.set(k,value);},
 });
 const source=readFileSync('src/savedSets.js','utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
 vm.runInContext(source+'\nthis.api={readSavedSets,saveNamedSet,renameSavedSet,deleteSavedSet,validateSavedSetValue};',context);
 return {...context.api,disk,writes,fail:value=>{fail=value;},reset:()=>{generation++;disk.clear();},hold:()=>{let release;hold=new Promise(resolve=>{release=resolve;});return()=>{hold=null;release();};}};
}
const plain=value=>JSON.parse(JSON.stringify(value));

test('named sets persist separate real screen and comparison conditions and support rename/delete',async()=>{
 const s=setup();assert.deepEqual(plain(s.readSavedSets('screener')),{rows:[],error:null});
 const one=await s.saveNamedSet('screener','  거래 조건  ',screen());
 const two=await s.saveNamedSet('comparison','한미 비교',compare());
 assert.equal(one.name,'거래 조건');assert.deepEqual(plain(one.value),screen());
 assert.deepEqual(plain(setup(s.disk.get(key)).readSavedSets('comparison').rows[0].value),compare());
 await s.renameSavedSet('screener',one.id,'다시 확인');assert.equal(s.readSavedSets('screener').rows[0].name,'다시 확인');
 await s.deleteSavedSet('comparison',two.id);assert.equal(s.readSavedSets('comparison').rows.length,0);
 assert.ok(s.writes.every(write=>write.options.confirmed===true));
});

test('each kind retains five sets and validates names without truncating them',async()=>{
 const s=setup();for(let i=0;i<5;i++)await s.saveNamedSet('screener',`검색 ${i}`,screen());
 await assert.rejects(s.saveNamedSet('screener','여섯 번째',screen()),/5/);
 for(const name of ['', '   ','x'.repeat(41),'bad\u0000name'])await assert.rejects(s.saveNamedSet('comparison',name,compare()),/이름/);
 const row=await s.saveNamedSet('comparison','x'.repeat(40),compare());
 await assert.rejects(s.renameSavedSet('comparison',row.id,'x'.repeat(41)),/이름/);
 assert.equal(s.readSavedSets('screener').rows.length,5);assert.equal(s.readSavedSets('comparison').rows.length,1);
});

test('screen conditions reject malformed ranges, unsupported fields and native step mismatches',async()=>{
 const s=setup();
 for(const filters of [{rsiMin:'70',rsiMax:'30'},{rsiMin:'-1'},{rsiMax:'101'},{rsiMax:'30.5'},{volumeMin:'-1'},{volumeMin:'1.23'},{valueMin:'NaN'},{ret20Min:'abc'},{volumeMin:' '},{market:'NASDAQ'},{signal:'fake'},{sort:'fake'},{futureFilter:'private'}]){
  await assert.rejects(s.saveNamedSet('screener','조건',{...screen(),filters}),/조건/);
 }
 await assert.rejects(s.saveNamedSet('screener','조건',{...screen(),activePreset:'invented'}),/조건/);
 assert.equal(s.writes.length,0);
 const value={filters:{rsiMin:'0',rsiMax:'100',volumeMin:'2.5',valueMin:'0.25',ret20Min:'-20'},count:330,activePreset:''};
 const row=await s.saveNamedSet('screener','전체',value);assert.deepEqual(plain(row.value),value);
});

test('comparison validates six unique symbols and genuine ISO calendar ranges',async()=>{
 const s=setup();
 const valid={selected:['AAPL','AAPL','MSFT'],period:'1y',customRange:{start:'2024-02-29',end:'2026-10-25'}};
 const row=await s.saveNamedSet('comparison','기간',valid);assert.deepEqual(plain(row.value.selected),['AAPL','MSFT']);
 for(const patch of [{selected:[]},{selected:['A','B','C','D','E','F','G']},{selected:['<script>']},{period:'fake'},{customRange:{start:'2026-02-30',end:'2026-03-01'}},{customRange:{start:'2026-04-01',end:'2026-03-01'}},{customRange:{start:'2026-1-01',end:'2026-03-01'}},{customRange:{start:'2026-01-01',end:'2026-03-01',secret:true}},{privateNote:'hidden'}])await assert.rejects(s.saveNamedSet('comparison','잘못된 비교',{...compare(),...patch}),/비교/);
});

test('corrupt and future storage is visible and never overwritten by save rename or delete',async()=>{
 for(const raw of ['{','null','[]','{}','{"version":2,"sets":[]}','{"version":1,"sets":[{"kind":"comparison","name":"bad"}]}']){
  const s=setup(raw);assert.ok(s.readSavedSets('screener').error);
  await assert.rejects(s.saveNamedSet('screener','새 조건',screen()),/저장/);
  await assert.rejects(s.renameSavedSet('comparison','missing','이름'),/저장/);
  await assert.rejects(s.deleteSavedSet('comparison','missing'),/저장/);
  assert.equal(s.disk.get(key),raw);assert.equal(s.writes.length,0);
 }
 const s=setup();await s.saveNamedSet('screener','원본',screen());
 const stored=JSON.parse(s.disk.get(key));stored.sets[0].value.filters.rsiMax='101';s.disk.set(key,JSON.stringify(stored));
 assert.ok(s.readSavedSets('screener').error);await assert.rejects(s.saveNamedSet('comparison','새 비교',compare()),/저장/);
});

test('confirmed queued saves compose and failure leaves previous records retryable',async()=>{
 const s=setup(),release=s.hold();
 const first=s.saveNamedSet('screener','첫 조건',screen()),second=s.saveNamedSet('screener','두 조건',screen());
 await Promise.resolve();assert.equal(s.readSavedSets('screener').rows.length,0);
 release();await Promise.all([first,second]);assert.equal(s.readSavedSets('screener').rows.length,2);
 const original=s.disk.get(key);s.fail(true);await assert.rejects(s.saveNamedSet('comparison','실패',compare()),/disk full/);assert.equal(s.disk.get(key),original);
 s.fail(false);await s.saveNamedSet('comparison','재시도',compare());assert.equal(s.readSavedSets('comparison').rows.length,1);
});

test('queued context and view guards reject obsolete writes after reset or navigation',async()=>{
 const s=setup(),release=s.hold();const first=s.saveNamedSet('screener','대기1',screen()),second=s.saveNamedSet('comparison','대기2',compare());
 await new Promise(resolve=>setImmediate(resolve));s.reset();release();await assert.rejects(first,/변경/);await assert.rejects(second,/변경/);
 assert.equal(s.writes.length,1);
 let current=true;const pending=s.saveNamedSet('comparison','이탈',compare(),{isCurrent:()=>current});current=false;
 await assert.rejects(pending,/변경/);assert.equal(s.writes.length,1);
});

test('save snapshots caller values before queued persistence',async()=>{
 const s=setup(),value=screen();const saving=s.saveNamedSet('screener','원본',value);value.filters.query='edited';
 await saving;assert.equal(s.readSavedSets('screener').rows[0].value.filters.query,'삼성');
});

function nativeSetup(){
 const disk=new Map();let identity='user-A',blocked=null;
 const context=vm.createContext({decodeSharedView,SCREENER_PRESETS,Date,Math,JSON,Promise,Error,Event,Set,Map,Number,String,Object,Array,setTimeout,clearTimeout,
  document:{dispatchEvent:()=>{}},isAppsInTossRuntime:()=>true,User:{getAnonymousKey:async()=>({type:'HASH',hash:identity})},
  Storage:{getItem:async k=>disk.get(k)??null,setItem:async(k,v)=>{if(blocked)await blocked;disk.set(k,v);},removeItem:async k=>disk.delete(k)},
 });
 const strip=path=>readFileSync(path,'utf8').replace(/^import .*;\r?\n/gm,'').replaceAll('export ','');
 vm.runInContext(strip('src/storage.js'),context);
 vm.runInContext('{'+strip('src/savedSets.js')+'\nthis.api={saveNamedSet,readSavedSets,initializeStorage,clearStored};}',context);
 return {...context.api,disk,identity:value=>{identity=value;},hold:()=>{let release;blocked=new Promise(resolve=>{release=resolve;});return()=>{blocked=null;release();};}};
}
test('real native storage removes a pending save on reset and rejects the following queued set',async()=>{
 const s=nativeSetup();await s.initializeStorage();const release=s.hold();
 const one=s.saveNamedSet('screener','초기화 전',screen()),two=s.saveNamedSet('comparison','대기 비교',compare());
 const results=Promise.allSettled([one,two]);await new Promise(resolve=>setImmediate(resolve));const resetting=s.clearStored();release();await resetting;
 assert.ok((await results).every(result=>result.status==='rejected'));
 assert.equal(s.disk.has(key+':user-A'),false);assert.equal(s.readSavedSets('screener').rows.length,0);
});
test('real native storage keeps an old-account queued set out of the next account',async()=>{
 const s=nativeSetup();await s.initializeStorage();const release=s.hold();
 const one=s.saveNamedSet('screener','A 계정',screen()),two=s.saveNamedSet('comparison','A 대기',compare());
 const results=Promise.allSettled([one,two]);await new Promise(resolve=>setImmediate(resolve));s.identity('user-B');const switching=s.initializeStorage();release();await switching;
 assert.ok((await results).every(result=>result.status==='rejected'));
 assert.equal(s.readSavedSets('screener').rows.length,0);assert.equal(s.readSavedSets('comparison').rows.length,0);assert.equal(s.disk.has(key+':user-B'),false);
 await s.saveNamedSet('comparison','B 계정',compare());assert.equal(s.readSavedSets('comparison').rows.length,1);
 s.identity('user-A');await s.initializeStorage();assert.equal(s.readSavedSets('screener').rows[0].name,'A 계정');assert.equal(s.readSavedSets('comparison').rows.length,0);
});
