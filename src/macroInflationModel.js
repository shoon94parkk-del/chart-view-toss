import { finiteNumber } from './analysisData.js';

export const INFLATION_SERIES = Object.freeze([
  { id: 'cpi', label: 'CPI' },
  { id: 'core_cpi', label: '근원 CPI' },
  { id: 'ppi', label: 'PPI' },
  { id: 'core_ppi', label: '근원 PPI' },
]);

const text = value => typeof value === 'string' ? value.trim() : '';
const rateNumber = value => ['number', 'string'].includes(typeof value) ? finiteNumber(value) : null;
const month = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(text(value)) ? text(value) : null;
const monthIndex = value => Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7)) - 1;
const dateOnly = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text(value))) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
};
const timestamp = value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/.test(text(value)) && Number.isFinite(Date.parse(value)) ? value : null;
const publication = value => timestamp(value) || dateOnly(value);
export function inflationSourceUrl(value) {
  try { const url = new URL(text(value)); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}

export function formatInflationRate(value) {
  const number = rateNumber(value);
  return number === null ? '미제공' : `${number.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
}

function normalizePoints(rows) {
  const grouped = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!month(row?.month)) continue;
    const values = grouped.get(row.month) || [];
    values.push(row); grouped.set(row.month, values);
  }
  return [...grouped].sort(([a], [b]) => a.localeCompare(b)).map(([key, rows]) => ({
    month: key,
    yoy: rows.length === 1 ? rateNumber(rows[0].yoy) : null,
    mom: rows.length === 1 ? rateNumber(rows[0].mom) : null,
    publishedAt: rows.length === 1 ? publication(rows[0].publishedAt) : null,
  }));
}

function normalizeSeries(raw, identity, now) {
  const points = normalizePoints(raw?.points);
  const available = points.some(point => point.yoy !== null || point.mom !== null);
  const asOf = month(raw?.asOf) || points.at(-1)?.month || null;
  const currentMonth = new Date(now).toISOString().slice(0, 7);
  const stale = raw?.status === 'stale' || !!asOf && monthIndex(currentMonth) - monthIndex(asOf) > 2;
  const source = raw?.source || {};
  return {
    ...identity, name: text(raw?.name) || identity.label, definition: text(raw?.definition),
    unit: text(raw?.unit) || '%', asOf, points,
    status: !available ? 'unavailable' : stale ? 'stale' : raw?.status === 'partial' || points.some(point => point.yoy === null || point.mom === null) ? 'partial' : 'ok',
    basis: { yoy: ['SA', 'NSA'].includes(raw?.basis?.yoy) ? raw.basis.yoy : null, mom: ['SA', 'NSA'].includes(raw?.basis?.mom) ? raw.basis.mom : null },
    publishedAt: publication(raw?.publishedAt), collectedAt: timestamp(raw?.collectedAt), checkedAt: timestamp(raw?.checkedAt),
    revisionStatus: raw?.revisionStatus === 'revised' ? 'revised' : 'unknown', revisionCheckedAt: timestamp(raw?.revisionCheckedAt),
    staleReason: text(raw?.staleReason),
    source: { name: text(source.name), url: inflationSourceUrl(source.url), nsaUrl: inflationSourceUrl(source.nsaUrl), saUrl: inflationSourceUrl(source.saUrl), nsaSeriesId: text(source.nsaSeriesId), saSeriesId: text(source.saSeriesId) },
  };
}

const dateParts = (value, timeZone) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
  timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short',
}).formatToParts(new Date(value)).map(part => [part.type, part.value]));
const dateText = parts => `${parts.year}.${parts.month}.${parts.day}`;

export function releaseTimeLabel(event) {
  const scheduled = timestamp(event?.scheduledAt);
  if (scheduled) {
    const kst = dateParts(scheduled, 'Asia/Seoul'), original = dateParts(scheduled, 'America/New_York');
    const zone = original.timeZoneName === 'GMT-4' ? 'EDT' : original.timeZoneName === 'GMT-5' ? 'EST' : original.timeZoneName;
    return { kst: `${dateText(kst)} ${kst.hour}:${kst.minute} KST`, original: `${dateText(original)} ${original.hour}:${original.minute} ET (${zone})`, certainty: event?.status === 'confirmed' ? '일정 확정' : '예정 · 변경 가능', timed: true };
  }
  const date = dateOnly(event?.localDate);
  return { kst: '한국 날짜·시각 미정', original: date ? `${date.replaceAll('-', '.')} ET · 시간 미정` : '원래 날짜·시각 미정', certainty: date && event?.status === 'confirmed' ? '일자 확정 · 시간 미정' : '시간 미정 · 변경 가능', timed: false };
}

function normalizeCalendar(raw, now) {
  const todayEt = dateText(dateParts(now, 'America/New_York')).replaceAll('.', '-');
  const events = (Array.isArray(raw?.events) ? raw.events : []).flatMap(event => {
    const scheduledAt = timestamp(event?.scheduledAt), localDate = dateOnly(event?.localDate);
    const sourceUrl = inflationSourceUrl(event?.sourceUrl) || inflationSourceUrl(raw?.sourceUrl);
    if (!sourceUrl || !text(event?.name) || (!scheduledAt && !localDate)) return [];
    if (scheduledAt ? Date.parse(scheduledAt) < now : localDate < todayEt) return [];
    return [{ id: text(event.id), indicator: text(event.indicator), name: text(event.name), observationMonth: month(event.observationMonth), scheduledAt, localDate, status: event.status === 'confirmed' ? 'confirmed' : 'tentative', sourceUrl, checkedAt: timestamp(event.checkedAt), time: releaseTimeLabel({ ...event, scheduledAt, localDate }) }];
  }).sort((a, b) => (a.scheduledAt || `${a.localDate}T00:00:00Z`).localeCompare(b.scheduledAt || `${b.localDate}T00:00:00Z`));
  return { status: ['ok', 'partial', 'stale'].includes(raw?.status) ? raw.status : 'unavailable', events, checkedAt: timestamp(raw?.checkedAt), sourceUrl: inflationSourceUrl(raw?.sourceUrl) };
}

export function normalizeInflationPayload(payload, { now = Date.now() } = {}) {
  const raw = payload?.inflation;
  const rows = raw?.schemaVersion === 1 && Array.isArray(raw.series) ? raw.series : [];
  const series = INFLATION_SERIES.map(identity => {
    const matches = rows.filter(row => row?.id === identity.id);
    return normalizeSeries(matches.length === 1 ? matches[0] : null, identity, now);
  });
  const availableCount = series.filter(row => row.status !== 'unavailable').length;
  const status = !availableCount ? 'unavailable' : raw?.status === 'partial' || availableCount < 4 || series.some(row => ['partial', 'stale'].includes(row.status)) ? 'partial' : 'ok';
  return { status, availableCount, series, calendar: normalizeCalendar(payload?.releaseCalendar, now) };
}

export function inflationChart(points, { rate = 'yoy', years = 1 } = {}) {
  const selectedRate = rate === 'mom' ? 'mom' : 'yoy';
  const selectedYears = [1, 3, 5].includes(years) ? years : 1;
  const source = (Array.isArray(points) ? points : []).filter(point => month(point?.month)).slice().sort((a, b) => a.month.localeCompare(b.month));
  const end = source.at(-1)?.month;
  const rows = source.filter(point => monthIndex(point.month) >= monthIndex(end) - selectedYears * 12 + 1).map(point => ({ ...point, value: rateNumber(point[selectedRate]) }));
  const segments = [];
  let segment = [];
  for (const row of rows) {
    if (row.value === null) { if (segment.length) segments.push(segment); segment = []; continue; }
    if (segment.length && monthIndex(row.month) !== monthIndex(segment.at(-1).month) + 1) { segments.push(segment); segment = []; }
    segment.push(row);
  }
  if (segment.length) segments.push(segment);
  const months = rows.length ? monthIndex(rows.at(-1).month) - monthIndex(rows[0].month) + 1 : 0;
  const missingMonths = [];
  const available = new Set(rows.filter(row => row.value !== null).map(row => row.month));
  for (let offset = 0; offset < months; offset++) {
    const index = monthIndex(rows[0].month) + offset;
    const key = `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}`;
    if (!available.has(key)) missingMonths.push(key);
  }
  return { rows, segments, months, missingMonths, rate: selectedRate, years: selectedYears };
}
