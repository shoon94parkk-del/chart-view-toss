# Chart View Toss project memory

### 2026-09-30 — DART scope disclosed before question entry
- Detail title is DART 공시 비교. Upfront guidance lists revenue/profit/margin/year-over-year growth; forecasts, price targets and causal explanations are unsupported.
- Three tappable examples populate the single input without automatic requests or saves and invalidate old results. SK hynix detail uses Samsung as the peer example.

### 2026-09-30 — Hynix/Inics matching regression fixed
- The live screener contains 이닉스, whose name is embedded in 하이닉스. Match the longest company/alias per overlapping text span, including current-company mentions; distinct mentions still count separately.
- Growth-rate questions show revenue/profit growth first, both named companies and valid percentage-point differences. Multiple named peers require selection instead of silently omitting the requested comparison.
- 97 tests/build and mobile QA passed with the confusable company fixture. The exact user question was verified against real local Samsung/SK hynix data. No deployment.

### 2026-09-30 — Single question comparison replaces manual entry
- Detail research now uses one textarea and Compare action. Broad questions default to financial change; named companies select a peer, and keywords prioritize revenue/profit. This is deterministic report arithmetic, not LLM Q&A.
- Same interim period or common annual year, matching statement basis/currency; missing values and zero/negative baselines never yield misleading growth rates. Shows source links, scope limits and retry.
- Old saved questions/notes remain accessible. Questions stay local; only ticker codes are sent to existing APIs. 94 tests/build and responsive card QA passed. Local only; see docs/research-card-prototype.md.

### 2026-09-30 — Research card local prototype
- Detail lazy-loads one personal question card per ticker, independently of market/DART APIs. Notes, contrary clues and revisit dates stay in device storage; no LLM or scheduled reminders.
- RESEARCH_KEY participates in native anonymous-account separation and device-data reset. Source buttons scroll to existing detail evidence sections.
- Local experience: npm run dev:research on 127.0.0.1:5180, with a dedicated API proxy. 89 tests, build and 320/390/430px card QA passed. No deployment. See docs/research-card-prototype.md.

Last updated: 2026-09-22

## Purpose and isolation
This repository is the Apps in Toss/mobile client. The normal Web Chart View remains in `shoon94parkk-del/chart_View`.
Toss-specific navigation, safe-area, storage, SDK bridge, and release logic belong here. Shared data comes from the existing FastAPI backend.

## Runtime and services
- Preview: https://chart-view-toss.onrender.com
- Default API base: https://chart-view-pkv8.onrender.com
- `VITE_CHARTVIEW_API_BASE` may override the backend.
- Apps in Toss key: `chartview`
- Framework: `@apps-in-toss/web-framework` 3.5.0
- Node 24.x; CI uses 24.21.0.
- Build: `npm run build`; AIT bundle: `npm run build:ait`.

## UX already implemented
- 2026-09-29 UX pass: Home prioritizes device-local watch stocks over the market grid; chart/detail period changes preserve the previous chart during refresh; detail has price/filing/industry/news jumps; IDEA LAB puts the first candidate higher and collapses its methodology; More is grouped by user task. The four floating primary tabs and AIT native navigation contract are retained.
- Toss-style mobile information hierarchy and bottom navigation.
- Safe-area handling.
- Home/chart/watchlist/more plus valuation, macro, discover, news, and stock-detail surfaces.
- Home surfaces a market-cap-weighted daily-change heatmap and the restored user-selected stock list from the shared Chart View backend.
- Heatmap medium/large cells use a small set of inline bundled SVG company marks (with text fallbacks), so logo recognition adds no separate image requests.
- Heatmap labels are geometry-aware: curated short company names are preferred over provider legal names, logos are suppressed in cramped cells, and tiny cells fall back to compact labels to prevent clipping.
- Heatmap cards use tighter padding, stronger contrast, and thinner cell seams. Logos sit inline with company names only when the cell can fit them; absolute overlays are prohibited because they can cover labels.
- In `0.9.4`, the operator requested Home selection and PICK history be restored under `최근 주목받는 종목`. This uses the existing data and requires separate Toss scope review before public submission; the user-operated market screener remains available.
- Shared stock selector sheet and up to 6 selected tickers.
- Device-local watchlist/selection.
- In-app hash/history navigation and scroll restoration.
- Deep-link support for chart, valuation, macro, discover, news, watchlist, and stock detail.
- Apps in Toss runtime defers to native navigation bar instead of duplicating the custom top bar.
- Native back event closes subpages first while preserving root exit.
- External/news/policy links use the Apps in Toss top-level SDK `openURL(url)` with browser fallback; `Device.openURL` is prohibited because it caused review-time no-op failures.
- Haptics are best-effort and browser-safe.

