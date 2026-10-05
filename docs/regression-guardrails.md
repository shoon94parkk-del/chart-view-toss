# Chart View Toss regression guardrails

Last updated: 2026-09-22

## Repository boundaries
- Toss UI/SDK changes stay in this repo.
- Web Chart View UI is not silently ported/replaced from here.
- Shared backend changes must be additive/compatible unless explicitly coordinated.

## Navigation/runtime
- Native navigation bar must not be duplicated inside Apps in Toss.
- Back from a subpage returns within the mini-app; root back preserves platform exit behavior.
- Deep links for major features remain functional.
- Scroll restoration must not create stale-page navigation races.
- Safe-area support remains on mobile devices.
- Detail in-page shortcuts must scroll within the current detail route; they must not replace the hash route or native back stack.

## Data/loading
- API timeout/retry/offline states remain visible and recoverable.
- Late/stale responses cannot overwrite a newer route/selection.
- Partial failures do not blank unrelated valid sections.
- The Toss Home daily heatmap and selected-stock section fail independently and must not delay or blank market/watchlist sections.
- Chart comparison basis remains explicit: local currency, adjusted-close where applicable, no interpolation.
- Macro source/unit/observation/change basis remain visible.
- News direct vs industry/indirect relation remains distinguishable.
- Changing comparison/detail chart periods must keep the last valid chart visible until the new period settles. A failed refresh must identify the visible chart as the previous result and provide a retry.
- Home search and saved watchlist must remain above the market section on mobile. The market cards and Home extras still load independently.

## Storage
- Watchlist and selected tickers remain device-local unless an intentional sync feature is added.
- Toss storage keys remain isolated from the normal Web app.
- Reset/delete flows must not leave hidden stale state.

## Release
- Node 24 / SDK 3.5.0 compatibility is preserved until intentionally upgraded.
- `npm test` and AIT contract checks must pass.
- Web preview success is not public-release approval.
- Android and iOS real-device Sandbox/QR checks remain mandatory release gates.
- Backend production contract points to `https://chart-view-pkv8.onrender.com` unless deliberately migrated.


- 홈/전체 히트맵은 동일한 `/api/home-snapshot` payload와 공용 렌더러를 사용해야 한다. 레거시 정적 섹터 payload로 되돌아가 한국 종목·로고·업데이트 시각이 사라지면 회귀로 본다.

- 히트맵은 1차원 가로 스트립으로 축소하면 안 된다. 한국/미국 보드 각각에서 셀이 2차원으로 분할되고, 오른쪽·아래쪽 빈 영역 없이 컨테이너를 채워야 한다.
- 히트맵 상승/하락/보합 셀은 실제 배경색을 가져야 하며 투명 셀은 회귀로 본다.

- 전체 히트맵은 홈 대표 18종목과 동일한 개수로 퇴행하면 안 된다. 모바일 QA에서 전체보기 확장 데이터가 홈보다 많고 한국/미국 종목 수 표기가 존재하는지 확인한다.

- 전체 히트맵의 작은 셀은 8px를 넘는 라벨을 사용하지 않는다. 극소 셀은 라벨을 숨길 수 있으며, 큰 티커가 셀 경계를 덮는 상태는 배포 차단 회귀다.
- 홈 루트는 Apps in Toss 저장소 초기화를 기다린 뒤 처음 그리는 구조로 되돌리지 않는다. 홈의 비개인화 영역은 먼저 렌더되어야 한다.
- 홈 시장/스냅샷/선정 종목 캐시는 첫 페인트용 stale 데이터일 뿐이며, 네트워크 최신값 요청은 계속 수행해 화면을 갱신한다.

- 전체 히트맵 한국 보드의 가시 텍스트에 6자리 숫자 종목코드를 사용하지 않는다. 작은 셀도 기업명/축약명을 우선한다.
- 전체 히트맵 미국 보드는 읽을 수 있는 셀 대부분에 등락률을 유지한다. 작은 셀 최적화 때문에 티커만 남고 등락률이 대거 사라지면 회귀다.

- Home과 전체 히트맵의 중복 종목이 서로 다른 등락률을 표시하면 배포 차단 회귀다. 전체보기의 오래된 API 응답을 장시간 클라이언트 캐시하지 않는다.
- 전체보기 렌더 전 Home snapshot 오버레이를 유지한다. backend full payload가 의도적으로 틀린 값을 반환하는 QA에서도 Home 값이 화면에 보여야 한다.

- 장중 Home 갱신은 사용자별 외부 provider 조회로 되돌리지 않는다. 클라이언트는 `/api/home-live` 공유 캐시만 읽어야 한다.
- Home live polling은 document가 hidden일 때 중지되고 visible 복귀 시 즉시 재개되어야 한다. `setInterval` 기반의 백그라운드 무한 polling은 금지한다.
- Home live 주기는 약 10초이며 방문자별 9~12초 jitter를 사용해 동시 요청 스파이크를 완화한다. heartbeat는 서버가 반환한 `heartbeatSec`(기본 20초)을 따른다.

