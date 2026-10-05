import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = readFileSync(new URL('../src/exportMomentumData.js', import.meta.url), 'utf8');
const view = readFileSync(new URL('../src/exportMomentumView.js', import.meta.url), 'utf8');
const spot = readFileSync(new URL('../src/memorySpotView.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/exportMomentum.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('메모리 가격은 분석의 독립 화면에서만 lazy API로 불러온다',()=>{
  const page=readFileSync(new URL('../src/memoryPriceView.js',import.meta.url),'utf8');
  assert.match(data,/api\('\/api\/memory-prices'/);
  assert.doesNotMatch(view,/mountMemorySpot|memorySpotPlaceholder/);
  assert.match(main,/state.tab==='memory'/);
 assert.match(main,/featureTab=\['discover','picks','exports','memory','gurus'\]/);
  assert.match(page,/mountMemorySpot/);
  assert.match(page,/출처: TrendForce/);
});

test('메모리 가격 화면은 DRAM NAND 계열을 그룹으로 나누고 한 그룹씩 보여준다',()=>{
  assert.match(spot,/DRAM · NAND 가격/);
  assert.match(spot,/GROUP_ORDER=\['dram-chip','nand-chip','nand-wafer','dram-module','gddr'\]/);
  assert.match(spot,/data-memory-price-group/);
  assert.match(spot,/세션 평균/);
  assert.match(spot,/TrendForce 원문 보기/);
  assert.match(styles,/\.memory-price-tabs/);
});

test('공개되지 않은 HBM MCP 가격은 추정하지 않는다고 화면에 명시한다',()=>{
  assert.match(spot,/HBM·MCP처럼 직접 가격이 없는 품목은 추정하지 않습니다/);
  assert.match(spot,/memory-price-unavailable/);
  assert.match(spot,/unavailablePriceSeries/);
});

test('메모리 가격 실패는 독립 재시도를 제공한다',()=>{
  assert.match(spot,/잠시 후 가격 다시 시도를 눌러주세요/);
  assert.match(spot,/data-memory-spot-retry/);
  assert.doesNotMatch(view,/memorySpotCleanup/);
});

test('가격 추세는 별도 heavyweight chart runtime 없이 SVG로 렌더링한다',()=>{
  assert.match(spot,/<svg viewBox=/);
  assert.match(spot,/dram-spot-line/);
  assert.doesNotMatch(spot,/lightweight-charts|loadChartRuntime/);
  assert.match(styles,/\.dram-spot-chart svg/);
});
