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

const samsungQuote = quotes.results.find((row) => String(row.ticker || '').toUpperCase() === '005930.KS');
assert(samsungQuote, 'Samsung quote missing from live quote contract');
if (String(samsungQuote.marketStatus || '').toUpperCase() === 'CLOSE') {
  assert(samsungQuote.priceBasis === 'regular_close', 'closed Korean market must expose regular_close price basis');
  assert(samsungQuote.sessionType === 'regular', 'closed Korean quote must stay on regular session');
}
if (String(samsungQuote.marketStatus || '').toUpperCase() === 'OPEN') {
  assert(samsungQuote.priceBasis === 'regular_live', 'open Korean market must expose regular_live price basis');
  assert(samsungQuote.sessionType === 'regular', 'open Korean quote must identify regular session');
}

const compare = await get('/api/compare?tickers=AAPL%2C005930.KS&period=1mo');
assert(Array.isArray(compare.stocks) && compare.stocks.length >= 1, 'compare stocks missing');
assert(compare.comparisonBasis?.currencyMode?.includes('no FX conversion'), 'compare currency basis missing');
assert(compare.comparisonBasis?.missingObservationPolicy?.includes('no interpolation'), 'compare missing-value basis missing');

const macro = await get('/api/macro');
assert(Array.isArray(macro.results) && macro.results.length >= 1, 'macro rows missing');
assert(macro.dataContract?.observedAt, 'macro observation contract missing');
assert(macro.results.some((row) => row.unit && row.observedAt), 'macro unit/observation metadata missing');

const exportsSnapshot = await get('/api/export-momentum', 45000);
assert(Number(exportsSnapshot.schemaVersion) >= 6, 'export schema v6 missing');
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

assert(
  Array.isArray(exportsSnapshot.semiconductorBreakdown) && exportsSnapshot.semiconductorBreakdown.length >= 4,
  'cached semiconductor HSK breakdown missing from export snapshot'
);

const semiMemory = exportsSnapshot.semiconductorBreakdown.find((row) => row.code === '854232');
const semiDram = exportsSnapshot.semiconductorBreakdown.find((row) => row.code === '8542321010');
const semiFlash = exportsSnapshot.semiconductorBreakdown.find((row) => row.code === '8542321030');
const semiMcp = exportsSnapshot.semiconductorBreakdown.find((row) => row.code === '8542323000');
const semiDramModule = exportsSnapshot.semiconductorBreakdown.find((row) => row.code === '8473304060');
for (const [name,row] of [['memory',semiMemory],['dram',semiDram],['flash',semiFlash],['mcp',semiMcp],['dramModule',semiDramModule]]) {
  assert(row && Number(row.exportsUsdBillion) >= 0, `semiconductor report ${name} missing`);
  assert(Number.isFinite(Number(row.exportYoY)), `semiconductor report ${name} YoY missing`);
  assert(Number.isFinite(Number(row.exportMoM)), `semiconductor report ${name} MoM missing`);
  assert(Number(row.unitValueUsdPerKg) > 0, `semiconductor report ${name} unit value missing`);
  assert(Number.isFinite(Number(row.unitValueMoM)), `semiconductor report ${name} unit-value MoM missing`);
}

