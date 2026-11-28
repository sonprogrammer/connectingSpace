import { env } from 'cloudflare:workers';
import {
  createAdminAuthProvider,
  type AdminAuthBindings,
} from '@/server/auth/admin-auth-provider';
import { createAdminInquiryHandlers } from '@/server/inquiries/admin-inquiry-handler';
import { D1InquiryRepository } from '@/server/inquiries/d1-inquiry-repository';

type InquiryRouteContext = {
  params: Promise<{ inquiryId: string }>;
};

const handlers = createAdminInquiryHandlers({
  getRepository: () => new D1InquiryRepository(env.DB),
  authProvider: createAdminAuthProvider(env as unknown as AdminAuthBindings),
});

export const GET = async (request: Request, context: InquiryRouteContext) =>
  handlers.detail(request, (await context.params).inquiryId);

export const PATCH = async (request: Request, context: InquiryRouteContext) =>
  handlers.update(request, (await context.params).inquiryId);
