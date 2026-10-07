// Exact aliases only: do not turn unrelated Korean company names into US tickers.
const aliases = new Set(['마이크론', '마이크론테크놀로지', 'micron', 'microntechnology']);
export function searchAlias(query) {
  return aliases.has(String(query).replace(/\s/g, '').toLowerCase()) ? 'MU' : '';
}

export async function verifiedSearchRows(rows, loadQuotes, {onVerificationError} = {}) {
  const direct = [...new Set(rows.filter(row => row?.type === 'DIRECT').map(row => row.symbol))];
  let quotes = [];
  if (direct.length) {
    try { quotes = (await loadQuotes(direct))?.results || []; }
    catch (error) {
      // Known listings are independent of a syntactic DIRECT guess. Preserve
      // them when its provider fails, but never hide cancellation or convert a
      // DIRECT-only transport failure into a valid empty search.
      if (error?.name === 'AbortError' || !rows.some(row => row?.symbol && row.type !== 'DIRECT')) throw error;
      onVerificationError?.(error);
    }
  }
  const result = new Map();
  for (const row of rows) {
    if (!row?.symbol) continue;
    const symbol = String(row.symbol).toUpperCase();
    if (row.type === 'DIRECT') {
      const quote = quotes.find(item => String(item.ticker).toUpperCase() === symbol);
      // DIRECT is a syntactic guess from the server, not a verified listing.
      if (!quote || quote.price == null || !Number.isFinite(Number(quote.price)) || Number(quote.price) <= 0) continue;
      if (!result.has(symbol)) result.set(symbol, {...row, name: quote.name || row.name, type: 'QUOTE_VERIFIED'});
    } else result.set(symbol, {...row, symbol});
  }
  return [...result.values()];
}
