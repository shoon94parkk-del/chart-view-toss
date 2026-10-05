# 거장 투자법 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 분석 메뉴에서 버핏·린치 원칙을 참고한 재무 조건 충족 기업과 실제 공시 근거를 조회하는 모바일 화면을 구현한다.

**Architecture:** 공유 백엔드의 별도 캐시 수집기와 순수 판정기가 전 시장 대상 자료를 점진적으로 준비하고, 버전이 맞는 결과와 근거를 제공한다. Toss는 저장된 결과만 지연 로드하며 기존 상세·기술 스크리닝으로 연결한다. 기존 공유 웹 UI와 기존 DART 응답을 변경하지 않는다.

**Tech Stack:** Python 3.11/FastAPI/requests 및 기존 Yahoo 수집, GitHub Actions, Node 24.21.0/Vite/vanilla JS, Node test/pytest/Playwright. 새 제품 라이브러리는 추가하지 않는다.

**Spec:** [승인된 설계](../specs/2026-10-05-guru-investing-design.md). 상태: 계획 작성 완료, 사용자 검토 대기. 아직 제품 코드·배포를 변경하지 않았다.

## Global Constraints

- 하단 주 메뉴는 늘리지 않는다. 작은 글자·짧은 행·적은 여백, 기존 시세·안전 영역·뒤로 가기 계약을 보존한다.
- 글자 13~14px/보조 12px, 일반 조작 영역 44px 이상, 기본 행 72~88px 목표. 320/390/430px 가로 넘침 없음. 390×844px 첫 결과 시작 ≤320px.
- 버핏: 3년 순이익 각각 >0, ROE 각각 ≥10% 및 산술평균 ≥15%, 3년 OCF 각각 >0 및 합계 ≥순이익 합계, 최근 부채/자본 ≤100%.
- 린치: 4년 보통주 기본 EPS 각각 >0, 3년 EPS CAGR 10~30%, 최근 EPS 증가, 최근 연간 EPS 기준 PER >0 및 과거 실적 기준 PEG ≤1.0, 최근 부채/자본 ≤100% 및 OCF >0.
- 같은 재무 기준·KRW·연속 연간 기간을 요구한다. ROE는 총순이익/평균 총자본이며 4년 자본 필요. PEG 성장률은 퍼센트 숫자(20)를 사용한다.
- EPS 종류·기업행동·정정·계정 불확실성을 임의 보완하지 않는다. 실제 수치 기준은 ‘차트뷰 기준’, 연간 PER와 과거 PEG는 TTM/예상 지표와 구분한다.
- 데이터 부족·수집 대기·지원 제외·조건 미충족을 구분한다. 실패 시 마지막 검증 자료와 실제 시점을 보존한다. 근거 API는 외부 공급자를 호출하지 않는다.
- 결과의 가격은 동일 거래일 종가이다. 화면의 장중 시세로 PEG를 몰래 다시 계산하지 않는다. 기존 `/api/financial-history`, 기술 스크리너, shared web UI 계약은 보존한다.
- 정확히 테스트한 main 커밋만 배포하고 `/health`·운영 결과·모바일 동선을 확인한다. Render 미리보기와 실제 Toss 공개 출시를 구분한다.

## Review Focus

1. 최근 보고서가 정정되거나 EPS 비교 수치가 바뀌면 이전 성장률을 계속 표시하지 않아야 한다 — Task 1/3 테스트.
2. 주식분할 확인을 위한 공급자가 실패하면 ‘기업행동 없음’으로 간주하지 않아야 한다 — Task 1 테스트.
3. 상장폐지/종목코드 변경 또는 당일 시세 누락은 과거 선정 결과의 재등장을 만들지 않아야 한다 — Task 3 테스트.
4. 스냅샷 갱신과 근거 요청이 겹치면 다른 기준으로 계산한 근거를 같은 결과처럼 표시하지 않아야 한다 — Task 4/5 테스트.
5. 빠른 전략 전환·상세 진입/복귀·네트워크 실패가 겹쳐도 선택/스크롤/유효 결과를 잃지 않아야 한다 — Task 5/6 테스트.

## File Structure and Interfaces

