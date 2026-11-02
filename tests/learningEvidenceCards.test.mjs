import test from 'node:test';
import assert from 'node:assert/strict';
import {revenueEvidenceHtml,financialEvidenceHtml,companyPhotoHtml,peerEvidenceHtml,adaptiveReviewHtml,mountLearningEvidence} from '../src/learningEvidenceCards.js';

test('DART revenue mix uses only verified percentages, fiscal year and source',()=>{
 const h=revenueEvidenceHtml({available:true,basis:'제품별 매출',reportYear:2025,reportName:'2025년 사업보고서',rceptDate:'20260331',sourceUrl:'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=123',items:[{name:'화장품',share:83.6},{name:'기기',share:16.4},{name:'악성<script>',share:999}]});
 assert.match(h,/83.6%/);assert.match(h,/제품별 매출/);assert.match(h,/2025/);
 assert.doesNotMatch(h,/999%/);assert.doesNotMatch(h,/<script>/);
 assert.match(h,/dart.fss.or.kr/);
 assert.match(revenueEvidenceHtml({available:false}),/추정 비중은 표시하지 않습니다/);
});
test('annual DART chart never guesses missing years, values or source',()=>{
 const h=financialEvidenceHtml({available:true,basis:'연결재무제표',currency:'KRW',annual:[{year:2024,revenue:10000000000,operatingProfit:500000000},{year:2025,revenue:15000000000,operatingProfit:900000000}],annualSourceUrl:'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=123'});
 assert.match(h,/2024년/);assert.match(h,/150억 원/);assert.match(h,/9억 원/);
 assert.match(h,/연결재무제표/);
 assert.doesNotMatch(h,/2023년/);
 assert.match(financialEvidenceHtml({available:false}),/숫자를 임의로 만들지 않습니다/);
});
test('peer comparison requires same fiscal year, basis and currency',()=>{
 const first={basis:'연결재무제표',currency:'KRW',annual:[{year:2025,revenue:10000000000,operatingProfit:1200000000}]};
 const second={basis:'연결재무제표',currency:'KRW',annual:[{year:2025,revenue:12000000000,operatingProfit:1000000000}]};
 assert.match(peerEvidenceHtml({current:first,other:second,currentName:'A',otherName:'B'}),/12.0%/);
 assert.match(peerEvidenceHtml({current:first,other:{...second,basis:'별도재무제표'},currentName:'A',otherName:'B'}),/비교를 표시하지 않습니다/);
 const older={...first,annual:[{year:2024,revenue:9000000000,operatingProfit:900000000},{year:2025,revenue:10000000000,operatingProfit:1200000000}]};
 const onlyOld={...second,annual:[{year:2024,revenue:8000000000,operatingProfit:800000000}]};
 assert.match(peerEvidenceHtml({current:older,other:onlyOld,currentName:'A',otherName:'B'}),/2024년/);
 assert.match(peerEvidenceHtml({current:first,other:{...second,annual:[{year:2024,revenue:10000000000,operatingProfit:100000000}]},currentName:'A',otherName:'B'}),/비교를 표시하지 않습니다/);
});
test('only explicit approved image rights allow a real company picture',()=>{
 const no=companyPhotoHtml({imageUrl:'https://example.com/photo.png',mainProducts:'공식 자료 확인'},'기업');
 assert.doesNotMatch(no,/<img/);
 assert.match(no,/재사용 권한이 확인된 자산이 없습니다/);
 const yes=companyPhotoHtml({imageUrl:'https://example.com/photo.png',imageLicense:'licensed',mainProducts:'라면 & 식품'},'기업');
 assert.match(yes,/<img/);assert.match(yes,/라면 &amp; 식품/);
 const attack=companyPhotoHtml({imageUrl:'javascript:alert(1)',imageLicense:'licensed'},'기업');
 assert.doesNotMatch(attack,/<img/);
});
test('actual wrong answers generate concept remediation but no invented score',()=>{
 const h=adaptiveReviewHtml({attempts:[{sessionId:'s',submittedAt:'2026-11-02',wrongAnswers:[{concept:'사업 구조',prompt:'고객은?',explanation:'사업보고서를 확인'}]}]}, {id:'s'},{});
 assert.match(h,/실제 오답 1개/);assert.match(h,/고객은/);assert.match(h,/사업보고서를 확인/);
 assert.doesNotMatch(h,/100점/);
 assert.match(adaptiveReviewHtml({attempts:[]},{id:'s'},{}),/퀴즈를 제출하면/);
});
test('non-Korean tickers are not sent to domestic DART endpoints',async()=>{
 const host={isConnected:true,querySelector:()=>null,querySelectorAll:()=>[]};
 let called=false;
 await mountLearningEvidence(host,{companies:[{symbol:'AAPL',name:'Apple'}]},null,{attempts:[]},null,{loadBusiness:()=>{called=true;},loadFinancial:()=>{called=true;},loadContext:()=>{called=true;}});
 assert.equal(called,false);
});
