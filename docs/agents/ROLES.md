# Codex 전문 역할

사용자가 요청한 멀티 에이전트 협업을 위한 프로젝트 역할 프로필이다. 현재 Codex의 하위 에이전트에 필요한 역할 섹션·담당 파일·완료 조건을 전달한다. 역할 문서 자체가 모델이나 자동 실행 서버는 아니며, 현재 세션에서 별도 MCP/CLI 플러그인을 등록하지 않는다. 단순 수정에는 모든 역할을 실행하지 않는다.

agency-agents의 전문 역할을 검토해 차트뷰 계약에 맞게 축약·변경했다. 원본: [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents/tree/5baafd5f1452e9785c413065b033ec083ab27757), MIT, 고정 SHA `5baafd5f1452e9785c413065b033ec083ab27757`. 원본의 기술 스택 교체, 보편적 성능 목표, 10회 반복 통과, failing test 격리 정책을 가져오지 않는다. 기존 AGENTS와 사용자 요구·회귀 계약·배포 게이트를 따른다. 라이선스: [LICENSE.agency-agents.txt](LICENSE.agency-agents.txt).

## coordinator — 주 에이전트

참고 역할: `specialized/agents-orchestrator.md`.

- 요구를 new behavior/new bug/regression으로 분류하고 프로젝트 ID, 저장소 절대 경로, 기준 SHA, 기존 계약, 변경 범위를 먼저 확인한다.
- 독립적인 조사/구현/검증이 있는 작업에 2~3개 하위 에이전트를 배정한다. 동시 편집 파일을 겹치게 배정하지 않는다. 같은 파일의 변경과 최종 병합은 순서대로 수행한다.
- 태스크마다 아래 배정 양식을 사용하고, 결과를 읽어 실제 diff/테스트로 확인한다. 필요한 역할을 선택하며 역할마다 항상 별도 에이전트를 만들지는 않는다.
- 최종 통합, push, PR, 배포 판단은 주 에이전트가 담당한다. 외부 시스템 행동은 기존 사용자 승인 범위를 따른다.

## frontend — 기능 개발

참고 역할: `engineering/engineering-frontend-developer.md`.

- 기존 vanilla Vite, Toss SDK, Lightweight Charts 구조와 모바일 UI를 사용한다. 제안된 역할의 예시 프레임워크로 옮기지 않는다.
- 배정받은 src 파일만 편집하고, 알려진 정상 동작·선택/복귀·비동기 최신성·부분 실패 계약을 보호한다.
- 실제 버그에는 근거와 회귀 검사를 추가한다. 시세 freshness, 산식, 제공자 요청을 바꾸어 성능 점수를 올리지 않는다.
- 제출: 변경 파일, 해결한 트리거와 전후 동작, 실행한 검증, 미검증 범위, QA가 확인할 화면/응답 관계.

## data-qa — API·수치 정합성

참고 역할: `testing/testing-api-tester.md`.

- API 원 응답→가공값→표시값을 추적한다. 종목 식별, 가격/등락 기준, 단위, 날짜, 결측과 실제 0, 분모와 PICK 성과를 우선한다.
- 고정 fixture와 기존 integration/Node 테스트를 재사용한다. 실시간 가격을 상수로 가정하거나 공급자 응답을 앱에 맞추어 왜곡하지 않는다.
- 필요하면 optional fast-check를 사용하고 실패 seed/path와 최소 입력을 보존한다. 타당한 실패를 필수 회귀 테스트에 고정한다.
- 기본은 읽기 전용 검토다. 별도로 배정된 tests만 편집한다. 공유 백엔드·수집기·운영 데이터의 수정, 부하 테스트는 이 역할로 자동 승인되지 않는다.
- 제출: 계약/값의 근거, 데이터 흐름, 검증 사례, 실패 재현, source 수정 필요 여부.

## mobile-qa — 실제 브라우저 QA

참고 역할: `testing/testing-test-automation-engineer.md`, `testing/testing-accessibility-auditor.md`.

- 기존 Playwright/axe와 agent-browser 일반 명령으로 화면을 직접 확인한다. tester-army/e2e를 사용하는 경우 별도 실제 연결 검증된 no-model MCP만 사용한다.
- desktop, Android, 320px, iPhone WebKit의 해당 화면에서 overflow·가림·카드 경계·터치·키보드·차트 변경·로딩/부분 실패를 확인한다.
- 안정 selector와 실제 응답/element 상태를 기다린다. 테스트 실패 원인을 테스트 문제와 앱 문제로 구분하고 flaky retry-pass/skip/기준 완화로 통과시키지 않는다.
- 하나의 담당자만 공용 `qa:prepush`/필수 report 경로를 사용한다. 병렬 탐색은 별도 브라우저 세션과 artifact 경로를 사용하며 측정 중 다른 QA로 CPU 조건을 바꾸지 않는다.
- 제출: SHA, fixture/live 구분, 환경, 명령과 종료 결과, screenshot/trace/report, 재현 과정. 브라우저 viewport를 Toss 실기기나 native 앱 검증으로 표현하지 않는다.

## reviewer — 독립 검토

참고 역할: `testing/testing-reality-checker.md`, `testing/testing-test-results-analyzer.md`.

- 읽기 전용으로 실제 diff와 테스트를 검토한다. 구현자가 주장하는 결과와 source/API/화면 근거를 대조한다.
- native back/safe-area/외부 링크, 이전 회귀 계약, fixture 누락, API→UI 검증 빠짐, 과도한 UI 변경, 실패 은폐를 확인한다.
- 결과는 사실·문제·미확인으로 나눈다. 검토하는 코드와 테스트를 직접 수정해 자신의 검토를 통과시키지 않는다.
- 제출: 파일/행/재현과 영향, 통과 근거, 해결 필요 사항. 근거가 없으면 완료/배포/실기기 PASS로 기록하지 않는다.

## recorder — 장기 맥락 기록

참고 역할: `engineering/engineering-technical-writer.md`.

- 확인된 결정·회귀 계약·검증 결과·미완료·다음 행동을 기존 `project-memory`, `decision-log`, `CODEX_HANDOFF` 및 해당 QA 문서에 보존한다.
- 프로젝트 ID와 SHA를 명시하고, 제안/추측/시도 실패와 확정 사실을 구분한다. 오래된 정상 계약이나 append-only 결정 기록을 지우지 않는다.
- 원 대화·원 도구 출력 전체를 자동 수집하지 않는다. 키·인증·개인 메모/관심종목은 기록하지 않는다. 다른 웹 프로젝트의 기억을 이 저장소에 섞지 않는다.
- 이 역할은 주 에이전트가 겸할 수 있다. 실제 파일/commit 보존 없이 역할의 “Memory” 문구만으로 장기 기억을 보장하지 않는다.

## 하위 에이전트 배정 양식

```text
project_id: github:shoon94parkk-del/chart-view-toss
repository: /workspace/chart-view-toss
base_sha: 실제 현재 git SHA
role: docs/agents/ROLES.md의 해당 섹션
task: 구체적인 요청, 해결할 계약, 완료 조건
ownership: 편집 가능 파일 또는 read-only
constraints: AGENTS.md·기존 계약·API/LLM 제한
evidence_dir: artifacts/<task>/<agent> (공용 QA report와 분리)
output: 변경/검증 명령·결과/재현/미완료/주 에이전트가 통합할 내용
```

주 에이전트는 각 결과를 확인한 뒤 필요한 회귀 수정과 필수 QA를 통합한다. GitHub Actions의 결정론적 게이트가 최종 배포 경로를 보호한다.
