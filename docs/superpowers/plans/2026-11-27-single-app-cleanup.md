# 루트 단일 앱 정리 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 구 API·공유 워크스페이스를 제거하고 문의 웹·API를 루트 Worker 단일 앱으로 유지한다.

**Architecture:** 프론트와 서버가 공유하는 문의 입력 계약은 `src/shared/model`에 두고 서버 전용 계약은 `src/server`에 유지한다. 루트 명령은 단일 앱만 검사하도록 단순화하고 구 워크스페이스 파일을 삭제한다.

**Tech Stack:** TypeScript, Zod, Next.js App Router, vinext, Vitest, pnpm

**Spec:** `docs/superpowers/specs/2026-11-27-single-app-cleanup-design.md`

## Global Constraints

- Cloudflare 리소스와 배포를 변경하지 않는다.
- D1 데이터베이스와 `db/**`를 변경하거나 마이그레이션을 실행하지 않는다.
- 프론트 화면 동작을 변경하지 않는다.
- 테스트 데이터는 합성 데이터만 사용한다.

## Review Focus

- 문의 유형과 필드 제한이 이전 공유 계약과 동일한지 확인한다.
- 클라이언트 코드가 서버 전용 모듈을 가져오지 않는지 확인한다.
- 삭제된 워크스페이스를 참조하는 활성 설정과 명령이 남지 않는지 확인한다.
- 잠금 파일이 루트 단일 importer만 포함하는지 확인한다.
- Cloudflare 구성과 D1 파일이 변경되지 않았는지 확인한다.

---

### Task 1: 문의 공유 계약을 루트로 이관

**Files:**

- Create: `src/shared/model/inquiry.ts`
- Create: `src/shared/model/inquiry.test.ts`
- Modify: `src/features/inquiry-form/model/form.ts`
- Modify: `src/shared/api/inquiries.ts`
- Modify: `src/server/inquiries/schema.ts`

**Interfaces:**

- Produces: 문의 타입·상태·입력 Zod 스키마와 TypeScript 타입
- Consumes: 기존 `packages/shared/src/inquiry.ts` 계약

- [ ] 루트 문의 계약의 유효·무효 입력을 검증하는 실패 테스트를 작성한다.
- [ ] 테스트가 모듈 부재로 실패하는지 확인한다.
- [ ] 최소 계약 모듈을 구현하고 모든 소비자를 루트 경로로 교체한다.
- [ ] 관련 테스트와 타입 검사를 통과시킨다.
- [ ] 변경을 커밋한다.

### Task 2: 구 워크스페이스와 전용 설정 제거

**Files:**

- Delete: `apps/api/**`
- Delete: `packages/shared/**`
- Delete: `pnpm-workspace.yaml`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `tsconfig.json`

**Interfaces:**

- Consumes: Task 1의 루트 문의 계약
- Produces: 루트 단일 앱 설치·검증 명령

- [ ] 루트 스크립트와 의존성에서 workspace 필터와 공유 패키지를 제거한다.
- [ ] 구 워크스페이스 파일을 삭제하고 잠금 파일을 갱신한다.
- [ ] 삭제된 경로와 패키지 참조가 활성 코드·설정에 없는지 검색한다.
- [ ] 타입·린트·테스트를 통과시킨다.
- [ ] 변경을 커밋한다.

### Task 3: 문서와 에이전트 지침 정리

**Files:**

- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `.agents/skills/backend/SKILL.md`
- Modify: `.agents/skills/frontend/SKILL.md`

**Interfaces:**

- Consumes: Task 2의 루트 단일 앱 구조와 명령
- Produces: 현재 구조와 일치하는 개발·역할 안내

- [ ] 구 Hono·워크스페이스 실행 안내를 루트 Worker 기준으로 교체한다.
- [ ] 포맷·타입·린트·테스트·빌드를 실행한다.
- [ ] Cloudflare 구성과 `db/**`가 변경되지 않았는지 확인한다.
- [ ] 변경을 커밋하고 전체 브랜치 리뷰를 요청한다.
