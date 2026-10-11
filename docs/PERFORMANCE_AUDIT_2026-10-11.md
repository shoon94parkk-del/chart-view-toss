# 2026-10-11 성능 측정과 분석 번들 분리

초기 메인 JavaScript를 326.52kB에서 296.75kB로 줄였다. Home·관심종목에서는 사용하지 않는 조건 검색·전체 히트맵·컨센서스·밴드·투자 도구를 열 때 기존 lazy coordinator로 불러온다. 정상 글꼴 환경에서 다시 실행한 동일 harness의 로컬 3회 표본에서 Home 최초 주요 콘텐츠 중앙값은 664→413ms였으나 일부 분석 경로는 느려졌다. 이 기록은 초기 번들 감소와 실제 측정값을 구분하며 모든 화면의 속도 향상을 주장하지 않는다.

## 범위와 기준

| 항목 | 확인한 기준 |
|---|---|
| 프로젝트 | `github:shoon94parkk-del/chart-view-toss` |
| 작업 브랜치 | `perf/measure-improve-20261011` |
| 이전 source | `4efea61741a058070142a75855b100b73303ca34` |
| 변경 후 측정 source | 위 SHA + 작업 트리 변경; JSON의 `sourceRevision`은 `null`, 아래 자산 hash로 구분; 최종 커밋·CI·배포 확인과 구분 |
| 패키지 | `0.15.1` 유지 |
| 운영 프런트 | `https://chart-view-toss.onrender.com` |
| 공유 백엔드 | `https://chart-view-pkv8.onrender.com`; 관측 revision `fcf8038b4d12c01de8447ebc34d79955240c52ab` |
| Render 워크스페이스 | 사용자 지정 `Chart View` |
| 운영 기존 프런트 deploy | `dep-db5ig52d0e5s73fjduag` · live · `4efea61741a058070142a75855b100b73303ca34` · 완료 `2026-10-11T06:09:50Z` |
| 운영 기존 메인 자산 | `/assets/index-CQAV79Ao.js`; 위 기존 deploy와 함께 확인 |
| 로컬 이전/이후 메인 자산 | `index-DoJWYFE_.js` / `index-Dfp2oTJ7.js` |

분류는 **new behavior**다. 기존 분석 화면과 lazy 실패 복구를 다시 설계하지 않고, 메인에서 eager import하던 `analysisViews.js`를 기존 `renderLazyAnalysis`에 연결했다. 사전 확인은 `AGENTS.md`, no-repeat 정책, project-memory/decision-log/guardrails 및 기존 lazy 회귀를 기준으로 했다. 구현·harness·백엔드 점검·독립 검토를 파일 소유권으로 나누고 성능 실행과 공용 QA는 주 에이전트가 순차 실행했다.

## 측정 방법과 한계

`tests/production_performance_audit.mjs`와 `scripts/performance-harness.mjs`의 동일 Chromium 390×844 harness를 사용했다. 운영 기준은 18경로 각 1회이며, 로컬 전후는 7경로 각 3회다. 로컬 이전 빌드를 별도로 보존하고 변경 후 빌드와 같은 `127.0.0.1:4173` 주소에서 교체해 측정했다. 두 로컬 빌드는 `.env.*`와 exported Vite 설정 없이 기본 API-only 경로를 사용했다. 운영의 공개 정적 데이터 경로와 로컬 API-only 경로는 다르므로 운영 표본과 로컬 전후 표본을 서로 속도 비교하지 않는다.

처음 준비한 브라우저 환경에서는 OS fontconfig가 OpenAI Sans WOFF2를 native font로 선택해 Chromium의 글자·geometry가 잘못 표시됐다. 앱의 실제 44px 복구 버튼과 memory pending 검사 실패를 조사하다 발견했으며 앱 CSS·테스트·조작 영역 기준을 바꾸지 않았다. 사용자 공간 fontconfig에서 `/usr/share/fonts/openai-sans/*.woff2`를 OS 선택에서 제외하고 설치된 native Noto Latin/CJK·Liberation·DejaVu fallback을 적용했다. 환경의 `FONTCONFIG_FILE` 설정 뒤 실제 분석 메뉴 복구 버튼은 107.45×44px, 메모리 가격 `$58.00`의 높이는 31px로 확인했다. 이는 브라우저 OS font 선택의 복구이며 앱 번들에 새 글꼴을 추가한 것이 아니다.

