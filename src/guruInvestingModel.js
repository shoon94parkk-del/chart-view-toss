export const guruMetricLabels={roeAvg3:'3년 평균 ROE',debtRatio:'부채비율',epsCagr3:'3년 EPS 성장',annualPE:'연간 PER',historicalPEG:'과거 PEG',quarterEpsGrowth:'분기 EPS↑',breakoutVolumeRatio:'돌파 거래량',relativeStrengthPercentile:'상대강도',distance52HighPct:'52주 고가',annualROA:'연간 ROA'};
export const guruMetricUnits={annualPE:'배',historicalPEG:'배',breakoutVolumeRatio:'배',relativeStrengthPercentile:'백분위'};
export const GURU_STRATEGIES={
 buffett:{name:'버핏',label:'우량기업',intro:'꾸준한 수익성과 현금흐름, 부채 부담을 확인해요.',limits:'경제적 해자·경영진·적정 매수가격은 이 조건만으로 판단할 수 없어요.',questions:['높은 수익성이 일시적인 요인 때문인가요?','유지·성장 투자에 필요한 현금은 얼마인가요?','현재 가격에도 보유할 근거가 있나요?']},
 lynch:{name:'린치',label:'성장과 가격',intro:'과거 주당이익 성장과 연간 실적 대비 가격을 함께 확인해요.',limits:'과거 성장은 미래 성장을 보장하지 않아요. 예상 실적이나 TTM 기준 PEG가 아니에요.',questions:['최근 성장은 본업에서 발생했나요?','향후에도 이익이 늘 근거가 있나요?','재고·매출채권이 매출보다 빠르게 늘고 있나요?']},
 oneil:{name:'오닐',label:'실적·돌파',intro:'실적 성장과 거래량을 동반한 최근 돌파를 함께 확인해요.',limits:'CAN SLIM의 정량 일부예요. 신제품·기관 수급·차트 패턴·시장 추세는 확인하지 않아요.',questions:['실적 성장이 일회성 이익 때문인가요?','돌파 후 가격과 거래량이 유지되고 있나요?','전체 시장과 업종 흐름도 뒷받침하나요?']},
 minervini:{name:'미너비니',label:'강한 추세',intro:'이동평균의 상승 정렬과 시장 안에서 강한 가격 흐름을 찾아요.',limits:'추세 조건 조회예요. VCP 패턴·매수 시점·손절·실적을 판단하지 않아요. 상대강도는 RSI나 IBD RS Rating이 아니에요.',questions:['상승 추세가 실적 변화와 연결되나요?','변동성과 거래량이 안정되고 있나요?','추세가 꺾였다고 판단할 조건은 무엇인가요?']},
 greenblatt:{name:'그린블라트',label:'수익성·가격',intro:'수익성 좋은 기업 중 실적 대비 가격이 낮은 기업을 살펴봐요.',limits:'ROA·PER 대안이에요. 선정은 확정 연간 실적 기준이며, 현재 TTM·예상 지표는 별도 재확인 값이에요. EBIT/EV 매직포뮬러가 아니며 영업 외·일회성 이익도 포함될 수 있어요.',questions:['높은 ROA가 일회성 이익에서 나왔나요?','최근 TTM 이익도 연간 선정 당시 수준을 유지하나요?','낮은 PER에 구조적 이유가 있나요?']},
};
export const guruRowMetrics={buffett:['roeAvg3','debtRatio'],lynch:['epsCagr3','historicalPEG'],oneil:['quarterEpsGrowth','breakoutVolumeRatio'],minervini:['relativeStrengthPercentile','distance52HighPct'],greenblatt:['annualROA','annualPE']};
export function validateGuruSnapshot(data){
 if(data?.schemaVersion!==1||!['cv-gurus-v1','cv-gurus-v2'].includes(data.criteriaVersion)||!data.snapshotVersion||!/^\d{4}-\d{2}-\d{2}$/.test(data.tradeDate||'')||!Number.isFinite(Date.parse(data.tradeDate))||!data.generatedAt||!data.financialAsOf)throw new Error('거장 투자법 데이터 형식을 확인하지 못했어요.');
 for(const name of data.criteriaVersion==='cv-gurus-v2'?Object.keys(GURU_STRATEGIES):['buffett','lynch']){
  const s=data.strategies?.[name],keys=['universeCount','unsupportedCount','pendingCount','insufficientCount','evaluatedCount','failedCount','matchedCount'];
  if(!s||!Array.isArray(s.results)||keys.some(k=>!Number.isInteger(s[k])||s[k]<0)||s.universeCount!==s.unsupportedCount+s.pendingCount+s.insufficientCount+s.evaluatedCount||s.evaluatedCount!==s.matchedCount+s.failedCount||s.matchedCount!==s.results.length)throw new Error('재무 검증 범위를 확인하지 못했어요.');
  const symbols=new Set();
  for(const r of s.results){if(!/^\d{6}\.(KS|KQ)$/.test(r.symbol||'')||!r.name||!r.metrics||!Array.isArray(r.checks)||symbols.has(r.symbol))throw new Error('종목 근거를 확인하지 못했어요.');symbols.add(r.symbol);}
 }
 return data;
}
export function filterGuruResults(rows,{query='',market=''}={},strategy=''){
 const q=String(query).trim().toLocaleLowerCase('ko-KR');
 return rows.filter(r=>(!market||r.market===market)&&(!q||`${r.name} ${r.symbol}`.toLocaleLowerCase('ko-KR').includes(q))).sort((a,b)=>strategy==='greenblatt'?(a.metrics.annualPE-b.metrics.annualPE||a.symbol.localeCompare(b.symbol)):(a.name.localeCompare(b.name,'ko-KR')||a.symbol.localeCompare(b.symbol)));
}
export function greenblattCurrentCheck(value){
 const roa=Number.isFinite(value?.roa)?value.roa:null,pe=Number.isFinite(value?.trailingPE)?value.trailingPE:null,forwardPE=Number.isFinite(value?.forwardPE)?value.forwardPE:null,trailingEPS=Number.isFinite(value?.trailingEPS)?value.trailingEPS:null;
 const provenFailure=(roa!==null&&roa<25)||(pe!==null&&(pe<5||pe>20))||(trailingEPS!==null&&trailingEPS<=0);
 const status=provenFailure?'failed':roa===null||pe===null?'unknown':'matched';
 return {status,roa,trailingPE:pe,forwardPE,trailingEPS};
}
// missingReasons is optional in older publications. Its counts describe both
// insufficient data and unsupported comparisons, not just insufficientCount.
export function guruMissingReasons(s){
 const reasons=s?.missingReasons;
 if(!reasons||typeof reasons!=='object'||Array.isArray(reasons))return [];
 return Object.entries(reasons).filter(([reason,count])=>reason.trim()&&Number.isInteger(count)&&count>0).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ko-KR'));
}
export function isOlderGuruSnapshot(incoming,current){
 if(!current)return false;
 const incomingDay=Date.parse(incoming.tradeDate),currentDay=Date.parse(current.tradeDate);
 if(Number.isFinite(incomingDay)&&Number.isFinite(currentDay)&&incomingDay!==currentDay)return incomingDay<currentDay;
 const incomingTime=Date.parse(incoming.generatedAt),currentTime=Date.parse(current.generatedAt);
 return Number.isFinite(incomingTime)&&Number.isFinite(currentTime)&&incomingTime<currentTime;
}
export function guruViewStatus(s,strategy=''){
 if(s.matchedCount>0)return {status:'ready'};
 if(s.evaluatedCount>0)return {status:'empty',title:'현재 조건을 모두 충족한 기업이 없어요.',text:`확인한 ${strategy==='minervini'?'일봉':'재무'}자료에서 차트뷰 기준에 맞는 기업을 찾지 못했어요. 조건을 자동으로 완화하지 않아요.`};
 if(s.pendingCount>0)return {status:'pending',title:`${strategy==='minervini'?'일봉':'재무'}자료를 순차적으로 확인하고 있어요.`,text:'검증을 마친 기업만 표시해요. 전체 대상과 수집 대기는 위에서 확인할 수 있어요.'};
 if(strategy==='minervini')return {status:'unavailable',title:'이 기준으로 검증할 수 있는 자료가 부족해요.',text:'같은 기준일의 253거래일 일봉과 상대강도 비교시장 자료를 확인해야 해요. 비교 대상의 일봉 자료가 90% 미만이면 결과를 표시하지 않아요.'};
 return {status:'unavailable',title:'이 기준으로 검증할 수 있는 자료가 부족해요.',text:'계정·기간·EPS 비교 기준을 확인하지 못한 기업은 결과에 넣지 않아요.'};
}
