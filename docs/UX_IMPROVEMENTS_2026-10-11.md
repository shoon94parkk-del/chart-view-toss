# 사용자 점검 후 우선순위별 개선 — 2026-10-11

대상: `github:shoon94parkk-del/chart-view-toss`, 기준 main `d4f3a9ff6eca2ed3d72d928869271c3a3ddf8552`, 구현 branch `improve/user-audit-20261011`. 별도 공유 백엔드 `chart_View`는 `86b790425d5348ee1bf5bead31a4e9af00ec8f84` 기준 `fix/guru-publication-readiness-20261011`에서 게시 검증만 보강했다.

사용자가 [종합 점검](UI_UX_AUDIT_2026-10-11.md) 후 우선순위별 구현을 요청했다. 기존 compact UI, 네 개 하단 메뉴, 공급자·시세·캐시 계약, Render 배포 경로와 결정론적 QA를 유지했다. 원래 점검 문서는 당시 상태를 보존하는 기록이며 이 문서가 후속 구현 상태를 설명한다.

## 구현한 개선

| 우선 | 항목 | 변경한 행동 |
|---|---|---|
| P1 | U02/U03 관심 저장·한도 | 저장 확인 후 목록을 확정하고 실패 시 원래 목록을 유지한다. 늦은 native 저장 완료가 다음 저장을 추월하지 않도록 직렬화·보상한다. 모든 신규 관심 등록은 20개 기준을 공유하며 기존 초과 목록은 보존한다. 비교 선택 6개는 별도다. |
| P1 | U01 거장 게시 | 버전 불일치 때 ‘선정 근거 게시 대기’와 부분 재시도를 표시하며 구버전 rollback을 막는다. 백엔드 릴리스 검증에 목록/CDN/근거의 동일 버전 검사와 실제 전략별 후보 근거 검사를 추가했다. **운영 서버 게시 동기화는 별도 잔여 작업**이다. |
| P1 | U04 PICK | 평균의 대상·방법·보유기간 차이·배당/비용 범위를 접힌 설명에 명시했다. 목록 필터와 전체 집계를 구분하고 서로 다른 가격 기준일을 실제 범위로 표시한다. 수익률 계산은 유지했다. |
| P1 | U05 TTM | 실제 제공처·조회 생성 시각·필드별 자료 시각을 모델에서 UI까지 보존한다. 누락 시 미제공으로 표시하고 연간/일반 시세 기준일을 TTM 자료 시각으로 복사하지 않는다. |
| P1 | U06 반도체 기준월 | 추이와 국가 자료의 기준월이 같을 때만 같은 월의 연구 근거로 결합한다. 불일치/누락이면 두 기준을 알리고 차트를 유지한다. 저장 연구에도 같은 조건을 적용했다. |
| P2 | U09 부분 실패 | TTM·기업 근거의 오류/정상 빈 자료를 구분하고 해당 요청만 재시도한다. HTTP200의 공급자 오류·잘못된 행도 실패로 다룬다. 차트·연간 결과·선택은 유지한다. |
| P2 | U14 밸류에이션 | 새 기간의 조회 실패/로딩 동안 마지막 유효 차트와 그 실제 기간을 유지하고 해당 기간만 재시도한다. 종목 변경·늦은 응답은 이전 차트를 새 자료로 보이게 하지 않는다. |
| P2 | U07 공유 | 산업 경로와 공개 품목/국가/지표 선택을 공유하고 새 브라우저에서 복원한다. 개인 관심 목록·메모·저장 연구는 포함하지 않는다. |
| P2 | U08/U11/U19 모바일 근거 | 조건·IDEA 전체 근거를 읽을 수 있는 펼침으로 제공하고 compact 행은 유지한다. 미국 섹터 목록에 티커와 회사명을 표시하며 재무 기준의 단어 중간 줄바꿈을 막는다. |
| P2 | U10/U12/U13 출처·재방문 | 독립 산업 응답의 실제 HS/월/단위/제공처/시각과 원자료 접근을 제공한다. 저장 연구 ‘모두 보기’를 유지하고 명시적 원문 열기 실패에 피드백을 제공한다. |
| P3 | U15/U16/U17/U18 편의 | 저장순서와 접근 가능한 위/아래 순서 편집, 종목 뉴스 칩 이동·조회 범위 안내, 접힌 조건의 실제 값 요약·입력별 오류 안내, 수출 보합의 별도 중립 비중을 추가했다. |

## 변경 파일

