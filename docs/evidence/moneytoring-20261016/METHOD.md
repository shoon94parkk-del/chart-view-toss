# Moneytoring 조사 증거와 재현 범위

2026-10-16, 사용자 요청에 따른 읽기 전용 조사다. [최종 보고서](../../MONEYTORING_RESEARCH_2026-10-16.md)를 먼저 읽는다. 제품 수정·배포·새 계정·공급자 계약·유료 호출·APK 설치는 하지 않았다.

## 도구와 원본

기존 `/workspace/tools/chartview-rea`의 `rea-agents6.4.0`을 사용했다. 패키지의 `skills/reverse-engineer-anything/SKILL.md`와 runtime-observation 지침을 읽었다. 같은 버전의 CLI로 사용자가 소유한 익명 Chromium을 관찰했다. Node24, 기존 Playwright1.55, 상속된 proxy/CA와 정상 TLS를 사용했다. CDP9442와 조사용 controller9443은 loopback에만 열었고 조사 후 브라우저를 종료했다. REA를 전역 설치하거나 설정을 바꾸지 않았다.

Playwright가 공개 페이지를 열고 클릭·스크롤·viewport 변경을 수행했고, REA는 passive capture를 수행했다. 실 Android 앱이나 토스 Sandbox 실행이 아니다. 공식 웹1440×1000과390×844, Play스토어 홍보 이미지8개를 구분한다.

`rea-evidence-index.json`은7개 상태의 `inspect-web-page`/`capture-web-screenshot` **14개 Evidence ID**, 실제 선택 URL, 한계, canonical JSON과 PNG의SHA256이다. canonicalFile/pngFile 경로는 아래 로컬 조사 폴더 기준이다. 인덱스는 원본 보관 후 해시·경로를 덧붙인 **파생 인덱스**다.

원본 위치: `/workspace/research/moneytoring-20261016/rea/`, `screens/`, `public-app/`, `consensus/`. 전체 canonical에는 제3자 기사·공개 게시글·브라우저 내부 관찰이 포함되므로 Git에는 재게시하지 않았다. 이 보관본은 최종 분석, 원본 해시/ID, 필요한 공개 화면3개, 공급자 페이지의 소수 수치/URL/조회시각을 담는다. 전체 원본 JSON을 담은 패키지로 표시하지 않는다.

## 중요한 관찰

| 상태 | 확인한 내용 | REA inspect Evidence ID |
|---|---|---|
|01-home-desktop|시각별 브리핑 슬롯, 핫이슈 목록과 요약/원문 패널|`ev_aec7519bbeb0661ff9fba2f0f09d990b7aa0fa2d7c0ccf3bbbc62af4b113e5f4`|
|04-calendar|예정 일정, 발표 시각과 결과 대기 문구|`ev_273e4fdb6178823681ccfc440155cddd2641648ef4acc3469aca12b83bbb00f7`|
|06-cpi-selected-desktop|CPI 예상/실제 카드, 과거 비교 막대, BLS 실제 자료 출처, 요약|`ev_4e6fbf19fc2d73dc33b8d3d33e5692556db5838dc5e04bfb6b1b6111b5954b3a`|
|07-mv-group-loaded|관련6개 소식, 원문, 출처 종류, 종목/테마 연결|`ev_d1ebc3654fe44011a85aacaaad4d1d38661066e6312d3b1953093176e95f5de6`|

초기05-marketvoice는 로딩 중 관찰이라 묶음 기능 증거로 사용하지 않는다. 관련6개 소식 표시를 기다리고07을 수집했다. CPI 첫 클릭은 CSS로 숨겨진 첫 중복 요소에 걸려 실패했고 `:text-is("미국 CPI"):visible` 요소 클릭으로 해결했다. REA 자체 오류를 우회하거나 앱 내부 API를 조작한 것은 아니다.

스토어 이미지의 이벤트 마커/발생 당시 가격은 홍보 표현이다. `official-store-image-sources.json`은 공식 이미지 URL과 다운로드 매핑이며, 실제 앱 동작·시세 정확성을 증명하지 않는다. 이미지 원본은 로컬 폴더에 보관했다.

## 재현 방법

REA6.4.0을 사용할 수 있는 환경에서 별도 Chrome 익명 프로필을 loopback CDP로 연다. 실제 브라우저로 다음 공개 페이지를 순서대로 읽는다. 로그인/구독/설치/외부 제출은 필요 없다.

1. `https://www.moneytoring.ai/` —1440×1000,390×844.
2. `https://www.moneytoring.ai/stock/458870` —공개 상세, 비동기 로딩 완료 여부를 구분한다.
3. `https://www.moneytoring.ai/market/calendar` —보이는 `미국 CPI` 선택, `.../100401?date=2026-10-14`가 로드되고 실제/예측 값이 표시되는지 확인한다.
4. `https://www.moneytoring.ai/mv/2308928` —관련 기사 표시를 기다린다.

각 상태에서 실제 target ID를 새로 조회하고 관찰한다. 아래 endpoint/target은 소유한 브라우저의 실제 값으로 바꾼다.

```sh
rea list-browser-targets http://127.0.0.1:9442 --json
rea inspect-web-page http://127.0.0.1:9442 TARGET_ID --include-accessibility-text --json
rea capture-web-screenshot http://127.0.0.1:9442 TARGET_ID --json
```

스크린샷의 `normalized_result.artifact.data_base64`를 디코드한 뒤 제공된SHA256과 비교했다. 원문/현재 페이지는 시간이 지나면 바뀌므로 과거 해시와 동일한 값이 재현된다고 보장하지 않는다. 접근 차단이 발생하면 우회하지 않고 미확인으로 기록한다.

CPI4개 Investing URL과 수집시각·전체 원문SHA256은 `verified-cpi-values.json`에 있다. HTTP200·실제 수치 조회와 지속 수집/앱 표시 계약을 구분한다. `forecastCapturedAt`을 과거로 소급 입력하지 않았다. 조사 코드를 제품 코드나 운영 전환 데이터로 넣지 않았다.

코드 비교는 frontend main95d6b83, backend b08af11 코드다. 최신 backend main6b4d522와의 차이는 정기 home/heatmap JSON2개뿐임을 직접 fetch/diff로 확인했다. 코드 인벤토리의 배포 버전 설명과 최신 데이터 버전을 구분한다. 제품 소스 변경이 없어 단위/E2E/AIT·새 성능 테스트를 실행하지 않았다.
