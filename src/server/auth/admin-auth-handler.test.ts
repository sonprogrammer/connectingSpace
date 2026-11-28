// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { createAdminAuthHandlers } from './admin-auth-handler';

const now = 1_700_000_000_000;
const config = {
  email: 'synthetic-admin@example.com',
  password: 'synthetic-password',
  sessionSecret: 'synthetic-session-secret-at-least-32-characters',
};

const createHandlers = () =>
  createAdminAuthHandlers({ getConfig: () => config, now: () => now });

const loginRequest = (body: object, origin = 'http://localhost') =>
  new Request('http://localhost/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(body),
  });

describe('관리자 인증 API', () => {
  it('합성 자격 증명으로 로그인하면 7일 HttpOnly 쿠키를 발급한다', async () => {
    const response = await createHandlers().login(
      loginRequest({
        email: 'synthetic-admin@example.com',
        password: 'synthetic-password',
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toMatch(
      /^connecting_space_admin_session=.+; Max-Age=604800; Path=\/admin; HttpOnly; Secure; SameSite=Strict$/u,
    );
    expect(await response.json()).toEqual({
      authenticated: true,
      expiresAt: '2023-11-21T22:13:20.000Z',
    });
  });

  it('잘못된 자격 증명을 401로 거부하고 입력값을 노출하지 않는다', async () => {
    const response = await createHandlers().login(
      loginRequest({
        email: 'synthetic-admin@example.com',
        password: 'wrong-password',
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      code: 'UNAUTHORIZED',
      message: '이메일 또는 비밀번호를 확인해 주세요.',
    });
  });

  it('유효하지 않은 로그인 본문을 400으로 거부한다', async () => {
    const response = await createHandlers().login(
      loginRequest({ email: 'not-an-email', password: '' }),
    );

    expect(response.status).toBe(400);
  });

  it('비밀 바인딩 설정이 없으면 세부 정보 없이 500을 반환한다', async () => {
    const handlers = createAdminAuthHandlers({ getConfig: () => null });
    const response = await handlers.login(
      loginRequest({
        email: 'synthetic-admin@example.com',
        password: 'synthetic-password',
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      code: 'INTERNAL_ERROR',
      message: '서버에서 요청을 처리하지 못했습니다.',
    });
  });

  it('로그인 쿠키로 현재 세션과 만료 시각을 확인한다', async () => {
    const handlers = createHandlers();
    const login = await handlers.login(
      loginRequest({
        email: 'synthetic-admin@example.com',
        password: 'synthetic-password',
      }),
    );
    const cookie = login.headers.get('set-cookie')!.split(';')[0];

    const response = await handlers.session(
      new Request('http://localhost/admin/auth/session', {
        headers: { Cookie: cookie },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({
      authenticated: true,
      expiresAt: '2023-11-21T22:13:20.000Z',
    });
  });

  it('로그아웃하면 같은 범위의 쿠키를 제거한다', async () => {
    const response = await createHandlers().logout(
      new Request('http://localhost/admin/auth/logout', {
        method: 'POST',
        headers: { Origin: 'http://localhost' },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toBe(
      'connecting_space_admin_session=; Max-Age=0; Path=/admin; HttpOnly; Secure; SameSite=Strict',
    );
    expect(await response.json()).toEqual({ authenticated: false });
  });

  it('다른 출처의 로그인과 로그아웃 요청을 403으로 거부한다', async () => {
    const handlers = createHandlers();
    const login = await handlers.login(
      loginRequest(
        {
          email: 'synthetic-admin@example.com',
          password: 'synthetic-password',
        },
        'https://attacker.example',
      ),
    );
    const logout = await handlers.logout(
      new Request('http://localhost/admin/auth/logout', {
        method: 'POST',
        headers: { Origin: 'https://attacker.example' },
      }),
    );

    expect(login.status).toBe(403);
    expect(logout.status).toBe(403);
  });

  it('4 KiB를 넘는 로그인 본문을 413으로 거부한다', async () => {
    const response = await createHandlers().login(
      loginRequest({
        email: 'synthetic-admin@example.com',
        password: 'x'.repeat(4097),
      }),
    );

    expect(response.status).toBe(413);
  });
});
