import {test} from 'node:test';
import assert from 'node:assert/strict';
import {questionPlan,compareReports,growth,margin,reportObservations,growthComparison} from '../src/researchAnalysis.js';
const companies=[{symbol:'005930.KS',name:'삼성전자'},{symbol:'000660.KS',name:'SK하이닉스'},{symbol:'066570.KS',name:'LG전자'}];
const data={available:true,basis:'연결재무제표',currency:'KRW',annual:[{year:2024,revenue:100,operatingProfit:10},{year:2025,revenue:120,operatingProfit:6}],interim:{year:2026,quarter:2,revenue:80,operatingProfit:8,priorRevenue:60,priorOperatingProfit:3}};
test('broad questions show overview; company aliases resolve without changing the current stock',()=>{
 assert.equal(questionPlan('요즘 어때?','005930.KS',companies).focus,'overview');
 assert.equal(questionPlan('하이닉스랑 비교해줘','005930.KS',companies).target.symbol,'000660.KS');
 assert.equal(questionPlan('영업이익 좋아졌나?','005930.KS',companies).focus,'profit');
 const multi=questionPlan('하이닉스 LG전자랑 비교','005930.KS',companies);assert.equal(multi.target,null);assert.match(multi.limits.join(),/하나/);
 assert.match(questionPlan('생산량 늘면 매출이 내년에도 늘까','005930.KS',companies).limits.join(),/확인할 수 없어요/);
});
test('compares same-quarter cumulative data and falls back to a shared annual year',()=>{
 const same=compareReports(data,data);assert.equal(same.selection.type,'interim');assert.ok(Math.abs(same.slices[0].revenueGrowth.value-100/3)<1e-9);
 const other={...data,interim:{...data.interim,quarter:1}};
 const annual=compareReports(data,other);assert.equal(annual.selection.year,2025);assert.equal(annual.slices[0].profitGrowth.value,-40);
 assert.match(reportObservations(annual.slices[0]).join(),/減少|감소/);
});
test('missing values never become zero; losses and zero baselines never get fake growth rates',()=>{
 assert.equal(growth(null,10).value,null);assert.equal(growth(0,10).value,-100);
 assert.equal(margin({revenue:10,operatingProfit:null}),null);assert.equal(margin({revenue:10,operatingProfit:0}),0);
 assert.equal(growth(10,-5).label,'흑자전환');assert.equal(growth(-2,-5).label,'적자 축소');assert.equal(growth(5,0).value,null);
});
test('different basis, currency and unshared periods prevent direct company comparisons',()=>{
 assert.equal(compareReports(data,{...data,basis:'별도재무제표'}).available,false);
 assert.equal(compareReports(data,{...data,currency:'USD'}).available,false);
 assert.equal(compareReports({...data,interim:null},{...data,interim:null,annual:[{year:2020,revenue:10}]}).available,false);
 assert.match(compareReports(data,{loadError:true}).reason,/실패/);
});
test('a missing adjacent year is not compared as one-year growth',()=>{
 const result=compareReports({...data,interim:null,annual:[{year:2023,revenue:60},{year:2025,revenue:120}]});
 assert.equal(result.slices[0].revenueGrowth.label,'비교 자료 없음');
});
test('Hynix alias does not also select Inics inside the same word',()=>{
 const rows=[...companies,{symbol:'452400.KQ',name:'이닉스'}];
 const q='하이닉스랑 비교했을때 매출 및 영업이익 증가율 자체를 비교하면 어때';
 const plan=questionPlan(q,'005930.KS',rows);
 assert.equal(plan.target.symbol,'000660.KS');assert.equal(plan.targets.length,1);assert.equal(plan.focus,'growth');
 assert.ok(!plan.limits.some(t=>t.includes('하나만')));
 assert.equal(questionPlan('SK하이닉스랑 비교','005930.KS',rows).target.symbol,'000660.KS');
 const explicit=questionPlan('하이닉스와 이닉스 두 곳 비교','005930.KS',rows);
 assert.equal(explicit.targets.length,2);
 assert.equal(questionPlan('하이닉스 실적','000660.KS',rows).targets.length,0,'current company mention must suppress embedded Inics');
});
test('longer company names win within a span but separate mentions remain',()=>{
 const rows=[{symbol:'A.KS',name:'삼성전자'},{symbol:'B.KS',name:'삼성전자우'}];
 assert.equal(questionPlan('삼성전자우 비교','C.KS',rows).target.symbol,'B.KS');
 assert.equal(questionPlan('삼성전자와 삼성전자우 비교','C.KS',rows).targets.length,2);
});
test('growth differences use percentage points and cannot compare unavailable growth',()=>{
 const slices=[{revenueGrowth:{value:20},profitGrowth:{value:50}},{revenueGrowth:{value:35},profitGrowth:{value:null}}];
 const result=growthComparison(slices,['삼성전자','SK하이닉스']);
 assert.match(result[0],/SK하이닉스가 삼성전자보다 15.0%p 높/);
 assert.match(result[1],/유효한 증가율/);
});
