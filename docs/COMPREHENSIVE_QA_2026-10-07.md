# 전문 역할과 설치 도구를 활용한 전체 점검

기준: `shoon94parkk-del/chart-view-toss`, main `8023741a7a36946e6c3604f0a8298aa8c43867ba`. 기존 vanilla Vite/Lightweight Charts/Toss SDK와 공유 backend·수집·Render 설정을 유지한다.

## 실제 활용

agency-agents에서 채택한 프로젝트 역할을 현재 Codex 하위 에이전트에 적용했다. 모바일 QA, 데이터 QA, 장애/의존성 검토가 독립적으로 조사하고 서로 다른 파일만 수정했다. 주 에이전트가 통합·공용 실행을 담당하고 별도 검토자가 수정본을 읽었다.

| 설치 도구 | 이번 사용 |
| --- | --- |
| agent-browser 0.38.2 | 기존 fixture를 연결한 실제 앱 snapshot과 브라우저 상태 확인 |
| Lighthouse 13.5.0 | 같은 모바일 home harness로 수정 전후 측정; 점수는 진단용 |
| Playwright 1.55.0 + axe 4.13.0 | 전체 경로 탐색, 실제 반례, 확대/저장/복구 상태와 4기기 회귀 |
| fast-check 4.10.2 | seed `20261007`, 8개 속성 × 2,000 = 16,000 사례. 수출 결측·단위·분모, 선정 상태, 필터 원 응답 보존, 실적 비교, 수정한 macro 관측 공백 검사 |
| dependency-cruiser 18.5.0 | API 공유 importer 18개와 저장·검색 변경 영향 확인; no-config 결과는 아키텍처 인증이 아님 |
| Knip 6.40.0 | unused/unlisted advisory만 검토. 기존 QA·소스 삭제나 autofix 없음 |

**tester-army/e2e와 claude-mem은 소스 조사 상태이며 런타임/MCP/worker/hooks를 설치·연결하지 않았다.** 이번 QA를 이 두 도구로 수행했다고 주장하지 않는다. 장기 맥락은 기존 Git 문서와 인수인계로 보존한다. 별도 LLM API·API 키·서비스를 추가하지 않았다.

## 재현한 앱 문제와 최소 수정

| 문제 | 전 → 후 | 소스 / 반복 검사 |
| --- | --- | --- |
| 상세 6개 재무지표의 결측 표시 | 빈 값/공백 → `0배/0%`, 비수치 → `NaN` → 기존 finiteNumber로 대시; 실제 0/문자열 0 유지 | main.js; comprehensive-data |
| 경제지표 미니 차트 | 결측 → 가짜 0, 관측 공백 연결 → 결측 제외·원 위치 유지·구간 분리; 고립한 관측은 점으로 표시 | dataPresentation.js; Node + API→UI |
| 메모리 가격 공백 | 공백 → `$0.00`, 가짜 변동·고저가·누적 선 → 결측 안내; 실제 0 유지 | memorySpotView.js; API→가격/변동/범위/차트 |
| 잘못된 저장 목록 요소 | `[null]`, `[123]` → 홈 JS 오류 → 정상 항목만 메모리에서 복구 | storedLists.js; Node + 홈/관심/상세/비교. 원 저장 bytes 보존 |
| 검색 부분 장애 | 원/별칭/DIRECT 확인 중 하나 실패 → 정상 결과도 사라짐 → 독립적으로 확인된 결과 유지·부분 실패 안내·force 재시도 | api.js/searchIdentity.js/stockSelector.js; Node + 8개 장애/취소/저장 회귀 |
| 펼친 상태와 부 화면의 읽기 대비 | 뉴스 정렬·위험 배지·정보 안내·공시 질문 조건·저장 질문·거장 5개 전략 근거의 대비 부족 → 기존 배경/크기 유지하며 foreground 보정 | accessibility.css; 축소/펼침 axe |
| 모바일 독립 조작 영역 | 관심 해제 32px, 원문 15px 높이 등 → 44px 영역 | accessibility.css; 실제 hit-test/click trial·가격과 겹침 없음·행 높이 유지 |
| 경제지표 차트 ARIA | role 없는 div의 aria-label → role=img와 실제 시계열/빈 상태 이름 | main.js; axe + accessible-name |

