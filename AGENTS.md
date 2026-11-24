# Connecting Space 프로젝트 작업 규칙

## 프로젝트 개요

- 브랜드명: 커넥팅스페이스
- 목표: 웹 제작 서비스를 소개하고 실제 고객 문의를 확보하는 서비스 구축
- MVP의 중심: 공개 랜딩페이지의 견적 요청 폼과 관리자 문의 관리
- 제안서·계약서·AI·코드 생성은 관리자 전용 기능이며 단계적으로 구현한다.

## 역할

- 플래너: 요구사항, 범위, 의존성, 수용 기준을 정리한다.
- 프론트엔드: Next.js 웹 화면과 사용자 인터랙션을 구현한다.
- 백엔드: Cloudflare Workers API와 데이터·인증 경계를 구현한다.
- QA: 테스트 기준과 검증 결과를 확인한다.
- 한 작업에서 여러 역할을 임의로 겸하지 않는다. 작업 범위가 겹치면 플래너에게 먼저 보고한다.

## 기술 기준

- 웹: Next.js, TypeScript, App Router, 정적 export 우선
- 스타일: Tailwind CSS, shadcn/ui
- 상태: React Query는 서버 상태, Zustand는 전역 UI 상태에 사용한다.
- API: Cloudflare Workers, Hono
- 데이터 검증: Zod
- 테스트: Vitest, Playwright
- 구조: FSD 원칙을 적용하고, 한 파일에 여러 책임을 섞지 않는다.

## Git과 작업 방식

- `main`에 직접 푸시하지 않는다. 작업 브랜치와 PR을 사용한다.
- 모든 작업 브랜치는 기능·역할별 전용 워크트리 폴더에서 진행한다.
- 하나의 워크트리 폴더에서 여러 기능 브랜치를 번갈아 작업하지 않는다.
- 워크트리는 역할 폴더 아래에 작업별 폴더를 둔다.
- 워크트리 예시: `.worktrees/frontend/foundation`, `.worktrees/backend/foundation`, `.worktrees/qa/foundation`
- 각 작업 폴더는 하나의 브랜치에만 연결한다.
- 각 멀티에이전트는 자신에게 배정된 역할·작업 폴더 안에서만 작업한다.
- 브랜치 이름은 `feat/`, `fix/`, `chore/`, `docs/` 접두사를 사용한다.
- 에이전트는 자동으로 커밋하거나 푸시하지 않는다.
- 변경 후 반드시 변경 파일, 검증 명령, 미확인 사항을 보고한다.
- 손 대표님이 확인하기 전에는 커밋·PR·머지를 진행하지 않는다.
- 테스트는 개발 중 매번 실행하지 않고, PR 전 검증을 기본으로 한다.

### PR 코멘트 보고 규칙

PR을 생성한 에이전트는 PR 본문만 작성하고 끝내지 않는다. PR 생성 직후 첫 코멘트를 반드시 남긴다. 모든 PR 코멘트의 첫 줄은 역할을 표시한다.

```md
## 역할: Backend
```

역할은 `Planner`, `Frontend`, `Backend`, `QA` 중 하나를 사용한다.

첫 코멘트에는 작업 목적, 변경 파일, 실행한 검증 명령과 실제 결과, 미검증 항목·제한, 다음 확인 요청을 포함한다. 새 커밋을 추가하거나 검증 결과가 바뀌면 기존 코멘트를 조용히 고치지 말고 새 코멘트를 남긴다. 새 코멘트에도 역할, 수정 커밋 SHA, 변경 내용, 재검증 결과, 현재 판정을 포함한다.

QA는 검증 후 반드시 역할 코멘트를 남기고 `PASS`, `FAIL`, `CONDITIONALLY READY`, `NOT READY`, `BLOCKED` 중 하나로 최종 판정을 명시한다. QA 코멘트가 없으면 플래너는 검증 대기 상태로 본다.

PR 코멘트가 없는 상태로 검증 완료·수정 완료·머지 가능이라고 보고하지 않는다.

### 작업 워크트리 자동 준비

새 이슈를 받으면 역할 폴더 안에 작업별 워크트리를 자동으로 준비한다. 자동 준비에는 `scripts/prepare-agent-worktree.sh`를 사용한다.

1. 저장소 루트에서 `git fetch origin`을 실행한다.
2. 이슈 번호와 짧은 작업명을 조합해 작업 slug를 정한다. 작업명이 없으면 `issue-<번호>`를 사용한다.
3. `bash scripts/prepare-agent-worktree.sh <역할> <작업종류> <이슈번호> [slug]`를 실행한다.
4. 스크립트가 출력한 경로로 이동한다.
5. `pwd`와 `git branch --show-current`를 다시 확인한다.
6. `main`에서는 파일을 수정하지 않는다.

