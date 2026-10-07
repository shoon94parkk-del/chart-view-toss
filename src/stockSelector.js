import { searchStocks } from './api.js';
import { loadingIndicator } from './loadingView.js';
import { haptic, syncNativeBackHandler } from './tossBridge.js';

const esc = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

let activeClose = null;
let querySeq = 0;

export function resolvedSelectorName(name, symbol) {
  const value = String(name || '').trim();
  const ticker = String(symbol || '').trim();
  return value && value.toUpperCase() !== ticker.toUpperCase() ? value : '';
}

// 운영자 수정 2026-10-03: 백엔드가 미확인 입력을 그대로 돌려주는 DIRECT 에코는
// 검증된 종목명이 없으면 검색 결과에서 제외한다 (무효 티커 상세 진입 차단).
export function isVerifiableSearchRow(row) {
  return Boolean(resolvedSelectorName(row?.name, row?.symbol)) || row?.type !== 'DIRECT';
}

export function formatSelectedStockLabel(name, symbol) {
  const ticker = String(symbol || '').trim();
  const resolved = resolvedSelectorName(name, ticker);
  return resolved ? `${resolved} (${ticker})` : ticker;
}

export async function lookupSelectorName(symbol, search = searchStocks) {
  const ticker = String(symbol || '').trim();
  if (!ticker) return '';
  const data = await search(ticker);
  const exact = (data?.results || []).find(
    row => String(row?.symbol || '').toUpperCase() === ticker.toUpperCase(),
  );
  return resolvedSelectorName(exact?.name, ticker);
}

export function prioritizeStocks(rows, favorites = []) {
  const rank = new Map(favorites.map((row, index) => [String(row.symbol || '').toUpperCase(), index]));
  const seen = new Set();
  return rows.filter(row => {
    const symbol = String(row?.symbol || '').toUpperCase();
    if (!symbol || seen.has(symbol)) return false;
    seen.add(symbol);
    return true;
  }).sort((a, b) => (rank.get(String(a.symbol).toUpperCase()) ?? Infinity) -
    (rank.get(String(b.symbol).toUpperCase()) ?? Infinity));
}

export function closeStockSelector() {
  activeClose?.();
}

