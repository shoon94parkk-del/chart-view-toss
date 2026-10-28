import {readStored,writeStored,REVIEW_KEY} from './storage.js';
const load=()=>{
 const stored=readStored(REVIEW_KEY);
 if(stored==null)return {};
 try{
  const raw=JSON.parse(stored);
  if(raw&&typeof raw==='object'&&!Array.isArray(raw))return raw;
 }catch{}
 throw new Error('저장된 투자 근거 자료가 손상되어 변경하지 않았어요. 기기 저장 자료를 확인해주세요.');
};
export const readReview=symbol=>{const row=load()[symbol];return row&&typeof row==='object'?{...row,conditions:Array.isArray(row.conditions)?row.conditions.filter(c=>c&&['revenueGrowth','profitGrowth','margin','operatingCashFlow'].includes(c.key)&&c.baseline&&typeof c.label==='string'&&(!c.peer||/^[0-9]{6}\.(KS|KQ)$/.test(c.peer.symbol))).slice(0,3):[]}:{conditions:[]};};
export function updateReview(symbol,change){
 const all=load(),next={...(all[symbol]||{conditions:[]}),...change};
 all[symbol]=next;writeStored(REVIEW_KEY,JSON.stringify(all));return next;
}
export function saveCondition(symbol,condition){
 const saved=readReview(symbol),rows=Array.isArray(saved.conditions)?saved.conditions:[];
 const id=condition.key+':'+(condition.peer?.symbol||'self');
 const without=rows.filter(row=>row.id!==id);
 if(without.length>=3)throw new Error('투자 근거는 종목당 3개까지 저장할 수 있어요. 기존 근거를 지운 뒤 추가해주세요.');
 return updateReview(symbol,{conditions:[...without,{...condition,id,savedAt:new Date().toISOString()}]});
}
