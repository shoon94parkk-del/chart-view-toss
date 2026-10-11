import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {finiteNumber} from '../src/analysisData.js';

// Evaluate the view's pure formatting/validation helpers without browser imports.
const source=fs.readFileSync(new URL('../src/analysisViews.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
const view=vm.createContext({finiteNumber,alignHeatmapQuotes:null});vm.runInContext(source,view);

test('collapsed filter values distinguish bounds, zero, negative returns and selection labels',()=>{
 assert.equal(typeof view.screenerConditionSummary,'function');
 assert.equal(view.screenerConditionSummary({query:'삼성전자',market:'KOSPI',rsiMin:'0',rsiMax:'55',volumeMin:'2.5',ret20Min:'-10',valueMin:'100',trend:'above20',signal:'macdBullish',priceBasis:'exclude'}),'삼성전자 · KOSPI · RSI 0~55 · 거래량 ≥2.5배 · 20일 ≥-10% · 거래대금 ≥100억원 · 20일선 위 · MACD 강세 · 가격 기준 확인 제외');
 assert.equal(view.screenerConditionSummary({rsiMax:'30'}),'RSI ≤30');
 assert.equal(view.screenerConditionSummary({rsiMin:'55'}),'RSI ≥55');
 assert.equal(view.screenerConditionSummary({query:'',sort:'name'}),'');
});

test('range errors identify both reversed RSI inputs without rejecting true zero or negative returns',()=>{
 assert.equal(typeof view.screenerRangeErrors,'function');
 assert.deepEqual({...view.screenerRangeErrors({rsiMin:'70',rsiMax:'30'})},{rsiMin:'RSI 하한은 상한 이하로 입력해주세요.',rsiMax:'RSI 상한은 하한 이상으로 입력해주세요.'});
 assert.deepEqual({...view.screenerRangeErrors({rsiMin:'0',rsiMax:'100',ret20Min:'-20',volumeMin:'0',valueMin:'0'})},{});
 assert.deepEqual(Object.keys(view.screenerRangeErrors({rsiMax:'101',volumeMin:'-1',valueMin:'-2'})),['rsiMax','volumeMin','valueMin']);
});