구현 시 최신 `origin/main`과 앱 첨부 작업트리를 확인하고 `using-git-worktrees` 절차로 적합한 체크아웃을 선택한다. 승인 문서의 커밋 `4247054`와 이 계획 커밋을 실행 체크아웃으로 보존한다. 아래 B는 공유 백엔드 `chart-view-backend-insight`, F는 Toss `chart-view-toss-insight`의 저장소 기준 경로이다. 실제 경로가 바뀌면 기존 파일명과 계약을 유지한다.

- B `guru_financials.py`: 원자료 정규화·계정/연도/EPS/기업행동 검증. `normalize_reports(reports: list[dict], *, symbol: str, classification: dict, actions: dict) -> dict`.
- B `guru_rules.py`: `evaluate_company(company: dict, quote: dict | None, *, strategy: str) -> dict`, 전략은 buffett/lynch. 반환 status=matched/failed/insufficient/unsupported/pending, metrics/checks/reasons 포함.
- B `guru_snapshot.py`: `build_snapshot(universe: list[dict], prices: dict, financials: dict, *, generated_at: str) -> tuple[dict, dict]`, `publish_snapshot(snapshot: dict, evidence: dict, directory: Path) -> None`.
- B `scripts/generate_guru_screening.py`: `refresh_cache(universe: list[dict], previous: dict, *, client, max_companies: int, max_requests: int, deadline: float) -> dict`. 실행 옵션은 `--collect`, `--max-companies`, `--max-requests`, `--max-seconds`; collect 없이 가격·결과만 재계산 가능.
- B `guru_service.py`: `get_guru_evidence(ticker: str, version: str) -> dict`와 FastAPI router. 버전 불일치 409, 회사 없음 404, 아직 자료 없음 503.
- B 신규 캐시 `static/data/guru_financials.json`, `guru_screening.json`, `guru_evidence.json`. 세 파일은 동일 스냅샷 버전과 회사 근거를 검증한다.
- F `src/guruInvestingModel.js`: 결과 형식 검증·화면 검색·상태 문구만 담당. 금융 조건 계산을 프런트에 중복 구현하지 않는다.
- F `src/guruInvestingView.js`/CSS: `renderGuruInvesting({state, shell, bindNav, navigate, isCurrent}) -> cleanup`. 기존 viewEpoch/cleanup 계약에 연결한다.

정규화 회사 형식: symbol/stockCode/corpCode/name/market/classification/basis/currency/annualReportYear/checkedAt, `annual`(오름차순 year/netIncome/operatingCashFlow/assets/liabilities/equity/basicEps), `sources`(계정별 receiptNo/filingDate/accountId/accountName/currency/period), `epsComparability`(verified/unknown/invalid와 근거), `collection`(status/reason/targetYear). 분기 누적값은 annual에 넣지 않는다.

결과 형식: schemaVersion=1, criteriaVersion='cv-gurus-v1', snapshotVersion(내용 해시), generatedAt/tradeDate/financialAsOf/source, strategies.buffett/lynch 각각 results와 집계. `universeCount=unsupportedCount+pendingCount+insufficientCount+evaluatedCount`, `evaluatedCount=matchedCount+failedCount`. 결과 행은 symbol/name/market/tradeDate/annualReportYear/metrics/checks/evidenceKey를 포함한다. 개별 근거는 동일 snapshotVersion과 전략별 판정, annual/sources/한계/추가 질문을 포함한다.

### Task 1: 비교 가능한 재무 이력 정규화

**Files:** Create B `guru_financials.py`, `tests/test_guru_financials.py`, `tests/fixtures/guru_reports.json`; Reference B `dart_financial_service.py`, `dart_business_service.py`, `scripts/generate_screener.py`.

**Interfaces:** Consumes 기존 `_pick_account`·재무 계정 정의·원 DART 응답. Produces `normalize_reports(...)`의 위 정규화 형식과 account/source 검증 결과.

