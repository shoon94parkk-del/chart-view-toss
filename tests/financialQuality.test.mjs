import test from 'node:test';
import assert from 'node:assert/strict';
import { assessQuality, qualitySlice, qualityValue, qualityObservations, ratio } from '../src/financialQuality.js';
import { questionPlan, compareReports } from '../src/researchAnalysis.js';
const data={available:true,basis:'연결재무제표',currency:'KRW',interim:{year:2026,quarter:2,revenue:150,priorRevenue:100,operatingProfit:30,priorOperatingProfit:20},quality:{interim:{year:2026,quarter:2,current:{netIncome:20,operatingCashFlow:0,inventories:100,receivables:60,assets:300,liabilities:150,equity:150},previous:{netIncome:12,operatingCashFlow:25,inventories:50,receivables:30,assets:200,liabilities:80,equity:120},accounts:{}}}};
function slice(report=data){const c=compareReports(report);return qualitySlice(report,c.selection,c.slices[0]);}
test('quality zero cash is valid, debt denominators must be positive',()=>{
 const s=slice();assert.equal(qualityValue(s,'cashConversion'),0);assert.equal(qualityValue(s,'debtRatio'),100);
 assert.equal(ratio(10,0),null);assert.equal(ratio(10,-10),null);assert.equal(ratio(null,10),null);
 const result=assessQuality(s);assert.equal(result.covered,7);
 assert.ok(result.checks.some(r=>r.title.includes('현금흐름은 줄었어요')));
 assert.ok(result.checks.some(r=>r.title.includes('부채비율')));
});
test('interim balances use prior year end, not year-on-year sales growth',()=>{
 const result=assessQuality(slice());assert.ok(!result.checks.some(r=>r.title.includes('재고자산 증가율')));
 assert.ok(result.observations.some(r=>r.title.includes('재고자산이 전년 말')));
});
test('missing/stale expansion cannot invent a quality conclusion',()=>{
 const old=structuredClone(data);old.quality.interim.year=2025;
 const s=slice(old);assert.equal(assessQuality(s).covered,0);assert.equal(qualityValue(s,'debtRatio'),null);
 assert.equal(s.current.revenue,150);
});
test('annual stock vs sales growth and equity loss are qualified checks',()=>{
 const s=slice();s.type='annual';s.current.equity=-1;
 const result=assessQuality(s);assert.ok(result.checks.some(r=>r.title.includes('재고자산 증가율')));
 assert.ok(result.checks.some(r=>r.title.includes('자본총계가 0 이하')));assert.equal(qualityValue(s,'debtRatio'),null);
});
test('question selects cash, balance and quality, without AI inference',()=>{
 assert.equal(questionPlan('하이닉스와 영업현금흐름 및 순이익 비교','005930.KS').focus,'cash');
 assert.equal(questionPlan('재고와 부채비율을 비교','005930.KS').focus,'balance');
 assert.equal(questionPlan('실적의 질과 위험을 비교','005930.KS').focus,'quality');
 assert.equal(questionPlan('영업이익 증가율 비교','005930.KS').focus,'growth');
});
test('cash and balance findings follow the question and explicit comparison periods',()=>{
 const cash=qualityObservations(slice(),'cash').join(' ');assert.match(cash,/영업현금흐름은 전년 같은 기간보다 줄었어요/);assert.ok(!cash.includes('매출액'));
 assert.match(qualityObservations(slice(),'balance').join(' '),/전년 말보다/);
});