- Apps in Toss 외부 링크에 `Device.openURL`을 사용하지 않는다. top-level SDK `openURL(url)`만 사용하며 AIT contract가 이를 강제한다.
- 개인정보/이용약관/데이터 안내 링크는 `.ait`의 `location.origin`에 의존하지 않는다. 검토자가 누르는 필수 링크는 공개 HTTPS 절대주소여야 한다.
- 외부 링크 실패를 silent no-op으로 처리하지 않는다. 사용자에게 실패/재시도 피드백을 제공한다.

- 320~360px Home 히트맵의 `is-small` 셀은 티커/축약명 자체보다 등락률을 먼저 생략한다. 작은 셀에서 두 줄을 억지로 유지해 텍스트가 잘리는 상태는 배포 차단 회귀다.

- Home의 작은 미국 셀은 회사명보다 티커를 우선한다. 320px에서 `테슬라` 같은 이름이 셀 폭을 넘어가면 `TSLA`처럼 식별 가능한 짧은 티커로 축약해야 한다.

- Home compact geometry: 320~360px에서 `is-compact` 셀은 보조 등락률 텍스트를 숨기고, 미국 셀의 정규화 폭이 8% 미만인 극소 셀은 라벨 전체를 숨길 수 있다. 색상과 접근성 aria-label은 유지한다.

- `#picks`와 `/picks`는 복원된 `최근 주목받는 종목` 기록 화면으로 진입해야 한다. 홈과 전체 메뉴에서도 같은 명칭을 쓴다. 데이터 산식과 선정 결과는 기존 PICK과 동일하게 유지한다. 이 화면은 추가 정책 확인 전까지 공개 Toss 출시 차단 항목이다.
- PICK 상태의 `매도검토`는 사용자 확인 전 자동 매도/종료로 해석하거나 처리하지 않는다. 가격·차트 변화만으로 매도검토를 확정하지 않는다.

- 경제지표 카드의 미니 차트는 `/api/macro`의 기존 `chart_data`를 사용해야 하며, 별도 네트워크 요청이나 heavyweight 차트 인스턴스를 추가하지 않는다. 320px 모바일에서 가로 오버플로가 없어야 한다.

- 홈 주요시장은 접힌 상태에서 4개 핵심 지수만 렌더링해야 하며, 보조 시장지표(^TNX/^VIX/CL=F/KRW=X)는 사용자가 `더 보기`를 눌렀을 때만 조회·표시한다. 펼침 후 320px 화면에서 가로 오버플로가 없어야 한다.


### Live quote parity guardrail
- Do not restore a separate 15s route-cache-only current price for detail.
- Home/detail/full-heatmap should overlay the newest in-session quote by ticker.
- Detail live refresh must use `fresh=true` and remain one-symbol-only at 5s cadence.
- Returning to Home after viewing detail must preserve the newer detail quote in the Home fast snapshot until the next Home live event supersedes it.

### Heatmap/detail round-trip guardrail
- A heatmap click must preserve the visible company identity in the detail header; raw ticker-only detail is a regression when the heatmap already knows the company name.
- A direct `#detail/{ticker}` link resolves the exact stock name asynchronously without delaying quote or chart loading. Show the ticker separately; do not repeat it as the company name or use its first digit as a logo.
- Detail has one visible interest action beside the company name in both web preview and AIT; it shows a red filled heart and `aria-pressed` after device-local registration. Toggling it must not reload the detail data.
- Home `종목 검색` opens stock search. A result opens that stock's detail directly; chart comparison remains a separate action.
- Returning from detail must not remove the viewed heatmap stock. Null/undefined fields from a live quote must never overwrite valid structural fields such as `marketCap`, `name`, or market identity used by the treemap filter/layout.

### Watchlist quote rollback guardrail
- Opening Watchlist must not replace a newer in-session quote with an older API/browser-cache row for the same ticker.
- Home watch cards, dedicated Watchlist cards, Heatmap, and Detail should converge through `liveQuoteStore`; raw response order is never a freshness guarantee.
- Cached Watchlist cards must paint before a delayed batch quote response; the batch request still revalidates in the background and failed refresh retains the dated cached value with a retry action.
- At the same `asOf`, full heatmap rows may not overwrite Home live or direct quote rows. Structural heatmap fields remain separate from quote overlays.
- Valuation's visible price card uses the canonical current quote when one exists; screener closing prices keep their dated historical bases and explicit labels. Historical PICK code stays outside the Toss bundle.
- Home and Watchlist initial routes must not download `lightweight-charts`; chart routes load the shared chart runtime on demand.
- The Render static preview must serve the app HTML at fixed direct-entry paths such as `/chartviewHome`, `/chart`, and `/watch`; the local Vite SPA fallback alone does not prove the deployed paths work.

### Toss release UI data clarity
- Macro freshness must derive from each row's `asOf` date and expected observation cadence; backend `freshCount`/`staleCount` can lag and must not override row-level age.
- Tooltip and macro mini-chart dates should be readable Korean calendar dates; valuation periods and known relation-basis metadata should use Korean labels.
- Detail KRW price includes `원` exactly once and must stay on one line at mobile widths. Presentation changes must preserve canonical quote values and currencies.


