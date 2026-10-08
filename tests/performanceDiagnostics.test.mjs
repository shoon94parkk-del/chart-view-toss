import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('performance audit applies its actual wait budget as Playwright options', async () => {
  const source = readFileSync(new URL('./production_performance_audit.mjs', import.meta.url), 'utf8');
  const fn = source.slice(source.indexOf('async function waitReady('), source.indexOf('function apiSummary('));
  const waitReady = runInNewContext(`${fn}\nwaitReady;`, { TIMEOUT: 17, performance, round: Math.round });
  let actualBudget;
  const result = await waitReady({ waitForFunction: async (_fn, _arg, options = {}) => {
    actualBudget = options.timeout ?? 30_000;
    // A never-ready condition must be classified as timeout under its chosen
    // budget, not silently use Playwright's unrelated 30s default.
    throw new Error('condition never ready');
  } }, { ready: () => false });
  assert.equal(actualBudget, 17);
  assert.equal(result.state, 'timeout');
});

test('detail-stage workflow applies each stage budget instead of passing it to the page', async () => {
  const source = readFileSync(new URL('../.github/workflows/major-detail-stage-timing.yml', import.meta.url), 'utf8');
  const fn = source.match(/const mark=async\(key,fn,timeout=15000\)=>\{[\s\S]*?\n\s*\};/)[0];
  const marks = {};
  let actualBudget;
  const mark = runInNewContext(`${fn}\nmark;`, { marks, start: performance.now(), performance, round: Math.round,
    page: { waitForFunction: async (_fn, _arg, options = {}) => {
      actualBudget = options.timeout ?? 30_000;
      throw new Error('stage unavailable');
    } },
  });
  await mark('quote', () => false, 5);
  assert.equal(actualBudget, 5);
  assert.equal(marks.quote, null);
});
