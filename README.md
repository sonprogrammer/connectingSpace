# Connecting Space

커넥팅스페이스의 공개 웹과 문의 관리 기반을 개발하는 저장소입니다.

## 현재 구조

- 루트 `src/**`: Next.js App Router 기반 웹 앱
- 루트 `vite.config.ts`, `cloudflare.config.ts`: vinext Cloudflare Worker 구성
- 루트 `src/server/**`: 문의 저장소와 관리자 인증을 포함한 서버 전용 코드
- 루트 `src/shared/model/**`: 웹과 서버가 함께 사용하는 타입과 Zod 스키마
- 루트 `db/migrations/**`: 통합 Worker의 로컬 D1 마이그레이션

## 로컬 실행

의존성을 설치한 뒤 루트에서 웹 개발 서버를 실행합니다.

관리자 인증 로컬 검증에는 합성 값을 `.dev.vars`에 넣습니다. 저장소는 값이 비어 있는 [.dev.vars.example](.dev.vars.example)을 제공하므로 복사 후 테스트용 값만 채우세요. `.dev.vars`는 Git에서 제외됩니다. 이 파일의 값은 로컬 전용이며 실제 비밀값을 입력하지 마세요.

```bash
pnpm install
pnpm verify:migration
pnpm dev
```

로컬에서 로그인 성공 흐름을 재현하려면 별도 터미널에서 다음 값을 설정하고 개발 Worker를 다시 실행합니다.

```text
ADMIN_EMAIL=qa-admin@example.test
ADMIN_PASSWORD=synthetic-local-password
ADMIN_SESSION_SECRET=synthetic-local-session-secret-at-least-32-characters
```

`pnpm verify:migration`은 `db/migrations`의 SQL을 로컬 D1에만 적용합니다. 운영 D1에는 접근하지 않습니다. 개발 서버는 웹과 아래 API를 같은 `http://localhost:3001` 출처에서 제공합니다.

- `GET /health`: API 상태 확인
- `POST /public/inquiries`: 공개 문의 접수
- `POST /admin/auth/login`: 관리자 로그인과 7일 쿠키 발급
- `POST /admin/auth/logout`: 관리자 세션 쿠키 제거
- `GET /admin/auth/session`: 현재 관리자 세션 확인
- `GET /admin/inquiries`: 관리자 문의 목록 조회
- `GET /admin/inquiries/:inquiryId`: 관리자 문의 상세 조회
- `PATCH /admin/inquiries/:inquiryId`: 문의 상태·마지막 내부 메모 수정

공개 문의 요청은 `Content-Type: application/json`을 사용해야 하며, 16 KiB를 넘거나 필수 항목이 유효하지 않으면 거부됩니다. 같은 핵심 내용의 문의가 10분 안에 다시 들어오면 `409`를 반환합니다.

로컬 Worker 미리보기는 프로덕션 빌드 후 실행합니다.

```bash
pnpm build
pnpm start
```

## 검증

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm build
```

`typecheck`, `lint`, `test`는 웹과 Route Handler가 함께 배포되는 루트 단일 Worker 앱을 검사합니다.

## 관리자 인증 경계

관리자 로그인 요청은 JSON `email`, `password`를 사용합니다. 성공 응답은 `authenticated: true`와 ISO 8601 형식의 `expiresAt`을 반환하며, 브라우저에는 `connecting_space_admin_session` 쿠키를 설정합니다. 세션 확인은 같은 성공 응답을, 로그아웃은 `authenticated: false`를 반환합니다. 인증이 없거나 만료되면 `401`, 세션에 `admin:inquiries` 권한이 없으면 `403`입니다.

로그인 본문은 4 KiB 이하만 허용합니다. 로그인·로그아웃·문의 수정 요청은 요청 URL과 같은 `Origin`만 허용하고, 인증 응답은 캐시하지 않습니다.

세션 쿠키는 7일 동안 유지되며 `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/admin` 속성을 사용합니다. 관리자 문의 API도 이 쿠키만 검증합니다. 프론트는 응답 본문에서 토큰을 읽거나 별도로 저장하지 않습니다.

서버는 실제 값을 저장소에 기록하지 않고 다음 Cloudflare Worker 비밀 바인딩을 읽습니다.

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`: 32자 이상의 무작위 서명 키

이번 구현은 HMAC 서명 쿠키를 사용하므로 Worker 메모리와 D1 세션 테이블에 의존하지 않습니다. 무료 운영과 다중 Worker 인스턴스에는 적합하지만 로그아웃은 현재 브라우저의 쿠키만 제거합니다. 탈취된 쿠키를 7일 만료 전에 개별 폐기할 수 없으며, 긴급 전체 폐기는 `ADMIN_SESSION_SECRET` 교체가 필요합니다. 개별 세션 폐기가 필요하면 별도 이슈에서 D1 세션 저장소를 도입해야 합니다.

분산 로그인 시도 제한은 Worker 인스턴스 메모리만으로 보장하지 않습니다. 운영 배포 전에 Cloudflare Rate Limiting 또는 승인된 영속 저장소 기반 제한을 별도로 설정해야 합니다. 이번 코드 작업은 Cloudflare 리소스를 만들거나 변경하지 않습니다.

관리자 문의 목록은 최신 접수순이며 `status`, `type`, `search`, `page`, `pageSize` 쿼리를 지원합니다. `pageSize`는 기본 20, 최대 100입니다. 수정 API는 현재 유효한 문의 상태값 사이의 전환을 허용하며, 공백만 있는 `adminMemo`는 메모 삭제로 처리합니다.

## D1 연결 주의사항

`cloudflare.config.ts`의 D1 ID와 이름은 로컬 개발 전용입니다. 운영 배포 전에는 승인된 기존 D1 데이터베이스 ID로 명시적으로 교체하고, 스키마 호환성과 백업을 확인해야 합니다. 이 저장소의 `pnpm verify:migration`은 항상 `--local` 옵션을 사용하며 `0001_create_inquiries.sql`, `0002_add_admin_memo.sql`을 순서대로 검증합니다. 운영 마이그레이션은 실행하지 않습니다.
