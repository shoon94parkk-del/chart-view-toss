import { newsRelation, relationBasisLabel } from './dataPresentation.js';

const seriesOwners = new WeakMap();
let nextOwner = 0;
const markerPrefix = 'chart-evidence:';
const pad = value => String(value).padStart(2, '0');
const symbolKey = value => typeof value === 'string' ? value.trim().toUpperCase() : '';

function marketTimeZone(symbol) {
  return /\.(KS|KQ)$/.test(symbolKey(symbol)) || /^(\^KS11|\^KQ11)$/.test(symbolKey(symbol)) ? 'Asia/Seoul' : 'America/New_York';
}

function validDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function partsAt(timestamp, timeZone, withTime = false) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } : {}),
  }).formatToParts(new Date(timestamp)).map(part => [part.type, part.value]));
}

function publicationInstant(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !validDay(value.slice(0, 10))) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && Number(value.slice(11, 13)) < 24 ? timestamp : null;
}

/** Observed publication only. A day-only source never acquires an invented time. */
export function normalizeChartPublication(row, symbol) {
  const timeZone = marketTimeZone(symbol);
  if (validDay(row?.publishedAt)) return {
    date: row.publishedAt, precision: 'day', timestamp: null, timeZone,
    display: `${row.publishedAt.replaceAll('-', '.')} · 원문 날짜, 시각 미제공`,
  };
  let timestamp = publicationInstant(row?.publishedAt);
  if (timestamp === null && typeof row?.publishedTs === 'number' && Number.isFinite(row.publishedTs) && row.publishedTs > 0) {
    const candidate = row.publishedTs >= 1e12 ? row.publishedTs : row.publishedTs * 1000;
    if (Number.isFinite(new Date(candidate).getTime())) timestamp = candidate;
  }
  if (timestamp === null) return null;
  const local = partsAt(timestamp, timeZone), kst = partsAt(timestamp, 'Asia/Seoul', true);
  return {
    date: `${local.year}-${local.month}-${local.day}`, precision: 'minute', timestamp, timeZone,
    display: `${kst.year}.${kst.month}.${kst.day} ${kst.hour}:${kst.minute} KST`,
  };
}

function sourceUrl(value) {
  if (typeof value !== 'string' || !/^https:\/\/[^/?#]+(?:[/?#]|$)/i.test(value) || /[\s\\\u0000-\u001f\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? value : null;
  } catch { return null; }
}

function pointDate(time) {
  if (validDay(time)) return time;
  if (time && typeof time === 'object' && [time.year, time.month, time.day].every(Number.isInteger)) {
    const date = `${time.year}-${pad(time.month)}-${pad(time.day)}`;
    return validDay(date) ? date : null;
  }
  // Lightweight Charts renders numeric horizontal times on its UTC calendar.
  if (typeof time === 'number' && Number.isFinite(time)) {
    const date = new Date(time * 1000);
    return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
  }
  return null;
}

/** Pure adapter over existing news/price points. It never fetches or reconstructs history. */
export function buildChartEvidence({ rows, points, symbol } = {}) {
  const selected = symbolKey(symbol), chartDates = new Map();
  for (const point of Array.isArray(points) ? points : []) {
    const date = pointDate(point?.time);
    if (date && typeof point?.value === 'number' && Number.isFinite(point.value) && !chartDates.has(date)) chartDates.set(date, point.time);
  }
  const dates = [...chartDates.keys()].sort(), seen = new Set(), events = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!selected || symbolKey(row?.symbol) !== selected) continue;
    // Keep the exact supplied URL as the identity; never merge different query receipts.
    if (typeof row?.url === 'string' && row.url) {
      if (seen.has(row.url)) continue;
      seen.add(row.url);
    }
    const url = sourceUrl(row?.url), publication = normalizeChartPublication(row, selected), reasons = [];
    if (!url) reasons.push('missing-source-url');
    if (!publication) reasons.push('missing-publication');
    if (!dates.length) reasons.push('chart-unavailable');
    else if (publication && !chartDates.has(publication.date)) reasons.push(publication.date < dates[0] || publication.date > dates.at(-1) ? 'outside-chart-range' : 'missing-chart-point');
    events.push({
      symbol: selected, url, title: typeof row.title === 'string' && row.title ? row.title : '제목 미제공',
      source: typeof row.source === 'string' && row.source ? row.source : '출처 미제공',
      relation: newsRelation(row), relationBasis: row.relationBasis ? relationBasisLabel(row.relationBasis) : '',
      publication, reasons, plotted: reasons.length === 0,
    });
  }
  const grouped = new Map();
  for (const event of events) {
    const date = event.publication?.date || null;
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date).push(event);
  }
  const clusters = [...grouped].map(([date, entries]) => ({ date, events: entries, plottedCount: entries.filter(event => event.plotted).length }))
    .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  const markers = clusters.filter(cluster => cluster.plottedCount > 0).map(cluster => ({
    time: chartDates.get(cluster.date), position: 'aboveBar', color: '#5264b6', shape: 'circle',
    text: `관련 기사 ${cluster.plottedCount}`, id: `${markerPrefix}${selected}:${cluster.date}`,
  }));
  return { events, clusters, markers };
}

