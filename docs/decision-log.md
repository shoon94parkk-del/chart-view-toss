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

직접 관계 API가 시간 초과 또는 제공처 실패를 반환하면 ‘자료를 찾지 못함’과 구분해 지연 상태를 알린다. 정상 조회 후 확인 가능한 근거가 없을 때만 ‘최근 기사에서 단서를 찾지 못함’을 표시한다.

관계 API의 서버 제한시간은 9초지만 Render 연결 지연이 추가되어 첫 운영 요청이 12초 클라이언트 제한을 넘을 수 있었다. 관계 카드만 18초로 늘려 서버의 `provider_timeout` 상태를 화면에 전달한다. 카드의 비동기 조회는 재무·차트 렌더링을 막지 않는다.

## 2026-09-29 — Task-first mobile UX pass

Home places the device-local watchlist directly after search and before the market cards. Market, spotlight, and heatmap data sources and request timing stay independent. The chart and detail period controls keep the last valid chart visible while a new period loads; a failed refresh labels the displayed result as the previous one and offers retry. Detail uses in-page jump controls without changing the hash route or native back behavior. The duplicate topbar heart is removed so the visible in-card interest button is the single action in web preview and AIT. IDEA LAB collapses its methodology and surfaces the first screened candidate earlier. More groups existing routes by finding, comparing, and checking evidence. Touch targets and reading scale are adjusted without changing the dense heatmap's geometry-specific labels. Browser validation covers responsive widths and state transitions; Android/iOS Sandbox remains the release gate.


## 2026-09-30 — 차트 선택 요약에 종목명 + 티커 유지

차트의 상단 선택 요약은 더 이상 저장된 티커만 나열하지 않는다. 종목 선택창에서 확인한 정확한 종목명을 차트 상태로 전달하고, 비교 API 응답의 종목명으로 한 번 더 보강해 `Micron Technology (MU)`, `글로벌텍스프리 (204620.KQ)`처럼 종목명과 티커를 함께 표시한다. 이름을 확인하지 못한 경우에만 기존처럼 티커를 표시한다. 차트 데이터, 기간 전환, 선택창 UI, 밸류에이션 화면, 스타일은 변경하지 않는다.


## 2026-09-30 — URL 미리보기는 공식 홍보 이미지를 사용

웹 URL과 공유 링크의 Open Graph/Twitter 미리보기 이미지는 기존의 별도 소셜 카드 대신 `public/marketing/chartview-toss-instagram-20260930.png`를 단일 홍보 자산으로 사용한다. 링크를 카카오톡·SNS·메신저에 붙였을 때 DART 공시 기반, 한국·미국 주식 비교, 히트맵·스크리너라는 핵심 메시지가 동일하게 노출되도록 한다.


## 2026-09-30 — 공유 URL 버전으로 소셜 캐시 갱신

카카오톡 등 메신저가 동일한 공유 URL의 Open Graph 메타데이터를 오래 캐시할 수 있으므로 앱에서 생성하는 공유 링크에 `v=promo-20260930-v1` 버전을 붙인다. 목적은 미리보기 캐시 갱신뿐이며 실제 목적지·화면 라우팅·데이터 계약은 변경하지 않는다.


## 2026-09-30 — 모든 공유 링크는 차트뷰 토스 도메인을 기준으로 사용

사용자에게 노출되는 공유 URL은 백엔드 `chart-view-pkv8.onrender.com/share/toss`를 사용하지 않고 서비스 본주소 `https://chart-view-toss.onrender.com`을 기준으로 생성한다. 홈은 본주소, 기능 화면은 동일 도메인의 hash deep link, 종목 상세는 `#detail/{ticker}`를 사용한다. Open Graph 미리보기는 루트 HTML의 공식 홍보 이미지를 공통으로 사용하며, `v=promo-20260930-v2` 쿼리는 메신저 미리보기 캐시 갱신 용도다. API 데이터 주소는 기존 백엔드를 그대로 유지한다.


## 2026-09-30 — 브라우저 파비콘과 홈 화면 아이콘

저장소에는 `chartview-logo.svg`와 `chartview-logo-600.png`가 있었지만 `index.html`에서 favicon·apple-touch-icon·web manifest로 연결하지 않아 브라우저 탭/즐겨찾기/홈 화면에서 기본 아이콘이 보였다. 기존 로고 자산을 그대로 연결하고 `site.webmanifest`를 추가한다. 서비스 UI와 데이터 로직은 변경하지 않는다.


## 2026-09-30 — 공식 로고를 앱 내부 브랜드 마크와 통일

홍보용으로 새로 생성한 글로시 아이콘은 실제 차트뷰 토스 UI 로고와 달라 사용하지 않는다. 공식 로고는 앱 상단의 `.brand-mark`와 동일한 자산으로 고정한다: `#3182f6 → #6aa8ff` 블루 그라데이션의 둥근 사각형과, `spark` 아이콘의 단순한 흰색 상승선/화살표. favicon, 홈 화면 아이콘, GitHub, 향후 홍보물은 이 형태를 기준으로 통일한다.
## 2026-09-30 — Local research-card prototype

종목 상세에 종목별 카드 하나를 추가한다. 사용자가 질문, 확인한 내용, 반대 단서·더 확인할 점, 다시 볼 날짜를 작성하고 저장·수정·삭제할 수 있다. 날짜는 메모이며 알림을 보내지 않는다. 카드 모듈은 상세에서 지연 로딩하고 시장/DART 조회와 독립적으로 열린다. 자료 확인 버튼은 상세의 기존 공시·산업·뉴스 영역으로 연결한다.

질문과 메모는 기기에만 저장하며 서버/LLM으로 전송하지 않는다. 기존 Toss 익명 사용자 분리와 데이터 초기화에 RESEARCH_KEY를 포함한다. 웹 체험은 브라우저 저장소를 사용한다. 로컬 전용 Vite 프록시는 기존 API를 조회하며 운영 배포 설정과 백엔드는 변경하지 않는다. 89개 테스트, 빌드, 320/390/430px 카드 QA와 실제 DART 연결 확인을 통과했다. 배포와 AIT 기기 검증은 수행하지 않았다. 실행법과 검증 범위는 docs/research-card-prototype.md에 기록한다.