## Data/reliability contracts
- Shared backend API contract is additive; Toss should not require destructive Web API changes.
- `src/requestClient.js` owns timeout/retry/offline behavior and request caching.
- Chart/detail flows protect against stale late responses and navigation races.
- Progressive rendering keeps available sections usable when another data source is slow/fails.
- Korean chart locale is independent of host/device language.
- Comparison UI exposes local-currency / adjusted-close / no-interpolation basis.
- Macro UI exposes unit, observation date, change basis, and source.
- News separates direct-company relation from industry/indirect relation and exposes reason/language/sort.
- Stock detail separates day change from selected-period return.

## Storage/privacy/review
- Device-local storage uses Toss-specific keys.
- Reset/delete flows must continue to work.
- Global data-use disclosure plus privacy/service/data-methodology pages are part of release scope.
- Do not treat the Render preview as equivalent to an Apps in Toss runtime.
- Real Android and iOS Sandbox/QR testing is mandatory before public release.

## External release gates
- Official Apps in Toss answer provided by the operator: lookup-only service is permitted; recommendations/investment prompts are not. Recheck if scope changes.
- Confirm commercial-use/redistribution conditions for every data provider.
- Eliminate unacceptable user-visible backend cold-start dependency.
- Verify native back/root exit, external links, haptics, safe area, keyboard, background/resume, offline/5xx/retry, and anonymous-key storage on real devices.
- Console scheme/review configuration must match the approved Apps in Toss setup.

## Regression assets
- `npm test`
- `tests/mobile_release_qa.mjs`
- `tests/watch_quote_parity_qa.mjs` (slow API, cached-first price, Home/Watchlist/valuation/heatmap/detail parity)
- `tests/live_user_journey.mjs` (real deployed API search and SK하이닉스 Home/Watchlist/heatmap/detail journey)
- `.gstack/qa-reports/qa-report-chart-view-toss-onrender-com-2026-09-28.md` (release QA findings and remaining gates)
- `tests/analysis_qa.mjs`
- `tests/progressive_qa.mjs`
- `tests/release_gates_qa.mjs`
- live backend contract smoke


- 홈 히트맵과 전체 히트맵은 반드시 같은 `homeSnapshot` 데이터와 공용 렌더러를 사용한다. `static/data/heatmap.json`은 레거시 섹터 데이터이므로 전체 화면의 운영 데이터 소스로 재사용하지 않는다.

- 2026-09-26 히트맵 회귀 원인: 공용 렌더러 전환 중 2D treemap이 가로 폭 분할로 바뀌고 색상 클래스가 CSS 계약과 어긋나 빈 하단 영역과 투명 셀이 발생했다. 공용 렌더러는 반드시 left/top/width/height 4개 좌표와 home-hm-up/down 단계 클래스를 유지한다.

- 2026-09-26 전체 히트맵은 홈 18종목 복제 화면이 아니다. 홈은 빠른 대표 요약(18개), 전체보기는 별도 `/api/heatmap/full`을 사용해 한국 주요 20 + 미국 시총 상위 40 수준의 확장 시장 지도를 제공한다.

- 2026-09-27 전체 히트맵 라벨은 Finviz식 면적 기반 단계화를 사용한다. 큰 셀은 로고+이름+등락률, 중간은 축약명+등락률, 작은 셀은 작은 티커 중심, 극소 셀은 텍스트를 숨긴다. 작은 셀에서 브라우저 기본 strong 글자 크기가 노출되면 회귀다.
- 2026-09-27 홈 초기 체감속도는 stale-first 전략을 사용한다. 이전 시장/홈 스냅샷/종목발굴/관심종목 시세를 브라우저 캐시에서 즉시 그린 뒤 네트워크 최신값으로 교체하고, 첫 방문은 HTML 단계에서 백엔드 preconnect/early fetch를 시작한다. 토스 저장소 브리지 완료 전에도 홈 비개인화 영역은 먼저 렌더한다.

- 2026-09-27 전체 히트맵 라벨은 시장별 우선순위를 다르게 적용한다. 한국은 숫자 종목코드보다 기업명/축약명을 우선하고, 미국은 티커와 함께 등락률 수치를 가능한 많은 셀에서 유지한다.

