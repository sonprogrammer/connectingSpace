import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { D1InquiryRepository } from './d1-inquiry-repository';

describe('실제 로컬 D1 문의 저장소', () => {
  it('마이그레이션 후 목록·검색·상세·상태·메모 수정과 삭제를 처리한다', async () => {
    await env.DB.prepare(
      `INSERT INTO inquiries (
        id, business_name, contact_name, email, phone, type, message,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        '00000000-0000-4000-8000-000000000053',
        '이전 합성 업체',
        '이전 담당자',
        'previous@example.com',
        '010-0000-0053',
        '견적 문의',
        '이전 합성 문의',
        '신규',
        '2026-11-27T07:00:00.000Z',
        '2026-11-27T07:00:00.000Z',
      )
      .run();
    await env.DB.prepare(
      `INSERT INTO inquiries (
        id, business_name, contact_name, email, phone, type, message,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        '00000000-0000-4000-8000-000000000054',
        '50%_완료\\ 합성 업체',
        '합성 담당자',
        'issue54@example.com',
        '010-0000-0054',
        '홈페이지 제작 상담',
        '이슈 54 로컬 D1 통합 문의',
        '상담 예정',
        '2026-11-27T08:00:00.000Z',
        '2026-11-27T08:00:00.000Z',
      )
      .run();
    const repository = new D1InquiryRepository(
      env.DB,
      () => '2026-11-27T09:00:00.000Z',
    );

    const list = await repository.listAdmin({
      page: 1,
      pageSize: 1,
      status: '상담 예정',
      type: '홈페이지 제작 상담',
      search: '50%_완료\\',
    });
    const detail = await repository.findById(
      '00000000-0000-4000-8000-000000000054',
    );
    const updated = await repository.update(
      '00000000-0000-4000-8000-000000000054',
      { status: '상담 완료', adminMemo: '합성 내부 메모' },
    );
    const cleared = await repository.update(
      '00000000-0000-4000-8000-000000000054',
      { adminMemo: null },
    );
    const missing = await repository.update(
      '00000000-0000-4000-8000-000000000099',
      { status: '보류' },
    );

    expect(list).toEqual({
      items: [expect.objectContaining({ id: detail?.id })],
      page: 1,
      pageSize: 1,
      total: 1,
    });
    expect(detail).toMatchObject({
      id: '00000000-0000-4000-8000-000000000054',
      businessName: '50%_완료\\ 합성 업체',
      status: '상담 예정',
    });
    expect(updated).toMatchObject({
      status: '상담 완료',
      adminMemo: '합성 내부 메모',
      updatedAt: '2026-11-27T09:00:00.000Z',
    });
    expect(cleared?.adminMemo).toBeUndefined();
    expect(missing).toBeNull();
  });
});