## 2026-09-30 — Single question report comparison

사용자 체험 피드백에 따라 네 개 메모 입력란을 질문 입력창 하나로 교체한다. 넓은 질문은 최근 매출·영업이익·이익률과 전년 같은 기간의 수치를 비교하며, 질문의 기업명과 키워드로 비교 기업 하나와 항목 순서를 선택한다. 자유 질문을 이해하는 LLM 답변으로 표시하지 않는다. 생산량 인과관계·예측·가격 판단은 공시 비교의 확인 범위 밖임을 결과에 밝힌다.

기업 간 비교는 같은 누적 분기 또는 공통 연간 기간, 같은 연결/별도 기준과 통화만 허용한다. 이전 값이 0/적자이거나 자료가 없으면 증감률을 만들지 않는다. 공시 원문과 계산 기준을 표시하고 실패 시 질문을 유지하며 재시도한다. 질문 원문은 서버에 보내지 않고 종목 코드만 기존 API로 조회한다. 기존 저장 질문과 메모는 보존한다. 94개 테스트와 빌드, 모바일 320/390/430px QA가 통과했다. 로컬 삼성전자 실제 공시 비교 결과를 확인했으며 배포하지 않는다.

## 2026-09-30 — Overlapping company names and growth-rate comparison

실제 스크리너에 상장사 ‘이닉스’가 있어 ‘하이닉스’ 별칭의 일부까지 회사명으로 인식했다. 최소 목업에 이닉스가 없어 이전 QA에서 발견되지 않았다. 이제 같은 텍스트 범위에서 가장 긴 회사명·별칭만 채택하며, 현재 종목 이름도 범위를 보호한다. 질문의 다른 위치에서 별도로 명시한 회사는 유지한다. 실제 여러 회사가 요청되면 회사를 선택하도록 표시하고 단일 회사 실적으로 조용히 대체하지 않는다.

‘증가율·성장률·증감률’ 질문은 매출 증가율과 영업이익 증가율을 먼저 표시한다. 두 회사의 유효한 증가율 차이는 퍼센트 포인트로 설명하고 비교 대상의 종목명·코드를 결과에 표시한다. 자료가 없는 증가율은 차이를 계산하지 않는다. 사용자 질문 원문으로 실제 삼성전자·SK하이닉스 비교를 확인했고, 이닉스 포함 회귀 검사·97개 테스트·빌드·320/390/430px QA를 통과했다. 로컬 체험만 갱신하며 배포하지 않는다.

## 2026-09-30 — Explicit DART scope and usable question examples

질문 기능의 이름을 ‘DART 공시 비교’로 바꾸고 입력 전에 지원 항목을 매출액·영업이익·영업이익률·전년 대비 증가율로 명시한다. 모든 DART 항목이나 미래 전망을 처리하는 것처럼 안내하지 않는다. 전망·목표주가·주가 상승 원인 등 예측·원인 해석은 지원하지 않으며, 확인 가능한 공시 수치만 조회·계산한다고 표시한다.

최근 실적, 전년 대비 증가율, 다른 회사와 증가율 비교 예시 버튼을 제공한다. 예시 클릭은 질문 입력만 채우고 자동 조회·저장하지 않는다. 이전 결과는 지워 질문과 결과의 불일치를 방지한다. SK하이닉스 상세에서는 삼성전자 비교 예시를 제공한다. 기존 보고서 계산과 저장값은 유지하고 로컬 체험에 반영한다.

## 2026-10-01 — DART comparison deployment authorization

The user authorized publishing the reviewed local DART comparison to the existing GitHub/Render website. Integrate the latest main branch before publishing so updated stock names, official icons and share URLs remain intact. Target only chart-view-toss in the Chart View workspace; its feat/apps-in-toss-mvp branch is synchronized from main by the existing workflow. Confirm the deployed commit and live-origin Samsung/SK hynix comparison before reporting completion. This authorization does not submit a new Apps in Toss app version.

Live-origin verification exposed an example-submit hint persisting below completed results. Reset this hint when analysis starts and cover it in local/mobile and live-origin QA.


## 2026-10-01 — PICK 단기 기술 경고를 펀더멘털 상태와 분리 표시

PICK 관리 화면은 shared backend의 `pick_monitor.json`에 추가된 advisory technical 필드를 읽어 `TECH_SELL_REVIEW`, `TECH_CAUTION`, `TECH_IMPROVING`을 별도 배지로 표시한다. `TECH_SELL_REVIEW`은 “🔴 단기 매도 검토”이며 기술점수 하락과 RSI 과열·최근 급등이 겹친 보조 타이밍 신호다. 기존 `SELL_REVIEW`는 추천 이후 펀더멘털 훼손 근거에만 사용하는 상태로 유지하며, 기술 신호만으로 자동 매도/EXIT를 만들지 않는다.

PICK 목록 상단에는 빨간 단기 경고 종목 수를 노출하고, 각 카드에는 기술 배지를 추가한다. 상세 펼침에는 전일 기술점수→오늘 점수, 일간 변화, RSI14, 5일·20일·당일 수익률과 경고 이유를 표시한다. 정렬에는 “단기 경고 우선”을 추가한다.