- 2026-09-27 히트맵 정합성: 전체보기는 5분 클라이언트 캐시를 사용하지 않는다. 진입 시 서버 캐시를 다시 확인하고, Home과 겹치는 종목은 브라우저가 사용한 homeSnapshot 값을 최종 오버레이한다. 서버 응답이 incomplete/refreshing이면 약 1.8초 후 한 번 재확인한다.

- 2026-09-27 장중 실시간 구조: Toss 클라이언트는 활성/가시 상태에서만 `/api/activity` heartbeat를 보내고, Home에서만 약 9~12초(기본 10초, 방문자별 deterministic jitter) 간격으로 `/api/home-live` 공용 메모리 캐시를 읽는다. 숨김/백그라운드에서는 polling을 중지하고 복귀 시 즉시 재동기화한다. 클라이언트가 외부 시세 공급자를 직접 갱신하지 않는다.
- `/api/home-live` 이벤트는 홈 대표 히트맵과 해당되는 관심종목 시세만 부분 갱신하며 전체 Home 재렌더를 유발하지 않는다.

- 2026-09-27 심사 반려: `20260921-5`가 외부 링크 미동작으로 반려됐다. Toss runtime 외부 링크는 반드시 `@apps-in-toss/web-framework`의 top-level `openURL(url)`을 사용하고, 정책 페이지는 `.ait`의 `location.origin`이 아니라 공개 고정 HTTPS URL을 사용한다.

- 2026-09-27 재심사 QA: 320px Home 히트맵에서 Tesla/AMD small cell이 라벨+등락률 2줄 때문에 잘리는 회귀가 검출됐다. Home의 320~360px `is-small` 셀은 식별 라벨을 남기고 등락률을 우선 생략한다.

- 2026-09-28 PICK 관리 통합: 기존 `#picks` 추천 기록 화면을 유지한 채 누적 추천 성과와 Web Chart View의 `/static/data/pick_monitor.json` 사후점검 상태를 한 화면에 합쳤다. 홈/전체 메뉴는 `PICK 관리`로 진입하며, 점검 데이터 실패 시에도 추천 성과는 독립적으로 표시한다.

- 2026-09-28 경제지표 미니 차트: Toss `#macro` 카드에 백엔드 `chart_data`를 그대로 사용한 경량 SVG 스파크라인을 추가했다. 별도 API 호출·차트 인스턴스 없이 렌더링하며 시계열이 없으면 `시계열 없음`을 표시한다.

- 2026-09-28 홈 주요시장 확장: 기본 4개(KOSPI/KOSDAQ/S&P 500/NASDAQ)는 기존처럼 즉시 표시하고, `더 보기`에서 미 10년물·VIX·WTI 유가·원/달러를 추가 표시한다. 보조 4개는 사용자가 펼칠 때만 `/api/quotes`로 조회해 홈 초기 로딩 부하를 늘리지 않는다.


### 2026-09-28 — Home/detail quote parity
- A visible current price must not move backward in time when navigating between Home heatmap, full heatmap, watchlist, and detail.
- `src/liveQuoteStore.js` is the in-session canonical quote memory.
- Detail paints Home's newest known quote immediately, then polls one symbol every 5s via the fresh quote endpoint.
- Detail live polling is cleared on route/chart cleanup and must never be added to Home first-paint work.

### 2026-09-28 — Heatmap/detail identity + structural quote merge
- Heatmap cells carry both ticker and the visible company name into detail navigation, so opening a stock such as `009150.KS` shows `삼성전기` instead of a raw ticker-only header.
- Live quote overlays are null-safe. A detail quote may update price/change but must not erase structural heatmap fields such as `marketCap` or `name`; otherwise the just-viewed stock can disappear when returning to the heatmap.

### 2026-09-28 — Watchlist canonical quote painting
- Watchlist and Home-watch rows always pass fetched/browser-cached quote rows through the in-session `liveQuoteStore` before painting.
- A late/stale `/api/quotes` response may populate missing symbols but may not repaint a symbol backward over a newer Home/detail quote.
- Canonical rows, not the older raw response, are written back to the Home fast watch cache.


### 2026-09-29 — Screener popular filters
- Market Screener has one-tap popular presets: 거래량 급증, RSI 과매도, 강한 모멘텀, 골든크로스, 상승추세, 52주 신고가 근접, 눌림목 후보, MACD 강세.
- A preset writes values into the same manual filter controls; users can refine them afterward.
- Each matching result shows reason chips such as RSI, volume multiple, trend, MACD, or 52-week-high proximity.
- Do not describe these end-of-day technical filters as buy/sell recommendations.

