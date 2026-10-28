# 차트뷰 토스 신뢰성 점검·개선 — 2026-10-28

Project: `github:shoon94parkk-del/chart-view-toss`  
Base: `03fede3a5a844d96be4570ff64ed65f80f9ffef8`  
Branch: `codex/thorough-improvements-20261028`

사용자의 전체 개선 요청에 따라 기존 코드·과거 결정·회귀 검사를 확인하고, 저장소·데이터·화면을 독립 점검했다. 기존 구조 안에서 재현 가능한 버그를 수정한다. 공유 백엔드와 제공자 수집, SDK, 의존성, 배포 설정은 변경하지 않는다.

## 발견과 수정

| 우선순위 | 재현 조건과 영향 | 수정 위치와 계약 |
| --- | --- | --- |
| P1 | 토스 기기 데이터 초기화 중 다른 화면에서 저장하면 삭제한 질문이 다시 저장됨 | `storage.js`: 실제 native 삭제 전체가 끝날 때까지 새 쓰기와 transaction context를 차단. 호출자 timeout 뒤에도 차단 유지. 부분 실패와 명시적 재시도 보존 |
| P1 | 손상된 질문/근거 저장소를 빈 객체로 해석해 저장·삭제 시 원본을 덮어씀 | `researchNotes.js`, `reviewStorage.js`, `researchCard.js`: 실제 미저장만 빈 객체로 처리, 손상된 JSON/잘못된 root의 원본 bytes 보존, 오류와 입력 초안 유지 |
| P1 | 새 시세에 `change:null`이 오면 전날 등락률이 새 가격/시각과 결합됨 | `liveQuoteStore.js`: 명시적 결측 observation 필드를 그대로 반영하고 화면 overlay에 전달. 생략 필드, 회사명/시총, 실제 0과 timestamp/priority 계약 유지 |
| P1 | 이전 한국 CLOSE 시세 + 새 요청 503/빈/불량/다른 종목 응답에서 재시도와 polling 모두 중단 | `main.js` Detail: 검증된 현재 요청의 종가만 polling 종료, 실패 시 이전 시세와 동작하는 부분 재시도 유지. 느린 screener가 오류를 지우지 않으며 화면 이탈 후 응답을 저장하지 않음 |
| P2 | 뉴스→상세→Back에서 캐시 만료 응답이 늦으면 읽던 위치가 복원되지 않음 | 기존 route restore owner와 News reader의 실제 data paint를 연결. 사용자의 새 조작과 마지막 목록 높이를 함께 처리 |
| P2 | 같은 종목이 여러 기사에 있으면 요약 완료 후 초점이 첫 기사로 이동 | `newsReaderView.js`: 기사와 종목을 함께 사용해 같은 조작의 초점 복원 |
| P2 | 시세 결측이 히트맵의 숫자 변환을 거쳐 0.00%로 표시됨 | Home/전체 지도/읽기 목록에서 결측과 실제 0을 구분. 시총과 기존 지도 배치 유지 |

## 검증 방식

- 수정 전 전체 Node 874개, web build와 직접 진입 30경로 통과.
- 각 수정은 기존 실제 모듈/브라우저 경로에 실패 재현을 먼저 추가한 뒤 검증한다. 원시 API→canonical→DOM/기기 캐시와 실제 Back/재시도를 검사한다.
- 기기 저장소는 실제 `storage.js`와 관련 모듈을 사용하는 기존 VM native bridge harness에서 삭제 보류·timeout·부분 실패·계정 전환을 검사한다. 이는 native Toss 기기 실행 결과가 아니다.
- 테스트 결과 최종 집계는 아래 통합 검증에 기록한다. 작업 도중의 실패 로그는 성공으로 포함하지 않는다.

## 실행 환경

Node 24.19.0, npm 11.9.0, lockfile의 Playwright 1.55.0을 사용한다. CI의 24.21.0과 patch 버전 차이가 있다. 기존 OS의 sans alias가 WOFF2 파일을 native font로 선택해 Chromium text height가 0이 되는 환경 문제를 발견했다. 앱 CSS나 검사 기준을 바꾸지 않고 작업 전용 fontconfig에서 설치된 Noto TTF/TTC를 선택했으며, 한글/영문 실제 screenshot과 text geometry를 확인했다.

