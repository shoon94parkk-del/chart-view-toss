# 전체 사이트 감사 후 개선 · 2026-10-15

## A. 변경 요약

운영 커밋 `9bd17dbe410065eb09a743c72506be36c2bc4d30`을 기준으로 확인한 문제를 수정했다. main에서 작업 브랜치를 만든 뒤 운영 브랜치의 기존5개 커밋을 그대로 보존했다. 해당 기존 변경은 TOP10 성과 구현이며, 이번 수정에서 선정·성과 공식을 다시 변경하지 않았다.

- TOP10 응답이 늦게 도착해 이동한 홈을 덮어쓰는 문제를 화면 생명주기 검사로 막는다. 히스토리에서 보이는 행·날짜별 UI와 계산은 그대로다.
- 연구 질문의 저장본과 임시 편집본을 구분하고, 저장 중 추가 편집이 생긴 경우에도 현재 편집본을 저장 완료로 안내하지 않는다.
- 직접 지정한 기간으로 복귀할 때 기본1개월이 동시에 선택되는 표시 오류를 수정한다.
- 뉴스 태그의 대비를 개선하고 `/history/` 직접 진입 파일을 생성한다.
- 검색창에서 최근 본 종목5개를 기기 내 복원한다. 기존 관심 목록과 겹치는 행은 반복하지 않는다. 관심 정렬 설정도 저장하며, 긴 상세에서는 기존 바로가기 위에 현재 회사·기간을 작게 표시한다.
- 실제 관심 가격과 잠정 수출 요약이 준비되기 전에 성능 측정을 완료하던 조건을 고친다.
- 거장 API409에는 표시 중인 버전과 일치하는 작은 정적 근거만 허용한다. 공유 서버는 목록과 근거를 같은 Git 커밋에 게시한다. 잠정 수출 서버 응답에는20초 예산과 중복 수집을 막는 공유 작업을 적용한다.

PICK/TOP10의 장중 가격 ‘종가’ 표시와 보호 대상 글자 대비는 원래의 UI 변경 금지 지시에 따라 기록만 유지한다. 이 두 발견사항까지 수정했다고 표시하지 않는다. 실기기·콘솔·정책 확인은 별도 항목이다.

## B. 파일별 구현

| 파일 | 구현 |
|---|---|
| `src/main.js`, `src/top10HistoryView.js` | 최초 성공·실패 및 재시도에 현재 화면 검사, observer 정리. 기간 복귀 선택 상태 일치 |
| `src/researchCard.js` | 질문/비교 회사와 실제 저장본을 비교한 안내. 저장 완료 후 추가 편집 상태 보존 |
| `src/revisitPreferences.js`, `src/storage.js` | 최근 종목·정렬의 기존 Toss 계정별 저장,5개 제한·중복 제거·쓰기 확정·초기화·실패 처리 |
| `src/stockSelector.js` | 검색어가 없을 때만 관심 목록 다음에 겹치지 않는 최근 종목 표시. 기록 지우기·선택 상태·포커스 |
| `src/experience.css`, `src/main.js` | 기존 sticky 상세 바로가기에서 회사와 기간을 보조 표시 |
| `src/accessibility.css` | 뉴스 태그 대비만 보완. 보호된 PICK/TOP10 스타일 유지 |
| `src/api.js`, `src/guruEvidenceSource.js` | API 우선.409일 때만 동일 snapshotVersion·symbol의 게시 근거 읽기. 불일치/미게시 시 기존 대기 안내 |
| `src/exportMomentumView.js`, `scripts/performance-outcome.mjs`, `tests/production_performance_audit.mjs` | 관심·잠정 수출의 loading/ready/error 완료 기준. 오류·placeholder는 성공 시간에서 제외 |
| `scripts/export-preview-routes.mjs`, `tests/verify_preview_routes.mjs` | history를 포함한27개 직접 진입 파일 및 실제 빌드 검사 |
| `public/privacy.html` | 최근 종목·정렬의 로컬 저장·지우기 안내 |
| `tests/e2e/site-audit-regressions.spec.mjs`, `revisit-experience.spec.mjs` | 화면 덮어쓰기·임시 질문·직접 기간·직접 진입·실제 시세 완료·재방문 회귀 |
| 기존 E2E·Node 테스트 | 실제 새 의존성/DOM 형태를 반영한 fixture 확장. 선택 클래스가 옮겨진 기존 TOP10 테스트를 유지하고 symbol·가격 응답 계약 보강 |