## 2026-10-01 — 실적의 질·확인할 변화·투자 대안 비교
국내 종목 상세에 DART optional quality 계정 기반 순이익, 영업현금흐름, 현금/순이익, 부채비율과 재고/채권/재무상태 원자료를 추가했다. 잔액은 전년 말, 손익과 현금흐름은 전년 같은 누적 기간 비교다. 구현한 조건의 변화와 계정 출처만 표시하고 투자 점수·원인·미래 예측을 만들지 않는다. 반기 재고 증가율을 전년 동기 매출 증가율과 비교하지 않는다.
기존 한 칸 질문 입력을 현금흐름/재무상태/실적의 질로 확장했다. 관심종목 우선 선택과 사업 분류상 후보를 제공하며 선택만으로 분석하거나 저장하지 않는다. 회사 전체 공시 비교로 사업 구성 차이를 명시한다. 가격 지표는 요청 시 따로 조회하며 DART 표와 구분해 항목별 제공처/기간/조회시각, 결측값/독립 재시도를 표시한다.
Shared backend financial-history v2를 함께 확장했다. 추가 계정은 기존 전체 재무제표 응답에서 읽으므로 회사당 DART 요청 수는 늘지 않는다. 주요 종목 정적 캐시·Redis·메모리 캐시를 재사용한다.

Deployment reconciliation: the previously live Render branch contained PICK commits 98b7892 and 3c8d9e7 outside main. Merge them into main so the financial-quality release preserves the existing single combined traffic light and matching filter/order behavior. Do not deploy a branch that loses these fixes.

## 2026-10-01 - Whole-site experience audit corrections
Implemented the 12 reviewed points: explicit question/selected-peer conflict resolution; unsupported metrics and forecasts stop without a substitute answer; DART segment shares show verified denominator and consolidation adjustment, or an explicit unverified state; screener filters/paging/focus survive detail/back; detail news retains its stock; shares restore selected companies/periods/filters/peer without private notes; home summary has loading/empty/error/retry states; quote observation/lookup and screener close are separately labeled; financial facts precede a compact DART comparison with collapsed help/peer options; stock names/provider periods/sources/amounts are standardized; helper contrast, macro targets and aria-current are improved; PICK automatic execution and pending evidence review have separate labels.
A browser regression reproduced screener click loss on input blur: an unchanged change event repainted the clicked row. Skip duplicate filter changes and persist preset clearing. Keep unsaved question/cleared peer during navigation; saved device notes are untouched. Shared payloads are bounded, symbol/date validated and escaped. Existing financial arithmetic, favorite storage and advisory PICK status semantics are retained.
Validation commands: npm run build; node tests/experience_audit_qa.mjs; node tests/research_card_qa.mjs; node tests/analysis_qa.mjs; node tests/loading_share_qa.mjs; node tests/financial_flow_qa.mjs. Browser artifacts: output/playwright/experience-audit and research-card. Deploy existing website only; no new Apps in Toss submission.
## 2026-10-01 — Selection and navigation usability, 0.9.8

The user requested another round of discomfort fixes. Improve the existing search/selection flow with clear/retry controls, keyboard modal containment, focus and scroll continuity, readable mobile input and explicit chip removal. Market cards now distinguish pending from settled missing observations; retries keep valid dated data and bypass empty response caches. Primary live refresh preserves optional observations. Browser forward/back uses visit-scoped history indices so app back returns to the actual prior feature. Preserve existing native-root exit, public URLs, DART calculations, local storage and PICK semantics. Deploy the existing Render website only.

## 2026-10-02 · 0.10.0 공시 검토와 지수 상세
- 사용자 승인: 시세 카드 축소, 홈 지수 직접 차트, 8분기/TTM → 새 공시 변화 → 투자 근거 추적 구현 및 기존 Render 사이트 반영.
- 시세 가격/전일 등락을 한 행에 표시하고 관측시각·출처·스크리너 종가는 펼침 영역에 보존한다. 5초 시세 갱신은 펼침·포커스를 유지한다.
- 홈 네 지수는 detail route에서 기존 chart point의 실제 price를 표시한다. 선택 비교 종목은 바꾸지 않으며 기업용 DART·산업·밸류에이션 요청을 하지 않는다.
- /api/financial-quarters는 독립 로딩/재시도/캐시 갱신이다. 최신 8분기, 각 3개월 값, 연속 네 분기 TTM, Q4 차감 원문을 표시한다. 이미 표시한 자료를 유지하면서 갱신을 polling한다.
- REVIEW_KEY는 native account scoped 기기 저장소이며 reset 대상이다. 확인 완료는 명시적이다. 저장 조건은 기존 공시 비교 결과에서 최대 3개 선택한다. 개인 snapshot/조건은 공개 공유에 포함하지 않는다.
- 새 기간은 전년 동기/전년 말 비교, 정정은 같은 기간에만 비교한다. 이전 비교값 정정도 감지한다. 과거 receipt·기간·다른 통화/재무제표는 정상 확인으로 쓰지 않는다.
- QA: 새 기능 320/390/430px, 순수 계산/저장 격리 테스트, 기존 financial/mobile/research 회귀 검증. exact release proof는 artifacts 및 운영 asset/revision/browser 확인으로 남긴다.

## 2026-10-02 Sector heatmaps and performance audit
0.10.1 adds separate KR/US sector boards below Home and full stock heatmaps. Home sector JS/CSS and full quotes are requested only on viewport approach; full screen reuses its canonical payload/client cache. Tiles show covered-company cap-weighted daily change, date/count/share and expandable member links. Missing/zero cap, stale, unknown classification and other-session rows are excluded and disclosed. Refresh/retry preserves selected market/sector and valid dated data. Backend full quote budget remains 20 KR / 40 US, with one representative of each available US sector. This is not a full-market official sector index. Existing weekly company peer breadth remains unchanged.
Audit: measured all 17 principal route journeys at 390px on the live site, including separate KR/US/index detail. Found an unnecessary KR screener download on US quote/industry detail and removed both paths. IDEA LAB calculated industry context for every matched candidate before ranking; rank first and build/cache context only for displayed winners. Checked-in screener benchmark: 6505ms to 186ms, deep equality of the complete outputs (cards, rankings, context, calculations and reasons). Main sector/industry JS is split into dynamic chunks, preserving the first Home paint. Added sector aggregation metadata tests, bounded classification-work regression and 320/390/430px loading/error/cache/member/navigation QA. Final live timings and screenshots are recorded in docs/SECTOR_PERFORMANCE_AUDIT_2026-10-02.md after deploy.

