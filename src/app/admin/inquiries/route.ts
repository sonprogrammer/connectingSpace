import { env } from 'cloudflare:workers';
import { adminAuthProvider } from '@/server/auth/admin-auth-provider';
import { createAdminInquiryHandlers } from '@/server/inquiries/admin-inquiry-handler';
import { D1InquiryRepository } from '@/server/inquiries/d1-inquiry-repository';

const handlers = createAdminInquiryHandlers({
  getRepository: () => new D1InquiryRepository(env.DB),
  authProvider: adminAuthProvider,
});

export const GET = handlers.list;
