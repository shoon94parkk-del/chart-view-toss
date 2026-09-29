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

## 2026-09-27 — 한국은 기업명, 미국은 티커+등락률 우선
전체 히트맵의 작은 셀에서 한국 6자리 종목코드는 식별성이 낮으므로 표시하지 않는다. 한국은 기업명 또는 짧은 기업명을 사용한다. 미국은 익숙한 티커를 유지하되 작은 셀에서도 공간이 허용되는 한 등락률을 함께 표시하고 등락률 시인성을 티커보다 낮게 두지 않는다.

## 2026-09-27 — 사용자 polling과 provider polling을 분리
Apps in Toss 클라이언트는 시세 공급자를 직접 갱신하지 않는다. visible Home 사용자는 privacy-light activity heartbeat로 서버의 공용 5초 quote worker를 깨우고, 약 10초마다 `/api/home-live` 메모리 스냅샷만 읽는다. hidden/background에서는 두 주기를 멈추며 resume 시 즉시 동기화한다. 방문자별 deterministic jitter로 thundering-herd를 완화한다.

## 2026-09-27 — 외부 링크는 top-level Apps in Toss openURL 계약을 사용
`20260921-5` 심사에서 서비스 이용 외부 링크 미동작으로 반려됐다. Toss runtime에서 `Device.openURL`을 사용하지 않고 SDK의 top-level `openURL(url)`을 단일 외부 링크 경로로 사용한다. 정책 링크는 `.ait` origin과 분리된 공개 HTTPS URL로 고정하고, 실패를 조용히 무시하지 않는다.

## 2026-09-28 — 추천 기록을 PICK 관리로 통합
기존 Toss `#picks` 추천 원장을 새 라우트로 갈아엎지 않고 `PICK 관리`로 확장한다. `/api/home-bootstrap`의 누적 추천 성과와 Web Chart View가 관리하는 `/static/data/pick_monitor.json`의 유지/경계/매도검토/검토대기, 투자논리 기준선, 최근 점검, 검증 근거를 추천 건별로 병합한다. 점검 데이터는 보조 데이터이므로 실패해도 기존 성과 기록은 계속 보여야 하며, 매도검토는 자동 종료가 아니다.

## 2026-09-28 — 홈 주요시장 보조지표는 지연 로딩
원본 Chart View의 8개 시장 구성(KOSPI, KOSDAQ, S&P 500, NASDAQ, 미 10년물, VIX, WTI, 원/달러)을 Toss 홈에도 제공하되 첫 화면 밀도와 로딩시간을 지키기 위해 기본 4개 + 펼침 4개 구조로 구현한다. 보조 4개는 사용자가 펼칠 때만 시세를 요청한다.


## 2026-09-28 — Canonical quote parity across Home, heatmap, and detail
Home live events, Home snapshot rows, detail fresh quotes, and the full heatmap now share one in-session quote store keyed by ticker. Navigating from a Home heatmap cell to detail paints the newest in-session quote immediately instead of falling back to an older route cache. Detail then refreshes only that ticker every 5 seconds through `/api/quotes?...&fresh=true` and writes successful quotes back into the Home fast snapshot. This keeps return navigation and the full heatmap aligned without adding work to Home first paint.

## 2026-09-28 — Heatmap detail round-trip keeps identity and treemap membership
Heatmap cells now hand the resolved company name through app history to the detail view instead of passing only the ticker. Separately, live-quote merging ignores null/undefined fields so a one-symbol detail refresh cannot erase `marketCap`/name metadata and make that stock disappear from the full heatmap after back navigation.

## 2026-09-28 — Watchlist paints canonical session quotes
The Watchlist previously rendered the raw batch `/api/quotes` response, bypassing the canonical in-session quote store used by Home/detail. It now merges every batch into `liveQuoteStore`, paints the newest accepted row per ticker, and persists those canonical rows to the fast watch cache so a stale response cannot move the UI backward.

## 2026-09-28 — Render preview sync is latest-main authoritative
Concurrent push-triggered sync jobs could finish out of order and move `feat/apps-in-toss-mvp` backward to an older commit. The sync workflow is now serialized/cancelable and pushes the freshly fetched `origin/main` ref rather than the triggering job's stale `HEAD`. The Render preview branch must never lag or roll back behind main because of workflow completion order.

## 2026-09-28 — 0.9.2 Toss review polish for dates, freshness, and quote display
Chart tooltips and macro mini-chart endpoints use readable Korean dates; valuation periods and known news relation metadata use Korean labels. Macro freshness is derived from each observation date and its expected cadence, and stale inputs are disclosed in macro and Home summaries even when the backend aggregate count says fresh. KRW detail prices show the unit once and stay on one line. Keep provider quotes, canonical live quote merging, polling cadence, and currencies unchanged.

