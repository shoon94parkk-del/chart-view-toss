import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {rememberLiveQuotes,mergeRowsWithLive,clearLiveQuotes} from '../src/liveQuoteStore.js';
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const source=main.slice(main.indexOf('function previousFromPct('),main.indexOf('async function ensureHomeMarketExtras('));
const symbols=['^KS11','^KQ11','^GSPC','^IXIC'];
const row=(ticker,price,asOf='2026-10-13T00:00:00Z')=>({ticker,price,change:2,currency:'KRW',asOf,source:'canonical-market',sessionDate:'2026-10-13'});
function harness(){
 clearLiveQuotes();const host={innerHTML:'',querySelector:()=>null},time={},toggle={setAttribute(){}},saved=[];
 const context={homeMarketCached:false,homeMarketExpanded:false,homeMarketPayload:null,homeMarketPendingSymbols:[],homeMarketFailedSymbols:[],homeMarketRetryPending:false,homeMarketExtrasPending:false,state:{tab:'home'},viewEpoch:0,
  HOME_MARKET_PRIMARY:symbols.map(symbol=>({symbol,label:symbol,pill:'KR',kind:'index'})),HOME_MARKET_EXTRA:[{symbol:'^VIX',label:'VIX',pill:'US',kind:'vix'}],DISPLAY_NAMES:{},
  finiteNumber:value=>value==null||String(value).trim()===''?null:Number.isFinite(Number(value))?Number(value):null,
  fmtPrice:value=>String(value),fmtChange:value=>`${value>0?'+':''}${Number(value).toFixed(2)}%`,esc:String,formatKst:String,
  rememberLiveQuotes,mergeRowsWithLive,bindNav(){},loadingIndicator:text=>`<p role="status">${text}</p>`,
  document:{querySelector:selector=>selector==='#market-card'?host:selector==='#market-time'?time:selector==='#market-expand'?toggle:null},
  writeHomeFast:(key,value)=>saved.push({key,value:structuredClone(value)}),marketNowLive:async()=>({results:[]}),
 };
 vm.createContext(context);vm.runInContext(source,context);return {context,host,time,saved};
}

test('late raw market data renders the existing newest canonical price/change/date without rollback',()=>{
 const h=harness(),latest=row('^KS11',3600,'2026-10-13T00:01:00Z');rememberLiveQuotes([latest],{priority:40});
 h.context.paintHomeMarket({results:[{...row('^KS11',3500),change:1}]});
 assert.match(h.host.innerHTML,/<strong>3600<\/strong>/);assert.match(h.host.innerHTML,/\+2\.00%/);
 assert.match(h.host.innerHTML,/2026-10-13T00:01:00Z/);assert.doesNotMatch(h.host.innerHTML,/<strong>3500<\/strong>/);
 assert.equal(h.context.homeMarketPayload.results[0].asOf,latest.asOf);
});

test('partial pending market shows missing index as checking while preserving the three usable rows',()=>{
 const h=harness();assert.equal(h.context.paintHomeMarket({results:symbols.slice(0,3).map((symbol,i)=>row(symbol,3500+i)),refreshing:true,refreshScheduled:true}),true);
 assert.match(h.host.innerHTML,/market-card-loading/);assert.match(h.host.innerHTML,/확인 중/);assert.doesNotMatch(h.host.innerHTML,/자료 없음|제공되지/);
 assert.match(h.host.innerHTML,/지수 응답이 지연/);assert.match(h.host.innerHTML,/data-retry-market-missing/);
 for(const price of [3500,3501,3502])assert.match(h.host.innerHTML,new RegExp(`<strong>${price}</strong>`));
});

test('zero-row pending response stays pending with retry and cannot certify usable market data',()=>{
 const h=harness();assert.equal(h.context.paintHomeMarket({results:[],refreshing:true,refreshScheduled:true}),false);
 assert.equal((h.host.innerHTML.match(/market-card-loading/g)||[]).length,4);
 assert.doesNotMatch(h.host.innerHTML,/market-error|자료 없음|불러오지 못/);assert.match(h.host.innerHTML,/data-retry-market-missing/);
});

test('pending response cannot drop a previously valid dated fourth index',()=>{
 const h=harness(),dated=symbols.map((symbol,i)=>row(symbol,3400+i,'2026-10-12T06:30:00Z'));
 h.context.paintHomeMarket({results:dated},{cached:true});
 h.context.paintHomeMarket({results:symbols.slice(0,3).map((symbol,i)=>row(symbol,3500+i)),refreshing:true});
 assert.equal(h.context.homeMarketPayload.results.length,4);assert.match(h.host.innerHTML,/<strong>3403<\/strong>/);
 assert.match(h.host.innerHTML,/2026-10-12T06:30:00Z/);assert.match(h.host.innerHTML,/지수 응답이 지연/);
});

test('completed missing response is terminal rather than an endless pending index',()=>{
 const h=harness();h.context.paintHomeMarket({results:symbols.slice(0,3).map((symbol,i)=>row(symbol,3500+i)),refreshing:false,refreshScheduled:false});
 assert.doesNotMatch(h.host.innerHTML,/market-card-loading/);assert.match(h.host.innerHTML,/자료 없음|제공되지/);assert.match(h.host.innerHTML,/data-retry-market-missing/);
});