## 2026-09-29 — 투자 아이디어 LAB beta
- Route: `#ideas` / `/ideas`; entry: 전체 > 분석 도구 > 투자 아이디어 LAB.
- Implementation: `src/ideaEngine.js` pure rule engine + `src/ideaView.js`/CSS lazy-loaded view.
- Source: shared backend `/static/data/screener.json` only for v1, preserving dated end-of-day semantics.
- Patterns: 거래량 동반 상승, 상승추세 속 숨 고르기, 52주 고점 근접, 모멘텀 강화, 과매도 반등 관찰.
- Candidate click reuses existing detail; next planned expansion is sector co-movement → news evidence → related/supply-chain stocks → PICK change tracking.

### 2026-09-29 IDEA LAB compact + evidence enrichment
- Candidate context cards are collapsed by default to keep the LAB list scannable.
- Opening a candidate lazily enriches it with `/api/business-report` and `/api/relationship-evidence`.
- DART shows actual report-derived top revenue product and mix when parsing is confident.
- Direct relationships are shown separately from classification-based supply-chain adjacency and include evidence headline/source/link.
- The same direct-evidence section is also rendered in Korean stock detail.

### 2026-09-29 OpenDART latency optimization
- Backend now uses a checked-in OpenDART corp-code cache generated weekly by GitHub Actions instead of downloading corpCode.xml during user requests.
- OpenDART still selects the authoritative annual report; content parsing reads only targeted DART viewer sections.
- Samsung Electronics 2025 annual report now resolves as business-division revenue: DX 56.3% (top), DS 39.0%, SDC 8.9%, Harman 4.7%, with internal-transaction elimination used only for reconciliation.
- Detail/LAB UI labels segment-level results as “매출 1위 사업부문” and shows the division’s major products separately.
- Measured Render latency: first Samsung request 4.147s; repeated cached request 0.084s.

### 2026-09-29 major-detail live timing + DART coverage
- Major-company DART parser coverage verified at 12/12 for Samsung Electronics, SK Hynix, LG Energy Solution, Samsung Biologics, Hyundai Motor, Kia, Samsung SDI, LG Electronics, NAVER, Kakao, Celltrion, and POSCO Holdings.
- The backend precomputes these validated DART contexts; first API access from an empty in-process cache but with the static cache present averaged 56 ms, max 102 ms. Browser-observed business-report request averaged about 172 ms.
- Live mobile Chromium detail-page averages from navigation start: price 2632 ms, chart 3153 ms, company/industry + DART 2647 ms, valuation metrics 3604 ms, news 2898 ms, core detail completion 4037 ms.
- Direct-relationship evidence averaged 5453 ms and maxed at 7487 ms, but it is asynchronous and must never block DART or core detail rendering.
- Current remaining P0 performance bottlenecks are valuation, compare/chart, and fresh quote; DART itself is no longer the bottleneck.