WebKit의 누락된 Debian 라이브러리는 공식 trixie HTTPS 패키지를 작업 공간에 받아 추출하고 local Playwright runtime의 sys/lib에 연결했다. 정적 `ldconfig -p`는 비전역 라이브러리를 알지 못하므로 해당 환경 검사만 건너뛰고 실제 WebKit 실행과 한글 렌더링을 확인한다. 브라우저 테스트 assertion/retry/기기 목록은 완화하지 않는다. 전역 OS 패키지·프록시·TLS 설정은 변경하지 않는다.

## 남긴 발견사항과 범위

- TOP10의 미확인 `priceBasis`는 archived raw close와 provider 시계열을 섞을 수 있다. 예: archive 200, provider 100→110, 기준일 불일치, priceBasis 미제공이면 -45%가 생성된다. 또한 adjusted baseline 결측 시 raw archive를 조정 추천가처럼 표시할 수 있다. 기존 명시적 TOP10 계산/행 보호 계약에 따라 이번에 변경하지 않았으며 별도 데이터 계약 수정 대상으로 남긴다.
- 투자 뉴스 전체 자동 갱신의 열린 브리핑/원문 초점 보존은 소스 검토에서 후속 후보로 남겼다. 실제 클릭 취소를 재현하거나 수정했다고 기록하지 않는다.
- 본 작업의 fixture 브라우저 검증은 운영 데이터/공급자 권리/실제 Android·iOS Toss Sandbox를 대신하지 않는다. 공개 출시 조건은 기존 `P0_RELEASE_GATE.md`를 따른다.

## 운영 일반 조회

기존 공유 backend `/health`와 `/api/quotes?tickers=005930.KS`를 일반 조회했고 모두 HTTP200이었다. health revision은 `3e4906edd0980113ad7209a65264a6fe9472c6a7`이며 시세의 price는 JSON number였다. 응답의 CLOSE와 `provider_latest`를 그대로 구분하며 장마감 인증으로 바꾸지 않는다. 이 조회는 운영 프런트 변경 반영이나 전 제공자 검증을 의미하지 않는다.

## 통합 검증

- `FONTCONFIG_FILE=<Noto native config> PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 VITE_CHARTVIEW_STATIC_DATA_BASE='' npm run qa:prepush`: exit 0. Node **894/894**, production web build, 직접 진입 **30경로**, 브라우저 **1,276/1,276** (각 319 × desktop/320px/Android/iPhone WebKit). unexpected/flaky/skipped **0/0/0**, 자동 retry 0. 브라우저 전체 소요 30.9분.
- 초기 874 Node / 1,184 browser에서 순증 20 Node / 92 browser. 실제 CLOSE 타이머를 확인하는 브라우저 검사가 기존 exact source-string 검사 하나를 대체한다.
- 독립 검토에서 발견한 News 사용자 조작/terminal clamp와 heatmap null→0 누락을 보완했으며 최종 소스 검토에 blocking finding 없음.
- `node tests/detail_quote_failure_qa.mjs`: empty/HTTP503/timeout 세 가지 기존 장애·부분 재시도 통과.
- `node tests/mobile_continuity_qa.mjs`: Liberation Sans + Noto CJK native fallback에서 **320/390/430px 통과**. 아래 Noto 경계 차이는 별도 보존한다.
- `npm run build:ait`: exit 0, `chartview.ait` 생성. SHA256 `aca602df475bf66876dd3a9cc83c512142e06844decb73d3ff640953b70c70f6`. AIT는 기존 공개 CDN 기본값으로 빌드하며, 뒤에 API-only web dist를 복원했다. build 메타데이터의 deploymentId는 운영 배포나 native 기기 실행의 증거가 아니다.
- `git diff --check`와 검사 시작/완료 시 변경된 src/test 19파일 SHA256 대조 통과. [기계 판독용 요약](audits/2026-10-28-reliability/validation.json).

### 추가 모바일 기준의 기존 font 경계

첫 supplemental mobile 실행의 실적 전망 카드 높이 기준 `<=380px`는 Noto Sans 환경에서 380.78125px로 실패했다. 같은 fixture/브라우저/fontconfig로 별도 baseline `03fede3`를 빌드해 측정한 결과도 정확히 380.78125px였다. 제품 소스/기준을 수정하지 않았다. Liberation Sans native fallback에서는 baseline/수정본 모두 377.78125px이고 기존 세 너비 전체 스크립트가 통과한다. 전체 1,276 browser 검사는 Noto 설정에서 통과했으며 이 supplemental baseline 경계를 성공으로 숨기지 않는다. 글꼴별 카드 높이 편차는 후속 확인 항목이다.

코드·로컬 검증이 완료됐으며 main 병합·운영 배포·실제 Toss Android/iOS Sandbox는 수행하지 않았다.
