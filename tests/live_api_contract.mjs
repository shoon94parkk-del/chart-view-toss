const BASE = (process.env.VITE_CHARTVIEW_API_BASE || 'https://chart-view-pkv8.onrender.com').replace(/\/$/, '');

async function get(path, timeoutMs = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(BASE + path, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`${path} -> HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const health = await get('/health');
assert(health && typeof health === 'object', 'health response missing');

const quotes = await get('/api/quotes?tickers=AAPL%2C005930.KS');
assert(Array.isArray(quotes.results) && quotes.results.length >= 1, 'quote results missing');
assert(quotes.dataContract?.currency, 'quote currency contract missing');
assert(quotes.results.every((row) => row.price == null || Number.isFinite(Number(row.price))), 'invalid quote price');

const compare = await get('/api/compare?tickers=AAPL%2C005930.KS&period=1mo');
assert(Array.isArray(compare.stocks) && compare.stocks.length >= 1, 'compare stocks missing');
assert(compare.comparisonBasis?.currencyMode?.includes('no FX conversion'), 'compare currency basis missing');
assert(compare.comparisonBasis?.missingObservationPolicy?.includes('no interpolation'), 'compare missing-value basis missing');

const macro = await get('/api/macro');
assert(Array.isArray(macro.results) && macro.results.length >= 1, 'macro rows missing');
assert(macro.dataContract?.observedAt, 'macro observation contract missing');
assert(macro.results.some((row) => row.unit && row.observedAt), 'macro unit/observation metadata missing');

console.log('Live backend contract smoke passed', {
  base: BASE,
  quoteCount: quotes.results.length,
  compareCount: compare.stocks.length,
  macroCount: macro.results.length,
});
