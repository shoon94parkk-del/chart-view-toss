# Codex 이관·전문 역할 전체 점검 — 2026-10-08

프런트 기준 `c8db70c2bc14db3e3b89dcdeb3ffa9b2d1a91d56`, 백엔드 자료 기준 `4ae744548523b4a4265adf126bb217cf39558d3f`. 현재 Codex의 데이터·모바일·runtime·이관 호환성·구현 전문 역할 5개와 coordinator가 점검했다. 리뷰는 읽기 전용, 구현 파일 소유권과 브라우저/report/성능 측정을 분리했다. 사용법은 [CODEX_TRANSFER](CODEX_TRANSFER.md), 역할은 [ROLES](agents/ROLES.md)다.

## 다른 Codex가 재현하는 환경

`tools/codex/setup.mjs`가 앱과 선택 도구의 기존 두 lockfile을 설치하고 Chromium/WebKit·직접 패키지 버전·자체 skill 파일을 확인한다. `.agents/skills`에 QA와 전문 역할 점검 skill 2개를 추가했다. 별도 clone에서 실제 install/check, 4개 진단 CLI 버전, 두 브라우저 실행·한글 화면을 확인했다. 이 머신의 OS 라이브러리/브라우저 캐시는 재사용했으며 Windows·새 OS·대상 Codex의 skill 자동 발견까지 검증한 것은 아니다.

실제 설치: Playwright/axe와 agent-browser, Lighthouse, Knip, dependency-cruiser, fast-check. agency-agents는 고정 소스에서 프로젝트 역할을 채택했다. tester-army/e2e와 claude-mem은 **소스 조사 상태**이며 MCP·worker·hook·자동 기억은 연결하지 않았다. 플랫폼 Render/cloud skill·connector·로그인·대화·scratch는 Git clone으로 옮겨지지 않는다. 대상 Codex에서 재연결하거나 SKILL.md를 직접 읽는다. Git 문서가 검증된 프로젝트 맥락의 기준이다.

## 재현한 문제와 수정

| 문제 | 실제 수정과 회귀 |
|---|---|
| 분석 화면 lazy JS 요청 실패 후 영구 로딩 | 네 화면에 공통 실패 안내·재시도·분석 메뉴/하단 이동을 제공. 실제 번들 요청을 실패시켜 복구 검사 |
| 빠른 화면 이탈/재진입 시 오래된 import가 mount하거나 cleanup을 잃음 | 화면 epoch를 mount·오류·cleanup·reload까지 검사. 늦은 완료/오류·중복 mount·cleanup 회귀 |
| iPhone WebKit에서 실패한 modulepreload가 일반 reload 후에도 실패 | 명시적 재시도 시에만 해당 loader가 동기로 추가한 같은 출처 `/assets/*.js` 최대 6개를 cache reload·본문 소비 후 새 문서로 이동. 4초 제한·이탈 취소·저장 bytes 보존 검사 |
| 펼친 PICK 설명 2곳·도구 favicon 실패 문자 2곳 대비 부족 | 기존 foreground만 어둡게 조정. 크기·배치·배경·계산 유지, 실제 실패 상태 axe와 원래 색을 넣은 음성 대조 검사 |
| 성능 진단이 구형 히트맵 선택자를 기다림, timeout 인자가 잘못 전달됨 | 현재 `.market-map-stock` 사용, Playwright의 options를 세 번째 인자로 전달. 실제 준비 함수·선택자와 실패 시간 예산 회귀 |
| 최신 CDN 거장 결과와 이전 서버 상세 근거 버전 차이로409 | 백엔드 최신 테스트 main `0ca573575c2411b75b8b44407f2161516b9322ab`를 기존 수동 Render 경로로 게시. 결과/CDN/5개 전략 근거 모두 `ae24980e56dd7828a0a6`·HTTP200, 고의 이전 버전409 확인 |

WebKit 수리는 정상 진입에 추가 API/asset 재조회가 없고, 현재 화면의 복구에만 사용한다. 실패 loader가 추가한 자체 JS dependency 중 정상 응답 자산도 재검증할 수 있다. 전역 캐시 삭제·전체 preload 재조회·자동 무한 reload는 사용하지 않는다. 원 API·TTL·수집·계산·선택/관심 저장·native back 계약은 유지한다.

거장409는 잘못된 숫자를 보여주는 계산 결함이 아니라 서로 다른 근거를 연결하지 않는 보호 동작이었다. 기준일과 후보가 같아도 version이 다르면 합치지 않는다. 오래된 서버 목록으로 최신 CDN 목록을 되돌리는 과거 인수인계 표현도 정정했다. 일일 데이터 갱신과 서버 게시가 별개인 운영 공백은 남아 있으며 새 배포 hook·Secret·유료 인프라는 추가하지 않았다.

