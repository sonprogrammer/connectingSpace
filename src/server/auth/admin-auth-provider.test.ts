// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  ADMIN_SESSION_COOKIE_NAME,
  createSignedAdminSessionToken,
} from './admin-auth';
import {
  createAdminAuthProvider,
  readAdminAuthConfig,
} from './admin-auth-provider';

const bindings = {
  ADMIN_EMAIL: 'synthetic-admin@example.com',
  ADMIN_PASSWORD: 'synthetic-password',
  ADMIN_SESSION_SECRET: 'synthetic-session-secret-at-least-32-characters',
};

describe('관리자 인증 Worker 바인딩 연결', () => {
  it('비밀 바인딩을 로그인 설정으로 읽는다', () => {
    expect(readAdminAuthConfig(bindings)).toEqual({
      email: 'synthetic-admin@example.com',
      password: 'synthetic-password',
      sessionSecret: 'synthetic-session-secret-at-least-32-characters',
    });
    expect(readAdminAuthConfig({})).toBeNull();
  });

  it('관리자 API 공급자가 같은 바인딩의 서명 쿠키를 검증한다', async () => {
    const now = 1_700_000_000_000;
    const token = await createSignedAdminSessionToken(
      {
        subject: bindings.ADMIN_EMAIL,
        email: bindings.ADMIN_EMAIL,
        permissions: ['admin:inquiries'],
      },
      bindings.ADMIN_SESSION_SECRET,
      now,
    );
    const provider = createAdminAuthProvider(bindings, () => now);

    const principal = await provider.authenticate(
      new Request('http://localhost/admin/inquiries', {
        headers: { Cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}` },
      }),
    );

    expect(principal?.subject).toBe('synthetic-admin@example.com');
  });

  it('32자보다 짧은 서명 키로 만든 쿠키를 인증하지 않는다', async () => {
    const now = 1_700_000_000_000;
    const shortSecret = 'short-secret';
    const token = await createSignedAdminSessionToken(
      {
        subject: bindings.ADMIN_EMAIL,
        email: bindings.ADMIN_EMAIL,
        permissions: ['admin:inquiries'],
      },
      shortSecret,
      now,
    );
    const provider = createAdminAuthProvider(
      { ...bindings, ADMIN_SESSION_SECRET: shortSecret },
      () => now,
    );

    expect(
      await provider.authenticate(
        new Request('http://localhost/admin/inquiries', {
          headers: { Cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}` },
        }),
      ),
    ).toBeNull();
  });
});
