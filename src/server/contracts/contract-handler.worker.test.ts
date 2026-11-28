import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { InMemoryAdminAuthProvider } from '../auth/admin-auth';
import { createContractHandlers } from './contract-handler';

describe('계약 승인과 프로젝트 전환 로컬 D1 통합', () => {
  it('계약을 만들고 열람·승인해 프로젝트와 링크를 발급한다', async () => {
    const inquiryId = '00000000-0000-4000-8000-000000000061';
    await env.DB.prepare(
      `INSERT INTO inquiries (id,business_name,contact_name,email,phone,type,message,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    )
      .bind(
        inquiryId,
        '합성 사업체',
        '합성 담당자',
        'c61@example.test',
        '010-0000-0061',
        '견적 문의',
        '합성 계약 전환 문의',
        '신규',
        '2026-01-01',
        '2026-01-01',
      )
      .run();
    const provider = new InMemoryAdminAuthProvider();
    const bearer = provider.createSession({
      subject: 'synthetic',
      email: 'synthetic@example.test',
      permissions: ['admin:inquiries'],
    });
    let id = 0;
    const handlers = createContractHandlers({
      db: env.DB,
      authProvider: provider,
      now: () => `2026-01-0${++id}T00:00:00.000Z`,
      id: () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
    });
    const request = new Request(
      `http://localhost/admin/inquiries/${inquiryId}/contracts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${bearer}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '합성 계약',
          scope: '페이지 제작',
          totalAmount: 100000,
          schedule: '한 달',
          revisionScope: '2회',
          paymentTerms: '착수금',
          productionMethod: '직접 제작',
        }),
      },
    );
    const created = await handlers.createDraft(request, inquiryId);
    expect(created.status).toBe(201);
    const result = (await created.json()) as {
      accessToken: string;
      contract: { id: string };
    };
    const viewed = await handlers.customerView(
      new Request(`http://localhost/customer/contracts/${result.accessToken}`),
      result.accessToken,
    );
    expect(viewed.status).toBe(200);
    const approved = await handlers.approve(
      new Request(`http://localhost/customer/contracts/${result.accessToken}`, {
        method: 'POST',
        headers: {
          Origin: 'http://localhost',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerName: '합성 고객', consent: true }),
      }),
      result.accessToken,
    );
    expect(approved.status).toBe(200);
    expect(await approved.json()).toMatchObject({
      projectId: expect.any(String),
      projectAccessToken: expect.any(String),
    });
    expect(
      await env.DB.prepare(
        'SELECT COUNT(*) AS total FROM projects WHERE contract_id=?',
      )
        .bind(result.contract.id)
        .first(),
    ).toMatchObject({ total: 1 });
  });
});
