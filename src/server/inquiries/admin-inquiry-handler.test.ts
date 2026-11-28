// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  ADMIN_SESSION_COOKIE_NAME,
  createSignedAdminSessionToken,
  InMemoryAdminAuthProvider,
  SignedCookieAdminAuthProvider,
} from '../auth/admin-auth';
import { createAdminInquiryHandlers } from './admin-inquiry-handler';
import { InMemoryInquiryRepository } from './in-memory-inquiry-repository';
import type { InquiryCreateInput } from './schema';

const inquiryInput: InquiryCreateInput = {
  businessName: '합성 스튜디오',
  contactName: '합성 담당자',
  email: 'synthetic@example.com',
  phone: '010-0000-0000',
  type: '견적 문의',
  message: '합성 관리자 API 테스트 문의입니다.',
};

const createAuthorizedHandlers = (repository: InMemoryInquiryRepository) => {
  const provider = new InMemoryAdminAuthProvider();
  const token = provider.createSession({
    subject: 'synthetic-admin',
    email: 'synthetic-admin@example.com',
    permissions: ['admin:inquiries'],
  });
  return {
    handlers: createAdminInquiryHandlers({
      getRepository: () => repository,
      authProvider: provider,
    }),
    headers: { Authorization: `Bearer ${token}` },
  };
};

