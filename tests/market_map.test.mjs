import test from 'node:test';
import assert from 'node:assert/strict';
import {marketMapGroups,renderMarketMap} from '../src/marketMapView.js';
import {layoutTreemap} from '../src/heatmapView.js';

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