[측정 manifest](audits/2026-10-11-performance/measurement-manifest.json)는 소스 파일·이전/이후 자산·원자료의 SHA-256, 빌드 설정·글꼴 설정·브라우저 버전을 연결한다. 변경 후 JSON의 null sourceRevision은 이 파일 해시와 최종 PR 커밋으로 보완하며 이미 배포된 SHA라고 표현하지 않는다.

원래 font-invalid 측정은 `/workspace/scratch/performance-invalid-font-reports`에 진단용으로 격리하고 이 성능 비교에서 제외했다. 아래 7개 브라우저 JSON은 모두 같은 정상 글꼴 환경에서 2026-10-11 06:48–06:49 UTC에 다시 실행한 결과다. 새 환경에서는 현재 머신의 native 글꼴과 실제 glyph/geometry를 확인한다. 이 머신의 scratch fontconfig 경로를 제품 설정이나 다른 환경의 기본값으로 복사하지 않는다.

- **cold**: 새 브라우저 컨텍스트에서 해당 경로로 직접 진입하고 실제 주요 콘텐츠를 기다린다. Render 서버를 의도적으로 sleep/restart한 cold start가 아니다.
- **spa**: 새 컨텍스트의 Home 주요 콘텐츠를 확인한 뒤 같은 문서에서 해당 경로로 이동한다. Home은 root이므로 이 값이 없다.
- **warm**: 해당 경로의 주요 콘텐츠를 확인하고 분석 메뉴를 거쳐 다시 방문한다. `more`는 Home을 거쳐 복귀한다. 고정 settling sleep은 사용하지 않는다.
- 실제 공개 API/CDN 응답을 기존 프록시·Node relay로 전달했다. HTTP 캐시는 Playwright routing 때문에 비활성화된다. 같은 문서의 모듈·앱 캐시 재사용은 유지된다. 일반 사용자 브라우저 HTTP 캐시의 속도를 재현한 값이 아니다.
- 주요 영역의 `ready/error/unavailable/empty/timeout`을 구분한다. 선택 영역의 남은 로더·부분 실패·시세 범위를 별도로 기록하며 오류 화면이나 placeholder를 정상 데이터 준비로 세지 않는다.
- API의 `decodedBodyBytes`는 압축을 푼 응답 본문 크기이며 네트워크 wire bytes가 아니다. 본문 완료 시간과 헤더 도착을 구분하고, 측정 종료 시 pending/canceled인 본문을 0바이트·0ms 성공으로 만들지 않는다.
- 삼성전자·NVIDIA·Apple 공개 예시로 목록을 seed했다. 개인 관심목록·메모·키·인증값을 증거에 넣지 않았다.

외부 API·CDN·서버 캐시 상태는 전후 사이에 달라질 수 있다. 3회 표본은 p95나 SLA가 아니며, 운영 1회 표본으로 장기 가용성·모바일 통신망·실제 Toss WebView 속도를 보장하지 않는다.

## 운영 앱의 기존 기준 — 18경로 1회

[운영 원자료](audits/2026-10-11-performance/production-baseline.json)는 정상 글꼴 환경에서 2026-10-11 `06:48:49 UTC`에 저장했다. 아래는 각 1회 값(ms)이며 모든 콘텐츠 측정이 `ready`였다. Home SPA는 `root`로 기록한다. 수집한 runtime events/page errors와 가로 overflow는 없었다. JSON의 `sourceRevision`은 `null`이다. 기존 운영의 exact SHA는 [Render deploy·event 증거](audits/2026-10-11-performance/render-deploy-event-before.json)로 별도 확인했으며 JSON의 null 값으로 증명하지 않는다.

