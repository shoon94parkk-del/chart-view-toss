// Synthetic contract fixture only; never copied into published research data.
export const partialLimitation='원문 일부가 잘려 확인 가능한 부분만 표시합니다. 전체 토론과 최종 근거를 확인하지 못했습니다.';
const phase=(role,stage)=>({role,stage,title:'계약 검증용 공개 근거',text:'결정론적 표시 검사를 위한 가상 연구 내용입니다.',source_path:`records/debates/20261020-contract/${role}-${stage}.md`});
export function tenResearchResults(){
 return {schema_version:1,kind:'debate_archive',publication_status:'EXPLICITLY_APPROVED',generated_at:'2026-10-20T06:55:00Z',debates:Array.from({length:10},(_,index)=>({
  id:`contract-report-${String(index+1).padStart(2,'0')}`,company:`계약검사 종목 ${index+1}`,ticker:String(100001+index),date:'2026-10-20',
  status:index===9?'PARTIAL':'COMPLETED',verdict:index<3?'HOLD':'WAIT',audit_verified:false,
  summary:index===9?partialLimitation:'계약 검증용 공개 요약이며 실제 연구 보고서가 아닙니다.',updated_at:'2026-10-20T06:50:00Z',
  phases:index===9?[{...phase('other','context'),title:'원문 일부만 확인한 기록',text:partialLimitation}]:[phase('mer','phase1'),phase('nonggu','phase1'),phase('meng','phase1'),phase('other','attack'),phase('other','rebuttal'),phase('other','final')]
 }))};
}
