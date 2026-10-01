import {test} from 'node:test';
import assert from 'node:assert/strict';
import {filingSnapshot,filingChanges,conditionChoices,evaluateCondition} from '../src/investmentReview.js';
const report=(revenue=100,quarter=2,receipt='20260814001146')=>({available:true,basis:'연결재무제표',currency:'KRW',interim:{year:2026,quarter,revenue,operatingProfit:10,priorRevenue:80,priorOperatingProfit:8},interimSourceUrl:`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${receipt}`});
test('first visit and acknowledged filing do not invent a new report',()=>{
 const s=filingSnapshot(report());
 assert.equal(filingChanges(null,s).kind,'first');assert.equal(filingChanges(s,s).kind,'same');
});
test('a corrected year-ago comparison value is a filing change even when current value and receipt stay the same',()=>{
 const old=filingSnapshot(report()),data=report();data.interim.priorRevenue=120;
 const changed=filingChanges(old,filingSnapshot(data));
 assert.equal(changed.kind,'corrected');assert.deepEqual(changed.priorChanged,['revenue']);
});
test('new period uses year ago, corrections use acknowledged same period',()=>{
 const old=filingSnapshot(report());
 assert.equal(filingChanges(old,filingSnapshot(report(150,3,'20261114001146'))).kind,'new');
 const corrected=filingChanges(old,filingSnapshot(report(110,2,'20260815001146')));
 assert.equal(corrected.kind,'corrected');assert.equal(corrected.previous.revenue,100);
 assert.equal(filingChanges(old,filingSnapshot({...report(),currency:'USD'})).kind,'incompatible');
 assert.equal(filingChanges(filingSnapshot(report(120,3)),old).kind,'older');
});
test('missing values are unverifiable; loss does not become a growth percentage',()=>{
 const r=report();r.interim.priorRevenue=null;
 assert.equal(evaluateCondition({key:'revenueGrowth',peer:null},[r]).matched,null);
 r.interim.priorRevenue=-10;
 assert.equal(evaluateCondition({key:'revenueGrowth',peer:null},[r]).matched,null);
});
test('saved peer conditions compare matching periods and track changes with evidence',()=>{
 const a=report(120),b=report(100);
 const choice=conditionChoices([{symbol:'005930.KS',name:'삼성전자'},{symbol:'000660.KS',name:'SK하이닉스'}],[a,b])[0];
 assert.equal(choice.baseline.matched,true);
 const latest=evaluateCondition(choice,[report(90),b]);
 assert.equal(latest.matched,false);assert.equal(latest.value,12.5);
 assert.equal(evaluateCondition(choice,[a,report(100,1)]).matched,null);
 assert.equal(evaluateCondition({...choice,baseline:{...choice.baseline,year:2027}},[a,b]).matched,null);
});
test('annual fallback cannot silently replace a saved interim comparison',()=>{
 const c={key:'margin',peer:{symbol:'000660.KS'},baseline:{type:'interim',year:2026,quarter:2,basis:'연결재무제표',currency:'KRW'}};
 assert.equal(evaluateCondition(c,[report(),{...report(),interim:null,annual:[{year:2025,revenue:100,operatingProfit:20}]}]).matched,null);
});
test('same-period older receipt cannot overwrite an acknowledged correction or re-evaluate a saved condition',()=>{
 const latest=report(120,2,'20260815001146'),old=report(90,2,'20260814001146');
 assert.equal(filingChanges(filingSnapshot(latest),filingSnapshot(old)).kind,'older');
 const rule=conditionChoices([{symbol:'005930.KS',name:'삼성전자'}],[latest])[0];
 assert.equal(evaluateCondition(rule,[old]).matched,null);
});
