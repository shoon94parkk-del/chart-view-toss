import { formatKst } from './dataPresentation.js';
import { INFLATION_SERIES, normalizeInflationPayload, inflationChart, inflationSourceUrl, formatInflationRate, inflationComparison, formatInflationReleaseRate } from './macroInflationModel.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const monthLabel = value => value ? value.replace('-', '.') : '미제공';
const stamp = value => {
  if (!value) return '미제공';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatKst(value, { dateOnly: true });
  return `${new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)).replaceAll('-', '.')} KST`;
};
const basisLabel = basis => basis === 'NSA' ? '비계절조정 (NSA)' : basis === 'SA' ? '계절조정 (SA)' : '계절조정 기준 미제공';
const rateLabel = rate => rate === 'mom' ? '전월 대비' : '전년 동월 대비';
const retry = (canRetry, label = '물가·일정 다시 확인') => canRetry ? `<button type="button" class="inflation-retry" data-inflation-retry>${label}</button>` : '';
const latest = row => row.points.find(point => point.month === row.asOf) || row.points.at(-1);
const publishedValue = row => latest(row)?.publishedAt || row.publishedAt;
const publicationStamp = row => {
  const published = publishedValue(row);
  return `${stamp(published)}${/^\d{4}-\d{2}-\d{2}$/.test(published) ? ' · 원문 날짜 · 시각 미제공' : ''}`;
};
const publicationDay = row => {
  const published = publishedValue(row);
  if (!published) return '발표일 미제공';
  const day = stamp(published).slice(0, 10);
  return `${day.startsWith(row.asOf?.slice(0, 4)) ? day.slice(5) : day} 발표${/^\d{4}-\d{2}-\d{2}$/.test(published) ? ' (원문 날짜)' : ''}`;
};
const observationPublication = row => `${monthLabel(row.asOf)} 지표 · ${publicationDay(row)}`;

function overview(model, selectedId) {
  return `<div class="inflation-overview-head" aria-hidden="true"><span>지표 · 관측월</span><span>전년 동월</span><span>전월</span></div><div class="inflation-series-list" role="group" aria-label="물가 지표 선택">${model.series.map(row => {
    const point = latest(row), unavailable = row.status === 'unavailable';
    return `<button type="button" class="inflation-series-row" data-inflation-series="${row.id}" aria-pressed="${row.id === selectedId}" ${unavailable ? 'disabled' : ''} aria-label="${esc(row.label)} · ${esc(observationPublication(row))} · 전년 동월 대비 ${formatInflationRate(point?.yoy)} · 전월 대비 ${formatInflationRate(point?.mom)}${unavailable ? ' · 자료 없음' : ''}"><span><b>${row.label}</b><small>${monthLabel(row.asOf)} 지표</small><small>${esc(publicationDay(row))}${row.status === 'stale' ? ' · 관측일 확인 필요' : row.status === 'partial' ? ' · 일부 미제공' : unavailable ? ' · 자료 없음' : ''}</small></span><strong>${formatInflationRate(point?.yoy)}</strong><strong>${formatInflationRate(point?.mom)}</strong></button>`;
  }).join('')}</div>`;
}

