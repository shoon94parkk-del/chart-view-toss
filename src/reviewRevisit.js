import {filingSnapshot,evaluateCondition} from './investmentReview.js';

// Observations never acknowledge a filing or overwrite the saved condition baseline.
export function reviewObservation(saved,data,{checkedAt=new Date().toISOString(),peers={}}={}){
 return {checkedAt,filing:filingSnapshot(data),conditions:(saved.conditions||[]).map(condition=>({id:condition.id||condition.key+':'+(condition.peer?.symbol||'self'),...evaluateCondition(condition,[data,condition.peer?peers[condition.peer.symbol]:null])}))};
}
export {reviewRevisit} from './revisitStatus.js';
