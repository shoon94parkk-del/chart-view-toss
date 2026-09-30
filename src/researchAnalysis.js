// Report arithmetic only. Keywords select a view; they never infer causes.
export const number=v=>(typeof v!=='number'&&typeof v!=='string')||String(v).trim()===''?null:Number.isFinite(Number(v))?Number(v):null;
const normalize=v=>String(v||'').replace(/\s/g,'').toUpperCase();
export function questionPlan(question,symbol,candidates=[]){
 const q=normalize(question),matches=new Map(),hits=[];
 for(const row of candidates){
  if(!row?.symbol||!row.name)continue;
  const names=[row.name,row.symbol,...(row.name==='SK하이닉스'?['하이닉스']:[])];
  for(const name of names){
   const token=normalize(name);if(token.length<2)continue;
   let start=q.indexOf(token);
   while(start!==-1){
    const end=start+token.length;
    // Do not mistake ticker letters inside an English word for a company.
    if(name!==row.symbol||(!/[A-Z0-9]/.test(q[start-1]||'')&&!/[A-Z0-9]/.test(q[end]||'')))hits.push({start,end,row});
    start=q.indexOf(token,start+1);
   }
  }
 }
 // Longest company/alias wins at the same text span: 하이닉스 contains 이닉스.
 // A separate explicit mention of 이닉스 elsewhere in the question still counts.
 const accepted=[];
 for(const hit of hits.sort((a,b)=>(b.end-b.start)-(a.end-a.start))){
  if(accepted.some(other=>hit.start<other.end&&hit.end>other.start))continue;
  accepted.push(hit);
  if(hit.row.symbol!==symbol)matches.set(hit.row.symbol,hit.row);
 }
 const targets=[...matches.values()];
 const focus=/증가율|성장률|증감률/.test(q)?'growth':/영업이익|이익률|수익성|마진/.test(q)?'profit':/매출|성장/.test(q)?'revenue':'overview';
 const limits=[];
 if(/생산|판매량|물량|1:1|수주|고객|공급망/.test(q))limits.push('생산량·수주와 실적의 관계는 이 재무제표만으로 확인할 수 없어요. 사업보고서의 사업 설명을 함께 확인하세요.');
 if(/주가|수익률|PER|PBR|밸류|저평가|비싸|싸다|목표가/.test(q))limits.push('여기서는 공시 실적을 비교해요. 주가 수익률과 적정 가격은 별도의 가격·가치 비교가 필요해요.');
 if(/앞으로|내년|전망|예측|지속|늘까|오를|살까|매수/.test(q))limits.push('이 결과는 이미 발표한 실적의 변화예요. 미래 실적이나 주가를 예측하지 않아요.');
 if(targets.length>1)limits.push('다른 회사 하나와 비교할 수 있어요. 질문에 비교할 회사 하나만 남겨주세요.');
 if(!targets.length&&/비교|VS|차이|대비|보다/.test(q))limits.push('다른 회사의 정식 종목명을 적으면 기업 간 비교를 할 수 있어요. 지금은 이 회사의 이전 실적과 비교해요.');
 return {focus,target:targets.length===1?targets[0]:null,targets,limits};
}
export function growth(current,previous){
 const c=number(current),p=number(previous);
 if(c===null||p===null)return {value:null,label:'비교 자료 없음'};
 if(p>0&&c<0)return {value:null,label:'적자전환'};
 if(p<0&&c>0)return {value:null,label:'흑자전환'};
 if(p<=0)return {value:null,label:p<0?(c>p?'적자 축소':c<p?'적자 확대':'적자 동일'):'기준값 0 · 증감률 제외'};
 const value=(c-p)/p*100;return {value,label:`${value>0?'+':''}${value.toFixed(1)}%`};
}
export const margin=row=>number(row?.revenue)>0&&number(row?.operatingProfit)!==null?number(row.operatingProfit)/number(row.revenue)*100:null;
const annual=data=>(Array.isArray(data?.annual)?data.annual:[]).filter(row=>Number.isInteger(row?.year)).sort((a,b)=>a.year-b.year);
const available=data=>data?.available===true&&!data.loadError;
const interimLabel=row=>`${row.year}년 ${row.quarter===1?'1분기':row.quarter===2?'반기':'3분기'} 누적`;
function slice(data,selection){
 if(selection.type==='interim'){const r=data.interim;return {current:r,previous:{revenue:r.priorRevenue,operatingProfit:r.priorOperatingProfit},sourceUrl:data.interimSourceUrl};}
 const rows=annual(data);return {current:rows.find(r=>r.year===selection.year),previous:rows.find(r=>r.year===selection.year-1)||{},sourceUrl:data.annualSourceUrl};
}
export function compareReports(primary,peer=null){
 if(!available(primary))return {available:false,reason:primary?.loadError?'조회에 실패했어요. 다시 시도해주세요.':'확인 가능한 DART 재무제표가 없어요.'};
 const hasPeer=peer!==null;
 if(hasPeer&&!available(peer))return {available:false,reason:peer?.loadError?'비교 회사의 공시 조회에 실패했어요. 다시 시도해주세요.':'비교 회사의 재무제표를 확인할 수 없어요.'};
 if(hasPeer&&(!primary.basis||!peer.basis||primary.basis!==peer.basis))return {available:false,reason:'연결·별도 재무제표 기준이 다르거나 확인되지 않아 직접 비교하지 않아요.'};
 if(hasPeer&&(!primary.currency||primary.currency!==peer.currency))return {available:false,reason:'공시 통화가 다르거나 확인되지 않아 직접 비교하지 않아요.'};
 const i=primary.interim,p=peer?.interim;let selection;
 if(i&&Number.isInteger(i.year)&&[1,2,3].includes(i.quarter)&&(!hasPeer||(p&&i.year===p.year&&i.quarter===p.quarter))){
  selection={type:'interim',label:interimLabel(i),priorLabel:interimLabel({...i,year:i.year-1})};
 }else{
  const year=annual(primary).map(r=>r.year).filter(y=>!hasPeer||annual(peer).some(r=>r.year===y)).at(-1);
  if(!year)return {available:false,reason:'같은 보고서 기간으로 비교할 자료가 없어요.'};
  selection={type:'annual',year,label:`${year}년 연간`,priorLabel:`${year-1}년 연간`};
 }
 const slices=[primary,...(hasPeer?[peer]:[])].map(data=>{
  const s=slice(data,selection);return {...s,currency:data.currency,basis:data.basis,revenueGrowth:growth(s.current?.revenue,s.previous?.revenue),profitGrowth:growth(s.current?.operatingProfit,s.previous?.operatingProfit),margin:margin(s.current),priorMargin:margin(s.previous)};
 });
 return {available:true,selection,slices};
}
export function reportObservations(s){
 const statements=[];
 for(const [key,label] of [['revenue','매출액'],['operatingProfit','영업이익']]){
  const c=number(s.current?.[key]),p=number(s.previous?.[key]);
  if(c!==null&&p!==null)statements.push(c===p?`${label}은 비교 기간과 같은 수준이에요.`:`${label}은 비교 기간보다 ${c>p?'증가':'감소'}했어요.`);
 }
 if(s.margin!==null&&s.priorMargin!==null){const d=s.margin-s.priorMargin;statements.push(`영업이익률은 ${d>0?'+':''}${d.toFixed(1)}%p 변했어요.`);}
 if(!statements.length)statements.push('이전 기간의 수치가 부족해 실적 변화를 판단하기 어려워요.');
 return statements;
}

export function growthComparison(slices,names){
 if(slices.length!==2)return [];
 return [['revenueGrowth','매출 증가율'],['profitGrowth','영업이익 증가율']].map(([key,label])=>{
  const a=number(slices[0][key]?.value),b=number(slices[1][key]?.value);
  if(a===null||b===null)return `${label}은 두 회사 모두 유효한 증가율이 있어야 차이를 계산할 수 있어요.`;
  const d=a-b;
  if(Math.abs(d)<1e-9)return `${label}은 두 회사가 같아요.`;
  return `${label}은 ${names[d>0?0:1]}가 ${names[d>0?1:0]}보다 ${Math.abs(d).toFixed(1)}%p 높아요.`;
 });
}