## 2026-09-28 — Cached-first quote parity and smaller initial bundle
Watchlist and Home watch rows paint the latest known quote immediately and revalidate in the background. Equal-timestamp rows use source priority (detail quote, batch quote, Home live, Home snapshot, full heatmap) so a delayed full heatmap or snapshot cannot roll back a visible current price. The full heatmap paints its saved result without waiting for both API calls, and its structural fields remain intact. Valuation cards use the same current quote when available; PICK history keeps its own recommendation-performance basis and labels the saved price as `점검가`. The chart library loads on chart routes, reducing the initial JS gzip size from about 115 KB to 64 KB. Source observation times stay visible because different trading sessions and adjusted-close chart data are intentionally distinct.

## 2026-09-28 — Render preview direct entry needs exported HTML
The live Render static site returned 404 for `/chartviewHome` even though the Vite local preview and client router accepted it. The production build now exports the same hashed `index.html` under each fixed feature-entry directory, with a post-build check. Arbitrary `/stock/{symbol}` paths still require a host rewrite rule or hash-based link and must be verified separately. The `.ait` bundle is built from the same `dist` and continues to use the client route resolver.

## 2026-09-28 — Toss lookup scope after operator-provided policy reply
The operator shared Apps in Toss's answer to the exact proposed scope: a free lookup-only service can enter; stock recommendations and investment prompts that affect judgment are difficult to admit; no additional conditions were requested for that scope. A “reference only” label does not change what a TOP3 selection or PICK recommendation-performance ledger does. Version `0.9.3` preserves their source modules for later review but blocks their Home/menu/deep-link entry and excludes recommendation requests/content from the Toss bundle. User-driven market filtering, quotes, charts, heatmaps and other factual lookup views stay. Do not claim this answer grants data-provider redistribution rights or guarantees final app approval.

The operator wants the existing selected stocks under the title `오늘 주목받는 종목`. That title is prepared in the dormant source only. Since the selected stocks are unchanged, its Toss exposure remains off pending an explicit scope response to `docs/TOSS_SPOTLIGHT_SCOPE_QUESTION.md`; a title change alone is not an approval.

## 2026-09-28 — Restore selected stocks as `최근 주목받는 종목`
At the operator's explicit follow-up, `0.9.4` restores the previous Home selection and PICK history navigation while retaining the same backend data, metrics, and review detail. Home, menu, and history titles use `최근 주목받는 종목`; `#picks` and `/picks` work again. This reverses the `0.9.3` visibility gate but does not expand Apps in Toss's lookup-only policy answer. Public submission requires an additional answer covering the actual restored feature, including recommendation history and reasoning.


## 2026-09-29 — Screener popular one-tap presets
The market screener exposes horizontal mobile-friendly popular presets that fill the existing filter form rather than creating a second filtering engine. Presets cover volume surge, RSI oversold, strong momentum, 20/60 golden cross, price>20MA>60MA uptrend, 52-week-high proximity, pullback candidate, and MACD bullish. Result rows show the concrete conditions that matched. Manual edits clear the active-preset badge but keep the edited values. All results remain end-of-day technical filters, not recommendations.

## 2026-09-29 — 투자 아이디어 LAB는 기존 화면을 건드리지 않는 실험 탭으로 시작
기존 Home, 시장 스크리너, PICK, 차트, 관심종목의 정보 구조와 데이터 계약은 변경하지 않는다. `#ideas`는 별도 지연 로딩 화면으로 추가하며, 현재 장마감 `screener.json`의 확인 가능한 기술 지표만 조합한다. 첫 버전은 거래량 동반 상승, 상승추세 속 눌림, 52주 고점 근접, 모멘텀 강화, RSI 과매도 관찰 패턴을 제공한다. 각 아이디어에는 실제 후보 수치, 다음 확인 포인트, 반대 신호를 함께 표시하고 종목 클릭은 기존 상세 화면으로 연결한다. 산업/뉴스 인과관계는 근거 데이터가 추가되기 전까지 자동 생성하지 않는다.

