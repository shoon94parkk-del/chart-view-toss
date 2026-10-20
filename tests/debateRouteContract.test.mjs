import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveRoute} from '../src/routes.js';

test('debate route and static archive are available without PICK',()=>{
  assert.equal(resolveRoute({hash:'#debates'}).tab,'debates');
  assert.equal(resolveRoute({pathname:'/debates/'}).tab,'debates');
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(main,/data-tab="debates"/);
  assert.match(main,/mountDebateDashboard/);
  const source=readFileSync(new URL('../src/debateDashboard.js',import.meta.url),'utf8');
  assert.match(source,/intelligence_debates_public\.json/);
  assert.match(source,/intelligence_shadow_status\.json/);
});
