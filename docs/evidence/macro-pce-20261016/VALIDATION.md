# PCE 통합 검증 — 2026-10-16

프런트 소스 `a0d2baf4f0cb1bc4652ba4be7a7c5143003d6bd3`, 이전 운영 `637507c`, 백엔드 최종 운영 `b08af11f4bca7703c8d9c6d7a0f551249c4323b2`. 프런트 PR/main CI·운영 게시·신규 AIT 결과는 PR의 최종 댓글에서 확인한다. 이 파일은 로컬 검증과 이미 완료된 백엔드 게시 증거다.

| 검사 | 결과 |
|---|---|
| `npm run qa:prepush` | Node596, Vite 및27개 직접 경로, E2E912 통과 |
| 브라우저 | desktop/narrow/Android Chromium, iPhone WebKit 각228개; 실패·재시도·flaky·skip0 |
| PCE API→가공→UI | PCE/근원 PCE, 두 SA 변화율, 관측월/발표일, 출처, 예상치 미제공,320/390/430px 및axe 통과 |
| 비교 신호 | 고정 테스트 자료의 낮음/같음/높음/미제공, 늦은 수집·불일치·중복·날짜 전용 발표 검증 |
| 기존 모바일 QA | analysis 및review_validation 모두320/390/430px 통과; 기존16개/빈 데이터 복구 유지 |
| 백엔드 | Python890, Node52, 두 번들 freshness 통과 |
| 백엔드 최종 CI | [App38852147858](https://github.com/shoon94parkk-del/chart_View/actions/runs/38852147858) 소스8개+실제운영4개, [Bundle38852151076](https://github.com/shoon94parkk-del/chart_View/actions/runs/38852151076), [Production Mobile38852801854](https://github.com/shoon94parkk-del/chart_View/actions/runs/38852801854) 모두 통과 |
| 실제 백엔드 게시 | Render `dep-db8qo9ui0phs738mbea0`,04:47:58Z; health/자산/Guru1b17255247f308e7c724/의도한409 검증 |
| PICK/LAB | 보호된7개 소스·데이터 파일이 이전01929d4와 동일; 선정·기록·계산·API/노출 코드 변경 없음 |
| 실제 Toss Android/iOS Sandbox | 미실행; 브라우저 에뮬레이션으로 대체 통과 처리하지 않음 |

초기 prepush는 이전 로컬 preview가4173을 점유해 브라우저 시작 전에 중단됐다. 해당 서버를 정리한 뒤 동일 전체 명령을 실행해912개 통과했다. [초기 오류](initial-prepush-port-conflict.txt)를 보존한다. 독립 검토의 날짜 전용 비교/선택 소스 CI/일정 상태 문제는 실패 재현 후 수정했다. 기존 검사를 삭제하거나 완화하지 않았다. 이전6a main의 소스8개는 통과했으나 정기 데이터 갱신으로 superseded되어 게시 검사만 취소했으며 전체 성공으로 집계하지 않는다. [기록](https://github.com/shoon94parkk-del/chart_View/pull/155#issuecomment-6208240474).

## 데이터와 비교의 한계

[공식 데이터 검증](official-data-verification.json), [PICK/LAB 해시](final-protected-pick.json), [브라우저 결과](browser-summary.json), [백엔드 실제 게시 검증](backend-release.json)을 보관한다. `qa-*.png` 여섯 장은 **결정론적 고정 QA 자료**이며 운영 데이터 캡처가 아니다. 운영 expected 숫자는 아직 수집하지 않는다. 승인된 공급자·재배포 권한·발표 전 보존 증거가 필요하며 회색 미제공을 성공 비교로 표시하지 않는다.

## 동일 조건 로컬 성능

Node24/고정Chromium/390×844, 동일6종 자료, API80ms, 네트워크 외부 차단, 독립 context, warmup1회 제외 후각7회. 전체 QA/빌드/다른 브라우저 작업을 멈추고 두 버전을 연속 측정했다. 통합 중 예비 측정은 최종 보고에 사용하지 않는다. [보고서·재현 명령](performance/REPORT.md), [원자료](performance/comparison.json).

| 유효 콘텐츠 | 이전 중앙값 | 이후 중앙값 | 시작 요청 수 |
|---|---:|---:|---:|
| 홈 |139ms|134ms|9→9|
| 삼성전자 상세 |292ms|307ms|10→10|
| 기존 경제지표 |239ms|232ms|2→2|
| 선택형 물가 그래프 |312ms|309ms|동일 macro 응답 사용|

초기 JS327,103B 동일(gzip108,950→108,947B). 지연 로드 물가 JS+4,047B(gzip+1,222B), CSS+1,810B(gzip+335B). PCE를 보려고 새 API를 호출하지 않는다. 같은6종 자료를 두 빌드에 전달하므로 실제 네트워크 자료 증가를 분리했다. 이전 빌드는 추가PCE를 무시한다. 소규모 로컬 중앙값·최댓값이며 운영p95·SLA나 현재가 공급자 속도 개선으로 일반화하지 않는다.

## 실제 운영 HTTP 관측

동일 클라이언트의 verified TLS/기존proxy/RequestsSession으로 `/api/macro`를 매번 완전히 읽고1회 예열을 제외한7회를 비교했다. 서버를 강제로 sleep시키지 않았다.

| 단계 | 중앙값 / 최대 | 해석 |
|---|---:|---|
| 이전01929d4 |206.859 /287.867ms|기존 예열 서버|
| 새 게시 직후 |979.897 /2,242.389ms|기동·운영 검사가 겹친 초기 관측도 보존|
| CPU가 한도의10% 아래로 내려간 뒤 |188.796 /200.786ms|예열 비교; 전체적인 속도 향상을 보장하지 않음|

응답은140,712→162,235 decoded bytes(+21,523B). [이전](live-macro-before.json), [초기 이후](live-macro-after-startup-and-ci.json), [안정화 이후](live-macro-after.json), [측정기](measure-live-macro.py). [CPU 초기 관측](render-startup-metrics.json)은0.15/0.15코어, [후속 관측](render-steady-metrics.json)은0.0074/0.15코어다. 시점의 상관관계이며 유일 원인으로 단정하지 않는다. HTTP p95는 측정하지 않았다. 기존 Render cold-start/기동 부하가 해결됐다고 주장하지 않는다.

최종 게시 후 `live-smoke.mjs`는 실제 상태/본문을 바꾸지 않는 `route.fetch` 전달로 public 응답을 검증한다. 고정 QA값으로 운영 검사를 대체하지 않는다. `QA_PACKAGE_ROOT`, `QA_OUT_DIR`, `QA_BACKEND_SHA`, `QA_FRONTEND_SHA`, `QA_FRONTEND_ENTRY`, `QA_FRONTEND_ASSET_SHA256`을 지정하며 native Sandbox와 구분한다.
