# 견적 문의 확보 MVP 구현 계획

> **구현 담당자 안내:** 이 계획은 작업별로 진행합니다. 각 단계는 체크박스로 관리하며, 구현 시 `superpowers:subagent-driven-development` 또는 `superpowers:executing-plans` 절차를 사용합니다.

**목표:** Cloudflare 중심의 무료 운영 구조로 공개 랜딩페이지에서 견적 문의를 받고, 계약 승인 후 프로젝트와 고객용 진행상황을 관리할 수 있는 첫 MVP를 만든다.

**구조:** 하나의 pnpm workspace 모노레포 안에 Next.js 웹 앱과 Cloudflare Workers API를 분리한다. Next.js 서버 컴포넌트는 정적 SEO 콘텐츠에 사용하고, 동적 문의·계약·프로젝트 데이터는 Workers API와 D1을 통해 처리한다. 계약 승인 후에는 고객 전용 읽기 전용 프로젝트 링크를 발급한다.

**기술 스택:** TypeScript, Next.js, React Query, Zustand, Tailwind CSS, shadcn/ui, Zod, pnpm workspace, Cloudflare Workers, Cloudflare D1, Cloudflare Turnstile, Vitest, Playwright, Husky, lint-staged, GitHub Actions.

**기준 설계 문서:** `docs/superpowers/specs/2026-11-21-lead-inquiry-mvp-design.md`

## 전체 제약과 원칙

- 첫 MVP의 핵심 성공 조건은 공개 랜딩페이지에서 실제 견적 문의가 발생하는 것이다.
- FAQ는 랜딩페이지 하단의 정적 콘텐츠로 제공한다.
- 실제 아임웹 제작 사례와 가상 데모를 랜딩페이지 포트폴리오로 보여준다.
- 기본 랜딩페이지 가격은 10만 원부터로 안내하고, 맞춤 제작은 상담 후 견적으로 안내한다.
- 관리자는 손 대표님 1명으로 시작한다.
- 계약서는 기본 템플릿에서 직접 작성하거나 AI 초안으로 만들 수 있다.
- AI 초안은 관리자가 검토·수정하기 전에는 고객에게 보낼 수 없다.
- 고객이 계약서를 승인한 경우에만 프로젝트를 만든다.
- 고객은 로그인 없이 별도 보안 링크에서 프로젝트 상태와 진행 업데이트를 읽는다.
- 고객 진행 링크는 관리자가 재발급하거나 차단할 수 있다.
- 고객 알림은 자동으로 보내지 않고, 관리자가 버튼을 눌렀을 때만 이메일을 보낸다.
- 초기 발신 주소는 인증된 기존 이메일을 사용하고, 나중에 도메인 이메일로 교체한다.
- AI 계약서 초안은 Groq을 우선 사용하되, 나중에 다른 AI 제공업체로 교체할 수 있게 만든다.
- AI에는 계약 작성에 필요한 최소 정보만 전달한다. 전화번호·이메일·내부 상담 메모는 전달하지 않는다.
- 실제 고객 정보, 운영 DB, 비밀값, 실제 이메일 발송, 배포는 별도 승인 전까지 다루지 않는다.
- 기존 `imweb` 프로젝트·저장소·DB·환경변수·인증정보를 사용하거나 복사하지 않는다.

## 검토할 위험 상황

- 필수값이 비어 있거나 연락처 형식이 틀린 경우: 제출을 막고 수정 방법을 보여준다.
- 너무 길거나 악성인 입력이 들어오는 경우: 저장 전 길이와 형식을 제한하고 안전하게 표시한다.
- 같은 문의를 빠르게 두 번 제출하는 경우: 중복 저장을 줄인다.
- 스팸 제출이 들어오는 경우: 자동화 제출을 줄이면서 정상 제출은 허용한다.
- 로그인하지 않은 사용자가 관리자 API를 호출하는 경우: 문의 데이터가 노출되지 않게 막는다.
- 고객 링크가 차단된 경우: 고객에게 진행상황을 보여주지 않는다.
- AI 생성에 실패한 경우: 직접 작성으로 전환할 수 있게 한다.
- 이메일을 두 번 클릭한 경우: 중복 발송을 방지하거나 상태를 명확히 보여준다.

---

### 작업 1: 프로젝트 기반과 실행 환경 만들기

**파일:**

