import test from 'node:test';
import assert from 'node:assert/strict';
const view=await import('../src/releaseReading.js').catch(()=>({}));

test('source timing never presents collection as an official publication or revision',()=>{
 const html=view.sourceTimingHtml?.({observedAt:'2026-09',collectedAt:'2026-10-16T01:00:00Z'});
 assert.match(html||'',/관측 기준.*2026.09/s);
 assert.match(html||'',/공식 발표.*미제공/s);
 assert.match(html||'',/자료 수집.*10. 16/s);
 assert.match(html||'',/마지막 확인.*미제공/s);
 assert.match(html||'',/수정 여부.*미확인/s);
});
test('compact estimate source stays visible and identifies the forecast fiscal-period end',()=>{
 const html=view.sourceTimingHtml?.({sourceSummary:'Yahoo <source> · 10. 02. 15:00 KST 수집',observedAt:'2026-12-31',observedLabel:'추정 회계기간 종료',collectedAt:'2026-10-02T06:00:00Z'});
 const summary=html?.match(/<summary>(.*?)<\/summary>/s)?.[1];
 assert.match(summary||'',/analysis-meta.*Yahoo &lt;source&gt;.*KST 수집/s);
 assert.match(summary||'',/자료 기준/);
 assert.match(html||'',/추정 회계기간 종료.*2026.12.31/s);
 assert.match(html||'',/공식 발표.*미제공/s);
});
test('a research continuation is available only after a usable report and preserves the current form',()=>{
 assert.equal(view.researchContinuationHtml?.({available:false}),'');
 const html=view.researchContinuationHtml?.({available:true});
 assert.match(html||'',/data-return-research/);
 assert.match(html||'',/공시 비교 이어가기/);
 assert.doesNotMatch(html||'',/data-tab=|data-stock-detail=|매수|매도/);
});
test('official calls stay distinct from result publications and unknown comparisons',()=>{
 const payload={events:[{symbol:'AAPL',name:'Apple',eventType:'earnings_call',timingRole:'conference_call',scheduledAt:'2026-11-02T22:00:00Z',timezone:'America/New_York',source:{url:'https://investor.apple.com/investor-relations/default.aspx',checkedAt:'2026-10-16T01:00:00Z'}}],coverage:{trackedSymbols:['AAPL','NVDA'],missing:[{symbol:'NVDA',reason:'no_upcoming_verified_call'}]}};
 const html=view.earningsCallsHtml?.(payload,['AAPL','NVDA'],{now:Date.parse('2026-10-16T02:00:00Z')});
 assert.match(html||'',/콘퍼런스콜/);
 assert.match(html||'',/11. 03.*07:00.*KST/s);
 assert.match(html||'',/실적 발표 시각과 다를 수/);
 assert.match(html||'',/NVDA.*확인된 공식 일정 없음/s);
 assert.match(html||'',/발표 전 예상치/);
 assert.doesNotMatch(html||'',/상승 확률|서프라이즈 \+/);
});
test('past, stale, malformed or untrusted call rows cannot become upcoming events',()=>{
 const base={symbol:'AAPL',name:'Apple',eventType:'earnings_call',timingRole:'conference_call',scheduledAt:'2026-11-02T22:00:00Z',source:{url:'https://investor.apple.com/investor-relations/default.aspx',checkedAt:'2026-10-16T01:00:00Z'}};
 for(const bad of [{...base,scheduledAt:'2026-10-01T00:00:00Z'},{...base,scheduledAt:'2026-11-02'},{...base,source:{...base.source,checkedAt:'2026-09-01T00:00:00Z'}},{...base,eventType:'results'},{...base,source:{...base.source,url:'javascript:alert(1)'}}]){
  const html=view.earningsCallsHtml?.({events:[bad]},['AAPL'],{now:Date.parse('2026-10-16T02:00:00Z')});
  assert.match(html||'',/확인된 공식 일정 없음/);
  assert.doesNotMatch(html||'',/data-earnings-call/);
 }
});
