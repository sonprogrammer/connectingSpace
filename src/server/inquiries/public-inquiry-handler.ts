import {
  inquiryCreatedResponseSchema,
  inquiryCreateInputSchema,
} from './schema';
import type { InquiryRepository } from './repository';

export const MAX_INQUIRY_BODY_BYTES = 16 * 1024;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

const responses = {
  validation: {
    code: 'VALIDATION_ERROR',
    message: '문의 내용을 확인해 주세요.',
  },
  invalidJson: {
    code: 'INVALID_JSON',
    message: 'JSON 형식의 요청만 처리할 수 있습니다.',
  },
  unsupportedMediaType: {
    code: 'UNSUPPORTED_MEDIA_TYPE',
    message: 'Content-Type은 application/json이어야 합니다.',
  },
  requestTooLarge: {
    code: 'REQUEST_TOO_LARGE',
    message: '요청 본문이 허용된 크기를 초과했습니다.',
  },
  duplicate: {
    code: 'DUPLICATE_INQUIRY',
    message: '같은 문의가 최근에 접수되었습니다.',
  },
  internal: {
    code: 'INTERNAL_ERROR',
    message: '서버에서 요청을 처리하지 못했습니다.',
  },
} as const;

const json = (body: object, status: number) => Response.json(body, { status });

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

export type PublicInquiryHandlerOptions = {
  now?: () => number;
  maxBodyBytes?: number;
};

export const createPublicInquiryHandler = (
  getRepository: () => InquiryRepository | null,
  options: PublicInquiryHandlerOptions = {},
) => {
  const now = options.now ?? Date.now;
  const maxBodyBytes = options.maxBodyBytes ?? MAX_INQUIRY_BODY_BYTES;

  return async (request: Request): Promise<Response> => {
    const contentType = request.headers
      .get('content-type')
      ?.split(';', 1)[0]
      .trim()
      .toLowerCase();
    if (contentType !== 'application/json') {
      return json(responses.unsupportedMediaType, 415);
    }

    const contentLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
      return json(responses.requestTooLarge, 413);
    }

    const body = await readBodyWithinLimit(request, maxBodyBytes);
    if (body === null) return json(responses.requestTooLarge, 413);

    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      return json(responses.invalidJson, 400);
    }

    const parsed = inquiryCreateInputSchema.safeParse(payload);
    if (!parsed.success) return json(responses.validation, 400);

    const repository = getRepository();
    if (!repository) return json(responses.internal, 500);

    try {
      const inquiry = await repository.createIfNotDuplicate(
        parsed.data,
        new Date(now() - DUPLICATE_WINDOW_MS).toISOString(),
      );
      if (!inquiry) return json(responses.duplicate, 409);

      return json(
        inquiryCreatedResponseSchema.parse({
          id: inquiry.id,
          status: inquiry.status,
          receivedAt: inquiry.createdAt,
        }),
        201,
      );
    } catch {
      return json(responses.internal, 500);
    }
  };
};