### 2026-09-29 Detail and IDEA LAB loading states
- Detail shows explicit text while the first quote and KRX company context are pending; its DART and direct-evidence states update independently after the base context renders.
- Detail reuses a screener row's industry/products when both are present; `company_context.json` is only a fallback for missing metadata or missing symbols.
- IDEA LAB only fetches enrichment when a candidate is expanded and paints each completed source without waiting for the other source.
- Missing/ambiguous DART revenue stays distinct from a network failure; neither state creates an unsupported top-revenue claim.
- 2026-09-29 stock identity polish: direct ticker links resolve an exact API search result and update the detail title/logo while quotes and charts load independently. Stale watchlist entries whose name equals the ticker are repaired when the name resolves. The current detail interest action toggles device-local watch state without reloading detail; the earlier duplicate topbar heart was removed in the later task-first UX pass.
- Home `종목 검색` uses the stock selector in search-only mode; tapping a result opens detail. The chart selector continues to manage comparison selections separately.
- 2026-09-29 live uncached DART probe for a non-major Korean stock took 23.4 seconds while a cached request returned in about 0.3 seconds. The Toss report request now waits up to 45 seconds with a visible first-lookup explanation; other detail data remains independently rendered.
- 2026-09-29 loading/share polish: Home, chart, detail, watchlist, valuation, macro, news, analysis, IDEA, PICK, heatmap, and selector pending areas have a named visible spinner. Chart plot areas use a centered overlay that clears when loading settles. Share actions work in both web preview and AIT's hidden-topbar runtime; the backend serves per-route Open Graph previews, including the exact stock name and ticker.
- 2026-09-29 investment tools: `#tools` now contains the original Chart View's 12 external sites, opens them through the Toss external-URL bridge, and uses favicon with a local lettermark fallback. More-screen analysis entries have distinct icons. Hanwha Ocean's DART card explains consolidated segment shares when a named adjustment makes the positive segments total above 100%.
### 2026-09-29 report-based financial trend and context flow
- Korean detail screens lazy-load `/api/financial-history` independently of quote/chart/industry work. Annual and interim numbers show DART source links and statement basis. Unsupported values remain unavailable.
- Related-company breadth uses same-date KRX major-product/industry-stage groups when classification is specific, with the official KRX industry still disclosed. Samsung Electronics and SK hynix are grouped with memory-chip makers; Dongseong Finetec's insulation is grouped with LNG/shipbuilding materials. Company names alone do not determine an industry. Fewer than three peers means no strength judgment.
- Detail bottom navigation retains its originating primary tab. More is titled `분석과 도구` in the body, and displayed version comes from package.json.
### 2026-09-29 — Weekly sector breadth and favorite-first selection
- Detail and IDEA sector breadth uses screener `ret5` (five trading sessions), not daily `change1d`; missing weekly values do not enter breadth or tone denominators.
- IDEA LAB requires `avgValue20 >= 1_000_000_000` KRW (20-day average traded value of at least 10억원).
- Stock selector opens with saved watchlist rows and ranks those rows first in search results. Search-only Home behavior still opens detail; chart/analysis selection still applies comparison symbols.
- LNG insulation has its own narrow comparison group; weak product overlap alone is never described as a proven customer or supplier relationship.


### 2026-10-01 — PICK 단기 기술 경고
- PICK 관리에서 펀더멘털 `KEEP/WATCH/SELL_REVIEW`와 별도로 technical advisory signal을 표시한다.
- 빨간 `단기 매도 검토`는 기술점수 급락 + RSI 과열/최근 급등 조합을 우선하며 자동 매도 확정이 아니다.
- 카드 배지, 상단 경고, 상세의 전일→오늘 점수·RSI·5일/20일 수익률, “단기 경고 우선” 정렬을 제공한다.
- shared backend 계약은 additive only로 유지하고 기존 PICK 상태 의미는 변경하지 않는다.

## 2026-10-01 Financial quality and peer comparison
Detail financial history dynamically renders financialQualityView with source accounts and conservative review facts. The existing question input supports cash, balance and quality views with company selection from watchlist/search or business classification. Financial API quality schema v2 is additive. Separate requested valuation panel uses existing API and never implies DART period equivalence. Tests cover null/zero, ratios, prior-year-end distinction, delayed loads, partial peer fields, retries, chosen peer and mobile overflow.

## 2026-10-01 Experience continuity and data honesty
Use experienceState.js for public share conditions and summary/revenue/quote presentation states. Question peer conflicts need explicit target confirmation; unsupported dividend/capex/EPS/segment/forecast requests must not fall back to revenue. Screener form state and unsaved research drafts are visit-local. Draft peer null overrides a saved selection. Stock news route is #news/SYMBOL; switching to plain news clears scope even on the same tab. Share cv includes public conditions only, never raw questions or stored watchlists. Detail facts are above compact comparison; help and optional peer picker are collapsible.

## 2026-10-01 Selection and navigation usability follow-up
Stock selector traps Tab, supports Escape, restores calling focus and background inert state, labels search/removal/selection, preserves result scroll/focus, reveals newly added chips, and offers search clear/retry. Home market missing observations are terminal after requests settle; primary/optional retries retain dated observations and bypass empty client caches. Primary live updates retain optional observations omitted from their payload. Browser forward restores the current visit's history depth rather than decrementing it. See UX_USABILITY_FOLLOWUP_2026-10-01.md and selection_usability_qa.mjs; existing financial calculations/storage/native-root semantics remain unchanged.

## 2026-10-02 · 투자 근거 검토
0.10.0: compact quote + index detail, independent eight-quarter/TTM module, reviewed filing changes and local typed investment conditions. Files detailPresentation.js, quarterView.js, investmentReview.js, reportReviewView.js, reviewStorage.js. Preserve cumulative financialHistoryView and existing one-question comparison. Sources and observation periods remain visible; no LLM or forecasts. New regression tests investmentReview.test.mjs, detailPresentation.test.mjs, investment_review_qa.mjs. Native REVIEW_KEY joins existing account separation/reset; data-guide/privacy describe local records.

