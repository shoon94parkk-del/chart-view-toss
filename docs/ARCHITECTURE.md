# Chart View Apps in Toss architecture

## Isolation rule
The production web repository `shoon94parkk-del/chart_View` is not modified by this project.

## MVP
- Apps in Toss client lives in this repository.
- Existing Chart View FastAPI service is reused as the shared backend.
- Backend URL is configured with `VITE_CHARTVIEW_API_BASE`.
- Device-local watchlist is isolated under `chartview-toss-*` keys.
- Toss-specific navigation, safe-area and lifecycle behavior belongs here.

## Next
1. Confirm Apps in Toss console app name/origin.
2. Add the final Toss framework configuration generated for that app.
3. Replace MVP JSON chart diagnostics with the production chart renderer.
4. Port valuation, macro, screener and personalized-news views.
5. Add Toss bridge navigation/back-button behavior.
6. Run sandbox/QR validation and submission checklist.
