// Pure, testable return calculations for the Toss daily TOP10 archive.
// Yahoo /api/compare may supply adjusted closes; never mix a raw archived close with them.
export function positivePrice(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function finiteReturn(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function evaluateHistoryRow(row, stock, tradeDate) {
  const points = (Array.isArray(stock?.data) ? stock.data : [])
    .map(point => ({price: positivePrice(point?.price), time: Number(point?.time)}))
    .filter(point => point.price !== null && Number.isFinite(point.time))
    .sort((a, b) => a.time - b.time);
  const latest = points.length ? points[points.length - 1].price : null;
  const exactDay = stock?.startDate === tradeDate && points.length > 0;
  const providerBase = exactDay ? points[0].price : null;
  const archivedBase = positivePrice(row?.recommendedPrice ?? row?.recommendationClose);
  const adjusted = stock?.priceBasis === 'adjusted_close';
  // Prefer a provider-adjusted baseline for adjusted prices. Raw closes are compatible only
  // with the API's explicit unadjusted close basis.
  const base = adjusted
    ? providerBase
    : (archivedBase ?? providerBase);
  const ratio = price => (base !== null && price !== null
    ? Math.round(((price - base) / base) * 10000) / 100
    : null);
  const horizon = n => exactDay && points.length > n ? ratio(points[n].price) : null;
  return {
    base,
    latest,
    current: ratio(latest),
    d5: horizon(5),
    d20: horizon(20),
    d60: horizon(60),
    asOf: stock?.endDate || null,
    adjusted,
    archiveBase: archivedBase,
    baselineAvailable: base !== null,
  };
}

export function averageTop10(day, results) {
  const values = (day?.top10 || [])
    .map(row => finiteReturn(results?.get(row.symbol)?.current))
    .filter(value => value !== null);
  return {
    average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    evaluated: values.length,
    total: (day?.top10 || []).length,
  };
}
