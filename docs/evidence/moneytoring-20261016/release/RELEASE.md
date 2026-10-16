# Moneytoring 적용 및 운영 게시 결과 — 2026-10-16

차트뷰 토스와 공유 API를 기존 Render 서비스에 게시했다. 프런트 소스 `ee6511364d9ec7c7ac52e4b355fc01d7c138a5b1`, API 소스 `d8c2b0e4c903b3c3c767a9b8fa58c2a2f51f84bd`의 실제 자산/health를 확인했다. **단독 실제응답 모바일 점검28/28 통과**. 공급자 컨센서스 연결·토스 실기기 검증과 별도 기존 PICK 정기 작업 실패는 미완료다. 동시 부하에서의 지연도 남아 있다.

이 문서는 문서 증거 브랜치에 게시한다. 앱 소스나 운영 배포 브랜치를 다시 변경하지 않는다. 아래 CI 성공은 지정한 검사의 성공이며 모든 정기 작업이 성공했다는 의미가 아니다.

## A. 변경 요약

| 적용한 아이템 | 사용자 경험 | 데이터 원칙 |
|---|---|---|
| 물가 발표 읽기 | 기존 CPI·근원 CPI·PPI·근원 PPI·PCE·근원 PCE에서 확인된 최근 발표일 묶음, 관측월·발표 대기·지표 의미를 읽는다 | 확인된 발표만 묶고 관측월을 발표월로 바꾸지 않는다 |
| 뉴스 필터와 선택형 요약 | 출처·직접/업종 관계를 필터링하고 원하는 기사만 요약을 펼친다. 근거·품질·실패·재시도와 상세 왕복 상태를 유지한다 | 기존 요약 API만 사용, 자동 요약0, 동시 요약 최대3개 |
| 동일 기사 다종목 연결 | 정확히 같은 HTTPS 기사의 확인된 관련 종목과 각 연결 근거를 함께 표시한다 | 제목 유사성으로 사건·관계를 만들지 않는다 |
| 차트의 관련 기사 날짜 | 날짜 목록과 기본 꺼짐인 표시 버튼으로 기존 차트 관측점과 기사 게시일을 연결한다 | 원인 추정·다른 거래일로 이동·가짜 시각 없음. 미국 최근4일 범위 표시 |
| 로컬 연구 체크포인트 | 실제 저장 때 질문·비교종목·재확인 날짜·이미 확보한 시세 관측을 종목별 최근20개로 보관한다 | 신규 시세 요청·과거 수익률 생성·서버 메모 전송 없음 |

운영에서 발견한 뉴스 대기도 추가 보완했다. 기존300초 캐시를 작업 대기열 전에 읽고 동일 키 공개 조회를 최대64개 실제 작업으로 공유한다. 전체 수집 예산7초에 완료된 그룹과 명시적인 지연 오류를 반환한다. 늦은 실제 결과는 원래 캐시에 저장하며 `뉴스 없음`이나 가짜 성공을 만들지 않는다. 내부 강제 조회는 자신이 취득한 실제 결과를 유지한다.

## B. 구현과 유지 범위

