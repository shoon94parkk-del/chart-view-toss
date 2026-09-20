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
  if (isAppsInTossRuntime()) {
    try {
      if (Device?.openURL?.isSupported && !Device.openURL.isSupported()) throw new Error('unsupported');
      await Device.openURL({ url });
      return true;
    } catch {
      // Fall through to browser behavior for the Render preview.
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
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
