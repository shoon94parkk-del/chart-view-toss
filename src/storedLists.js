// Stored lists can outlive app versions. Recover valid entries in memory only;
// reading must never overwrite the user's original device data.
const symbolPattern = /^[A-Z0-9^][A-Z0-9.^=\-]{0,29}$/;
const symbol = value => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return symbolPattern.test(normalized) ? normalized : null;
};

export function parseStoredList(raw, { kind = 'selected', fallback = [] } = {}) {
  let rows;
  try { rows = JSON.parse(raw); } catch { return [...fallback]; }
  if (!Array.isArray(rows)) return [...fallback];
  const seen = new Set(), result = [];
  for (const row of rows) {
    const ticker = symbol(kind === 'watch' ? row?.symbol : row);
    if (!ticker || seen.has(ticker)) continue;
    if (kind === 'watch' && (!row || typeof row !== 'object' || Array.isArray(row))) continue;
    seen.add(ticker);
    result.push(kind === 'watch'
      ? { ...row, symbol: ticker, name: typeof row.name === 'string' ? row.name : ticker }
      : ticker);
  }
  return result;
}
