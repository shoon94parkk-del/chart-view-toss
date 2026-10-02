const quotes=new Map();
const priorities=new Map();
const QUOTE_FIELDS=['price','change','dayChange','asOf','currency','source','stale','sessionDate','previousSessionDate','previousClose','quoteBasis','priceBasis','sessionType','marketStatus','delayTime'];

const key=value=>String(value||'').trim().toUpperCase();

function nonNullPatch(raw={}){
  const patch={};
  for(const [field,value] of Object.entries(raw||{})){
    if(value!==null&&value!==undefined)patch[field]=value;
  }
  return patch;
}

function asOfMs(value){
  if(!value)return 0;
  const direct=Date.parse(value);
  if(Number.isFinite(direct))return direct;
  const normalized=String(value).trim().replace(' ','T');
  const parsed=Date.parse(normalized);
  return Number.isFinite(parsed)?parsed:0;
}

export function rememberLiveQuotes(rows=[],{priority=0}={}){
  const accepted=[];
  for(const raw of Array.isArray(rows)?rows:[]){
    const ticker=key(raw?.ticker);
    if(!ticker)continue;
    const incoming={...nonNullPatch(raw),ticker};
    const incomingMs=asOfMs(incoming.asOf);
    const current=quotes.get(ticker);
    const currentMs=asOfMs(current?.asOf);
    if(current&&currentMs&&(!incomingMs||incomingMs<currentMs))continue;
    if(current&&incomingMs===currentMs&&priority<(priorities.get(ticker)||0))continue;
    if(current&&incomingMs===currentMs&&priority<=(priorities.get(ticker)||0)&&current.source&&!incoming.source)continue;
    const merged={...(current||{}),...incoming,ticker};
    quotes.set(ticker,merged);
    priorities.set(ticker,priority);
    accepted.push({...merged});
  }
  return accepted;
}

export function getLiveQuote(symbol){
  const row=quotes.get(key(symbol));
  return row?{...row}:null;
}

export function resolveLiveQuote(symbol,cached){
  if(cached)rememberLiveQuotes([cached],{priority:20});
  return getLiveQuote(symbol);
}

export function mergeRowsWithLive(rows=[]){
  return (Array.isArray(rows)?rows:[]).map(row=>{
    const live=getLiveQuote(row?.ticker);
    if(!live)return row;
    const merged={...row};
    for(const field of QUOTE_FIELDS)if(live[field]!==null&&live[field]!==undefined)merged[field]=live[field];
    if(!merged.name&&live.name)merged.name=live.name;
    return merged;
  });
}

export function clearLiveQuotes(){quotes.clear();priorities.clear();}
