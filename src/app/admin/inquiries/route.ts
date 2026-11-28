import { env } from 'cloudflare:workers';
import {
  createAdminAuthProvider,
  type AdminAuthBindings,
} from '@/server/auth/admin-auth-provider';
import { createAdminInquiryHandlers } from '@/server/inquiries/admin-inquiry-handler';
import { D1InquiryRepository } from '@/server/inquiries/d1-inquiry-repository';

const handlers = createAdminInquiryHandlers({
  getRepository: () => new D1InquiryRepository(env.DB),
  authProvider: createAdminAuthProvider(env as unknown as AdminAuthBindings),
});

export const GET = handlers.list;
