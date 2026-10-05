import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateGuruSnapshot,filterGuruResults,guruViewStatus,guruMetricLabels} from '../src/guruInvestingModel.js';

const strategy=()=>({universeCount:5,unsupportedCount:1,pendingCount:1,insufficientCount:1,evaluatedCount:2,failedCount:1,matchedCount:1,results:[{symbol:'005930.KS',name:'삼성전자',market:'KOSPI',metrics:{roeAvg3:15},checks:[]}]});
const snapshot=()=>({schemaVersion:1,criteriaVersion:'cv-gurus-v1',snapshotVersion:'0123456789abcdef0123',tradeDate:'2026-10-02',generatedAt:'2026-10-05T06:00:00+09:00',financialAsOf:'2026-10-05T05:00:00+09:00',strategies:{buffett:strategy(),lynch:strategy()}});

test('invalid counts, missing dates and strategy payloads cannot masquerade as results',()=>{
 assert.equal(validateGuruSnapshot(snapshot()).schemaVersion,1);
 const bad=snapshot();bad.strategies.buffett.universeCount=100;
 assert.throws(()=>validateGuruSnapshot(bad));
 const missing=snapshot();delete missing.tradeDate;assert.throws(()=>validateGuruSnapshot(missing));
 const partial=snapshot();delete partial.strategies.lynch;assert.throws(()=>validateGuruSnapshot(partial));
});
test('candidate search combines name/code and market without changing investment criteria',()=>{
 const rows=[...strategy().results,{symbol:'000660.KS',name:'SK하이닉스',market:'KOSPI'},{symbol:'033500.KQ',name:'동성화인텍',market:'KOSDAQ'}];
 assert.equal(filterGuruResults(rows,{query:'005930',market:'KOSPI'}).length,1);
 assert.equal(filterGuruResults(rows,{query:'삼성',market:'KOSDAQ'}).length,0);
 assert.equal(filterGuruResults(rows,{query:'하이닉스'}).length,1);
});
test('no matching companies differs from no evaluated data and ongoing collection',()=>{
 const s=strategy();s.matchedCount=0;s.results=[];s.failedCount=2;
 assert.equal(guruViewStatus(s).status,'empty');
 s.evaluatedCount=0;s.failedCount=0;s.insufficientCount=3;
 assert.equal(guruViewStatus(s).status,'pending');
 s.pendingCount=0;s.insufficientCount=4;
 assert.equal(guruViewStatus(s).status,'unavailable');
});
test('historical valuation labels do not imply forecast or trailing metrics',()=>{
 assert.match(guruMetricLabels.annualPE,/연간/);
 assert.match(guruMetricLabels.historicalPEG,/과거/);
 assert.match(guruMetricLabels.epsCagr3,/3년/);
});
