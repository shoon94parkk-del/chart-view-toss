import test from 'node:test';
import assert from 'node:assert/strict';
import {homeChanges} from '../src/insightModel.js';
import {filterScreener} from '../src/analysisData.js';
import {reviewObservation,reviewRevisit} from '../src/reviewRevisit.js';
import {filingSnapshot} from '../src/investmentReview.js';

const report=(revenue=100,quarter=2,receipt='20260814001146')=>({available:true,basis:'연결재무제표',currency:'KRW',interim:{year:2026,quarter,revenue,operatingProfit:10,priorRevenue:80,priorOperatingProfit:8},interimSourceUrl:`https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${receipt}`});
test('Home observations carry questions and limits without claiming a company benefit',()=>{
 const rows=homeChanges({period:'2026-09',summary:{exportYoY:-4},itemPeriod:'2026-08',items:[{key:'semiconductor',exportWeightYoY:2,unitValueYoY:null}]},{tradeDate:'2026-10-02',stocks:[{volumeRatio:3}]});
 assert.equal(rows.length,3);for(const row of rows){assert.ok(row.question);assert.ok(row.limit);}
 assert.equal(rows[0].value,'-4.0%');assert.equal(rows[1].basisDate,'2026-08');assert.match(rows[1].observation,/미제공/);
});
test('compact export observations retain different months and unit-value nulls',()=>{
 const rows=homeChanges({period:'2026-09',summary:{exportYoY:83.5},itemPeriod:'2026-08',items:[{key:'semiconductor',exportYoY:200,exportWeightYoY:61.1,unitValueYoY:null}]});
 assert.match(rows[0].compactObservation,/2026-09.*2026-08.*\+200\.0%/);
 assert.match(rows[1].compactObservation,/2026-08.*단위가치 미제공/);
 assert.equal(rows[1].value,'+61.1%');
});
test('price-basis warnings are an opt-in filter, keep null moves and exact original sorting',()=>{
 const rows=[{symbol:'A',name:'A',change1d:-91.07,volumeRatio:20},{symbol:'B',name:'B',change1d:2,volumeRatio:4},{symbol:'C',name:'C',change1d:null,volumeRatio:3}];
 assert.deepEqual(filterScreener(rows,{sort:'volumeRatio'}).map(x=>x.symbol),['A','B','C']);
 assert.deepEqual(filterScreener(rows,{sort:'volumeRatio',priceBasis:'exclude'}).map(x=>x.symbol),['B','C']);
 assert.deepEqual(filterScreener(rows,{sort:'volumeRatio',priceBasis:'only'}).map(x=>x.symbol),['A']);assert.equal(rows[0].change1d,-91.07);
});
test('revisit compares acknowledged reports, distinguishes corrections, older data and unverified reports',()=>{
 const saved={filing:filingSnapshot(report()),conditions:[]};
 assert.equal(reviewRevisit(saved).kind,'unchecked');
 assert.equal(reviewRevisit({...saved,observation:reviewObservation(saved,report())}).kind,'same');
 assert.equal(reviewRevisit({...saved,observation:reviewObservation(saved,report(120))}).kind,'corrected');
 assert.equal(reviewRevisit({...saved,observation:reviewObservation(saved,report(130,3))}).kind,'new');
 assert.equal(reviewRevisit({...saved,observation:reviewObservation(saved,report(130,1))}).kind,'older');
 assert.equal(reviewRevisit({...saved,observation:reviewObservation(saved,{available:false})}).kind,'unavailable');
 assert.equal(saved.filing.current.revenue,100);
});
test('revisit keeps condition changes and unavailable peers separate from satisfied conditions',()=>{
 const condition={key:'revenueGrowth',label:'매출 증가',baseline:{type:'interim',year:2026,quarter:2,basis:'연결재무제표',currency:'KRW',matched:true,value:25,reference:0,sourceUrls:[report().interimSourceUrl]}};
 let saved={conditions:[condition]};
 assert.equal(reviewRevisit({...saved,observation:reviewObservation(saved,report(60))}).kind,'conditionChanged');
 saved={conditions:[{...condition,peer:{symbol:'000660.KS'}}]};
 assert.equal(reviewRevisit({...saved,observation:reviewObservation(saved,report())}).kind,'unavailable');
});
