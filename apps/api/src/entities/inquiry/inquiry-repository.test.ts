import { describe, expect, it } from 'vitest';
import type { InquiryCreateInput } from '@connecting-space/shared';
import { InMemoryInquiryRepository } from './in-memory-inquiry-repository';

const inquiryInput: InquiryCreateInput = {
  businessName: '합성 스튜디오',
  contactName: '홍길동',
  email: 'synthetic@example.com',
  phone: '010-0000-0000',
  type: '견적 문의',
  message: '합성 데이터로 저장소를 확인합니다.',
  desiredSchedule: '2026년 12월',
  budget: '100만 원 이하',
  currentSiteUrl: 'https://example.com/current',
  referenceSiteUrl: 'https://example.com/reference',
  preferredContactMethod: '이메일',
};

describe('InMemoryInquiryRepository', () => {
  it('creates an inquiry with the default 신규 status', async () => {
    const repository = new InMemoryInquiryRepository({
      now: () => '2026-11-23T00:00:00.000Z',
    });

    const inquiry = await repository.create(inquiryInput);

    expect(inquiry).toMatchObject({
      ...inquiryInput,
      status: '신규',
      createdAt: '2026-11-23T00:00:00.000Z',
      updatedAt: '2026-11-23T00:00:00.000Z',
    });
    expect(inquiry.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('lists inquiries and finds an inquiry by id', async () => {
    const repository = new InMemoryInquiryRepository({
      now: () => '2026-11-23T00:00:00.000Z',
    });

    const created = await repository.create(inquiryInput);
    const list = await repository.list();
    const detail = await repository.findById(created.id);

    expect(list).toHaveLength(1);
    expect(list[0]).toEqual(created);
    expect(detail).toEqual(created);
  });
});
