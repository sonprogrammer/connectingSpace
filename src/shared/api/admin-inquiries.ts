import type {
  AdminInquiryDetail,
  AdminInquiryListParams,
  AdminInquiryListResult,
  AdminInquiryUpdateInput,
} from '../../entities/inquiry/model/admin-inquiry';

export type AdminInquiryApiErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'INTERNAL_ERROR';

const errorMessages: Record<AdminInquiryApiErrorCode, string> = {
  AUTH_REQUIRED: '관리자 인증이 필요합니다.',
  FORBIDDEN: '이 작업을 수행할 권한이 없습니다.',
  NOT_FOUND: '문의를 찾을 수 없습니다.',
  VALIDATION_ERROR: '요청 내용을 확인해 주세요.',
  NETWORK_ERROR: '문의 정보를 불러오지 못했습니다.',
  INTERNAL_ERROR: '문의 정보를 불러오지 못했습니다.',
};

export class AdminInquiryApiError extends Error {
  constructor(
    message: string,
    readonly status: number | undefined,
    readonly code: AdminInquiryApiErrorCode,
  ) {
    super(message);
    this.name = 'AdminInquiryApiError';
  }
}

const getErrorCode = (status: number): AdminInquiryApiErrorCode => {
  if (status === 400) return 'VALIDATION_ERROR';
  if (status === 401) return 'AUTH_REQUIRED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  return 'INTERNAL_ERROR';
};

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      credentials: 'include',
      headers: { Accept: 'application/json', ...init?.headers },
    });
  } catch {
    throw new AdminInquiryApiError(
      errorMessages.NETWORK_ERROR,
      undefined,
      'NETWORK_ERROR',
    );
  }

  if (!response.ok) {
    const code = getErrorCode(response.status);
    throw new AdminInquiryApiError(errorMessages[code], response.status, code);
  }

  return (await response.json()) as T;
};

export const listAdminInquiries = (
  params: AdminInquiryListParams = {},
): Promise<AdminInquiryListResult> => {
  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
  });

  if (params.status) searchParams.set('status', params.status);
  if (params.type) searchParams.set('type', params.type);
  if (params.search?.trim()) searchParams.set('search', params.search.trim());

  return request(`/admin/inquiries?${searchParams.toString()}`);
};

export const getAdminInquiry = (
  inquiryId: string,
): Promise<AdminInquiryDetail> =>
  request(`/admin/inquiries/${encodeURIComponent(inquiryId)}`);

export const updateAdminInquiry = (
  inquiryId: string,
  input: AdminInquiryUpdateInput,
): Promise<AdminInquiryDetail> =>
  request(`/admin/inquiries/${encodeURIComponent(inquiryId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