### Screener popular preset guardrail
- Popular presets must use filterScreener and the visible form values; do not maintain a hidden second ranking/filter implementation.
- Preset clicks must populate the manual filter fields and update results immediately; reset restores the full universe.
- RSI/volume/MACD/MA/52-week fields are end-of-day screener data. Missing fields must fail closed rather than inventing a match.
- Result reason chips must reflect actual active filter conditions.

### Investment idea LAB guardrail
- `#ideas` is additive; do not replace or reorder the existing Home/bottom-nav structure to expose it.
- Idea generation must use visible screener fields and fail closed when required metrics are missing. Never fabricate a technical match or causal news story.
- Every candidate card must show concrete metric reasons and link to the existing stock-detail route.
- Keep the idea view lazy-loaded so Home, Watchlist, and initial app startup do not download the idea view/CSS until the user opens it.
- Screener trade-date/closing-price semantics remain explicit; idea candidates are research prompts, not live-price recommendations.

### IDEA LAB industry-context guardrail
- Sector strength must be calculated from all same-industry screener rows for the same trade date, not from the small displayed candidate list.
- KRX `mainProducts` must be labeled as major products/services, never as the #1 revenue product unless filing-derived revenue evidence exists.
- Supply-chain peers are adjacency candidates derived from industry/product classification. Never label them as actual customers, suppliers, or contract partners without separate evidence.
- Missing `industry` / `mainProducts` must show a missing/updating state; do not infer a company business description from its name alone.
- Keep this context inside the lazy-loaded IDEA LAB bundle; Home startup remains unchanged.

### Stock detail industry-context guardrail
- Detail price, quote polling and chart must render independently of company/sector/supply-chain data.
- `industryContext.js` and `industryContextView.js` stay dynamically imported from the detail route so Home initial load is not enlarged by this feature.
- If KRX company context is missing (e.g. overseas ticker), remove the optional industry panel instead of showing invented company facts.
- Do not download `company_context.json` for a detail symbol that already has industry/products in the screener; retain the fallback for missing metadata and symbols.
- Medical-device companies must not fall into pharma solely because their industry text contains the generic word “의료”.
- Company / sector / supply-chain sections need distinct but restrained visual hierarchy; do not collapse them back into identical gray surfaces.

### DART revenue-mix guardrail
- DART revenue loading must never delay price, chart, valuation, or the base KRX industry context.
- Call DART only for `.KS` / `.KQ` detail tickers; overseas detail must not issue the request.
- Never show ‘매출 1위’ from KRX `mainProducts` alone. It requires a DART-derived `available=true` payload.
- If a report/table is missing or ambiguous, preserve the KRX company card and omit the revenue mix rather than guessing.
- A displayed revenue mix must expose the DART original-report link and report year/basis.
- While detail DART is pending, show a visible loading state in the company context; clear it on success, unavailable data, or error. Keep the initial price/industry loading states readable.
- First uncached DART parsing can exceed 10 seconds. The report request gets a 45-second budget and explicit first-lookup loading text, while price, chart, valuation, KRX context, and direct evidence continue independently.

### IDEA LAB expansion / direct-relation guardrail
- Every candidate company/sector/supply-chain panel starts collapsed. Do not restore the `open` attribute by default.
- DART business-report and direct-relationship requests fire only after the user expands a candidate context panel.
- DART/relationship fetch failures must keep the base KRX/sector context usable and must not block the list.
- A slow direct-relationship response must not hold back a ready DART revenue card, and vice versa. Each source has its own loading/error state.
- “확인된 직접 관계” requires evidence-backed API rows. Industry/keyword adjacency stays under “산업상 연관 후보” and must never be relabeled as a confirmed customer/supplier.
- Stock detail and IDEA LAB use the same relationship semantics so the meaning does not change between screens.
- Pending chart/detail plot areas must show visible progress, not only a small status word above an empty panel. The progress overlay must clear for success, no data, and error.
- Share controls must remain reachable when AIT hides the custom topbar; shared stock links must preserve the ticker and carry crawler-readable title/image metadata.
### DART financials and sector comparability
- The detail financial panel is Korean-only, dynamically loaded, and independent of price/chart/valuation/DART revenue-mix loading. Show original filing links, annual versus cumulative interim periods, and CFS/OFS basis.
- A failed financial lookup must expose an in-card retry that reruns only the financial request; do not rerender all detail data.
- Do not call unrelated companies a sector peer merely because they share a broad KRX industry. Prefer a specific product/industry-stage group, filter by screener trade date, and withhold a strength label below three peers.
- A company name alone is not industry evidence. Samsung Electronics and SK hynix must share the memory-chip manufacturing comparison group; Dongseong Finetec's disclosed cryogenic insulation belongs in the LNG/shipbuilding materials group.
- Detail navigation must preserve the originating bottom-nav tab; direct detail links may default to Home. The More body heading must not repeat the topbar `전체`.

