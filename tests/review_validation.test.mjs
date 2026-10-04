import test from 'node:test';
import assert from 'node:assert/strict';
import {searchAlias,verifiedSearchRows} from '../src/searchIdentity.js';
import {marketCapHtml,metricBasis} from '../src/detailPresentation.js';
import {detailReviewHtml} from '../src/detailReviewSummary.js';
import {formatMacroValue,changeBasisLabel} from '../src/dataPresentation.js';
import {renderSharedHeatmap} from '../src/heatmapView.js';

test('direct ticker guesses need an actual positive quote; missing values never establish a listing',async()=>{
 const rows=['MU','ZZZZZZ','ZERO','NEG','NAN'].map(symbol=>({symbol,name:symbol,type:'DIRECT'}));
 const result=await verifiedSearchRows(rows,async()=>({results:[{ticker:'MU',name:'Micron Technology',price:110,currency:'USD'},{ticker:'ZERO',price:0},{ticker:'NEG',price:-1},{ticker:'NAN',price:'oops'}]}));
 assert.deepEqual(result.map(row=>[row.symbol,row.name]),[['MU','Micron Technology']]);
 await assert.rejects(verifiedSearchRows(rows,async()=>{throw new Error('provider unavailable');}),/unavailable/);
});
test('verified company rows remain searchable without additional provider requests',async()=>{
 const rows=[{symbol:'AMD',name:'AMD',type:'EQUITY'},{symbol:'067310.KQ',name:'하나마이크론',type:'KRX'}];
 assert.deepEqual(await verifiedSearchRows(rows,()=>{throw new Error('unexpected quote request');}),rows);
 assert.equal(searchAlias('마이크론'),'MU');assert.equal(searchAlias('Micron Technology'),'MU');
 assert.equal(searchAlias('하나마이크론'),'');assert.equal(searchAlias('마이크론 관련주'),'');
});
test('cap values retain currency and independent source time, without replacing it with quote time',()=>{
 const html=marketCapHtml({marketCap:2e15,currency:'KRW',fieldMeta:{marketCap:{source:'Cap provider',asOf:'2026-09-30T10:00:00+09:00',period:'latest available'}}});
 assert.match(html,/2,000조 0억원/);assert.match(html,/Cap provider/);assert.match(html,/09\. 30/);
 assert.match(marketCapHtml({marketCap:5e12,currency:'USD'}),/\$5,000B/);
 assert.match(marketCapHtml({marketCap:1e9,currency:'CAD'}),/CAD/);
 assert.doesNotMatch(marketCapHtml({marketCap:1e9,currency:'CAD'}),/\$/);
 for(const marketCap of [null,undefined,0,-1,'oops'])assert.match(marketCapHtml({marketCap}),/확인 불가/);
 assert.match(metricBasis({period:'TTM',source:'DART'}),/자료 기준시각 미제공/);
 assert.match(metricBasis({period:'provider forward period (not independently verified)'}),/미검증/);
});
test('detail reuses exact dated PICK matching and separate fundamental/technical status, without inventing an untracked signal',()=>{
 const rec={symbol:'005930.KS',code:'005930',recommendedDate:'2026-09-25',returnPct:0,lastUpdatedTradeDate:'2026-10-02'};
 const bootstrap={recommendations:[rec]};
 const monitor={picks:[{pickId:'2026-09-25:005930',monitor:{status:'KEEP'},technical:{score:70,signal:'TECH_SELL_REVIEW',rsi14:76}}]};
 const html=detailReviewHtml(rec.symbol,bootstrap,monitor,null);
 assert.match(html,/기업 근거 · 유지/);assert.match(html,/강한 기술 경고/);assert.doesNotMatch(html,/기업 근거 재점검/);
 assert.match(detailReviewHtml(rec.symbol,bootstrap,monitor,null),/0\.00%/);
 assert.match(detailReviewHtml(rec.symbol,bootstrap,{picks:[{...monitor.picks[0],pickId:'2026-09-24:005930'}]},null),/검토 대기/);
 assert.match(detailReviewHtml('ZZZZZZ',bootstrap,monitor,null),/선정 기록이 없는/);
 assert.doesNotMatch(detailReviewHtml('ZZZZZZ',bootstrap,monitor,null),/🟢 유지|🔴 매도검토/);
});
test('stored heatmap prices are disclosed before freshness revalidation',()=>{
 const html=renderSharedHeatmap({generatedAt:'2026-09-01',results:[{ticker:'005930.KS',price:1,marketCap:100,change:0}]},{cached:true});
 assert.match(html,/이전 저장 시세 · 새 시세 확인 중/);
 assert.doesNotMatch(renderSharedHeatmap({results:[{ticker:'005930.KS',marketCap:100,change:0}]}),/이전 저장 시세/);
});
test('policy and effective interest rates retain percent units and readable change bases',()=>{
 assert.equal(formatMacroValue({symbol:'FEDTARGET',value:3.88}),'3.88%');
 assert.equal(formatMacroValue({symbol:'DFF',value:0}),'0%');
 assert.equal(changeBasisLabel('previous FOMC target change'),'직전 FOMC 목표금리 변경 대비');
});
