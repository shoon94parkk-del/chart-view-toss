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
- The Toss Home daily heatmap and selected-stock section fail independently and must not delay or blank market/watchlist sections.
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
- 홈 시장/스냅샷/선정 종목 캐시는 첫 페인트용 stale 데이터일 뿐이며, 네트워크 최신값 요청은 계속 수행해 화면을 갱신한다.

- 전체 히트맵 한국 보드의 가시 텍스트에 6자리 숫자 종목코드를 사용하지 않는다. 작은 셀도 기업명/축약명을 우선한다.
- 전체 히트맵 미국 보드는 읽을 수 있는 셀 대부분에 등락률을 유지한다. 작은 셀 최적화 때문에 티커만 남고 등락률이 대거 사라지면 회귀다.

- Home과 전체 히트맵의 중복 종목이 서로 다른 등락률을 표시하면 배포 차단 회귀다. 전체보기의 오래된 API 응답을 장시간 클라이언트 캐시하지 않는다.
- 전체보기 렌더 전 Home snapshot 오버레이를 유지한다. backend full payload가 의도적으로 틀린 값을 반환하는 QA에서도 Home 값이 화면에 보여야 한다.

- 장중 Home 갱신은 사용자별 외부 provider 조회로 되돌리지 않는다. 클라이언트는 `/api/home-live` 공유 캐시만 읽어야 한다.
- Home live polling은 document가 hidden일 때 중지되고 visible 복귀 시 즉시 재개되어야 한다. `setInterval` 기반의 백그라운드 무한 polling은 금지한다.
- Home live 주기는 약 10초이며 방문자별 9~12초 jitter를 사용해 동시 요청 스파이크를 완화한다. heartbeat는 서버가 반환한 `heartbeatSec`(기본 20초)을 따른다.

- Apps in Toss 외부 링크에 `Device.openURL`을 사용하지 않는다. top-level SDK `openURL(url)`만 사용하며 AIT contract가 이를 강제한다.
- 개인정보/이용약관/데이터 안내 링크는 `.ait`의 `location.origin`에 의존하지 않는다. 검토자가 누르는 필수 링크는 공개 HTTPS 절대주소여야 한다.
- 외부 링크 실패를 silent no-op으로 처리하지 않는다. 사용자에게 실패/재시도 피드백을 제공한다.

- 320~360px Home 히트맵의 `is-small` 셀은 티커/축약명 자체보다 등락률을 먼저 생략한다. 작은 셀에서 두 줄을 억지로 유지해 텍스트가 잘리는 상태는 배포 차단 회귀다.

- Home의 작은 미국 셀은 회사명보다 티커를 우선한다. 320px에서 `테슬라` 같은 이름이 셀 폭을 넘어가면 `TSLA`처럼 식별 가능한 짧은 티커로 축약해야 한다.

- Home compact geometry: 320~360px에서 `is-compact` 셀은 보조 등락률 텍스트를 숨기고, 미국 셀의 정규화 폭이 8% 미만인 극소 셀은 라벨 전체를 숨길 수 있다. 색상과 접근성 aria-label은 유지한다.

- `#picks`와 `/picks`는 복원된 `최근 주목받는 종목` 기록 화면으로 진입해야 한다. 홈과 전체 메뉴에서도 같은 명칭을 쓴다. 데이터 산식과 선정 결과는 기존 PICK과 동일하게 유지한다. 이 화면은 추가 정책 확인 전까지 공개 Toss 출시 차단 항목이다.
- PICK 상태의 `매도검토`는 사용자 확인 전 자동 매도/종료로 해석하거나 처리하지 않는다. 가격·차트 변화만으로 매도검토를 확정하지 않는다.

- 경제지표 카드의 미니 차트는 `/api/macro`의 기존 `chart_data`를 사용해야 하며, 별도 네트워크 요청이나 heavyweight 차트 인스턴스를 추가하지 않는다. 320px 모바일에서 가로 오버플로가 없어야 한다.

- 홈 주요시장은 접힌 상태에서 4개 핵심 지수만 렌더링해야 하며, 보조 시장지표(^TNX/^VIX/CL=F/KRW=X)는 사용자가 `더 보기`를 눌렀을 때만 조회·표시한다. 펼침 후 320px 화면에서 가로 오버플로가 없어야 한다.


### Live quote parity guardrail
- Do not restore a separate 15s route-cache-only current price for detail.
- Home/detail/full-heatmap should overlay the newest in-session quote by ticker.
- Detail live refresh must use `fresh=true` and remain one-symbol-only at 5s cadence.
- Returning to Home after viewing detail must preserve the newer detail quote in the Home fast snapshot until the next Home live event supersedes it.

### Heatmap/detail round-trip guardrail
- A heatmap click must preserve the visible company identity in the detail header; raw ticker-only detail is a regression when the heatmap already knows the company name.
- Returning from detail must not remove the viewed heatmap stock. Null/undefined fields from a live quote must never overwrite valid structural fields such as `marketCap`, `name`, or market identity used by the treemap filter/layout.

