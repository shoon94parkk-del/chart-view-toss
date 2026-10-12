# Apps in Toss 노출 가이드 대응 · 2026-10-12

## 감사 기준과 작업 범위

- 프로젝트: `github:shoon94parkk-del/chart-view-toss`.
- 실제 최신 main: `e5ffa5669a4b3f8cbf7df1d6df142dd91efa89f6`.
- PR [#130](https://github.com/shoon94parkk-del/chart-view-toss/pull/130)은 감사 시 OPEN, head `e15f2358aa265815ed6dcb6c872eae63a2198c50`. 최신 main과 PR #127의 1~10일 잠정치/선택형 영업일 보정을 이미 통합했다.
- 작업 브랜치: `improve/toss-exposure-20261012`, #130 head에서 분기했다. 기존 PR/운영 브랜치/main/Render 설정을 변경하지 않는다. #130을 main에 먼저 병합하더라도 동일 수출 변경을 재구현할 필요가 없다.
- 사용자 승인 범위: 실제 코드·QA·PR·새 AIT 생성. main 병합, Render 배포, 공개 Toss 제출은 이번 작업에서 수행하지 않는다.
- 신규 동작: 신규/관심 보유 홈 구분, 실제 이전 관측 대비 변화, 익명 완료 이벤트, 자발적 후기 진입. 버그: 보정 표의 버튼 의미/터치 영역과 네이티브 연구 저장 완료 확인. 테스트 가정 오류: 접힌 수출 상세를 펼치지 않은 구형 회복 검사.

## 요구사항별 감사와 최종 설계

| 요구 | 기존 확인 | 이번 대응 |
|---|---|---|
| 신규 홈 첫 행동 | 검색→상세 이동·목적별 기존 입구 존재 | 기존 검색에 짧은 가치/상세 하트 저장 안내 |
| 재방문 관심 접근 | 홈 최대3종목·전체 관리·저장 순서 존재 | 저장 관심이 있으면 검색 바로 아래, 시장보다 앞에 배치 |
| 지난 방문 변화 | 기존 시장/수출 관찰은 날짜 있는 일반 피드 | 관심 가격의 실제 이전/현재 관측값만 로컬 비교, 전일 등락과 분리 |
| 공시·뉴스·수출 연결 | 기존 저장 공시 재확인/관련 뉴스/수출 피드 존재 | 재사용; 비교 이력이 없는 소식을 새 변화라고 표시하지 않음 |
| 관심 저장/삭제 | confirmed 네이티브 트랜잭션·20개 한도·삭제 취소 이미 구현 | 편집 완료 가벼운 확인; 신규 등록만 완료 이벤트, 삭제/정렬/수정/취소 제외 |
| 검색/상세/분석 복구 | 취소·부분 장애·host/epoch·캐시 회복 존재 | 중복 구현 없이 실제 검색/가격/공시 결과 완료 측정 |
| 기업 연구 저장 | 브라우저 저장 피드백 존재, native optimistic 경로 | 해당 사용자 저장은 confirmed 완료 후 안내/이벤트; 연속 저장은 최신 확정 목록 기반 |
| 수출 1~10일 | #130 digest·calendar 영업일 옵션 구현 | 유지; 실제 최신 API 대조, 상세 접근성·44px·회복 검사 개선 |
| 데이터 정확성/성능 | canonical quote·지연 모듈·독립 회복·TTL 존재 | 기존 요청/계산/신선도 유지; 홈 비교를 위한 API 추가 없음 |
| 방문 집계 | 가시/온라인 heartbeat, 일별 해시 방문자 집계 | 유지, 공식 전환 이벤트와 합산하지 않음 |
| 후기 | 공식 SDK 진입 미연결 | 완료 후 선택형 인라인 버튼, 명시적 탭 후만 공식 후기 화면 요청 |
| PICK/LAB | 기존 선정·기록·점수·상태·계산·UI 존재 | 제외·보존; 별도 정책 확인 필요 |
| native Sandbox | 웹 QA/SDK shim은 실기기 증거가 아님 | 실제 Android/iOS 미검증 상태 유지 |

홈 재방문 기준은 `HOME_JOURNEY_KEY`로 계정별 기기에만 저장한다. 현재 화면의 시세는 기존 canonical store를 쓰며, 비교 기준에는 실제 응답의 유효한 가격·통화·관측시각만 받아들인다. 로컬 캐시만 남은 화면/빈 응답/실패는 새 변화로 인증하지 않는다. 동일시각 수정, 과거 관측, 통화 불일치, 결측값을 제외하고 다음 문서 방문에서 같은 변화를 다시 새 변화로 표시하지 않는다. 초기화/계정 로딩 중에는 기준 쓰기를 막는다. 공시/뉴스의 새로운 이전방문 diff는 추정해 추가하지 않았다.

## 파일별 변경

- `src/main.js`, `homeJourney.js`, `homeJourney.css`: 관심 보유 홈 우선순위/신규 안내/실제 관측 비교, 완료 피드백, 화면·관심·상세 이벤트, 저장 초기화 생명주기.
- `src/homeExtras.js`: 관심 우선 배치가 히트맵까지 시장 위로 이동시키지 않도록 기존 하단 삽입 위치만 고정. PICK 생성/표시 함수는 동일.
- `src/accessibility.css`: 검색창 닫기 버튼의 기존 40px 영역을 최소44px로 보강. 다른 화면 크기/색/계산은 보존.
- `src/storage.js`: 홈 기준과 후기 설정을 기존 계정 분리/초기화에 포함. 기존 관심/연구/선정 저장키는 보존.
- `src/usageMetrics.js`: 공식 `Analytics.log`, 이름/파라미터 허용목록, 작업별 중복 차단, 웹 미리보기 무전송, SDK 실패가 제품 작업을 실패시키지 않음.
- `src/reviewPrompt.js`, `reviewPrompt.css`: 실제 저장 뒤만 자발적 인라인 후기 진입; 명시적 탭, 세션 한 번, 30일 제한, 영구 안내 거절.
- `src/stockSelector.js`: 실제 조회 시작과 검증된 결과 렌더를 구분. 빈/미검증/닫힌/취소 응답은 검색 성공 제외.
- `src/researchCard.js`, `researchNotes.js`: 공시의 실제 비교 가능한 숫자 결과와 저장 완료 측정; native 확정 저장/중복 조작/저장 경합 방어.
- `src/exportProvisionalDigest.js`, `exportMomentum.css`, `exportMomentumView.js`: native 상세 동선, 표 안의 실제 버튼 의미, 44px, 달력 보정 기준 안내, 보이는 실제 상세 소비 이벤트.
- `public/privacy.html`: 기존 heartbeat 익명 식별자 전송의 부정확한 안내 정정, 공식 분석/로컬 비교/후기 설정과 보관 확인 범위 설명.
- 신규 Node/브라우저 회귀와 `tests/export_recovery_qa.mjs`, `exportLoadingIsolation.test.mjs`, `home_journey_qa.mjs`, `lazyAnalysisRoutes.test.mjs`, `storage.test.mjs`: 새 동작/실패 경계와 기존 출력 유지.
- `scripts/exposure-performance.mjs`, `docs/audits/2026-10-12-exposure/`: 같은 fixture/harness 전후 성능, 실수출/보호 파일/검증 근거.

## 공식 이벤트와 지표

공식 [Analytics.log](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/analytics/analytics.log)를 설치된 SDK3.5.0 그대로 쓴다. SDK가 익명키를 붙이므로 별도 분석 ID를 만들지 않는다. URL/검색어/종목코드/관심목록/질문/메모/원시 오류를 전송하지 않는다. `screen`, `source`, `outcome`, `code`의 고정 범주, 제한된 결과 개수, 10ms 단위로 반올림한 소요시간만 허용한다. 작업 식별자는 세션 메모리에서만 중복을 막으며 전송하지 않는다.

| 이벤트 | 실제 기록 조건 |
|---|---|
| `app_open` | 문서 진입당 한번. heartbeat/온라인 복귀/저장 재시도와 분리 |
| `stock_search_success` | 현재 검색의 검증된 서버 결과가 실제 렌더된 경우 |
| `stock_detail_view` | 현재 상세에서 실제 유효한 가격을 표시한 경우 |
| `watchlist_add_success` | 새로운 종목이 포함된 저장 트랜잭션이 실제 확정된 경우, batch당 한번 |
| `analysis_view_success` | 기업 DART 공시 비교에서 실제 비교 가능한 숫자 결과를 표시한 경우 |
| `research_save_success` | 연구 기록의 기기 저장이 실제 확정된 경우 |
| `export_detail_view` | 실제 수출 상세의 일치하는 숫자 자료가 활성/열린 패널에 표시된 경우 |
| `app_error` | 처리 대상 오류를 개인정보 없는 고정 오류 범주로 기록 |
| `screen_view`, `screen_load` | 화면 전환과 실제 유효 콘텐츠 준비를 구분; 시간은 가용 화면에만 기록 |

검색·상세·공시 분석·관심 등록·연구 저장에는 별도 `*_attempt`/`*_failure`가 있으며 성공/실패를 클릭과 구분한다. 수출 상세는 실제 자료 소비 이벤트이며 별도 전환 시도 분모를 만들지 않았다. 원래 방문 집계는 추가 호출·합산하지 않는다. 최근 표본의 로컬 진단과 실제 토스 운영 분석은 다른 자료다.

| 지표 | 집계 방식/한계 |
|---|---|
| DAU | 토스 공식 익명 운영 사용자의 일별 distinct; 기존 heartbeat와 합산 금지 |
| D1/D7 | 목표 정의는 첫 방문 cohort의 다음날/7일 후 distinct 복귀. 공식 콘솔의 재방문 지표가 이 정의/기간을 제공하는지 또는 익명 집계 내보내기를 지원하는지 확인 필요; 기존 일별 salt 해시는 cohort 계산에 재사용 불가 |
| 검색 성공률 | 같은 조건/기간의 `stock_search_success / stock_search_attempt` |
| 관심 등록 전환율 | 등록 완료 익명 사용자 / 앱 진입 익명 사용자; 시도 대비 완료율은 별도 |
| 분석 완료율 | `analysis_view_success / analysis_view_attempt`, unsupported/empty/error 구분 |
| 오류율 | 작업별 실패율은 attempt/failure로 구분. `app_error` 운영 세션/사용자 비율은 콘솔의 집계·세션 구분 지원 확인 필요; 별도 식별자를 추가하지 않으며 반복 polling/heartbeat를 진입수로 계산하지 않음 |
| 로딩 p50/p95 | 화면별 `screen_load.duration_ms`를 수집. 운영 percentile 계산/익명 내보내기 지원은 콘솔 확인 필요; 실패/빈 화면은 정상 준비 표본 제외. 이 문서의 전후 비교는 재현 가능한 로컬 측정 |

SDK 호출 완료는 토스 운영 콘솔 수신 증거가 아니다. [공식 분석 안내](https://developers-apps-in-toss.toss.im/documentation/common/growth/analytics/user-behavior)에 따라 QR/Sandbox 자료는 콘솔 운영 이벤트에 나타나지 않으며 운영 적용 다음날부터 확인한다. 토스 최소5.208 미만은 로그가 무시될 수 있다.

## 수출 1~10일 확인

[실제 응답 대조](audits/2026-10-12-exposure/live-export.json)에 실행시각·출처와 API→모델→UI 결과를 남겼다. 최신 2026년10월1~10일 잠정치를 기본 표시하고, 이전 누적구간은 상세 펼침에서 접근한다. 월간 HS통계와 관세청 잠정 자체 품목분류를 이어붙이지 않는다. API calendar 영업일5/8/3은 주말·공휴일 제외 달력 기준이며 공식 조업일수5.5/8.5/3.5와 다르다. 선택형 달력 보정 결과를 공식 일평균 증가율로 표시하지 않는다. 기존 계산식을 변경하지 않았다.

P0 실패 [CI38193815376](https://github.com/shoon94parkk-del/chart-view-toss/actions/runs/38193815376)의 `export_recovery_qa`는 native 닫힌 상세 안의 `반도체 · 1~20일`을 펼치지 않고 기다렸다. 동일 head의 로컬에서도 재현했다. 요약의 실제 기준일/수치를 먼저 확인하고 native summary를 키보드/터치로 열어 열린 상태와 기존 구간 수치를 모두 검증한다. 실패 검사를 삭제하거나 timeout을 늘리지 않았다.

## 후기와 정책/콘솔/실기기

[Review.request](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/review/review.request)의 공식 지원 검사 후에만 제공한다. 앱 실행 직후나 첫 화면 팝업을 만들지 않는다. 성공적으로 저장한 뒤 선택 가능한 인라인 안내이며 명시적 탭 전 native 요청은 0회다. 거절은 같은 세션 재요청을 막고, 30일 제한/안내 끄기를 보존한다. 평점 조건/보상/긍정 답변 유도는 없다. SDK `Promise<void>`는 표시·작성·취소 여부를 알려주지 않아 후기 성공 이벤트를 만들지 않는다. 미지원 환경은 기존 검증된 운영자 문의 경로를 유지하고 임의 딥링크를 만들지 않는다.

- 공식 [노출 가이드](https://developers-apps-in-toss.toss.im/guide/exposure)/[2026-10-22 FAQ](https://toss.im/apps-in-toss/blog/mini-app-exposure-faq?category=%EC%9D%B8%EC%82%AC%EC%9D%B4%ED%8A%B8): UX·실제 이용·후기·성능을 개선하는 대응이며 추천/부스팅 선정이나 정책 승인을 보장하지 않는다.
- 콘솔 → 핵심 지표: 대표 전환을 `watchlist_add_success`로 우선 설정/검토. 활성 지표1개, 전환 최대3개/대표1개, 다음날 반영. [공식 설정](https://developers-apps-in-toss.toss.im/guide/analytics/conversion-metrics). 실제 설정·운영 수신·cohort/로딩 분포 확인은 운영자가 수행해야 한다.
- 공식 SDK 로그 보관기간/토스 제공 분석 접근·삭제 절차, 실제 backend Redis 활성 여부와 hosting 접속 로그 보관은 별도 확인. 코드의 선택형 Redis10일TTL·후속 heartbeat 시 메모리 prune와 실제 운영 설정은 구분한다.
- AIT의 개인정보 안내는 운영 HTTPS 페이지를 연다. 운영 분석 적용 전 새 `privacy.html`의 운영 게시를 확인해야 한다. 이번 작업은 Render를 배포하지 않아 로컬/PR의 수정과 현재 운영 페이지를 같은 것으로 표시하지 않는다.
- [운영 정책3.5/3.6](https://developers-apps-in-toss.toss.im/intro/guide)은 특정 종목 추천·투자전략 안내 서비스를 출시 불가로 명시한다. 기존 PICK/LAB가 해당하는지는 운영자가 확인해야 하며, 이번 변경은 정책 적합성 확인을 의미하지 않는다. 기존 면책은 삭제/약화하지 않았고 PICK을 임의 숨김/제거/변경하지 않았다. 미확인 정책을 이번 코드로 해결했다고 주장하지 않는다.
- 실제 Android/iOS Toss Sandbox: 키보드/안전영역/스크린리더/native 뒤로가기·루트 종료/계정 전환/백그라운드 복귀/후기 지원·억제/SDK 호출·파라미터를 별도로 검증. 운영 이벤트 수신은 공개 운영 적용 후 다음날 콘솔에서 확인하며 Sandbox 호출 확인으로 대체하지 않는다. 웹4프로젝트/SDK shim과 다르다.
- 기존 데이터 공급자 재배포 권리/TrendForce 조건, 콘솔 scheme와 기타 [P0 gate](P0_RELEASE_GATE.md)는 그대로 남는다.

## 검증·성능·배포 결과

소스 구현 커밋은 `ec9bc4e75f2b8cf76a1f91b166b9c7ab9267ce3c`이다. 문서/측정 근거 커밋에서도 앱 소스·설정·산출물은 동일하며, 실제 파일 해시와 실행 명령은 [validation.json](audits/2026-10-12-exposure/validation.json)에 기록했다. GitHub 자동 CI의 실행 링크와 최종 결과는 이 브랜치 PR의 검증 댓글에서 확인한다.

| 검사 | 실제 최종 상태 |
|---|---|
| Node 단위/계약 | **485 통과, 실패0** (`npm test`, 최종 AIT/모바일 빌드에서도 재실행) |
| Vite/직접 진입 | **통과**, 직접 진입26개 산출물이 같은 앱 번들을 사용 |
| 로컬 전체 E2E | 최초 전체 실행 **783 통과/시간제한1 실패/skip0/flaky0**. 아래 원인 확인과 해당 검사4환경 재실행으로 해결. 최초 실행을 전체 성공으로 바꾸어 기록하지 않음 |
| 시간제한 재현 | 같은30초 제한·동일 코드의 WebKit 단독2회 **통과(13.6/12.8초)** |
| 최종 E2E 재검사 | 긴 연구 통합 검사를4개 기존 프로젝트에서 **4/4 통과**, 개별 기대값·터치·저장·axe 조건 유지 |
| Mobile release QA | workflow와 같은300ms/12000ms 빌드2개 + 검사20개 **22/22 통과**, 320/390/430px Chromium |
| Android/iPhone | 실제 Playwright Chromium140 Pixel5 / WebKit26 iPhoneSE 실행. 물리 토스 기기 결과로 해석하지 않음 |
| 접근성 | 기존17화면·키보드·펼친 근거/연구 흐름 및 새 수출44px/대비/summary 상태 검증 통과. 기존 문서화된 meta-viewport 단일 예외 유지 |
| Live backend contract smoke | **통과**, 실제 backend 대상. 클라우드 프록시를 쓰는 Node는 `NODE_USE_ENV_PROXY=1` 필요 |
| PICK/LAB 보호 | **통과**, 아래23파일/3구간 동일성 + 전체/모바일 기존 선정·기록·수익률 회귀 |
| 새 AIT | `npm run build:ait` **통과**. 아래 새 파일 해시 확인 |
| 실제 토스 Sandbox | **미검증**, native Android/iOS 실제 기기 별도 필요 |

남긴 진단: 첫 focused 실행의44px/원시 수출 순위 대비는 실제 제품 문제여서 수정했다. 접힌 상세 확인/신규 관심 우선순위/검색 전용 화면의 숨겨진 footer 클릭/568px에693px 첫 화면 기준을 적용한 검사는 잘못된 가정을 실제 동작에 맞게 고쳤다. 중간 전체 실행2회는 알려진 실패 수정 위해 SIGINT로 중단했고 성공으로 표시하지 않았다. 이후 전체 실행의 WebKit 연구 흐름은 여섯 예시의 입력/포커스·전체 문서 axe2회 등 누적 작업이30초를 소진했다. 추적 기록에서 저장 버튼44px/활성/가시/trial-click와 axe는 통과했고 마지막 geometry poll에16ms만 남아 실패했다. 독립 리뷰·같은30초 단독2회로 제품 장애를 제외한 뒤 **이 검사만 전체 예산60초**로 조정했다. 개별 expectation 제한8초와 모든 검증은 그대로이며 고정 대기/검사 삭제를 추가하지 않았다. 실패 보고서/추적은 로컬 `artifacts/toss-exposure-diagnostics/`에 보존했고 해시·상태를 validation에 남겼다.

### 같은 조건의 로컬 전후 성능

#130 원본과 최종 소스 커밋을 같은 Chromium390×844, 고정 시장 fixture, 새 context/비어 있는 캐시, 화면별5회로 순차 측정했다. 브라우저·호스트 프로세스는 이미 실행된 상태다. **전후 각각35/35 숫자 자료 준비**, runtime error/가로 누출/예상 밖 요청0. 모든 화면의 API별 요청 수가5회 모두 동일했다. 초기 화면 텍스트 FCP나 물리 토스·모바일망·서버 cold start·운영 Render 측정은 아니다.

| 화면 | p50 전 → 후(ms) | p95 전 → 후(ms) | 요청 수 전 → 후 |
|---|---:|---:|---:|
| 홈(시장·히트맵 숫자 준비) | 233.06 → 244.75 | 371.53 → 341.85 | 9 → 9 |
| 관심 | 152.47 → 174.08 | 164.70 → 204.98 | 2 → 2 |
| 상세 가격 | 305.91 → 316.65 | 348.64 → 437.94 | 10 → 10 |
| 차트 | 234.09 → 209.25 | 260.74 → 224.46 | 2 → 2 |
| 수출 요약 | 242.64 → 239.20 | 254.92 → 296.25 | 4 → 4 |
| 수출 반도체 | 248.31 → 220.35 | 264.94 → 230.72 | 5 → 5 |
| 수출 화장품 | 210.59 → 197.46 | 214.93 → 284.34 | 4 → 4 |

p95는5개 표본의 최댓값이다. 홈 p95는371.53→341.85ms, 상세 p95는348.64→437.94ms로 변화가 섞여 있으며 일괄 속도 향상을 주장하지 않는다. 초기 JS는296,745→317,229byte(+6.90%), 동일 gzip은98,920→105,825byte(+6.98%). 모든 측정 화면의 최종 p95는500ms 미만이고 요청 증가가 없었으나 운영 회선/기기 성능은 별도 확인한다. 기존 옵션 본문은 유효 콘텐츠 준비 뒤 pending일 수 있으며 loaded-resource timing/실제 전송 byte는 고정 clock 때문에 얻을 수 없어 추정하지 않았다. [전](audits/2026-10-12-exposure/performance-before.json)·[후](audits/2026-10-12-exposure/performance-after.json)에는 harness/source/dist/실제 응답 JS 해시와 개별35표본이 있다.

재현:

```sh
npm ci
npx playwright install --with-deps chromium webkit
npm run qa:prepush
npm run preview -- --host 127.0.0.1 --port 4173
# 위 preview를 별도 터미널에서 유지하고 실행
node scripts/exposure-mobile-qa.mjs
NODE_USE_ENV_PROXY=1 node tests/live_api_contract.mjs
node scripts/verify-protected-scope.mjs
npm run build:ait
# 변경 전 worktree도 동일 옵션으로 build/4174 preview 후 순차 실행
node scripts/exposure-performance.mjs --url http://127.0.0.1:4174 --source-dir /workspace/chartview-baseline --runs 5 --output docs/audits/2026-10-12-exposure/performance-before.json
node scripts/exposure-performance.mjs --url http://127.0.0.1:4173 --source-dir /workspace/chart-view-toss --runs 5 --output docs/audits/2026-10-12-exposure/performance-after.json
```

Node24.21.0/Playwright1.55.0을 사용했다. 이 클라우드는 sudo가 없어 WebKit OS 라이브러리를 사용자 디렉터리에 풀고 실제 launch를 확인했으며 host validator만 우회했다. 시스템 OpenAISans WOFF2가 native 렌더링을 깨뜨려 FONTCONFIG로 그 시스템 폰트만 제외했다. 앱 폰트는 변경하지 않았고 Noto의 실제 한글 화면을 확인했다. 표준 GitHub CI는 기존 `--with-deps`/Noto 설치를 그대로 사용한다.

PICK/LAB/투자 계산과 API의 23개 관련 파일은 [보호 파일 해시](audits/2026-10-12-exposure/protected-scope.json)의 #130 원본과 바이트가 동일하다. 변경된 `homeExtras.js`의 PICK 생성/표시 함수와 공통 main의 기존 PICK route도 3개 소스 구간의 바이트 동일성으로 별도 확인한다. 데이터/면책 출력은 전체 회귀와 실제 응답→화면 테스트로 확인한다. 홈 위치 변경은 사용자 지시로 관심종목만 이동하며 PICK 영역 자체의 구조·조건·출력은 보존한다.

### 배포 경계와 새 산출물

- 작업 브랜치 `improve/toss-exposure-20261012`, PR 대상 main. #130 통합 수출 변경을 포함하며 #130을 수정/병합/닫지 않는다.
- 새 `chartview.ait`: **10,431,353byte**, 생성시각 `2026-10-12T03:56:17.867709+00:00`.
- SHA256 `55ea5e00b626f1184ec48e78acff8f368b7f1081afa0808048f2ca71bb530077`. 기존 AIT는 작업 폴더에 없었고 새 build 결과이며 이름만 변경한 파일이 아니다.
- `ait build`의 deploymentId는 bundle 산출물 메타데이터다. `ait deploy`/main 병합/Render 배포/토스 공개 제출은 수행하지 않았다.
- 기존 Render 동기화 workflow는 검증된 main push 뒤 `feat/apps-in-toss-mvp`로 승격한다. 이번 별도 브랜치/PR은 그 운영 승격을 실행하지 않는다.
- 출시 차단/추가 확인: 실제 native Sandbox, 운영 개인정보 안내 게시, 운영 콘솔 전환·수신/정확한 통계 제공 여부, 보관·삭제 운영 설정, PICK/LAB 정책 해당 여부, 기존 제공자 재배포/TrendForce/console scheme P0 gate. 코드·로컬 QA 완료와 공개 출시 승인/추천·부스팅 선정을 구분한다.
