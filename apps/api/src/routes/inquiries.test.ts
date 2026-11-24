import { describe, expect, it } from 'vitest';
import type { InquiryRepository } from '../entities/inquiry/repository';
import { InMemoryInquiryRepository } from '../entities/inquiry/in-memory-inquiry-repository';
import { createApp } from '../app';
import { InMemoryAdminAuthProvider } from '../auth/admin-auth';

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

const createAdminApp = (repository: InMemoryInquiryRepository) => {
  const provider = new InMemoryAdminAuthProvider();
  const token = provider.createSession({
    subject: 'synthetic-admin',
    email: 'synthetic-admin@example.com',
    permissions: ['admin:inquiries'],
  });
  const app = createApp(repository, undefined, provider);

  return { app, authorization: `Bearer ${token}` };
};

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
      listAdmin: async () => ({ items: [], page: 1, pageSize: 20, total: 0 }),
      update: async () => null,
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

describe('admin inquiry management', () => {
  it('rejects an unauthenticated inquiry list request', async () => {
    const app = createApp(new InMemoryInquiryRepository());

    const response = await app.request('/admin/inquiries');

    expect(response.status).toBe(401);
  });

  it('lists inquiry summaries with filters and pagination', async () => {
    const repository = new InMemoryInquiryRepository({
      now: () => '2026-11-23T00:00:00.000Z',
      idFactory: (() => {
        let index = 0;
        return () => `inquiry-${++index}`;
      })(),
    });
    await repository.create(validInquiry);
    await repository.create({ ...validInquiry, businessName: '다른 업체' });
    const { app, authorization } = createAdminApp(repository);

    const response = await app.request(
      '/admin/inquiries?page=1&pageSize=1&search=다른',
      {
        headers: { Authorization: authorization },
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        expect.objectContaining({
          id: 'inquiry-2',
          businessName: '다른 업체',
          contactName: '합성 담당자',
          type: '견적 문의',
          status: '신규',
          receivedAt: '2026-11-23T00:00:00.000Z',
        }),
      ],
      page: 1,
      pageSize: 1,
      total: 1,
    });
  });

  it('returns inquiry detail with contact and internal memo', async () => {
    const repository = new InMemoryInquiryRepository();
    const created = await repository.create(validInquiry);
    await repository.update(created.id, { adminMemo: '합성 내부 메모' });
    const { app, authorization } = createAdminApp(repository);

    const response = await app.request(`/admin/inquiries/${created.id}`, {
      headers: { Authorization: authorization },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        id: created.id,
        businessName: validInquiry.businessName,
        email: validInquiry.email,
        phone: validInquiry.phone,
        message: validInquiry.message,
        adminMemo: '합성 내부 메모',
      }),
    );
  });

  it('updates inquiry status and internal memo', async () => {
    const repository = new InMemoryInquiryRepository();
    const created = await repository.create(validInquiry);
    const { app, authorization } = createAdminApp(repository);

    const response = await app.request(`/admin/inquiries/${created.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: '상담 완료',
        adminMemo: '상담 완료 메모',
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        id: created.id,
        status: '상담 완료',
        adminMemo: '상담 완료 메모',
      }),
    );
  });

  it('rejects invalid inquiry id and invalid update input', async () => {
    const repository = new InMemoryInquiryRepository();
    const { app, authorization } = createAdminApp(repository);
    const headers = {
      Authorization: authorization,
      'Content-Type': 'application/json',
    };

    const missing = await app.request('/admin/inquiries/missing', { headers });
    const invalidStatus = await app.request('/admin/inquiries/missing', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status: '잘못된 상태' }),
    });
    const emptyUpdate = await app.request('/admin/inquiries/missing', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({}),
    });

    expect(missing.status).toBe(404);
    expect(invalidStatus.status).toBe(400);
    expect(emptyUpdate.status).toBe(400);
  });
});
