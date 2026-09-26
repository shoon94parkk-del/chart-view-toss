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
- Toss-style mobile information hierarchy and bottom navigation.
- Safe-area handling.
- Home/chart/watchlist/more plus valuation, macro, discover, news, and stock-detail surfaces.
- Home surfaces the latest screener-selected TOP3 and a market-cap-weighted daily-change heatmap using the shared Chart View backend.
- Heatmap medium/large cells use a small set of inline bundled SVG company marks (with text fallbacks), so logo recognition adds no separate image requests.
- Heatmap labels are geometry-aware: curated short company names are preferred over provider legal names, logos are suppressed in cramped cells, and tiny cells fall back to compact labels to prevent clipping.
- Heatmap cards use tighter padding, stronger contrast, and thinner cell seams. Logos sit inline with company names only when the cell can fit them; absolute overlays are prohibited because they can cover labels.
- Home discovery restores the Web Chart View recommendation-performance summary from the same home-bootstrap payload: average evaluated return, positive-return ratio, and evaluated/total recommendation count.
- Home "추천 기록" opens a dedicated mobile recommendation ledger showing recommendation date, recommendation price, current price, current return, best return, score, status, and reason. The market screener remains a separate analysis tool.
- Shared stock selector sheet and up to 6 selected tickers.
- Device-local watchlist/selection.
- In-app hash/history navigation and scroll restoration.
- Deep-link support for chart, valuation, macro, discover, news, watchlist, and stock detail.
- Apps in Toss runtime defers to native navigation bar instead of duplicating the custom top bar.
- Native back event closes subpages first while preserving root exit.
- News uses native `Device.openURL` when available with browser fallback.
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
- Confirm official Apps in Toss scope/review requirements.
- Confirm commercial-use/redistribution conditions for every data provider.
- Eliminate unacceptable user-visible backend cold-start dependency.
- Verify native back/root exit, external links, haptics, safe area, keyboard, background/resume, offline/5xx/retry, and anonymous-key storage on real devices.
- Console scheme/review configuration must match the approved Apps in Toss setup.

## Regression assets
- `npm test`
- `tests/mobile_release_qa.mjs`
- `tests/analysis_qa.mjs`
- `tests/progressive_qa.mjs`
- `tests/release_gates_qa.mjs`
- live backend contract smoke


- 홈 히트맵과 전체 히트맵은 반드시 같은 `homeSnapshot` 데이터와 공용 렌더러를 사용한다. `static/data/heatmap.json`은 레거시 섹터 데이터이므로 전체 화면의 운영 데이터 소스로 재사용하지 않는다.

- 2026-09-26 히트맵 회귀 원인: 공용 렌더러 전환 중 2D treemap이 가로 폭 분할로 바뀌고 색상 클래스가 CSS 계약과 어긋나 빈 하단 영역과 투명 셀이 발생했다. 공용 렌더러는 반드시 left/top/width/height 4개 좌표와 home-hm-up/down 단계 클래스를 유지한다.

- 2026-09-26 전체 히트맵은 홈 18종목 복제 화면이 아니다. 홈은 빠른 대표 요약(18개), 전체보기는 별도 `/api/heatmap/full`을 사용해 한국 주요 20 + 미국 시총 상위 40 수준의 확장 시장 지도를 제공한다.