### Watchlist quote rollback guardrail
- Opening Watchlist must not replace a newer in-session quote with an older API/browser-cache row for the same ticker.
- Home watch cards, dedicated Watchlist cards, Heatmap, and Detail should converge through `liveQuoteStore`; raw response order is never a freshness guarantee.
- Cached Watchlist cards must paint before a delayed batch quote response; the batch request still revalidates in the background and failed refresh retains the dated cached value with a retry action.
- At the same `asOf`, full heatmap rows may not overwrite Home live or direct quote rows. Structural heatmap fields remain separate from quote overlays.
- Valuation's visible price card uses the canonical current quote when one exists; screener closing prices keep their dated historical bases and explicit labels. Historical PICK code stays outside the Toss bundle.
- Home and Watchlist initial routes must not download `lightweight-charts`; chart routes load the shared chart runtime on demand.
- The Render static preview must serve the app HTML at fixed direct-entry paths such as `/chartviewHome`, `/chart`, and `/watch`; the local Vite SPA fallback alone does not prove the deployed paths work.

### Toss release UI data clarity
- Macro freshness must derive from each row's `asOf` date and expected observation cadence; backend `freshCount`/`staleCount` can lag and must not override row-level age.
- Tooltip and macro mini-chart dates should be readable Korean calendar dates; valuation periods and known relation-basis metadata should use Korean labels.
- Detail KRW price includes `원` exactly once and must stay on one line at mobile widths. Presentation changes must preserve canonical quote values and currencies.


### Screener popular preset guardrail
- Popular presets must use filterScreener and the visible form values; do not maintain a hidden second ranking/filter implementation.
- Preset clicks must populate the manual filter fields and update results immediately; reset restores the full universe.
- RSI/volume/MACD/MA/52-week fields are end-of-day screener data. Missing fields must fail closed rather than inventing a match.
- Result reason chips must reflect actual active filter conditions.

### Investment idea LAB guardrail
- `#ideas` is additive; do not replace or reorder the existing Home/bottom-nav structure to expose it.
- Idea generation must use visible screener fields and fail closed when required metrics are missing. Never fabricate a technical match or causal news story.
- Every candidate card must show concrete metric reasons and link to the existing stock-detail route.
- Keep the idea view lazy-loaded so Home, Watchlist, and initial app startup do not download the idea view/CSS until the user opens it.
- Screener trade-date/closing-price semantics remain explicit; idea candidates are research prompts, not live-price recommendations.

### IDEA LAB industry-context guardrail
- Sector strength must be calculated from all same-industry screener rows for the same trade date, not from the small displayed candidate list.
- KRX `mainProducts` must be labeled as major products/services, never as the #1 revenue product unless filing-derived revenue evidence exists.
- Supply-chain peers are adjacency candidates derived from industry/product classification. Never label them as actual customers, suppliers, or contract partners without separate evidence.
- Missing `industry` / `mainProducts` must show a missing/updating state; do not infer a company business description from its name alone.
- Keep this context inside the lazy-loaded IDEA LAB bundle; Home startup remains unchanged.

### Stock detail industry-context guardrail
- Detail price, quote polling and chart must render independently of company/sector/supply-chain data.
- `industryContext.js` and `industryContextView.js` stay dynamically imported from the detail route so Home initial load is not enlarged by this feature.
- If KRX company context is missing (e.g. overseas ticker), remove the optional industry panel instead of showing invented company facts.
- Medical-device companies must not fall into pharma solely because their industry text contains the generic word “의료”.
- Company / sector / supply-chain sections need distinct but restrained visual hierarchy; do not collapse them back into identical gray surfaces.

### DART revenue-mix guardrail
- DART revenue loading must never delay price, chart, valuation, or the base KRX industry context.
- Call DART only for `.KS` / `.KQ` detail tickers; overseas detail must not issue the request.
- Never show ‘매출 1위’ from KRX `mainProducts` alone. It requires a DART-derived `available=true` payload.
- If a report/table is missing or ambiguous, preserve the KRX company card and omit the revenue mix rather than guessing.
- A displayed revenue mix must expose the DART original-report link and report year/basis.

### IDEA LAB expansion / direct-relation guardrail
- Every candidate company/sector/supply-chain panel starts collapsed. Do not restore the `open` attribute by default.
- DART business-report and direct-relationship requests fire only after the user expands a candidate context panel.
- DART/relationship fetch failures must keep the base KRX/sector context usable and must not block the list.
- “확인된 직접 관계” requires evidence-backed API rows. Industry/keyword adjacency stays under “산업상 연관 후보” and must never be relabeled as a confirmed customer/supplier.
- Stock detail and IDEA LAB use the same relationship semantics so the meaning does not change between screens.
