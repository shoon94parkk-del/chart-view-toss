// Runs in the browser. Terminal fallback is not successful data readiness.
export function performanceOutcome(route) {
  const visible = element => element && !element.closest('[hidden]') && element.getClientRects().length > 0;
  const elements = selector => [...document.querySelectorAll(selector)].filter(visible);
  const exportPanel = elements('[data-export-panel]:not([hidden])')[0];
  if(route==='watch'){
    const host=document.querySelector('#watch-rich-list');
    const state=host?.dataset.loadState;
    if(state)return state==='loading'?'pending':state;
    // The production audit can run before this PR is deployed. Inspect the
    // existing terminal markup as well as the newer explicit state markers.
    if(host?.querySelector('.watch-refresh-note'))return 'error';
    if(host?.querySelector('.watch-empty'))return 'empty';
    const prices=[...host?.querySelectorAll('.watch-card-price > strong')||[]];
    if(!prices.length||prices.some(el=>String(el.textContent).includes('확인 중')))return 'pending';
    return prices.some(el=>/\d/.test(el.textContent))?'ready':'unavailable';
  }
  const provisional=exportPanel?.querySelector('#export-provisional-radar');
  if(route.startsWith('exports')){
    const state=exportPanel?.dataset.loadState;
    if(state&&state!=='ready')return state==='loading'?'pending':state;
    if(provisional){
      if(provisional.dataset.loadState)return provisional.dataset.loadState==='loading'?'pending':provisional.dataset.loadState;
      if(provisional.querySelector('.export-provisional-error'))return 'error';
      if(!provisional.querySelector('[data-export-digest]'))return 'pending';
    }
    if(state)return state;
  }
  if (route === 'home' && !elements('#market-card .quote-card:not(.market-missing) strong').some(el => /\d/.test(el.textContent))) return 'unavailable';
  if(route.startsWith('gurus')&&elements('.guru-coverage strong span').some(el=>/검증\s*0\s*\//.test(el.textContent)))return 'unavailable';
  if(route.startsWith('detail')){
    const price=elements('#detail-price .quote-main > div:first-child strong')[0];
    if(!price||!/[0-9]/.test(price.textContent))return elements('#detail-price [data-retry-detail]').length?'error':'unavailable';
  }
  const scope = route.startsWith('exports') ? '#export-momentum-root' : route.startsWith('gurus') ? '#guru-data' : route.startsWith('picks') ? '#pick-ledger-summary' : (route==='home'?'#market-card':route.startsWith('detail')?'#detail-price':route==='chart'?'#chart-table-wrap':route==='watch'?'#watch-rich-list':route==='valuation'?'#valuation-list':route==='macro'?'#macro-groups':route.startsWith('news')?'#news-list':route==='memory'?'#memory-price-root':'#analysis-body');
  const notices = elements(`${scope} .empty,${scope} .guru-empty,${scope} [role="alert"]`);
  if (notices.some(el => /불러오지 못|불러올 수 없|연결.*확인|오류|실패/.test(el.textContent))) return 'error';
  if (notices.some(el => /자료.*부족|제공.*않|아직.*게시|지원.*않/.test(el.textContent))) return 'unavailable';
  if (notices.length) return 'empty';
  return 'ready';
}

export function dataRequestPath(value) {
  try {
    const path = new URL(value).pathname;
    return /\/api\/|\/static\/data\/|\/(?:screener|company_context|heatmap|full_heatmap_snapshot|pick_monitor|home_bootstrap|guru_investing|guru_screening)\.json$/.test(path) ? path : null;
  } catch { return null; }
}
