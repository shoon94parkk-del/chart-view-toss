# Chart View Toss project memory

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
