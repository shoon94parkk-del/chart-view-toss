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

const exportsSnapshot = await get('/api/export-momentum', 45000);
assert(Number(exportsSnapshot.schemaVersion) >= 4, 'export schema v4 missing');
assert(Array.isArray(exportsSnapshot.items) && exportsSnapshot.items.length >= 1, 'export item rows missing');
assert(exportsSnapshot.itemPeriod, 'export item period missing');
assert(
  exportsSnapshot.items.some((row) => Number(row.exportWeightKg) > 0),
  'official export weight is missing'
);
assert(
  exportsSnapshot.items.some((row) => Number(row.unitValueUsdPerKg) > 0 && Number.isFinite(Number(row.unitValueYoY))),
  'derived export unit value is missing'
);

assert(exportsSnapshot.breadth?.level === 'HS2', 'export HS2 breadth missing');
assert(Number(exportsSnapshot.breadth?.comparableCount) > 20, 'export breadth comparable universe too small');
assert(
  Array.isArray(exportsSnapshot.breadth?.topPositive) && Array.isArray(exportsSnapshot.breadth?.topNegative),
  'export breadth movers missing'
);

const exportDetail = await get('/api/export-momentum/item-detail?key=semiconductor', 60000);
assert(exportDetail.key === 'semiconductor', 'export item detail key mismatch');
assert(Number(exportDetail.schemaVersion) >= 2, 'export item detail schema v2 missing');
assert(Array.isArray(exportDetail.history) && exportDetail.history.length === 12, 'export item detail must keep 12 months');
assert(
  exportDetail.history.every((row) => row.period && Number(row.exportsUsdBillion) >= 0),
  'export item detail monthly values missing'
);
assert(
  exportDetail.history.some((row) => Number(row.exportWeightKg) > 0 && Number(row.unitValueUsdPerKg) > 0),
  'export item detail value-volume-unit-value series missing'
);
assert(
  Array.isArray(exportDetail.countries) && exportDetail.countries.length === 5,
  'export item detail country breakdown missing'
);

assert(Number.isFinite(Number(exportDetail.momentum?.exports?.avg3mYoY)), 'export 3-month amount momentum missing');
assert(Number.isFinite(Number(exportDetail.momentum?.volume?.avg3mYoY)), 'export 3-month volume momentum missing');
assert(Number.isFinite(Number(exportDetail.momentum?.unitValue?.avg3mYoY)), 'export 3-month unit-value momentum missing');
assert(Array.isArray(exportDetail.momentum?.phaseHistory) && exportDetail.momentum.phaseHistory.length === 12, 'export phase history missing');

assert(Array.isArray(exportDetail.semiconductorBreakdown) && exportDetail.semiconductorBreakdown.length >= 4, 'semiconductor HSK breakdown missing');
const dram = exportDetail.semiconductorBreakdown.find((row) => row.code === '8542321010');
const flash = exportDetail.semiconductorBreakdown.find((row) => row.code === '8542321030');
const sram = exportDetail.semiconductorBreakdown.find((row) => row.code === '8542321020');
assert(dram && Array.isArray(dram.history) && dram.history.length >= 1, 'official DRAM HSK series missing');
assert(flash && Array.isArray(flash.history) && flash.history.length >= 1, 'official Flash memory HSK series missing');
assert(sram, 'official SRAM HSK series missing');
assert(String(dram.note || '').includes('HBM'), 'HBM classification limitation missing');
assert(String(flash.note || '').includes('NAND'), 'Flash/NAND scope note missing');

console.log('Live backend contract smoke passed', {
  base: BASE,
  quoteCount: quotes.results.length,
  compareCount: compare.stocks.length,
  macroCount: macro.results.length,
  exportItemCount: exportsSnapshot.items.length,
  exportItemPeriod: exportsSnapshot.itemPeriod,
  exportBreadthCount: exportsSnapshot.breadth.comparableCount,
  exportBreadthRising: exportsSnapshot.breadth.risingCount,
  exportDetailMonths: exportDetail.history.length,
  exportDetailCountries: exportDetail.countries.length,
  semiconductorSegments: exportDetail.semiconductorBreakdown.length,
  dramMonths: dram.history.length,
});
