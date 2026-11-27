import type { InquiryCreateInput } from '../model/inquiry';

export type { InquiryCreateInput } from '../model/inquiry';

export type InquirySubmitResult = {
  id: string;
  status: string;
  receivedAt: string;
};

export type InquiryApiErrorCode =
  'VALIDATION_ERROR' | 'DUPLICATE_INQUIRY' | 'INTERNAL_ERROR' | 'NETWORK_ERROR';

export class InquiryApiError extends Error {
  constructor(
    message: string,
    readonly status: number | undefined,
    readonly code: InquiryApiErrorCode,
  ) {
    super(message);
    this.name = 'InquiryApiError';
  }
}

const errorMessages: Record<InquiryApiErrorCode, string> = {
  VALIDATION_ERROR: '문의 내용을 확인해 주세요.',
  DUPLICATE_INQUIRY: '같은 문의가 최근에 접수되었습니다.',
  INTERNAL_ERROR: '서버에서 요청을 처리하지 못했습니다.',
  NETWORK_ERROR:
    '문의 접수 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
};

const getErrorCode = (status: number, code?: string): InquiryApiErrorCode => {
  if (code === 'DUPLICATE_INQUIRY') return 'DUPLICATE_INQUIRY';
  if (status === 400) return 'VALIDATION_ERROR';
  return 'INTERNAL_ERROR';
};

export const submitInquiry = async (
  input: InquiryCreateInput,
): Promise<InquirySubmitResult> => {
  let response: Response;

  try {
    response = await fetch('/public/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new InquiryApiError(
      errorMessages.NETWORK_ERROR,
      undefined,
      'NETWORK_ERROR',
    );
  }

  if (!response.ok) {
    let payload: { code?: string } = {};

    try {
      payload = await response.json();
    } catch {
      // Use the status-based fallback below when the API body is not JSON.
    }

    const code = getErrorCode(response.status, payload.code);
    throw new InquiryApiError(errorMessages[code], response.status, code);
  }

  return (await response.json()) as InquirySubmitResult;
};
