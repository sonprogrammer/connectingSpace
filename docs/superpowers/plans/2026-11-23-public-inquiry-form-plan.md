# 공개 견적 요청 폼 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공개 랜딩페이지의 견적 요청 폼을 `POST /public/inquiries` API와 연결하고 접수 상태를 사용자에게 보여준다.

**Architecture:** API 요청은 `shared/api`에서 분리하고, 입력 검증·상태·폼 UI는 `features/inquiry-form`에 둔다. 랜딩 문의 섹션은 기존 CTA 위치에서 폼 위젯을 조합하며, 정적 export 제약 때문에 Next 서버 프록시는 사용하지 않는다.

**Tech Stack:** Next.js App Router, TypeScript, React, Zod, Vitest, Testing Library, native fetch.

**Spec:** `docs/superpowers/specs/2026-11-23-public-inquiry-form-design.md`

## Global Constraints

- API 경로는 `POST /public/inquiries`로 고정한다.
- 필수 입력은 업체명·담당자명·이메일·연락처·문의 유형·문의 내용이다.
- API 주소는 `NEXT_PUBLIC_API_BASE_URL` 환경 변수로 주입하고 기본값은 같은 origin이다.
- 문의 API, 관리자 기능, 자동 알림, 로그인, 파일 업로드는 추가하지 않는다.
- 제출 중에는 중복 제출을 막고, 성공 후에는 완료 패널을 표시한다.
- 사용자에게 서버 내부 오류 상세를 노출하지 않는다.

## Review Focus

- 공백만 입력한 필수값을 브라우저 검증에서 막는가 — Task 2 검증 테스트.
- API 응답이 JSON이 아니거나 네트워크가 끊겨도 일반 오류 문구를 보여주는가 — Task 1 클라이언트 테스트.
- 제출 중 클릭을 반복해도 요청이 한 번만 나가는가 — Task 3 폼 테스트.
- 성공 후 입력 폼이 다시 제출되지 않고 완료 상태가 유지되는가 — Task 3 폼 테스트.
- 모바일에서 긴 오류 문구와 필드가 넘치지 않는가 — Task 4 브라우저/스타일 검증.

### Task 1: 문의 API 클라이언트

**Files:**

- Create: `apps/web/src/shared/api/inquiries.ts`
- Create: `apps/web/src/shared/api/inquiries.test.ts`

**Interfaces:**

- Produces: `submitInquiry(input: InquiryCreateInput): Promise<InquirySubmitResult>`와 `InquiryApiError`.

- [ ] **Step 1: Write the failing test**

  성공 응답에서 `{ id, status, receivedAt }`를 반환하고, `400`, `409`, `500`, 네트워크 오류를 각각 한국어 사용자 메시지의 `InquiryApiError`로 변환하는 테스트를 작성한다. `fetch` 호출의 URL·메서드·Content-Type·JSON body도 확인한다.

- [ ] **Step 2: Run test to verify it fails**

  Run: `pnpm test src/shared/api/inquiries.test.ts`
  Expected: 모듈 또는 `submitInquiry`가 없어 실패.

- [ ] **Step 3: Implement the API client**

  shared 계약 타입을 재사용해 요청 body를 전송한다. `NEXT_PUBLIC_API_BASE_URL`은 끝 슬래시를 제거하고 `/public/inquiries`를 붙이며, 응답 상태별 문구는 API의 `code`를 기준으로 안전하게 매핑한다.

- [ ] **Step 4: Run test to verify it passes**

  Run: `pnpm test src/shared/api/inquiries.test.ts`
  Expected: PASS.

### Task 2: 입력 모델과 클라이언트 검증

**Files:**

- Create: `apps/web/src/features/inquiry-form/model/form.ts`
- Create: `apps/web/src/features/inquiry-form/model/form.test.ts`

**Interfaces:**

- Consumes: `@connecting-space/shared`의 `inquiryCreateInputSchema`, `InquiryCreateInput`, `InquiryType`.
- Produces: `inquiryFormSchema`, `inquiryFormDefaults`, `inquiryTypeOptions`, `preferredContactOptions`, `toInquiryPayload`.