function comparisonMarkup(row, state) {
  const comparison = inflationComparison(row, state);
  const color = { lower: 'green', equal: 'yellow', higher: 'red', missing: 'gray' }[comparison.status];
  const label = { lower: '예상보다 낮음', equal: '예상과 같음', higher: '예상보다 높음', missing: '비교 미제공' }[comparison.status];
  const actualLabel = comparison.actualKind === 'first_release' ? '최초 발표값' : comparison.actualKind === 'index_calculated' ? '지수 계산값' : '자료 없음';
  const source = comparison.source;
  const evidence = comparison.forecast ? `<p class="inflation-comparison-note" data-testid="inflation-forecast-evidence">공급자 보관 예상치 · 사후 조회<br>조회 ${esc(stamp(comparison.forecast.retrievedAt))}</p>` : '';
  const explanation = comparison.reason === 'first_release_unverified' ? `<p class="inflation-comparison-note" data-testid="inflation-comparison-reason">최초 발표값과 공식 발표일이 함께 확인되지 않아 비교하지 않아요. ${comparison.actualKind === 'index_calculated' ? '현재 값은 지수 계산값이에요.' : '발표 결과 자료도 아직 없어요.'}</p>` : '';
  const coverage = row.forecastCoverage;
  const coverageText = { not_configured: '예상치 제공 준비 중이에요. 확인된 자료가 들어오면 표시해요.', unavailable: '예상치 자료를 확인하지 못했어요. 다시 확인해주세요.', partial: '예상치 자료가 일부만 확인됐어요. 관측월·변화 기준이 맞는 근거가 없으면 미제공이에요.', ok: '선택한 관측월·변화 기준의 확인된 예상치가 없으면 미제공으로 표시해요.' };
  const coverageMarkup = coverage ? `<p class="inflation-comparison-note" data-testid="inflation-forecast-coverage" data-forecast-coverage="${coverage.status}">${coverageText[coverage.status]}${coverage.checkedAt ? `<br>확인 ${esc(stamp(coverage.checkedAt))}` : ''}</p>` : '';
  const sources = source ? `<div class="inflation-comparison-sources"><button type="button" data-external-url="${esc(source.forecastUrl)}">${esc(source.forecastName)} 예상 원문 ↗</button>${comparison.actualKind === 'first_release' ? `<button type="button" data-external-url="${esc(source.actualUrl)}">발표 원문 ↗</button>` : ''}${comparison.forecast ? `<button type="button" data-external-url="${esc(comparison.forecast.archive.url)}">공급자 보관 근거 ↗</button>` : ''}</div>` : '<p class="inflation-comparison-note">시장 예상 자료 연동을 준비하고 있어요. 확인된 예상치가 없으면 미제공으로 표시해요.</p>';

  return `<div class="inflation-comparison" data-inflation-comparison="${comparison.status}" data-comparison-level="${color}" role="group" aria-label="시장 예상과 발표 결과 비교"><dl><div><dt>시장 예상</dt><dd data-comparison-expected>${formatInflationReleaseRate(comparison.expected)}</dd></div><div><dt>발표 결과</dt><dd data-comparison-actual data-comparison-actual-kind="${comparison.actualKind}">${formatInflationReleaseRate(comparison.actual)}<small>${actualLabel}</small></dd></div><div><dt>예상 대비</dt><dd data-comparison-label class="inflation-comparison-state is-${comparison.status}">${label}</dd></div></dl><p class="inflation-comparison-legend" aria-label="예상 대비 색상 범례"><span class="is-lower">초록 낮음</span><span class="is-equal">노랑 같음</span><span class="is-higher">빨강 높음</span><span class="is-missing">회색 미제공</span></p>${evidence}${explanation}${coverageMarkup}${sources}</div>`;
}

