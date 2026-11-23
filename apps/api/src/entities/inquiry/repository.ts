import type {
  InquiryCreateInput,
  InquiryStatus,
  InquiryType,
} from '@connecting-space/shared';

export type InquiryRecord = InquiryCreateInput & {
  id: string;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
};

export interface InquiryRepository {
  create(input: InquiryCreateInput): Promise<InquiryRecord>;
  list(): Promise<InquiryRecord[]>;
  findById(id: string): Promise<InquiryRecord | null>;
  findDuplicate(
    input: InquiryCreateInput,
    since: string,
  ): Promise<InquiryRecord | null>;
  createIfNotDuplicate(
    input: InquiryCreateInput,
    since: string,
  ): Promise<InquiryRecord | null>;
}

export type InquiryRow = {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  type: InquiryType;
  message: string;
  desired_schedule: string | null;
  budget: string | null;
  current_site_url: string | null;
  reference_site_url: string | null;
  preferred_contact_method: string | null;
  status: InquiryStatus;
  created_at: string;
  updated_at: string;
};

export const inquiryRowToRecord = (row: InquiryRow): InquiryRecord => ({
  id: row.id,
  businessName: row.business_name,
  contactName: row.contact_name,
  email: row.email,
  phone: row.phone,
  type: row.type,
  message: row.message,
  desiredSchedule: row.desired_schedule ?? undefined,
  budget: row.budget ?? undefined,
  currentSiteUrl: row.current_site_url ?? undefined,
  referenceSiteUrl: row.reference_site_url ?? undefined,
  preferredContactMethod: row.preferred_contact_method ?? undefined,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
