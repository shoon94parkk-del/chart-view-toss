import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const data = readFileSync(new URL('../src/exportMomentumData.js', import.meta.url), 'utf8');
const view = readFileSync(new URL('../src/exportMomentumView.js', import.meta.url), 'utf8');
const spot = readFileSync(new URL('../src/memorySpotView.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/exportMomentum.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('메모리 가격은 반도체 탭에서만 lazy API로 불러온다',()=>{
  assert.match(data,/api\('\/api\/memory-prices'/);
  assert.match(view,/exportPanel\('semiconductor',memorySpotPlaceholder\(\)\+semiconductorReport\(snapshot\)\)/);
  assert.match(view,/panelKey==='semiconductor'&&!memorySpotCleanup/);
  assert.match(view,/mountMemorySpot\(host\.querySelector\('#export-memory-spot'\)/);
  assert.doesNotMatch(main,/memory-prices/);
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

test('메모리 가격 실패는 관세청 수출 화면을 대체하지 않고 독립 재시도를 제공한다',()=>{
  assert.match(spot,/관세청 수출 데이터는 계속 이용할 수 있습니다/);
  assert.match(spot,/data-memory-spot-retry/);
  assert.match(view,/memorySpotCleanup/);
});

test('가격 추세는 별도 heavyweight chart runtime 없이 SVG로 렌더링한다',()=>{
  assert.match(spot,/<svg viewBox=/);
  assert.match(spot,/dram-spot-line/);
  assert.doesNotMatch(spot,/lightweight-charts|loadChartRuntime/);
  assert.match(styles,/\.dram-spot-chart svg/);
});
