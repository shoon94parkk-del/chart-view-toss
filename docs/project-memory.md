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