## 2026-10-02 Sector heatmaps and performance audit
0.10.1 adds separate KR/US sector boards below Home and full stock heatmaps. Home sector JS/CSS and full quotes are requested only on viewport approach; full screen reuses its canonical payload/client cache. Tiles show covered-company cap-weighted daily change, date/count/share and expandable member links. Missing/zero cap, stale, unknown classification and other-session rows are excluded and disclosed. Refresh/retry preserves selected market/sector and valid dated data. Backend full quote budget remains 20 KR / 40 US, with one representative of each available US sector. This is not a full-market official sector index. Existing weekly company peer breadth remains unchanged.
Audit: measured all 17 principal route journeys at 390px on the live site, including separate KR/US/index detail. Found an unnecessary KR screener download on US quote/industry detail and removed both paths. IDEA LAB calculated industry context for every matched candidate before ranking; rank first and build/cache context only for displayed winners. Checked-in screener benchmark: 6505ms to 186ms, deep equality of the complete outputs (cards, rankings, context, calculations and reasons). Main sector/industry JS is split into dynamic chunks, preserving the first Home paint. Added sector aggregation metadata tests, bounded classification-work regression and 320/390/430px loading/error/cache/member/navigation QA. Final live timings and screenshots are recorded in docs/SECTOR_PERFORMANCE_AUDIT_2026-10-02.md after deploy.

## 2026-10-02 Whole-site reliability follow-up
Use explicit force only for chart retry to recover cached 200 empty/partial data. Disclose missing selected companies above comparison charts. Domestic detail alone offers DART research/industry; absent industry removes its jump. Detail news retry is independent, and secure external web opening no longer emits false failure from noopener null. tests/reliability_audit_qa.mjs covers 320/390/430px. Production and audit evidence: RELIABILITY_UX_AUDIT_2026-10-02.md.

### 2026-10-02 — Export momentum dashboard
- Placement: More > 근거와 시장 환경 확인 > 수출 모멘텀. Do not add it to Home.
- Current charts: 10/20/full-month cumulative export bars, item YoY diverging bars, destination YoY bars.
- `history[]` is optional in the normalized snapshot and will activate the recent-12-month export amount + YoY chart after Customs API integration.
- Export data remains lazy-loaded on the exports route only.

## 2026-10-03 — External review validation, 0.10.4
DIRECT search rows are syntactic fallback candidates: require a positive quote before exposing selection. Exact Micron aliases use MU and preserve Hana Micron results. Selector cancels obsolete/closed requests and offers retry after empty/failed responses. Unknown direct detail cannot add watch/compare entries. Fast cached Home/full heatmap paint explicitly identifies stored data until revalidation; quote freshness rules and TTLs remain unchanged. Cap and each valuation metric expose independent source/time/basis. Domestic/US coverage differs explicitly. Expanded detail review lazily reuses dated PICK/monitor and screener data; no new trading signal or mandatory Home request. Macro empty200 is retryable error, policy/effective rates use %. Complete disposition: REVIEW_VALIDATION_2026-10-03.md.


## 2026-10-03 — 사용자 승인: 핵심 가치 발견 (0.11.0)

새 동작으로 홈 배치를 변경한다. 이전 수출 진입 숨김·홈 18종목 동시 표시·홈 전체 섹터 보드는 이 결정으로 대체된다. 첫 화면에 수출, 조건별 종목 찾기, 최근 선정 진입을 노출한다. 최근 선정의 원문 이유와 날짜·점검 상태를 보여주고 날짜/코드가 일치하는 기록만 직접 연다. 전체 성과는 펼쳐서 확인한다. 관심목록은 시장보다 앞에 유지하되 빈 목록은 작게 표시한다.

홈 히트맵은 선택 시장 대표 6종목 미리보기다. 전체 화면은 한국/미국·종목/섹터 탐색을 제공한다. 공유 렌더러, 전체 수집 범위, canonical 최신 시세·출처·거래일, 캐시 TTL을 유지한다. 홈 수출 요약은 화면 접근 시 월간 스냅샷만 지연 요청하며 품목 상세/국가 세부 API는 진입 전 호출하지 않는다. 스크리너는 실제 프리셋과 결과를 먼저 보여주고 수동 조건은 접는다. 상세 왕복 시 조건·페이지 상태를 유지한다. 수출 바로가기는 기존 분석 섹션으로 이동하며 월별 기준·단위·누락값 계약을 유지한다. 브라우저 검증으로 10초/30초 실사용 목표 달성을 주장하지 않는다.

