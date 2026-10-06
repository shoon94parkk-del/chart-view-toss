import test from 'node:test';
import assert from 'node:assert/strict';
import {exportCompanyCandidates} from '../src/insightModel.js';

const metadata={
  source:'KRX 주요제품',
  updated:'2026-10-05',
  companies:[
    {symbol:'005930.KS',name:'삼성전자',industry:'반도체 제조업',mainProducts:'DRAM, NAND'},
    {symbol:'000660.KS',name:'SK하이닉스',industry:'반도체 제조업',mainProducts:'DRAM, NAND, MCP'},
    {symbol:'123456.KQ',name:'장비회사',industry:'반도체 장비',mainProducts:'DRAM 검사장비, 반도체 테스트 장비'},
    {symbol:'654321.KQ',name:'시스템칩',industry:'반도체 제조업',mainProducts:'시스템반도체 제품'},
  ],
};

test('semiconductor company candidates prefer exact segment product evidence',()=>{
  const flash=exportCompanyCandidates('semiconductor',metadata,'flash');
  assert.equal(flash[0].matchScope,'segment');
  assert.match(flash[0].productEvidence,/NAND/i);
  assert.ok(flash.every(row=>row.name!=='장비회사'));

  const mcp=exportCompanyCandidates('semiconductor',metadata,'mcp-memory');
  assert.equal(mcp[0].name,'SK하이닉스');
  assert.match(mcp[0].productEvidence,/MCP/i);
});

test('company candidates remain evidence candidates rather than equipment keyword matches',()=>{
  const logic=exportCompanyCandidates('semiconductor',metadata,'processor-controller');
  assert.ok(logic.some(row=>row.name==='시스템칩'));
  assert.ok(logic.every(row=>row.name!=='장비회사'));
  assert.deepEqual(exportCompanyCandidates('passenger-car',metadata,'dram'),[]);
});
