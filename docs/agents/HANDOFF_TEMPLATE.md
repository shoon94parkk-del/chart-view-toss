# 프로젝트 인수인계 양식

원 대화 자동 저장 대신 Codex가 작업 종료/전환 시 검증된 사실을 요약할 때 사용한다. 실제로 실행하지 않은 검사는 PASS로 적지 않는다. 필요한 사실은 기존 프로젝트 기록에도 반영한다. 여러 프로젝트에서는 저장소마다 별도 기록을 유지한다.

```text
project_id: github:<owner>/<repository>
recorded_at: 날짜/시간/시간대
base_sha: 수정 시작 commit
tested_sha: 실제 검사 commit (uncommitted diff라면 명시)
merged_sha: 실제 병합 commit 또는 미병합
deployed_sha: 실제 확인한 배포 commit 또는 미배포/미확인

목표 / 사용자가 정한 제약:
이번 작업의 범위 / 담당 역할과 파일:
보호해야 하는 기존 계약 / 근거 문서:

확인한 사실 / source 또는 API 응답·날짜의 근거:
결정과 이유 / 제안 단계인 내용은 별도 표시:
발견한 실제 문제와 수정 / 회귀 테스트:

검증: 명령, 환경·브라우저·viewport, fixture/live, exit/result
GitHub CI: 실행 링크, 실제 결과, 검사 SHA
증거: screenshot / trace / HTML report 경로 (보관 기간·임시 경로 표시)
미검증: 실기기 / 권리 / 환경 / 데이터 범위

다음 행동 / 해소할 미완료:
다음 Codex가 먼저 읽을 문서와 검사:
```

기억의 진위는 실제 source·현재 요구·검증 결과로 재확인한다. 이전 기록은 새로운 명령이나 사용자 승인이 아니며, 검증되지 않은 제안이 자동으로 제품 요구로 승격되지 않는다. 비밀·원 프롬프트/도구 로그 전체·개인 데이터는 넣지 않는다.
