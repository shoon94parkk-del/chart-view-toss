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


const industryMetadata={
  source:'KRX 주요제품',
  updated:'2026-10-06',
  companies:[
    {symbol:'111111.KS',name:'완성차A',industry:'자동차 제조업',mainProducts:'승용차, SUV'},
    {symbol:'111112.KQ',name:'자동차부품A',industry:'자동차 부품',mainProducts:'자동차 부품, 시트 모듈'},
    {symbol:'222221.KS',name:'정유A',industry:'석유 정제품 제조업',mainProducts:'휘발유, 경유, 항공유'},
    {symbol:'222222.KQ',name:'석유화학A',industry:'석유화학',mainProducts:'석유화학 제품, 합성수지'},
    {symbol:'333331.KS',name:'화장품A',industry:'화장품 제조업',mainProducts:'기초화장품, 색조화장품'},
    {symbol:'333332.KQ',name:'화장품용기A',industry:'포장재',mainProducts:'화장품 용기, 포장재'},
    {symbol:'444441.KS',name:'조선A',industry:'선박 건조업',mainProducts:'LNG선, 컨테이너선'},
    {symbol:'444442.KQ',name:'조선기자재A',industry:'선박 기자재',mainProducts:'선박 기자재, 엔진 부품'},
    {symbol:'555551.KS',name:'철강A',industry:'제철 및 제강업',mainProducts:'열연강판, 냉연강판, 후판'},
    {symbol:'555552.KQ',name:'강관A',industry:'강관 제조업',mainProducts:'강관, 파이프'},
  ],
};

test('industry export candidates require direct product evidence and reject adjacent businesses',()=>{
  assert.deepEqual(exportCompanyCandidates('passenger-car',industryMetadata).map(row=>row.name),['완성차A']);
  assert.deepEqual(exportCompanyCandidates('petroleum',industryMetadata).map(row=>row.name),['정유A']);
  assert.deepEqual(exportCompanyCandidates('cosmetics',industryMetadata).map(row=>row.name),['화장품A']);
  assert.deepEqual(exportCompanyCandidates('ships',industryMetadata).map(row=>row.name),['조선A']);
  assert.deepEqual(exportCompanyCandidates('steel',industryMetadata).map(row=>row.name),['철강A']);
});

test('industry export candidates remain classification evidence, not beneficiary claims',()=>{
  for(const key of ['passenger-car','petroleum','cosmetics','ships','steel']){
    const rows=exportCompanyCandidates(key,industryMetadata);
    assert.ok(rows.length>0);
    assert.ok(rows.every(row=>row.matchScope==='industry'));
    assert.ok(rows.every(row=>row.source==='KRX 주요제품'));
    assert.ok(rows.every(row=>row.basisDate==='2026-10-06'));
  }
});