## 2026-09-29 — IDEA LAB 회사·섹터·공급망 문맥 확장
IDEA LAB 후보를 기술 신호만 나열하지 않고 KRX KIND의 업종/주요제품과 결합한다. 동일 업종 전체의 상승 종목 비율, 평균 등락, 20/60 상승추세 비율, 거래량 2배 이상 비율을 계산해 ‘이 종목만 강한지 / 업종이 같이 강한지’를 보여준다. 공급망 연결은 KRX 업종·주요제품 키워드로 산업군과 단계를 분류한 ‘인접 공급망 후보’이며 직접 고객·납품 관계로 표시하지 않는다. KRX 주요제품은 실제 매출 1위 품목과 동일하다고 간주하지 않으며, 매출 1위/비중은 공시 데이터 연동 전까지 추정하지 않는다.

## 2026-09-29 — 종목 상세에 산업 문맥 연결 + 시인성 강화
개별 종목 상세에서도 IDEA LAB과 동일한 회사/섹터/공급망 문맥을 제공한다. 가격·차트·핵심지표의 초기 렌더링을 막지 않도록 산업 문맥 모듈은 상세 진입 후 동적 import 및 비동기 데이터 로딩으로 붙인다. 시각적으로는 회사=파랑, 섹터=초록, 공급망=보라 계열의 약한 배경/강조선을 사용해 회색 카드가 연속되는 문제를 줄인다. 의료기기는 바이오·제약에서 별도 산업군으로 분리한다.

## 2026-09-29 — 종목 상세 DART 사업보고서 매출구조 연동
종목 상세의 COMPANY 문맥에 DART 사업보고서 기반 매출 구조를 점진적으로 추가한다. KRX 회사·섹터·공급망은 먼저 렌더링하고, 한국 종목에 한해서만 뒤에서 `/api/business-report`를 호출한다. DART 표에서 명시적 매출액 열을 안전하게 파싱한 경우에만 ‘매출 1위’와 상위 사업/제품 비중을 표시하고, 실패/불확실 시 기존 KRX 정보만 유지한다. 공시 원문 버튼을 함께 제공한다.

## 2026-09-29 — IDEA LAB 기본 접힘 + 지연형 DART/직접관계 조회
IDEA LAB 후보 종목의 회사·섹터·공급망 상세는 기본적으로 접힌 상태로 유지한다. 사용자가 해당 종목의 상세 맥락을 펼칠 때만 DART 사업보고서 매출구조와 직접관계 근거 API를 호출한다. 이를 통해 목록의 스캔 가능성과 초기 로딩을 유지한다. 직접관계는 산업 분류 기반 후보와 UI/의미를 분리하고, 최근 뉴스에서 상장사명과 수주·납품·고객사 등 강한 상업관계 키워드가 함께 확인될 때만 ‘확인된 직접 관계’로 표시한다. 같은 규칙을 개별 종목 상세에도 적용한다.

## 2026-09-29 — 종목 상세와 IDEA LAB의 단계별 로딩 표시
운영 페이지 14개 경로 측정에서 홈·일반 조회는 대체로 1초 안팎이지만 삼성전자 상세 첫 현재가는 3.5초, 역사적 밸류에이션은 2.2초까지 걸렸다. DART API는 빠르게 응답해도 상세의 KRX 문맥은 큰 회사정보·스크리너 파일을 기다릴 수 있다. 상세에서 스크리너 행에 업종·주요제품이 있으면 그 데이터로 문맥을 만들고 별도 500KB 회사정보 파일은 누락 종목에만 요청한다. 상세 현재가와 회사·산업 맥락에 읽을 수 있는 로딩 문구를 붙이고, KRX 문맥이 먼저 준비되면 DART/직접관계의 진행·실패·자료없음 상태를 각각 표시한다. IDEA LAB은 두 요청을 펼침 시에만 시작하되, 먼저 도착한 DART 또는 직접관계 결과를 즉시 보여준다. 근거 없는 관계나 매출 순위는 계속 숨긴다. Render 첫 접속의 간헐적 긴 TTFB는 클라이언트 표시 이전 단계이므로 별도 호스팅 과제로 남긴다.

## 2026-09-29 — 비주요 종목 DART 첫 조회 제한시간
운영에서 셀바스헬스케어 사업보고서의 첫 수집은 약 23초, 메모리 캐시 재조회는 약 0.3초였다. 기존 Toss DART 요청의 10초 제한은 첫 수집이 완료되기 전에 오류를 만들었다. DART 요청만 45초로 늘리고 처음 조회 시 공시 확인에 시간이 걸릴 수 있다는 로딩 문구를 표시한다. 다른 API의 시간 제한과 독립적 렌더링은 유지한다. 서버는 검증된 결과를 Render Key Value에도 저장해 재배포 후 비주요 종목 조회가 캐시에서 복원되는 것을 확인했다.