Independent review caught two new Home sector cache paths: old Home quotes overwrote a newer full observation, and HTTP200 empty-refresh erased valid results. Fixed with shared heatmapAlignment freshness ordering and nonempty replacement; browser fixture now uses previous-day Home -8% versus new full +1%, and tests empty refresh while expanded. Independent review also compared 30 fixtures and confirmed IDEA optimization output equality.

## 2026-10-02 Final production loading audit fixes
- Null/empty/failed detail quote replies render an explicit unavailable state with a working retry instead of throwing on priceBasis and leaving a skeleton. Regression covers empty 200, HTTP 503, timeout and recovery.
- Locally saved investment conditions mount immediately on re-entry. Their saved baseline and peer name stay visible during current/peer filing lookup. API failure renders 확인 불가 while preserving saved records and retry; no conditions are hidden by available:false.
- Whole-site measurement includes external CDN JSON filenames as well as backend API/static requests. Warm one-pass samples are separate from provider delay and cold-start evidence.
- Mobile review regression includes held DART response, 503 and retry, in addition to filing corrections/new periods and typed condition persistence.

Independent chunk-failure review: a failed optional report-review module must not hide a successful financial-history response. Preserve its own explicit error and device-record notice, with a fresh-page recovery button. Mobile regression blocks this chunk, verifies financial data still renders, then reloads and verifies saved-condition recovery.

Live index journey follow-up: Home's market payload and stock heatmap cache were separate, so index detail unnecessarily waited for a fresh quote despite a visible dated Home index quote. Reuse both device cache sources through detailCachedQuote without changing source timestamps or comparison selection. Unit regression checks dated index re-entry and missing prices.

- 2026-10-02: Resolve Home and detail index quotes through the timestamp-guarded live store before rendering. A newer Home observation replaces an older detail observation; older device cache cannot roll back current prices. Both directions have regressions.

- 2026-10-02: Active-server audit found 2.1MB screener transfers taking 11.1s. Verified existing public GitHub raw snapshot CORS=* and matching 2504 stocks, tradeDate and updated timestamp (0.96s versus 9.17s API). Enable the existing configurable static-data loader on Render using this data-only source, with its 2.5s failure fallback. GitHub edge max-age is 300s; retain source observation dates. No new service or paid tier. Also preserve KRW units when Korean detail first paints from Home cache.

## 2026-10-02 Whole-site reliability follow-up
Explicit chart retries bypass cached empty/partial HTTP200 results while ordinary period loads retain caching. Partial charts disclose missing selected names and offer an independent retry without inventing returns. Domestic-only DART comparison and industry jumps match actual mounted targets; missing Korean context removes its jump too. Detail news has independent failure/loading/retry distinct from a valid empty response, with ticker fallback if identity search fails. Web external opening keeps noopener/noreferrer but does not misread its deliberate null return as failure. Native URL error handling and HTTPS validation are unchanged. Browser regression reliability_audit_qa.mjs covers 320/390/430px, response recovery, preserved period, complete coverage, supported routes, news-only retry and secure popup without false toast. See RELIABILITY_UX_AUDIT_2026-10-02.md for production evidence.


## 2026-10-02 — 이미 해결한 성능/캐시 문제의 재작업 금지

**관찰된 문제:** 홈↔상세 시세 정합성, 상세 첫 가격 표시, valuation/valuation-band 캐시처럼 과거에 이미 개선했던 영역이 후속 변경으로 다시 느려지거나 깨졌고, 이를 새 문제처럼 다시 최적화하는 작업이 반복됐다.

**결정:** 대화 기억이 아니라 저장소 기록을 우선한다. 성능·시세·캐시·히트맵·valuation·로딩 관련 변경 전에는 `docs/no-repeat-regression-policy.md`를 반드시 확인하고, 작업을 새 기능/새 버그/기존 수정의 회귀 중 하나로 먼저 분류한다. 회귀라면 기존 known-good 계약을 복원하는 것이 우선이며, 같은 문제를 새 구조로 처음부터 다시 구현하지 않는다.

**보호:** `AGENTS.md`가 no-repeat 정책을 최우선 읽기 문서로 지정한다. `docs/regression-guardrails.md`에 현재 quote/heatmap/detail/valuation 성능 계약과 동일 측정 방식 기준값을 기록한다. 반복된 문제는 회귀 테스트를 새로 추가하거나 강화하지 않으면 완료로 보지 않는다.

## 2026-10-02 — 수출 모멘텀 대시보드
- 수출 화면은 Home에 넣지 않고 `전체 > 근거와 시장 환경 확인 > 수출 모멘텀`에서만 진입한다.
- API 키 전 단계에서는 관세청·산업통상부 공식 잠정치 정적 스냅샷을 사용한다.
- 1차 시각화는 1~10일/1~20일/월 전체 누적 수출 막대, 품목별 YoY 발산 막대, 지역별 YoY 막대를 제공한다.
- 프론트 데이터 계약에 optional `history`를 추가해 API 연결 후 최근 12개월 수출액+YoY 복합 차트를 같은 화면에서 자동 노출한다.
- Home/bootstrap/시세 polling에는 수출 데이터 요청을 추가하지 않는다.

## 2026-10-02 — 수출 모멘텀 실 API 전환
- `#exports`는 정적 JSON이 아니라 공용 백엔드 `/api/export-momentum`을 lazy-load한다.
- 총괄 최신 월과 HS 상세 최신 월이 다를 수 있으므로 `itemPeriod` / `regionPeriod`를 화면에 따로 표시한다.
- 품목 상세 기준월과 총괄 기준월이 다르면 반도체 비중을 서로 다른 월끼리 나눠 계산하지 않는다.
- 현재 승인받은 월간 API가 제공하지 않는 10일/20일 checkpoint는 실 API 화면에서 만들지 않는다.

