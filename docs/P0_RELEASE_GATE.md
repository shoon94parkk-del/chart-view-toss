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

- [x] obtain an official Apps in Toss scope answer: operator-provided reply permits lookup-only service and excludes stock recommendations/investment prompts (2026-09-28)
- [ ] confirm the restored `최근 주목받는 종목` view with Toss; existing user-selected stocks and recommendation performance are visible again in `0.9.4`, outside the previously cleared lookup-only scope
- [ ] confirm commercial-use / redistribution conditions for every data provider in `DATA_PROVIDER_INVENTORY.md`
- [ ] confirm TrendForce DRAM public latest-price redistribution/public-app use or replace `/api/memory-spot` with a source whose license explicitly covers the intended Apps in Toss use
- [x] actual operator 박상훈 and support kimtang89@naver.com disclosed
- [ ] eliminate user-visible cold-start dependency through a validated free static/serverless path or an explicitly authorized non-sleeping API; paid compute is not itself a Toss policy requirement
- [ ] Android Apps in Toss Sandbox / QR smoke test
- [ ] iOS Apps in Toss Sandbox / QR smoke test
- [ ] verify native back button, root exit, external news open, haptic, safe area, keyboard/search and background-resume on device
- [ ] verify slow network, offline, server 5xx and retry UX on device
- [ ] confirm new anonymous-key storage and account separation on Android and iOS
- [ ] correct console feature scheme to intoss://chartview/chartviewHome and obtain review

See `FREE_HOSTING_AND_RELEASE.md` for current rights findings, free-hosting preparation and remaining external dependencies. Automatic tests and a test-bundle upload do not constitute public launch approval.

2026-09-28 재점검: `0.9.2` AIT 로컬 빌드 성공, Render 고정 진입 경로 16개 HTTP 200, SK하이닉스의 관심·상세·홈 가격 및 두 히트맵 등락률 일치 확인. 이후 공식 정책 회신에 맞춰 `0.9.3`은 추천 코드만 보존하고 Toss 노출·요청을 막았다. 실제 QA 근거는 `.gstack/qa-reports/qa-report-chart-view-toss-onrender-com-2026-09-28.md`에 기록한다. 임의 `/stock/{symbol}` Render 직접 진입은 404이고, 위 미체크 공개 출시 조건은 그대로 유효하다.

2026-09-28 후속 변경: 운영자 요청으로 `0.9.4`는 홈 선정 종목과 기존 PICK 기록을 복원하고 화면명을 `최근 주목받는 종목`으로 변경했다. 동일한 선정·추천 성과 데이터이므로 기존 조회형 허용 답변으로 출시 가능하다고 해석하지 않는다. 이 화면의 추가 정책 확인 전에는 공개 Toss 심사를 요청하지 않는다.

## Release rule

Do not submit the public release until every blocking item above is checked. The web preview is a validation surface; the final release decision is based on the Apps in Toss `.ait` bundle running inside the Toss app runtime.

2026-10-04 재심사 보완: Apps in Toss 20260927-6 반려 사유인 “투자 권유가 아님/참고용임을 명확하게 인지할 수 있는 면책 문구”에 대응해 Toss 런타임 첫 콘텐츠 행에 즉시 보이는 면책을 추가하고, 전역 데이터 안내와 정보 화면의 문구를 강화했다. 이 보완은 면책 가시성 대응이며, 위의 `최근 주목받는 종목`/PICK/IDEA LAB 추천성 범위 확인 항목을 승인된 것으로 간주하지 않는다.
