import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ledger=readFileSync(new URL('../src/pickLedger.js',import.meta.url),'utf8');
const ledgerCss=readFileSync(new URL('../src/pickLedger.css',import.meta.url),'utf8');
const api=readFileSync(new URL('../src/api.js',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const home=readFileSync(new URL('../src/homeExtras.js',import.meta.url),'utf8');
const scope=readFileSync(new URL('../src/releaseScope.js',import.meta.url),'utf8');
const ideaView=readFileSync(new URL('../src/ideaView.js',import.meta.url),'utf8');

test('PICK management combines recommendation performance and monitoring',()=>{
  assert.match(api,/pick_monitor\.json/);
  assert.match(ledger,/homeBootstrap, pickMonitor/);
  for(const token of ['선정 기록·성과','누적 추천일','누적 추천','플러스 비율','평균 수익률','유지','경계','매도검토','검토 대기','추천 당시 이유','투자논리 기준선','최근 점검','검증 근거']){
    assert.ok(ledger.includes(token),`missing unified PICK token: ${token}`);
  }
});

test('PICK management keeps review-only sell semantics',()=>{
  assert.ok(ledger.includes('매도검토는 자동 매도 확정이 아니며 가격·차트만으로 판정하지 않아요.'));
  assert.ok(ledger.includes('사용자 확인 필요'));
});

test('recent spotlight restores existing selection and PICK navigation',()=>{
  assert.match(scope,/SHOW_SPOTLIGHT = true/);
  assert.ok(main.includes('SHOW_SPOTLIGHT?`<button class="feature-row" data-tab="picks"'));
  assert.ok(home.includes('if (SHOW_SPOTLIGHT) {'));
  assert.ok(home.includes('선정 기록·성과'));
  assert.ok(main.includes('<strong>선정 기록·성과</strong>'));
  assert.ok(ledger.includes('<h2>선정 기록·성과</h2>'));
  assert.ok(home.includes('성과 요약과 최근 선정 3종목을 바로 확인해요.'));
  assert.ok(home.includes('data-home-extra-route="picks">전체 기록 →</button>'));
});

test('PICK monitoring failure does not blank recommendation performance',()=>{
  assert.match(ledger,/pickMonitor\(\)\.then\(\(value\)=>\(\{ok:true,value\}\)\)\.catch/);
  assert.ok(ledger.includes('사후점검 데이터를 불러오지 못해 성과 기록만 표시 중이에요.'));
});
test('automatic check execution is not presented as completed evidence review',()=>{
 assert.ok(ledger.includes('자동 점검 실행'));
 assert.ok(ledger.includes('근거 검토 대기는 별도 표시'));
 assert.ok(!ledger.includes('검토 완료 ${reviewed}'));
});


test('PICK management does not expose screener rank badges',()=>{
  assert.ok(!ledger.includes('pick-ledger-rank'));
});


test('PICK technical timing alerts stay advisory and visibly separate from fundamental status',()=>{
  for(const token of ['TECH_SELL_REVIEW','TECH_CAUTION','단기 매도 검토','기술 경고','단기 기술 신호','펀더멘털 점검 상태와 별도인 단기 기술 신호예요.','단기 경고 우선']){
    assert.ok(ledger.includes(token),`missing technical alert token: ${token}`);
  }
  assert.ok(ledger.includes('기술 경고만으로 자동 매도 확정하지 않아요.'));
  assert.match(ledgerCss,/pick-ledger-tech-status\.tech-sell/);
  assert.match(ledgerCss,/pick-ledger-tech-alert/);
});


test('pick monitor prefers the static data CDN and does not block IDEA LAB first render',()=>{
  assert.match(api,/pickMonitor=\(\{force=false\}=\{\}\)=>force\?api\([\s\S]*?:staticData\('pick_monitor\.json'/);
  assert.ok(ideaView.includes("const monitorPromise=pickMonitor().catch(()=>null);"));
  assert.ok(ideaView.includes("const [data,companyMeta]=await Promise.all(["));
  assert.ok(ideaView.includes("void monitorPromise.then(payload=>applyMonitorStatuses(host,ideas,payload));"));
});