- [ ] **Step 1 — 실패 테스트 작성:** `test_four_annual_years_and_latest_restated_values`는 2022~2025 연속 4년, 최근 접수번호의 2024 비교 값 선택을 검증한다. `test_eps_decimal_and_common_basic_selection`은 basic EPS '1,234.50'→1234.5, diluted-only/ambiguous/우선주-only→미검증을 검증한다. `test_basis_currency_period_mismatch`, `test_duplicate_accounts_not_summed`, `test_unknown_actions_not_no_actions`는 CFS/OFS 혼합·통화·불규칙 결산·계정 중복·공급자 실패를 거절한다.
- [ ] **Step 2 — 실패 확인:** `python -m pytest tests/test_guru_financials.py -q`; 새 모듈/계약 부재로 실패하는지 확인한다.
- [ ] **Step 3 — 정규화 구현:** 숫자는 유한성/소수/괄호·△ 음수를 보존한다. 보고서별 공시일·기간·계정 출처를 저장하고 최신 확인된 비교 수치를 우선한다. CFS 없는 경우에만 전체 기간 OFS를 선택한다. KRX/KIND 기업 업종과 확인된 상품 유형으로 금융/리츠/SPAC/우선주를 구분하며 불명확 유형은 미검증이다. 기업행동 조회 기간·성공·조정 근거가 없으면 EPS comparability=unknown이다.
- [ ] **Step 4 — 통과 확인:** 위 테스트와 `python -m pytest tests/test_dart_financial_service.py -q`가 모두 통과한다. 기존 상세의 금액·기간 출력은 변하지 않아야 한다.
- [ ] **Step 5 — 커밋:** B 새 모듈·fixture·테스트만 커밋, 메시지 `feat: normalize verified guru financial histories`.

### Task 2: 버핏·린치 순수 조건 판정

**Files:** Create B `guru_rules.py`, `tests/test_guru_rules.py`.

**Interfaces:** Consumes Task 1 정규화 회사와 price/date/symbol/통화가 확인된 동일일 quote. Produces `evaluate_company(...)`와 기준값·관측값·미검증 이유가 있는 checks.

- [ ] **Step 1 — 실패 테스트 작성:** `test_buffett_boundaries`는 4년 자본=100, 최근 3년 순이익=10/15/20, OCF=10/15/20, 최근 부채=100을 matched, 순이익 합계 대비 OCF 1 부족을 failed로 기대한다. `test_lynch_percent_units_and_annual_pe`는 EPS=100/120/144/172.8, 가격=3456에서 CAGR≈20, 연간 PER≈20, PEG≈1을 기대한다. 10/30% 성장 및 PEG=1 경계, 최근 EPS 감소, 0/음수·NaN/inf, 3년만 있는 자료, 타종목/타거래일 시세, 미래 공시 사용을 각각 검증한다.
- [ ] **Step 2 — 실패 확인:** `python -m pytest tests/test_guru_rules.py -q`가 새 모듈 부재로 실패한다.
- [ ] **Step 3 — 판정 구현:** Global Constraints의 값을 그대로 사용한다. 원자료의 소수 정확도를 보존하고 계산값 비교의 부동소수 오차 허용은 절대 1e-9 이내로 제한한다. 표시 반올림값으로 통과를 판정하지 않는다. missing은 insufficient, 지원 제외는 unsupported, 실제 미수집은 pending이다. 미래 접수일 자료와 확인되지 않은 과거 자료를 통과시키지 않는다.
- [ ] **Step 4 — 통과 확인:** 두 신규 Python 모듈 테스트가 통과하고, 동일 fixture 재실행 결과가 일치한다. ROE는 총자본, CF는 영업현금흐름, PER은 연간 실적이라는 basis를 반환한다.
- [ ] **Step 5 — 커밋:** B 판정기·테스트만 `feat: evaluate Buffett and Lynch reference criteria`로 커밋한다.

### Task 3: 전체 대상 점진 수집·검증 스냅샷·갱신 작업

**Files:** Create B `guru_snapshot.py`, `scripts/generate_guru_screening.py`, `.github/workflows/update-guru-screening.yml`, `tests/test_guru_snapshot.py`, `tests/test_guru_collection.py`, `docs/guru-data-contract.md`; Modify B `.github/workflows/update-screener.yml`은 실제 가격 데이터 커밋 이후 새 결과 갱신을 연결할 경우에만 변경한다.

