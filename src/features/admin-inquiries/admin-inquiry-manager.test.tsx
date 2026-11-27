import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AdminInquiryManager } from './AdminInquiryManager';

const firstSummary = {
  id: '10000000-0000-4000-8000-000000000017',
  businessName: '첫 번째 합성 스튜디오',
  contactName: '김합성',
  type: '견적 문의',
  status: '신규',
  receivedAt: '2026-11-27T00:00:00.000Z',
};

const secondSummary = {
  id: '20000000-0000-4000-8000-000000000017',
  businessName: '검색된 합성 상점',
  contactName: '이검색',
  type: '홈페이지 제작 상담',
  status: '상담 예정',
  receivedAt: '2026-11-27T01:00:00.000Z',
};

const firstDetail = {
  ...firstSummary,
  email: 'synthetic@example.com',
  phone: '010-0000-0017',
  message: '고객이 작성한 합성 문의 내용입니다.',
  desiredSchedule: '2027년 1월',
  budget: '100만 원 이하',
  preferredContactMethod: '이메일',
  adminMemo: '기존 관리자 메모',
  updatedAt: '2026-11-27T00:30:00.000Z',
};

const renderManager = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AdminInquiryManager />
    </QueryClientProvider>,
  );
};

describe('관리자 문의 관리 화면', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('목록에서 문의를 선택해 고객 내용과 내부 메모를 구분해 확인한다', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes(firstSummary.id)) return Response.json(firstDetail);
      return Response.json({
        items: [firstSummary],
        page: 1,
        pageSize: 20,
        total: 1,
      });
    });

    renderManager();

    await user.click(
      await screen.findByRole('button', {
        name: /첫 번째 합성 스튜디오 김합성/,
      }),
    );

    expect(
      await screen.findByText('고객이 작성한 합성 문의 내용입니다.'),
    ).toBeInTheDocument();
    expect(screen.getByText('고객 문의 내용')).toBeInTheDocument();
    expect(
      screen.getByLabelText('관리자 내부 메모 (고객에게 노출되지 않음)'),
    ).toHaveValue('기존 관리자 메모');
  });

  it('검색·상태·유형 필터를 적용하고 첫 페이지 결과를 표시한다', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      const filtered = url.includes('search=%EA%B2%80%EC%83%89');
      return Response.json({
        items: filtered ? [secondSummary] : [firstSummary],
        page: 1,
        pageSize: 20,
        total: 1,
      });
    });

    renderManager();
    expect(
      await screen.findByText('첫 번째 합성 스튜디오'),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('문의 검색'), '검색');
    await user.selectOptions(screen.getByLabelText('상태 필터'), '상담 예정');
    await user.selectOptions(
      screen.getByLabelText('문의 유형 필터'),
      '홈페이지 제작 상담',
    );
    await user.click(screen.getByRole('button', { name: '필터 적용' }));

    expect(await screen.findByText('검색된 합성 상점')).toBeInTheDocument();
    expect(screen.queryByText('첫 번째 합성 스튜디오')).not.toBeInTheDocument();
  });

  it('상태와 내부 메모를 저장하고 성공 상태를 표시한다', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.method === 'PATCH') {
        return Response.json({
          ...firstDetail,
          status: '상담 완료',
          adminMemo: '새 관리자 메모',
        });
      }
      if (url.includes(firstSummary.id)) return Response.json(firstDetail);
      return Response.json({
        items: [firstSummary],
        page: 1,
        pageSize: 20,
        total: 1,
      });
    });

    renderManager();
    await user.click(
      await screen.findByRole('button', {
        name: /첫 번째 합성 스튜디오 김합성/,
      }),
    );
    await screen.findByText('고객 문의 내용');

    await user.selectOptions(screen.getByLabelText('상담 상태'), '상담 완료');
    const memo = screen.getByLabelText(
      '관리자 내부 메모 (고객에게 노출되지 않음)',
    );
    await user.clear(memo);
    await user.type(memo, '새 관리자 메모');
    await user.click(screen.getByRole('button', { name: '변경사항 저장' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      '변경사항을 저장했습니다.',
    );
    expect(screen.getByLabelText('상담 상태')).toHaveValue('상담 완료');
    expect(memo).toHaveValue('새 관리자 메모');
  });

  it.each([
    [401, '관리자 인증이 필요합니다.'],
    [403, '이 작업을 수행할 권한이 없습니다.'],
  ])('%s 응답에서 관리 콘텐츠를 차단한다', async (status, message) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ code: 'AUTH_ERROR', message }, { status }),
    );

    renderManager();

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByText('문의 목록')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '변경사항 저장' }),
    ).not.toBeInTheDocument();
  });

  it('문의가 없으면 빈 상태를 표시한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ items: [], page: 1, pageSize: 20, total: 0 }),
    );

    renderManager();

    expect(
      await screen.findByText('조건에 맞는 문의가 없습니다.'),
    ).toBeInTheDocument();
  });

  it('목록을 불러오는 동안 로딩 상태를 표시한다', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => undefined));

    renderManager();

    expect(screen.getByRole('status')).toHaveTextContent('문의를 불러오는 중');
  });

  it('목록 오류를 안내하고 다시 시도할 수 있다', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({}, { status: 500 }))
      .mockResolvedValueOnce(
        Response.json({
          items: [firstSummary],
          page: 1,
          pageSize: 20,
          total: 1,
        }),
      );

    renderManager();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '문의 정보를 불러오지 못했습니다.',
    );
    await user.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(
      await screen.findByText('첫 번째 합성 스튜디오'),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
