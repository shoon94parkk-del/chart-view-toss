import { finiteNumber } from './analysisData.js';

const LIMIT = 20;
const MAX_STORED_BYTES = 12_000;
const symbolOf = value => typeof value === 'string' && /^[A-Z0-9^][A-Z0-9.^=\-]{0,29}$/.test(value.toUpperCase()) ? value.toUpperCase() : null;

function observation(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const symbol = symbolOf(row.symbol ?? row.ticker);
  const price = typeof row.price === 'number' || typeof row.price === 'string' && /^\d+(?:\.\d+)?$/.test(row.price) && row.price.length <= 24 ? finiteNumber(row.price) : null;
  const currency = typeof row.currency === 'string' && /^[A-Z]{3}$/.test(row.currency) ? row.currency : null;
  const asOf = typeof row.asOf === 'string' ? row.asOf : '';
  const clock = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(asOf);
  if (!symbol || price === null || price <= 0 || price > 1e15 || !currency || !clock || Number(clock[2]) > 23 || Number(clock[3]) > 59 || Number(clock[4]) > 59 || Number(clock[5] || 0) > 14 || Number(clock[6] || 0) > 59 || Number(clock[5] || 0) === 14 && Number(clock[6] || 0) !== 0) return null;
  const timestamp = Date.parse(asOf);
  const date = Date.parse(`${asOf.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(timestamp) || !Number.isFinite(date) || new Date(date).toISOString().slice(0, 10) !== asOf.slice(0, 10)) return null;
  return { symbol, price, currency, asOf };
}

function readSnapshot(raw) {
  try {
    if (typeof raw !== 'string' || raw.length > MAX_STORED_BYTES) return [];
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1 || !Array.isArray(value.quotes)) return [];
    const rows = new Map();
    for (const row of value.quotes.slice(0, LIMIT)) {
      const quote = observation(row);
      if (quote && (!rows.has(quote.symbol) || Date.parse(quote.asOf) > Date.parse(rows.get(quote.symbol).asOf))) rows.set(quote.symbol, quote);
    }
    return [...rows.values()];
  } catch { return []; }
}

// The arrival baseline stays fixed for this document. Confirmed latest observations
// are saved separately so a future visit does not call the same price change new.
export function createHomeJourney({ read = () => null, write = () => {} } = {}) {
  let raw;
  try { raw = read(); } catch { raw = null; }
  const baseline = new Map(readSnapshot(raw).map(row => [row.symbol, row]));
  let latest = new Map(baseline);
  const observed = new Map();
  let saved = JSON.stringify({ version: 1, quotes: [...baseline.values()] });
  let scheduled = saved;
  let queue = Promise.resolve();
  let active = true;
  let saveStatus = 'idle';
  let pendingWrites = 0;
  let view = { status: 'loading', changes: [] };

  function persist(quotes) {
    const value = { version: 1, quotes };
    const encoded = JSON.stringify(value);
    if (encoded === scheduled) return;
    scheduled = encoded;
    pendingWrites++;
    saveStatus = 'pending';
    queue = queue.then(async () => {
      try {
        if (!active) return;
        await write(value);
        saved = encoded;
        saveStatus = 'ready';
      } catch { saveStatus = 'failed'; }
      finally {
        pendingWrites--;
        if (pendingWrites) saveStatus = 'pending';
        else scheduled = saved;
      }
    });
  }

  function current() { return { ...view, changes: view.changes.map(change => ({ ...change, previous: { ...change.previous }, current: { ...change.current } })), saveStatus }; }

  return {
    observe(quotes, watchedSymbols, { pending = false, failed = false } = {}) {
      if (!active) return current();
      const symbols = [...new Set((Array.isArray(watchedSymbols) ? watchedSymbols : []).map(symbolOf).filter(Boolean))].slice(0, LIMIT);
      if ((pending || failed) && !symbols.some(symbol => observed.has(symbol))) {
        view = { status: pending ? 'loading' : 'unavailable', changes: [] };
        return current();
      }
      const allowed = new Set(symbols);
      const accepted = new Map();
      for (const row of (!pending && !failed && Array.isArray(quotes) ? quotes : []).slice(0, 500)) {
        const quote = observation(row);
        if (!quote || !allowed.has(quote.symbol)) continue;
        const previous = latest.get(quote.symbol) || observed.get(quote.symbol) || baseline.get(quote.symbol);
        if (previous && (quote.currency !== previous.currency || Date.parse(quote.asOf) < Date.parse(previous.asOf))) continue;
        // Equal-time corrections do not establish an after-visit observation.
        latest.set(quote.symbol, !previous || Date.parse(quote.asOf) > Date.parse(previous.asOf) ? quote : previous);
        accepted.set(quote.symbol, latest.get(quote.symbol));
        observed.delete(quote.symbol);
        observed.set(quote.symbol, latest.get(quote.symbol));
        if (observed.size > LIMIT) observed.delete(observed.keys().next().value);
      }
      const changes = [];
      let compared = 0;
      const available = symbols.filter(symbol => observed.has(symbol));
      for (const symbol of available) {
        const quote = observed.get(symbol);
        const previous = baseline.get(symbol);
        if (!previous) continue;
        compared++;
        if (Date.parse(quote.asOf) <= Date.parse(previous.asOf) || quote.price === previous.price) continue;
        const deltaPct = (quote.price / previous.price - 1) * 100;
        if (Number.isFinite(deltaPct)) changes.push({ symbol, previous, current: quote, deltaPct });
      }
      view = { status: changes.length ? 'changes' : !available.length ? 'unavailable' : compared ? 'unchanged' : 'initial', changes };
      if (accepted.size) {
        latest = new Map(symbols.filter(symbol => latest.has(symbol)).map(symbol => [symbol, latest.get(symbol)]));
        persist([...latest.values()]);
      }
      return current();
    },
    current,
    settled: () => queue,
    dispose: () => { active = false; },
  };
}

let session;
export function getHomeJourneySession(options) { return session ??= createHomeJourney(options); }
export function resetHomeJourneySession() { session?.dispose(); session = undefined; }

export function homeJourneyMarkup(view) {
  const status = view?.status;
  let message = status === 'changes' ? '지난 방문 이후 가격 변화 · 이전 확인 가격 대비예요. 전일 등락률과 달라요.'
    : status === 'unchanged' ? '이전 방문에 확인한 시세 이후 새 가격 변화가 없어요.'
    : status === 'loading' ? '이전 방문과 비교할 시세를 확인하고 있어요.'
    : status === 'unavailable' ? '이전 방문과 비교할 새 기준 시세를 확인하지 못했어요.'
    : view?.saveStatus === 'ready' ? '다음 방문부터 이전 확인 가격과 비교해요.'
    : '다음 방문 비교를 위해 기준 시세를 저장하고 있어요.';
  if (view?.saveStatus === 'failed') message += ' 비교 기준을 저장하지 못했어요. 다음 방문에 같은 변화가 다시 보일 수 있어요.';
  return `<p class="home-revisit-note" data-home-revisit-status="${['changes', 'unchanged', 'loading', 'unavailable', 'initial'].includes(status) ? status : 'initial'}">${message}</p>`;
}
