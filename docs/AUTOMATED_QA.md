# 배포 전 자동 QA

개발/수정 → Codex의 실제 브라우저 검사 → GitHub push/PR → 결정론적 Playwright 회귀 검사 → 통과한 정확한 main 커밋만 Render 브랜치로 동기화.

OpenAI API, 외부 LLM, tester-army/e2e, 추가 API 키를 사용하지 않는다. 기존 Node 테스트와 모바일 QA는 유지한다. 앱은 Vite 정적 클라이언트이며 공유 FastAPI 서버/데이터 수집 구조는 변경하지 않는다.

## 실행

Node 24.x/npm 10–11. CI는 기존 저장소와 동일한 Node 24.21.0을 사용한다.

```bash
npm ci
npx playwright install --with-deps chromium webkit
# 수정 후 push 전에: 기존 단위 테스트 + 프로덕션 빌드 + 전체 브라우저 검사
npm run qa:prepush
```

Linux에서는 한글 글꼴이 필요하다. CI는 `fonts-noto-cjk`를 설치한다. 로컬 환경의 글꼴 설정이 잘못되면 문자가 사라지고 검색 입력/버튼 크기 검사도 왜곡될 수 있다. 앱 CSS를 바꿔 환경 문제를 숨기지 않는다.

```bash
# 이미 빌드한 앱 검사. Playwright가 preview 시작과 HTTP health check를 관리한다.
npm run test:e2e
npm run test:e2e -- --project=android-chromium
npm run test:e2e -- --project=iphone-small-webkit
npm run test:integration
npm run test:a11y
npm run test:e2e -- --ui
npm run test:e2e:report
npx playwright show-trace test-results/<실패한-test>/trace.zip
```

기본 서버는 `127.0.0.1:4173`. CI는 기존 서버를 재사용하지 않아 다른 빌드를 잘못 검사하지 않는다. 로컬은 이미 실행 중인 preview를 재사용할 수 있으므로 현재 `dist`를 다시 빌드한다. `E2E_BASE_URL=https://... npm run test:e2e`는 지정한 앱 자산에 **고정 API 응답**을 연결하는 회귀 검사다. 실제 공급자 검증은 아래 live 명령을 사용한다.

## 자동화 범위

| 요청 시나리오 | 검사 내용 |
|---|---|
| 1. 앱 진입 | HTTP200, 홈/검색/메뉴, 치명적 JS·hydration·chunk 오류 |
| 2. 모바일 홈 | 가로 overflow, 시장 카드 경계, 주요 버튼 44px/가림/실제 클릭, 검색창 열고 닫기 |
| 3. 관심종목 | 이름/티커/가격/등락률, 상세와 뒤로가기 |
| 4. 검색 | 삼성전자·005930.KS 실제 검색 응답 대기, 결과 선택과 상세 이동 |
| 5. 상세 | 가격, canvas 차트, 핵심 지표, 공시 실적, 산업, 뉴스, 관심 토글/새로고침 저장 |
| 6. 반도체 | Flash→DRAM, 12개월 수치와 막대 높이 변경, 모바일 선택기와 그래프 동시 가시성/근접성, 캐시 재사용 |
| 7. 산업 탭 | 반도체·화장품·철강·석유제품·자동차·선박; 서로 다른 금액/이력/선택 상태, 12개월 차트, 모든 모바일 탭 터치 영역 |
| 8. 선정 기록 | 성과·상태 요약이 접히지 않고 첫 화면에 보임, <=64px 행, 원문 이유 펼침, overflow |
| 9. 이동 | 실제 하단/분석 메뉴를 통한 수익률·수출·발굴·LAB·기록 순회; 직접 진입 HTTP200, 알 수 없는 경로 안내 |
| 10. 지연/실패 | held 공시 응답·503·결측, 시세/뉴스 독립 렌더, 해당 요청만 복구; 수출 일부 실패와 전체 홈 API 장애 복구 |

