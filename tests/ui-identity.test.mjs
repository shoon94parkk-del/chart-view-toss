import test from 'node:test';
import assert from 'node:assert/strict';
import {uiIcon,surfaceIdentity} from '../src/uiIdentity.js';
import {valueEntriesMarkup} from '../src/valueDiscovery.js';
test('purpose graphics stay decorative and core tools retain readable labels and destinations',()=>{
 const html=valueEntriesMarkup();
 for(const label of ['수출 데이터','조건별 종목 찾기','선정 기록·성과'])assert.ok(html.includes(label));
 for(const route of ['exports','discover','picks'])assert.ok(html.includes(`data-feature-route="${route}"`));
 assert.equal((html.match(/focusable="false"/g)||[]).length,3);
 assert.equal((html.match(/<svg/g)||[]).length,3);
 assert.ok(html.includes('data-feature-target="volume-surge"'));
});
test('hidden selection scope has no decorative or actionable record entry',()=>{
 const html=valueEntriesMarkup(false);
 assert.ok(!html.includes('data-feature-route="picks"'));
 assert.equal((html.match(/<svg/g)||[]).length,2);
});
test('tool identity separates export analysis from past records and comparison',()=>{
 assert.equal(surfaceIdentity('exports').icon,'exports');
 assert.equal(surfaceIdentity('discover').icon,'filter');
 assert.equal(surfaceIdentity('picks').icon,'ledger');
 assert.equal(surfaceIdentity('more').icon,'analysis');
 assert.equal(new Set(['exports','picks','chart','watch'].map(route=>surfaceIdentity(route).tone)).size,4);
 assert.match(surfaceIdentity('picks').label,/과거.*기록/);
 assert.match(surfaceIdentity('consensus').label,/연간/);
 assert.notEqual(uiIcon('exports'),uiIcon('filter'));
 assert.notEqual(uiIcon('filter'),uiIcon('ledger'));
});
