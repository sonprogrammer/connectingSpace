import { Hono } from 'hono';
import {
  healthResponseSchema,
  type ErrorResponse,
} from '@connecting-space/shared';

export type AppBindings = {
  DB?: D1Database;
};

export type AppEnv = {
  Bindings: AppBindings;
};

export const app = new Hono<AppEnv>();

const notFoundResponse = {
  code: 'NOT_FOUND',
  message: '요청한 경로를 찾을 수 없습니다.',
} satisfies ErrorResponse;

const internalErrorResponse = {
  code: 'INTERNAL_ERROR',
  message: '서버에서 요청을 처리하지 못했습니다.',
} satisfies ErrorResponse;

app.get('/health', (c) => {
  const response = healthResponseSchema.parse({
    status: 'ok',
    service: 'api',
  });

  return c.json(response, 200);
});

app.notFound((c) => c.json(notFoundResponse, 404));

app.onError((_error, c) => {
  console.error('Unhandled API error');

  return c.json(internalErrorResponse, 500);
});
