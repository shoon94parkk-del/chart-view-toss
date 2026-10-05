import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GURU_STRATEGIES,validateGuruSnapshot,filterGuruResults,guruRowMetrics,guruMetricUnits} from '../src/guruInvestingModel.js';
import {resolveRoute} from '../src/routes.js';

const s=()=>({universeCount:1,unsupportedCount:0,pendingCount:0,insufficientCount:0,evaluatedCount:1,failedCount:0,matchedCount:1,results:[{symbol:'005930.KS',name:'기업',metrics:{annualPE:10},checks:[]}]});
test('v2 needs all five validated strategies; v1 remains compatible during rollout',()=>{
 const data={schemaVersion:1,criteriaVersion:'cv-gurus-v2',snapshotVersion:'version',tradeDate:'2026-10-02',generatedAt:'2026-10-05',financialAsOf:'2026-10-05',strategies:Object.fromEntries(Object.keys(GURU_STRATEGIES).map(k=>[k,s()]))};
 assert.equal(validateGuruSnapshot(data),data);
 delete data.strategies.oneil;assert.throws(()=>validateGuruSnapshot(data));
 data.criteriaVersion='cv-gurus-v1';assert.equal(validateGuruSnapshot(data),data);
});
test('each strategy exposes appropriate metrics and all direct routes',()=>{
 for(const name of Object.keys(GURU_STRATEGIES)){
  assert.equal(resolveRoute({pathname:`/gurus/${name}/`}).guruStrategy,name);
  assert.equal(guruRowMetrics[name].length,2);
 }
 assert.equal(guruMetricUnits.breakoutVolumeRatio,'배');
 assert.match(GURU_STRATEGIES.greenblatt.limits,/ROA.*PER.*대안/);
 assert.match(GURU_STRATEGIES.minervini.limits,/RSI.*IBD/);
});
test('Greenblatt PER ranking survives search and market filtering',()=>{
 const rows=[{name:'가',symbol:'000001.KS',market:'KOSPI',metrics:{annualPE:15}},{name:'나',symbol:'000002.KS',market:'KOSPI',metrics:{annualPE:8}}];
 assert.equal(filterGuruResults(rows,{},'greenblatt')[0].name,'나');
 assert.equal(filterGuruResults(rows,{query:'가'},'greenblatt')[0].name,'가');
});
