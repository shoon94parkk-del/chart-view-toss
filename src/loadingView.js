const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function loadingIndicator(label){
 return `<div class="loading-indicator" role="status" aria-live="polite"><span class="loading-spinner" aria-hidden="true"></span><span>${escapeHtml(label)}</span></div>`;
}

export function chartLoadingPreview(label){
 return `<div class="chart-loading-scaffold" aria-hidden="true"><span class="chart-skeleton-axis chart-skeleton-axis-top"></span><span class="chart-skeleton-axis chart-skeleton-axis-middle"></span><span class="chart-skeleton-axis chart-skeleton-axis-bottom"></span><svg viewBox="0 0 320 170" preserveAspectRatio="none"><path d="M0 125 C35 120 50 80 82 91 S135 138 164 98 S216 65 246 78 S289 37 320 46"/></svg></div><div class="chart-loading-message">${loadingIndicator(label)}</div>`;
}