공유 서버 변경: [chart_View PR150](https://github.com/shoon94parkk-del/chart_View/pull/150).

- `guru_snapshot.py`와 기존 수집 workflow: `static/data/guru_evidence/<version>/<symbol>.json`을 목록과 함께 게시. 현재·이전 버전을 유지하며 동일 버전 재게시 때도 이전 근거를 지우지 않는다. 기존 집계 파일과 API409는 유지한다.
- `export_momentum_service.py`: 수집 대기 전체에20초 응답 예산을 적용한다. 호출자가 포기해도 한 작업을 유지하고 중복 수집을 만들지 않는다. 실제 이전 값은 기존 `stale-error`, 저장값 없으면 기존503 구조로 응답한다. 기간·금액·계산·TTL·제공처 timeout은 유지한다.
- 첫 게시135개 근거는 기존 원응답과 전수 일치하고 파일당 최대29,477bytes다. 새 공급자 호출·배포 훅·유료 서비스는 없다.

### 이벤트와 저장

공식 `Analytics.log`와 `Review.request`는 기존 구현을 유지한다. 대표 전환 후보는 실제 저장 확정 뒤의 `watchlist_add_success`다. 버튼 클릭을 저장 성공으로 집계하지 않는다. 기존 attempt/success/failure, 허용목록·작업별 중복 방지·웹 미전송·후기30일 제한을 유지하며 임의 SDK 메서드나 이벤트를 만들지 않았다.

최근 종목은 성공적으로 표시한 종목의 코드·이름만 최대5개 기기에 저장한다. 검색어나 메모는 넣지 않고 시세 요청도 추가하지 않는다. 관심 목록과 동일한 익명 계정 namespace와 초기화를 사용한다. 최근 기록·정렬·관심 목록은 분석 이벤트로 보내지 않는다. 저장 실패는 성공 상태를 만들지 않는다.

## C. 검증과 재현

최종 수치와 수행 상태는 [validation.json](audits/2026-10-15-site-improvements/validation.json)에 기록한다. [보호 범위 해시](audits/2026-10-15-site-improvements/protected-scope.json)는 운영 기준과 비교한 실제 파일·함수 결과다. PICK/LAB 계산·점수·선정·기록·원장 API와 TOP10 행/일자별 마크업은 변경하지 않았다.

최초 전체 실행은866개 통과·WebKit2개 실패였다. 두 검사는 주 응답 도착 전부터1.5초를 세는 장비 속도 가정이 있었고, 원래 검사도 단독 실행에서는 모두 통과했다. 주 응답 본문이 실제 도착했는지 먼저 확인하고 보조 응답이 여전히 차단돼 있는지를 명시적으로 검사하도록 보강했다. 표준 조건 대기를 사용하며, 보조 응답을 먼저 해제하거나 데이터를 캐시로 대신하지 않는다. 기존 결합형 Promise.all 구현이라면 보조 응답 차단 중 성과 표시를 할 수 없어 여전히 실패하는 검사다. PICK 제품 코드는 변경하지 않았다. 수정 후 해당 전체 파일을4개 프로젝트에서 다시 검증하고 PR의 전체 CI도 확인한다.

짧은300ms 빌드의 최초 Mobile QA는 다른 빌드/브라우저 실행과 겹친 상태에서 홈 대기로 실패했다. 원래 명령을 완료된 빌드에서 독립 재실행해 전체 Mobile QA 통과를 확인했다. 이 최초 실패도 보존하며 제품 결함으로 단정하거나 기록을 삭제하지 않는다.

새 회귀의 최초 실패와 이후 성공을 별도로 보존했다. 실패 테스트를 제거하거나 허용오차로 숨기지 않았다. 이전 TOP10 selector는 실제 DOM 위치로 수정했고, 새 성과 흐름에는 종목 symbol과 numeric 가격 시계열을 넣었다. 뉴스 태그 fixture도 실제 운영 응답 형태를 포함하도록 보강했다.

실제 데이터 E2E는 수정한 로컬 웹과 PR150의 공개 데이터 브랜치를 사용했다.5개 사례가 통과했으며, 후보가 있는4개 전략은 실제 API409 후 **같은 버전 정적 파일의 HTTP200**과 화면을 확인했다. 오닐은 실제 후보 없음이다. 이는 운영 Render 코드가 교체됐거나 backend409가 사라졌다는 뜻이 아니다. 운영 backend contract smoke는 별도로 실행했다.

로컬 조건: Node24.21.0, Playwright1.55.0, Chromium/WebKit, 한국어 fontconfig. 프록시 환경의 실제 데이터 조회는 기존 TLS 신뢰를 유지한 relay를 사용했다. 새 context는 브라우저 초기 상태이며 백엔드 cold start와 다르다. 성능은 같은 harness·viewport·원격 API로 각3회 비교하고 오류/미완료를 성공 시간에서 제외한다.3회 표본으로 실사용자 p95나 개선 효과를 보장하지 않는다.

| 로컬 검증 | 결과 |
|---|---|
| Node 전체 | 547 통과 |
| Vite·직접 진입 | 통과,27경로 |
| 최초 전체 E2E | 866 통과·WebKit2개 시간 가정 실패. 원본 보존 |
| 원래 실패2개 단독 재현 | 제품·테스트 변경 전2개 통과 |
| 조건 기반으로 보강한 해당 전체 파일 | 4프로젝트20개 통과, `qa:prepush` 재실행 |
| 원래 Mobile release QA | 완료 빌드에서 독립 실행 통과.320/360/390/430·5xx·timeout·offline 포함 |
| 실제 데이터 E2E | 수정 로컬 웹+실제 API/PR 데이터로5개 통과 |
| 운영 backend smoke | 통과.10월1~10일 포함 |
| 추가320/390/430 점검 | 24개 화면/검색 조합, 가로 넘침·pageerror0. 실제 뉴스·최근 검색창 axe 위반0 |
| 공유 서버 | Python768·Node21·Web 번들 freshness 통과. 기존/의존성 warning79개 |
| AIT | 실제 재생성,10,460,307bytes. 소스/공개 파일 및 compiled assets 일치 확인 |

추가 반응형 도구의 최초 실행은 localhost가 프록시로 전달돼403 `Loopback targets forbidden`을 받은 환경 오류였다. 로컬 직접 접속과 원격 실응답 relay를 구분한 뒤 같은 화면을 재확인했다. 제품 코드나 실제 데이터를 고쳐 통과시킨 것이 아니다. 측정 도구는 배포 전 운영 화면에서도 작동하도록 새 상태 속성이 없는 기존 마크업을 지원한다. 기존 운영 사이트에서 관심종목 실제 가격과 수출1~10일 digest까지 기다린 독립1회 검증도 모두 ready였다. 실패·미완료가 성공 시간에 포함되지 않는4개 Node 회귀를 추가했다. [원본](audits/2026-10-15-site-improvements/performance-legacy-production.json)은 배포 후 성능 비교가 아니라 도구 호환성 확인이다. 원격 전체 CI의 최종 판정은 이 문서가 포함된 PR의 정확한 head 체크를 따른다.

같은390×844 harness, 각3회의 새 context 중앙값:

| 완료 조건 | 변경 전 | 변경 후 |
|---|---:|---:|
| 홈 주요 시장·히트맵 준비 | 1,401ms | 711ms |
| 상세 가격 준비 | 1,239ms | 483ms |
| 수익률 표 준비 | 441ms | 411ms |

이는 별도 시점의 동일 harness 관측이며 서버/CDN 캐시와 제공처 변동이 섞여 있다. 수치 차이 전부를 이번 코드 효과로 해석하지 않는다. 같은 세션 복귀 중앙값은 홈63→77ms, 상세77→68ms, 수익률41→41ms였다. 개선한 완료 기준으로 측정한 현재 관심 가격은247ms, 잠정 수출 요약은493ms다. 이 둘은 이전 잘못된 완료 기준과 개선율을 비교하지 않는다. 원본은 `performance-before.json`/`performance-after.json`에 있다.

```bash
npm ci
npm run qa:prepush
npm run build:ait
# CI와 같은 짧은 timeout용 빌드는 실제 데이터 빌드와 구분한다.
VITE_CHARTVIEW_API_TIMEOUT_MS=300 npm run build
QA_BASE_URL=http://127.0.0.1:4173 node tests/mobile_release_qa.mjs
# 실제 공개 자료 검증 시 원래 설정으로 다시 build한다.
npm run build
npm run test:e2e:live
node tests/live_api_contract.mjs
PERF_RUNS=3 PERF_PHASES=cold,warm PERF_ROUTES=home,detail/005930.KS,chart \
  PERF_OUTPUT=/tmp/chartview-performance.json node tests/production_performance_audit.mjs
```

수출1~10일 원자료·월간 통계·기존 계산은 유지한다. 실제10월 잠정치와 산업별 표시를 live 계약과 UI로 검증하며, 데이터를 임의 값으로 대체하지 않는다. 원래 최초90초 timeout과 단일 후속 성공 기록을 전체 안정성 증거로 바꾸지 않는다.

## D. 토스 가이드와 외부 확인

코드에서 구현·보존한 항목은 검색 시작, 관심 우선 접근, 저장·실패 피드백, 실제 데이터 기반 변화, 자발적 인라인 후기, 최소 수집이다. 웹 브라우저의 성공을 실제 Toss SDK 수집이나 native 기기 검증으로 표시하지 않는다.

운영자 확인 항목:

- 콘솔의 대표 전환 `watchlist_add_success` 등록·실제 수신. DAU·D1/D7 cohort 정의, 시간대·중복 제외·분모와 p50/p95 제공 여부. 기존 방문 heartbeat와 합산 금지.
- 토스 분석/호스팅 로그의 실제 보관·삭제, Redis 활성 설정. 로컬 초기화가 서버 분석 기록 삭제를 뜻하지 않음.
- Android/iOS Sandbox: 뒤로가기·루트 종료·외부 링크·Safe Area·실제 키보드·백그라운드 복귀·계정별 저장·후기 지원/거절/간격.
- 기존 PICK/LAB 허용 범위·제공처 재배포 권리·TrendForce 조건·콘솔 scheme. 코드로 승인됐다고 해석하지 않음.
- 보호 범위인 PICK/TOP10의 대비와 장중/종가 안내는 이번 수정 제외. 임의 숨김·이름 변경·면책 약화 없음.

2026-10-22 노출 가이드 대응은 제품 품질 개선 목표다. 출시·추천·부스팅 선정은 별도 심사와 실제 지표에 달려 있다.

## E. 브랜치·게시·배포

프런트 작업 브랜치는 `fix/site-audit-improvements-20261015`, 백엔드는 `fix/versioned-guru-publication-20261015`다. main 병합·Render 배포·Toss 업로드는 자동 수행하지 않았다. 실제 생성 AIT의 크기·해시와 최종 커밋은 validation 기록에서 확인한다.

PR150의 데이터 게시 경로가 main에 반영된 뒤 프런트의 같은 버전 읽기가 공개 데이터와 연결된다. 이후 수집도 작은 근거와 목록을 함께 게시한다. 백엔드20초 응답 변경은 기존 수동 Render 절차로 정확한 검증 main을 배포한 뒤 운영에서 확인해야 한다. 배포 브랜치를 강제로 덮어쓰지 않고 기존 guard와 QA를 유지한다.