const semiconductorCountries = await get('/api/export-momentum/semiconductor-countries', 90000);
assert(semiconductorCountries.period === exportsSnapshot.itemPeriod, 'semiconductor country period must match item period');
assert(Array.isArray(semiconductorCountries.segments) && semiconductorCountries.segments.length === 4, 'semiconductor country segment matrix missing');
assert(Array.isArray(semiconductorCountries.markets) && semiconductorCountries.markets.length === 6, 'semiconductor country market scope mismatch');
for (const code of ['CN','HK','VN','TW','US','JP']) {
  assert(semiconductorCountries.markets.some((row) => row.code === code), `configured semiconductor market missing: ${code}`);
}
for (const key of ['dram','flash','mcp-memory','dram-module']) {
  const segment = semiconductorCountries.segments.find((row) => row.key === key);
  assert(segment, `semiconductor country segment missing: ${key}`);
  assert(Array.isArray(segment.countries) && segment.countries.length >= 4, `semiconductor country rows too sparse: ${key}`);
  assert(segment.countries.some((row) => Number(row.exportsUsdBillion) >= 0 && Number.isFinite(Number(row.exportYoY))), `semiconductor country YoY missing: ${key}`);
  assert(segment.countries.some((row) => Number.isFinite(Number(row.deltaUsdBillion))), `semiconductor country delta missing: ${key}`);
}
assert(String(semiconductorCountries.meta?.scope || '').includes('not a global ranking'), 'semiconductor country scope warning missing');

const provisional = await get('/api/export-momentum/provisional', 90000);
assert(Number(provisional.schemaVersion) >= 2, 'provisional export schema v2 missing');
assert(provisional.status === 'official_preliminary_api', 'provisional export status mismatch');
assert(/^\d{4}-\d{2}$/.test(String(provisional.period || '')), 'provisional export period missing');
assert([10,20,30].includes(Number(provisional.latestStage)), 'provisional latest stage invalid');
assert(Array.isArray(provisional.checkpoints) && provisional.checkpoints.length >= 1, 'provisional export checkpoints missing');
const provisionalLatest = provisional.checkpoints.at(-1);
assert(Number(provisionalLatest?.total?.exportsUsdBillion) > 0, 'provisional total exports missing');
assert(Number(provisionalLatest?.semiconductor?.exportsUsdBillion) > 0, 'provisional semiconductor exports missing');
assert(Number.isFinite(Number(provisionalLatest?.semiconductor?.exportYoY)), 'provisional semiconductor YoY missing');
assert(Number.isFinite(Number(provisionalLatest?.semiconductor?.exportMoM)), 'provisional semiconductor same-window MoM missing');
assert(Number(provisionalLatest?.semiconductorSharePct) > 0, 'provisional semiconductor share missing');
assert(Array.isArray(provisional.items) && provisional.items.length >= 8, 'provisional major export products missing');
assert(provisional.items.some((row) => row.key === 'semiconductor' && Number(row.exportsUsdBillion) > 0), 'provisional semiconductor item row missing');
assert(String(provisional.meta?.classification || '').includes('not HS monthly classification'), 'provisional classification scope warning missing');

const landing = provisional.landingProjection;
assert(landing && ['open','final-review','final'].includes(String(landing.status || '')), 'month-end landing projection missing');
if (landing.status === 'open' || landing.status === 'final-review') {
  for (const [name,metric] of [['total',landing.total],['semiconductor',landing.semiconductor]]) {
    assert(metric && Number(metric.estimateUsdBillion) > 0, `landing ${name} estimate missing`);
    assert(Number(metric.rangeLowUsdBillion) > 0 && Number(metric.rangeHighUsdBillion) >= Number(metric.rangeLowUsdBillion), `landing ${name} range invalid`);
    assert(Number(metric.historySampleCount) >= 12, `landing ${name} history sample too small`);
    assert(Number(metric.backtest?.sampleCount) > 0, `landing ${name} backtest sample missing`);
    assert(Number.isFinite(Number(metric.backtest?.medianAbsErrorPct)), `landing ${name} backtest error missing`);
    assert(Number.isFinite(Number(metric.backtest?.rangeHitPct)), `landing ${name} range hit rate missing`);
  }
}
if (landing.status === 'final-review') {
  assert(Number(landing.total?.actualUsdBillion) > 0, 'landing total actual close missing');
  assert(Number(landing.semiconductor?.actualUsdBillion) > 0, 'landing semiconductor actual close missing');
}

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
assert(dram && Number(dram.exportsUsdBillion) > 0, 'official DRAM HSK value missing');
assert(flash && Number(flash.exportsUsdBillion) > 0, 'official Flash memory HSK value missing');
assert(sram && Number(sram.exportsUsdBillion) >= 0, 'official SRAM HSK value missing');
assert(String(dram.note || '').includes('HBM'), 'HBM classification limitation missing');
assert(String(flash.note || '').includes('NAND'), 'Flash/NAND scope note missing');


