// @vitest-environment node

import { describe, expect, it } from 'vitest';
import type { InquiryCreateInput } from './schema';
import { InMemoryInquiryRepository } from './in-memory-inquiry-repository';

const inquiryInput: InquiryCreateInput = {
  businessName: '합성 스튜디오',
  contactName: '홍길동',
  email: 'synthetic@example.com',
  phone: '010-0000-0000',
  type: '견적 문의',
  message: '합성 데이터로 저장소를 확인합니다.',
};

describe('루트 문의 저장소 계약', () => {
  it('신규 상태와 생성 시각을 포함한 문의를 저장한다', async () => {
    const repository = new InMemoryInquiryRepository({
      now: () => '2026-11-23T00:00:00.000Z',
      idFactory: () => '00000000-0000-4000-8000-000000000001',
    });

    const inquiry = await repository.createIfNotDuplicate(
      inquiryInput,
      '2026-11-22T23:50:00.000Z',
    );

    expect(inquiry).toEqual({
      ...inquiryInput,
      id: '00000000-0000-4000-8000-000000000001',
      status: '신규',
      createdAt: '2026-11-23T00:00:00.000Z',
      updatedAt: '2026-11-23T00:00:00.000Z',
    });
  });

  it('동시에 들어온 동일 문의 중 하나만 저장한다', async () => {
    const repository = new InMemoryInquiryRepository({
      now: () => '2026-11-23T00:00:00.000Z',
    });

    const results = await Promise.all([
      repository.createIfNotDuplicate(inquiryInput, '2026-11-22T23:50:00.000Z'),
      repository.createIfNotDuplicate(inquiryInput, '2026-11-22T23:50:00.000Z'),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await repository.list()).toHaveLength(1);
  });

  it('관리자 목록을 최신순으로 필터링하고 페이지 단위로 반환한다', async () => {
    let now = '2026-11-23T00:00:00.000Z';
    let id = 0;
    const repository = new InMemoryInquiryRepository({
      now: () => now,
      idFactory: () =>
        `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
    });
    await repository.createIfNotDuplicate(
      { ...inquiryInput, businessName: '첫 번째 업체', message: '첫 문의' },
      '2026-11-22T00:00:00.000Z',
    );
    now = '2026-11-23T01:00:00.000Z';
    const newest = await repository.createIfNotDuplicate(
      {
        ...inquiryInput,
        businessName: '검색 대상 업체',
        type: '홈페이지 제작 상담',
        message: '두 번째 문의',
      },
      '2026-11-22T00:00:00.000Z',
    );
    expect(newest).not.toBeNull();
    await repository.update(newest!.id, { status: '상담 예정' });

    const result = await repository.listAdmin({
      page: 1,
      pageSize: 1,
      status: '상담 예정',
      type: '홈페이지 제작 상담',
      search: ' 검색 대상 ',
    });

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: '00000000-0000-4000-8000-000000000002',
          businessName: '검색 대상 업체',
          status: '상담 예정',
        }),
      ],
      page: 1,
      pageSize: 1,
      total: 1,
    });
  });

  it('관리자 목록의 기본 페이지 크기를 20으로 제한한다', async () => {
    let id = 0;
    const repository = new InMemoryInquiryRepository({
      now: () => '2026-11-23T00:00:00.000Z',
      idFactory: () =>
        `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
    });
    for (let index = 1; index <= 21; index += 1) {
      await repository.createIfNotDuplicate(
        { ...inquiryInput, message: `합성 문의 ${index}` },
        '2026-11-22T00:00:00.000Z',
      );
    }

    const result = await repository.listAdmin();

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.total).toBe(21);
    expect(result.items).toHaveLength(20);
    expect(result.items[0]?.id).toBe('00000000-0000-4000-8000-000000000021');
  });

  it('관리자 상태와 메모를 수정하고 빈 메모를 삭제한다', async () => {
    let now = '2026-11-23T00:00:00.000Z';
    const repository = new InMemoryInquiryRepository({
      now: () => now,
      idFactory: () => '00000000-0000-4000-8000-000000000001',
    });
    const created = await repository.createIfNotDuplicate(
      inquiryInput,
      '2026-11-22T00:00:00.000Z',
    );
    expect(created).not.toBeNull();

    now = '2026-11-23T02:00:00.000Z';
    const updated = await repository.update(created!.id, {
      status: '상담 완료',
      adminMemo: '합성 관리자 메모',
    });
    const cleared = await repository.update(created!.id, { adminMemo: null });

    expect(updated).toMatchObject({
      status: '상담 완료',
      adminMemo: '합성 관리자 메모',
      updatedAt: '2026-11-23T02:00:00.000Z',
    });
    expect(cleared?.adminMemo).toBeUndefined();
    expect(await repository.findById(created!.id)).toEqual(cleared);
  });
});
