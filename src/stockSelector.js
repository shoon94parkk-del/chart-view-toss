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
  restoreBack,
}) {
  activeClose?.();

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
        <input id="selector-search-input" autocomplete="off" placeholder="종목명 · 코드 · 티커 검색">
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
  overlay.querySelector('.selector-sheet').classList.toggle('search-only', searchOnly);
  document.body.classList.add('sheet-open');

  const selectedEl = overlay.querySelector('#selector-selected');
  const resultEl = overlay.querySelector('#selector-results');
  const messageEl = overlay.querySelector('#selector-message');
  const input = overlay.querySelector('#selector-search-input');
  const apply = overlay.querySelector('.selector-apply');

  const renderSelected = () => {
    if (searchOnly) return;
    selectedEl.innerHTML = draft.size
      ? [...draft].map((symbol) => {
          const name = resolvedSelectorName(names.get(symbol), symbol);
          return `<button type="button" data-selected-remove="${esc(symbol)}"><span>${esc(name || '종목명 확인 중')}</span><small>${esc(symbol)}</small><b>×</b></button>`;
        }).join('')
      : '<span class="selector-none">선택한 종목이 없어요.</span>';
    apply.textContent = draft.size ? `${draft.size}개 종목 적용` : '선택 없이 적용';
    selectedEl.querySelectorAll('[data-selected-remove]').forEach((button) => {
      button.onclick = () => {
        draft.delete(button.dataset.selectedRemove);
        haptic('tickWeak');
        renderSelected();
        paintResults(lastRows);
      };
    });
  };

  let lastRows = [];
  let currentQuery = '';
  const paintResults = (rows, query = currentQuery) => {
    lastRows = prioritizeStocks(rows, favoriteRows);
    const visible = query ? lastRows : favoriteRows;
    resultEl.innerHTML = visible.length
      ? `${favoriteSymbols.has(String(visible[0].symbol).toUpperCase()) ? '<div class="selector-group-heading">내 관심종목</div>' : ''}${visible.map((row, index) => {
          const chosen = !searchOnly && draft.has(row.symbol);
          const isFavorite = favoriteSymbols.has(String(row.symbol).toUpperCase());
          const previousFavorite = index > 0 && favoriteSymbols.has(String(visible[index - 1].symbol).toUpperCase());
          return `${query && !isFavorite && (index === 0 || previousFavorite) ? '<div class="selector-group-heading">검색 결과</div>' : ''}<button type="button" class="${chosen ? 'selected' : ''}" data-selector-symbol="${esc(row.symbol)}" data-selector-name="${esc(row.name || row.symbol)}">
            <span><strong>${esc(row.name || row.symbol)}</strong><small>${esc(row.symbol)}${row.market ? ` · ${esc(row.market)}` : ''}</small></span>
            <b>${searchOnly ? '상세 보기' : chosen ? '선택됨' : isFavorite ? '관심종목' : '선택'}</b>
          </button>`;
        }).join('')}`
      : `<div class="selector-empty">${query ? '검색 결과가 없어요.' : '관심종목이 없어요. 이름이나 티커로 검색해보세요.'}</div>`;

    resultEl.querySelectorAll('[data-selector-symbol]').forEach((button) => {
      button.onclick = () => {
        const symbol = button.dataset.selectorSymbol;
        if (searchOnly) {
          const name = button.dataset.selectorName || symbol;
          close();
          onPick(symbol, name);
          return;
        }
        if (draft.has(symbol)) {
          draft.delete(symbol);
          messageEl.textContent = '';
        } else if (draft.size >= limit) {
          messageEl.textContent = `최대 ${limit}개까지 선택할 수 있어요. 기존 종목을 하나 해제해주세요.`;
          haptic('error');
          return;
        } else {
          draft.add(symbol);
          names.set(symbol, button.dataset.selectorName || symbol);
          messageEl.textContent = '';
        }
        haptic('tickWeak');
        renderSelected();
        paintResults(lastRows);
      };
    });
  };

  let timer = null;
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

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const query = input.value.trim();
    currentQuery = query;
    const seq = ++querySeq;
    if (!query) {
      paintResults(favoriteRows, '');
      return;
    }
    const matchedFavorites = favoriteRows.filter(row => `${row.name} ${row.symbol}`.toLowerCase().includes(query.toLowerCase()));
    paintResults(matchedFavorites, query);
    resultEl.insertAdjacentHTML('beforeend', loadingIndicator('종목을 검색하고 있어요'));
    timer = setTimeout(async () => {
      try {
        const data = await searchStocks(query);
        if (seq !== querySeq || !overlay.isConnected) return;
        paintResults([...matchedFavorites, ...(data?.results || []).slice(0, 12)], query);
      } catch (error) {
        if (seq !== querySeq || !overlay.isConnected) return;
        paintResults(matchedFavorites, query);
        resultEl.insertAdjacentHTML('beforeend', `<div class="selector-empty">추가 검색을 완료하지 못했어요.<small>${esc(error?.message || '')}</small></div>`);
      }
    }, 180);
  });

  const close = () => {
    if (!overlay.isConnected) return;
    ++querySeq;
    clearTimeout(timer);
    overlay.remove();
    document.body.classList.remove('sheet-open');
    activeClose = null;
    restoreBack?.();
  };
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
  requestAnimationFrame(() => input.focus());
}
