import test from 'node:test';
import assert from 'node:assert/strict';
import {externalLinkTarget} from '../src/externalLinks.js';
import {rangeError,requestedRangeNote,ideaDisclosureKey} from '../src/auditExperience.js';
import {encodeSharedView,decodeSharedView,quoteBasisLabel} from '../src/experienceState.js';
test('verified publisher upgrades keep exact article path; unknown HTTP and unsafe schemes stay rejected',()=>{
 assert.equal(externalLinkTarget('http://www.yonhapnewstv.co.kr/news/test?q=1').url,'https://www.yonhapnewstv.co.kr/news/test?q=1');
 assert.ok(externalLinkTarget('http://www.yonhapnewstv.co.kr.evil.test/news').error);
 for(const u of ['http://unknown.test/article','javascript:alert(1)','https://user:pass@example.com','http://www.newsdream.kr:8000'])assert.ok(externalLinkTarget(u).error);
 assert.equal(externalLinkTarget('https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260101000001').url,'https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260101000001');
});
test('a corrected date submission clears the previous error, without rejecting one-day ranges',()=>{
 assert.ok(rangeError({start:'2026-10-05',end:'2026-10-01'}));
 assert.equal(rangeError({start:'2026-10-01',end:'2026-10-01'}),'');
 assert.ok(rangeError({start:'2026-02-30',end:'2026-03-01'}));
 assert.match(requestedRangeNote({start:'2026-09-01',end:'2026-10-01'}),/2026-10-01.*실제 관측/);
});
test('idea disclosure identity follows the pattern and company, not the changing row index',()=>{
 assert.notEqual(ideaDisclosureKey('growth','005930.KS','industry'),ideaDisclosureKey('growth','000660.KS','industry'));
 assert.notEqual(ideaDisclosureKey('growth','005930.KS','industry'),ideaDisclosureKey('trend','005930.KS','industry'));
});
test('market-only heatmap shares exclude private visit state',()=>{
 const shared=decodeSharedView(encodeSharedView({tab:'heatmap',heatmap:{market:'US',selected:'기술'},question:'private',watchlist:['AAPL']}));
 assert.equal(shared.heatmap.market,'US');assert.equal(shared.heatmap.selected,'기술');
 assert.equal(shared.question,undefined);assert.equal(shared.watchlist,undefined);
 assert.equal(decodeSharedView('{"tab":"heatmap","heatmap":{"market":"bad"}}'),null);
});
test('provider_latest stays latest even if a legacy payload claims a regular session',()=>{
 assert.equal(quoteBasisLabel({priceBasis:'provider_latest',sessionType:'regular'}),'제공처 최신 시세');
 assert.equal(quoteBasisLabel({priceBasis:'regular_close'}),'정규장 종가');
});

import {actionStatus} from '../src/pickLedger.js';
test('user-confirmed EXIT survives every later technical warning',()=>{
 for(const signal of ['TECH_NORMAL','TECH_CAUTION','TECH_SELL_REVIEW'])assert.equal(actionStatus({monitor:{status:'EXIT',technical:{signal}}}),'EXIT');
 assert.equal(actionStatus({monitor:{status:'KEEP',technical:{signal:'TECH_SELL_REVIEW'}}}),'SELL_REVIEW');
});
