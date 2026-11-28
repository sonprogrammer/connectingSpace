import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import AdminPage from './page';

describe('관리자 라우트', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('관리자 문의 관리 제목과 인증 보호 상태를 렌더링한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ code: 'UNAUTHORIZED' }, { status: 401 }),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AdminPage />
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole('heading', { name: '관리자 문의 관리' }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '관리자 인증이 필요합니다.',
    );
  });
});
