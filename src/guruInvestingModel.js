export const guruMetricLabels={roeAvg3:'3년 평균 ROE',debtRatio:'부채비율',epsCagr3:'3년 EPS 성장률',annualPE:'연간 실적 PER',historicalPEG:'과거 실적 PEG'};
export const GURU_STRATEGIES={
 buffett:{name:'버핏',label:'우량기업',intro:'꾸준한 수익성과 현금흐름, 부채 부담을 확인해요.',limits:'경제적 해자·경영진·적정 매수가격은 이 조건만으로 판단할 수 없어요.',questions:['높은 수익성이 일시적인 요인 때문인가요?','유지·성장 투자에 필요한 현금은 얼마인가요?','현재 가격에도 보유할 근거가 있나요?']},
 lynch:{name:'린치',label:'성장과 가격',intro:'과거 주당이익 성장과 연간 실적 대비 가격을 함께 확인해요.',limits:'과거 성장은 미래 성장을 보장하지 않아요. 예상 실적이나 TTM 기준 PEG가 아니에요.',questions:['최근 성장은 본업에서 발생했나요?','향후에도 이익이 늘 근거가 있나요?','재고·매출채권이 매출보다 빠르게 늘고 있나요?']},
};
export function validateGuruSnapshot(data){
 if(data?.schemaVersion!==1||data.criteriaVersion!=='cv-gurus-v1'||!data.snapshotVersion||!/^\d{4}-\d{2}-\d{2}$/.test(data.tradeDate||'')||!Number.isFinite(Date.parse(data.tradeDate))||!data.generatedAt||!data.financialAsOf)throw new Error('거장 투자법 데이터 형식을 확인하지 못했어요.');
 for(const name of ['buffett','lynch']){
  const s=data.strategies?.[name],keys=['universeCount','unsupportedCount','pendingCount','insufficientCount','evaluatedCount','failedCount','matchedCount'];
  if(!s||!Array.isArray(s.results)||keys.some(k=>!Number.isInteger(s[k])||s[k]<0)||s.universeCount!==s.unsupportedCount+s.pendingCount+s.insufficientCount+s.evaluatedCount||s.evaluatedCount!==s.matchedCount+s.failedCount||s.matchedCount!==s.results.length)throw new Error('재무 검증 범위를 확인하지 못했어요.');
  const symbols=new Set();
  for(const r of s.results){if(!/^\d{6}\.(KS|KQ)$/.test(r.symbol||'')||!r.name||!r.metrics||!Array.isArray(r.checks)||symbols.has(r.symbol))throw new Error('종목 근거를 확인하지 못했어요.');symbols.add(r.symbol);}
 }
 return data;
}
export function filterGuruResults(rows,{query='',market=''}={}){
 const q=String(query).trim().toLocaleLowerCase('ko-KR');
 return rows.filter(r=>(!market||r.market===market)&&(!q||`${r.name} ${r.symbol}`.toLocaleLowerCase('ko-KR').includes(q))).sort((a,b)=>a.name.localeCompare(b.name,'ko-KR')||a.symbol.localeCompare(b.symbol));
}
export function guruViewStatus(s){
 if(s.matchedCount>0)return {status:'ready'};
 if(s.evaluatedCount>0)return {status:'empty',title:'현재 조건을 모두 충족한 기업이 없어요.',text:'확인한 재무자료에서 차트뷰 기준에 맞는 기업을 찾지 못했어요. 조건을 자동으로 완화하지 않아요.'};
 if(s.pendingCount>0)return {status:'pending',title:'재무자료를 순차적으로 확인하고 있어요.',text:'검증을 마친 기업만 표시해요. 전체 대상과 수집 대기는 위에서 확인할 수 있어요.'};
 return {status:'unavailable',title:'이 기준으로 검증할 수 있는 자료가 부족해요.',text:'계정·기간·EPS 비교 기준을 확인하지 못한 기업은 결과에 넣지 않아요.'};
}