현재 106개 test × 4개 프로젝트 = 424회. 기존 87개 검사를 유지하고 독립 로딩·재시도·날짜 지정 복귀·상세 모듈 장애·성능 상태 분류·거장 lazy 복구 19개를 추가했다. 데스크톱 Chromium 1440×900, Android Pixel 5 393×851, 좁은 Chromium 320×693, 작은 iPhone SE WebKit 320×568. 기기 설정에는 touch/device scale/mobile 동작도 포함된다. 변경 범위·재현·성능 조건은 [로딩·UX 개선 기록](UX_LOADING_IMPROVEMENTS_20261008.md), 이관 한계는 [이관·점검 기록](CODEX_TRANSFER_AUDIT_2026-10-08.md)을 참고한다.

`tests/e2e/accessibility.spec.mjs`는 실제 GitHub 오픈소스 `@axe-core/playwright` 4.13.0으로 17개 화면/상태의 WCAG 2 A/AA·2.1·2.2 AA 규칙을 검사한다. 홈, 검색 dialog, 관심, 상세, 수익률, 밸류에이션, 전체 히트맵, 선정, 발굴, LAB, 분석 메뉴, 메모리 가격, 수출 요약/반도체/화장품/철강/석유제품이 대상이다. 메모리 503 상태도 검사한다. 대비·ARIA 위반을 숨기는 화면 제외는 없다.

- 수출·메모리·밸류에이션 탭의 방향키/Home/End, Enter/Space 활성화, rerender 후 초점, roving tabindex, tab/tabpanel 연결과 lazy 요청 보존을 검사한다.
- 보이는 이름·수치·축약 설명과 accessible name, 비동기 선정 상태 및 관심 토글의 정합성을 별도 assertion으로 검사한다. core 4.13의 `label-content-name-mismatch`는 기본 비활성인 실험 규칙이고, 인접한 한글 inline 문구의 공백을 처리하는 방식이 최신 core와 달라 기본 설정을 유지한다. 이름 회귀는 각 실제 DOM 문구가 이름에 같은 순서로 포함되는지 직접 검사한다.
- 유일한 명시적 규칙 예외는 `meta-viewport`다. 기존 실제 Toss 심사 반려 대응인 핀치 차단을 유지한다. 근거/한계/소스·라이선스는 [오픈소스 검토 기록](OSS_REVIEW_2026-10-07.md)과 [기존 반려 대응](REVIEW_FIXES_20260921.md)을 참고한다. 자동 검사 통과는 전체 접근성 인증이 아니다.

별도 `integration` test는 다음 관계를 검사한다.

- 시세 응답 → 실제 `liveQuoteStore` canonical 처리 → 홈/관심/상세 가격·양/음/0 등락률. 오래된 시세로 최신값이 롤백되지 않는다.
- 월간/반도체/산업 응답 → 실제 export normalizer → billion USD에서 억달러로 변환한 표시값, 월별 막대 높이, DRAM의 메모리 증감액 기여도.
- 선정 응답의 추천가/점검가 → 개별 수익률 → 평균/플러스 비율/평가 분모. 결측 제외, EXIT와 기술 경고의 우선 상태도 확인한다. 공유 백엔드 전체 선정 계산을 프런트에서 재구현하지 않는다.
- TrendForce 공개 응답 → 활성 메모리 가격 그룹 → 평균가/고저가/등락률·이력 개수. DRAM 칩·NAND 칩·NAND 웨이퍼·DRAM 모듈·GDDR를 순회하며 HBM 미제공 안내와 독립 재시도를 보존한다.
- 선정 성과와 예상/실적 PER의 `null`·빈 문자열·실제 0 응답 → 기존 `finiteNumber` 처리 → 대시/0 표시 및 비교 막대. 전체 지표와 비교 행이 같은 결측 의미를 유지한다.

