import { api, ApiError, readApiCache } from './api.js';
import { newsResponseState } from './newsResponse.js';

const abortError = () => new DOMException('Aborted','AbortError');
const timeoutError = () => new ApiError('뉴스 연결이 지연되고 있어요. 다시 시도해주세요.',{code:'timeout'});
const pendingSymbols = payload => Array.isArray(payload?.pendingSymbols) ? payload.pendingSymbols : (payload?.groups || []).filter(group=>group.status==='pending').map(group=>group.symbol);
const completeResponse=payload=>payload?.complete!==false && !pendingSymbols(payload).length && newsResponseState(payload)==='ready';
const pathFor = (symbols,names,first,force) => `/api/personalized-news?tickers=${encodeURIComponent(symbols.join(','))}&names=${encodeURIComponent(names.join('|'))}${first?'&delivery=first_available':''}${force?'&force=true':''}`;

/** Share the existing API cache/flight owner; cancellation only detaches this consumer. */
export async function loadProgressiveNews(tickers=[],names=[],{force=false,onUpdate=()=>{},isCurrent=()=>true,signal}={}) {
 const symbols=[...new Set(tickers)];
 const nameBySymbol=new Map(symbols.map(symbol=>[symbol,names[tickers.indexOf(symbol)] || '']));
 const started=performance.now();
 let timer,rejectStop,latest=null,failedReconciliation=null;
 const stop=new Promise((_,reject)=>{rejectStop=reject;});
 const cancel=()=>rejectStop(abortError());
 const check=()=>{if(signal?.aborted || !isCurrent())throw abortError();if(performance.now()-started>=10000)throw timeoutError();};
 timer=setTimeout(()=>rejectStop(timeoutError()),10000);
 signal?.addEventListener('abort',cancel,{once:true});
 const read=async (requested,first,retry=false,bypassCache=false)=>{
  check();
  const value=await Promise.race([api(pathFor(requested,requested.map(symbol=>nameBySymbol.get(symbol)),first,retry),{
   timeoutMs:Math.max(1,10000-(performance.now()-started)),retries:0,ttlMs:60000,force:retry || bypassCache,
   cacheIf:completeResponse,
  }),stop]);
  check();
  if(!value || (!Array.isArray(value.items) && !Array.isArray(value.groups)))throw new ApiError('뉴스 응답을 확인하지 못했어요.',{code:'invalid_json'});
  return value;
 };
 const publish=value=>{check();latest=value;onUpdate(value);};
 const merge=value=>{
  const bySymbol=new Map((latest?.groups || []).map(group=>[group.symbol,group]));
  for(const group of value.groups || [])if(symbols.includes(group.symbol))bySymbol.set(group.symbol,group);
  const groups=symbols.map(symbol=>bySymbol.get(symbol) || {symbol,name:nameBySymbol.get(symbol),status:'pending',items:[]});
  const waiting=groups.filter(group=>group.status==='pending').map(group=>group.symbol);
  const errors=[...(latest?.errors || []),...(value.errors || [])].filter((error,index,rows)=>rows.findIndex(other=>JSON.stringify(other)===JSON.stringify(error))===index);
  return {...latest,...value,groups,items:groups.flatMap(group=>group.items || []),errors,complete:!waiting.length,pendingSymbols:waiting};
 };
 try {
  check();
  if(!force) {
   const cached=readApiCache(pathFor(symbols,symbols.map(symbol=>nameBySymbol.get(symbol)),false,false),{ttlMs:60000,cacheIf:completeResponse});
   if(cached!==undefined){publish(cached);return cached;}
  }
  const initial=await read(symbols,true,force);
  if(initial.complete!==false && !pendingSymbols(initial).length){publish(initial);return initial;}
  publish(merge(initial));
  // Every subsequent response must complete at least one remaining group.
  // At most N progressive reads plus two canonical reads share this budget.
  for(let count=1;latest.pendingSymbols.length && count<symbols.length;count++) {
   const waiting=latest.pendingSymbols;
   const value=merge(await read(waiting,true));
   publish(value);
   if(value.pendingSymbols.length>=waiting.length)throw timeoutError();
  }
  if(latest.pendingSymbols.length)throw timeoutError();
  const canonicalRead=async()=>{
   const value=await read(symbols,false,false,true);
   if(value.complete===false || pendingSymbols(value).length)throw timeoutError();
   return value;
  };
  // Client-only cache bypass can still join a normal flight started earlier.
  // Compare complete article inputs, including extra stale rows and corrections.
  const fingerprint=row=>JSON.stringify(Object.entries(row).sort(([a],[b])=>a.localeCompare(b)));
  const conflicts=value=>latest.groups.some(previous=>{
   if(previous.status!=='success')return false;
   const group=value.groups?.find(group=>group.symbol===previous.symbol);
   const before=(previous.items || []).map(fingerprint).sort();
   const after=(group?.items || []).map(fingerprint).sort();
   return group?.status!=='success' || JSON.stringify(before)!==JSON.stringify(after);
  });
  let final=await canonicalRead();
  if(conflicts(final)) {
   failedReconciliation=final;
   // The joined flight has settled. One client-only revalidation can now read
   // the current server caches without requesting a provider force refresh.
   final=await canonicalRead();
   if(conflicts(final)) {
    failedReconciliation=final;
    throw new ApiError('확인된 기사와 최종 뉴스 목록이 달라요. 다시 시도해주세요.',{code:'news_reconciliation_stale'});
   }
  }
  // Preserve the server's exact balanced highlights, limit and ordering.
  publish(final);return final;
 } catch(error) {
  if(signal?.aborted || !isCurrent() || error?.name==='AbortError')throw abortError();
  if(!latest)throw error;
  const unresolved=new Set(latest.pendingSymbols || []);
  const errors=[...(latest.errors || []),...(failedReconciliation?.errors || []),...[...unresolved].map(symbol=>({symbol,code:error?.code || 'network'}))];
  if(!unresolved.size)errors.push({code:error?.code || 'network'});
  const failedGroups=new Map((failedReconciliation?.groups || []).filter(group=>group.status==='error').map(group=>[group.symbol,group]));
  const groups=(latest.groups || []).map(group=>{
   if(unresolved.has(group.symbol))return {...group,status:'error',error:{code:error?.code || 'network'}};
   const failed=failedGroups.get(group.symbol);
   return failed?{...group,...failed,items:group.items}:group;
  });
  // Every acquired row remains in its group. This bounded fallback explicitly
  // reports an error; it is not a successful balanced-highlight reconciliation.
  latest={...latest,groups,items:(latest.items || []).slice(0,12),errors:errors.filter((error,index,rows)=>rows.findIndex(other=>JSON.stringify(other)===JSON.stringify(error))===index),complete:true,pendingSymbols:[],reconciliationComplete:false};
  // The overall deadline may have expired; only lifecycle checks apply here.
  if(signal?.aborted || !isCurrent())throw abortError();
  onUpdate(latest);return latest;
 } finally {
  clearTimeout(timer);signal?.removeEventListener('abort',cancel);
 }
}
