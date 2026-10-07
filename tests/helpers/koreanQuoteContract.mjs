import assert from 'node:assert/strict';

// realtime_korea.py certifies a close only from a 15:30 KST observation.
// Market status alone does not certify the provider's latest price as a close.
export function assertKoreanQuoteSession(quote) {
  const status = String(quote.marketStatus || '').trim().toUpperCase();
  if (status !== 'OPEN' && status !== 'CLOSE') return;
  const timestamp = String(quote.asOf || '');
  const instant = new Date(timestamp);
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp);
  // JS Date rolls February 30 forward; Python rejects it. Do not certify it.
  const dateText = timestamp.slice(0, 10);
  const calendarDate = new Date(`${dateText}T00:00:00Z`);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(dateText) &&
    Number.isFinite(calendarDate.getTime()) && calendarDate.toISOString().slice(0, 10) === dateText;
  const verifiedClose = hasOffset && validDate && Number.isFinite(instant.getTime()) &&
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(instant) === '15:30';
  const expectedBasis = status === 'OPEN' ? 'regular_live' : verifiedClose ? 'regular_close' : 'provider_latest';
  const expectedSession = status === 'OPEN' || verifiedClose ? 'regular' : 'unknown';
  assert.equal(quote.priceBasis, expectedBasis, `${status} Korean quote price basis must match its observed trading time`);
  assert.equal(quote.sessionType, expectedSession, `${status} Korean quote session must match its verified price basis`);
}
