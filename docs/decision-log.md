# Chart View Toss decision log

Append-only high-risk decisions.

## 2026-09-22 — Durable project memory
Added repository-level agent rules, project memory, regression guardrails, and this decision log so later UI/release work does not undo validated Toss behavior.

## 2026-09-21 — Separate Toss client, shared backend
The Toss client remains a separate repository and reuses the Chart View FastAPI backend. Toss-specific UX/SDK/lifecycle changes stay isolated; backend API extensions should be additive.

## 2026-09-21 — Apps in Toss runtime owns native navigation
Inside Apps in Toss, duplicate custom top chrome is hidden and the native navigation bar is used. Subpage back events are handled in-app while root exit remains the platform behavior.

## 2026-09-21 — Reliability before visual completeness
Added bounded request timeout/retry/offline handling, stale-response protection, partial-failure/progressive rendering, and release QA before treating feature parity as ready.

## 2026-09-21 — Data semantics remain explicit
Comparison, valuation, macro, news, and stock-detail surfaces expose calculation basis, observation/source metadata, and distinguish day change from selected-period return.

## 2026-09-21 — Release is gated by real devices
Render/Vite preview and automated Chromium tests are validation surfaces only. Public Apps in Toss release still requires Android/iOS Sandbox/QR verification plus provider-policy review.

## 2026-09-24 — Reuse Chart View discovery assets on Toss Home
The Toss Home now reuses the shared backend's latest screener-selected TOP3 and the same major-stock daily-change heatmap data used by Web Chart View. They are isolated in a home-only module, load progressively, and fail independently so existing Home content remains usable.

## 2026-09-24 — Inline heatmap marks without image requests
Recognizable medium/large heatmap cells use a curated set of compact SVG marks bundled into the Toss JavaScript, while unsupported companies use short text badges and small cells remain text-only. This deliberately avoids external logo APIs and separate image fetches on Home.


## 2026-09-24 — Heatmap content adapts to cell geometry
Provider legal names are no longer allowed to overflow Toss Home heatmap cells. Known symbols prefer curated display names; cramped cells suppress logos and use compact labels, while larger cells retain the bundled company mark. The Home discovery heading is "오늘의 종목발굴" while still showing the latest three selections.


## 2026-09-24 — Dense heatmap and recommendation performance parity
Toss Home reuses recommendation performance already returned by `/api/home-bootstrap` instead of discarding it. The discovery card shows average evaluated return, positive-return ratio, and evaluation coverage. Heatmap marks move to compact top-left overlays and the surrounding chrome is tightened so logo recognition improves without reducing text space or adding network requests.


## 2026-09-24 — Separate recommendation history from the market screener
The Home discovery action now opens a dedicated `#picks` recommendation ledger rather than the neutral market screener. The ledger mirrors the useful fields from Web Chart View (recommendation date/price, current price/return, best return, score, reason) while staying mobile-first. The market screener remains independently reachable from All.

## 2026-09-24 — Heatmap logos must participate in layout
Heatmap logos are no longer absolutely overlaid on company names. Supported logos render inline beside the company label only when geometry permits; cramped cells remain text-only. This prevents identity marks from obscuring the data they are meant to clarify.


## 2026-09-26 — 전체 히트맵은 홈 히트맵을 단일 기준으로 사용

전체 히트맵 라우트는 더 이상 오래된 `static/data/heatmap.json` 섹터 데이터를 읽지 않는다. 홈과 동일한 `/api/home-snapshot` 응답과 공용 `home-heatmap` 렌더러를 사용해 한국·미국 대표 종목, 업데이트 시각, 로고, 등락 값, 레이아웃이 두 화면에서 갈라지지 않도록 한다.

## 2026-09-26 — 공용 히트맵은 2차원 면적 충전과 색상 계약을 테스트로 고정
홈과 전체 히트맵은 동일한 2차원 treemap 렌더러를 사용한다. 각 셀은 left/top/width/height를 모두 가져야 하고, 두 시장 보드는 아래·오른쪽 빈 영역 없이 채워져야 한다. 등락 색상은 기존 home-hm-up-1~3 / down-1~3 / flat CSS 계약을 유지하며, 모바일 QA에서 실제 geometry와 computed background를 검증한다.

## 2026-09-26 — 홈 요약과 전체 히트맵의 역할을 분리
홈 히트맵은 초기 속도와 가독성을 위해 18개 대표 종목을 유지한다. 전체보기는 별도 캐시 API를 사용해 한국 주요 20종목과 미국 시총 상위 40종목을 표시한다. 전체보기는 홈보다 종목 수가 반드시 많아야 하며, 홈 API 호출 수를 증가시키지 않는다.

## 2026-09-27 — 전체 히트맵 라벨 밀도와 홈 초기 표시를 분리 최적화
전체 히트맵의 텍스트 밀도는 셀 면적과 최소 폭/높이에 따라 단계적으로 줄이며, 극소 셀은 색상만 보여도 된다. 홈은 정확한 최신 데이터 요청을 유지하되 이전 성공 데이터로 첫 페인트를 즉시 수행하고 최신값은 뒤에서 교체한다. 최초 방문은 API 연결을 JS 모듈 로딩과 병렬화하며, Apps in Toss에서는 native storage 초기화가 홈 shell 표시를 막지 않게 한다.