**Interfaces:** Consumes Task 1/2, 기존 `load_universe()`와 DART corp-code cache, screener의 검증 거래일, 저장 원자료. Produces 세 캐시와 재개 가능한 collection 상태. 생성 작업의 --collect 없는 모드는 공급자 호출을 하지 않는다.

- [ ] **Step 1 — 실패 테스트 작성:** `test_counts_partition_universe`는 6개 원집합 중 unsupported=1/pending=1/insufficient=1/failed=2/matched=1을 기대한다. `test_removed_or_changed_symbol_never_resurrects`, `test_missing_current_quote_not_carried_as_current`, `test_invalid_publish_preserves_last_good_files`, `test_partial_collection_checkpoint_resume`, `test_status020_stops_requests`, `test_corrected_report_invalidates_dependent_metrics`를 fake client/임시 디렉터리로 검증한다.
- [ ] **Step 2 — 실패 확인:** `python -m pytest tests/test_guru_snapshot.py tests/test_guru_collection.py -q`가 실패한다.
- [ ] **Step 3 — 수집/게시 구현:** 초기 기본 상한은 400기업/2,400 API 요청/1,200초/동시요청 2, HTTP timeout 12초·네트워크 재시도 최대 1회이다. 인증/요청 제한 에러는 재시도하지 않는다. 신규·정정 공시 확인과 과거 보고서 보충을 분리하고, 중단 시 다음 회사/보고서부터 재개한다. 최근 3년 비교+이전 보고서에서 필요한 4번째 연도를 확보하되 누락 시 더 오래된 보고서 요청도 예산 안에서 제한한다. 동일 거래일 가격과 확인된 금융자료로 전체 결과를 계산한다. 내용 해시는 생성시간을 제외한 금융/가격/기준 내용을 반영한다. 검증된 근거 파일을 먼저 쓰고 스냅샷 파일을 마지막에 atomic replace한다; 읽는 쪽은 버전이 다른 조합을 거절한다.
- [ ] **Step 4 — 작업 연결 및 통과 확인:** 매일 05:00 KST 수집과 성공한 `Update Korean Stock Screener` 완료 후 가격/조건 재계산, 수동 collect/상한 입력을 지원한다. workflow_run 성공 여부와 원 저장소 main을 검증하고, concurrency로 중복 생성을 막는다. 최신 main을 읽어 생성하고 커밋 충돌 시 최신 가격에 대해 결과를 재계산하여 푸시하며 무조건 덮어쓰기/rebase-theirs를 사용하지 않는다. 기존 DART secret 재사용, 로그에 key/전체 요청 URL 미출력. 신규 테스트 통과, 캐시 3개 집계·버전·출처 교차 검증 결과를 기록한다.
- [ ] **Step 5 — 커밋:** 수집/스냅샷/작업/계약·테스트만 `feat: collect and publish dated guru screening snapshots`로 커밋한다. 실데이터는 Task 6 운영 검증에서 수집하며 예시 fixture를 static 운영 파일로 배포하지 않는다.

### Task 4: 저장된 선정 근거 API

**Files:** Create B `guru_service.py`, `tests/test_guru_service.py`; Modify B `main.py`의 router import/include만 추가한다.

**Interfaces:** Consumes Task 3 캐시. Produces `GET /api/guru-investing/{ticker}?version={snapshotVersion}`; 성공 응답에는 요청한 ticker와 snapshotVersion이 같아야 한다.

- [ ] **Step 1 — 실패 테스트 작성:** `test_reads_evidence_without_provider_calls`는 requests/Yahoo 조회를 실패하도록 patch한 상태에서 저장 근거가 200임을 기대한다. `test_version_conflict_409`, `test_invalid_ticker_400`, `test_unknown_ticker_404`, `test_unavailable_cache_503`, `test_cache_replacement_reloads_by_mtime`를 검증한다. 캐시 파일 교체 중 버전 불일치는 409/503으로 처리한다.
- [ ] **Step 2 — 실패 확인:** `python -m pytest tests/test_guru_service.py -q`가 실패한다.
- [ ] **Step 3 — API 구현:** validated ticker만 허용하고 mtime 기반 읽기 캐시로 저장 근거를 반환한다. path traversal 입력을 파일명으로 사용하지 않는다. 기존 router와 CORS를 재사용한다. 409/503에는 재시도 가능한 코드와 현재 버전을 주며 구버전 결과에 새 근거를 섞지 않는다.
- [ ] **Step 4 — 통과 확인:** 신규 5개 Python 테스트 파일 및 `python scripts/build_frontend_bundle.py --check`가 통과한다. 기존 웹 번들 파일은 변경 대상이 아니다.
- [ ] **Step 5 — 커밋:** API·라우터·테스트를 `feat: serve versioned guru screening evidence`로 커밋한다.