- 생성: `package.json`
- 생성: `pnpm-workspace.yaml`
- 생성: `apps/web/`
- 생성: `apps/api/`
- 생성: `packages/shared/`
- 생성: `tsconfig.json`
- 생성: `wrangler.toml` 또는 현재 Cloudflare 설정 파일
- 테스트: `tests/smoke/project-start.test.ts`

**이 작업의 결과:** 로컬 개발·테스트·빌드 명령과 웹·API·공통 패키지 구조가 동작한다.

- [ ] 실패하는 기본 실행 테스트를 작성한다.
- [ ] 테스트를 실행해 프로젝트 설정이 없어서 실패하는지 확인한다.
- [ ] Next.js, Workers, TypeScript, pnpm workspace, 테스트 설정을 추가한다.
- [ ] 타입 검사와 프로덕션 빌드를 실행한다.
- [ ] `README.md`에 로컬 실행 방법과 Cloudflare 리소스 역할을 기록한다.
- [ ] 프로젝트 기반을 커밋한다.

### 작업 2: FSD 구조와 공통 설정

**파일:**

- 생성: `apps/web/src/app/`
- 생성: `apps/web/src/pages/`
- 생성: `apps/web/src/widgets/`
- 생성: `apps/web/src/features/`
- 생성: `apps/web/src/entities/`
- 생성: `apps/web/src/shared/`
- 생성: `packages/shared/src/validation/`
- 생성: `packages/shared/src/types/`
- 테스트: `tests/shared/shared-schema.test.ts`

**이 작업의 결과:** FSD 경계, 공통 타입, Zod 검증 스키마를 웹과 API가 함께 사용할 수 있다.

- [ ] 업체·문의·계약·프로젝트 기본 타입의 실패 테스트를 작성한다.
- [ ] 테스트가 아직 타입과 스키마가 없어 실패하는지 확인한다.
- [ ] 공통 타입과 Zod 스키마를 작성한다.
- [ ] 웹과 API에서 공통 패키지를 불러오도록 설정한다.
- [ ] 한 파일에 하나의 주요 컴포넌트를 두는 규칙과 가져오기 경계를 문서화한다.
- [ ] 공통 구조를 커밋한다.

### 작업 3: 공개 랜딩페이지와 FAQ

**파일:**

- 생성: `apps/web/src/app/(public)/page.tsx`
- 생성: `apps/web/src/widgets/landing/`
- 생성: `apps/web/src/features/theme-toggle/`
- 생성: `apps/web/src/shared/ui/`
- 테스트: `tests/landing/landing-page.test.tsx`

**이 작업의 결과:** 커넥팅스페이스의 공개 랜딩페이지, FAQ, 포트폴리오, 견적 요청 CTA가 보인다.

- [ ] 서비스 소개, 제작 철학, 포트폴리오, 가격 안내, FAQ, CTA의 렌더링 테스트를 작성한다.
- [ ] 테스트가 실패하는지 확인한다.
- [ ] “브랜드와 고객을 연결하는 웹사이트”를 중심으로 랜딩페이지를 구성한다.
- [ ] 실제 아임웹 제작 사례와 가상 데모를 카드형 그리드로 보여준다.
- [ ] 실제 사이트 보기 버튼은 새 탭으로 연다.
- [ ] 기본 다크모드와 라이트모드 전환을 추가한다.
- [ ] 첫 화면은 강한 스크롤 연출을 사용하고, 이후 섹션은 성능을 고려한 등장 효과를 사용한다.
- [ ] 모바일에서는 전등 줄 애니메이션을 단순화한다.
- [ ] 상단에 고정된 `견적 요청` 버튼과 네비게이션을 추가한다.
- [ ] 데스크톱·모바일 접근성과 모션 감소 설정을 확인한다.
- [ ] 랜딩페이지를 커밋한다.

### 작업 4: 문의 폼과 공통 입력 검증

**파일:**

- 생성: `apps/web/src/features/inquiry-submit/InquiryForm.tsx`
- 생성: `packages/shared/src/validation/inquiry.ts`
- 생성: `packages/shared/src/types/inquiry.ts`
- 생성: `apps/api/src/routes/inquiries.ts`
- 테스트: `tests/inquiry/validation.test.ts`
- 테스트: `tests/inquiry/inquiry-form.test.tsx`

**문의 필수 입력:** 업체명, 고객 담당자명, 고객 이메일, 연락처, 문의 유형, 문의 내용.

**문의 선택 입력:** 제작 희망 시기, 예상 예산, 현재 웹사이트 URL, 참고 사이트.

