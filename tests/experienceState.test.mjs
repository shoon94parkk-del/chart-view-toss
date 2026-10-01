import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encodeSharedView,decodeSharedView,homeBriefState,revenueMixBasis,quoteBasisLabel} from '../src/experienceState.js';
import {formatFinancialAmount,formatDataSource} from '../src/dataPresentation.js';
test('public share round trips selection, dates, peer and screener without private drafts',()=>{
 const state={tab:'chart',selected:['005930.KS','000660.KS'],period:'6mo',customRange:{start:'2025-01-01',end:'2026-01-01'},question:'private',watchlist:[{symbol:'AAPL'}]};
 const result=decodeSharedView(encodeSharedView(state));
 assert.deepEqual(result.selected,state.selected);assert.deepEqual(result.customRange,state.customRange);
 assert.ok(!JSON.stringify(result).includes('private'));assert.ok(!JSON.stringify(result).includes('AAPL'));
 const peer=decodeSharedView(encodeSharedView({tab:'detail',detailSymbol:'005930.KS',researchPeer:{symbol:'000660.KS',name:'SK하이닉스'}}));
 assert.equal(peer.researchPeer.symbol,'000660.KS');
 assert.equal(decodeSharedView('{"tab":"chart","selected":["<script>"]}'),null);
 assert.equal(decodeSharedView('{"tab":"chart","customRange":{"start":"2026-99-99","end":"2027-01-01"}}'),null);
});
test('home summary has separate pending, missing and failure terminal states',()=>{
 assert.equal(homeBriefState(null,{pending:true}).status,'loading');
 assert.equal(homeBriefState({macro:{summary:{}}}).status,'empty');
 assert.equal(homeBriefState(null,{failed:true}).status,'error');
 assert.equal(homeBriefState({macro:{summary:{text:'valid'}}}).status,'ready');
});
test('segment shares above 100 remain visible with an honest verification state',()=>{
 assert.equal(revenueMixBasis({items:[{share:56.3},{share:39},{share:8.9},{share:4.7}]}).status,'unverified');
 const verified=revenueMixBasis({items:[{share:56.3},{share:39},{share:8.9},{share:4.7}],revenueBasis:{totalAmount:333605,positiveSegmentTotal:363321,adjustmentAmount:-29716,reconciled:true,denominator:'공시 연결 매출액'}});
 assert.equal(verified.status,'adjusted');assert.equal(verified.shareSum,108.9);
});
test('money, source and quote labels distinguish observed price from lookup time',()=>{
 assert.match(formatFinancialAmount(724570746220000,'KRW'),/724.57조 원/);
 assert.match(formatFinancialAmount(411558455310,'USD'),/411.56십억 달러/);
 assert.equal(formatFinancialAmount(null,'KRW'),'확인 불가');assert.match(formatFinancialAmount(0,'KRW'),/0원/);
 assert.equal(formatDataSource('Yahoo daily quote cache'),'Yahoo Finance · 일별 저장 자료');
 assert.equal(quoteBasisLabel({priceBasis:'regular_close'}),'정규장 종가');
 assert.equal(quoteBasisLabel({source:'Naver Finance KRX/Koscom'}),'제공처 최신 시세');
 assert.equal(quoteBasisLabel(null),'시세 확인 필요');
});
