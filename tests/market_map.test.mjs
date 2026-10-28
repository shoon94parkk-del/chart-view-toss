import test from 'node:test';
import assert from 'node:assert/strict';
import {marketMapGroups,renderMarketMap} from '../src/marketMapView.js';
import {layoutTreemap} from '../src/heatmapView.js';
import {clearLiveQuotes,rememberLiveQuotes,mergeRowsWithLive} from '../src/liveQuoteStore.js';
import {aggregateSectors} from '../src/sectorHeatmap.js';

const results=[{ticker:'NVDA',market:'US',sector:'Technology',marketCap:400,price:140,change:2,sessionDate:'2026-10-02'},{ticker:'MSFT',market:'US',sector:'Technology',marketCap:200,change:-2},{ticker:'JPM',market:'US',sector:'Financial',marketCap:100,change:0},{ticker:'UNKNOWN',market:'US',marketCap:50,change:1}];
test('grouped map retains classified and unclassified full-universe stocks with their individual changes',()=>{
 const groups=marketMapGroups({results},'US');
 assert.equal(groups.length,3);assert.equal(groups[0].label,'기술');assert.equal(groups[0].weight,600);
 const html=renderMarketMap({results},{market:'US',selected:'기술'});
 assert.equal((html.match(/class="market-map-stock /g)||[]).length,4);
 for(const row of results)assert.match(html,new RegExp('data-stock-detail="'+row.ticker+'"'));
 assert.match(html,/엔비디아.*2026-10-02.*140 달러.*\+2\.00%/s);
 assert.match(html,/map-up-2/);assert.match(html,/map-down-2/);assert.match(html,/분류 미확인/);
 assert.doesNotMatch(html,/data-heatmap-view|data-heatmap-display/);
 assert.ok(html.indexOf('id="market-map-members"')<html.indexOf('class="market-map"'));
 assert.match(html,/기술 종목 목록/);
});
test('sector frame geometry fills the map and remains bounded for highly uneven capitalization',()=>{
 const groups=marketMapGroups({results},'US');
 const cells=layoutTreemap(groups.map(item=>({item,weight:Math.sqrt(item.weight)})),0,0,340,680);
 assert.ok(cells.every(c=>c.x>=0&&c.y>=0&&c.width>0&&c.height>0&&c.x+c.width<=340.001&&c.y+c.height<=680.001));
 assert.ok(Math.abs(cells.reduce((sum,c)=>sum+c.width*c.height,0)-340*680)<.001);
 assert.match(renderMarketMap({results},{market:'US',cached:true}),/저장 시세/);
});
test('observation time is disclosed without inventing a missing trading-session date',()=>{
 const html=renderMarketMap({results:[{...results[0],sessionDate:null,asOf:'2026-10-02T20:20:21+09:00'}]},{market:'US',selected:'기술'});
 assert.match(html,/시세 기준 10\. 2\. 20:20 KST/);assert.doesNotMatch(html,/거래일 2026/);
});

test('grouped map and member list disclose a newer unavailable change while preserving true zero and cap geometry',()=>{
 clearLiveQuotes();
 try{
  const older={ticker:'NVDA',market:'US',sector:'Technology',marketCap:400,price:140,change:3,changePercent:3,sessionDate:'2026-10-07',asOf:'2026-10-07T06:30:00Z'};
  const zero={...older,ticker:'MSFT',marketCap:200,change:0};
  const before=renderMarketMap({results:[older,zero]},{market:'US',selected:'기술'});
  rememberLiveQuotes([older],{priority:20});
  rememberLiveQuotes([{ticker:'NVDA',change:null,asOf:'2026-10-07T06:31:00Z'}],{priority:50});
  const results=mergeRowsWithLive([older,zero]);
  const data={results};
  const html=renderMarketMap(data,{market:'US',selected:'기술'});
  assert.match(html,/data-stock-detail="NVDA"[^>]*aria-label="엔비디아[^"%]*등락률 미제공"[^>]*><strong>NVDA<\/strong><span>—<\/span>/);
  assert.match(html,/data-stock-detail="MSFT"[^>]*aria-label="마이크로소프트 0\.00%"/);
  assert.match(html,/<b[^>]*title="등락률 미제공"[^>]*>—<\/b>/);
  assert.doesNotMatch(html,/\+3\.00%/);
  assert.equal((html.match(/class="market-map-stock /g)||[]).length,2);
  const styles=value=>[...value.matchAll(/style="([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual(styles(html),styles(before));
  assert.equal(marketMapGroups(data,'US')[0].weight,600);
  const sectors=aggregateSectors(data,'US');
  assert.equal(sectors.used,1);assert.equal(sectors.excluded,1);assert.equal(sectors.groups[0].change,0);
 }finally{clearLiveQuotes();}
});
