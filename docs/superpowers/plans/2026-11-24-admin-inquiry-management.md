# 관리자 문의 관리 API 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 인증된 관리자만 문의 목록·상세를 조회하고 상태와 마지막 내부 메모를 변경할 수 있는 API를 구현한다.

**Architecture:** 기존 `InquiryRepository`와 `createApp`의 관리자 인증 미들웨어를 재사용한다. 목록은 최신 접수순으로 조회하고 기본 20개 페이지를 반환하며, 내부 메모는 현재 문의 레코드의 마지막 값으로 저장한다. 기존 초기 스키마는 유지하고 `0002` 증분 마이그레이션으로 메모 컬럼을 추가한다.

**Tech Stack:** Cloudflare Workers, Hono, TypeScript, Zod, Vitest, D1.

**Spec:** 이슈 #30, `docs/api/openapi.yaml`, PR #26 공개 문의 API, PR #27 관리자 인증 경계.

## Global Constraints

- 관리자 API는 `/admin/*` 경로에서 `ADMIN_INQUIRIES_PERMISSION` 인증 경계를 통과해야 한다.
- 실제 운영 D1·관리자 계정·비밀값·배포는 사용하지 않는다.
- 문의 목록 기본 정렬은 `createdAt` 내림차순이다.
- 기본 페이지 크기는 20개이며 최대 100개다.
- 내부 메모는 문의별 마지막 값 하나를 저장·수정한다.
- 상태값은 공유 `InquiryStatus` enum을 사용하며 상태 전환 제한은 두지 않는다.

## Review Focus

- 인증 없는 목록·상세·수정 요청은 401이어야 한다 — 라우트 통합 테스트에서 확인한다.
- 인증됐지만 권한이 없는 요청은 403이어야 한다 — 관리자 인증 경계 테스트와 함께 확인한다.
- 존재하지 않는 UUID는 404이어야 한다 — 상세·수정 테스트에서 확인한다.
- 잘못된 상태값과 빈 수정 본문은 400이어야 한다 — 수정 입력 검증 테스트에서 확인한다.
- 페이지 범위와 검색 조건은 저장소 결과를 벗어나지 않아야 한다 — 목록 페이지·필터 테스트에서 확인한다.

### Task 1: 저장소 계약과 인메모리 구현

**Files:**

- Modify: `apps/api/src/entities/inquiry/repository.ts`
- Modify: `apps/api/src/entities/inquiry/in-memory-inquiry-repository.ts`
- Test: `apps/api/src/entities/inquiry/inquiry-repository.test.ts`

- [ ] 목록 조회 옵션과 상태·메모리 수정 메서드의 실패 테스트를 먼저 작성한다.
- [ ] 테스트가 새 메서드 부재 또는 기대 결과 불일치로 실패하는지 확인한다.
- [ ] 인메모리 저장소에 최신순 목록, 상태·메모리 수정, 페이지·필터를 구현한다.
- [ ] 저장소 테스트를 통과시킨다.

### Task 2: D1 저장소 구현

**Files:**

- Modify: `apps/api/src/entities/inquiry/d1-inquiry-repository.ts`
- Create: `apps/api/db/migrations/0002_add_admin_memo.sql`

- [ ] D1의 내부 메모리 컬럼과 목록 필터·페이지 조회를 반영한다.
- [ ] 상태·메모리 수정은 `updated_at`도 함께 갱신한다.
- [ ] 운영 DB 연결 없이 타입 검사와 저장소 계약으로 확인한다.

### Task 3: 관리자 문의 라우트와 API 계약

**Files:**

- Modify: `apps/api/src/routes/inquiries.ts`
- Modify: `apps/api/src/routes/inquiries.test.ts`
- Modify: `docs/api/openapi.yaml`

- [ ] 목록·상세·수정의 인증, 검증, 성공, 404, 내부 오류 테스트를 먼저 작성한다.
- [ ] `GET /admin/inquiries`, `GET /admin/inquiries/:inquiryId`, `PATCH /admin/inquiries/:inquiryId`를 등록한다.
- [ ] OpenAPI 응답·쿼리·수정 본문 계약을 구현과 일치시킨다.
- [ ] 관리자 API 전체 테스트와 타입 검사·린트를 실행한다.

### Task 4: 최종 검증

- [ ] `pnpm --filter @connecting-space/shared typecheck`
- [ ] `pnpm --filter @connecting-space/api typecheck`
- [ ] `pnpm --filter @connecting-space/api lint`
- [ ] `pnpm --filter @connecting-space/api test`
- [ ] `git diff --check`
- [ ] 미커밋 변경 파일과 운영 미검증 범위를 보고한다.
