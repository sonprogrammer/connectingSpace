// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { InMemoryInquiryRepository } from './in-memory-inquiry-repository';
import { createPublicInquiryHandler } from './public-inquiry-handler';
import type { InquiryRepository } from './repository';

const validInquiry = {
  businessName: '합성 스튜디오',
  contactName: '합성 담당자',
  email: 'synthetic@example.com',
  phone: '010-0000-0000',
  type: '견적 문의',
  message: '합성 문의 내용입니다.',
  desiredSchedule: '2026년 12월',
  budget: '100만 원 이하',
  currentSiteUrl: 'https://example.com/current',
  referenceSiteUrl: 'https://example.com/reference',
  preferredContactMethod: '이메일',
} as const;

const request = (
  body: string,
  headers: HeadersInit = { 'Content-Type': 'application/json' },
) =>
  new Request('http://localhost/public/inquiries', {
    method: 'POST',
    headers,
    body,
  });

describe('루트 Worker 공개 문의 경계', () => {
  it('유효한 문의를 저장하고 공개 응답 계약을 반환한다', async () => {
    const repository = new InMemoryInquiryRepository({
      now: () => '2026-11-23T00:00:00.000Z',
      idFactory: () => '00000000-0000-4000-8000-000000000001',
    });
    const handler = createPublicInquiryHandler(() => repository, {
      now: () => new Date('2026-11-23T00:05:00.000Z').getTime(),
    });

    const response = await handler(request(JSON.stringify(validInquiry)));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      status: '신규',
      receivedAt: '2026-11-23T00:00:00.000Z',
    });
    expect(await repository.list()).toHaveLength(1);
  });

  it('잘못된 JSON, 유효하지 않은 입력, JSON이 아닌 요청을 거부한다', async () => {
    const repository = new InMemoryInquiryRepository();
    const handler = createPublicInquiryHandler(() => repository);

    const invalidJson = await handler(request('{invalid'));
    const invalidInput = await handler(
      request(JSON.stringify({ ...validInquiry, email: '' })),
    );
    const wrongContentType = await handler(
      request(JSON.stringify(validInquiry), { 'Content-Type': 'text/plain' }),
    );

    expect(invalidJson.status).toBe(400);
    expect(await invalidJson.json()).toEqual({
      code: 'INVALID_JSON',
      message: 'JSON 형식의 요청만 처리할 수 있습니다.',
    });
    expect(invalidInput.status).toBe(400);
    expect(wrongContentType.status).toBe(415);
    expect(await repository.list()).toHaveLength(0);
  });

  it('제한보다 큰 요청 본문을 거부한다', async () => {
    const handler = createPublicInquiryHandler(
      () => new InMemoryInquiryRepository(),
    );

    const response = await handler(
      request(JSON.stringify({ ...validInquiry, message: 'x'.repeat(20_000) })),
    );

    expect(response.status).toBe(413);
  });

  it('10분 안에 들어온 동일한 문의를 중복으로 거부한다', async () => {
    const repository = new InMemoryInquiryRepository({
      now: () => '2026-11-23T00:00:00.000Z',
    });
    const handler = createPublicInquiryHandler(() => repository, {
      now: () => new Date('2026-11-23T00:05:00.000Z').getTime(),
    });

    const first = await handler(request(JSON.stringify(validInquiry)));
    const duplicate = await handler(request(JSON.stringify(validInquiry)));

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toEqual({
      code: 'DUPLICATE_INQUIRY',
      message: '같은 문의가 최근에 접수되었습니다.',
    });
    expect(await repository.list()).toHaveLength(1);
  });

  it('D1 바인딩 또는 저장소 오류의 세부 내용을 응답에 노출하지 않는다', async () => {
    const unavailable = createPublicInquiryHandler(() => null);
    const failingRepository: InquiryRepository = {
      createIfNotDuplicate: async () => {
        throw new Error('synthetic database secret');
      },
      listAdmin: async () => ({ items: [], page: 1, pageSize: 20, total: 0 }),
      findById: async () => null,
      update: async () => null,
    };
    const failing = createPublicInquiryHandler(() => failingRepository);

    const unavailableResponse = await unavailable(
      request(JSON.stringify(validInquiry)),
    );
    const failingResponse = await failing(
      request(JSON.stringify(validInquiry)),
    );

    expect(unavailableResponse.status).toBe(500);
    expect(failingResponse.status).toBe(500);
    expect(await failingResponse.json()).toEqual({
      code: 'INTERNAL_ERROR',
      message: '서버에서 요청을 처리하지 못했습니다.',
    });
  });
});