## 2026-09-29 — 종목명·관심 하트·홈 검색 흐름
티커 URL로 종목 상세를 직접 열 때 이름이 전달되지 않아 `066570.KS`가 제목과 회사명에 중복 표시되었다. 저장된 이름·이동 경로의 이름을 먼저 사용하고 없으면 정확한 티커로 검색 API를 조회해 제목과 로고를 갱신한다. 기존 관심 목록에 티커를 이름으로 저장한 경우도 정상 회사명으로 복구한다. 상세의 상단 하트와 본문 버튼은 같은 관심 상태를 바로 변경하며 등록 시 빨간 채움 하트와 접근성 상태를 보여준다. 기존 상세 데이터를 다시 불러오지 않고 상태만 갱신한다. 홈의 `종목 검색`은 비교 차트로 보내던 연결을 제거하고 검색 결과 선택 시 해당 종목 상세를 연다. 비교 종목 선택 흐름은 별도로 유지한다.
## 2026-09-29 — Visible loading and share preview
- Every initially empty data area now names the pending data and shows a visible spinner; chart and detail graph overlays clear on success, empty data, and failure. Existing source-specific DART progress/failure states remain separate.
- The shell shares the current route from web and Apps in Toss runtime. Share URLs use the shared backend's crawler-readable `/share/toss/{tab}` entry, with exact detail ticker in the query. AIT's hidden web topbar is compensated by an in-content share action.
- Browser sharing uses the native share sheet when available and copies the same link otherwise. The Toss static shell also includes a generic social card for manually copied URLs.

## 2026-09-29 — 투자 도구와 분석 메뉴 아이콘
기존 Chart View의 투자 도구 12개 링크를 Toss 분석 도구에 추가한다. 기존 외부 링크 브리지를 그대로 사용하며, 사이트 favicon과 브랜드색 약칭 대체 로고를 함께 제공한다. 분석 메뉴의 히트맵·실적 전망·밸류에이션 추이·투자 도구 아이콘을 서로 구별되게 바꾼다. DART의 사업부문별 매출에 연결조정이 있으면 비중 합계가 100%를 넘는 이유를 공시 카드에 밝힌다.
KRX와 네이버 금융의 favicon 제공처가 공통 지구본을 반환하는 것을 운영 화면에서 확인해, 두 카드에는 각각 KRX와 N 글자 로고를 고정한다.
종목명 검색 API가 일시 실패해도 상세의 스크리너 행에 공식 회사명이 있으면 제목과 관심 버튼에 그 이름을 적용한다.
## 2026-09-29 — 종목 재무 흐름, 관련 비교군, 화면 이동 연결

종목 상세에서 DART 재무제표의 연간 매출액·영업이익과 최신 분기·반기 누적 비교를 독립적으로 로딩한다. 원문 링크, 연결/별도 기준, 반올림 및 비교 기간을 표시하고 자료가 없으면 빈 수치를 만들지 않는다. 섹터의 당일 등락 지표는 기존 KRX 업종 단독 분류에서 KRX 주요제품·산업 단계가 확인된 비교군으로 좁힌다. 삼성전자·SK하이닉스는 KRX 업종이 달라도 메모리 반도체 제조 비교군에 넣고, 표본이 3개 미만이면 강약 판단을 유보한다. 기준 거래일이 다른 행도 제외한다. 회사명만으로 사업을 분류하지 않으며 동성화인텍의 초저온 보냉재는 조선·LNG 기자재로 분류한다. 상세 하단 메뉴는 진입한 메뉴를 유지하고, 전체 화면의 중복 제목을 정리한다. 화면 버전은 package.json을 단일 기준으로 사용한다.
## 2026-09-29 — 5거래일 섹터 흐름, 거래대금, 관계 근거, 관심 선택

종목 상세와 IDEA LAB의 비교군 상승 비율·평균 등락·강세 종목은 스크리너의 `ret5`(최근 5거래일 종가 대비)를 사용한다. 당일 거래량과 20·60일 추세는 기간을 별도 표기한다. 수익률이 없는 종목은 분모에서 제외하고 확인 종목 수를 표시한다. 거래대금이 작은 후보를 피하려 투자 아이디어 LAB은 20일 평균 거래대금 10억원 미만 또는 값이 없는 종목을 제외한다. 검색·비교 종목 선택창은 기기 관심종목을 먼저 보여주고 검색 결과에서도 앞에 배치한다. 공급망 UI는 KRX 제품 분류 후보와 기사에서 확인한 계약·납품 단서를 구분하며, LNG 보냉재는 넓은 선박 기자재 비교군에서 분리한다.
