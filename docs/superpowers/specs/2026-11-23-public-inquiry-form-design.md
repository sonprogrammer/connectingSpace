# 공개 견적 요청 폼 설계

## 목적

공개 랜딩페이지 방문자가 견적 요청을 작성해 `POST /public/inquiries`로 제출하고, 제출 중·성공·실패 상태를 이해할 수 있게 한다.

## 포함 범위

- 업체명, 담당자명, 이메일, 연락처, 문의 유형, 문의 내용 입력
- 희망 일정, 예산, 현재 사이트 URL, 참고 사이트 URL, 선호 연락 방법 선택 입력
- 클라이언트 검증과 API 계약에 맞춘 payload 변환
- 제출 중 버튼 잠금과 중복 제출 방지
- 성공 시 접수 완료 문구와 접수 시각 표시
- 검증·중복·서버 오류를 사용자가 이해할 수 있는 한국어 문구로 표시
- 모바일 키보드와 기본 HTML 접근성 지원

## 제외 범위

- 자동 이메일·문자·카카오톡 발송
- 로그인, 파일 업로드, 실제 고객 데이터 fixture
- 관리자 기능과 백엔드 코드 변경

## 구현 방식

`features/inquiry-form` 안에서 API 클라이언트와 폼 상태를 분리한다. 공개 문의 API가 웹과 같은 루트 Worker에서 동작하므로 별도 API 주소를 주입하지 않고, 요청 경로는 항상 같은 출처의 `/public/inquiries`로 고정한다.

- `shared/api/inquiries.ts`: API 요청과 상태별 오류를 typed result로 변환
- `features/inquiry-form/model`: 입력 타입, 기본값, 검증, 서버 오류 문구
- `features/inquiry-form/InquiryForm.tsx`: 입력·제출·성공 상태 UI
- `InquiryCtaSection`: 기존 CTA 대신 폼 위젯을 문의 섹션에 배치

## 상태 흐름

`idle → submitting → success` 또는 `idle/submitting → error`로 제한한다. 성공 후에는 폼을 다시 제출하지 않고 완료 패널을 보여준다. 실패 시 입력값은 유지하고 오류 문구와 폼 상단 안내를 표시한다.

## 접근성

- 모든 필드는 visible label과 `id`/`htmlFor`를 가진다.
- 필수 필드는 `required`, 오류는 `aria-invalid`와 `aria-describedby`를 사용한다.
- 제출 중 버튼은 `disabled`와 진행 문구를 사용한다.
- 오류·성공 안내는 `role="status"` 또는 `role="alert"`로 전달한다.
- 모바일에서 입력 필드와 CTA가 화면 폭을 넘지 않게 한다.
