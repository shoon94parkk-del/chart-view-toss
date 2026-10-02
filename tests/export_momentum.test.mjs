import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkpointProgress,
  formatSignedPct,
  formatUsdBillion,
  normalizeExportSnapshot,
  semiconductorShare,
  tradeBalanceLabel,
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

test('checkpoint progress follows calendar coverage rather than future export totals',()=>{
  const value=normalizeExportSnapshot({
    ...fixture,
    checkpoints:[
      {...fixture.checkpoints[0],endDate:'2026-09-10'},
      {...fixture.checkpoints[1],endDate:'2026-09-20'},
      {...fixture.checkpoints[2],endDate:'2026-09-30'},
    ],
  });
  const rows=checkpointProgress(value);
  assert.ok(rows[0].progress>33&&rows[0].progress<34);
  assert.ok(rows[1].progress>66&&rows[1].progress<67);
  assert.equal(rows.at(-1).progress,100);
});

test('semiconductor share and labels are descriptive, not investment scores',()=>{
  const value=normalizeExportSnapshot(fixture);
  assert.ok(Math.abs(semiconductorShare(value)-49.86)<0.05);
  assert.equal(yoyLabel(262.8),'전년비 급증');
  assert.equal(yoyLabel(-5),'전년비 약세');
  assert.equal(tradeBalanceLabel(49.85),'흑자');
  assert.equal(tradeBalanceLabel(-2.1),'적자');
});