## 2026-10-02 — 수출 그래프 단위 분리와 품목 3축 분해
- 월별 수출액(억달러)과 전년동월비(%)를 같은 무축 그래프에 겹치지 않는다. 모바일에서 각각 별도 차트와 명시적 Y축 단위를 표시한다.
- 품목 카드는 수출액, 물량(관세청 순중량 kg), kg당 신고금액을 나란히 보여주고 각 전년동월비를 함께 표시한다.
- kg당 신고금액은 제품 ASP가 아닌 평균 단위가치임을 카드 아래에서 설명한다.
- 물량/단가 설명은 금액 방향과 함께 해석해 ‘상승 영향 우세/하락 영향 우세’처럼 사실적 문구만 사용한다.

## 2026-10-02 — 수출 확산도·가속도 UI
- 수출 모멘텀 화면에 HS2 전체 확산도 카드와 전년동월 대비 수출금액 증감 기여 상/하위 품목을 추가한다.
- 확산도는 대표 6개 품목이 아니라 백엔드의 전체 HS2 비교 가능 품목을 사용한다.
- 품목 상세에는 수출액·물량·평균 단위가치의 최근 3개월 YoY 평균과 직전 3개월 대비 가속도(pp)를 표시한다.
- 12개월 국면 변화는 물량/단위가치 부호 조합을 색 띠로 보여주며 예측 신호로 표현하지 않는다.

## 2026-10-02 — 수출 메인 이중축과 반도체 HSK 세부
- 월별 총수출 차트는 막대=수출액(왼쪽 Y축, 억달러), 선/점=전년동월비(오른쪽 보조 Y축, %)를 한 그래프에 겹친다.
- 두 Y축의 상단/중간/하단 숫자를 모바일에서도 명시한다. 서로 다른 단위를 숨긴 채 한 축처럼 보이게 하지 않는다.
- 품목 상세의 수출액·순중량·평균 단위가치 12개월 차트에도 실제 Y축 눈금을 각각 표시한다.
- 반도체 상세는 관세청 2026 HSK 기준 DRAM/Flash memory/SRAM/메모리 전체/프로세서·컨트롤러/기타 IC 카드를 제공한다.
- HBM은 독립 HSK가 없어 별도 수출액을 만들지 않으며, Flash memory는 NAND-only가 아님을 화면에서 안내한다.

## 2026-10-02 — 반도체 세부 카드 성능 계약
- DRAM/Flash/SRAM 등 세부 카드는 메인 export snapshot에 함께 캐시된 최신월·전년동월 HSK 계산값을 소비한다.
- 세부 카드 표시를 위해 브라우저가 별도 provider endpoint를 호출하지 않는다.
- 대표 반도체 12개월 금액·물량·단위가치 그래프는 기존 item-detail 분석을 유지하고, 세부 HSK 자체의 12개월 시계열은 현재 표시하지 않는다.

## 2026-10-02 — 반도체 수출 리포트 UI
- 수출 모멘텀의 전체 수출 추이 다음에 ‘반도체 리포트’ 섹션을 둔다.
- 핵심 5개 항목은 메모리 IC, DRAM, Flash memory, MCP, DRAM 모듈이다.
- 각 카드에서 수출액, YoY, MoM, kg당 평균 신고금액, 단위가치 YoY/MoM을 동시에 표시한다.
- 세부 품목 수출액 비교 막대와 YoY/MoM/단위가치 MoM을 함께 보여준다.
- HBM은 독립 HSK가 없고 Flash memory는 NAND-only가 아니라는 설명을 화면에 유지한다.
- 관세청 월간 상세 통계와 TRASS 잠정치는 집계시점/분류가 달라 숫자가 다를 수 있음을 명시한다.

## 2026-10-02 — 반도체 세부 국가 드라이버 UI
- 반도체 12개월 상세이 먼저 렌더된 뒤, 세부 품목×국가 데이터는 별도 lazy request로 로드한다.
- DRAM/Flash/MCP/DRAM 모듈마다 중국·홍콩·베트남·대만·미국·일본 수출액 막대를 표시한다.
- 국가 행에는 해당 품목 총수출 대비 비중, YoY, 전년동월 대비 수출액 증감액을 함께 표시한다.
- 품목 카드 상단에는 지정시장 내 최대 시장, 증가 기여 1위, 감소 기여 1위, 6개 시장 커버리지를 요약한다.
- 화면에는 ‘전세계 국가 순위가 아닌 지정시장 비교’임을 명확히 표시한다.

## 2026-10-02 — 10일 단위 잠정 수출 레이더 UI
- 월간 수출 hero 바로 아래에 별도 10일 단위 잠정치 레이더를 둔다.
- 최신 체크포인트의 전체 수출·반도체 수출, 반도체 비중, 전월 같은 구간, 직전 체크포인트 대비 YoY 가속도, 전체 수출 증가액 대비 반도체 증가 기여를 요약한다.
- 1~10일→1~20일→월전체 흐름은 누적 단계 카드로 표시하고 각 단계의 반도체 수출액·YoY·전월동기·비중을 함께 표시한다.
- 최신 체크포인트는 관세청 자체 10대 품목의 수출액·YoY·전월동기 비교 막대로 제공한다.
- provisional 데이터는 월간 snapshot이 화면에 먼저 렌더된 뒤 별도 lazy request로 채운다.

## 2026-10-02 — 월말 착지 범위 UI
- 10일 단위 잠정 수출 레이더 안에 ‘월말 착지 범위’를 둔다.
- 현재 1~10일/1~20일 단계면 전체 수출과 반도체 각각의 중앙 추정, 25~75% 완성률 기반 범위, 예상 YoY 범위, 과거 완성률 중앙값, 백테스트 품질을 표시한다.
- 월말이 이미 발표된 달은 당시 20일(없으면 10일) 기준 추정과 실제 마감을 비교해 모델을 바로 검증한다.
- 백테스트 품질은 최근 최대 24개월 중앙 절대오차와 범위 적중률로 표시한다.
- ‘통계적 착지 범위’임을 설명하고 확정 실적이나 투자수익 예측처럼 표현하지 않는다.

