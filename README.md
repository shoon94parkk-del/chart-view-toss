# Chart View for Apps in Toss

Chart View의 앱인토스 전용 클라이언트 프로젝트입니다.

- 기존 웹 UI: `shoon94parkk-del/chart_View` (웹 UI 유지, Toss에 필요한 공용 API 계약은 additive 방식으로 확장)
- 이 저장소: 토스 미니앱 UI/앱 셸 및 연동 전용
- 원칙: 기존 Chart View API 계약을 재사용하고 앱인토스 전용 변경은 이 저장소에서 격리

## Live preview

- Render: https://chart-view-toss.onrender.com
- Backend API: https://chart-view-pkv8.onrender.com

## Current status

v0.8 release-plan implementation:
- Toss-style mobile information hierarchy and bottom navigation
- safe-area support
- home / chart / watchlist / more screens
- stock search with suggestions
- up to 6 selected tickers
- real Lightweight Charts rendering from the existing Chart View API
- period switching
- device-local watchlist and selected tickers
- loading / empty / retry states
- live market cards with Korean-friendly labels
- valuation comparison screen (FWD PER, PER, PBR, ROE, margin, dividend yield)
- macro indicators screen with market-environment summary
- stock detail screen with 3-month chart, valuation metrics, watchlist actions, and related news
- discovery screen using screener score / volume / trend signals
- personalized watchlist-news screen
- in-app hash/history navigation with back behavior
- Apps in Toss WebView SDK 3.4.1 pinned
- `apps-in-toss.config.ts` for `chartview` with native navigation bar enabled
- native back-event bridge on sub-pages while preserving the platform root-exit behavior
- native `Device.openURL` for news links with browser fallback
- best-effort native haptic feedback with browser-safe fallback
- Apps in Toss runtime hides the duplicate custom top bar and defers to the native navigation bar
- `/chart`, `/valuation`, `/macro`, `/discover`, `/news`, `/watch`, `/stock/:symbol` entry-route support for future major-feature deep links
- AIT contract checks run before every Render web build
- secondary-screen visual refresh: chart comparison, valuation, macro, and watchlist now share the richer home visual language
- valuation overview cards summarize selected-stock FWD PER / ROE / dividend-yield comparisons
- chart comparison shows a selected-period leader/range summary
- macro indicators use visual tiles and a market-environment hero card
- watchlist cards include price and quick valuation context
- P0 release hardening: API timeout/retry/offline handling
- global data-use disclosure and in-app data/service guide
- privacy, service-use, and data-methodology static pages
- Node 24 runtime pinning for Apps in Toss compatibility
- common stock selector sheet shared by chart / valuation / watchlist
- data-first Home order: market → watchlist → summary → tools/news
- chart result table and explicit local-currency / adjusted-close / no-interpolation calculation basis
- watchlist add/edit/sort and undo delete
- valuation metric-first cross-company comparison
- macro unit / observation / change-basis / source presentation
- news direct-vs-industry relation, reason, language, and major/latest sorting
- stock detail separates day change from selectable-period return

## Architecture

The Toss client is deployed as a Render Static Site and reuses the existing Chart View FastAPI backend. The production web repository is kept isolated from Toss-specific UI changes.

## Apps in Toss build

The Render preview still uses `npm run build`. For the actual mini-app bundle:

```bash
npm install
npm run build:ait
```

The 3.x configuration lives in `apps-in-toss.config.ts`. The current app key is `chartview`.

## P0 release gates

Completed in code:
- Render preview alias is automatically synchronized to `main`
- API timeout/retry/offline handling
- data-use disclosure and policy pages
- Node 24 runtime pinning
- AIT contract validation and bundle pipeline

Operational gates still required before public release:
- package-lock.json committed and Apps in Toss CI uses `npm ci`
- move the shared Chart View API off Render Free before public launch
- run Android and iOS Sandbox/QR validation on real devices

## Next

- build a fresh `.ait` release candidate
- run Sandbox / QR validation on Android and iOS