- [ ] 정상 입력, 필수값 누락, 이메일·연락처 오류, 잘못된 URL, 최대 길이 초과 테스트를 작성한다.
- [ ] 테스트가 실패하는지 확인한다.
- [ ] Zod 기반 공통 검증과 필드별 오류 메시지를 구현한다.
- [ ] 문의 유형 기본값을 추가한다: 견적 문의, 홈페이지 제작 상담, 기존 사이트 리뉴얼, 유지보수·수정 문의, 아임웹 제작 문의, 자체 코드 제작 문의, 기타.
- [ ] API에서도 같은 검증을 다시 수행한다.
- [ ] 접수 완료 화면과 실패 시 재시도 흐름을 구현한다.
- [ ] 집중 테스트를 실행하고 커밋한다.

### 작업 5: D1 업체·문의 저장

**파일:**

- 생성: `apps/api/db/migrations/0001_create_businesses.sql`
- 생성: `apps/api/db/migrations/0002_create_inquiries.sql`
- 생성: `apps/api/src/entities/business/`
- 생성: `apps/api/src/entities/inquiry/`
- 테스트: `tests/api/inquiries.repository.test.ts`

**이 작업의 결과:** 문의가 저장되고, 업체·문의·고객 담당자가 연결된다.

- [ ] 신규 업체 생성, 기존 업체 연결, 문의 생성·조회·상세·상태 변경·메모 저장 테스트를 작성한다.
- [ ] 테스트가 실패하는지 확인한다.
- [ ] 업체와 문의 테이블, 상태값, 날짜 필드, 필요한 인덱스를 만든다.
- [ ] 업체명 확인 후 새 업체를 만들거나 기존 업체에 연결한다.
- [ ] 매개변수 바인딩 쿼리로 D1 저장소를 구현한다.
- [ ] 문의 API를 저장소와 연결한다.
- [ ] 로컬 테스트 DB에서 집중 테스트를 실행한다.
- [ ] 문의 저장 기능을 커밋한다.

### 작업 6: 계약서 버전과 고객 승인

**파일:**

- 생성: `apps/api/db/migrations/0003_create_contracts.sql`
- 생성: `apps/web/src/entities/contract/`
- 생성: `apps/web/src/features/contract-approval/`
- 생성: `apps/api/src/routes/contracts.ts`
- 테스트: `tests/contract/contract-versioning.test.ts`
- 테스트: `tests/contract/customer-approval.test.ts`

**이 작업의 결과:** 관리자가 기본 템플릿으로 계약서를 작성·전송하고, 고객이 보안 링크에서 승인할 수 있다.

- [ ] 작성 중 계약서 수정, 전송 버전 잠금, 새 버전 생성, 승인, 중복 승인, 잘못된 링크 테스트를 작성한다.
- [ ] 테스트가 실패하는지 확인한다.
- [ ] 계약서 본문, 버전, 전송 상태, 승인 기록 테이블을 만든다.
- [ ] 전송된 계약서는 수정하지 못하게 하고, 수정 시 새 버전을 만든다.
- [ ] 고객 이름 입력, 동의 체크, 승인 버튼을 구현한다.
- [ ] 승인 시 이름·동의·승인 일시·계약서 버전을 저장한다.
- [ ] 승인된 원문을 변경할 수 없게 잠근다.
- [ ] 승인된 계약서 PDF를 다운로드할 수 있도록 인쇄용 화면을 제공한다.
- [ ] 집중 테스트를 실행하고 커밋한다.

### 작업 7: 프로젝트 생성과 진행 업데이트

**파일:**

- 생성: `apps/api/db/migrations/0004_create_projects.sql`
- 생성: `apps/api/db/migrations/0005_create_project_updates.sql`
- 생성: `apps/web/src/entities/project/`
- 생성: `apps/web/src/features/project-conversion/`
- 생성: `apps/web/src/features/project-progress/`
- 생성: `apps/api/src/routes/projects.ts`
- 테스트: `tests/project/project-conversion.test.ts`
- 테스트: `tests/project/project-progress.test.ts`

**프로젝트 상태:** 준비 중, 제작 중, 고객 검수, 수정 중, 완료, 보류.