구현 파일을 기능별로 묶었다. 다음 목록의 기존 파일은 수정, 새로운 helper/CSS/spec는 추가다.

- 관심 저장: `src/main.js`, `storage.js`, `stockSelector.js`, 신규 `watchlist.css`; `tests/storage.test.mjs`, 신규 `tests/e2e/watch-persistence.spec.mjs`, `watch-runtime-errors.mjs`, `watch-runtime-errors.spec.mjs`, 기존 `tests/selection_usability_qa.mjs`.
- 거장·TTM: `src/api.js`, `guruInvestingModel.js`, `guruInvestingExtensions.js`, `guruInvestingView.js/css`; 신규 `tests/guruProvenance.test.mjs`, `guruRetryApi.test.mjs`, `tests/e2e/guru-recovery.spec.mjs`; 기존 `guru_investing_qa.mjs`, `tests/live-e2e/live.spec.mjs`.
- PICK: 신규 `src/pickPerformanceBasis.js`; `pickLedger.js`, `homeExtras.js/css`; 신규 `tests/pickPerformanceBasis.test.mjs`, 기존 `pickLedgerLoading.test.mjs`, `uiux_presentation.test.mjs`.
- 수출: `src/exportMomentumModel.js`, `exportMomentumData.js`, `exportMomentumView.js/css`, `exportResearchView.js`; 신규 `tests/export_evidence.test.mjs`, `tests/e2e/export-evidence.spec.mjs`.
- 분석: `src/analysisViews.js`, 신규 `analysisRecovery.css`; 신규 `tests/analysisFeedback.test.mjs`, `tests/e2e/analysis-recovery.spec.mjs`; 기존 `tests/analysis_qa.mjs`, `strategy_report_qa.mjs`.
- 공유·연구·뉴스: `src/experienceState.js`, `main.js`, `styles.css`, `savedResearchView.js`, `quarterView.js`, `researchCard.js`; 기존 `tests/experienceState.test.mjs`, 신규 `tests/e2e/share-industry-news.spec.mjs`, `user-audit-followup.spec.mjs`.
- 모바일: `src/valueDiscovery.css`, `emphasis.css`, `ideaView.js/css`, `marketMapView.js/css`, `investmentReview.css`, `mobileContinuity.css`; 신규 `tests/ideaEvidence.test.mjs`, `tests/e2e/mobile-evidence.spec.mjs`; 기존 `tests/mobile_density.test.mjs`, `value_discovery_qa.mjs`, `mobile_release_qa.mjs`.
- 기록: 원래 점검 문서·화면 증거, 실행 계획, 이 보고서, `README.md`, `AUTOMATED_QA.md`, `CODEX_HANDOFF.md`, `decision-log.md`, `project-memory.md`, `regression-guardrails.md`.
- 별도 백엔드: `scripts/verify_deployed_release.py`, `tests/test_guru_publication.py`, `tests/test_release_verification.py`, `.github/workflows/update-guru-screening.yml`, `docs/guru-publication-readiness.md` 및 기존 운영 기록. API·수집기·수치 계산은 변경하지 않았다.

## 회귀 테스트와 실행 결과

`npm run qa:prepush` 최종 종료 코드0. Node390/390, AIT 계약, production build, 정적 직접 진입26개 검증과 Playwright680/680이 통과했다. 브라우저 실행11분12.0초, 실패·skip·flaky0이다. 기능별 변경 전 재현과 변경 후 회귀도 별도로 확보했다. 테스트 중 고정한 source/test240개 파일의 hash가 끝날 때까지 동일함을 확인했다.

관심 저장64/64와 실제 runtime 오류 감지 대조4/4, 원래 실패한 iPhone 저장순서5회 반복도 통과했다. 기존 선택·분석·거장·밀도·모바일 continuity/value-discovery QA를 관련320/390/430px에서 실행했다. 첫 GitHub 검사에서 드러난 두 기존 QA의 화면 구조 가정을 수정한 후, 현재 빌드와 byte-identical한85개 파일의 독립 preview에서 IDEA를 포함한 모바일 릴리스 QA 전체와 조건검색320/390/430px 검사를 다시 통과했다. 독립 기능별 코드 리뷰와 최종 fixture 리뷰에 미해결 Important 항목은 없다.

