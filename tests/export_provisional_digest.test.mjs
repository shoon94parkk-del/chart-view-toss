import assert from 'node:assert/strict';
import test from 'node:test';
import {renderProvisionalDigest} from '../src/exportProvisionalDigest.js';

const radar={
  period:'2026-10',periodLabel:'2026년 10월',latestStage:10,latestStageLabel:'1~10일',
  businessDays:{stage:10,current:5,previousMonth:8,priorYear:3},
  checkpoints:[{stage:10,total:{exportsUsdBillion:20,priorYearUsdBillion:10,previousMonthUsdBillion:25,exportYoY:100,exportMoM:-20},
    semiconductor:{exportsUsdBillion:10,priorYearUsdBillion:5,previousMonthUsdBillion:12.5,exportYoY:100,exportMoM:-20}}],
  items:[{key:'semiconductor',name:'반도체',exportsUsdBillion:10,priorYearUsdBillion:5,
    previousMonthUsdBillion:12.5,exportYoY:100,exportMoM:-20}],
  meta:{cacheStatus:'fresh'},
};

test('provisional digest defaults to the verified raw percentages in export overview',()=>{
  const html=renderProvisionalDigest(radar);
  assert.match(html,/2026년 10월 10일 기준/);
  assert.match(html,/5영업일/);
  assert.match(html,/8영업일/);
  assert.match(html,/3영업일/);
  assert.match(html,/영업일 보정 OFF/);
  assert.match(html,/aria-pressed="false"/);
  assert.match(html,/\-20\.0%/);
  assert.match(html,/관세청 10대 대분류/);
  assert.doesNotMatch(html,/DRAM.*\+485/);
});

test('workday switch changes both growth columns without mutating source rates',()=>{
  const html=renderProvisionalDigest(radar,{adjusted:true});
  assert.match(html,/영업일 보정 ON/);
  assert.match(html,/aria-pressed="true"/);
  // 10/5 versus 12.5/8 => +28%; 10/5 versus 5/3 => +20%
  assert.match(html,/\+28\.0%/);
  assert.match(html,/\+20\.0%/);
  assert.equal(radar.items[0].exportMoM,-20);
});

test('missing holiday counts safely disable adjusted presentation',()=>{
  const html=renderProvisionalDigest({...radar,businessDays:null},{adjusted:true});
  assert.match(html,/영업일 수를 확인할 수 없어/);
  assert.match(html,/data-export-workday-toggle aria-pressed="false" disabled/);
  assert.match(html,/\-20\.0%/);
});

test('stale API responses and period are explicitly disclosed',()=>{
  const html=renderProvisionalDigest({...radar,period:'2026-09',meta:{cacheStatus:'stale-error'}});
  assert.match(html,/2026년 9월 10일/);
  assert.match(html,/갱신 실패/);
});