`tests/fixtures/export-recovery.mjs`는 기존 `export_recovery_qa.mjs`의 fixture를 공용화한 것이다. 기존 검사도 같은 데이터를 import한다. 신규 `tests/e2e/data.mjs`는 이를 확장해 12개월·서로 다른 산업 값을 제공한다. 기존 검사는 삭제하지 않는다.

## GitHub Actions와 배포 조건

- PR → `Main regression contract`: 기존 Node 테스트, 기존 approved audit browser QA, 4개 브라우저 프로젝트를 검사한다.
- main push → `Sync Render preview branch`의 `qa`가 **같은 reusable workflow**를 먼저 실행한다. 전부 성공해야 `sync`가 시작된다.
- `sync`는 검사한 `github.sha`를 명시적으로 checkout/push한다. 검사 도중 main이 바뀌면 기존 실행은 promotion을 건너뛰고 새 실행이 자기 커밋을 검사한다. 최신 main을 fetch했다는 이유만으로 미검사 커밋을 배포하지 않는다.
- 기존 Render 전용 수정의 ancestry 검사를 유지한다. force push를 하지 않으며 `feat/apps-in-toss-mvp`에만 promotion한다. 기존 Render Static Site/배포 브랜치 구조는 유지된다.
- 기존 `Mobile release QA`, `Apps in Toss bundle`, `Live backend contract smoke` workflow도 유지된다. 핵심 E2E는 공급자 가용성/실시간 숫자/Render cold start에 의존하지 않는다.
- CI retry 1회는 분석 증거용이다. `failOnFlakyTests`로 재시도 후 통과한 flaky 검사도 배포를 막는다. matrix fail-fast를 끄므로 다른 기기의 결과도 남는다.
- 토큰은 GitHub가 제공하는 기본 `GITHUB_TOKEN`만 사용한다. 외부 Secret/LLM 키가 필요 없다.

PR의 merge 자체를 강제 차단하려면 저장소 관리자가 Settings → Branch protection/rulesets에서 `test`, `audit-browser`, `E2E (desktop-chromium)`, `E2E (android-chromium)`, `E2E (narrow-chromium)`, `E2E (iphone-small-webkit)`을 required checks로 선택한다. 이번 연결에서는 branch protection API가 HTTP403이므로 관리자 규칙은 변경하지 않았다. Render promotion gate는 workflow의 `needs: qa`로 적용한다. 직접 Render 수동 배포/관리자 우회/배포 브랜치 직접 push까지 막는 권한 규칙은 별개다.

## 실패 증거와 Codex 분석

각 CI job의 `e2e-<project>-<attempt>` artifact를 14일 보관한다.

- `playwright-report/`: HTML report, 성공한 핵심 홈/기록/반도체 screenshot 첨부.
- `test-results/`: 실패 screenshot, 첫 실패부터 trace, 실패 video, 접근성 DOM snapshot, JSON 결과.
- 각 test의 `api-calls`/`browser-errors` 첨부: 요청 path/query, 치명적 오류, mock 누락 또는 뜻밖의 외부 요청.
- 접근성 test의 `axe-audit` JSON: 엔진 버전, 위반 selector/원인/대비값/수정 안내, `incomplete`와 통과 규칙. 자동 판단이 불가능한 `incomplete`는 수동 확인 대상으로 남긴다.

Codex에게 실패 job/commit/artifact를 전달한다. `npm ci` → 해당 커밋 build → 해당 프로젝트/test 재현 → trace/응답/화면 대조 → 테스트 가정 오류와 앱 버그 구분 → 기존 결정 로그 확인 → 최소 수정과 회귀 검증 순서로 진행한다. test를 느슨하게 바꿔 앱 버그를 숨기지 않는다.

## 실제 API 진단

```bash
npm run build
npm run test:e2e:live
# 배포 앱의 실제 데이터와 검사할 때
E2E_BASE_URL=https://chart-view-toss.onrender.com npm run test:e2e:live
```

