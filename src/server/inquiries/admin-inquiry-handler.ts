import {
  ADMIN_INQUIRIES_PERMISSION,
  createAdminAuthGuard,
  type AdminAuthProvider,
} from '../auth/admin-auth';
import type { InquiryRecord, InquiryRepository } from './repository';
import {
  adminInquiryListQuerySchema,
  adminInquiryUpdateSchema,
  inquiryIdSchema,
} from './schema';

const validationErrorResponse = {
  code: 'VALIDATION_ERROR',
  message: '요청 내용을 확인해 주세요.',
} as const;

const notFoundResponse = {
  code: 'NOT_FOUND',
  message: '문의를 찾을 수 없습니다.',
} as const;

const internalErrorResponse = {
  code: 'INTERNAL_ERROR',
  message: '서버에서 요청을 처리하지 못했습니다.',
} as const;

const json = (body: object, status: number) => Response.json(body, { status });

const toInquirySummary = (inquiry: InquiryRecord) => ({
  id: inquiry.id,
  businessName: inquiry.businessName,
  contactName: inquiry.contactName,
  type: inquiry.type,
  status: inquiry.status,
  receivedAt: inquiry.createdAt,
});

const toInquiryDetail = (inquiry: InquiryRecord) => ({
  ...toInquirySummary(inquiry),
  email: inquiry.email,
  phone: inquiry.phone,
  message: inquiry.message,
  desiredSchedule: inquiry.desiredSchedule,
  budget: inquiry.budget,
  currentSiteUrl: inquiry.currentSiteUrl,
  referenceSiteUrl: inquiry.referenceSiteUrl,
  preferredContactMethod: inquiry.preferredContactMethod,
  adminMemo: inquiry.adminMemo,
  updatedAt: inquiry.updatedAt,
});

export type AdminInquiryHandlerDependencies = {
  getRepository: () => InquiryRepository | null;
  authProvider: AdminAuthProvider;
  now?: () => number;
};

export const createAdminInquiryHandlers = ({
  getRepository,
  authProvider,
  now,
}: AdminInquiryHandlerDependencies) => {
  const authenticate = createAdminAuthGuard(
    authProvider,
    ADMIN_INQUIRIES_PERMISSION,
    now,
  );

  const getAuthenticatedRepository = async (request: Request) => {
    const auth = await authenticate(request);
    if (!auth.ok) return { ok: false, response: auth.response } as const;

    try {
      const repository = getRepository();
      if (!repository) {
        return {
          ok: false,
          response: json(internalErrorResponse, 500),
        } as const;
      }
      return { ok: true, repository } as const;
    } catch {
      return {
        ok: false,
        response: json(internalErrorResponse, 500),
      } as const;
    }
  };

  const list = async (request: Request): Promise<Response> => {
    const dependency = await getAuthenticatedRepository(request);
    if (!dependency.ok) return dependency.response;

    const url = new URL(request.url);
    const parsed = adminInquiryListQuerySchema.safeParse({
      page: url.searchParams.get('page') ?? undefined,
      pageSize: url.searchParams.get('pageSize') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      type: url.searchParams.get('type') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
    });
    if (!parsed.success) return json(validationErrorResponse, 400);

    try {
      const result = await dependency.repository.listAdmin(parsed.data);
      return json(
        {
          ...result,
          items: result.items.map(toInquirySummary),
        },
        200,
      );
    } catch {
      return json(internalErrorResponse, 500);
    }
  };

  const detail = async (
    request: Request,
    inquiryId: string,
  ): Promise<Response> => {
    const dependency = await getAuthenticatedRepository(request);
    if (!dependency.ok) return dependency.response;

    const id = inquiryIdSchema.safeParse(inquiryId);
    if (!id.success) return json(validationErrorResponse, 400);

    try {
      const inquiry = await dependency.repository.findById(id.data);
      if (!inquiry) return json(notFoundResponse, 404);
      return json(toInquiryDetail(inquiry), 200);
    } catch {
      return json(internalErrorResponse, 500);
    }
  };

  const update = async (
    request: Request,
    inquiryId: string,
  ): Promise<Response> => {
    const dependency = await getAuthenticatedRepository(request);
    if (!dependency.ok) return dependency.response;

    const id = inquiryIdSchema.safeParse(inquiryId);
    if (!id.success) return json(validationErrorResponse, 400);

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return json(validationErrorResponse, 400);
    }
    const parsed = adminInquiryUpdateSchema.safeParse(payload);
    if (!parsed.success) return json(validationErrorResponse, 400);

    try {
      const inquiry = await dependency.repository.update(id.data, parsed.data);
      if (!inquiry) return json(notFoundResponse, 404);
      return json(toInquiryDetail(inquiry), 200);
    } catch {
      return json(internalErrorResponse, 500);
    }
  };

  return { list, detail, update };
};
