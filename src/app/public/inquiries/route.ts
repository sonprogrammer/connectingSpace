import { env } from 'cloudflare:workers';
import { D1InquiryRepository } from '@/server/inquiries/d1-inquiry-repository';
import { createPublicInquiryHandler } from '@/server/inquiries/public-inquiry-handler';

export const POST = createPublicInquiryHandler(
  () => new D1InquiryRepository(env.DB),
);