## 2026-10-02 — 외부 UX 감사 재검증
- 외부 평가의 수치 오류 주장은 원자료·공식 발표와 대조한 뒤에만 수정한다. 삼성전자 2026 Q1 133.87조원, Q2 171.50조원은 공식 연결 분기 매출과 일치하므로 보정하지 않는다.
- Yahoo earningsTrend의 0y/+1y는 회계연도 전체 컨센서스이므로 ‘연간’ 라벨을 화면 전반에 명시한다. 분기 실적처럼 보이게 하지 않는다.
- 한국 종목은 marketStatus=CLOSE일 때 regular_close를 유지하며 시간외 가격을 정규장 현재가에 섞지 않는다. CLOSE 이후 상세 5초 폴링도 중단한다.
- IDEA LAB의 관찰 패턴은 사후점검 신호와 별도지만, 과거 선정 이력이 있는 후보는 사후점검 상태를 같은 카드에 함께 표시한다.
- 섹터 강도 라벨은 종목 상태와 혼동되지 않도록 ‘비교군 강세/양호/약세/혼조’로 표현한다.
- 일반 웹 데스크톱은 760px까지 확장하되 Apps in Toss 런타임의 모바일 폭은 유지한다.
- 홈 중복 분석도구 바로가기는 제거하고 최근 주목 종목/아이디어 LAB을 일반 시장 카드보다 먼저 노출한다.
- 알 수 없는 경로는 홈으로 조용히 보내지 않고 명시적 페이지 없음 화면을 표시한다.
## 2026-10-02 — Preserve missing monthly export YoY in the chart
Classification: new bug in the dual-axis export history view, introduced with the recent export UI, rather than a quote/cache regression. Checked AGENTS, no-repeat policy, project memory, guardrails, decision log and export view history before editing.
The snapshot normalizer preserves missing YoY as null, but the view used Number(null) for coordinates and drew it as zero. Omit missing dots, split the polyline at gaps, and disclose missing months. Keep amount bars, real zero/negative YoY, dual axes, lazy loading and backend contracts unchanged.
Validation under Node 24.21.0: baseline 150 tests passed; final 153 tests passed; npm run build passed with all 18 preview routes. Headless Edge DOM/layout fixture passed at 320/390/430px: four observed dots, two separate line segments, five amount bars and no horizontal overflow. Screenshot capture timed out; visual screenshot inspection remains unverified.
Live read-only check: preview and backend health returned HTTP 200. The served exportMomentumView-HlhnDOhD.js lacks the new missing-YoY notice; this local change is not deployed. No exact production revision, Android/iOS Sandbox or public release verification is claimed.


## 2026-10-02 — Independent export recovery after live usability audit
Classification: new reliability/UX bug in the recently added export view. Audited live 390px Home/search/detail, PICK, IDEA LAB, More and exports. No pageerror or horizontal overflow was observed in these inspected states; a later live exports reload timed out, so the isolated failure case is validated with controlled browser responses instead of being presented as a successful live API recovery.
Add independent retry for provisional radar, item detail and semiconductor country matrix. Explicit retries use force:true to bypass cached HTTP200 empty/unavailable data and do not reload successful monthly or item charts. Keep route/detail sequence checks. Pending item lookup now has Close, invalidates the request token and cannot reopen on a late response. No provider fan-out, backend schema, quote freshness or native navigation changes.
Regression: tests/export_recovery_qa.mjs covers empty HTTP200, HTTP503, independent request counts, preserved charts, delayed response after close, 320/390/430px and no pageerror/overflow; included in mobile-release-qa.yml. Full unit/build and deployment evidence are recorded in the audit deliverable.

## 2026-10-03 — Operator auto-fix: detail screen data labeling (6 issues)
Classification: new bugs/new behaviors in the detail screen and related views, surfaced by a 2026-10-03 live audit of https://chart-view-toss.onrender.com/. Checked AGENTS.md, docs/no-repeat-regression-policy.md, docs/project-memory.md, docs/regression-guardrails.md and this decision log before editing; no prior records of these symptoms, so none are regressions.
1. Market cap missing on detail: reuse the existing valuation pipeline (marketCap already returned by /api/valuation). New formatMarketCap(value, currency) — KRW in 조/억원, others in $B, '미제공' when absent — injected into #detail-price by the valuation job callback; new .quote-marketcap style.
2. SECTOR vs KRX industry conflict: the two labels were never contradictory — SECTOR is the app's own comparison group (KRX 주요제품·사업 기준) while officialIndustry is the KRX official industry. The caption in industryContextView.js now states this explicitly when they differ, instead of appending a bare 'KRX 업종:' suffix.
3. Dual metric values without basis labels: formatMetricPeriod now expands the backend's composite/provider period strings — '제공처 예상 기간(미검증)', '최근 12개월 실적·최근 공시 기준', '최근 거래값 기준', '최근 가용 데이터 기준', '최근 공시 기준', '최근 공시·배당 기준'. Existing test expectation for 'provider forward period' updated.
4. Picks header '13'/'14' without labels: could not reproduce — both the deployed chunk and repo pickLedger.js label every header number. No code change; reported as not reproducible.
5. Info page '데이터 기준 전체 보기' overlap: no overlap in code (112px shell padding vs ~80px floating nav). Fixed the adjacent real defect: the 고객문의 .analysis-card was nested inside .policy-links; moved out.
6. Invalid ticker (ZZZZZZ) detail shell: root cause found — /api/search echoes any unverified query as a DIRECT row with name==symbol, and the selector rendered it as a '상세 보기' button. Two-layer fix: (a) stockSelector filters unverified DIRECT echoes via new isVerifiableSearchRow; (b) detail's resolvedName chain shows a '존재하지 않는 종목' notice (invalidSymbolHtml in detailPresentation.js) with 종목 검색/홈으로 actions, bumping viewEpoch + cleanupChart() to cancel pending jobs, instead of the '종목명 확인 불가' shell with a working watch button.
Validation: npm test → 157/158 pass; the single failure (tests/stockSelector.test.mjs module load) pre-exists on the clean tree — @apps-in-toss/web-framework is not installed in this sandbox (confirmed via git stash). New isVerifiableSearchRow cases verified standalone with node -e (5/5 pass). node --check passes on all 8 touched files. vite build fails on the clean tree too: 'lightweight-charts' not installed in this sandbox — pre-existing, unrelated. No live-browser QA available to this subagent (playwright QA scripts not run).

