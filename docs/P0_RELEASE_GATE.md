# Apps in Toss P0 release gate

Updated: 2026-09-21

## Completed

- [x] v0.8 release-plan implementation merged to `main`
- [x] API timeout, one-shot retry, rate-limit/server/network error mapping
- [x] offline detection and visible offline state
- [x] data-use disclosure across analysis screens
- [x] in-app data/service information screen
- [x] privacy, service-use and data-methodology pages
- [x] Node 24.21.0 runtime pin
- [x] `package-lock.json` committed
- [x] Apps in Toss CI uses `npm ci`
- [x] CI verifies web build + `chartview.ait` generation + artifact upload
- [x] Render preview branch is automatically kept identical to `main`
- [x] Render preview build passes and is live
- [x] backend CORS includes Apps in Toss production/private origins and Render preview origin
- [x] backend exposes `/health`
- [x] deployed backend live contract smoke passes for `/health`, `/api/quotes`, `/api/compare`, `/api/macro`
- [x] comparison calculation basis and macro unit/observation metadata are exposed to the client
- [x] shared stock selector, storage reset, chart stale-response protection and partial-failure UI implemented

## Blocking before public launch

- [ ] obtain an official Apps in Toss scope answer; inquiry sent with user-authorized consent, response pending (2026-09-21)
- [ ] confirm commercial-use / redistribution conditions for every data provider in `DATA_PROVIDER_INVENTORY.md`
- [x] actual operator 박상훈 and support kimtang89@naver.com disclosed
- [ ] eliminate user-visible cold-start dependency through a validated free static/serverless path or an explicitly authorized non-sleeping API; paid compute is not itself a Toss policy requirement
- [ ] Android Apps in Toss Sandbox / QR smoke test
- [ ] iOS Apps in Toss Sandbox / QR smoke test
- [ ] verify native back button, root exit, external news open, haptic, safe area, keyboard/search and background-resume on device
- [ ] verify slow network, offline, server 5xx and retry UX on device
- [ ] confirm new anonymous-key storage and account separation on Android and iOS
- [ ] correct console feature scheme to intoss://chartview/chartviewHome and obtain review

See `FREE_HOSTING_AND_RELEASE.md` for current rights findings, free-hosting preparation and remaining external dependencies. Automatic tests and a test-bundle upload do not constitute public launch approval.

## Release rule

Do not submit the public release until every blocking item above is checked. The web preview is a validation surface; the final release decision is based on the Apps in Toss `.ait` bundle running inside the Toss app runtime.
