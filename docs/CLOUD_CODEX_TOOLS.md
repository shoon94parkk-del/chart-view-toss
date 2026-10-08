# 클라우드 Codex용 GitHub 도구

2026-10-07 GitHub REST API에서 실제 스타 수·최근 push·라이선스와 stable 릴리스를 확인했다. 이번 작업은 **개발 도구 추가**이며 앱의 UI·시세·수출 수집·Render 설정은 변경하지 않는다. 스타는 유용성의 보조 지표이며 아래 숫자는 조회 시점의 기록이다.

## 설치한 도구

| 프로젝트 | GitHub 스타 | 고정 버전 / 라이선스 | Chart View에서 사용할 때 |
| --- | ---: | --- | --- |
| [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) | 43,589 | 0.38.2 / Apache-2.0 | Codex가 실제 화면의 접근성 트리·버튼을 탐색하고 클릭, screenshot, JS 오류를 확인 |
| [GoogleChrome/lighthouse](https://github.com/GoogleChrome/lighthouse) | 30,865 | 13.5.0 / Apache-2.0 | 같은 조건의 모바일 초기 렌더링·레이아웃 이동·메인 스레드 작업 비교 |
| [webpro-nl/knip](https://github.com/webpro-nl/knip) | 12,414 | 6.40.0 / ISC | 쓰이지 않는 파일·export·누락된 직접 의존성의 정리 후보 검토 |
| [sverweij/dependency-cruiser](https://github.com/sverweij/dependency-cruiser) | 7,262 | 18.5.0 / MIT | 변경할 화면의 import 관계와 공유 모듈 영향 확인, 의존성 그래프 생성 |
| [dubzzz/fast-check](https://github.com/dubzzz/fast-check) | 5,184 | 4.10.2 / MIT | 수익률·단위 변환·결측·필터의 다양한 경계 입력 자동 생성과 실패 입력 축소 |

`tools/codex/package.json`과 별도 lockfile에 설치한다. 앱의 `package.json`/lockfile은 바꾸지 않으며 Render의 루트 설치·번들에 추가하지 않는다. upstream 소스도 저장소 밖에 내려받아 README·패키지·설치 경로를 확인했다. upstream build/prepare/postinstall은 실행하지 않았고 npm 배포 패키지를 `--ignore-scripts`로 설치했다. agent-browser 배포 패키지에 포함된 native binary를 사용한다.

기존 [Playwright](https://github.com/microsoft/playwright)는 **97,206 스타**, [axe-core](https://github.com/dequelabs/axe-core)는 **7,608 스타**이며 이미 필수 QA에 적용되어 있다. 이 도구 모음은 그 QA를 보완한다.

다른 Codex로의 전체 이관, 프로젝트 skill과 connector 구분, 새 환경 검증은 [CODEX_TRANSFER.md](CODEX_TRANSFER.md)를 따른다.

## 새 클라우드 환경에서 재설치

현재 환경에는 다섯 도구를 실제 설치했다. 새 클라우드 작업은 별도 머신일 수 있으므로 설치 상태의 자동 승계를 가정하지 않는다. 저장소를 받은 뒤 Node 24에서 실행한다.

```bash
# 저장소 루트; 기존 앱/E2E 의존성과 선택 도구는 각각의 lockfile 사용
npm ci
npm ci --prefix tools/codex --ignore-scripts --no-fund --no-audit
# 브라우저가 없는 Linux 환경에서 기존 QA 브라우저 준비
npx --no-install playwright install --with-deps chromium webkit
```

Cloud Codex의 환경 setup script에는 위 설치 명령을 넣을 수 있다. 이번 작업에서는 ChatGPT의 환경 관리 설정이나 로그인·API 키를 변경하지 않았다. 실행 wrapper는 기존 Playwright Chromium 경로를 자동 재사용한다. 별도 Chrome이 있다면 `CHROME_PATH` 또는 `AGENT_BROWSER_EXECUTABLE_PATH`로 지정할 수 있다. 한국어 글꼴·브라우저 OS 라이브러리는 기존 [AUTOMATED_QA](AUTOMATED_QA.md)의 준비 조건을 따른다.

## 실제 사용

```bash
# 터미널 하나: 기존 production build의 로컬 preview
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

다른 터미널에서:

```bash
# Codex가 직접 탐색: API가 실제 연결되는 일반 브라우저 세션
node tools/codex/run.mjs browser open http://127.0.0.1:4173
node tools/codex/run.mjs browser set viewport 393 851
node tools/codex/run.mjs browser snapshot -i --json
# snapshot의 현재 ref를 사용하며 이전 화면의 ref를 하드코딩하지 않는다.
# node tools/codex/run.mjs browser click @e11
node tools/codex/run.mjs browser errors --json
node tools/codex/run.mjs browser screenshot /tmp/chartview-home.png --full
node tools/codex/run.mjs browser close

# 오프라인 분석: 결과 파일은 gitignore된 artifacts 아래 보관
mkdir -p artifacts/codex-tools
node tools/codex/run.mjs deps > artifacts/codex-tools/dependencies.json
node tools/codex/run.mjs deps --output-type mermaid > artifacts/codex-tools/dependencies.mmd
node tools/codex/run.mjs knip --reporter json > artifacts/codex-tools/knip.json
npm run --prefix tools/codex properties

# 기존 E2E fixture 재사용: 외부 공급자 지연/가격 변경 없는 모바일 진단
npm run --prefix tools/codex audit:mobile

# API 실제 연결 조건의 Lighthouse 진단; 위 fixture 진단과 구분해서 비교
node tools/codex/run.mjs lighthouse http://127.0.0.1:4173 --only-categories=performance --output=html --output=json --output-path=artifacts/codex-tools/lighthouse-live
```

`audit:mobile`은 preview 서버를 먼저 실행해야 한다. `CODEX_AUDIT_URL`로 다른 **로컬** 포트를 지정할 수 있다. 기존 `tests/e2e/data.mjs`를 재사용하고 등록되지 않은 API/외부 요청·JS 오류·가로 overflow가 있으면 실패한다. 393/320px screenshot, 실제 agent-browser 접근성 snapshot, 모바일 Lighthouse HTML/JSON을 생성하고 브라우저를 종료한다. 실제 가격 검증용은 기존 `npm run test:e2e:live`이며, 320px Chromium screenshot은 실제 iOS/WebKit 검사라는 의미가 아니다.

wrapper는 agent-browser의 AI `chat`/dashboard, 계정·provider·plugin과 일괄 명령을 차단한다. Codex가 일반 CLI 명령으로 직접 조작한다. WebMCP 자동 탐색은 끈다. Lighthouse CLI의 선택적 원격 오류 보고도 끈다. Knip의 자동 삭제 옵션도 차단한다. raw upstream CLI를 별도로 실행해 AI 기능을 켜는 것은 이번 구성에 포함되지 않는다.

## 실제 실행 결과와 해석

- 기존 `npm run qa:prepush` 재실행: Node **263/263**, production build/26 direct routes 검증 성공, desktop/Android/320px/iPhone WebKit E2E **184/184** 통과(3.7분), 실패·skip·flaky **0개**.
- 다섯 패키지를 설치하고 네 CLI의 실제 버전을 확인했다. 설치된 lockfile에 대해 `npm audit` 결과 취약점 **0개**였다(조회 시점 기준).
- fast-check: 고정 seed `20261007`, 네 속성 × 1,000 생성 사례 + 실제 0 표시 검사 통과. 동일 기준 가격의 0% 변화, 단위 변환에 따른 변화율 불변, 종목/RSI 필터의 결측 제외·원 응답 비변경, 결측 선정 수익률의 가짜 0 방지를 검사한다. 처음의 `structuredClone` 비교는 생성 객체의 prototype이 바뀌는 테스트 문제였고 JSON API 값 비교로 바로잡았다. 앱 버그를 숨기는 예외를 추가하지 않았다.
- dependency-cruiser: **96개 모듈** 그래프 생성. 이번 설정은 관계를 진단하는 `--no-config`이므로 validation error 0개를 구조적 무결성의 증명으로 해석하지 않는다.
- Knip: 파일 3개/export 9개/직접 의존성 미기재 사용처 31개를 정리 후보로 보고했다. 31개는 기존 QA의 `playwright` 직접 import이며 현재 `@playwright/test`의 전이 의존성으로 실행되고 있다. 문서·문자열 기반 source 검사와 보존 코드의 역할을 검토해야 하므로 삭제하지 않았다. **발견이 있어 exit 1을 반환**했으며 성공으로 숨기지 않았다.
- agent-browser: 실제 앱 진입·접근성 snapshot·393px screenshot·JS error 없음·가로 overflow 없음 확인. 일반 세션에서는 이 클라우드 브라우저의 외부 API 연결 실패 fallback이 보여서 해당 화면을 최신 데이터 성공으로 기록하지 않았다. 별도 fixture 진단은 실제 기존 API 계약을 주입한 화면에서 확인한다.
- Lighthouse: 같은 로컬 build + 기존 fixture의 모바일 진단에서 첫 단독 실행 **96**, 전체 QA와 동시에 수행한 도구 연결 재검사 **91**, 두 실행 모두 runtime error/경고 없음. CPU 부하가 다른 실행이나 외부 API가 실패한 일반 화면(88점)을 개선 전후 수치로 비교하지 않는다. 실제 성능 변경을 검증할 때는 다른 QA를 종료하고 같은 브라우저·데이터·CPU/네트워크 조건에서 반복 측정한다. 단일 실행 점수는 CI 배포 기준이나 실기기 속도 보증이 아니다.

리포트는 현재 워크스페이스의 `artifacts/codex-tools/`, source 조사 자료는 `/workspace/scratch/chartview-cloud-tools-research/`에 있다. scratch와 설치 바이너리는 Git에 넣지 않는다. cloud 세션이 바뀌면 위 명령으로 다시 생성한다.

## 인기가 높지만 이번에 추가 설치하지 않은 후보

| 프로젝트 | 실제 스타 | 판단 |
| --- | ---: | --- |
| [microsoft/markitdown](https://github.com/microsoft/markitdown) | 188,931 | DART PDF·엑셀을 Codex가 읽는 Markdown으로 바꾸는 다음 후보. 일반 텍스트 변환은 LLM 없이 가능하나 OCR/이미지 설명에는 선택적 LLM 경로가 있고 표·단위·숫자의 원문 검증이 필요. 현재 UI QA 목적에는 설치를 늘리지 않음 |
| [garrytan/gstack](https://github.com/garrytan/gstack) | 135,613 | Claude Code 중심의 의견 강한 역할/워크플로 묶음. Chart View의 기존 AGENTS/QA/배포 규칙을 통째로 덮는 설치는 하지 않음 |
| [browser-use/browser-use](https://github.com/browser-use/browser-use) | 117,332 | 고수준 AI agent 경로는 별도 모델/provider 연동 검토가 필요. Codex가 이미 지능을 담당하고 있어 현재 목적에는 agent-browser의 일반 명령을 선택 |
| [upstash/context7](https://github.com/upstash/context7) | 62,755 | 최신 문서 조회 후보이나 원격 문서 서비스·인증/요금제 한도가 적용. 계정을 추가 연결하거나 키를 만들지 않음 |
| [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | 37,891 | LLM API 없이 동작하는 좋은 MCP 후보. 현재 세션에서 npm 설치만으로 MCP 도구가 자동 연결되지는 않으므로 바로 실행할 수 있는 CLI를 우선 채택. 추후 실제 MCP 설정이 필요할 때 기존 E2E 버전과 분리 |

## 앞으로의 개발 흐름과 비용

Codex가 필요한 도구로 화면/성능/변경 영향을 탐색 → 실제 문제를 기존 Node/Playwright 회귀 테스트로 고정 → `npm run qa:prepush` → PR/GitHub Actions → 통과한 정확한 main만 Render 승격. 선택 도구의 진단 결과로 기존 필수 QA를 생략하거나 시간을 개선하려고 시세 freshness/수집 산식을 약화하지 않는다.

다섯 도구의 이번 실행 경로에 **OpenAI/외부 LLM API 호출·API 키·새 유료 서비스가 없다**. 데이터 fixture 진단은 외부 API를 차단한다. 실제 API 모드에서는 기존 Chart View API 요청이 발생하며 기존 인프라 조건이 적용된다. Cloud Codex 자체 이용량·기존 GitHub Actions/Render 요금 한도는 도구의 무료 라이선스와 별개다. tester-army/e2e는 사용하지 않았다.