## 2026-10-03 — Validate external review before fixing actual defects (0.10.4)
Classification: new identity/recovery/provenance bugs and small detail discovery improvements; retain known-good quote/cache contracts. Live 10-query search did not reproduce permanent Home failure: Watch and Home share one selector. MU and nonexistent tickers were syntactic backend DIRECT hits, not confirmed listings. Verify these against positive quotes, retain provider company names, add exact Micron aliases without matching Hana Micron. Cancel obsolete/closed searches; retry errors and empty results explicitly. Direct unverified detail cannot add watch/compare entries; an existing saved entry remains removable.
Cached first paint stays fast, but discloses stored prices and revalidation; failure retains dated prior data honestly. Latest quote convergence, priorities, timestamps, close-session handling and TTLs remain unchanged. Show existing valuation marketCap with its currency and independent provenance, and field-level metric basis. Do not replace 5-trading-day peer returns with daily changes or conflate product comparison groups with official KRX industry. Samsung Q2 revenue matches official publication, so no numerical rescaling. Explain US coverage. Lazy detail summary reuses exact dated PICK records and existing combined status/technical markup, never inventing signals for untracked stocks. Summary failures do not mean a stock is untracked. Empty macro HTTP200 is an error with cache-bypassing retry; DFF/FEDTARGET retain percent units. Common info link is labeled for its actual destination. Static HTML shows preparation before module arrival.
Validation: 166 unit tests and web build/18 direct-entry routes after integrating operator PR #86. Controlled before/after browser fixtures cover 320/390/430px, cache disclosure/convergence, direct identity, alias separation, failed/empty retry, cancel and late responses, invalid detail actions, cap/US context, PICK load failure/retry and macro units. Existing reliability/export recovery, progressive navigation and large-text/deep-link QA retained. Mobile QA waits for optional industry settlement before inspecting its removable jump. Full claim disposition: REVIEW_VALIDATION_2026-10-03.md. Existing performance harness is reused before/after with the same local Edge engine; single-run timings are observations, not an SLA or proof of Render cold start.
Post-deploy live Samsung detail found reused technical metrics without the PICK route stylesheet. Add detail-scoped wrapping and gaps, preserving the shared values and signal logic. Extend the browser fixture to a positively matched dated Samsung pick and verify non-overlapping metric spacing at 320/390/430px; untracked and failed-bootstrap cases remain covered.

## 2026-10-03 — Strategy report source cross-check and screener interpretation/recovery
Classification: new factual data-interpretation notice plus a new bug in the existing screener preset clear action. Reviewed AGENTS, no-repeat policy, project memory, guardrails, decision log, architecture/release gates and nearest tests. The external strategy report is not authoritative: local caches explain the 3.89 vs 5.77 PER difference through next-year vs current-year annual EPS; KRX KIND-backed context preserves the alphanumeric 0004V0 code; saved filing conditions, metric/sector labels, Home value copy and Lightweight Charts already exist. Do not duplicate those systems or replace raw provider values without matched-period evidence.
The ±35% daily-move notice is a review threshold, not a corporate-action/error diagnosis. Retain actual screener/idea rows, prices, RSI and rankings; zero RSI, missing moves and alphanumeric identifiers do not themselves trigger it. Carry the notice through IDEA winners using one shared pure helper. Explain query/market/technical intersection; separate no name/market match from technical exclusion. Clear resets actual technical form fields and pagination, preserves query/market, updates manual-condition visibility and persists correctly across detail/back. No API, quote freshness/cache, storage key, provider fan-out, native navigation or Web UI changes.
Validation: before 166 tests/build; added tests failed before implementation. After 169 tests and npm run build/18 direct-entry routes pass. New strategy_report_qa covers 320/390/430px, notices, clearing, manual inputs, query/market preservation, detail/back, alphanumeric identity, no pageerror/overflow and no unrelated exports call; wired into mobile-release QA. Existing analysis and investment-review browser suites pass at all three widths using only a local system-Chromium launch adaptation; temporary files removed.
Production access remains blocked: curl CONNECT 403 and browser ERR_TUNNEL_CONNECTION_FAILED; current environment revision 6 still has empty allowed_hosts after the user's configuration edits. Follow-up scope is Toss site only; no backend changes. No deployment, exact production revision or native release claim. Full disposition and pending live verification: docs/STRATEGY_REVALIDATION_2026-10-03.md.

## 2026-10-03 — 사용자 승인: 핵심 가치 발견 (0.11.0)

새 동작으로 홈 배치를 변경한다. 이전 수출 진입 숨김·홈 18종목 동시 표시·홈 전체 섹터 보드는 이 결정으로 대체된다. 첫 화면에 수출, 조건별 종목 찾기, 최근 선정 진입을 노출한다. 최근 선정의 원문 이유와 날짜·점검 상태를 보여주고 날짜/코드가 일치하는 기록만 직접 연다. 전체 성과는 펼쳐서 확인한다. 관심목록은 시장보다 앞에 유지하되 빈 목록은 작게 표시한다.

