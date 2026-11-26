import { z } from 'zod';

export const inquiryTypeSchema = z.enum([
  '견적 문의',
  '홈페이지 제작 상담',
  '기존 사이트 리뉴얼',
  '유지보수·수정 문의',
  '아임웹 제작 문의',
  '자체 코드 제작 문의',
  '기타',
]);

export const inquiryStatusSchema = z.enum([
  '신규',
  '상담 예정',
  '상담 완료',
  '보류',
]);

const requiredText = (max: number) => z.string().trim().min(1).max(max);

export const inquiryCreateInputSchema = z.object({
  businessName: requiredText(120),
  contactName: requiredText(80),
  email: z.string().trim().email().max(254),
  phone: requiredText(40),
  type: inquiryTypeSchema,
  message: requiredText(5000),
  desiredSchedule: z.string().trim().max(120).optional(),
  budget: z.string().trim().max(120).optional(),
  currentSiteUrl: z.string().trim().url().max(2048).optional(),
  referenceSiteUrl: z.string().trim().url().max(2048).optional(),
  preferredContactMethod: z.string().trim().max(40).optional(),
});

export const inquiryCreatedResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.literal('신규'),
  receivedAt: z.string().datetime(),
});

export const apiErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type InquiryType = z.infer<typeof inquiryTypeSchema>;
export type InquiryStatus = z.infer<typeof inquiryStatusSchema>;
export type InquiryCreateInput = z.infer<typeof inquiryCreateInputSchema>;
export type InquiryCreatedResponse = z.infer<
  typeof inquiryCreatedResponseSchema
>;
