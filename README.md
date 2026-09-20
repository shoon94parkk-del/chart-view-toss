# Chart View for Apps in Toss

Chart View의 앱인토스 전용 클라이언트 프로젝트입니다.

- 원본 웹 서비스: `shoon94parkk-del/chart_View` (변경하지 않음)
- 이 저장소: 토스 미니앱 UI/앱 셸 및 연동 전용
- 원칙: 기존 Chart View API 계약을 재사용하고 앱인토스 전용 변경은 이 저장소에서 격리

## Live preview

- Render: https://chart-view-toss.onrender.com
- Backend API: https://chart-view-pkv8.onrender.com

## Current status

v0.4 preview:
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

## Architecture

The Toss client is deployed as a Render Static Site and reuses the existing Chart View FastAPI backend. The production web repository is kept isolated from Toss-specific UI changes.

## Next

- Apps in Toss bridge integration beyond browser-history fallback
- sandbox / QR validation and release checklist
