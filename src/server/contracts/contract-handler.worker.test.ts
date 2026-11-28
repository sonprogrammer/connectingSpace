import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { InMemoryAdminAuthProvider } from '../auth/admin-auth';
import { createContractHandlers } from './contract-handler';

describe('계약 승인과 프로젝트 전환 로컬 D1 통합', () => {
  it('열람 후 수정한 계약 조건을 보존하고 재승인에도 같은 링크를 반환한다', async () => {
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
    const update = await handlers.updateDraft(
      new Request(`http://localhost/admin/contracts/${result.contract.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${bearer}`,
          Origin: 'http://localhost',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: '수정 계약',
          scope: '전체 페이지 제작',
          totalAmount: 250000,
          schedule: '두 달',
          revisionScope: '3회',
          paymentTerms: '착수금 50%',
          productionMethod: '직접 제작',
          externalCosts: '도메인 비용',
          specialNotes: '다국어 포함',
        }),
      }),
      result.contract.id,
    );
    expect(update.status).toBe(201);
    const revised = (await update.json()) as {
      accessToken: string;
      contract: { id: string };
    };
    const revisedView = await handlers.customerView(
      new Request(`http://localhost/customer/contracts/${revised.accessToken}`),
      revised.accessToken,
    );
    const revisedContract = (await revisedView.json()) as {
      status: string;
      body: string;
    };
    expect(revisedContract).toMatchObject({ status: '승인 대기' });
    expect(revisedContract.body).toContain('총 금액: 250000');
    expect(revisedContract.body).toContain('수정 범위: 3회');
    expect(revisedContract.body).toContain('제작 방식: 직접 제작');
    expect(revisedContract.body).toContain('외부 비용: 도메인 비용');
    expect(revisedContract.body).toContain('다국어 포함');
    const approved = await handlers.approve(
      new Request(
        `http://localhost/customer/contracts/${revised.accessToken}`,
        {
          method: 'POST',
          headers: {
            Origin: 'http://localhost',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ customerName: '합성 고객', consent: true }),
        },
      ),
      revised.accessToken,
    );
    expect(approved.status).toBe(200);
    const approval = await approved.json();
    expect(approval).toMatchObject({
      projectId: expect.any(String),
      projectAccessToken: revised.accessToken,
    });
    const retry = await handlers.approve(
      new Request(
        `http://localhost/customer/contracts/${revised.accessToken}`,
        {
          method: 'POST',
          headers: {
            Origin: 'http://localhost',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerName: '재시도 다른 이름',
            consent: true,
          }),
        },
      ),
      revised.accessToken,
    );
    expect(retry.status).toBe(200);
    expect(await retry.json()).toEqual(approval);
    expect(
      await env.DB.prepare('SELECT approval_identity FROM contracts WHERE id=?')
        .bind(revised.contract.id)
        .first(),
    ).toMatchObject({ approval_identity: '합성 고객' });
    const approvedView = await handlers.customerView(
      new Request(`http://localhost/customer/contracts/${revised.accessToken}`),
      revised.accessToken,
    );
    expect(await approvedView.json()).toMatchObject({ status: '승인 완료' });
    expect(
      await env.DB.prepare(
        'SELECT COUNT(*) AS total FROM projects WHERE contract_id=?',
      )
        .bind(revised.contract.id)
        .first(),
    ).toMatchObject({ total: 1 });
    expect(
      await env.DB.prepare(
        "SELECT COUNT(*) AS total FROM project_access_links WHERE project_id=(SELECT id FROM projects WHERE contract_id=?) AND status='활성'",
      )
        .bind(revised.contract.id)
        .first(),
    ).toMatchObject({ total: 1 });

    await env.DB.prepare(
      "UPDATE projects SET status='완료',completed_at='2026-02-01T00:00:00.000Z' WHERE contract_id=?",
    )
      .bind(revised.contract.id)
      .run();
    await env.DB.prepare(
      "UPDATE contract_access_links SET status='차단' WHERE contract_id=?",
    )
      .bind(revised.contract.id)
      .run();
    const expired = await handlers.customerView(
      new Request(`http://localhost/customer/contracts/${revised.accessToken}`),
      revised.accessToken,
    );
    expect(expired.status).toBe(410);
  });
});
