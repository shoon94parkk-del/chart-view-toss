const quotes=new Map();

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

export function rememberLiveQuotes(rows=[]){
  const accepted=[];
  for(const raw of Array.isArray(rows)?rows:[]){
    const ticker=key(raw?.ticker);
    if(!ticker)continue;
    const incoming={...nonNullPatch(raw),ticker};
    const incomingMs=asOfMs(incoming.asOf);
    const current=quotes.get(ticker);
    const currentMs=asOfMs(current?.asOf);
    if(current&&incomingMs&&currentMs&&incomingMs<currentMs)continue;
    const merged={...(current||{}),...incoming,ticker};
    quotes.set(ticker,merged);
    accepted.push({...merged});
  }
  return accepted;
}

export function getLiveQuote(symbol){
  const row=quotes.get(key(symbol));
  return row?{...row}:null;
}

export function mergeRowsWithLive(rows=[]){
  return (Array.isArray(rows)?rows:[]).map(row=>{
    const live=getLiveQuote(row?.ticker);
    return live?{...row,...nonNullPatch(live)}:row;
  });
}

export function clearLiveQuotes(){quotes.clear();}
