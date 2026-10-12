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

test('provisional item actions retain native button semantics inside table cells',()=>{
  const html=renderProvisionalDigest({...radar,items:[
    radar.items[0],
    {...radar.items[0],key:'wireless',name:'무선통신기기'},
  ]});
  assert.match(html,/<div role="cell"><button type="button" class="export-digest-item-link" data-export-item="semiconductor">반도체 /);
  assert.doesNotMatch(html,/<button[^>]*role="cell"/);
  assert.match(html,/<strong role="cell">무선통신기기<\/strong>/);
});

test('digest labels follow the actual latest cumulative stage, including first ten days',()=>{
  for(const [stage,label,period,endDay] of [
    [10,'1~10일','2026-10',10],
    [20,'1~20일','2026-10',20],
    [30,'월 전체','2026-09',30],
    [30,'월 전체','2028-02',29],
  ]){
    const html=renderProvisionalDigest({...radar,period,latestStage:stage,latestStageLabel:label,businessDays:null});
    assert.ok(html.includes('관세청 잠정 수출 · '+label));
    assert.ok(html.includes(Number(period.slice(5))+'월 '+endDay+'일 기준'));
    assert.ok(html.includes('매월 같은 1~'+(stage===30?'말일':stage)+'일 구간 비교'));
  }
});

test('supplied calendar business-day basis is distinguished from official operating-day growth',()=>{
  const html=renderProvisionalDigest({...radar,businessDays:{...radar.businessDays,
    basis:'calendar weekdays excluding KR statutory/substitute holidays',
  }},{adjusted:true});
  assert.match(html,/영업일 수 기준: 주말·공휴일 제외 달력 기준/);
  assert.match(html,/관세청 공식 조업일수·일평균 증가율과 다를 수 있습니다/);
  assert.match(html,/\+20\.0%/);
  assert.match(html,/\+28\.0%/);
});
