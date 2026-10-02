import test from 'node:test';
import assert from 'node:assert/strict';
import { prioritizeStocks, resolvedSelectorName, lookupSelectorName, formatSelectedStockLabel, isVerifiableSearchRow } from '../src/stockSelector.js';

test('favorite stocks come first in saved order and duplicate search hits collapse',()=>{
 const favorites=[{symbol:'000660.KS'},{symbol:'005930.KS'}];
 const rows=[
  {symbol:'AAPL',name:'Apple'},
  {symbol:'005930.KS',name:'삼성전자'},
  {symbol:'000660.KS',name:'SK하이닉스'},
  {symbol:'005930.KS',name:'삼성전자'},
 ];
 assert.deepEqual(prioritizeStocks(rows,favorites).map(row=>row.symbol),['000660.KS','005930.KS','AAPL']);
});

test('selected ticker chips use company name instead of duplicating ticker',async()=>{
 assert.equal(resolvedSelectorName('MU','MU'),'');
 assert.equal(resolvedSelectorName('Micron Technology','MU'),'Micron Technology');
 const name=await lookupSelectorName('204620.KQ',async()=>({
  results:[
   {symbol:'204620.KQ',name:'글로벌텍스프리'},
   {symbol:'204620.KS',name:'다른회사'},
  ],
 }));
 assert.equal(name,'글로벌텍스프리');
 assert.equal(formatSelectedStockLabel('Micron Technology','MU'),'Micron Technology (MU)');
 assert.equal(formatSelectedStockLabel('글로벌텍스프리','204620.KQ'),'글로벌텍스프리 (204620.KQ)');
 assert.equal(formatSelectedStockLabel('MU','MU'),'MU');
});

test('unverified DIRECT echoes are excluded from search results',()=>{
 // ZZZZZZ 같은 무효 입력: 백엔드가 티커 그대로를 DIRECT로 에코 → 제외
 assert.equal(isVerifiableSearchRow({symbol:'ZZZZZZ',name:'ZZZZZZ',type:'DIRECT'}),false);
 // 검증된 종목명이 있으면 DIRECT라도 유지
 assert.equal(isVerifiableSearchRow({symbol:'ABC',name:'에이비씨',type:'DIRECT'}),true);
 // 정상 결과는 유지
 assert.equal(isVerifiableSearchRow({symbol:'NVDA',name:'NVIDIA',type:'LOCAL'}),true);
 assert.equal(isVerifiableSearchRow({symbol:'005930.KS',name:'삼성전자',type:'KRX'}),true);
});
