import {
  inquiryCreateInputSchema,
  inquiryTypeSchema,
  type InquiryCreateInput,
  type InquiryType,
} from '@connecting-space/shared';
import { z } from 'zod';

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const optionalUrl = (max: number) =>
  z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().trim().url().max(max).optional(),
  );

export const inquiryFormSchema = inquiryCreateInputSchema.extend({
  desiredSchedule: optionalText(120),
  budget: optionalText(120),
  currentSiteUrl: optionalUrl(2048),
  referenceSiteUrl: optionalUrl(2048),
  preferredContactMethod: optionalText(40),
});

export type InquiryFormValues = {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  type: InquiryType;
  message: string;
  desiredSchedule: string;
  budget: string;
  currentSiteUrl: string;
  referenceSiteUrl: string;
  preferredContactMethod: string;
};

export const inquiryFormDefaults: InquiryFormValues = {
  businessName: '',
  contactName: '',
  email: '',
  phone: '',
  type: '견적 문의',
  message: '',
  desiredSchedule: '',
  budget: '',
  currentSiteUrl: '',
  referenceSiteUrl: '',
  preferredContactMethod: '',
};

export const inquiryTypeOptions: readonly InquiryType[] =
  inquiryTypeSchema.options;

export const preferredContactOptions = ['전화', '이메일', '카카오톡'] as const;

export const toInquiryPayload = (
  values: InquiryFormValues | z.output<typeof inquiryFormSchema>,
): InquiryCreateInput =>
  inquiryCreateInputSchema.parse(inquiryFormSchema.parse(values));
