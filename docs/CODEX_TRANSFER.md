# 다른 Codex로 도구·skill·QA 환경 이관

2026-10-08 확인. 이 저장소를 clone하면 설치 정의, 프로젝트 skill, 전문 역할과 검증된 맥락을 옮길 수 있다. 바이너리·로그인·연결된 앱·플랫폼 제공 skill·이전 대화가 자동 복제되는 것은 아니다. 작업 시작점은 최신 main과 [인수인계](CODEX_HANDOFF.md), [AGENTS](../AGENTS.md)다.

이번 실제 설치·전문 역할 점검·수정·검증 한계는 [이관·전체 점검 기록](CODEX_TRANSFER_AUDIT_2026-10-08.md)에 있다.

## 옮길 수 있는 구성과 실제 적용 상태

| 구성 | 현재 실제 상태 | 새 Codex에서 재현 |
|---|---|---|
| Playwright Test 1.55.0 / axe 4.13.0 | 필수 회귀 QA·GitHub Actions에 적용 | 루트 lockfile `npm ci` + Chromium/WebKit 설치 |
| agent-browser 0.38.2 | 설치, 일반 CLI로 실제 탐색 | `tools/codex` lockfile 설치, `run.mjs browser` 사용 |
| Lighthouse 13.5.0 | 설치, 모바일 진단 | 같은 조건의 fixture/live를 구분해 실행 |
| Knip 6.40.0 / dependency-cruiser 18.5.0 | 설치, 미사용 후보·import 관계 진단 | wrapper 사용, 발견을 검토한 뒤 수정 |
| fast-check 4.10.2 | 설치, seed 기반 금융 경계값 검증 | `npm run --prefix tools/codex properties` |
| agency-agents | 고정 소스 조사 후 역할을 프로젝트에 맞게 채택 | [역할 프로필](agents/ROLES.md)을 현재 Codex subagent에 전달 |
| 프로젝트 skills | 이관용 자체 skill 2개를 Git에 추가 | [.agents/skills](../.agents/skills)에서 새 세션이 인식하는지 확인 |
| 장기 프로젝트 맥락 | Git 문서로 보존 | project-memory/decision-log/guardrails/handoff 다시 읽기 |
| tester-army/e2e | **소스 조사만**, MCP/runtime 미연결 | 아래 고정 소스로 조사 재현 가능; 필수 CI에 넣지 않음 |
| claude-mem | **소스 조사만**, worker/hooks/자동 수집 미설치 | 조건은 [에이전트 workflow](AGENT_WORKFLOW.md); Git 기록을 우선 사용 |
| Render 앱/skill, cloud-runtime skill | 현재 플랫폼이 제공하는 연결·지침 | 대상 Codex에서 해당 앱/plugin과 권한을 재연결·확인 |

도구의 upstream·버전·라이선스·기존 실제 실행 근거는 [CLOUD_CODEX_TOOLS](CLOUD_CODEX_TOOLS.md), agency/e2e/claude-mem의 SHA·라이선스·연결 조건은 [AGENT_WORKFLOW](AGENT_WORKFLOW.md)에 있다. 그 문서의 과거 스타 수·테스트 수는 당시 기록이다. 현재 QA 개수는 실행 결과를 확인한다. 앱과 선택 도구는 각각의 lockfile을 사용하며 선택 도구는 Render 앱 번들에 포함하지 않는다.

## 1. 새 머신 설치

Git, Node **24.x**(CI 기준 **24.21.0**), npm10–11을 준비하고 본인의 GitHub/Codex 계정으로 연결한다. 아래 명령은 Bash/PowerShell 공통이다.

```bash
git clone https://github.com/shoon94parkk-del/chart-view-toss.git
git clone https://github.com/shoon94parkk-del/chart_View.git
cd chart-view-toss
git switch -c work/my-task
node tools/codex/setup.mjs --install --with-browsers
node tools/codex/setup.mjs --check
```

setup은 루트 `npm ci`, `npm ci --prefix tools/codex --ignore-scripts`, 선택적으로 고정 Playwright의 Chromium/WebKit 설치를 실행한다. 이후 두 lockfile의 직접 의존성과 실제 설치 버전, 브라우저 실행파일, 프로젝트 skill 파일을 확인한다. 전역 Codex 설정·MCP·hook·키·Render 설정을 바꾸지 않는다. manifest/lockfile 일치는 설치 시 `npm ci`가 확인한다. `--check`는 직접 패키지 버전 비교이며 전이 의존성·설치 파일 해시까지 검증하지 않는다. `--check`는 비변경 검사이며 **브라우저 실제 실행/OS 라이브러리/한글/skill 인식/계정 연결을 보증하지 않는다**.

Linux에서는 브라우저 OS 라이브러리와 한국어 글꼴이 별도 필요하다. 권한이 있는 환경 setup에서 실행한다.

