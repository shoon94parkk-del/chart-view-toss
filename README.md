# Chart View for Apps in Toss

Chart View의 앱인토스 전용 클라이언트 프로젝트입니다.

- 원본 웹 서비스: `shoon94parkk-del/chart_View` (변경하지 않음)
- 이 저장소: 토스 미니앱 UI/앱 셸 및 연동 전용
- 원칙: 기존 Chart View API 계약을 재사용하고 앱인토스 전용 변경은 이 저장소에서 격리

## Live preview

- Render: https://chart-view-toss.onrender.com
- Backend API: https://chart-view-pkv8.onrender.com

## Current status

v0.6 preview:
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

## Architecture

The Toss client is deployed as a Render Static Site and reuses the existing Chart View FastAPI backend. The production web repository is kept isolated from Toss-specific UI changes.

## Apps in Toss build

The Render preview still uses `npm run build`. For the actual mini-app bundle:

```bash
npm install
npm run build:ait
```

The 3.x configuration lives in `apps-in-toss.config.ts`. The current app key is `chartview`.

## Next

- generate and upload the first `.ait` candidate
- Sandbox / QR validation on Android and iOS
- verify native navigation/back behavior and external news opening on device
- define Apps in Toss major features and release checklist
