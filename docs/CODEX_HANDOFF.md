# 새 PC에서 이어가기 — Chart View Toss

최종 갱신: 2026-10-05 KST. 대화 기억 대신 이 문서와 저장소의 현재 `main`을 기준으로 시작한다.

## 저장소와 운영 서비스

| 역할 | GitHub | 운영 주소 |
|---|---|---|
| 모바일 Apps in Toss UI | [chart-view-toss](https://github.com/shoon94parkk-del/chart-view-toss) | https://chart-view-toss.onrender.com |
| 공유 FastAPI·데이터·별도 웹 UI | [chart_View](https://github.com/shoon94parkk-del/chart_View) | https://chart-view-pkv8.onrender.com |

둘 다 기본 브랜치 `main`. Toss UI는 이 저장소에서 수정한다. 백엔드 저장소의 별도 Web UI를 Toss 디자인으로 덮어쓰지 않는다. `chart-view-bsg6`는 과거 서비스다.

## 먼저 읽을 문서

`AGENTS.md` → `docs/no-repeat-regression-policy.md` → `docs/project-memory.md` → `docs/regression-guardrails.md` → `docs/decision-log.md` → `docs/ARCHITECTURE.md` → `docs/P0_RELEASE_GATE.md`.
기록의 날짜가 충돌하면 최신 승인 결정을 우선하며 오래된 결정으로 의도된 UI를 되돌리지 않는다.

## 사용자의 현재 제품 방향

- 목적: 사용자가 주식 인사이트를 얻고 다음 조사·생각으로 이어지는 앱. 숫자·기준일·선정 근거·출처·한계를 연결한다.
- 모바일 우선. 큰 카드·과한 픽셀 크기를 싫어한다. 홈은 시장 상황을 먼저 보여주고 핵심 분석 입구가 잘 보이게 한다.
- 종목 목록은 작은 행으로 여러 종목을 비교한다. 거장 목록은72–88px, 중요한 메타12px 이상, 독립 조작44px 이상. 자세한 설명은 펼침으로 보존한다.
- 반도체 시장가격은 **분석 → 반도체 가격 추적**. TrendForce/DRAMeXchange 출처·원날짜·링크 표시. 수출에는 관세청 수출 자료를 둔다.
- 전체 히트맵은 종목을 섹터별로 묶은 직사각형 지도. 한국/미국 선택만 명확히; 종목/섹터/지도/목록 모드가 늘어난 과거 UI로 되돌리지 않는다.
- 선정 기록의 닫힌 행은 유지/경계/재점검/검토대기 하나의 우선 상태. 기술주의·강한경고와 상세 근거는 해당 행을 열어 표시한다.
- 기존 기술 검색과 투자 아이디어 LAB, 선정 기록과 거장 원칙 검색의 역할을 구분한다.

## 최근 구현

분석 → 거장 투자법에 버핏/린치/오닐/미너비니/그린블라트 다섯 선택. 버핏·린치 기준은 유지. 새 화면은 한 줄 스크롤 선택, 작은 행, 근거 펼침, 검색/시장 필터와 Back/Reload 복원을 유지한다. `/gurus/<strategy>/` 정적 직접 진입도 지원한다.

**모든 방법은 차트뷰의 수치 구현이며 해당 거장의 실제 선정·전체 판단이 아니다.** 오닐은 실적 성장·일봉 돌파의 일부; 미너비니는 추세와 단순252거래일 수익률 백분위이며 RSI/IBD RS Rating/VCP가 아니다. 그린블라트는 **ROA/PER 대안**으로 EBIT/EV 매직포뮬러가 아니다. 결측값을 추정해서 선정하지 않는다.

코드: `src/guruInvestingModel.js`, `guruInvestingView.js`, `guruInvestingExtensions.js`, `guruInvestingView.css`, `routes.js`, `scripts/export-preview-routes.mjs`. 데이터 계산·수집은 공유 백엔드만 담당한다. 실시간 가격으로 재무 선정 지표를 재계산하지 않는다. 버전409는 명시적 최신 결과 확인으로 복구한다. Home/detail 시작 시 거장 요청·자산을 추가하지 않는다.

기존 두 방법의 1차 실제 수집: 전체2,652 기록 확인, 버핏54·린치37(2026-10-02 종가). **추가 전략의 현재 개수는 운영 스냅샷을 확인**한다. 이 숫자를 실시간·오늘 날짜로 재표시하지 않는다.

## 새 PC 개발 시작

Git, Node **24.21.0**, npm10/11, Python3.11 이상을 준비한다. Codex와 GitHub에는 본인 계정으로 로그인한다. 작업 브랜치는 최신 main에서 만든다.

```powershell
git clone https://github.com/shoon94parkk-del/chart-view-toss.git
git clone https://github.com/shoon94parkk-del/chart_View.git
cd chart-view-toss
npm ci
Copy-Item .env.example .env.local
npm run dev
```

`.env.local`의 공개 설정:

```dotenv
VITE_CHARTVIEW_API_BASE=https://chart-view-pkv8.onrender.com
VITE_CHARTVIEW_STATIC_DATA_BASE=https://raw.githubusercontent.com/shoon94parkk-del/chart_View/main/static/data
```

프런트 개발·저장된 데이터 조회에는 DART 키가 필요 없다. API 키/Render 훅/GitHub 토큰을 채팅·GitHub 문서·커밋에 넣지 않는다. 기존 GitHub Actions의 DART Secret은 새 PC로 복사할 필요 없이 서버 수집에 사용된다. 새 PC의 환경·로그인·브라우저 로컬 관심/메모는 저장소 복제로 옮겨지지 않는다.

검증:

```powershell
npm test
npm run build
npx playwright install chromium
# 모바일 QA용 playwright는 CI와 같은 버전으로 별도 준비
npm install --no-save --package-lock=false playwright@1.55.0
npm run preview -- --port 4173
# 다른 터미널
node tests/guru_investing_qa.mjs
node tests/mobile_continuity_qa.mjs
npm run build:ait
```

백엔드 설정·수집·수동 배포는 [공유 서버 인수인계](https://github.com/shoon94parkk-del/chart_View/blob/main/docs/CODEX_HANDOFF.md)를 따른다. 과거 작업 PC의 `work/`, `outputs/`, 임시 linked worktree 경로에 의존하지 않는다. 필요한 테스트와 수집 스크립트는 두 GitHub 저장소에 있다.

## 배포와 미완료 외부 항목

- 프런트 Render는 `feat/apps-in-toss-mvp`를 추적하며 GitHub Actions가 main을 동기화한다. GitHub main에 병합했다고 아직 운영 완료는 아니다. 빌드 결과·실제 정적 자산·경로를 확인한다.
- 백엔드는 main. 이전 GitHub 변경 뒤 자동 배포가 발생하지 않았고 현재 사용자는 **기존 Edge Render에서 수동 배포**를 선택했다. 훅을 다른 서비스의 Secret에 넣는 승인은 받지 않았다. 매일 수집은 설정되어도 새 근거 API의 매일 자동 게시가 보장되지 않는다.
- 백엔드 `/health`의 revision과 정확한 테스트 커밋, 결과/evidence snapshotVersion을 검증한다. 데이터 변경도 백엔드 배포가 필요하다.
- Render 웹 미리보기 검증은 실제 Android/iOS Toss Sandbox·공개 출시가 아니다. 정책·공급자 권리·기기 체크는 `P0_RELEASE_GATE.md`에 남아 있다.

## 새 Codex 첫 메시지 예시

> Chart View Toss 작업을 이어갑니다. 두 저장소 최신 main을 확인하고 AGENTS.md와 docs/CODEX_HANDOFF.md, project-memory/regression-guardrails/decision-log를 먼저 읽으세요. 모바일의 작은 행과 현재 분석 동선을 유지하세요. 거장 투자법 다섯 방법의 실제 데이터·운영 revision을 확인하고, 완료 기록과 외부 미완료 항목을 구분한 뒤 요청한 변경을 진행하세요. 기존 해결을 반복하거나 근거·날짜를 추정하지 마세요.