### Personal research notes
- Cards open independently of market/DART API success and preserve detail/back routes.
- Never transmit card question, notes or date to API/analytics/LLM. A revisit date does not imply notifications.
- Native account separation and device reset include RESEARCH_KEY. Browser save failure retains input and shows an inline error.
- Escape user content on render; editing/deleting one ticker preserves other cards.
- Research-card QA covers create/edit/cancel/reload, source jumps, storage errors and mobile widths.
- Current single-question comparison supersedes manual-note entry. Preserve old notes when saving an updated question.
- Compare common report periods, statement basis and currency only; no annual/interim mixing or missing-as-zero math. Do not describe keyword routing as arbitrary question understanding or prediction.
- Company matching must prefer the longest name/alias at an overlapping text span: 하이닉스 must not also select 이닉스. Keep separate explicit mentions and include real confusable names in QA fixtures.
- Ambiguous multiple-company input requires visible target selection, not a silent single-stock fallback. Growth-rate differences are percentage points and require valid rates for both companies.
- Display implemented DART comparison scope before entry, including unsupported forecasts/causal explanations. Question examples fill the input only, clear stale results, and never auto-save or auto-submit.

### Financial quality / comparison expansion (2026-10-01)
- Optional accounts remain missing without schema v2 data; missing is never zero. A mismatched quality period cannot supply values to the selected DART comparison.
- Compare net income and operating cash flow cumulatively; balances/debt ratio prior is previous year end. Never compare interim balance growth with year-on-year sales growth.
- Quality checks state observed facts and source accounts, not recommendations, risk-free claims or inferred causes. Denominators must be positive for debt and cash/income ratios.
- Selecting a peer prioritizes watchlist and preserves one input, without navigation, auto-analysis or automatic saving. Original question aliases remain available.
- Price comparison loads on explicit request, remains independent of DART failure, and labels its provider/period/time. No forecast PER is added to same-period DART tables.

### Whole-site experience corrections (2026-10-01)
- Never silently override an explicitly named question company with a selected peer. Stop unsupported items/forecasts without a substitute financial table.
- Screener input blur/change must not remove a row before its click fires. Keep filters, page count, preset and returning row focus on detail/back.
- Public share cv restores public conditions only. Validate bounded symbols/dates/options; exclude device notes and private watchlists.
- Detail news retains its symbol until the user explicitly returns to watchlist news. Plain same-tab navigation must clear stock scope.
- Missing/failed market summary is terminal with retry, not an indefinite spinner. Retry bypasses the cached response.
- Verified revenueBasis must reconcile positive segment total + signed adjustment to report total. Keep reported shares, disclose >100% and mark missing metadata unverified.
- Quote asOf is observation time; lookup time and screener collected close are separately labeled. Preserve data sources and raw financial amounts.
- Bottom navigation exposes aria-current; helper text stays legible and macro source controls are at least 44px. PICK check execution must not imply completed evidence review.
- Selector repaint must preserve list position, selected-row focus and pending/error search status. Modal close must release inert state and keyboard handler, then restore calling focus without scrolling. Clear/close invalidates stale searches.
- Missing market rows after a settled request are not loading. Explicit retry bypasses cached empty quotes; primary live refresh must retain separately fetched optional indicators with their original observation times.
- App back after browser forward must restore the previous feature. History depth belongs to the current visit; do not replace the initial route or treat a deep link as an owned previous page.

## 2026-10-02 공시 투자 검토
- 지수 상세는 실제 point.price를 사용하며 현재 시세로 과거 값을 역산하지 않는다. 지수 클릭은 비교 선택을 바꾸지 않는다.
- 분기 캐시 refreshing:true이면 기존 차트를 보여주면서 제한된 polling을 지속한다. 실패 시 유효한 기존 자료를 빈 화면으로 바꾸지 않는다.
- 공시 snapshot 동일성에는 현재/이전 수치가 모두 들어간다. 같은 기간의 작은 receipt 번호는 과거 자료다.
- REVIEW_KEY를 저장소 initialize/reset 계정 키에서 빼지 않는다. 공유 상태에 개인 확인기록/조건을 추가하지 않는다.

## 2026-10-02 Sector heatmaps and performance audit
0.10.1 adds separate KR/US sector boards below Home and full stock heatmaps. Home sector JS/CSS and full quotes are requested only on viewport approach; full screen reuses its canonical payload/client cache. Tiles show covered-company cap-weighted daily change, date/count/share and expandable member links. Missing/zero cap, stale, unknown classification and other-session rows are excluded and disclosed. Refresh/retry preserves selected market/sector and valid dated data. Backend full quote budget remains 20 KR / 40 US, with one representative of each available US sector. This is not a full-market official sector index. Existing weekly company peer breadth remains unchanged.
Audit: measured all 17 principal route journeys at 390px on the live site, including separate KR/US/index detail. Found an unnecessary KR screener download on US quote/industry detail and removed both paths. IDEA LAB calculated industry context for every matched candidate before ranking; rank first and build/cache context only for displayed winners. Checked-in screener benchmark: 6505ms to 186ms, deep equality of the complete outputs (cards, rankings, context, calculations and reasons). Main sector/industry JS is split into dynamic chunks, preserving the first Home paint. Added sector aggregation metadata tests, bounded classification-work regression and 320/390/430px loading/error/cache/member/navigation QA. Final live timings and screenshots are recorded in docs/SECTOR_PERFORMANCE_AUDIT_2026-10-02.md after deploy.

