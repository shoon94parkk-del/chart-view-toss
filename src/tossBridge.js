import { Device, Environment, Screen, graniteEvent } from '@apps-in-toss/web-framework';

let backCleanup = null;

export function isAppsInTossRuntime() {
  try {
    const runtime = String(Environment.environment || '').toLowerCase();
    return runtime === 'toss' || runtime === 'sandbox';
  } catch {
    return false;
  }
}

export function applyRuntimeClass() {
  const enabled = isAppsInTossRuntime();
  document.documentElement.dataset.aitRuntime = enabled ? 'true' : 'false';
  document.addEventListener('gesturestart', event => event.preventDefault(), { passive: false });
  document.addEventListener('touchmove', event => {
    if (event.touches.length > 1) event.preventDefault();
  }, { passive: false });
  return enabled;
}

export async function haptic(type = 'tickWeak') {
  if (!isAppsInTossRuntime()) return false;
  try {
    if (Device?.triggerHaptic?.isSupported && !Device.triggerHaptic.isSupported()) return false;
    await Device.triggerHaptic({ type });
    return true;
  } catch {
    return false;
  }
}

export async function openExternal(url) {
  if (!url) return false;
  let target;
  try { target = new URL(url, location.href); } catch { return false; }
  if (target.protocol !== 'https:') return false;
  if (isAppsInTossRuntime()) {
    try {
      if (Device?.openURL?.isSupported && !Device.openURL.isSupported()) throw new Error('unsupported');
      await Device.openURL({ url: target.href });
      return true;
    } catch {
      return false;
    }
  }
  window.open(target.href, '_blank', 'noopener,noreferrer');
  return false;
}

export function syncNativeBackHandler({ isRoot, onBack }) {
  if (backCleanup) {
    try { backCleanup(); } catch {}
    backCleanup = null;
  }

  // On the first screen we intentionally leave the native back action alone.
  // Apps in Toss can then show its own exit behavior.
  if (isRoot || !isAppsInTossRuntime()) return;

  try {
    backCleanup = graniteEvent.addEventListener('backEvent', {
      onEvent: () => onBack?.(),
      onError: () => {},
    });
  } catch {
    backCleanup = null;
  }
}

export async function closeMiniApp() {
  if (!isAppsInTossRuntime()) return false;
  try {
    await Screen.close();
    return true;
  } catch {
    return false;
  }
}
