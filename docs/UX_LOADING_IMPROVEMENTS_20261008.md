# 로딩·실패 복구·조건 UX 개선

대상: `github:shoon94parkk-del/chart-view-toss`. 기준 main은 `07f78923dde4afc8514fe8df08de7e42096aee09`. 공유 백엔드·수집·금융 계산·CSS·Render 서비스 설정은 이번 변경 범위에 포함하지 않는다.

## 사용자가 확인할 변화

- **선정 기록**: 성과와 목록은 bootstrap만 준비되면 표시한다. 느리거나 실패한 사후점검은 별도 상태·재시도로 안내한다. 점검 미완료를 유지·검토대기 집계 0으로 꾸미지 않는다.
- **수출**: 월간 요약을 기다리는 동안 산업 탭을 사용할 수 있다. 화장품·철강·석유제품 등의 상세와 반도체 DRAM 분석은 월간 요약 장애와 독립적으로 표시한다. 재시도는 실패한 요청 경로만 갱신한다.
- **선정 목록 복귀**: 검색·필터·펼친 날짜별 기록·포커스·스크롤을 보존한다. 실제 뒤로 복귀와 홈에서 새 날짜 기록을 지정하는 진입을 구분한다. 지정 기록이 없으면 다른 기록을 대신 열지 않는다.
- **화면 모듈 장애**: 거장 투자법에 기존 분석 화면의 명시 재시도를 적용했다. 공시 비교·분기 실적의 모듈 장애는 해당 영역에만 표시해 가격과 차트를 보존한다. 재시도 버튼은 문서를 다시 불러오며 기기 저장 목록을 삭제하지 않는다.
- **조건 검색**: 접힌 조건 설정에도 현재 적용한 검색·시장·기술 조건 개수를 표시한다. 기술 조건 해제 시 종목 검색어를 유지한다.
- **성능 진단**: placeholder와 오류 fallback을 정상 데이터 표시 시간으로 집계하지 않는다. 자료 있음 / 빈 결과 / 자료 미제공 / 오류 / timeout을 구분하고 공개 CDN과 응답 body 완료를 측정한다. 새 브라우저 context 측정을 서버 cold start로 부르지 않는다.

## 변경 파일

앱: `src/pickLedger.js`, `src/exportMomentumView.js`, `src/main.js`, `src/api.js`, `src/analysisViews.js`, `src/detailModuleRecovery.js`.

진단: `scripts/benchmark-loading.mjs`, `scripts/performance-outcome.mjs`, `scripts/measure-site.mjs`, `tests/production_performance_audit.mjs`.

회귀: `tests/pickLedgerLoading.test.mjs`, `tests/exportLoadingIsolation.test.mjs`, `tests/detailModuleRecovery.test.mjs`, `tests/apiExplicitRetry.test.mjs`, `tests/lazyAnalysisRoutes.test.mjs`, `tests/pick_management.test.mjs`, `tests/e2e/pick-loading-recovery.spec.mjs`, `tests/e2e/export-loading-isolation.spec.mjs`, `tests/e2e/detail-module-recovery.spec.mjs`, `tests/e2e/ux-readiness.spec.mjs`, `tests/e2e/lazy-analysis-recovery.spec.mjs`. `tests/live-e2e/live.spec.mjs`는 실제 화장품·거장 5전략의 API→모델→UI 검사를 확장했다. 기존 거장 fixture를 `tests/e2e/guru-data.mjs`로 공유하고 `guru-coverage.spec.mjs`에서 재사용한다.

## 성능 비교 방법

동일 Chromium/Playwright 1.55.0, 393×851, 동일 고정 API fixture·시각·새 브라우저 context에서 각 화면 5회 측정했다. 관련 없는 사후점검 또는 월간 요약 응답만 1,500ms 늦춘다. 실제 공급자 지연·운영 전체 속도·Render 서버 cold start의 측정값이 아니다.

| 첫 자료 사용 가능 | 개선 전 중앙값 | 개선 후 중앙값 |
|---|---:|---:|
| 선정 성과 | 1,927ms | 148ms |
| 화장품 산업 | 1,910ms | 133ms |

전체 첫 실행은 423/424 통과였고 iPhone WebKit의 분기 모듈 재시도 한 건이 실패했다. `reportReviewView`가 같은 분기 모듈을 먼저 preload하면서 복구 URL이 누락된 실제 앱 버그였다. 분기 모듈이 먼저 자기 preload를 동기적으로 확보하게 순서만 수정했으며, 가격/차트·최종 DOM 순서를 유지했다. 실패 screenshot/trace를 보존했고 최종 전체 재검증은 424/424 통과했다.

