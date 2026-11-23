import { describe, expect, it } from 'vitest';
import type { InquiryRepository } from '../entities/inquiry/repository';
import { InMemoryInquiryRepository } from '../entities/inquiry/in-memory-inquiry-repository';
import { createApp } from '../app';

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

describe('POST /public/inquiries', () => {
  it('validates and stores a valid inquiry', async () => {
    const repository = new InMemoryInquiryRepository({
      now: () => '2026-11-23T00:00:00.000Z',
    });
    const app = createApp(repository, {
      now: () => new Date('2026-11-23T00:05:00.000Z').getTime(),
    });

    const response = await app.request(request(JSON.stringify(validInquiry)));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      status: '신규',
      receivedAt: '2026-11-23T00:00:00.000Z',
    });
    expect(await repository.list()).toHaveLength(1);
  });

  it('rejects invalid JSON, missing fields, and non-JSON content types', async () => {
    const repository = new InMemoryInquiryRepository();
    const app = createApp(repository);

    const invalidJson = await app.request(request('{invalid'));
    const missingField = await app.request(
      request(JSON.stringify({ ...validInquiry, email: '' })),
    );
    const wrongContentType = await app.request(
      request(JSON.stringify(validInquiry), { 'Content-Type': 'text/plain' }),
    );

    expect(invalidJson.status).toBe(400);
    expect(missingField.status).toBe(400);
    expect(wrongContentType.status).toBe(415);
    expect(await repository.list()).toHaveLength(0);
  });

  it('rejects an oversized request body', async () => {
    const app = createApp(new InMemoryInquiryRepository());
    const response = await app.request(
      request(JSON.stringify({ ...validInquiry, message: 'x'.repeat(20_000) })),
    );

    expect(response.status).toBe(413);
  });

  it('rejects a recent duplicate inquiry', async () => {
    const repository = new InMemoryInquiryRepository({
      now: () => '2026-11-23T00:00:00.000Z',
    });
    const app = createApp(repository, {
      now: () => new Date('2026-11-23T00:05:00.000Z').getTime(),
    });

    const first = await app.request(request(JSON.stringify(validInquiry)));
    const duplicate = await app.request(request(JSON.stringify(validInquiry)));

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(await repository.list()).toHaveLength(1);
  });

  it('stores only one inquiry when identical requests arrive concurrently', async () => {
    const repository = new InMemoryInquiryRepository({
      now: () => '2026-11-23T00:00:00.000Z',
    });
    const app = createApp(repository, {
      now: () => new Date('2026-11-23T00:05:00.000Z').getTime(),
    });

    const responses = await Promise.all([
      app.request(request(JSON.stringify(validInquiry))),
      app.request(request(JSON.stringify(validInquiry))),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    expect(await repository.list()).toHaveLength(1);
  });

  it('hides repository error details from the response', async () => {
    const repository: InquiryRepository = {
      create: async () => {
        throw new Error('synthetic database secret');
      },
      list: async () => [],
      findById: async () => null,
      findDuplicate: async () => null,
      createIfNotDuplicate: async () => {
        throw new Error('synthetic database secret');
      },
    };
    const app = createApp(repository);

    const response = await app.request(request(JSON.stringify(validInquiry)));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      code: 'INTERNAL_ERROR',
      message: '서버에서 요청을 처리하지 못했습니다.',
    });
  });
});
