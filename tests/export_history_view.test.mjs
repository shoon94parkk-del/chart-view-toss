import { test } from 'node:test';
import assert from 'node:assert/strict';
import { history } from '../src/exportMomentumView.js';
import { normalizeExportSnapshot } from '../src/exportMomentumModel.js';

const render=values=>history(normalizeExportSnapshot({
  history:values.map((exportYoY,index)=>({
    period:`2026-${String(index+1).padStart(2,'0')}`,
    exportsUsdBillion:50+index,
    exportYoY,
  })),
}));

test('export chart leaves gaps for missing YoY without dropping monthly amounts',()=>{
  const html=render([10,20,null,-10,0]);
  assert.equal((html.match(/class="export-combo-dot /g)||[]).length,4);
  assert.equal((html.match(/class="export-combo-column"/g)||[]).length,5);
  const segments=[...html.matchAll(/<polyline points="([^"]*)"/g)].map(match=>match[1]);
  assert.equal(segments.length,2);
  assert.ok(segments[0].startsWith('120.0,'));
  assert.ok(segments[1].startsWith('840.0,'));
  assert.ok(!segments.some(points=>points.includes('600.0,')));
  assert.match(html,/증가율 미제공 월/);
});

test('all-missing YoY keeps amount bars but draws no invented points or lines',()=>{
  const html=render([null,undefined,'']);
  assert.equal((html.match(/class="export-combo-column"/g)||[]).length,3);
  assert.doesNotMatch(html,/<polyline|class="export-combo-dot /);
  assert.match(html,/증가율 미제공 월/);
});

test('actual zero and negative YoY remain connected observations',()=>{
  const html=render([0,-10,10]);
  assert.equal((html.match(/class="export-combo-dot /g)||[]).length,3);
  assert.equal((html.match(/<polyline/g)||[]).length,1);
  assert.doesNotMatch(html,/증가율 미제공 월/);
});