홈 히트맵은 선택 시장 대표 6종목 미리보기다. 전체 화면은 한국/미국·종목/섹터 탐색을 제공한다. 공유 렌더러, 전체 수집 범위, canonical 최신 시세·출처·거래일, 캐시 TTL을 유지한다. 홈 수출 요약은 화면 접근 시 월간 스냅샷만 지연 요청하며 품목 상세/국가 세부 API는 진입 전 호출하지 않는다. 스크리너는 실제 프리셋과 결과를 먼저 보여주고 수동 조건은 접는다. 상세 왕복 시 조건·페이지 상태를 유지한다. 수출 바로가기는 기존 분석 섹션으로 이동하며 월별 기준·단위·누락값 계약을 유지한다. 브라우저 검증으로 10초/30초 실사용 목표 달성을 주장하지 않는다.

## 2026-10-03 — 운영 경고 카드 최소 화면 보완 (0.11.1)

운영 0.11.0의 거래량 급증 첫 종목에 ±35% 이상 원자료 확인 경고가 붙으면 320×693에서 카드 하단이 메뉴에 가려짐을 확인했다. 일반 카드만 검사한 누락을 보완한다. 프리셋·안내의 여백과 결과 카드 간격을 줄이며 원래 가격·지표·정렬·경고 전문과 44px 조작 영역을 유지한다. value_discovery_qa의 첫 카드에 -91.07% 경고 사례를 넣고 경고 전문 및 카드 전체의 하단 메뉴 위 노출을 네 화면 폭에서 검사한다.

## 2026-10-04 — 개편 리뷰 재검증 (0.11.2)

새 버그: 선정 점수의 출처/0 의미 설명과 library 십자선 날짜가 부족하다. 0은 실제 제공값으로 유지하고 미제공과 구분하며 현재 기술점수와 분리한다. 세 차트의 날짜를 YYYY.MM.DD로 맞춘다. 새 동작: favorites를 정식 watch로 연결하고 정적 진입을 추가한다. 배너 문구·영숫자 KRX 코드·LAB 수치 라벨은 이미 정상이다. PER 비교는 2026/2027 EPS 기준 차이이며 숫자 교정 근거가 없다. PICK 반복 조회는 현재 미재현이므로 과거 원인을 확정하거나 캐시/수집을 재설계하지 않는다. REDESIGN_REVIEW_VALIDATION_2026-10-04.md와 전용 회귀 참조.


## 2026-10-04 — 사용자 승인: 시장 먼저 확인하는 홈과 선정 기록 동선 (0.12.0)
Classification: new behavior. 운영 390px에서 관심 제목 1249px, 시장 제목 1397px 아래에 있어 매일 확인 동선이 밀린 것을 직접 관찰했다. 사용자의 새 요청에 따라 0.11.0의 선정 근거 선행·시장 후행 배치를 대체한다. 홈은 검색 → 주요 시장 → 수출/조건 검색/선정 기록 세 진입 → 내 관심종목 → 선정 기록·성과 → 조건/수출 미리보기 → 대표 히트맵 순서다. 주요 4개 시장과 세 핵심 분석을 320×693부터 첫 화면에서 확인한다. 390×844는 미등록/한 종목 등록 관심까지 표시한다. 시장 시각, 저장/실패 상태, 44px 조작 영역을 유지한다.
선정 기록·성과는 실시간 인기 순위가 아닌 과거 기록이다. 전체 평가 기록의 평균/플러스 비율/평가 건수는 접지 않고 표시하며, 산술 평균·종목별 다른 선정일/보유기간·미평가 제외·매매비용/포트폴리오 차이를 설명한다. 최신 종목 이름·선정일·상태를 누르면 기존 날짜/코드가 일치하는 PICK를 연다. 원문 이유와 기업 상세는 해당 기록 안에 유지한다. 하단 more의 표시만 분석으로 변경하고 기존 routes/공유/상세 origin/네이티브 뒤로가기는 그대로다. 분석은 목적별 문서 내 이동과 네 탭 설명을 제공한다. 평균 계산·시세/상태·API/저장/캐시/TTL/수집 범위는 변경하지 않는다.
새 home_journey_qa는 320/390/430의 미등록/등록/조회 실패 총 9상태, 첫 화면 시장/세 진입, 관심-기록 순서, 평균/평가 분모/계산 기준, 정확한 기록 연결, 분석 목적 이동의 hash 불변·제목 노출·큰 글자·가로 넘침을 검사한다. 기존 가치 발견 QA는 긴 원문 이유의 검사 위치를 클릭 후 정확한 기록으로 옮기고 첫 화면 세 진입·수출 지연·경고 카드·조건 복원을 계속 확인한다. 기존 시장 전개·시세 수렴·관심 저장 검사를 제거하지 않는다.


## 2026-10-04 — 목적을 알아보는 시각적 구분 (0.12.1)
Classification: new behavior, following the user’s request for clearer overall UI. Production 0.12.0 has three identical pale-blue core cards without icons and a three-dot analysis navigation icon. Add local decorative SVGs for shipping/export, screening sliders, a dated ledger and a tools dashboard. Reuse these at Home and the corresponding menu entry; pair them with existing labels and short descriptions. Tool-purpose colors are teal for exports, blue for finding/comparison, violet for past records, amber for personal watch entries. Financial red/blue changes, warning/status semantics, source dates and raw data stay unchanged.
Use a consistent route-aware title/category, section symbols, visible active navigation background, purpose surfaces and readable menu descriptions. Keep the native hidden topbar, fixed navigation/safe area, 320px first-screen market/core tools, exact record routing, lazy requests, quote/cache/TTL, storage and backend contracts. New static SVGs add no external image/font/icon requests or decorative fake data charts. Strengthen existing home_journey_qa for three distinct purpose surfaces, decorative graphics, 44px core controls, analysis icon/context and screenshots while retaining its nine ready/saved/failure states, geometry, calculations, exact record and purpose jumps. Unit coverage retains disabled PICK scope and destination parameters.