- [ ] 계약 승인 전에는 프로젝트가 생성되지 않는지 테스트한다.
- [ ] 승인된 계약서 버전으로 프로젝트가 생성되고 원래 문의가 남는지 테스트한다.
- [ ] 상태 변경과 누적 진행 업데이트 저장 테스트를 작성한다.
- [ ] 프로젝트·진행 업데이트 테이블과 인덱스를 만든다.
- [ ] 현재 상태와 누적 업데이트 이력을 구현한다.
- [ ] 관리자가 진행 메시지와 업데이트 날짜를 등록하게 한다.
- [ ] 집중 테스트를 실행하고 커밋한다.

### 작업 8: 고객용 진행상황 링크

**파일:**

- 생성: `apps/api/db/migrations/0006_create_project_access_links.sql`
- 생성: `apps/web/src/features/customer-project-view/`
- 생성: `apps/api/src/routes/customer-projects.ts`
- 테스트: `tests/customer-project/customer-link-access.test.ts`

- [ ] 링크 생성, 정상 접근, 차단 후 접근 거부, 링크 재발급, 내부 정보 숨김 테스트를 작성한다.
- [ ] 테스트가 실패하는지 확인한다.
- [ ] 접근 토큰은 원문이 아닌 해시로 저장하고 활성·차단 상태를 관리한다.
- [ ] 계약 승인 링크와 별도의 프로젝트 조회 링크를 만든다.
- [ ] 고객에게 프로젝트명, 현재 상태, 타임라인, 진행 메시지, 마지막 업데이트만 보여준다.
- [ ] 관리자에게 링크 차단·재발급 버튼을 제공한다.
- [ ] 집중 테스트를 실행하고 커밋한다.

### 작업 9: AI 계약서 초안 생성

**파일:**

- 생성: `apps/api/db/migrations/0007_create_ai_instruction_versions.sql`
- 생성: `apps/api/db/migrations/0008_create_ai_draft_records.sql`
- 생성: `apps/web/src/entities/ai-instruction/`
- 생성: `apps/web/src/features/contract-ai-draft/`
- 생성: `apps/api/src/server/ai/contract-draft-provider.ts`
- 생성: `apps/api/src/server/ai/groq-contract-draft-provider.ts`
- 생성: `apps/api/src/routes/contract-drafts.ts`
- 테스트: `tests/contract-ai/contract-draft-input.test.ts`
- 테스트: `tests/contract-ai/contract-draft-provider.test.ts`

- [ ] 이메일·전화번호·내부 메모가 AI 입력에서 제외되는지 테스트한다.
- [ ] 금액·일정·제작 범위·결제 조건이 관리자 입력값 그대로 유지되는지 테스트한다.
- [ ] 작성 지침 선택, AI 오류, 초안 상태 테스트를 작성한다.
- [ ] 작성 지침과 버전 테이블을 만든다.
- [ ] Groq을 사용하는 AI 제공자 인터페이스와 어댑터를 구현한다.
- [ ] AI 결과를 수정 가능한 `AI_DRAFT` 계약서 버전으로 저장한다.
- [ ] 사용한 입력값, 지침 버전, 모델 정보, 생성 일시를 관리자 전용으로 저장한다.
- [ ] AI 초안이 자동 전송·자동 승인되지 않게 한다.
- [ ] 가상 고객 정보로 집중 테스트를 실행한다.
- [ ] AI 초안 기능을 커밋한다.

### 작업 10: 관리자가 직접 실행하는 이메일 발송

**파일:**

- 생성: `apps/api/db/migrations/0009_create_email_delivery_logs.sql`
- 생성: `apps/api/src/server/email/email-provider.ts`
- 생성: `apps/api/src/server/email/brevo-email-provider.ts`
- 생성: `apps/web/src/features/send-contract-email/`
- 생성: `apps/web/src/features/send-project-link-email/`
- 생성: `apps/api/src/routes/emails.ts`
- 테스트: `tests/email/email-preview.test.ts`
- 테스트: `tests/email/email-delivery-log.test.ts`

- [ ] 이메일 미리보기, 수신자 확인, 수동 발송, 중복 클릭, 성공·실패 기록, 재발송 테스트를 작성한다.
- [ ] 테스트가 실패하는지 확인한다.
- [ ] 이메일 발송 기록 테이블을 만든다.
- [ ] 무료 발송 서비스 제공자 인터페이스와 어댑터를 구현한다.
- [ ] 계약서 이메일과 프로젝트 링크 이메일 템플릿을 만든다.
- [ ] 제목·본문을 관리자가 발송 전에 수정할 수 있게 한다.
- [ ] 발송 전 명시적 확인을 요구한다.
- [ ] 수신자, 이메일 종류, 발송 시각, 발송 서비스 결과, 오류 정보를 저장한다.
- [ ] 실제 수신자에게 보내지 않는 테스트로 검증한다.
- [ ] 수동 이메일 기능을 커밋한다.

