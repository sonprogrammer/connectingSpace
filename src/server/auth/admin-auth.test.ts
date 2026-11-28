// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  ADMIN_SESSION_COOKIE_NAME,
  createAdminSessionCookie,
  createAdminAuthGuard,
  createSignedAdminSessionToken,
  InMemoryAdminAuthProvider,
  SignedCookieAdminAuthProvider,
  type AdminAuthProvider,
} from './admin-auth';

const adminPrincipal = {
  subject: 'synthetic-admin',
  email: 'synthetic-admin@example.com',
  permissions: ['admin:inquiries'],
};

describe('루트 Worker 관리자 인증 경계', () => {
  it('서명된 7일 쿠키로 관리자를 인증한다', async () => {
    const now = 1_700_000_000_000;
    const secret = 'synthetic-session-secret-at-least-32-characters';
    const token = await createSignedAdminSessionToken(
      adminPrincipal,
      secret,
      now,
    );
    const provider = new SignedCookieAdminAuthProvider({
      getSecret: () => secret,
      now: () => now,
    });

    const principal = await provider.authenticate(
      new Request('http://localhost/admin/inquiries', {
        headers: { Cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}` },
      }),
    );

    expect(principal).toEqual({
      ...adminPrincipal,
      sessionExpiresAt: now + 7 * 24 * 60 * 60 * 1000,
    });
  });

  it('변조된 서명 쿠키를 인증하지 않는다', async () => {
    const now = 1_700_000_000_000;
    const secret = 'synthetic-session-secret-at-least-32-characters';
    const token = await createSignedAdminSessionToken(
      adminPrincipal,
      secret,
      now,
    );
    const provider = new SignedCookieAdminAuthProvider({
      getSecret: () => secret,
      now: () => now,
    });

    const principal = await provider.authenticate(
      new Request('http://localhost/admin/inquiries', {
        headers: {
          Cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token.slice(0, -1)}x`,
        },
      }),
    );

    expect(principal).toBeNull();
  });

  it('만료된 서명 쿠키를 401로 거부하고 제거한다', async () => {
    const issuedAt = 1_700_000_000_000;
    const secret = 'synthetic-session-secret-at-least-32-characters';
    const token = await createSignedAdminSessionToken(
      adminPrincipal,
      secret,
      issuedAt,
    );
    const now = issuedAt + 7 * 24 * 60 * 60 * 1000;
    const provider = new SignedCookieAdminAuthProvider({
      getSecret: () => secret,
      now: () => now,
    });
    const guard = createAdminAuthGuard(provider, 'admin:inquiries', () => now);

    const result = await guard(
      new Request('http://localhost/admin/inquiries', {
        headers: { Cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}` },
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      expect(result.response.headers.get('set-cookie')).toContain('Max-Age=0');
    }
  });

  it('세션 쿠키에 보안 속성과 7일 수명을 설정한다', () => {
    expect(createAdminSessionCookie('synthetic-token')).toBe(
      `${ADMIN_SESSION_COOKIE_NAME}=synthetic-token; Max-Age=604800; Path=/admin; HttpOnly; Secure; SameSite=Strict`,
    );
  });

  it('인증 정보가 없는 요청을 401로 거부한다', async () => {
    const guard = createAdminAuthGuard(new InMemoryAdminAuthProvider());

    const result = await guard(new Request('http://localhost/admin/probe'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
      expect(await result.response.json()).toEqual({
        code: 'UNAUTHORIZED',
        message: '관리자 인증이 필요합니다.',
      });
    }
  });

  it('관리자 세션을 생성 시점부터 7일 동안 허용한다', async () => {
    const now = 1_700_000_000_000;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const provider = new InMemoryAdminAuthProvider({ now: () => now });
    const token = provider.createSession(adminPrincipal);
    const guard = createAdminAuthGuard(provider, 'admin:inquiries', () => now);

    const result = await guard(
      new Request('http://localhost/admin/probe', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

    expect(result).toEqual({
      ok: true,
      principal: {
        ...adminPrincipal,
        sessionExpiresAt: now + sevenDaysMs,
      },
    });
  });

  it('만료 직전에는 허용하고 만료 시각부터는 401로 거부한다', async () => {
    const start = 1_700_000_000_000;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    let now = start;
    const provider = new InMemoryAdminAuthProvider({ now: () => now });
    const token = provider.createSession(adminPrincipal);
    const guard = createAdminAuthGuard(provider, 'admin:inquiries', () => now);
    const request = () =>
      new Request('http://localhost/admin/probe', {
        headers: { Authorization: `Bearer ${token}` },
      });

    now = start + sevenDaysMs - 1;
    expect((await guard(request())).ok).toBe(true);

    now = start + sevenDaysMs;
    const expired = await guard(request());
    expect(expired.ok).toBe(false);
    if (!expired.ok) expect(expired.response.status).toBe(401);
  });

  it('필요한 권한이 없는 인증 사용자를 403으로 거부한다', async () => {
    const now = 1_700_000_000_000;
    const secret = 'synthetic-session-secret-at-least-32-characters';
    const token = await createSignedAdminSessionToken(
      {
        subject: 'synthetic-viewer',
        email: 'synthetic-viewer@example.com',
        permissions: ['admin:read-only'],
      },
      secret,
      now,
    );
    const provider = new SignedCookieAdminAuthProvider({
      getSecret: () => secret,
      now: () => now,
    });
    const guard = createAdminAuthGuard(provider, 'admin:inquiries', () => now);

    const result = await guard(
      new Request('http://localhost/admin/probe', {
        headers: { Cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}` },
      }),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it('인증 공급자 오류를 세부 내용 없이 500으로 변환한다', async () => {
    const provider: AdminAuthProvider = {
      authenticate: async () => {
        throw new Error('synthetic provider secret');
      },
    };
    const guard = createAdminAuthGuard(provider);

    const result = await guard(new Request('http://localhost/admin/probe'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(500);
      expect(await result.response.json()).toEqual({
        code: 'INTERNAL_ERROR',
        message: '서버에서 요청을 처리하지 못했습니다.',
      });
    }
  });
});
