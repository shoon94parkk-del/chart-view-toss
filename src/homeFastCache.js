const PREFIX='chartview-home-fast-v1:';

const storage=()=>{
  try{return typeof localStorage!=='undefined'?localStorage:null}catch{return null}
};

export function readHomeFast(key,maxAgeMs=6*60*60*1000){
  const store=storage();
  if(!store)return null;
  try{
    const raw=store.getItem(PREFIX+key);
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    const savedAt=Number(parsed?.savedAt||0);
    if(!savedAt||Date.now()-savedAt>maxAgeMs)return null;
    return parsed.value??null;
  }catch{return null}
}

export function writeHomeFast(key,value){
  const store=storage();
  if(!store||value==null)return;
  try{
    store.setItem(PREFIX+key,JSON.stringify({savedAt:Date.now(),value}));
  }catch{}
}

export function adoptEarlyHome(request,base,{timeoutMs=5000,marketCacheIf}={}){
  const warm=globalThis?.__chartviewHomeWarm;
  if(!warm)return;
  for(const [name,path,ttlMs] of [['market','/api/market-now',15000],['snapshot','/api/home-snapshot',60000],['bootstrap','/api/home-bootstrap',60000]]){
    const entry=warm[name];
    if(entry?.base!==base||entry.path!==path)continue;
    request.adopt(path,entry,{ttlMs,timeoutMs,...(name==='market'?{cacheIf:marketCacheIf}:{})});
    // One handoff owns each HTML transport; route entry cannot re-adopt it.
    delete warm[name];
  }
}
