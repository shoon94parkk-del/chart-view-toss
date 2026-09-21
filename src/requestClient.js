export class ApiError extends Error {
 constructor(message,{code='unknown',status=null,cause=null}={}){super(message,{cause});this.name='ApiError';this.code=code;this.status=status;}
}
const copy=value=>structuredClone(value);
export function createRequestClient({base,fetchImpl=(...args)=>fetch(...args),now=()=>Date.now(),isOffline=()=>typeof navigator!=='undefined'&&navigator.onLine===false,maxEntries=60}={}){
 const cache=new Map(),pending=new Map();
 const request=async(path,options={})=>{
  const {ttlMs=0,timeoutMs=12000,retries=1,signal,force=false,...init}=options;
  const method=String(init.method||'GET').toUpperCase();
  // Caller-owned cancellation and custom headers cannot share another lifecycle.
  const shared=method==='GET'&&!signal&&!init.headers;
  const key=base+path;
  if(signal?.aborted)throw new DOMException('Aborted','AbortError');
  const hit=cache.get(key);
  if(shared&&!force&&hit&&now()-hit.time<ttlMs)return copy(hit.value);
  if(isOffline())throw new ApiError('인터넷 연결을 확인해주세요.',{code:'offline'});
  if(shared&&pending.has(key))return copy(await pending.get(key));
  const run=async()=>{
   const controller=new AbortController();let timedOut=false;
   const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
   const cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});
   try{
    for(let attempt=0;attempt<=retries;attempt++){
     let response;
     try{response=await fetchImpl(key,{...init,method,signal:controller.signal,headers:{Accept:'application/json',...init.headers}});}
     catch(error){
      if(signal?.aborted)throw new DOMException('Aborted','AbortError');
      if(timedOut)throw new ApiError('데이터 연결이 지연되고 있어요. 다시 시도해주세요.',{code:'timeout',cause:error});
      if(method==='GET'&&attempt<retries)continue;
      throw new ApiError('데이터를 불러오지 못했어요. 다시 시도해주세요.',{code:'network',cause:error});
     }
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
     if(shared&&ttlMs>0){cache.delete(key);cache.set(key,{time:now(),value:copy(value)});while(cache.size>maxEntries)cache.delete(cache.keys().next().value);}
     return value;
    }
   }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
  };
  const work=run();if(shared)pending.set(key,work);
  try{return copy(await work);}finally{if(pending.get(key)===work)pending.delete(key);}
 };
 request.clear=()=>cache.clear();return request;
}