export function openStockSelector({
  title = '종목 선택',
  description = '최대 6개까지 선택할 수 있어요.',
  initial = [],
  limit = 6,
  favorites = [],
  nameFor = (symbol) => symbol,
  onApply,
  onPick,
  pickLabel = '상세 보기',
  restoreBack,
}) {
  activeClose?.();

  const returnFocus = document.activeElement;
  const app = document.querySelector('#app');
  const wasInert = app?.inert;
  const draft = new Set(initial);
  const searchOnly = typeof onPick === 'function';
  const favoriteRows = prioritizeStocks(favorites.filter(row => row?.symbol).map(row => ({
    symbol: row.symbol, name: row.name || nameFor(row.symbol), market: row.market || '',
  })));
  const favoriteSymbols = new Set(favoriteRows.map(row => String(row.symbol).toUpperCase()));
  const favoriteNames = new Map(favoriteRows.map(row => [String(row.symbol).toUpperCase(), resolvedSelectorName(row.name, row.symbol)]));
  const names = new Map(initial.map((symbol) => {
    const favoriteName = favoriteNames.get(String(symbol).toUpperCase());
    return [symbol, favoriteName || resolvedSelectorName(nameFor(symbol), symbol) || ''];
  }));
  const overlay = document.createElement('div');
  overlay.className = 'selector-overlay';
  overlay.innerHTML = `
    <section class="selector-sheet" role="dialog" aria-modal="true" aria-labelledby="selector-title">
      <div class="selector-handle" aria-hidden="true"></div>
      <header class="selector-head">
        <div><h2 id="selector-title">${esc(title)}</h2><p>${esc(description)}</p></div>
        <button class="selector-close" type="button" aria-label="닫기">×</button>
      </header>
      <div class="selector-search">
        <span aria-hidden="true">⌕</span>
        <input id="selector-search-input" autocomplete="off" aria-label="종목명, 코드 또는 티커 검색" enterkeyhint="search" placeholder="종목명 · 코드 · 티커 검색">
        <button type="button" data-selector-clear aria-label="검색어 지우기" hidden>×</button>
      </div>
      <div class="selector-selected" id="selector-selected"></div>
      <div class="selector-message" id="selector-message" aria-live="polite"></div>
      <div class="selector-results" id="selector-results">
        <div class="selector-empty">관심종목을 확인하고 있어요.</div>
      </div>
      <footer class="selector-footer">
        <button class="selector-cancel" type="button">취소</button>
        <button class="selector-apply" type="button"></button>
      </footer>
    </section>`;

  document.body.appendChild(overlay);
  if (app) app.inert = true;
  overlay.querySelector('.selector-sheet').classList.toggle('search-only', searchOnly);
  document.body.classList.add('sheet-open');

  const selectedEl = overlay.querySelector('#selector-selected');
  const resultEl = overlay.querySelector('#selector-results');
  const messageEl = overlay.querySelector('#selector-message');
  const input = overlay.querySelector('#selector-search-input');
  const apply = overlay.querySelector('.selector-apply');
  const clear = overlay.querySelector('[data-selector-clear]');

  const renderSelected = () => {
    if (searchOnly) return;
    selectedEl.innerHTML = draft.size
      ? [...draft].map((symbol) => {
          const name = resolvedSelectorName(names.get(symbol), symbol);
          return `<button type="button" data-selected-remove="${esc(symbol)}" aria-label="${esc(name || symbol)} 선택 해제"><span>${esc(name || '종목명 확인 중')}</span><small>${esc(symbol)}</small><b aria-hidden="true">×</b></button>`;
        }).join('')
      : '<span class="selector-none">선택한 종목이 없어요.</span>';
    apply.textContent = draft.size ? `${draft.size}개 종목 적용` : '선택 없이 적용';
    selectedEl.querySelectorAll('[data-selected-remove]').forEach((button) => {
      button.onclick = () => {
        const next = button.nextElementSibling || button.previousElementSibling;
        const nextSymbol = next?.dataset.selectedRemove;
        draft.delete(button.dataset.selectedRemove);
        messageEl.textContent = '';
        haptic('tickWeak');
        renderSelected();
        paintResults(lastRows);
        ([...selectedEl.querySelectorAll('button')].find(el => el.dataset.selectedRemove === nextSymbol) || input).focus({preventScroll:true});
      };
    });
  };

  let lastRows = [];
  let currentQuery = '';
  let searchState = 'idle';
  const paintResults = (rows, query = currentQuery) => {
    const scrollTop = resultEl.scrollTop;
    const focusSymbol = resultEl.contains(document.activeElement) ? document.activeElement.dataset.selectorSymbol : null;
    lastRows = prioritizeStocks(rows, favoriteRows);
    const visible = query ? lastRows : favoriteRows;
    resultEl.innerHTML = visible.length
      ? `${favoriteSymbols.has(String(visible[0].symbol).toUpperCase()) ? '<div class="selector-group-heading">내 관심종목</div>' : ''}${visible.map((row, index) => {
          const chosen = !searchOnly && draft.has(row.symbol);
          const isFavorite = favoriteSymbols.has(String(row.symbol).toUpperCase());
          const previousFavorite = index > 0 && favoriteSymbols.has(String(visible[index - 1].symbol).toUpperCase());
          return `${query && !isFavorite && (index === 0 || previousFavorite) ? '<div class="selector-group-heading">검색 결과</div>' : ''}<button type="button" class="${chosen ? 'selected' : ''}" ${searchOnly ? '' : `aria-pressed="${chosen}"`} data-selector-symbol="${esc(row.symbol)}" data-selector-name="${esc(row.name || row.symbol)}">
            <span><strong>${esc(row.name || row.symbol)}</strong><small>${esc(row.symbol)}${row.market ? ` · ${esc(row.market)}` : ''}</small></span>
            <b>${searchOnly ? esc(pickLabel) : chosen ? '선택됨' : isFavorite ? '관심종목' : '선택'}</b>
          </button>`;
        }).join('')}`
      : searchState === 'idle' ? `<div class="selector-empty">${query ? '검색 결과가 없어요. 이름·6자리 코드·영문 티커를 확인해보세요.<button type="button" class="selector-retry" data-selector-retry>검색 다시 확인</button>' : '관심종목이 없어요. 이름이나 티커로 검색해보세요.'}</div>` : '';
    if (searchState === 'loading') resultEl.insertAdjacentHTML('beforeend', loadingIndicator('종목을 검색하고 있어요'));
    if (searchState === 'error') {
      resultEl.insertAdjacentHTML('beforeend', '<div class="selector-empty" role="status">검색을 완료하지 못했어요. 관심종목은 계속 선택할 수 있어요.<button type="button" class="selector-retry" data-selector-retry>검색 다시 시도</button></div>');
      resultEl.querySelector('[data-selector-retry]').onclick = () => searchQuery(true);
    }
    if (searchState === 'partial') resultEl.insertAdjacentHTML('beforeend', '<div class="selector-empty" role="status">일부 검색 자료를 확인하지 못했어요. 확인된 종목은 선택할 수 있어요.<button type="button" class="selector-retry" data-selector-retry>검색 다시 확인</button></div>');
    if(['idle','partial'].includes(searchState))resultEl.querySelector('[data-selector-retry]')?.addEventListener('click',()=>searchQuery(true));

    resultEl.querySelectorAll('[data-selector-symbol]').forEach((button) => {
      button.onclick = () => {
        const symbol = button.dataset.selectorSymbol;
        if (searchOnly) {
          const name = button.dataset.selectorName || symbol;
          close();
          onPick(symbol, name);
          return;
        }
        let added = false;
        if (draft.has(symbol)) {
          draft.delete(symbol);
          messageEl.textContent = '';
        } else if (draft.size >= limit) {
          messageEl.textContent = `최대 ${limit}개까지 선택할 수 있어요. 기존 종목을 하나 해제해주세요.`;
          haptic('error');
          return;
        } else {
          draft.add(symbol);
          added = true;
          names.set(symbol, button.dataset.selectorName || symbol);
          messageEl.textContent = '';
        }
        haptic('tickWeak');
        renderSelected();
        if (added) selectedEl.lastElementChild?.scrollIntoView({block:'nearest',inline:'nearest'});
        paintResults(lastRows);
      };
    });
    resultEl.scrollTop = scrollTop;
    if (focusSymbol) [...resultEl.querySelectorAll('[data-selector-symbol]')].find(el => el.dataset.selectorSymbol === focusSymbol)?.focus({preventScroll:true});
  };

  let timer = null;
  let searchController = null;
  paintResults(favoriteRows);

  // Initial comparison selections may only have a ticker (for example MU or
  // 204620.KQ). Resolve exact stock names in the background so the selected
  // chips always show "company name + ticker" instead of duplicating the ticker.
  void Promise.all([...draft].map(async (symbol) => {
    if (resolvedSelectorName(names.get(symbol), symbol)) return;
    try {
      const name = await lookupSelectorName(symbol);
      if (!name || !overlay.isConnected || !draft.has(symbol)) return;
      names.set(symbol, name);
      renderSelected();
    } catch {
      // Keep the selector usable; unresolved names stay explicitly pending.
    }
  }));

  const searchQuery = (immediate = false) => {
    clearTimeout(timer);
    searchController?.abort();
    const query = input.value.trim();
    currentQuery = query;
    clear.hidden = !input.value;
    resultEl.scrollTop = 0;
    const seq = ++querySeq;
    if (!query) {
      searchState = 'idle';
      paintResults(favoriteRows, '');
      return;
    }
    searchState = 'loading';
    const matchedFavorites = favoriteRows.filter(row => `${row.name} ${row.symbol}`.toLowerCase().includes(query.toLowerCase()));
    paintResults(matchedFavorites, query);
    timer = setTimeout(async () => {
      searchController = new AbortController();
      try {
        const data = await searchStocks(query, {force: immediate, signal: searchController.signal});
        if (seq !== querySeq || !overlay.isConnected) return;
        searchState = data?.partialFailure ? 'partial' : 'idle';
        // 운영자 수정 2026-10-03: 백엔드가 미확인 입력을 그대로 돌려주는 DIRECT 에코는
        // 검증된 종목명이 없으면 결과에서 제외 → '상세 보기' 폴백 버튼 생성 억제
        const verified = (data?.results || []).filter(isVerifiableSearchRow);
        paintResults([...matchedFavorites, ...verified.slice(0, 12)], query);
      } catch (error) {
        if (seq !== querySeq || !overlay.isConnected) return;
        searchState = 'error';
        paintResults(matchedFavorites, query);
      }
    }, immediate ? 0 : 180);
  };
  input.addEventListener('input', () => searchQuery());
  clear.onclick = () => { input.value = ''; searchQuery(); input.focus({preventScroll:true}); };

  const close = () => {
    if (!overlay.isConnected) return;
    ++querySeq;
    clearTimeout(timer);
    searchController?.abort();
    overlay.remove();
    document.removeEventListener('keydown', onKeyDown, true);
    if (app) app.inert = wasInert;
    document.body.classList.remove('sheet-open');
    activeClose = null;
    restoreBack?.();
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
  };
  const onKeyDown = event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key !== 'Tab') return;
    const controls = [...overlay.querySelectorAll('button,input')].filter(el => !el.disabled && !el.hidden && el.getClientRects().length);
    const index = controls.indexOf(document.activeElement);
    if (index < 0 || (!event.shiftKey && index === controls.length - 1) || (event.shiftKey && index === 0)) {
      event.preventDefault();
      (event.shiftKey ? controls.at(-1) : controls[0])?.focus();
    }
  };
  document.addEventListener('keydown', onKeyDown, true);
  activeClose = close;

  overlay.querySelector('.selector-close').onclick = close;
  overlay.querySelector('.selector-cancel').onclick = close;
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  apply.onclick = () => {
    const selected = [...draft];
    const selectedNames = Object.fromEntries(selected.map((symbol) => [symbol, resolvedSelectorName(names.get(symbol), symbol) || symbol]));
    close();
    onApply?.(selected, selectedNames);
  };

  renderSelected();
  syncNativeBackHandler({ isRoot: false, onBack: close });
  requestAnimationFrame(() => { if (overlay.isConnected) input.focus(); });
}
