import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('the full mobile journey uses the production build while early fail-fast checks retain 300ms',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/mobile-release-qa.yml',import.meta.url),'utf8');
 const steps=workflow.split(/^      - /m).slice(1);
 const find=name=>steps.findIndex(step=>step.startsWith(`name: ${name}\n`));
 const short=find('Build preview with short QA timeout');
 const production=find('Build with production request timeout');
 const mobile=find('Run mobile release QA');
 assert.ok(short>=0&&production>short,'retain both existing build modes');
 assert.match(steps[short],/VITE_CHARTVIEW_API_TIMEOUT_MS: '300'/);
 assert.ok(mobile>production,'the mixed layout/data journey must run after the production rebuild');
 assert.equal(steps.filter(step=>step.includes('node tests/mobile_release_qa.mjs')).length,1,'run every original mobile assertion once');
 assert.match(steps[mobile],/if:.*steps\.start-preview\.outcome == 'success'/);
 assert.doesNotMatch(steps[mobile],/VITE_CHARTVIEW_API_TIMEOUT_MS/);
 for(const name of ['Verify core value entries and exact selection records','Verify full sector exploration and refresh failure retention','Verify data views and custom date range']){
  const index=find(name);assert.ok(index>short&&index<production,`${name} keeps the short-budget build`);
 }
});