| 경로 | cold | spa | warm |
|---|---:|---:|---:|
| 홈 | 1,616 | — | 28 |
| 수익률 비교 | 668 | 370 | 22 |
| 관심종목 | 130 | 11 | 6 |
| 밸류에이션 | 428 | 363 | 8 |
| 경제 지표 | 841 | 711 | 17 |
| 조건별 종목 찾기 | 465 | 107 | 36 |
| 관심종목 뉴스 | 457 | 165 | 11 |
| 전체 히트맵 | 1,567 | 411 | 56 |
| 실적 전망 | 532 | 362 | 10 |
| 역사적 밸류에이션 | 482 | 313 | 16 |
| 삼성전자 상세 | 703 | 36 | 32 |
| 투자 도구 | 134 | 26 | 7 |
| 데이터·이용 안내 | 138 | 16 | 9 |
| 수출 데이터 | 742 | 81 | 56 |
| 거장 투자법 | 1,276 | 869 | 56 |
| 선정 기록 | 639 | 62 | 57 |
| 반도체 가격 | 620 | 310 | 54 |
| 분석 메뉴 | 149 | 15 | 18 |

## 초기 번들과 로컬 전후 — 7경로 각 3회

| 빌드 자산 | 이전 | 변경 후 | 감소 |
|---|---:|---:|---:|
| 메인 JavaScript | 326.52kB | 296.75kB | 29.77kB · 약 9.1% |
| 메인 JavaScript gzip | 108.65kB | 98.93kB | 9.72kB · 약 8.9% |
| 메인 CSS | 172.89kB | 172.15kB | 0.74kB |

빌드 kB는 1,000바이트 단위다. 코드·CSS를 삭제한 것이 아니라 분석 경로로 옮겼다. 변경 후 분석 진입에서는 30,819바이트 JavaScript와 744바이트 CSS의 `analysisViews` 자산을 요청한다. Home·Watch의 cold 진단에는 이 자산이 없었다. 초기 번들이 작아졌다는 사실과 분석 첫 진입에서 추가 자산을 기다린다는 비용을 함께 보존한다.

[이전 원자료](audits/2026-10-11-performance/local-before.json)와 [변경 후 원자료](audits/2026-10-11-performance/local-after.json)의 주요 콘텐츠 중앙값(ms)이다. 각 실제 콘텐츠 phase가 3/3 `ready`였고 runtime error·overflow는 없었다.

| 경로 | cold 이전→이후 | spa 이전→이후 | warm 이전→이후 |
|---|---:|---:|---:|
| 홈 | 664→413 | — | 23→34 |
| 관심종목 | 81→79 | 17→16 | 10→11 |
| 조건별 종목 찾기 | 2,425→894 | 570→793 | 37→55 |
| 전체 히트맵 | 395→409 | 316→373 | 57→59 |
| 역사적 밸류에이션 | 354→360 | 360→371 | 11→54 |
| 투자 도구 | 87→99 | 10→61 | 7→56 |
| 삼성전자 상세 | 660→421 | 64→73 | 30→31 |

Home 최초 주요 콘텐츠의 표본 중앙값은 약 37.8% 줄었다. 조건 검색 cold도 줄었지만 API가 반환한 동일 screener 2,115,922 decoded bytes의 cold body 시간은 이전 863/3,705/2,293ms, 이후 676/1,039/750ms였다. 이 변동이 섞이므로 스크리너 표의 감소를 번들 분리만의 효과로 단정하지 않는다. Home의 3회 표본 감소도 코드 변경만의 인과관계로 인증하지 않는다. 기존 gzip·공급자 경로를 새로 바꾸지 않았다.

조건 검색 spa는 570→793ms, warm은 37→55ms로 증가했다. 히트맵·밴드·도구의 세 phase와 Home warm·상세 spa/warm 등에도 증가가 관측됐다. 분석 경로는 최초 lazy 자산 요청 비용이 있고, 재방문에서도 coordinator가 먼저 loading shell을 만든 뒤 비동기 mount한다. 그 구조와 외부 응답 변동을 함께 검토한다. 도구 spa +51ms/warm +49ms, 밴드 warm +43ms를 감추지 않는다. harness가 50ms 간격으로 준비 상태를 확인하므로 작은 시간 차이를 사용자 지연의 정확한 증가량으로 인증하지 않는다. 이 표를 모든 화면의 개선이나 원인별 인과관계로 해석하지 않는다.

