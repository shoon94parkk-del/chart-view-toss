# Apps in Toss release path

## Current foundation

- App key: `chartview`
- SDK: `@apps-in-toss/web-framework@3.4.1`
- Web preview: `https://chart-view-toss.onrender.com`
- Backend: current shared Chart View API
- Mini-app config: `apps-in-toss.config.ts`
- AIT build command: `npm run build:ait`

## Proposed major features

These routes are already recognized by the client so the Apps in Toss console can later map feature entry points without routing through Home first.

| Feature | Path |
| --- | --- |
| 차트 비교 | `/chart` |
| 밸류에이션 | `/valuation` |
| 경제 지표 | `/macro` |
| 종목 발굴 | `/discover` |
| 맞춤 뉴스 | `/news` |
| 관심종목 | `/watch` |
| 종목 상세 | `/stock/{symbol}` |

## Device validation before release

1. Upload a CI-generated `.ait` candidate to the Apps in Toss console.
2. Test the QR candidate in Sandbox / Toss app on Android and iOS.
3. Confirm native top navigation is visible and the duplicate web top bar is hidden.
4. Confirm sub-page back goes to the prior screen and root back keeps the platform exit behavior.
5. Confirm news links open via the Apps in Toss external URL bridge and return to the mini-app correctly.
6. Confirm Home, Chart, Valuation, Macro, Discovery, News, Watchlist, and Stock Detail all load the shared API.
7. Confirm deep entry routes open their intended screen.
8. Re-check loading, empty, offline, and provider-error states on a real device.

Render remains the browser preview only. The actual Apps in Toss release artifact is the `.ait` bundle.