### Task 5: 간결한 모바일 화면·경로·선정 근거 동선

**Files:** Create F `src/guruInvestingModel.js`, `src/guruInvestingView.js`, `src/guruInvestingView.css`, `tests/guruInvesting.test.mjs`, `tests/guru_investing_qa.mjs`; Modify F `src/api.js`, `src/staticData.js`, `src/routes.js`, `src/main.js`, `src/uiIdentity.js`, `scripts/export-preview-routes.mjs`, `tests/routes.test.mjs`, `tests/verify_preview_routes.mjs`, `tests/ui-identity.test.mjs`, `.github/workflows/mobile-release-qa.yml`.

**Interfaces:** Consumes Task 3/4 JSON. API 함수 `guruScreeningData({force=false}={})`, `guruEvidenceData(ticker,version,{force=false}={})`. Model exports `validateGuruSnapshot(data)`, `filterGuruResults(rows,{query='',market=''})`, `guruViewStatus(strategy)`. View returns cleanup and calls provided navigate for strategies/detail/discover.

- [ ] **Step 1 — 실패 테스트 작성:** Node 테스트에 두 전략·집계 형식 검증, 정확한 이름/코드·시장 검색, matched=0와 evaluated=0·pending>0의 다른 문구, 연간 PER/과거 PEG 표시를 명시한다. 경로 테스트는 #gurus/lynch와 /gurus/lynch→guruStrategy=lynch, 기본 buffett, 알 수 없는 전략→명시적 notfound를 기대한다. 브라우저 fixture는 진짜 후보를 가장하지 않는 명백한 테스트 기업만 사용한다.
- [ ] **Step 2 — 실패 확인:** `node --test tests/guruInvesting.test.mjs tests/routes.test.mjs tests/ui-identity.test.mjs`가 새 계약 부재로 실패한다.
- [ ] **Step 3 — 화면 통합:** 분석 종목찾기 그룹의 조건 검색 다음에 메뉴 추가; `surfaceIdentity`의 find 목적 색상과 guide SVG 사용. main에서 view 모듈·CSS를 지연 import하고 viewEpoch로 오래된 응답을 차단한다. 검색/시장/expandedSymbol/count/scroll은 state.gurus에 저장하고 hash 전략 변경은 기존 history push를 사용한다. 스냅샷 기본 TTL 60초, 근거는 version별 5분, retry는 기존 요청 클라이언트를 사용한다. 새 staticData 파일은 schema 검증 실패 시 기존 backend 경로로 fallback한다. 접힌 기준, 2개 작은 전략 버튼, 이름순 초기 30행과 ‘더 보기’를 구현한다. 근거/원문/상세는 별도 버튼으로 두고 공시 링크는 기존 Toss openURL 경로로 연다. 409에서는 기존 결과와 근거 오류를 유지하면서 ‘최신 결과 확인’ 액션으로 새 스냅샷을 읽는다.
- [ ] **Step 4 — 통과 확인:** 위 Node 테스트, `npm test`, `npm run build` 통과. 새 QA를 CI에 연결하고 320/390/430px에서 폭/글자/조작 영역/첫 후보 위치를 검증한다. 빠른 전략 전환 후 응답 역전, 근거만 실패/버전 충돌, 검색 후 상세-Back/Reload, 직접 진입, 0개/수집중/오프라인, 근거 원문과 기존 기술 스크리닝 연결을 실제 클릭으로 검증한다. 새 고정 /gurus 디렉터리와 전략 hash 직접 진입 확인.
- [ ] **Step 5 — 커밋:** 모바일 화면·회귀 테스트·작업 변경을 `feat: add compact guru investing analysis screen`으로 커밋한다. 기존 홈·PICK·수출·히트맵을 함께 재디자인하지 않는다.

