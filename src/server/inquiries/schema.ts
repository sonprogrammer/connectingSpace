import {
  inquiryCreateInputSchema,
  inquiryStatusSchema,
  inquiryTypeSchema,
} from '../../shared/model/inquiry';
import { z } from 'zod';

export { inquiryCreateInputSchema, inquiryStatusSchema, inquiryTypeSchema };
export type {
  InquiryCreateInput,
  InquiryStatus,
  InquiryType,
} from '../../shared/model/inquiry';

export const inquiryCreatedResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.literal('신규'),
  receivedAt: z.string().datetime(),
});

export const apiErrorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const adminInquiryListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: inquiryStatusSchema.optional(),
  type: inquiryTypeSchema.optional(),
  search: z
    .string()
    .trim()
    .max(100)
    .transform((value) => value || undefined)
    .optional(),
});

export const inquiryIdSchema = z.string().uuid();

export const adminInquiryUpdateSchema = z
  .object({
    status: inquiryStatusSchema.optional(),
    adminMemo: z
      .string()
      .trim()
      .max(10_000)
      .transform((value) => value || null)
      .optional(),
  })
  .strict()
  .refine(
    (input) => input.status !== undefined || input.adminMemo !== undefined,
  );

export type InquiryCreatedResponse = z.infer<
  typeof inquiryCreatedResponseSchema
>;
export type AdminInquiryListQuery = z.infer<typeof adminInquiryListQuerySchema>;
export type AdminInquiryUpdateInput = z.infer<typeof adminInquiryUpdateSchema>;
