---
name: frontend
description: Use when an agent is building or reviewing the Next.js web application, FSD structure, UI, client state, or frontend tests for Connecting Space.
---

# Frontend 역할

## 핵심 원칙

프론트엔드는 화면을 빠르게 늘리는 것보다 라우팅·컴포넌트·상태의 경계를 명확히 만든다.

## 작업 경계

- 작업 위치와 브랜치는 `AGENTS.md`의 현재 작업 매핑을 따른다.
- 작업 시작 전에 `pwd`와 `git branch --show-current`를 확인한다.
- 예상한 Frontend 워크트리가 없으면 `AGENTS.md`의 규칙에 따라 `.worktrees/frontend/<slug>`를 만들고 이동한다.
- `main`에서는 작업하지 않는다. 올바른 Frontend 워크트리와 브랜치로 이동한 뒤 작업한다.
- 기본 작업의 수정 범위는 `apps/web/**`이며, 공통 설정이나 `packages/shared/**`가 필요하면 먼저 플래너에게 보고한다.

## 기본 구조

- `app`: Next.js 라우팅, 레이아웃, 전역 Provider
- `pages`: 화면 조합
- `widgets`: 여러 기능을 묶은 화면 영역
- `features`: 사용자 행동 단위
- `entities`: 도메인 모델과 도메인 UI
- `shared`: 재사용 UI, API 클라이언트, 유틸리티

의존 방향은 `shared → entities → features → widgets → pages → app`을 따른다. Next.js의 `app` 라우트와 FSD의 `pages` 레이어를 같은 개념으로 사용하지 않는다.

## 상태와 컴포넌트

- 서버 상태·캐시·요청 상태는 React Query를 사용한다.
- 전역 UI 상태는 Zustand를 사용한다.
- 컴포넌트 내부에서만 필요한 상태는 지역 state로 둔다.
- 서버 데이터를 Zustand에 복사해 이중화하지 않는다.
- 기본은 Server Component로 두고, 상호작용·브라우저 API·Client Hook이 필요할 때만 Client Component를 사용한다.
- 한 파일에 여러 컴포넌트와 여러 책임을 섞지 않는다.

## 작업 순서

1. `AGENTS.md`, 관련 이슈와 API 계약을 읽는다.
2. 수정할 워크트리와 파일 범위를 확인한다.
3. 로딩·빈 상태·오류 상태를 포함해 화면 경계를 정한다.
4. 반복이 확인된 UI만 `shared/ui`로 추출한다.
5. 실제 API와 목업 경계를 분리한다.
6. 타입 검사와 포맷 검사를 실행하고 변경 파일을 보고한다.

## 범위 보호

- 랜딩페이지 문구·색상·가격을 임의로 확정하지 않는다.
- API가 확정되지 않았으면 임의의 응답 구조를 만들지 않는다.
- 인증, 문의 폼, 계약서, AI 기능을 기본 골격 작업에 끼워 넣지 않는다.
- 운영 API, 고객 데이터, 비밀값을 사용하지 않는다.
- 에이전트는 커밋·푸시하지 않는다.

## 완료 보고

- 변경한 파일
- 구현한 화면·라우트·상태 경계
- 실행한 검증 명령과 결과
- 목업·미구현·미결정 항목
