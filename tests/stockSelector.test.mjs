import test from 'node:test';
import assert from 'node:assert/strict';
import { prioritizeStocks } from '../src/stockSelector.js';

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
