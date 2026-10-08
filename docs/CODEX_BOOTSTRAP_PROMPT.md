# 다른 Codex에 붙여넣는 Chart View 시작 요청

아래 블록 전체를 새 Codex에 붙여넣으세요. 기본 대상은 기존 Chart View 두 저장소·두 Render 서비스입니다. 현재 PC에 로컬 실행·QA 환경을 준비하고 작업을 이어받도록 요청하며, 끝에 원하는 기능 수정이나 배포 범위를 덧붙일 수 있습니다. 설치·연결 상세는 [이관 가이드](CODEX_TRANSFER.md)를 따릅니다.

```text
Chart View 작업을 이 Codex 환경에서 이어받고, 실제 로컬 실행과 자동 QA까지 준비해 주세요. 저장소와 운영 상태를 먼저 분석하고 합리적인 구현 선택은 직접 판단하세요. 세세한 선택을 반복해서 묻지 말고, 확인한 사실과 실행 결과로 작업을 끝내세요.

기본 대상과 구조
- Toss 클라이언트: https://github.com/shoon94parkk-del/chart-view-toss
  project_id: github:shoon94parkk-del/chart-view-toss
  운영 주소: https://chart-view-toss.onrender.com
  Render service: srv-dao4n4mk1f9s73algnf0
- 공유 FastAPI·수집·데이터·별도 Web UI: https://github.com/shoon94parkk-del/chart_View
  project_id: github:shoon94parkk-del/chart_View
  운영 주소: https://chart-view-pkv8.onrender.com
  Render service: srv-dao4a50473hc73bclej0
- 기존 Render workspace: Chart View, tea-dao48j942hec738cpseg.
- 두 저장소 기본 브랜치는 main이다. Toss Render는 feat/apps-in-toss-mvp를 추적하며 테스트한 main을 기존 GitHub Actions가 승격한다. 백엔드는 main과 기존 수동 Render 게시 경로를 사용한다.
- 서비스 ID·브랜치·주소는 시작 시 실제 연결된 GitHub/Render에서 재확인한다. 기존 두 서비스와 데이터 구조를 유지한다. 다른 새 프로젝트로 복제를 명시적으로 요청받았다면 대상 저장소·서비스 식별자·공개 주소·비밀 참조를 따로 설정해야 하며, 이 요청의 기본 범위에서는 새 Render 서비스·유료 리소스·DB·배포 hook을 만들지 않는다.

1. 저장소와 기억부터 확인
기존 checkout이 있으면 현재 branch/SHA/작업 diff를 확인하고 사용자 변경을 보존한다. 없으면 안전한 작업 폴더에서 두 저장소를 clone한다. 최신 main을 확인해 새 작업 브랜치나 격리된 worktree에서 시작한다. 이전 PC의 /workspace 경로나 scratch 파일을 전제하지 않는다.

git clone https://github.com/shoon94parkk-del/chart-view-toss.git
git clone https://github.com/shoon94parkk-del/chart_View.git

각 저장소의 AGENTS.md와 그 필수 문서를 먼저 읽는다. 특히 Toss의 docs/CODEX_HANDOFF.md, CODEX_TRANSFER.md, project-memory.md, regression-guardrails.md, decision-log.md, no-repeat-regression-policy.md, ARCHITECTURE.md, AUTOMATED_QA.md, P0_RELEASE_GATE.md를 확인한다. 백엔드의 docs/CODEX_HANDOFF.md와 handover.md, 현재 테스트·배포 workflow를 읽는다. 문서의 과거 테스트 수·스타 수·종목 수·측정값은 당시 기록이다. 현재 버전과 실행 결과를 직접 확인한다.

2. 계정·네트워크·skill
GitHub/Codex/Render는 새 환경에서 본인의 기존 계정과 연결된 앱/CLI 권한을 사용한다. 인증 파일·토큰·키·환경 전체를 읽거나 출력·복사·커밋하지 않는다. 현재 연결과 target 권한은 안전한 상태/메타데이터로 확인한다. 권한이 없으면 가능한 로컬 준비·fixture QA를 끝내고 미연결 범위를 보고한다.
관리형 클라우드라면 현재 runtime skill과 환경 상태·네트워크 정책을 확인한다. 제공된 프록시/CA 신뢰를 유지하고 TLS 검증을 끄거나 프록시를 우회하지 않는다. HOME/CODEX_HOME이나 전역 Codex 설정을 재지정해 이관하지 않는다.

Toss 저장소의 .agents/skills/chartview-qa/SKILL.md와 chartview-agent-review/SKILL.md는 자체 작성한 프로젝트 skill이다. 새 세션에서 실제 skill 인식을 확인한 뒤 $chartview-qa와 $chartview-agent-review를 활용한다. 자동 발견을 지원하지 않으면 파일을 직접 읽고 같은 절차를 따른다. 파일 존재만으로 연결 완료라고 기록하지 않는다. Render/cloud-runtime의 플랫폼 skill·connector는 Git clone으로 이관되지 않으므로 대상 환경에서 연결·노출 상태를 확인한다. 외부 skill 전문이나 기존 인증을 복제하지 않는다.

3. 로컬 Toss와 도구 설치
Node 24.x(현재 CI 기준 24.21.0), npm 10–11을 준비한다. chart-view-toss 루트에서 실행한다.

node tools/codex/setup.mjs --install --with-browsers
node tools/codex/setup.mjs --check

앱과 tools/codex는 각각 기존 lockfile을 사용한다. 선택 도구는 --ignore-scripts로 별도 설치하며 앱 번들/Render 루트 의존성에 넣지 않는다. agent-browser 0.38.2, Lighthouse 13.5.0, Knip 6.40.0, dependency-cruiser 18.5.0, fast-check 4.10.2의 실제 버전을 현재 manifest/lock과 대조한다. Playwright 1.55.0과 axe 4.13.0의 필수 QA를 재사용한다. 버전은 향후 저장소의 승인된 변경이 있으면 최신 lockfile을 우선한다.

Linux OS 라이브러리와 한국어 글꼴은 이관 가이드에 따라 별도 준비한다. npm 설치/check만으로 실제 브라우저 실행·한글·skill 발견·계정 연결을 보증하지 않는다. Chromium과 WebKit을 실제 실행하고 한글 screenshot, JS 오류, 가로 overflow를 확인한다. 다른 머신의 임시 fontconfig 경로를 그대로 사용하거나 글꼴 문제를 앱 CSS로 숨기지 않는다.

.env.example은 공개 API 주소만 있는 API-only 설정이다. .env.local이 없을 때만 복사하고 기존 설정을 덮지 않는다. 기본 주소는 VITE_CHARTVIEW_API_BASE=https://chart-view-pkv8.onrender.com이다. deterministic fixture QA에서는 VITE_CHARTVIEW_STATIC_DATA_BASE가 unset/empty여야 한다. 이미 공개 raw CDN을 설정했다면 CODEX_TRANSFER.md의 Bash/PowerShell 자식 process 빈 값 override를 사용한다. 특히 일부 PowerShell의 빈 문자열 환경변수 대입은 삭제로 처리되어 .env.local의 CDN 주소를 다시 읽을 수 있다.

qa:prepush는 Node 테스트·production build·desktop/Android/320px/iPhone WebKit 회귀를 실제 실행한다. 필요한 기존 모바일 QA도 실행한다. Render/live의 공개 CDN 설정은 fixture QA와 분리하고, 실제 공개 설정 확인 전에 원 설정을 유지한 새 터미널 또는 복원된 설정으로 다시 build한다. 같은 코드도 공개 build 설정에 따라 JS hash가 달라질 수 있으므로 설정과 정확한 소스 revision을 함께 대조한다.

개발 서버는 npm run dev로 시작하고, build 이후 별도 preview는 npm run preview -- --host 127.0.0.1 --port 4173 --strictPort로 실행한다. 서버 readiness를 확인한 뒤 node tools/codex/run.mjs browser 명령으로 실제 화면을 조작한다. snapshot의 현재 ref를 사용하며 browser close로 종료한다. 브라우저 session/namespace와 artifact 경로를 프로젝트·작업별로 분리하거나 공용 session을 순서대로 사용한다.

4. 로컬 공유 서버
chart_View 루트의 main.py와 main:app이 활성 경로다. 과거 toss_stock_app 사본을 실행하지 않는다. Python 3.11 이상으로 .venv를 만들고 현재 requirements.txt 및 백엔드 인수인계에 명시된 테스트 의존성을 설치한다. 기존 Python requirements는 범위 기반이므로 Node lockfile과 같은 완전 고정 재현으로 주장하지 말고 실제 Python·설치 버전을 기록한다.

python -m venv .venv
Linux: .venv/bin/python -m pip install -r requirements.txt yfinance pytest httpx
Windows: .venv/Scripts/python.exe -m pip install -r requirements.txt yfinance pytest httpx

같은 .venv의 python으로 python -m pytest -q, scripts/build_frontend_bundle.py --check를 실행하고, 현재 CI가 요구하는 Node 계약·boot bundle·관련 모바일 검사를 실행한다. 백엔드 Web UI 수정 시 source/생성 bundle/content hash를 함께 보호한다. 검증 명령은 현재 CI와 AGENTS를 우선한다.

별도 터미널에서 같은 .venv의 python -m uvicorn main:app --host 127.0.0.1 --port 8000으로 로컬 서버를 실행하고 /health 및 Web UI를 확인한다. 공급자 startup warm/self-ping을 생략한 저장 자료 smoke는 기존 CI처럼 --lifespan off로 실행할 수 있으나 production의 background warm 동작까지 검증했다고 말하지 않는다. 준비 상태는 실제 health로 확인한다.

Toss의 기본 fixture QA는 외부 공급자에 의존하지 않고, 기본 live 개발은 기존 공개 API를 사용한다. Toss와 로컬 백엔드를 연결할 때는 현재 CORS와 local-only proxy를 먼저 확인한다. 단순히 API base를 localhost:8000으로 바꾸면 브라우저 CORS가 막힐 수 있다. 필요한 로컬 연결은 개발 전용 구성으로 해결하고 운영 CORS/수집/API 계약을 무단 변경하지 않는다. 저장 자료 조회에 새 DART 키는 필요 없다. 실제 제공자 수집은 기존 서버/Actions 권한·한도 안의 별도 작업이며 전체 재수집을 이관 과정에서 시작하지 않는다.

5. 전문 개발·QA 역할과 보호 계약
현재 Codex가 subagent를 지원하면 docs/agents/ROLES.md와 chartview-agent-review skill에 따라 필요한 frontend/data-qa/mobile-qa/runtime/reviewer 역할을 나누고 coordinator가 통합한다. 각 역할에 project_id, 실제 repository/branch/base SHA, 편집 가능한 파일 또는 read-only, 완료 조건과 별도 evidence 경로를 전달한다. 같은 파일을 동시에 수정하지 않고, 독립 reviewer는 read-only로 유지한다. 공용 qa:prepush/report와 성능 측정은 순서대로 실행한다. 단순 작업에 모든 역할을 자동 실행하지 않으며 subagent가 없으면 역할별로 순차 검토하고 제한을 보고한다.

기존 UI와 자료 수집·Render 구조를 크게 바꾸지 않는다. 이전 해결/회귀를 검색하고 new behavior/new bug/regression을 구분한다. 가격 freshness·최신 응답 guard·단위/날짜·결측과 실제 0·선정 성과 분모·부분 실패·lazy 화면 복구·모바일 44px 조작·native back/safe area 계약을 보호한다. API 원 응답→가공값→화면 표시 관계와 모바일 실제 조작을 검증하고, 발견한 앱 버그에는 기존 Node/Playwright 회귀를 추가한다. 테스트 가정 오류와 실제 앱 결함을 구분한다. 고정 sleep·실시간 숫자 하드코딩·flaky pass·skip·기준 완화로 실패를 숨기지 않는다.

agency-agents는 프로젝트 역할에 맞게 채택한 지침이다. tester-army/e2e와 claude-mem은 현재 소스 조사만 했으며 MCP/runtime/worker/hooks/자동 기억이 설치되어 있다고 가정하지 않는다. 글로벌 MCP·자동 수집·추가 모델 provider를 켜지 않는다. OpenAI/외부 LLM API 키를 새로 요구하지 않으며 CI는 결정론적 Playwright/Node/axe로 유지한다. Codex/subagent 자체 이용량과 기존 Actions/Render/공급자 비용은 별개다.

6. 운영 상태와 배포 범위
기존 프런트/백엔드 운영 주소의 실제 HTTP 응답을 확인한다. 백엔드 /health.revision과 정확한 테스트·배포 SHA를 대조하고, 프런트 Render의 실제 배포 commit·HTML/JS/CSS 자산·공개 build 설정을 확인한다. 거장 결과/CDN/snapshotVersion/종목 근거의 버전이 일치하는지 확인하고, 현재 버전 근거200과 잘못된 버전409를 검증한다. 최신 CDN 목록을 더 오래된 서버 자료로 되돌리거나409를 무시하지 않는다. 일일 자료 수집과 서버 배포 자동화는 서로 다른 기능이다.

이 요청의 기본 완료 범위는 기존 프로젝트를 이어받을 로컬 환경·도구·skill 활용·실제 QA·운영 상태 확인이다. 추가 기능 수정이나 배포를 요청받았다면 기존 사용자 승인 범위에 따라 진행한다. 프런트는 필수 CI를 통과한 정확한 최신 main만 기존 Render 브랜치로 승격하고, 백엔드는 테스트한 정확한 main을 기존 수동 Render 경로로 게시한다. Render live 표시만으로 완료라고 말하지 말고 실제 revision/자산/변경 화면을 확인한다. 설치·QA·기존 범위의 가역적인 준비를 진행하면서 불필요한 확인 절차를 추가하지 않는다.

웹 미리보기/E2E 통과는 실제 Toss Android/iOS Sandbox·QR·공개 출시 승인이 아니다. P0_RELEASE_GATE의 native back/root exit·계정 분리·키보드/복귀·정책/제공자 권리 미완료 항목을 유지한다.

7. 완료 보고와 장기 맥락
실제로 추가/수정한 파일, 설치 버전, 실행한 명령과 결과, 실제 활용한 agent·도구, 앱 버그와 수정/회귀, GitHub CI와 배포 여부/SHA, 미검증 환경·연결·native 범위를 보고한다. 실행하지 않은 테스트·미등록 skill·미연결 MCP·미배포 서버를 완료했다고 기록하지 않는다. screenshot/trace/HTML report 경로와 임시 evidence의 보존 한계를 표시한다.
확인된 사실·결정·SHA·검증·미완료·다음 행동을 각 저장소의 project-memory/decision-log/guardrails/handoff와 HANDOFF_TEMPLATE에 보존한다. 가설은 별도로 표시하고, 원 대화·인증·개인 관심/메모·자동 수집 DB는 Git에 넣지 않는다. 다른 프로젝트의 맥락을 섞지 않는다.
```
