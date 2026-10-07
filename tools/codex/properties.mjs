import assert from 'node:assert/strict';
import fc from 'fast-check';
import { estimateRevision, filterScreener } from '../../src/analysisData.js';
import { selectionCardMarkup } from '../../src/valueDiscovery.js';

// Pin seed for repeatable diagnostics. fast-check prints seed/path and shrinks
// failures; reproduce a new failure before adding it to the required test suite.
const parameters = { seed: 20261007, numRuns: 1000 };
const price = fc.integer({ min: 1, max: 1_000_000_000 });
fc.assert(fc.property(price, current => {
  assert.equal(estimateRevision(current, current), 0);
}), parameters);
fc.assert(fc.property(price, price, fc.integer({ min: 1, max: 100 }), (current, previous, scale) => {
  // A unit conversion must not change percentage performance.
  assert.ok(Math.abs(estimateRevision(current, previous) - estimateRevision(current * scale, previous * scale)) <= Math.max(1e-9, Math.abs(estimateRevision(current, previous)) * 1e-12));
}), parameters);
fc.assert(fc.property(fc.array(fc.record({ name: fc.string(), symbol: fc.string(), market: fc.constantFrom('KR', 'US'), rsi14: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }) }), { maxLength: 50 }), rows => {
  const original = JSON.stringify(rows);
  const result = filterScreener(rows, { market: 'KR', rsiMin: '30', rsiMax: '70' });
  assert.ok(result.every(row => row.market === 'KR' && row.rsi14 !== null && row.rsi14 >= 30 && row.rsi14 <= 70));
  assert.equal(JSON.stringify(rows), original, 'filtering/sorting must not mutate provider response');
}), parameters);
fc.assert(fc.property(fc.constantFrom(null, undefined, '', ' ', NaN, Infinity, -Infinity), returnPct => {
  const markup = selectionCardMarkup({ code: '005930', name: '삼성전자', returnPct });
  assert.ok(!markup.includes('0.00%'), 'missing performance must not become a real zero');
  assert.ok(!markup.includes('NaN%') && !markup.includes('Infinity%'));
}), parameters);
assert.match(selectionCardMarkup({ code: '005930', name: '삼성전자', returnPct: 0 }), /0\.00%/);
console.log('4 properties × 1,000 generated cases passed; real-zero display passed (seed 20261007).');
