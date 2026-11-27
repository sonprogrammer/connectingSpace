# 루트 단일 앱 정리 설계

## 목적

문의 API와 관리자 문의 API가 루트 Worker로 이전된 뒤 남아 있는 구 `apps/api`와 `packages/shared`를 제거해 저장소를 루트 단일 앱 구조로 만든다.

## 포함 범위

- 실제로 소비되는 문의 타입과 Zod 스키마를 `src/shared/model/inquiry.ts`로 옮긴다.
- 루트 코드의 `@connecting-space/shared` 의존성을 루트 상대 경로 별칭으로 교체한다.
- `apps/api`, `packages/shared`, `pnpm-workspace.yaml`과 전용 실행·검증 설정을 제거한다.
- README, AGENTS, 역할 스킬을 루트 Worker 기준으로 갱신한다.
- 포맷, 타입, 린트, 테스트, 빌드로 참조 누락과 회귀를 확인한다.

## 제외 범위

- Cloudflare 리소스 생성·수정·삭제와 배포
- D1 데이터베이스 변경 및 마이그레이션 실행
- 관리자 로그인·영속 세션 구현
- 프론트 화면 기능 변경

## 접근 방식

구 공유 패키지를 루트 의존성으로 유지하는 방식은 단일 앱 목표에 어긋난다. 모든 공유 코드를 서버 모듈로 옮기면 클라이언트 폼이 서버 경계를 역참조하게 된다. 따라서 프론트와 서버가 함께 쓰는 문의 계약만 루트 `src/shared/model`에 두고, 서버 전용 응답·관리자 스키마는 기존 `src/server`에 유지한다.

소비되지 않는 구 `healthResponseSchema`와 `errorResponseSchema`는 이식하지 않는다. 현재 루트 코드에 소비자가 없고, 복사하면 불필요한 계약만 남기기 때문이다.

## 완료 기준

- 루트 코드와 활성 설정에 `@connecting-space/shared`, `apps/api`, `packages/shared` 참조가 없다.
- 기본 `typecheck`, `lint`, `test`는 루트 단일 앱만 검사한다.
- 구 워크스페이스 파일이 제거된다.
- 포맷·타입·린트·테스트·빌드가 통과한다.
- Cloudflare 리소스와 D1 파일은 변경하지 않는다.