function plotMarkup(chart, row) {
  const observations = chart.rows.filter(point => point.value !== null);
  if (!observations.length) return '<div class="inflation-chart-empty">선택한 기준의 시계열이 없어요. 다른 변화 기준이나 지표를 확인해주세요.</div>';
  let min = Math.min(...observations.map(point => point.value)), max = Math.max(...observations.map(point => point.value));
  if (min === max) { min -= .5; max += .5; }
  const padding = (max - min) * .1; min -= padding; max += padding;
  const index = value => Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7));
  const first = index(chart.rows[0].month), range = Math.max(1, index(chart.rows.at(-1).month) - first);
  const x = point => chart.rows.length === 1 ? 174 : 40 + (index(point.month) - first) / range * 274;
  const y = value => 144 - (value - min) / (max - min) * 128;
  const guides = [max, (max + min) / 2, min].map(value => `<g><line x1="40" x2="314" y1="${y(value).toFixed(2)}" y2="${y(value).toFixed(2)}" class="inflation-gridline"/><text x="34" y="${(y(value) + 4).toFixed(2)}" text-anchor="end">${esc(value.toLocaleString('ko-KR', { maximumFractionDigits: 1 }))}</text></g>`).join('');
  const paths = chart.segments.map(segment => segment.length > 1 ? `<path d="${segment.map((point, i) => `${i ? 'L' : 'M'}${x(point).toFixed(2)},${y(point.value).toFixed(2)}`).join(' ')}" class="inflation-line"/>` : '').join('');
  const dots = chart.segments.map(segment => segment.length === 1 ? `<circle cx="${x(segment[0]).toFixed(2)}" cy="${y(segment[0].value).toFixed(2)}" r="3" class="inflation-dot"/>` : '').join('');
  const last = observations.at(-1), title = `${row.label} ${rateLabel(chart.rate)} 추이`;
  return `<svg class="inflation-chart-svg" viewBox="0 0 326 166" role="img" aria-labelledby="inflation-chart-title inflation-chart-desc"><title id="inflation-chart-title">${esc(title)}</title><desc id="inflation-chart-desc">${monthLabel(chart.rows[0].month)}부터 ${monthLabel(chart.rows.at(-1).month)}까지, ${basisLabel(row.basis[chart.rate])}, 단위 %. 마지막 확인값 ${monthLabel(last.month)} ${formatInflationRate(last.value)}. 빠진 관측은 연결하지 않아요. 아래 월별 변화율 표에서도 확인할 수 있어요.</desc>${guides}${min < 0 && max > 0 ? `<line x1="40" x2="314" y1="${y(0).toFixed(2)}" y2="${y(0).toFixed(2)}" class="inflation-zero"/>` : ''}${paths}${dots}<text x="40" y="163">${monthLabel(chart.rows[0].month)}</text><text x="314" y="163" text-anchor="end">${monthLabel(chart.rows.at(-1).month)}</text></svg>`;
}

const indicatorPurpose = id => ({ cpi: '소비자가 구매하는 상품·서비스의 가격 변화', core_cpi: '식품·에너지를 제외한 소비자 가격 변화', ppi: '생산자가 받는 상품·서비스의 가격 변화', core_ppi: '식품·에너지를 제외한 생산자 가격 변화', pce: '가계 소비 지출에 포함된 상품·서비스의 가격 변화', core_pce: '식품·에너지를 제외한 가계 소비 가격 변화' }[id] || '공식 물가 발표의 대상 관측월과 결과를 확인해요.');

