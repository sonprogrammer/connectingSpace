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

```bash
pnpm install
pnpm verify:migration
pnpm dev
```

`pnpm verify:migration`은 `db/migrations`의 SQL을 로컬 D1에만 적용합니다. 운영 D1에는 접근하지 않습니다. 개발 서버는 웹과 아래 API를 같은 `http://localhost:3001` 출처에서 제공합니다.

- `GET /health`: API 상태 확인
- `POST /public/inquiries`: 공개 문의 접수
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

루트 서버 코드에는 `admin:inquiries` 권한과 생성 시점부터 7일인 세션 만료 규칙이 이전되어 있습니다. 관리자 문의 API는 `Authorization: Bearer <token>`을 현재 인증 경계로 사용합니다. 현재 구현은 테스트와 로컬 경계 확인을 위한 메모리 세션 공급자이며 HTTP로 세션을 발급하는 로그인 API는 없습니다. Worker 인스턴스가 재시작되면 세션이 사라지고 다중 인스턴스에서 공유되지 않으므로 운영 로그인으로 사용할 수 없습니다.

관리자 문의 목록은 최신 접수순이며 `status`, `type`, `search`, `page`, `pageSize` 쿼리를 지원합니다. `pageSize`는 기본 20, 최대 100입니다. 수정 API는 현재 유효한 문의 상태값 사이의 전환을 허용하며, 공백만 있는 `adminMemo`는 메모 삭제로 처리합니다.

## D1 연결 주의사항

`cloudflare.config.ts`의 D1 ID와 이름은 로컬 개발 전용입니다. 운영 배포 전에는 승인된 기존 D1 데이터베이스 ID로 명시적으로 교체하고, 스키마 호환성과 백업을 확인해야 합니다. 이 저장소의 `pnpm verify:migration`은 항상 `--local` 옵션을 사용하며 `0001_create_inquiries.sql`, `0002_add_admin_memo.sql`을 순서대로 검증합니다. 운영 마이그레이션은 실행하지 않습니다.