아래는 각 phase에서 완료된 resource entry 중 JavaScript의 **decoded bytes 합계 중앙값**이다. CSS·이미지·API 본문은 제외하고, phase 시작 이후부터 primary 준비 진단 시점까지의 entry만 집계한다. 선택 모듈이 뒤늦게 추가되면 이 합계 밖일 수 있다. Wire bytes나 모든 네트워크 요청의 총량으로 해석하지 않는다.

| 경로 | cold JS bytes 이전→이후 | spa JS bytes 이전→이후 | warm JS bytes 이전→이후 |
|---|---:|---:|---:|
| 홈 | 367,876→338,105 | — | 0→0 |
| 관심종목 | 326,518→296,745 | 0→0 | 0→0 |
| 조건별 종목 찾기 | 326,518→327,564 | 0→30,819 | 0→0 |
| 전체 히트맵 | 332,730→333,777 | 6,212→37,032 | 0→0 |
| 역사적 밸류에이션 | 489,362→490,408 | 162,844→193,663 | 0→0 |
| 투자 도구 | 326,518→327,564 | 0→30,819 | 0→0 |
| 삼성전자 상세 | 558,166→528,393 | 231,648→231,648 | 0→0 |

분석 경로의 전체 cold JS는 단순히 29.77kB 줄어든 것이 아니다. 분리한 chunk와 lazy import overhead를 함께 받아 약 1kB 늘어난 관측이며, Home/Watch의 초기 메인 감소와 구분한다. Warm은 기존 문서의 module 재사용으로 측정 구간의 새 JS resource entry가 없었다.

## 선택 영역 503에서 주요 콘텐츠 보존

실제 기본 응답은 유지하고 **정확히 한 pathname**만 503으로 처리했다. 각 전후 3회이며 cold/warm 모두 3/3 주요 콘텐츠가 `ready`였다.

| 시나리오 | cold 중앙값 이전→이후 | warm 중앙값 이전→이후 | 확인한 상태 |
|---|---:|---:|---|
| `/static/data/pick_monitor.json` 503 | 365→490ms | 56→56ms | 성과·선정 기록은 표시; 사후점검 실패·재시도 문구 유지 |
| `/api/export-momentum` 503 + 화장품 직접 진입 | 359→592ms | 57→56ms | 독립 item-detail의 화장품 차트·수치 표시; 전체 월간 실패가 주요 산업 자료를 막지 않음 |

원자료: PICK [이전](audits/2026-10-11-performance/failure-picks-before.json) / [이후](audits/2026-10-11-performance/failure-picks-after.json), 수출 [이전](audits/2026-10-11-performance/failure-exports-before.json) / [이후](audits/2026-10-11-performance/failure-exports-after.json). 이전 두 파일의 `sourceRevision`은 정확한 `4efea61741a058070142a75855b100b73303ca34`, 변경 후 두 파일은 `null`이다. 기록의 cold resource 메인 hash가 앞서 확인한 로컬 이전/이후 빌드와 일치한다. null 필드를 exact commit 증거로 해석하지 않는다. Cold 중앙값은 증가했으며 기존 실패 격리가 유지된 결과다.

## Render 관측과 별도 백엔드 작업

[Render 원자료](audits/2026-10-11-performance/render-before.json)는 `Chart View`에서 읽은 기존 backend 상태다. 최근 instance 메모리는 512,344,060 / 536,870,900바이트로 약 95.4%였고, 시작 직후 약 333MB에서 증가한 관측이 있다. 이 값만으로 leak·특정 캐시·프런트 변경이 원인이라고 판단하지 않는다. CPU의 마지막 관측은 0.0052113766 / limit 0.15였지만 이 한 시점으로 장기 CPU 여유를 보장하지 않는다. HTTP latency/request-count metric은 빈 data를 반환했으므로 p95나 전체 요청 수를 계산하지 않았다.

