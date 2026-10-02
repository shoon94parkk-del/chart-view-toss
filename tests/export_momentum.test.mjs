import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkpointProgress,
  formatSignedPct,
  formatUsdBillion,
  normalizeExportSnapshot,
  semiconductorShare,
  yoyLabel,
} from '../src/exportMomentumModel.js';

const fixture={
  period:'2026-09',
  summary:{exportsUsdBillion:120.94,exportYoY:83.5},
  checkpoints:[
    {label:'1~10일',exportsUsdBillion:34.973,exportYoY:82.6},
    {label:'1~20일',exportsUsdBillion:71.409,exportYoY:78.3},
    {label:'월 전체',exportsUsdBillion:120.94,exportYoY:83.5},
  ],
  items:[{name:'반도체',exportsUsdBillion:60.3,exportYoY:262.8}],
};

test('export snapshot normalizes official numeric fields without inventing missing values',()=>{
  const value=normalizeExportSnapshot({...fixture,items:[...fixture.items,{name:'자동차',exportYoY:-5,exportsUsdBillion:null}]});
  assert.equal(value.period,'2026-09');
  assert.equal(value.summary.exportsUsdBillion,120.94);
  assert.equal(value.items[1].exportsUsdBillion,null);
  assert.equal(value.items[1].exportYoY,-5);
});

test('display helpers preserve Korean export units and signed growth',()=>{
  assert.equal(formatUsdBillion(120.94),'1,209.4억달러');
  assert.equal(formatUsdBillion(60.3),'603억달러');
  assert.equal(formatSignedPct(83.5),'+83.5%');
  assert.equal(formatSignedPct(-5),'-5.0%');
});

test('checkpoint progress is bounded against the completed month',()=>{
  const value=normalizeExportSnapshot(fixture);
  const rows=checkpointProgress(value);
  assert.equal(rows.at(-1).progress,100);
  assert.ok(rows[0].progress>28&&rows[0].progress<30);
  assert.ok(rows[1].progress>59&&rows[1].progress<60);
});

test('semiconductor share and labels are descriptive, not investment scores',()=>{
  const value=normalizeExportSnapshot(fixture);
  assert.ok(Math.abs(semiconductorShare(value)-49.86)<0.05);
  assert.equal(yoyLabel(262.8),'전년비 급증');
  assert.equal(yoyLabel(-5),'전년비 약세');
});