## 자료 정확성·모바일·속도

- 저장 거장 181개 전략행·선정 35건/API의 **1,352 assertion** 통과. 원 연간/단일분기 EPS, ROE/CAGR/PEG/ROA, 실제 일봉 SMA·52주·수익률, 선정 평가 분모·반올림·날짜·버전을 독립 대조했다. 새 산술 버그는 발견하지 않았다. 추천 당일 추천가를 0% 기준으로 유지하는 기존 정책은 보존했다.
- 설치된 fast-check로 seed `20261008`, **5,000 생성 사례** 통과. 수출 단위/0/결측/원객체, macro 공백, 오래된 시세 롤백을 확인했다. 저장 스냅샷과 테스트 통과가 모든 공급자의 현재 가격 정확성을 인증하지는 않는다.
- 자료 부족은 별도 개선 후보다. 확인한 snapshot에서 린치1,150개·오닐1,215개·그린블라트895개가 자료 부족이었다. 보통주 EPS/기업행동 비교 근거는 전략별416/542/575개, 공통 기준일 종가118개, 추세 전략253거래일 OHLCV205개가 우선 조사 대상이다. 이 원인 항목들은 전략별 분류이며 합쳐서 회사 수로 세지 않는다. 신규 상장·지원 제외·원공시 결측 등 정당한 제한과 수집 공백을 구분한 뒤 공식 자료로 보강해야 한다. 기준을 낮추거나 미확인 숫자를 채워 선정수를 늘리지 않았다.
- 모바일 **27경로×3프로필=81회**, 조작 흐름18개·대상36개 확인. 치명적 JS 오류/문서 가로 overflow0. Flash↔DRAM 12개월 변화·선택기와 결과 근접, 검색/키보드/메모리5종/미국40종목/선정 원문 이동을 실제 조작했다. 운영 Android/iPhone 14경로도 오류·overflow0이었다.
- 격리된 기존 fixture 모바일 Lighthouse **95점**, FCP1.65초/LCP2.72초/TBT89ms/CLS0.0202. 모든 QA 종료 후 동일 harness/fixture/font/모바일 설정의 수정 build는 **96점**, FCP1.66초/LCP2.70초/TBT60ms/CLS0.0202, 오류·경고0이었다. 단일 전후 관측에서 큰 저하는 보이지 않았으나1점 차이로 속도 향상을 단정하지 않는다. 동시 설치 영향을 받은 두 번째 baseline은 정량 비교에서 제외했다. 배포 앱의 390×844 첫 날짜 있는 표시 단일 관측은 홈315ms·삼성 상세1,005ms·미국40타일297ms·수출619ms·미너비니339ms였다. 이는 가동 중 서비스/관리형 프록시의 관측이며 최신 검증 완료 시간·cold start·SLA 보장이 아니다. 먼저 보이는 저장 히트맵은 날짜/갱신 상태와 유지 종목 안내를 보존한다.

## 최종 회귀·배포 확인

최종 `npm run qa:prepush` 실제 성공: **Node326/326·production build·Playwright348/348**, skipped0/flaky0/unexpected0, 브라우저6.7분. 신규 lazy 복구 브라우저36회와 Node23개, 진단 Node2개, 모바일 후속 브라우저12회를 기존 suite에 추가했다. 관련 기존 `mobile_continuity_qa`, `guru_investing_qa`, `audit_plan_qa`, `sector_heatmap_qa`도 각각3개 viewport에서 통과했다. GitHub CI/최종 프런트 배포 receipt는 이 변경의 PR에서 확인한다. 실행 명령·실패 screenshot/trace/video/HTML·4기기 matrix·exact-main Render 승격은 [AUTOMATED_QA](AUTOMATED_QA.md)에 있다. 기존 테스트와 flaky 배포 차단을 유지한다.

백엔드 exact main의 pytest564개·Node38개·bundle check 통과 후 `/health.revision` 및 HTML/3개 hash 자산을 소스와 대조했다. 실제 deploy `dep-db3edc0m7kps73eb5tr0`가 위 revision이며 동일 snapshot 근거200/잘못된 version409까지 확인했다. Render의 live 표시만으로 소스 일치를 주장하지 않았다.