```bash
npx --no-install playwright install-deps chromium webkit
sudo apt-get update
sudo apt-get install -y fonts-noto-cjk
```

관리형 cloud의 apt/권한이 제한되면 환경 제공 setup 기능으로 준비한다. 글자가 보이는 실제 screenshot과 `document.body.innerText`를 확인한다. 글꼴 설정 문제로 글자가 사라지면 앱 CSS/테스트 기준을 바꾸지 않는다. 특정 이전 머신의 `/workspace/scratch/.../fonts.conf`를 복사하거나 그 경로를 새 환경의 기본값으로 가정하지 않는다.

클라우드 프록시와 CA는 대상 환경이 제공하는 값을 유지한다. network/runtime skill이 있다면 현재 환경 상태와 정책을 확인하고 안내를 읽는다. 인증 환경 전체 출력, 토큰/인증 파일 복사, 프록시 우회, TLS 검증 해제는 하지 않는다. `--check`가 네트워크 인증 성공을 의미하지는 않는다.

## 2. 프로젝트 skill 인식

Git에 포함된 자체 skill은 다음 두 개다.

- [chartview-qa](../.agents/skills/chartview-qa/SKILL.md): 데이터 계약·직접 브라우저 QA·필수 회귀·정확한 배포 검증.
- [chartview-agent-review](../.agents/skills/chartview-agent-review/SKILL.md): 역할/파일 소유권 분담·독립 점검·성능 측정·검증된 기록 보존.

Codex CLI의 저장소 skill 경로는 `.agents/skills/<name>/SKILL.md`다. clone한 저장소를 작업 디렉터리로 열고 새 세션에서 `/skills` 목록 또는 UI의 skill 선택 기능으로 **실제 인식 여부**를 확인한다. 인식되면 `$chartview-qa`, `$chartview-agent-review`를 요청에 명시할 수 있다. 이 문서 작성 환경에서는 skill 파일·메타데이터·경로를 검증하지만 새 환경의 skill catalog/자동 발견은 그곳에서 확인해야 한다.

대상 제품이 저장소 skill 발견을 제공하지 않으면 SKILL.md를 직접 읽도록 요청해 동일 절차를 사용한다. 여러 프로젝트에서 재사용할 때는 코드/계약/프로젝트 ID를 각 저장소에 맞춰 바꾸고, Codex CLI에서는 본인의 `~/.agents/skills`에 이름 충돌 없이 복사할 수 있다. 기존 파일을 덮지 말고 Chart View의 금융/배포 규칙을 다른 프로젝트에 무조건 적용하지 않는다. 전역 설치는 필수가 아니다.

현재 ChatGPT가 제공하는 Render `skill://...` 및 cloud-runtime skill, 개인 환경의 플랫폼 builtins는 이 두 자체 skill과 별개다. 전문을 Git에 복제하거나 connector의 내부 ID/인증 파일을 이관하지 않는다. 새 Codex의 설정에서 Render 앱/plugin을 연결한 후 해당 환경에 노출된 skill과 도구 목록을 확인한다. 연결이 없더라도 로컬 개발·fixture QA·공개 데이터 조회는 가능하다. Render 배포 권한과 GitHub push 권한은 따로 확인한다.

## 3. 실행과 실제 QA

공개 개발 설정은 [.env.example](../.env.example)을 `.env.local`로 복사해 사용한다. Bash는 `cp`, PowerShell은 `Copy-Item`이다.

```dotenv
VITE_CHARTVIEW_API_BASE=https://chart-view-pkv8.onrender.com
VITE_CHARTVIEW_STATIC_DATA_BASE=https://raw.githubusercontent.com/shoon94parkk-del/chart_View/main/static/data
```

```bash
# 필수: Node → build → desktop/Android/320px/iPhone WebKit
npm run qa:prepush
# 이미 빌드한 앱의 선택 도구 진단 (별도 터미널에서 preview 시작)
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

다른 터미널에서:

```bash
node tools/codex/run.mjs browser open http://127.0.0.1:4173
node tools/codex/run.mjs browser snapshot -i --json
node tools/codex/run.mjs browser errors --json
node tools/codex/run.mjs browser close
npm run --prefix tools/codex properties
npm run --prefix tools/codex audit:mobile
```

`audit:mobile`은 기존 고정 E2E 응답을 사용하는 진단이고 실제 공급자 검증이 아니다. `knip`은 정리 후보가 있으면 exit1일 수 있다. 의존성 그래프는 관계 설명이며 무결성 증명이 아니다. Lighthouse 비교는 다른 브라우저/QA를 종료하고 같은 build·viewport·데이터·CPU/네트워크로 수행한다. `run.mjs browser`의 namespace/session은 Chart View 전용 고정값이므로 여러 프로젝트의 동시 탐색에 그대로 공유하지 않는다.

실제 배포 API와 화면 관계는 `npm run test:e2e:live`를 사용한다. 배포 URL은 Bash에서 `E2E_BASE_URL=https://chart-view-toss.onrender.com npm run test:e2e:live`, PowerShell에서 `$env:E2E_BASE_URL='https://chart-view-toss.onrender.com'; npm run test:e2e:live`로 지정한다. 프록시 환경에서는 제공된 프록시 주소를 `E2E_PROXY_SERVER`로 지정하고 기존 CA 신뢰를 유지한다. 공급자 자료를 fixture로 바꾼 결과를 live 성공이라고 기록하지 않는다.

