# Chart View Toss regression guardrails

Last updated: 2026-09-22

## Repository boundaries
- Toss UI/SDK changes stay in this repo.
- Web Chart View UI is not silently ported/replaced from here.
- Shared backend changes must be additive/compatible unless explicitly coordinated.

## Navigation/runtime
- Native navigation bar must not be duplicated inside Apps in Toss.
- Back from a subpage returns within the mini-app; root back preserves platform exit behavior.
- Deep links for major features remain functional.
- Scroll restoration must not create stale-page navigation races.
- Safe-area support remains on mobile devices.

## Data/loading
- API timeout/retry/offline states remain visible and recoverable.
- Late/stale responses cannot overwrite a newer route/selection.
- Partial failures do not blank unrelated valid sections.
- Home TOP3 and daily heatmap fail independently and must not delay or blank the existing market/watchlist sections.
- Chart comparison basis remains explicit: local currency, adjusted-close where applicable, no interpolation.
- Macro source/unit/observation/change basis remain visible.
- News direct vs industry/indirect relation remains distinguishable.

## Storage
- Watchlist and selected tickers remain device-local unless an intentional sync feature is added.
- Toss storage keys remain isolated from the normal Web app.
- Reset/delete flows must not leave hidden stale state.

## Release
- Node 24 / SDK 3.5.0 compatibility is preserved until intentionally upgraded.
- `npm test` and AIT contract checks must pass.
- Web preview success is not public-release approval.
- Android and iOS real-device Sandbox/QR checks remain mandatory release gates.
- Backend production contract points to `https://chart-view-pkv8.onrender.com` unless deliberately migrated.


- 홈/전체 히트맵은 동일한 `/api/home-snapshot` payload와 공용 렌더러를 사용해야 한다. 레거시 정적 섹터 payload로 되돌아가 한국 종목·로고·업데이트 시각이 사라지면 회귀로 본다.

- 히트맵은 1차원 가로 스트립으로 축소하면 안 된다. 한국/미국 보드 각각에서 셀이 2차원으로 분할되고, 오른쪽·아래쪽 빈 영역 없이 컨테이너를 채워야 한다.
- 히트맵 상승/하락/보합 셀은 실제 배경색을 가져야 하며 투명 셀은 회귀로 본다.

- 전체 히트맵은 홈 대표 18종목과 동일한 개수로 퇴행하면 안 된다. 모바일 QA에서 전체보기 확장 데이터가 홈보다 많고 한국/미국 종목 수 표기가 존재하는지 확인한다.

- 전체 히트맵의 작은 셀은 8px를 넘는 라벨을 사용하지 않는다. 극소 셀은 라벨을 숨길 수 있으며, 큰 티커가 셀 경계를 덮는 상태는 배포 차단 회귀다.
- 홈 루트는 Apps in Toss 저장소 초기화를 기다린 뒤 처음 그리는 구조로 되돌리지 않는다. 홈의 비개인화 영역은 먼저 렌더되어야 한다.
- 홈 시장/스냅샷/종목발굴 캐시는 첫 페인트용 stale 데이터일 뿐이며, 네트워크 최신값 요청은 계속 수행해 화면을 갱신한다.

- 전체 히트맵 한국 보드의 가시 텍스트에 6자리 숫자 종목코드를 사용하지 않는다. 작은 셀도 기업명/축약명을 우선한다.
- 전체 히트맵 미국 보드는 읽을 수 있는 셀 대부분에 등락률을 유지한다. 작은 셀 최적화 때문에 티커만 남고 등락률이 대거 사라지면 회귀다.
