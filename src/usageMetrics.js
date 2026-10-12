import { isAppsInTossRuntime } from './tossBridge.js';

// Use Analytics.log only: SDK screen/click helpers also attach URL/referrer data.
// Operation keys stay in memory and are never included in the SDK payload.
const eventNames = new Set([
  'app_open', 'screen_view', 'screen_load',
  'stock_search_attempt', 'stock_search_success', 'stock_search_failure',
  'stock_detail_attempt', 'stock_detail_view', 'stock_detail_failure',
  'analysis_view_attempt', 'analysis_view_success', 'analysis_view_failure',
  'watchlist_add_attempt', 'watchlist_add_success', 'watchlist_add_failure',
  'research_save_attempt', 'research_save_success', 'research_save_failure',
  'export_detail_view', 'app_error',
  'review_prompt_shown', 'review_request_attempt', 'review_request_failure', 'review_prompt_dismissed',
]);
const enums = {
  screen: new Set(['home', 'watch', 'chart', 'detail', 'analysis', 'discover', 'valuation', 'macro', 'news', 'picks', 'gurus', 'exports', 'heatmap', 'ideas', 'more', 'other']),
  source: new Set(['watchlist', 'comparison', 'research', 'search', 'detail', 'analysis', 'exports']),
  outcome: new Set(['success', 'error', 'empty', 'partial', 'unavailable']),
  code: new Set(['network', 'timeout', 'offline', 'storage', 'module', 'unsupported', 'unknown']),
};
const emitted = new Set();
const MAX_OPERATION_EVENTS = 512;
let sdkPromise = null, sequence = 0, opened = false;

export function newUsageOperation() {
  return `usage-${++sequence}`;
}

function safeParams(params) {
  const result = {};
  for (const [key, values] of Object.entries(enums)) {
    if (typeof params?.[key] === 'string' && values.has(params[key])) result[key] = params[key];
  }
  if (typeof params?.duration_ms === 'number' && Number.isFinite(params.duration_ms) && params.duration_ms >= 0) {
    result.duration_ms = Math.round(Math.min(120000, params.duration_ms) / 10) * 10;
  }
  if (typeof params?.result_count === 'number' && Number.isFinite(params.result_count) && params.result_count >= 0) {
    result.result_count = Math.min(100, Math.floor(params.result_count));
  }
  return result;
}

export async function trackUsage(name, { operationId, params = {} } = {}) {
  try {
    if (!eventNames.has(name) || !isAppsInTossRuntime()) return false;
    if (name === 'app_open' && opened) return false;
    const key = `${name}:${operationId ?? newUsageOperation()}`;
    if (emitted.has(key)) return false;
    emitted.add(key);
    if (emitted.size > MAX_OPERATION_EVENTS) emitted.delete(emitted.values().next().value);
    if (name === 'app_open') opened = true;
    const payload = { log_name: name, log_type: 'event', params: safeParams(params) };
    sdkPromise ||= import('@apps-in-toss/web-framework');
    const sdk = await sdkPromise;
    if (typeof sdk.Analytics?.log !== 'function') return false;
    await sdk.Analytics.log(payload);
    // Dispatch completion is not evidence of delivery (sandbox/old SDKs may ignore it).
    return true;
  } catch {
    return false;
  }
}
