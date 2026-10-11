# 2026-10-11 성능 개선 운영 배포 검증

프런트 PR [129](https://github.com/shoon94parkk-del/chart-view-toss/pull/129)와 백엔드 PR [147](https://github.com/shoon94parkk-del/chart_View/pull/147)를 병합했고, 사용자 지정 Render `Chart View`의 기존 두 서비스에 배포했다. 둘 다 `live`이며 실제 운영 파일·health revision·데이터·UI를 확인했다. 패키지는 `0.15.1`을 유지한다.

## 정확한 운영 배포

| 항목 | 이전 | 병합된 실제 운영 커밋 | Render 배포 | live 완료 UTC |
|---|---|---|---|---|
| [Toss 웹 앱](https://chart-view-toss.onrender.com) | `4efea61` | `e5ffa5669a4b3f8cbf7df1d6df142dd91efa89f6` | `dep-db5p7md9fdbs73dl7rgg` | `2026-10-11T13:49:35.301299Z` |
| [공유 백엔드](https://chart-view-pkv8.onrender.com) | `fcf8038` | `6bdfbc3277dd0a105a10f28f7abd43f1914a5f26` | `dep-db5p6aijnfac73b8ueh0` | `2026-10-11T13:47:35.584726Z` |

[프런트 Render 증거](audits/2026-10-11-performance-deployment/frontend-deploy.json)와 [백엔드 Render 증거](audits/2026-10-11-performance-deployment/backend-deploy.json)를 보존했다. 프런트 병합 트리는 PR의 전체 검증된 `8e190a1` 트리와 동일하다. main 회귀 gate와 preview-branch 동기화 성공 뒤 `feat/apps-in-toss-mvp`가 같은 `e5ffa56`을 가리킴을 확인했다. 백엔드 main에는 기존 자동 macro/guru 데이터 갱신을 보존하고, 병합된 실제 데이터 기준 Python 718개와 번들 검증을 다시 통과했다. 기존 auto-deploy 설정에서는 새 배포가 시작되지 않은 것을 확인한 뒤 기존 서비스를 한 번씩 수동 배포했다. 서비스 설정·요금제·환경 변수는 변경하지 않았다.

이 후속 증거 커밋은 문서와 검증 원자료만 저장한다. 실행 소스는 배포한 두 main SHA에 고정되며 문서 커밋을 새 앱 배포로 표현하지 않는다.

## CI와 실제 앱 검증

- 프런트 main [38144359473](https://github.com/shoon94parkk-del/chart-view-toss/actions/runs/38144359473) 및 AIT [38144359233](https://github.com/shoon94parkk-del/chart-view-toss/actions/runs/38144359233): 최종 success. Node 413개·build 26개 직접 진입 경로·E2E 728개 및 기존 mobile QA를 확인했다. [main 증거](audits/2026-10-11-performance-deployment/frontend-main-ci.json), [AIT 증거](audits/2026-10-11-performance-deployment/frontend-ait-ci.json).
- 백엔드 main [38144321292](https://github.com/shoon94parkk-del/chart_View/actions/runs/38144321292): 기존 check와 mobile 7개, 운영 4종 최종 success. `prelaunch_v42` 첫 운영 실행은 valuation 출처 title을 기다리는 15초 assertion에서 timeout이었다. 같은 `6bdfbc3`의 그 job만 한 번 재실행해 성공했다. source/assertion 변경은 없고 과거 네트워크 원인은 확정하지 않는다. [최종 CI](audits/2026-10-11-performance-deployment/backend-main-ci-final.json), [실패·재실행 기록](audits/2026-10-11-performance-deployment/backend-ci-retry-summary.json).
- [백엔드 실제 배포 검증](audits/2026-10-11-performance-deployment/backend-release-verification.json): `/health` exact SHA, 서버 HTML·실제 served bytes·checkout의 3개 canonical 자산 SHA-256 일치. 로컬·서버·raw CDN의 거장 snapshot과 evidence가 검사 전후 같은 버전이며 다섯 전략 실제 후보 근거 HTTP 200과 고의 구버전 HTTP 409 `snapshot_changed`가 정상이다. 게시 버전은 `40e54f87eae91767b646`, 기준 거래일은 `2026-10-08`이다.
- [운영 UI 5/5](audits/2026-10-11-performance-deployment/ui-summary.json): 삼성전자 실제 검색·fresh 시세, 관세청 DRAM 12개월, PICK 실제 분모·성과, 화장품 실제 응답→모델→표시, 거장 5전략 같은 버전 근거. 실패·flaky·skip 0개이고 JSON attachments도 보존했다. 실제 응답을 CA/TLS 검증을 유지한 Node relay로 전달했으며 fixture로 교체하지 않았다.
- [320px 분석 화면 관찰](audits/2026-10-11-performance-deployment/ui-analysis-ui.json): Discover·Heatmap·Consensus·Bands·Tools의 실제 응답 정상. Home/Watch 분석 모듈 요청 0회 → 첫 분석 1회 → 나머지 분석 경로에서도 누적 1회. 거래량 preset·Back 정상, 문서/body 가로 넘침과 fatal JS 오류 0개. [실적 전망 스크린샷](audits/2026-10-11-performance-deployment/consensus-320.png).

## 실제 배포 파일과 성능

[실제 자산 증거](audits/2026-10-11-performance-deployment/frontend-assets-verification.json)는 이전/이후 운영 HTML의 main path와 내려받은 본문 hash를 기록한다.

| 실제 운영 main JS | 이전 | 이후 | 감소 |
|---|---:|---:|---:|
| 압축을 푼 파일 바이트 | 326,520 | 296,747 | 29,773 · 9.1% |
| 같은 zlib 기본 level 6 gzip 바이트 | 108,683 | 98,955 | 9,728 · 9.0% |

새 main은 `/assets/index-Curs8YFG.js`다. Home/Watch에서는 분리된 분석 JS/CSS를 요청하지 않으며 실제 분석 진입에 `/assets/analysisViews-D9ykvVMT.js`와 `/assets/analysisViews-BM0ySziZ.css`를 요청한다. gzip 행은 동일 도구로 served 본문을 압축한 비교이며 HTTP wire bytes가 아니다. 기존 Render Vite 설정 때문에 앞선 기본 로컬 빌드와 main 파일 바이트가 2바이트 다르며 같은 감소율을 확인했다.

[운영 이후 원자료](audits/2026-10-11-performance-deployment/production-after.json)는 실제 source SHA `e5ffa5669a4b3f8cbf7df1d6df142dd91efa89f6`를 기록했다. 같은 기존 harness·Chromium·390×844·정상 native OS font 환경을 사용했고 `2026-10-11T13:54:28.896Z`에 시작했다. 이전 06:48 UTC 운영 baseline과 동일하게 18경로 각 1회 cold/SPA/warm을 검사했다. 주요 콘텐츠 53개 측정은 모두 ready, Home SPA는 root이며 cold/warm runtime event·page error·가로 overflow 0개다. 선택 영역의 pending/canceled는 원자료에 보존하며 성공 본문 0ms로 바꾸지 않는다.

아래는 각 1회 ms다. 오전/오후 외부 데이터·네트워크·백엔드 재시작과 캐시 상태가 달라 controlled code-only 비교가 아니며 모든 경로의 속도 향상·p95·SLA·Render server cold-start 효과를 주장하지 않는다. Discovery·Memory 등의 최초 콘텐츠 시간이 증가한 관측도 그대로 남겼다. 초기 다운로드 감소와 분석 첫 진입의 chunk 비용을 함께 평가한다. 코드 영향의 같은 설정 로컬 7경로×3회 비교는 [선행 성능 보고서](PERFORMANCE_AUDIT_2026-10-11.md)에 있다.

| 경로 | cold 이전 | cold 이후 | SPA 이전 | SPA 이후 | warm 이전 | warm 이후 |
|---|---:|---:|---:|---:|---:|---:|
| 홈 | 1,616 | 531 | 0 | 0 | 28 | 27 |
| 차트 | 668 | 492 | 370 | 493 | 22 | 18 |
| 관심종목 | 130 | 209 | 11 | 15 | 6 | 11 |
| 밸류에이션 | 428 | 648 | 363 | 313 | 8 | 16 |
| 경제지표 | 841 | 416 | 711 | 464 | 17 | 16 |
| 조건별 종목 찾기 | 465 | 1,519 | 107 | 1,545 | 36 | 56 |
| 관심종목 뉴스 | 457 | 473 | 165 | 57 | 11 | 11 |
| 시장 히트맵 | 1,567 | 469 | 411 | 414 | 56 | 56 |
| 실적 전망 | 532 | 440 | 362 | 411 | 10 | 54 |
| 역사적 밸류에이션 | 482 | 476 | 313 | 375 | 16 | 57 |
| 종목 상세 | 703 | 466 | 36 | 76 | 32 | 33 |
| 투자 도구 | 134 | 183 | 26 | 68 | 7 | 55 |
| 데이터·이용 안내 | 138 | 138 | 16 | 8 | 9 | 9 |
| 수출 데이터 | 742 | 542 | 81 | 210 | 56 | 56 |
| 거장 투자법 | 1,276 | 674 | 869 | 361 | 56 | 57 |
| 선정 기록 | 639 | 421 | 62 | 67 | 57 | 58 |
| 반도체 가격 | 620 | 2,487 | 310 | 311 | 54 | 57 |
| 전체 메뉴 | 149 | 124 | 15 | 18 | 18 | 10 |

## Render 자원 관측과 유지한 범위

[새 instance 메모리/CPU 원자료](audits/2026-10-11-performance-deployment/render-metrics-after.json)는 `m9hkw`를 구분한다. `13:55:35 UTC` 메모리는 304,504,830 / 536,870,900바이트(약 56.7%)다. 새 프로세스 시작 이후 짧은 관측이므로 기존 95.4%/83.3%나 OOM과 비교해 메모리 문제 해결을 주장하지 않는다. CPU는 배포 후 검증 중 limit 0.15에 닿은 표본도 보존했다. 재시작·부하·관측 기간 차이를 분리해야 하며 장기 메모리 원인은 미확인이다.

배포 시작 `13:46:18 UTC`부터 조회 `13:56:08 UTC`까지 [Render server_failed event](audits/2026-10-11-performance-deployment/render-failure-events-after.json)와 [error 등급 app log](audits/2026-10-11-performance-deployment/render-error-logs-after.json)는 없었다. 짧은 조회를 장기 무오류 증명으로 표현하지 않는다.

quote freshness·provider·TTL·원본 출처·계산 기준·실패 복구 계약, 패키지 `0.15.1`과 기존 인프라를 유지했다. 새 LLM API·키·유료 인프라는 추가하지 않았다. 이 기록은 Render 운영 웹 앱의 병합·배포 완료이며 Android/iOS Toss Sandbox·스토어 제출을 완료했다고 표현하지 않는다.

[파일 SHA-256 manifest](audits/2026-10-11-performance-deployment/manifest.json)는 후속 증거 원자료를 연결한다.
