import { REVIEW_PROMPT_KEY, readStored, writeStored } from './storage.js';
import { isAppsInTossRuntime } from './tossBridge.js';
import { trackUsage, newUsageOperation } from './usageMetrics.js';
import './reviewPrompt.css';

const COOLDOWN_MS = 30 * 86400000;
const sources = new Set(['watchlist', 'comparison', 'research']);
let offered = false, pending = false, requested = false, sdkPromise = null;

// Call only after a meaningful storage action has actually committed.
// This is an optional inline opportunity; native review opens only on a user tap.
export async function offerReviewOpportunity(container, { source, operationId = newUsageOperation() } = {}) {
  if (offered || pending || !container?.isConnected || !sources.has(source)) return false;
  pending = true;
  try {
    if (!isAppsInTossRuntime()) return false;
    sdkPromise ||= import('@apps-in-toss/web-framework');
    const sdk = await sdkPromise;
    const request = sdk.Review?.request;
    if (typeof request !== 'function' || typeof request.isSupported !== 'function' || !request.isSupported()) return false;
    let state = {};
    try { state = JSON.parse(readStored(REVIEW_PROMPT_KEY) || '{}'); } catch { return false; }
    if (!state || typeof state !== 'object' || Array.isArray(state)) return false;
    if (state.optOut != null && typeof state.optOut !== 'boolean') return false;
    if (state.lastOfferedAt != null && (typeof state.lastOfferedAt !== 'number' || !Number.isFinite(state.lastOfferedAt) || state.lastOfferedAt < 0)) return false;
    const now = Date.now();
    if (state.optOut === true || (typeof state.lastOfferedAt === 'number' && now - state.lastOfferedAt < COOLDOWN_MS)) return false;
    if (!container.isConnected) return false;
    const nextState = { lastOfferedAt: now, optOut: false };
    await writeStored(REVIEW_PROMPT_KEY, JSON.stringify(nextState), { confirmed: true });
    if (!container.isConnected) return false;
    offered = true;
    const panel = document.createElement('aside');
    panel.className = 'review-opportunity';
    panel.setAttribute('aria-label', '이용 후기');
    panel.innerHTML = '<div><strong>이용 경험을 들려주세요</strong><p>후기는 Chart View를 개선하는 데 도움이 돼요. 원할 때 남겨주세요.</p></div><div class="review-opportunity-actions"><button type="button" data-review-request>이용 후기 남기기</button><button type="button" data-review-dismiss>지금은 건너뛰기</button><button type="button" data-review-opt-out>다시 안내하지 않기</button></div><p data-review-status role="status"></p>';
    container.appendChild(panel);
    void trackUsage('review_prompt_shown', { operationId, params: { source } });
    const button = panel.querySelector('[data-review-request]');
    button.onclick = async () => {
      if (requested || button.disabled || !panel.isConnected) return;
      requested = true;
      button.disabled = true;
      void trackUsage('review_request_attempt', { operationId, params: { source } });
      try {
        await request();
        // Promise<void> does not reveal whether a review was shown or submitted.
        panel.remove();
      } catch {
        void trackUsage('review_request_failure', { operationId, params: { source, code: 'unknown' } });
        if (panel.isConnected) panel.querySelector('[data-review-status]').textContent = '후기 화면을 열지 못했어요. 나중에 다시 이용해주세요.';
      }
    };
    panel.querySelector('[data-review-dismiss]').onclick = () => {
      void trackUsage('review_prompt_dismissed', { operationId, params: { source } });
      panel.remove();
    };
    const optOut = panel.querySelector('[data-review-opt-out]');
    optOut.onclick = async () => {
      if (optOut.disabled) return;
      optOut.disabled = true;
      try {
        await writeStored(REVIEW_PROMPT_KEY, JSON.stringify({ ...nextState, optOut: true }), { confirmed: true });
        void trackUsage('review_prompt_dismissed', { operationId, params: { source } });
        panel.remove();
      } catch {
        optOut.disabled = false;
        if (panel.isConnected) panel.querySelector('[data-review-status]').textContent = '안내 설정을 저장하지 못했어요. 다시 눌러주세요.';
      }
    };
    return true;
  } catch {
    return false;
  } finally {
    pending = false;
  }
}
