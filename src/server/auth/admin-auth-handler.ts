import { z } from 'zod';
import { adminLoginRequestSchema } from '../../shared/api/admin-auth';
import {
  ADMIN_INQUIRIES_PERMISSION,
  clearAdminSessionCookie,
  createAdminAuthGuard,
  createAdminSessionCookie,
  createSignedAdminSessionToken,
  isSameOriginRequest,
  SignedCookieAdminAuthProvider,
} from './admin-auth';

export type AdminAuthConfig = {
  email: string;
  password: string;
  sessionSecret: string;
};

export type AdminAuthHandlerDependencies = {
  getConfig: () => AdminAuthConfig | null;
  now?: () => number;
};

const configSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(256),
  sessionSecret: z.string().min(32),
});

const validationErrorResponse = {
  code: 'VALIDATION_ERROR',
  message: '요청 내용을 확인해 주세요.',
} as const;

const unauthorizedLoginResponse = {
  code: 'UNAUTHORIZED',
  message: '이메일 또는 비밀번호를 확인해 주세요.',
} as const;

const internalErrorResponse = {
  code: 'INTERNAL_ERROR',
  message: '서버에서 요청을 처리하지 못했습니다.',
} as const;

const forbiddenResponse = {
  code: 'FORBIDDEN',
  message: '허용되지 않은 출처의 요청입니다.',
} as const;

const requestTooLargeResponse = {
  code: 'REQUEST_TOO_LARGE',
  message: '요청 본문이 너무 큽니다.',
} as const;

const MAX_ADMIN_LOGIN_BODY_BYTES = 4 * 1024;

const json = (body: object, status: number, headers?: HeadersInit) => {
  const responseHeaders = new Headers(headers);
  responseHeaders.set('Cache-Control', 'no-store');
  return Response.json(body, { status, headers: responseHeaders });
};

const digest = (value: string) =>
  crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));

const secureEqual = async (left: string, right: string): Promise<boolean> => {
  const [leftDigest, rightDigest] = await Promise.all([
    digest(left),
    digest(right),
  ]);
  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
};

export const createAdminAuthHandlers = ({
  getConfig,
  now = Date.now,
}: AdminAuthHandlerDependencies) => {
  const readConfig = () => {
    try {
      const config = getConfig();
      const parsed = configSchema.safeParse(config);
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  };

  const login = async (request: Request): Promise<Response> => {
    if (!isSameOriginRequest(request)) return json(forbiddenResponse, 403);

    const contentLength = Number(request.headers.get('content-length'));
    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_ADMIN_LOGIN_BODY_BYTES
    ) {
      return json(requestTooLargeResponse, 413);
    }

    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch {
      return json(validationErrorResponse, 400);
    }

    if (
      new TextEncoder().encode(rawBody).byteLength > MAX_ADMIN_LOGIN_BODY_BYTES
    ) {
      return json(requestTooLargeResponse, 413);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json(validationErrorResponse, 400);
    }

    const loginRequest = adminLoginRequestSchema.safeParse(payload);
    if (!loginRequest.success) return json(validationErrorResponse, 400);

    const config = readConfig();
    if (!config) return json(internalErrorResponse, 500);

    const [emailMatches, passwordMatches] = await Promise.all([
      secureEqual(loginRequest.data.email, config.email),
      secureEqual(loginRequest.data.password, config.password),
    ]);
    if (!emailMatches || !passwordMatches) {
      return json(unauthorizedLoginResponse, 401, {
        'Set-Cookie': clearAdminSessionCookie(),
      });
    }

    try {
      const issuedAt = now();
      const token = await createSignedAdminSessionToken(
        {
          subject: config.email,
          email: config.email,
          permissions: [ADMIN_INQUIRIES_PERMISSION],
        },
        config.sessionSecret,
        issuedAt,
      );
      const expiresAt = issuedAt + 7 * 24 * 60 * 60 * 1000;
      return json(
        { authenticated: true, expiresAt: new Date(expiresAt).toISOString() },
        200,
        { 'Set-Cookie': createAdminSessionCookie(token) },
      );
    } catch {
      return json(internalErrorResponse, 500);
    }
  };

  const logout = async (request: Request): Promise<Response> => {
    if (!isSameOriginRequest(request)) return json(forbiddenResponse, 403);
    return json({ authenticated: false }, 200, {
      'Set-Cookie': clearAdminSessionCookie(),
    });
  };

  const session = async (request: Request): Promise<Response> => {
    const config = readConfig();
    if (!config) return json(internalErrorResponse, 500);

    const provider = new SignedCookieAdminAuthProvider({
      getSecret: () => config.sessionSecret,
      now,
    });
    const auth = await createAdminAuthGuard(
      provider,
      ADMIN_INQUIRIES_PERMISSION,
      now,
    )(request);
    if (!auth.ok) return auth.response;

    return json(
      {
        authenticated: true,
        expiresAt: new Date(auth.principal.sessionExpiresAt).toISOString(),
      },
      200,
    );
  };

  return { login, logout, session };
};
