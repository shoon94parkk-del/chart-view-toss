import { test } from 'node:test';
import assert from 'node:assert/strict';
import { macroSparklineSvg } from '../src/dataPresentation.js';

const path=html=>html.match(/<path d="([^"]+)"/)?.[1]||'';
const render=values=>macroSparklineSvg(values.map((value,index)=>({time:`2026-09-${String(index+1).padStart(2,'0')}`,value})),true);

test('macro sparkline requires two real observations, not fabricated missing zeroes',()=>{
 for(const missing of [null,undefined,'',' ','N/A',NaN,Infinity,-Infinity]){
   assert.equal(render([missing,.45]),'');
   assert.equal(render([missing,missing]),'');
 }
 assert.equal(macroSparklineSvg(null,true),'');
 assert.equal(render([]),'');
});

test('macro sparkline preserves source positions and breaks its line at missing observations',()=>{
 const d=path(render([1,2,null,3,4]));
 assert.equal((d.match(/M/g)||[]).length,2);
 assert.equal((d.match(/L/g)||[]).length,2);
 assert.match(d,/^M0\.00,/);
 assert.match(d,/ L25\.00,/);
 assert.match(d,/ M75\.00,/);
 assert.match(d,/ L100\.00,/);
 assert.doesNotMatch(d,/50\.00,/);
 const endpoints=path(render([null,1,2,null]));
 assert.match(endpoints,/^M33\.33,/);
 assert.match(endpoints,/ L66\.67,/);
 assert.equal((path(render([1,null,2])).match(/L/g)||[]).length,0);
});

test('macro sparkline keeps actual zero, numeric-string zero, negative values, colors and original geometry',()=>{
 assert.equal(path(render([0,1])),path(render(['0',1])));
 assert.match(path(render([0,1])),/^M0\.00,32\.79 L100\.00,5\.21$/);
 assert.match(path(render([0,0])),/^M0\.00,19\.00 L100\.00,19\.00$/);
 assert.equal((path(render([-1,0,1])).match(/L/g)||[]).length,2);
 assert.match(render([0,1]),/var\(--macro-up,#e54855\)/);
 assert.match(macroSparklineSvg([{value:1},{value:0}],false),/var\(--macro-down,#3182f6\)/);
});

test('macro sparkline leaves provider rows and dates unchanged',()=>{
 const rows=Object.freeze([Object.freeze({time:'2026-09-01',value:'0'}),Object.freeze({time:'2026-09-02',value:null}),Object.freeze({time:'2026-09-03',value:-1})]);
 const before=JSON.stringify(rows);
 assert.ok(macroSparklineSvg(rows,true));
 assert.equal(JSON.stringify(rows),before);
});

test('isolated macro observations remain visible as source-positioned dots without invented connections',()=>{
 const html=render([1,null,2]);
 assert.equal((html.match(/<circle /g)||[]).length,2);
 assert.match(html,/<circle cx="0\.00" cy="32\.79" r="1\.5"/);
 assert.match(html,/<circle cx="100\.00" cy="5\.21" r="1\.5"/);
 assert.equal((path(html).match(/L/g)||[]).length,0);
 assert.doesNotMatch(render([1,2,3]),/<circle /);
 const mixed=render([1,null,2,3]);
 assert.equal((mixed.match(/<circle /g)||[]).length,1);
 assert.equal((path(mixed).match(/L/g)||[]).length,1);
});
