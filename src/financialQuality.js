import { number, margin, growth } from './researchAnalysis.js';

export const qualityKeys=['netIncome','operatingCashFlow','inventories','receivables','assets','liabilities','equity'];
export const qualityLabels={netIncome:'순이익',operatingCashFlow:'영업현금흐름',inventories:'재고자산',receivables:'매출채권 등',assets:'자산총계',liabilities:'부채총계',equity:'자본총계',cashConversion:'현금 / 순이익',debtRatio:'부채비율'};
export const balanceKeys=new Set(['inventories','receivables','assets','liabilities','equity','debtRatio']);
export function qualityForPeriod(data,selection){
 const blank=Object.fromEntries(qualityKeys.map(key=>[key,null]));
 if(selection.type==='interim'){
  const q=data?.quality?.interim;
  if(!q||q.year!==data?.interim?.year||q.quarter!==data?.interim?.quarter)return {current:blank,previous:{...blank},accounts:{},balanceComparison:'previous_year_end'};
  return {current:{...blank,...q.current},previous:{...blank,...q.previous},accounts:q.accounts||{},balanceComparison:q.balanceComparison};
 }
 const rows=data?.quality?.annual||[];
 return {current:{...blank,...rows.find(row=>row.year===selection.year)},previous:{...blank,...rows.find(row=>row.year===selection.year-1)},accounts:data?.quality?.annualAccounts||{},balanceComparison:'previous_year_end'};
}
export function qualitySlice(data,selection,base){
 const q=qualityForPeriod(data,selection);
 return {...base,current:{...base.current,...q.current},previous:{...base.previous,...q.previous},accounts:q.accounts,balanceComparison:q.balanceComparison,type:selection.type,year:selection.year||data?.interim?.year,periodLabel:selection.label};
}
export function ratio(numerator,denominator){
 const n=number(numerator),d=number(denominator);
 return n!==null&&d!==null&&d>0?n/d*100:null;
}
export function qualityValue(slice,key,previous=false){
 const row=previous?slice.previous:slice.current;
 if(key==='cashConversion')return ratio(row.operatingCashFlow,row.netIncome);
 if(key==='debtRatio')return ratio(row.liabilities,row.equity);
 return number(row[key]);
}
export function qualityObservations(slice,focus){
 const keys=focus==='cash'?['netIncome','operatingCashFlow']:['inventories','receivables','liabilities','equity'];
 const statements=keys.flatMap(key=>{
  const current=qualityValue(slice,key),previous=qualityValue(slice,key,true);
  if(current===null||previous===null)return [`${qualityLabels[key]}은 현재·이전 값이 모두 있어야 변화를 확인할 수 있어요.`];
  return [`${qualityLabels[key]}은 ${balanceKeys.has(key)?'전년 말':'전년 같은 기간'}보다 ${current===previous?'같은 수준이에요':current>previous?'늘었어요':'줄었어요'}.` .replace('보다 같은','과 같은')];
 });
 const key=focus==='cash'?'cashConversion':'debtRatio',current=qualityValue(slice,key),previous=qualityValue(slice,key,true);
 if(current!==null&&previous!==null){const delta=current-previous;statements.push(`${qualityLabels[key]}은 ${delta>0?'+':''}${delta.toFixed(1)}%p 변했어요.`);}
 return statements;
}
export function assessQuality(slice){
 const c=slice.current,p=slice.previous,checks=[],observations=[];
 const value=key=>number(c[key]),prior=key=>number(p[key]);
 const add=(list,title,detail,keys)=>list.push({title,detail,keys});
 const cash=value('operatingCashFlow'),oldCash=prior('operatingCashFlow'),income=value('netIncome');
 if(cash!==null&&income!==null&&income>0){
  if(cash<income)add(checks,'순이익보다 영업현금흐름이 적어요','발표한 이익과 영업활동 현금 유입 사이에 차이가 있어요. 운전자본과 비현금 항목을 공시에서 확인해보세요.',['netIncome','operatingCashFlow']);
  else add(observations,'영업현금흐름이 순이익 이상이에요','같은 기간의 공시 수치를 비교한 결과예요. 다음 기간에도 유지되는지 확인해보세요.',['netIncome','operatingCashFlow']);
 }
 if(cash!==null&&cash<0)add(checks,'영업현금흐름이 음수예요','영업활동에서 순현금 유출이 있었어요. 증가한 재고·채권이나 일시적 요인이 있는지 확인해보세요.',['operatingCashFlow']);
 if(value('operatingProfit')!==null&&prior('operatingProfit')!==null&&value('operatingProfit')>prior('operatingProfit')&&cash!==null&&oldCash!==null&&cash<oldCash)
  add(checks,'영업이익은 늘었지만 영업현금흐름은 줄었어요','같은 누적 기간의 이익과 현금흐름이 서로 다른 방향으로 변했어요.',['operatingProfit','operatingCashFlow']);
 for(const [key,label] of [['inventories','재고자산'],['receivables','매출채권 등']]){
  const a=value(key),b=prior(key);
  if(a===null||b===null||a<=b)continue;
  const sales=growth(c.revenue,p.revenue).value,stock=growth(a,b).value;
  if(slice.type==='annual'&&sales!==null&&stock!==null&&stock>sales)
   add(checks,`${label} 증가율이 매출 증가율보다 높아요`,'연간 매출의 증가율과 전년 말 대비 잔액 증가율을 비교했어요. 사업 확장·계절성·회수 상황을 함께 확인하세요.',['revenue',key]);
  else add(observations,`${label}이 전년 말보다 늘었어요`,'기간 중 발생한 매출·이익과 특정 시점의 잔액은 기준이 달라요. 증가만으로 악화라고 판단하지 않아요.',[key]);
 }
 const debt=qualityValue(slice,'debtRatio'),oldDebt=qualityValue(slice,'debtRatio',true);
 if(debt!==null&&oldDebt!==null&&debt>oldDebt+0.05)add(checks,'부채비율이 전년 말보다 높아졌어요','부채총계 ÷ 자본총계 기준이에요. 부채총계는 이자 발생 차입금과 다른 항목이며, 업종에 따라 해석이 달라요.',['liabilities','equity']);
 else if(value('liabilities')!==null&&prior('liabilities')!==null&&value('liabilities')>prior('liabilities'))add(observations,'부채총계가 전년 말보다 늘었어요','자산·자본 변화와 함께 살펴보세요. 부채 증가만으로 재무 악화를 단정하지 않아요.',['liabilities','assets','equity']);
 if(value('equity')!==null&&value('equity')<=0)add(checks,'자본총계가 0 이하예요','양수 자본을 전제로 하는 부채비율은 계산하지 않아요. 자본 구성과 공시 설명을 확인하세요.',['equity']);
 const m=margin(c),oldM=margin(p);
 if(m!==null&&oldM!==null&&m<oldM-0.05)add(checks,'영업이익률이 낮아졌어요',`같은 기간 기준 ${Math.abs(m-oldM).toFixed(1)}%p 하락했어요. 원가·사업구성 변화를 확인하세요.`,['revenue','operatingProfit']);
 return {checks,observations,covered:qualityKeys.filter(key=>value(key)!==null).length,total:qualityKeys.length};
}
