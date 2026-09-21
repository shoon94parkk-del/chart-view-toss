const DEFAULT_API_BASE = 'https://chart-view-pkv8.onrender.com';
const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_RETRIES = 1;

export const API_BASE = (import.meta.env.VITE_CHARTVIEW_API_BASE || DEFAULT_API_BASE).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, { code = 'unknown', status = null, cause = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.cause = cause;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function friendlyError(error, status = null) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new ApiError('인터넷 연결을 확인해주세요.', { code: 'offline', status, cause: error });
  }
  if (error?.name === 'AbortError') {
    return new ApiError('데이터 연결이 지연되고 있어요. 다시 시도해주세요.', { code: 'timeout', status, cause: error });
  }
  if (status === 429) {
    return new ApiError('요청이 많아요. 잠시 후 다시 시도해주세요.', { code: 'rate_limited', status, cause: error });
  }
  if (status >= 500) {
    return new ApiError('데이터 서버 연결이 불안정해요. 잠시 후 다시 시도해주세요.', { code: 'server', status, cause: error });
  }
  if (status >= 400) {
    return new ApiError(`데이터 요청을 완료하지 못했어요. (${status})`, { code: 'http', status, cause: error });
  }
  return new ApiError('데이터를 불러오지 못했어요. 다시 시도해주세요.', { code: 'network', status, cause: error });
}

function shouldRetry({ method, status, error, attempt, retries }) {
  if (attempt >= retries) return false;
  if (method !== 'GET') return false;
  if (error?.name === 'AbortError') return true;
  if (status === 408 || status === 425 || status === 429) return true;
  if (status >= 500) return true;
  return status == null;
}

export async function api(path, options = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    signal: externalSignal,
    ...fetchOptions
  } = options;
  const method = String(fetchOptions.method || 'GET').toUpperCase();

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw friendlyError(new Error('offline'));
  }

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const abortFromOutside = () => controller.abort();

    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener('abort', abortFromOutside, { once: true });
    }

    let status = null;
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        ...fetchOptions,
        method,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
          ...(fetchOptions.headers || {}),
        },
      });
      status = response.status;

      if (!response.ok) {
        const retryable = shouldRetry({ method, status, attempt, retries });
        if (retryable) {
          await sleep(350 * (attempt + 1));
          continue;
        }
        throw friendlyError(new Error(`HTTP ${status}`), status);
      }

      try {
        return await response.json();
      } catch (error) {
        throw new ApiError('데이터 형식을 확인하지 못했어요. 다시 시도해주세요.', {
          code: 'invalid_json',
          status,
          cause: error,
        });
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      const retryable = shouldRetry({ method, status, error, attempt, retries });
      if (retryable) {
        await sleep(350 * (attempt + 1));
        continue;
      }
      throw friendlyError(error, status);
    } finally {
      clearTimeout(timeoutId);
      if (externalSignal) externalSignal.removeEventListener('abort', abortFromOutside);
    }
  }

  throw new ApiError('데이터를 불러오지 못했어요.', { code: 'unknown' });
}

export const quoteSnapshots = (tickers) =>
  api(`/api/quotes?tickers=${encodeURIComponent(tickers.join(','))}`);

export const compareStocks = (tickers, period = '1mo') =>
  api(`/api/compare?tickers=${encodeURIComponent(tickers.join(','))}&period=${encodeURIComponent(period)}`);

export const searchStocks = (query) =>
  api(`/api/search?q=${encodeURIComponent(query)}`, { timeoutMs: 8000, retries: 0 });

export const marketNow = () => api('/api/market-now');
export const homeSnapshot = () => api('/api/home-snapshot');
export const valuationStocks = (tickers) =>
  api(`/api/valuation?tickers=${encodeURIComponent(tickers.join(','))}`);
export const macroData = () => api('/api/macro');

export const homeInsights = (tickers = []) =>
  api(`/api/home-insights?tickers=${encodeURIComponent(tickers.join(','))}`);

export const personalizedNews = (tickers = [], names = []) =>
  api(`/api/personalized-news?tickers=${encodeURIComponent(tickers.join(','))}&names=${encodeURIComponent(names.join('|'))}`, { timeoutMs: 15000 });