describe('루트 Worker 관리자 문의 API', () => {
  it('로그인 API와 같은 서명 쿠키로 문의 목록에 접근한다', async () => {
    const now = 1_700_000_000_000;
    const secret = 'synthetic-session-secret-at-least-32-characters';
    const token = await createSignedAdminSessionToken(
      {
        subject: 'synthetic-admin@example.com',
        email: 'synthetic-admin@example.com',
        permissions: ['admin:inquiries'],
      },
      secret,
      now,
    );
    const handlers = createAdminInquiryHandlers({
      getRepository: () => new InMemoryInquiryRepository(),
      authProvider: new SignedCookieAdminAuthProvider({
        getSecret: () => secret,
        now: () => now,
      }),
      now: () => now,
    });

    const response = await handlers.list(
      new Request('http://localhost/admin/inquiries', {
        headers: { Cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}` },
      }),
    );

    expect(response.status).toBe(200);
  });

  it('입력 검증 전에 인증 없음 401과 권한 없음 403을 반환한다', async () => {
    const repository = new InMemoryInquiryRepository();
    const unauthenticated = createAdminInquiryHandlers({
      getRepository: () => repository,
      authProvider: new InMemoryAdminAuthProvider(),
    });
    const viewerProvider = new InMemoryAdminAuthProvider();
    const viewerToken = viewerProvider.createSession({
      subject: 'synthetic-viewer',
      email: 'synthetic-viewer@example.com',
      permissions: ['admin:read-only'],
    });
    const forbidden = createAdminInquiryHandlers({
      getRepository: () => repository,
      authProvider: viewerProvider,
    });

    const unauthorizedResponse = await unauthenticated.list(
      new Request('http://localhost/admin/inquiries?page=0'),
    );
    const forbiddenResponse = await forbidden.list(
      new Request('http://localhost/admin/inquiries', {
        headers: { Authorization: `Bearer ${viewerToken}` },
      }),
    );

    expect(unauthorizedResponse.status).toBe(401);
    expect(forbiddenResponse.status).toBe(403);
  });

  it('문의 목록을 최신순으로 검색·상태·유형 필터링하고 페이지 처리한다', async () => {
    let now = '2026-11-23T00:00:00.000Z';
    let id = 0;
    const repository = new InMemoryInquiryRepository({
      now: () => now,
      idFactory: () =>
        `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
    });
    await repository.createIfNotDuplicate(
      { ...inquiryInput, businessName: '이전 업체', message: '이전 문의' },
      '2026-11-22T00:00:00.000Z',
    );
    now = '2026-11-23T01:00:00.000Z';
    const latest = await repository.createIfNotDuplicate(
      {
        ...inquiryInput,
        businessName: '검색 대상 업체',
        type: '홈페이지 제작 상담',
        message: '최근 문의',
      },
      '2026-11-22T00:00:00.000Z',
    );
    await repository.update(latest!.id, { status: '상담 예정' });
    const { handlers, headers } = createAuthorizedHandlers(repository);

    const response = await handlers.list(
      new Request(
        'http://localhost/admin/inquiries?page=1&pageSize=1&status=%EC%83%81%EB%8B%B4+%EC%98%88%EC%A0%95&type=%ED%99%88%ED%8E%98%EC%9D%B4%EC%A7%80+%EC%A0%9C%EC%9E%91+%EC%83%81%EB%8B%B4&search=%EA%B2%80%EC%83%89',
        { headers },
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      items: [
        {
          id: '00000000-0000-4000-8000-000000000002',
          businessName: '검색 대상 업체',
          contactName: '합성 담당자',
          type: '홈페이지 제작 상담',
          status: '상담 예정',
          receivedAt: '2026-11-23T01:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 1,
      total: 1,
    });
  });

  it('잘못된 목록 페이지·필터·검색 길이를 400으로 거부한다', async () => {
    const { handlers, headers } = createAuthorizedHandlers(
      new InMemoryInquiryRepository(),
    );
    const urls = [
      'http://localhost/admin/inquiries?page=0',
      'http://localhost/admin/inquiries?pageSize=101',
      'http://localhost/admin/inquiries?status=잘못된상태',
      'http://localhost/admin/inquiries?type=잘못된유형',
      `http://localhost/admin/inquiries?search=${'x'.repeat(101)}`,
    ];

    const responses = await Promise.all(
      urls.map((url) => handlers.list(new Request(url, { headers }))),
    );

    expect(responses.map((response) => response.status)).toEqual([
      400, 400, 400, 400, 400,
    ]);
  });

  it('문의 상세를 반환하고 잘못된 UUID와 없는 문의를 구분한다', async () => {
    const repository = new InMemoryInquiryRepository({
      now: () => '2026-11-23T00:00:00.000Z',
      idFactory: () => '00000000-0000-4000-8000-000000000001',
    });
    const created = await repository.createIfNotDuplicate(
      inquiryInput,
      '2026-11-22T00:00:00.000Z',
    );
    const { handlers, headers } = createAuthorizedHandlers(repository);
    const request = () =>
      new Request('http://localhost/admin/inquiries/id', { headers });

    const success = await handlers.detail(request(), created!.id);
    const invalid = await handlers.detail(request(), 'not-a-uuid');
    const missing = await handlers.detail(
      request(),
      '00000000-0000-4000-8000-000000000099',
    );

    expect(success.status).toBe(200);
    expect(await success.json()).toEqual(
      expect.objectContaining({
        id: created!.id,
        email: 'synthetic@example.com',
        phone: '010-0000-0000',
        message: '합성 관리자 API 테스트 문의입니다.',
      }),
    );
    expect(invalid.status).toBe(400);
    expect(missing.status).toBe(404);
  });

  it('문의 상태와 메모를 수정하고 빈 메모를 삭제한다', async () => {
    const repository = new InMemoryInquiryRepository({
      idFactory: () => '00000000-0000-4000-8000-000000000001',
    });
    const created = await repository.createIfNotDuplicate(
      inquiryInput,
      '2026-11-22T00:00:00.000Z',
    );
    const { handlers, headers } = createAuthorizedHandlers(repository);
    const patch = (body: object) =>
      new Request('http://localhost/admin/inquiries/id', {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          Origin: 'http://localhost',
        },
        body: JSON.stringify(body),
      });

    const updated = await handlers.update(
      patch({ status: '상담 완료', adminMemo: '합성 내부 메모' }),
      created!.id,
    );
    const cleared = await handlers.update(
      patch({ adminMemo: '   ' }),
      created!.id,
    );

    expect(updated.status).toBe(200);
    expect(await updated.json()).toEqual(
      expect.objectContaining({
        status: '상담 완료',
        adminMemo: '합성 내부 메모',
      }),
    );
    expect(await cleared.json()).not.toHaveProperty('adminMemo');
  });

  it('잘못된 JSON·상태·빈 수정 본문과 없는 문의를 거부한다', async () => {
    const { handlers, headers } = createAuthorizedHandlers(
      new InMemoryInquiryRepository(),
    );
    const id = '00000000-0000-4000-8000-000000000099';
    const request = (body: string) =>
      new Request('http://localhost/admin/inquiries/id', {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          Origin: 'http://localhost',
        },
        body,
      });

    const invalidJson = await handlers.update(request('{invalid'), id);
    const invalidStatus = await handlers.update(
      request(JSON.stringify({ status: '잘못된 상태' })),
      id,
    );
    const empty = await handlers.update(request('{}'), id);
    const missing = await handlers.update(
      request(JSON.stringify({ status: '보류' })),
      id,
    );

    expect(invalidJson.status).toBe(400);
    expect(invalidStatus.status).toBe(400);
    expect(empty.status).toBe(400);
    expect(missing.status).toBe(404);
  });

  it('다른 출처의 문의 변경 요청을 403으로 거부한다', async () => {
    const { handlers, headers } = createAuthorizedHandlers(
      new InMemoryInquiryRepository(),
    );
    const response = await handlers.update(
      new Request('http://localhost/admin/inquiries/id', {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          Origin: 'https://attacker.example',
        },
        body: JSON.stringify({ status: '보류' }),
      }),
      '00000000-0000-4000-8000-000000000099',
    );

    expect(response.status).toBe(403);
  });

  it('저장소 오류의 세부 내용을 500 응답에 노출하지 않는다', async () => {
    class FailingRepository extends InMemoryInquiryRepository {
      override async listAdmin(): Promise<never> {
        throw new Error('synthetic database secret');
      }
    }
    const { handlers, headers } = createAuthorizedHandlers(
      new FailingRepository(),
    );

    const response = await handlers.list(
      new Request('http://localhost/admin/inquiries', { headers }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      code: 'INTERNAL_ERROR',
      message: '서버에서 요청을 처리하지 못했습니다.',
    });
  });
});