`playwright.live.config.mjs`/`tests/live-e2e/live.spec.mjs`는 합성 데이터 없이 삼성전자 검색·시세와 화면, 실제 DRAM 12개월 응답·표시, 실제 선정 성과 분모·평균·플러스 비율을 대조한다. 숫자를 하드코딩하지 않는다. `Live E2E diagnostics`는 수동 실행 가능하며 외부 공급자 실패를 결정론적 배포 gate와 섞지 않는다. 기존 live backend contract 검사도 유지한다.

프록시를 사용하는 Codex 환경에서는 `E2E_PROXY_SERVER`를 설정할 수 있다. 해당 모드에서 Node의 기존 CA 신뢰로 실제 HTTP 응답을 전달할 뿐 fixture로 대체하지 않는다. TLS 검증을 끄지 않는다. 네트워크가 없는 환경에서는 live 진단 결과를 공급자/환경 문제로 명확히 기록한다.

## 새 기능을 추가할 때

1. 기존 `AGENTS.md`/결정 로그/가까운 QA를 먼저 확인하고, 새 동작인지 기존 회귀인지 분류한다.
2. `tests/e2e/`에 `fixtures.mjs`의 `test, expect`를 import한 test를 추가한다. 기본 fixture는 모든 test에 자동 설치되고 새 테스트도 4개 프로젝트에서 실행된다.
3. API 계약이 추가되면 `data.mjs`의 명시적 payload와 필요한 결측/실패 변형을 함께 추가한다. 미등록 API/외부 요청은 test 실패다. 공급자 데이터 구조 변경을 fixture만 고쳐 숨기지 말고 live 계약도 확인한다.
4. 실제 메뉴/role/accessible name 또는 기존 안정적인 ID·data 동작 속성을 우선 사용한다. 필요한 경우 최소 `data-testid`를 추가한다. CSS 순서/nth-child나 고정 sleep으로 준비 상태를 판단하지 않는다.
5. UI 숫자를 검사할 때 원시 응답·실제 가공값·화면과의 관계를 검증한다. 변화/0/누락/단위/분모를 포함한다.
6. 모바일이면 `noOverflow`, `contained`, `touchable`과 핵심 화면 screenshot을 사용한다. 가까운 선택기·결과가 같은 화면에 들어오는지도 검사한다.
7. `npm run qa:prepush`, 관련 기존 QA, 필요시 live 진단을 직접 실행하고 발견한 앱 버그와 검증 증거를 결정 로그에 기록한다.

## 남은 범위와 비용

브라우저의 Android/iPhone 에뮬레이션은 실제 Toss Sandbox/WebView 검증을 대신하지 않는다. 네이티브 SDK back/root exit, 계정 분리, 키보드/백그라운드 복귀는 기존 실기기 release gate에 남는다. 백엔드 provider 수집/정합성 전체와 모든 분석 도구의 UI를 이 회귀 suite만으로 보장하지 않는다. 기존 관련 QA를 계속 유지한다.

추가 전체 점검의 반례·수정·검증 범위는 [전문 역할 QA 기록](COMPREHENSIVE_QA_2026-10-07.md)을 참고한다.

이번 작업은 핵심 화면 screenshot을 증거로 저장하고 geometry 회귀를 자동 비교한다. OS/글꼴 차이를 숨기는 임의 허용치를 두는 픽셀 baseline 시각 비교는 추가하지 않았다.

tester-army/e2e는 사용하지 않았다. Codex가 코드·실제 브라우저·실패 trace를 직접 분석하고 CI는 결정론적인 Playwright/axe 검사만 실행한다. 핵심 CI에 외부 API 호출/LLM API 비용은 없다. 수동 live 진단은 기존 Chart View 백엔드의 일반 조회만 사용한다. GitHub Actions/Artifact 사용량은 계정의 기존 무료 한도 및 요금 정책을 따른다. 새 유료 서비스나 Render 플랜은 만들지 않았다.
