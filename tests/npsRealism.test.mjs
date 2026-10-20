import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateNpsScenario} from '../src/npsAllocationModel.js';
import * as model from '../src/npsAllocationModel.js';
import {readFileSync} from 'node:fs';
const publication=()=>JSON.parse(readFileSync(new URL('./fixtures/nps/summary-realism.json',import.meta.url),'utf8'));

export function realismSeed(){
 const inputs={baseTotal:1000,baseDomestic:200,baseKospi:2000,kospi:2200,target:20,saa:6,taa:2,beta:1,otherReturn:0,fxReturn:10,hedgeRatio:15,netFlow:10,domesticFlow:0,equityReturn:10,bondReturn:-1,domesticBondReturn:2,alternativeReturn:0,cashReturn:-1.3875,assetModel:2,cashWeight:.5,cashNonFinancialWeight:.2,cashIncomeReturn:1,hedgeCarryReturn:-.5,flowIncomeFraction:.5};
 const assetBaseline=[{id:'equity',name:'해외주식',base:400,returnKey:'equityReturn',foreignShare:1},{id:'domesticBond',name:'국내채권',base:200,returnKey:'domesticBondReturn',foreignShare:0},{id:'bond',name:'해외채권',base:80,returnKey:'bondReturn',foreignShare:1},{id:'alternative',name:'대체투자',base:100,returnKey:'alternativeReturn',foreignShare:.9},{id:'cash',name:'단기·기타 조정잔액',base:20,returnKey:'cashReturn',foreignShare:0}];
 return {inputs,assetBaseline,realism:{revision:2},sensitivity:{cases:[]}};
}
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);

test('realism cash separates deposits and nonfinancial/reconciliation balances',()=>{
 const result=calculateNpsScenario(realismSeed());
 assert.ok(result.cashBreakdown,'cash components must be returned');
 close(result.cashBreakdown.shortTermBase,10);close(result.cashBreakdown.nonFinancialBase,4);close(result.cashBreakdown.reconciliationBase,6);
 close(result.cashBreakdown.shortTermIncome,.1);close(result.cashBreakdown.hedgePrincipal,85.5);close(result.cashBreakdown.hedgeCarry,-.4275);close(result.cashBreakdown.externalFlowIncome,.05);close(result.cashBreakdown.effectiveReturnPercent,-1.3875);
 close(result.other,904.7045);close(result.total,1124.7045);
});
test('cash carry and flow interest recompute when assumptions change',()=>{
 const data=realismSeed(),none=calculateNpsScenario(data,{hedgeRatio:0,netFlow:0});
 assert.ok(none.cashBreakdown,'scenario must recompute cash components');
 close(none.cashBreakdown.hedgeCarry,0);close(none.cashBreakdown.externalFlowIncome,0);close(none.cashBreakdown.shortTermIncome,.1);
 const doubled=calculateNpsScenario(data,{baseTotal:1800});
 close(doubled.cashBreakdown.shortTermBase,20);close(doubled.cashBreakdown.hedgePrincipal,171);
});
test('cash detail projected amount includes the same overlay as the cash asset',()=>{
 const result=calculateNpsScenario(realismSeed(),{otherReturn:5});
 close(result.cashBreakdown.projected,result.assets.find(a=>a.id==='cash').projected);
});
test('private NAV market scenario stays separate and does not double-add income',()=>{
 const data=realismSeed(),before=structuredClone(data),reporting=calculateNpsScenario(data),economic=calculateNpsScenario(data,{alternativeReturn:10});
 assert.deepEqual(data,before);close(reporting.assets.find(a=>a.id==='alternative').marketGain,0);
 close(economic.assets.find(a=>a.id==='alternative').marketGain,10);
 close(economic.other-reporting.other,10*1.0765);
});
test('realism rejects missing, impossible or overlapping cash shares',()=>{
 for(const patch of [{cashWeight:1.1},{cashNonFinancialWeight:.6},{cashIncomeReturn:-100},{flowIncomeFraction:2},{hedgeCarryReturn:NaN}])assert.throws(()=>calculateNpsScenario(realismSeed(),patch));
 const data=realismSeed();delete data.inputs.cashWeight;assert.throws(()=>calculateNpsScenario(data));
});
test('assumption cases are computed from actual patches and cannot mutate publication',()=>{
 assert.equal(typeof model.npsAssumptionCases,'function');
 const data=realismSeed();data.sensitivity.cases=[{id:'cashflow-zero',label:'외부 순유입 없음',patch:{netFlow:0}}];
 const before=structuredClone(data),rows=model.npsAssumptionCases(data),expected=calculateNpsScenario(data,{netFlow:0});
 close(rows[0].weight,expected.weight);close(rows[0].deltaWeight,expected.weight-calculateNpsScenario(data).weight);assert.deepEqual(data,before);
 data.sensitivity.cases[0].patch={baseTotal:999};assert.throws(()=>model.npsAssumptionCases(data));
});
test('published realism values reconcile across the server and frontend calculators',()=>{
 const data=publication();assert.equal(model.validateNpsSummary(data),data);
 const result=calculateNpsScenario(data);close(result.weight,data.result.weight);close(result.cashBreakdown.projected,data.result.cashBreakdown.projected);
 for(const item of model.npsAssumptionCases(data))close(item.weight,calculateNpsScenario(data,item.patch).weight);
 for(const mutate of [d=>d.inputs.cashReturn+=1,d=>d.result.cashBreakdown.hedgeCarry+=1,d=>d.sensitivity.cases[0].weight+=1]){const bad=publication();mutate(bad);assert.throws(()=>model.validateNpsSummary(bad));}
});
test('dated flow and NAV descriptions cannot silently disagree with the published model',()=>{
 for(const mutate of [d=>d.realism.cash.shortTermBase+=1,d=>d.realism.externalFlows.projectedNetFlow+=1,d=>d.realism.externalFlows.contributionsBillion+=1000,d=>d.realism.alternatives.localNavStatus='observed',d=>d.realism.alternatives.economicReturnPct+=1,d=>d.realism.alternatives.composition[0].weightPct=99]){const bad=publication();mutate(bad);assert.throws(()=>model.validateNpsSummary(bad));}
});


test('unavailable optional bond comparison is explicit and cannot imply a measured return',()=>{
 const data=publication(),before=calculateNpsScenario(data);
 Object.assign(data.realism.overseasBonds,{unhedgedProxyReturnPct:null,unhedgedProxyStatus:'unavailable',unhedgedProxyDate:data.marketDate});
 data.sensitivity.cases=data.sensitivity.cases.filter(row=>row.id!=='bond-unhedged-proxy');
 data.sensitivity.unavailable=[{id:'bond-unhedged-proxy',label:'해외채권 AGGG 비헤지 대용지표',reason:'동일 기준일의 가격을 확인하지 못해 비교를 제공하지 않아요.'}];
 assert.equal(model.validateNpsSummary(data),data);close(calculateNpsScenario(data).weight,before.weight);
 assert.equal(model.npsAssumptionCases(data).length,7);
 for(const mutate of [d=>d.realism.overseasBonds.unhedgedProxyReturnPct=0,d=>d.realism.overseasBonds.unhedgedProxyDate='2026-10-15',d=>d.sensitivity.unavailable=[],d=>d.sensitivity.cases.push(publication().sensitivity.cases.find(row=>row.id==='bond-unhedged-proxy'))]){const bad=structuredClone(data);mutate(bad);assert.throws(()=>model.validateNpsSummary(bad));}
});
