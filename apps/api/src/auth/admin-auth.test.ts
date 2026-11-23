import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import { createApp, type AppEnv } from '../app';
import {
  createAdminAuthMiddleware,
  InMemoryAdminAuthProvider,
} from './admin-auth';
import type { AdminAuthProvider } from './admin-auth';

const createProtectedApp = (
  provider: AdminAuthProvider,
  now: () => number = Date.now,
) => {
  const app = new Hono<AppEnv>();
  app.use(
    '/admin/*',
    createAdminAuthMiddleware(provider, 'admin:inquiries', now),
  );
  app.get('/admin/summary', (c) => {
    const admin = c.get('admin');
    return c.json({ subject: admin.subject, email: admin.email });
  });
  return app;
};

const adminPrincipal = {
  subject: 'synthetic-admin',
  email: 'synthetic-admin@example.com',
  permissions: ['admin:inquiries'],
};

describe('admin authentication boundary', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const app = createProtectedApp(new InMemoryAdminAuthProvider());

    const response = await app.request('/admin/summary');

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      code: 'UNAUTHORIZED',
      message: '관리자 인증이 필요합니다.',
    });
  });

  it('accepts a local session for seven days', async () => {
    const now = 1_700_000_000_000;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const provider = new InMemoryAdminAuthProvider({ now: () => now });
    const token = provider.createSession(adminPrincipal);
    const app = createProtectedApp(provider, () => now);

    const response = await app.request('/admin/summary', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      subject: 'synthetic-admin',
      email: 'synthetic-admin@example.com',
    });
    expect(provider.getSessionExpiry(token)).toBe(now + sevenDaysMs);
  });

  it('allows the request immediately before expiry and rejects it at expiry', async () => {
    const start = 1_700_000_000_000;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    let now = start;
    const provider = new InMemoryAdminAuthProvider({ now: () => now });
    const token = provider.createSession(adminPrincipal);
    const app = createProtectedApp(provider, () => now);

    now = start + sevenDaysMs - 1;
    const beforeExpiry = await app.request('/admin/summary', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(beforeExpiry.status).toBe(200);

    now = start + sevenDaysMs;
    const response = await app.request('/admin/summary', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(401);
  });

  it('rejects an expired principal even when the provider returns it', async () => {
    const now = 1_700_000_000_000;
    const provider: AdminAuthProvider = {
      authenticate: async () => ({
        ...adminPrincipal,
        sessionExpiresAt: now,
      }),
    };
    const app = createProtectedApp(provider, () => now);

    const response = await app.request('/admin/summary', {
      headers: { Authorization: 'Bearer synthetic-expired-token' },
    });

    expect(response.status).toBe(401);
  });

  it('distinguishes authenticated users without permission with 403', async () => {
    const provider = new InMemoryAdminAuthProvider();
    const token = provider.createSession({
      subject: 'synthetic-viewer',
      email: 'synthetic-viewer@example.com',
      permissions: ['admin:read-only'],
    });
    const app = createProtectedApp(provider);

    const response = await app.request('/admin/summary', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      code: 'FORBIDDEN',
      message: '이 작업을 수행할 권한이 없습니다.',
    });
  });

  it('protects admin routes registered through createApp by default', async () => {
    const app = createApp();
    app.get('/admin/probe', (c) => c.json({ ok: true }));

    const response = await app.request('/admin/probe');

    expect(response.status).toBe(401);
  });

  it('uses an injected provider for routes registered through createApp', async () => {
    const provider = new InMemoryAdminAuthProvider();
    const token = provider.createSession({
      subject: 'synthetic-viewer',
      email: 'synthetic-viewer@example.com',
      permissions: ['admin:read-only'],
    });
    const app = createApp(undefined, undefined, provider);
    app.get('/admin/probe', (c) => c.json({ ok: true }));

    const response = await app.request('/admin/probe', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(403);
  });

  it('does not protect public routes with the admin boundary', async () => {
    const app = createApp();
    app.get('/public/probe', (c) => c.json({ ok: true }));

    const response = await app.request('/public/probe');

    expect(response.status).toBe(200);
  });
});
