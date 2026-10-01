# Chart View Apps in Toss architecture

## Isolation rule
Toss UI lives in this repository. Shared backend changes in `shoon94parkk-del/chart_View` are coordinated and additive; its separate web UI is preserved.

## MVP
- Apps in Toss client lives in this repository.
- Existing Chart View FastAPI service is reused as the shared backend.
- Backend URL is configured with `VITE_CHARTVIEW_API_BASE`.
- Device-local watchlist is isolated under `chartview-toss-*` keys.
- Toss-specific navigation, safe-area and lifecycle behavior belongs here.

## Current implementation
- Lightweight Charts, valuation, macro, screener, personalized news and analysis tools are implemented.
- Apps in Toss bridge provides account storage, native back handling and safe areas.
- DART reports and financial history load independently of quotes/charts with checked-in and server caches.
- `experienceState.js` validates public share conditions (`cv` query); device notes and watchlists are excluded. Hash routes still work without conditions.
- Screener filters, paging, analysis periods and research drafts survive navigation within the visit. Explicit question save remains device-local.
- Actual Android/iOS Sandbox validation and submission gates remain in `P0_RELEASE_GATE.md`.
