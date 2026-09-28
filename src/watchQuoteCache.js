import { readHomeFast, writeHomeFast } from './homeFastCache.js';
import { getLiveQuote, rememberLiveQuotes } from './liveQuoteStore.js';

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const normalized = symbols => [...new Set(symbols.map(symbol => String(symbol || '').trim().toUpperCase()).filter(Boolean))];

export function watchQuoteCacheKey(symbols = []) {
  return `watch-quotes:${normalized(symbols).sort().join('|')}`;
}

export function sessionWatchQuotes(symbols = []) {
  return normalized(symbols).map(symbol => getLiveQuote(symbol)).filter(Boolean);
}

export function seedWatchQuoteCache(symbols = []) {
  if (!symbols.length) return [];
  const cached = readHomeFast(watchQuoteCacheKey(symbols), MAX_AGE_MS);
  rememberLiveQuotes(cached?.results || [], { priority: 40 });
  return sessionWatchQuotes(symbols);
}

export function saveWatchQuoteCache(symbols = []) {
  if (!symbols.length) return;
  const results = sessionWatchQuotes(symbols);
  if (results.length) writeHomeFast(watchQuoteCacheKey(symbols), { results });
}