검증된 종목만 부분 성공으로 보존한다. DIRECT 추정만 있는 검증 실패, 전체 통신 실패, 취소는 오류를 유지한다. API freshness/cache TTL, 공시·시세·차트 기준과 출처, 수출/PICK 계산, 네이티브 저장 namespace를 바꾸지 않는다.

초기 구현을 실제 실행하며 추가 확인한 문제도 반영했다. 확대된 관심 해제 영역의 가격 box 2px 겹침은 배경·아이콘 위치와 compact 행을 유지하며 수정했다. 고립 macro 관측값의 빈 SVG는 독립 검토 후 점으로 표시했다. 새 테스트의 동일 hash 재진입에 새 응답을 기대한 가정은 reload로 바로잡았고, 기술 지표만 쓰는 미너비니는 존재하지 않는 DART 버튼 대신 실제 일봉 출처·관측 기준을 검증한다. timeout/대비/geometry 기준을 느슨하게 만들지 않았다.

## 검사 범위와 실행

사전 탐색: 27개 경로 × 4 viewport = 108회, 추가 48개 조작 영역과 11개 펼친 상태 검사. 사전 탐색의 가로 overflow·치명적 JS 오류·blank screen은 0이었지만 위 결측·부분 장애·대비·작은 조작 영역 반례는 별도 조작으로 재현됐다.

기존 46개 브라우저 사례를 유지하고 21개를 추가했다. 전체 67개 × desktop Chromium / 320px Chromium / Android / iPhone SE WebKit = **268회**. 신규 3개 데이터 사례 안에서도 여러 결측/0/관측 구간 입력을 실제 API 응답으로 순회한다. 19개 Node 회귀를 추가해 총 **282개**다.

```bash
npm run qa:prepush
npm run test:e2e -- tests/e2e/comprehensive-data.spec.mjs
npm run test:e2e -- tests/e2e/comprehensive-runtime.spec.mjs
npm run test:e2e -- tests/e2e/comprehensive-mobile.spec.mjs
npm run --prefix tools/codex audit:mobile
```

공용 build/report와 Lighthouse는 직렬 실행한다. Codex Linux의 별도 글꼴/기존 browser library 설정은 로컬 환경 보정이며 앱 CSS나 CI 계약으로 추가하지 않는다. CI는 기존 fonts-noto-cjk와 브라우저 OS dependency 설치를 사용한다.

결과와 배포의 확정 상태는 이 문서의 후속 결과 기록 및 PR/Actions 링크를 따른다. 사전 탐색을 최종 회귀 통과로 해석하지 않는다.

## 지속 적용과 한계

새 사례는 기존 `tests/e2e/fixtures.mjs`를 사용하고 같은 4기기 CI에서 자동 발견된다. 저장 손상은 configurable `storedLists` fixture로 시작 전에 주입하며 앱 스크립트는 변조하지 않는다. 새 API는 명시적 fixture가 없으면 실패한다. 원 응답→실제 처리→표시 assertion과 독립적인 결측·0·구간 연결 invariants를 같이 둔다.

PR와 main QA가 통과한 정확한 SHA만 기존 Render 브랜치로 정상 push한다. flaky 재통과도 실패로 처리한다. HTML report·screenshot·trace·video와 API/error/axe 증거를 14일 보존한다. workflow/Render 인프라를 새로 만들지 않는다.

실제 Toss Android/iOS Sandbox·SDK back·계정 전환·키보드/복귀는 실기기 gate로 남는다. 공급자 원자료/수집 전체 정확성, 제거된 외부 도구 메뉴와 모든 열린 팝업의 배경 행은 이번 자동화로 보장하지 않는다. 실제 API 진단과 고정 fixture 회귀를 구분한다. API 비용이 새로 발생하는 LLM 경로는 없다. 기존 Codex 이용량·GitHub Actions/Artifact·Render의 기존 요금 정책은 그대로다.

## 확정한 로컬 실행 결과

