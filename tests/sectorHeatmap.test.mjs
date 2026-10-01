import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregateSectors, sectorForRow} from '../src/sectorHeatmap.js';
import {alignHeatmapQuotes} from '../src/heatmapAlignment.js';
import {clearLiveQuotes,rememberLiveQuotes} from '../src/liveQuoteStore.js';

const row=(ticker,change,marketCap,extra={})=>({ticker,market:'US',sector:'Technology',change,marketCap,sessionDate:'2026-10-01',...extra});
test('sectors weight actual covered market caps and count members once',()=>{
 const data=aggregateSectors({results:[row('A',2,300),row('B',-2,100),row('A',2,300)]},'US');
 assert.equal(data.groups[0].change,1);assert.equal(data.groups[0].count,2);assert.equal(data.groups[0].cap,400);
});
test('missing, stale and mismatched sessions are excluded rather than shown as zero',()=>{
 const data=aggregateSectors({results:[row('A',2,100),row('B',null,100),row('C',9,100,{stale:true}),row('D',5,50,{sessionDate:'2026-09-30'}),row('E',1,0)]},'US');
 assert.equal(data.groups[0].change,2);assert.equal(data.excluded,4);assert.equal(data.session,'2026-10-01');
});
test('markets stay separate, unknown classification excluded, diversified memory makers align',()=>{
 assert.equal(sectorForRow({market:'KR',industry:'통신 및 방송 장비 제조업',mainProducts:'메모리 반도체 제품'}),'반도체');
 assert.equal(sectorForRow({market:'KR',industry:'반도체 제조업',mainProducts:'DRAM NAND'}),'반도체');
 assert.equal(sectorForRow({market:'KR',industry:'컴퓨터 프로그래밍, 시스템 통합 및 관리업'}),'인터넷·SW');
 assert.equal(sectorForRow({market:'KR',industry:'기타 전문 도매업'}),'상사·유통');
 const data=aggregateSectors({results:[row('A',2,100),row('005930.KS',3,200,{market:'KR'}),row('Z',4,100,{sector:null})]},'US');
 assert.equal(data.groups[0].count,1);assert.equal(data.excluded,1);
});
test('new full quotes cannot roll back to older Home observations',()=>{
 clearLiveQuotes();
 rememberLiveQuotes([row('A',-8,100,{asOf:'2026-09-30T07:00:00Z',sessionDate:'2026-09-30'})],{priority:20});
 const payload=alignHeatmapQuotes({results:[row('A',5,100,{asOf:'2026-10-01T07:00:00Z'})]});
 assert.equal(payload.results[0].change,5);assert.equal(payload.results[0].sessionDate,'2026-10-01');
 clearLiveQuotes();
});
