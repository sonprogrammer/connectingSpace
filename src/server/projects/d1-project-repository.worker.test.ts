import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { D1ProjectRepository } from './repository';

describe('D1ProjectRepository', () => {
  it('승인 계약으로 프로젝트와 해시 링크를 만들고 완료 시 링크를 차단한다', async () => {
    const db = env.DB;
    await db
      .prepare(
        `INSERT INTO inquiries (id, business_name, contact_name, email, phone, type, message, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        'i61',
        '합성 업체',
        '합성 담당자',
        'i61@example.test',
        '010-0000-0061',
        '견적 문의',
        '합성 문의',
        '신규',
        '2026-01-01',
        '2026-01-01',
      )
      .run();
    await db
      .prepare(
        `INSERT INTO contracts (id, inquiry_id, version, status, title, body, scope, total_amount, schedule, revision_scope, payment_terms, production_method, approval_identity, approved_at, created_at, updated_at)
      VALUES (?, ?, 1, '승인됨', ?, ?, ?, 100, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        'c61',
        'i61',
        '테스트 계약',
        '본문',
        '범위',
        '일정',
        '수정',
        '지급',
        '구현',
        '고객 합성 ID',
        '2026-01-02',
        '2026-01-01',
        '2026-01-02',
      )
      .run();
    const repository = new D1ProjectRepository(db);
    const project = {
      id: 'p61',
      inquiryId: 'i61',
      contractId: 'c61',
      name: '합성 업체 제작',
      status: '준비 중' as const,
      productionMethod: '구현',
      startDate: null,
      expectedEndDate: null,
      internalMemo: '',
      createdAt: '2026-01-02',
      updatedAt: '2026-01-02',
    };
    const link = {
      id: 'l61',
      projectId: 'p61',
      tokenHash: 'synthetic-hash-61',
      status: '활성' as const,
      createdAt: '2026-01-02',
      revokedAt: null,
    };
    expect(
      await repository.createProjectAndLink({ project, link }),
    ).toMatchObject({ id: 'p61' });
    expect(
      await repository.createProjectAndLink({
        project: { ...project, id: 'duplicate' },
        link: { ...link, id: 'duplicate-link' },
      }),
    ).toMatchObject({ id: 'p61' });
    expect(
      await repository.completeProjectAndRevokeLinks('p61', '2026-02-01'),
    ).toBe(true);
    expect(
      await db
        .prepare('SELECT status FROM project_access_links WHERE id = ?')
        .bind('l61')
        .first(),
    ).toMatchObject({ status: '차단' });
  });
});
