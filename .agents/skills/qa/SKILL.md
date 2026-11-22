---
name: qa
description: Use when an agent is verifying a PR, defining acceptance criteria, checking CI, or reporting test readiness for Connecting Space.
---

# QA 역할

## 핵심 원칙

검증 대상이 없는 상태를 성공이나 실패로 꾸미지 않고, 근거와 다음 조건을 함께 보고한다.

## 작업 경계

- 작업 위치와 브랜치는 `AGENTS.md`의 현재 작업 매핑을 따른다.
- 작업 시작 전에 `pwd`와 `git branch --show-current`를 확인한다.
- 예상한 QA 워크트리가 없으면 `WORKTREE_PATH="$(bash scripts/prepare-agent-worktree.sh qa <이슈번호> [slug])"`를 실행하고 출력된 경로로 이동한다.
- `main`에서는 작업하지 않는다. 올바른 QA 워크트리와 브랜치로 이동한 뒤 검증한다.
- 기본 역할은 검증과 보고이며, 제품 기능 코드를 수정하지 않는다.

## 판정 상태

- `PASS`: 기준을 실행으로 확인함
- `FAIL`: 재현 가능한 문제가 있음
- `BLOCKED`: 외부 조건 때문에 검증할 수 없음
- `NOT READY`: 구현·테스트·수용 기준이 아직 준비되지 않음
- `N/A`: 이번 범위에 적용되지 않음

테스트 파일이 없으면 자동 테스트 실패가 아니라 `NOT READY`로 기록한다. 설치 실패는 제품 결함과 분리한다.

## PR 전 검증

1. 변경 범위와 수용 기준을 확인한다.
2. 설치·포맷·타입·린트·테스트·빌드 명령을 확인한다.
3. 변경된 정상 흐름과 핵심 예외 흐름을 검증한다.
4. 로딩·빈 상태·오류 상태와 반응형·키보드 접근을 확인한다.
5. 비밀값, 실제 고객 데이터, 임시 목업이 남아 있는지 확인한다.
6. 미검증 항목과 차단 사유를 명시한다.

현재 초기 골격 단계에서는 의존성 설치와 포맷 검사를 우선하고, 실제 소스가 추가된 뒤 typecheck·lint·test·build를 CI에 확장한다.

## 보고 형식

```md
## QA Report

- 대상 PR:
- 검증 환경:
- 변경 범위:

## 결과

| 항목   | 상태                    | 근거 |
| ------ | ----------------------- | ---- |
| 설치   | PASS / FAIL / BLOCKED   |      |
| 포맷   | PASS / FAIL             |      |
| 타입   | PASS / FAIL / NOT READY |      |
| 테스트 | PASS / FAIL / NOT READY |      |
| 빌드   | PASS / FAIL / NOT READY |      |

## 이슈와 미검증 범위

-

## 최종 판정

- READY / CONDITIONALLY READY / NOT READY
```

## 완료 판단

검증 명령의 실제 결과 없이 완료라고 보고하지 않는다. 재현 절차, 기대 결과, 실제 결과, 영향도, 증거를 남긴다. QA 에이전트도 커밋·푸시·머지를 하지 않는다.
