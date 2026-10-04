import test from 'node:test';
import assert from 'node:assert/strict';
import { recentSelections, selectionCardMarkup, selectionKey } from '../src/valueDiscovery.js';
import {resolveRoute} from '../src/routes.js';
import {renderSharedHeatmap,HOME_STOCK_META} from '../src/heatmapView.js';
test('recent selection uses the exact date and code, not another thesis for the same company',()=>{
 const payload={day:{tradeDate:'2026-10-02',top3:[{symbol:'005930.KS',name:'삼성전자'}]},recommendations:[{symbol:'005930.KS',recommendedDate:'2026-09-01',reason:'old'},{code:'005930',symbol:'005930.KS',recommendedDate:'2026-10-02',reason:'real <reason>',returnPct:null}]};
 const [row]=recentSelections(payload);assert.equal(row.reason,'real <reason>');assert.equal(row.key,'2026-10-02:005930');assert.equal(row.returnPct,null);
 const html=selectionCardMarkup(row);assert.ok(html.includes('real &lt;reason&gt;'));assert.ok(html.includes('선정 근거·점검 보기'));assert.ok(html.includes('data-feature-target="2026-10-02:005930"'));assert.ok(!html.includes('유지'));assert.equal(selectionKey({pickDate:'2026-10-02',code:'005930'}),row.key);
});
test('missing reason remains explicitly unavailable',()=>{assert.match(recentSelections({day:{top3:[{symbol:'NVDA'}]}})[0].reason,/아직 제공되지/);});
test('feature entry parameters round-trip and malformed targets cannot open another record',()=>{
 for(const [path,key,value] of [['discover/volume-surge','screenerPreset','volume-surge'],['picks/2026-10-02%3A005930','pickFocusKey','2026-10-02:005930'],['exports/memory','exportFocus','memory']])assert.equal(resolveRoute({hash:'#'+path})[key],value);
 assert.equal(resolveRoute({hash:'#picks/wrong:005930'}).pickFocusKey,null);assert.equal(resolveRoute({hash:'#discover/unknown'}).screenerPreset,null);assert.equal(resolveRoute({hash:'#exports'}).exportFocus,null);
});
test('six-cell preview keeps collected input intact and full scope remains wider',()=>{
 const rows=Object.keys(HOME_STOCK_META).map((ticker,i)=>({ticker,marketCap:100-i,change:i/10}));const original=JSON.stringify(rows);
 const preview=renderSharedHeatmap({results:rows},{market:'KR',limit:6});assert.equal((preview.match(/data-stock-detail=/g)||[]).length,12);assert.match(preview,/한국 대표 6종목 미리보기/);assert.match(preview,/market-us" hidden/);
 const full=renderSharedHeatmap({results:rows},{scope:'full'});assert.equal((full.match(/data-stock-detail=/g)||[]).length,rows.length);assert.equal(JSON.stringify(rows),original);
});
