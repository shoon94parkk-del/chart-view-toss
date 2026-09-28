import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ledger=readFileSync(new URL('../src/pickLedger.js',import.meta.url),'utf8');
const api=readFileSync(new URL('../src/api.js',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const home=readFileSync(new URL('../src/homeExtras.js',import.meta.url),'utf8');
const scope=readFileSync(new URL('../src/releaseScope.js',import.meta.url),'utf8');

test('PICK management combines recommendation performance and monitoring',()=>{
  assert.match(api,/pick_monitor\.json/);
  assert.match(ledger,/homeBootstrap, pickMonitor/);
  for(const token of ['PICK 관리','누적 추천일','누적 추천','플러스 비율','평균 수익률','유지','경계','매도검토','검토 대기','추천 당시 이유','투자논리 기준선','최근 점검','검증 근거']){
    assert.ok(ledger.includes(token),`missing unified PICK token: ${token}`);
  }
});

test('PICK management keeps review-only sell semantics',()=>{
  assert.ok(ledger.includes('매도검토는 자동 매도 확정이 아니며 가격·차트만으로 판정하지 않아요.'));
  assert.ok(ledger.includes('사용자 확인 필요'));
});

test('PICK source is preserved but Toss release scope hides its navigation',()=>{
  assert.match(scope,/TOSS_RECOMMENDATIONS_ALLOWED = false/);
  assert.ok(main.includes('TOSS_RECOMMENDATIONS_ALLOWED?`<button class="feature-row" data-tab="picks"'));
  assert.ok(home.includes('if (TOSS_RECOMMENDATIONS_ALLOWED) {'));
  assert.ok(home.includes('data-home-extra-route="picks">PICK 관리</button>'));
});

test('PICK monitoring failure does not blank recommendation performance',()=>{
  assert.match(ledger,/pickMonitor\(\)\.then\(\(value\)=>\(\{ok:true,value\}\)\)\.catch/);
  assert.ok(ledger.includes('사후점검 데이터를 불러오지 못해 성과 기록만 표시 중이에요.'));
});


test('PICK management does not expose screener rank badges',()=>{
  assert.ok(!ledger.includes('pick-ledger-rank'));
});
