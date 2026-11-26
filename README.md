# Connecting Space

커넥팅스페이스의 공개 웹과 문의 관리 기반을 개발하는 저장소입니다.

## 현재 구조

- 루트 `src/**`: Next.js App Router 기반 웹 앱
- 루트 `vite.config.ts`, `cloudflare.config.ts`: vinext Cloudflare Worker 구성
- 루트 `src/server/**`: 문의 저장소와 관리자 인증을 포함한 서버 전용 코드
- 루트 `db/migrations/**`: 통합 Worker의 로컬 D1 마이그레이션
- `apps/api`: 이전 검증이 끝날 때까지 유지하는 기존 Hono API Worker
- `packages/shared`: 이전 검증이 끝날 때까지 유지하는 기존 공유 계약과 스키마

## 로컬 실행

의존성을 설치한 뒤 루트에서 웹 개발 서버를 실행합니다.

```bash
pnpm install
pnpm verify:migration
pnpm dev
```

`pnpm verify:migration`은 `db/migrations`의 SQL을 로컬 D1에만 적용합니다. 운영 D1에는 접근하지 않습니다. 개발 서버는 웹과 아래 API를 같은 `http://localhost:3001` 출처에서 제공합니다.

- `GET /health`: API 상태 확인
- `POST /public/inquiries`: 공개 문의 접수

공개 문의 요청은 `Content-Type: application/json`을 사용해야 하며, 16 KiB를 넘거나 필수 항목이 유효하지 않으면 거부됩니다. 같은 핵심 내용의 문의가 10분 안에 다시 들어오면 `409`를 반환합니다.

로컬 Worker 미리보기는 프로덕션 빌드 후 실행합니다.

```bash
pnpm build
pnpm start
```

기존 Hono API Worker는 이전 비교가 필요할 때만 별도 명령으로 실행합니다.

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

## 관리자 인증 경계

루트 서버 코드에는 `admin:inquiries` 권한과 생성 시점부터 7일인 세션 만료 규칙이 이전되어 있습니다. 현재 구현은 테스트와 로컬 경계 확인을 위한 메모리 세션 공급자이며, Worker 인스턴스가 재시작되면 세션이 사라집니다. 실제 관리자 계정, 안전한 토큰 저장·폐기, 다중 인스턴스 세션 공유는 아직 구현하지 않았으므로 운영 로그인으로 사용할 수 없습니다.

## D1 연결 주의사항

`cloudflare.config.ts`의 D1 ID와 이름은 로컬 개발 전용입니다. 운영 배포 전에는 승인된 기존 D1 데이터베이스 ID로 명시적으로 교체하고, 스키마 호환성과 백업을 확인해야 합니다. 이 저장소의 `pnpm verify:migration`은 항상 `--local` 옵션을 사용하며 운영 마이그레이션을 실행하지 않습니다.