function readingMarkup(row, state) {
  const chart = inflationChart(row.points, state), point = latest(row), basis = row.basis[state.rate];
  const sourceUrl = (basis === 'NSA' ? row.source.nsaUrl : basis === 'SA' ? row.source.saUrl : '') || row.source.url;
  return `<section class="inflation-reading" aria-label="${esc(row.label)} 시계열 읽기"><div class="inflation-reading-head"><div><h3>${row.label}</h3><p>${esc(indicatorPurpose(row.id))}</p><p>${esc(row.definition || '세부 정의 미제공')}</p></div><div class="inflation-current"><b data-inflation-value>${formatInflationRate(point?.[state.rate])}</b><small>${monthLabel(point?.month)} · ${rateLabel(state.rate)}</small></div></div><p class="inflation-observation-publication">${esc(observationPublication(row))}</p>${state.observationMonth ? '<button type="button" class="inflation-latest" data-inflation-latest>최신 관측으로 돌아가기</button>' : ''}<div class="inflation-chart-controls"><div role="group" aria-label="물가 변화 기준">${['yoy', 'mom'].map(rate => `<button type="button" data-inflation-rate="${rate}" aria-pressed="${state.rate === rate}">${rateLabel(rate)}</button>`).join('')}</div><div role="group" aria-label="물가 조회 기간">${[1, 3, 5].map(years => `<button type="button" data-inflation-years="${years}" aria-pressed="${state.years === years}">${years}년</button>`).join('')}</div></div>${comparisonMarkup(row, state)}<p class="inflation-chart-basis">단위 % · ${basisLabel(basis)} · 최대 ${state.years}년의 제공 자료</p>${row.status === 'stale' ? `<p class="inflation-warning">관측일 확인 필요${row.staleReason ? ` · ${esc(row.staleReason)}` : ' · 최신 월이 반영되지 않았을 수 있어요.'}</p>` : ''}${plotMarkup(chart, row)}<p class="inflation-chart-note">실제 관측 ${chart.rows.filter(point => point.value !== null).length}/${chart.months}개월 · 빠진 월과 값은 연결하지 않아요.${chart.missingMonths.length ? ` 미제공 관측월 ${chart.missingMonths.map(monthLabel).join(', ')}` : ''}</p><details class="inflation-provenance"><summary>정의·발표·수집 기준 보기</summary><dl><div><dt>지표 정의</dt><dd>${esc(row.definition || '미제공')}</dd></div><div><dt>관측월</dt><dd>${monthLabel(row.asOf)}</dd></div><div><dt>공식 발표</dt><dd>${esc(publicationStamp(row))}${!point?.publishedAt && !row.publishedAt ? ' · 수집 시각과 달라요.' : ''}</dd></div><div><dt>수집</dt><dd>${esc(stamp(row.collectedAt))}</dd></div><div><dt>마지막 확인</dt><dd>${esc(stamp(row.checkedAt))}</dd></div><div><dt>수정 상태</dt><dd>${row.revisionStatus === 'revised' ? '기존 관측값 수정 확인' : '수정 여부 미확인'}${row.revisionCheckedAt ? ` · 확인 ${esc(stamp(row.revisionCheckedAt))}` : ''}</dd></div><div><dt>변화 기준</dt><dd>전년 동월 대비: ${basisLabel(row.basis.yoy)}<br>전월 대비: ${basisLabel(row.basis.mom)}</dd></div><div><dt>계산</dt><dd>전년 동월·직전 월의 같은 기준 지수와 비교한 변화율이에요. 기준 지수가 없으면 미제공으로 표시해요. 저장된 지수로 계산한 변화율이므로 공식 발표의 반올림 수치와 다를 수 있어요.</dd></div></dl></details><details class="inflation-table-details"><summary>월별 변화율 ${chart.rows.length}개 보기</summary><div class="inflation-table-wrap"><table><caption>${row.label} 월별 변화율 · 변화율 %</caption><thead><tr><th scope="col">관측월</th><th scope="col">전년 동월<br><small>${basisLabel(row.basis.yoy)}</small></th><th scope="col">전월<br><small>${basisLabel(row.basis.mom)}</small></th></tr></thead><tbody>${chart.rows.map(point => `<tr><th scope="row">${monthLabel(point.month)}</th><td>${formatInflationRate(point.yoy)}</td><td>${formatInflationRate(point.mom)}</td></tr>`).join('')}</tbody></table></div></details><div class="inflation-source"><small>${esc(row.source.name || '출처 미제공')}</small>${sourceUrl ? `<button type="button" data-external-url="${esc(sourceUrl)}">${rateLabel(state.rate)} 원본 시리즈 ↗</button>` : '<small>원본 링크 미제공</small>'}</div></section>`;
}

function recentMarkup(model, state) {
  if (!model.publications.length) return '<section class="inflation-recent" data-testid="inflation-recent-publications" aria-label="최근 공식 발표"><h3>최근 공식 발표</h3><p class="inflation-intro">공식 발표일이 확인된 자료가 아직 없어요. 수집일을 발표일로 대신하지 않아요.</p></section>';
  return `<section class="inflation-recent" data-testid="inflation-recent-publications" aria-label="최근 공식 발표"><h3>최근 공식 발표</h3><p class="inflation-intro">최근 3개 발표일의 제공 자료예요. 지표를 누르면 해당 관측월을 읽을 수 있어요.</p><ol>${model.publications.map(group => `<li data-publication-day="${group.day}"><b>${group.day.replaceAll('-', '.')} ET 발표</b><div>${group.entries.map(entry => {
    const row = model.series.find(row => row.id === entry.seriesId);
    const comparison = inflationComparison({ ...row, asOf: entry.month }, state);
    return `<button type="button" data-inflation-publication="${entry.seriesId}" data-inflation-month="${entry.month}" data-testid="inflation-publication-select" data-release-state="available" aria-pressed="${state.selectedId === entry.seriesId && (state.observationMonth || row.asOf) === entry.month}"><span>${esc(entry.label)} · ${monthLabel(entry.month)} 지표</span><small>자료 제공 · ${comparison.expected === null ? '예상 미제공' : '예상 확인'}${comparison.status === 'missing' ? ' · 비교 미제공' : ''}</small></button>`;
  }).join('')}</div></li>`).join('')}</ol></section>`;
}

