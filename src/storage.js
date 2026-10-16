import { Storage, User } from '@apps-in-toss/web-framework';
import { isAppsInTossRuntime } from './tossBridge.js';

export const WATCHLIST_KEY = 'chartview-toss-watchlist-v1';
export const SELECTED_KEY = 'chartview-toss-selected-v1';
export const RESEARCH_KEY = 'chartview-toss-research-v1';
export const REVIEW_KEY = 'chartview-toss-review-v1';
export const HOME_JOURNEY_KEY = 'chartview-toss-home-journey-v1';
export const REVIEW_PROMPT_KEY = 'chartview-toss-review-prompt-v1';
export const RECENT_STOCKS_KEY = 'chartview-toss-recent-stocks-v1';
export const WATCH_SORT_KEY = 'chartview-toss-watch-sort-v1';
export const BRIEFING_KEY = 'chartview-toss-briefing-v1';
const keys = [WATCHLIST_KEY, SELECTED_KEY, RESEARCH_KEY, REVIEW_KEY, HOME_JOURNEY_KEY, REVIEW_PROMPT_KEY, RECENT_STOCKS_KEY, WATCH_SORT_KEY, BRIEFING_KEY];
const IDENTITY_KEY = 'chartview-toss-identity-v1';
const USAGE_KEY = 'chartview-toss-usage-v1';
const WEB_VISITOR_KEY = 'chartview-toss-visitor-v1';
const cache = new Map();
const committed = new Map();
const writeVersions = new Map();
let queue = Promise.resolve();
let nativeReady = false;
let nativeWriteBlocked = false;
let namespace = '';
let storageGeneration = 0;
const scoped = key => namespace ? `${key}:${namespace}` : key;

// Deferred local transactions must belong to the account/reset that created them.
export function getStorageContext() { return storageGeneration; }
export function isStorageContextCurrent(context) {
  return context === storageGeneration && (!isAppsInTossRuntime() || nativeReady);
}

async function bridgeCall(operation) {
  let timer;
  try {
    return await Promise.race([operation(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Storage bridge timeout')), 5000);
    })]);
  } finally { clearTimeout(timer); }
}

export async function initializeStorage() {
  if (!isAppsInTossRuntime()) return;
  storageGeneration++;
  nativeReady = false;
  await bridgeCall(() => queue.catch(() => {}));
  const identity = await bridgeCall(() => User.getAnonymousKey());
  if (identity?.type !== 'HASH' || typeof identity.hash !== 'string' || !identity.hash.trim()) throw new Error('Identity unavailable');
  const previous = await bridgeCall(() => Storage.getItem(IDENTITY_KEY));
  namespace = identity.hash;
  // Do not overwrite native data with defaults if the bridge cannot load it.
  const values = await bridgeCall(() => Promise.all(keys.map(key => Storage.getItem(scoped(key)))));
  // Only the first identified user can adopt this device's legacy unscoped lists.
  if (!previous) {
    const legacy = await bridgeCall(() => Promise.all(keys.map(key => Storage.getItem(key))));
    for (let i = 0; i < keys.length; i++) {
      if (values[i] == null && legacy[i] != null) {
        await bridgeCall(() => Storage.setItem(scoped(keys[i]), legacy[i]));
        values[i] = legacy[i];
      }
    }
  }
  await bridgeCall(() => Storage.setItem(IDENTITY_KEY, identity.hash));
  await bridgeCall(() => Promise.all(keys.map(key => Storage.removeItem(key))));
  let usage;
  const savedUsage = await bridgeCall(() => Storage.getItem(scoped(USAGE_KEY)));
  try { usage = JSON.parse(savedUsage); } catch { usage = null; }
  const now = new Date().toISOString();
  await bridgeCall(() => Storage.setItem(scoped(USAGE_KEY), JSON.stringify({
    firstUsedAt: usage?.firstUsedAt || now, lastUsedAt: now,
    visits: Number.isSafeInteger(usage?.visits) && usage.visits >= 0 ? usage.visits + 1 : 1,
  })));
  values.forEach((value, index) => {
    cache.set(keys[index], value);
    committed.set(keys[index], value);
  });
  nativeReady = true;
  nativeWriteBlocked = false;
}

export function getActivityVisitorId() {
  if (isAppsInTossRuntime()) return namespace ? `toss:${namespace}` : null;
  try {
    let value = localStorage.getItem(WEB_VISITOR_KEY);
    if (!value) {
      const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      value = `web:${random}`;
      localStorage.setItem(WEB_VISITOR_KEY, value);
    }
    return value;
  } catch { return null; }
}

export function readStored(key) {
  return isAppsInTossRuntime() ? (nativeReady ? cache.get(key) ?? null : null) : localStorage.getItem(key);
}

export function writeStored(key, value, { confirmed = false } = {}) {
  if (!isAppsInTossRuntime()) { localStorage.setItem(key, value); return; }
  if (!nativeReady) throw new Error('Storage not ready');
  const target = scoped(key);
  const version = (writeVersions.get(key) || 0) + 1;
  writeVersions.set(key, version);
  // Research/review callers read immediately after saving. List transactions
  // opt into confirmed writes so their state changes only after bridge success.
  if (!confirmed) cache.set(key, value);
  let expired = false;
  queue = queue.catch(() => {}).then(async () => {
    if (expired) return;
    if (nativeWriteBlocked) throw new Error('Storage not ready');
    const previous = committed.get(key) ?? null;
    try {
      // A caller timeout does not cancel the native operation. Keep the queue
      // behind its real settlement and repair a late success before any retry.
      await Storage.setItem(target, value);
      if (expired) {
        try {
          if (previous == null) await Storage.removeItem(target);
          else await Storage.setItem(target, previous);
        } catch (error) {
          nativeReady = false;
          nativeWriteBlocked = true;
          document.dispatchEvent(new Event('chartview:storage-error'));
          throw error;
        }
        return;
      }
      committed.set(key, value);
      if (writeVersions.get(key) === version) cache.set(key, value);
    } catch (error) {
      // A failed older save must not undo a newer caller's optimistic value.
      if (writeVersions.get(key) === version) cache.set(key, committed.get(key) ?? null);
      throw error;
    }
  });
  const result = bridgeCall(() => queue).catch(error => {
    expired = true;
    if (writeVersions.get(key) === version) cache.set(key, committed.get(key) ?? null);
    throw error;
  });
  result.catch(() => document.dispatchEvent(new Event('chartview:storage-error')));
  return result;
}

export async function clearStored() {
  storageGeneration++;
  if (!isAppsInTossRuntime()) { [...keys, WEB_VISITOR_KEY].forEach(key => localStorage.removeItem(key)); return; }
  if (!nativeReady) throw new Error('Storage not ready');
  let expired = false;
  const versions = new Map(keys.map(key => [key, writeVersions.get(key)]));
  queue = queue.catch(() => {}).then(async () => {
    if (expired) return;
    const targets = [...keys, USAGE_KEY];
    // Wait for every removal even if one fails, so a late removal cannot erase
    // a following save after the caller has already received an error.
    const results = await Promise.allSettled(targets.map(key => Storage.removeItem(scoped(key))));
    results.forEach((result, index) => {
      const key = targets[index];
      if (result.status !== 'fulfilled' || !keys.includes(key)) return;
      committed.delete(key);
      if (writeVersions.get(key) === versions.get(key)) cache.delete(key);
    });
    const failure = results.find(result => result.status === 'rejected');
    if (failure) throw failure.reason;
  });
  try { await bridgeCall(() => queue); }
  catch (error) { expired = true; throw error; }
}