### 작업 11: 관리자 인증과 문의 관리

**파일:**

- 생성: `apps/web/src/app/admin/`
- 생성: `apps/web/src/widgets/admin/`
- 생성: `apps/web/src/features/admin-auth/`
- 생성: `apps/web/src/features/inquiry-management/`
- 수정: `apps/api/src/routes/inquiries.ts`
- 테스트: `tests/admin/admin-access.test.tsx`
- 테스트: `tests/admin/inquiry-management.test.tsx`

- [ ] Cloudflare Access 이메일 PIN 로그인과 7일 세션 설정을 문서화한다.
- [ ] 비로그인 거부, 문의 목록·상세 조회, 상태·메모 수정 테스트를 작성한다.
- [ ] 관리자 화면에는 고객 담당자명·업체명·문의 유형·상태·접수일을 보여준다.
- [ ] 상세 화면에는 문의 내용, 연락처, 상담 메모, 계약 상태, 프로젝트 전환 여부를 보여준다.
- [ ] 계약서 작성·AI 초안·이메일 발송·프로젝트 전환 버튼을 연결한다.
- [ ] 문의 상태별 개수와 최근 문의 목록을 관리자 첫 화면에 보여준다.
- [ ] 집중 테스트와 브라우저 테스트를 실행한다.
- [ ] 관리자 기능을 커밋한다.

### 작업 12: PR 전 전체 검증과 무료 운영 점검

**파일:**

- 수정: `README.md`
- 생성: `docs/operations/free-tier-notes.md`
- 생성: `tests/e2e/lead-inquiry-flow.spec.ts`
- 생성: `.github/workflows/ci.yml`
- 생성: `.husky/`
- 생성: `lint-staged` 설정

- [ ] 랜딩페이지 → 문의 제출 → 관리자 확인 → 계약서 승인 → 프로젝트 생성 → 고객 진행상황 조회 전체 흐름을 Playwright로 작성한다.
- [ ] PR 생성·수정 시 GitHub Actions가 실행되게 한다.
- [ ] CI에서 타입 검사, 린트, Vitest, Playwright, 프로덕션 빌드를 실행한다.
- [ ] Husky와 lint-staged는 커밋 시 변경 파일의 린트·포맷만 실행하게 한다.
- [ ] 전체 테스트는 일반 개발 중 매번 실행하지 않고 PR 전에만 실행한다.
- [ ] 무료 한도, AI 사용량, 이메일 발송량, 필요한 환경변수와 비밀값을 문서화한다.
- [ ] `main` 직접 푸시 금지, PR 필수, CI 성공 필수, 강제 푸시 금지, Squash Merge를 확인한다.
- [ ] 실제 고객 정보·실제 API 키·실제 발송·운영 DB가 테스트에 포함되지 않았는지 확인한다.
- [ ] PR 전 전체 검증을 완료한다.

## 저장소와 Git 규칙

- `apps/web`, `apps/api`, `packages/shared`를 pnpm workspace로 관리한다.
- 웹 앱은 실용적인 FSD 구조를 사용한다: `app`, `pages`, `widgets`, `features`, `entities`, `shared`.
- React Query는 서버 상태, Zustand는 전역 UI 상태를 담당한다.
- 한 파일에 하나의 주요 컴포넌트를 두고, 읽기 쉬운 컴포넌트와 훅을 만든다.
- Husky와 lint-staged는 변경 파일의 린트·포맷만 검사한다.
- 전체 테스트는 PR 전 GitHub Actions에서 실행한다.
- `main`은 직접 푸시할 수 없고 PR을 통해서만 변경한다.
- CI 성공과 검토 후 Squash Merge한다.
- 커밋 메시지는 Conventional Commits 형식을 사용한다.

## 구현 전 확인

이 계획은 문의 확보, 계약 승인, AI 계약서 초안, 수동 이메일 발송, 고객 진행상황 공유까지 포함한다. AI 상담봇, AI 제안서, 웹사이트 코드 생성은 별도 계획으로 분리한다. 구현을 시작하기 전 손 대표님의 계획 승인과 실행 방식 선택이 필요하다.