## 2026-10-02 Saved records during degraded data
Saved investment baselines are device records: show them before network completion and retain them if current filings are unavailable. Pending and unavailable status must not become a current condition result. Null quote replies are terminal unavailable/retry, not an uncaught exception or infinite spinner.

## 2026-10-02 Explicit retry and supported navigation
- Retry of empty/partial 200 chart data must bypass client cache; ordinary queries remain cached. Preserve displayed data and period during failed refresh.
- Disclose missing selected companies next to the chart with a retry; no fabricated 0% return.
- Every detail jump must have a mounted target. DART analysis is offered only for Korean exchange tickers.
- News transport failure is not a valid empty news result; independent retry must not reload unrelated data.
- Secure external open with noopener returns null even when a tab opens; never infer an error from that value. Keep opener isolation, HTTPS validation and native failure handling.


## No-repeat performance/cache regression gate (2026-10-02)
- Performance, quote freshness, cache, Home/Detail, heatmap, valuation, and loading changes must first consult `docs/no-repeat-regression-policy.md`.
- Before editing, classify the issue as new behavior, new bug, or regression of a previously fixed behavior.
- A regression must restore the known-good contract before introducing a new architecture or cache layer.
- Do not weaken `fresh=true` canonical Detail quote revalidation to make first paint faster. Fast Home/market/screener data may paint first, but fresh validation still runs.
- Older browser/device/API cache must never overwrite a newer in-session quote.
- Direct Detail routes should paint available primary price data independently from slower news/DART/financial/valuation work.
- Backend valuation-band prewarm/singleflight/cache is an intentional performance contract; removing it is a regression unless deliberately redesigned and remeasured.
- Same-harness production reference on 2026-10-02 (390x844 Chromium, single-run reference only): Home ~0.55s, Samsung Detail ~0.54s, NVIDIA Detail ~0.95s, KOSPI index Detail ~1.93s, valuation band ~0.90s, full heatmap ~0.90s.
- These timings are not SLAs. Use them only to detect a material regression with the same measurement method.
- A repeated bug is not complete until the existing regression test is identified and strengthened or a new test is added.

## Export momentum dashboard
- Keep `#exports` out of Home first paint, home bootstrap, quote polling and heatmap refresh.
- The route belongs under `근거와 시장 환경 확인`.
- 1~10일, 1~20일, 월 전체 bars are cumulative checkpoints within one month, not independent period totals.
- Missing official values remain missing; never convert null to zero or estimate undisclosed amounts.
- Graphs must have text labels/aria descriptions and no horizontal overflow at supported mobile widths.
- Optional history must not render a fake 12-month chart until at least two official monthly observations exist.

## Export momentum live API
- Export route must call the shared backend only after the user enters `#exports`; never warm it from Home.
- A lagged `itemPeriod` may not be divided by the headline month total to produce a semiconductor share.
- Show `itemPeriod` and `regionPeriod` when they differ from the headline `period`.
- Do not restore static 10-day/20-day bars unless an official preliminary-data source is actually connected.

- 월별 수출액과 YoY는 서로 다른 단위이므로 축을 섞지 않는다. 수출액 차트는 억달러, YoY 차트는 %를 명시한다.
- 품목의 ‘물량’은 순중량이며 개수/대수로 바꾸지 않는다.
- kg당 신고금액을 제품 판매단가 또는 ASP라고 부르지 않는다.

## Export breadth / momentum UI
- ‘상승 확산도’는 HS2 비교 가능 품목 중 전년동월 대비 증가 품목 비율이다. 6개 대표 품목 비율로 대체하지 않는다.
- ‘수출 증가/감소 기여액’은 전년동월 대비 달러 증감액이다. 종목 추천, 주가 기여, 기업 이익 기여로 바꾸지 않는다.
- 3개월 가속도는 최근 3개월 YoY 평균 - 직전 3개월 YoY 평균(%p)이다. 전망치나 다음 달 예측으로 표기하지 않는다.
- HS2 확산도 UI 때문에 신규 관세청 호출을 추가하지 않는다.

## Export dual-axis / semiconductor detail
- 메인 월별 차트에서 수출액은 왼쪽 억달러 축, YoY는 오른쪽 % 축에만 바인딩한다. 축 숫자와 범례를 숨기지 않는다.
- 품목 상세 12개월 차트는 금액·순중량·평균 단위가치 각각의 Y축 눈금을 보존한다.
- HBM 전용 통관 수출액을 만들지 않는다. 공식 HSK에 독립 코드가 생기기 전에는 제한사항을 명시한다.
- 8542321030은 Flash memory이며 NAND-only로 바꾸지 않는다.

- 반도체 세부 카드에 12개월 시계열이 없다는 이유로 브라우저/백엔드에서 HSK별 다중 fan-out을 추가하지 않는다.
- 세부 HSK는 최신 itemPeriod와 전년동월 비교 카드로 유지하고, 전체 반도체 12개월 추이는 기존 item-detail history를 사용한다.

