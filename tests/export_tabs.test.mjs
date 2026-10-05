import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../src/exportMomentumView.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/exportMomentum.css', import.meta.url), 'utf8');

test('수출 데이터는 전체 요약 중심 4개 탭으로 구성한다',()=>{
  assert.match(view,/\['overview','전체 요약'\]/);
  assert.match(view,/\['products','품목'\]/);
  assert.match(view,/\['countries','국가'\]/);
  assert.match(view,/\['semiconductor','반도체'\]/);
  assert.doesNotMatch(view,/\['trend','속보·추세'\]/);
  assert.match(view,/exportPanel\('overview',summary\(snapshot\)\+provisionalPlaceholder\(\)\+history\(snapshot\)\+cumulativeSummary\(snapshot\)\+checkpoints\(snapshot\)\+facts\(snapshot\)\+sources\(snapshot\)\)/);
  assert.match(styles,/\.export-tab-panel\[hidden\]\{display:none\}/);
  assert.match(view,/<details class="export-source">/);
});

test('세부 분석은 품목 국가 반도체 탭으로 유지한다',()=>{
  assert.match(view,/exportPanel\('products',items\(snapshot\)\+breadth\(snapshot\)\+quadrant\(snapshot\)\)/);
  assert.match(view,/exportPanel\('countries',regions\(snapshot\)\)/);
  assert.match(view,/exportPanel\('semiconductor',memorySpotPlaceholder\(\)\+semiconductorReport\(snapshot\)\)/);
  assert.doesNotMatch(view,/exportPanel\('trend'/);
});

test('잠정 레이더는 전체 요약이 열릴 때 비동기로 시작하고 반도체 가격은 반도체 탭에서 시작한다',()=>{
  assert.match(view,/panelKey==='semiconductor'&&!memorySpotCleanup/);
  assert.match(view,/panelKey==='overview'&&!provisionalLoaded/);
  assert.doesNotMatch(view,/paint\(host,snapshot,bindNav,openItemDetail\);\s*memorySpotCleanup=mountMemorySpot/);
});

test('기존 추세 focus 딥링크는 전체 요약으로 연결된다',()=>{
  assert.match(view,/history:'overview',provisional:'overview'/);
  assert.match(view,/items:'products',breadth:'products',quadrant:'products'/);
  assert.match(view,/countries:'countries',memory:'semiconductor'/);
});

test('월말 착지 추정 UI는 제거하고 공식 잠정·실적 흐름만 표시한다',()=>{
  assert.doesNotMatch(view,/renderLandingProjection/);
  assert.doesNotMatch(view,/월말 착지 범위/);
  assert.doesNotMatch(view,/추정 vs 실제 마감/);
  assert.doesNotMatch(view,/export-landing-card/);
  assert.match(view,/10일 단위 잠정 수출 레이더/);
  assert.match(view,/월별 수출액과 증가율/);
});
