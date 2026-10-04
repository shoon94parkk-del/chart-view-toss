import {financialHistoryData} from './api.js';
import {savedResearch} from './savedResearch.js';
import {readReview,updateReview} from './reviewStorage.js';
import {reviewObservation} from './reviewRevisit.js';

// Explicit user action only. Three saved companies, up to three peers per company (nine distinct peers maximum).
export async function refreshSavedReviews(alive){
 const rows=savedResearch().rows.filter(row=>/^[A-Z0-9]{6}\.(KS|KQ)$/.test(row.symbol)&&(row.filing||row.conditions.length)).slice(0,3);
 const pending=new Map();
 const load=symbol=>{if(!pending.has(symbol))pending.set(symbol,financialHistoryData(symbol,{force:true}).catch(()=>({available:false})));return pending.get(symbol);};
 for(const row of rows){
  if(!alive())return;
  const saved=readReview(row.symbol),peers=[...new Set((saved.conditions||[]).map(c=>c.peer?.symbol).filter(Boolean))].slice(0,3);
  const data=await load(row.symbol),peerData=await Promise.all(peers.map(load));
  if(!alive())return;
  const latest=readReview(row.symbol);
  updateReview(row.symbol,{observation:reviewObservation(latest,data,{peers:Object.fromEntries(peers.map((s,i)=>[s,peerData[i]]))})});
 }
}