- 반도체 리포트 핵심 5개 카드에서 YoY와 MoM을 혼동하지 않도록 둘 다 명시적으로 라벨링한다.
- kg당 평균 신고금액은 단가/ASP로 단정하지 않고 평균 단위가치 성격을 유지한다.
- MCP는 HSK 8542323000, DRAM 모듈은 HSK 8473304060 기준을 유지한다.
- HBM 독립 수출액을 생성하거나 Flash memory를 NAND-only로 표기하지 않는다.
- 모바일 390px에서 5개 카드, 비교막대, 상세 HSK 카드가 가로 스크롤 없이 표시되어야 한다.

- semiconductor country matrix 요청은 반도체 상세이 열린 뒤 별도로 실행한다. 메인 수출 탭의 초기 요청에 합치지 않는다.
- 모바일에서는 4개 품목×6개 국가 행이 가로 스크롤 없이 보여야 한다.
- 국가별 증감 기여를 YoY 퍼센트만으로 대체하지 않는다. 수출액 증감액을 같이 표시한다.
- 중국·홍콩·베트남·대만·미국·일본 6개 지정시장 분석을 전세계 순위로 표현하지 않는다.

- 10일 단위 잠정 레이더의 실패/지연이 월간 수출 화면을 막지 않도록 별도 lazy request를 유지한다.
- ‘전월’은 같은 체크포인트(10일↔10일, 20일↔20일, 월전체↔월전체) 비교임을 라벨로 유지한다.
- 10일 단위 관세청 자체 품목분류와 아래 HS 월간 품목분류를 같은 절대금액 시계열처럼 표현하지 않는다.
- 모바일에서 10대 품목 이름, 수출액, YoY, 전월동기 값이 가로 스크롤 없이 표시되어야 한다.

- 월말 착지 범위는 10일 단위 관세청 자체 품목분류 안에서만 계산·표시한다.
- 중앙 추정만 강조하지 말고 25~75% 범위와 백테스트 품질을 함께 보여준다.
- 월마감이 나온 뒤에는 미래형 문구 대신 당시 추정 vs 실제 회고 모드로 바꾼다.
- 백테스트 중앙 절대오차·범위 적중률이 없을 때 임의 수치를 만들지 않는다.
- 모바일에서 전체 수출/반도체 2개 착지 카드가 가로 스크롤을 만들지 않아야 한다.

- 공식 재무 숫자가 커 보인다는 이유만으로 분기값을 임의로 나누거나 누계 차감하지 않는다. 공시 기준·분기/누계 필드를 먼저 확인한다.
- 컨센서스 0y/+1y를 ‘이번 분기/다음 분기’처럼 표시하지 않는다. 연간 EPS·매출 추정치에는 연간 라벨을 유지한다.
- 한국 시장 CLOSE 이후 정규장 가격 화면에 NXT/시간외 가격을 덮어쓰지 않는다.
- 제공처에 거래시각이 없을 때 서버 조회시각을 거래시각처럼 asOf에 넣지 않는다.
- IDEA LAB에 과거 선정 종목이 나오면 사후점검 경고를 숨기지 않는다. 비교군 강도와 종목 사후점검 상태를 같은 의미의 ‘강함/매도’ 신호처럼 표현하지 않는다.
- 데이터 안내/마지막 메뉴는 560px 높이에서도 고정 하단 내비게이션에 가려지지 않아야 한다.
- Apps in Toss 런타임 레이아웃 변경 없이 일반 웹 데스크톱만 확장한다.
- 존재하지 않는 경로를 홈 성공 화면으로 위장하지 않는다.

- Export provisional/item/country failure states each offer a force retry of only the failed request. Cached empty HTTP200 must not make retry permanent; preserve ready monthly/item charts. Closing pending detail invalidates its token so a late response cannot reopen it. See tests/export_recovery_qa.mjs and the mobile QA workflow.

- Stored Home/full heatmap first paint must identify previous saved prices until real revalidation. Do not shorten TTLs or replace latest canonical quotes to hide this state. Failed refresh must not label prior prices as fresh.
- Search DIRECT is not a listing. Verify a positive matching quote; lookup failure remains retryable and must not authorize watch/compare addition. Keep genuine named provider/KRX hits, including ticker-like company names such as AMD.
- Empty macro responses cannot display 0 indicators as a successful assessment; explicit retry bypasses the cached empty200. DFF/FEDTARGET percentages retain units.
- Detail marketCap/metric metadata must use the corresponding field provenance, not the latest quote timestamp. Missing field time remains explicitly missing.
- Lazy detail PICK summary uses existing combined status and exact selection-date/code linkage. No record is not a buy/keep signal; unavailable records are not proof of no record. Technical/peer periods remain distinct from daily quotes.


### Strategy audit screener interpretation/recovery (2026-10-03)
- Unusual-move notices are factual review prompts, not proof of a corporate action, delisting or bad data. Preserve raw rows/values/ranks; zero RSI or an alphanumeric stock code alone is not a warning.
- Screener technical clear must reset the actual technical form fields, preserving name/code query and market. Keep the cleared state across detail/back, expose clear for manual conditions and explain query/market intersection separately from technical exclusion.
- Use the shared filterScreener contract for both matches and empty-result explanations; do not introduce a second ranking/filter implementation. See tests/analysisData.test.mjs and tests/strategy_report_qa.mjs.