[검증 요약·화면 증거](audits/2026-10-11/after/README.md)에 실제 운영 응답과 고정 fixture를 구분했다. 최종 전체 HTML/JSON은 `playwright-report/`, `test-results/results.json`에 있으며 첫 실패의 trace/screenshot/video는 `/workspace/scratch/chartview-ux-first-prepush-failure/`에 보존했다. 최종 로그는 `/workspace/scratch/chartview-ux-prepush-ci-followup.log`, 실제 데이터 재검사는 `/workspace/scratch/chartview-ux-live-verified.log`다. 로컬 scratch 경로는 Git 이관 대상이 아니며 CI 실패 증거는 기존 artifact로 확보한다.

추가된64개 시나리오는 실제 저장 거절/지연/재진입, 20개 한도·기존 초과 목록·비교 선택, 거장409와 구버전/TTM 부분 실패, PICK 분모·가격 날짜, 국가 기준월과 저장 조사, 공급자 오류·잘못된 HTTP200·부분 재시도, 출처 버튼, 보합 비중, 밸류에이션 응답 역전, RSI 오류 수정·초점, 산업 공유 수신, 전체 연구 접근과 원문 실패, 미국 티커·상세 Back·작은 화면 근거 펼침을 검사한다. 기존106개 시나리오의 홈·검색·관심·상세·DRAM·산업 탭·PICK·주요 이동·지연 대응 및 API→모델→UI 테스트를 삭제하지 않았다. 총170개를 네 브라우저에서680회 실행한다.

브라우저 QA는 desktop Chromium, 320px touch Chromium, Pixel 5급 Android Chromium, iPhone SE 크기 WebKit을 사용한다. 이 환경의 WebKit 라이브러리와 한국어 폰트는 scratch에서 준비했으며 프로젝트/CI의 요구 조건을 바꾸지 않았다. WebKit 검증은 실제 browser 실행이며 실제 iPhone/Toss 앱 실행은 아니다.

## 실제 오류와 테스트/환경 문제의 구분

앱 수정 대상은 저장 실패 후 목록 불일치, 신규 관심 한도 불일치, 부분 실패를 후보 없음으로 표시하는 문제, HTTP200 실패 캐시의 재시도 방해, 독립 렌더링한 원자료 버튼 미연결, 필터의 잘못된 숫자를 지워도 오류가 남는 문제, 새 기간 실패로 이전 차트 소실, 잘못된 기준월 결합 가능성, 누락된 공유/출처/재방문 경로와 보합 표현이다. 숫자 자체를 임의로 바꾸지 않았다.

별도로 테스트의 모바일 전용 selector를 desktop에서 클릭한 가정, fixture의 종목명/품목 키, 접힌 근거를 열지 않은 기존 QA는 실제 사용자 동작에 맞게 바로잡았다. 최종 첫 검사에서675/676이 통과한 뒤, WebKit이 새로고침 중 이미 처리한 fetch 실패의 브라우저 진단을 `pageerror`로 전달하는 판정 문제를 격리 재현했다. 실제 `window.error`·`unhandledrejection`은 발생하지 않았다. 관심 저장 테스트의 치명적 오류 감지는 앱 실행 전 설치한 실제 runtime 이벤트와 page crash로 검증하고, 브라우저 진단은 삭제하지 않고 별도 증거로 보존한다. 의도적인 동기 예외·미처리 Promise·문서 교체 직전의 미처리 오류가 같은 검사를 실패시키는지 네 브라우저에서 검증했다. 실패/취소된 새로고침에서 갱신을 멈출 수 있는 추정 lifecycle 변경은 제품에 적용하지 않았다. 첫 GitHub 검사에서 네 브라우저 E2E와 Node·AIT·API smoke·주요 동선은 모두 통과했으나 기존 모바일 QA 두 곳이 실패했다. IDEA의 RSI 근거를 상태 배지에서 읽는 가정과 조건검색 경고를 종목 버튼의 자식에서 찾는 가정을, 같은 종목의 별도 펼침을 실제로 여는 동작으로 바로잡았다. 기존 경고/RSI0/가격·필터복원 검사를 유지하고 전체 기업·기술 이유/제공된 기준일/접힌 상태의 경고 표시를 더 검증한다. 앱 소스는 바꾸지 않았다. 한국어 폰트와 WebKit 라이브러리 부족은 실행 환경에서 해결했다. 테스트 시간·검사 범위·판정 임계값을 완화해 실패를 숨기지 않는다.

## GitHub Actions와 새 기능 테스트

