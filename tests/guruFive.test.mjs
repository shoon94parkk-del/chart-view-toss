import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GURU_STRATEGIES,validateGuruSnapshot,filterGuruResults,guruRowMetrics,guruMetricUnits,greenblattCurrentCheck} from '../src/guruInvestingModel.js';
import {resolveRoute} from '../src/routes.js';
import {extensionCriteria} from '../src/guruInvestingExtensions.js';

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
test('Greenblatt current cross-check keeps annual selection separate from TTM and forward references',()=>{
 assert.equal(greenblattCurrentCheck({roa:30,trailingPE:12,forwardPE:10}).status,'matched');
 assert.equal(greenblattCurrentCheck({roa:10,trailingPE:12,forwardPE:8}).status,'failed');
 assert.equal(greenblattCurrentCheck({roa:30,trailingPE:40}).status,'failed');
 assert.equal(greenblattCurrentCheck({roa:null,trailingPE:12}).status,'unknown');
 const guide=extensionCriteria('greenblatt');
 assert.match(guide,/확정 연간/);
 assert.match(guide,/TTM ROA·TTM PER/);
 assert.match(guide,/Forward PER은 참고/);
});

test('Greenblatt PER ranking survives search and market filtering',()=>{
 const rows=[{name:'가',symbol:'000001.KS',market:'KOSPI',metrics:{annualPE:15}},{name:'나',symbol:'000002.KS',market:'KOSPI',metrics:{annualPE:8}}];
 assert.equal(filterGuruResults(rows,{},'greenblatt')[0].name,'나');
 assert.equal(filterGuruResults(rows,{query:'가'},'greenblatt')[0].name,'가');
});
