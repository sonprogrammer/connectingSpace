# Public Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이슈 #16 기준에 맞는 반응형 공개 랜딩페이지와 기본 테마 전환·SEO 구조를 구현한다.

**Architecture:** `app/page.tsx`는 랜딩 위젯을 조합하는 Server Component로 유지한다. 정적 섹션은 `widgets/landing` 아래에 책임별 컴포넌트로 나누고, 테마 전환과 테마 Provider만 `features/theme-toggle` 및 `app/providers`의 Client 경계에서 처리한다.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS v4, React Query, Zustand, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-23-public-landing-design.md`, GitHub Issue #16, 선행 기준 Issue #14

## Global Constraints

- 실제 문의 API 연결과 문의 저장은 구현하지 않는다.
- 실제 포트폴리오 자료·공개 링크, 최종 로고·색상 시스템, 확정 가격 정책은 결정하지 않는다.
- 포트폴리오는 합성 데이터임을 드러낸다.
- 정적 랜딩 콘텐츠는 Server Component로 유지하고 테마 전환만 Client Component로 제한한다.
- 모바일·데스크톱에서 콘텐츠가 잘리지 않고 키보드 포커스를 유지한다.
- 기본 title·description·Open Graph metadata 구조를 제공한다.
- 수정 범위는 기본적으로 `apps/web/**`로 제한한다.

## Review Focus

- 앵커 대상이 없는 네비게이션·CTA는 조용히 실패하지 않고 실제 섹션으로 이동해야 한다 — Task 3의 링크 대상 테스트.
- 다크 기본값과 라이트 전환이 새로고침·브라우저 환경에서 깨지지 않아야 한다 — Task 2의 테마 전환 테스트.
- 모바일 폭에서 가로 스크롤과 잘림이 없어야 한다 — Task 4의 반응형 구조 테스트와 수동 개발 서버 확인.
- 합성 포트폴리오·임시 가격 문구가 실제 확정 사례·정책처럼 보이지 않아야 한다 — Task 3의 콘텐츠 렌더링 테스트.
- 장식 요소가 키보드 포커스와 스크린 리더 흐름을 방해하지 않아야 한다 — Task 4의 landmark·heading·focusable 요소 테스트.

### Task 1: 랜딩 콘텐츠 모델과 테스트 기반

**Files:**

- Create: `apps/web/src/widgets/landing/model/content.ts`
- Create: `apps/web/src/widgets/landing/model/content.test.ts`
- Create: `apps/web/src/app/page.test.tsx`
- Modify: `apps/web/src/app/page.tsx`

**Interfaces:**

- `landingSections` exports typed static content for the landing widgets.
- `HomePage()` renders a page with `#top`, `#philosophy`, `#process`, `#portfolio`, `#pricing`, `#faq`, and `#inquiry` targets.

- [ ] **Step 1: Write failing content and route tests** asserting the required section ids, navigation labels, CTA href `#inquiry`, and synthetic-content labels.
- [ ] **Step 2: Run `pnpm --filter @connecting-space/web exec vitest run src/app/page.test.tsx src/widgets/landing/model/content.test.ts`** and verify the tests fail because the landing content and sections do not exist.
- [ ] **Step 3: Define typed static content in `content.ts`** without API calls, real portfolio links, or final price claims.
- [ ] **Step 4: Replace the foundation placeholder in `app/page.tsx`** with the landing widget composition placeholder and required semantic section targets.
- [ ] **Step 5: Run the focused tests** and verify they pass.

### Task 2: Theme toggle and visual tokens

**Files:**

- Create: `apps/web/src/features/theme-toggle/ThemeToggle.tsx`
- Create: `apps/web/src/features/theme-toggle/theme-store.ts`
- Modify: `apps/web/src/app/providers.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/app/globals.css`
- Test: `apps/web/src/features/theme-toggle/theme-toggle.test.tsx`

**Interfaces:**

- `useThemeStore`: Zustand store with `theme: 'dark' | 'light'` and `toggleTheme(): void`.
- `ThemeToggle`: accessible button with an explicit label and `aria-pressed` state.

- [ ] **Step 1: Write a failing theme test** asserting dark is the default, the toggle exposes an accessible name, and clicking changes `aria-pressed` and the root theme marker.
- [ ] **Step 2: Run the focused theme test** and verify it fails because the store and toggle do not exist.
- [ ] **Step 3: Implement the minimal Zustand theme store and client toggle**; keep browser-only storage access guarded for SSR.
- [ ] **Step 4: Add a client theme boundary and neutral dark/light CSS tokens** without declaring a final brand palette.
- [ ] **Step 5: Run the theme test and focused route tests** and verify they pass.

### Task 3: Landing widgets and page composition

**Files:**

- Create: `apps/web/src/widgets/landing/LandingHeader.tsx`
- Create: `apps/web/src/widgets/landing/HeroSection.tsx`
- Create: `apps/web/src/widgets/landing/PhilosophySection.tsx`
- Create: `apps/web/src/widgets/landing/ProcessSection.tsx`
- Create: `apps/web/src/widgets/landing/PortfolioSection.tsx`
- Create: `apps/web/src/widgets/landing/PricingSection.tsx`
- Create: `apps/web/src/widgets/landing/FaqSection.tsx`
- Create: `apps/web/src/widgets/landing/InquiryCtaSection.tsx`
- Create: `apps/web/src/widgets/landing/LandingFooter.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Test: `apps/web/src/widgets/landing/landing-widgets.test.tsx`

**Interfaces:**

- Each widget accepts no server data and renders one semantic page section.
- Header links use the section ids from Task 1; every widget uses the static content model.

- [ ] **Step 1: Write failing widget tests** for section headings, nav links, FAQ disclosure controls, synthetic portfolio notice, and inquiry CTA.
- [ ] **Step 2: Run the widget tests** and verify they fail because the widgets do not exist.
- [ ] **Step 3: Implement the widgets with semantic HTML, responsive Tailwind layout, visible focus styles, and no real API integration.**
- [ ] **Step 4: Compose the widgets in `app/page.tsx`** and add the `ThemeToggle` to the header.
- [ ] **Step 5: Run all web tests** and verify the landing behavior passes.

### Task 4: SEO, accessibility, responsive polish, and verification

**Files:**

- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/app/globals.css`
- Modify: landing widget files only for verified accessibility or responsive corrections
- Test: `apps/web/src/app/metadata.test.ts` if metadata cannot be asserted through the route test

**Interfaces:**

- Root metadata includes title, description, and Open Graph title/description/type.
- The page has one main landmark, ordered headings, keyboard-focusable controls, and reduced-motion-safe styles.

- [ ] **Step 1: Add metadata and Open Graph structure** without final brand claims or external image URLs.
- [ ] **Step 2: Add responsive and reduced-motion styles** and verify no fixed-width section can force horizontal overflow.
- [ ] **Step 3: Run `pnpm --filter @connecting-space/web test`, `typecheck`, `lint`, `build`, and scoped Prettier checks**; all must pass.
- [ ] **Step 4: Start the development server and manually verify desktop/mobile section flow, anchor navigation, default dark mode, light mode toggle, and keyboard focus.**
- [ ] **Step 5: Record changed files, verification output, and deferred API/portfolio decisions.**

## Execution Notes

- Do not commit, push, or create a PR without the user's explicit confirmation.
- If the design requires changes outside `apps/web/**`, stop and report before editing them.
- Keep the landing page content intentionally provisional where Issue #14 marks pricing, portfolio, or brand decisions as unresolved.
