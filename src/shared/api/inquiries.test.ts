import { afterEach, describe, expect, it, vi } from 'vitest';

import { submitInquiry, type InquiryCreateInput } from './inquiries';

const input: InquiryCreateInput = {
  businessName: '합성 스튜디오',
  contactName: '합성 담당자',
  email: 'synthetic@example.com',
  phone: '010-0000-0000',
  type: '견적 문의',
  message: '합성 문의 내용입니다.',
  desiredSchedule: '2026년 12월',
  budget: '100만 원 이하',
  currentSiteUrl: 'https://example.com/current',
  referenceSiteUrl: 'https://example.com/reference',
  preferredContactMethod: '이메일',
};

describe('문의 API 클라이언트', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('별도 API 주소 설정과 무관하게 같은 출처로 문의를 제출한다', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.example.com/');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'inquiry-id',
          status: '신규',
          receivedAt: '2026-11-23T00:00:00.000Z',
        }),
        { status: 201 },
      ),
    );

    await expect(submitInquiry(input)).resolves.toEqual({
      id: 'inquiry-id',
      status: '신규',
      receivedAt: '2026-11-23T00:00:00.000Z',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/public/inquiries',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );
  });

  it.each([
    [400, 'VALIDATION_ERROR', '문의 내용을 확인해 주세요.'],
    [409, 'DUPLICATE_INQUIRY', '같은 문의가 최근에 접수되었습니다.'],
    [500, 'INTERNAL_ERROR', '서버에서 요청을 처리하지 못했습니다.'],
  ])('API 오류 %s를 사용자 문구로 변환한다', async (status, code, message) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code, message }), { status }),
    );

    await expect(submitInquiry(input)).rejects.toMatchObject({
      message,
      status,
      code,
    });
  });

  it('네트워크 오류를 일반 문의 실패 문구로 변환한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    await expect(submitInquiry(input)).rejects.toMatchObject({
      message: '문의 접수 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
      code: 'NETWORK_ERROR',
    });
  });
});