test('market retry persists canonical observations rather than an older raw reply',async()=>{
 const h=harness(),latest=row('^KS11',3600,'2026-10-13T00:01:00Z');rememberLiveQuotes([latest],{priority:40});
 h.context.paintHomeMarket({results:[latest]});h.context.marketNowLive=async options=>{assert.equal(options.fresh,true);return {results:[row('^KS11',3500)]};};await h.context.retryHomeMarket();
 assert.equal(h.saved.at(-1).key,'market');assert.equal(h.saved.at(-1).value.results[0].price,3600);assert.equal(h.saved.at(-1).value.results[0].asOf,latest.asOf);
});

test('queued zero-row progress also stays pending and cannot replace a saved complete market snapshot',()=>{
 const h=harness();h.context.paintHomeMarket({results:[],refreshing:false,refreshScheduled:true});h.context.persistHomeMarket();
 assert.equal(h.saved.length,0);assert.equal((h.host.innerHTML.match(/market-card-loading/g)||[]).length,4);
 assert.match(h.host.innerHTML,/지수 응답이 지연/);
});

test('pending partial device persistence keeps all previous valid dated primary observations',()=>{
 const h=harness(),dated=symbols.map((symbol,i)=>row(symbol,3400+i,'2026-10-12T06:30:00Z'));
 h.context.paintHomeMarket({results:dated},{cached:true});h.context.persistHomeMarket();
 h.context.paintHomeMarket({results:symbols.slice(0,3).map((symbol,i)=>row(symbol,3500+i)),refreshing:true});h.context.persistHomeMarket();
 assert.equal(h.saved.at(-1).value.results.length,4);assert.equal(h.saved.at(-1).value.results.at(-1).price,3403);assert.equal(h.saved.at(-1).value.results.at(-1).asOf,dated[3].asOf);
});

test('confirmed missing primary failures are terminal even while optional indicators are still refreshing',()=>{
 const h=harness();assert.equal(h.context.paintHomeMarket({results:[],errors:symbols.map(ticker=>({ticker,message:'provider failed'})),refreshing:true}),false);
 assert.doesNotMatch(h.host.innerHTML,/market-card-loading|지수 응답이 지연/);assert.match(h.host.innerHTML,/market-error|불러오지 못/);
 assert.equal(h.context.homeMarketPendingSymbols.length,0);h.context.persistHomeMarket();assert.equal(h.saved.length,0);
});

test('one confirmed missing failure is not labeled pending while another unfinished index continues checking',()=>{
 const h=harness();h.context.paintHomeMarket({results:symbols.slice(0,2).map((symbol,i)=>row(symbol,3500+i)),errors:[{ticker:'^GSPC',message:'provider failed'}],refreshing:true});
 assert.equal((h.host.innerHTML.match(/market-card-loading/g)||[]).length,1);
 assert.match(h.host.innerHTML,/자료 없음/);assert.deepEqual([...h.context.homeMarketPendingSymbols],['^IXIC']);
});

test('explicit retry timeout clears its busy state, retains dated prices and offers another retry',async()=>{
 const h=harness(),dated=symbols.map((symbol,i)=>row(symbol,3400+i,'2026-10-12T06:30:00Z'));
 h.context.paintHomeMarket({results:dated},{cached:true});
 h.context.paintHomeMarket({results:symbols.slice(0,3).map((symbol,i)=>row(symbol,3500+i)),refreshing:true});
 h.context.marketNowLive=async options=>{assert.equal(options.fresh,true);throw Object.assign(new Error('timeout'),{code:'timeout'});};
 await h.context.retryHomeMarket();assert.equal(h.context.homeMarketRetryPending,false);
 assert.match(h.host.innerHTML,/<strong>3403<\/strong>/);assert.match(h.host.innerHTML,/2026-10-12T06:30:00Z/);
 assert.match(h.host.innerHTML,/지수 응답이 지연/);assert.match(h.host.innerHTML,/data-retry-market-missing/);assert.doesNotMatch(h.host.innerHTML,/disabled|다시 확인하고 있어요/);
});

test('terminal confirmed primary failure keeps prior dated values with failure status and explicit retry',()=>{
 const h=harness(),dated=symbols.map((symbol,i)=>row(symbol,3400+i,'2026-10-12T06:30:00Z'));
 h.context.paintHomeMarket({results:dated},{cached:true});
 assert.equal(h.context.paintHomeMarket({results:[],errors:symbols.map(ticker=>({ticker,message:'provider failed'})),refreshing:false},{cached:false}),true);
 assert.doesNotMatch(h.host.innerHTML,/market-card-loading|지수 응답이 지연|market-error/);assert.match(h.host.innerHTML,/지표 갱신을 확인하지 못/);assert.match(h.host.innerHTML,/data-retry-market-missing/);
 for(const price of [3400,3401,3402,3403])assert.match(h.host.innerHTML,new RegExp(`<strong>${price}</strong>`));
 assert.match(h.host.innerHTML,/2026-10-12T06:30:00Z/);assert.match(h.time.textContent,/갱신 실패/);
 h.context.persistHomeMarket();assert.equal(h.saved.at(-1).value.results.length,4);assert.equal(h.saved.at(-1).value.results[0].asOf,dated[0].asOf);
});