- [ ] **Step 1: Write the failing test**

  필수값 누락·공백·잘못된 이메일을 거부하고, 유효한 폼 데이터를 API payload로 변환하는 테스트를 작성한다. 문의 유형과 연락 방법 선택지에 API enum 값이 포함되는지도 확인한다.

- [ ] **Step 2: Run test to verify it fails**

  Run: `pnpm test src/features/inquiry-form/model/form.test.ts`
  Expected: 모델 모듈이 없어 실패.

- [ ] **Step 3: Implement the form model**

  API Zod 스키마를 기반으로 폼 스키마를 구성하고, 선택 입력은 빈 문자열을 `undefined`로 정리한다. 필드별 한국어 오류 문구를 폼에서 사용할 수 있는 형태로 제공한다.

- [ ] **Step 4: Run test to verify it passes**

  Run: `pnpm test src/features/inquiry-form/model/form.test.ts`
  Expected: PASS.

### Task 3: 견적 요청 폼 UI와 제출 상태

**Files:**

- Create: `apps/web/src/features/inquiry-form/InquiryForm.tsx`
- Create: `apps/web/src/features/inquiry-form/inquiry-form.test.tsx`

**Interfaces:**

- Consumes: Task 1의 `submitInquiry`, Task 2의 form model.
- Produces: 접근 가능한 입력 폼과 `idle/submitting/success/error` 상태 UI.

- [ ] **Step 1: Write the failing test**

  폼 필드와 required 속성, 오류 상태, API 성공 후 완료 문구, API 실패 문구, 제출 중 버튼 비활성화, 중복 클릭 방지를 테스트한다.

- [ ] **Step 2: Run test to verify it fails**

  Run: `pnpm test src/features/inquiry-form/inquiry-form.test.tsx`
  Expected: `InquiryForm`이 없어 실패.

- [ ] **Step 3: Implement the form component**

  Client Component로 지역 state를 관리한다. `onSubmit`에서 검증 후 한 번만 `submitInquiry`를 호출하고, 성공 시 입력 폼을 완료 패널로 교체한다. 서버 오류와 네트워크 오류는 폼 상단 alert로 보여주며 입력값은 유지한다.

- [ ] **Step 4: Run test to verify it passes**

  Run: `pnpm test src/features/inquiry-form/inquiry-form.test.tsx`
  Expected: PASS.

### Task 4: 랜딩 섹션 통합·스타일·최종 검증

**Files:**

- Modify: `apps/web/src/widgets/landing/InquiryCtaSection.tsx`
- Modify: `apps/web/src/widgets/landing/landing-widgets.test.tsx`
- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/page.test.tsx`

**Interfaces:**

- Consumes: Task 3의 `InquiryForm`.
- Produces: 랜딩페이지 문의 섹션의 실제 폼 진입점과 모바일 대응 스타일.

- [ ] **Step 1: Write the failing test**

  랜딩 위젯 테스트에서 문의 섹션 안에 업체명·담당자명·이메일·연락처·문의 유형·문의 내용 필드가 존재하는지 확인한다.

- [ ] **Step 2: Run test to verify it fails**

  Run: `pnpm test src/widgets/landing/landing-widgets.test.tsx src/app/page.test.tsx`
  Expected: 기존 CTA만 있어 폼 필드를 찾지 못해 실패.

- [ ] **Step 3: Integrate and style the form**

  `InquiryCtaSection`에서 기존 CTA를 유지하면서 `InquiryForm`을 배치하고, CSS에서 입력·select·textarea·오류·완료 패널·모바일 1열 규칙을 추가한다. API 주소는 소스에 하드코딩하지 않는다.

- [ ] **Step 4: Run full verification**

  Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm build && pnpm exec prettier --check .`
  Expected: 모든 테스트·타입 검사·린트·빌드·포맷 검사 PASS.

- [ ] **Step 5: Browser verification**

  개발 서버에서 모바일 화면의 키보드 입력·필수 오류·제출 중 상태·성공/실패 화면을 확인한다. 실제 API 서버가 연결되지 않은 환경에서는 네트워크 오류 문구가 정상 표시되는지 확인한다.
