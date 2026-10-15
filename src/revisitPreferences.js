import { RECENT_STOCKS_KEY, WATCH_SORT_KEY, readStored, writeStored, getStorageContext, isStorageContextCurrent } from './storage.js';

const sorts=new Set(['manual','name','change']);
const stock=value=>{
 const symbol=String(value?.symbol||'').trim().toUpperCase();
 const name=String(value?.name||'').trim().slice(0,80);
 return /^[A-Z0-9][A-Z0-9.=_-]{0,31}$/.test(symbol)&&name&&name.toUpperCase()!==symbol?{symbol,name}:null;
};
export function readRecentStocks(){
 try{
  const rows=JSON.parse(readStored(RECENT_STOCKS_KEY)||'[]');
  if(!Array.isArray(rows))return [];
  return [...new Map(rows.map(stock).filter(Boolean).map(row=>[row.symbol,row])).values()].slice(0,5);
 }catch{return [];}
}
let recentQueue=Promise.resolve();
export function rememberRecentStock(value){
 const row=stock(value),context=getStorageContext();
 if(!row)return Promise.resolve(false);
 recentQueue=recentQueue.catch(()=>{}).then(async()=>{
  if(!isStorageContextCurrent(context))return false;
  const rows=readRecentStocks();
  if(rows[0]?.symbol===row.symbol&&rows[0]?.name===row.name)return true;
  await writeStored(RECENT_STOCKS_KEY,JSON.stringify([row,...rows.filter(item=>item.symbol!==row.symbol)].slice(0,5)),{confirmed:true});
  return isStorageContextCurrent(context);
 }).catch(()=>false);
 return recentQueue;
}
export async function clearRecentStocks(){
 const context=getStorageContext();
 await recentQueue;
 if(!isStorageContextCurrent(context))throw new Error('Storage context changed');
 await writeStored(RECENT_STOCKS_KEY,'[]',{confirmed:true});
}
export function readWatchSort(){
 try{const value=readStored(WATCH_SORT_KEY);return sorts.has(value)?value:'manual';}catch{return 'manual';}
}
export async function saveWatchSort(value){
 if(!sorts.has(value))throw new Error('Invalid watch sort');
 const context=getStorageContext();
 await writeStored(WATCH_SORT_KEY,value,{confirmed:true});
 if(!isStorageContextCurrent(context))throw new Error('Storage context changed');
 return value;
}
