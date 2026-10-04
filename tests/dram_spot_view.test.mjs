import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = readFileSync(new URL('../src/exportMomentumData.js', import.meta.url), 'utf8');
const view = readFileSync(new URL('../src/exportMomentumView.js', import.meta.url), 'utf8');
const spot = readFileSync(new URL('../src/memorySpotView.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/exportMomentum.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('DRAM 현물가는 수출 메모리 화면에서만 lazy API로 불러온다',()=>{
  assert.match(data,/api\('\/api\/memory-spot'/);
  assert.match(view,/memorySpotPlaceholder/);
  assert.match(view,/mountMemorySpot\(host\.querySelector\('#export-memory-spot'\)/);
  assert.match(view,/memory:'#export-memory-spot'/);
  assert.doesNotMatch(main,/memory-spot/);
});

test('DRAM 현물가 화면은 가격·기준일·출처와 자체 누적 기준을 노출한다',()=>{
  assert.match(spot,/DRAM 현물가/);
  assert.match(spot,/세션 평균/);
  assert.match(spot,/당일 고저가/);
  assert.match(spot,/TrendForce 공개 최신 가격표/);
  assert.match(spot,/과거 유료 가격 이력은 가져오지 않으며/);
  assert.match(spot,/data-external-url/);
});

test('DRAM 현물가 실패는 기존 수출 화면을 대체하지 않고 독립 재시도를 제공한다',()=>{
  assert.match(spot,/기존 수출 데이터는 계속 이용할 수 있습니다/);
  assert.match(spot,/data-memory-spot-retry/);
  assert.match(view,/memorySpotCleanup/);
});

test('현물가 추세는 별도 heavyweight chart runtime 없이 SVG로 렌더링한다',()=>{
  assert.match(spot,/<svg viewBox=/);
  assert.match(spot,/dram-spot-line/);
  assert.doesNotMatch(spot,/lightweight-charts|loadChartRuntime/);
  assert.match(styles,/\.dram-spot-chart svg/);
  assert.match(styles,/@media\(max-width:360px\)/);
});
