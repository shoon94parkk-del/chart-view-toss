# v0.8 QA evidence

Updated: 2026-09-21

## Automated release checks

Latest v0.8 polish branch checks all passed before merge:

- Apps in Toss bundle: success
- Live backend contract smoke: success
- Mobile release QA: success

Mobile QA covers:

- 320 / 360 / 390 / 430 px Chromium screenshots
- Home and Chart at all target widths
- Valuation, Macro, Watchlist, News, Stock Detail, More, Data Info at 390 px
- horizontal-overflow assertions
- reduced-height selector sheet
- simulated HTTP 5xx
- shortened-timeout failure path
- browser offline state

## Visual review findings fixed

The generated screenshots were manually reviewed after the automated checks.

1. 320 px Home title wrapped awkwardly when the small kicker shared the same row.
   - fixed by stacking the kicker/title at <= 360 px.
2. Macro cards still exposed English comparison-basis metadata such as `previous observation`.
   - fixed by mapping it to Korean labels such as `이전 관측 대비` and `이전 월 관측 대비`.

## Release candidate

- GitHub main includes the v0.8 polish merge.
- Render preview is deployed from the synchronized main alias.
- A fresh `chartview.ait` candidate was generated successfully.
- The shared production API contract smoke checks `/health`, `/api/quotes`, `/api/compare`, and `/api/macro`.

## Still not considered complete

Automated Chromium QA is not a substitute for the actual Toss runtime. Public release still requires:

- Android Apps in Toss Sandbox/QR test
- iOS Apps in Toss Sandbox/QR test
- native back/root-exit/deep-link/external-link return checks
- safe area / keyboard / background-resume on real devices
- large-font/accessibility visual measurement
- official policy scope answer for the actual feature set
- data-provider commercial-use/redistribution review
- actual operator/legal support information
- non-sleeping production backend
