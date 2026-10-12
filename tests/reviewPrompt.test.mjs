import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

const NOW = Date.parse('2026-10-12T12:00:00Z');
const KEY = 'chartview-toss-review-prompt-v1';
function setup({ native = true, supported = true, failWrite = false, requestFail = false, disk = new Map(), writeGate } = {}) {
  assert.ok(existsSync('src/reviewPrompt.js'), 'optional review opportunity module must exist');
  const events = [], writes = [];
  let requests = 0, loads = 0;
  const host = { isConnected: true, children: [], appendChild(node) { this.children.push(node); node.host = this; node.isConnected = true; } };
  const createElement = () => {
    const controls = new Map();
    return { isConnected: false, innerHTML: '', className: '', setAttribute() {}, remove() { this.isConnected = false; this.host.children = this.host.children.filter(child => child !== this); }, querySelector(selector) { if (!controls.has(selector)) controls.set(selector, { disabled: false, textContent: '', onclick: null }); return controls.get(selector); } };
  };
  const request = async () => { requests++; if (requestFail) throw Error('private request failure'); };
  request.isSupported = () => supported;
  const context = vm.createContext({
    Date: class extends Date { static now() { return NOW; } },
    document: { createElement }, REVIEW_PROMPT_KEY: KEY,
    isAppsInTossRuntime: () => native,
    readStored: key => disk.get(key) ?? null,
    writeStored: async (key, value, options) => { writes.push(options); if (writeGate) await writeGate; if (failWrite) throw Error('full'); disk.set(key, value); },
    newUsageOperation: () => 'review-operation',
    trackUsage: async (name, data) => { events.push({ name, data }); },
    loadSDK: async () => { loads++; return { Review: { request } }; },
  });
  const source = readFileSync('src/reviewPrompt.js', 'utf8').replace(/^import .*;\r?\n/gm, '').replaceAll("import('@apps-in-toss/web-framework')", 'loadSDK()').replaceAll('export ', '');
  vm.runInContext(source + '\nthis.api={offerReviewOpportunity};', context);
  return { ...context.api, host, events, writes, disk, requests: () => requests, loads: () => loads, panel: () => host.children[0] };
}
const offer = s => s.offerReviewOpportunity(s.host, { source: 'research', operationId: 'save-1' });

test('supported meaningful completion only offers an inline button; native request requires user click', async () => {
  const s = setup();
  assert.equal(await offer(s), true);
  assert.equal(s.requests(), 0);
  assert.equal(s.panel().className, 'review-opportunity');
  assert.equal(s.writes[0].confirmed, true);
  assert.equal(JSON.parse(s.disk.get(KEY)).lastOfferedAt, NOW);
  await s.panel().querySelector('[data-review-request]').onclick();
  assert.equal(s.requests(), 1);
  assert.deepEqual(s.events.map(event => event.name), ['review_prompt_shown', 'review_request_attempt']);
  assert.equal(s.host.children.length, 0);
});

test('preview and unsupported native versions never offer review or load native APIs unnecessarily', async () => {
  const preview = setup({ native: false });
  assert.equal(await offer(preview), false);
  assert.equal(preview.loads(), 0);
  const unsupported = setup({ supported: false });
  assert.equal(await offer(unsupported), false);
  assert.equal(unsupported.host.children.length, 0);
  assert.equal(unsupported.disk.size, 0);
});

test('Not now dismisses the current session and persisted offer cooldown suppresses the next session', async () => {
  const s = setup();
  await offer(s);
  await s.panel().querySelector('[data-review-dismiss]').onclick();
  assert.equal(await offer(s), false);
  assert.equal(s.requests(), 0);
  assert.equal(s.host.children.length, 0);
  assert.equal(await offer(setup({ disk: s.disk })), false);
  const expired = new Map([[KEY, JSON.stringify({ lastOfferedAt: NOW - 31 * 86400000 })]]);
  assert.equal(await offer(setup({ disk: expired })), true);
});

test('review opt out persists using the account scoped storage interface', async () => {
  const s = setup();
  await offer(s);
  await s.panel().querySelector('[data-review-opt-out]').onclick();
  assert.equal(JSON.parse(s.disk.get(KEY)).optOut, true);
  assert.equal(s.host.children.length, 0);
  assert.equal(await offer(setup({ disk: s.disk })), false);
  assert.equal(s.requests(), 0);
});

test('failed cooldown persistence offers no prompt and concurrent opportunities remain single', async () => {
  const failed = setup({ failWrite: true });
  assert.equal(await offer(failed), false);
  assert.equal(failed.host.children.length, 0);
  let release;
  const s = setup({ writeGate: new Promise(resolve => { release = resolve; }) });
  const first = offer(s), second = offer(s);
  release();
  assert.deepEqual(await Promise.all([first, second]), [true, false]);
  assert.equal(s.host.children.length, 1);
});

test('review request failure stays optional, reports only failure and does not retry within the session', async () => {
  const s = setup({ requestFail: true });
  await offer(s);
  const button = s.panel().querySelector('[data-review-request]');
  await button.onclick();
  await button.onclick();
  assert.equal(s.requests(), 1);
  assert.equal(button.disabled, true);
  assert.deepEqual(s.events.map(event => event.name), ['review_prompt_shown', 'review_request_attempt', 'review_request_failure']);
  assert.match(s.panel().querySelector('[data-review-status]').textContent, /열지 못했어요/);
  assert.equal(await offer(s), false);
});

test('navigation during support or cooldown resolution does not append to a detached host', async () => {
  let release;
  const s = setup({ writeGate: new Promise(resolve => { release = resolve; }) });
  const pending = offer(s);
  s.host.isConnected = false;
  release();
  assert.equal(await pending, false);
  assert.equal(s.host.children.length, 0);
  assert.equal(s.requests(), 0);
});

test('malformed saved review preferences are left untouched and suppress optional solicitation', async () => {
  for (const raw of ['true', '[]', 'null', '"disabled"', '{"optOut":"true"}', '{"lastOfferedAt":"recent"}']) {
    const disk = new Map([[KEY, raw]]), s = setup({ disk });
    assert.equal(await offer(s), false);
    assert.equal(disk.get(KEY), raw);
    assert.equal(s.host.children.length, 0);
  }
});