[별도 Render event·deploy 증거](audits/2026-10-11-performance/render-deploy-event-before.json)에서는 2026-10-11 `04:54:23 UTC`, 기존 instance `f8m6f`의 실제 OOM event `evt-db5hcvu8bjmc7397b4kg`와 512MiB limit이 확인됐다. 이 event는 현재 instance의 증가 원인이나 특정 cache의 원인을 식별하지 않으며, 이번 로컬 프런트 변경 뒤 운영에서 발생한 사건도 아니다.

[후속 Render 관측](audits/2026-10-11-performance/render-followup.json)은 `06:40→13:03 UTC` 구간의 기존 instance `wgdxc`를 조회했다. 마지막 메모리는 446,976,000 / 536,870,900바이트, 약 83.3%였고 CPU는 0.0017396833이었다. 앞선 06:32 수집의 95.4%보다 내려간 관측도 있으므로 지속 증가나 leak을 단정하지 않는다. `13:04 UTC`의 운영 health revision은 여전히 `fcf8038b4d12c01de8447ebc34d79955240c52ab`로 새 성능 패치는 배포되지 않았다. 감소를 새 evidence-cache 수정의 운영 효과로 주장하지 않는다.

운영 error 로그에는 Yahoo 인증/컨센서스의 429가 있었다. 로그 관측과 이번 브라우저 primary 준비를 분리한다. 성공한 18경로 표본이 제공처 rate limit의 해결을 입증하지 않는다.

