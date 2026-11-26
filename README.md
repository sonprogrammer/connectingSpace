# Connecting Space

커넥팅스페이스의 공개 웹과 문의 관리 기반을 개발하는 저장소입니다.

## 현재 구조

- 루트 `src/**`: Next.js App Router 기반 웹 앱
- 루트 `vite.config.ts`, `cloudflare.config.ts`: vinext Cloudflare Worker 구성
- `apps/api`: 후속 이전 전까지 유지하는 Hono API Worker
- `packages/shared`: 웹과 API가 함께 사용하는 계약과 스키마

## 로컬 실행

의존성을 설치한 뒤 루트에서 웹 개발 서버를 실행합니다.

```bash
pnpm install
pnpm dev
```

로컬 Worker 미리보기는 프로덕션 빌드 후 실행합니다.

```bash
pnpm build
pnpm start
```

기존 API Worker는 별도 명령으로 실행합니다.

```bash
pnpm dev:api
```

## 검증

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm build
```

`typecheck`, `lint`, `test`는 루트 웹 앱과 `apps/api`, `packages/shared`를 모두 검사합니다. API와 shared가 루트 앱으로 이전·정리되는 후속 작업에서 단일 앱 기준으로 다시 단순화합니다.
