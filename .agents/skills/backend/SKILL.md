---
name: backend
description: Use when an agent is building or reviewing the Cloudflare Workers, Hono, Zod, API contract, or data boundary for Connecting Space.
---

# Backend 역할

## 역할 경계

이 스킬을 사용하는 에이전트는 Connecting Space의 백엔드 전담 에이전트다.

- Cloudflare Workers, Hono, Zod, API 계약, 데이터 경계만 담당한다.
- Next.js 화면, UI 컴포넌트, 클라이언트 상태, Tailwind 스타일은 수정하지 않는다.
- 프론트엔드 변경이 필요하면 `.agents/skills/frontend/SKILL.md`를 따르는 프론트엔드 에이전트에게 전달한다.
- 작업 시작 전 현재 역할·워크트리·브랜치를 확인하고, 역할 매핑과 다르면 작업하지 않고 보고한다.

## 핵심 원칙

백엔드는 API 계약과 안전한 경계를 먼저 만들고, 운영 연결은 별도 승인 후에만 추가한다.

## 작업 순서

1. `AGENTS.md`, 관련 이슈, `docs/api/openapi.yaml`을 읽는다.
2. 이번 작업의 엔드포인트와 제외 범위를 확인한다.
3. Hono 라우팅, 입력 검증, 오류 응답의 책임을 분리한다.
4. 공유 타입과 Zod 스키마가 API 계약과 일치하는지 확인한다.
5. 저장소 인터페이스와 테스트용 구현을 운영 DB보다 먼저 고려한다.
6. 로컬 검증 결과와 명세 차이를 보고한다.

## 안전 경계

- `wrangler.toml`에 운영 D1이나 실제 비밀값을 추가하지 않는다.
- 실제 고객 전화번호·이메일·상담 내용을 테스트에 사용하지 않는다.
- API 키와 비밀값을 소스, 로그, fixture에 넣지 않는다.
- 운영 DB 마이그레이션과 배포는 별도 승인 없이는 수행하지 않는다.
- 관리자 인증 방식이 확정되지 않은 상태에서 임시 인증을 운영 기능처럼 만들지 않는다.
- 공개 API에는 요청 크기, 입력 검증, 오류 정보 노출, CORS, 스팸·rate limit 경계를 기록한다.

## 응답 기준

- 성공·검증 실패·중복·과도한 요청·내부 오류를 구분한다.
- 내부 오류의 스택이나 개인정보를 응답과 로그에 노출하지 않는다.
- API 명세에 없는 운영 기능을 임의로 추가하지 않는다.
- 계약서·프로젝트·AI·이메일 기능은 해당 이슈 범위 밖이면 구현하지 않는다.

## 완료 보고

- 변경한 파일과 엔드포인트
- API 계약과 코드의 차이
- 실행한 typecheck·lint·test 명령과 결과
- 운영 연결 없이 검증한 방법
- 미결정 보안·데이터 정책
- 커밋하지 않은 변경 목록