같은 사용자의 요청에서 공유 백엔드의 거장 evidence cache 반복 JSON 파싱을 독립 검토했다. 구현·오프라인 전후 비용·400/404/409/503·파일 교체 회귀와 메모리 해석은 [백엔드 commit 보고서](https://github.com/shoon94parkk-del/chart_View/blob/fe7cb20265482e3a2a52fcb7e470ffa50dfc5772/docs/PERFORMANCE_AUDIT_2026-10-11.md)와 [PR 147](https://github.com/shoon94parkk-del/chart_View/pull/147)에 보존한다. 해당 commit `fe7cb20265482e3a2a52fcb7e470ffa50dfc5772`는 Python 718개·Node 52개 검증과 PR CI의 check/build/기존 mobile 7jobs가 성공했다. PR의 production job은 예정된 skip으로 운영 배포를 뜻하지 않는다. 로컬 handler 처리시간을 운영 HTTP·브라우저 개선으로 합치거나, 메모리 관측의 원인이 확인됐다고 주장하지 않는다. Tested revision의 실제 운영 배포·health·근거 응답은 별도 확인 대상이다.

## 유지한 계약과 QA 체크포인트

`src/analysisViews.js`의 화면·API 가공과 `renderLazyAnalysis` coordinator는 유지했다. Main의 작은 route registry와 동적 import만 바꾸며 mount에는 기존 `tab/state/shell/bindNav/displayName/openCompareSheet`를 그대로 전달한다. 제목·direct entry·필터/Back·청소 함수·view epoch·native Back·안전 영역을 유지한다. 새로운 provider 요청, cache layer, TTL, quote revalidation 약화, paid infrastructure, LLM API/key는 없다.

`tests/lazyAnalysisRoutes.test.mjs`의 focused 44/44가 통과했다. 새 다섯 경로의 import 실패·늦은 완료/거절·같은 경로 재진입, 다른 분석 경로 경쟁, 기존 인자와 route registry 일치 및 Home/Watch import gate를 검사한다. 기존 4브라우저 recovery spec에 해당 경로들의 실제 chunk 실패·명시적 복구·재진입과 shared CSS 복구·단일 module 재사용 및 API→표시값 검사를 추가했다. Tools는 원래 메뉴 항목이 없는 직접 경로이므로 실제 hash 진입 계약을 검사한다.

앞선 집중 브라우저 회귀 92회 중 조작 영역·memory pending 실패를 조사하면서 위 OS font 선택 문제를 확인했다. 앱·테스트 assertion을 변경하지 않고 환경을 복구하고 모든 성능 JSON을 다시 측정했다. 이 실패를 앱 runtime 결함이나 앱 수정 결과로 기록하지 않는다. 아래 최종 검증은 정상 글꼴 환경에서 완료했으며 로컬 브라우저 viewport는 Android/iOS Toss Sandbox 검증이 아니다.

## 재현

먼저 기준 source를 checkout하고 동일 설정으로 build해 별도 보존한다. 변경 후 build도 같은 source 설정·server·browser·viewport에서 측정한다. 아래는 새 출력 파일을 만드는 예이며 기존 증거를 덮어쓰지 않는다. 프록시가 필요한 환경은 기존 `E2E_PROXY_SERVER`와 CA 신뢰를 유지한다.

```bash
PERF_BASE_URL=http://127.0.0.1:4173 PERF_RUNS=3 \
  PERF_ROUTES=home,watch,discover,heatmap,bands,tools,detail/005930.KS \
  PERF_SOURCE_SHA='<measured-source-sha>' PERF_OUTPUT=artifacts/performance/local.json \
  node tests/production_performance_audit.mjs

PERF_BASE_URL=http://127.0.0.1:4173 PERF_RUNS=3 PERF_PHASES=cold,warm \
  PERF_ROUTES=picks PERF_FAILURE_PATH=/static/data/pick_monitor.json PERF_FAILURE_MODE=503 \
  PERF_OUTPUT=artifacts/performance/picks-503.json node tests/production_performance_audit.mjs

PERF_BASE_URL=http://127.0.0.1:4173 PERF_RUNS=3 PERF_PHASES=cold,warm \
  PERF_ROUTES=exports/cosmetics PERF_FAILURE_PATH=/api/export-momentum PERF_FAILURE_MODE=503 \
  PERF_OUTPUT=artifacts/performance/exports-503.json node tests/production_performance_audit.mjs
```

`<measured-source-sha>`는 실제 SHA 문자열로 바꾼다. 본문 크기·본문 완료·오류·중앙값 집계는 `tests/performanceHarness.test.mjs`로 보호한다. 최종 통합자는 필수 `npm run qa:prepush`와 관련 기존 QA를 완료하고, tested main과 실제 Render deploy/assets를 확인한 뒤 운영 상태를 추가한다.

## 최종 로컬 검증과 게시 상태

`npm run qa:prepush`는 exit 0으로 완료했다. **Node 413개, production build와 26개 직접 진입 경로, E2E 728개**가 통과했다. E2E는 desktop/narrow/Android Chromium·iPhone SE WebKit에서 각각 182개이며 실패·flaky·skip은 0개다. 전체 브라우저 실행은 9.8분이었다. 실행 환경은 Node 24.19.0, Playwright 1.55.0의 Chromium 140.0.7339.16·WebKit 26.0이며 CI의 Node pin 24.21.0과 구분한다.

기존 `analysis_qa`, `progressive_qa`, `mobile_continuity_qa`, `audit_plan_qa`도 변경 없는 production build를 대상으로 모두 exit 0으로 통과했다. 320/390/430/1440px에 걸쳐 총 31장 스크린샷을 별도 session 증거에 보존했다. 독립 최종 검토에서 app/cache 변경의 blocker가 없었고 `git diff --check`와 증거 링크를 확인했다. [검증 요약](audits/2026-10-11-performance/validation.json)은 프로젝트별 결과·script/log hash·검증 환경을 기록하며 [측정 manifest](audits/2026-10-11-performance/measurement-manifest.json)의 실제 application source/asset hash와 연결한다.

프런트 성능 브랜치를 검토 가능한 PR로 게시한다. 두 성능 브랜치의 병합·운영 배포는 실행하지 않았으며 PR CI는 별도 확인 단계다. 기존 운영 프런트 `4efea61`과 백엔드 `fcf8038`이 이 로컬 변경의 배포 결과로 바뀌었다고 표현하지 않는다. 원인 미확인 메모리 관측의 후속 점검과 실제 Android/iOS Toss 검증은 남아 있다.