백엔드 [PR136](https://github.com/shoon94parkk-del/chart_View/pull/136)과 병합 main의14개 GitHub 검사도 모두 성공했다. 첫 프런트 통합 실행은347통과/1실패였다. iPhone의 import 응답을 의도적으로 보류한 테스트가 `goto(waitUntil=load)`에서 자기 대기에 빠진 것이 trace로 확인됐다. 그 테스트만 DOMContentLoaded→실제 보류 요청/로딩 UI 기준으로 고쳤으며 mount1·cleanup·fatal 기준은 유지했다. 앱 수정이나 timeout 상향/skip은 하지 않았다. 첫 trace/report는 보존하고 전체 QA를 재실행했다.

두 번째 전체 실행도347통과/1실패였다. trace를 독립 대조하니 첫 홈 클릭의 WebKit 안정성 대기가28.933초·paint 프레임 공백이29.589초였다. 이후 재진입/mount1은 성공했으며 최종 클릭은 남은 전체 예산 때문에 종료됐다. 앱 마지막 클릭의 hang/overlay로 분류하지 않았다. 문서 load를 완료한 홈에서 실제 메뉴로 진입한 후 import를 보류하도록 **재진입 테스트4개만** 준비 조건을 분리했다. 실제 클릭·pending0→이탈/재진입→release→mount1·cleanup은 유지했고 별도 deep-link 실패/복구4개도 유지한다. 변경 후4기기×10회/workers3/retries0,40/40 통과와 독립 리뷰를 확인했다. 변경 전 단독40회도 통과했으므로 WebKit 내부 원인의 완전한 재현/확정을 주장하지 않는다. 최종 전체 suite와 CI를 통해 통합 안정성을 확인한다.

프런트 [PR124](https://github.com/shoon94parkk-del/chart-view-toss/pull/124)의 첫 CI에서4기기 E2E·Node·AIT build·API smoke·audit-browser는 성공했다. 기존 `mobile_release_qa`만 수출 탭 클릭 직후 비동기 remount 전에 카드 수를 세어 실패했다. 실제 선택된 탭/표시 패널/첫 카드 준비를 기다리도록4개 전환을 동기화했으며 exact5 카드/행5/원문·수치 기준은 그대로다. CI와 동일한300ms API 설정의 격리 build에서 **해당 전체 script 성공·screenshot22개**, 독립 리뷰에서 약화 없음. 앱 소스·시간 제한·sleep은 바꾸지 않았다. 기존 production performance 진단도14경로 cold-browser/SPA 모두 ready였다. 여기의 cold는 새 브라우저 문맥이며 잠든 Render의 cold start를 뜻하지 않는다. 최신 PR/head/main 검사는 GitHub에서 별도로 확정한다.

최초 실패와 수정 증거는 작업 환경의 `scratch/chartview-transfer-audit-20261008/`에 보존했다. 이 로컬 폴더는 새 환경으로 자동 복제되지 않는다. 지속 가능한 회귀는 커밋된 Node/Playwright 테스트와 GitHub Actions artifact다.

## 변경 파일

| 목적 | 추가/수정 파일 |
|---|---|
| 이관 | `tools/codex/setup.mjs`, `docs/CODEX_TRANSFER.md`, 이 점검 기록 |
| 자체 skill | `.agents/skills/chartview-qa/SKILL.md`, `.agents/skills/chartview-agent-review/SKILL.md` |
| 시작·맥락 | `AGENTS.md`, `README.md`, `docs/CODEX_HANDOFF.md`, `CLOUD_CODEX_TOOLS.md`, `AUTOMATED_QA.md`, `decision-log.md`, `project-memory.md`, `regression-guardrails.md` |
| 실제 화면 복구/가독성 | `src/main.js`, `src/pickLedger.css`, `src/styles.css` |
| 진단 | `scripts/measure-site.mjs`, `tests/production_performance_audit.mjs`, `.github/workflows/major-detail-stage-timing.yml` |
| 회귀 | `tests/lazyAnalysisRoutes.test.mjs`, `performanceDiagnostics.test.mjs`, `tests/e2e/lazy-analysis-recovery.spec.mjs`, `review-followup.spec.mjs`; 기존 `tests/mobile_release_qa.mjs` 준비 조건 정정 |
| 별도 백엔드 PR136 | `docs/CODEX_HANDOFF.md`, `docs/decision-log.md`만 정정. 계산/수집/배포 설정 변경 없음 |

## 남은 범위·다음 작업

실제 Toss Android/iOS Sandbox의 native back/root exit·계정 분리·키보드/백그라운드 복귀, OS 간 픽셀 baseline, 모든 외부 자료의 현재성, 서버 cold start와 일일 CDN/서버 자동 게시 일치는 별도 영역이다. 기존 release/provider gate를 유지한다. 새 기능은 가까운 fixture·API→가공→UI/결측/지연/모바일 조작 회귀를 추가하고 `qa:prepush`와 관련 legacy QA를 직접 실행한다.

새 OpenAI/외부 LLM API 키·호출·유료 서비스는 없다. 현재 Codex/subagent 이용량과 기존 Actions/Render/공급자 조건은 별개다. tester-army/e2e나 claude-mem을 실행했다고 기록하지 않는다.