| 실행 | 결과 |
| --- | --- |
| npm run qa:prepush | Node 282/282, production build·26개 직접 진입 파일 검증, E2E 268/268 통과. 실패·flaky·skip 0 |
| 기존 추가 모바일 QA | financial_flow, mobile_continuity, guru_investing, review_validation, insight_research, insight_followup, watch_quote_parity 7개 모두 통과 |
| 실제 shared API + 로컬 production 앱 | 삼성전자 검색/시세, DRAM 12개월, 실제 선정 성과 3/3 통과. 합성 응답 없음, TLS 검증 유지 |
| 생성 데이터 | 전문 데이터 QA 16,000 사례 + 기존 도구의 4,000 사례 통과; 별도 실제 0 표시 검사 통과 |
| Lighthouse 모바일 fixture | 초기 전/후 99/96, 가까운 시점 반복 전/후 94/98. LCP 각각 2,105/2,704ms와 3,016/2,104ms; warnings 없음 |
| 독립 검토 | 고립 macro 관측의 빈 SVG를 발견해 실제 점으로 보완; 수정 후 추가 실질 회귀 발견 없음 |

Lighthouse는 같은 도구·글꼴·viewport·API fixture로 직렬 실행했다. 점수 변동이 baseline에도 존재하므로 속도가 개선됐다고 주장하지 않는다. 실제 공급자 응답 속도나 cold start를 이 fixture 측정으로 보장하지 않는다. freshness/TTL을 약화하지 않았다.

추가 기존 QA의 두 가정도 확인했다. financial_flow는 현재 승인된 접힌 산업 근거를 실제 산업 버튼으로 열도록 보완했고 기존 수치/출처/왕복 assertion을 유지했다. mobile_continuity의 380px 조건은 로컬 DejaVu 기본 폰트에서 **전후 똑같이 381.375px**였다. 격리한 기준 커밋과 동일 harness로 이를 확인한 후 표준 Liberation Sans/Noto 환경에서 원래 스크립트가 320/390/430px 모두 통과했다. 앱 글꼴·레이아웃·380px 기준은 바꾸지 않았다.

실패 재현 JSON/스크린샷, 첫 실패 trace/report, 전체 최종 로그, 기준 커밋의 격리 build와 성능 4개 원본은 `/workspace/scratch/chartview-comprehensive-review/`에 있다. 임시 증거는 새 클라우드 머신에 자동 보존되지 않는다. 지속 회귀와 결정은 아래 Git 파일에 보존하며 CI 실행의 artifact는 기존 workflow가 업로드한다. `axe-offscreen-contrast-oracle` 첨부의 위반은 검출 능력을 확인하려고 잠시 주입한 예상된 결과다. 원 스타일 복원 뒤의 정상 axe gate는 별도 첨부로 구분한다.

## 추가/수정 파일

- 앱: `src/main.js`, `src/api.js`, `src/searchIdentity.js`, `src/stockSelector.js`, `src/storedLists.js`(추가), `src/dataPresentation.js`, `src/memorySpotView.js`, `src/accessibility.css`.
- Node 회귀 추가: `tests/dataPresentation.test.mjs`, `tests/searchReliability.test.mjs`, `tests/storedLists.test.mjs`.
- E2E 추가: `tests/e2e/comprehensive-data.spec.mjs`, `tests/e2e/comprehensive-runtime.spec.mjs`, `tests/e2e/comprehensive-mobile.spec.mjs`.
- 기존 QA 재사용/보완: `tests/e2e/fixtures.mjs`, `tests/financial_flow_qa.mjs`.
- 실행/맥락 기록: `README.md`, 이 문서, `docs/AUTOMATED_QA.md`, `docs/CODEX_HANDOFF.md`, `docs/project-memory.md`, `docs/decision-log.md`, `docs/regression-guardrails.md`.

GitHub 최종 검증은 해당 PR의 Checks와 main의 Sync Render preview branch 실행에서 확인한다. 로컬 통과만으로 CI 또는 배포 완료를 주장하지 않는다. 기존 서비스의 실제 배포 SHA와 live 상태, 배포 앱의 실제 데이터 검사까지 별도로 확인한다.
