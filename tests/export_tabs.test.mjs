import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync(new URL('../src/exportMomentumView.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/exportMomentum.css', import.meta.url), 'utf8');

test('수출 데이터는 공통 탭과 주요 산업 전용 탭으로 구성한다',()=>{
  assert.match(view,/\['overview','전체 요약'\]/);
  assert.match(view,/\['products','품목'\]/);
  assert.match(view,/\['countries','국가'\]/);
  assert.match(view,/\['semiconductor','반도체'\]/);
  assert.match(view,/key:'passenger-car',label:'자동차'/);
  assert.match(view,/key:'petroleum',label:'석유제품'/);
  assert.match(view,/key:'cosmetics',label:'화장품'/);
  assert.match(view,/key:'ships',label:'선박'/);
  assert.match(view,/key:'steel',label:'철강'/);
  assert.match(view,/\.\.\.INDUSTRY_TABS\.map\(row=>\[row\.key,row\.label\]\)/);
  assert.doesNotMatch(view,/\['trend','속보·추세'\]/);
  assert.match(view,/exportPanel\('overview',summary\(snapshot\)\+momentumMapPlaceholder\(\)\+provisionalPlaceholder\(\)\+history\(snapshot\)\+cumulativeSummary\(snapshot\)\+checkpoints\(snapshot\)\+facts\(snapshot\)\+sources\(snapshot\)\)/);
  assert.match(styles,/\.export-tab-panel\[hidden\]\{display:none\}/);
  assert.match(view,/<details class="export-source">/);
});

test('세부 분석은 반도체 특화 흐름과 공통 산업 상세 흐름을 분리한다',()=>{
  assert.match(view,/exportPanel\('products',items\(snapshot\)\+breadth\(snapshot\)\+quadrant\(snapshot\)\)/);
  assert.match(view,/exportPanel\('countries',regions\(snapshot\)\)/);
  assert.match(view,/exportPanel\('semiconductor',[^\n]*semiconductorReport\(snapshot\)\+semiconductorTrendPlaceholder\(\)/);
  assert.match(view,/panelKey==='semiconductor'&&!semiconductorLoaded/);
  assert.match(view,/loadSemiconductorTrends/);
  assert.match(view,/data-export-semi-metric="delta"/);
  assert.match(view,/data-export-semi-metric="yoy"/);
  assert.match(view,/\.\.\.INDUSTRY_TABS\.map\(config=>exportPanel\(config\.key,industryTabPlaceholder\(config\)\)\)/);
  assert.match(view,/industryTabConfig\(panelKey\)&&!industryLoaded\.has\(panelKey\)&&!industryLoading\.has\(panelKey\)/);
  assert.match(view,/loadIndustryAnalysis\(panelKey,token,force\)/);
  assert.match(view,/12개월 수출액/);
  assert.match(view,/어느 시장으로 수출되나/);
  assert.doesNotMatch(view,/exportPanel\('trend'/);
});

test('잠정 레이더는 전체 요약에서 시작하고 반도체 가격은 별도 화면으로 연결한다',()=>{
  assert.doesNotMatch(view,/mountMemorySpot|memorySpotCleanup/);
  assert.match(view,/data-tab="memory"/);
  assert.match(view,/panelKey==='overview'&&!momentumLoaded/);
  assert.match(view,/panelKey==='overview'&&!provisionalLoaded/);
  assert.match(view,/loadExportMomentumMap/);
  assert.doesNotMatch(view,/paint\(host,snapshot,bindNav,openItemDetail\);\s*memorySpotCleanup=mountMemorySpot/);
});

test('기존 추세 focus와 산업 전용 focus가 올바른 탭으로 연결된다',()=>{
  assert.match(view,/industryTabConfig\(key\)\?key:/);
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
