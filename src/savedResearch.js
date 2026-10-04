import {readStored,RESEARCH_KEY,REVIEW_KEY} from './storage.js';
import {readResearchNote} from './researchNotes.js';
import {readReview} from './reviewStorage.js';

export function savedResearch(){
 let error=false;const keys=new Set();
 for(const key of [RESEARCH_KEY,REVIEW_KEY]){
  try{const raw=JSON.parse(readStored(key)||'{}');if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid store');Object.keys(raw).filter(symbol=>/^[A-Z0-9^][A-Z0-9.^=\-]{0,29}$/.test(symbol)).forEach(symbol=>keys.add(symbol));}catch{error=true;}
 }
 const rows=[];
 for(const symbol of keys){
  let note=null,review={};try{note=readResearchNote(symbol);}catch{error=true;}
  try{review=readReview(symbol);}catch{error=true;}
  if(!note&&!review.conditions?.length)continue;
  const updatedAt=[note?.updatedAt,...(review.conditions||[]).map(c=>c.savedAt)].filter(value=>typeof value==='string').sort().at(-1)||'';
  rows.push({symbol,question:note?.question||'',reviewOn:note?.reviewOn||'',conditions:review.conditions||[],updatedAt});
 }
 return {rows:rows.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)),error};
}
