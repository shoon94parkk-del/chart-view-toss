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

export function earlyHome(name,fallback,maxAgeMs=15000){
  try{
    const entry=globalThis?.__chartviewHomeWarm?.[name];
    if(entry?.promise&&Date.now()-Number(entry.startedAt||0)<=maxAgeMs){
      return entry.promise.then(value=>value??fallback()).catch(()=>fallback());
    }
  }catch{}
  return fallback();
}