필수 CI는 OpenAI/외부 LLM 키 없이 실행되며 실패 screenshot/trace/video/HTML report를 남긴다. 새로운 기능은 기존 fixtures를 확장하고 API→가공→표시 관계·결측/0·지연/부분 실패·날짜 역행·모바일 조작을 회귀 테스트로 고정한다. 상세 명령과 실패 분석은 [AUTOMATED_QA](AUTOMATED_QA.md)를 따른다.

## 4. 원본 GitHub 조사 자료 재현

scratch와 원본 소스 clone은 Git 이관 대상이 아니다. 필요하면 **저장소 밖의 별도 조사 폴더**에서 다음 고정 commit을 받는다. 이동하는 main을 설치 기준으로 쓰지 않는다.

```bash
git clone --no-checkout https://github.com/msitarzewski/agency-agents.git agency-agents
git -C agency-agents checkout --detach 5baafd5f1452e9785c413065b033ec083ab27757
git clone --no-checkout https://github.com/tester-army/e2e.git tester-army-e2e
git -C tester-army-e2e checkout --detach 59113aa4c8631894464088cf5ded187548578445
git clone --no-checkout https://github.com/thedotmack/claude-mem.git claude-mem
git -C claude-mem checkout --detach 71ddd11735d6dc38a6356fe376921fc216f2aa38
```

이는 소스 조사 복원이고 실행형 설치가 아니다. agency 라이선스와 프로젝트에 채택한 역할은 저장소에 이미 보존되어 있다. e2e no-model MCP는 별도 서버 등록·실제 tool 호출 확인이 필요하고 npm 설치만으로 현재 ChatGPT 도구에 연결되지 않는다. claude-mem의 Codex provider는 별도 모델 실행/기존 구독 quota를 쓰며 worker·영속 저장·hooks·프로젝트 분리·마스킹·telemetry 설정이 필요하다. 이번 기본 이관 절차는 그 기능을 켜지 않는다.

## 5. 인수인계·업데이트·배포

새 Codex에 전달할 첫 요청:

> 이 저장소의 AGENTS.md, docs/CODEX_HANDOFF.md와 CODEX_TRANSFER.md, 두 .agents/skills/SKILL.md를 읽으세요. 현재 main SHA와 설치/skill/connector 인식 상태를 확인하고 요청한 작업을 수행하세요. agency 전문 역할로 필요한 독립 데이터·모바일·runtime 리뷰를 분담하되 같은 파일·공용 reports와 성능 측정을 충돌시키지 마세요. 기존 숫자/날짜/신선도/모바일 계약을 유지하고 실제 QA 결과와 한계를 기록하세요. e2e와 claude-mem을 설치되어 있다고 가정하지 말고 LLM API 키를 추가하지 마세요.

대화 원문 대신 `docs/project-memory.md`, `docs/decision-log.md`, `docs/regression-guardrails.md`, [HANDOFF_TEMPLATE](agents/HANDOFF_TEMPLATE.md)에 **확인된 사실·SHA·명령·결과·미완료**를 남긴다. 오래된 결과를 오늘 값으로 간주하지 않는다. 환경 인증, 원문 도구 출력, 개인 관심/메모, 자동 수집 DB는 커밋하지 않는다.

프런트는 PR/main QA 통과 후 테스트한 main만 기존 Render 브랜치로 승격한다. backend는 별도 main과 기존 수동 Render 배포를 사용한다. 데이터 CDN이 서버보다 먼저 갱신되면 같은 버전의 거장 근거가409일 수 있으므로 snapshotVersion과 `/health.revision`을 확인한다. 배포했다고 말하기 전에 정확한 테스트 커밋·실제 앱 자산·변경 화면을 확인한다. 자동 수집과 자동 서버 배포는 다른 기능이다. 실제 Toss Android/iOS Sandbox 출시는 여전히 별도 gate다.

추가 외부 LLM API·키·유료 서비스는 이관에 필요 없다. Codex/subagent 이용량, 기존 Actions/Render 요금, live 조회의 기존 제공자 조건은 별개다.