function agendaEventMarkup(event) {
  const indicator = event.indicator || event.id?.split(':')[0] || (event.name.includes('PCE') ? 'pce' : event.name.includes('PPI') ? 'ppi' : event.name.includes('CPI') ? 'cpi' : '');
  return `<li data-release-state="pending" data-testid="inflation-upcoming-event"><div class="inflation-event-top"><strong>${esc(event.name)}</strong><span class="inflation-certainty">${esc(event.time.certainty)}</span></div><p class="inflation-event-purpose">${esc(indicatorPurpose(indicator))}</p><small>발표 대기 · 결과 미제공</small><b class="inflation-event-kst">${esc(event.time.kst)}</b><small>${esc(event.time.original)}</small><div class="inflation-event-meta"><span>대상 관측월 ${monthLabel(event.observationMonth)}</span><button type="button" data-external-url="${esc(event.sourceUrl)}" aria-label="${esc(event.name)} 공식 일정 원문">공식 일정 ↗</button></div></li>`;
}

function agendaMarkup(calendar, canRetry) {
  const missing = calendar.status === 'unavailable';
  let content;
  if (missing) content = `<div class="inflation-empty"><strong>발표 일정을 확인하지 못했어요</strong><p>물가 시계열과 별도로 공식 일정을 다시 확인해주세요.</p>${retry(canRetry, '발표 일정 다시 확인')}</div>`;
  else if (!calendar.events.length) content = '<div class="inflation-empty"><strong>확인된 다음 발표 일정이 없어요</strong><p>예정 날짜를 임의로 채우지 않아요. 공식 일정을 확인해주세요.</p></div>';
  else {
    content = `<ol class="inflation-agenda-list">${calendar.events.slice(0, 2).map(agendaEventMarkup).join('')}</ol>`;
    if (calendar.events.length > 2) content += `<details class="inflation-agenda-more"><summary>다음 일정 ${calendar.events.length - 2}개 더 보기</summary><ol class="inflation-agenda-list" start="3">${calendar.events.slice(2).map(agendaEventMarkup).join('')}</ol></details>`;
  }
  const warning = calendar.status === 'stale' ? '일정 마지막 확인이 오래됐어요. 원문에서 변경 여부를 확인해주세요.' : calendar.status === 'partial' ? '일부 일정만 확인했어요. 목록 밖의 발표는 원문을 확인해주세요.' : '';
  return `<section class="inflation-agenda" aria-label="공식 발표 예정"><div class="inflation-section-head"><h2>다음 공식 발표</h2><span>한국 시각 기준</span></div><p class="inflation-intro">미국 CPI·PPI·PCE 공식 일정이에요. 발표 전까지 바뀔 수 있어요.</p>${warning ? `<p class="inflation-warning">${warning}</p>` : ''}${content}<div class="inflation-calendar-source"><small>일정 마지막 확인 ${esc(stamp(calendar.checkedAt))}</small>${calendar.sourceUrl ? `<button type="button" data-external-url="${esc(calendar.sourceUrl)}">BLS 공식 일정 ↗</button>` : ''}</div></section>`;
}

