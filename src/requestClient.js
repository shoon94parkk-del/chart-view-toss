export class ApiError extends Error {
 constructor(message,{code='unknown',status=null,cause=null}={}){super(message,{cause});this.name='ApiError';this.code=code;this.status=status;}
}
const copy=value=>structuredClone(value);
const adoptedError=error=>{
 if(error instanceof ApiError)return error;
 const code=['timeout','network','invalid_json','rate_limited','http'].includes(error?.code)?error.code:'network';
 const status=error?.status??null;
 const message=code==='timeout'?'데이터 연결이 지연되고 있어요. 다시 시도해주세요.':code==='invalid_json'?'데이터 형식을 확인하지 못했어요.':code==='rate_limited'?'요청이 많아요. 잠시 후 다시 시도해주세요.':code==='http'?(status>=500?'데이터 서버 연결이 불안정해요. 잠시 후 다시 시도해주세요.':`데이터 요청을 완료하지 못했어요. (${status})`):'데이터를 불러오지 못했어요. 다시 시도해주세요.';
 return new ApiError(message,{code,status,cause:error});
};
export function createRequestClient({base,fetchImpl=(...args)=>fetch(...args),now=()=>Date.now(),isOffline=()=>typeof navigator!=='undefined'&&navigator.onLine===false,maxEntries=60}={}){
 const cache=new Map(),pending=new Map();
 const remember=(key,value,time)=>{cache.delete(key);cache.set(key,{time,value:copy(value)});while(cache.size>maxEntries)cache.delete(cache.keys().next().value);};
 const request=async(path,options={})=>{
  const {ttlMs=0,timeoutMs=12000,retries=1,signal,force=false,cacheIf=()=>true,...init}=options;
  const method=String(init.method||'GET').toUpperCase();
  // Caller-owned cancellation and custom headers cannot share another lifecycle.
  const shared=method==='GET'&&!signal&&!init.headers;
  const key=base+path;
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  const hit=cache.get(key);
  if(shared&&!force&&hit&&now()-hit.time<ttlMs)return copy(hit.value);
  if(isOffline())throw new ApiError('인터넷 연결을 확인해주세요.',{code:'offline'});
  const previous=pending.get(key);
  // Only the original startup lifecycle retains a settled error, within its
  // existing 15s adoption window. Ordinary failed GETs remain uncached.
  if(shared&&previous?.initial&&previous.state!=='pending'&&(force||now()>=previous.expiresAt))pending.delete(key);
  if(shared&&pending.has(key))return copy(await pending.get(key).promise);
  const run=async()=>{
   const controller=new AbortController();let timedOut=false,settled=false,rejectDeadline;
   const started=performance.now();
   const timeoutError=()=>new ApiError('데이터 연결이 지연되고 있어요. 다시 시도해주세요.',{code:'timeout'});
   const deadline=new Promise((_,reject)=>{rejectDeadline=reject;});
   const expire=()=>{timedOut=true;controller.abort();rejectDeadline(timeoutError());};
   const timer=setTimeout(expire,timeoutMs);
   const checkDeadline=()=>{if(timedOut||performance.now()-started>=timeoutMs){expire();throw timeoutError();}};
   const cancel=()=>{controller.abort();rejectDeadline(new DOMException('Aborted','AbortError'));};signal?.addEventListener('abort',cancel,{once:true});
   const transport=async()=>{
    for(let attempt=0;attempt<=retries;attempt++){
     let response;
     try{response=await fetchImpl(key,{...init,method,signal:controller.signal,headers:{Accept:'application/json',...init.headers}});}
     catch(error){
      if(signal?.aborted)throw new DOMException('Aborted','AbortError');
      if(timedOut)throw new ApiError('데이터 연결이 지연되고 있어요. 다시 시도해주세요.',{code:'timeout',cause:error});
      if(method==='GET'&&attempt<retries)continue;
      throw new ApiError('데이터를 불러오지 못했어요. 다시 시도해주세요.',{code:'network',cause:error});
     }
     if(signal?.aborted)throw new DOMException('Aborted','AbortError');
     checkDeadline();
     if(!response.ok){
      // Do not immediately retry rate-limited requests.
      if(method==='GET'&&response.status>=500&&attempt<retries)continue;
      throw new ApiError(response.status===429?'요청이 많아요. 잠시 후 다시 시도해주세요.':response.status>=500?'데이터 서버 연결이 불안정해요. 잠시 후 다시 시도해주세요.':`데이터 요청을 완료하지 못했어요. (${response.status})`,{code:response.status===429?'rate_limited':'http',status:response.status});
     }
     let value;
     try{value=await response.json();}catch(error){
      if(signal?.aborted)throw new DOMException('Aborted','AbortError');
      throw new ApiError(timedOut?'데이터 연결이 지연되고 있어요. 다시 시도해주세요.':'데이터 형식을 확인하지 못했어요.',{code:timedOut?'timeout':'invalid_json',cause:error});
     }
     if(signal?.aborted)throw new DOMException('Aborted','AbortError');
     checkDeadline();
     if(!settled&&shared&&ttlMs>0&&cacheIf(value))remember(key,value,now());
     return value;
    }
   };
   try{return await Promise.race([transport(),deadline]);}
   finally{settled=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
  };
  const work=run(),record={promise:work};if(shared)pending.set(key,record);
  try{return copy(await work);}finally{if(pending.get(key)===record)pending.delete(key);}
 };
 request.adopt=(path,entry,{ttlMs=0,timeoutMs=12000,cacheIf=()=>true}={})=>{
  const key=base+path;
  if(entry?.base!==base||entry?.path!==path||typeof entry.promise?.then!=='function'||!Number.isFinite(entry.startedAt)||now()-entry.startedAt>=15000||pending.has(key))return false;
  if(entry.status==='fulfilled'&&entry.settledAt!=null&&now()-entry.settledAt>=ttlMs)return false;
  const budgetValid=entry.rebudget?.(timeoutMs)!==false;
  const record={initial:true,state:budgetValid?(entry.status||'pending'):'rejected',expiresAt:entry.startedAt+15000};
  const work=(budgetValid?Promise.resolve(entry.promise):Promise.reject(new ApiError('데이터 연결이 지연되고 있어요. 다시 시도해주세요.',{code:'timeout'})))
   .then(value=>{
    record.state='fulfilled';
    const time=entry.settledAt==null?now():entry.settledAt;
    if(pending.get(key)===record&&ttlMs>0&&now()-time<ttlMs&&cacheIf(value))remember(key,value,time);
    return value;
   },error=>{record.state='rejected';throw adoptedError(error);});
  record.promise=work;pending.set(key,record);
  // An HTML response can settle before any app consumer mounts.
  work.catch(()=>{}).finally(()=>{if(pending.get(key)===record&&record.state==='fulfilled')pending.delete(key);});
  return true;
 };
 request.peek=(path,{ttlMs=0,cacheIf=()=>true}={})=>{
  const hit=cache.get(base+path);
  if(!hit||now()-hit.time>=ttlMs)return undefined;
  const value=copy(hit.value);return cacheIf(value)?value:undefined;
 };
 request.clear=()=>{cache.clear();for(const [key,record] of pending)if(record.initial&&record.state==='rejected')pending.delete(key);};
 return request;
}
