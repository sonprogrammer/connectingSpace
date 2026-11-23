import { inquiryCreateInputSchema } from '@connecting-space/shared';
import type { Context } from 'hono';
import type { AppEnv } from '../app';
import { D1InquiryRepository } from '../entities/inquiry/d1-inquiry-repository';
import type { InquiryRepository } from '../entities/inquiry/repository';

export const MAX_INQUIRY_BODY_BYTES = 16 * 1024;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

const validationErrorResponse = {
  code: 'VALIDATION_ERROR',
  message: '문의 내용을 확인해 주세요.',
} as const;

const invalidJsonResponse = {
  code: 'INVALID_JSON',
  message: 'JSON 형식의 요청만 처리할 수 있습니다.',
} as const;

const unsupportedMediaTypeResponse = {
  code: 'UNSUPPORTED_MEDIA_TYPE',
  message: 'Content-Type은 application/json이어야 합니다.',
} as const;

const requestTooLargeResponse = {
  code: 'REQUEST_TOO_LARGE',
  message: '요청 본문이 허용된 크기를 초과했습니다.',
} as const;

const duplicateErrorResponse = {
  code: 'DUPLICATE_INQUIRY',
  message: '같은 문의가 최근에 접수되었습니다.',
} as const;

const internalErrorResponse = {
  code: 'INTERNAL_ERROR',
  message: '서버에서 요청을 처리하지 못했습니다.',
} as const;

const readBodyWithinLimit = async (
  request: Request,
  maxBodyBytes: number,
): Promise<string | null> => {
  if (!request.body) return '';

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let byteLength = 0;
  let body = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      byteLength += value.byteLength;
      if (byteLength > maxBodyBytes) {
        await reader.cancel();
        return null;
      }
      body += decoder.decode(value, { stream: true });
    }

    return body + decoder.decode();
  } finally {
    reader.releaseLock();
  }
};

export type InquiryRouteOptions = {
  now?: () => number;
  maxBodyBytes?: number;
};

const getRepository = (
  context: Context<AppEnv>,
  repository?: InquiryRepository,
): InquiryRepository | null => {
  if (repository) return repository;
  return context.env.DB ? new D1InquiryRepository(context.env.DB) : null;
};

export const registerInquiryRoutes = (
  app: import('hono').Hono<AppEnv>,
  repository?: InquiryRepository,
  options: InquiryRouteOptions = {},
) => {
  const now = options.now ?? Date.now;
  const maxBodyBytes = options.maxBodyBytes ?? MAX_INQUIRY_BODY_BYTES;

  app.post('/public/inquiries', async (c) => {
    const contentType = c.req
      .header('content-type')
      ?.split(';', 1)[0]
      .trim()
      .toLowerCase();
    if (contentType !== 'application/json') {
      return c.json(unsupportedMediaTypeResponse, 415);
    }

    const contentLength = Number(c.req.header('content-length'));
    if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
      return c.json(requestTooLargeResponse, 413);
    }

    const body = await readBodyWithinLimit(c.req.raw, maxBodyBytes);
    if (body === null) {
      return c.json(requestTooLargeResponse, 413);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      return c.json(invalidJsonResponse, 400);
    }

    const parsed = inquiryCreateInputSchema.safeParse(payload);
    if (!parsed.success) {
      return c.json(validationErrorResponse, 400);
    }

    const inquiryRepository = getRepository(c, repository);
    if (!inquiryRepository) {
      return c.json(internalErrorResponse, 500);
    }

    try {
      const inquiry = await inquiryRepository.createIfNotDuplicate(
        parsed.data,
        new Date(now() - DUPLICATE_WINDOW_MS).toISOString(),
      );
      if (!inquiry) {
        return c.json(duplicateErrorResponse, 409);
      }

      return c.json(
        {
          id: inquiry.id,
          status: inquiry.status,
          receivedAt: inquiry.createdAt,
        },
        201,
      );
    } catch {
      return c.json(internalErrorResponse, 500);
    }
  });
};