### Task 6: 실공시 대조·배포·운영 완료 검증

**Files:** Modify B/F `docs/decision-log.md`, `docs/project-memory.md` 및 필요한 guardrails; Create F `docs/guru-investing-verification-2026-10-05.md`. 데이터 캐시 변경은 B에만 포함한다.

**Interfaces:** Consumes 완료된 Task 1~5, 실제 GitHub DART secret과 Render Chart View 워크스페이스. Produces tested main commits, deploy IDs, 실데이터 범위·모바일 캡처·잔여 한계를 담은 보고서.

- [ ] **Step 1 — 실데이터 작업 실행:** 기존 major cache를 원자료 출처로 검증해 재사용하고 전체 원집합 수집을 bounded workflow로 수행한다. 매 실행의 처리 수·미검증 이유·요청 수를 기록한다. 상한 때문에 중단됐으면 다음 실행에서 이어가며 14개 기업만으로 전체 완료라고 부르지 않는다. 근거를 확보하지 못한 기업은 원인별 insufficient로 집계하고 수집 대기와 구분한다.
- [ ] **Step 2 — 실제 계산 대조:** 버핏의 계산 가능한 기업 최소 3개에서 ROE 평균자본/OCF/부채를 원 공시와 대조한다. 린치의 EPS 종류·4년 comparability가 확인된 기업 최소 3개에서 EPS/기업행동/CAGR/연간 PER/PEG를 대조한다. 실제 충족/미충족을 함께 확인하고 실제 조건 충족이 0이면 완화하지 않는다. 자료를 확보할 수 없으면 해당 전략의 데이터 한계를 명시하고 완료를 과장하지 않는다.
- [ ] **Step 3 — 최종 검증:** B 신규 테스트와 DART 기존 테스트/번들 검사, F npm test/build/새 모바일 QA 및 기존 mobile_continuity_qa·analysis_qa·financial_flow_qa를 통과시킨다. 변경 전후 동일 390px 환경의 Home/상세 첫 표시와 네트워크 요청을 확인해 새 전 종목 수집이 첫 화면에 붙지 않았음을 검증한다. 문서에 검증 결과·버전·수집 집계를 기록한다.
- [ ] **Step 4 — 순차 배포:** 테스트한 backend main과 수집 cache 커밋 배포 → /health exact revision/새 JSON/근거 200 및 409 확인 → 테스트한 Toss main/Render preview 배포 순으로 진행한다. 생성한 PR은 앱에 첨부하고 필수 CI를 통과시킨다. 기존 데이터 workflow가 main에 새 커밋을 추가하면 최신 커밋에 대한 검증과 revision 확인을 반복한다. 유료 리소스·공개 Toss 심사 제출은 이 작업에 추가하지 않는다.
- [ ] **Step 5 — 운영 클릭 검증 및 보고:** 실제 새 메뉴·두 전략·검색·기준·기업 근거·DART 원문·상세·Back·기술 조건 검색을 모바일 폭에서 확인한다. 수집 대기 0(또는 외부 실패로 남은 구체적 제한), 전략별 verified/insufficient/unsupported/matched 집계를 보고한다. Render live만으로 완료라고 하지 않는다. Android/iOS Toss Sandbox는 실제 기기 증거가 없으면 미검증으로 남긴다.

## Self-review and Handoff

Task 1은 출처/기간/EPS, Task 2는 수치 기준, Task 3은 전 시장·수집 예산·정정·범위, Task 4는 버전 근거, Task 5는 모든 승인 동선·모바일·실패 상태, Task 6은 실제 데이터·회귀·순차 배포를 담당한다. 인터페이스·status·버전 이름을 통일했고 Review Focus 5개를 해당 테스트에 연결했다. 테스트 fixture와 실데이터 경로는 분리한다.

**실행 제안:** 이 대화에서 주 개발 에이전트가 `executing-plans`로 순서대로 직접 구현한다. 재무→결과→근거→화면의 의존성이 강하므로 먼저 계약을 확정하고 한 단계씩 검증하는 방식이 적합하다. 사용자에게 계획 검토와 실행 방식을 확인받은 뒤 제품 구현을 시작한다.
