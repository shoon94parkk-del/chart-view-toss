const DAY_MS = 24 * 60 * 60 * 1000;

function calendarTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : null;
}

function priceNumber(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function percent(numerator, denominator) {
  if (denominator === 0) return null;
  const value = numerator / denominator * 100;
  return Number.isFinite(value) ? value : null;
}

/** Normalize actual product observations, then calculate within the selected calendar window. */
export function memoryPriceSeries(history, key, { period = 'all', sourceDate } = {}) {
  const sourceTime = calendarTime(sourceDate);
  const byDate = new Map();
  for (const row of Array.isArray(history) ? history : []) {
    const time = calendarTime(row?.date);
    const value = priceNumber(row?.values?.[key]);
    if (time === null || value === null || (sourceTime !== null && time > sourceTime)) continue;
    // A later missing duplicate must not erase an actual observed price.
    byDate.set(row.date, { date: row.date, time, value });
  }
  const observations = [...byDate.values()].sort((a, b) => a.time - b.time);
  if (!observations.length) return [];

  const anchor = sourceTime ?? observations.at(-1).time;
  const days = period === '1m' ? 30 : period === '3m' ? 90 : null;
  const selected = days === null ? observations : observations.filter(point => point.time >= anchor - days * DAY_MS);
  const firstValue = selected[0]?.value;
  return selected.map((point, index) => {
    const previous = selected[index - 1];
    const change = previous ? point.value - previous.value : null;
    return {
      date: point.date,
      value: point.value,
      change,
      changePct: previous ? percent(change, previous.value) : null,
      index: percent(point.value, firstValue),
    };
  });
}

/** Summarize normalized chronological points; gaps do not add weight or prices. */
export function memoryPriceSummary(points) {
  if (Array.isArray(points) && points.length) {
    const first = points[0], last = points.at(-1);
    let low = first, high = first, total = 0;
    for (const point of points) {
      if (point.value < low.value) low = point;
      if (point.value > high.value) high = point;
      total += point.value;
    }
    const change = last.value - first.value;
    return {
      count: points.length, first, last, low, high,
      average: total / points.length, change, changePct: percent(change, first.value),
    };
  }
  return {
    count: 0, first: null, last: null, low: null, high: null,
    average: null, change: null, changePct: null,
  };
}
