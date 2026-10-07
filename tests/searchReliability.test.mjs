import test from 'node:test';
import assert from 'node:assert/strict';
import { verifiedSearchRows } from '../src/searchIdentity.js';

const known = { symbol: '005930.KS', name: '삼성전자', type: 'KRX' };
const direct = { symbol: 'ZZZZZZ', name: 'ZZZZZZ', type: 'DIRECT' };
const micron = { symbol: 'MU', name: 'Micron Technology', type: 'EQUITY' };
const domestic = { symbol: '067310.KQ', name: '하나마이크론', type: 'KRX' };

test('failed DIRECT quote verification preserves independent known listings and reports partial failure', async () => {
  const failure = new Error('quote outage'), reported = [];
  const result = await verifiedSearchRows([known, direct], async () => { throw failure; }, { onVerificationError: error => reported.push(error) });
  assert.deepEqual(result, [known]);
  assert.deepEqual(reported, [failure]);
  await assert.rejects(verifiedSearchRows([direct], async () => { throw failure; }), /quote outage/);
});

test('DIRECT verification never masks abort even with known independent listings', async () => {
  const abort = new DOMException('Aborted', 'AbortError');
  await assert.rejects(verifiedSearchRows([known, direct], async () => { throw abort; }), error => error === abort);
});

let moduleSequence = 0;
async function searchWith(t, fetchMock) {
  const previous = globalThis.fetch;
  globalThis.fetch = fetchMock;
  t.after(() => { globalThis.fetch = previous; });
  return (await import(`../src/api.js?searchReliability=${++moduleSequence}`)).searchStocks;
}
const json = (data, status = 200) => Promise.resolve(new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }));

for (const failedQuery of ['MU', '마이크론']) {
  test(`one failed Micron search source retains the successful known listing (${failedQuery})`, async t => {
    const calls = [];
    const search = await searchWith(t, url => {
      const parsed = new URL(url), query = parsed.searchParams.get('q'); calls.push(query);
      return query === failedQuery ? json({ detail: 'search outage' }, 503) : json({ results: [query === 'MU' ? micron : domestic] });
    });
    const response = await search('마이크론');
    assert.deepEqual(response.results, [failedQuery === 'MU' ? domestic : micron]);
    assert.equal(response.partialFailure, true);
    assert.deepEqual(calls.sort(), ['MU', '마이크론'].sort());
  });
}

test('all sources failing remains a retryable transport error', async t => {
  const search = await searchWith(t, () => json({ detail: 'search outage' }, 503));
  await assert.rejects(search('마이크론'), error => error.status === 503);
});

test('a surviving empty response plus failed alias is not falsely reported as no matches', async t => {
  const search = await searchWith(t, url => new URL(url).searchParams.get('q') === 'MU' ? json({ detail: 'alias outage' }, 503) : json({ results: [] }));
  await assert.rejects(search('마이크론'), error => error.status === 503);
});

test('mixed known and unverified search keeps known result when verification fails, without promoting the guess', async t => {
  const search = await searchWith(t, url => new URL(url).pathname === '/api/search' ? json({ results: [known, direct] }) : json({ detail: 'quote outage' }, 503));
  const response = await search('삼성');
  assert.deepEqual(response.results, [known]);
  assert.deepEqual(response.unverifiedDirect, ['ZZZZZZ']);
  assert.equal(response.partialFailure, true);
});

test('DIRECT-only provider failure remains an error while a successful empty search remains empty', async t => {
  const search = await searchWith(t, url => new URL(url).pathname === '/api/search' ? json({ results: new URL(url).searchParams.get('q') === 'empty' ? [] : [direct] }) : json({ detail: 'quote outage' }, 503));
  await assert.rejects(search('ZZZZZZ'), error => error.status === 503);
  assert.deepEqual((await search('empty')).results, []);
});

test('aborting one in-flight search source is never replaced by another successful source', async t => {
  let beginAlias;
  const aliasStarted = new Promise(resolve => { beginAlias = resolve; });
  const search = await searchWith(t, (url, { signal }) => {
    if (new URL(url).searchParams.get('q') !== 'MU') return json({ results: [domestic] });
    return new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      beginAlias();
    });
  });
  const controller = new AbortController(), pending = search('마이크론', { signal: controller.signal });
  await aliasStarted; controller.abort();
  await assert.rejects(pending, error => error.name === 'AbortError');
});
