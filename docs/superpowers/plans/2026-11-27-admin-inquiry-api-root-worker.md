# 관리자 문의 API 루트 Worker 이전 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 인증된 관리자가 루트 Worker에서 문의 목록·상세를 조회하고 상태와 마지막 내부 메모를 수정할 수 있게 한다.

**Architecture:** Next.js Route Handler는 인증 공급자와 저장소를 주입받는 서버 핸들러를 호출한다. 문의 저장소 계약은 관리자 조회·수정 기능을 포함하도록 확장하고, D1에는 `0002` 증분 마이그레이션으로 메모 컬럼을 추가한다.

**Tech Stack:** Next.js App Router, vinext, Cloudflare Workers D1, TypeScript, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-27-admin-inquiry-api-root-worker-design.md`

## Global Constraints

- PR #37은 요구사항 참고만 하고 병합하거나 구 `apps/api` 코드를 수정하지 않는다.
- 관리자 목록은 최신 접수순이며 페이지 크기는 기본 20, 최대 100이다.
- 빈 관리자 메모는 삭제하고 문의별 마지막 메모 하나만 저장한다.
- 현재 문의 상태값 사이의 전환을 모두 허용한다.
- 운영 D1·비밀값·배포를 사용하지 않는다.

## Review Focus

- 인증보다 입력 검증이 먼저 실행되어 비인증 사용자에게 데이터 경계가 노출되지 않는지 확인한다.
- 검색어의 `%`, `_`, `\`가 D1 `LIKE` 와일드카드로 오작동하지 않는지 확인한다.
- 같은 생성 시각의 문의도 안정적인 최신순·페이지 순서를 유지하는지 확인한다.
- 빈 문자열 메모가 빈 값 저장이 아니라 삭제로 처리되는지 확인한다.
- 잘못된 UUID는 400, 없는 유효 UUID는 404로 구분되는지 확인한다.

---

### Task 1: 관리자 문의 저장소 계약

**Files:**

- Modify: `src/server/inquiries/repository.ts`
- Modify: `src/server/inquiries/in-memory-inquiry-repository.ts`
- Test: `src/server/inquiries/in-memory-inquiry-repository.test.ts`

**Interfaces:**

- Produces: `InquiryListOptions`, `InquiryListResult`, `InquiryUpdateInput`, `listAdmin`, `findById`, `update`

- [ ] 최신순·필터·페이지네이션과 상태·메모 수정 실패 테스트를 작성한다.
- [ ] 대상 테스트가 새 계약 부재로 실패하는지 확인한다.
- [ ] 저장소 타입과 인메모리 구현을 최소 구현한다.
- [ ] 대상 테스트를 통과시킨다.

### Task 2: 관리자 문의 서버 핸들러와 Route Handler

**Files:**

- Create: `src/server/inquiries/admin-inquiry-handler.ts`
- Create: `src/server/inquiries/admin-inquiry-handler.test.ts`
- Create: `src/server/auth/admin-auth-provider.ts`
- Create: `src/app/admin/inquiries/route.ts`
- Create: `src/app/admin/inquiries/[inquiryId]/route.ts`
- Modify: `src/server/inquiries/schema.ts`

**Interfaces:**

- Consumes: Task 1의 관리자 저장소 계약과 기존 `createAdminAuthGuard`
- Produces: 목록·상세·수정 요청 핸들러

- [ ] 401·403, 목록·필터·페이지, 상세, 수정, 검증·404·500 실패 테스트를 작성한다.
- [ ] 대상 테스트가 핸들러 부재로 실패하는지 확인한다.
- [ ] Zod 계약과 핸들러, 실제 Route Handler 연결을 구현한다.
- [ ] 대상 테스트를 통과시킨다.

### Task 3: D1 저장소와 마이그레이션

**Files:**

- Modify: `src/server/inquiries/d1-inquiry-repository.ts`
- Create: `db/migrations/0002_add_admin_memo.sql`

**Interfaces:**

- Consumes: Task 1의 관리자 저장소 계약
- Produces: D1 목록·상세·수정 구현과 메모 컬럼

- [ ] D1 쿼리 계약을 구현하고 검색 와일드카드를 이스케이프한다.
- [ ] 로컬 D1에서 `0001`, `0002` 마이그레이션을 순서대로 적용한다.
- [ ] 합성 문의를 사용해 목록·상세·수정 SQL 흐름을 확인한다.

### Task 4: OpenAPI와 최종 검증

**Files:**

- Modify: `docs/api/openapi.yaml`
- Modify: `README.md`

**Interfaces:**

- Consumes: Task 2의 HTTP 계약과 Task 3의 로컬 실행 방식

- [ ] 목록 400·500, 상세·수정 500, 빈 메모 삭제 의미를 OpenAPI에 반영한다.
- [ ] 관리자 API와 로컬 검증 방법, 인증 한계를 문서화한다.
- [ ] `pnpm verify:migration`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm format:check`, `pnpm build`를 실행한다.
- [ ] 운영 DB·배포 미실행과 남은 인증 제한을 PR에 기록한다.
