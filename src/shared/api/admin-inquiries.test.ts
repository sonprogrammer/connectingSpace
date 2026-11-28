import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AdminInquiryApiError,
  getAdminInquiry,
  listAdminInquiries,
  updateAdminInquiry,
} from './admin-inquiries';

const summary = {
  id: '10000000-0000-4000-8000-000000000017',
  businessName: '합성 스튜디오',
  contactName: '합성 담당자',
  type: '견적 문의' as const,
  status: '신규' as const,
  receivedAt: '2026-11-27T00:00:00.000Z',
};

const detail = {
  ...summary,
  email: 'synthetic@example.com',
  phone: '010-0000-0017',
  message: '합성 문의 내용입니다.',
  desiredSchedule: '2027년 1월',
  budget: '100만 원 이하',
  currentSiteUrl: 'https://example.com/current',
  referenceSiteUrl: 'https://example.com/reference',
  preferredContactMethod: '이메일',
  adminMemo: '합성 내부 메모',
  updatedAt: '2026-11-27T01:00:00.000Z',
};

describe('관리자 문의 API 클라이언트', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('현재 목록 API 경로에 필터와 페이지 쿼리를 전달한다', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        Response.json({ items: [summary], page: 2, pageSize: 20, total: 21 }),
      );

    await expect(
      listAdminInquiries({
        page: 2,
        pageSize: 20,
        status: '상담 예정',
        type: '홈페이지 제작 상담',
        search: '합성 검색',
      }),
    ).resolves.toEqual({ items: [summary], page: 2, pageSize: 20, total: 21 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/admin/inquiries?page=2&pageSize=20&status=%EC%83%81%EB%8B%B4+%EC%98%88%EC%A0%95&type=%ED%99%88%ED%8E%98%EC%9D%B4%EC%A7%80+%EC%A0%9C%EC%9E%91+%EC%83%81%EB%8B%B4&search=%ED%95%A9%EC%84%B1+%EA%B2%80%EC%83%89',
      { credentials: 'include', headers: { Accept: 'application/json' } },
    );
  });

  it('현재 상세 API 경로에서 문의를 조회한다', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json(detail));

    await expect(getAdminInquiry(summary.id)).resolves.toEqual(detail);
    expect(fetchMock).toHaveBeenCalledWith(`/admin/inquiries/${summary.id}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  });

  it('현재 수정 API 경로에 상태와 내부 메모를 전달한다', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(Response.json({ ...detail, status: '상담 완료' }));

    await updateAdminInquiry(summary.id, {
      status: '상담 완료',
      adminMemo: '저장할 내부 메모',
    });

    expect(fetchMock).toHaveBeenCalledWith(`/admin/inquiries/${summary.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: '상담 완료',
        adminMemo: '저장할 내부 메모',
      }),
    });
  });

  it.each([
    [401, 'AUTH_REQUIRED', '관리자 인증이 필요합니다.'],
    [403, 'FORBIDDEN', '이 작업을 수행할 권한이 없습니다.'],
    [500, 'INTERNAL_ERROR', '문의 정보를 불러오지 못했습니다.'],
  ] as const)(
    '%s 응답을 관리 화면 오류로 변환한다',
    async (status, code, message) => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        Response.json({ code, message: '서버 원문' }, { status }),
      );

      await expect(listAdminInquiries()).rejects.toEqual(
        new AdminInquiryApiError(message, status, code),
      );
    },
  );

  it('네트워크 실패를 안전한 오류로 변환한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    await expect(getAdminInquiry(summary.id)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: '문의 정보를 불러오지 못했습니다.',
    });
  });
});
