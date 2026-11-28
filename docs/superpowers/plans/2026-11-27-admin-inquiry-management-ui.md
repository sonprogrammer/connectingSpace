# 관리자 문의 관리 화면 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 최신 루트 Worker 관리자 문의 API를 사용하는 `/admin` 목록·상세·상태·내부 메모 관리 화면을 구현한다.

**Architecture:** API 계약과 오류 변환은 `shared/api`, 도메인 타입은 `entities/inquiry`, 사용자 행동과 React Query 상태는 `features/admin-inquiries`, 라우트 조합은 `app/admin/page.tsx`에 둔다. 기존 Route Handler와 서버 코드는 변경하지 않는다.

**Tech Stack:** Next.js App Router, React, TypeScript, React Query, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-11-27-admin-inquiry-management-ui-design.md`

## Global Constraints

- UI 라우트는 `/admin`, API 경로는 기존 `/admin/inquiries`를 유지한다.
- 로그인·세션 발급·토큰 입력 UI를 추가하지 않는다.
- Route Handler, 서버 인증, D1, Cloudflare 설정을 변경하지 않는다.
- 합성 데이터만 사용한다.

## Review Focus

- 401 또는 403 응답에서 문의 데이터가 노출되지 않는지 확인한다.
- 목록 필터가 바뀔 때 페이지가 1로 초기화되는지 확인한다.
- 목록이 비었거나 선택 문의가 사라져도 상세 패널이 안전한지 확인한다.
- 상태·메모 저장 실패 시 기존 입력이 유지되고 오류가 전달되는지 확인한다.
- 긴 문의·메모와 좁은 화면에서 내용이 잘리지 않는지 확인한다.

---

### Task 1: 관리자 문의 API 클라이언트

**Files:**

- Create: `src/entities/inquiry/model/admin-inquiry.ts`
- Create: `src/shared/api/admin-inquiries.ts`
- Test: `src/shared/api/admin-inquiries.test.ts`

**Interfaces:**

- Produces: `AdminInquirySummary`, `AdminInquiryDetail`, `AdminInquiryListResult`, `AdminInquiryListParams`, `AdminInquiryUpdateInput`, `AdminInquiryApiError`, `listAdminInquiries`, `getAdminInquiry`, `updateAdminInquiry`.

- [ ] API 경로·쿼리·PATCH body와 401·403·일반 오류 변환 실패 테스트를 작성한다.
- [ ] 테스트가 구현 부재로 실패하는지 확인한다.
- [ ] 기존 루트 Worker 응답 계약에 맞는 타입과 API 클라이언트를 구현한다.
- [ ] API 클라이언트 테스트를 통과시킨다.

### Task 2: 목록·상세·상태·메모 화면

**Files:**

- Create: `src/features/admin-inquiries/AdminInquiryManager.tsx`
- Test: `src/features/admin-inquiries/admin-inquiry-manager.test.tsx`
- Create: `src/app/admin/page.tsx`
- Test: `src/app/admin/page.test.tsx`

**Interfaces:**

- Consumes: Task 1의 관리자 문의 타입과 API 함수.
- Produces: `/admin` 관리 화면.

- [ ] 목록·상세 선택·필터·저장·401·403·로딩·빈·오류 상태 테스트를 작성한다.
- [ ] 테스트가 컴포넌트 부재로 실패하는지 확인한다.
- [ ] React Query 기반 관리자 문의 관리 화면과 `/admin` 페이지를 구현한다.
- [ ] 화면 테스트를 통과시킨다.

### Task 3: 반응형 표현과 전체 검증

**Files:**

- Modify: `src/app/globals.css`

**Interfaces:**

- Consumes: Task 2의 시맨틱 클래스와 화면 구조.
- Produces: 데스크톱 2열·모바일 1열 관리자 화면.

- [ ] 관리자 화면 스타일을 추가한다.
- [ ] 변경 범위 테스트와 전체 테스트를 실행한다.
- [ ] 타입, 린트, 포맷, Worker 빌드를 검증한다.
- [ ] 브라우저에서 401 보호 상태와 반응형 기본 화면을 확인한다.
