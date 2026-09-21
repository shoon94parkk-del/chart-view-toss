import { Storage } from '@apps-in-toss/web-framework';
import { isAppsInTossRuntime } from './tossBridge.js';

export const WATCHLIST_KEY = 'chartview-toss-watchlist-v1';
export const SELECTED_KEY = 'chartview-toss-selected-v1';
const keys = [WATCHLIST_KEY, SELECTED_KEY];
const cache = new Map();
let queue = Promise.resolve();
let nativeReady = false;

export async function initializeStorage() {
  if (!isAppsInTossRuntime()) return;
  // Do not overwrite native data with defaults if the bridge cannot load it.
  const values = await Promise.all(keys.map(key => Storage.getItem(key)));
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
  queue = queue.catch(() => {}).then(() => Storage.setItem(key, value));
  queue.catch(() => document.dispatchEvent(new Event('chartview:storage-error')));
}

export async function clearStored() {
  if (!isAppsInTossRuntime()) { keys.forEach(key => localStorage.removeItem(key)); return; }
  if (!nativeReady) throw new Error('Storage not ready');
  queue = queue.catch(() => {}).then(async () => {
    await Promise.all(keys.map(key => Storage.removeItem(key)));
    keys.forEach(key => cache.delete(key));
  });
  await queue;
}
