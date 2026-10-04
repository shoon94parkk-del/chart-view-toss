import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../src/exportMomentumView.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/exportMomentum.css', import.meta.url), 'utf8');

test('수출 데이터 기본 진입은 전체 요약 탭이며 상세 섹션은 별도 패널이다',()=>{
  assert.match(view,/\['overview','전체 요약'\]/);
  assert.match(view,/\['products','품목'\]/);
  assert.match(view,/\['countries','국가'\]/);
  assert.match(view,/\['semiconductor','반도체'\]/);
  assert.match(view,/\['trend','속보·추세'\]/);
  assert.match(view,/exportPanel\('overview',summary\(snapshot\)\+facts\(snapshot\)\+sources\(snapshot\)\)/);
  assert.match(styles,/\.export-tab-panel\[hidden\]\{display:none\}/);
});

test('기존 세부 분석 기능은 삭제하지 않고 관련 탭으로 이동한다',()=>{
  assert.match(view,/exportPanel\('products',items\(snapshot\)\+breadth\(snapshot\)\+quadrant\(snapshot\)\)/);
  assert.match(view,/exportPanel\('countries',regions\(snapshot\)\)/);
  assert.match(view,/exportPanel\('semiconductor',memorySpotPlaceholder\(\)\+semiconductorReport\(snapshot\)\)/);
  assert.match(view,/exportPanel\('trend',provisionalPlaceholder\(\)\+history\(snapshot\)\+checkpoints\(snapshot\)\)/);
});

test('무거운 반도체 가격과 잠정 레이더는 해당 탭을 열 때만 시작한다',()=>{
  assert.match(view,/panelKey==='semiconductor'&&!memorySpotCleanup/);
  assert.match(view,/panelKey==='trend'&&!provisionalLoaded/);
  assert.doesNotMatch(view,/paint\(host,snapshot,bindNav,openItemDetail\);\s*memorySpotCleanup=mountMemorySpot/);
  assert.doesNotMatch(view,/void loadProvisional\(token,force\);\s*}\s*catch/);
});

test('기존 focus 딥링크는 새 탭으로 매핑된다',()=>{
  assert.match(view,/history:'trend',provisional:'trend'/);
  assert.match(view,/items:'products',breadth:'products',quadrant:'products'/);
  assert.match(view,/countries:'countries',memory:'semiconductor'/);
});