export function renderMacroInflation(payload, options = {}) {
  const model = normalizeInflationPayload(payload, { now: options.now });
  const requested = model.series.find(row => row.id === options.selectedId && row.status !== 'unavailable');
  const current = requested || model.series.find(row => row.status !== 'unavailable');
  const observationMonth = current?.points.some(point => point.month === options.observationMonth && (point.yoy !== null || point.mom !== null)) && options.observationMonth !== current.asOf ? options.observationMonth : null;
  const selected = observationMonth ? { ...current, asOf: observationMonth, publishedAt: null, points: current.points.filter(point => point.month <= observationMonth) } : current;
  const state = { selectedId: selected?.id || 'cpi', observationMonth, rate: options.rate === 'mom' ? 'mom' : 'yoy', years: [1, 3, 5].includes(options.years) ? options.years : 1, now: options.now ?? Date.now() };
  return `<div class="macro-inflation"><section class="inflation-panel" aria-label="미국 물가 지표"><div class="inflation-section-head"><h2>미국 물가</h2><span>${model.availableCount}/${INFLATION_SERIES.length}종 제공</span></div><p class="inflation-intro">CPI·PPI·PCE와 근원 지표예요. 발표 시각은 한국 시각 기준이에요. 날짜만 있으면 원문 날짜를 표시해요.</p>${model.status === 'partial' ? '<p class="inflation-warning">일부 물가 자료가 없거나 관측일 확인이 필요해요. 제공된 자료를 먼저 보여드려요.</p>' : ''}${overview(model, state.selectedId)}${recentMarkup(model, state)}${selected ? readingMarkup(selected, state) : `<div class="inflation-empty"><strong>물가 자료를 확인하지 못했어요</strong><p>기존 경제 지표는 아래에서 계속 확인할 수 있어요.</p>${retry(options.canRetry)}</div>`}</section>${agendaMarkup(model.calendar, options.canRetry)}<p class="inflation-action-feedback" role="status" aria-live="polite"></p></div>`;
}

/** Mounts only this host. Call the returned cleanup on route disposal; no fetches or timers are started. */
export function mountMacroInflation(host, payload, options = {}) {
  if (!host) return () => {};
  let disposed = false;
  const state = { selectedId: options.selectedId, rate: options.rate || 'yoy', years: options.years || 1, observationMonth: options.observationMonth };
  const paint = () => {
    if (disposed) return;
    host.innerHTML = renderMacroInflation(payload, { ...options, ...state, canRetry: typeof options.onRetry === 'function' });
    options.onRender?.(host);
  };
  const handler = async event => {
    const button = event.target?.closest?.('[data-inflation-series],[data-inflation-publication],[data-inflation-rate],[data-inflation-years],[data-inflation-latest],[data-inflation-retry],[data-external-url]');
    if (!button || !host.contains(button) || button.disabled || disposed) return;
    const data = button.dataset;
    let focusSelector;
    if (INFLATION_SERIES.some(row => row.id === data.inflationPublication)) {
      state.selectedId = data.inflationPublication; state.observationMonth = data.inflationMonth || null;
      focusSelector = `[data-inflation-publication="${state.selectedId}"][data-inflation-month="${data.inflationMonth}"]`;
    }
    else if (INFLATION_SERIES.some(row => row.id === data.inflationSeries)) {
      state.selectedId = data.inflationSeries; state.observationMonth = null;
      focusSelector = `[data-inflation-series="${state.selectedId}"]`;
    }
    else if ('inflationLatest' in data) { state.observationMonth = null; focusSelector = `[data-inflation-series="${state.selectedId}"]`; }
    else if (['yoy', 'mom'].includes(data.inflationRate)) { state.rate = data.inflationRate; focusSelector = `[data-inflation-rate="${state.rate}"]`; }
    else if ([1, 3, 5].includes(Number(data.inflationYears))) { state.years = Number(data.inflationYears); focusSelector = `[data-inflation-years="${state.years}"]`; }
    else if ('inflationRetry' in data && typeof options.onRetry === 'function') { event.preventDefault(); await options.onRetry(); return; }
    else if (data.externalUrl && typeof options.onExternal === 'function') {
      event.preventDefault();
      const url = inflationSourceUrl(data.externalUrl); if (!url) return;
      try { await options.onExternal(url); } catch { const feedback = host.querySelector('.inflation-action-feedback'); if (!disposed && feedback) feedback.textContent = '원문을 열지 못했어요. 다시 시도해주세요.'; }
      return;
    } else return;
    paint();
    host.querySelector(focusSelector)?.focus({ preventScroll: true });
  };
  paint(); host.addEventListener('click', handler);
  return () => { disposed = true; host.removeEventListener('click', handler); };
}
