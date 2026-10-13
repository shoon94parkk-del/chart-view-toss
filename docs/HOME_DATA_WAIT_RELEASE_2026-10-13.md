# Home 데이터 대기 개선 운영 배포 기록

Render 운영 프런트는 `02cb31170ce4ce78cc724611189e06a1e4347bac`, 공유 백엔드는 `34debb1199eda0278783bdd34ef34bc61c78adf9`로 확인했다. [운영 앱](https://chart-view-toss.onrender.com), [릴리스 manifest](audits/2026-10-13-home-data-wait/release/release.json), [동일 harness 전체 표본](audits/2026-10-13-home-data-wait/release/performance-summary.json)을 연결한다. 패키지는0.15.1이며 새API·키·유료 인프라는 없다.

## 확인한 원인과 적용 범위

사용자가 관찰한 지수20초 요청 자체는 시작 시각과 공급자/큐 대기 로그가 없어 단일 원인으로 지목하지 못했다. 이후 정상353ms 응답은 그 관찰을 반박하지 않는다. 실제로 지연을 만드는 코드 경계와 중복 작업은 재현했다.

- 첫 HTML 요청에는 headers/body 전체 deadline이 없었고 실패 뒤 별도 fallback 예산이 생길 수 있었다. 기존 pending/cache 인계에 원래 시작부터5초 예산을 적용하고, 명시 retry·늦은 값 보호·실제 이전 가격과 날짜를 유지한다.
- 일반 cold 지수 응답이 기본4개 이후 보조4개까지 모두 기다렸다. 같은 기존 owner에서 기본 완료 또는 준비대기2초 후 실제 행/진행 상태를 반환한다. 전체8개 완료나 느린 공급자 자체가2초에 끝나는 보장은 아니다. [동일20초 제어 실험](audits/2026-10-13-home-data-wait/controlled-http.json)은 보조 하나 지연 시 첫응답20,092→61ms, 핵심 KOSPI 지연 시20,069→2,003ms였다.
- 한국 Naver 교체 경로가 기존 singleflight를 우회했다. 공통 provider owner에서 normalize한 ticker를 공유했다. 실제 canonical 경로의 동시 cache miss 제어검사에서 공급자 호출은6회→1회, quote/compare/valuation은3회→1회로 줄었다. 운영 공급자 호출 횟수를 실측한 수치는 아니다. 기존5초 cache put은 owner만 하며 caller별 dict를 반환한다.
- YahooChart/Naver의 반복 요청은 스레드별 표준RequestsSession을 재사용한다. 기존 timeout/headers/params/environment proxy·CA/default retry0, provider/cache/TTL/pool(BG2/BULK1/default)을 유지한다. auth/crumb 및 queue우선순위는 별도다. [백엔드 구현·검증](https://github.com/shoon94parkk-del/chart_View/blob/34debb1199eda0278783bdd34ef34bc61c78adf9/docs/HOME_PROVIDER_CONTENTION_2026-10-13.md)을 참고한다.

## 실제 표시 시간

같은 공개 harness·Pixel5 브라우저 에뮬레이션390×844/DPR1·기존proxy/TLS검증으로 측정했다. 아래는 관심3개를 저장한 새 browser context의3회 표본이다. cold는 새브라우저이며 server cold start를 뜻하지 않는다.

| 시점 | 지수4개 표시 | 관심3개 가격 표시 |
|---|---:|---:|
| 프런트 통합 전, 백엔드 첫 개선 후 정상 표본 | 478 / 720 / 375ms | 630 / 738 / 362ms |
| 첫 deadline/progress 운영본의 부하 표본 | 1,787 / 8,559 / 4,152ms | 3,668 / 13,858 / 4,249ms |
| 공급자 병합·연결 재사용 최종 운영본 | 1,233 / 345 / 355ms | 1,650 / 389 / 374ms |

최종 중앙값은 지수355ms·관심389ms이며 최댓값은1.23초·1.65초다. 관심 없는 첫진입3회 지수는354/377/364ms였다. 전체31구간이 완료됐고 page/runtime error0, 초기Home 요청 취소0이었다. 처음 발견한8.6/13.9초와5초 초기취소·polling회복을 숨기지 않고 원시자료를 함께 보존했다. “새 시세 확인 중” 종료만으로 가격 준비 성공을 판단하지 않았다.

공급자 시각·시장 session·자동수집 자료·서버cache/seed 상태가 서로 달라 개선율·p95·전사용자SLA를 계산하지 않는다. 제어중복 감소와 운영표본은 별도 증거다. 최종 측정에서도CPU는 순간적으로0.15-core 한도에 도달했고 메모리는 약66%였다. CPU/메모리 문제를 모두 없앴다는 결론은 아니다. 새가격·출처·asOf/직전거래일을 실제 응답과 표시에서 확인했고, 전체히트맵60행에는 이전/오래된 관측값 flag도 남아 있어 전종목 실시간이라고 설명하지 않는다.

## 검증과 배포 식별

- 프런트 Node527/build26직접진입/E2E824, 관련 기존QA6종, PR9검사, 정확한 main검사·promotion7종과 mainAIT빌드가 통과했다. 실제 운영 asset은 기존API/CDN주소를 같은 값으로 지정해 재빌드한 결과와 일치한다: `/assets/index-Sp9522Il.js`,322,264bytes,SHA256 `c7317891e41d0449f57fd008f1a44517666a9d7ed3b4e61ed7cc159cef000b66`. 환경주소를 지정하지 않은 검증 build의 `index-BiploiZa.js`와 구분하며 운영 설정은 바꾸지 않았다.
- 백엔드 Python761·필수Node52·release/bootbundle·문법·정적 데이터 검사가 통과했다. [PR149](https://github.com/shoon94parkk-del/chart_View/pull/149)의9개 필수검사가 통과했고 PR의 production job은 원래조건으로SKIPPED였다. `ddadf8e`의8개 main사전검사 후 배포 요청 직전 자동Guru수집5파일이 갱신돼 실제선택은 `34debb1`이었다. 앱코드 동일성을 확인하고 최신자료를 보존했다. 과거SHA만 기다리는ddad운영검사를 취소하고 실제34debb1에서 workflow_dispatch로 전체12개를 재실행해 모두통과했다(run38485233180/attempt1).
- Render deploy는 프런트 `dep-db73uq59fdbs73eusos0`(14:26:08Z), 백엔드 `dep-db7c0bq5b2lc73fbp2u0`(23:36:30Z) live다. 배포브랜치 반영 후 자동배포 시작이 없어 기존서비스 재배포를1회 요청했다. 자원/autoDeploy 설정은 바꾸지 않았다.
- 실제 backend health revision/3개Webasset/Guru CDN·API·실제4전략후보·오닐후보없음과 의도한 oldversion409를 확인했다. 최종 토스 realdata5/5와 backend production UI4/4가 통과했다. 재시작·실패 이벤트는 측정구간0이었다.

작업 중 추가된 운영TOP10은 원본파일/정상ancestry로 보존했다. 늦은Home카드 갱신으로PICK 클릭이 취소되는 실제버그를 수정했고, 처음보호변경이 명시펼치기까지 지연시킨회귀도 기존테스트 조건을 바꾸지 않고 복구했다. 실패819/820, 독립재현2/8, 첫CI모바일실패와 최종 통과를 [Home 구현 기록](HOME_DATA_WAIT_2026-10-13.md)에 남겼다. 추가로 실행한 오래된WebJSregex18검사는 baseline/current 모두12통과·6실패였으며 필수Node52와 구분했다. Web preview/API 배포이며 실제Toss Android/iOS Sandbox·공식bundle배포 승인은 별도 gate다.

## 다음 개선

전체 히트맵의 직접진입에서 쓰지 않는 Home market/bootstrap2요청을 제거하고 snapshot게시 실패가 workflowgreen에 가려지지 않게 한다. actual60행·출처/asOf·기존실시간재검증·유효한차트/부분실패안내는 유지한 채 같은 cold/SPA/warm harness로 비교한다. 첫관찰의 [게시 실패 run](https://github.com/shoon94parkk-del/chart_View/actions/runs/38313007576)은 과거증거이며 현재도같은상태라고 단정하지 않는다. sharedBG queue의 index우선순위와 auth실패cooldown은 실제대기/실패근거를 추가 확보해 별도로 판단한다.
