import { searchStocks } from './api.js';
import { haptic, syncNativeBackHandler } from './tossBridge.js';

const esc = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

let activeClose = null;
let querySeq = 0;

export function closeStockSelector() {
  activeClose?.();
}

export function openStockSelector({
  title = '종목 선택',
  description = '최대 6개까지 선택할 수 있어요.',
  initial = [],
  limit = 6,
  nameFor = (symbol) => symbol,
  onApply,
  restoreBack,
}) {
  activeClose?.();

  const draft = new Set(initial);
  const names = new Map(initial.map((symbol) => [symbol, nameFor(symbol)]));
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
        <div class="selector-empty">검색해서 종목을 추가해보세요.</div>
      </div>
      <footer class="selector-footer">
        <button class="selector-cancel" type="button">취소</button>
        <button class="selector-apply" type="button"></button>
      </footer>
    </section>`;

  document.body.appendChild(overlay);
  document.body.classList.add('sheet-open');

  const selectedEl = overlay.querySelector('#selector-selected');
  const resultEl = overlay.querySelector('#selector-results');
  const messageEl = overlay.querySelector('#selector-message');
  const input = overlay.querySelector('#selector-search-input');
  const apply = overlay.querySelector('.selector-apply');

  const renderSelected = () => {
    selectedEl.innerHTML = draft.size
      ? [...draft].map((symbol) => `<button type="button" data-selected-remove="${esc(symbol)}"><span>${esc(names.get(symbol) || nameFor(symbol))}</span><small>${esc(symbol)}</small><b>×</b></button>`).join('')
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
  const paintResults = (rows) => {
    lastRows = rows;
    resultEl.innerHTML = rows.length
      ? rows.map((row) => {
          const chosen = draft.has(row.symbol);
          return `<button type="button" class="${chosen ? 'selected' : ''}" data-selector-symbol="${esc(row.symbol)}" data-selector-name="${esc(row.name || row.symbol)}">
            <span><strong>${esc(row.name || row.symbol)}</strong><small>${esc(row.symbol)}${row.market ? ` · ${esc(row.market)}` : ''}</small></span>
            <b>${chosen ? '선택됨' : '선택'}</b>
          </button>`;
        }).join('')
      : '<div class="selector-empty">검색 결과가 없어요.</div>';

    resultEl.querySelectorAll('[data-selector-symbol]').forEach((button) => {
      button.onclick = () => {
        const symbol = button.dataset.selectorSymbol;
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
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const query = input.value.trim();
    if (!query) {
      lastRows = [];
      resultEl.innerHTML = '<div class="selector-empty">검색해서 종목을 추가해보세요.</div>';
      return;
    }
    resultEl.innerHTML = '<div class="selector-loading">검색 중...</div>';
    timer = setTimeout(async () => {
      const seq = ++querySeq;
      try {
        const data = await searchStocks(query);
        if (seq !== querySeq) return;
        paintResults((data?.results || []).slice(0, 12));
      } catch (error) {
        if (seq !== querySeq) return;
        resultEl.innerHTML = `<div class="selector-empty">검색을 완료하지 못했어요.<small>${esc(error?.message || '')}</small></div>`;
      }
    }, 180);
  });

  const close = () => {
    if (!overlay.isConnected) return;
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
    const selectedNames = Object.fromEntries(selected.map((symbol) => [symbol, names.get(symbol) || nameFor(symbol)]));
    close();
    onApply?.(selected, selectedNames);
  };

  renderSelected();
  syncNativeBackHandler({ isRoot: false, onBack: close });
  requestAnimationFrame(() => input.focus());
}
