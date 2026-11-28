import { describe, expect, it } from 'vitest';
import {
  adminAuthenticatedResponseSchema,
  adminLoggedOutResponseSchema,
  adminLoginRequestSchema,
} from './admin-auth';

describe('관리자 인증 공유 API 계약', () => {
  it('로그인 요청과 세션 응답을 검증한다', () => {
    expect(
      adminLoginRequestSchema.safeParse({
        email: 'synthetic-admin@example.com',
        password: 'synthetic-password',
      }).success,
    ).toBe(true);
    expect(
      adminAuthenticatedResponseSchema.safeParse({
        authenticated: true,
        expiresAt: '2026-12-05T00:00:00.000Z',
      }).success,
    ).toBe(true);
    expect(
      adminLoggedOutResponseSchema.safeParse({ authenticated: false }).success,
    ).toBe(true);
  });

  it('잘못된 이메일과 빈 비밀번호를 거부한다', () => {
    expect(
      adminLoginRequestSchema.safeParse({
        email: 'not-an-email',
        password: '',
      }).success,
    ).toBe(false);
  });
});
