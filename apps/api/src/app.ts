import { Hono } from 'hono';
import {
  healthResponseSchema,
  type ErrorResponse,
} from '@connecting-space/shared';
import { registerInquiryRoutes } from './routes/inquiries';
import type { InquiryRepository } from './entities/inquiry/repository';
import type { InquiryRouteOptions } from './routes/inquiries';
import {
  ADMIN_INQUIRIES_PERMISSION,
  createAdminAuthMiddleware,
  createUnavailableAdminAuthProvider,
  type AdminAuthProvider,
  type AdminPrincipal,
} from './auth/admin-auth';

export type AppBindings = {
  DB?: D1Database;
};

export type AppEnv = {
  Bindings: AppBindings;
  Variables: {
    admin: AdminPrincipal;
  };
};

const notFoundResponse = {
  code: 'NOT_FOUND',
  message: '요청한 경로를 찾을 수 없습니다.',
} satisfies ErrorResponse;

const internalErrorResponse = {
  code: 'INTERNAL_ERROR',
  message: '서버에서 요청을 처리하지 못했습니다.',
} satisfies ErrorResponse;

export const createApp = (
  repository?: InquiryRepository,
  inquiryRouteOptions?: InquiryRouteOptions,
  adminAuthProvider?: AdminAuthProvider,
) => {
  const app = new Hono<AppEnv>();
  const authProvider =
    adminAuthProvider ?? createUnavailableAdminAuthProvider();

  app.use(
    '/admin/*',
    createAdminAuthMiddleware(authProvider, ADMIN_INQUIRIES_PERMISSION),
  );

  app.get('/health', (c) => {
    const response = healthResponseSchema.parse({
      status: 'ok',
      service: 'api',
    });

    return c.json(response, 200);
  });

  registerInquiryRoutes(app, repository, inquiryRouteOptions);

  app.notFound((c) => c.json(notFoundResponse, 404));

  app.onError((_error, c) => {
    console.error('Unhandled API error');

    return c.json(internalErrorResponse, 500);
  });

  return app;
};

export const app = createApp();