역할별 경로와 브랜치는 다음 규칙을 사용한다. 작업 종류는 `feat`, `fix`, `refactor`, `chore`, `docs`, `test` 중 하나를 사용한다.

- Planner: `.worktrees/planner/<slug>` / `<작업종류>/planner-<slug>`
- Frontend: `.worktrees/frontend/<slug>` / `<작업종류>/frontend-<slug>`
- Backend: `.worktrees/backend/<slug>` / `<작업종류>/backend-<slug>`
- QA: `.worktrees/qa/<slug>` / `<작업종류>/qa-<slug>`

예시:

```bash
WORKTREE_PATH="$(bash scripts/prepare-agent-worktree.sh frontend feat 21 inquiry-form)"
cd "$WORKTREE_PATH"
```

오류 수정은 `fix`, 구조 개선은 `refactor`, 문서·설정은 `chore` 또는 `docs`, 테스트 작업은 `test`를 사용한다.

### 현재 작업 매핑

특정 기능을 하나의 워크트리나 브랜치에 고정하지 않는다. 각 에이전트는 새 이슈를 받을 때마다 이슈 번호와 작업명을 사용해 새 워크트리를 준비한다.

| 역할     | 워크트리 기본 경로           | 브랜치 규칙            |
| -------- | ---------------------------- | ---------------------- |
| Planner  | `.worktrees/planner/<slug>`  | `chore/planner-<slug>` |
| Frontend | `.worktrees/frontend/<slug>` | `feat/frontend-<slug>` |
| Backend  | `.worktrees/backend/<slug>`  | `feat/backend-<slug>`  |
| QA       | `.worktrees/qa/<slug>`       | `chore/qa-<slug>`      |

예를 들어 프론트엔드가 20번 이슈를 받으면 다음처럼 실행한다.

```bash
WORKTREE_PATH="$(bash scripts/prepare-agent-worktree.sh frontend feat 20 inquiry-form-api)"
cd "$WORKTREE_PATH"
```

기존 `foundation` 워크트리는 참고용이며, 새 이슈의 작업 장소로 재사용하지 않는다.

### 문의 확보 MVP 착수 순서

플래너 이슈 #14의 기준이 확인된 뒤 아래 순서로 진행한다.

1. Backend: #15 문의 데이터 모델과 저장소
2. Frontend: #16 공개 랜딩페이지 기본 화면
3. Backend: #19 관리자 인증 경계와 7일 세션
4. Backend: #18 공개 문의 접수 API
5. Frontend: #17 관리자 문의 관리 화면
6. Frontend: #20 공개 문의 폼과 API 연결
7. QA: #21 통합 검증

각 에이전트는 이슈를 받으면 먼저 자신의 역할 워크트리를 만들고, 그 경로와 브랜치를 확인한 뒤 작업한다. 손 대표님의 확인 전에는 커밋·푸시·PR을 만들지 않는다.

### 작업 시작 전 확인

1. `pwd`로 현재 워크트리 경로를 확인한다.
2. `git branch --show-current`로 현재 브랜치를 확인한다.
3. 현재 경로와 브랜치가 역할 매핑과 다르면 작업 워크트리를 준비·이동한다.
4. `main` 브랜치에서는 코드를 수정하지 않는다.
5. 역할 스킬과 담당 이슈를 읽은 뒤에만 작업을 시작한다.

## 안전 경계

- 운영 DB, 실제 고객 정보, API 키, 비밀값을 다루지 않는다.
- 실제 이메일 발송, 배포, 외부 서비스 연결은 별도 승인을 받은 뒤 진행한다.
- 테스트에는 합성 데이터를 사용한다.
- `/Users/youngjinson/developer/imweb` 저장소는 명시적인 요청 전까지 읽거나 수정하지 않는다.
- 기존 저장소의 코드, 데이터, 환경변수, 인증정보를 복사하지 않는다.

## 문서와 커뮤니케이션

- 문서는 쉬운 한국어로 작성한다.
- 확정되지 않은 내용은 결정된 요구사항처럼 표현하지 않는다.
- 제품 문구, 가격, 색상, 운영 정책은 임의로 확정하지 않는다.
- 구현 전에는 목적, 포함 범위, 제외 범위, 완료 기준을 확인한다.
- 완료라고 보고할 때는 실제 실행한 검증 결과를 함께 제시한다.
- 역할별 상세 작업 절차는 `.agents/skills/` 아래의 해당 `SKILL.md`를 따른다.

## 현재 단계

현재는 웹·API 기본 골격을 준비하는 단계다. 랜딩페이지 디자인, 문의 저장, 인증, D1, 이메일, AI 기능은 각각의 이슈와 승인 후 진행한다.
