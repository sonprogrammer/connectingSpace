import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InquiryApiError, submitInquiry } from '../../shared/api/inquiries';
import { InquiryForm } from './InquiryForm';

vi.mock('../../shared/api/inquiries', () => ({
  InquiryApiError: class InquiryApiError extends Error {},
  submitInquiry: vi.fn(),
}));

const submitInquiryMock = vi.mocked(submitInquiry);

const fillRequiredFields = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText('업체명'), '합성 스튜디오');
  await user.type(screen.getByLabelText('담당자명'), '합성 담당자');
  await user.type(screen.getByLabelText('이메일'), 'synthetic@example.com');
  await user.type(screen.getByLabelText('연락처'), '010-0000-0000');
  await user.selectOptions(screen.getByLabelText('문의 유형'), '견적 문의');
  await user.type(screen.getByLabelText('문의 내용'), '합성 문의 내용입니다.');
};

describe('공개 견적 요청 폼', () => {
  beforeEach(() => {
    submitInquiryMock.mockReset();
  });

  it('필수 입력 필드와 접근 가능한 오류 안내를 제공한다', async () => {
    const user = userEvent.setup();
    render(<InquiryForm />);

    expect(screen.getByLabelText('업체명')).toBeRequired();
    expect(screen.getByLabelText('담당자명')).toBeRequired();
    expect(screen.getByLabelText('이메일')).toBeRequired();
    expect(screen.getByLabelText('연락처')).toBeRequired();
    expect(screen.getByLabelText('문의 유형')).toBeRequired();
    expect(screen.getByLabelText('문의 내용')).toBeRequired();

    await user.click(screen.getByRole('button', { name: '견적 요청 보내기' }));

    expect(submitInquiryMock).not.toHaveBeenCalled();
  });

  it('성공하면 접수 완료 상태를 표시한다', async () => {
    const user = userEvent.setup();
    submitInquiryMock.mockResolvedValue({
      id: 'inquiry-id',
      status: '신규',
      receivedAt: '2026-11-23T00:00:00.000Z',
    });
    render(<InquiryForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: '견적 요청 보내기' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      '문의가 접수되었습니다.',
    );
    expect(screen.getByText(/선택한 연락 방법/)).toBeInTheDocument();
  });

  it('제출 중에는 버튼을 잠그고 중복 요청을 보내지 않는다', async () => {
    const user = userEvent.setup();
    let resolveRequest: (() => void) | undefined;
    submitInquiryMock.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = () =>
          resolve({
            id: 'inquiry-id',
            status: '신규',
            receivedAt: '2026-11-23T00:00:00.000Z',
          });
      }),
    );
    render(<InquiryForm />);

    await fillRequiredFields(user);
    const button = screen.getByRole('button', { name: '견적 요청 보내기' });
    await user.click(button);
    expect(button).toBeDisabled();
    await user.click(button);
    expect(submitInquiryMock).toHaveBeenCalledTimes(1);

    resolveRequest?.();
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        '문의가 접수되었습니다.',
      ),
    );
  });

  it('API 오류를 이해할 수 있는 문구로 표시하고 입력값을 유지한다', async () => {
    const user = userEvent.setup();
    submitInquiryMock.mockRejectedValue(
      new InquiryApiError(
        '같은 문의가 최근에 접수되었습니다.',
        409,
        'DUPLICATE_INQUIRY',
      ),
    );
    render(<InquiryForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: '견적 요청 보내기' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '같은 문의가 최근에 접수되었습니다.',
    );
    expect(screen.getByLabelText('업체명')).toHaveValue('합성 스튜디오');
  });
});