const memorySpot = await get('/api/memory-prices', 25000);
assert(memorySpot.provider === 'TrendForce', 'memory price provider mismatch');
assert(Number(memorySpot.schemaVersion) >= 2, 'memory price catalog schema v2 missing');
assert(Array.isArray(memorySpot.groups) && memorySpot.groups.length >= 5, 'memory price groups missing');
for (const key of ['dram-chip','dram-module','gddr','nand-chip','nand-wafer']) {
  const group = memorySpot.groups.find((item) => item.key === key);
  assert(group && Array.isArray(group.items) && group.items.length >= 2, `memory price group missing: ${key}`);
  assert(group.items.some((row) => Number(row.average) > 0), `memory price averages missing: ${key}`);
}
const unavailablePriceKeys = new Set((memorySpot.unavailablePriceSeries || []).map((row) => row.key));
for (const key of ['hbm','mcp','emmc-ufs']) {
  assert(unavailablePriceKeys.has(key), `non-public memory price disclosure missing: ${key}`);
}
assert(Array.isArray(memorySpot.history) && memorySpot.history.length >= 1, 'memory price accumulated history missing');
assert(String(memorySpot.groups.find((group) => group.key === 'nand-chip')?.sourceUrl || '').includes('trendforce.com'), 'NAND source link missing');

console.log('Live backend contract smoke passed', {
  base: BASE,
  quoteCount: quotes.results.length,
  compareCount: compare.stocks.length,
  macroCount: macro.results.length,
  exportItemCount: exportsSnapshot.items.length,
  exportItemPeriod: exportsSnapshot.itemPeriod,
  provisionalPeriod: provisional.period,
  provisionalStage: provisional.latestStageLabel,
  provisionalCheckpoints: provisional.checkpoints.length,
  provisionalSemiconductorExports: provisionalLatest.semiconductor.exportsUsdBillion,
  provisionalSemiconductorYoY: provisionalLatest.semiconductor.exportYoY,
  provisionalSemiconductorShare: provisionalLatest.semiconductorSharePct,
  landingStatus: landing.status,
  landingStage: landing.stageLabel,
  landingTotalEstimate: landing.total?.estimateUsdBillion,
  landingTotalActual: landing.total?.actualUsdBillion,
  landingTotalBacktestError: landing.total?.backtest?.medianAbsErrorPct,
  landingSemiEstimate: landing.semiconductor?.estimateUsdBillion,
  landingSemiActual: landing.semiconductor?.actualUsdBillion,
  landingSemiBacktestError: landing.semiconductor?.backtest?.medianAbsErrorPct,
  exportBreadthCount: exportsSnapshot.breadth.comparableCount,
  exportBreadthRising: exportsSnapshot.breadth.risingCount,
  exportDetailMonths: exportDetail.history.length,
  exportDetailCountries: exportDetail.countries.length,
  semiconductorSegments: exportDetail.semiconductorBreakdown.length,
  semiconductorReportSegments: exportsSnapshot.semiconductorBreakdown.length,
  dramExports: semiDram.exportsUsdBillion,
  dramMoM: semiDram.exportMoM,
  flashExports: semiFlash.exportsUsdBillion,
  flashMoM: semiFlash.exportMoM,
  mcpExports: semiMcp.exportsUsdBillion,
  dramModuleExports: semiDramModule.exportsUsdBillion,
  semiconductorCountrySegments: semiconductorCountries.segments.length,
  semiconductorCountryMarkets: semiconductorCountries.markets.length,
  memoryPriceGroups: memorySpot.groups.length,
  memoryPriceHistoryCount: memorySpot.history.length,
});
