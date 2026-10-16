# 0.16.0 실제 운영 발행 증거

2026-10-16 UTC. 이 문서는 이미 발행된 제품의 관측 기록이다. 증거 브랜치는 제품 main/Render 브랜치를 이동시키지 않는다.

## 발행한 코드와 검증

- 프런트 main `637507cd4a5ab892e25510772a0610756447f8c2`, 기존 QA→Render 브랜치 정상 승격. [정확한 main904 E2E/단위/감사·승격 성공](https://github.com/shoon94parkk-del/chart-view-toss/actions/runs/38846797710).
- [PR135 최종 CI](https://github.com/shoon94parkk-del/chart-view-toss/pull/135): Node578·E2E226×4·독립 Mobile release QA·운영 API·성능 감사·AIT 모두 성공. PR134의 기존 개선도 포함한다.
- 백엔드 main `01929d488a2d3cfbe715bce1a357a9302c6b171f`, [단위840/Node52·모바일7·실제 운영4 검사 성공](https://github.com/shoon94parkk-del/chart_View/actions/runs/38845017242), [번들 검증 성공](https://github.com/shoon94parkk-del/chart_View/actions/runs/38845020101).
- 기존 Render 두 서비스에서 발행 완료. 배포 ID·발행 시각·실제 자산 해시는 [배포 증거](deployment-proof.json)에 있다. 서비스/유료 플랜/환경변수를 추가하거나 변경하지 않았다.
- 실제 운영 HTTP56/56 검증: [원본 및 결과](backend/assertion-result.json). 기존16매크로·홈 payload, 물가4종/같은 월 공식 지수/결측, 일정4재확인+24이전확인, 검증된 콜2개, DRAM6.6%, 1~10일 잠정치를 확인했다.
- 실제 운영 브라우저20/20 검증: [전체 결과](browser/results.json), [실행 로그](browser/run.log). Chromium320/390/430 및 iPhone WebKit 에뮬레이션이다. 관심종목 저장/정렬·연구 저장/미저장 복귀·네 가지 물가·NSA/SA·실제 결측·출처/일정·DRAM 막대/MoM을 확인했다. JS 예외0. 화면 이동/컨텍스트 종료에 따른 요청 취소는 원본에 남기며 네트워크 오류0으로 바꾸어 기록하지 않는다.
- PICK/LAB 관련 제품 코드는 변경하지 않았다. 기존 자동 수집이 갱신한 Guru 캐시는 생성 메타데이터가 달라졌지만 다섯 전략 객체 전체가 기존 운영cbd와 정확히 동일했다. [이전](backend/guru-baseline-screening.json) / [발행](backend/guru-final-screening.json).

## 실제 화면

- 홈: [320px](browser/chromium-320-home.png), [390px](browser/chromium-390-home.png), [430px](browser/chromium-430-home.png).
- DRAM: [320px 실제8→9월 그래프](browser/chromium-320-dram-corrected-chart.png), [390px 요약 MoM+6.6%](browser/chromium-390-dram-corrected-mom.png).
- [공식 발표 일정](browser/chromium-430-official-calendar.png), [WebKit 근원 PPI](browser/iphone-webkit-inflation-chart.png), [공식 회사 콜](browser/iphone-webkit-official-company-calls.png), [연구 이어가기](browser/iphone-webkit-research-continuation.png), [관심 정렬](browser/chromium-320-watch.png).

## 빌드와 테스트 가정의 진단 기록

처음 운영 검사는 로컬 기본 빌드의 자산명을 가정해 실패했다. 운영은 이미 설정된 공개 `VITE_CHARTVIEW_API_BASE`와 `VITE_CHARTVIEW_STATIC_DATA_BASE`를 사용한다. 이를 로컬에 그대로 적용해 Vite를 다시 실행했고 실제 운영 entry `/assets/index-Ct_2HPAt.js`의 SHA256 `96ab45ac22102312b9ceb0dd7925c3d23487f293911cc939aa2701ac499ec377`와 정확히 같았다. [재현 빌드 로그](render-reproduction-build.log). 환경변수나 운영 코드를 바꿔 자산명을 맞추지 않았다.

또한 홈이 이미 수출 응답을 기존 API 캐시에 저장했는데 진단 스크립트가 수출 화면에서 새 네트워크 응답을 요구해 기다렸다. 수정본은 이미 관찰한 실제 HTTP 응답을 재사용하고 화면의 MoM·막대·기간을 그대로 검증한다. 중복 API를 요구하지 않으며 응답을 조작하지 않는다. 최종 검사는 자산 SHA256 일치 조건도 추가했다. [최초 실행의 원본 결과](first-attempt-diagnostics/results.json), [로그](first-attempt-diagnostics/run.log), [스크립트](first-attempt-diagnostics/original-harness.mjs)를 보존한다. 원인을 조사하며 첫 실행을 중단했으므로 전체 완료나 통과로 표시하지 않는다.

## 성능 및 남은 제약

같은 조건의 로컬7표본 중앙값: 홈132→130ms, 상세 현재가276→289ms, 기존 매크로201→220ms, 신규 물가277ms. API 수9/10/2는 동일하고 main gzip+335B다. [제품 변경 보고서](../../RELEASE_INSIGHTS_2026-10-16.md)와 [재현 가능한 전후 측정](../release-insights-20261016/performance/REPORT.md)에 원본이 있다. 시세 공급자/API를 바꾸거나 시세가 빨라졌다고 주장하지 않는다.

배포 직후 수출 요약은45초 제한을 초과했다. [당시 실패](backend/final-live-contract-01929d4.log)를 보존한다. [Render 실제 로그](backend/render-export-warm-log.json)는 최초 수출 캐시 준비115449ms/warnings0을 기록했다. [동일45초 계약 재검사](backend/final-live-contract-01929d4-recheck.log)는 성공했고 03:43UTC [후속 실제 HTTP](backend/api-http.json)는 요약223ms/반도체 추이393ms/잠정치255ms였다. **재기동 후 최초 캐시 준비 지연은 남는 운영 제약**이며 캐시가 준비된 한 번의 관측을 최초 실행이나 p95 개선으로 표시하지 않는다.

발표 전 불변 예상치/회계기준/실제 발표시각이 부족해 과거 서프라이즈·주가 반응 통계는 제공하지 않는다. 실제 Android/iOS Toss Sandbox, PICK 정책 범위, 기존 토스 콘솔·데이터 권리 확인도 미검증이다. Render 발행과 AIT 생성은 Toss 공개 출시 승인이 아니다.

## 재현

이 증거 브랜치에서 `npm ci`, `npx playwright install --with-deps chromium webkit` 후 아래처럼 실행한다. 브라우저 스크립트는 동일 검증을 저장 경로만 상대경로로 바꿨고 가짜 응답이 없다. 환경에 인증된 프록시가 필요하면 기존 `E2E_PROXY_SERVER` 설정을 사용한다. TLS 검증을 끄지 않는다.

```sh
QA_BACKEND_SHA=01929d488a2d3cfbe715bce1a357a9302c6b171f \
QA_FRONTEND_SHA=637507cd4a5ab892e25510772a0610756447f8c2 \
QA_FRONTEND_ENTRY=/assets/index-Ct_2HPAt.js \
QA_FRONTEND_ASSET_SHA256=96ab45ac22102312b9ceb0dd7925c3d23487f293911cc939aa2701ac499ec377 \
node docs/evidence/release-insights-production-20261016/production-smoke.mjs

python docs/evidence/release-insights-production-20261016/backend/assert_backend_final.py
```

첫 명령은 실제 운영을 읽고 결과를 `artifacts/release-production-20261016/`에 저장한다. 두 번째는 이 릴리스의 저장된 실제 HTTP 증거를 재계산한다. 이후 정상 데이터 갱신이나 새 배포가 생기면 정확한 SHA·2026-09 기준 검사가 실패하는 것이 정상이다. 이 릴리스의 기대값을 몰래 최신 값으로 바꾸지 않는다.

새 AIT는 제품 변경 소스에서 직접 생성한10475675bytes/로컬 SHA256 `dafa4b6e3ccdd21e3968f567fc8981f1bffd38549e30bc3cddbbb6c38e930221`이다. 정확한 main의 [새 CI 빌드·다운로드](https://github.com/shoon94parkk-del/chart-view-toss/actions/runs/38846797707/artifacts/12024010378)도 생성됐으며 공개 콘솔 제출은 하지 않았다. CI와 로컬은 빌드 ID가 달라 동일 바이트라고 주장하지 않는다.