const reasonLabel = {
  'missing-source-url': '원문 HTTPS 링크 미제공 또는 확인 불가',
  'missing-publication': '게시일 미제공 또는 확인 불가',
  'chart-unavailable': '차트 관측점 미제공',
  'outside-chart-range': '현재 차트 조회 범위 밖',
  'missing-chart-point': '게시일과 같은 날짜의 차트 관측점 없음',
};

/** Returns idempotent cleanup with update(patch) for independent chart/news completion. */
export function mountChartEvidence(host, options = {}) {
  const document = host.ownerDocument;
  let current = { ...options }, enabled = false, disposed = false, model, markerFailed = false;
  let activeSeries = null, wroteMarkers = false;
  const owner = ++nextOwner, ownPrefix = `${markerPrefix}${owner}:`, listeners = [];
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const root = element('section', 'chart-evidence');
  root.setAttribute('aria-label', '차트 관련 기사 근거');
  const heading = element('div', 'chart-evidence-head');
  const title = element('h3', '', '관련 기사 날짜');
  const toggle = element('button', 'chart-evidence-toggle', '차트에 날짜 표시');
  toggle.type = 'button';
  toggle.setAttribute('aria-pressed', 'false');
  heading.append(title, toggle);
  const note = element('p', 'chart-evidence-note');
  const status = element('p', 'chart-evidence-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const list = element('ul', 'chart-evidence-list');
  root.append(heading, note, status, list);
  host.appendChild(root);

  function readMarkers(series) {
    try { return typeof series?.markers === 'function' ? series.markers() : []; }
    catch { return null; }
  }

  function releaseSeries() {
    if (activeSeries && seriesOwners.get(activeSeries) === owner) {
      if (wroteMarkers) {
        const existing = readMarkers(activeSeries);
        if (existing) try { activeSeries.setMarkers(existing.filter(marker => !String(marker.id || '').startsWith(markerPrefix))); } catch { /* Chart may already be removed. */ }
      }
      seriesOwners.delete(activeSeries);
    }
    activeSeries = null;
    wroteMarkers = false;
  }

  function syncMarkers(canDisplay) {
    if (activeSeries && activeSeries !== current.series) releaseSeries();
    if (!activeSeries && current.series && typeof current.series.setMarkers === 'function') {
      activeSeries = current.series;
      // A replacement owns inherited evidence too, even while its toggle is OFF.
      // A clean first mount still avoids writing markers during chart first paint.
      const inherited = readMarkers(activeSeries);
      wroteMarkers = Boolean(inherited?.some(marker => String(marker.id || '').startsWith(markerPrefix)));
      seriesOwners.set(activeSeries, owner);
    }
    const showMarkers = enabled && canDisplay;
    if (!activeSeries || seriesOwners.get(activeSeries) !== owner || (!showMarkers && !wroteMarkers)) return;
    const existing = readMarkers(activeSeries);
    if (!existing) { markerFailed = true; return; }
    const other = existing.filter(marker => !String(marker.id || '').startsWith(markerPrefix));
    const markers = showMarkers ? model.markers.map((marker, index) => ({ ...marker, id: `${ownPrefix}${index}` })) : [];
    try {
      activeSeries.setMarkers([...other, ...markers].sort((a, b) => (pointDate(a.time) || '').localeCompare(pointDate(b.time) || '')));
      wroteMarkers = markers.length > 0;
      markerFailed = false;
    } catch { markerFailed = true; }
  }

  function removeArticleListeners() {
    for (const [button, listener] of listeners) button.removeEventListener('click', listener);
    listeners.length = 0;
  }

  function paint() {
    model = buildChartEvidence(current);
    const newsState = current.newsState || (Array.isArray(current.rows) ? 'ready' : 'loading');
    const canDisplay = newsState === 'ready' || newsState === 'partial';
    syncMarkers(canDisplay);
    note.textContent = `현재 조회된 기사 범위만 보여줘요. ${marketTimeZone(current.symbol) === 'America/New_York' ? '미국 기사는 최근 4일 범위에서 조회해요. ' : ''}전체 차트 기간의 기사 이력이 아니에요. 관련 사건의 게시일이며 주가 변동의 원인을 뜻하지 않아요. 한국 종목은 한국, 미국 종목은 뉴욕 날짜에 맞추고 시각은 KST로 표시해요. 날짜만 제공되면 원문 날짜를 유지해요.`;
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.disabled = !current.series || model.markers.length === 0 || !canDisplay;
    const countLabel = `${model.events.length}개 기사 · 같은 게시일 ${model.markers.length}개 날짜에 표시 가능${enabled ? ' · 날짜 표시 켜짐' : ' · 날짜 표시 꺼짐'}${markerFailed ? ' · 차트 표시를 적용하지 못했어요.' : ''}`;
    status.textContent = newsState === 'loading' ? '관련 기사를 불러오는 중이에요.'
      : newsState === 'error' ? '관련 기사를 불러오지 못했어요. 관련 뉴스에서 다시 확인해 주세요.'
        : newsState === 'partial' ? `일부 관련 기사를 불러오지 못했어요. 확인된 기사만 표시해요. ${countLabel}`
          : !model.events.length ? '현재 조회된 범위에 확인된 관련 기사가 없어요.' : countLabel;
    removeArticleListeners();
    list.replaceChildren();
    if (!canDisplay) return;
    for (const cluster of model.clusters) {
      const group = element('li', 'chart-evidence-group');
      group.appendChild(element('h4', '', cluster.date ? `${cluster.date.replaceAll('-', '.')} · 게시일 ${cluster.events.length}건` : '게시일 미확인'));
      const entries = element('ul', 'chart-evidence-events');
      for (const event of cluster.events) {
        const item = element('li');
        const button = element('button', 'chart-evidence-event');
        button.type = 'button';
        button.disabled = !event.url || typeof current.onExternal !== 'function';
        button.append(element('strong', '', event.title), element('span', 'chart-evidence-meta', `${event.source} · ${event.publication?.display || '게시일 미제공'} · ${event.relation.label}`));
        if (event.relationBasis) button.appendChild(element('span', 'chart-evidence-meta', event.relationBasis));
        button.appendChild(element('span', 'chart-evidence-placement', event.plotted ? '게시일과 같은 날짜의 차트 관측점 확인' : `차트 미표시 · ${event.reasons.map(reason => reasonLabel[reason]).join(' · ')}`));
        const open = () => { if (!disposed && event.url) current.onExternal?.(event.url); };
        button.addEventListener('click', open);
        listeners.push([button, open]);
        item.appendChild(button);
        entries.appendChild(item);
      }
      group.appendChild(entries);
      list.appendChild(group);
    }
  }

  const onToggle = () => { if (!disposed) { enabled = !enabled; paint(); } };
  toggle.addEventListener('click', onToggle);
  function cleanup() {
    if (disposed) return;
    disposed = true;
    releaseSeries();
    removeArticleListeners();
    toggle.removeEventListener('click', onToggle);
    root.remove();
  }
  cleanup.update = patch => {
    if (disposed) return;
    if (patch && Object.hasOwn(patch, 'symbol') && symbolKey(patch.symbol) !== symbolKey(current.symbol)) {
      enabled = false;
      current = { onExternal: current.onExternal, ...patch };
    } else current = { ...current, ...patch };
    paint();
  };
  paint();
  return cleanup;
}
