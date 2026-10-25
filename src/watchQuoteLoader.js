/** Reuses ordinary request-client caches; at most four provider-backed calls. */
export async function loadWatchQuotes(tickers,{load,onBatch=()=>{},isCurrent=()=>true,timeoutMs=12000}={}){
 const symbols=[...new Set(tickers)];
 if(symbols.length>20)throw new RangeError('관심 시세는 최대 20개까지 조회해요.');
 const deadline=performance.now()+Math.max(1,Math.min(12000,timeoutMs));
 const collected=new Map(),failures=new Map(),pending=new Set(symbols);let cursor=0,deadlineReached=false;
 async function worker(){
  while(isCurrent()&&cursor<symbols.length){
   const symbol=symbols[cursor++];let rows=[],errors=[];
   let timer;
   try{
    const remaining=deadline-performance.now();
    if(deadlineReached||remaining<=0){deadlineReached=true;throw new Error('deadline');}
    const expired=new Promise((_,reject)=>{timer=setTimeout(()=>{deadlineReached=true;reject(new Error('deadline'));},remaining);});
    const data=await Promise.race([load([symbol],{timeoutMs:remaining}),expired]);
    rows=(data?.results||[]).filter(row=>(row?.ticker||row?.symbol)===symbol);
    errors=(data?.errors||[]).filter(row=>(row?.ticker||row?.symbol)===symbol);
    if(!rows.length&&!errors.length)errors=[{ticker:symbol,message:'현재 시세를 확인하지 못했어요.'}];
   }catch{errors=[{ticker:symbol,message:'시세를 불러오지 못했어요. 다시 시도해주세요.'}];}
   finally{clearTimeout(timer);}
   if(!isCurrent())return;
   pending.delete(symbol);rows.forEach(row=>collected.set(symbol,row));errors.forEach(error=>failures.set(symbol,error));
   onBatch({results:rows,errors,pendingSymbols:[...pending]});
  }
 }
 await Promise.all(Array.from({length:Math.min(4,symbols.length)},worker));
 return {results:symbols.filter(s=>collected.has(s)).map(s=>collected.get(s)),errors:symbols.filter(s=>failures.has(s)).map(s=>failures.get(s)),pendingSymbols:[...pending],complete:pending.size===0};
}