## 2026-10-04 — 개편 리뷰 중복/사실 검증
0.11.2: PICK 선정 점수(원자료의 0 포함)와 현 기술점수를 구분, 출처/산식 미제공 설명. favorites 별칭은 watch, 정식 공유/저장 그대로. 비교/상세/밴드 chart localization은 yyyy.MM.dd. 실제 KRX 영숫자 종목코드를 숫자로 교정하지 않는다. PER은 기간 차이를 먼저 대조한다. 전용 redraw/별칭/0-누락 모바일 QA 추가.

## 2026-10-04 — 시장 우선 홈 동선, 0.12.0
사용자 새 승인으로 0.11.0의 시장 후행 배치를 대체: 주요 시장 → 핵심 분석 3진입 → 관심 → 선정 기록·성과. 320×693 첫 화면에서 시장과 세 진입 유지. 선정 이유는 정확한 날짜/코드의 기록 클릭 후 확인하며 평균/분모/기간 차이는 홈에서 설명. more 표시만 분석, 목적 이동은 hash/history를 바꾸지 않는다. 탭 용도 안내 추가. 계산·시세·저장·native 계약 유지. tests/home_journey_qa.mjs의 9상태를 기존 모바일 CI와 같이 실행.

## 2026-10-04 — 목적별 시각적 구분 0.12.1
Home/analysis entries share local semantic SVGs and purposeful teal/export, blue/find, violet/records colors. Visible text remains meaningful without color; financial red/blue and status warnings retain data semantics. Route category, section symbols and active navigation styling preserve 0.12.0 first-fold/order, native safe area/back, exact dated records and request/cache/storage contracts. No external icon/image/font dependency.


## Insight flow contract — 2026-10-04
- Retain market-first Home and lazy export/detail loading; change cards are at most three, each with its own data date.
- Discovery context uses actual values/conditions; lazy LAB retry must rebind the contextual navigation, not replace it with generic detail navigation.
- Actual screener conditions survive reload/shared links; advanced panel open state is restored only from the session and survives detail/back.
- Export classification candidates require dated products evidence; show statistical/issuer exposure limits.
- Saved research reuses existing device-local keys; raw questions/evidence never enter public share.
- Price comparison list changes only on explicit user action.
- Retry just the failed optional provider; preserve ready siblings and normal cache TTL.


## 2026-10-04 — 승인된 UI·UX 계획 0.14.0
- 홈 순서는 시장 → 세 핵심 입구 → 변화 기본2/펼침3 → 최근 선정2/원문 이유1행 → 관심 최대3/저장 조사 최대1 → 히트맵이다. 저장 원본은 제한하지 않는다. 집계 성과 계산은 전체 기록의 펼침에 유지한다. 이전 관심 선행·홈 집계 상시 노출 결정은 이번 승인으로 대체된다.
- 수출 상세 요약 다음에 기업 조사 CTA와 기존 후보를 둔다. 국가/품목/제품 전체는 펼치되 검증된 제품 구절·출처·날짜·수혜 미확인 한계는 처음부터 표시한다. 동일 API/context/state/cache를 재사용한다.
- 상세 요약은 핵심 관찰·날짜·한계·행동과 전체 근거 펼침을 제공한다. 공시 사업매출 단위가 확인되면 조/억 원으로 표시하고 원값을 보존한다. 현재 섹션은 실제 DOM 위치/스크롤 끝 기준이며 버튼 순서를 따르지 않는다.
- 공통 핵심 근거/출처12px, 독립 조작44px, 키보드 포커스. 하단 chart의 표시 수익률, 화면 제목 수익률 비교; 기존 route/storage/native 계약 그대로.
- 지도/목록은 같은 heatmap payload/시장/숫자/시세 freshness를 사용한다. 빈 관심 편집·정렬을 숨기고 빈 조사 검색 입구를 제공한다.
- 새 위치의 Home 관찰은 viewport 근처에서 기존 screener를 단일 캐시 요청할 수 있다. 시장/입구 렌더링과 독립; 늦은 소스 완료 때 해당 CTA 포커스와 화면 위치를 보존한다.
- UIUX_IMPLEMENTATION_2026-10-04.md와 기존 CI suites가 근거다. 웹 검증으로 native Android/iOS나 실제5명 사용성 검증 완료를 주장하지 않는다.