## 2026-10-03 — 사용자 승인: 핵심 가치 발견 (0.11.0)

새 동작으로 홈 배치를 변경한다. 이전 수출 진입 숨김·홈 18종목 동시 표시·홈 전체 섹터 보드는 이 결정으로 대체된다. 첫 화면에 수출, 조건별 종목 찾기, 최근 선정 진입을 노출한다. 최근 선정의 원문 이유와 날짜·점검 상태를 보여주고 날짜/코드가 일치하는 기록만 직접 연다. 전체 성과는 펼쳐서 확인한다. 관심목록은 시장보다 앞에 유지하되 빈 목록은 작게 표시한다.

홈 히트맵은 선택 시장 대표 6종목 미리보기다. 전체 화면은 한국/미국·종목/섹터 탐색을 제공한다. 공유 렌더러, 전체 수집 범위, canonical 최신 시세·출처·거래일, 캐시 TTL을 유지한다. 홈 수출 요약은 화면 접근 시 월간 스냅샷만 지연 요청하며 품목 상세/국가 세부 API는 진입 전 호출하지 않는다. 스크리너는 실제 프리셋과 결과를 먼저 보여주고 수동 조건은 접는다. 상세 왕복 시 조건·페이지 상태를 유지한다. 수출 바로가기는 기존 분석 섹션으로 이동하며 월별 기준·단위·누락값 계약을 유지한다. 브라우저 검증으로 10초/30초 실사용 목표 달성을 주장하지 않는다.

### 운영 경고 카드 첫 화면 (0.11.1)
거래량 급증 첫 결과 전체 노출은 일반 카드뿐 아니라 ±35% 원자료 경고가 붙은 카드로도 320×693부터 확인한다. 경고 전문을 숨기거나 원시 가격·변동·지표를 바꿔 공간을 확보하지 않는다.

## Redesign review follow-up
- A provided selection score of 0 stays 0; missing stays unavailable. Selection score provenance is separate from current technical signals. Never infer a calculation scale or a sell decision from 0.
- favorites resolves to existing watch state; canonical sharing/storage stays unchanged.
- Native crosshair dates on comparison/detail/band charts use yyyy.MM.dd, preserving series dates and returns.
- Revalidate external reports against current code/API and KRX identity before correcting data or redoing implemented features.

## Market-first Home and record access (0.12.0)
- New user-approved order replaces earlier watch/picks-before-market assertions: market → three core entries → watch → dated record/results. Market and core entries must be above the bottom navigation at 320×693, retaining times, error recovery and quote convergence.
- Home averages cover all evaluated records; preserve missing exclusions, denominator and different holding-period disclosure. They are not a portfolio return or performance of only the latest picks.
- Recent company rows open the exact selection date/code and retain the original reason in that record. Keep source scores and current technical/fundamental distinctions.
- more is displayed as 분석; its purpose jumps stay in the same route without history/hash changes, and selected group headings stay reachable above native bottom navigation. Do not change existing deep links, sharing or detail-origin back semantics.

## Purpose identity (0.12.1)
- Keep core tool icons decorative with readable action names; disabled PICK scope must omit its action and graphic. Export, screening and record entry graphics/colors must match their menu destination.
- Purpose tones are not price/return, recommendation or technical status. Preserve financial red/blue, warnings, provenance and all calculations.
- Decoration must not push markets/core entries below the 320×693 first fold or change native header visibility, fixed navigation, safe areas, routes, storage or lazy fetches.


## Insight flow contract — 2026-10-04
- Retain market-first Home and lazy export/detail loading; change cards are at most three, each with its own data date.
- Discovery context uses actual values/conditions; lazy LAB retry must rebind the contextual navigation, not replace it with generic detail navigation.
- Actual screener conditions survive reload/shared links; advanced panel open state is restored only from the session and survives detail/back.
- Export classification candidates require dated products evidence; show statistical/issuer exposure limits.
- Saved research reuses existing device-local keys; raw questions/evidence never enter public share.
- Price comparison list changes only on explicit user action.
- Retry just the failed optional provider; preserve ready siblings and normal cache TTL.


## UI·UX experience contract — 0.14.0 (supersedes conflicting 0.12 Home rules)
- Home order: market → core entries → dated changes → recent two record reasons → watch max3 / saved research max1 → preview heatmap. Keep market/entries in first 320×693 screen and complete first change card within two390×844screens.
- Whole-record performance remains on record overview with original arithmetic/missing-value exclusions. It need not appear on Home. Never present latest picks as popularity rankings.
- Visible Home observations may fetch the existing shared screener once; observer/caching and nonblocking primary paint remain. No early full heatmap or item-detail request. Preserve focused action and its screen position as independent sources complete.
- Export company investigation CTA after item summary; preserve dated exact product evidence and exposure limits, scope/back state, lazy error/retry siblings and closed-panel response guards.
- Evidence-bearing export/detail metadata ≥12px with readable contrast; 44px target for active controls. Do not inflate tiny treemap labels: offer same-payload list instead. Verify narrow and enlarged text.
- Detail section current marker follows document geometry including short final sections at maximum scroll and lifecycle cleanup. Public revenue conversion requires a known unit, and raw values/units remain accessible.
- Warning record links select exact date/code; different reasons and fundamental/technical distinction remain. Device storage contents are never trimmed by compact Home rendering.
- Web automated validation is separate from Android/iOS Toss and five-user usability gates. Do not claim those external gates were completed by browser tests.

