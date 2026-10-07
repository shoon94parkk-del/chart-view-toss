import test from 'node:test';
import assert from 'node:assert/strict';
import { assertKoreanQuoteSession } from './helpers/koreanQuoteContract.mjs';

const close = (asOf, priceBasis = 'regular_close', sessionType = 'regular') => ({
  marketStatus: 'CLOSE', asOf, priceBasis, sessionType,
});

test('only timezone-qualified 15:30 KST observations certify a regular close', () => {
  for (const asOf of ['2026-10-07T15:30:00+09:00', '2026-10-07T15:30:00+0900', '2026-10-07T06:30:00Z', '2026-10-07T02:30:59-04:00']) {
    assertKoreanQuoteSession(close(asOf));
    assert.throws(() => assertKoreanQuoteSession(close(asOf, 'provider_latest', 'unknown')));
  }
});

test('closed market with an evening observation must remain provider latest', () => {
  const asOf = '2026-10-07T20:20:23+09:00';
  assertKoreanQuoteSession(close(asOf, 'provider_latest', 'unknown'));
  assert.throws(() => assertKoreanQuoteSession(close(asOf)));
  assert.throws(() => assertKoreanQuoteSession(close(asOf, 'provider_latest', 'regular')));
});

test('missing, invalid and timezone-free times cannot certify a close', () => {
  for (const asOf of [undefined, null, '', 'invalid', '2026-10-07T15:30:00', '2026-10-07T15:30:00+00:00', '2026-02-30T15:30:00+09:00']) {
    assertKoreanQuoteSession(close(asOf, 'provider_latest', 'unknown'));
    assert.throws(() => assertKoreanQuoteSession(close(asOf)));
  }
});

test('verified close cannot be mislabeled as an unknown session', () => {
  assert.throws(() => assertKoreanQuoteSession(close('2026-10-07T15:30:00+09:00', 'regular_close', 'unknown')));
});

test('open Korean market still requires regular live prices and regular session', () => {
  const quote = { marketStatus: 'OPEN', priceBasis: 'regular_live', sessionType: 'regular' };
  assertKoreanQuoteSession(quote);
  assert.throws(() => assertKoreanQuoteSession({ ...quote, priceBasis: 'provider_latest' }));
  assert.throws(() => assertKoreanQuoteSession({ ...quote, sessionType: 'unknown' }));
});
