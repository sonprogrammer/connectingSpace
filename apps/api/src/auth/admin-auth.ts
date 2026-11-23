import type { Context, Next } from 'hono';
import type { AppEnv } from '../app';

export const ADMIN_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
export const ADMIN_INQUIRIES_PERMISSION = 'admin:inquiries';

export type AdminPrincipal = {
  subject: string;
  email: string;
  permissions: readonly string[];
  sessionExpiresAt: number;
};

export interface AdminAuthProvider {
  authenticate(request: Request): Promise<AdminPrincipal | null>;
}

const unauthorizedResponse = {
  code: 'UNAUTHORIZED',
  message: '관리자 인증이 필요합니다.',
} as const;

const forbiddenResponse = {
  code: 'FORBIDDEN',
  message: '이 작업을 수행할 권한이 없습니다.',
} as const;

const internalErrorResponse = {
  code: 'INTERNAL_ERROR',
  message: '서버에서 요청을 처리하지 못했습니다.',
} as const;

export class InMemoryAdminAuthProvider implements AdminAuthProvider {
  private readonly sessions = new Map<string, AdminPrincipal>();
  private now: () => number;

  constructor(options: { now?: () => number } = {}) {
    this.now = options.now ?? Date.now;
  }

  createSession(
    principal: Omit<AdminPrincipal, 'sessionExpiresAt'>,
    ttlSeconds = ADMIN_SESSION_TTL_SECONDS,
  ): string {
    const token = `local-${crypto.randomUUID()}`;
    this.sessions.set(token, {
      ...principal,
      sessionExpiresAt: this.now() + ttlSeconds * 1000,
    });
    return token;
  }

  getSessionExpiry(token: string): number | null {
    return this.sessions.get(token)?.sessionExpiresAt ?? null;
  }

  setNow(now: () => number): void {
    this.now = now;
  }

  async authenticate(request: Request): Promise<AdminPrincipal | null> {
    const authorization = request.headers.get('authorization');
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return null;

    const session = this.sessions.get(token);
    if (!session) return null;
    if (session.sessionExpiresAt <= this.now()) {
      this.sessions.delete(token);
      return null;
    }

    return session;
  }
}

export const createUnavailableAdminAuthProvider = (): AdminAuthProvider => ({
  authenticate: async () => null,
});

export const createAdminAuthMiddleware =
  (
    provider: AdminAuthProvider,
    requiredPermission: string = ADMIN_INQUIRIES_PERMISSION,
    now: () => number = Date.now,
  ) =>
  async (context: Context<AppEnv>, next: Next) => {
    try {
      const principal = await provider.authenticate(context.req.raw);
      if (!principal) return context.json(unauthorizedResponse, 401);
      if (principal.sessionExpiresAt <= now()) {
        return context.json(unauthorizedResponse, 401);
      }
      if (!principal.permissions.includes(requiredPermission)) {
        return context.json(forbiddenResponse, 403);
      }

      context.set('admin', principal);
      await next();
    } catch {
      return context.json(internalErrorResponse, 500);
    }
  };
