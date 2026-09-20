const DEFAULT_API_BASE = 'https://chart-view-pkv8.onrender.com';

export const API_BASE = (import.meta.env.VITE_CHARTVIEW_API_BASE || DEFAULT_API_BASE).replace(/\/$/, '');

export async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Accept: 'application/json', ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error(`API 요청 실패 (${response.status})`);
  return response.json();
}

export const compareStocks = (tickers, period = '1mo') =>
  api(`/api/compare?tickers=${encodeURIComponent(tickers.join(','))}&period=${encodeURIComponent(period)}`);

export const marketNow = () => api('/api/market-now');
export const homeSnapshot = () => api('/api/home-snapshot');