프런트 검토 PR: <https://github.com/shoon94parkk-del/chart-view-toss/pull/128>. 백엔드 검토 PR: <https://github.com/shoon94parkk-del/chart_View/pull/146>, 검증 커밋 `f7a2da1`. 로컬 전체 Python714개와 GitHub의 기존 테스트·bundle·모바일 검사10개가 통과했다. PR의 production job은 기존 조건에 따라 실행되지 않았으며 이는 운영 배포 통과가 아니다. 최종 프런트 커밋과 GitHub check 결과·링크는 PR128 본문에 기록한다. 로컬 필수 QA와 별도로 GitHub의 동일 소스 검사 상태를 확인한다. 실제 데이터 브라우저 검사는 홈·대표 가격/등락률·수출/반도체·PICK4개가 통과했으나 거장 게시 검사는 실패했다. 재검사에서는5개 전략의 실제 근거가 모두409였으며 [운영 응답 기록](audits/2026-10-11/after/production-publication.json)에 CDN/서버 버전과 health revision을 보존했다. 첫 검사 중 일시적502와 빈 본문도 관찰했으며 테스트는 각 응답 본문을 즉시 캡처해 오류 때문에 나머지 전략 검사를 생략하지 않는다.409를 통과로 처리하지 않았다.

기존 `main-regression.yml`이 PR의 Node/build와 네 브라우저 Playwright/axe를 실행한다. main push는 `sync-render-preview.yml`에서 같은 QA를 재사용하고, 모두 통과한 정확한 SHA가 아직 main 최신일 때 Render 대상 branch로 정상 push한다. 새 workflow나 배포 hook은 만들지 않았다. 실패 screenshot/trace/video, HTML/JSON report는 기존 artifact에 14일 보관된다. 이번 신규 `tests/e2e/*.spec.mjs`는 자동 검색되므로 기존 CI에 포함된다.

새 기능은 가까운 Node 계약 테스트와 기존 fixture/Playwright spec에 추가한다. 데이터 기능은 실제 API 형태→현재 모델→표시값·기준·결측을 검증하고, 상태 기능은 성공·실패·응답 역전·경로 이탈을 검사한다. 모바일은 실제 클릭, 44px 조작 수단, 문서 overflow, navigation 겹침과 조작/결과 거리를 검증한다. 필수 실행법과 artifact 분석은 [AUTOMATED_QA.md](AUTOMATED_QA.md)를 따른다.

```sh
npm ci
npx playwright install --with-deps chromium webkit
npm run qa:prepush
npm run test:e2e -- tests/e2e/watch-persistence.spec.mjs
npm run test:e2e:report
```

tester-army/e2e 런타임은 사용하지 않았다. Codex의 현재 에이전트·리뷰 기능과 기존 Playwright/Node/axe만 사용했다. OpenAI/외부 LLM API·API key·새 공급자 호출·유료 인프라를 추가하지 않았다. 일반 GitHub Actions/Render 이용 비용은 계정의 기존 요금 조건을 따른다.

## 다음 개선과 남은 출시 조건

1. **거장 운영 게시 동기화:** 검증한 backend main SHA를 기존 절차로 게시하고 CDN/서버 목록·5개 전략 실제 후보 근거200·고의 구버전409·health revision을 함께 확인한다. 현재 소스의 readiness gate는 공백을 잡는 장치이며 두 호스트를 원자적으로 게시하는 장치는 아니다. 수집 후 새로운 raw 버전이 올라오면 재검증이 필요하다.
2. **실제 Android/iOS Toss Sandbox:** 저장 지연/실패/재진입·Back·safe-area·공유·외부 원문 열기를 검증한다. SDK shim과 WebKit 통과만으로 native 출시 완료라 하지 않는다. 영구 미응답 native bridge의 안전한 복구와 실제 플랫폼 동작도 확인해야 한다.
3. **동일 조건 성능 측정:** 주요 경로와 느린 선택 모듈의 cold/warm·부분 실패를 같은 harness에서 측정한 후 병목을 개선한다. 이번 화면 관찰이나 concurrency timeout을 속도 점수로 해석하지 않는다.

픽셀 baseline의 자동 시각 비교는 추가하지 않았다. 실제 한국어 폰트의 geometry·읽기 크기·클릭과 핵심 screenshot 증거를 검증한다. 추후 동일 OS/폰트를 고정한 핵심 화면2~3개의 기준 이미지 비교를 추가할 수 있다. 전체 공급자 정확성·모든 외부 문서의 실제 로딩·앱 종료 뒤 늦은 native host 작업·실제 기기 키보드/백그라운드 복귀는 이번 fixture suite의 보장 범위가 아니다.

이번 작업은 큰 디자인 변경이나 데이터 수집 재설계가 아니다. 실제 운영 반영 여부, exact CI/배포 revision과 실기기 검증은 별도로 기록한다.
