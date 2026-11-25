import { describe, expect, it } from 'vitest';

import {
  inquiryFormDefaults,
  inquiryFormSchema,
  inquiryTypeOptions,
  preferredContactOptions,
  toInquiryPayload,
} from './form';

describe('견적 요청 폼 모델', () => {
  it('필수값 누락·공백·잘못된 이메일을 거부한다', () => {
    const result = inquiryFormSchema.safeParse({
      ...inquiryFormDefaults,
      businessName: ' ',
      contactName: '',
      email: 'not-email',
    });

    expect(result.success).toBe(false);
  });

  it('유효한 폼 데이터를 API payload로 변환한다', () => {
    const form = {
      ...inquiryFormDefaults,
      businessName: '합성 스튜디오',
      contactName: '합성 담당자',
      email: 'synthetic@example.com',
      phone: '010-0000-0000',
      type: '견적 문의' as const,
      message: '합성 문의 내용입니다.',
      desiredSchedule: '',
      currentSiteUrl: 'https://example.com',
    };

    const parsed = inquiryFormSchema.parse(form);
    expect(toInquiryPayload(parsed)).toEqual({
      businessName: '합성 스튜디오',
      contactName: '합성 담당자',
      email: 'synthetic@example.com',
      phone: '010-0000-0000',
      type: '견적 문의',
      message: '합성 문의 내용입니다.',
      currentSiteUrl: 'https://example.com',
    });
  });

  it('API 계약에 맞는 문의 유형과 연락 방법 선택지를 제공한다', () => {
    expect(inquiryTypeOptions).toContain('견적 문의');
    expect(inquiryTypeOptions).toContain('아임웹 제작 문의');
    expect(preferredContactOptions).toEqual(['전화', '이메일', '카카오톡']);
  });
});
