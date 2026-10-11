import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const view=vm.createContext({});
vm.runInContext(readFileSync(new URL('../src/ideaView.js',import.meta.url),'utf8').replace(/^import[\s\S]*?;\r?\n/gm,'').replaceAll('export ',''),view);

test('IDEA evidence preserves the complete corporate and technical reasons under a compact status',()=>{
 const pick={status:'SELL_REVIEW',monitor:{reason:'기업의 현금흐름과 매출 근거를 다시 확인하세요.',lastReviewedTradeDate:'2026-10-06'},technical:{tradeDate:'2026-10-07',reasons:['거래량 감소','20일선 이탈','장기 추세 재확인']}};
 const html=view.monitorDetailsHtml(pick,{note:'거래량 감소 · 20일선 이탈'});
 assert.ok(html.includes(pick.monitor.reason));
 for(const reason of pick.technical.reasons)assert.ok(html.includes(reason));
 assert.match(html,/기업 근거 검토 2026-10-06/);
 assert.match(html,/가격·거래 기준 2026-10-07/);
});

test('IDEA evidence never replaces an unavailable review date with the selection date',()=>{
 const pick={status:'KEEP',pickDate:'2026-01-02',monitor:{reason:'기업 근거 유지'},technical:{}};
 const html=view.monitorDetailsHtml(pick,{note:pick.monitor.reason});
 assert.match(html,/검토일 미제공/);
 assert.doesNotMatch(html,/2026-01-02/);
});
