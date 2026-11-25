# 웹 루트 Worker 전환 설계

## 목적

`apps/web`의 Next.js 앱을 저장소 루트로 옮겨 루트 자체를 vinext 기반 Cloudflare Worker 웹 앱으로 만든다. 정적 export와 Cloudflare Pages 전용 빌드 경로는 제거하되, 후속 Backend 이전 전까지 `apps/api`와 `packages/shared`의 코드와 기본 검증은 유지한다.

## 목표

- 웹 소스와 설정을 루트 `src` 및 루트 설정 파일로 이동한다.
- 루트 `dev`, `build`, `start`가 Worker 웹 앱을 직접 대상으로 삼는다.
- `next.config.ts`에서 정적 export 설정을 제거한다.
- 기본 `typecheck`, `lint`, `test`가 웹·API·shared를 모두 검사한다.
- 현재 CI와 개발 문서를 새 루트 경로에 맞춘다.

## 제외 범위

- `apps/api`의 Hono API, D1 마이그레이션, 인증 코드를 루트로 이전하지 않는다.
- `packages/shared`를 제거하거나 웹 내부로 합치지 않는다.
- 프론트 API 호출 계약과 화면 동작을 변경하지 않는다.
- Cloudflare Pages·Workers 배포 또는 운영 리소스 삭제를 수행하지 않는다.

## 접근 방법

### 선택: 루트를 실제 웹 패키지로 전환

루트 `package.json`에 웹 의존성과 실행 명령을 통합하고 `apps/web/src`와 웹 설정을 루트로 이동한다. 기본 검증 명령은 루트 웹 검사와 API·shared 필터 검사를 명시적으로 이어 실행한다. 이 방식이 이슈의 단일 루트 앱 목표를 그대로 만족하고, 후속 Backend 이전도 루트 서버 코드로 이어갈 수 있어 선택했다.

### 검토 후 제외: 루트 명령만 `apps/web`으로 전달

변경량은 작지만 앱이 실제로 루트로 이동하지 않아 #47의 목적과 후속 단일 Worker 전환을 충족하지 못한다.

### 검토 후 제외: 루트와 `apps/web`을 동시에 유지

전환 중 호환성은 높지만 설정과 의존성이 중복되고 어느 앱이 기준인지 불명확해진다.

## 구조와 명령

- 루트 웹 파일: `src/**`, `next.config.ts`, `vite.config.ts`, `cloudflare.config.ts`, `tsconfig.json`, Tailwind·PostCSS·Vitest·ESLint 설정
- 루트 웹 명령:
  - `dev`: vinext Vite 개발 서버
  - `build`: 타입 검사 후 Worker 프로덕션 빌드
  - `start`: 로컬 Worker 미리보기
  - `typecheck:web`, `lint:web`, `test:web`: 웹 전용 검증
- 기본 검증:
  - `typecheck`: 웹 → API → shared
  - `lint`: 웹 → API → shared
  - `test`: 웹 → API → shared
- API 개발 명령과 workspace 패키지는 후속 이전 전까지 보존한다.

## CI와 문서

- CI는 루트에서 포맷, 린트, 타입 검사, 테스트, Worker 빌드를 실행한다.
- README와 Frontend 작업 지침의 현재 웹 경로를 루트 구조로 갱신한다.
- 과거 구현 기록인 기존 설계·계획 문서의 경로는 역사적 기록으로 유지한다.

## 완료 판단

- `apps/web`이 남지 않고 루트에 웹 앱이 존재한다.
- 정적 export 설정과 `out` 기반 Pages 빌드가 제거된다.
- 루트 Worker 빌드와 타입 검사가 성공한다.
- 기본 린트·테스트·타입 검사가 웹·API·shared를 모두 실행한다.
- 로컬 Worker에서 공개 홈이 HTTP 200으로 응답한다.
