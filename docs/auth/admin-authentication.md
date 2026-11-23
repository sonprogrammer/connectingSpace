# 관리자 인증 경계와 7일 세션 정책

## 역할

이 문서는 관리자 전용 API가 공개 API와 분리되어 인증되는 경계와, 로컬 검증에서 사용할 세션 정책을 정의한다.

## 인증 경계

- 공개 API는 인증 없이 접근할 수 있다.
- `/admin/*` 경로는 `createAdminAuthMiddleware`를 통과해야 한다.
- 인증 결과는 `AdminPrincipal`로 정규화하고, 이후 관리자 라우트는 `c.get('admin')`에서 사용한다.
- 인증 정보가 없거나 만료되면 `401 UNAUTHORIZED`를 반환한다.
- 인증은 되었지만 필요한 권한이 없으면 `403 FORBIDDEN`을 반환한다.
- 인증 제공자 오류는 내부 상세를 노출하지 않고 `500 INTERNAL_ERROR`로 응답한다.

## 7일 세션 정책

- 기본 세션 유지 시간은 `ADMIN_SESSION_TTL_SECONDS` 기준 7일이다.
- 세션 만료 시각은 발급 시각에 7일을 더해 계산한다.
- 만료 시각과 현재 시각이 같거나 현재 시각이 더 늦으면 만료된 세션으로 판단한다.
- `AdminAuthProvider`는 만료된 `AdminPrincipal`을 반환하지 않아야 하며, 미들웨어도 `sessionExpiresAt`을 다시 확인한다.
- 로컬 mock은 메모리에서만 세션을 보관하며 프로세스 종료 시 사라진다.
- 로컬 mock의 Bearer token은 테스트 전용이며 운영 비밀값이 아니다.

## Cloudflare Access 연결 지점

운영에서는 `AdminAuthProvider` 구현체에 Cloudflare Access의 검증된 identity 전달 방식을 연결한다. 이 작업에서는 Access 계정·JWT 검증 키·도메인·실제 쿠키를 추가하지 않는다.

운영 연결 전에 다음을 결정해야 한다.

- Cloudflare Access application과 허용 이메일·그룹 정책
- Access JWT 검증 위치와 키 갱신 방식
- 관리자 권한과 Access 그룹의 매핑
- 로그아웃·세션 철회 방식
- 세션 만료·권한 변경 시 기존 요청 처리 정책

## 로컬 검증

`InMemoryAdminAuthProvider`로 합성 관리자 identity와 세션을 발급해 인증 성공, 미인증, 만료, 권한 부족을 테스트한다. 실제 관리자 계정·이메일·비밀값은 사용하지 않는다.
