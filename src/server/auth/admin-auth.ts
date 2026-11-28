import { z } from 'zod';

export const ADMIN_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
export const ADMIN_INQUIRIES_PERMISSION = 'admin:inquiries';
export const ADMIN_SESSION_COOKIE_NAME = 'connecting_space_admin_session';

export type AdminPrincipal = {
  subject: string;
  email: string;
  permissions: readonly string[];
  sessionExpiresAt: number;
};

export interface AdminAuthProvider {
  authenticate(request: Request): Promise<AdminPrincipal | null>;
}

export type AdminAuthResult =
  { ok: true; principal: AdminPrincipal } | { ok: false; response: Response };

const json = (body: object, status: number, headers?: HeadersInit) => {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Cache-Control', 'no-store');
  return Response.json(body, { status, headers: responseHeaders });
};

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

const sessionPayloadSchema = z.object({
  version: z.literal(1),
  subject: z.string().min(1),
  email: z.email(),
  permissions: z.array(z.string().min(1)),
  issuedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().positive(),
});

type SessionPayload = z.infer<typeof sessionPayloadSchema>;

const textEncoder = new TextEncoder();

const toBase64Url = (value: Uint8Array): string => {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '');
};

const fromBase64Url = (value: string): Uint8Array<ArrayBuffer> => {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  );
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const importHmacKey = (secret: string) =>
  crypto.subtle.importKey(
    'raw',
    textEncoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );

const readCookie = (request: Request, name: string): string | null => {
  const cookie = request.headers.get('cookie');
  if (!cookie) return null;

  for (const part of cookie.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim() || null;
    }
  }
  return null;
};

export const createAdminSessionCookie = (token: string): string =>
  `${ADMIN_SESSION_COOKIE_NAME}=${token}; Max-Age=${ADMIN_SESSION_TTL_SECONDS}; Path=/admin; HttpOnly; Secure; SameSite=Strict`;

export const clearAdminSessionCookie = (): string =>
  `${ADMIN_SESSION_COOKIE_NAME}=; Max-Age=0; Path=/admin; HttpOnly; Secure; SameSite=Strict`;

export const isSameOriginRequest = (request: Request): boolean => {
  const origin = request.headers.get('origin');
  return origin !== null && origin === new URL(request.url).origin;
};

export const createSignedAdminSessionToken = async (
  principal: Omit<AdminPrincipal, 'sessionExpiresAt'>,
  secret: string,
  now: number = Date.now(),
): Promise<string> => {
  if (!secret) throw new Error('관리자 세션 서명 키가 필요합니다.');

  const payload: SessionPayload = {
    version: 1,
    subject: principal.subject,
    email: principal.email,
    permissions: [...principal.permissions],
    issuedAt: now,
    expiresAt: now + ADMIN_SESSION_TTL_SECONDS * 1000,
  };
  const encodedPayload = toBase64Url(
    textEncoder.encode(JSON.stringify(payload)),
  );
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    textEncoder.encode(encodedPayload),
  );
  return `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
};

const verifySignedAdminSessionToken = async (
  token: string,
  secret: string,
  now: number,
): Promise<AdminPrincipal | null> => {
  const [encodedPayload, encodedSignature, extra] = token.split('.');
  if (!encodedPayload || !encodedSignature || extra) return null;

  try {
    const key = await importHmacKey(secret);
    const validSignature = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(encodedSignature),
      textEncoder.encode(encodedPayload),
    );
    if (!validSignature) return null;

    const payload = sessionPayloadSchema.safeParse(
      JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload))),
    );
    if (
      !payload.success ||
      payload.data.issuedAt > now ||
      payload.data.expiresAt <= payload.data.issuedAt ||
      payload.data.expiresAt - payload.data.issuedAt >
        ADMIN_SESSION_TTL_SECONDS * 1000 ||
      payload.data.expiresAt <= now
    ) {
      return null;
    }

    return {
      subject: payload.data.subject,
      email: payload.data.email,
      permissions: payload.data.permissions,
      sessionExpiresAt: payload.data.expiresAt,
    };
  } catch {
    return null;
  }
};

export class SignedCookieAdminAuthProvider implements AdminAuthProvider {
  private readonly getSecret: () => string | null | undefined;
  private readonly now: () => number;

  constructor(options: {
    getSecret: () => string | null | undefined;
    now?: () => number;
  }) {
    this.getSecret = options.getSecret;
    this.now = options.now ?? Date.now;
  }

  async authenticate(request: Request): Promise<AdminPrincipal | null> {
    const token = readCookie(request, ADMIN_SESSION_COOKIE_NAME);
    const secret = this.getSecret();
    if (!token || !secret) return null;
    return verifySignedAdminSessionToken(token, secret, this.now());
  }
}

export class InMemoryAdminAuthProvider implements AdminAuthProvider {
  private readonly sessions = new Map<string, AdminPrincipal>();
  private readonly now: () => number;

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

export const createAdminAuthGuard =
  (
    provider: AdminAuthProvider,
    requiredPermission: string = ADMIN_INQUIRIES_PERMISSION,
    now: () => number = Date.now,
  ) =>
  async (request: Request): Promise<AdminAuthResult> => {
    try {
      const principal = await provider.authenticate(request);
      if (!principal || principal.sessionExpiresAt <= now()) {
        const headers = readCookie(request, ADMIN_SESSION_COOKIE_NAME)
          ? { 'Set-Cookie': clearAdminSessionCookie() }
          : undefined;
        return {
          ok: false,
          response: json(unauthorizedResponse, 401, headers),
        };
      }
      if (!principal.permissions.includes(requiredPermission)) {
        return { ok: false, response: json(forbiddenResponse, 403) };
      }

      return { ok: true, principal };
    } catch {
      return { ok: false, response: json(internalErrorResponse, 500) };
    }
  };