원본 Node에서도 held 응답 아래 기존 PICK 렌더 실패, 기존 수출 탭 비활성화 실패를 확인했다. 브라우저에서는 응답을 해제하기 전에 실제 성과·목록·산업 값과 그래프를 검사한다. 숫자를 임의로 빨리 표시하거나 기존 검증을 제거한 결과가 아니다.

```bash
# 각각 동일 조건으로 빌드한 이전/현재 preview에 순서대로 실행한다.
BENCH_BASE_URL=http://127.0.0.1:4185 BENCH_OUTPUT=artifacts/performance/before.json node scripts/benchmark-loading.mjs
BENCH_BASE_URL=http://127.0.0.1:4186 BENCH_OUTPUT=artifacts/performance/after.json node scripts/benchmark-loading.mjs
```

## 검증과 CI

```bash
npm ci
npx playwright install --with-deps chromium webkit
# 공개 CDN 환경값은 fixture QA에서 비워야 한다. 이관 문서의 process-only override 참고.
npm run qa:prepush
npm run test:e2e -- tests/e2e/pick-loading-recovery.spec.mjs
npm run test:e2e -- tests/e2e/export-loading-isolation.spec.mjs
npm run test:e2e -- tests/e2e/detail-module-recovery.spec.mjs
```

로컬 최종 검증: Node 353/353, Playwright 106개 시나리오 × desktop/Android/320px/iPhone WebKit = 424/424 통과. skipped·unexpected·flaky 모두 0이다. 기존 approved audit 320/390/1440px와 mobile release QA(반응형·짧은 viewport·5xx·timeout·offline)도 통과했다. GitHub CI 및 실제 배포의 결과는 해당 PR과 완료 보고에 정확한 실행/배포 링크로 기록한다. 재시도·상태 분리 테스트는 기존 가격·등락률·수출/DRAM API→모델→UI 수치, 선정 분모/성과 계산, 접근성·터치·overflow 검사를 그대로 포함한다.

기존 `Main regression contract`가 새 spec을 자동 탐색한다. PR 및 main의 재사용 QA를 통과한 정확한 SHA만 기존 `feat/apps-in-toss-mvp`로 promotion한다. 실패 screenshot/video/trace/HTML report artifact는 기존 14일 보관 정책을 따른다. 새 배포 훅이나 LLM secret은 없다.

## 도구·한계·다음 작업

Codex 기본 coordinator와 3개 native subagent가 PICK 구현, 수출 구현, 독립 검토를 분담했다. `.agents/skills/chartview-qa`와 `chartview-agent-review`, 기존 역할·handoff 문서와 Playwright/axe를 사용했다. `tools/codex/setup.mjs --check`로 고정 도구/브라우저 설치를 확인했다. agency-agents는 기존 역할 설계 참고 자료이며 별도 모델 서버를 실행하지 않는다. tester-army/e2e와 claude-mem은 소스 조사 상태로, CI/MCP/worker/hook/자동 기억을 활성화하지 않았다.

OpenAI·외부 LLM API 호출/새 API key/새 유료 인프라가 없다. 현재 Codex 작업은 기존 Codex 이용량, CI와 기존 데이터 제공자·Render는 기존 계정 정책을 따른다.

거장 자료 부족을 후보 증가로 숨기거나 선정 기준을 완화하지 않았다. 재무 자료 수집·동일 기준일/공시 근거 품질은 기존 백엔드 계약대로 별도 점검한다. 웹 브라우저 Android/iPhone emulation은 실제 Toss Android/iOS Sandbox/QR 검증을 대체하지 않는다. 그 릴리스 조건은 `P0_RELEASE_GATE.md`에 유지한다.

새 기능은 해당 데이터의 primary와 optional 상태를 구분하고 기존 fixture에 실제 응답 구조를 추가한다. 한 개 성공 사례뿐 아니라 지연·503·빈 값·진짜 0·늦은 응답·화면 이탈을 재현하는 회귀를 추가하고 `qa:prepush`를 통과시킨다. 숫자 관계는 응답 기준으로 검증하며 시간 sleep이나 실시간 가격 하드코딩으로 통과시키지 않는다.