- US detail must not initiate an additional KR universe request after any Home observation request. Browser suites continue independently after earlier failures if preview started; overall failure remains failure.


## Insight follow-up contract — 0.15.0
Keep original actionStatus priority/count/filter arithmetic but label combined priority explicitly. Do not turn TECH_SELL_REVIEW into a fundamental SELL_REVIEW display. Scores, zero and raw status values remain accessible in detail. Price-basis filtering is optional and URL-restorable; unknown daily moves are not flagged. Revisit observation cannot acknowledge a report or overwrite saved condition baselines. Older/incompatible/missing peer reports never imply a satisfied condition. No automated Home financial fetch. Only explicit check/detail observation persists while the owning view is connected; account-scoped REVIEW_KEY remains unchanged.


## DRAM spot price in exports
- `/api/memory-spot` is lazy and scoped to the Exports memory section. Do not move it into Home, startup, quote polling, heatmap, or stock-detail work.
- A TrendForce/memory-spot failure must not blank or delay valid Customs export sections. Retry only the failed spot module.
- Keep provider observation date, stale/latest state and source link visible. Do not label Chart View collection time as the spot-price observation date.
- Do not add paid historical TrendForce backfill to make the chart look longer. Trend means Chart View's own accumulated public-latest observations.
- Keep the mini trend graph lightweight (inline SVG or equivalent); do not force the shared heavyweight chart runtime onto the exports first paint for this feature.


## Export tab information architecture
- Export uses four tabs: overview/products/countries/semiconductor. Do not reintroduce a separate trend tab unless explicitly approved.
- Overview combines the monthly headline, provisional 10/20-day radar, 12-month total trend, annual cumulative values and checkpoint flow. Products/countries/semiconductor remain separate drill-downs.
- Do not render the month-end landing estimate, estimate range, or estimate-vs-actual review UI. Keep the underlying official provisional/actual observations.
- Memory price network work starts only after Semiconductor is activated. Provisional radar may load asynchronously as part of Overview and must not block the monthly summary.
- Existing focus deep links map as history/provisional→overview, items/breadth/quadrant→products, countries→countries, memory→semiconductor.
- The memory-price UI shows one price family at a time to avoid recreating a long dashboard inside the Semiconductor tab.


## Mobile information density
- 320~430px에서 스크리너/선정 기록은 한 화면에 여러 종목을 비교할 수 있어야 한다. 새 배지·메타를 추가할 때 카드 높이를 무조건 키우지 말고 기존 행 안에서 재배치한다.
- Screener base row uses compact mobile padding/gaps; unusual-data warnings remain complete but compact. Do not hide the source/basis warning to save space.
- Pick ledger collapsed row stays <=96px in the mobile QA fixture while preserving name, date/symbol, status, return, recommended/current prices and best return. Detailed thesis/evidence remains expandable below the row.
- Export mobile cards use compact spacing under 600px. Do not restore desktop-sized 20px+ headings or 15px+ card padding broadly on mobile.
- Compactness must not reduce primary interactive targets below 44px when the control itself is the touch target; entire stock rows remain larger than 44px.


## Pick advisory density
- The picks page should reach the record list quickly on 320~430px screens. Technical-warning details and the automatic-sell disclaimer remain accessible but default collapsed.
- Do not expand advisory panels by default just to surface explanatory copy. Keep the warning counts/summary visible in the collapsed summary and full evidence inside the expandable body.
- Never remove the underlying technical warning or sell-review disclaimer to save space.


## Visual hierarchy continuity
- Do not introduce unrelated accent colors per screen. Reuse the semantic identities: export/evidence=teal, discovery=blue, picks=purple, watch=gold.
- A section accent communicates where the user is and what kind of information they are viewing. It must not override data/status meaning.
- Up/down market colors and keep/watch/sell warning colors remain semantic and take precedence over section accents.
- Home cards and their destination surface should share the same accent family so navigation feels continuous.
- Keep emphasis restrained: soft surface + accent icon/badge/CTA/keyline. Do not turn every card into a saturated block.
- Mobile density contracts remain in force; visual emphasis must not increase collapsed row/card heights materially.


## Mobile PICK ledger viewport density
- Treat the PICKS screen as a mobile record browser, not a desktop dashboard squeezed into a phone.
- Keep the performance and status overview always visible, but compressed into mobile-sized KPI/status rows. Do not restore the old tall dashboard cards.
- Warning and policy summaries should share one mobile row where both exist.
- Keep count and search/filter entry on one row; filter controls may expand without pushing the normal list permanently downward.
- Collapsed record rows must remain <=64px at <=600px and preserve name, status, recommendation/check price and return.
- At 390x844, preserve the multi-record first viewport; current QA targets at least three fixture records above the fixed bottom navigation.
- Do not satisfy density by deleting evidence or status semantics; move record-level detail behind expansion instead.
