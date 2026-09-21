import { Storage, User } from '@apps-in-toss/web-framework';
import { isAppsInTossRuntime } from './tossBridge.js';

export const WATCHLIST_KEY = 'chartview-toss-watchlist-v1';
export const SELECTED_KEY = 'chartview-toss-selected-v1';
const keys = [WATCHLIST_KEY, SELECTED_KEY];
const IDENTITY_KEY = 'chartview-toss-identity-v1';
const USAGE_KEY = 'chartview-toss-usage-v1';
const cache = new Map();
let queue = Promise.resolve();
let nativeReady = false;
let namespace = '';
const scoped = key => namespace ? `${key}:${namespace}` : key;

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
  nativeReady = false;
  await queue.catch(() => {});
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
  values.forEach((value, index) => cache.set(keys[index], value));
  nativeReady = true;
}

export function readStored(key) {
  return isAppsInTossRuntime() ? cache.get(key) ?? null : localStorage.getItem(key);
}

export function writeStored(key, value) {
  if (!isAppsInTossRuntime()) { localStorage.setItem(key, value); return; }
  if (!nativeReady) throw new Error('Storage not ready');
  cache.set(key, value);
  const target = scoped(key);
  queue = queue.catch(() => {}).then(() => bridgeCall(() => Storage.setItem(target, value)));
  queue.catch(() => document.dispatchEvent(new Event('chartview:storage-error')));
}

export async function clearStored() {
  if (!isAppsInTossRuntime()) { keys.forEach(key => localStorage.removeItem(key)); return; }
  if (!nativeReady) throw new Error('Storage not ready');
  queue = queue.catch(() => {}).then(async () => {
    await bridgeCall(() => Promise.all([...keys, USAGE_KEY].map(key => Storage.removeItem(scoped(key)))));
    keys.forEach(key => cache.delete(key));
  });
  await queue;
}
