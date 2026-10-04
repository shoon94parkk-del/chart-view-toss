import {filingChanges} from './filingComparison.js';
const labels={unchecked:'최신 공시 미확인',same:'마지막 확인한 공시와 같아요',first:'비교할 확인 기준이 없어요',new:'새 기간 공시 · 다시 확인',corrected:'공시 수치·원문 변경 · 다시 확인',incompatible:'비교 기준이 달라졌어요',older:'저장 기준보다 과거 자료',unavailable:'최신 근거 확인 불가',conditionChanged:'저장 조건의 충족 여부가 달라졌어요',conditionMaintained:'저장 조건의 충족 여부가 같아요'};
export function reviewRevisit(saved={}){
 const observation=saved.observation;
 if(!observation||typeof observation.checkedAt!=='string'||!Number.isFinite(Date.parse(observation.checkedAt)))return {kind:'unchecked',label:labels.unchecked};
 const filing=filingChanges(saved.filing,observation.filing);
 const conditions=(saved.conditions||[]).map(condition=>{
  const id=condition.id||condition.key+':'+(condition.peer?.symbol||'self');
  return {condition,observed:(Array.isArray(observation.conditions)?observation.conditions:[]).find(row=>row&&row.id===id)};
 });
 let kind=filing.kind;
 if(['new','corrected','older','incompatible'].includes(kind))return {kind,label:labels[kind],checkedAt:observation.checkedAt,period:observation.filing?.label};
 if(conditions.some(({condition,observed})=>observed?.matched!=null&&typeof condition.baseline?.matched==='boolean'&&observed.matched!==condition.baseline.matched))kind='conditionChanged';
 else if(conditions.some(({observed})=>!observed||observed.matched==null)||!observation.filing)kind='unavailable';
 else if(conditions.length)kind='conditionMaintained';
 return {kind,label:labels[kind],checkedAt:observation.checkedAt,period:observation.filing?.label};
}