## Insight revisit follow-up — 0.15.0
User-approved new behavior. Home cards include dated observations, questions and limits. Manual screener and guided LAB have explicit roles. Optional priceBasis exclude/only uses existing ±35% warning; default inclusion and values preserved, cv round-trips. Source selection score remains in detail including real0; fundamental row status and technical warning badges are independent, raw source codes retained. Saved filing-only records are listed. REVIEW_KEY adds observation, never replaces filing/condition baseline implicitly. Home explicit check only (max3saved issuers/up to3peers each, deduplicated), pending/unavailable/new/corrected/condition-change distinguished, late closed-page response cannot persist. Revisit status/filing comparison is a lightweight import; financial comparison loads only on detail/action. See INSIGHT_FOLLOWUP_2026-10-04.md.


## 2026-10-04 — DRAM spot price in Toss exports
- `src/memorySpotView.js` mounts only inside `#exports` > memory and calls shared backend `/api/memory-spot`.
- The existing memory export report remains intact. A separate DRAM spot section appears immediately before it so spot price and Customs export/unit-value evidence can be read together.
- Three visible series: DDR5 16Gb, DDR4 16Gb, DDR4 8Gb. Cards show session average, daily high/low, provider source date, and Chart View accumulated history.
- The chart is inline SVG; no extra chart runtime is loaded. Home/bootstrap/quotes/heatmap receive no new request.
- Spot provider failure is isolated and retryable; ready Customs sections remain visible. The UI discloses that paid historical TrendForce data is not backfilled and links the source page.


## 2026-10-04 — Export tabs + memory price catalog
- Export default screen is `전체 요약`.
- Current tabs: `전체 요약`, `품목`, `국가`, `반도체`. The former `속보·추세` tab was merged into Overview on 2026-10-05.
- Overview keeps the official monthly summary plus provisional 10/20-day radar, 12-month total trend, annual cumulative figures and checkpoint flow. The month-end landing estimate / estimate-vs-actual review UI is intentionally not shown.
- Products keeps amount/volume/unit-value cards, breadth, quadrant and 12-month drilldown. Semiconductor keeps DRAM/Flash/MCP/DRAM-module Customs report plus lazy market prices.
- Memory prices load from `/api/memory-prices` only when Semiconductor is opened. Price-family chips show one family at a time: DRAM chip, NAND chip, NAND wafer, DRAM module, GDDR.
- HBM/MCP/eMMC-UFS without public numeric price are disclosed as unavailable; MCP export evidence remains in the Customs report.


## 2026-10-05 — mobile density contract
- User preference: mobile research lists should prioritize scan density. Screener and pick rows should show several stocks per viewport rather than one large card per stock.
- Current compact targets: screener row min-height 68px before optional warnings; pick ledger CSS min-height 62px; measured content row target <=96px. Export cards use <=600px density overrides.
- Preserve all trust metadata and warnings; compact by typography/layout, not by deleting evidence or basis text.


## 2026-10-05 — semantic emphasis contract
- `src/emphasis.css` is loaded after `uiExperience.css` so later accessibility/experience overrides do not flatten the visual hierarchy.
- Semantic identities are stable across Home and detail surfaces: export/evidence teal, discovery blue, picks purple, watch gold.
- Home change cards use their actual kind: export evidence teal, stock-finding/technical observation blue.
- The system must not recolor semantic market/status meanings such as up/down or keep/watch/sell.


## 2026-10-05 — mobile PICK ledger contract
- Chart View Toss is mobile-first. The PICK ledger should prioritize scan density without hiding the aggregate state.
- Performance and status summaries are always visible, but compressed into a four-KPI row plus compact status pills; long basis copy is hidden on mobile.
- Warning/policy details and filters stay collapsed/compact.
- On <=600px, collapsed PICK rows target <=64px and remain a two-row layout.
- The 390x844 release QA must show at least three PICK records above the fixed bottom navigation where fixture content permits.
- Later global accessibility typography must not inflate PICK metadata/status text back to desktop-like sizes.


## 2026-10-05 — Home density + provisional labeling
- Home is a glance dashboard, not a duplicate of detail pages. Export/change cards show dated numeric observations first; questions/limits belong in the destination analysis.
- Home pick block shows compact aggregate performance plus three recent selections. Preserve exact record routing and one-line thesis text.
- Export provisional checkpoint rows (1~10d / 1~20d / full month) use semiconductor amounts. Always label those rows as semiconductor so they cannot be mistaken for total exports.
