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
  currentSiteUrl: 'https://current.example.com',
  referenceSiteUrl: 'https://reference.example.com',
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
    expect(screen.getByText('https://current.example.com')).toBeInTheDocument();
    expect(
      screen.getByText('https://reference.example.com'),
    ).toBeInTheDocument();
    expect(screen.getByText('선호 연락 방법')).toBeInTheDocument();
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

  it('두 번째 페이지에서 필터를 적용하면 page=1로 다시 요청한다', async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        const url = String(input);
        const filtered = url.includes('search=%EA%B2%80%EC%83%89');
        const page = filtered ? 1 : url.includes('page=2') ? 2 : 1;
        return Response.json({
          items: [filtered ? secondSummary : firstSummary],
          page,
          pageSize: 20,
          total: filtered ? 1 : 40,
        });
      });

    renderManager();
    await screen.findByText('첫 번째 합성 스튜디오');
    await user.click(screen.getByRole('button', { name: '다음' }));
    expect(await screen.findByText('2 / 2')).toBeInTheDocument();

    await user.type(screen.getByLabelText('문의 검색'), '검색');
    await user.click(screen.getByRole('button', { name: '필터 적용' }));
    await screen.findByText('검색된 합성 상점');

    const requestedUrls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(requestedUrls.at(-1)).toContain('page=1');
    expect(requestedUrls.at(-1)).toContain('search=%EA%B2%80%EC%83%89');
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

  it('저장 후 현재 목록에서 제외된 문의의 상세 편집기를 닫는다', async () => {
    const user = userEvent.setup();
    let listRequests = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (init?.method === 'PATCH') {
        return Response.json({ ...firstDetail, status: '상담 완료' });
      }
      if (String(input).includes(firstSummary.id))
        return Response.json(firstDetail);
      listRequests += 1;
      return Response.json({
        items: listRequests === 1 ? [firstSummary] : [],
        page: 1,
        pageSize: 20,
        total: listRequests === 1 ? 1 : 0,
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
    await user.click(screen.getByRole('button', { name: '변경사항 저장' }));

    expect(
      await screen.findByText('조건에 맞는 문의가 없습니다.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('목록에서 문의를 선택해 주세요.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '변경사항 저장' }),
    ).not.toBeInTheDocument();
  });

  it('늦은 저장 응답이 다른 문의의 작성 중 메모를 덮어쓰지 않는다', async () => {
    const user = userEvent.setup();
    let resolvePatch!: (response: Response) => void;
    const patchResponse = new Promise<Response>((resolve) => {
      resolvePatch = resolve;
    });
    const secondDetail = {
      ...firstDetail,
      ...secondSummary,
      email: 'second@example.com',
      adminMemo: '두 번째 기존 메모',
    };
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (init?.method === 'PATCH') return patchResponse;
      if (url.includes(firstSummary.id)) return Response.json(firstDetail);
      if (url.includes(secondSummary.id)) return Response.json(secondDetail);
      return Response.json({
        items: [firstSummary, secondSummary],
        page: 1,
        pageSize: 20,
        total: 2,
      });
    });

    renderManager();
    await user.click(
      await screen.findByRole('button', {
        name: /첫 번째 합성 스튜디오 김합성/,
      }),
    );
    await screen.findByText('고객 문의 내용');
    await user.click(screen.getByRole('button', { name: '변경사항 저장' }));
    await user.click(
      screen.getByRole('button', { name: /검색된 합성 상점 이검색/ }),
    );
    const memo = await screen.findByLabelText(
      '관리자 내부 메모 (고객에게 노출되지 않음)',
    );
    await user.clear(memo);
    await user.type(memo, '두 번째 문의 작성 중');

    resolvePatch(Response.json({ ...firstDetail, status: '상담 완료' }));
    await waitFor(() => expect(memo).toHaveValue('두 번째 문의 작성 중'));
    expect(
      screen.queryByText('변경사항을 저장했습니다.'),
    ).not.toBeInTheDocument();
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

  it('상세 조회에서 인증이 만료되면 기존 문의 목록도 즉시 숨긴다', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).includes(firstSummary.id)) {
        return Response.json(
          { code: 'AUTH_REQUIRED', message: '관리자 인증이 필요합니다.' },
          { status: 401 },
        );
      }
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

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '관리자 인증이 필요합니다.',
    );
    expect(screen.queryByText('문의 목록')).not.toBeInTheDocument();
    expect(screen.queryByText('첫 번째 합성 스튜디오')).not.toBeInTheDocument();
  });

  it('저장에서 권한이 거부되면 조회한 상세와 목록을 즉시 숨긴다', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (init?.method === 'PATCH') {
        return Response.json(
          { code: 'FORBIDDEN', message: '이 작업을 수행할 권한이 없습니다.' },
          { status: 403 },
        );
      }
      if (String(input).includes(firstSummary.id))
        return Response.json(firstDetail);
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
    await user.click(screen.getByRole('button', { name: '변경사항 저장' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '이 작업을 수행할 권한이 없습니다.',
    );
    expect(screen.queryByText('문의 목록')).not.toBeInTheDocument();
    expect(screen.queryByText('고객 문의 내용')).not.toBeInTheDocument();
  });

  it('저장 실패 시 작성 중인 상태와 메모를 유지한다', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      if (init?.method === 'PATCH') return Response.json({}, { status: 500 });
      if (String(input).includes(firstSummary.id))
        return Response.json(firstDetail);
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
    await user.type(memo, '실패해도 유지할 메모');
    await user.click(screen.getByRole('button', { name: '변경사항 저장' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '문의 정보를 불러오지 못했습니다.',
    );
    expect(screen.getByLabelText('상담 상태')).toHaveValue('상담 완료');
    expect(memo).toHaveValue('실패해도 유지할 메모');
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
