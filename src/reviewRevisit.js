import {filingSnapshot,evaluateCondition} from './investmentReview.js';

import {reviewConditionEvidence} from './reviewConditionEvidence.js';
export {reviewConditionEvidence} from './reviewConditionEvidence.js';
// Observations never acknowledge a filing or overwrite the saved condition baseline.
export function reviewObservation(saved,data,{checkedAt=new Date().toISOString(),peers={}}={}){
 const filing=filingSnapshot(data),conditions=(saved.conditions||[]).map(condition=>({id:condition.id||condition.key+':'+(condition.peer?.symbol||'self'),...evaluateCondition(condition,[data,condition.peer?peers[condition.peer.symbol]:null])}));
 const lastKnownConditions=conditions.map((observed,index)=>{
  const condition=saved.conditions[index],id=observed.id;
  const prior=(saved.observation?.lastKnownConditions||[]).find(row=>row?.id===id);
  const previous=(saved.observation?.conditions||[]).find(row=>row?.id===id);
  return reviewConditionEvidence(observed)||reviewConditionEvidence(prior)||reviewConditionEvidence(previous)||reviewConditionEvidence({...condition.baseline,id});
 }).filter(Boolean);
 return {checkedAt,filing,conditions,lastKnownFiling:filing||saved.observation?.lastKnownFiling||saved.observation?.filing||saved.filing||null,lastKnownConditions};
}
export {reviewRevisit} from './revisitStatus.js';
