import { describe, expect, it } from 'vitest';

import {
  inquiryCreateInputSchema,
  inquiryStatusSchema,
  inquiryTypeSchema,
} from './inquiry';

describe('루트 문의 계약', () => {
  it('공유하는 문의 유형과 상태를 검증한다', () => {
    expect(inquiryTypeSchema.safeParse('아임웹 제작 문의').success).toBe(true);
    expect(inquiryTypeSchema.safeParse('지원하지 않는 문의').success).toBe(
      false,
    );
    expect(inquiryStatusSchema.safeParse('상담 완료').success).toBe(true);
    expect(inquiryStatusSchema.safeParse('삭제').success).toBe(false);
  });

  it('유효한 문의 입력을 정규화하고 필드 제한을 적용한다', () => {
    const valid = inquiryCreateInputSchema.safeParse({
      businessName: ' 합성 업체 ',
      contactName: '합성 담당자',
      email: 'synthetic@example.com',
      phone: '010-0000-0000',
      type: '견적 문의',
      message: '합성 문의입니다.',
      currentSiteUrl: 'https://example.com/current',
    });
    const invalid = inquiryCreateInputSchema.safeParse({
      businessName: '',
      contactName: '합성 담당자',
      email: '잘못된 이메일',
      phone: '010-0000-0000',
      type: '견적 문의',
      message: '합성 문의입니다.',
    });

    expect(valid.success && valid.data.businessName).toBe('합성 업체');
    expect(invalid.success).toBe(false);
  });
});
