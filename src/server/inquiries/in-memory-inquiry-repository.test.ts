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
});