- [전체 프런트 변경85파일과 SHA](changed-files.json), [구현 보고서](../../../MONEYTORING_IMPROVEMENTS_2026-10-16.md).
- 물가: `macroInflationModel/View`; 뉴스: `newsReaderModel/View`, `newsResponse`, 기존 `main/api` 연결; 차트: `chartEvidence`; 연구: `researchNotes/Card/Checkpoints`; 개인정보: `public/privacy.html`.
- 공유 API: [PR156](https://github.com/shoon94parkk-del/chart_View/pull/156) 선택적 예상치 캐시, [PR157](https://github.com/shoon94parkk-del/chart_View/pull/157) 오류 캐시 재시도, [PR158](https://github.com/shoon94parkk-del/chart_View/pull/158) 응답 예산. [API 계약/검증 문서](https://github.com/shoon94parkk-del/chart_View/blob/d8c2b0e4c903b3c3c767a9b8fa58c2a2f51f84bd/docs/NEWS_RESPONSE_BUDGET_2026-10-16.md).
- [보호 파일18개](protected-release.json)는 기준95d6b83과 동일하다. PICK/LAB의 선정·점수·상태·산식·기록·성과·노출과 면책은 유지했다. 공유 API의 기사 점수·관계·제공처 함수도 byte-identical이고 Web JS/CSS 번들은 동일하다.
- 기존 전환 이벤트/사용량 계약은 유지한다. 체크포인트 질문·메모·가격을 새 분석 이벤트에 넣지 않는다. 이번 변경으로 SDK 메서드나 리뷰 딥링크를 만들지 않았다.

## C. 검증 결과

| 검사 | 결과 | 근거 |
|---|---|---|
| Node / Python |673 /975 통과. 최종 로컬 Python 기존 경고80개 | [프런트 CI](ci-final-counts.json), [API CI](ci-news-budget-final-proof.json) |
| Vite / 직접 진입 / AIT | 빌드 통과,27개 직접 진입 확인, 실제 새 AIT 생성 | [AIT 증거](ait-proof.json), [운영 조건 빌드](production-build-proof.json) |
| Android Chromium / iPhone WebKit / desktop /320px | 정확한 PR 및 main에서 각각944/944 E2E 통과, 실패·flaky·skip0 | [정확한 main CI](ci-main-ee65113-proof.json) |
| 모바일 출시·접근성 | 기존 Mobile release QA와 새 개인정보4기기 전체 axe/넘침/데이터 요청0 검사 통과.320/390/430 반응형 포함 | [PR9검사](ci-final-pr.json), [검증 이력](../validation-history.json) |
| API main / 실제 Web 운영 | 정확한 main8개 사전 검사와 게시 후4개 운영 검사 통과. 게시 전후 실제 revision/자산/Guru 확인 | [main12검사](ci-news-budget-final-proof.json), [실제 게시 증명](news-budget-deployed-release-proof.json) |
| Live backend contract | 최종 API d8c2b0e에서 재실행 통과 | [실제 최종 로그](final-live-api-contract.log) |
| 실제 토스 웹 운영 |320/390/430 Chromium, iPhone WebKit 각각7개, 총28/28 통과 | [최종 요약](live-summary.json), [원본](live-final/results.json) |
| 공식 물가6종 | API 보완 전후 points 배열 모두 동일, SA/NSA·공식 출처·수정/최초 구분 유지 | 최종 요약과 원본 macro 검증 |
| DRAM 월간 수출 |8월15.7331→9월16.777십억달러, MoM 약+6.6%,9월 막대 증가 확인 | 실제 원본28검사의 DRAM 항목 |
|10월1~10일 수출 잠정 |2026-10/1~10일과 월간2026-09 구분 확인 | 최종 backend contract 로그 |
| 실제 Android/iOS Toss Sandbox | **미검증** | 브라우저 모바일 환경과 구분 |

### 성능과 실패 보존

[동일 조건 로컬14표본](../performance/README.md)은 고정 API fixture/80ms 지연 조건이다. 홈137→152ms, 상세 현재가331→342.5ms, 경제지표246→262.5ms 중앙값으로 소폭 증가했다. 시작 데이터 요청 수9/10/2는 유지했다. 현재가 API·제공처는 변경하지 않았다. 이 결과로 운영 시세가 빨라졌다고 주장하지 않는다.

[추가 뉴스 ASGI 비교](news-budget-benchmark.json)는 동일한 합성12초 제공처와 작업 대기열 조건의 각1회 로컬 비교다. 캐시 응답262.34→30.798ms, 느린 제공처 응답12017.705→7014.089ms. 후자는 완료된 기사와 명시적 지연 오류를 담은 **부분 응답**이며, 늦은 실제 결과가 중복 취득 없이 복구됨을 확인했다. 운영 p50/p95 수치는 아니다.

초기 감사의 옛 미지원 기사 버튼 클릭 가정은 실제 CI/로컬 RED 후 안전 안내·버튼 부재·요약 비활성·위험 요청0·원문 HTTPS 열기를 검증하도록 보정했다. 실제 제품 결함인 연구 기록 재실행 ID 충돌, 뉴스 태그 누락, 오류 캐시 재시도도 수정했다. 검사를 삭제해 성공으로 처리하지 않았다.

운영 원본은 다음과 같이 구분한다.

- [첫 스크립트 실패](live-initial/results.json): 새 응답을 가정한 대기와 Chromium 문서 전환 후 본문 취득 오류. 원본 스크립트도 보존했다.
- [응답 예산 보완 전27/28](live-before-news-budget/results.json): 첫320px 뉴스11–20.8초 지연으로 기존10초 클라이언트 예산 초과. 다른3기기는7/7 통과.
- [보완 후 동시 운영 검사](live-concurrent-ci/results.json): 같은 무료 서버를 운영 CI와 동시에 사용할 때 뉴스15–16초·홈5초 기대 시간 초과가 재현됐다. [Render 실제 CPU](news-budget-concurrent-resource-metrics.json)는 한도0.15 CPU에 도달했다. HTTP p50/p95 조회는 빈 결과여서 확보하지 못했다.
- [필수 CI 종료 후 단독28/28](live-final/results.json): 같은 앱·같은 스크립트·같은 assertion으로 순차4기기 검사. 이미 서버 캐시가 준비된 조건이며 동시 부하 문제를 모두 해결한 결과가 아니다. 뉴스 실제 기사와 자동 요약0을 확인했다. 마커 ON/OFF는 활성화된3기기에서 실제 실행했고390px의 그 시점 비활성 버튼은 실행했다고 표시하지 않았다.

원본 네트워크 중단/이탈 후 relay 종료 기록도 보존했다.28개 기능 검사 통과를 모든 전송 오류0으로 바꾸어 해석하지 않는다. 원본 뉴스 API/기사 본문은 GitHub에 통째로 재게시하지 않으며 필요한 화면과 처리 결과/해시를 기록했다.

## D. 토스 가이드·외부 대기·차단 요소

- 신규 권한/로그인 강제 없이 기존 데이터와 선택형 진입을 확장했다. 가짜 변화·예상치·실제값·시각을 만들지 않고 성공/부분 실패/오류를 구분한다.
- [API 발급 결과](../../../MACRO_API_ONBOARDING_2026-10-16.md): 키 발급0개, 가입/인증/문의 폼 제출0건. FMP/Finnhub/TE의 사용자 계정 인증, 경제 캘린더 접근, 공개 표시·보관 권한이 미확보다. 공식 통계와 민간 컨센서스는 별도다.6종 모두 운영 `forecastCoverage.status=not_configured`이며, 어댑터·검증 캐시 준비를 실제 연결로 표시하지 않는다.
- 토스 콘솔 업로드/심사·실제 Android/iOS Sandbox·계정별 저장·외부 링크·뒤로가기 실기기 검증은 남아 있다. 이번 변경의 Render 게시나 AIT 생성은 토스 콘솔 출시 완료가 아니다. PICK의 추천형 금융 서비스 허용 여부도 공식 정책 별도 확인 항목이다.
- 기존 정기 작업 실패: [Update Korean Stock Screener38877514345](https://github.com/shoon94parkk-del/chart_View/actions/runs/38877514345)는 이전a406 코드에서 `TOP3 symbol not found in screener: 069500.KS`로09:04:17Z 실패했다. PR158 병합09:04:22Z 전의 실패다. 뒤따른 [Freshness38877937595](https://github.com/shoon94parkk-del/chart_View/actions/runs/38877937595)도 upstream 실패를 보고한다. PICK 보호 지시에 따라 수정·재실행하지 않았다. 이후 다른 freshness 검사 상태와 혼동해 이 원인 실패를 지우지 않는다.
- 동시 부하에서 확인된0.15CPU 한도와 뉴스 지연은 운영 용량 검토 항목으로 남긴다. 본 작업에서 유료 리소스나 공급자 계약은 변경하지 않았다. 추천·부스팅 선정 결과는 별도 실제 지표/심사 사항이다.

## E. 배포와 재현

| 항목 | 실제 결과 |
|---|---|
| 프런트 브랜치/PR | `feat/moneytoring-ux-20261016`, [PR137](https://github.com/shoon94parkk-del/chart-view-toss/pull/137) 병합 |
| 프런트 main | `ee6511364d9ec7c7ac52e4b355fc01d7c138a5b1` |
| API 브랜치/PR | `fix/news-response-budget-20261016`, [PR158](https://github.com/shoon94parkk-del/chart_View/pull/158) 병합. 앞선156/157 포함 |
| API main | `d8c2b0e4c903b3c3c767a9b8fa58c2a2f51f84bd` |
| Render 프런트 | `dep-db8u6c3rjlhs73dignbg`,2026-10-16T08:41:49Z live |
| Render API | `dep-db8uibbl550s73f8kcgg`,2026-10-16T09:08:05Z live |
| 실제 프런트 파일 | `/assets/index-mzSYbuZg.js`, SHA256 `92ebc66ab886f07cce00da325a222eeed64e9a1af3d9fc9ad8f81357a4db731b` |
| 새 AIT |10,494,994 bytes,2026-10-16T08:27:59Z 생성. SHA256 `64a7b9a4952972b719fd3c7e567bf55ca214a6408bf7729a03c658bc1497f224` |

AIT는a99d925에서 실제 빌드했다. 게시ee65113과 **전체 Git tree `4d0319877d051593ff021f725bac8710aa8678f8`가 동일**함을 검증했다. 옛95/4d 파일은 기준으로 보관하고 새 빌드를 생성했으며 이름만 바꾸지 않았다. 이후 변경은 별도 공유 API와 이 문서 증거뿐이다. 토스 콘솔 게시0건이다.

프런트 소스 커밋에서 Node24.21.0/npm 의존성을 설치하고 `CI=1 npm run qa:prepush`를 실행한다. `npm run build:ait`는 같은 소스의 새 AIT를 만들지만 SDK 배포 ID가 달라 바이트 해시는 매 빌드 같지 않을 수 있다. 제공 파일 검증은 위 SHA를 사용한다. 성능 재현은 performance/README, API 재현은 PR158 계약 문서와 benchmark 스크립트를 따른다. 벤치마크 스크립트의 `REPO`는 실제 공유 API 체크아웃 절대 경로에 맞춘다.

실제 운영 점검은 `live-smoke.mjs`에 `QA_PACKAGE_JSON`, `QA_OUT_DIR`, `QA_BACKEND_SHA`, `QA_FRONTEND_SHA`, `QA_FRONTEND_ENTRY`, `QA_FRONTEND_ASSET_SHA256`를 지정한다. 시장/기사/공식 통계가 바뀌므로 이10월16일 날짜·수치 검증을 미래 데이터에 그대로 적용하지 않는다. 기본 TLS 검증, 실제 응답의 변경 없는 relay, 별도 로컬 저장을 사용한다. 토스 native emulation이나 합성 시세를 운영 성공 증거로 사용하지 않는다.

CI 원본은 보존한 ZIP 또는 gzip 로그로 읽는다. gzip은 trailing whitespace까지 원본 바이트를 유지하며 압축을 풀어 JSON의 해시와 비교할 수 있다. GitHub Actions URL·정확한 소스·고정 fixture와 단계별 증거를 함께 제공한다.
