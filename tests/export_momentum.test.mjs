import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chartExtent,
  chartPct,
  checkpointProgress,
  exportDriverLabel,
  formatPp,
  formatSignedPct,
  formatUnitValue,
  formatUsdBillion,
  formatWeightKg,
  normalizeExportItemDetail,
  normalizeExportSnapshot,
  semiconductorShare,
  tradeBalanceLabel,
  yoyLabel,
  zeroPct,
} from '../src/exportMomentumModel.js';

const fixture={
  period:'2026-09',
  summary:{exportsUsdBillion:120.94,exportYoY:83.5},
  checkpoints:[
    {label:'1~10일',exportsUsdBillion:34.973,exportYoY:82.6},
    {label:'1~20일',exportsUsdBillion:71.409,exportYoY:78.3},
    {label:'월 전체',exportsUsdBillion:120.94,exportYoY:83.5},
  ],
  items:[{key:'semiconductor',name:'반도체',exportsUsdBillion:60.3,exportYoY:262.8,exportWeightKg:12000000,exportWeightYoY:15,unitValueUsdPerKg:5025,unitValueYoY:215,importsUsdBillion:8.5,importYoY:11,importWeightKg:3200000,tradeBalanceUsdBillion:51.8}],
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

test('weight and implied unit value helpers stay explicit about their units',()=>{
  assert.equal(formatWeightKg(12_500_000),'1.3만톤');
  assert.equal(formatUnitValue(12.34),'$12.3/kg');
  assert.equal(exportDriverLabel({exportWeightYoY:8,unitValueYoY:12}),'물량·단가 동반 증가');
  assert.equal(exportDriverLabel({exportYoY:14,exportWeightYoY:-5,unitValueYoY:20}),'단가 상승 영향 우세');
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


test('chart helpers keep zero axis stable across positive and negative growth',()=>{
  const extent=chartExtent([262.8,72,31,-5]);
  assert.equal(extent.min,-5);
  assert.equal(extent.max,262.8);
  assert.ok(zeroPct(extent)>1&&zeroPct(extent)<2);
  assert.equal(chartPct(262.8,extent),100);
  assert.equal(chartPct(-5,extent),0);
});

test('detail periods are preserved and prevent cross-month semiconductor share',()=>{
  const value=normalizeExportSnapshot({
    ...fixture,
    itemPeriod:'2026-08',
    regionPeriod:'2026-08',
  });
  assert.equal(value.itemPeriod,'2026-08');
  assert.equal(value.regionPeriod,'2026-08');
  assert.equal(semiconductorShare(value),null);
});

test('history is optional now and normalized for the future API contract',()=>{
  const value=normalizeExportSnapshot({...fixture,history:[
    {period:'2026-08',exportsUsdBillion:70,exportYoY:10},
    {period:'2026-09',exportsUsdBillion:120.94,exportYoY:83.5},
  ]});
  assert.equal(value.history.length,2);
  assert.equal(value.history[1].period,'2026-09');
  assert.equal(value.history[1].exportsUsdBillion,120.94);
});


test('item drilldown normalizes 12-month trade and country breakdown',()=>{
  const detail=normalizeExportItemDetail({
    key:'semiconductor',
    name:'반도체',
    period:'2026-08',
    history:[
      {period:'2026-07',exportsUsdBillion:12,exportWeightKg:5000000,unitValueUsdPerKg:2400,importsUsdBillion:7,tradeBalanceUsdBillion:5},
      {period:'2026-08',exportsUsdBillion:14,exportWeightKg:5200000,unitValueUsdPerKg:2692.3,importsUsdBillion:8,tradeBalanceUsdBillion:6},
    ],
    countries:[{name:'미국',code:'US',exportsUsdBillion:3.2,sharePct:22.9}],
  });
  assert.equal(detail.history.length,2);
  assert.equal(detail.history[1].unitValueUsdPerKg,2692.3);
  assert.equal(detail.countries[0].sharePct,22.9);
});

test('main item contract keeps imports and trade balance separate from exports',()=>{
  const value=normalizeExportSnapshot(fixture);
  const semi=value.items[0];
  assert.equal(semi.key,'semiconductor');
  assert.equal(semi.importsUsdBillion,8.5);
  assert.equal(semi.importYoY,11);
  assert.equal(semi.tradeBalanceUsdBillion,51.8);
});


test('breadth contract keeps HS2 growth counts and movers',()=>{
  const value=normalizeExportSnapshot({
    ...fixture,
    breadth:{
      period:'2026-08',level:'HS2',comparableCount:80,risingCount:52,fallingCount:26,flatCount:2,
      risingBreadthPct:65,risingExportSharePct:72.4,netChangeUsdBillion:6.2,
      topPositive:[{code:'85',name:'전기기기',exportsUsdBillion:20,priorExportsUsdBillion:15,deltaUsdBillion:5,exportYoY:33.3,sharePct:30}],
      topNegative:[{code:'87',name:'자동차',exportsUsdBillion:5,priorExportsUsdBillion:6,deltaUsdBillion:-1,exportYoY:-16.7,sharePct:7.5}],
    },
  });
  assert.equal(value.breadth.risingCount,52);
  assert.equal(value.breadth.topPositive[0].code,'85');
  assert.equal(value.breadth.topNegative[0].deltaUsdBillion,-1);
});

test('item detail momentum preserves 3-month averages acceleration and phases',()=>{
  const detail=normalizeExportItemDetail({
    key:'semiconductor',name:'반도체',period:'2026-08',
    history:[{period:'2026-08',exportsUsdBillion:14}],
    momentum:{
      exports:{avg3mYoY:20,previous3mYoY:12,accelerationPp:8,label:'증가세 강화'},
      volume:{avg3mYoY:5,previous3mYoY:2,accelerationPp:3,label:'증가세 강화'},
      unitValue:{avg3mYoY:14,previous3mYoY:10,accelerationPp:4,label:'증가세 강화'},
      latestPhase:'물량↑·단위가치↑',
      phaseHistory:[{period:'2026-08',phase:'물량↑·단위가치↑',volumeYoY:5,unitValueYoY:14}],
    },
  });
  assert.equal(detail.momentum.exports.accelerationPp,8);
  assert.equal(detail.momentum.latestPhase,'물량↑·단위가치↑');
  assert.equal(detail.momentum.phaseHistory.length,1);
  assert.equal(formatPp(8),'+8.0%p');
});


test('semiconductor detail keeps official HSK subgroup labels without inventing HBM or NAND-only data',()=>{
  const detail=normalizeExportItemDetail({
    key:'semiconductor',
    name:'반도체',
    period:'2026-08',
    history:[{period:'2026-08',exportsUsdBillion:14}],
    semiconductorBreakdown:[
      {
        key:'dram',name:'DRAM',code:'8542321010',group:'memory',
        note:'HSK 8542321010 · HBM은 별도 HSK 코드가 없어 독립 집계 불가',
        period:'2026-08',exportsUsdBillion:8,exportYoY:25,
        history:[{period:'2026-08',exportsUsdBillion:8,exportYoY:25}],
      },
      {
        key:'flash',name:'Flash memory',code:'8542321030',group:'memory',
        note:'HSK 8542321030 · NAND/NOR 등을 포함하는 Flash memory 분류',
        period:'2026-08',exportsUsdBillion:3,exportYoY:8,
        history:[{period:'2026-08',exportsUsdBillion:3,exportYoY:8}],
      },
    ],
  });
  assert.equal(detail.semiconductorBreakdown.length,2);
  assert.equal(detail.semiconductorBreakdown[0].code,'8542321010');
  assert.ok(detail.semiconductorBreakdown[0].note.includes('HBM'));
  assert.equal(detail.semiconductorBreakdown[1].name,'Flash memory');
  assert.ok(detail.semiconductorBreakdown[1].note.includes('NAND/NOR'));
});


test('semiconductor report keeps YoY MoM unit-value and official MCP/module codes',()=>{
  const snapshot=normalizeExportSnapshot({
    ...fixture,
    semiconductorBreakdown:[
      {key:'memory-total',name:'메모리 IC',code:'854232',group:'memory',period:'2026-08',exportsUsdBillion:20,exportYoY:100,exportMoM:10,unitValueUsdPerKg:5000,unitValueYoY:80,unitValueMoM:-5},
      {key:'dram',name:'DRAM',code:'8542321010',group:'memory',period:'2026-08',exportsUsdBillion:10,exportYoY:120,exportMoM:6,unitValueUsdPerKg:6000,unitValueYoY:90,unitValueMoM:-8},
      {key:'flash',name:'Flash memory',code:'8542321030',group:'memory',period:'2026-08',exportsUsdBillion:4,exportYoY:70,exportMoM:12,unitValueUsdPerKg:4500,unitValueYoY:60,unitValueMoM:-10},
      {key:'mcp-memory',name:'MCP',code:'8542323000',group:'memory',period:'2026-08',exportsUsdBillion:6,exportYoY:55,exportMoM:20,unitValueUsdPerKg:7000,unitValueYoY:40,unitValueMoM:3},
      {key:'dram-module',name:'DRAM 모듈',code:'8473304060',group:'module',period:'2026-08',exportsUsdBillion:3,exportYoY:65,exportMoM:25,unitValueUsdPerKg:3500,unitValueYoY:50,unitValueMoM:15},
    ],
  });
  assert.equal(snapshot.semiconductorBreakdown.length,5);
  const mcp=snapshot.semiconductorBreakdown.find(row=>row.key==='mcp-memory');
  const module=snapshot.semiconductorBreakdown.find(row=>row.key==='dram-module');
  assert.equal(mcp.code,'8542323000');
  assert.equal(mcp.exportMoM,20);
  assert.equal(module.code,'8473304060');
  assert.equal(module.unitValueMoM,15);
});
